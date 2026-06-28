// Doctor Dashboard Operations
document.addEventListener("DOMContentLoaded", () => {
  // Require Doctor authentication
  const session = window.HMS_DB.requireAuth(["doctor"]);

  // Greeting
  document.getElementById("welcomeGreeting").textContent = `Hello, ${session.name}!`;

  // Set date
  document.getElementById("headerDate").textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Handle Availability roster
  const renderAvailStatus = () => {
    const attList = window.HMS_DB.getAttendance() || [];
    const myAtt = attList.find(a => a.doctor_id === session.id);
    const isAvail = myAtt ? myAtt.is_available : true;
    
    const statusText = document.getElementById("availStatus");
    const statusBtn = document.getElementById("toggleAvailBtn");

    if (isAvail) {
      statusText.textContent = "PRESENT";
      statusText.className = "font-bold font-mono tracking-wider text-green-600";
      statusBtn.textContent = "Mark Absent";
      statusBtn.className = "bg-red-500 hover:bg-red-650 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase transition-all cursor-pointer shadow-sm";
    } else {
      statusText.textContent = "ABSENT";
      statusText.className = "font-bold font-mono tracking-wider text-red-500";
      statusBtn.textContent = "Mark Present";
      statusBtn.className = "bg-green-600 hover:bg-green-650 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase transition-all cursor-pointer shadow-sm";
    }
  };

  document.getElementById("toggleAvailBtn").addEventListener("click", () => {
    const attList = window.HMS_DB.getAttendance() || [];
    let myAtt = attList.find(a => a.doctor_id === session.id);
    if (myAtt) {
      myAtt.is_available = !myAtt.is_available;
    } else {
      myAtt = { doctor_id: session.id, date: new Date().toISOString().split('T')[0], is_available: false };
      attList.push(myAtt);
    }
    window.HMS_DB.saveAttendance(attList);
    renderAvailStatus();
    
    if (window.speechSynthesis) {
      const speech = new SpeechSynthesisUtterance("Physician duty status toggled.");
      window.speechSynthesis.speak(speech);
    }
  });

  // Pre-fill Prescription ID
  const generateRxId = () => {
    const prs = window.HMS_DB.getPrescriptions() || [];
    return "RX" + (prs.length + 1002);
  };
  
  const rxIdInput = document.getElementById("rxId");
  if (rxIdInput) {
    rxIdInput.value = generateRxId();
  }

  // Load Patient list select options
  const patients = window.HMS_DB.getPatients() || [];
  const rxPatientSelect = document.getElementById("rxPatientSelect");
  if (rxPatientSelect) {
    rxPatientSelect.innerHTML = "";
    patients.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = `${p.name} (${p.patient_id})`;
      rxPatientSelect.appendChild(opt);
    });
  }

  // Render Queue, Next patient & alerts
  const renderDashboardData = () => {
    const queueDiv = document.getElementById("doctorQueue");
    const appointments = window.HMS_DB.getAppointments() || [];
    const myAppts = appointments.filter(a => a.doctor_id === session.id);

    // 1. Queue list
    queueDiv.innerHTML = "";
    if (myAppts.length === 0) {
      queueDiv.innerHTML = `
        <div class="text-center text-slate-450 py-10 text-xs font-sans italic">
          No appointments remaining for today.
        </div>
      `;
    } else {
      myAppts.forEach(a => {
        const row = document.createElement("div");
        row.className = "bg-[#f8fafc] border border-slate-150 p-4 rounded-xl flex justify-between items-center text-xs";
        
        let badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        let actionBtn = `<button class="bg-[#3b82f6] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer" onclick="updateAppt(${a.appointment_id}, 'In Progress')">Start</button>`;
        
        if (a.status === "In Progress") {
          badgeClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse";
          actionBtn = `<button class="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer" onclick="updateAppt(${a.appointment_id}, 'Completed')">Complete</button>`;
        } else if (a.status === "Completed") {
          badgeClass = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
          actionBtn = `<span class="text-green-600 font-bold">Done ✅</span>`;
        }

        row.innerHTML = `
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${a.patient_name} <span class="text-[10px] text-slate-400 font-mono">(${a.patient_id})</span></h4>
            <span class="text-[10px] text-slate-455 block font-bold mt-0.5">${a.time_slot} — Reason: ${a.reason}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="badge ${badgeClass} text-[9px] py-1 px-2.5 rounded-full font-bold uppercase tracking-wider">${a.status}</span>
            ${actionBtn}
          </div>
        `;
        queueDiv.appendChild(row);
      });
    }

    // 2. Next up card
    const nextAppt = myAppts.find(a => a.status === "CONFIRMED");
    const inProgressAppt = myAppts.find(a => a.status === "In Progress");
    const activeConsult = inProgressAppt || nextAppt;

    const nextTime = document.getElementById("nextPatTime");
    const nextName = document.getElementById("nextPatName");
    const nextReason = document.getElementById("nextPatReason");
    const viewChartBtn = document.getElementById("viewChartBtn");

    if (activeConsult) {
      nextTime.textContent = activeConsult.time_slot;
      nextName.textContent = `${activeConsult.patient_name} (${activeConsult.patient_id})`;
      nextReason.textContent = `Reason: ${activeConsult.reason}`;
      viewChartBtn.style.display = "block";
      viewChartBtn.onclick = () => {
        alert(`EHR Summary chart loaded for: ${activeConsult.patient_name}.`);
        document.getElementById("chartNotes").value = `Clinical notes chart record for ${activeConsult.patient_name}:\n- Date: ${new Date().toLocaleDateString()}\n- Diagnosis: \n- Prescribed: \n`;
      };
    } else {
      nextTime.textContent = "No Slots Scheduled";
      nextName.textContent = "No patient remaining";
      nextReason.textContent = "Reason: Standard duty queue finished.";
      viewChartBtn.style.display = "none";
    }
  };

  // Update appointment status (onclick action)
  window.updateAppt = (apptId, nextStatus) => {
    const appointments = window.HMS_DB.getAppointments() || [];
    const appt = appointments.find(a => a.appointment_id === apptId);
    if (appt) {
      appt.status = nextStatus;
      window.HMS_DB.saveAppointments(appointments);

      if (window.speechSynthesis) {
        const text = nextStatus === "In Progress" ? "Consultation session has started." : "Consultation session completed.";
        const speech = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(speech);
      }

      renderDashboardData();
      renderSettingsDB();
    }
  };

  // Save chart records notes
  const notesText = document.getElementById("chartNotes");
  const saveNotesBtn = document.getElementById("saveChartBtn");
  const saveBadge = document.getElementById("saveBadge");
  if (saveNotesBtn) {
    saveNotesBtn.addEventListener("click", () => {
      const txt = notesText.value.trim();
      if (!txt) return;
      saveBadge.classList.remove("hidden");
      if (window.speechSynthesis) {
        const speech = new SpeechSynthesisUtterance("Consultation charts saved to patient record.");
        window.speechSynthesis.speak(speech);
      }
      setTimeout(() => {
        saveBadge.classList.add("hidden");
      }, 3000);
    });
  }

  // Issue new prescriptions
  const rxForm = document.getElementById("rxForm");
  const renderPrescriptions = () => {
    const prsGrid = document.getElementById("prescriptionsGrid");
    if (!prsGrid) return;

    prsGrid.innerHTML = "";
    const prescriptions = window.HMS_DB.getPrescriptions() || [];
    const myRx = prescriptions.filter(p => p.doctor_name.toLowerCase().includes(session.name.toLowerCase().replace("dr. ", "")));

    if (myRx.length === 0) {
      prsGrid.innerHTML = `<div class="text-slate-400 py-6 text-xs italic text-center">No prescriptions issued yet.</div>`;
      return;
    }

    myRx.forEach(p => {
      const div = document.createElement("div");
      div.className = "bg-[#f8fafc] border border-slate-150 p-3 rounded-xl flex justify-between items-center text-xs";
      div.innerHTML = `
        <div>
          <div style="font-weight: 700; color: #2563eb;">${p.prescription_id} — ${p.patient_name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Diagnosis: ${p.diagnosis}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-mono); color: #2563eb; font-weight: 550;">${p.date}</div>
          <div style="font-size: 10px; color: #94a3b8; font-family: var(--font-mono); font-weight: 600; margin-top: 2px; text-transform: uppercase;">${p.medications}</div>
        </div>
      `;
      prsGrid.appendChild(div);
    });
  };

  if (rxForm) {
    rxForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const rxId = document.getElementById("rxId").value.trim();
      const patientName = document.getElementById("rxPatientSelect").value;
      const diagnosis = document.getElementById("rxDiagnosis").value.trim();
      const medications = document.getElementById("rxMedications").value.trim();

      const newRx = {
        prescription_id: rxId,
        patient_name: patientName,
        doctor_name: session.name,
        diagnosis,
        medications,
        date: new Date().toISOString().split('T')[0]
      };

      const prescriptions = window.HMS_DB.getPrescriptions() || [];
      prescriptions.unshift(newRx);
      window.HMS_DB.savePrescriptions(prescriptions);

      renderPrescriptions();

      // Clear form
      rxForm.reset();
      document.getElementById("rxId").value = generateRxId();

      const banner = document.getElementById("prescriptionBanner");
      if (banner) {
        banner.textContent = `Issued prescription ${rxId} successfully for ${patientName}!`;
        banner.classList.remove("hidden");
        setTimeout(() => banner.classList.add("hidden"), 4000);
      }

      if (window.speechSynthesis) {
        const speech = new SpeechSynthesisUtterance(`Prescription issued successfully for ${patientName}.`);
        window.speechSynthesis.speak(speech);
      }
    });
  }

  // Tabbing Logic
  const switchTab = (tabName) => {
    const tabs = ["dashboard", "schedule", "patients", "notes", "settings"];
    tabs.forEach(t => {
      const content = document.getElementById(`tabContent-${t}`);
      const btn = document.getElementById(`tabBtn-${t}`);
      
      if (content) {
        if (t === tabName) {
          content.classList.remove("hidden");
        } else {
          content.classList.add("hidden");
        }
      }
      
      if (btn) {
        if (t === tabName) {
          btn.className = "w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer bg-[#3b82f6]/40 text-white shadow-md";
        } else {
          btn.className = "w-full text-left px-4 py-3 rounded-lg text-xs font-bold font-sans flex items-center gap-3 transition-all cursor-pointer hover:bg-[#1d4ed8] text-blue-50";
        }
      }
    });
  };

  ["dashboard", "schedule", "patients", "notes", "settings"].forEach(t => {
    const btn = document.getElementById(`tabBtn-${t}`);
    if (btn) {
      btn.addEventListener("click", () => switchTab(t));
    }
  });

  // Render Schedule subtab
  const renderSchedule = () => {
    const container = document.getElementById("scheduleRoster");
    if (!container) return;
    
    container.innerHTML = "";
    const docs = window.HMS_DB.getDoctors() || [];
    const attList = window.HMS_DB.getAttendance() || [];

    docs.forEach(d => {
      const isMe = d.doctor_id === session.id;
      const attRecord = attList.find(a => a.doctor_id === d.doctor_id);
      const isAvail = attRecord ? attRecord.is_available : true;
      
      const div = document.createElement("div");
      div.className = "flex justify-between items-center border-b pb-2 text-xs font-sans";
      div.innerHTML = `
        <span class="font-bold text-slate-800">${isMe ? '⭐ ' : ''}Dr. ${d.name} (${d.specialty})</span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
          isAvail ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }">${isAvail ? 'PRESENT' : 'ABSENT'}</span>
      `;
      container.appendChild(div);
    });
  };

  // Render Patients subtab
  const renderPatients = () => {
    const container = document.getElementById("patientsListGrid");
    if (!container) return;
    
    container.innerHTML = "";
    const list = window.HMS_DB.getPatients() || [];

    list.forEach(p => {
      const div = document.createElement("div");
      div.className = "bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-sans";
      div.innerHTML = `
        <h4 class="font-bold text-slate-800 text-sm">${p.name} <span class="text-[10px] text-slate-400 font-mono">(${p.patient_id})</span></h4>
        <div class="text-slate-550 mt-1 font-semibold">Age: ${p.age} | Sex: ${p.gender} | Contact: ${p.contact}</div>
        <div class="text-slate-450 mt-1">Address: ${p.address}</div>
      `;
      container.appendChild(div);
    });
  };

  // Render Notes/VoiceLog audits subtab
  const renderNotesAudits = () => {
    const container = document.getElementById("notesAuditGrid");
    if (!container) return;
    
    container.innerHTML = "";
    const voiceLogs = window.HMS_DB.getVoiceLogs() || [];

    if (voiceLogs.length === 0) {
      container.innerHTML = `<div class="text-slate-400 py-6 text-xs italic text-center">No audio dictation logs ingested.</div>`;
      return;
    }

    voiceLogs.forEach(l => {
      const div = document.createElement("div");
      div.className = "bg-[#f8fafc] border border-slate-150 p-3.5 rounded-xl text-xs leading-relaxed font-sans";
      div.innerHTML = `
        <div class="text-[10px] font-bold text-slate-400 font-mono mb-1">${new Date(l.timestamp).toLocaleString()}</div>
        <p class="italic text-slate-700 font-semibold">"Voice input: ${l.raw_text}"</p>
        <div class="text-blue-800 font-bold mt-1 uppercase text-[10px] font-mono">Intent: ${l.intent} | Synthesis: ${l.response_text}</div>
      `;
      container.appendChild(div);
    });
  };

  // Render Settings Database Inspector Grid
  let activeLedgerTable = "patient";
  const renderSettingsDB = () => {
    const container = document.getElementById("dbInspectorContainer");
    if (!container) return;

    const patients = window.HMS_DB.getPatients() || [];
    const appointments = window.HMS_DB.getAppointments() || [];
    const attList = window.HMS_DB.getAttendance() || [];
    const voiceLogs = window.HMS_DB.getVoiceLogs() || [];

    let tableRows = "";
    if (activeLedgerTable === "patient") {
      tableRows = `
        <table class="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 font-mono uppercase bg-slate-950/60 text-3xs tracking-wider">
              <th class="py-3 px-4">patient_id</th>
              <th class="py-3 px-4">name</th>
              <th class="py-3 px-4">age</th>
              <th class="py-3 px-4">gender</th>
              <th class="py-3 px-4">contact</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            ${patients.map(p => `
              <tr>
                <td class="py-2.5 px-4 font-mono text-indigo-400 font-bold">${p.patient_id}</td>
                <td class="py-2.5 px-4 font-bold text-white">${p.name}</td>
                <td class="py-2.5 px-4">${p.age}</td>
                <td class="py-2.5 px-4">${p.gender}</td>
                <td class="py-2.5 px-4 font-mono">${p.contact}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (activeLedgerTable === "appointment") {
      tableRows = `
        <table class="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 font-mono uppercase bg-slate-950/60 text-3xs tracking-wider">
              <th class="py-3 px-4">appt_id</th>
              <th class="py-3 px-4">patient_name</th>
              <th class="py-3 px-4">doctor_name</th>
              <th class="py-3 px-4">date</th>
              <th class="py-3 px-4">status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            ${appointments.map(a => `
              <tr>
                <td class="py-2.5 px-4 font-mono">#${a.appointment_id}</td>
                <td class="py-2.5 px-4 font-bold text-white">${a.patient_name}</td>
                <td class="py-2.5 px-4">${a.doctor_name}</td>
                <td class="py-2.5 px-4 font-mono">${a.date}</td>
                <td class="py-2.5 px-4 uppercase font-bold text-indigo-400">${a.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else {
      tableRows = `
        <div class="text-slate-400 font-mono italic p-6">Roster and audio logs visible under schedule and dictation tabs.</div>
      `;
    }

    container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full font-sans text-slate-200">
        <div class="bg-slate-950/60 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <i data-lucide="database" class="h-5 w-5 text-indigo-400"></i>
            <div>
              <h3 class="font-semibold text-white text-sm tracking-wide uppercase">Active Relational Ledger State</h3>
              <p class="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Live LocalStorage Database Grid</p>
            </div>
          </div>
          <button id="resetLedgerBtn" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all cursor-pointer">
            Reset DB Ledger
          </button>
        </div>
        
        <div class="flex border-b border-slate-800 bg-slate-950/30">
          <button id="tabTable-patient" class="flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 uppercase tracking-wider ${activeLedgerTable === "patient" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500"}">
            Patients (${patients.length})
          </button>
          <button id="tabTable-appointment" class="flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 uppercase tracking-wider ${activeLedgerTable === "appointment" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500"}">
            Appointments (${appointments.length})
          </button>
        </div>

        <div class="p-5 bg-slate-900/40">
          ${tableRows}
        </div>
      </div>
    `;

    document.getElementById("resetLedgerBtn").addEventListener("click", () => {
      window.HMS_DB.resetDB();
      alert("Database reset completed.");
      renderSettingsDB();
    });

    document.getElementById("tabTable-patient").addEventListener("click", () => {
      activeLedgerTable = "patient";
      renderSettingsDB();
    });

    document.getElementById("tabTable-appointment").addEventListener("click", () => {
      activeLedgerTable = "appointment";
      renderSettingsDB();
    });

    lucide.createIcons();
  };

  // Global callback for database mutations reflection
  window.onDatabaseChange = () => {
    renderDashboardData();
    renderSchedule();
    renderPatients();
    renderNotesAudits();
    renderPrescriptions();
    renderSettingsDB();
  };

  // Initial dashboard load
  renderAvailStatus();
  renderDashboardData();
  renderSchedule();
  renderPatients();
  renderNotesAudits();
  renderPrescriptions();
  renderSettingsDB();

  // Listen storage mutations
  window.addEventListener("storage", () => {
    renderAvailStatus();
    renderDashboardData();
    renderSchedule();
    renderPatients();
    renderNotesAudits();
    renderPrescriptions();
    renderSettingsDB();
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    window.HMS_DB.clearSession();
    window.location.href = "index.html";
  });

  lucide.createIcons();
});
