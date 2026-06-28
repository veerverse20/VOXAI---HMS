export interface Patient {
  patient_id: string;
  name: string;
  age: number | null;
  gender: string;
  contact: string;
  address: string;
  created_at: string;
}

export interface Doctor {
  doctor_id: string;
  name: string;
  specialty: string;
  contact: string;
}

export interface Attendance {
  doctor_id: string;
  date: string;
  is_available: boolean;
}

export interface Appointment {
  appointment_id: number;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  date: string;
  time_slot: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface VoiceLog {
  log_id: number;
  raw_text: string;
  intent: string;
  response_text: string;
  timestamp: string;
}

export type ActiveTab = 'playground' | 'db_tables' | 'code_explorer';
