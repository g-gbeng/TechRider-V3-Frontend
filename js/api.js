/* ==========================================================
   TECHRIDER API HELPER
   One place for every call to the backend.

   Add to a page, before that page's own script:
     <script src="js/api.js"></script>

   On pages that need a logged-in user, name the role:
     <script src="js/api.js" data-require-role="customer"></script>
   The page stays hidden until the login is confirmed, and visitors who
   are not allowed there are sent to the right login page.
========================================================== */

(function () {

  const currentScript = document.currentScript;

  /* ----------------------------------------------------------
     WHERE THE API LIVES
     Locally the API runs on port 5000 on the same host name as
     the page (127.0.0.1 or localhost). Keeping the same host
     name matters: the login cookie is only sent between
     addresses that share it.
  ---------------------------------------------------------- */
  const isLocal =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1", ""].includes(location.hostname) ||
    /^(192\.168|10)\./.test(location.hostname); // testing from a phone on the same Wi-Fi

  /* Online, the site forwards /api/* to the API server (see netlify.toml),
     so the API is always on the page's own address. */
  const API_BASE = isLocal
    ? `http://${location.hostname || "127.0.0.1"}:5000/api`
    : `${location.origin}/api`;

  /* ----------------------------------------------------------
     ONE-TIME CLEAN-UP of data the old version kept in this
     browser. Everything now lives on the server; only the
     logged-in user's details stay here.
  ---------------------------------------------------------- */
  try {
    if (!localStorage.getItem("techrider_storage_v2")) {
      const OLD_KEYS = [
        "activeRiderJobs", "allDisputes", "assignedRiderJobs", "currentUser", "riderCurrentUser",
        "riderDeliveryHistory", "riderLoggedIn", "riderNotifications", "riderStatus", "suspendedAccounts",
        "technicianStatus", "disputeCounter", "jobHistory", "admin_notifications", "admin_approved",
        "tech_active_jobs", "tech_job_history", "TECHRIDER_COMMISSION_RATE",
        "techrider_available_jobs", "techrider_communications_log", "techrider_customer_notifications",
        "techrider_customers", "techrider_email_templates", "techrider_financial_adjustments",
        "techrider_notification_templates", "techrider_notifications", "techrider_pending_registrations",
        "techrider_pending_request", "techrider_processed_quote_events", "techrider_quotations",
        "techrider_quote_response_events", "techrider_requests", "techrider_rider_notifications",
        "techrider_riders", "techrider_technician_notifications", "techrider_technicians"
      ];
      const OLD_PREFIXES = ["techrider_rider_available_jobs_", "tech_jobs_"];
      OLD_KEYS.forEach((key) => localStorage.removeItem(key));
      Object.keys(localStorage)
        .filter((key) => OLD_PREFIXES.some((prefix) => key.startsWith(prefix)))
        .forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("techrider_storage_v2", "1");
    }
  } catch (e) { /* storage blocked: nothing to clean */ }

  /* ----------------------------------------------------------
     CORE REQUEST
     Always sends the login cookie, always returns parsed JSON,
     and throws an ApiError with the server's message on failure.
     err.code holds codes like "PENDING" or "SUSPENDED".
  ---------------------------------------------------------- */
  class ApiError extends Error {
    constructor(status, message, details) {
      super(message);
      this.status = status;
      this.details = details;
      this.code = details && details.code;
    }
  }

  /* Small notice while the server wakes up */
  function showWaking(on) {
    let note = document.getElementById("tr-waking");
    if (!on) {
      if (note) note.remove();
      return;
    }
    if (note || !document.body) return;
    note = document.createElement("div");
    note.id = "tr-waking";
    note.setAttribute("role", "status");
    note.textContent = "Connecting to TechRider… this can take up to a minute the first time.";
    note.style.cssText =
      "position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;" +
      "background:#240046;color:#fff;padding:10px 16px;border-radius:12px;" +
      "font:500 14px Poppins,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.2);max-width:90vw;text-align:center";
    document.body.appendChild(note);
  }

  async function request(method, path, body) {
    const options = {
      method,
      credentials: "include",
      headers: { Accept: "application/json" }
    };

    if (body instanceof FormData) {
      options.body = body; // browser sets the multipart header itself
    } else if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    /* A free server that has been idle sleeps and takes up to a minute to
       wake. Reads (GET) are retried while it wakes; other requests are not
       repeated automatically, so nothing (a payment, say) can happen twice. */
    const attempts = method === "GET" ? 4 : 1;
    let response;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        response = await fetch(API_BASE + path, options);
      } catch (networkError) {
        response = null;
      }
      const waking = !response || [502, 503, 504].includes(response.status);
      if (!waking || attempt === attempts) break;
      showWaking(true);
      await new Promise((resolve) => setTimeout(resolve, 4000 * attempt));
    }
    showWaking(false);

    if (!response) {
      throw new ApiError(
        0,
        "Cannot reach the TechRider server. Check your connection and try again."
      );
    }

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        (data && data.message) || `Request failed (${response.status})`,
        data && data.details
      );
    }

    return data;
  }

  /* ----------------------------------------------------------
     SESSION BRIDGE
     Pages not yet moved to the API still read the logged-in user
     from localStorage ("techrider_current_customer" etc.).
     After a real login we keep a copy there, in the shape those
     pages expect. The real session is the server cookie.
  ---------------------------------------------------------- */
  const SESSION_KEYS = {
    customer: "techrider_current_customer",
    technician: "techrider_current_technician",
    rider: "techrider_current_rider",
    admin: "techrider_current_admin"
  };

  function toLegacyUser(user) {
    const tech = user.technicianProfile || {};
    const rider = user.riderProfile || {};
    return {
      ...user,
      name: user.fullName,
      location: user.address,
      profileImage: user.profileImageUrl || "",
      specialization: tech.specialization,
      experience: tech.yearsExperience,
      vehicleType: rider.vehicleType,
      vehicleBrand: rider.vehicleBrand,
      plateNumber: rider.plateNumber,
      customerId: user.role === "customer" ? user.id : undefined,
      technicianId: user.role === "technician" ? user.id : undefined,
      riderId: user.role === "rider" ? user.id : undefined
    };
  }

  function cacheSession(user) {
    const key = SESSION_KEYS[user.role];
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(toLegacyUser(user)));
      if (user.role === "rider") {
        // some rider pages read this older key
        localStorage.setItem("techrider_currentUser", JSON.stringify({
          id: user.id, fullName: user.fullName, email: user.email, type: "rider"
        }));
      }
    } catch (e) {
      /* storage full or blocked: pages will re-fetch */
    }
  }

  function clearSession() {
    // the saved customer location goes too, so the next person on this device doesn't see it
    Object.values(SESSION_KEYS).concat("techrider_currentUser", "techrider_customer_location").forEach((key) => {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    });
  }

  let pendingLogout = Promise.resolve();

  async function login(role, email, password) {
    await pendingLogout; // never let an earlier logout land after this login
    const data = await request("POST", "/auth/login", { role, email, password });
    clearSession();
    cacheSession(data.user);
    return data.user;
  }

  function logout() {
    clearSession();
    pendingLogout = request("POST", "/auth/logout").catch(() => {
      /* already logged out, or server unreachable: nothing to do */
    });
    return pendingLogout;
  }

  /* ----------------------------------------------------------
     PAGE GUARD
     await requireRole("technician") returns the user, or sends
     them to the right page if they are not allowed here.
  ---------------------------------------------------------- */
  const LOGIN_PAGES = {
    customer: "login-customer.html",
    technician: "login-technician.html",
    rider: "login-rider.html",
    admin: "admin-login.html"
  };

  const DASHBOARDS = {
    customer: "dashboard-customer.html",
    technician: "dashboard-technician.html",
    rider: "dashboard-rider.html",
    admin: "admin-dashboard.html"
  };

  async function requireRole(role) {
    let user;
    try {
      ({ user } = await request("GET", "/auth/me"));
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearSession();
        window.location.replace(LOGIN_PAGES[role] || "index.html");
        return null;
      }
      throw err;
    }

    if (user.role !== role) {
      window.location.replace(LOGIN_PAGES[role] || "index.html");
      return null;
    }
    if (user.suspended) {
      cacheSession(user);
      window.location.replace("account-suspended.html");
      return null;
    }
    cacheSession(user);
    return user;
  }

  /* ----------------------------------------------------------
     SMALL HELPERS FOR PAGES
  ---------------------------------------------------------- */

  /* Make text safe to put inside innerHTML */
  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showServerProblem(message) {
    const bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 16px;" +
      "background:#d62839;color:#fff;font:500 14px Poppins,sans-serif;text-align:center;";
    bar.textContent = message;
    document.body.appendChild(bar);
  }

  /* ----------------------------------------------------------
     PUBLIC FUNCTIONS
  ---------------------------------------------------------- */
  /* Unread count + newest unread notification, fetched at most every 30 seconds
     (dashboards call this from timers that run every second). */
  let summaryCache = null;
  let summaryAt = 0;
  function notificationSummary() {
    if (summaryCache && Date.now() - summaryAt < 30000) return summaryCache;
    summaryAt = Date.now();
    summaryCache = request("GET", "/notifications/summary").catch((err) => {
      summaryAt = 0; // try again on the next call
      throw err;
    });
    return summaryCache;
  }

  /* ----------------------------------------------------------
     LIVE UPDATES
     Pages call TechRiderAPI.onUpdate(refreshFunction). When the
     server says something changed for this user, every registered
     function runs (at most once every 2 seconds). Pages keep their
     own 30-second refresh as a fallback if the live connection
     isn't available.
  ---------------------------------------------------------- */
  const updateHandlers = [];
  let liveStarted = false;
  let updateTimer = null;

  function runUpdateHandlers(detail) {
    summaryAt = 0; // the unread count has changed
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      updateHandlers.forEach((fn) => {
        try { fn(detail); } catch (err) { console.warn("Live update handler failed:", err); }
      });
    }, 300);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(script);
    });
  }

  async function startLive() {
    if (liveStarted) return;
    liveStarted = true;
    try {
      const first = await request("GET", "/realtime/token");
      if (!window.io) await loadScript(first.url + "/socket.io/socket.io.js");
      let firstToken = first.token;
      const socket = window.io(first.url, {
        transports: ["websocket", "polling"],
        // a fresh pass for every (re)connection; passes last 2 minutes
        auth: (cb) => {
          if (firstToken) {
            cb({ token: firstToken });
            firstToken = null;
            return;
          }
          request("GET", "/realtime/token")
            .then((t) => cb({ token: t.token }))
            .catch(() => cb({ token: "" }));
        }
      });
      socket.on("notification", runUpdateHandlers);
      // new job messages: chat windows and "Messages" buttons listen for this
      socket.on("message", (detail) => {
        summaryAt = 0;
        window.dispatchEvent(new CustomEvent("tr:message", { detail }));
      });
      // after being offline, catch up on anything missed
      socket.io.on("reconnect", () => runUpdateHandlers({ type: "reconnect" }));
      window.TechRiderAPI.liveSocket = socket;
    } catch (err) {
      console.warn("Live updates unavailable, pages will refresh every 30 seconds:", err.message);
    }
  }

  function onUpdate(fn) {
    updateHandlers.push(fn);
    window.TechRiderAPI.ready.then((user) => { if (user) startLive(); });
  }

  /* fn({ request }) runs when a new job message arrives for this user */
  function onMessage(fn) {
    window.addEventListener("tr:message", (e) => fn(e.detail || {}));
    window.TechRiderAPI.ready.then((user) => { if (user) startLive(); });
  }

  window.TechRiderAPI = {
    notificationSummary,
    onUpdate,
    onMessage,
    API_BASE,
    ApiError,
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    patch: (path, body) => request("PATCH", path, body),
    put: (path, body) => request("PUT", path, body),
    del: (path) => request("DELETE", path),
    upload: (path, formData) => request("POST", path, formData),
    health: () => request("GET", "/health"),
    login,
    logout,
    requireRole,
    cacheSession,
    clearSession,
    escapeHtml,
    LOGIN_PAGES,
    DASHBOARDS,
    // resolves with the logged-in user once the page guard has checked it
    ready: Promise.resolve(null)
  };

  /* ----------------------------------------------------------
     AUTOMATIC GUARD for <script ... data-require-role="...">
  ---------------------------------------------------------- */
  const guardedRole = currentScript && currentScript.dataset.requireRole;

  if (guardedRole) {
    const root = document.documentElement;

    // Nobody has logged in on this browser: go to login straight away and
    // stop loading this page, so its own scripts never run without a user.
    let hasSession = false;
    try { hasSession = !!localStorage.getItem(SESSION_KEYS[guardedRole]); } catch (e) { /* ignore */ }
    if (!hasSession) {
      window.stop();
      window.location.replace(LOGIN_PAGES[guardedRole] || "index.html");
      return;
    }

    root.style.visibility = "hidden";

    window.TechRiderAPI.ready = requireRole(guardedRole)
      .then((user) => {
        if (user) root.style.visibility = "";
        return user;
      })
      .catch((err) => {
        root.style.visibility = "";
        const show = () => showServerProblem(err.message);
        if (document.body) show();
        else document.addEventListener("DOMContentLoaded", show);
        return null;
      });
  }

})();
