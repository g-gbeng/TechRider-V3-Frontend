/* Scripts for admin-templates.html */

/* Login is checked by the page guard in js/api.js */
const esc = TechRiderAPI.escapeHtml;

/* Templates can be picked on Communications.
   Write {name} to insert each person's first name. */
let templates = [];

async function loadTemplates(){

  try{

    templates = (await TechRiderAPI.get('/admin/templates')).templates;

  }catch(err){

    TR.toast('Could not load templates: ' + err.message);

  }

  render();

}

/* SAVE (email or notification) */
async function saveTemplate(kind, prefix, button){

  const fields = ['Title', 'Subject', 'Body'].map(name =>
    document.getElementById(prefix + name)
  );

  const [title, subject, body] = fields.map(input => input.value.trim());

  if(!title || !subject || !body){
    TR.toast(`Please fill all ${kind} fields.`);
    return;
  }

  if(button) button.disabled = true;

  try{

    await TechRiderAPI.post('/admin/templates', { kind, title, subject, body });
    fields.forEach(input => { input.value = ''; });
    await loadTemplates();

  }catch(err){

    TR.toast(err.message, "error");

  }finally{

    if(button) button.disabled = false;

  }

}

function saveEmailTemplate(button){
  saveTemplate('email', 'email', button);
}

function saveNotifTemplate(button){
  saveTemplate('notification', 'notif', button);
}

/* EDIT */
async function editTemplate(id){

  const template = templates.find(t => t.id === id);
  if(!template) return;

  const values = await TR.form({
    title: `Edit ${template.kind} template`,
    confirmText: 'Save changes',
    fields: [
      { name: 'title', label: 'Title', value: template.title, required: true, maxLength: 120 },
      { name: 'subject', label: 'Subject', value: template.subject, maxLength: 200 },
      { name: 'body', label: 'Message', value: template.body, multiline: true, required: true, maxLength: 5000 }
    ]
  });
  if(!values) return;
  const { title, subject, body } = values;

  try{

    await TechRiderAPI.put(`/admin/templates/${encodeURIComponent(id)}`, {
      title: title.trim(),
      subject: subject.trim(),
      body: body.trim()
    });

  }catch(err){

    TR.toast(err.message, "error");

  }

  loadTemplates();

}

/* DELETE */
async function deleteTemplate(id){

  const template = templates.find(t => t.id === id);
  if(!template) return;

  if(!(await TR.confirm({
    title: 'Delete template?',
    message: `The ${template.kind} template "${template.title}" will be removed. This can't be undone.`,
    confirmText: 'Delete',
    danger: true
  }))){
    return;
  }

  try{

    await TechRiderAPI.del(`/admin/templates/${encodeURIComponent(id)}`);

  }catch(err){

    TR.toast(err.message, "error");

  }

  loadTemplates();

}

/* RENDER */
function renderList(listId, kind, emptyText){

  const list = document.getElementById(listId);
  const items = templates.filter(t => t.kind === kind);

  if(items.length === 0){
    list.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  list.innerHTML = items.map(template => `
    <div class="card">
      <div class="card-title">${esc(template.title)}</div>
      <div class="card-subject">${esc(template.subject)}</div>
      <div class="card-body">${esc(template.body)}</div>
      <div class="card-actions">
        <button class="edit-btn" data-action="edit" data-id="${esc(template.id)}">Edit</button>
        <button class="delete-btn" data-action="delete" data-id="${esc(template.id)}">Delete</button>
      </div>
    </div>
  `).join('');

}

function render(){

  renderList('emailList', 'email', 'No email templates created yet.');
  renderList('notifList', 'notification', 'No notification templates created yet.');

}

document.addEventListener('click', e => {

  const button = e.target.closest('button[data-action]');
  if(!button) return;

  if(button.dataset.action === 'edit') editTemplate(button.dataset.id);
  else deleteTemplate(button.dataset.id);

});

/* UNIVERSAL BACK */
function goBack(){

  if(document.referrer){
    window.history.back();
  }else{
    window.location.href = 'admin-dashboard.html';
  }

}

/* INIT */
(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  loadTemplates();

})();
