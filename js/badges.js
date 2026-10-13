/* ==========================================================
   SIDEBAR BADGES
   Red counters next to sidebar links: new jobs, open disputes,
   unrated repairs and so on (the server decides the numbers, see
   GET /api/me/badges). Load after js/api.js and js/ui.js on any
   page with a sidebar.
========================================================== */
(function () {
  const API = window.TechRiderAPI;

  // which badge goes next to which page link
  const LINKS = {
    customer: {
      "active-repairs-customer.html": "activeRepairs",
      "history-customer.html": "history",
      "disputes-customer.html": "disputes",
      "notifications-customer.html": "notifications"
    },
    technician: {
      "available-jobs-technician.html": "availableJobs",
      "active-jobs-technician.html": "activeJobs",
      "history-technician.html": "history",
      "disputes-technician.html": "disputes",
      "notifications-technician.html": "notifications"
    },
    rider: {
      "available-jobs-rider.html": "availableJobs",
      "active-jobs-rider.html": "activeJobs",
      "disputes-rider.html": "disputes",
      "notifications-rider.html": "notifications"
    },
    admin: {
      "admin-pending-approvals.html": "pendingApprovals",
      "admin-job-monitoring.html": "jobMonitoring",
      "admin-communications.html": "communications",
      "admin-disputes.html": "disputes"
    }
  };

  const LABELS = {
    activeRepairs: "need your attention", history: "to rate or review", disputes: "dispute updates",
    notifications: "unread", availableJobs: "new", activeJobs: "to do", pendingApprovals: "to review",
    jobMonitoring: "need action", communications: "waiting for a rider"
  };

  let role = null;

  function paint(counts) {
    const map = LINKS[role] || {};
    document.querySelectorAll(".sidebar a[href], #sidebar a[href], .nav a[href]").forEach((a) => {
      const page = a.getAttribute("href").split("?")[0];
      const key = map[page];
      if (!key) return;
      // some dashboards already keep their own notification counter
      if (a.querySelector(".notificationBadge, #notificationBadge, #notificationCount")) return;
      const n = counts[key] || 0;
      let badge = a.querySelector(".tr-nav-badge");
      if (!n) { if (badge) badge.remove(); return; }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "tr-nav-badge";
        a.appendChild(badge);
        a.classList.add("tr-has-badge");
      }
      const text = n > 99 ? "99+" : String(n);
      if (badge.textContent !== text) {
        badge.textContent = text;
        badge.classList.remove("pop");
        void badge.offsetWidth; // restart the little pop animation
        badge.classList.add("pop");
      }
      badge.setAttribute("aria-label", `${n} ${LABELS[key] || "new"}`);
      badge.title = `${n} ${LABELS[key] || "new"}`;
    });
  }

  let timer = null;
  async function refresh() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const { badges } = await API.get("/me/badges");
        paint(badges || {});
      } catch (e) { /* keep the old numbers */ }
    }, 200);
  }

  API.ready.then((user) => {
    if (!user) return;
    role = user.role;
    refresh();
    API.onUpdate(refresh);
    if (API.onMessage) API.onMessage(refresh);
    setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  });

  window.TR = window.TR || {};
  window.TR.refreshBadges = refresh;
})();
