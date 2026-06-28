import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Volume2, 
  VolumeX, 
  Database, 
  Code, 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight,
  Info,
  Calendar,
  User,
  Phone,
  ShieldCheck,
  Stethoscope,
  PlusCircle,
  FileText,
  UserX,
  MapPin,
  Check,
  X,
  Sparkles,
  ClipboardList,
  ChevronRight,
  LogOut,
  Pill,
  Receipt,
  MessageSquare,
  Globe,
  Settings,
  Lock,
  RotateCw,
  ArrowLeft,
  Search,
  CheckSquare,
  HelpCircle,
  ShieldAlert,
  Menu,
  Sun,
  Umbrella,
  CloudSun
} from 'lucide-react';
import { Patient, Doctor, Attendance, Appointment, VoiceLog } from './types';
import { CodeExplorer } from './components/CodeExplorer';
import { DatabaseGrid } from './components/DatabaseGrid';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function App() {
  // Path-based state router using HTML5 browser history
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Sidebar subtabs inside dashboards
  const [staffSidebarTab, setStaffSidebarTab] = useState<'command' | 'queue' | 'scheduling' | 'contact' | 'settings'>('command');
  const [doctorSidebarTab, setDoctorSidebarTab] = useState<'dashboard' | 'schedule' | 'patients' | 'notes' | 'settings'>('dashboard');
  const [patientSidebarTab, setPatientSidebarTab] = useState<'dashboard' | 'appointments' | 'labs' | 'billing' | 'help' | 'settings'>('dashboard');

  // Input & Recording States (Admin / Voice assistant)
  const [dictationText, setDictationText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeMicContext, setActiveMicContext] = useState<'welcome' | 'admin' | 'doctor' | 'patient'>('welcome');

  // Doctor Clinical Notes state
  const [doctorNotes, setDoctorNotes] = useState('');
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);

  // Patient Registration Form States (Staff dashboard / vox.html)
  const [patName, setPatName] = useState('');
  const [patAge, setPatAge] = useState('');
  const [patGender, setPatGender] = useState('M');
  const [patContact, setPatContact] = useState('');
  const [patAddress, setPatAddress] = useState('');
  const [patRegSuccess, setPatRegSuccess] = useState<string | null>(null);

  // Appointment Booking Form States (book.html / Scheduling tab)
  const [bookPatientId, setBookPatientId] = useState('');
  const [bookDoctorId, setBookDoctorId] = useState('DOC102'); // Defaults to Anand Varma
  const [bookDate, setBookDate] = useState('2026-06-22');
  const [bookTimeSlot, setBookTimeSlot] = useState('11:30 AM');
  const [bookReason, setBookReason] = useState('');
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  // Patient symptom checker widget
  const [symptomText, setSymptomText] = useState('');
  const [symptomGuideline, setSymptomGuideline] = useState<string | null>(null);

  // Database States (Fetched from backend)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);

  // Simulation loading / playback states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(true);
  const [apiResponse, setApiResponse] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recognition reference
  const recognitionRef = useRef<any>(null);

  // Dynamic Clock & Date variables
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dynamic Clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Clock display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format Date display
  const formatDateSlash = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateHeader = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Navigation pushState utility
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Listen for browser popstate
  useEffect(() => {
    const handlePopstate = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, []);

  // Fetch all db simulation values
  const refreshDatabaseState = async () => {
    try {
      const [resP, resD, resAt, resAp, resV] = await Promise.all([
        fetch('/api/db/patients').then(r => r.json()),
        fetch('/api/db/doctors').then(r => r.json()),
        fetch('/api/db/attendance').then(r => r.json()),
        fetch('/api/db/appointments').then(r => r.json()),
        fetch('/api/db/voicelogs').then(r => r.json())
      ]);

      setPatients(resP);
      setDoctors(resD);
      setAttendance(resAt);
      setAppointments(resAp);
      setVoiceLogs(resV);

      // Pre-fill some defaults if lists are loaded
      if (resP.length > 0 && !bookPatientId) {
        setBookPatientId(resP[0].patient_id);
      }
    } catch (e) {
      console.error("Failed fetching database state:", e);
    }
  };

  useEffect(() => {
    refreshDatabaseState();

    // Check speech recognition capabilities
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          }
        }
        if (finalTrans) {
          const lowerText = finalTrans.toLowerCase().trim();
          
          if (activeMicContext === 'welcome') {
            // Voice Navigation on landing page
            if (lowerText.includes('patient') || lowerText.includes('open patient')) {
              navigate('/patient-dashboard.html');
              speakText("Opening patient dashboard.");
            } else if (lowerText.includes('doctor') || lowerText.includes('doctor section')) {
              navigate('/doctor-dashboard.html');
              speakText("Opening doctor dashboard.");
            } else if (lowerText.includes('admin') || lowerText.includes('vox') || lowerText.includes('staff')) {
              navigate('/vox.html');
              speakText("Opening staff command center.");
            }
          } else if (activeMicContext === 'admin') {
            setDictationText(prev => prev ? `${prev} ${finalTrans}`.trim() : finalTrans);
          } else if (activeMicContext === 'doctor') {
            setDoctorNotes(prev => {
              const combined = prev ? `${prev} ${finalTrans}`.trim() : finalTrans;
              // Handle voice command shortcuts in Doctor portal
              if (combined.toLowerCase().includes('clear note')) {
                return '';
              }
              if (combined.toLowerCase().includes('save notes')) {
                handleSaveDoctorNotesDirectly(combined.replace(/save notes/gi, ''));
                return combined.replace(/save notes/gi, '');
              }
              return combined;
            });
          } else if (activeMicContext === 'patient') {
            setSymptomText(prev => prev ? `${prev} ${finalTrans}`.trim() : finalTrans);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [activeMicContext]);

  // Handle Recording Toggle
  const toggleRecording = (context: 'welcome' | 'admin' | 'doctor' | 'patient') => {
    setActiveMicContext(context);
    if (!speechSupported || !recognitionRef.current) {
      alert("Browser Speech Recognition not supported in this frame container. Please use preset testing prompts in the Command Dashboard!");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setErrorMessage(null);
      setSaveNotesSuccess(false);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Starting recognition failed:", e);
      }
    }
  };

  // Submit Dictation command to Express backend simulation
  const handleProcessCommand = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/voice-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dictation_text: textToSend })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed communicating with transition model.");
      }

      const data = await response.json();
      setApiResponse(data);
      
      // Auto-fill Pending Registration form fields on Command Dashboard
      if (data.voice_data && data.voice_data.intent === 'register_patient') {
        const ent = data.voice_data.entities;
        if (ent) {
          if (ent.name) setPatName(ent.name);
          if (ent.contact) setPatContact(ent.contact);
          if (ent.age) setPatAge(String(ent.age));
          if (ent.address) setPatAddress(ent.address);
          if (ent.reason) setBookReason(ent.reason);
        }
      }

      // Auto-fill Secure Booking Desk if booking details are extracted
      if (data.voice_data && data.voice_data.intent === 'book_appointment') {
        const ent = data.voice_data.entities;
        if (ent) {
          if (ent.doctor_name) {
            const matchedDoc = doctors.find(d => d.name.toLowerCase().includes(ent.doctor_name.toLowerCase()));
            if (matchedDoc) {
              setBookDoctorId(matchedDoc.doctor_id);
            }
          }
          if (ent.date) setBookDate(ent.date);
          if (ent.time_slot) setBookTimeSlot(ent.time_slot);
          if (ent.reason) setBookReason(ent.reason);
        }
      }
      
      // Auto triggers audio text-to-speech feedback using WebSpeech synthesizer
      if (isTTSActive && data.tts_feedback) {
        speakText(data.tts_feedback);
      }

      // Refresh live database state
      await refreshDatabaseState();

    } catch (e: any) {
      setErrorMessage(e.message || "Endpoint error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Speaks feedback audio
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const idealVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
      if (idealVoice) {
        utterance.voice = idealVoice;
      }
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Presets trigger handlers
  const handleApplyPreset = (presetText: string) => {
    setDictationText(presetText);
    handleProcessCommand(presetText);
  };

  // Interactive manual clinical patient registration
  const handleRegisterPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!patName || !patContact) {
      alert("Name and Contact Phone are required.");
      return;
    }
    setIsProcessing(true);
    setPatRegSuccess(null);
    try {
      const response = await fetch('/api/db/register-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patName,
          age: patAge,
          gender: patGender,
          contact: patContact,
          address: patAddress,
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        const outMsg = `Patient registered with ID ${data.patient.patient_id}!`;
        setPatRegSuccess(outMsg);
        setBookPatientId(data.patient.patient_id);
        
        // Clear intake fields
        setPatName('');
        setPatAge('');
        setPatGender('M');
        setPatContact('');
        setPatAddress('');
        
        speakText(`Patient registered successfully with identifier ${data.patient.patient_id}`);
        await refreshDatabaseState();
      }
    } catch {
      alert("Registration failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Interactive direct appointment booking with physician presence rules
  const handleBookAppointment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bookPatientId) {
      setBookError("A registered Patient Identifier is required.");
      return;
    }
    setIsProcessing(true);
    setBookSuccess(null);
    setBookError(null);
    try {
      const response = await fetch('/api/db/book-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: bookPatientId,
          doctor_id: bookDoctorId,
          date: bookDate,
          time_slot: bookTimeSlot,
          reason: bookReason || "Routine general consultation review"
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setBookError(data.error || "Doctor availability check failed.");
        speakText(data.error || "Scheduling Failed.");
      } else if (data.status === 'success') {
        setBookSuccess(`Appointment Confirmed! Assigned ID #${data.appointment.appointment_id}.`);
        setBookReason('');
        speakText(`Your appointment is confirmed on ${data.appointment.date} at ${data.appointment.time_slot}.`);
        await refreshDatabaseState();
      }
    } catch {
      setBookError("Error booking appointment. Validate registry key.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Interactive doctor shift status toggle
  const handleToggleDoctorAttendance = async (doctorId: string) => {
    setIsProcessing(true);
    try {
      await fetch('/api/db/toggle-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId })
      });
      await refreshDatabaseState();
      speakText("Physician duty rosters updated.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clinician status marking (Mark attendance / Complete consultation)
  const handleUpdateApptStatus = async (apptId: number, status: string) => {
    setIsProcessing(true);
    try {
      await fetch('/api/db/update-appointment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: apptId, status })
      });
      await refreshDatabaseState();
      speakText(`Appointment status resolved as ${status}.`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Interactive Patient symptom checker recommendation AI
  const handleCheckSymptoms = async () => {
    if (!symptomText.trim()) return;
    setIsProcessing(true);
    setSymptomGuideline(null);
    try {
      const response = await fetch('/api/voice-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dictation_text: `Symptom report: ${symptomText}` })
      });
      const data = await response.json();
      setSymptomGuideline(data.tts_feedback || "Fever/cough requires resting. Book consult immediately.");
      speakText(data.tts_feedback || "Fever/cough requires resting. Book consult immediately.");
    } catch {
      setSymptomGuideline("System busy, please schedule a direct consult slot.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean database tables/ledgers back to simulated default
  const handleResetTables = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/db/reset', { method: 'POST' });
      setApiResponse(null);
      setDictationText('');
      setBookSuccess(null);
      setBookError(null);
      setPatRegSuccess(null);
      setSymptomGuideline(null);
      setDoctorNotes('');
      await refreshDatabaseState();
      speakText("Relational ledger tables reverted to initial isolated state.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Directly save doctor notes
  const handleSaveDoctorNotesDirectly = (notes: string) => {
    setSaveNotesSuccess(true);
    speakText("Notes saved successfully.");
    setTimeout(() => {
      setSaveNotesSuccess(false);
    }, 4000);
  };

  // Doctor Dashboard Varma metrics
  const docVarma = doctors.find(d => d.doctor_id === 'DOC102') || { name: 'Anand Varma', specialty: 'Orthopedics' };
  const docVarmaAtt = attendance.find(a => a.doctor_id === 'DOC102');
  const isVarmaAvailable = docVarmaAtt ? docVarmaAtt.is_available : true;
  const varmaAppointments = appointments.filter(a => a.doctor_id === 'DOC102');
  const nextVarmaAppt = varmaAppointments.filter(a => a.status === 'CONFIRMED')[0];

  // Patient Dashboard (Rohan Das) metrics
  const activePatientId = 'PAT1204';
  const rohanPatient = patients.find(p => p.patient_id === activePatientId) || { name: 'Rohan Das', patient_id: 'PAT1204' };
  const rohanAppointments = appointments.filter(a => a.patient_id === activePatientId && a.status === 'CONFIRMED');
  const nextRohanAppt = rohanAppointments[0];

  // Check URL paths to render pages individually
  const isWelcomePath = currentPath === '/' || currentPath === '' || currentPath.endsWith('index.html');
  const isAdminPath = currentPath.includes('vox.html') || currentPath.includes('admin');
  const isDoctorPath = currentPath.includes('doctor-dashboard.html') || currentPath.includes('doctor');
  const isPatientPath = currentPath.includes('patient-dashboard.html') || currentPath.includes('patient');
  const isBookPath = currentPath.includes('book.html') || currentPath.includes('book');

  return (
    <div className="min-h-screen w-full font-sans antialiased text-slate-800 bg-[#f8fafc]">
      
      {/* 1. WELCOME / SIGNUP ROUTE (/) */}
      {isWelcomePath && (
        <div className="min-h-screen w-full bg-gradient-to-tr from-teal-300 via-cyan-400 to-blue-500 flex items-center justify-center p-6 select-none">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl p-10 flex flex-col md:flex-row items-center justify-between gap-10 border border-white/20">
            
            {/* Left side: Avatar, Voice instructions, Microphone button */}
            <div className="flex flex-col items-center flex-1 text-center">
              <h1 className="text-3xl font-extrabold text-blue-750 tracking-tight text-[#1d4ed8]">Welcome</h1>
              <h1 className="text-3xl font-extrabold text-blue-750 tracking-tight mt-1 text-[#1d4ed8]">To VoxAI</h1>
              
              {/* Illustrative clinician avatar inside card */}
              <div className="mt-6 filter drop-shadow-md">
                <svg viewBox="0 0 200 200" className="w-36 h-36">
                  <circle cx="100" cy="100" r="95" fill="#f8fafc" />
                  {/* Hair back */}
                  <path d="M50 120 C50 60, 150 60, 150 120 C150 140, 140 160, 140 160 C140 160, 130 110, 100 110 C70 110, 60 160, 60 160 C60 160, 50 140, 50 120 Z" fill="#475569" />
                  {/* Shirt */}
                  <path d="M55 170 C55 140, 75 125, 100 125 C125 125, 145 140, 145 170 Z" fill="#f97316" />
                  <path d="M85 125 L100 145 L115 125 Z" fill="#ffedd5" />
                  {/* Head & Neck */}
                  <rect x="90" y="105" width="20" height="25" fill="#ffedd5" rx="5" />
                  <circle cx="100" cy="80" r="32" fill="#ffedd5" />
                  {/* Hair front/fringe */}
                  <path d="M68 80 C68 45, 132 45, 132 80 C132 50, 68 50, 68 80 Z" fill="#475569" />
                  <path d="M68 70 C75 55, 95 62, 100 68 C105 62, 125 55, 132 70 C125 52, 75 52, 68 70 Z" fill="#334155" />
                </svg>
              </div>

              <div className="bg-[#e0f2fe] border border-sky-100 text-sky-850 px-3 py-1.5 rounded-lg text-xs font-bold mt-6 tracking-wide shadow-sm text-[#0369a1]">
                Say "Open patient" or "Doctor section"
              </div>

              {/* Large blue mic button */}
              <button
                onClick={() => toggleRecording('welcome')}
                className={`mt-4 h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all transform scale-100 active:scale-95 cursor-pointer shadow-lg ${
                  isRecording && activeMicContext === 'welcome'
                    ? 'bg-rose-500 border-rose-300 text-white animate-pulse shadow-rose-900/40'
                    : 'bg-[#1e40af] border-blue-400 text-white hover:bg-blue-800'
                }`}
              >
                {isRecording && activeMicContext === 'welcome' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {/* Right side: stacked portal links */}
            <div className="flex flex-col gap-4 w-full md:w-56">
              <button
                onClick={() => navigate('/patient-dashboard.html')}
                className="w-full bg-[#0ea5e9] hover:bg-sky-500 text-white font-bold py-3.5 px-6 rounded-lg text-sm tracking-wider uppercase shadow-md transition-all cursor-pointer"
              >
                Patient
              </button>
              <button
                onClick={() => navigate('/doctor-dashboard.html')}
                className="w-full bg-[#0ea5e9] hover:bg-sky-500 text-white font-bold py-3.5 px-6 rounded-lg text-sm tracking-wider uppercase shadow-md transition-all cursor-pointer"
              >
                Doctor
              </button>
              <button
                onClick={() => navigate('/vox.html')}
                className="w-full bg-[#0ea5e9] hover:bg-sky-500 text-white font-bold py-3.5 px-6 rounded-lg text-sm tracking-wider uppercase shadow-md transition-all cursor-pointer"
              >
                Admin
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. STAFF COMMAND DASHBOARD ROUTE (/vox.html) */}
      {isAdminPath && (
        <div className="min-h-screen w-full flex bg-[#f0f9ff]/45 overflow-hidden">
          
          {/* Left sky blue sidebar */}
          <aside className="w-64 bg-[#0ea5e9] flex flex-col justify-between text-white select-none shrink-0">
            <div>
              <div className="p-6">
                <h2 className="text-xl font-bold leading-tight uppercase font-sans tracking-wide">VoxAI</h2>
                <h2 className="text-xl font-bold leading-tight uppercase font-sans mt-0.5 tracking-wide">HMS Staff</h2>
              </div>

              <nav className="mt-4 px-2 flex flex-col gap-1.5">
                <button 
                  onClick={() => setStaffSidebarTab('command')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    staffSidebarTab === 'command'
                      ? 'bg-[#e0f2fe] text-[#0369a1] shadow-md shadow-sky-900/10'
                      : 'hover:bg-[#0284c7]/40 text-sky-50'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  Command Center
                </button>

                <button 
                  onClick={() => setStaffSidebarTab('queue')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    staffSidebarTab === 'queue'
                      ? 'bg-[#e0f2fe] text-[#0369a1] shadow-md shadow-sky-900/10'
                      : 'hover:bg-[#0284c7]/40 text-sky-50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Today's Queue
                </button>

                <button 
                  onClick={() => setStaffSidebarTab('scheduling')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    staffSidebarTab === 'scheduling'
                      ? 'bg-[#e0f2fe] text-[#0369a1] shadow-md shadow-sky-900/10'
                      : 'hover:bg-[#0284c7]/40 text-sky-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Scheduling
                </button>

                <button 
                  onClick={() => setStaffSidebarTab('contact')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    staffSidebarTab === 'contact'
                      ? 'bg-[#e0f2fe] text-[#0369a1] shadow-md shadow-sky-900/10'
                      : 'hover:bg-[#0284c7]/40 text-sky-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Center
                </button>

                <button 
                  onClick={() => setStaffSidebarTab('settings')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    staffSidebarTab === 'settings'
                      ? 'bg-[#e0f2fe] text-[#0369a1] shadow-md shadow-sky-900/10'
                      : 'hover:bg-[#0284c7]/40 text-sky-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  My Settings
                </button>
              </nav>
            </div>

            {/* Sidebar widgets & dynamic time display */}
            <div className="p-4 flex flex-col gap-3.5 border-t border-sky-400/30 bg-[#0ea5e9]/70">
              <div className="flex items-center gap-2">
                <CloudSun className="w-6 h-6 text-amber-100 animate-pulse" />
                <div className="font-sans">
                  <div className="text-xs font-bold">29°C</div>
                  <div className="text-[10px] text-sky-100 font-semibold uppercase leading-none mt-0.5">Mostly sunny</div>
                </div>
              </div>
              <div className="font-mono text-left">
                <div className="text-sm font-bold tracking-wider">{formatTime(currentTime)}</div>
                <div className="text-[10px] text-sky-100 font-bold mt-0.5 uppercase tracking-widest">{formatDateSlash(currentTime)}</div>
              </div>
              {/* Return to welcome */}
              <button 
                onClick={() => navigate('/')}
                className="w-full mt-1.5 text-center border border-white/20 hover:border-white/50 text-[10px] uppercase font-bold py-1.5 rounded transition-all cursor-pointer"
              >
                Back to Welcome
              </button>
            </div>
          </aside>

          {/* Right Content area */}
          <div className="flex-1 bg-[#f0f9ff]/45 p-6 flex flex-col overflow-y-auto">
            {/* Header Welcome Bar */}
            <div className="flex items-start justify-between border-b border-sky-100 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#0369a1] font-sans tracking-tight">Hello, Ms. Sharma!</h1>
                <div className="text-xs font-bold text-[#0ea5e9] uppercase tracking-widest mt-1">ID: ST456</div>
              </div>
              <div className="text-right text-xs font-bold text-slate-500 uppercase font-sans pt-1">
                {formatDateHeader(currentTime)}
              </div>
            </div>

            {/* Command Subtab View: Hand-Free Console */}
            {staffSidebarTab === 'command' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Left Column: Dictation Console Card */}
                <div className="lg:col-span-7 bg-[#0284c7] rounded-2xl shadow-lg border border-sky-600/35 p-6 text-white flex flex-col justify-between min-h-[480px]">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-sky-400/45">
                    <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                      <span>🎙</span> VOXAI: HANDS-FREE WORKFLOW
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsTTSActive(!isTTSActive)}
                        className="bg-[#0ea5e9]/40 hover:bg-[#0ea5e9]/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all"
                      >
                        {isTTSActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        TTS
                      </button>
                    </div>
                  </div>

                  {/* Dictation box */}
                  <div className="my-6 flex-1 bg-sky-950/45 rounded-xl border border-sky-400/30 p-4 shadow-inner flex flex-col">
                    <textarea
                      value={dictationText}
                      onChange={(e) => setDictationText(e.target.value)}
                      placeholder="Click the mic to begin patient intake dictation..."
                      className="w-full flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-sky-100 placeholder-sky-200/50 italic font-medium"
                    />
                    {isRecording && activeMicContext === 'admin' && (
                      <span className="text-[10px] text-sky-200 animate-pulse font-bold mt-1">Listening to your dictation... Speak clearly.</span>
                    )}
                    {dictationText && (
                      <button onClick={() => setDictationText('')} className="self-end text-[10px] text-sky-200 hover:text-white font-bold mt-1">
                        [Wipe]
                      </button>
                    )}
                  </div>

                  {/* Microphone */}
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={() => toggleRecording('admin')}
                      className={`h-16 w-16 rounded-full flex items-center justify-center border shadow-xl transition-all transform scale-100 active:scale-95 cursor-pointer ${
                        isRecording && activeMicContext === 'admin'
                          ? 'bg-rose-500 border-rose-455 text-white animate-pulse shadow-rose-900/40' 
                          : 'bg-rose-400 border-rose-300 text-white hover:bg-rose-500 shadow-rose-900/20'
                      }`}
                    >
                      {isRecording && activeMicContext === 'admin' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <span className="text-xs font-bold tracking-wider block">
                      {isRecording && activeMicContext === 'admin' ? "Transcribing vocals..." : "Click mic to dictate"}
                    </span>
                  </div>

                  {/* Try Saying Preset footer */}
                  <div className="mt-6 pt-3 border-t border-sky-450/30 text-center">
                    <p className="text-[11px] leading-relaxed text-sky-100 italic font-medium">
                      <strong className="font-bold not-italic">Try saying: </strong>
                      "Patient name Anjali Menon phone 9876543210 department Cardiology age 28 reason checkup"
                    </p>
                  </div>

                </div>

                {/* Right Column: Pending Verification Data */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Intake Verification Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-sky-100">
                      <span className="text-emerald-500 font-bold text-xs">✅</span>
                      <h3 className="font-bold text-sky-850 text-xs uppercase tracking-wider text-slate-800">Pending Registration (Verify Data)</h3>
                    </div>

                    {patRegSuccess && (
                      <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-lg p-2.5 text-xs font-medium">
                        {patRegSuccess}
                      </div>
                    )}

                    <form onSubmit={handleRegisterPatient} className="flex flex-col gap-3 font-sans">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wide">Patient Name</label>
                        <input 
                          type="text" 
                          placeholder="Patient Name (Auto-filled)" 
                          value={patName}
                          onChange={e => setPatName(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 font-semibold focus:bg-white outline-none focus:border-sky-500"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wide">Contact Number</label>
                        <input 
                          type="tel" 
                          placeholder="Contact Number (Auto-filled)" 
                          value={patContact}
                          onChange={e => setPatContact(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 font-semibold focus:bg-white outline-none focus:border-sky-500"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wide">Age</label>
                        <input 
                          type="number" 
                          placeholder="Age (Auto-filled)" 
                          value={patAge}
                          onChange={e => setPatAge(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-855 font-semibold focus:bg-white outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wide">Target Department</label>
                        <select
                          value={bookDoctorId}
                          onChange={e => setBookDoctorId(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 font-bold focus:bg-white outline-none focus:border-sky-500"
                        >
                          <option value="DOC101">Cardiology (Dr. Menon)</option>
                          <option value="DOC102">Orthopedics (Dr. Varma)</option>
                          <option value="DOC103">Pediatrics (Dr. Chen)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-550 font-bold uppercase tracking-wide">Reason for Visit</label>
                        <input 
                          type="text" 
                          placeholder="Reason for consultation (Auto-filled)" 
                          value={bookReason}
                          onChange={e => setBookReason(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 font-semibold focus:bg-white outline-none focus:border-sky-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full mt-2 bg-rose-455 bg-[#ff7a6b] hover:bg-rose-500 text-white font-bold text-xs uppercase p-3 rounded-lg tracking-wider transition-colors cursor-pointer shadow-md"
                      >
                        Finalize & Check-in Patient
                      </button>
                    </form>
                  </div>

                  {/* Today's Queue Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-sky-100">
                      <span className="text-sky-500 font-bold text-xs">📋</span>
                      <h3 className="font-bold text-sky-850 text-xs uppercase tracking-wider text-slate-800">Today's Queue</h3>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                      {appointments.map((a, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-850">{a.patient_name}</span>
                            <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Dr. {a.doctor_name} ({a.doctor_specialty})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sky-600 block">{a.time_slot}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Queue Subtab */}
            {staffSidebarTab === 'queue' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
                <h3 className="font-bold text-[#0369a1] text-sm uppercase tracking-wider mb-4 pb-2 border-b font-sans">Active Queue System</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointments.map((a, idx) => (
                    <div key={idx} className="bg-[#f8fafc] border border-slate-200 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{a.patient_name}</h4>
                        <span className="text-[10px] text-slate-450 block mt-1">Dr. {a.doctor_name} ({a.doctor_specialty})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-sky-600">{a.time_slot}</span>
                        <span className="text-[10px] font-mono block mt-1 text-slate-400">{a.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduling Subtab */}
            {staffSidebarTab === 'scheduling' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
                  <h3 className="font-bold text-sky-850 text-xs uppercase tracking-wider mb-4 pb-2 border-b">Intake New Patient</h3>
                  <form onSubmit={handleRegisterPatient} className="flex flex-col gap-3 text-xs">
                    <input type="text" placeholder="Full Patient Name" value={patName} onChange={e => setPatName(e.target.value)} className="border p-2.5 rounded-lg w-full" required />
                    <input type="number" placeholder="Age" value={patAge} onChange={e => setPatAge(e.target.value)} className="border p-2.5 rounded-lg w-full" />
                    <input type="tel" placeholder="Contact Phone" value={patContact} onChange={e => setPatContact(e.target.value)} className="border p-2.5 rounded-lg w-full" required />
                    <input type="text" placeholder="Residential Address" value={patAddress} onChange={e => setPatAddress(e.target.value)} className="border p-2.5 rounded-lg w-full" />
                    <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold p-2.5 rounded-lg uppercase cursor-pointer">Register Profile</button>
                  </form>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
                  <h3 className="font-bold text-sky-850 text-xs uppercase tracking-wider mb-4 pb-2 border-b">Schedule Doctor Slot</h3>
                  <form onSubmit={handleBookAppointment} className="flex flex-col gap-3 text-xs">
                    <select value={bookPatientId} onChange={e => setBookPatientId(e.target.value)} className="border p-2.5 rounded-lg w-full" required>
                      <option value="">Choose Patient...</option>
                      {patients.map(p => (
                        <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</option>
                      ))}
                    </select>
                    <select value={bookDoctorId} onChange={e => setBookDoctorId(e.target.value)} className="border p-2.5 rounded-lg w-full">
                      {doctors.map(d => (
                        <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.name} ({d.specialty})</option>
                      ))}
                    </select>
                    <input type="date" value={bookDate} onChange={e => setBookDate(e.target.value)} className="border p-2.5 rounded-lg w-full font-mono" />
                    <textarea placeholder="Clinical complaints reason..." value={bookReason} onChange={e => setBookReason(e.target.value)} className="border p-2.5 rounded-lg w-full h-20" />
                    <button type="submit" className="bg-[#2563eb] text-white font-bold p-2.5 rounded-lg uppercase cursor-pointer">Schedule Slot</button>
                  </form>
                </div>
              </div>
            )}

            {/* Contact Center Subtab */}
            {staffSidebarTab === 'contact' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 max-w-xl mx-auto w-full">
                <h3 className="font-bold text-[#0369a1] text-sm uppercase tracking-wider mb-4 pb-2 border-b font-sans">Clinical FAQ Assistant</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="Enter complaints or query..." value={symptomText} onChange={e => setSymptomText(e.target.value)} className="flex-1 border p-2 text-xs rounded-lg font-semibold" />
                  <button onClick={handleCheckSymptoms} className="bg-[#0ea5e9] hover:bg-sky-500 text-white font-bold px-4 py-2 text-xs rounded-lg uppercase cursor-pointer">Submit</button>
                </div>
                {symptomGuideline && (
                  <div className="bg-sky-50 border border-sky-150 p-4 rounded-xl text-xs mt-4">
                    <span className="text-[10px] font-bold text-sky-700 block uppercase font-mono">NLU Response:</span>
                    <p className="italic text-slate-700 font-semibold mt-1">"{symptomGuideline}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Subtab */}
            {staffSidebarTab === 'settings' && (
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4">
                  <DatabaseGrid
                    patients={patients}
                    doctors={doctors}
                    attendance={attendance}
                    appointments={appointments}
                    voiceLogs={voiceLogs}
                    onReset={handleResetTables}
                    isLoading={isProcessing}
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4">
                  <CodeExplorer />
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* 3. DOCTOR DASHBOARD ROUTE (/doctor-dashboard.html) */}
      {isDoctorPath && (
        <div className="min-h-screen w-full flex bg-[#eff6ff]/35 overflow-hidden">
          
          {/* Left blue sidebar */}
          <aside className="w-64 bg-[#1e40af] flex flex-col justify-between text-white select-none shrink-0">
            <div>
              <div className="p-6">
                <h2 className="text-xl font-bold uppercase tracking-wider font-sans">VoxAI HMS</h2>
              </div>

              <nav className="mt-4 px-2 flex flex-col gap-1.5">
                <button 
                  onClick={() => setDoctorSidebarTab('dashboard')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    doctorSidebarTab === 'dashboard'
                      ? 'bg-[#3b82f6]/40 text-white shadow-md'
                      : 'hover:bg-[#1d4ed8] text-blue-50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Dashboard
                </button>

                <button 
                  onClick={() => setDoctorSidebarTab('schedule')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    doctorSidebarTab === 'schedule'
                      ? 'bg-[#3b82f6]/40 text-white shadow-md'
                      : 'hover:bg-[#1d4ed8] text-blue-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </button>

                <button 
                  onClick={() => setDoctorSidebarTab('patients')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    doctorSidebarTab === 'patients'
                      ? 'bg-[#3b82f6]/40 text-white shadow-md'
                      : 'hover:bg-[#1d4ed8] text-blue-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  My Patients
                </button>

                <button 
                  onClick={() => setDoctorSidebarTab('notes')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    doctorSidebarTab === 'notes'
                      ? 'bg-[#3b82f6]/40 text-white shadow-md'
                      : 'hover:bg-[#1d4ed8] text-blue-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Dictation Notes
                </button>

                <button 
                  onClick={() => setDoctorSidebarTab('settings')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    doctorSidebarTab === 'settings'
                      ? 'bg-[#3b82f6]/40 text-white shadow-md'
                      : 'hover:bg-[#1d4ed8] text-blue-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </nav>
            </div>

            {/* Logout button */}
            <div className="p-4 flex flex-col gap-2">
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-[#ef4444] hover:bg-red-650 text-white rounded-lg p-2.5 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-red-950/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>

          {/* Right Content area */}
          <div className="flex-1 bg-slate-50/55 p-6 flex flex-col overflow-y-auto relative">
            
            {/* Header Welcome Bar */}
            <div className="flex items-start justify-between border-b border-blue-100 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-blue-900 font-sans tracking-tight">Hello, Doctor!</h1>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-550 font-sans pt-1">
                <span>{formatDateHeader(currentTime)}</span>
                <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Status:</span>
                  <span className={`font-bold font-mono tracking-wider ${isVarmaAvailable ? 'text-green-600' : 'text-red-500'}`}>
                    {isVarmaAvailable ? 'PRESENT' : 'ABSENT'}
                  </span>
                  <button 
                    onClick={() => handleToggleDoctorAttendance('DOC102')}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase transition-all cursor-pointer shadow-sm"
                  >
                    {isVarmaAvailable ? 'Mark Absent' : 'Mark In'}
                  </button>
                </div>
              </div>
            </div>

            {/* Subtab 1: Main Doctor Dashboard View */}
            {doctorSidebarTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Left Column: Appointments and Notes */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  
                  {/* Appointments List */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                    <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider pb-2 border-b">Appointments for Today</h3>
                    
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {varmaAppointments.length === 0 ? (
                        <div className="text-center text-slate-450 py-10 text-xs font-sans italic">
                          No appointments remaining for today.
                        </div>
                      ) : (
                        varmaAppointments.map((a, idx) => (
                          <div key={idx} className="bg-[#f8fafc] border border-slate-150 p-4 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{a.patient_name}</h4>
                              <span className="text-[10px] text-slate-450 block font-bold mt-0.5">{a.time_slot} — {a.reason || 'Check up'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => { speakText(`Starting consultation for patient ${a.patient_name}`); alert(`Started checkup session for ${a.patient_name}`); }}
                                className="bg-[#3b82f6] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase transition-colors cursor-pointer"
                              >
                                Start
                              </button>
                              <button
                                onClick={() => handleUpdateApptStatus(a.appointment_id, 'CANCELLED')}
                                className="bg-[#ef4444] hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Clinical Overview Notes */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider">Clinical Overview & Diagnostics</h3>
                      {saveNotesSuccess && (
                        <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 font-bold px-2 py-0.5 rounded">
                          Saved to EHR!
                        </span>
                      )}
                    </div>
                    <textarea
                      placeholder="Use the floating microphone or type here to document charts..."
                      value={doctorNotes}
                      onChange={e => setDoctorNotes(e.target.value)}
                      className="w-full h-32 border border-slate-200 rounded-xl p-3 text-xs text-slate-850 font-semibold focus:bg-white outline-none focus:border-blue-500 resize-none"
                    />
                    <button
                      onClick={() => handleSaveDoctorNotesDirectly(doctorNotes)}
                      disabled={!doctorNotes.trim()}
                      className="self-start bg-[#1e40af] hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold uppercase px-4 py-2.5 rounded-lg tracking-wider transition-colors cursor-pointer shadow-sm"
                    >
                      Save Chart Record
                    </button>
                  </div>

                </div>

                {/* Right Column: Next Up and Alerts */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  
                  {/* Next Up Card */}
                  <div className="bg-white rounded-2xl border border-l-4 border-l-green-500 border-slate-200 shadow-md p-5 flex flex-col gap-3">
                    <h3 className="font-bold text-slate-850 text-xs uppercase tracking-wider font-sans">Next Up: {nextVarmaAppt ? nextVarmaAppt.patient_name : 'No patient'}</h3>
                    <div className="font-sans">
                      <div className="text-lg font-bold text-blue-800">{nextVarmaAppt ? nextVarmaAppt.time_slot : 'No slots scheduled'}</div>
                      <div className="text-xs text-slate-550 mt-1 font-semibold leading-relaxed">
                        Reason: {nextVarmaAppt ? (nextVarmaAppt.reason || 'General Baseline Checkup') : 'No upcoming appointments'}
                      </div>
                    </div>
                    {nextVarmaAppt && (
                      <button 
                        onClick={() => speakText(`Viewing chart for ${nextVarmaAppt.patient_name}`)}
                        className="w-full mt-2 bg-[#3b82f6] hover:bg-blue-600 text-white font-bold text-xs uppercase py-2.5 rounded-lg tracking-wider transition-colors cursor-pointer"
                      >
                        View Patient Chart
                      </button>
                    )}
                  </div>

                  {/* Urgent Notifications */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-3">
                    <h3 className="font-bold text-red-650 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-slate-800">Urgent Notifications</span>
                    </h3>
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                        <span className="text-red-700 font-bold font-sans">Lab Result Alert: Patient C401 - High Blood Sugar</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Shift Schedule roster */}
            {doctorSidebarTab === 'schedule' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 max-w-md">
                <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b font-sans">Duty Schedules</h3>
                <div className="flex flex-col gap-3">
                  {doctors.map(d => {
                    const attRecord = attendance.find(a => a.doctor_id === d.doctor_id);
                    const isAvailable = attRecord ? attRecord.is_available : true;
                    return (
                      <div key={d.doctor_id} className="flex justify-between items-center border-b pb-2 text-xs">
                        <span className="font-bold text-slate-800">Dr. {d.name} ({d.specialty})</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          isAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {isAvailable ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patients subtab */}
            {doctorSidebarTab === 'patients' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 font-sans">
                <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b">Clinical Patient Registry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients.map(p => (
                    <div key={p.patient_id} className="bg-slate-50 border p-3 rounded-lg text-xs">
                      <h4 className="font-bold text-slate-800 text-sm">{p.name} ({p.patient_id})</h4>
                      <div className="text-slate-550 mt-1 font-semibold">Age: {p.age || 'N/A'} | Sex: {p.gender} | Phone: {p.contact}</div>
                      <div className="text-slate-450 mt-1">Address: {p.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes subtab */}
            {doctorSidebarTab === 'notes' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
                <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b font-sans">NLU Transcript Auditing</h3>
                <div className="flex flex-col gap-3 font-sans">
                  {voiceLogs.map(l => (
                    <div key={l.log_id} className="bg-[#f8fafc] border p-3 rounded-lg text-xs leading-relaxed">
                      <div className="text-[10px] font-bold text-slate-400 font-mono mb-1">{new Date(l.timestamp).toLocaleString()}</div>
                      <p className="italic text-slate-700">"Dictation: {l.raw_text}"</p>
                      <div className="text-blue-800 font-bold mt-1 uppercase text-[10px] font-mono">Intent resolved: {l.intent} | Response: {l.response_text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Settings */}
            {doctorSidebarTab === 'settings' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4">
                <DatabaseGrid
                  patients={patients}
                  doctors={doctors}
                  attendance={attendance}
                  appointments={appointments}
                  voiceLogs={voiceLogs}
                  onReset={handleResetTables}
                  isLoading={isProcessing}
                />
              </div>
            )}

            {/* Floating Microphone Action Button */}
            <button
              onClick={() => toggleRecording('doctor')}
              className={`fixed bottom-12 right-12 h-14 w-14 rounded-full flex items-center justify-center border shadow-2xl transition-all transform scale-100 active:scale-95 cursor-pointer z-50 ${
                isRecording && activeMicContext === 'doctor'
                  ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-red-900/40' 
                  : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 shadow-blue-900/40'
              }`}
            >
              {isRecording && activeMicContext === 'doctor' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

          </div>
        </div>
      )}

      {/* 4. PATIENT DASHBOARD ROUTE (/patient-dashboard.html) */}
      {isPatientPath && (
        <div className="min-h-screen w-full flex bg-[#f0fdfa]/35 overflow-hidden">
          
          {/* Left teal sidebar */}
          <aside className="w-64 bg-[#0f766e] flex flex-col justify-between text-white select-none shrink-0">
            <div>
              <div className="p-6">
                <h2 className="text-xl font-bold uppercase tracking-wider font-sans">VoxAI HMS</h2>
              </div>

              <nav className="mt-4 px-2 flex flex-col gap-1.5">
                <button 
                  onClick={() => setPatientSidebarTab('dashboard')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    patientSidebarTab === 'dashboard'
                      ? 'bg-[#14b8a6]/40 text-white shadow-md'
                      : 'hover:bg-[#0d9488] text-teal-50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Dashboard
                </button>

                <button 
                  onClick={() => navigate('/book.html')}
                  className="w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer hover:bg-[#0d9488] text-teal-50"
                >
                  <Calendar className="w-4 h-4" />
                  Appointments
                </button>

                <button 
                  onClick={() => setPatientSidebarTab('labs')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    patientSidebarTab === 'labs'
                      ? 'bg-[#14b8a6]/40 text-white shadow-md'
                      : 'hover:bg-[#0d9488] text-teal-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Lab & Reports
                </button>

                <button 
                  onClick={() => setPatientSidebarTab('billing')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    patientSidebarTab === 'billing'
                      ? 'bg-[#14b8a6]/40 text-white shadow-md'
                      : 'hover:bg-[#0d9488] text-teal-50'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Billing & Payments
                </button>

                <button 
                  onClick={() => setPatientSidebarTab('help')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    patientSidebarTab === 'help'
                      ? 'bg-[#14b8a6]/40 text-white shadow-md'
                      : 'hover:bg-[#0d9488] text-teal-50'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  Help & Support
                </button>

                <button 
                  onClick={() => setPatientSidebarTab('settings')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer ${
                    patientSidebarTab === 'settings'
                      ? 'bg-[#14b8a6]/40 text-white shadow-md'
                      : 'hover:bg-[#0d9488] text-teal-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Multilingual Settings
                </button>
              </nav>
            </div>

            <div className="p-4 flex flex-col gap-2">
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-[#ef4444] hover:bg-red-650 text-white rounded-lg p-2.5 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-red-950/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>

          {/* Right main area */}
          <div className="flex-1 bg-slate-50/50 p-6 flex flex-col overflow-y-auto">
            
            {/* Header Welcome Bar */}
            <div className="flex items-start justify-between border-b border-teal-150 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-teal-900 font-sans tracking-tight">Hello, Rohan Das!</h1>
                <div className="text-xs font-bold text-teal-650 uppercase tracking-widest mt-1">ID: R1204</div>
              </div>
              <div className="text-right text-xs font-bold text-slate-500 uppercase font-sans pt-1">
                {formatDateHeader(currentTime)}
              </div>
            </div>

            {/* Subtab 1: Patient Dashboard Main View */}
            {patientSidebarTab === 'dashboard' && (
              <div className="flex flex-col gap-6">
                
                {/* Top Action Row (4 Cards) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={() => navigate('/book.html')}
                    className="bg-white hover:bg-teal-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
                  >
                    <Calendar className="w-8 h-8 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800 leading-tight">Book New Appointment</span>
                  </button>

                  <button 
                    onClick={() => { alert("Refill request submitted."); speakText("Repeat prescription request sent."); }}
                    className="bg-white hover:bg-teal-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
                  >
                    <Pill className="w-8 h-8 text-rose-500" />
                    <span className="text-xs font-bold text-slate-800 leading-tight">Request Refill</span>
                  </button>

                  <button 
                    onClick={() => { alert("No active invoices registered for patient PAT1204."); }}
                    className="bg-white hover:bg-teal-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
                  >
                    <Receipt className="w-8 h-8 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 leading-tight">Pay Outstanding Bill</span>
                  </button>

                  <button 
                    onClick={() => setPatientSidebarTab('help')}
                    className="bg-white hover:bg-teal-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-8 h-8 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 leading-tight">Chat with Assistant</span>
                  </button>
                </div>

                {/* Content Layout Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column: Next Appointment & Labs */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Next Appointment Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                      <h3 className="font-bold text-teal-900 text-xs uppercase tracking-wider pb-2 border-b">Your Next Appointment</h3>
                      {nextRohanAppt ? (
                        <div className="flex flex-col gap-3 font-sans">
                          <div>
                            <h4 className="text-lg font-bold text-teal-850">Dr. {nextRohanAppt.doctor_name} ({nextRohanAppt.doctor_specialty})</h4>
                            <div className="text-xs text-slate-550 font-bold mt-1">Date: {nextRohanAppt.date} | Time: {nextRohanAppt.time_slot}</div>
                          </div>
                          <button 
                            onClick={() => { alert("Checked-in successfully! Please proceed to doctor clinic."); speakText("Pre-check in completed."); }}
                            className="self-start mt-2 bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs uppercase px-4 py-2 rounded-lg tracking-wider cursor-pointer transition-colors shadow-sm"
                          >
                            Pre-Check-in Now
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-400 py-6 text-xs italic">No upcoming appointments. Click "Book New Appointment" to schedule.</div>
                      )}
                    </div>

                    {/* Latest Lab Results */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                      <h3 className="font-bold text-teal-900 text-xs uppercase tracking-wider pb-2 border-b">Latest Lab Results</h3>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-sans">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Result available from **Thyroid Panel**</h4>
                          <div className="text-xs text-slate-450 font-bold mt-0.5">Date Received: 09 Nov 2025</div>
                        </div>
                        <button 
                          onClick={() => alert("Thyroid Profile TSH: All parameters checked normal.")}
                          className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg tracking-wider transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Medications & Voice check */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* Medications list */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                      <h3 className="font-bold text-teal-900 text-xs uppercase tracking-wider pb-2 border-b">Medication Schedule</h3>
                      
                      <div className="flex flex-col gap-3 text-xs text-slate-700 font-semibold font-sans">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 font-bold">💊</div>
                          <div>
                            <h4 className="font-bold text-slate-800">Amlodipine 5mg</h4>
                            <span className="text-[10px] text-slate-450 block font-bold">Once Daily</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 border-t pt-3">
                          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 font-bold">💊</div>
                          <div>
                            <h4 className="font-bold text-slate-800">Aspirin 81mg</h4>
                            <span className="text-[10px] text-slate-450 block font-bold">Daily (Breakfast)</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => alert("Follow dosage directions strictly.")}
                          className="w-full mt-2 bg-teal-600 hover:bg-[#0f766e] text-white font-bold text-xs uppercase py-2 rounded-lg tracking-wider cursor-pointer transition-colors"
                        >
                          View Full List & Instructions
                        </button>
                      </div>
                    </div>

                    {/* Talk to VoxAI voice checking */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
                      <h3 className="font-bold text-teal-900 text-xs uppercase tracking-wider pb-2 border-b">Talk to VoxAI</h3>
                      <div className="flex flex-col gap-3 font-sans text-xs text-slate-655">
                        <p>Use the voice assistant for instant answers and requests:</p>
                        <ul className="flex flex-col gap-1.5 italic text-[11px] text-slate-500 font-medium">
                          <li>- "Book a follow-up with Dr. Varma."</li>
                          <li>- "When is my next appointment?"</li>
                          <li>- "How do I take Amlodipine?"</li>
                        </ul>
                        
                        <div className="flex gap-1.5 items-center mt-2">
                          <input 
                            type="text"
                            placeholder="Type or speak symptoms..."
                            value={symptomText}
                            onChange={e => setSymptomText(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white outline-none focus:border-teal-500"
                          />
                          <button
                            onClick={() => toggleRecording('patient')}
                            className={`h-8 w-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
                              isRecording && activeMicContext === 'patient'
                                ? 'bg-rose-500 text-white animate-pulse' 
                                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {symptomText.trim() && (
                          <button
                            onClick={handleCheckSymptoms}
                            className="w-full bg-[#0d9488] text-white text-xs font-bold uppercase py-2 rounded-lg cursor-pointer"
                          >
                            Send Prompt
                          </button>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* Labs Subtab */}
            {patientSidebarTab === 'labs' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 font-sans">
                <h3 className="font-bold text-teal-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b">Lab Results Portal</h3>
                <div className="bg-slate-50 p-4 border rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Thyroid Profile (TSH, Free T3, Free T4)</h4>
                    <span className="text-xs text-slate-455 block font-semibold mt-1">Status: Normal Range Verified</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">09 Nov 2025</span>
                </div>
              </div>
            )}

            {/* Billing Subtab */}
            {patientSidebarTab === 'billing' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 max-w-sm font-sans">
                <h3 className="font-bold text-teal-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b">Outpatient Payments</h3>
                <div className="bg-slate-50 p-4 border rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-800">Balance Due:</span>
                  <span className="text-xl font-bold text-teal-750">₹0.00</span>
                </div>
              </div>
            )}

            {/* Help Subtab */}
            {patientSidebarTab === 'help' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 font-sans">
                <h3 className="font-bold text-teal-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b">Helpdesk FAQs</h3>
                <div className="p-3 bg-slate-50 rounded-lg text-xs leading-relaxed">
                  <span className="font-bold text-teal-700 block">Q: Can I schedule follow-ups?</span>
                  <span className="block mt-1">A: Yes, click the "Book New Appointment" tab on the patient dashboard menu.</span>
                </div>
              </div>
            )}

            {/* settings subtab */}
            {patientSidebarTab === 'settings' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 font-sans text-xs">
                <h3 className="font-bold text-teal-900 text-sm uppercase tracking-wider mb-4 pb-2 border-b">Language Settings</h3>
                <p className="text-slate-550 leading-relaxed uppercase">Locale layout: EN-US. Speech input parses clinical accent profiles correctly.</p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* 5. BOOK APPOINTMENT ROUTE (/book.html) */}
      {isBookPath && (
        <div className="min-h-screen w-full bg-[#f3f4f6] flex items-center justify-center p-6 select-none font-sans">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col gap-6">
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-850">Book Your Appointment</h1>
              <p className="text-xs text-slate-550 mt-1.5 leading-relaxed">
                Select your preferred doctor, date, and reason for consultation.
              </p>
            </div>

            {bookSuccess && (
              <div className="bg-indigo-50 border border-indigo-250 text-indigo-700 rounded-lg p-3 text-xs font-semibold text-center animate-pulse">
                {bookSuccess}
              </div>
            )}

            {bookError && (
              <div className="bg-red-50 border border-red-200 text-red-750 rounded-lg p-3 text-xs font-semibold text-center">
                {bookError}
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="flex flex-col gap-4 text-xs text-slate-800">
              
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-550 uppercase text-[10px]">Select Specialty / Doctor</label>
                <select
                  value={bookDoctorId}
                  onChange={e => setBookDoctorId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-850 font-bold focus:bg-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Choose a Specialty...</option>
                  {doctors.map(d => {
                    const attRecord = attendance.find(a => a.doctor_id === d.doctor_id);
                    const isAvail = attRecord ? attRecord.is_available : true;
                    return (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        Dr. {d.name} ({d.specialty}) — {isAvail ? 'Duty Present' : 'Absent!'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Grid Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-550 uppercase text-[10px]">Preferred Date</label>
                  <input 
                    type="date"
                    value={bookDate}
                    onChange={e => setBookDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-855 font-bold focus:bg-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-550 uppercase text-[10px]">Preferred Time</label>
                  <select
                    value={bookTimeSlot}
                    onChange={e => setBookTimeSlot(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-855 font-bold focus:bg-white outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="9:30 AM">09:30 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="2:00 PM">02:00 PM</option>
                    <option value="3:30 PM">03:30 PM</option>
                    <option value="5:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-550 uppercase text-[10px]">Reason for Visit (Briefly)</label>
                <textarea 
                  placeholder="e.g., Check-up..."
                  value={bookReason}
                  onChange={e => setBookReason(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-850 font-semibold focus:bg-white outline-none focus:border-blue-500 h-24 resize-none"
                />
              </div>

              {/* Assigned Profile select */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-550 uppercase text-[10px]">Assigned Booking Patient Profile</label>
                <select
                  value={bookPatientId}
                  onChange={e => setBookPatientId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-bold focus:bg-white outline-none focus:border-blue-500"
                >
                  {patients.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.name} ({p.patient_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Confirm trigger */}
              <button 
                type="submit"
                className="w-full mt-3 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs uppercase p-3 rounded-lg tracking-wider transition-colors cursor-pointer shadow-md"
              >
                CONFIRM APPOINTMENT
              </button>

              <button 
                type="button"
                onClick={() => navigate('/patient-dashboard.html')}
                className="w-full text-slate-500 hover:text-slate-700 font-semibold text-[10px] uppercase text-center cursor-pointer transition-colors mt-1"
              >
                Cancel and Return to Dashboard
              </button>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
