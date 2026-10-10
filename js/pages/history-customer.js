/* Scripts for history-customer.html */

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
location:r.location,
technicianName:r.technician ? r.technician.fullName : '',
repairPrice:r.quote ? (r.quote.customerPrice) : 0,
status:r.status === 'completed' ? 'completed' : 'cancelled',
statusLabel:r.statusLabel,
createdAt:r.createdAt,
updatedAt:r.updatedAt,
completedAt:r.completedAt || r.cancelledAt,
refund:r.refund,
refundDue:r.refundDue
};

}

/* Refund status for paid jobs that were cancelled */
const REFUND_TEXT = {
pending:'Refund started. We will tell you when it is complete.',
processing:'Your refund is being processed.',
processed:'Refunded to your original payment method.',
failed:'There was a problem with your refund. TechRider is looking into it.',
'needs-attention':'There was a problem with your refund. TechRider is looking into it.'
};

function refundNote(request){

if(request.refund){
const amount = '₦' + Number(request.refund.amount).toLocaleString();
return `<div class="refund-note ${request.refund.status === 'processed' ? 'done' : ''}"><strong>Refund ${amount}:</strong> ${esc(REFUND_TEXT[request.refund.status] || request.refund.status)}</div>`;
}

if(request.refundDue){
return `<div class="refund-note"><strong>Refund due:</strong> you paid for this repair, so TechRider will refund you.</div>`;
}

return '';

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
GET STATUS CLASS
========================================= */

function getStatusClass(status){

switch(
(status || '')
.toLowerCase()
){

case 'cancelled':
return 'cancelled';

default:
return 'completed';

}

}

/* =========================================
GET STATUS LABEL
========================================= */

function getStatusLabel(status, request){

if(request && request.statusLabel){
return request.statusLabel;
}

return (status || '').toLowerCase() === 'cancelled'
? 'Cancelled'
: 'Completed';

}

/* =========================================
GET HISTORY REQUESTS
========================================= */

function getHistoryRequests(){

return historyItems;

}

/* =========================================
RENDER HISTORY
========================================= */

function renderHistory(){

const historyRequests =
getHistoryRequests();

historyGrid.innerHTML = '';

/* EMPTY STATE */

if(historyRequests.length === 0){

emptyState.style.display =
'block';

return;

}

emptyState.style.display =
'none';

/* CREATE CARDS */

historyRequests.forEach(request => {

const currentStatus =
request.status || 'completed';

historyGrid.innerHTML += `

<div class="card">

<div class="top">

<div>

<div class="title">

${esc(request.brand || '')}
${esc(request.model || '')}

${request.deviceType
? `(${esc(request.deviceType)})`
: ''
}

</div>

<div class="request-id">

${request.requestId || request.id}

</div>

</div>

<div class="status
${getStatusClass(currentStatus)}">

${getStatusLabel(currentStatus, request)}

</div>

</div>

<div class="details">

<div>
<i class="fas fa-mobile-alt"></i>

<strong>Device Type:</strong>

${esc(request.deviceType || 'N/A')}

</div>

<div>
<i class="fas fa-tag"></i>

<strong>Brand:</strong>

${esc(request.brand || 'N/A')}

</div>

<div>
<i class="fas fa-microchip"></i>

<strong>Model:</strong>

${esc(request.model || 'N/A')}

</div>

<div>
<i class="fas fa-map-marker-alt"></i>

<strong>Location:</strong>

${esc(request.location || 'N/A')}

</div>

<div>
<i class="fas fa-user-cog"></i>

<strong>Technician:</strong>

${esc(request.technicianName || 'N/A')}

</div>

</div>

<div class="desc">

<strong>
Issue Description:
</strong>

<br><br>

${esc(request.description || 'No description provided.')}

</div>

${
request.repairPrice

? `

<div class="price-box">

<strong>
Final Repair Cost
</strong>

₦${Number(
request.repairPrice
).toLocaleString()}

</div>

`

: ''

}

${refundNote(request)}

<div class="footer">

<div>

<i class="fas fa-calendar-check"></i>

${currentStatus.toLowerCase() === 'cancelled'

? 'Cancelled'

: 'Completed'}

:

${formatDate(
request.updatedAt
||
request.completedAt
||
request.createdAt
)}

</div>

<div>

<i class="fas fa-receipt"></i>

Request ID:
${request.requestId || request.id}

</div>

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

alert('Could not load your history: ' + err.message);

}}

renderHistory();

}})();
