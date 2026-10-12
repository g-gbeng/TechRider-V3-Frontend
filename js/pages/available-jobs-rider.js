/* Scripts for available-jobs-rider.html */

/* =========================
LOGIN + SUSPENSION
Checked by the page guard in js/api.js
========================= */

const esc = TechRiderAPI.escapeHtml;

/* Deliveries the admin has assigned to this rider, waiting for an answer */
let offeredJobs = [];

let selectedJobId = null;

const timeFormat = { dateStyle:'medium', timeStyle:'short' };

function when(value){
return value ? new Date(value).toLocaleString('en-NG', timeFormat) : '';
}

/* Who the rider meets at a stop. Phones only arrive after accepting. */
function personBox(icon, title, stop){

return `
<div class="flow-box">

<div class="flow-head">
<i class="fas ${icon}"></i>
<span>${esc(title)}</span>
</div>

<div class="info-row">
<strong>Name:</strong>
${esc(stop.name)}
</div>

<div class="info-row">
<strong>Phone:</strong>
${stop.phone ? esc(stop.phone) : '<span class="muted">Shown after you accept</span>'}
</div>

<div class="info-row">
<strong>Address:</strong>
${esc(stop.address)}
</div>

</div>`;

}

/* =========================
LOAD JOBS
========================= */
async function fetchJobs(){

try{

const data =
await TechRiderAPI.get('/deliveries?scope=offered');

offeredJobs = data.deliveries;

}catch(err){

TR.toast('Could not load jobs: ' + err.message);

}

loadJobs();

}

function loadJobs(){

const jobsContainer =
document.getElementById('jobsContainer');

const emptyState =
document.getElementById('emptyState');

jobsContainer.innerHTML = '';

if(offeredJobs.length === 0){

emptyState.style.display = 'block';
return;

}

emptyState.style.display = 'none';

jobsContainer.innerHTML = offeredJobs.map(job => {

const customer = job.type === 'pickup' ? job.from : job.to;
const technician = job.type === 'pickup' ? job.to : job.from;
const device = job.request
? `${job.request.brand} ${job.request.model} (${job.request.deviceType})`
: '';

return `

<div class="job-card">

<div class="job-top">

<div>

<div class="job-id">
${esc(job.code)}
</div>

<div class="job-time">
<i class="fas fa-clock"></i>
Assigned ${esc(when(job.assignedAt))}
</div>

<div class="job-device">
<i class="fas fa-mobile-screen"></i>
${esc(device)}${job.request ? ' · ' + esc(job.request.code) : ''}
</div>

</div>

<div class="badges">

<div class="tag ${job.type === 'return' ? 'delivery' : 'pickup'}">
${esc(job.typeLabel)}
</div>

<div class="tag status-tag">
${esc(job.statusLabel)}
</div>

</div>

</div>

<div class="flow-grid">
${personBox('fa-user', 'Customer Information', customer)}
${personBox('fa-screwdriver-wrench', 'Technician Information', technician)}
</div>

<div class="route-box">

<div class="route-step">

<div class="route-icon">
<i class="fas fa-location-dot"></i>
</div>

<div class="route-content">
<strong>Pickup From</strong>
${esc(job.from.address)}
</div>

</div>

<div class="route-step">

<div class="route-icon">
<i class="fas fa-truck"></i>
</div>

<div class="route-content">
<strong>Deliver To</strong>
${esc(job.to.address)}
</div>

</div>

</div>

${job.instructions ? `
<div class="instructions">
<i class="fas fa-circle-info"></i>
<span>${esc(job.instructions)}</span>
</div>` : ''}

<div class="actions">

<button
class="btn accept"
data-id="${esc(job.id)}"
data-action="accept">

Accept Job

</button>

<button
class="btn reject"
data-id="${esc(job.id)}"
data-action="reject">

Reject Job

</button>

</div>

</div>

`;

}).join('');

}

document
.getElementById('jobsContainer')
.addEventListener('click', e => {

const button = e.target.closest('button[data-action]');
if(!button) return;

if(button.dataset.action === 'accept') openAcceptModal(button.dataset.id);
else openRejectModal(button.dataset.id);

});

/* =========================
ACCEPT JOB
========================= */
function openAcceptModal(jobId){

selectedJobId = jobId;

document
.getElementById('acceptModal')
.style.display = 'flex';

}

function closeAcceptModal(){

document
.getElementById('acceptModal')
.style.display = 'none';

selectedJobId = null;

}

async function confirmAcceptJob(){

if(!selectedJobId) return;

const button = document.getElementById('acceptConfirmBtn');
button.disabled = true;

try{

await TechRiderAPI.post(`/deliveries/${encodeURIComponent(selectedJobId)}/accept`);

closeAcceptModal();

TR.toast('Job accepted. You can now see the contact numbers on Active Jobs.');

window.location.href = 'active-jobs-rider.html';

}catch(err){

closeAcceptModal();
TR.toast(err.message, "error");
fetchJobs();

}finally{

button.disabled = false;

}

}

/* =========================
REJECT JOB
========================= */
function openRejectModal(jobId){

selectedJobId = jobId;

document.getElementById('rejectReason').value = '';

document
.getElementById('rejectModal')
.style.display = 'flex';

}

function closeRejectModal(){

document
.getElementById('rejectModal')
.style.display = 'none';

selectedJobId = null;

}

async function confirmRejectJob(){

if(!selectedJobId) return;

const button = document.getElementById('rejectConfirmBtn');
button.disabled = true;

try{

await TechRiderAPI.post(
`/deliveries/${encodeURIComponent(selectedJobId)}/decline`,
{ reason: document.getElementById('rejectReason').value.trim() }
);

closeRejectModal();

TR.toast('Job rejected. The admin will assign another rider.');

}catch(err){

closeRejectModal();
TR.toast(err.message, "error");

}finally{

button.disabled = false;

}

fetchJobs();

}

/* =========================
CLOSE MODALS ON OUTSIDE CLICK
========================= */
window.onclick = function(e){

const acceptModal =
document.getElementById('acceptModal');

const rejectModal =
document.getElementById('rejectModal');

if(e.target === acceptModal){
closeAcceptModal();
}

if(e.target === rejectModal){
closeRejectModal();
}

};

/* =========================
INIT
New assignments show up within 30 seconds while the page is open.
========================= */
(async function init(){

if(!(await TechRiderAPI.ready)) return;

fetchJobs();

setInterval(() => {
if(!document.hidden && !selectedJobId) fetchJobs();
}, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
if(!selectedJobId) fetchJobs();
});
