import React, { useState } from 'react';
import { Database, UserCheck, ShieldCheck, ClipboardList, Zap, Calendar, RefreshCw } from 'lucide-react';
import { Patient, Doctor, Attendance, Appointment, VoiceLog } from '../types';

interface DatabaseGridProps {
  patients: Patient[];
  doctors: Doctor[];
  attendance: Attendance[];
  appointments: Appointment[];
  voiceLogs: VoiceLog[];
  onReset: () => void;
  isLoading: boolean;
}

export const DatabaseGrid: React.FC<DatabaseGridProps> = ({
  patients,
  doctors,
  attendance,
  appointments,
  voiceLogs,
  onReset,
  isLoading,
}) => {
  const [activeTable, setActiveTable] = useState<'patient' | 'appointment' | 'doctor_attendance' | 'voice_log'>('patient');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full font-sans text-slate-200">
      {/* Table select Header */}
      <div className="bg-slate-950/60 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-indigo-400 animate-pulse" />
          <div>
            <h3 className="font-semibold text-white text-sm tracking-wide uppercase">Active Relational Ledger State</h3>
            <p className="text-3xs text-slate-500 font-mono tracking-wider uppercase">Live MySQL Engine (Atomic django transaction validations committed)</p>
          </div>
        </div>
        
        <button
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer uppercase tracking-wider font-mono"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Reset DB Ledger
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/30 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTable('patient')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 cursor-pointer uppercase tracking-wider ${
            activeTable === 'patient'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          patient table ({patients.length})
        </button>
        <button
          onClick={() => setActiveTable('appointment')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 cursor-pointer uppercase tracking-wider ${
            activeTable === 'appointment'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          appointment table ({appointments.length})
        </button>
        <button
          onClick={() => setActiveTable('doctor_attendance')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 cursor-pointer uppercase tracking-wider ${
            activeTable === 'doctor_attendance'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          doctor_attendance ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTable('voice_log')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 cursor-pointer uppercase tracking-wider ${
            activeTable === 'voice_log'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/80'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          voice_log telemetry ({voiceLogs.length})
        </button>
      </div>

      {/* Grid container */}
      <div className="flex-1 overflow-auto p-5 bg-slate-900/40">
        {activeTable === 'patient' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase bg-slate-950/60 text-3xs tracking-wider">
                  <th className="py-3 px-4 font-mono">patient_id (PK)</th>
                  <th className="py-3 px-4">name</th>
                  <th className="py-3 px-4">age</th>
                  <th className="py-3 px-4">gender</th>
                  <th className="py-3 px-4 font-mono">contact</th>
                  <th className="py-3 px-4">address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">No Patient Records found. Ingest one via voice!</td>
                  </tr>
                ) : (
                  patients.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-400">{p.patient_id}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{p.name}</td>
                      <td className="py-3.5 px-4">{p.age ?? 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider border ${
                          p.gender === 'M' ? 'bg-indigo-500/10 border-indigo-550/20 text-indigo-300' :
                          p.gender === 'F' ? 'bg-rose-500/10 border-rose-550/20 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {p.gender}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{p.contact}</td>
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs" title={p.address}>{p.address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTable === 'appointment' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase bg-slate-950/60 text-3xs tracking-wider">
                  <th className="py-3 px-4 font-mono">appt_id (PK)</th>
                  <th className="py-3 px-4 font-mono">patient_id (FK)</th>
                  <th className="py-3 px-4">patient_name</th>
                  <th className="py-3 px-4">doctor_name</th>
                  <th className="py-3 px-4">date</th>
                  <th className="py-3 px-4">time_slot</th>
                  <th className="py-3 px-4">reason</th>
                  <th className="py-3 px-4">status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">No scheduled appointments. Dictate a booking to start!</td>
                  </tr>
                ) : (
                  appointments.map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{a.appointment_id}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold">{a.patient_id}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{a.patient_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200">{a.doctor_name}</span>
                        <span className="block text-3xs text-slate-500 font-mono tracking-wide uppercase mt-0.5">{a.doctor_specialty}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-300/90">{a.date}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{a.time_slot}</td>
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">{a.reason}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTable === 'doctor_attendance' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map((doc, idx) => {
              const activeStatus = attendance.find(a => a.doctor_id === doc.doctor_id);
              const isAvailable = activeStatus ? activeStatus.is_available : true;
              return (
                <div key={idx} className="border border-slate-800 rounded-xl p-4.5 bg-slate-950/40 hover:border-indigo-500/50 shadow-md transition-all duration-155">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-white text-sm">Dr. {doc.name}</h4>
                      <p className="text-3xs font-semibold text-indigo-400 font-mono tracking-widest uppercase mt-0.5">{doc.specialty}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-widest border ${
                      isAvailable 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-455 text-rose-400'
                    }`}>
                      {isAvailable ? 'On-Duty' : 'Absent'}
                    </span>
                  </div>
                  <div className="text-3xs text-slate-500 space-y-1 font-mono pt-2 border-t border-slate-800/65">
                    <div>DOCTOR_ID: {doc.doctor_id}</div>
                    <div>SCHEDULE_DATE: 2026-06-22</div>
                    <div>CONTACT_REF: {doc.contact}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTable === 'voice_log' && (
          <div className="space-y-3.5 max-h-[360px] overflow-auto pr-1 text-slate-200">
            {voiceLogs.length === 0 ? (
              <p className="text-center text-slate-550 py-12 font-mono text-xs uppercase">No administrative telemetries logged yet.</p>
            ) : (
              voiceLogs.map((log, idx) => (
                <div key={idx} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex flex-col gap-2.5 font-mono">
                  <div className="flex items-center justify-between text-3xs text-slate-500 border-b border-slate-800 pb-2">
                    <span className="font-bold text-indigo-450 tracking-widest text-[#818cf8]">LOG_ID: #{log.log_id}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-3xs font-bold uppercase tracking-widest">RAW_DICTATION:</span>
                    <p className="text-slate-300 text-xs bg-slate-950 p-2.5 border border-slate-800/80 rounded italic mt-1 font-sans">"{log.raw_text}"</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 text-xxs leading-relaxed">
                    <div>
                      <span className="text-slate-500 block text-3xs font-bold uppercase tracking-widest">RESOLVED_INTENT:</span>
                      <span className={`inline-flex px-2 py-0.5 rounded font-bold uppercase mt-1 text-3xs ${
                        log.intent === 'REGISTER_PATIENT' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        log.intent === 'BOOK_APPOINTMENT' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        log.intent === 'QUERY_INFO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-705'
                      }`}>
                        {log.intent}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-3xs font-bold uppercase tracking-widest">TTS_GENERATED_OUT:</span>
                      <p className="text-slate-205 border-l-2 border-indigo-500 pl-2.5 italic font-sans text-xs mt-1">"{log.response_text}"</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Note details */}
      <div className="bg-slate-950 px-5 py-3 text-3xs text-slate-500 font-mono flex items-center justify-between border-t border-slate-800">
        <span className="flex items-center gap-1.5 font-semibold">
          <Zap className="h-3 w-3 text-indigo-400" />
          MYSQL RELATIONAL INTEGRITY GUARANTEED ATOMICALLY (InnoDB Engine)
        </span>
        <span className="text-indigo-400 font-bold uppercase">v2.0 ACTIVE</span>
      </div>
    </div>
  );
};
