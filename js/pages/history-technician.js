/* Scripts for history-technician.html */

/* =========================================
HISTORY (loaded from the server)
========================================= */

const esc = TechRiderAPI.escapeHtml;

let historyItems = [];

/* Turn a server job into the fields this page displays */
function toHistoryItem(r){

return {
id:r.id,
requestId:r.code,
brand:r.brand,
model:r.model,
deviceType:r.deviceType,
description:r.description,
faults:r.faults || [],
landmark:r.landmark || '',
location:r.location,
technicianName:r.technician ? r.technician.fullName : '',
repairPrice:r.quote ? (r.quote.technicianPrice) : 0,
status:r.status === 'completed' ? 'completed' : 'cancelled',
statusLabel:r.statusLabel,
createdAt:r.createdAt,
updatedAt:r.updatedAt,
completedAt:r.completedAt || r.cancelledAt
};

}

/* =========================================
ELEMENTS
========================================= */

const historyGrid =
document.getElementById(
'historyGrid'
);

const emptyState =
document.getElementById(
'emptyState'
);

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
GET HISTORY JOBS
========================================= */

function getHistoryJobs(){

return historyItems;

}

/* =========================================
GET STATUS CLASS
========================================= */

function getStatusClass(status){

if(
(status || '').toLowerCase() ===
'cancelled'
){
return 'cancelled';
}

return 'completed';

}

/* =========================================
GET STATUS LABEL
========================================= */

function getStatusLabel(status, job){

if(job && job.statusLabel){
return job.statusLabel;
}

return (status || '').toLowerCase() === 'cancelled'
? 'Cancelled'
: 'Completed';

}

/* =========================================
RENDER HISTORY
========================================= */

function renderHistory(){

const historyJobs =
getHistoryJobs();

historyGrid.innerHTML = '';

if(historyJobs.length === 0){

emptyState.style.display =
'block';

return;

}

emptyState.style.display =
'none';

historyJobs
.sort((a,b)=>
new Date(
b.completedAt ||
b.cancelledAt ||
b.updatedAt ||
b.createdAt
)
-
new Date(
a.completedAt ||
a.cancelledAt ||
a.updatedAt ||
a.createdAt
)
)
.forEach(job => {

const currentStatus =
job.jobStatus ||
job.status ||
'Completed';

historyGrid.innerHTML += `

<div class="card">

<div class="top">

<div>

<div class="title">

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

<div class="status
${getStatusClass(currentStatus)}">

${getStatusLabel(currentStatus, job)}

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

${job.faults && job.faults.length ? `<div class="fault-tags">${job.faults.map(f => `<span class="tr-pill">${esc(f)}</span>`).join('')}</div>` : ''}
${esc(job.description || (job.faults && job.faults.length ? '' : 'No description provided.'))}

</div>

<div class="price-box">

Repair Quotation:
₦${Number(
job.repairPrice || 0
).toLocaleString()}

</div>

<div class="footer">

<i class="fas
${getStatusClass(currentStatus) === 'cancelled'
? 'fa-times-circle'
: 'fa-check-circle'
}"></i>

${getStatusClass(currentStatus) === 'cancelled'
? 'Cancelled'
: 'Completed'
}:

${formatDate(
job.completedAt ||
job.cancelledAt ||
job.updatedAt ||
job.createdAt
)}

</div>

</div>

`;

});

}

/* =========================================
INITIAL LOAD (from the server)
========================================= */

(async function init(){{

if(!(await TechRiderAPI.ready)) return;

try{{

const data =
await TechRiderAPI.get('/requests?scope=history');

historyItems =
data.requests.map(toHistoryItem);

}}catch(err){{

TR.toast('Could not load your history: ' + err.message);

}}

renderHistory();

}})();
