/* Scripts for history-rider.html */

/* =========================
LOGIN + SUSPENSION
Checked by the page guard in js/api.js
========================= */

const esc = TechRiderAPI.escapeHtml;

/* Finished deliveries (delivered, declined or cancelled), from the server.
   Contact numbers are not kept once a delivery is finished. */
let history = [];

const timeFormat = { dateStyle:'medium', timeStyle:'short' };

const STATUS_ICON = {
delivered: 'fa-circle-check',
declined: 'fa-circle-xmark',
cancelled: 'fa-ban'
};

function finishedAt(job){
return job.deliveredAt || job.declinedAt || job.cancelledAt || job.updatedAt;
}

function finishedText(job){
const at = new Date(finishedAt(job)).toLocaleString('en-NG', timeFormat);
if(job.status === 'delivered') return 'Completed On: ' + at;
if(job.status === 'declined') return 'Declined On: ' + at + (job.declineReason ? ' · ' + job.declineReason : '');
return 'Cancelled On: ' + at + (job.cancelReason ? ' · ' + job.cancelReason : '');
}

async function fetchHistory(){

try{

const data =
await TechRiderAPI.get('/deliveries?scope=history');

history = data.deliveries;

}catch(err){

TR.toast('Could not load your history: ' + err.message);

}

renderHistory();

}

function personBox(icon, title, stop){

return `
<div class="info-box">

<div class="info-title">
<i class="fas ${icon}"></i>
${esc(title)}
</div>

<div class="job-info">
<i class="fas fa-user"></i>
${esc(stop.name)}
</div>

<div class="job-info">
<i class="fas fa-location-dot"></i>
${esc(stop.address)}
</div>

</div>`;

}

/* =========================
RENDER HISTORY
========================= */

function renderHistory(){

const container =
document.getElementById("historyContainer");

container.innerHTML = "";

const keyword =
document.getElementById("searchInput").value.trim().toLowerCase();

const sort =
document.getElementById("sortSelect").value;

const filtered =
history.filter(job =>
[job.from.name, job.to.name, job.code, job.request && job.request.code]
.some(value => (value || "").toLowerCase().includes(keyword))
);

filtered.sort((a,b) => {
const diff = new Date(finishedAt(b)) - new Date(finishedAt(a));
return sort === "recent" ? diff : -diff;
});

if(filtered.length === 0){

document.getElementById("emptyState").style.display = "block";
return;

}

document.getElementById("emptyState").style.display = "none";

container.innerHTML = filtered.map(job => {

const customer = job.type === 'pickup' ? job.from : job.to;
const technician = job.type === 'pickup' ? job.to : job.from;
const device = job.request ? `${job.request.brand} ${job.request.model} · ${job.request.code}` : '';

return `

<div class="history-card">

<div class="card-top">

<div class="job-type">
<i class="fas fa-box"></i>
${esc(job.typeLabel)} · ${esc(job.code)}
${job.status === 'delivered' && job.payout != null ? `<span class="payout-earned"><i class="fas fa-wallet"></i> Earned ${TR.naira(job.payout)}</span>` : ''}
</div>

<div class="status status-${esc(job.status)}">
<i class="fas ${STATUS_ICON[job.status] || 'fa-circle'}"></i>
${esc(job.statusLabel)}
</div>

</div>

<div class="info-grid">
${personBox('fa-user', 'Customer Details', customer)}
${personBox('fa-screwdriver-wrench', 'Technician Details', technician)}
</div>

<div class="info-box"
style="margin-bottom:18px;">

<div class="info-title">
<i class="fas fa-route"></i>
Delivery Route
</div>

<div class="job-info">
<i class="fas fa-mobile-screen"></i>
${esc(device)}
</div>

<div class="job-info">
<i class="fas fa-arrow-right-arrow-left"></i>
${esc(job.from.address)}
→
${esc(job.to.address)}
</div>

</div>

<div class="time-box">

<div class="completed-time">
<i class="fas fa-clock"></i>
${esc(finishedText(job))}
</div>

</div>

</div>

`;

}).join('');

}

/* =========================
INIT
========================= */

(async function init(){

if(!(await TechRiderAPI.ready)) return;

fetchHistory();

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(fetchHistory);
