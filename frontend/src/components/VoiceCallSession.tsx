import React, { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, RefreshCw, Volume2, ArrowRight, AlertTriangle } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer.tsx';

interface VoiceCallSessionProps {
  onAnalysisComplete: (data: {
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
  }) => void;
}

export const VoiceCallSession: React.FC<VoiceCallSessionProps> = ({ onAnalysisComplete }) => {
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'transcribing' | 'analyzing' | 'completed' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Transcription and Analysis results
  const [transcript, setTranscript] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<unknown | null>(null);

  // Audio recording references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Browser TTS Tamil Helper with asynchronous voice loading & queue flush robust implementation
  const speakTamil = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      // Delay to allow cancel thread to clear queue in browser
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ta-IN';
        utterance.rate = 0.95;
        
        const voices = window.speechSynthesis.getVoices();
        // Try exact match or language start match
        const tamilVoice = voices.find(v => 
          v.lang.toLowerCase().includes('ta-in') || 
          v.lang.toLowerCase().startsWith('ta')
        );
        
        if (tamilVoice) {
          utterance.voice = tamilVoice;
          console.log('Selected Tamil voice:', tamilVoice.name);
        } else {
          console.warn('Native Tamil voice not detected. Browser default used.');
        }
        
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 150);
    }
  };

  // Pre-load voices and handle async Chrome voice events
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  const handleStartCall = async () => {
    setErrorMessage('');
    setCallState('connecting');

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Establish connection state
      setTimeout(() => {
        setCallState('connected');
        
        // 3. Play greeting speech in Tamil
        const greetingText = "வணக்கம்! குடிமக்கள் குறைதீர் மையத்திற்கு வரவேற்கிறோம். உங்கள் குறையை சொல்லுங்கள்.";
        speakTamil(greetingText);

        // 4. Start recording after a short pause for the greeting
        setTimeout(() => {
          if (mediaStreamRef.current) {
            startRecording();
          }
        }, 5500);

      }, 1500);

    } catch (err: unknown) {
      console.error('Microphone access denied:', err);
      setCallState('error');
      setErrorMessage('Microphone permission is required for voice input / குரல் பதிவு செய்ய மைக்ரோஃபோன் அனுமதி தேவை.');
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    
    setCallState('speaking');
    audioChunksRef.current = [];

    // Determine supported MIME type (Chrome/Firefox WebM, Safari MP4/WAV)
    let options = { mimeType: 'audio/webm' };
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      options = { mimeType: 'audio/ogg' };
      if (!MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: '' }; // fallback to default
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        submitAudioToBackend(audioBlob);
      };

      mediaRecorder.start(250); // Slice size
    } catch (e) {
      console.error('Failed to initialize MediaRecorder:', e);
      setCallState('error');
      setErrorMessage('Audio recording component initialization failed.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupMediaStreams();
  };

  const cleanupMediaStreams = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleEndCall = () => {
    stopRecording();
    setCallState('idle');
  };

  const handleDoneSpeaking = () => {
    stopRecording();
    setCallState('transcribing');
  };

  // Submit audio for Speech-to-Text
  const submitAudioToBackend = async (audioBlob: Blob) => {
    setCallState('transcribing');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'grievance_audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio.');
      }

      const result = await response.json();
      setTranscript(result.transcript);
      setConfidence(result.confidence || 0.95);
      
      // Auto trigger AI analysis on the transcript
      analyzeTranscript(result.transcript);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Transcription failed:', msg);
      setCallState('error');
      setErrorMessage(`குரல் அங்கீகாரம் தற்காலிகமாக தோல்வியடைந்தது (Voice processing failed): ${msg}. Please check your backend .env API keys or use a sample complaint.`);
    }
  };

  // Submit text for LLM/NLP analysis
  const analyzeTranscript = async (text: string) => {
    setCallState('analyzing');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze grievance.');
      }

      const result = await response.json();
      const grievances = result.grievances || [];
      setAnalysisResult(grievances);
      setCallState('completed');

      // Play summary receipt in Tamil using browser synthesis
      if (grievances.length > 1) {
        speakTamil(`உங்கள் புகார்களைப் புரிந்துகொண்டோம். மொத்தம் ${grievances.length} புகார்கள் கண்டறியப்பட்டுள்ளன.`);
      } else if (grievances.length === 1) {
        const catText = grievances[0].category_tamil || 'புகார்';
        speakTamil(`உங்கள் ${catText} புகாரை புரிந்துகொண்டோம்.`);
      } else {
        speakTamil(`உங்கள் புகாரைப் புரிந்துகொண்டோம்.`);
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Analysis failed:', msg);
      setCallState('error');
      setErrorMessage(`AI பகுப்பாய்வு தோல்வியடைந்தது (AI analysis failed): ${msg}. Please check your backend .env API keys.`);
    }
  };

  // Fallback Helper: Inject Sample Complaint to bypass mic/keys issues for ideathon
  const handleUseSample = (exampleIndex: number) => {
    cleanupMediaStreams();
    setErrorMessage('');
    setCallState('analyzing');

    const examples = [
      {
        transcript: 'எங்க ஊர்ல மூணு நாளா தண்ணியே வரல. வயசானவங்க ரொம்ப கஷ்டப்படுறாங்க.',
        analysis: [
          {
            category: 'water' as const,
            category_tamil: 'குடிநீர்',
            priority: 'high' as const,
            issue: 'குடிநீர் விநியோகம் தடைபட்டுள்ளது',
            location: 'காட்டூர் (Kattur)',
            duration: '3 நாட்கள்',
            affected_people: 'முதியவர்கள் (Elderly residents)',
            urgency_reason: '3 நாட்களாக குடிநீர் இல்லாததால் முதியவர்கள் அவதி',
            department: 'குடிநீர் வடிகால் வாரியம் (TWAD Board)',
            summary_tamil: 'காட்டூரில் 3 நாட்களாக குடிநீர் வரவில்லை, முதியவர்கள் கடுமையாக அவதியுறுகின்றனர்.',
            summary_english: 'No water supply in Kattur for 3 days, causing high difficulty for elderly citizens.'
          }
        ]
      },
      {
        transcript: 'டிரான்ஸ்பார்மர் பக்கத்துல மின்கம்பி அறுந்து கிடக்கு. யாராவது மிதிச்சா ஆபத்து.',
        analysis: [
          {
            category: 'electricity' as const,
            category_tamil: 'மின்சாரம்',
            priority: 'critical' as const,
            issue: 'அறுந்து கிடக்கும் மின்கம்பி / Snapped live electrical wire',
            location: 'மதுரை வீதி (Madurai street)',
            duration: 'இன்று',
            affected_people: 'பாதசாரிகள் மற்றும் பொதுமக்கள்',
            urgency_reason: 'அறுந்த மின்கம்பி உயிர் ஆபத்து ஏற்படுத்தும் மின்விபத்து அபாயம்',
            department: 'மின்சார வாரியம் (TANGEDCO)',
            summary_tamil: 'மதுரை வீதி மின்மாற்றி அருகில் அறுந்த மின்கம்பி விழுந்து கிடப்பதால் ஆபத்து.',
            summary_english: 'Snapped power line lying near transformer poses severe electric electrocution hazard.'
          }
        ]
      },
      {
        transcript: 'எங்க தெருவுல பெரிய குழி இருக்கு. ஸ்கூல் பசங்க தினமும் அந்த வழியா போறாங்க.',
        analysis: [
          {
            category: 'road' as const,
            category_tamil: 'சாலை',
            priority: 'high' as const,
            issue: 'சாலையில் பெரிய பள்ளம் / Severe road pothole',
            location: 'காந்தி தெரு (Gandhi Street)',
            duration: 'ஒரு வாரம்',
            affected_people: 'பள்ளிச் சிறுவர்கள் மற்றும் பொதுமக்கள்',
            urgency_reason: 'பள்ளிக்குச் செல்லும் குழந்தைகள் தவறி விழுந்து காயம் அடையும் அபாயம்',
            department: 'நெடுஞ்சாலைத் துறை (Highways Department)',
            summary_tamil: 'காந்தி தெருவில் உள்ள பெரிய குழியால் பள்ளி குழந்தைகள் விழுந்து விபத்துக்குள்ளாகும் அபாயம்.',
            summary_english: 'Deep pothole on Gandhi Street is a hazard for school-going children.'
          }
        ]
      }
    ];

    const selected = examples[exampleIndex];
    setTranscript(selected.transcript);
    setConfidence(0.99);
    
    // Simulate API delay for realism
    setTimeout(() => {
      setAnalysisResult(selected.analysis);
      setCallState('completed');
      speakTamil(`உங்கள் புகாரைப் புரிந்துகொண்டோம்.`);
    }, 1000);
  };

  const handleNextStep = () => {
    if (transcript && analysisResult) {
      onAnalysisComplete({
        transcript_tamil: transcript,
        grievances: analysisResult as any
      });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-6 sm:p-8">
      {/* Prototype Label */}
      <div className="text-center bg-civic-50 text-civic-700 text-xs font-semibold py-2 px-4 rounded-full mb-6 border border-civic-100">
        🌐 Browser Voice Prototype — Future version can connect to Toll-Free IVR
      </div>

      {callState === 'idle' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
          <div className="bg-slate-100 p-6 rounded-full text-slate-400">
            <Mic className="h-16 w-16" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">குரல் வழி குறைதீர் சேவை</h2>
            <p className="text-slate-500 mt-2 max-w-sm text-sm">
              அழைப்பைத் துவங்கிய பின் மைக்ரோஃபோன் அனுமதியை வழங்கி, உங்களது புகாரைத் தமிழில் பேசிப் பதிவு செய்யவும்.
            </p>
          </div>
          <button
            onClick={handleStartCall}
            className="flex items-center space-x-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition duration-200 transform hover:-translate-y-0.5"
          >
            <Phone className="h-6 w-6 animate-pulse" />
            <span>📞 அழைக்கவும் (Call Center)</span>
          </button>

          {/* Quick Fallback Mock triggers (Useful for tests or missing api keys) */}
          <div className="w-full pt-6 border-t border-slate-100 mt-6 text-left">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>மாதிரி புகாரைக் கொண்டு சோதனை செய்ய (Demo Mode)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleUseSample(0)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2 px-3 rounded-lg text-slate-700 text-left truncate"
              >
                💧 குடிநீர் தட்டுப்பாடு
              </button>
              <button
                onClick={() => handleUseSample(1)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2 px-3 rounded-lg text-slate-700 text-left truncate"
              >
                ⚡ அறுந்த மின்கம்பி
              </button>
              <button
                onClick={() => handleUseSample(2)}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2 px-3 rounded-lg text-slate-700 text-left truncate"
              >
                🛣️ பெரிய சாலைக் குழி
              </button>
            </div>
          </div>
        </div>
      )}

      {(callState === 'connecting' || callState === 'connected' || callState === 'speaking') && (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {/* Dialer status card */}
          <div className="w-full bg-slate-900 text-white rounded-2xl p-6 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-3 left-3 flex items-center space-x-1">
              <span className={`h-2.5 w-2.5 rounded-full ${callState === 'speaking' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'connected' && 'Connected'}
                {callState === 'speaking' && 'Live Audio Session'}
              </span>
            </div>

            <div className="h-14 w-14 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold mb-2 mt-4 text-xl">
              1800
            </div>

            <span className="text-xl font-bold tracking-wide">குடிமக்கள் குறைதீர் மையம்</span>
            <span className="text-slate-400 text-xs mt-1">Grievance Voice Helpline</span>

            <div className="mt-8 text-center text-emerald-400 font-medium px-4 text-sm animate-pulse">
              {callState === 'connecting' && 'இணைப்பு ஏற்படுத்தப்படுகிறது... Connecting...'}
              {callState === 'connected' && 'வரவேற்புரை ஒலிக்கப்படுகிறது... Welcoming...'}
              {callState === 'speaking' && 'வணக்கம், உங்கள் புகாரைக் கூறுங்கள். (Speak Tamil now)'}
            </div>

            {callState === 'speaking' && (
              <div className="w-full mt-6">
                <AudioVisualizer stream={mediaStreamRef.current} isListening={true} />
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full border transition ${isMuted ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {callState === 'speaking' && (
              <button
                onClick={handleDoneSpeaking}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-6 rounded-full shadow transition"
              >
                பேசி முடித்தேன் / Done Speaking
              </button>
            )}

            <button
              onClick={handleEndCall}
              className="p-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full transition shadow-lg"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {(callState === 'transcribing' || callState === 'analyzing') && (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-civic-100 border-t-civic-600 animate-spin" />
            <Mic className="h-6 w-6 text-civic-600 absolute top-5 left-5 animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">
              {callState === 'transcribing' ? 'குரல் அங்கீகரிக்கப்படுகிறது...' : 'செயற்கை நுண்ணறிவு பகுப்பாய்வு செய்கிறது...'}
            </h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
              {callState === 'transcribing' 
                ? 'உங்கள் வாய்மொழி புகாரை தட்டச்சாக மாற்றி வருகிறோம். (Converting speech to Tamil text)'
                : 'உங்கள் புகாரில் உள்ள விவரங்களை AI கண்டறிகிறது. (Extracting grievance categories)'
              }
            </p>
          </div>
        </div>
      )}

      {callState === 'completed' && transcript && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
              <span className="text-emerald-700 font-bold text-sm">✓ குரல் பதிவு வெற்றிகரமாக பெறப்பட்டது</span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                Tamil STT: {Math.round(confidence * 100)}% Confidence
              </span>
            </div>
            
            <p className="text-slate-800 leading-relaxed font-medium bg-white p-4 rounded-xl shadow-sm border border-emerald-50 text-base">
              &ldquo;{transcript}&rdquo;
            </p>

            <div className="flex items-center space-x-2 mt-4">
              <button
                onClick={() => speakTamil(transcript)}
                className="flex items-center space-x-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-100 hover:bg-emerald-200 py-1.5 px-3 rounded-lg transition"
              >
                <Volume2 className="h-4 w-4" />
                <span>🔊 கேட்க (Listen back)</span>
              </button>
              
              <button
                onClick={handleStartCall}
                className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-700 font-semibold bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg transition"
              >
                <RefreshCw className="h-4 w-4" />
                <span>🔄 மீண்டும் சொல்லவும் (Re-speak)</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleNextStep}
            className="w-full flex items-center justify-center space-x-2 bg-civic-600 hover:bg-civic-700 text-white font-bold py-4 px-6 rounded-2xl shadow transition"
          >
            <span>புகார் விவரங்களை சரிபார்க்க</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {callState === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start space-x-3 text-red-700">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">பிழை ஏற்பட்டது / Processing Failure</h3>
              <p className="text-xs mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
            <button
              onClick={handleStartCall}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition"
            >
              🔄 மீண்டும் முயற்சிக்கவும் / Retry
            </button>
            <button
              onClick={() => handleUseSample(0)}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-sm transition"
            >
              💡 மாதிரி புகாரை பயன்படுத்து / Use Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
