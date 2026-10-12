/* Scripts for dashboard-rider.html */

/* =========================
CURRENT RIDER
========================= */
const currentRider =
JSON.parse(
localStorage.getItem(
"techrider_current_rider"
)
);

/* SECURITY */
if(!currentRider){

window.location.href =
"login-rider.html";

}

/* RIDER INFO */
const fullName =
currentRider.fullName ||
"Rider";

const firstName =
fullName.split(" ")[0];

const initials =
firstName.charAt(0).toUpperCase();

/* UPDATE UI */
document.getElementById(
"sidebarName"
).textContent = fullName;

TR.setAvatar(document.getElementById("sidebarLogo"), currentRider);

TR.setAvatar(document.getElementById("topAvatar"), currentRider);

document.getElementById(
"welcomeHeading"
).textContent =
`Welcome, ${firstName}`;

document.getElementById(
"welcomeSubText"
).textContent =
`Here's a live overview of your delivery requests, active jobs and latest notifications.`;

/* Latest photo and star rating from the server */
TechRiderAPI.ready.then(user => {
  if(!user) return;
  TR.setAvatar(document.getElementById("sidebarLogo"), user);
  TR.setAvatar(document.getElementById("topAvatar"), user);
  const rating = document.getElementById("myRating");
  if(rating){
    rating.innerHTML = user.reviewCount
      ? `${TR.stars(user.rating, user.reviewCount)}`
      : '<span class="tr-rating-text"><i class="far fa-star"></i> No ratings yet. Customers rate you after each delivery.</span>';
  }
});

/* SIDEBAR */
const sidebar =
document.getElementById(
"sidebar"
);

const overlay =
document.getElementById(
"overlay"
);

function toggleSidebar(){

if(window.innerWidth <= 768){

sidebar.classList.toggle(
"open"
);

overlay.classList.toggle(
"show"
);

}

}

function closeSidebar(){

sidebar.classList.remove(
"open"
);

overlay.classList.remove(
"show"
);

}

/* =========================
DELIVERY COUNTS
From the server, at most every 30 seconds
(updateDashboard runs every second for the notifications below).
========================= */
let lastCountsFetch = 0;

async function updateCounts(){

if(Date.now() - lastCountsFetch < 30000) return;
lastCountsFetch = Date.now();

if(!(await TechRiderAPI.ready)) return;

try{

const { counts } =
await TechRiderAPI.get('/deliveries?scope=offered');

document.getElementById("availableCount").textContent = counts.offered;
document.getElementById("activeCount").textContent = counts.active;
document.getElementById("completedCount").textContent = counts.delivered;

}catch(err){

/* keep the previous numbers if the server is unreachable */

}

}

/* =========================
UPDATE DASHBOARD
========================= */
function updateDashboard(){

updateCounts();

updateNotifications();

}

/* NOTIFICATIONS (unread count and newest unread, from the server) */
async function updateNotifications(){

  if(!(await TechRiderAPI.ready)) return;

  try{

    const { unread, latest } = await TechRiderAPI.notificationSummary();

    document.getElementById("notificationCount").textContent = unread;

    const badge = document.getElementById("notificationBadge");
    badge.style.display = unread > 0 ? "flex" : "none";
    badge.textContent = unread;

    document.getElementById("latestNotification").textContent =
      latest ? (latest.message || latest.title) : "No new notifications";

  }catch(err){

    /* keep the previous numbers if the server is unreachable */

  }

}

/* INITIAL LOAD */
updateDashboard();

/* REALTIME */
window.addEventListener(
"storage",
updateDashboard
);

/* LIVE FALLBACK */
setInterval(
updateDashboard,
1000
);

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
  lastCountsFetch = 0;
  updateDashboard();
});
