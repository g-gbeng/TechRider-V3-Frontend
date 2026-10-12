/* Scripts for admin-dashboard.html */

/* =====================================================
   SIDEBAR
===================================================== */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const hamburger = document.getElementById("hamburger");

function toggleSidebar(){

    if(window.innerWidth <= 768){
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
        return;
    }

    sidebar.classList.toggle("collapsed");
}

hamburger.addEventListener("click",()=>{

    sidebar.classList.add("open");
    overlay.classList.add("show");

});

overlay.addEventListener("click",()=>{

    sidebar.classList.remove("open");
    overlay.classList.remove("show");

});

window.addEventListener("resize",()=>{

    if(window.innerWidth > 768){

        sidebar.classList.remove("open");
        overlay.classList.remove("show");

    }

});


/* =====================================================
   HELPERS
   Login is checked by the page guard in js/api.js
===================================================== */

const esc = TechRiderAPI.escapeHtml;

function setMetric(id,value){
    const el=document.getElementById(id);
    if(el){
        el.textContent=value;
    }
}

function timeAgo(value){
    const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
    if(minutes < 1) return "just now";
    if(minutes < 60) return `${minutes} min ago`;
    if(minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
    return new Date(value).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
}

/* =====================================================
   DASHBOARD COUNTS + RECENT APPROVALS
===================================================== */

async function loadStats(){

    const { stats, recentApprovals } =
        await TechRiderAPI.get("/admin/stats");

    setMetric("totalCustomers", stats.customers);
    setMetric("totalTechnicians", stats.technicians);
    setMetric("totalRiders", stats.riders);
    setMetric("pendingApprovals", stats.pendingApprovals);
    setMetric("activeRequests", stats.activeRequests);
    setMetric("totalDisputes", stats.openDisputes);

    const container = document.getElementById("recentApprovalsList");

    if(recentApprovals.length === 0){
        container.innerHTML = `<div class="row"><span>No approvals yet.</span></div>`;
        return;
    }

    container.innerHTML = recentApprovals.map(user => `
        <div class="row">
            <span>
                ${user.role === "rider" ? "Rider" : "Technician"}
                —
                ${esc(user.fullName)}
                <small class="muted">${esc(timeAgo(user.approvedAt))}</small>
            </span>
            <a
                class="action-link"
                href="admin-records.html?${user.role === "rider" ? "rider" : "tech"}=${encodeURIComponent(user.fullName)}">
                Review
            </a>
        </div>
    `).join("");

}

/* =====================================================
   ADMIN NOTIFICATIONS
   New disputes, payments, rider updates and so on.
===================================================== */

const NOTE_LINKS = {
    dispute: "admin-disputes.html",
    payment: "admin-job-monitoring.html",
    quotation: "admin-job-monitoring.html",
    request_cancelled: "admin-job-monitoring.html",
    quote_rejected: "admin-job-monitoring.html",
    delivery_declined: "admin-communications.html",
    delivery_accepted: "admin-job-monitoring.html",
    delivery_update: "admin-job-monitoring.html",
    application: "admin-pending-approvals.html"
};

async function loadInbox(){

    const { notifications, unread } =
        await TechRiderAPI.get("/notifications?limit=8");

    const count = document.getElementById("inboxCount");
    count.hidden = unread === 0;
    count.textContent = unread;
    document.getElementById("markAllRead").hidden = unread === 0;

    const inbox = document.getElementById("adminInbox");

    if(notifications.length === 0){
        inbox.innerHTML = `<div class="row"><span>No notifications yet.</span></div>`;
        return;
    }

    inbox.innerHTML = notifications.map(n => `
        <div class="row inboxRow ${n.read ? "" : "unread"}">
            <div>
                <a class="inboxTitle" href="${NOTE_LINKS[n.type] || "#"}" data-id="${esc(n.id)}">${esc(n.title)}</a>
                <div class="inboxMessage">${esc(n.message)}</div>
            </div>
            <small class="muted">${esc(timeAgo(n.createdAt))}</small>
        </div>
    `).join("");

}

document.getElementById("adminInbox").addEventListener("click", async e => {

    const link = e.target.closest("a[data-id]");
    if(!link) return;

    // mark it read before following the link
    e.preventDefault();
    try{
        await TechRiderAPI.patch(`/notifications/${encodeURIComponent(link.dataset.id)}/read`);
    }catch(err){ /* still follow the link */ }

    if(link.getAttribute("href") !== "#") location.href = link.getAttribute("href");
    else loadInbox();

});

document.getElementById("markAllRead").addEventListener("click", async () => {

    try{
        await TechRiderAPI.patch("/notifications/read-all");
    }catch(err){
        TR.toast(err.message, "error");
    }
    loadInbox();

});

/* =====================================================
   REFRESH (every 30 seconds while the page is open)
===================================================== */

async function refreshDashboard(){

    try{
        await Promise.all([loadStats(), loadInbox()]);
    }catch(err){
        console.warn("Dashboard refresh failed:", err.message);
    }

}

(async function init(){

    if(!(await TechRiderAPI.ready)) return;

    refreshDashboard();

    setInterval(() => {
        if(!document.hidden) refreshDashboard();
    }, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(refreshDashboard);
