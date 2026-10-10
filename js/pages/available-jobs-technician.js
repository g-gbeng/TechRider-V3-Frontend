/* Scripts for available-jobs-technician.html */

/* =========================================
LOGIN + SUSPENSION
Checked by the page guard in js/api.js
========================================= */

const esc = TechRiderAPI.escapeHtml;

/* Jobs sent to this technician (loaded from the server) */
let incomingJobs = [];

function toJob(r){

return {
id:r.id,
requestId:r.code,
brand:r.brand,
model:r.model,
deviceType:r.deviceType,
description:r.description,
location:r.location,
customerName:r.customer ? r.customer.fullName : '',
deviceImages:r.images || [],
createdAt:r.createdAt
};

}

async function loadJobs(){

try{

const data =
await TechRiderAPI.get('/requests?scope=incoming');

incomingJobs =
data.requests.map(toJob);

}catch(err){

alert('Could not load jobs: ' + err.message);

}

renderJobs();

}

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

const priceModal =
document.getElementById(
'priceModal'
);

let selectedJob = null;

/* =========================================
FETCH JOBS FOR CURRENT TECHNICIAN

IMPORTANT STORAGE KEY:
tech_jobs_${technicianId}
========================================= */

function getAvailableJobs(){

return incomingJobs;

}

/* =========================================
FORMAT DATE
========================================= */

function formatDate(dateString){

if(!dateString){
return 'Recently';
}

const date =
new Date(dateString);

return date.toLocaleString(
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
TOGGLE IMAGE DROPDOWN
========================================= */

function toggleImages(id){

const dropdown =
document.getElementById(id);

dropdown.classList.toggle('active');

}



/* =========================================
RENDER JOBS
========================================= */

function renderJobs(){

const availableJobs =
getAvailableJobs();

jobsGrid.innerHTML='';

if(availableJobs.length===0){

emptyState.style.display='block';

return;

}

emptyState.style.display='none';

availableJobs
.sort((a,b)=>
new Date(b.createdAt)
-
new Date(a.createdAt)
)
.forEach((job,index)=>{

const imageSectionId =
`imageSection_${index}`;

jobsGrid.innerHTML += `

<div class="card">

<div class="top">

<div class="issue">

${esc(job.brand || '')}
${esc(job.model || '')}
${job.deviceType
? `(${esc(job.deviceType)})`
: ''}

</div>

<div class="request-id">

${esc(job.requestId || 'REQ')}

</div>

</div>

<div class="details">

<div>
<i class="fas fa-mobile-alt"></i>

<strong>Device Type:</strong>

${esc(job.deviceType || 'N/A')}

</div>

<div>
<i class="fas fa-tag"></i>

<strong>Brand:</strong>

${esc(job.brand || 'N/A')}

</div>

<div>
<i class="fas fa-microchip"></i>

<strong>Model:</strong>

${esc(job.model || 'N/A')}

</div>

</div>

<div class="desc">

<strong>Issue Description:</strong>
<br><br>

${esc(job.description || 'No description provided.')}

</div>

<!-- DEVICE IMAGES -->

<div
class="image-dropdown"
id="${imageSectionId}">

<button
class="image-toggle"
onclick="toggleImages('${imageSectionId}')">

<span>
<i class="fas fa-images"></i>
Device Images
</span>

<i class="fas fa-chevron-down"></i>

</button>

<div class="image-content">

${
job.deviceImages &&
job.deviceImages.length > 0

? `

<div class="image-grid">

${job.deviceImages.map(image => `

<img
src="${esc(image)}"
class="device-image"
alt="Device Image">

`).join('')}

</div>

`

: `

<div class="no-images">

No device images were uploaded
for this repair request.

</div>

`
}

</div>

</div>

<div class="timestamp">

<i class="fas fa-clock"></i>

Requested:
${formatDate(job.createdAt)}

</div>

<div class="actions">

<button
class="btn accept"
onclick="openQuoteModal(${index})">

Accept Job

</button>

<button
class="btn reject"
onclick="rejectJob(${index})">

Reject

</button>

</div>

</div>

`;

});

}
/* =========================================
OPEN QUOTE MODAL
========================================= */

function openQuoteModal(index){

const jobs =
getAvailableJobs();

selectedJob =
jobs[index];

document.getElementById(
'repairPrice'
).value='';

document.getElementById(
'modalText'
).innerHTML = `

You are sending a repair quotation for
<strong>
${esc(selectedJob.requestId)}
</strong>.

`;

priceModal.classList.add('show');

}

/* =========================================
CLOSE MODAL
========================================= */

function closeModal(){

priceModal.classList.remove('show');

selectedJob = null;

}

/* =========================================
SEND QUOTATION
========================================= */

async function sendQuotation(){

const price =
document.getElementById(
'repairPrice'
).value.trim();

if(price==='' || Number(price)<=0){

alert(
'Please enter a valid repair amount.'
);

return;

}

if(!selectedJob){

return;

}

try{

await TechRiderAPI.post(
`/requests/${encodeURIComponent(selectedJob.id)}/quote`,
{ price:Number(price) }
);

alert(
'Repair quotation sent successfully. Job moved to Active Jobs.'
);

closeModal();

await loadJobs();

}catch(err){

alert(err.message);

}

}

/* =========================================
REJECT JOB
========================================= */

async function rejectJob(index){

const jobs =
getAvailableJobs();

const job =
jobs[index];

const confirmReject =
confirm(
'Are you sure you want to reject this repair request? The customer will be asked to choose another technician.'
);

if(!confirmReject){

return;

}

const reason = prompt(
'Reason (optional, shared with TechRider):',
''
);

if(reason === null){

return;

}

try{

await TechRiderAPI.post(
`/requests/${encodeURIComponent(job.id)}/decline`,
{ reason }
);

alert(
'Repair request rejected. The customer will choose another technician.'
);

await loadJobs();

}catch(err){

alert(err.message);

}

}

/* =========================================
CLOSE MODAL ON OUTSIDE CLICK
========================================= */

priceModal.addEventListener(
'click',
(e)=>{

if(e.target===priceModal){
closeModal();
}

}
);

/* =========================================
INITIAL LOAD
========================================= */

(async function init(){

if(!(await TechRiderAPI.ready)) return;

await loadJobs();

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
if(!selectedJob) loadJobs();
});

/* Fallback when live updates aren't available */
setInterval(() => {
if(!document.hidden && !selectedJob) loadJobs();
}, 30000);
