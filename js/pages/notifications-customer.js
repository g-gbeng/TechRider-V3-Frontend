/* Scripts for notifications-customer.html */

/* Login is checked by the page guard in js/api.js */
const esc = TechRiderAPI.escapeHtml;

const notificationsContainer =
  document.getElementById('notificationsContainer');

const filterButtons =
  document.querySelectorAll('.filter-btn');

const markAllCheckbox =
  document.getElementById('markAllCheckbox');

let notifications = [];
let currentFilter = 'all';

function formatDate(dateString){

  return new Date(dateString).toLocaleString('en-NG', {
    dateStyle:'medium',
    timeStyle:'short'
  });

}

async function loadNotifications(){

  try{

    const data = await TechRiderAPI.get('/notifications');
    notifications = data.notifications;

  }catch(err){

    notificationsContainer.innerHTML =
      `<div class="empty-state"><h3>Could not load notifications</h3><p>${esc(err.message)}</p></div>`;
    return;

  }

  renderNotifications();

}

function renderNotifications(){

  const filtered = notifications.filter(n =>
    currentFilter === 'read' ? n.read :
    currentFilter === 'unread' ? !n.read :
    true
  );

  markAllCheckbox.checked =
    notifications.length > 0 && notifications.every(n => n.read);

  if(filtered.length === 0){

    notificationsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <h3>No Notifications</h3>
        <p>Updates about your repairs and messages from TechRider will appear here.</p>
      </div>
    `;
    return;

  }

  notificationsContainer.innerHTML = filtered.map(n => `

    <div class="notification-card ${n.read ? '' : 'unread'} ${n.priority === 'urgent' ? 'urgent' : ''}">

      <div class="notification-top">

        <div>
          <div class="notification-title">
            ${esc(n.title)}
          </div>
          ${n.fromAdmin ? '<div class="notification-from">From TechRider</div>' : ''}
        </div>

        <div class="status ${n.read ? 'read' : 'unread'}">
          ${n.read ? 'Read' : 'Unread'}
        </div>

      </div>

      <div class="notification-message">
        ${esc(n.message)}
      </div>

      <div class="notification-footer">

        <div class="notification-time">
          ${esc(formatDate(n.createdAt))}
          ${n.requestCode ? ` · <a class="job-link" href="active-repairs-customer.html">${esc(n.requestCode)}</a>` : ''}
        </div>

        ${
          n.read
          ? ''
          : `<button class="mark-btn" data-id="${esc(n.id)}">Mark as Read</button>`
        }

      </div>

    </div>

  `).join('');

}

async function markAsRead(id){

  try{

    await TechRiderAPI.patch(`/notifications/${encodeURIComponent(id)}/read`);
    const n = notifications.find(item => item.id === id);
    if(n) n.read = true;
    renderNotifications();

  }catch(err){

    alert(err.message);

  }

}

notificationsContainer.addEventListener('click', e => {

  const button = e.target.closest('.mark-btn');
  if(button) markAsRead(button.dataset.id);

});

markAllCheckbox.addEventListener('change', async () => {

  if(!markAllCheckbox.checked) return;

  try{

    await TechRiderAPI.patch('/notifications/read-all');
    notifications.forEach(n => { n.read = true; });

  }catch(err){

    alert(err.message);

  }

  renderNotifications();

});

filterButtons.forEach(button => {

  button.addEventListener('click', () => {

    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    renderNotifications();

  });

});

(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  loadNotifications();

  // pick up new notifications while the page is open
  setInterval(() => { if(!document.hidden) loadNotifications(); }, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(loadNotifications);
