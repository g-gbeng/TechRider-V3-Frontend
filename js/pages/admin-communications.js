/* Scripts for admin-communications.html */

/* =====================================================
   TECHRIDER COMMUNICATIONS CENTER
   Emails and in-app notifications to users, message
   templates, rider assignment and the communications log.
   Everything is sent and stored by the server.
   Login is checked by the page guard in js/api.js.
===================================================== */

function escapeHtml(value){
    return TechRiderAPI.escapeHtml(value);
}


/* =====================================================
   SIDEBAR
===================================================== */

const sidebar =
    document.getElementById('sidebar');

const overlay =
    document.getElementById('overlay');

function toggleSidebar(){

    if(window.innerWidth <= 950){
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

function closeSidebar(){
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

overlay.addEventListener('click', closeSidebar);

/* Desktop is always expanded; mobile starts closed */
function applySidebarState(){
    sidebar.classList.remove('collapsed');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

window.addEventListener('resize', applySidebarState);


/* =====================================================
   COLLAPSIBLE BLOCKS
===================================================== */

function toggleBlock(el){
    el.parentElement.classList.toggle('closed');
}


/* =====================================================
   RECIPIENT PICKERS (individual email / notification)
   The page's group values are customers, techs, riders.
===================================================== */

const GROUP_PARAM = {
    customers: 'customers',
    techs: 'technicians',
    riders: 'riders',
    all: 'all'
};

const recipientCache = {};

async function getUsersByType(group){

    const param = GROUP_PARAM[group];
    if(!param || param === 'all') return [];

    if(!recipientCache[param]){
        recipientCache[param] =
            TechRiderAPI.get(`/admin/recipients?group=${param}`)
            .then(data => data.users)
            .catch(err => {
                delete recipientCache[param];
                throw err;
            });
    }

    return recipientCache[param];

}

async function switchUsers(type, group){

    const box =
        document.getElementById(type === 'email' ? 'emailUsers' : 'notifyUsers');

    if(!box) return;

    const selectedId =
        box.querySelector('.userItem.selected')?.dataset.userId;

    let users = [];

    try{
        users = await getUsersByType(group);
    }catch(err){
        box.innerHTML = `<div class="userItem empty">Could not load users: ${escapeHtml(err.message)}</div>`;
        return;
    }

    if(users.length === 0){
        box.innerHTML = '<div class="userItem empty">No users found.</div>';
        return;
    }

    box.innerHTML = users.map(user => `
        <div
            class="userItem ${user.id === selectedId ? 'selected' : ''}"
            role="option"
            tabindex="0"
            data-user-id="${escapeHtml(user.id)}">
            ${escapeHtml(user.fullName)}
            <span class="userEmail">${escapeHtml(user.email)}${user.suspended ? ' · suspended' : ''}</span>
        </div>
    `).join('');

    filterUsers(
        type === 'email' ? 'emailSearch' : 'notifySearch',
        type === 'email' ? 'emailUsers' : 'notifyUsers'
    );

}

function selectUserItem(item){

    item.parentElement
        .querySelectorAll('.userItem')
        .forEach(el => el.classList.remove('selected'));

    item.classList.add('selected');

}

['emailUsers', 'notifyUsers'].forEach(id => {

    const box = document.getElementById(id);

    box.addEventListener('click', e => {
        const item = e.target.closest('.userItem[data-user-id]');
        if(item) selectUserItem(item);
    });

    box.addEventListener('keydown', e => {
        const item = e.target.closest('.userItem[data-user-id]');
        if(item && (e.key === 'Enter' || e.key === ' ')){
            e.preventDefault();
            selectUserItem(item);
        }
    });

});

function filterUsers(searchId, listId){

    const query =
        document.getElementById(searchId).value.trim().toLowerCase();

    document
        .getElementById(listId)
        .querySelectorAll('.userItem[data-user-id]')
        .forEach(item => {
            item.style.display =
                item.textContent.toLowerCase().includes(query) ? '' : 'none';
        });

}

function selectedUserId(listId){

    return document.querySelector(`#${listId} .userItem.selected`)?.dataset.userId || null;

}


/* =====================================================
   SENDING
===================================================== */

async function withButton(button, work){

    button.disabled = true;

    try{
        await work();
    }catch(err){
        TR.toast(err.message, "error");
    }finally{
        button.disabled = false;
    }

    refreshLog();

}

async function sendGroupNotification(button){

    const group = document.getElementById('notificationGroup').value;
    const title = document.getElementById('groupNotificationTitle').value.trim();
    const message = document.getElementById('groupNotificationMessage').value.trim();
    const priority = document.getElementById('notificationPriority').value.toLowerCase();

    if(!message){
        TR.toast('Please enter a notification message.');
        return;
    }

    const label = document.getElementById('notificationGroup').selectedOptions[0].text.trim();

    if(!(await TR.confirm({ title: 'Send notification?', message: `This goes to all ${label.toLowerCase()}.`, confirmText: 'Send', icon: 'fa-paper-plane' }))) return;

    withButton(button, async () => {

        const result = await TechRiderAPI.post('/admin/notifications', {
            audience: 'group',
            group: GROUP_PARAM[group],
            title,
            message,
            priority
        });

        document.getElementById('groupNotificationTitle').value = '';
        document.getElementById('groupNotificationMessage').value = '';
        TR.toast(`Notification sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`);

    });

}

function sendIndividualNotification(button){

    const userId = selectedUserId('notifyUsers');
    const title = document.getElementById('individualNotificationTitle').value.trim();
    const message = document.getElementById('individualNotificationMessage').value.trim();

    if(!userId){
        TR.toast('Please select a recipient.');
        return;
    }

    if(!message){
        TR.toast('Please enter a notification message.');
        return;
    }

    withButton(button, async () => {

        const result = await TechRiderAPI.post('/admin/notifications', {
            audience: 'individual',
            userId,
            title,
            message
        });

        document.getElementById('individualNotificationTitle').value = '';
        document.getElementById('individualNotificationMessage').value = '';
        TR.toast(`Notification sent to ${result.log.recipientLabel}.`);

    });

}

async function prepareEmail(mode, button){

    const isGroup = mode === 'group';

    const subjectInput =
        document.getElementById(isGroup ? 'groupEmailSubject' : 'individualEmailSubject');

    const messageInput =
        document.getElementById(isGroup ? 'groupEmailMessage' : 'individualEmailMessage');

    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    const body = { subject, message };

    if(isGroup){
        body.audience = 'group';
        body.group = GROUP_PARAM[document.getElementById('emailGroup').value];
    }else{
        body.audience = 'individual';
        body.userId = selectedUserId('emailUsers');
        if(!body.userId){
            TR.toast('Please select an email recipient.');
            return;
        }
    }

    if(!subject){
        TR.toast('Please enter an email subject.');
        return;
    }

    if(!message){
        TR.toast('Please enter an email message.');
        return;
    }

    if(isGroup){
        const label = document.getElementById('emailGroup').selectedOptions[0].text.trim();
        if(!(await TR.confirm({ title: 'Send email?', message: `This emails all ${label.toLowerCase()}.`, confirmText: 'Send email', icon: 'fa-envelope' }))) return;
    }

    withButton(button, async () => {

        const result = await TechRiderAPI.post('/admin/emails', body);

        subjectInput.value = '';
        messageInput.value = '';

        if(result.status === 'logged'){
            TR.toast(`Email prepared for ${result.sent} ${result.sent === 1 ? 'person' : 'people'}. Email sending is not set up on the server yet, so it was printed in the server terminal instead of delivered.`);
        }else if(result.failed){
            TR.toast(`Email sent to ${result.sent}; ${result.failed} could not be sent.`);
        }else{
            TR.toast(`Email sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`);
        }

    });

}


/* =====================================================
   TEMPLATES
   Each message box has a "Use a template" picker that
   fills its subject/title and message.
===================================================== */

async function loadTemplatePickers(){

    let templates = [];

    try{
        templates = (await TechRiderAPI.get('/admin/templates')).templates;
    }catch(err){
        return;
    }

    document.querySelectorAll('.templatePick').forEach(select => {

        const kind = select.dataset.kind;
        const mine = templates.filter(t => t.kind === kind);

        select.innerHTML =
            `<option value="">${mine.length ? 'Use a saved template…' : 'No saved templates yet'}</option>` +
            mine.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.title)}</option>`).join('');

        select.disabled = mine.length === 0;

        select.onchange = () => {

            const t = mine.find(item => item.id === select.value);
            if(!t) return;

            document.getElementById(select.dataset.subject).value = t.subject;
            document.getElementById(select.dataset.message).value = t.body;
            select.value = '';

        };

    });

}


/* =====================================================
   COMMUNICATIONS LOG
===================================================== */

let communicationLogs = [];

const LOG_TYPE = {
    email: 'Email',
    notification: 'Notification',
    assignment: 'Rider assignment'
};

const LOG_STATUS = {
    sent: 'Sent',
    logged: 'Not delivered (email not set up)',
    partial: 'Partly sent',
    failed: 'Failed'
};

function formatCommunicationDate(value){

    return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });

}

async function refreshLog(){

    try{
        communicationLogs = (await TechRiderAPI.get('/admin/communications')).logs;
    }catch(err){
        return;
    }

    renderCommunicationLog();

}

function renderCommunicationLog(){

    const table = document.getElementById('logTable');
    const filter = document.getElementById('logFilter').value;

    const rows =
        filter === 'all'
        ? communicationLogs
        : communicationLogs.filter(log => log.type === filter);

    if(rows.length === 0){
        table.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#888;padding:24px;">No communications yet.</td></tr>`;
        return;
    }

    table.innerHTML = rows.map(log => `
        <tr title="${escapeHtml(log.subject || '')}">
            <td>${escapeHtml(LOG_TYPE[log.type] || log.type)}${log.priority === 'urgent' ? ' <span class="urgentTag">Urgent</span>' : ''}</td>
            <td>
                ${escapeHtml(log.recipientLabel || '')}
                ${log.audience === 'group' ? `<span class="logCount">(${log.recipientCount})</span>` : ''}
                ${log.subject ? `<div class="logSubject">${escapeHtml(log.subject)}</div>` : ''}
            </td>
            <td><span class="logStatus status-${escapeHtml(log.status)}">${escapeHtml(LOG_STATUS[log.status] || log.status)}</span></td>
            <td>${escapeHtml(formatCommunicationDate(log.createdAt))}</td>
        </tr>
    `).join('');

}

function filterLogs(){
    renderCommunicationLog();
}


/* =====================================================
   RIDER ASSIGNMENT (server)

   Jobs that need a rider come from the server:
   - paid repairs waiting for pickup from the customer
   - finished repairs waiting to be returned to the customer
   The trip type follows from the job, so the admin only
   picks the job and a free rider.

   Refreshed every 30 seconds. The admin's choices in the
   form are kept when the lists refresh.
===================================================== */

let assignmentJobs = [];
let assignmentRiders = [];
let activeDeliveries = [];
let lastAssignmentFetch = 0;



async function refreshAssignments(force = false){

    if(
        !force &&
        Date.now() - lastAssignmentFetch < 30000
    ){
        return;
    }

    lastAssignmentFetch = Date.now();

    if(!(await TechRiderAPI.ready)) return;

    try{

        const [requestsData, ridersData, deliveriesData] =
            await Promise.all([
                TechRiderAPI.get('/admin/requests?group=active'),
                TechRiderAPI.get('/admin/riders/available'),
                TechRiderAPI.get('/admin/deliveries?status=active')
            ]);

        assignmentJobs =
            requestsData.requests.filter(r => r.needsRider);

        assignmentRiders =
            ridersData.riders;

        activeDeliveries =
            deliveriesData.deliveries;

    }catch(err){

        console.warn('Could not load rider assignments:', err.message);

    }

    renderAvailableJobs();
    renderRiders();
    renderActiveDeliveries();

}


/* Keep the current choice if it is still in the list */
function fillSelect(select, options, emptyText){

    const previous = select.value;

    select.innerHTML = '';

    if(options.length === 0){

        const option = document.createElement('option');
        option.value = '';
        option.textContent = emptyText;
        select.appendChild(option);
        return;

    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select…';
    select.appendChild(placeholder);

    options.forEach(item => {

        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        option.disabled = Boolean(item.disabled);
        select.appendChild(option);

    });

    if(options.some(o => o.value === previous && !o.disabled)){
        select.value = previous;
    }

}


function renderAvailableJobs(){

    const select = document.getElementById('jobSelect');
    if(!select) return;

    fillSelect(
        select,
        assignmentJobs.map(job => ({
            value: job.id,
            label: `${job.code} · ${job.riderTripType === 'return' ? 'Return' : 'Pickup'} · ${job.customer ? job.customer.fullName : 'Customer'} (${job.brand} ${job.model})`
        })),
        'No jobs need a rider right now'
    );

    updateAssignmentDetails(false);

}


function renderRiders(){

    const select = document.getElementById('riderSelect');
    if(!select) return;

    fillSelect(
        select,
        assignmentRiders
            .filter(rider => !rider.suspended)
            .map(rider => ({
                value: rider.id,
                label: rider.busy
                    ? `${rider.fullName} (Busy: ${rider.currentDelivery.code})`
                    : `${rider.fullName}${rider.vehicleType ? ' · ' + rider.vehicleType : ''}`,
                disabled: rider.busy
            })),
        'No approved riders yet'
    );

}


/*
   When a job is chosen, show its trip type and fill in the
   customer's address (the admin can change it).
   userChanged: true when the admin picked a different job.
*/
function updateAssignmentDetails(userChanged){

    const job =
        assignmentJobs.find(j => j.id === document.getElementById('jobSelect').value);

    const typeSelect = document.getElementById('assignmentType');
    const addressInput = document.getElementById('assignmentAddress');
    const hint = document.getElementById('assignmentHint');

    if(!job){

        typeSelect.value = '';
        hint.textContent = '';
        if(userChanged) addressInput.value = '';
        return;

    }

    typeSelect.value = job.riderTripType;

    hint.textContent =
        job.riderTripType === 'pickup'
        ? `Collect from ${job.customer.fullName} and take to ${job.technician ? job.technician.fullName : 'the technician'}.`
        : `Collect from ${job.technician ? job.technician.fullName : 'the technician'} and return to ${job.customer.fullName}.`;

    if(userChanged || !addressInput.value){
        addressInput.value = job.location || '';
    }

}


/* Remove the old "Remove Selected Job" action: the server decides which jobs need a rider */
function removeAvailableJob(){

    TR.toast('Jobs leave this list by themselves once a rider is assigned. To stop a job, cancel it on Job Monitoring.');

}


async function createAssignment(){

    const jobSelect = document.getElementById('jobSelect');
    const riderSelect = document.getElementById('riderSelect');
    const addressInput = document.getElementById('assignmentAddress');
    const instructionsInput = document.getElementById('assignmentInstructions');
    const button = document.getElementById('assignBtn');

    const job = assignmentJobs.find(j => j.id === jobSelect.value);
    const rider = assignmentRiders.find(r => r.id === riderSelect.value);
    const address = addressInput.value.trim();
    const instructions = instructionsInput.value.trim();

    if(!job || !rider || !address){

        TR.toast('Choose a job and a rider, and check the customer address.');
        return;

    }

    if(!(await TR.confirm({ title: 'Assign rider?', message: `${rider.fullName} will be asked to do the ${job.riderTripType} for ${job.code}.`, confirmText: 'Assign', icon: 'fa-motorcycle' }))){
        return;
    }

    button.disabled = true;

    try{

        const { delivery } =
            await TechRiderAPI.post('/admin/deliveries', {
                requestId: job.id,
                riderId: rider.id,
                address,
                instructions
            });


        jobSelect.value = '';
        riderSelect.value = '';
        addressInput.value = '';
        instructionsInput.value = '';

        TR.toast(`${job.code} has been assigned to ${rider.fullName}. They have been notified.`);

    }catch(err){

        TR.toast(err.message, "error");

    }finally{

        button.disabled = false;

    }

    refreshAssignments(true);

}


/* Riders currently on a job, with a cancel option before pickup */
function renderActiveDeliveries(){

    const list = document.getElementById('activeDeliveries');
    if(!list) return;

    if(activeDeliveries.length === 0){

        list.innerHTML = '<p class="emptyNote">No riders are on a job right now.</p>';
        return;

    }

    list.innerHTML = activeDeliveries.map(d => `
        <div class="deliveryRow">
            <div>
                <strong>${escapeHtml(d.code)}</strong>
                · ${escapeHtml(d.typeLabel)} for ${escapeHtml(d.request ? d.request.code : '')}
                <div class="deliveryMeta">
                    ${escapeHtml(d.rider ? d.rider.fullName : 'Rider')}
                    · <span class="deliveryStatus status-${escapeHtml(d.status)}">${escapeHtml(d.statusLabel)}</span>
                    ${d.handoverCode ? `· Handover code <strong>${escapeHtml(d.handoverCode)}</strong>` : ''}
                    ${d.handoverAttempts >= 5 ? '· <strong class="lockedNote">Locked: too many wrong codes</strong>' : ''}
                </div>
            </div>
            ${d.handoverAttempts >= 5 ? `
            <button
                type="button"
                class="btn smallBtn unlockBtn"
                data-unlock="${escapeHtml(d.id)}">
                Unlock
            </button>` : ''}
            ${d.status === 'picked_up' ? '' : `
            <button
                type="button"
                class="btn deleteBtn smallBtn"
                data-delivery="${escapeHtml(d.id)}"
                data-code="${escapeHtml(d.code)}">
                Cancel
            </button>`}
        </div>
    `).join('');

}


/* Wrong handover codes lock a delivery; check with the receiver first */
async function unlockDelivery(id, button){

    const ok = await TR.confirm({
        title: 'Unlock this delivery?',
        message: 'The rider gets 5 more tries at the handover code. Call the person receiving the device first to make sure the rider is really there.',
        confirmText: 'Unlock',
        icon: 'fa-lock-open'
    });
    if(!ok) return;

    button.disabled = true;
    try{
        await TechRiderAPI.post(`/admin/deliveries/${encodeURIComponent(id)}/unlock`);
        TR.toast('Unlocked. The rider can enter the code again.', 'success');
        await refreshAssignments(true);
    }catch(err){
        TR.toast(err.message, 'error');
        button.disabled = false;
    }

}

async function cancelDelivery(id, code){

    const reason = await TR.prompt({
        title: `Cancel ${code}?`,
        message: 'The rider will see your reason.',
        label: 'Reason',
        multiline: true,
        required: 'Give a reason for cancelling.',
        confirmText: 'Cancel delivery',
        cancelText: 'Keep it',
        danger: true
    });
    if(reason === null) return;

    try{

        await TechRiderAPI.post(`/admin/deliveries/${encodeURIComponent(id)}/cancel`, { reason: reason.trim() });
        TR.toast(`${code} was cancelled. The job is back in the list so you can assign another rider.`);

    }catch(err){

        TR.toast(err.message, "error");

    }

    refreshAssignments(true);

}


document.addEventListener('DOMContentLoaded', function(){

    document.getElementById('jobSelect')
        .addEventListener('change', () => updateAssignmentDetails(true));

    document.getElementById('activeDeliveries')
        .addEventListener('click', e => {
            const button = e.target.closest('button[data-delivery]');
            if(button) cancelDelivery(button.dataset.delivery, button.dataset.code);
            const unlock = e.target.closest('button[data-unlock]');
            if(unlock) unlockDelivery(unlock.dataset.unlock, unlock);
        });

});



/* =====================================================
   REFRESH EVERYTHING
===================================================== */

function refreshCommunications(){

    refreshAssignments();

}

document.addEventListener('visibilitychange', function(){

    if(!document.hidden){
        refreshCommunications();
        refreshLog();
    }

});


/* =====================================================
   START
===================================================== */

document.addEventListener('DOMContentLoaded', async function(){

    applySidebarState();

    if(!(await TechRiderAPI.ready)) return;

    switchUsers('email', document.getElementById('emailCategory').value);
    switchUsers('notify', document.getElementById('notifyCategory').value);
    loadTemplatePickers();
    refreshLog();
    refreshAssignments(true);

    // assignments refresh themselves at most every 30 seconds;
    // the log refreshes after each send and here as a fallback
    setInterval(() => {
        if(document.hidden) return;
        refreshCommunications();
    }, 3000);

    setInterval(() => {
        if(!document.hidden) refreshLog();
    }, 30000);

});

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
    refreshAssignments(true);
    refreshLog();
});
