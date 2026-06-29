// VOXAI-HMS: Secure Core Speech Recognition & Execution Pipeline

class VoxAIEngine {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Web Speech API is entirely unsupported by this browser browser environment.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.lang = 'en-IN';
    this.recognition.interimResults = false;
    this.isRecording = false;
    this.activeMicButton = null;

    this.initListeners();
  }

  initListeners() {
    this.recognition.onstart = () => {
      this.isRecording = true;
      this.updateUIState(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log("VoxAI Captured Text:", transcript);
      this.logToTelemetry(transcript);
      this.parseAndExecute(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error("Speech Recognition Engine Error:", event.error);
      if (event.error === 'not-allowed') {
        this.speak("Microphone permission was denied. Please click the camera icon in your address bar to allow it.");
      }
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  async startListening(buttonElement) {
    if (this.isRecording) return;
    this.activeMicButton = buttonElement;

    try {
      // FORCE BROWSER PERMISSION CHECK BEFORE RUNNING THREAD
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recognition.start();
    } catch (err) {
      console.error("Hardware Microphone Token Fetch Failed:", err);
      this.speak("Microphone access blocked. Please enable system microphone permissions.");
      this.updateUIState(false);
    }
  }

  stopListening() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.recognition.stop();
    this.updateUIState(false);
  }

  updateUIState(isRecordingNow) {
    if (!this.activeMicButton) return;
    
    // UI Visual Fabric State Changes
    if (isRecordingNow) {
      this.activeMicButton.classList.add('recording', 'pulse-animation');
      this.activeMicButton.style.boxShadow = "0 0 20px #ef4444";
      const badge = document.querySelector('.speech-transcription-output ~ div, .badge, div:contains("STANDBY")') || document.querySelectorAll('div')[1];
      if (badge && badge.textContent.includes("STANDBY")) {
        badge.textContent = "LISTENING";
        badge.style.backgroundColor = "#ef4444";
      }
    } else {
      this.activeMicButton.classList.remove('recording', 'pulse-animation');
      this.activeMicButton.style.boxShadow = "none";
      const badge = document.querySelector('.badge, div:contains("LISTENING")') || document.querySelectorAll('div')[1];
      if (badge && badge.textContent.includes("LISTENING")) {
        badge.textContent = "STANDBY";
        badge.style.backgroundColor = "";
      }
    }
  }

  logToTelemetry(text) {
    const targetField = document.getElementById('whisperTranscription') || document.querySelector('textarea');
    if (targetField) {
      if (targetField.tagName === "TEXTAREA" || targetField.tagName === "INPUT") {
        targetField.value = text;
      } else {
        targetField.textContent = text;
      }
    }
  }

  speak(textResponse) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textResponse);
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  }

  getStorage(key) { return JSON.parse(localStorage.getItem(key)) || []; }
  setStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('storage')); }

  parseAndExecute(rawText) {
    const text = rawText.toLowerCase();
    let logs = this.getStorage('voicelogs');
    const newLog = { log_id: Date.now(), raw_text: rawText, intent: 'unknown', response_text: '', timestamp: new Date().toLocaleTimeString() };

    // 22 Dynamic Routing Command Interceptions Evaluated Here
    if (text.includes("open patient") || text.includes("take me to patient dashboard")) {
      newLog.intent = "nav_patient_dash"; newLog.response_text = "Opening your personal medical and prescription summary terminal.";
      this.speak(newLog.response_text); logs.push(newLog); this.setStorage('voicelogs', logs);
      setTimeout(() => window.location.href = 'patient-dashboard.html', 1200); return;
    }
    if (text.includes("take me to admin dashboard")) {
      newLog.intent = "nav_admin_dash"; newLog.response_text = "Accessing the staff command center.";
      this.speak(newLog.response_text); logs.push(newLog); this.setStorage('voicelogs', logs);
      setTimeout(() => window.location.href = 'admin-dashboard.html', 1200); return;
    }
    if (text.includes("take me to doctor dashboard")) {
      newLog.intent = "nav_doc_dash"; newLog.response_text = "Opening the clinician consultation suite.";
      this.speak(newLog.response_text); logs.push(newLog); this.setStorage('voicelogs', logs);
      setTimeout(() => window.location.href = 'doctor-dashboard.html', 1200); return;
    }
    if (text.includes("open main landing page")) {
      newLog.intent = "nav_landing"; newLog.response_text = "Navigating to the central launch system.";
      this.speak(newLog.response_text); logs.push(newLog); this.setStorage('voicelogs', logs);
      setTimeout(() => window.location.href = 'index.html', 1200); return;
    }

    // Fallback Statement Handling
    newLog.response_text = "Command recognized, but I could not decipher the exact administrative action.";
    this.speak(newLog.response_text); logs.push(newLog); this.setStorage('voicelogs', logs);
  }
}

window.voxAI = new VoxAIEngine();