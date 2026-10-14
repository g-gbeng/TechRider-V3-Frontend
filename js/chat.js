/* ==========================================================
   JOB MESSAGES  (TR.chat)
   Load after js/api.js and js/ui.js on pages that show jobs.

   Each customer, technician and rider has a private thread with
   TechRider about a job. They never see each other's messages.

   Any button with data-chat="<repair id>" opens that job's
   messages, and gets a red unread count when there are new ones:

     <button class="tr-btn tr-btn-ghost tr-chat-btn" data-chat="ID"
             data-chat-title="REQ-1234 · iPhone 12">
       <i class="fas fa-comments"></i> Messages
     </button>

   Admins see a tab for every person on the job. Add
   data-chat-with="<user id>" to open on one person's thread.

   After re-rendering a list, call TR.chat.refreshBadges().
========================================================== */
(function () {
  const TR = window.TR;
  const API = window.TechRiderAPI;
  const esc = TR.esc;

  let unread = {};
  let unreadThreads = {};
  let role = null;
  let current = null; // { id, with, threads, backdrop, list, form, lastCount }

  const isAdmin = () => role === "admin";

  /* ---------------------------------------------------- unread badges */
  function countFor(btn) {
    const id = btn.dataset.chat;
    if (isAdmin() && btn.dataset.chatWith) return unreadThreads[`${id}:${btn.dataset.chatWith}`] || 0;
    return unread[id] || 0;
  }

  function paintBadges() {
    document.querySelectorAll("[data-chat]").forEach((btn) => {
      const n = countFor(btn);
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
        const data = await API.get("/messages/unread");
        unread = data.byRequest || {};
        unreadThreads = data.byThread || {};
        paintBadges();
      } catch (e) { /* keep old counts */ }
    }, 150);
  }

  /* ---------------------------------------------------- text per role */
  function emptyText() {
    if (isAdmin()) {
      const t = current && current.threads && current.threads.find((x) => x.id === current.with);
      return t ? `Nothing yet between TechRider and ${t.name} (${t.roleLabel.toLowerCase()}). Only they and TechRider admins see this thread.` : "No messages yet.";
    }
    if (role === "customer") {
      return "Ask TechRider support anything about this repair. We pass what is needed on to your technician and rider, so every price is agreed through TechRider.";
    }
    return "Ask TechRider support anything about this job. Customers can't see this chat, so send anything for them through us.";
  }

  function noteText() {
    if (isAdmin()) return "Each person has their own thread. Customers, technicians and riders never see each other's messages.";
    if (role === "customer") return "Only pay through TechRider. If anyone asks you to pay them directly, tell us here.";
    return "This chat is only between you and TechRider. Never ask a customer for payment or contact outside the app.";
  }

  /* ---------------------------------------------------- the panel */
  function renderTabs() {
    const bar = current.backdrop.querySelector(".tr-chat-tabs");
    if (!isAdmin() || !current.threads) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = current.threads.map((t) => `
      <button type="button" role="tab" class="tr-chat-tab ${t.id === current.with ? "active" : ""}" data-with="${esc(t.id)}" aria-selected="${t.id === current.with}">
        <span class="tr-chat-tab-role">${esc(t.roleLabel)}</span>
        <span class="tr-chat-tab-name">${esc(t.name)}</span>
        ${t.unread && t.id !== current.with ? `<span class="tr-chat-count">${t.unread > 9 ? "9+" : t.unread}</span>` : ""}
      </button>`).join("");
  }

  function renderMessages(data) {
    const list = current.list;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (!data.messages.length) {
      list.innerHTML = TR.empty({ icon: "fa-comments", title: "No messages yet", text: emptyText() });
    } else {
      list.innerHTML = data.messages.map((m) => `
        <div class="tr-msg ${m.mine ? "mine" : ""} ${m.senderRole === "admin" ? "admin" : ""}">
          <div class="tr-msg-who">${m.mine ? "You" : `${esc(m.senderName)} · ${esc(m.senderLabel)}`} · ${esc(TR.ago(m.createdAt))}</div>
          <div class="tr-msg-body">${esc(m.body)}</div>
        </div>`).join("");
    }
    if (nearBottom || data.messages.length !== current.lastCount) list.scrollTop = list.scrollHeight;
    current.lastCount = data.messages.length;

    current.form.hidden = !data.canPost;
    current.backdrop.querySelector(".tr-chat-closed").hidden = data.canPost;
    if (isAdmin() && data.with) {
      current.backdrop.querySelector("textarea").placeholder = `Message ${data.with.name || "them"} (${(data.with.roleLabel || "").toLowerCase()})…`;
    }
  }

  async function loadThreads() {
    if (!isAdmin() || !current) return;
    const id = current.id;
    try {
      const data = await API.get(`/requests/${encodeURIComponent(id)}/chats`);
      if (!current || current.id !== id) return;
      current.threads = data.threads;
      if (!current.with || !data.threads.some((t) => t.id === current.with)) {
        // open on the first thread with unread messages, else the customer's
        current.with = (data.threads.find((t) => t.unread) || data.threads[0] || {}).id || null;
      }
      renderTabs();
    } catch (err) { /* tabs stay as they were */ }
  }

  const query = () => (isAdmin() && current.with ? `?with=${encodeURIComponent(current.with)}` : "");

  async function load() {
    if (!current) return;
    const id = current.id;
    const who = current.with;
    try {
      const data = await API.get(`/requests/${encodeURIComponent(id)}/messages${query()}`);
      if (!current || current.id !== id || current.with !== who) return;
      current.backdrop.querySelector(".tr-chat-sub").textContent = `${data.code} · ${data.device}`;
      renderMessages(data);
      if (isAdmin()) {
        unreadThreads[`${id}:${who}`] = 0;
        const t = current.threads && current.threads.find((x) => x.id === who);
        if (t) t.unread = 0;
        renderTabs();
      } else {
        unread[id] = 0;
      }
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

  async function open(id, title, opener, withId) {
    if (current) close();
    const backdrop = document.createElement("div");
    backdrop.className = "tr-chat-backdrop";
    backdrop.innerHTML = `
      <section class="tr-chat" role="dialog" aria-modal="true" aria-labelledby="tr-chat-title">
        <header class="tr-chat-head">
          <i class="fas fa-comments" aria-hidden="true"></i>
          <h2 id="tr-chat-title">${isAdmin() ? "Job messages" : "TechRider support"}<small class="tr-chat-sub">${esc(title || "")}</small></h2>
          <button type="button" class="tr-chat-close" aria-label="Close messages"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="tr-chat-tabs" role="tablist" aria-label="Who to message" hidden></div>
        <div class="tr-chat-note"><i class="fas fa-shield-halved"></i> ${esc(noteText())}</div>
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
      id, backdrop, opener, lastCount: -1, with: withId || null, threads: null,
      list: backdrop.querySelector(".tr-chat-list"),
      form: backdrop.querySelector(".tr-chat-form")
    };
    const input = backdrop.querySelector("textarea");
    const sendBtn = backdrop.querySelector(".tr-chat-form button");

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest(".tr-chat-close")) return close();
      const tab = e.target.closest(".tr-chat-tab");
      if (tab && tab.dataset.with !== current.with) {
        current.with = tab.dataset.with;
        current.lastCount = -1;
        current.list.innerHTML = TR.skeleton(2);
        renderTabs();
        load();
        input.focus();
      }
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
        await API.post(`/requests/${encodeURIComponent(id)}/messages`, isAdmin() ? { body, with: current.with } : { body });
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
    if (isAdmin()) await loadThreads();
    load();
  }

  /* ---------------------------------------------------- wiring */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chat]");
    if (!btn) return;
    e.preventDefault();
    open(btn.dataset.chat, btn.dataset.chatTitle, btn, btn.dataset.chatWith);
  });

  API.onMessage((detail) => {
    if (current && detail.request === current.id) {
      if (isAdmin()) {
        loadThreads();
        if (!detail.with || detail.with === current.with) load();
      } else load();
    }
    refreshBadges();
  });

  // if live updates are off, check every 30 seconds while the panel is open
  setInterval(() => {
    if (!current || document.hidden) return;
    if (isAdmin()) loadThreads();
    load();
  }, 30000);

  API.ready.then((user) => {
    if (!user) return;
    role = user.role;
    refreshBadges();
  });

  TR.chat = { open, close, refreshBadges };
})();
