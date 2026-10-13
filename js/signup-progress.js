/* ==========================================================
   SIGN-UP PAGE EXTRAS (customer, technician and rider)
   Loaded after each page's own script. Only adds feedback:
   - progress bar ("60% done") and a tick on each finished section
   - upload boxes show the chosen file
   - password strength for customers (technician/rider pages have their own)
   - the eye buttons work from the keyboard
   The page's own script still validates and submits the form.
========================================================== */
(function () {
  const form = document.getElementById("signupForm");
  if (!form) return;

  const required = () => [...form.querySelectorAll("input[required], select[required]")];
  const filled = (el) => (el.type === "file" ? el.files && el.files.length > 0 : String(el.value).trim() !== "");

  const fill = document.getElementById("formProgressFill");
  const text = document.getElementById("formProgressText");

  function update() {
    const all = required();
    const done = all.filter(filled).length;
    const pct = all.length ? Math.round((done / all.length) * 100) : 0;
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = pct === 100 ? "All set, ready to submit" : `${pct}% done`;
    form.closest(".signup-card")?.classList.toggle("complete", pct === 100);

    form.querySelectorAll("[data-section]").forEach((section) => {
      const fields = [...section.querySelectorAll("input[required], select[required]")];
      section.classList.toggle("done", fields.length > 0 && fields.every(filled));
    });

    form.querySelectorAll(".upload-box").forEach((box) => {
      const input = box.querySelector("input[type=file]");
      const has = input && input.files && input.files.length > 0;
      box.classList.toggle("has-file", has);
      const strong = box.querySelector(".upload-text strong");
      if (strong) strong.textContent = has ? input.files[0].name : "Choose a file";
    });
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  // the page script clears the form after a successful submit / when coming back
  form.addEventListener("reset", () => setTimeout(update, 0));
  window.addEventListener("pageshow", () => setTimeout(update, 0));
  update();

  /* customers: strength hint under the password */
  const meter = document.getElementById("passwordStrengthMeter");
  const pwd = document.getElementById("password");
  if (meter && pwd) {
    pwd.addEventListener("input", () => {
      const v = pwd.value;
      const score = [v.length >= 8, /[A-Z]/.test(v), /[0-9]/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
      meter.className = "strength " + (v ? ["weak", "weak", "medium", "medium", "strong"][score] : "");
      meter.textContent = v ? ["Too weak", "Too weak", "Getting there", "Almost", "Strong password"][score] : "";
    });
  }

  /* eye icons are <i> elements: let Enter and Space press them too */
  form.querySelectorAll(".toggle-password").forEach((eye) => {
    eye.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); eye.click(); }
    });
    eye.addEventListener("click", () => {
      const showing = eye.classList.contains("fa-eye-slash");
      eye.setAttribute("aria-label", showing ? "Hide password" : "Show password");
    });
  });
})();
