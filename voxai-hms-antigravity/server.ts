import express from "express";
import net from "net";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);

async function getAvailablePort(startPort: number): Promise<number> {
  const isPortAvailable = (port: number) =>
    new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });

  let port = startPort;
  while (true) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port += 1;
  }
}

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "MOCK_KEY",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json());

// IN-MEMORY DATABASE SIMULATING THE MYSQL TABLES IN DJANGO
const db = {
  patients: [
    {
      patient_id: "PAT4561",
      name: "Anjali Menon",
      age: 28,
      gender: "F",
      contact: "9876543210",
      address: "Phase 2, Vasanth Nagar, Bengaluru",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      patient_id: "PAT1204",
      name: "Rohan Das",
      age: 34,
      gender: "M",
      contact: "9123456789",
      address: "12A, Mall Road, Shimla",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ],
  doctors: [
    {
      doctor_id: "DOC101",
      name: "Anjali Menon",
      specialty: "Cardiology",
      contact: "9876543210",
    },
    {
      doctor_id: "DOC102",
      name: "Anand Varma",
      specialty: "Orthopedics",
      contact: "9123456789",
    },
    {
      doctor_id: "DOC103",
      name: "Lily Chen",
      specialty: "Pediatrics",
      contact: "9444332211",
    },
  ],
  attendance: [
    { doctor_id: "DOC102", date: "2026-06-22", is_available: true }, // Anand Varma is present
    { doctor_id: "DOC101", date: "2026-06-22", is_available: false }, // Cardiology is absent
    { doctor_id: "DOC103", date: "2026-06-22", is_available: true }, // Lily Chen is present
  ],
  appointments: [
    {
      appointment_id: 1,
      patient_id: "PAT1204",
      patient_name: "Rohan Das",
      doctor_id: "DOC102",
      doctor_name: "Anand Varma",
      doctor_specialty: "Orthopedics",
      date: "2026-06-22",
      time_slot: "11:30 AM",
      reason: "Thyroid Follow-up",
      status: "CONFIRMED",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
  voiceLogs: [
    {
      log_id: 1,
      raw_text: "Register patient Rohan Das age thirty four phone 9123456789 address Mall Road Shimla",
      intent: "REGISTER_PATIENT",
      response_text: "Registration completed successfully! Created record for patient Rohan Das with temporary Identifier code PAT1204.",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      log_id: 2,
      raw_text: "Book an appointment with Dr. Varma on June twenty second eleven thirty for thyroid follow up",
      intent: "BOOK_APPOINTMENT",
      response_text: "Confirmed appointment with Dr. Anand Varma for Rohan Das on 2026-06-22 at 11:30 AM.",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
};

// 1. ENDPOINTS FOR SIMULATED DATABASE STATE QUERYING
app.get("/api/db/patients", (req, res) => {
  res.json(db.patients);
});

app.get("/api/db/doctors", (req, res) => {
  res.json(db.doctors);
});

app.get("/api/db/attendance", (req, res) => {
  res.json(db.attendance);
});

app.get("/api/db/appointments", (req, res) => {
  res.json(db.appointments);
});

app.get("/api/db/voicelogs", (req, res) => {
  res.json(db.voiceLogs);
});

// Toggle Doctor Shift Attendance Status
app.post("/api/db/toggle-attendance", (req, res) => {
  const { doctor_id } = req.body;
  if (!doctor_id) return res.status(400).json({ error: "Missing doctor_id payload." });
  
  const attIndex = db.attendance.findIndex(a => a.doctor_id === doctor_id);
  if (attIndex !== -1) {
    db.attendance[attIndex].is_available = !db.attendance[attIndex].is_available;
    res.json({ message: "Updated doctor availability successfully.", record: db.attendance[attIndex] });
  } else {
    const newAtt = { doctor_id, date: "2026-06-22", is_available: true };
    db.attendance.push(newAtt);
    res.json({ message: "Configured doctor shift registry.", record: newAtt });
  }
});

// Reschedule or update appointment schedule state status
app.post("/api/db/update-appointment-status", (req, res) => {
  const { appointment_id, status } = req.body;
  if (!appointment_id || !status) return res.status(400).json({ error: "Missing required parameters." });
  
  const appt = db.appointments.find(a => a.appointment_id === parseInt(appointment_id, 10));
  if (appt) {
    appt.status = status;
    res.json({ message: "Appointment status customized.", record: appt });
  } else {
    res.status(404).json({ error: "No appointment record matched." });
  }
});

// Manual patient direct clinical registration
app.post("/api/db/register-manual", (req, res) => {
  const { name, age, gender, contact, address } = req.body;
  if (!name || !contact) return res.status(400).json({ error: "Name and Contact parameters are required." });
  
  const unique_id = `PAT${Math.floor(Math.random() * 9000) + 1000}`;
  const new_patient = {
    patient_id: unique_id,
    name,
    age: parseInt(age, 15) || 30,
    gender: gender || "M",
    contact,
    address: address || "Self Registered Intake",
    created_at: new Date().toISOString(),
  };
  db.patients.unshift(new_patient);
  res.json({ status: "success", patient: new_patient });
});

// Manual appointment clinical setup route with built-in doctor availability gates
app.post("/api/db/book-manual", (req, res) => {
  const { patient_id, doctor_id, date, time_slot, reason } = req.body;
  if (!patient_id || !doctor_id) return res.status(400).json({ error: "Missing required booking identifiers." });
  
  const doc = db.doctors.find(d => d.doctor_id === doctor_id);
  if (!doc) return res.status(404).json({ error: "Physician registry entry not identified." });
  
  const att = db.attendance.find(a => a.doctor_id === doctor_id);
  if (att && !att.is_available) {
    return res.status(400).json({ error: `Scheduling Failed: Dr. ${doc.name} (${doc.specialty}) is currently ABSENT today. Booking aborted to ensure schedule integrity.` });
  }
  
  const pat = db.patients.find(p => p.patient_id === patient_id);
  if (!pat) return res.status(404).json({ error: "Patient identifier not found. Please register first." });
  
  const new_appt = {
    appointment_id: db.appointments.length + 1,
    patient_id: pat.patient_id,
    patient_name: pat.name,
    doctor_id: doc.doctor_id,
    doctor_name: doc.name,
    doctor_specialty: doc.specialty,
    date: date || "2026-06-22",
    time_slot: time_slot || "12:00 PM",
    reason: reason || "General checkup queue",
    status: "CONFIRMED",
    created_at: new Date().toISOString(),
  };
  
  db.appointments.unshift(new_appt);
  res.json({ status: "success", appointment: new_appt });
});

// Reset simulation data
app.post("/api/db/reset", (req, res) => {
  db.patients = [
    {
      patient_id: "PAT4561",
      name: "Anjali Menon",
      age: 28,
      gender: "F",
      contact: "9876543210",
      address: "Phase 2, Vasanth Nagar, Bengaluru",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      patient_id: "PAT1204",
      name: "Rohan Das",
      age: 34,
      gender: "M",
      contact: "9123456789",
      address: "12A, Mall Road, Shimla",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
  ];
  db.appointments = [
    {
      appointment_id: 1,
      patient_id: "PAT1204",
      patient_name: "Rohan Das",
      doctor_id: "DOC102",
      doctor_name: "Anand Varma",
      doctor_specialty: "Orthopedics",
      date: "2026-06-22",
      time_slot: "11:30 AM",
      reason: "Thyroid Follow-up",
      status: "CONFIRMED",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    }
  ];
  db.voiceLogs = [
    {
      log_id: 1,
      raw_text: "Register patient Rohan Das age thirty four phone 9123456789 address Mall Road Shimla",
      intent: "REGISTER_PATIENT",
      response_text: "Registration completed successfully! Created record for patient Rohan Das with temporary Identifier code PAT1204.",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
  ];
  res.json({ message: "Database tables reset successfully to original state." });
});

// 2. CORE APIS: VOICE ASSISTANT INTERACTION EMULATION POST ROUTE
app.post("/api/voice-interaction", async (req, res) => {
  const { dictation_text } = req.body;

  if (!dictation_text) {
    return res.status(400).json({ error: "Missing string dictation text payload." });
  }

  try {
    let outputJson: any;

    // Use Gemini model 3.5 Flash to act as our transcription translation + NLU pipeline
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      const g_response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze this translation string representing a hospital patient or clinician verbal dictation command.
        Voice string: "${dictation_text}"

        Your mission is to map it to one of three intents: 'register_patient', 'book_appointment', or 'query_info'.
        Translate any multilingual content (Hindi, Spanish, French, etc.) into English variables where appropriate. For telephone digits, remove spaces or brackets.

        Extract corresponding entities strictly matching these categories:
        1. register_patient (name: string, age: int, gender: string, contact: string, address: string)
        2. book_appointment (doctor_name: string, date: string in format 'YYYY-MM-DD', time_slot: string e.g. '11:30 AM', reason: string)
        3. query_info (question_topic: string, raw_query: string)

        Output valid JSON meeting this structure.
        Do not add any additional explanation texts outside the JSON definition.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description: "Must be 'register_patient', 'book_appointment', 'query_info', or 'unknown'",
              },
              entities: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  age: { type: Type.INTEGER },
                  gender: { type: Type.STRING },
                  contact: { type: Type.STRING },
                  address: { type: Type.STRING },
                  doctor_name: { type: Type.STRING },
                  date: { type: Type.STRING },
                  time_slot: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  question_topic: { type: Type.STRING },
                  raw_query: { type: Type.STRING },
                },
              },
              confidence: { type: Type.NUMBER },
            },
            required: ["intent", "entities"],
          },
        },
      });

      const text = g_response.text || "{}";
      outputJson = JSON.parse(text);
    } else {
      // Fallback regex NLU parsing when key is not configured
      const textNormal = dictation_text.toLowerCase();
      if (textNormal.includes("register") || textNormal.includes("registration") || textNormal.includes("patient name") || textNormal.includes("नाम")) {
        const phoneMatch = dictation_text.match(/\d{9,12}/) || ["9876543210"];
        const ageMatch = dictation_text.match(/age\s*(\d+)/i) || dictation_text.match(/(\d+)\s*years/i) || ["28"];
        const nameMatch = dictation_text.match(/patient\s+name\s+([A-Za-z\s]+)(?:phone|age|department|$)/i) || 
                          dictation_text.match(/(?:named|name is)\s+([A-Za-z\s]+)/i) || ["Anjali Menon"];
        
        outputJson = {
          intent: "register_patient",
          entities: {
            name: nameMatch[1]?.trim() || "Anjali Menon",
            age: parseInt(ageMatch[1] || "28", 10),
            gender: "F",
            contact: phoneMatch[0],
            address: "Primary Intake Ward",
          },
          confidence: 0.94,
        };
      } else if (textNormal.includes("book") || textNormal.includes("appointment") || textNormal.includes("scheduling") || textNormal.includes("meeting")) {
        const doctorMatch = dictation_text.match(/(?:dr\.|doctor|with)\s+([A-Za-z]+)/i) || ["Dr. Varma"];
        outputJson = {
          intent: "book_appointment",
          entities: {
            doctor_name: doctorMatch[1]?.trim() || "Varma",
            date: "2026-06-22",
            time_slot: "11:30 AM",
            reason: "General Consultation Review",
          },
          confidence: 0.91,
        };
      } else {
        outputJson = {
          intent: "query_info",
          entities: {
            question_topic: "Hospital Guidelines",
            raw_query: dictation_text,
          },
          confidence: 0.88,
        };
      }
    }

    const { intent, entities } = outputJson;
    let tts_feedback = "";
    let affected_record: any = null;
    let db_updated = false;

    // SIMULATED TRANSACTION DB OPERATIONS TO REPRESENT DJANGO VIEWS
    if (intent === "register_patient") {
      const unique_id = `PAT${Math.floor(Math.random() * 9000) + 1000}`;
      const new_patient = {
        patient_id: unique_id,
        name: entities.name || "Unknown Patient",
        age: entities.age || 30,
        gender: entities.gender || "U",
        contact: entities.contact || "9876543210",
        address: entities.address || "Coordinated Intake Ward",
        created_at: new Date().toISOString(),
      };
      db.patients.unshift(new_patient);
      tts_feedback = `Registration completed successfully! Created record for patient ${new_patient.name} with temporary Identifier code ${unique_id}.`;
      affected_record = new_patient;
      db_updated = true;
    } else if (intent === "book_appointment") {
      const doctor_ref = entities.doctor_name || "Anand Varma";
      
      // Let's lookup clinician availability from db.attendance
      const doc = db.doctors.find(d => d.name.toLowerCase().includes(doctor_ref.toLowerCase())) || db.doctors[1]; // Anand Varma is index 1
      const attendance = db.attendance.find(a => a.doctor_id === doc.doctor_id);
      
      if (attendance && !attendance.is_available) {
        tts_feedback = `Apologies. Dr. ${doc.name} is on-duty absent and NOT available today. Booking aborted.`;
        affected_record = { available: false, reason: "Physician Absent" };
      } else {
        // Find latest registered patient or map default
        const latestPatient = db.patients[0] || { name: "Ingested Guest", patient_id: "PAT9999" };
        const new_appt = {
          appointment_id: db.appointments.length + 1,
          patient_id: latestPatient.patient_id,
          patient_name: latestPatient.name,
          doctor_id: doc.doctor_id,
          doctor_name: doc.name,
          doctor_specialty: doc.specialty,
          date: entities.date || "2026-06-22",
          time_slot: entities.time_slot || "11:30 AM",
          reason: entities.reason || "Scheduled checkup review",
          status: "CONFIRMED",
          created_at: new Date().toISOString(),
        };
        db.appointments.unshift(new_appt);
        tts_feedback = `Confirmed appointment with Dr. ${doc.name} for ${latestPatient.name} on ${new_appt.date} at ${new_appt.time_slot}.`;
        affected_record = new_appt;
        db_updated = true;
      }
    } else {
      // Intent mapping FAQ query
      const raw_query = entities.raw_query || dictation_text;
      if (raw_query.toLowerCase().includes("symptom") || raw_query.toLowerCase().includes("cough") || raw_query.toLowerCase().includes("fever")) {
        tts_feedback = "If experiencing moderate symptoms such as fever or cough, verify oxygen indexes, remain hydrated, and book a general checkup slot immediately.";
      } else if (raw_query.toLowerCase().includes("timing") || raw_query.toLowerCase().includes("opening") || raw_query.toLowerCase().includes("hours")) {
        tts_feedback = "VoxAI Medical Center is accessible 24 hours daily for emergency queues. Outpatient clinic schedules operate from 9:00 AM to 7:00 PM.";
      } else if (raw_query.toLowerCase().includes("locate") || raw_query.toLowerCase().includes("where") || raw_query.toLowerCase().includes("floor")) {
        tts_feedback = "General cardiology clinics are situated on the 3rd floor, wing B. Demographics desks handles check-in near the lobby.";
      } else {
        tts_feedback = "I have queried the database. Your clinical inquiry has been routed to our clinical coordinators.";
      }
      affected_record = { topics: entities.question_topic || "General" };
      db_updated = true;
    }

    // LOG THE INTERACTION IN THE VOICELOG TABLE
    const newLog = {
      log_id: db.voiceLogs.length + 1,
      raw_text: dictation_text,
      intent: intent.toUpperCase(),
      response_text: tts_feedback,
      timestamp: new Date().toISOString(),
    };
    db.voiceLogs.unshift(newLog);

    // Return the response designed to perfectly mirror the Django DRF controller!
    res.json({
      status: "success",
      voice_data: {
        transcription: dictation_text,
        intent: intent,
        entities: entities,
      },
      database_mutation: {
        updated: db_updated,
        records_affected: affected_record,
      },
      tts_feedback: tts_feedback,
    });
  } catch (error: any) {
    console.error("Simulation NLU processing error:", error);
    res.status(500).json({ error: "Administrative pipeline execution failed", details: error.message });
  }
});

// START STATIC CONTENT SERVER & DEV PROXY
async function startServer() {
  const port = await getAvailablePort(DEFAULT_PORT);

  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for smooth SPA routing in dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving of static builds
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`VOXAI HMS Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
