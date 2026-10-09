import React, { useState } from 'react';
import { Search, MapPin, Clock, ShieldAlert, Landmark, FileText, Calendar } from 'lucide-react';
import { Complaint } from '../types.ts';

export const TicketTracker: React.FC = () => {
  const [ticketId, setTicketId] = useState<string>('');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setComplaint(null);

    try {
      const response = await fetch(`/api/complaints/${ticketId.trim().toUpperCase()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Complaint ticket not found.');
      }
      const data = await response.json();
      setComplaint(data);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'புகார் எண் கண்டறியப்படவில்லை. (Ticket ID not found)');
    } finally {
      setIsLoading(false);
    }
  };

  // Status mapping to determine stepper indices
  const statusSteps = [
    { key: 'SUBMITTED', label: 'பதிவு செய்யப்பட்டது', labelEn: 'Submitted' },
    { key: 'ASSIGNED', label: 'அதிகாரியிடம் ஒப்படைக்கப்பட்டது', labelEn: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'நடவடிக்கையில் உள்ளது', labelEn: 'In Progress' },
    { key: 'RESOLVED', label: 'தீர்க்கப்பட்டது', labelEn: 'Resolved' }
  ];

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(step => step.key === status);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('ta-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCategoryEmoji = (cat: string) => {
    const emojis: Record<string, string> = {
      water: '💧',
      road: '🛣️',
      electricity: '⚡',
      sanitation: '🧹',
      other: '⚙'
    };
    return emojis[cat] || '⚙';
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* Search Input Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-2">புகார் நிலவரத்தைக் கண்டறிய (Track Complaint Status)</h2>
        <p className="text-slate-500 text-xs mb-6">
          உங்கள் புகாரைப் பதிவு செய்தபோது வழங்கப்பட்ட புகார் எண்ணை (உதாரணம்: TN-WTR-1001) தட்டச்சு செய்து தேடவும்.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="புகார் எண் / Ticket ID (e.g. TN-WTR-1001)"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-350 rounded-2xl text-slate-800 font-mono font-bold tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500 focus:bg-white text-base transition"
            />
            <Search className="h-5 w-5 text-slate-400 absolute left-4 top-4" />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-civic-600 hover:bg-civic-700 active:bg-civic-800 text-white font-bold py-3.5 px-8 rounded-2xl shadow transition disabled:opacity-50 flex items-center justify-center space-x-1 text-base"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>தேடுக (Search)</span>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 bg-red-50 text-red-700 border border-red-150 p-4 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Query Result Card */}
      {complaint && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100 space-y-8 animate-fade-in">
          
          {/* Header Ticket summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-civic-600 bg-civic-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {complaint.category.toUpperCase()} Grievance
              </span>
              <h3 className="text-2xl font-bold font-mono text-slate-800 mt-1">{complaint.ticket_id}</h3>
            </div>
            <div className="mt-2 sm:mt-0">
              <span className="text-slate-400 text-xs block">சமர்ப்பிக்கப்பட்ட தேதி</span>
              <span className="text-slate-700 text-xs font-semibold flex items-center mt-0.5">
                <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {formatDate(complaint.created_at)}
              </span>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">புகார் தற்போதைய நிலை / Timeline</h4>
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {statusSteps.map((step, idx) => {
                const currentIdx = getStatusIndex(complaint.status);
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={step.key} className="relative flex items-start space-x-3 text-sm">
                    {/* Circle Node */}
                    <span className={`absolute left-[-21px] top-1.5 h-3 w-3 rounded-full border-2 transition-all ${
                      isCurrent 
                        ? 'bg-civic-500 border-civic-500 ring-4 ring-civic-100 scale-125' 
                        : isCompleted 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'bg-white border-slate-300'
                    }`} />
                    
                    <div className="flex-1 pl-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${isCurrent ? 'text-civic-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">({step.labelEn})</span>
                      </div>
                      
                      {/* Sub notes from history if matches this status */}
                      {complaint.status_history && (
                        <div className="mt-1 space-y-1">
                          {complaint.status_history
                            .filter(h => h.status === step.key)
                            .map(historyItem => (
                              <div key={historyItem.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600">
                                <p className="font-medium">{historyItem.note}</p>
                                <span className="text-[10px] text-slate-400 block mt-1">{formatDate(historyItem.created_at)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Section */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-2">
              புகார் குறிப்புகள் / Grievance Details
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">விவகாரம் / Issue</span>
                  <span className="text-slate-800 text-sm font-semibold mt-0.5 block">
                    {getCategoryEmoji(complaint.category)} {complaint.issue}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">இடம் / Location</span>
                  <span className="text-slate-800 text-sm font-semibold mt-0.5 block">{complaint.location}</span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">காலம் / Duration</span>
                  <span className="text-slate-800 text-sm font-semibold mt-0.5 block">{complaint.duration}</span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <ShieldAlert className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">முன்னுரிமை / Priority</span>
                  <span className="text-slate-800 text-sm font-semibold mt-0.5 block capitalize">{complaint.priority}</span>
                </div>
              </div>

              <div className="flex items-start space-x-2 sm:col-span-2">
                <Landmark className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">பொறுப்பு வாரியம் / Assigned Department</span>
                  <span className="text-slate-800 text-sm font-semibold mt-0.5 block">{complaint.department}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs">
              <span className="text-slate-400 block font-semibold uppercase">புகார் சுருக்கம் (AI Summary)</span>
              <p className="text-slate-700 leading-relaxed font-medium mt-1">{complaint.summary_tamil}</p>
              <p className="text-slate-500 font-mono text-[10px] mt-1">Eng: {complaint.summary_english}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
