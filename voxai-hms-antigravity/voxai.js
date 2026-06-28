// VoxAI Audio Intake & NLU Parsing Logic
document.addEventListener("DOMContentLoaded", () => {
  const micBtn = document.getElementById("micBtn");
  const statusBadge = document.getElementById("statusBadge");
  const transcriptionText = document.getElementById("transcriptionText");
  const waveBars = document.querySelectorAll(".wave-bar");
  const processBtn = document.getElementById("processBtn");

  let isRecording = false;
  let recognition = null;
  let mediaRecorder = null;
  let audioChunks = [];

  // Speech Recognition setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let liveText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          liveText += event.results[i][0].transcript;
        } else {
          liveText += event.results[i][0].transcript;
        }
      }
      if (liveText && transcriptionText) {
        transcriptionText.value = liveText.trim();
      }
    };

    recognition.onerror = (e) => {
      console.warn("SpeechRecognition error:", e.error);
    };
  }

  // MediaRecorder API setup
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
        console.log("Audio recording saved successfully. Size:", blob.size);
      };

      mediaRecorder.start();
    } catch (e) {
      console.warn("Audio media recording permissions missing or denied:", e);
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Toggle active pulses
  const toggleRecording = () => {
    isRecording = !isRecording;
    if (isRecording) {
      if (statusBadge) {
        statusBadge.textContent = "Recording...";
        statusBadge.className = "status-badge recording";
      }
      if (micBtn) micBtn.classList.add("pulse-mic-active");
      waveBars.forEach(bar => bar.classList.add("active"));

      startRecordingAudio();
      if (recognition) {
        if (transcriptionText) transcriptionText.value = "";
        recognition.start();
      }
    } else {
      if (statusBadge) {
        statusBadge.textContent = "Standby";
        statusBadge.className = "status-badge";
      }
      if (micBtn) micBtn.classList.remove("pulse-mic-active");
      waveBars.forEach(bar => bar.classList.remove("active"));

      stopRecordingAudio();
      if (recognition) {
        recognition.stop();
      }
    }
  };

  if (micBtn) {
    micBtn.addEventListener("click", toggleRecording);
  }

  // TTS Feedback speaker
  const speakVoice = (text) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const speakUtterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speakUtterance);
    }
  };

  // Voice Command Parsing Layer
  const runVoiceCommand = () => {
    const rawText = transcriptionText ? transcriptionText.value.trim() : "";
    if (!rawText) {
      speakVoice("Please speak or write an intake command first.");
      return;
    }

    const patients = window.HMS_DB.getPatients() || [];
    const appointments = window.HMS_DB.getAppointments() || [];
    const voiceLogs = window.HMS_DB.getVoiceLogs() || [];
    const doctors = window.HMS_DB.getDoctors() || [];

    let intent = "UNKNOWN";
    let speakFeedback = "";
    let redirectUrl = "";

    // 1. "Book appointment with Doctor [Name]"
    const bookRegex = /(?:book\s+appointment\s+with\s+doctor|book\s+with\s+doctor|book\s+appointment\s+with|book\s+with|doctor)\s+([A-Za-z\s]+)/i;
    const bookMatch = rawText.match(bookRegex);

    // 2. "Show my prescription history"
    const rxRegex = /(?:show|view|open|my)\s+(?:prescription|rx)\s+(?:history|cards|log)/i;
    const rxMatch = rawText.match(rxRegex);

    // 3. "Register new patient [Name]"
    const regRegex = /(?:register\s+new\s+patient|register\s+patient|register)\s+([A-Za-z\s]+)/i;
    const regMatch = rawText.match(regRegex);

    if (bookMatch) {
      intent = "BOOK_APPOINTMENT";
      const docName = bookMatch[1].trim();
      
      // Look up doctor
      const matchedDoc = doctors.find(d => d.name.toLowerCase().includes(docName.toLowerCase())) || doctors[1]; // default: Dr. Anand Varma
      
      const newApptId = appointments.length > 0 ? Math.max(...appointments.map(a => a.appointment_id)) + 1 : 1;
      const currentPatient = patients.find(p => p.patient_id === "PAT1204") || patients[0];

      const newAppt = {
        appointment_id: newApptId,
        patient_id: currentPatient ? currentPatient.patient_id : "PAT1204",
        patient_name: currentPatient ? currentPatient.name : "Rohan Das",
        doctor_id: matchedDoc.doctor_id,
        doctor_name: matchedDoc.name,
        doctor_specialty: matchedDoc.specialty,
        date: new Date().toISOString().split('T')[0],
        time_slot: "11:30 AM",
        reason: "Scheduled via Audio Voice Command",
        status: "CONFIRMED",
        created_at: new Date().toISOString()
      };

      appointments.unshift(newAppt);
      window.HMS_DB.saveAppointments(appointments);

      speakFeedback = `Confirmed appointment with Doctor ${matchedDoc.name}.`;
      
      localStorage.setItem("voxai_last_action", JSON.stringify({
        intent,
        raw: rawText,
        patient_name: newAppt.patient_name,
        doctor_name: matchedDoc.name,
        reason: newAppt.reason,
        message: speakFeedback
      }));
      
      redirectUrl = "vox.html";

    } else if (rxMatch) {
      intent = "QUERY_INFO";
      speakFeedback = "Showing prescription history.";
      redirectUrl = "patient-dashboard.html";

    } else if (regMatch) {
      intent = "REGISTER_PATIENT";
      const patName = regMatch[1].trim();
      const uniqueId = "PAT" + Math.floor(1000 + Math.random() * 9000);

      const newPatient = {
        patient_id: uniqueId,
        name: patName,
        age: 30,
        gender: "M",
        contact: "9876543210",
        address: "Voice Intake Ward",
        created_at: new Date().toISOString()
      };

      patients.push(newPatient);
      window.HMS_DB.savePatients(patients);

      speakFeedback = `Registered patient ${patName} successfully.`;

      localStorage.setItem("voxai_last_action", JSON.stringify({
        intent,
        raw: rawText,
        patient_name: patName,
        doctor_name: "N/A",
        reason: "Self Registration Intake Profile",
        message: speakFeedback
      }));

      redirectUrl = "vox.html";

    } else {
      intent = "UNKNOWN";
      speakFeedback = "Command recognized, but I could not decipher the exact administrative action.";
    }

    // Update VoiceLog
    const nextLogId = voiceLogs.length > 0 ? Math.max(...voiceLogs.map(v => v.log_id)) + 1 : 1;
    const newLog = {
      log_id: nextLogId,
      raw_text: rawText,
      intent,
      response_text: speakFeedback,
      timestamp: new Date().toISOString()
    };
    voiceLogs.unshift(newLog);
    window.HMS_DB.saveVoiceLogs(voiceLogs);

    // Speak audio reply
    speakVoice(speakFeedback);

    // Alert & redirect
    alert(`${intent}: ${speakFeedback}`);
    if (redirectUrl) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    }
  };

  if (processBtn) {
    processBtn.addEventListener("click", runVoiceCommand);
  }
});
