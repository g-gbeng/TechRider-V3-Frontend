/* Scripts for notifications-customer.html, notifications-technician.html
   and notifications-rider.html. The login is checked by the page guard in
   js/api.js; <body data-jobs-page="..."> says where job codes link to. */

const esc = TR.esc;
const JOBS_PAGE = document.body.dataset.jobsPage;

const list = document.getElementById('notificationsContainer');
const filterButtons = document.querySelectorAll('.filter-btn');
const markAllBtn = document.getElementById('markAllBtn');
const unreadPill = document.getElementById('unreadPill');

let notifications = [];
let currentFilter = 'all';
let loadedOnce = false;

const KIND_ICONS = {
  job: 'fa-screwdriver-wrench',
  payment: 'fa-credit-card',
  alert: 'fa-triangle-exclamation',
  admin: 'fa-bullhorn',
  general: 'fa-bell'
};

/* ---------- dates ---------- */
function dayLabel(date){
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if(d.toDateString() === today.toDateString()) return 'Today';
  if(d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

function fullDate(date){
  return new Date(date).toLocaleString('en-NG', { dateStyle:'medium', timeStyle:'short' });
}

/* ---------- load ---------- */
async function loadNotifications(){

  try{
    const data = await TechRiderAPI.get('/notifications');
    notifications = data.notifications;
    loadedOnce = true;
  }catch(err){
    if(!loadedOnce){
      list.innerHTML = TR.empty({ icon:'fa-wifi', title:"Couldn't load notifications", text: err.message });
    }else{
      TR.toast('Could not refresh notifications: ' + err.message, 'error');
    }
    return;
  }

  render();

}

/* ---------- render ---------- */
function cardHtml(n){

  const kind = n.fromAdmin ? 'admin' : n.kind || 'general';

  return `
    <article class="notification-card ${n.read ? '' : 'unread'} ${n.priority === 'urgent' ? 'urgent' : ''} kind-${esc(kind)}" data-id="${esc(n.id)}">
      <div class="n-icon" aria-hidden="true"><i class="fas ${KIND_ICONS[kind] || KIND_ICONS.general}"></i></div>
      <div class="n-body">
        <div class="n-top">
          <h3 class="notification-title">${esc(n.title)}</h3>
          ${n.read ? '' : '<span class="n-dot" aria-label="Unread"></span>'}
        </div>
        ${n.fromAdmin || n.priority === 'urgent' ? `<div class="n-tags">
          ${n.fromAdmin ? '<span class="n-tag from">From TechRider</span>' : ''}
          ${n.priority === 'urgent' ? '<span class="n-tag urgent">Urgent</span>' : ''}
        </div>` : ''}
        <p class="notification-message">${esc(n.message)}</p>
        <div class="n-foot">
          <span class="n-time" title="${esc(fullDate(n.createdAt))}">${esc(TR.ago(n.createdAt))}</span>
          ${n.requestCode ? `<a class="job-link" href="${esc(JOBS_PAGE)}"><i class="fas fa-arrow-up-right-from-square"></i> ${esc(n.requestCode)}</a>` : ''}
          <span class="n-actions">
            ${n.read ? '' : `<button type="button" class="mark-btn" data-id="${esc(n.id)}"><i class="fas fa-check"></i> Mark as read</button>`}
            <button type="button" class="delete-btn" data-id="${esc(n.id)}" aria-label="Delete notification"><i class="fas fa-trash-can"></i></button>
          </span>
        </div>
      </div>
    </article>`;

}

function render(){

  const unread = notifications.filter(n => !n.read).length;
  unreadPill.hidden = unread === 0;
  unreadPill.textContent = `${unread} unread`;
  markAllBtn.disabled = unread === 0;

  const shown = notifications.filter(n =>
    currentFilter === 'read' ? n.read :
    currentFilter === 'unread' ? !n.read :
    true
  );

  if(shown.length === 0){
    const text = {
      all: 'Updates about your jobs, payments and messages from TechRider will appear here.',
      unread: "You're all caught up.",
      read: 'Notifications you have read will appear here.'
    }[currentFilter];
    list.innerHTML = TR.empty({ icon: currentFilter === 'unread' ? 'fa-check-double' : 'fa-bell-slash', title: currentFilter === 'unread' ? 'No unread notifications' : 'No notifications', text });
    return;
  }

  // group into Today / Yesterday / Earlier
  let html = '';
  let group = null;
  shown.forEach(n => {
    const label = dayLabel(n.createdAt);
    if(label !== group){
      group = label;
      html += `<h2 class="n-group">${label}</h2>`;
    }
    html += cardHtml(n);
  });
  list.innerHTML = html;

}

/* ---------- actions ---------- */
async function markAsRead(id){
  const n = notifications.find(item => item.id === id);
  if(!n || n.read) return;
  n.read = true; // show it straight away
  render();
  try{
    await TechRiderAPI.patch(`/notifications/${encodeURIComponent(id)}/read`);
  }catch(err){
    n.read = false;
    render();
    TR.toast(err.message, 'error');
  }
}

async function remove(id){
  const ok = await TR.confirm({ title:'Delete this notification?', confirmText:'Delete', danger:true });
  if(!ok) return;
  try{
    await TechRiderAPI.del(`/notifications/${encodeURIComponent(id)}`);
    notifications = notifications.filter(n => n.id !== id);
    render();
  }catch(err){
    TR.toast(err.message, 'error');
  }
}

list.addEventListener('click', e => {
  const mark = e.target.closest('.mark-btn');
  const del = e.target.closest('.delete-btn');
  if(mark) return markAsRead(mark.dataset.id);
  if(del) return remove(del.dataset.id);
  // opening a job link also marks the notification as read
  const link = e.target.closest('.job-link');
  const card = e.target.closest('.notification-card.unread');
  if(link && card) markAsRead(card.dataset.id);
});

markAllBtn.addEventListener('click', async () => {
  markAllBtn.disabled = true;
  try{
    await TechRiderAPI.patch('/notifications/read-all');
    notifications.forEach(n => { n.read = true; });
    TR.toast('All notifications marked as read.', 'success');
  }catch(err){
    TR.toast(err.message, 'error');
  }
  render();
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn === button);
      btn.setAttribute('aria-selected', String(btn === button));
    });
    currentFilter = button.dataset.filter;
    render();
  });
});

/* ---------- start ---------- */
(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  loadNotifications();

  // pick up new notifications while the page is open (fallback for live updates)
  setInterval(() => { if(!document.hidden) loadNotifications(); }, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadNotifications);
