/* Scripts for active-jobs-technician.html */

/* =========================================
ELEMENTS
========================================= */

const jobsGrid =
document.getElementById(
'jobsGrid'
);

const emptyState =
document.getElementById(
'emptyState'
);

const esc = TechRiderAPI.escapeHtml;

/* Jobs this technician has quoted and is working on (from the server) */
let activeJobs = [];

/* =========================================
FORMAT HELPERS
========================================= */

function formatDate(dateString){

if(!dateString){
return 'Recently';
}

return new Date(dateString).toLocaleString(
'en-NG',
{
day:'numeric',
month:'short',
year:'numeric',
hour:'numeric',
minute:'2-digit'
}
);

}

/* =========================================
STATUS DISPLAY
========================================= */

function getStatusClass(status){

switch(status){
case 'repair_in_progress':
return 'progress';
case 'repair_done':
case 'return_in_transit':
return 'completed';
default:
return 'pending';
}

}

function getStatusMessage(status){

switch(status){
case 'quoted':
return 'Your quotation is with TechRider for review.';
case 'quote_sent':
return 'The quote has been sent to the customer. Waiting for them to accept and pay.';
case 'quote_accepted':
return 'The customer has paid. Waiting for the device to be picked up and delivered to you.';
case 'pickup_in_transit':
return 'A rider is bringing the device to you.';
case 'repair_in_progress':
return 'The device is with you. Mark the repair as done when you finish.';
case 'repair_done':
return 'Repair finished. TechRider is arranging the return to the customer.';
case 'return_in_transit':
return 'The device is on its way back to the customer.';
default:
return '';
}

}

/* =========================================
RENDER JOBS
========================================= */

function renderJobs(){

jobsGrid.innerHTML = '';

if(activeJobs.length === 0){
emptyState.innerHTML = TR.empty({
icon:'fa-screwdriver-wrench',
title:'No active jobs',
text:'Jobs you have quoted on will appear here. New requests show up in Available Jobs.',
action:{ label:'See available jobs', href:'available-jobs-technician.html' }
});
emptyState.style.display = 'block';
return;
}

emptyState.style.display = 'none';

activeJobs.forEach(job => {

const statusClass = getStatusClass(job.status);

jobsGrid.innerHTML += `
<div class="card">

<div class="top">
<div>
<div class="title">
${esc(job.brand)} ${esc(job.model)} (${esc(job.deviceType)})
</div>
<div class="request-id">
${esc(job.code)}
</div>
</div>

<div class="badge ${statusClass}">
${esc(job.statusLabel)}
</div>
</div>

<div class="details">
<div>
<i class="fas fa-mobile-alt"></i>
<strong>Device Type:</strong>
${esc(job.deviceType)}
</div>
<div>
<i class="fas fa-tag"></i>
<strong>Brand:</strong>
${esc(job.brand)}
</div>
<div>
<i class="fas fa-microchip"></i>
<strong>Model:</strong>
${esc(job.model)}
</div>
</div>

<div class="desc">
<strong>Problem:</strong>
${job.faults && job.faults.length ? `<div class="fault-tags">${job.faults.map(f => `<span class="tr-pill">${esc(f)}</span>`).join('')}</div>` : '<br>'}
${esc(job.description)}
</div>

<div class="price-box">
Repair Quotation:
₦${Number(job.quote ? job.quote.technicianPrice : 0).toLocaleString()}
</div>

<div class="status-message ${statusClass}">
${esc(getStatusMessage(job.status))}
</div>

${
job.rider && job.rider.active
? `<div class="rider-line">
<i class="fas fa-motorcycle"></i>
<strong>Rider:</strong>
${esc(job.rider.fullName)} (${esc(job.rider.deliveryTypeLabel)}: ${esc(job.rider.deliveryStatusLabel)})
${job.rider.phone ? `· <a href="tel:${esc(job.rider.phone)}">${esc(job.rider.phone)}</a>` : ''}
</div>
${job.rider.handoverCode ? `
<div class="tr-handover">
<div class="code" aria-label="Handover code ${esc(job.rider.handoverCode.split('').join(' '))}">${esc(job.rider.handoverCode)}</div>
<p><strong>Handover code.</strong> Read it to the rider only once the device is in your hands.</p>
</div>` : ''}`
: ''
}

${job.review ? `
<div class="review-line">
${TR.stars(job.review.rating)}
${job.review.comment ? `<q>${esc(job.review.comment)}</q>` : ''}
</div>` : ''}



${
job.status === 'repair_in_progress'
? `<button class="done-btn" data-id="${esc(job.id)}">
<i class="fas fa-check"></i> Mark repair done
</button>`
: ''
}

<div class="timestamp">
<i class="fas fa-clock"></i>
Updated:
${formatDate(job.updatedAt)}
</div>

</div>
`;

});


}

/* =========================================
MARK REPAIR DONE
========================================= */

jobsGrid.addEventListener('click', async (e) => {

const button = e.target.closest('.done-btn');

if(!button) return;

if(!(await TR.confirm({ title: 'Mark repair as done?', message: 'TechRider will arrange a rider to return the device to the customer.', confirmText: 'Yes, it\'s done', icon: 'fa-circle-check' }))){
return;
}

button.disabled = true;

try{

await TechRiderAPI.patch(
`/requests/${encodeURIComponent(button.dataset.id)}/status`,
{ status:'repair_done' }
);

await loadJobs();

}catch(err){

TR.toast(err.message, "error");
button.disabled = false;

}

});

/* =========================================
LOAD (and refresh every 30 seconds)
========================================= */

async function loadJobs(){

try{

const data =
await TechRiderAPI.get('/requests?scope=active');

activeJobs = data.requests;

}catch(err){

if(err.status !== 401) console.error(err);

}

renderJobs();

}

jobsGrid.innerHTML = TR.skeleton(2);

(async function init(){

if(!(await TechRiderAPI.ready)) return;

await loadJobs();

setInterval(loadJobs, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadJobs);
