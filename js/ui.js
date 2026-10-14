/* ==========================================================
   TECHRIDER UI KIT  (window.TR)
   Loaded on every page, right after js/api.js.

   TR.toast(message, type?)      small message in the corner instead of alert()
                                 type: success | error | warning | info
                                 (guessed from the wording when left out)
   await TR.confirm({...})       styled yes/no box instead of confirm()  -> true/false
   await TR.prompt({...})        styled input box instead of prompt()    -> text or null
   TR.skeleton(count)            loading placeholder HTML
   TR.empty({...})               empty-state HTML
   TR.stars(rating, count?)      star rating HTML
   TR.setAvatar(el, user)        shows the user's photo in an initials circle
========================================================== */
(function () {
  const TR = (window.TR = window.TR || {});

  const esc = (value) => String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  TR.esc = esc;

  const onReady = (fn) => (document.body ? fn() : document.addEventListener("DOMContentLoaded", fn));

  /* ------------------------------------------------------------ toasts */
  const ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-exclamation",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info"
  };

  function guessType(message) {
    const m = String(message).toLowerCase();
    if (/could not|couldn't|failed|error|not found|unable|invalid|went wrong|denied|expired|too many/.test(m)) return "error";
    if (/^please|must|required|choose|select|enter |give a|write a|do not match|at least|between|only /.test(m)) return "warning";
    if (/success|saved|sent|submitted|created|accepted|completed|done|updated|assigned|approved|well done|thank/.test(m)) return "success";
    return "info";
  }

  // Toasts shown just before the page changes are carried to the next page
  const CARRY_KEY = "tr_toast_carry";
  const recent = [];

  function region() {
    let box = document.getElementById("tr-toasts");
    if (!box) {
      box = document.createElement("div");
      box.id = "tr-toasts";
      box.className = "tr-toasts";
      box.setAttribute("aria-live", "polite");
      box.setAttribute("role", "status");
      document.body.appendChild(box);
    }
    return box;
  }

  function showToast(message, type) {
    const el = document.createElement("div");
    el.className = `tr-toast ${type}`;
    el.innerHTML =
      `<i class="fas ${ICONS[type]} tr-toast-icon" aria-hidden="true"></i>` +
      `<div class="tr-toast-text">${esc(message)}</div>` +
      `<button type="button" class="tr-toast-close" aria-label="Dismiss">&times;</button>`;
    const box = region();
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();

    const life = Math.min(12000, (type === "error" ? 6500 : 4200) + String(message).length * 30);
    let timer = setTimeout(close, life);
    function close() {
      clearTimeout(timer);
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 200);
    }
    el.querySelector("button").addEventListener("click", close);
    el.addEventListener("mouseenter", () => clearTimeout(timer));
    el.addEventListener("mouseleave", () => { timer = setTimeout(close, 2500); });
  }

  TR.toast = function toast(message, type) {
    if (message === undefined || message === null || message === "") return;
    message = String(message);
    type = ICONS[type] ? type : guessType(message);
    recent.push({ message, type, at: Date.now() });
    if (recent.length > 5) recent.shift();
    onReady(() => showToast(message, type));
  };
  TR.success = (m) => TR.toast(m, "success");
  TR.error = (m) => TR.toast(m, "error");

  window.addEventListener("pagehide", () => {
    const carry = recent.filter((t) => Date.now() - t.at < 2500);
    try {
      if (carry.length) sessionStorage.setItem(CARRY_KEY, JSON.stringify(carry));
    } catch (e) { /* storage blocked */ }
  });
  try {
    const carried = JSON.parse(sessionStorage.getItem(CARRY_KEY) || "[]");
    sessionStorage.removeItem(CARRY_KEY);
    carried.forEach((t) => onReady(() => showToast(t.message, t.type)));
  } catch (e) { /* nothing carried */ }

  /* ------------------------------------------------------------ dialogs */
  let openDialog = null;

  function fieldHtml(f, i) {
    const id = `tr-dialog-input-${i}`;
    const common = `id="${id}" name="${esc(f.name || i)}" placeholder="${esc(f.placeholder || "")}"`;
    return (f.label ? `<label for="${id}">${esc(f.label)}</label>` : "") +
      (f.multiline
        ? `<textarea ${common} maxlength="${f.maxLength || 2000}">${esc(f.value || "")}</textarea>`
        : `<input ${common} type="${f.type || "text"}" value="${esc(f.value || "")}" maxlength="${f.maxLength || 300}"${f.inputmode ? ` inputmode="${esc(f.inputmode)}"` : ""} autocomplete="off">`);
  }

  /*
    kind: confirm -> true/false, prompt -> text/null, form -> { name: value }/null
    fields (form): [{ name, label, value, placeholder, multiline, required, type, maxLength }]
  */
  function dialog(opts) {
    const { kind, title, message, confirmText, cancelText, danger, icon } = opts;
    const fields = kind === "prompt" ? [{ ...opts, name: "value" }] : kind === "form" ? opts.fields || [] : [];
    return new Promise((resolve) => {
      if (openDialog) openDialog.finish(null); // only one at a time
      const lastFocus = document.activeElement;
      const backdrop = document.createElement("div");
      backdrop.className = "tr-dialog-backdrop";
      const titleId = "tr-dialog-title-" + Date.now();
      const asks = kind !== "confirm";
      backdrop.innerHTML = `
        <div class="tr-dialog ${danger ? "danger" : ""}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          <h2 id="${titleId}"><i class="fas ${icon || (danger ? "fa-triangle-exclamation" : asks ? "fa-pen" : "fa-circle-question")}" aria-hidden="true"></i>${esc(title || (asks ? "Add a note" : "Are you sure?"))}</h2>
          ${message ? `<p>${esc(message)}</p>` : ""}
          ${fields.map(fieldHtml).join("")}
          ${asks ? `<div class="tr-dialog-error" aria-live="polite"></div>` : ""}
          <div class="tr-dialog-actions">
            <button type="button" class="tr-btn tr-btn-ghost" data-act="cancel">${esc(cancelText || "Cancel")}</button>
            <button type="button" class="tr-btn ${danger ? "tr-btn-danger" : "tr-btn-primary"}" data-act="ok">${esc(confirmText || (asks ? "Save" : "Confirm"))}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      const inputs = [...backdrop.querySelectorAll("input, textarea")];
      const errorBox = backdrop.querySelector(".tr-dialog-error");
      const okBtn = backdrop.querySelector('[data-act="ok"]');

      const state = {
        finish(result) {
          document.removeEventListener("keydown", onKey, true);
          backdrop.remove();
          openDialog = null;
          if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { /* gone */ }
          resolve(result);
        }
      };
      openDialog = state;

      function ok() {
        if (kind === "confirm") return state.finish(true);
        const values = {};
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          const text = inputs[i].value.trim();
          if (f.required && !text) {
            errorBox.textContent = typeof f.required === "string" ? f.required : `Please fill in ${f.label ? f.label.toLowerCase() : "this"}.`;
            inputs[i].focus();
            return;
          }
          values[f.name || i] = text;
        }
        state.finish(kind === "prompt" ? values.value : values);
      }
      const cancel = () => state.finish(kind === "confirm" ? false : null);

      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); cancel(); }
        else if (e.key === "Enter" && !e.shiftKey && !(document.activeElement && document.activeElement.tagName === "TEXTAREA")) {
          if (document.activeElement && document.activeElement.dataset.act === "cancel") return;
          e.preventDefault(); ok();
        } else if (e.key === "Tab") {
          // keep focus inside the box
          const items = [...backdrop.querySelectorAll("button, input, textarea")];
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener("keydown", onKey, true);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cancel();
        const act = e.target.closest("[data-act]");
        if (act) act.dataset.act === "ok" ? ok() : cancel();
      });
      setTimeout(() => (inputs[0] || okBtn).focus(), 30);
    });
  }

  /* TR.confirm("Delete this?") or TR.confirm({ title, message, confirmText, danger }) */
  TR.confirm = (opts) => dialog({ ...(typeof opts === "string" ? { message: opts } : opts), kind: "confirm" });
  /* TR.prompt({ title, message, label, placeholder, value, multiline, required }) -> text or null */
  TR.prompt = (opts) => dialog({ ...(typeof opts === "string" ? { message: opts } : opts), kind: "prompt" });
  /* TR.form({ title, message, fields: [...] }) -> { name: value } or null */
  TR.form = (opts) => dialog({ ...opts, kind: "form" });

  /* Admin: suspend (asks for a reason) or reactivate (asks to confirm).
     Returns { reason } or null when cancelled. */
  TR.suspendDialog = async (name, suspended, roleLabel) => {
    if (suspended) {
      const ok = await TR.confirm({
        title: `Reactivate ${name}?`,
        message: `This ${roleLabel} will be able to log in and use TechRider again.`,
        confirmText: "Reactivate",
        icon: "fa-user-check"
      });
      return ok ? { reason: "" } : null;
    }
    const reason = await TR.prompt({
      title: `Suspend ${name}?`,
      message: `This ${roleLabel} won't be able to use their dashboard until you reactivate them.`,
      label: `Reason (shown to the ${roleLabel})`,
      placeholder: "e.g. Several customer complaints about late deliveries",
      multiline: true,
      required: "Please give a reason for the suspension.",
      maxLength: 500,
      confirmText: "Suspend",
      danger: true
    });
    return reason === null ? null : { reason };
  };

  /* ------------------------------------------------------------ loading + empty */
  TR.skeleton = (count = 3) =>
    `<div class="tr-skeleton-list" aria-busy="true" aria-label="Loading">` +
    Array.from({ length: count }, () =>
      `<div class="tr-skeleton-card"><span class="tr-skel"></span><span class="tr-skel w80"></span><span class="tr-skel w60"></span><span class="tr-skel w30"></span></div>`
    ).join("") + `</div>`;

  /* TR.empty({ icon: "fa-box-open", title, text, action: { label, href } }) */
  TR.empty = ({ icon = "fa-inbox", title = "Nothing here yet", text = "", action } = {}) =>
    `<div class="tr-empty">
      <div class="tr-empty-icon"><i class="fas ${esc(icon)}" aria-hidden="true"></i></div>
      <h3>${esc(title)}</h3>
      ${text ? `<p>${esc(text)}</p>` : ""}
      ${action ? `<a class="tr-btn tr-btn-primary" href="${esc(action.href)}">${action.icon ? `<i class="fas ${esc(action.icon)}"></i>` : ""}${esc(action.label)}</a>` : ""}
    </div>`;

  /* ------------------------------------------------------------ stars */
  TR.stars = (rating, count) => {
    if (!rating) return `<span class="tr-rating-text">No ratings yet</span>`;
    const full = Math.round(rating * 2) / 2;
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const cls = full >= i ? "fas fa-star" : full >= i - 0.5 ? "fas fa-star-half-stroke" : "far fa-star muted";
      html += `<i class="${cls}" aria-hidden="true"></i>`;
    }
    return `<span class="tr-stars" aria-label="Rated ${rating} out of 5">${html}</span>` +
      ` <span class="tr-rating-text">${Number(rating).toFixed(1)}${count !== undefined ? ` (${count} review${count === 1 ? "" : "s"})` : ""}</span>`;
  };

  /* ------------------------------------------------------------ avatars */
  /* Put the user's photo inside an initials circle; keeps the letter if there is no photo
     or it fails to load. */
  TR.setAvatar = (el, user) => {
    if (!el || !user) return;
    const name = user.fullName || user.name || "";
    const letter = (name.trim()[0] || "?").toUpperCase();
    const url = user.profileImageUrl || user.profileImage;
    if (!url) {
      el.textContent = letter;
      el.classList.remove("tr-has-photo");
      return;
    }
    const img = new Image();
    img.className = "tr-avatar-img";
    img.alt = name ? `${name}'s photo` : "Profile photo";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      el.textContent = "";
      el.appendChild(img);
      el.classList.add("tr-has-photo");
    };
    img.onerror = () => { el.textContent = letter; };
    img.src = url;
  };

  /* ------------------------------------------------------------ test-payments banner */
  /* Shows "Test mode: no real money" above payment areas while Paystack test keys are used */
  let paymentMode = null;
  /* ------------------------------------------------------------ rider pickup check
     The person handing a device to a rider (customer at pickup, technician at
     return) types the code from the rider's app. Pass a repair from the API:
       container.innerHTML += TR.pickupCheck(repair)
     A right code marks the device collected and fires "tr:refresh". */
  TR.pickupCheck = (repair) => {
    const r = repair && repair.rider;
    const c = r && r.pickupCheck;
    if (!c || !c.needed) return "";
    const device = `${repair.brand || ""} ${repair.model || ""}`.trim() || "device";
    if (c.locked) {
      return `<div class="tr-pickup-check locked" role="alert"><i class="fas fa-lock" aria-hidden="true"></i>
        <div><strong>Don't hand over the ${esc(device)}</strong><p>The wrong rider code was entered too many times. Message TechRider support before giving the device to anyone.</p></div></div>`;
    }
    const id = `tr-pc-${esc(repair.id)}`;
    return `<form class="tr-pickup-check" data-pickup-form="${esc(repair.id)}" novalidate>
      <div class="tr-pc-text">
        <strong><i class="fas fa-shield-halved" aria-hidden="true"></i> Check the rider before handing over</strong>
        <p>Ask ${esc(r.fullName || "the rider")} for the 4-digit code in their TechRider app and enter it here. Only hand over the ${esc(device)} if it matches.</p>
      </div>
      <div class="tr-pc-row">
        <label for="${id}" class="tr-visually-hidden">Rider's code</label>
        <input id="${id}" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" placeholder="0000" aria-describedby="${id}-err">
        <button type="submit" class="tr-btn tr-btn-primary"><i class="fas fa-check" aria-hidden="true"></i> Confirm rider</button>
      </div>
      <div class="tr-pc-error" id="${id}-err" aria-live="polite"></div>
    </form>`;
  };

  document.addEventListener("input", (e) => {
    if (e.target.matches && e.target.matches("[data-pickup-form] input")) e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
  });
  document.addEventListener("submit", async (e) => {
    const form = e.target.closest && e.target.closest("[data-pickup-form]");
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector("input");
    const btn = form.querySelector("button");
    const err = form.querySelector(".tr-pc-error");
    const code = input.value.replace(/\D/g, "");
    if (code.length !== 4) { err.textContent = "Enter the 4-digit code from the rider's app."; input.focus(); return; }
    btn.disabled = true;
    err.textContent = "";
    try {
      const res = await window.TechRiderAPI.post(`/requests/${encodeURIComponent(form.dataset.pickupForm)}/confirm-pickup`, { code });
      TR.toast(res.message || "Rider confirmed. You can hand over the device.", "success");
      form.classList.add("ok");
      form.innerHTML = `<div class="tr-pc-text"><strong><i class="fas fa-circle-check" aria-hidden="true"></i> Rider confirmed</strong><p>${esc(res.message || "You can hand over the device.")}</p></div>`;
      window.dispatchEvent(new CustomEvent("tr:refresh"));
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      input.select();
    }
  });

  TR.paymentsBanner = async (container, where = "afterbegin") => {
    if (!container || !window.TechRiderAPI) return;
    try {
      if (!paymentMode) paymentMode = window.TechRiderAPI.health().then((h) => h.payments || "test");
      if ((await paymentMode) === "live" || container.querySelector(".tr-test-banner")) return;
      container.insertAdjacentHTML(where,
        `<div class="tr-test-banner" role="note"><i class="fas fa-flask"></i>
          <span><strong>Test mode:</strong> no real money is charged. Use Paystack's test card to pay.</span></div>`);
    } catch (e) { /* health check failed: say nothing */ }
  };

  /* ------------------------------------------------------------ rating a repair */
  /* Opens the star rating box for a completed repair. Resolves with the updated repair, or null. */
  TR.rate = (repair) => new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "tr-dialog-backdrop";
    const starRow = (name, label) => `
      <fieldset class="tr-rate-row">
        <legend>${esc(label)}</legend>
        <div class="tr-rate-stars" data-name="${name}">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-value="${n}" aria-label="${n} star${n > 1 ? "s" : ""}"><i class="far fa-star"></i></button>`).join("")}
          <span class="tr-rate-word" aria-live="polite"></span>
        </div>
      </fieldset>`;
    const tech = repair.technician ? repair.technician.fullName : "the technician";
    const rider = repair.rider && repair.rider.deliveryType === "return" ? repair.rider.fullName : null;
    backdrop.innerHTML = `
      <div class="tr-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-rate-title">
        <h2 id="tr-rate-title"><i class="fas fa-star"></i>Rate your repair</h2>
        <p>${esc(repair.brand)} ${esc(repair.model)} · ${esc(repair.code)}</p>
        ${starRow("rating", `How was ${tech}'s repair?`)}
        ${rider ? starRow("riderRating", `And ${rider}, who brought it back? (optional)`) : ""}
        <label for="tr-rate-comment">Tell other customers about it (optional)</label>
        <textarea id="tr-rate-comment" maxlength="600" placeholder="e.g. Fixed my screen in a day and explained everything"></textarea>
        <div class="tr-dialog-error" aria-live="polite"></div>
        <div class="tr-dialog-actions">
          <button type="button" class="tr-btn tr-btn-ghost" data-act="cancel">Later</button>
          <button type="button" class="tr-btn tr-btn-primary" data-act="ok">Submit rating</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
    const values = {};
    backdrop.querySelectorAll(".tr-rate-stars").forEach((row) => {
      const paint = (n) => row.querySelectorAll("button").forEach((b) => {
        b.querySelector("i").className = Number(b.dataset.value) <= n ? "fas fa-star" : "far fa-star";
      });
      row.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        values[row.dataset.name] = Number(b.dataset.value);
        paint(values[row.dataset.name]);
        row.querySelector(".tr-rate-word").textContent = WORDS[values[row.dataset.name]];
      });
      row.addEventListener("mouseover", (e) => { const b = e.target.closest("button"); if (b) paint(Number(b.dataset.value)); });
      row.addEventListener("mouseleave", () => paint(values[row.dataset.name] || 0));
    });
    const done = (result) => { backdrop.remove(); resolve(result); };
    backdrop.addEventListener("click", async (e) => {
      if (e.target === backdrop) return done(null);
      const act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act === "cancel") return done(null);
      if (!values.rating) {
        backdrop.querySelector(".tr-dialog-error").textContent = "Please choose 1 to 5 stars for the repair.";
        return;
      }
      act.disabled = true;
      try {
        const { request } = await window.TechRiderAPI.post(`/requests/${encodeURIComponent(repair.id)}/review`, {
          rating: values.rating,
          riderRating: values.riderRating,
          comment: backdrop.querySelector("textarea").value.trim()
        });
        TR.toast("Thanks for your rating!", "success");
        done(request);
      } catch (err) {
        backdrop.querySelector(".tr-dialog-error").textContent = err.message;
        act.disabled = false;
      }
    });
    document.addEventListener("keydown", function esc(e) {
      if (!document.body.contains(backdrop)) return document.removeEventListener("keydown", esc, true);
      if (e.key === "Escape") { document.removeEventListener("keydown", esc, true); done(null); }
    }, true);
    setTimeout(() => backdrop.querySelector(".tr-rate-stars button").focus(), 30);
  });

  /* ------------------------------------------------------------ action menus */
  /* Markup:
       <div class="tr-menu">
         <button type="button" class="tr-menu-btn" aria-haspopup="menu" aria-expanded="false">Actions</button>
         <div class="tr-menu-list" role="menu" hidden> <button role="menuitem" class="tr-menu-item">…</button> … </div>
       </div>
     The list opens below the button (or above when there is no room), is
     never clipped by scrolling tables, and closes on a choice, Escape
     or a click elsewhere. */
  let openMenu = null;

  function closeMenu(focusButton) {
    if (!openMenu) return;
    const { menu, list, btn } = openMenu;
    list.hidden = true;
    list.style.cssText = "";
    btn.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
    if (focusButton) btn.focus();
    openMenu = null;
  }

  function placeMenu() {
    if (!openMenu) return;
    const { btn, list } = openMenu;
    const r = btn.getBoundingClientRect();
    list.style.position = "fixed";
    list.style.minWidth = Math.max(r.width, 190) + "px";
    const w = list.offsetWidth, h = list.offsetHeight;
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    const below = r.bottom + 6 + h <= window.innerHeight - 8;
    list.style.left = left + "px";
    list.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + "px";
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".tr-menu-btn");
    if (btn) {
      const menu = btn.closest(".tr-menu");
      const wasOpen = openMenu && openMenu.menu === menu;
      closeMenu();
      if (wasOpen) return;
      const list = menu.querySelector(".tr-menu-list");
      list.hidden = false;
      menu.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      openMenu = { menu, list, btn };
      placeMenu();
      const first = list.querySelector(".tr-menu-item:not(:disabled)");
      if (first && e.detail === 0) first.focus(); // opened from the keyboard
      return;
    }
    if (openMenu && e.target.closest(".tr-menu-item")) {
      setTimeout(() => closeMenu(), 0); // let the item's own click run first
      return;
    }
    if (openMenu && !e.target.closest(".tr-menu-list")) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (!openMenu) return;
    const items = [...openMenu.list.querySelectorAll(".tr-menu-item:not(:disabled)")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
    else if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === "Tab") closeMenu();
  });

  // keep the open list attached to its button while the page or a table scrolls
  window.addEventListener("scroll", () => placeMenu(), true);
  window.addEventListener("resize", () => closeMenu());

  /* ------------------------------------------------------------ page fade-in + scroll reveals */
  /* Every page fades in once the login check has shown it, and cards below
     the fold slide up as they scroll into view. Lists that re-render later
     (live updates) don't flash: cards already on screen just appear.
     Nothing moves when the device asks for reduced motion. The home page
     has its own animations (js/pages/index.js). */
  const REVEAL = [
    ".card", ".repair-card", ".job-card", ".tech-card", ".notification-card", ".history-card",
    ".history-item", ".faqItem", ".contactCard", ".linkCard", ".panel", ".location-card",
    ".rate-banner", ".action", ".section", ".table-container", ".tableCard", ".chart-card",
    ".stat-card", ".deliveryRow", ".tr-empty"
  ].join(",");
  const SKIP = ".sidebar, #sidebar, .tr-dialog, .tr-chat, .tr-menu-list, .tr-skeleton-list, .modal, .login-shell, .hero";

  function startMotion() {
    const root = document.documentElement;
    if (root.classList.contains("motion")) return; // home page
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    root.classList.add("tr-motion");

    const pageShownAt = Date.now();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add("tr-in");
        setTimeout(() => el.classList.remove("tr-reveal", "tr-in"), 900);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });

    function consider(el) {
      if (el.dataset.trSeen || el.closest(SKIP)) return;
      if (el.parentElement && el.parentElement.closest(REVEAL)) return; // only the outer card
      el.dataset.trSeen = "1";
      const r = el.getBoundingClientRect();
      const onScreen = r.top < window.innerHeight && r.bottom > 0;
      // late re-renders that are already visible stay still (no flicker on refresh)
      if (onScreen && Date.now() - pageShownAt > 1500) return;
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(REVEAL)) : [];
      el.style.setProperty("--tr-delay", `${Math.min(6, Math.max(0, siblings.indexOf(el))) * 60}ms`);
      el.classList.add("tr-reveal");
      io.observe(el);
    }

    const scan = (node) => {
      if (node.nodeType !== 1) return;
      if (node.matches(REVEAL)) consider(node);
      node.querySelectorAll(REVEAL).forEach(consider);
    };
    scan(document.body);
    new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach(scan)))
      .observe(document.body, { childList: true, subtree: true });
  }

  function whenShown(fn) {
    const go = () => (window.TechRiderAPI ? window.TechRiderAPI.ready : Promise.resolve()).then(() => requestAnimationFrame(fn));
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  }
  whenShown(() => {
    document.body.classList.add("tr-page-in");
    startMotion();
  });

  /* ------------------------------------------------------------ money + time */
  TR.naira = (n) => "₦" + Math.round(Number(n) || 0).toLocaleString("en-NG");
  TR.ago = (date) => {
    const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  };
})();
