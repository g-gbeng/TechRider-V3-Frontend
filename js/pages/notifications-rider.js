/* Scripts for notifications-rider.html */

/* Login is checked by the page guard in js/api.js */
const esc = TechRiderAPI.escapeHtml;

let notifications = [];
let currentFilter = 'all';

const KIND_LABEL = {
job:'Delivery',
payment:'Payment',
admin:'From TechRider',
alert:'Alert',
general:'Notification'
};

function formatTime(date){

return new Date(date).toLocaleString('en-NG', {
dateStyle:'medium',
timeStyle:'short'
});

}

/* =========================
LOAD
========================= */
async function loadNotifications(){

try{

const data = await TechRiderAPI.get('/notifications');
notifications = data.notifications;

}catch(err){

TR.toast('Could not load notifications: ' + err.message);

}

renderNotifications();

}

/* =========================
RENDER NOTIFICATIONS
========================= */
function renderNotifications(){

const container =
document.getElementById('notificationContainer');

const filtered = notifications.filter(n =>
currentFilter === 'read' ? n.read :
currentFilter === 'unread' ? !n.read :
true
);

updateMarkAllCheckbox();

if(filtered.length === 0){

container.innerHTML = '';
document.getElementById('emptyState').style.display = 'block';
return;

}

document.getElementById('emptyState').style.display = 'none';

container.innerHTML = filtered.map(n => `

<div class="notice ${n.read ? '' : 'unread'}">

<div class="notice-head">

<div class="notice-left">

<div class="tag">
${esc(KIND_LABEL[n.kind] || 'Notification')}
</div>

${n.read ? '' : '<div class="badge">Unread</div>'}

</div>

</div>

<p class="notice-title">
<strong>${esc(n.title)}</strong>
</p>

<p>
${esc(n.message)}
</p>

<div class="time">
${esc(formatTime(n.createdAt))}
</div>

<div class="actions">

${
n.read
? ''
: `<button class="read-btn" data-action="read" data-id="${esc(n.id)}">Mark as Read</button>`
}

<button
class="remove-btn"
data-action="remove"
data-id="${esc(n.id)}">

Remove

</button>

</div>

</div>

`).join('');

}

document
.getElementById('notificationContainer')
.addEventListener('click', e => {

const button = e.target.closest('button[data-action]');
if(!button) return;

if(button.dataset.action === 'read') markAsRead(button.dataset.id);
else removeNotification(button.dataset.id);

});

/* =========================
MARK SINGLE AS READ
========================= */
async function markAsRead(id){

try{

await TechRiderAPI.patch(`/notifications/${encodeURIComponent(id)}/read`);
const n = notifications.find(item => item.id === id);
if(n) n.read = true;

}catch(err){

TR.toast(err.message, "error");

}

renderNotifications();

}

/* =========================
MARK ALL AS READ
========================= */
async function markAllAsRead(){

const checkbox =
document.getElementById('markAllCheckbox');

if(!checkbox.checked){
return;
}

try{

await TechRiderAPI.patch('/notifications/read-all');
notifications.forEach(n => { n.read = true; });

}catch(err){

TR.toast(err.message, "error");

}

renderNotifications();

}

function updateMarkAllCheckbox(){

document.getElementById('markAllCheckbox').checked =
notifications.length > 0 && notifications.every(n => n.read);

}

/* =========================
REMOVE NOTIFICATION
========================= */
async function removeNotification(id){

if(!(await TR.confirm({ title: 'Delete notification?', confirmText: 'Delete', danger: true }))){
return;
}

try{

await TechRiderAPI.del(`/notifications/${encodeURIComponent(id)}`);
notifications = notifications.filter(n => n.id !== id);

}catch(err){

TR.toast(err.message, "error");

}

renderNotifications();

}

/* =========================
FILTER
========================= */
function filterNotifications(type,button){

currentFilter = type;

document
.querySelectorAll('.filter-btn')
.forEach(btn => btn.classList.remove('active'));

button.classList.add('active');

renderNotifications();

}

/* =========================
INIT
========================= */
(async function init(){

if(!(await TechRiderAPI.ready)) return;

loadNotifications();

setInterval(() => { if(!document.hidden) loadNotifications(); }, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadNotifications);
