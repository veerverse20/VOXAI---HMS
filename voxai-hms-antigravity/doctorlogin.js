// Root copy of doctorlogin.js for compatibility with legacy paths
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.querySelector("input[type='email']");
  const passwordInput = document.querySelector("input[type='password']");

  let errorBanner = document.querySelector(".error-banner");
  if (!errorBanner) {
    errorBanner = document.createElement("div");
    errorBanner.className = "error-banner hidden";
    form.parentNode.insertBefore(errorBanner, form);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBanner.classList.add("hidden");

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email === "doctor@voxai.com" && password === "Doctor") {
      window.HMS_DB.setSession("doctor", email, "Dr. Anand Varma", "DOC102");
      window.location.href = "doctor-dashboard.html";
    } else {
      errorBanner.innerHTML = `
        <span class="font-bold">❌ Error:</span>
        <span>Invalid credentials. Access Denied.</span>
      `;
      errorBanner.classList.remove("hidden");

      if (window.speechSynthesis) {
        const speech = new SpeechSynthesisUtterance("Access denied. Invalid credentials.");
        window.speechSynthesis.speak(speech);
      }
    }
  });
});
