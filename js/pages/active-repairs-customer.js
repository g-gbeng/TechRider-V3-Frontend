/* Scripts for active-repairs-customer.html */

/* =========================================
ELEMENTS
========================================= */

const repairsGrid = document.getElementById('repairsGrid');
const emptyState = document.getElementById('emptyState');

const esc = TechRiderAPI.escapeHtml;

let repairs = [];
let loadedOnce = false;

/* =========================================
FORMAT HELPERS
========================================= */

function formatDate(dateString){
  if(!dateString) return 'Recently';
  return new Date(dateString).toLocaleString('en-NG', {
    day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit'
  });
}

const formatNaira = TR.naira;

/* =========================================
PROGRESS BAR
Six steps from request to return.
========================================= */

const STEPS = [
  { label:'Requested', icon:'fa-file-circle-plus' },
  { label:'Quote', icon:'fa-file-invoice' },
  { label:'Paid', icon:'fa-credit-card' },
  { label:'Collected', icon:'fa-motorcycle' },
  { label:'Repairing', icon:'fa-screwdriver-wrench' },
  { label:'Returned', icon:'fa-house-circle-check' }
];

const STEP_OF = {
  awaiting_technician:0, quoted:0,
  quote_sent:1,
  quote_accepted:2,
  pickup_in_transit:3,
  repair_in_progress:4,
  repair_done:5, return_in_transit:5,
  completed:6
};

function progressBar(repair){

  const at = STEP_OF[repair.status] ?? 0;

  return `
    <ol class="progress" aria-label="Repair progress: step ${Math.min(at + 1, STEPS.length)} of ${STEPS.length}, ${esc(STEPS[Math.min(at, STEPS.length - 1)].label)}">
      ${STEPS.map((step, i) => `
        <li class="${i < at ? 'done' : i === at ? 'current' : ''}">
          <span class="dot"><i class="fas ${i < at ? 'fa-check' : step.icon}" aria-hidden="true"></i></span>
          <span class="label">${step.label}</span>
        </li>`).join('')}
    </ol>`;

}

/* =========================================
STATUS DISPLAY
========================================= */

function getStatusClass(repair){

  if(repair.needsTechnician) return 'pending';

  switch(repair.status){
    case 'quote_sent':
      return 'quote';
    case 'quote_accepted':
    case 'pickup_in_transit':
    case 'repair_in_progress':
    case 'repair_done':
    case 'return_in_transit':
      return 'in-progress';
    case 'cancelled':
    case 'quote_rejected':
      return 'cancelled';
    default:
      return 'pending';
  }

}

function getStatusMessage(repair){

  if(repair.needsTechnician){
    return repair.technician === null && repair.timeline.some(t => t.role === 'technician')
      ? 'The technician you chose could not take this job. Please choose another technician.'
      : 'Choose a technician to send this request to.';
  }

  const riderComing = repair.rider && repair.rider.active;

  switch(repair.status){
    case 'awaiting_technician':
      return `Waiting for ${repair.technician ? repair.technician.fullName : 'the technician'} to look at your request and send a price.`;
    case 'quoted':
      return 'The technician has priced the repair. TechRider is checking it and will send your quote shortly.';
    case 'quote_sent':
      return repair.paymentPending
        ? 'If you already paid, it can take a moment to confirm. Otherwise accept and pay below.'
        : 'Your quote is ready. Accept and pay to book the pickup, or decline it.';
    case 'quote_accepted':
      return riderComing
        ? `Payment received. ${repair.rider.fullName} will collect your device.`
        : 'Payment received. We are assigning a rider to collect your device.';
    case 'pickup_in_transit':
      return 'Your device has been collected and is on its way to the technician.';
    case 'repair_in_progress':
      return 'The technician is working on your device. Questions? Message TechRider support below.';
    case 'repair_done':
      return riderComing
        ? `The repair is finished. ${repair.rider.fullName} will bring your device back.`
        : 'The repair is finished. We are assigning a rider to bring your device back.';
    case 'return_in_transit':
      return 'Your device is on its way back to you. Have your handover code ready.';
    default:
      return repair.statusLabel;
  }

}

/* What the customer should do now, if anything */
function nextAction(repair){

  if(repair.needsTechnician){
    return `<a class="action-btn primary big" href="select-technician.html?request=${encodeURIComponent(repair.id)}">
              <i class="fas fa-user-gear"></i> Choose a technician
            </a>`;
  }

  if(repair.status === 'quote_sent' && repair.quote){
    return `<button class="action-btn primary big" data-action="accept" data-id="${esc(repair.id)}">
              <i class="fas fa-lock"></i> Approve &amp; pay ${formatNaira(repair.quote.customerPrice)}
            </button>`;
  }

  return '';

}

/* =========================================
RIDER + HANDOVER CODE
========================================= */

function riderBlock(repair){

  const rider = repair.rider;

  if(!rider || !rider.active) return '';

  const trip = rider.deliveryType === 'return' ? 'bringing your device back' : 'collecting your device';

  return `
    <div class="rider-box">
      <div class="rider-line">
        <span class="rider-icon"><i class="fas fa-motorcycle"></i></span>
        <div>
          <strong>${esc(rider.fullName)}</strong> is ${trip}
          <small>${esc(rider.deliveryStatusLabel || '')}${rider.vehicleType ? ' · ' + esc(rider.vehicleType) : ''}</small>
        </div>
        ${rider.phone
          ? `<a class="action-btn secondary small" href="tel:${esc(rider.phone)}"><i class="fas fa-phone"></i> Call</a>`
          : '<span class="rider-wait">Phone shown once they accept</span>'}
      </div>
      ${rider.handoverCode ? `
        <div class="tr-handover">
          <div class="code" aria-label="Handover code ${esc(rider.handoverCode.split('').join(' '))}">${esc(rider.handoverCode)}</div>
          <p><strong>Your handover code.</strong> Only read it out to the rider once your device is in your hands.</p>
        </div>` : ''}
    </div>`;

}

/* =========================================
SECONDARY BUTTONS
========================================= */

function secondaryActions(repair){

  const buttons = [];

  buttons.push(
    `<button class="action-btn secondary tr-chat-btn" data-chat="${esc(repair.id)}" data-chat-title="${esc(repair.code)} · ${esc(repair.brand)} ${esc(repair.model)}">
       <i class="fas fa-headset"></i> Message support
     </button>`
  );

  if(repair.status === 'quote_sent' && repair.quote){
    buttons.push(
      `<button class="action-btn secondary" data-action="reject" data-id="${esc(repair.id)}">
         Decline quote
       </button>`
    );
  }

  if(repair.canCancel && repair.status !== 'quote_sent'){
    buttons.push(
      `<button class="action-btn danger" data-action="cancel" data-id="${esc(repair.id)}">
         Cancel request
       </button>`
    );
  }

  return `<div class="card-actions">${buttons.join('')}</div>`;

}

/* =========================================
RENDER ACTIVE REPAIRS
========================================= */

function issueText(repair){

  const parts = [];
  if(repair.faults && repair.faults.length) parts.push(repair.faults.join(' · '));
  if(repair.description) parts.push(repair.description);
  return parts.join('\n');

}

function renderRepairs(){

  if(repairs.length === 0){
    repairsGrid.innerHTML = '';
    emptyState.innerHTML = TR.empty({
      icon:'fa-screwdriver-wrench',
      title:'No active repairs',
      text:'When you request a repair, you can follow every step here, from quote to pickup to return.',
      action:{ label:'Request a repair', href:'repair-request.html', icon:'fa-plus' }
    });
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  repairsGrid.innerHTML = repairs.map(repair => {

    const statusClass = getStatusClass(repair);
    const statusLabel = repair.needsTechnician ? 'Choose technician' : repair.statusLabel;
    const action = nextAction(repair);

    return `
      <article class="repair-card">

        <div class="top">
          <div>
            <h3 class="title">${esc(repair.brand)} ${esc(repair.model)}</h3>
            <div class="request-id">${esc(repair.code)} · ${esc(repair.deviceType)}</div>
          </div>
          <div class="status ${statusClass}">${esc(statusLabel)}</div>
        </div>

        ${progressBar(repair)}

        <div class="next-step ${statusClass}">
          <p>${esc(getStatusMessage(repair))}</p>
          ${repair.status === 'quote_sent' && repair.quote ? `
            <div class="quote-box">
              <span>Repair price (includes pickup and return)</span>
              <strong>${formatNaira(repair.quote.customerPrice)}</strong>
            </div>` : ''}
          ${action}
          ${repair.status === 'quote_sent' ? '<div class="test-banner-slot"></div>' : ''}
        </div>

        ${riderBlock(repair)}

        <details class="more">
          <summary>Repair details</summary>
          <div class="details">
            <div><i class="fas fa-user-gear"></i><strong>Technician:</strong> ${esc(repair.technician ? repair.technician.fullName : 'Not chosen yet')}</div>
            <div><i class="fas fa-location-dot"></i><strong>Address:</strong> ${esc(repair.location)}${repair.landmark ? ` (${esc(repair.landmark)})` : ''}</div>
            ${repair.quote && repair.status !== 'quote_sent' ? `<div><i class="fas fa-receipt"></i><strong>Price:</strong> ${formatNaira(repair.quote.customerPrice)}</div>` : ''}
            <div><i class="fas fa-clock"></i><strong>Requested:</strong> ${esc(formatDate(repair.createdAt))}</div>
          </div>
          <div class="desc"><strong>Problem</strong><br>${esc(issueText(repair))}</div>
        </details>

        ${secondaryActions(repair)}

      </article>`;

  }).join('');

  repairsGrid.querySelectorAll('.test-banner-slot').forEach(slot => TR.paymentsBanner(slot));
  TR.chat.refreshBadges();

}

/* =========================================
ACTIONS
========================================= */

async function acceptQuote(id, button){

  const repair = repairs.find(r => r.id === id);

  const ok = await TR.confirm({
    title:`Pay ${formatNaira(repair.quote.customerPrice)}?`,
    message:`You'll be taken to Paystack to pay securely for ${repair.code}. Once paid, we'll send a rider to collect your device.`,
    confirmText:'Continue to payment',
    icon:'fa-lock'
  });

  if(!ok) return;

  button.disabled = true;

  try{

    const result = await TechRiderAPI.post(`/requests/${encodeURIComponent(id)}/quote/accept`);

    /* go to Paystack (or the test-payment page in development) */
    window.location.href = result.authorizationUrl;

  }catch(err){

    TR.toast(err.message, 'error');
    button.disabled = false;

  }

}

async function rejectQuote(id, button){

  const ok = await TR.confirm({
    title:'Decline this quote?',
    message:'The repair request will be closed. You can always make a new request later.',
    confirmText:'Decline quote',
    cancelText:'Keep it',
    danger:true
  });

  if(!ok) return;

  button.disabled = true;

  try{
    await TechRiderAPI.post(`/requests/${encodeURIComponent(id)}/quote/reject`);
    TR.toast('Quote declined.', 'info');
    await loadRepairs();
  }catch(err){
    TR.toast(err.message, 'error');
    button.disabled = false;
  }

}

async function cancelRequest(id, button){

  const reason = await TR.prompt({
    title:'Cancel this repair request?',
    label:'Tell us why (optional)',
    placeholder:'e.g. I found a fix myself',
    multiline:true,
    maxLength:500,
    confirmText:'Cancel request',
    cancelText:'Keep it',
    danger:true
  });

  if(reason === null) return;

  button.disabled = true;

  try{
    await TechRiderAPI.post(`/requests/${encodeURIComponent(id)}/cancel`, { reason });
    TR.toast('Request cancelled.', 'info');
    await loadRepairs();
  }catch(err){
    TR.toast(err.message, 'error');
    button.disabled = false;
  }

}

repairsGrid.addEventListener('click', (e) => {

  const button = e.target.closest('button[data-action]');

  if(!button) return;

  const id = button.dataset.id;

  if(button.dataset.action === 'accept') acceptQuote(id, button);
  if(button.dataset.action === 'reject') rejectQuote(id, button);
  if(button.dataset.action === 'cancel') cancelRequest(id, button);

});

/* =========================================
LOAD
========================================= */

async function loadRepairs(){

  // keep open "Repair details" sections open across refreshes
  const open = [...repairsGrid.querySelectorAll('details.more[open]')]
    .map(d => d.closest('.repair-card').querySelector('.request-id').textContent);

  try{

    const data = await TechRiderAPI.get('/requests?scope=active');
    repairs = data.requests;
    loadedOnce = true;

  }catch(err){

    if(!loadedOnce){
      repairsGrid.innerHTML = '';
      emptyState.innerHTML = TR.empty({ icon:'fa-wifi', title:"Couldn't load your repairs", text: err.message });
      emptyState.style.display = 'block';
    }else{
      TR.toast('Could not refresh your repairs: ' + err.message, 'error');
    }
    return;

  }

  renderRepairs();

  repairsGrid.querySelectorAll('.repair-card').forEach(card => {
    if(open.includes(card.querySelector('.request-id').textContent)) card.querySelector('details.more').open = true;
  });

}

repairsGrid.innerHTML = TR.skeleton(2);

(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  await loadRepairs();

  /* Live updates: refresh as soon as the server says something changed */
  TechRiderAPI.onUpdate(loadRepairs);

  // fallback when live updates aren't available
  setInterval(() => { if(!document.hidden && !document.querySelector('.tr-dialog-backdrop, .tr-chat-backdrop')) loadRepairs(); }, 60000);

})();
