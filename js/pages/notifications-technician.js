/* Scripts for notifications-technician.html */

/* Login is checked by the page guard in js/api.js */
const esc = TechRiderAPI.escapeHtml;

let notifications = [];
let currentFilter = "all";

/* =========================
   FORMAT TIME
========================= */
function formatTime(date){

  if(!date) return "Recently";

  return new Date(date).toLocaleString("en-NG", {
    dateStyle:"medium",
    timeStyle:"short"
  });

}

/* =========================
   ICON TYPE
   kind comes from the server: job, payment, admin, alert, general
========================= */
const KIND_CLASS = { job:"job", payment:"job", admin:"admin", alert:"alert" };
const KIND_ICON = { job:"fa-tools", payment:"fa-naira-sign", admin:"fa-user-shield", alert:"fa-exclamation-triangle" };

/* =========================
   LOAD
========================= */
async function loadNotifications(){

  try{

    const data = await TechRiderAPI.get("/notifications");
    notifications = data.notifications;

  }catch(err){

    alert("Could not load notifications: " + err.message);

  }

  renderNotifications();

}

/* =========================
   FILTER
========================= */
function setFilter(type, button){

  currentFilter = type;

  document
    .querySelectorAll(".filterBtn")
    .forEach(btn => btn.classList.remove("active"));

  button.classList.add("active");

  renderNotifications();

}

/* =========================
   MARK AS READ
========================= */
async function markAsRead(id){

  try{

    await TechRiderAPI.patch(`/notifications/${encodeURIComponent(id)}/read`);
    const n = notifications.find(item => item.id === id);
    if(n) n.read = true;

  }catch(err){

    alert(err.message);

  }

  renderNotifications();

}

/* =========================
   MARK ALL
========================= */
async function markAllAsRead(){

  const checkbox = document.getElementById("markAllCheckbox");
  if(!checkbox.checked) return;

  try{

    await TechRiderAPI.patch("/notifications/read-all");
    notifications.forEach(n => { n.read = true; });

  }catch(err){

    alert(err.message);

  }

  renderNotifications();

}

/* =========================
   RENDER
========================= */
function renderNotifications(){

  const list = document.getElementById("notificationList");
  const empty = document.getElementById("emptyState");

  document.getElementById("markAllCheckbox").checked =
    notifications.length > 0 && notifications.every(n => n.read);

  const filtered = notifications.filter(n =>
    currentFilter === "read" ? n.read :
    currentFilter === "unread" ? !n.read :
    true
  );

  if(filtered.length === 0){

    list.innerHTML = "";
    empty.style.display = "block";
    return;

  }

  empty.style.display = "none";

  list.innerHTML = filtered.map(n => `

    <div class="card ${n.read ? "" : "unread"}">

      <div class="icon ${KIND_CLASS[n.kind] || "general"}">
        <i class="fas ${KIND_ICON[n.kind] || "fa-bell"}"></i>
      </div>

      <div class="content">

        <div class="topRow">
          <div>
            <div class="title">${esc(n.title)}</div>
            <div class="message">${esc(n.message)}</div>
          </div>
        </div>

        <div class="time">
          ${esc(formatTime(n.createdAt))}
          ${n.requestCode ? " · " + esc(n.requestCode) : ""}
          ${n.fromAdmin ? " · From TechRider" : ""}
        </div>

        <div class="cardActions">
          ${
            n.read
            ? `<div class="readBadge">Read</div>`
            : `<button class="readBtn" data-id="${esc(n.id)}">Mark as Read</button>`
          }
        </div>

      </div>

    </div>

  `).join("");

}

document
  .getElementById("notificationList")
  .addEventListener("click", e => {
    const button = e.target.closest(".readBtn");
    if(button) markAsRead(button.dataset.id);
  });

/* =========================
   INIT
========================= */
(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  loadNotifications();

  setInterval(() => { if(!document.hidden) loadNotifications(); }, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadNotifications);
