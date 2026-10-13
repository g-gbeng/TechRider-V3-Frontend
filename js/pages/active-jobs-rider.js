/* Scripts for active-jobs-rider.html */

/* =========================
LOGIN + SUSPENSION
Checked by the page guard in js/api.js
========================= */

const esc = TechRiderAPI.escapeHtml;

/* Accepted deliveries: first "picked up", then "delivered" */
let activeJobs = [];

let selectedJobId = null;

const timeFormat = { dateStyle:'medium', timeStyle:'short' };

function when(value){
return value ? new Date(value).toLocaleString('en-NG', timeFormat) : '';
}

/* What the next button does for each delivery status */
const NEXT_STEP = {
accepted: {
path: 'picked-up',
button: 'Mark as Picked Up',
icon: 'fa-box',
title: 'Confirm Pickup',
text: job => `Confirm you have collected the ${job.request ? job.request.brand + ' ' + job.request.model : 'device'} from ${job.from.name}.`,
done: 'Marked as picked up. Deliver it to the address shown.'
},
picked_up: {
path: 'delivered',
button: 'Mark as Delivered',
icon: 'fa-flag-checkered',
title: 'Complete Delivery',
text: job => `Confirm you have handed the device to ${job.to.name}.`,
done: 'Delivery completed. Well done!'
}
};

function phoneLink(phone){
return phone
? `<a class="phone-link" href="tel:${esc(phone)}"><i class="fas fa-phone"></i> ${esc(phone)}</a>`
: 'N/A';
}

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
${phoneLink(stop.phone)}
</div>

<div class="info-row">
<strong>Address:</strong>
${esc(stop.address)}
</div>

${stop.landmark ? `
<div class="info-row">
<strong>Landmark:</strong>
${esc(stop.landmark)}
</div>` : ''}

${stop.mapUrl ? `
<a class="map-link" href="${esc(stop.mapUrl)}" target="_blank" rel="noopener">
<i class="fas fa-map-location-dot"></i> Open in Maps
</a>` : ''}

</div>`;

}

/* =========================
LOAD ACTIVE DELIVERIES
========================= */
async function fetchActive(){

try{

const data =
await TechRiderAPI.get('/deliveries?scope=active');

activeJobs = data.deliveries;

}catch(err){

TR.toast('Could not load deliveries: ' + err.message);

}

loadActiveDeliveries();

}

function loadActiveDeliveries(){

const jobsContainer =
document.getElementById('jobsContainer');

const emptyState =
document.getElementById('emptyState');

jobsContainer.innerHTML = '';

if(activeJobs.length === 0){

emptyState.innerHTML = TR.empty({
icon:'fa-motorcycle',
title:'No active deliveries',
text:'Deliveries you accept will appear here with directions and contact numbers.',
action:{ label:'See available jobs', href:'available-jobs-rider.html' }
});
emptyState.style.display = 'block';
return;

}

emptyState.style.display = 'none';

jobsContainer.innerHTML = activeJobs.map(job => {

const customer = job.type === 'pickup' ? job.from : job.to;
const technician = job.type === 'pickup' ? job.to : job.from;
const next = NEXT_STEP[job.status];
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
Accepted:
${esc(when(job.acceptedAt))}
${job.pickedUpAt ? ' · Picked up: ' + esc(when(job.pickedUpAt)) : ''}
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
${job.status === 'picked_up' ? 'On the way' : 'Go to pickup'}
</div>

</div>

</div>

<div class="flow-grid">
${personBox('fa-user', 'Customer Information', customer)}
${personBox('fa-screwdriver-wrench', 'Technician Information', technician)}
</div>

<div class="route-box">

<div class="route-step ${job.status === 'accepted' ? 'current' : 'passed'}">

<div class="route-icon">
<i class="fas fa-location-dot"></i>
</div>

<div class="route-content">
<strong>Pickup From</strong>
${esc(job.from.name)}, ${esc(job.from.address)}
</div>

</div>

<div class="route-step ${job.status === 'picked_up' ? 'current' : ''}">

<div class="route-icon">
<i class="fas fa-truck"></i>
</div>

<div class="route-content">
<strong>Deliver To</strong>
${esc(job.to.name)}, ${esc(job.to.address)}
</div>

</div>

</div>

${job.instructions ? `
<div class="instructions">
<i class="fas fa-circle-info"></i>
<span>${esc(job.instructions)}</span>
</div>` : ''}

<div class="actions">

${next ? `
<button
class="btn complete-btn"
data-id="${esc(job.id)}">

<i class="fas ${next.icon}"></i>
${next.button}

</button>` : ''}

</div>

</div>

`;

}).join('');


}

document
.getElementById('jobsContainer')
.addEventListener('click', e => {

const button = e.target.closest('button.complete-btn[data-id]');
if(button) openCompleteModal(button.dataset.id);

});

/* =========================
OPEN / CLOSE CONFIRM MODAL
========================= */
function openCompleteModal(jobId){

const job = activeJobs.find(j => j.id === jobId);
const next = job && NEXT_STEP[job.status];
if(!next) return;

selectedJobId = jobId;

document.getElementById('completeTitle').textContent = next.title;
document.getElementById('completeText').textContent = next.text(job);
document.getElementById('completeConfirmBtn').textContent = next.button;

// delivering needs the receiver's 4-digit handover code
const needsCode = job.status === 'picked_up' && job.needsHandoverCode;
const field = document.getElementById('handoverField');
const input = document.getElementById('handoverInput');
field.hidden = !needsCode;
input.value = '';
document.getElementById('handoverError').textContent = job.handoverLocked
? 'Too many wrong codes. Call the TechRider admin to unlock this delivery.'
: '';
document.getElementById('handoverHelp').textContent =
`Ask ${job.to.name} for the 4-digit code in their TechRider app, once they have the device.`;

document
.getElementById('completeModal')
.style.display = 'flex';

setTimeout(() => (needsCode ? input : document.getElementById('completeConfirmBtn')).focus(), 30);

}

function closeCompleteModal(){

document
.getElementById('completeModal')
.style.display = 'none';

selectedJobId = null;

}

/* =========================
PICKED UP / DELIVERED
These also move the customer's repair along.
========================= */
async function confirmCompleteDelivery(){

const job = activeJobs.find(j => j.id === selectedJobId);
const next = job && NEXT_STEP[job.status];
if(!next) return;

const button = document.getElementById('completeConfirmBtn');
const needsCode = job.status === 'picked_up' && job.needsHandoverCode;
const code = document.getElementById('handoverInput').value.replace(/\D/g, '');
const errorBox = document.getElementById('handoverError');

if(needsCode && code.length !== 4){
errorBox.textContent = 'Enter the 4-digit code.';
document.getElementById('handoverInput').focus();
return;
}

button.disabled = true;

try{

await TechRiderAPI.post(`/deliveries/${encodeURIComponent(job.id)}/${next.path}`, needsCode ? { code } : undefined);

closeCompleteModal();
TR.toast(next.done, 'success');

}catch(err){

// a wrong code keeps the box open so the rider can try again
if(needsCode && (err.status === 400 || err.status === 409)){
errorBox.textContent = err.message;
button.disabled = false;
document.getElementById('handoverInput').select();
return;
}
closeCompleteModal();
TR.toast(err.message, "error");

}finally{

button.disabled = false;

}

fetchActive();

}

/* =========================
CLOSE MODAL ON OUTSIDE CLICK
========================= */
window.onclick = function(e){

const completeModal =
document.getElementById('completeModal');

if(e.target === completeModal){
closeCompleteModal();
}

};

/* =========================
INIT
Refreshes every 30 seconds in case the admin cancels a delivery.
========================= */
document.getElementById('jobsContainer').innerHTML = TR.skeleton(1);

document.getElementById('handoverInput').addEventListener('keydown', e => {
if(e.key === 'Enter') confirmCompleteDelivery();
});

(async function init(){

if(!(await TechRiderAPI.ready)) return;

fetchActive();

setInterval(() => {
if(!document.hidden && !selectedJobId) fetchActive();
}, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
if(!selectedJobId) fetchActive();
});
