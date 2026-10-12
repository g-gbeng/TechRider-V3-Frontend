/* Scripts for admin-job-monitoring.html */

/* =====================================================
   SIDEBAR
===================================================== */

const sidebar =
document.getElementById('sidebar');

const overlay =
document.getElementById('overlay');

function toggleSidebar(){

    if(window.innerWidth <= 900){

        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');

        return;

    }

    sidebar.classList.toggle('collapsed');

}

function openSidebar(){

    sidebar.classList.add('open');
    overlay.classList.add('show');

}

overlay.onclick = function(){

    sidebar.classList.remove('open');
    overlay.classList.remove('show');

};

/* =====================================================
   DATA (from the server)
===================================================== */

const esc = TechRiderAPI.escapeHtml;

/* Safe text for inside onclick="..." attributes */
const jsArg = (value) => esc(JSON.stringify(String(value ?? '')));

let jobs = [];

let commissionRate = 0.2;

const GROUPS = {
    pending: ['awaiting_technician', 'quoted', 'quote_sent'],
    accepted: ['quote_accepted', 'pickup_in_transit', 'repair_in_progress', 'repair_done', 'return_in_transit'],
    rejected: ['quote_rejected', 'cancelled'],
    completed: ['completed']
};

/* What the admin's "next step" buttons say */
const STEP_LABELS = {
    pickup_in_transit: 'Pickup started',
    repair_in_progress: 'Device with technician',
    return_in_transit: 'Return started',
    completed: 'Mark completed'
};

const BADGE_CLASS = {
    awaiting_technician: 'pending',
    quoted: 'pending',
    quote_sent: 'accepted',
    quote_accepted: 'accepted',
    pickup_in_transit: 'transit',
    repair_in_progress: 'transit',
    repair_done: 'accepted',
    return_in_transit: 'transit',
    completed: 'done',
    quote_rejected: 'rejected',
    cancelled: 'rejected'
};

async function loadJobs(){

    try{

        const data =
            await TechRiderAPI.get('/admin/requests');

        jobs = data.requests;

        commissionRate = data.commissionRate;

    }catch(err){

        TR.toast('Could not load jobs: ' + err.message);

    }

    renderAll();

}

/* =====================================================
   FORMATTING
===================================================== */

function formatNaira(value){

    if(value === undefined || value === null){
        return '<span style="color:#999;">—</span>';
    }

    return '₦' + Number(value).toLocaleString('en-NG');

}

function formatDate(value){

    if(!value){
        return '—';
    }

    const date = new Date(value);
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);

    if(minutes < 1) return 'Just now';
    if(minutes < 60) return `${minutes} min ago`;
    if(minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;

    return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

}

/* Rider column: who is on the trip, or a prompt to assign one */
function chatButton(job){

    return `<button class="btn viewBtn tr-chat-btn" data-chat="${esc(job.id)}" data-chat-title="${esc(job.code)} · ${esc(job.brand)} ${esc(job.model)}"><i class="fas fa-comments"></i> Messages</button>`;

}

function riderCell(job){

    if(job.rider && job.rider.active){
        return `${esc(job.rider.fullName)}<br><span class="riderNote">${esc(job.rider.deliveryTypeLabel)}: ${esc(job.rider.deliveryStatusLabel)}</span>` +
            (job.rider.handoverCode ? `<br><span class="riderNote" title="The receiver reads this to the rider">Handover code: <strong>${esc(job.rider.handoverCode)}</strong></span>` : '');
    }

    if(job.needsRider){
        return `<a class="assignLink" href="admin-communications.html">Assign rider (${esc(job.riderTripType)})</a>`;
    }

    if(job.rider){
        return `${esc(job.rider.fullName)}<br><span class="riderNote">${esc(job.rider.deliveryTypeLabel)}: ${esc(job.rider.deliveryStatusLabel)}</span>`;
    }

    return '<span style="color:#999;">—</span>';

}

function badge(job){

    return `<span class="badge ${BADGE_CLASS[job.status] || 'pending'}">${esc(job.statusLabel)}</span>`;

}

function deviceCell(job){

    return `<span class="deviceLink" onclick="showIssue(${jsArg(job.id)})" title="Show the reported issue">
${esc(job.brand)} ${esc(job.model)}
</span>`;

}

function timelineHtml(job){

    return job.timeline
        .map(t => `${esc(new Date(t.at).toLocaleString('en-GB'))}: ${esc(t.label)}${t.note ? ' — ' + esc(t.note) : ''}`)
        .join('<br>');

}

function searchText(job){

    return [
        job.code, job.customer && job.customer.fullName, job.technician && job.technician.fullName,
        job.brand, job.model, job.deviceType, job.statusLabel,
        job.rider && job.rider.fullName
    ].join(' ').toLowerCase();

}

/* =====================================================
   RENDER
===================================================== */

function renderPending(rows){

    const tbody = document.getElementById('pendingRequestsTable');

    if(rows.length === 0){
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#777;">No pending repair requests.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(job => {

        const q = job.quote || {};

        /* Before the quote is sent, show what the customer WOULD pay at today's rate */
        const preview = q.technicianPrice != null && !q.customerPrice
            ? {
                commission: Math.round(q.technicianPrice * commissionRate),
                customerPrice: q.technicianPrice + Math.round(q.technicianPrice * commissionRate)
              }
            : q;

        let action = '';

        if(job.status === 'quoted'){
            action = `<button class="btn sendQuoteBtn" onclick="sendQuote(${jsArg(job.id)}, this)">Send Quote</button>`;
        }else if(job.status === 'quote_sent'){
            action = `<button class="btn quoteSentBtn" disabled>Quote Sent</button>`;
        }

        return `
<tr data-search="${esc(searchText(job))}">
<td>${esc(job.code)}</td>
<td>${esc(job.customer ? job.customer.fullName : '—')}</td>
<td>${deviceCell(job)}</td>
<td>${esc(job.technician ? job.technician.fullName : (job.declinedCount ? 'Declined, customer choosing again' : 'Not chosen yet'))}</td>
<td class="quoteAmount">${formatNaira(q.technicianPrice)}</td>
<td class="customerPrice">${formatNaira(preview.customerPrice)}</td>
<td class="commissionAmount">${formatNaira(preview.commission)}</td>
<td>${badge(job)}</td>
<td>${formatDate(job.updatedAt)}</td>
<td>
${action}
<button class="btn cancelStatusBtn" onclick="cancelJob(${jsArg(job.id)}, this)">Cancel</button>
</td>
</tr>`;

    }).join('');

}

function renderAccepted(rows){

    const tbody = document.getElementById('acceptedTable');

    if(rows.length === 0){
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#777;">No jobs in progress.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(job => {

        const steps = job.nextSteps
            .filter(step => step !== 'cancelled')
            .map(step => `<button class="btn ${step === 'completed' ? 'completeBtn' : 'stepBtn'}" onclick="moveJob(${jsArg(job.id)}, ${jsArg(step)}, this)">${esc(STEP_LABELS[step] || step)}</button>`)
            .join('');

        const waiting = job.status === 'repair_in_progress'
            ? '<span class="riderNote">Waiting for the technician to mark it done</span>'
            : job.riderOnJob
            ? '<span class="riderNote">The rider moves this job along</span>'
            : job.needsRider && steps
            ? '<span class="riderNote">No rider? Move it by hand:</span>'
            : '';

        return `
<tr data-search="${esc(searchText(job))}">
<td>${esc(job.code)}</td>
<td>${esc(job.customer ? job.customer.fullName : '—')}</td>
<td>${deviceCell(job)}</td>
<td>${esc(job.technician ? job.technician.fullName : '—')}</td>
<td>${badge(job)}</td>
<td>${riderCell(job)}</td>
<td>${formatDate(job.updatedAt)}</td>
<td>
<button class="btn viewBtn" onclick="toggleTimeline(this)">Timeline</button>
${chatButton(job)}
${waiting}${steps}
<button class="btn cancelStatusBtn" onclick="cancelJob(${jsArg(job.id)}, this)">Cancel</button>
<div class="timeline">${timelineHtml(job)}</div>
</td>
</tr>`;

    }).join('');

}

function renderRejected(rows){

    const tbody = document.getElementById('rejectedTable');

    if(rows.length === 0){
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#777;">No declined or cancelled requests.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(job => {

        const outcome = job.status === 'quote_rejected'
            ? 'Customer declined the quote'
            : 'Cancelled' + (job.cancelReason ? ': ' + job.cancelReason : '');

        return `
<tr data-search="${esc(searchText(job))}">
<td>${esc(job.customer ? job.customer.fullName : '—')}</td>
<td>${deviceCell(job)}</td>
<td>
${esc(outcome)}
${refundCell(job)}
</td>
<td>${formatDate(job.updatedAt)}</td>
<td>
<button class="btn viewBtn" onclick="toggleTimeline(this)">Timeline</button>
${chatButton(job)}
<div class="timeline">${timelineHtml(job)}</div>
</td>
</tr>`;

    }).join('');

}

function renderCompleted(rows){

    const tbody = document.getElementById('completedTable');

    if(rows.length === 0){
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#777;">No completed jobs yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(job => `
<tr data-search="${esc(searchText(job))}">
<td>${esc(job.code)}</td>
<td>${esc(job.customer ? job.customer.fullName : '—')}</td>
<td>${deviceCell(job)}</td>
<td>${esc(job.technician ? job.technician.fullName : '—')}</td>
<td>${badge(job)}</td>
<td>${riderCell(job)}</td>
<td>${formatDate(job.completedAt || job.updatedAt)}</td>
<td>
<button class="btn viewBtn" onclick="toggleTimeline(this)">Timeline</button>
${chatButton(job)}
<div class="timeline">${timelineHtml(job)}</div>
</td>
</tr>`).join('');

}

function renderAll(){

    const inGroup = (group) => jobs.filter(job => GROUPS[group].includes(job.status));

    renderPending(inGroup('pending'));
    renderAccepted(inGroup('accepted'));
    renderRejected(inGroup('rejected'));
    renderCompleted(inGroup('completed'));

    document.getElementById('commissionInput').value =
        Math.round(commissionRate * 1000) / 10;

    applyFilter();

    TR.chat.refreshBadges();

}

/* =====================================================
   ACTIONS
===================================================== */

async function sendQuote(id, button){

    const job = jobs.find(j => j.id === id);
    const base = job.quote.technicianPrice;
    const commission = Math.round(base * commissionRate);

    const confirmed = await TR.confirm({
        title: `Send quote to ${job.customer.fullName}?`,
        message:
            `Technician quote: ₦${base.toLocaleString('en-NG')}\n` +
            `Platform commission (${Math.round(commissionRate * 1000) / 10}%): ₦${commission.toLocaleString('en-NG')}\n` +
            `Customer pays: ₦${(base + commission).toLocaleString('en-NG')}`,
        confirmText: 'Send quote',
        icon: 'fa-file-invoice'
    });

    if(!confirmed) return;

    button.disabled = true;

    try{
        await TechRiderAPI.post(`/admin/requests/${encodeURIComponent(id)}/send-quote`);
        await loadJobs();
    }catch(err){
        TR.toast(err.message, "error");
        button.disabled = false;
    }

}

async function moveJob(id, status, button){

    const job = jobs.find(j => j.id === id);

    if(!(await TR.confirm({ title: `${STEP_LABELS[status] || status}?`, message: `This moves ${job.code} along and tells the customer.`, confirmText: STEP_LABELS[status] || 'Confirm' }))) return;

    button.disabled = true;

    try{
        await TechRiderAPI.patch(`/admin/requests/${encodeURIComponent(id)}/status`, { status });
        await loadJobs();
    }catch(err){
        TR.toast(err.message, "error");
        button.disabled = false;
    }

}

/* =====================================================
   REFUNDS
===================================================== */

const REFUND_LABELS = {
    pending: 'Refund requested',
    processing: 'Refund processing',
    processed: 'Refunded',
    failed: 'Refund failed',
    'needs-attention': 'Refund needs attention'
};

function refundCell(job){

    const r = job.refund;

    if(r && r.status === 'processed'){
        return `<br><span class="refundFlag done">Refunded ${formatNaira(r.amount)}</span>`;
    }

    let html = '';

    if(r){
        html += `<br><span class="refundFlag ${r.status === 'failed' || r.status === 'needs-attention' ? 'bad' : ''}">${esc(REFUND_LABELS[r.status] || r.status)}: ${formatNaira(r.amount)}</span>`;
    }else if(job.refundDue){
        html += '<br><span class="refundFlag">Refund due: customer had paid</span>';
    }

    if(job.canRefund){
        const amount = job.quote ? job.quote.customerPrice : null;
        html += `<br><button class="btn refundBtn" onclick="refundJob(${jsArg(job.id)}, this)">Refund ${amount ? formatNaira(amount) : ''}</button>`;
    }

    return html;

}

async function refundJob(id, button){

    const job = jobs.find(j => j.id === id);
    const amount = job.quote ? formatNaira(job.quote.customerPrice) : 'the payment';

    const note = await TR.prompt({
        title: `Refund ${amount}?`,
        message: `The money for ${job.code} goes back to the customer's original payment method.`,
        label: 'Note for your records (optional, the customer does not see this)',
        multiline: true,
        confirmText: `Refund ${amount}`,
        icon: 'fa-rotate-left'
    });
    if(note === null) return;

    button.disabled = true;

    try{
        const { request } = await TechRiderAPI.post(`/admin/requests/${encodeURIComponent(id)}/refund`, { note });
        const status = request.refund ? request.refund.status : '';
        TR.toast(status === 'processed'
            ? `Refund of ${amount} completed.`
            : `Refund of ${amount} started. Paystack usually completes refunds within a few days; this page will update when it does.`);
        await loadJobs();
    }catch(err){
        TR.toast(err.message, "error");
        button.disabled = false;
    }

}

/* Ask Paystack now about unfinished payments and refunds in progress */
async function checkPayments(button){

    button.disabled = true;

    try{
        const { summary } = await TechRiderAPI.post('/admin/payments/reconcile');
        const parts = [
            `${summary.paymentsChecked} unfinished payment${summary.paymentsChecked === 1 ? '' : 's'} checked, ${summary.paymentsConfirmed} confirmed`,
            `${summary.refundsChecked} refund${summary.refundsChecked === 1 ? '' : 's'} in progress checked, ${summary.refundsUpdated} updated`
        ];
        if(summary.errors) parts.push(`${summary.errors} could not be checked (see the server log)`);
        TR.toast(parts.join('.\n') + '.');
        await loadJobs();
    }catch(err){
        TR.toast(err.message, "error");
    }finally{
        button.disabled = false;
    }

}

document.getElementById('checkPaymentsBtn').addEventListener('click', e => checkPayments(e.currentTarget));

async function cancelJob(id, button){

    const job = jobs.find(j => j.id === id);

    const reason = await TR.prompt({
        title: `Cancel ${job.code}?`,
        message: 'The customer and technician will see your reason.' +
            (job.paidAt ? '\n\nThe customer has paid, so this job will be flagged for a refund.' : ''),
        label: 'Reason',
        multiline: true,
        required: 'A reason is required to cancel a job.',
        confirmText: 'Cancel job',
        cancelText: 'Keep job',
        danger: true
    });

    if(reason === null) return;

    button.disabled = true;

    try{
        await TechRiderAPI.patch(`/admin/requests/${encodeURIComponent(id)}/status`, { status:'cancelled', note:reason.trim() });
        await loadJobs();
    }catch(err){
        TR.toast(err.message, "error");
        button.disabled = false;
    }

}

/* Commission rate (affects quotes sent from now on) */
document
.getElementById('commissionForm')
.addEventListener('submit', async (e) => {

    e.preventDefault();

    const percent = Number(document.getElementById('commissionInput').value);

    if(!Number.isFinite(percent) || percent < 0 || percent > 50){
        TR.toast('Commission must be between 0% and 50%.');
        return;
    }

    if(!(await TR.confirm({ title: `Set commission to ${percent}%?`, message: 'This applies to quotes sent from now on. Quotes already sent keep their price.', confirmText: 'Save commission', icon: 'fa-percent' }))){
        return;
    }

    try{
        const { settings } = await TechRiderAPI.put('/admin/settings', { commissionRate:percent / 100 });
        commissionRate = settings.commissionRate;
        renderAll();
        TR.toast(`Commission saved: ${Math.round(commissionRate * 1000) / 10}%`);
    }catch(err){
        TR.toast(err.message, "error");
    }

});

/* =====================================================
   SECTIONS, TIMELINE, ISSUE MODAL
===================================================== */

function toggleSection(el){

    el.parentElement.classList.toggle('collapsed');

}

function toggleTimeline(btn){

    btn.closest('tr').classList.toggle('showTimeline');

}

function showIssue(id){

    const job = jobs.find(j => j.id === id);

    document.getElementById('issueText').innerText =
        job
        ? `${job.brand} ${job.model} (${job.deviceType})\n\n${(job.faults || []).join(', ')}${job.faults && job.faults.length && job.description ? '\n' : ''}${job.description || ''}\n\nLocation: ${job.location}${job.landmark ? ' (' + job.landmark + ')' : ''}${job.contactPhone ? '\nContact phone: ' + job.contactPhone : ''}`
        : '';

    document.getElementById('issueModal').classList.add('show');

}

function closeIssue(){

    document.getElementById('issueModal').classList.remove('show');

}

/* =====================================================
   FILTERING
===================================================== */

function applyFilter(){

    const q =
        document.getElementById('searchBox').value.trim().toLowerCase();

    const group =
        document.getElementById('sectionFilter').value;

    document
    .querySelectorAll('.filterGroup')
    .forEach(section => {
        section.style.display =
            group === 'all' || section.dataset.group === group
            ? 'block'
            : 'none';
    });

    document
    .querySelectorAll('tbody tr')
    .forEach(row => {
        const text = (row.dataset.search || row.innerText || '').toLowerCase();
        row.style.display = text.includes(q) ? 'table-row' : 'none';
    });

}

document.getElementById('searchBox').addEventListener('input', applyFilter);

document.getElementById('sectionFilter').addEventListener('change', applyFilter);

/* Refresh when the admin comes back to this tab */
document.addEventListener('visibilitychange', () => {
    if(!document.hidden) loadJobs();
});

/* =====================================================
   INITIAL LOAD
===================================================== */

(async function init(){

    if(!(await TechRiderAPI.ready)) return;

    await loadJobs();

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadJobs);

/* Fallback when live updates aren't available */
setInterval(() => {
    if(!document.hidden) loadJobs();
}, 60000);
