/* Scripts for dashboard-technician.html */

/* CURRENT TECHNICIAN */
const currentTechnician =
  JSON.parse(
    localStorage.getItem(
      "techrider_current_technician"
    )
  );

/* SECURITY */
if(!currentTechnician){

  window.location.href =
    "login-technician.html";

}

/* TECHNICIAN INFO */
const fullName =
  currentTechnician.fullName ||
  "Technician";

const firstName =
  fullName.split(" ")[0];

const initials =
  firstName.charAt(0).toUpperCase();

/* UPDATE UI */
document.getElementById(
  "sidebarName"
).textContent = fullName;

TR.setAvatar(document.getElementById("sidebarLogo"), currentTechnician);

TR.setAvatar(document.getElementById("topAvatar"), currentTechnician);

document.getElementById(
  "welcomeHeading"
).textContent =
  `Welcome, ${firstName}`;

document.getElementById(
  "welcomeSubText"
).textContent =
  `Here's a live overview of your repair requests, active jobs and latest notifications.`;

/* Latest photo and star rating from the server */
TechRiderAPI.ready.then(user => {
  if(!user) return;
  TR.setAvatar(document.getElementById("sidebarLogo"), user);
  TR.setAvatar(document.getElementById("topAvatar"), user);
  const rating = document.getElementById("myRating");
  if(rating){
    rating.innerHTML = user.reviewCount
      ? `${TR.stars(user.rating, user.reviewCount)}`
      : '<span class="tr-rating-text"><i class="far fa-star"></i> No ratings yet. Customers rate you after each repair.</span>';
  }
});

/* SIDEBAR */
const sidebar =
  document.getElementById("sidebar");

const overlay =
  document.getElementById("overlay");

function toggleSidebar(){

  if(window.innerWidth <= 768){

    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");

  }

}

function closeSidebar(){

  sidebar.classList.remove("open");
  overlay.classList.remove("show");

}

/* JOB COUNTS (from the server) */
let lastCountsFetch = 0;

async function updateRequestCounts(){

  // at most every 30 seconds (updateDashboard runs every second)
  if(Date.now() - lastCountsFetch < 30000) return;
  lastCountsFetch = Date.now();

  if(!(await TechRiderAPI.ready)) return;

  try{

    const { requests } =
      await TechRiderAPI.get("/requests?scope=all");

    const ACTIVE = ["quoted", "quote_sent", "quote_accepted", "pickup_in_transit", "repair_in_progress", "repair_done", "return_in_transit"];

    document.getElementById("pendingCount").textContent =
      requests.filter(r => r.status === "awaiting_technician").length;

    document.getElementById("activeCount").textContent =
      requests.filter(r => ACTIVE.includes(r.status)).length;

    document.getElementById("completedCount").textContent =
      requests.filter(r => r.status === "completed").length;

  }catch(err){

    /* keep the previous numbers if the server is unreachable */

  }

}

/* UPDATE DASHBOARD */
function updateDashboard(){

  /* REQUESTS (counted on the server) */

  updateRequestCounts();

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

/* REALTIME STORAGE UPDATE */
window.addEventListener(
  "storage",
  updateDashboard
);

/* FALLBACK LIVE UPDATE */
setInterval(
  updateDashboard,
  1000
);

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
  lastCountsFetch = 0;
  updateDashboard();
});
