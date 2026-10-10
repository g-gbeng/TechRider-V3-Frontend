/* Scripts for admin-disputes.html */

/* Login is checked by the page guard in js/api.js */
const esc = TechRiderAPI.escapeHtml;

let disputes = [];
let currentFilter = "all";
let pendingId = null;
let deleteId = null;

const timeFormat = { dateStyle:"medium", timeStyle:"short" };

/* =========================
SIDEBAR
========================= */
function openSidebar(){
document.getElementById('sidebar').classList.add('open');
document.getElementById('overlay').classList.add('show');
}

function closeSidebar(){
document.getElementById('sidebar').classList.remove('open');
document.getElementById('overlay').classList.remove('show');
}

/* =========================
COLLAPSE
========================= */
function toggleSection(id){
document.getElementById(id).classList.toggle('hidden');
}

/* =========================
TYPE LABEL
========================= */
const TYPE_LABEL = {
customer:"Customer Disputes",
technician:"Technician Disputes",
rider:"Rider Disputes"
};

/* =========================
LOAD DISPUTES
========================= */
async function loadDisputes(){

try{

disputes = (await TechRiderAPI.get('/admin/disputes')).disputes;

}catch(err){

alert('Could not load disputes: ' + err.message);

}

renderAll();

}

function renderAll(){

renderGroupedDisputes(
disputes.filter(d => d.status !== 'settled'),
document.getElementById('openTable'),
false
);

renderGroupedDisputes(
disputes.filter(d => d.status === 'settled'),
document.getElementById('settledTable'),
true
);

}

/* =========================
RENDER GROUPS
========================= */
function renderGroupedDisputes(data, targetTable, isSettled){

const types =
currentFilter === "all"
? ["customer", "technician", "rider"]
: [currentFilter];

let html = '';

types.forEach(type => {

const group = data.filter(d => d.role === type);
if(!group.length) return;

html += `
<tr class="groupRow">
<td colspan="6">${TYPE_LABEL[type]}</td>
</tr>
`;

html += group.map(d => `
<tr>
<td>${esc(d.code)}</td>
<td>${esc(d.raisedBy ? d.raisedBy.fullName : 'Deleted user')}</td>
<td>${esc(d.category)}</td>
<td>${esc(d.requestCode || 'N/A')}</td>
<td>${esc(d.statusLabel)}</td>
<td class="actionCell">
<button class="btn viewBtn" data-action="view" data-id="${esc(d.id)}">View</button>
${
isSettled
? `<button class="btn deleteBtn" data-action="delete" data-id="${esc(d.id)}">Delete</button>`
: `<button class="btn settleBtn" data-action="settle" data-id="${esc(d.id)}">Mark Settled</button>`
}
</td>
</tr>
`).join('');

});

targetTable.innerHTML = html || `
<tr class="emptyRow">
<td colspan="6">No disputes found</td>
</tr>
`;

}

document.addEventListener('click', e => {

const button = e.target.closest('button[data-action]');
if(!button) return;

const id = button.dataset.id;
if(button.dataset.action === 'view') viewDispute(id);
if(button.dataset.action === 'settle') confirmSettle(id);
if(button.dataset.action === 'delete') confirmDelete(id);

});

/* =========================
VIEW DISPUTE
========================= */
function viewDispute(id){

const d = disputes.find(item => item.id === id);
if(!d) return;

const who = d.raisedBy || {};

document.getElementById('detailText').innerHTML = `
<dl class="detailGrid">
<dt>Dispute</dt><dd>${esc(d.code)} · ${esc(d.statusLabel)}</dd>
<dt>Raised by</dt><dd>${esc(who.fullName || 'Deleted user')} (${esc(d.role)})</dd>
<dt>Contact</dt><dd>${esc(who.email || '')}${who.phone ? ' · ' + esc(who.phone) : ''}</dd>
<dt>Category</dt><dd>${esc(d.category)}</dd>
<dt>Job</dt><dd>${esc(d.requestCode || 'N/A')}</dd>
<dt>Submitted</dt><dd>${esc(new Date(d.createdAt).toLocaleString('en-NG', timeFormat))}</dd>
</dl>
<div class="detailMessage">${esc(d.message)}</div>
${d.resolutionNote ? `<div class="detailResolution"><strong>Resolution:</strong> ${esc(d.resolutionNote)}</div>` : ''}
`;

document.getElementById('detailModal').style.display = 'block';

}

function closeDetail(){
document.getElementById('detailModal').style.display = 'none';
}

/* =========================
SETTLEMENT FLOW
========================= */
function confirmSettle(id){

pendingId = id;
document.getElementById('resolutionNote').value = '';
document.getElementById('confirmModal').style.display = 'block';
document.getElementById('resolutionNote').focus();

}

function closeModal(){

document.getElementById('confirmModal').style.display = 'none';
pendingId = null;

}

async function moveDispute(){

if(!pendingId) return;

const note = document.getElementById('resolutionNote').value.trim();

if(!note){
alert('Write a short resolution note for the user.');
return;
}

const button = document.getElementById('settleConfirmBtn');
button.disabled = true;

try{

await TechRiderAPI.patch(`/admin/disputes/${encodeURIComponent(pendingId)}/settle`, { note });
closeModal();

}catch(err){

alert(err.message);

}finally{

button.disabled = false;

}

loadDisputes();

}

/* =========================
DELETE FLOW
========================= */
function confirmDelete(id){

deleteId = id;
document.getElementById('deleteModal').style.display = 'block';

}

function closeDeleteModal(){

document.getElementById('deleteModal').style.display = 'none';
deleteId = null;

}

async function deleteDispute(){

if(!deleteId) return;

try{

await TechRiderAPI.del(`/admin/disputes/${encodeURIComponent(deleteId)}`);

}catch(err){

alert(err.message);

}

closeDeleteModal();
loadDisputes();

}

/* =========================
FILTERS
========================= */
function filterType(type, button){

currentFilter = type;

document
.querySelectorAll('.filterBtn')
.forEach(btn => btn.classList.remove('active'));

button.classList.add('active');

renderAll();

}

/* =========================
INIT
========================= */
(async function init(){

if(!(await TechRiderAPI.ready)) return;

loadDisputes();

setInterval(() => {
if(!document.hidden && !pendingId && !deleteId) loadDisputes();
}, 30000);

})();

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
if(!pendingId && !deleteId) loadDisputes();
});
