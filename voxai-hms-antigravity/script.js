// VOXAI-HMS Shared Database State & Utilities
(function() {
  const initialPatients = [
    { patient_id: "PAT4561", name: "Anjali Menon", age: 28, gender: "F", contact: "9876543210", address: "Phase 2, Vasanth Nagar, Bengaluru", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { patient_id: "PAT1204", name: "Rohan Das", age: 34, gender: "M", contact: "9123456789", address: "12A, Mall Road, Shimla", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
  ];

  const initialDoctors = [
    { doctor_id: "DOC101", name: "Anjali Menon", specialty: "Cardiology", contact: "9876543210" },
    { doctor_id: "DOC102", name: "Anand Varma", specialty: "Orthopedics", contact: "9123456789" },
    { doctor_id: "DOC103", name: "Lily Chen", specialty: "Pediatrics", contact: "9444332211" }
  ];

  const initialAttendance = [
    { doctor_id: "DOC102", date: "2026-06-28", is_available: true }, // Anand Varma is present
    { doctor_id: "DOC101", date: "2026-06-28", is_available: false }, // Cardiology is absent
    { doctor_id: "DOC103", date: "2026-06-28", is_available: true }  // Lily Chen is present
  ];

  const initialAppointments = [
    {
      appointment_id: 1,
      patient_id: "PAT1204",
      patient_name: "Rohan Das",
      doctor_id: "DOC102",
      doctor_name: "Anand Varma",
      doctor_specialty: "Orthopedics",
      date: "2026-06-28",
      time_slot: "11:30 AM",
      reason: "Thyroid Follow-up",
      status: "CONFIRMED",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ];

  const initialPrescriptions = [
    {
      prescription_id: "RX1001",
      patient_name: "Rohan Das",
      doctor_name: "Anand Varma",
      diagnosis: "Thyroid follow-up checks",
      medications: "Levothyroxine 50mcg daily",
      date: "2026-06-28"
    }
  ];

  const initialVoiceLogs = [
    {
      log_id: 1,
      raw_text: "Register patient Rohan Das age thirty four phone 9123456789 address Mall Road Shimla",
      intent: "REGISTER_PATIENT",
      response_text: "Registration completed successfully! Created record for patient Rohan Das with temporary Identifier code PAT1204.",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  // Helper to initialize local storage
  function initLocalStorage(key, defaultVal) {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
    }
  }

  // Initialize DB if not present
  initLocalStorage("voxai_patients", initialPatients);
  initLocalStorage("voxai_doctors", initialDoctors);
  initLocalStorage("voxai_attendance", initialAttendance);
  initLocalStorage("voxai_appointments", initialAppointments);
  initLocalStorage("voxai_prescriptions", initialPrescriptions);
  initLocalStorage("voxai_voicelogs", initialVoiceLogs);

  // Global namespace for database actions
  window.HMS_DB = {
    getPatients: () => JSON.parse(localStorage.getItem("voxai_patients")),
    savePatients: (p) => {
      localStorage.setItem("voxai_patients", JSON.stringify(p));
      window.dispatchEvent(new Event("storage"));
    },
    
    getDoctors: () => JSON.parse(localStorage.getItem("voxai_doctors")),
    saveDoctors: (d) => {
      localStorage.setItem("voxai_doctors", JSON.stringify(d));
      window.dispatchEvent(new Event("storage"));
    },

    getAttendance: () => JSON.parse(localStorage.getItem("voxai_attendance")),
    saveAttendance: (a) => {
      localStorage.setItem("voxai_attendance", JSON.stringify(a));
      window.dispatchEvent(new Event("storage"));
    },

    getAppointments: () => JSON.parse(localStorage.getItem("voxai_appointments")),
    saveAppointments: (a) => {
      localStorage.setItem("voxai_appointments", JSON.stringify(a));
      window.dispatchEvent(new Event("storage"));
    },

    getPrescriptions: () => JSON.parse(localStorage.getItem("voxai_prescriptions")),
    savePrescriptions: (pr) => {
      localStorage.setItem("voxai_prescriptions", JSON.stringify(pr));
      window.dispatchEvent(new Event("storage"));
    },

    getVoiceLogs: () => JSON.parse(localStorage.getItem("voxai_voicelogs")),
    saveVoiceLogs: (vl) => {
      localStorage.setItem("voxai_voicelogs", JSON.stringify(vl));
      window.dispatchEvent(new Event("storage"));
    },

    // Session functions
    getSession: () => {
      const role = localStorage.getItem("currentUserRole");
      const email = localStorage.getItem("currentUserEmail");
      const name = localStorage.getItem("currentUserName") || "User";
      const id = localStorage.getItem("currentUserId") || "";
      return role ? { role, email, name, id } : null;
    },
    setSession: (role, email, name, id) => {
      localStorage.setItem("currentUserRole", role);
      localStorage.setItem("currentUserEmail", email);
      localStorage.setItem("currentUserName", name || "User");
      localStorage.setItem("currentUserId", id || "");
    },
    clearSession: () => {
      localStorage.removeItem("currentUserRole");
      localStorage.removeItem("currentUserEmail");
      localStorage.removeItem("currentUserName");
      localStorage.removeItem("currentUserId");
    },
    requireAuth: (allowedRoles, redirectUrl = "index.html") => {
      const session = window.HMS_DB.getSession();
      if (!session || !allowedRoles.includes(session.role)) {
        window.location.href = redirectUrl;
      }
      return session;
    },
    resetDB: () => {
      localStorage.setItem("voxai_patients", JSON.stringify(initialPatients));
      localStorage.setItem("voxai_doctors", JSON.stringify(initialDoctors));
      localStorage.setItem("voxai_attendance", JSON.stringify(initialAttendance));
      localStorage.setItem("voxai_appointments", JSON.stringify(initialAppointments));
      localStorage.setItem("voxai_prescriptions", JSON.stringify(initialPrescriptions));
      localStorage.setItem("voxai_voicelogs", JSON.stringify(initialVoiceLogs));
      window.dispatchEvent(new Event("storage"));
      if (typeof window.onDatabaseChange === "function") {
        window.onDatabaseChange();
      }
    }
  };
})();
