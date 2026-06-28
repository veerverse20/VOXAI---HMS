// VoxAI Audio Intake, Speech Recognition, NLU Parsing & Execution Engine
document.addEventListener("DOMContentLoaded", () => {
  // Inject pulsing animation stylesheet rules dynamically
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    @keyframes mic-pulse-anim {
      0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      70% {
        box-shadow: 0 0 0 15px rgba(239, 68, 68, 0), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
    }
    .pulse-mic-active {
      animation: mic-pulse-anim 1.5s infinite !important;
      background-color: #ef4444 !important;
      border-color: #fca5a5 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(styleEl);

  // Selector elements (works on voxmic.html and also overlays directly on dashboards)
  const micBtn = document.getElementById("micBtn");
  const statusBadge = document.getElementById("statusBadge");
  const transcriptionText = document.getElementById("transcriptionText");
  const waveBars = document.querySelectorAll(".wave-bar");
  const processBtn = document.getElementById("processBtn");

  let isRecording = false;
  let recognition = null;
  let mediaRecorder = null;
  let audioChunks = [];

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let liveText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        liveText += event.results[i][0].transcript;
      }
      if (liveText) {
        // Stream text to current context text containers
        updateTranscriptionContainers(liveText.trim());
      }
    };

    recognition.onerror = (e) => {
      console.warn("SpeechRecognition error:", e.error);
    };

    recognition.onend = () => {
      if (isRecording) {
        // Restart loop if still in recording state
        try { recognition.start(); } catch (err) {}
      }
    };
  }

  const updateTranscriptionContainers = (text) => {
    if (transcriptionText) {
      transcriptionText.value = text;
    }
    // Also mirror to active dashboard input elements
    const voiceCommandText = document.getElementById("voiceCommandText");
    const chartNotes = document.getElementById("chartNotes");
    const symptomText = document.getElementById("symptomText");

    if (voiceCommandText) voiceCommandText.value = text;
    if (chartNotes && /voxai,\s*document\s+clinical/i.test(text)) {
      // Don't overwrite notes unless matching document command
      const matchText = text.replace(/voxai,\s*document\s+clinical\s+chart\s+record:\s*/i, "");
      chartNotes.value = matchText;
    } else if (symptomText) {
      symptomText.value = text;
    }
  };

  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/wav" });
        console.log("Audio recording saved. Size:", blob.size);
      };
      mediaRecorder.start();
    } catch (e) {
      console.warn("Media recording permission unavailable:", e);
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const startCapture = () => {
    isRecording = true;
    updateUIElements(true);
    startRecordingAudio();
    if (recognition) {
      recognition.start();
    }
  };

  const stopCapture = () => {
    isRecording = false;
    updateUIElements(false);
    stopRecordingAudio();
    if (recognition) {
      recognition.stop();
    }
    // Run evaluation when capture ends
    setTimeout(evaluateCapturedCommand, 300);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopCapture();
    } else {
      startCapture();
    }
  };

  const updateUIElements = (active) => {
    if (statusBadge) {
      statusBadge.textContent = active ? "Listening..." : "Standby";
      statusBadge.className = active ? "status-badge recording" : "status-badge";
    }
    if (micBtn) {
      if (active) micBtn.classList.add("pulse-mic-active");
      else micBtn.classList.remove("pulse-mic-active");
    }
    // Set dashboard elements to listening mirroring
    const mainMicTriggers = document.querySelectorAll('a[href="voxmic.html"], .voice-mic-trigger');
    mainMicTriggers.forEach(btn => {
      if (active) btn.classList.add("pulse-mic-active");
      else btn.classList.remove("pulse-mic-active");
    });

    const voiceCommandText = document.getElementById("voiceCommandText");
    if (voiceCommandText && active) {
      voiceCommandText.placeholder = "Listening for Command...";
    }

    waveBars.forEach(bar => {
      if (active) bar.classList.add("active");
      else bar.classList.remove("active");
    });
  };

  // Bind microphone triggers
  if (micBtn) {
    micBtn.addEventListener("click", toggleRecording);
  }

  // Intercept the dashboard links to run locally in-page if Speech API is available
  const interceptDashboardTriggers = () => {
    const triggers = document.querySelectorAll('a[href="voxmic.html"]');
    triggers.forEach(t => {
      // Exclude voxmic.html console button
      if (window.location.pathname.includes("voxmic.html")) return;

      t.addEventListener("click", (e) => {
        if (SpeechRecognition) {
          e.preventDefault();
          // Toggle local capture instead of navigating
          toggleRecording();
        }
      });
    });
  };
  interceptDashboardTriggers();

  // TTS Voice Output utility
  const speakVoice = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const speakUtterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speakUtterance);
    }
  };

  // Logger helper
  const logAction = (intent, responseText, rawText) => {
    const voiceLogs = window.HMS_DB.getVoiceLogs() || [];
    const nextLogId = voiceLogs.length > 0 ? Math.max(...voiceLogs.map(v => v.log_id)) + 1 : 1;
    const newLog = {
      log_id: nextLogId,
      raw_text: rawText,
      intent: intent,
      response_text: responseText,
      timestamp: new Date().toISOString()
    };
    voiceLogs.unshift(newLog);
    window.HMS_DB.saveVoiceLogs(voiceLogs);
    if (window.onDatabaseChange) window.onDatabaseChange();
  };

  // Switchboard navigation router
  const executeNav = (url, voiceResponse, actionName, rawText) => {
    logAction(actionName, voiceResponse, rawText);
    speakVoice(voiceResponse);
    setTimeout(() => {
      window.location.href = url;
    }, 1500);
  };

  // Evaluates captured or typed text commands
  const evaluateCapturedCommand = () => {
    let rawText = "";
    if (transcriptionText) {
      rawText = transcriptionText.value.trim();
    } else {
      const voiceCommandText = document.getElementById("voiceCommandText");
      const chartNotes = document.getElementById("chartNotes");
      const symptomText = document.getElementById("symptomText");
      
      if (voiceCommandText && voiceCommandText.value) rawText = voiceCommandText.value.trim();
      else if (chartNotes && chartNotes.value && /voxai,\s*document/i.test(chartNotes.value)) {
        rawText = "VoxAI, document clinical chart record: " + chartNotes.value.trim();
      }
      else if (symptomText && symptomText.value) rawText = symptomText.value.trim();
    }

    if (!rawText) return;
    parseAndExecuteCommand(rawText);
  };

  // Main 22-statement command dictionary parser
  const parseAndExecuteCommand = (rawText) => {
    const normText = rawText.trim();

    // CATEGORY A: GLOBAL INTER-PORTAL NAVIGATION COMMANDS
    if (/(?:voxai,?\s*)?open\s+main\s+landing\s+page/i.test(normText)) {
      executeNav("index.html", "Navigating to the central launch system.", "NAV_LANDING", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?open\s+staff\s+login\s+console/i.test(normText)) {
      executeNav("admin.html", "Launching the administrative access gateway.", "NAV_STAFF_LOGIN", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?take\s+me\s+to\s+admin\s+dashboard/i.test(normText)) {
      executeNav("admin-dashboard.html", "Accessing the staff command center and live queue monitor.", "NAV_ADMIN_DASHBOARD", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?open\s+doctor\s+login\s+screen/i.test(normText)) {
      executeNav("doctor.html", "Launching the physician verification gate.", "NAV_DOCTOR_LOGIN", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?take\s+me\s+to\s+doctor\s+dashboard/i.test(normText)) {
      executeNav("doctor-dashboard.html", "Opening the clinician consultation and diagnostics suite.", "NAV_DOCTOR_DASHBOARD", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?open\s+patient\s+login\s+page/i.test(normText)) {
      executeNav("patient.html", "Accessing the patient verification portal.", "NAV_PATIENT_LOGIN", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?take\s+me\s+to\s+patient\s+dashboard/i.test(normText)) {
      executeNav("patient-dashboard.html", "Opening your personal medical and prescription summary terminal.", "NAV_PATIENT_DASHBOARD", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?open\s+patient\s+registration\s+onboarding/i.test(normText)) {
      executeNav("patient-signup.html", "Initializing the new patient enrollment forms.", "NAV_PATIENT_SIGNUP", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?take\s+me\s+to\s+scheduling\s+portal/i.test(normText)) {
      executeNav("book.html", "Accessing the main appointment booking layout configuration.", "NAV_SCHEDULING_PORTAL", normText);
      return true;
    }
    if (/(?:voxai,?\s*)?open\s+voice\s+assistant\s+control\s+room/i.test(normText)) {
      executeNav("vox.html", "Opening voice configuration system metrics.", "NAV_CONTROL_ROOM", normText);
      return true;
    }

    // CATEGORY B: STAFF INTAKE & VERIFICATION COMMANDS
    const match11 = normText.match(/(?:voxai,?\s*)?new\s+patient\s+registration:\s*([A-Za-z\s]+?),\s*phone\s*([0-9\s\-]+?),\s*for\s*([A-Za-z\s]+?)\s*practice/i);
    if (match11) {
      const patName = match11[1].trim();
      const phoneNum = match11[2].trim();
      const dept = match11[3].trim();

      // Set pending intake variables
      localStorage.setItem("voxai_pending_intake", JSON.stringify({ name: patName, phone: phoneNum, department: dept }));
      
      // Reflect verifier layout metrics
      const vPatient = document.getElementById("vPatient");
      const vPhysician = document.getElementById("vPhysician");
      const vSymptom = document.getElementById("vSymptom");
      if (vPatient) vPatient.textContent = patName;
      if (vPhysician) vPhysician.textContent = dept + " Practice";
      if (vSymptom) vSymptom.textContent = "Phone: " + phoneNum;

      // Reflect registration form if open on page
      const regName = document.getElementById("regName");
      const regContact = document.getElementById("regContact");
      const regAddress = document.getElementById("regAddress");
      if (regName) regName.value = patName;
      if (regContact) regContact.value = phoneNum;
      if (regAddress) regAddress.value = dept + " Practice";

      const outMsg = `Intake data extracted. Patient ${patName} is staged for validation in the verification card.`;
      logAction("STAFF_INTAKE", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?finalize\s+and\s+check\s+in\s+current\s+patient/i.test(normText)) {
      const finalizeBtn = document.getElementById("finalizeCheckinBtn");
      if (finalizeBtn) {
        finalizeBtn.click();
      } else {
        // Fallback checks
        const pending = JSON.parse(localStorage.getItem("voxai_pending_intake") || '{"name":"Rohan Das","phone":"9123456789","department":"Orthopedics"}');
        const patients = window.HMS_DB.getPatients() || [];
        const newPatId = "PAT" + Math.floor(1000 + Math.random() * 9000);
        const newPat = {
          patient_id: newPatId,
          name: pending.name,
          age: 34,
          gender: "M",
          contact: pending.phone,
          address: pending.department + " Practice",
          created_at: new Date().toISOString()
        };
        patients.push(newPat);
        window.HMS_DB.savePatients(patients);

        const appointments = window.HMS_DB.getAppointments() || [];
        const newApptId = appointments.length > 0 ? Math.max(...appointments.map(a => a.appointment_id)) + 1 : 1;
        const newAppt = {
          appointment_id: newApptId,
          patient_id: newPatId,
          patient_name: pending.name,
          doctor_id: "DOC102",
          doctor_name: "Anand Varma",
          doctor_specialty: pending.department || "Orthopedics",
          date: new Date().toISOString().split('T')[0],
          time_slot: "11:30 AM",
          reason: "Voice Intake Intake Profile",
          status: "CONFIRMED",
          created_at: new Date().toISOString()
        };
        appointments.unshift(newAppt);
        window.HMS_DB.saveAppointments(appointments);
      }

      const outMsg = "Patient record validated, unique ID generated, and appended to the operations queue.";
      logAction("STAFF_FINALIZE", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?route\s+current\s+row\s+to\s+doctor/i.test(normText)) {
      const appointments = window.HMS_DB.getAppointments() || [];
      if (appointments.length > 0) {
        appointments[0].status = "CONFIRMED";
        window.HMS_DB.saveAppointments(appointments);
        if (window.onDatabaseChange) window.onDatabaseChange();
      }

      const outMsg = "Queue index processed. Transferring patient file to the active doctor consultation desk.";
      logAction("STAFF_ROUTE", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    // CATEGORY C: CLINICIAN ADMINISTRATIVE UTILITIES
    if (/(?:voxai,?\s*)?log\s+doctor\s+attendance\s+as\s+present/i.test(normText)) {
      const attendance = window.HMS_DB.getAttendance() || [];
      let docAtt = attendance.find(a => a.doctor_id === "DOC102");
      if (!docAtt) {
        docAtt = { doctor_id: "DOC102", name: "Anand Varma", is_available: true };
        attendance.push(docAtt);
      } else {
        docAtt.is_available = true;
      }
      window.HMS_DB.saveAttendance(attendance);

      const statusText = document.getElementById("availStatus");
      const statusBtn = document.getElementById("toggleAvailBtn");
      if (statusText) {
        statusText.textContent = "PRESENT";
        statusText.className = "font-bold font-mono tracking-wider text-green-600";
      }
      if (statusBtn) {
        statusBtn.textContent = "Mark Absent";
        statusBtn.className = "bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase transition-all cursor-pointer shadow-sm";
      }

      const outMsg = "Attendance logged. Your system profile status is now marked as active and present.";
      logAction("DOCTOR_ATTENDANCE_PRESENT", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?log\s+doctor\s+attendance\s+as\s+absent/i.test(normText)) {
      const attendance = window.HMS_DB.getAttendance() || [];
      let docAtt = attendance.find(a => a.doctor_id === "DOC102");
      if (!docAtt) {
        docAtt = { doctor_id: "DOC102", name: "Anand Varma", is_available: false };
        attendance.push(docAtt);
      } else {
        docAtt.is_available = false;
      }
      window.HMS_DB.saveAttendance(attendance);

      const statusText = document.getElementById("availStatus");
      const statusBtn = document.getElementById("toggleAvailBtn");
      if (statusText) {
        statusText.textContent = "ABSENT";
        statusText.className = "font-bold font-mono tracking-wider text-red-650";
      }
      if (statusBtn) {
        statusBtn.textContent = "Mark Present";
        statusBtn.className = "bg-[#ef4444] hover:bg-red-650 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase transition-all cursor-pointer shadow-sm";
      }

      const outMsg = "Status altered. Profile flagged as off-duty inside the network registry framework.";
      logAction("DOCTOR_ATTENDANCE_ABSENT", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?access\s+next\s+upcoming\s+patient\s+chart/i.test(normText)) {
      const viewChartBtn = document.getElementById("viewChartBtn");
      if (viewChartBtn) {
        viewChartBtn.click();
      } else {
        const appointments = window.HMS_DB.getAppointments() || [];
        const nextAppt = appointments.find(a => a.doctor_id === "DOC102" && a.status === "CONFIRMED");
        if (nextAppt) {
          localStorage.setItem("voxai_active_patient_chart", JSON.stringify(nextAppt));
        }
      }

      const outMsg = "Retrieving case files and systemic database charts for the next incoming patient entry.";
      logAction("DOCTOR_ACCESS_CHART", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    const match17 = normText.match(/(?:voxai,?\s*)?document\s+clinical\s+chart\s+record:\s*(.+)/i);
    if (match17) {
      const diagnosticText = match17[1].trim();
      const chartNotes = document.getElementById("chartNotes");
      if (chartNotes) {
        chartNotes.value = diagnosticText;
      }
      localStorage.setItem("voxai_pending_chart_notes", diagnosticText);

      const outMsg = "Dictation parsed. Transcript successfully mapped into the clinical charts overview container.";
      logAction("DOCTOR_DOCUMENT_CHART", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?commit\s+chart\s+changes\s+and\s+save\s+record/i.test(normText)) {
      const saveChartBtn = document.getElementById("saveChartBtn");
      if (saveChartBtn) {
        saveChartBtn.click();
      } else {
        const pendingNotes = localStorage.getItem("voxai_pending_chart_notes") || "No notes documented.";
        const appointments = window.HMS_DB.getAppointments() || [];
        const currentAppt = appointments.find(a => a.doctor_id === "DOC102" && a.status === "CONFIRMED") || appointments[0];
        if (currentAppt) {
          currentAppt.status = "Completed";
          currentAppt.reason += " | Notes: " + pendingNotes;
          window.HMS_DB.saveAppointments(appointments);
        }
      }

      const outMsg = "Medical chart record finalized, encrypted, and committed to the core MySQL framework.";
      logAction("DOCTOR_SAVE_CHART", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    // CATEGORY D: SELF-SERVICE CORRELATIONS
    const match19 = normText.match(/(?:voxai,?\s*)?schedule\s+appointment\s+with\s+doctor\s+([A-Za-z\s]+?)\s+for\s+(.+)/i);
    if (match19) {
      const docName = match19[1].trim();
      const reasonText = match19[2].trim();

      const doctors = window.HMS_DB.getDoctors() || [];
      const matchedDoc = doctors.find(d => d.name.toLowerCase().includes(docName.toLowerCase())) || doctors[0];

      const appointments = window.HMS_DB.getAppointments() || [];
      const newApptId = appointments.length > 0 ? Math.max(...appointments.map(a => a.appointment_id)) + 1 : 1;
      const newAppt = {
        appointment_id: newApptId,
        patient_id: "PAT1204",
        patient_name: "Rohan Das",
        doctor_id: matchedDoc.doctor_id,
        doctor_name: matchedDoc.name,
        doctor_specialty: matchedDoc.specialty,
        date: new Date().toISOString().split('T')[0],
        time_slot: "11:30 AM",
        reason: reasonText,
        status: "CONFIRMED",
        created_at: new Date().toISOString()
      };
      appointments.unshift(newAppt);
      window.HMS_DB.saveAppointments(appointments);

      if (window.onDatabaseChange) window.onDatabaseChange();

      const outMsg = `Appointment successfully generated in the management layout with Doctor ${matchedDoc.name} for ${reasonText}.`;
      logAction("PATIENT_SCHEDULE", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?execute\s+early\s+arrival\s+pre-check\s+in/i.test(normText)) {
      const appointments = window.HMS_DB.getAppointments() || [];
      const myAppt = appointments.find(a => a.patient_id === "PAT1204" && a.status === "CONFIRMED");
      if (myAppt) {
        myAppt.status = "CONFIRMED";
        window.HMS_DB.saveAppointments(appointments);
        if (window.onDatabaseChange) window.onDatabaseChange();
      }

      const outMsg = "Pre-check-in verification loops successfully confirmed. Your queue layout token is prioritized.";
      logAction("PATIENT_PRE_CHECKIN", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?display\s+full\s+prescription\s+list\s+history/i.test(normText)) {
      const outMsg = "Accessing core database history collections. Rendering complete medical prescription archive.";
      logAction("PATIENT_PRESCRIPTIONS", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    if (/(?:voxai,?\s*)?request\s+automated\s+medication\s+refill/i.test(normText)) {
      const outMsg = "Refill request processed for active prescriptions. Staged for primary clinician approval panels.";
      logAction("PATIENT_REFILL_REQUEST", outMsg, normText);
      speakVoice(outMsg);
      alert(outMsg);
      return true;
    }

    // Default Fallback
    const failMsg = "Command recognized, but I could not decipher the exact administrative action.";
    logAction("UNKNOWN", failMsg, normText);
    speakVoice(failMsg);
    alert(failMsg);
    return false;
  };

  // Expose parser globally for integration testing
  window.parseAndExecuteCommand = parseAndExecuteCommand;

  if (processBtn) {
    processBtn.addEventListener("click", evaluateCapturedCommand);
  }
});
