import { useState } from 'react';
import { Mic, ShieldCheck, Database, PhoneCall, Radio, FileText, ChevronRight } from 'lucide-react';
import { VoiceCallSession } from './components/VoiceCallSession.tsx';
import { TicketConfirmation } from './components/TicketConfirmation.tsx';
import { TicketTracker } from './components/TicketTracker.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

type TabType = 'citizen' | 'admin' | 'architecture';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('citizen');
  
  // Citizen reporting sub-states
  const [citizenMode, setCitizenMode] = useState<'call' | 'confirm' | 'track'>('call');
  const [grievanceData, setGrievanceData] = useState<{
    transcript_tamil: string;
    grievances: Array<{
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
    }>;
  } | null>(null);

  const [lastCreatedTicket, setLastCreatedTicket] = useState<string>('');

  const handleAnalysisComplete = (data: typeof grievanceData) => {
    setGrievanceData(data);
    setCitizenMode('confirm');
  };

  const handleRestart = () => {
    setGrievanceData(null);
    setLastCreatedTicket('');
    setCitizenMode('call');
  };

  const handleComplaintCreated = (ticketIds: string) => {
    setLastCreatedTicket(ticketIds);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. Header Banner */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-md flex items-center justify-center">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">குரல் குறைதீர்</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Voice Tamil Grievance Logger</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'citizen' ? 'bg-civic-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">குடிமக்கள் தளம் (Citizen Portal)</span>
              <span className="sm:hidden">Citizen</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'admin' ? 'bg-civic-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">அதிகாரிகள் பகுதி (Admin)</span>
              <span className="sm:hidden">Admin</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'architecture' ? 'bg-civic-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">கட்டமைப்பு (Architecture)</span>
              <span className="sm:hidden">Arch</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: Citizen interface */}
        {activeTab === 'citizen' && (
          <div className="space-y-6">
            {/* Sub navigation for citizen */}
            <div className="flex justify-center space-x-2 max-w-md mx-auto bg-slate-200/60 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => {
                  setCitizenMode('call');
                  setGrievanceData(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition ${
                  citizenMode !== 'track' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🎙️ புகாரளிக்க (Register Grievance)
              </button>
              <button
                onClick={() => setCitizenMode('track')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition ${
                  citizenMode === 'track' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 கண்காணிக்க (Track Ticket)
              </button>
            </div>

            {citizenMode === 'call' && (
              <VoiceCallSession onAnalysisComplete={handleAnalysisComplete} />
            )}

            {citizenMode === 'confirm' && grievanceData && (
              <TicketConfirmation
                transcriptTamil={grievanceData.transcript_tamil}
                grievances={grievanceData.grievances}
                onRestart={handleRestart}
                onComplaintCreated={handleComplaintCreated}
              />
            )}

            {citizenMode === 'track' && (
              <TicketTracker />
            )}
          </div>
        )}

        {/* TAB 2: Admin/Officer Dashboard */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">அதிகாரிகள் மேலாண்மைப் பலகை</h2>
                <p className="text-slate-500 text-xs mt-1">Admin Dashboard / Municipal Complaint Registry Control Center</p>
              </div>
            </div>
            
            <AdminDashboard />
          </div>
        )}

        {/* TAB 3: Technology Architecture Diagram */}
        {activeTab === 'architecture' && (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-md space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-800">தொழில்நுட்பக் கட்டமைப்பு (Technical Architecture)</h2>
              <p className="text-slate-500 text-xs mt-1">Comparing current ideathon prototype design with future IVR scaleout.</p>
            </div>

            <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-2xl text-xs font-semibold leading-relaxed">
              📢 <strong>முக்கிய அறிவிப்பு (Important Notice):</strong><br />
              The current prototype simulates the telephone access layer using browser voice and WebRTC Web Audio. 
              The AI, database logging, status auditing, and grievance-processing pipelines are real.
            </div>

            {/* Architecture Cards Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* CURRENT PROTOTYPE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-civic-700 font-bold border-b border-slate-200 pb-2">
                  <Radio className="h-5 w-5" />
                  <span>தற்போதைய முன்மாதிரி (Current Prototype)</span>
                </div>
                
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-300">
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-civic-500" />
                    <span className="font-semibold text-slate-700">WebRTC / Browser Mic input</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-civic-500" />
                    <span className="font-semibold text-slate-700">Express API Router (Multer memory upload)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-civic-500" />
                    <span className="font-semibold text-slate-700">Gemini 1.5 Flash (Speech-to-Text in ta-IN)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-civic-500" />
                    <span className="font-semibold text-slate-700">Gemini LLM Structured Output (Civic Schema Parsing)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-civic-500" />
                    <span className="font-semibold text-slate-700">SQLite Database (complaints & status_history log)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-civic-500" />
                    <span className="font-semibold text-slate-700">Web-based Dashboard & Browser TTS (Voice out)</span>
                  </div>
                </div>
              </div>

              {/* FUTURE PRODUCTION PLAN */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-emerald-700 font-bold border-b border-slate-200 pb-2">
                  <PhoneCall className="h-5 w-5" />
                  <span>எதிர்காலக் கட்டமைப்பு (Future Production IVR)</span>
                </div>

                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-300">
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Feature Phone (Toll-free PSTN call)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Twilio / Exotel Telephony Gateway</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Audio Stream via SIP / WebSockets</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Tamil ASR Speech API (GCP Speech-to-Text)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">LLM Classifier & GIS Locator Integration</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Enterprise Database & CRM (Postgres / Supabase)</span>
                  </div>
                  <div className="relative flex items-center text-xs">
                    <span className="absolute left-[-21px] h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">SMS Gateways & Voice Calls for Status Updates</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Visual Process Flow */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white text-xs space-y-4">
              <h3 className="font-bold border-b border-slate-800 pb-2 flex items-center text-slate-300">
                <FileText className="h-4 w-4 mr-2" />
                <span>உண்மை தரவு செயல்முறை ஓட்டம் (Real-Time Process Pipeline Flow)</span>
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] text-center pt-2">
                <div className="bg-slate-850 p-2.5 rounded border border-slate-750 flex-1 w-full">
                  🎙️ SPEAK TAMIL
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 rotate-90 sm:rotate-0" />
                <div className="bg-slate-850 p-2.5 rounded border border-slate-750 flex-1 w-full">
                  📝 REAL TRANSCRIPTION
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 rotate-90 sm:rotate-0" />
                <div className="bg-slate-850 p-2.5 rounded border border-slate-750 flex-1 w-full">
                  🤖 REAL AI PARSING
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 rotate-90 sm:rotate-0" />
                <div className="bg-slate-850 p-2.5 rounded border border-slate-750 flex-1 w-full">
                  🎫 REAL TICKET
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 rotate-90 sm:rotate-0" />
                <div className="bg-slate-850 p-2.5 rounded border border-slate-750 flex-1 w-full">
                  👨‍💼 OFFICERS DASHBOARD
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 rotate-90 sm:rotate-0" />
                <div className="bg-slate-850 p-2.5 rounded border border-slate-750 flex-1 w-full">
                  📊 TRACK STATUS
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* 3. Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 font-semibold space-y-1">
          <p>குரல் குறைதீர் — Voice-Based Tamil Civic Grievance Logger &copy; 2026</p>
          <p className="font-normal text-[10px] text-slate-400">
            Powered by Gemini AI and SQLite database local workspace setup.
          </p>
        </div>
      </footer>

    </div>
  );
}
