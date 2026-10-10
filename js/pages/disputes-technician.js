/* Scripts for disputes-technician.html */

/* Login is checked by the page guard in js/api.js */
const esc = TechRiderAPI.escapeHtml;

const timeFormat = { dateStyle:'medium', timeStyle:'short' };

/* =========================
   SUBMIT DISPUTE
========================= */
async function submitDispute(){

  const categoryInput = document.getElementById('disputeCategory');
  const jobInput = document.getElementById('jobId');
  const messageInput = document.getElementById('disputeMessage');
  const button = document.querySelector('.submitBtn');

  const category = categoryInput.value.trim();
  const jobId = jobInput.value.trim();
  const message = messageInput.value.trim();

  if(!category || !message){
    alert('Please choose a category and describe the issue.');
    return;
  }

  button.disabled = true;

  try{

    const { dispute } =
      await TechRiderAPI.post('/disputes', { category, jobId, message });

    categoryInput.value = '';
    jobInput.value = '';
    messageInput.value = '';

    alert(`Dispute ${dispute.code} submitted. TechRider will review it and notify you when it is settled.`);
    loadDisputes();

  }catch(err){

    alert(err.message);

  }finally{

    button.disabled = false;

  }

}

/* =========================
   LOAD DISPUTES
========================= */
async function loadDisputes(){

  const historyList = document.getElementById('historyList');
  let disputes = [];

  try{

    disputes = (await TechRiderAPI.get('/disputes/mine')).disputes;

  }catch(err){

    historyList.innerHTML = `<div class="emptyState">Could not load your disputes: ${esc(err.message)}</div>`;
    return;

  }

  if(disputes.length === 0){

    historyList.innerHTML = `
      <div class="emptyState">
        No disputes submitted yet
      </div>
    `;
    return;

  }

  historyList.innerHTML = disputes.map(dispute => `

    <div class="historyItem">

      <div class="historyTop">

        <div class="disputeId">
          ${esc(dispute.code)}
        </div>

        <div class="statusBadge ${dispute.status === 'settled' ? 'settled' : 'pending'}">
          ${esc(dispute.statusLabel)}
        </div>

      </div>

      <div class="historyMessage">
        ${esc(dispute.message)}
      </div>

      ${dispute.resolutionNote ? `
      <div class="resolutionNote">
        <strong>TechRider's response:</strong>
        ${esc(dispute.resolutionNote)}
      </div>` : ''}

      <div class="historyMeta">
        <strong>Category:</strong>
        ${esc(dispute.category)}
        <br>
        <strong>Job ID:</strong>
        ${esc(dispute.requestCode || 'N/A')}
        <br>
        <strong>Submitted:</strong>
        ${esc(new Date(dispute.createdAt).toLocaleString('en-NG', timeFormat))}
        ${dispute.settledAt ? `<br><strong>Settled:</strong> ${esc(new Date(dispute.settledAt).toLocaleString('en-NG', timeFormat))}` : ''}
      </div>

    </div>

  `).join('');

}

/* =========================
   BACK
========================= */
function goBack(){

  window.history.back();

}

/* INIT */
(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  loadDisputes();

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadDisputes);
