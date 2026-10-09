import React, { useState } from 'react';
import { Check, Edit2, RotateCcw, Save, Trash2, Landmark, Clock, MapPin, AlertOctagon, HelpCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Grievance {
  category: 'water' | 'road' | 'electricity' | 'sanitation' | 'other';
  category_tamil: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  location: string;
  duration: string;
  affected_people: string;
  urgency_reason: string | null;
  department: string;
  summary_tamil: string;
  summary_english: string;
}

interface TicketConfirmationProps {
  transcriptTamil: string;
  grievances: Grievance[];
  onRestart: () => void;
  onComplaintCreated: (ticketIds: string) => void;
}

export const TicketConfirmation: React.FC<TicketConfirmationProps> = ({
  transcriptTamil,
  grievances,
  onRestart,
  onComplaintCreated
}) => {
  const [grievanceList, setGrievanceList] = useState<Grievance[]>([...grievances]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Grievance | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdTickets, setCreatedTickets] = useState<any[]>([]); // complaints from backend
  const [errorMessage, setErrorMessage] = useState<string>('');

  const categoryIcons: Record<string, string> = {
    water: '💧',
    road: '🛣️',
    electricity: '⚡',
    sanitation: '🧹',
    other: '⚙️'
  };

  const priorityColors: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    critical: { bg: 'bg-red-100', text: 'text-red-800 border-red-200', label: '🚨 மிக முக்கியம் (Critical)', icon: '🔴' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800 border-orange-200', label: '🟠 அதிக முன்னுரிமை (High)', icon: '🟠' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800 border-yellow-200', label: '🟡 நடுத்தரம் (Medium)', icon: '🟡' },
    low: { bg: 'bg-green-100', text: 'text-green-800 border-green-200', label: '🟢 குறைவான முன்னுரிமை (Low)', icon: '🟢' }
  };

  const speakTamil = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ta-IN';
        utterance.rate = 0.95;
        
        const voices = window.speechSynthesis.getVoices();
        const tamilVoice = voices.find(v => 
          v.lang.toLowerCase().includes('ta-in') || 
          v.lang.toLowerCase().startsWith('ta')
        );
        
        if (tamilVoice) {
          utterance.voice = tamilVoice;
        }
        
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 150);
    }
  };

  // Edit triggers
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditFormData({ ...grievanceList[index] });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editFormData) return;
    const { name, value } = e.target;
    
    if (name === 'category') {
      const categoryTamilNames: Record<string, string> = {
        water: 'குடிநீர்',
        road: 'சாலை',
        electricity: 'மின்சாரம்',
        sanitation: 'சுகாதாரம்',
        other: 'இதர'
      };
      setEditFormData(prev => prev ? ({
        ...prev,
        category: value as any,
        category_tamil: categoryTamilNames[value] || 'இதர'
      }) : null);
    } else {
      setEditFormData(prev => prev ? ({
        ...prev,
        [name]: value
      }) : null);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editFormData) return;
    const updatedList = [...grievanceList];
    updatedList[editingIndex] = editFormData;
    setGrievanceList(updatedList);
    setEditingIndex(null);
    setEditFormData(null);
  };

  const handleDeleteGrievance = (index: number) => {
    if (grievanceList.length <= 1) {
      alert("குறைந்தது ஒரு புகார் இருக்க வேண்டும். (At least one grievance must remain.)");
      return;
    }
    const updated = grievanceList.filter((_, idx) => idx !== index);
    setGrievanceList(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditFormData(null);
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript_tamil: transcriptTamil,
          grievances: grievanceList
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit grievances.');
      }

      const results = await response.json(); // returns array
      setCreatedTickets(results);

      // Fire confetti splash
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.55 }
      });

      // Construct TTS confirmation
      const ticketIdsString = results.map((r: any) => r.ticket_id).join(' மற்றும் ');
      const speechMsg = `உங்களது புகார்கள் வெற்றிகரமாக பதிவு செய்யப்பட்டுள்ளன. உங்கள் புகார் எண்கள் ${results.map((r: any) => r.ticket_id.split('-').join(' ')).join(', ')}. உங்கள் புகார்கள் சம்பந்தப்பட்ட துறைகளுக்கு அனுப்பப்பட்டுள்ளது.`;
      speakTamil(speechMsg);

      onComplaintCreated(results.map((r: any) => r.ticket_id).join(', '));

    } catch (err: unknown) {
      console.error('Submission failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'சமர்ப்பிப்பதில் தோல்வி ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-6 sm:p-8">
      
      {/* SUCCESS TICKET SCREEN */}
      {createdTickets.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full">
            <Check className="h-12 w-12 stroke-[3]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-800">✓ புகார்கள் வெற்றிகரமாக பதிவு செய்யப்பட்டன</h2>
            <p className="text-slate-500 mt-1 text-sm">Grievance Tickets Successfully Registered</p>
          </div>

          {/* List of created tickets */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {createdTickets.map((ticket) => (
              <div key={ticket.id} className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-850 text-left space-y-3 relative shadow">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-civic-400">{ticket.ticket_id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 capitalize">{ticket.category_tamil}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-slate-500 block">துறை (Agency)</span>
                  <span className="font-semibold text-slate-200 block text-[11px]">{ticket.department}</span>
                </div>
                <div className="space-y-1 text-xs pt-1">
                  <span className="text-slate-500 block">சுருக்கம் (AI Summary)</span>
                  <p className="text-slate-300 italic line-clamp-2">&ldquo;{ticket.summary_tamil}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-slate-500 text-xs animate-pulse max-w-md pt-4">
            🔊 "உங்கள் புகார் எண்கள் {createdTickets.map(t => t.ticket_id).join(', ')} வெற்றிகரமாக பதிவு செய்யப்பட்டது..." (Tamil TTS reading out)
          </div>

          <div className="flex space-x-3 w-full pt-6">
            <button
              onClick={onRestart}
              className="flex-1 bg-civic-600 hover:bg-civic-700 text-white font-bold py-4 px-6 rounded-2xl shadow transition"
            >
              புதிய புகார் பதிவு செய்ய / New Call
            </button>
          </div>
        </div>
      ) : (
        /* CONFIRMATION SCREEN */
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">உங்கள் புகாரை புரிந்துகொண்டோம்</h2>
              <p className="text-slate-500 text-sm mt-1">
                We detected {grievanceList.length} distinct concern{grievanceList.length > 1 ? 's' : ''} in your voice. Please verify.
              </p>
            </div>
            <span className="bg-civic-50 text-civic-700 font-bold px-3 py-1 rounded-xl text-xs border border-civic-100">
              {grievanceList.length} Grievance{grievanceList.length > 1 ? 's' : ''}
            </span>
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm flex items-start space-x-2">
              <AlertOctagon className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Voice transcript bubble */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 italic">
            <span className="font-bold text-xs uppercase block text-slate-400 not-italic mb-1">உங்களது வாய்மொழி புகார் / Original Voice Transcript:</span>
            &ldquo;{transcriptTamil}&rdquo;
          </div>

          {/* Grievance list loop */}
          <div className="space-y-6">
            {grievanceList.map((item, idx) => {
              const isCurrentlyEditing = editingIndex === idx;

              return (
                <div key={idx} className={`border rounded-2xl p-5 relative transition-all ${
                  isCurrentlyEditing 
                    ? 'border-amber-400 bg-amber-50/20 shadow-md' 
                    : 'border-slate-150 bg-white hover:border-slate-300 shadow-sm'
                }`}>
                  {/* Card Header badge */}
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Grievance #{idx + 1}
                    </span>
                    
                    {!isCurrentlyEditing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(idx)}
                          className="flex items-center space-x-1 text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-100 hover:bg-amber-200 py-1 px-2 rounded-lg transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>✏️ திருத்த (Edit)</span>
                        </button>
                        <button
                          onClick={() => handleDeleteGrievance(idx)}
                          className="flex items-center space-x-1 text-xs text-red-700 hover:text-red-800 font-bold bg-red-100 hover:bg-red-200 py-1 px-2 rounded-lg transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>நீக்கு (Delete)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isCurrentlyEditing && editFormData ? (
                    /* CARD EDITOR FORM */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">வகை (Category)</label>
                          <select
                            name="category"
                            value={editFormData.category}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          >
                            <option value="water">குடிநீர் / Water</option>
                            <option value="road">சாலை / Road</option>
                            <option value="electricity">மின்சாரம் / Electricity</option>
                            <option value="sanitation">சுகாதாரம் / Sanitation</option>
                            <option value="other">இதர / Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">முன்னுரிமை (Priority)</label>
                          <select
                            name="priority"
                            value={editFormData.priority}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          >
                            <option value="critical">Critical / அவசரம்</option>
                            <option value="high">High / அதிக</option>
                            <option value="medium">Medium / நடுத்தரம்</option>
                            <option value="low">Low / குறைவான</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">விளக்கம் / Issue</label>
                          <input
                            type="text"
                            name="issue"
                            value={editFormData.issue}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">இடம் (Location)</label>
                          <input
                            type="text"
                            name="location"
                            value={editFormData.location}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">காலம் (Duration)</label>
                          <input
                            type="text"
                            name="duration"
                            value={editFormData.duration}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">பாதிப்பு (Affected)</label>
                          <input
                            type="text"
                            name="affected_people"
                            value={editFormData.affected_people}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">பொறுப்புத் துறை (Department)</label>
                          <input
                            type="text"
                            name="department"
                            value={editFormData.department}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-350 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-civic-500"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2 justify-end text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(null);
                            setEditFormData(null);
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-xl transition"
                        >
                          ரத்து (Cancel)
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl transition flex items-center space-x-1"
                        >
                          <Save className="h-4 w-4" />
                          <span>சேமி (Save)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* CARD VIEW MODE */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="flex items-center space-x-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-xl">{categoryIcons[item.category] || '⚙️'}</span>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">வகையினம் / Category</span>
                            <span className="text-slate-800 font-bold text-sm">{item.category_tamil}</span>
                          </div>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center space-x-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-lg">{priorityColors[item.priority]?.icon || '🟡'}</span>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">முன்னுரிமை / Priority</span>
                            <span className="text-slate-850 font-bold text-sm">{priorityColors[item.priority]?.label || 'நடுத்தரம்'}</span>
                          </div>
                        </div>

                        {/* Issue */}
                        <div className="flex items-start space-x-2 sm:col-span-2 text-xs">
                          <HelpCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">பிரச்சனை / Issue</span>
                            <span className="text-slate-800 font-semibold text-sm">{item.issue}</span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center space-x-2 text-xs">
                          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">இடம் / Location</span>
                            <span className="text-slate-800 font-semibold">{item.location}</span>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center space-x-2 text-xs">
                          <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">காலம் / Duration</span>
                            <span className="text-slate-800 font-semibold">{item.duration}</span>
                          </div>
                        </div>

                        {/* Department */}
                        <div className="flex items-center space-x-2 sm:col-span-2 text-xs">
                          <Landmark className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">ஒதுக்கப்பட்ட துறை / Department</span>
                            <span className="text-slate-800 font-semibold">{item.department}</span>
                          </div>
                        </div>
                      </div>

                      {item.urgency_reason && (
                        <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-100 flex items-start space-x-2 mt-2">
                          <AlertOctagon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold block uppercase text-[9px] text-red-600">அவசரத் தேவைக்கானக் காரணம் (Urgency)</span>
                            <span className="font-semibold block mt-0.5">{item.urgency_reason}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Confirm Ask Label */}
          <div className="text-center pt-4 border-t border-slate-100">
            <p className="text-lg font-bold text-slate-800">இந்த தகவல் சரியா? (Is this information correct?)</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full">
            <button
              onClick={onRestart}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-6 rounded-2xl transition disabled:opacity-50"
            >
              <RotateCcw className="h-5 w-5" />
              <span>🔄 மீண்டும் சொல்லவும் (Re-speak)</span>
            </button>

            <button
              onClick={handleConfirmSubmit}
              disabled={isSubmitting || editingIndex !== null}
              className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              <span>✓ ஆம், பதிவு செய்யவும் (Register all)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
