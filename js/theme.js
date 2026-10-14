/* ==========================================================
   THEME: Light, Dark or Device (follow the phone/computer)
   Loaded first in <head> on every page so the right colours
   show from the first paint. The choice is saved in this browser.

   Where people change it:
     - an "Appearance" item added to every sidebar
     - <div data-theme-picker></div>   Light / Dark / Device buttons
     - <button data-theme-toggle></button>  small icon that cycles
========================================================== */
(function () {
  const KEY = "techrider_theme";
  const CHOICES = ["system", "light", "dark"];
  const LABELS = { system: "Device", light: "Light", dark: "Dark" };
  const ICONS = { system: "fa-circle-half-stroke", light: "fa-sun", dark: "fa-moon" };
  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function saved() {
    try {
      const v = localStorage.getItem(KEY);
      return CHOICES.includes(v) ? v : "system";
    } catch (e) {
      return "system";
    }
  }

  const resolve = (choice) => (choice === "system" ? (media && media.matches ? "dark" : "light") : choice);

  function apply(choice) {
    root.setAttribute("data-theme", resolve(choice));
    root.setAttribute("data-theme-choice", choice);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolve(choice) === "dark" ? "#110d18" : "#240046";
  }

  apply(saved());

  // following the device: switch when the device switches
  if (media) {
    const onChange = () => { if (saved() === "system") apply("system"); refreshUI(); };
    media.addEventListener ? media.addEventListener("change", onChange) : media.addListener(onChange);
  }

  function set(choice) {
    if (!CHOICES.includes(choice)) return;
    try { localStorage.setItem(KEY, choice); } catch (e) { /* storage blocked: applies to this page only */ }
    root.classList.add("tr-theme-anim");
    apply(choice);
    setTimeout(() => root.classList.remove("tr-theme-anim"), 350);
    refreshUI();
  }

  function next() {
    const i = CHOICES.indexOf(saved());
    const choice = CHOICES[(i + 1) % CHOICES.length];
    set(choice);
  }

  // other tabs of the site follow along
  window.addEventListener("storage", (e) => { if (e.key === KEY) { apply(saved()); refreshUI(); } });

  /* ---------------------------------------------------- controls */
  function refreshUI() {
    const choice = saved();
    document.querySelectorAll(".tr-theme-choice button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.choice === choice)));
    document.querySelectorAll(".tr-theme-link").forEach((a) => {
      a.querySelector("i").className = `fas ${ICONS[choice]}`;
      a.querySelector(".tr-theme-label").textContent = `Theme: ${LABELS[choice]}`;
      a.setAttribute("aria-label", `Theme: ${LABELS[choice]}. Click to change.`);
    });
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.innerHTML = `<i class="fas ${ICONS[choice]}" aria-hidden="true"></i>`;
      b.title = `Theme: ${LABELS[choice]} (click to change)`;
      b.setAttribute("aria-label", b.title);
    });
  }

  function picker() {
    return `<div class="tr-theme-choice" role="group" aria-label="Theme">` +
      CHOICES.map((c) => `<button type="button" data-choice="${c}" aria-pressed="false"><i class="fas ${ICONS[c]}" aria-hidden="true"></i> ${LABELS[c]}</button>`).join("") +
      `</div>`;
  }

  function build() {
    document.querySelectorAll("[data-theme-picker]").forEach((el) => {
      const into = el.dataset.themeInto && document.querySelector(el.dataset.themeInto);
      if (into && el.parentElement !== into) into.appendChild(el);
      el.innerHTML = el.hasAttribute("data-theme-card")
        ? `<div class="tr-theme-card"><div><h3><i class="fas fa-palette"></i> Appearance</h3><p>Choose light or dark, or let TechRider follow your device.</p></div>${picker()}</div>`
        : picker();
    });

    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.classList.add("tr-theme-toggle");
      b.type = "button";
      b.addEventListener("click", next);
    });

    // an "Appearance" item in each sidebar, just above Logout
    document.querySelectorAll(".sidebar .nav, #sidebar .nav").forEach((nav) => {
      if (nav.querySelector(".tr-theme-link")) return;
      const link = document.createElement("a");
      link.className = "tr-theme-link";
      link.setAttribute("role", "button");
      link.tabIndex = 0;
      link.innerHTML = `<i class="fas" aria-hidden="true"></i><span class="text tr-theme-label"></span>`;
      link.addEventListener("click", (e) => { e.preventDefault(); next(); });
      link.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } });
      const logout = [...nav.querySelectorAll("a")].find((a) => /login/.test(a.getAttribute("href") || "") || /logout/i.test(a.textContent));
      nav.insertBefore(link, logout || null);
    });

    document.addEventListener("click", (e) => {
      const b = e.target.closest(".tr-theme-choice button");
      if (b) set(b.dataset.choice);
    });

    refreshUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();

  window.TRTheme = { get: saved, set, next, resolved: () => resolve(saved()) };
})();
