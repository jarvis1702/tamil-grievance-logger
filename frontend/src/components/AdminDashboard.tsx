import React, { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, CheckCircle, Clock, Filter, 
  MapPin, Landmark, ShieldAlert, ArrowUpDown, ChevronRight, FileText, X
} from 'lucide-react';
import { Complaint, DashboardStats, ComplaintCategory, ComplaintPriority, ComplaintStatus } from '../types.ts';

export const AdminDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filtering states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Sorting states
  const [sortField, setSortField] = useState<'created_at' | 'priority' | 'status'>('created_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Edit states inside the detailed inspect panel
  const [editStatus, setEditStatus] = useState<ComplaintStatus>('SUBMITTED');
  const [editPriority, setEditPriority] = useState<ComplaintPriority>('medium');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Fetch all complaints and statistics
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch filtered list from server
      const listUrl = `/api/complaints?category=${filterCategory}&priority=${filterPriority}&status=${filterStatus}`;
      const listResponse = await fetch(listUrl);
      if (!listResponse.ok) throw new Error('Failed to retrieve complaints.');
      const listData = await listResponse.json();
      setComplaints(listData);

      // 2. Fetch stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (!statsResponse.ok) throw new Error('Failed to retrieve stats.');
      const statsData = await statsResponse.json();
      setStats(statsData);

    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('தரவுகளைப் பெறுவதில் சிக்கல். (Error fetching data)');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterCategory, filterPriority, filterStatus]);

  const handleSelectComplaint = async (complaintItem: Complaint) => {
    try {
      // Fetch full details with status history log
      const response = await fetch(`/api/complaints/${complaintItem.ticket_id}`);
      if (!response.ok) throw new Error('Grievance details fetch failed.');
      const data = await response.json();
      setSelectedComplaint(data);
      
      // Initialize edit fields
      setEditStatus(data.status);
      setEditPriority(data.priority);
      setEditDepartment(data.department || '');
      setNewNote('');
    } catch (err) {
      console.error(err);
      alert('Could not fetch complaint details.');
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          priority: editPriority,
          department: editDepartment,
          note: newNote.trim() || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update ticket.');
      }

      const updated = await response.json();
      
      // Refresh database listings and update current overlay
      setSelectedComplaint(updated);
      setNewNote('');
      fetchData(); // Refresh main grid counts & rows
      
      alert('தரவுகள் வெற்றிகரமாக புதுப்பிக்கப்பட்டன. (Updated successfully)');
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'செய்வதில் தோல்வி.');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSort = (field: 'created_at' | 'priority' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSortedComplaints = () => {
    return [...complaints].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Custom priority weight
      if (sortField === 'priority') {
        const weight = { critical: 4, high: 3, medium: 2, low: 1 };
        valA = weight[a.priority] || 0;
        valB = weight[b.priority] || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('ta-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const priorityMeta = {
    critical: { bg: 'bg-red-100 text-red-800 border-red-200', text: 'Critical / அவசரம்' },
    high: { bg: 'bg-orange-100 text-orange-800 border-orange-200', text: 'High / அதிக' },
    medium: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Medium / நடுத்தர' },
    low: { bg: 'bg-green-100 text-green-800 border-green-200', text: 'Low / குறைவான' }
  };

  const statusMeta = {
    SUBMITTED: { bg: 'bg-blue-50 text-blue-700 border-blue-150', text: 'சமர்ப்பிக்கப்பட்டது' },
    ASSIGNED: { bg: 'bg-purple-50 text-purple-700 border-purple-150', text: 'ஒப்படைக்கப்பட்டது' },
    IN_PROGRESS: { bg: 'bg-amber-50 text-amber-700 border-amber-150', text: 'பணிகள் நடக்கிறது' },
    RESOLVED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-150', text: 'தீர்க்கப்பட்டது' }
  };

  const categoryLabels: Record<ComplaintCategory, string> = {
    water: '💧 குடிநீர் (Water)',
    road: '🛣️ சாலை (Road)',
    electricity: '⚡ மின்சாரம் (Power)',
    sanitation: '🧹 சுகாதாரம் (Sanit.)',
    other: '⚙️ இதர (Other)'
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase">மொத்த புகார்கள்</span>
              <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Total Grievances</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase">நிலுவையில் உள்ளவை</span>
              <span className="text-2xl font-bold text-blue-600">{stats.pending}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Pending Action</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase">அவசரத் தேவை</span>
              <span className="text-2xl font-bold text-red-600">{stats.highPriority}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">High/Critical Priority</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase">தீர்க்கப்பட்டவை</span>
              <span className="text-2xl font-bold text-emerald-600">{stats.resolved}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Resolved Complaints</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Category Breakdown Chart/Progress bars */}
      {stats && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">வகையினம் வாரியாக புகார்கள் (Category Breakdown)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.categories).map(([cat, count]) => {
              const total = stats.total || 1;
              const percent = Math.round((count / total) * 100);
              
              return (
                <div key={cat} className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 text-center">
                  <span className="text-xs font-bold text-slate-700 capitalize block mb-1">
                    {cat === 'water' && '💧 குடிநீர்'}
                    {cat === 'road' && '🛣️ சாலை'}
                    {cat === 'electricity' && '⚡ மின்சாரம்'}
                    {cat === 'sanitation' && '🧹 சுகாதாரம்'}
                    {cat === 'other' && '⚙️ இதர'}
                  </span>
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-xl font-bold text-slate-800">{count}</span>
                    <span className="text-[10px] text-slate-400">({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-civic-500 h-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Filters and Main complaints list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
        
        {/* Filter Controls Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm">
            <Filter className="h-4 w-4" />
            <span>வடிகட்டுதல் (Filters)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 md:max-w-2xl">
            {/* Category Select */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
            >
              <option value="all">அனைத்து வகைகளும் / All Categories</option>
              <option value="water">💧 குடிநீர் / Water</option>
              <option value="road">🛣️ சாலை / Road</option>
              <option value="electricity">⚡ மின்சாரப் பிரச்சனை / Electricity</option>
              <option value="sanitation">🧹 துப்புரவுத் துறை / Sanitation</option>
              <option value="other">⚙️ இதர / Other</option>
            </select>

            {/* Priority Select */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
            >
              <option value="all">அனைத்து முன்னுரிமைகளும் / All Priorities</option>
              <option value="critical">🔴 Critical / அவசரம்</option>
              <option value="high">🟠 High / அதிக</option>
              <option value="medium">🟡 Medium / நடுத்தர</option>
              <option value="low">🟢 Low / குறைவான</option>
            </select>

            {/* Status Select */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
            >
              <option value="all">அனைத்து நிலைகளும் / All Statuses</option>
              <option value="SUBMITTED">சமர்ப்பிக்கப்பட்டது / Submitted</option>
              <option value="ASSIGNED">ஒப்படைக்கப்பட்டது / Assigned</option>
              <option value="IN_PROGRESS">பணிகள் நடக்கிறது / In Progress</option>
              <option value="RESOLVED">தீர்க்கப்பட்டது / Resolved</option>
            </select>
          </div>
        </div>

        {/* Complaints Table Grid */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="h-8 w-8 border-4 border-civic-100 border-t-civic-600 rounded-full animate-spin mx-auto mb-3" />
              <span>புகார் பதிவுகள் பெறப்படுகின்றன...</span>
            </div>
          ) : getSortedComplaints().length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              புகார் பதிவுகள் எதுவும் இல்லை. (No complaints found match filters)
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="py-3 px-4 font-mono">Grievance ID</th>
                  <th className="py-3 px-4">வகை (Category)</th>
                  <th className="py-3 px-4">இடம் (Location)</th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                    முன்னுரிமை (Priority) <ArrowUpDown className="h-3 w-3 inline" />
                  </th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    நிலை (Status) <ArrowUpDown className="h-3 w-3 inline" />
                  </th>
                  <th className="py-3 px-4">ஒப்படைத்த துறை</th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                    தேதி (Created) <ArrowUpDown className="h-3 w-3 inline" />
                  </th>
                  <th className="py-3 px-4 text-center">விவரங்கள்</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700">
                {getSortedComplaints().map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold">{item.ticket_id}</td>
                    <td className="py-3 px-4 font-semibold">{categoryLabels[item.category] || item.category}</td>
                    <td className="py-3 px-4 max-w-[120px] truncate">{item.location}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${priorityMeta[item.priority]?.bg || ''}`}>
                        {priorityMeta[item.priority]?.text || item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusMeta[item.status]?.bg || ''}`}>
                        {statusMeta[item.status]?.text || item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[150px] truncate font-medium">{item.department}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{formatDate(item.created_at)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleSelectComplaint(item)}
                        className="bg-slate-100 hover:bg-civic-50 text-slate-700 hover:text-civic-700 font-bold py-1 px-2.5 rounded border border-slate-200 hover:border-civic-200 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. Detailed Drawer/Inspect Modal Panel */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          
          <div className="w-full max-w-xl bg-white h-screen overflow-y-auto shadow-2xl flex flex-col p-6 space-y-6 relative border-l border-slate-100">
            {/* Close Button */}
            <button
              onClick={() => setSelectedComplaint(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header detail */}
            <div className="border-b border-slate-100 pb-4 pr-10">
              <span className="text-[10px] font-bold text-civic-600 bg-civic-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {selectedComplaint.category.toUpperCase()} Ticket ID
              </span>
              <h3 className="text-2xl font-bold font-mono text-slate-800 mt-1">{selectedComplaint.ticket_id}</h3>
              <p className="text-slate-400 text-xs mt-1">கடைசியாக புதுப்பிக்கப்பட்டது: {formatDate(selectedComplaint.updated_at)}</p>
            </div>

            {/* Original Tamil Transcript */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl space-y-2 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center">
                <FileText className="h-3 w-3 mr-1" />
                Citizen Tamil Voice Transcript / உங்களது குரல் வடிவம்
              </span>
              <p className="italic leading-relaxed text-sm font-medium">&ldquo;{selectedComplaint.transcript_tamil}&rdquo;</p>
            </div>

            {/* AI Summaries */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Summary (சுருக்கம்)</span>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs space-y-2">
                <p className="text-slate-700 font-bold font-semibold leading-relaxed">
                  📌 {selectedComplaint.summary_tamil}
                </p>
                <p className="text-slate-500 italic font-mono">
                  🇬🇧 {selectedComplaint.summary_english}
                </p>
              </div>
            </div>

            {/* Structured parameters */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase">வகை (Category)</span>
                <span className="text-slate-800 font-bold block mt-0.5 capitalize">{selectedComplaint.category}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase">முன்னுரிமை (Priority)</span>
                <span className="text-slate-800 font-bold block mt-0.5 capitalize">{selectedComplaint.priority}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase">விபரம் (Issue)</span>
                <span className="text-slate-800 font-bold block mt-0.5">{selectedComplaint.issue}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase">இடம் (Location)</span>
                <span className="text-slate-800 font-bold block mt-0.5 flex items-center">
                  <MapPin className="h-3 w-3 text-slate-400 mr-0.5" />
                  {selectedComplaint.location}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase">காலம் (Duration)</span>
                <span className="text-slate-800 font-bold block mt-0.5">{selectedComplaint.duration}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase">பாதிக்கப்பட்டோர் (Affected)</span>
                <span className="text-slate-800 font-bold block mt-0.5">{selectedComplaint.affected_people}</span>
              </div>
              {selectedComplaint.urgency_reason && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 col-span-2 text-red-800">
                  <span className="text-red-600 font-bold block uppercase text-[10px]">அவசரத் தேவைக்கானக் காரணம்</span>
                  <span className="font-bold block mt-0.5">{selectedComplaint.urgency_reason}</span>
                </div>
              )}
            </div>

            {/* Officer Action Form */}
            <form onSubmit={handleSaveDetails} className="border-t border-slate-150 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">அதிகாரப்பூர்வ நடவடிக்கை (Officer Action Log)</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">நிலை மாற்றம் (Change Status)</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ComplaintStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
                  >
                    <option value="SUBMITTED">சமர்ப்பிக்கப்பட்டது / Submitted</option>
                    <option value="ASSIGNED">ஒப்படைக்கப்பட்டது / Assigned</option>
                    <option value="IN_PROGRESS">நடவடிக்கையில் உள்ளது / In Progress</option>
                    <option value="RESOLVED">தீர்க்கப்பட்டது / Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">முன்னுரிமை மாற்று (Change Priority)</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as ComplaintPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
                  >
                    <option value="critical">Critical / அவசரம்</option>
                    <option value="high">High / அதிக</option>
                    <option value="medium">Medium / நடுத்தர</option>
                    <option value="low">Low / குறைவான</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">துறை ஒதுக்கீடு (Assign Department)</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500 font-semibold text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">புதிய குறிப்பு சேர்க்க (Add Officer Note)</label>
                  <textarea
                    rows={2}
                    placeholder="அதிகாரி நடவடிக்கை பற்றிய குறிப்புகள்..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition text-xs text-center"
                >
                  மூடுக (Close)
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-civic-600 hover:bg-civic-700 text-white py-3 rounded-xl font-bold transition text-xs flex items-center justify-center space-x-1.5"
                >
                  {isUpdating ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>சேமி (Save Updates)</span>
                  )}
                </button>
              </div>
            </form>

            {/* History Logs list */}
            {selectedComplaint.status_history && (
              <div className="border-t border-slate-150 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  நடவடிக்கை வரலாறு (Action History Logs)
                </h4>
                <div className="space-y-2">
                  {selectedComplaint.status_history.map((log) => (
                    <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="flex justify-between items-center mb-1 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase border ${statusMeta[log.status]?.bg || ''}`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">{formatDate(log.created_at)}</span>
                      </div>
                      <p className="text-slate-600 mt-1 font-semibold">{log.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
