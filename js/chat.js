/* ==========================================================
   JOB MESSAGES  (TR.chat)
   Load after js/api.js and js/ui.js on pages that show jobs.

   Any button with data-chat="<repair id>" opens that job's
   messages, and gets a red unread count when there are new ones:

     <button class="tr-btn tr-btn-ghost tr-chat-btn" data-chat="ID"
             data-chat-title="REQ-1234 · iPhone 12">
       <i class="fas fa-comments"></i> Messages
     </button>

   After re-rendering a list, call TR.chat.refreshBadges().
========================================================== */
(function () {
  const TR = window.TR;
  const API = window.TechRiderAPI;
  const esc = TR.esc;

  let unread = {};
  let current = null; // { id, backdrop, list, form, lastCount }

  /* ---------------------------------------------------- unread badges */
  function paintBadges() {
    document.querySelectorAll("[data-chat]").forEach((btn) => {
      const n = unread[btn.dataset.chat] || 0;
      let badge = btn.querySelector(".tr-chat-count");
      if (!n) { if (badge) badge.remove(); return; }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "tr-chat-count";
        btn.appendChild(badge);
      }
      badge.textContent = n > 9 ? "9+" : n;
      badge.setAttribute("aria-label", `${n} unread`);
    });
  }

  let badgeTimer = null;
  async function refreshBadges() {
    paintBadges();
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(async () => {
      if (!document.querySelector("[data-chat]")) return;
      try {
        unread = (await API.get("/messages/unread")).byRequest || {};
        paintBadges();
      } catch (e) { /* keep old counts */ }
    }, 150);
  }

  /* ---------------------------------------------------- the panel */
  function renderMessages(data) {
    const list = current.list;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (!data.messages.length) {
      list.innerHTML = TR.empty({
        icon: "fa-comments",
        title: "No messages yet",
        text: "Ask TechRider support anything about this repair. We pass what is needed on to your technician and rider, so every price is agreed through TechRider."
      });
    } else {
      list.innerHTML = data.messages.map((m) => `
        <div class="tr-msg ${m.mine ? "mine" : ""} ${m.senderRole === "admin" ? "admin" : ""}">
          <div class="tr-msg-who">${m.mine ? "You" : `${esc(m.senderName)} · ${esc(m.senderLabel)}`} · ${esc(TR.ago(m.createdAt))}</div>
          <div class="tr-msg-body">${esc(m.body)}</div>
        </div>`).join("");
    }
    if (nearBottom || data.messages.length !== current.lastCount) list.scrollTop = list.scrollHeight;
    current.lastCount = data.messages.length;

    const form = current.form;
    form.hidden = !data.canPost;
    current.backdrop.querySelector(".tr-chat-closed").hidden = data.canPost;
  }

  async function load() {
    if (!current) return;
    const id = current.id;
    try {
      const data = await API.get(`/requests/${encodeURIComponent(id)}/messages`);
      if (!current || current.id !== id) return;
      current.backdrop.querySelector(".tr-chat-sub").textContent = `${data.code} · ${data.device}`;
      renderMessages(data);
      unread[id] = 0;
      paintBadges();
    } catch (err) {
      if (current) current.list.innerHTML = TR.empty({ icon: "fa-triangle-exclamation", title: "Couldn't load messages", text: err.message });
    }
  }

  function close() {
    if (!current) return;
    document.removeEventListener("keydown", onKey, true);
    current.backdrop.remove();
    if (current.opener && current.opener.focus) current.opener.focus();
    current = null;
    document.body.style.overflow = "";
    refreshBadges();
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  function open(id, title, opener) {
    if (current) close();
    const backdrop = document.createElement("div");
    backdrop.className = "tr-chat-backdrop";
    backdrop.innerHTML = `
      <section class="tr-chat" role="dialog" aria-modal="true" aria-labelledby="tr-chat-title">
        <header class="tr-chat-head">
          <i class="fas fa-comments" aria-hidden="true"></i>
          <h2 id="tr-chat-title">TechRider support<small class="tr-chat-sub">${esc(title || "")}</small></h2>
          <button type="button" class="tr-chat-close" aria-label="Close messages"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="tr-chat-note"><i class="fas fa-shield-halved"></i> Only pay through TechRider. If anyone asks you to pay them directly, tell us here.</div>
        <div class="tr-chat-list" aria-live="polite">${TR.skeleton(2)}</div>
        <p class="tr-chat-closed tr-chat-note" hidden>This job is closed, so new messages are off. Raise a dispute if something went wrong.</p>
        <form class="tr-chat-form">
          <label for="tr-chat-input" class="tr-visually-hidden">Message</label>
          <textarea id="tr-chat-input" maxlength="1000" placeholder="Write a message…" required></textarea>
          <button type="submit" aria-label="Send"><i class="fas fa-paper-plane"></i></button>
        </form>
      </section>`;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    current = {
      id, backdrop, opener, lastCount: -1,
      list: backdrop.querySelector(".tr-chat-list"),
      form: backdrop.querySelector(".tr-chat-form")
    };
    const input = backdrop.querySelector("textarea");
    const sendBtn = backdrop.querySelector('.tr-chat-form button');

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest(".tr-chat-close")) close();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); current.form.requestSubmit(); }
    });
    input.addEventListener("input", () => {
      input.style.height = "44px";
      input.style.height = Math.min(120, input.scrollHeight) + "px";
    });
    current.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = input.value.trim();
      if (!body) return;
      sendBtn.disabled = true;
      try {
        await API.post(`/requests/${encodeURIComponent(id)}/messages`, { body });
        input.value = "";
        input.style.height = "44px";
        await load();
      } catch (err) {
        TR.toast(err.message, "error");
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    });
    document.addEventListener("keydown", onKey, true);
    setTimeout(() => input.focus(), 50);
    load();
  }

  /* ---------------------------------------------------- wiring */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chat]");
    if (!btn) return;
    e.preventDefault();
    open(btn.dataset.chat, btn.dataset.chatTitle, btn);
  });

  API.onMessage((detail) => {
    if (current && detail.request === current.id) load();
    else refreshBadges();
  });

  // if live updates are off, check every 30 seconds while the panel is open
  setInterval(() => { if (current && !document.hidden) load(); }, 30000);

  API.ready.then((user) => { if (user) refreshBadges(); });

  TR.chat = { open, close, refreshBadges };
})();
