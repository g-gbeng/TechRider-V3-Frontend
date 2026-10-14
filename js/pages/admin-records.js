/* Scripts for admin-records.html */

/* ===========================================================
   TECHRIDER ADMIN RECORDS
   PART 1
=========================================================== */

/* -----------------------------
   STORAGE
------------------------------ */

/* Approved technicians and riders, loaded from the server */
let technicians = [];

let riders = [];

const esc = TechRiderAPI.escapeHtml;

/* Turn a server account into the shape this page displays */
function toRecord(user){

    const docs = {};

    (user.documents || []).forEach(doc=>{
        docs[doc.kind] = { url:doc.url, mimeType:doc.mimeType };
    });

    const tech = user.technicianProfile || {};
    const rider = user.riderProfile || {};

    return {
        id:user.id,
        fullName:user.fullName,
        email:user.email,
        phone:user.phone,
        address:user.address,
        experience:tech.yearsExperience,
        specialization:tech.specialization,
        vehicleType:rider.vehicleType,
        plateNumber:rider.plateNumber,
        bank:user.bankDetails || null,
        suspended:user.suspended,
        submittedAt:user.createdAt,
        facialImage:docs.facialImage,
        governmentId:docs.governmentId,
        businessLicense:docs.businessLicense,
        driversLicense:docs.driversLicense
    };

}

async function loadRecords(){

    const [techData, riderData] = await Promise.all([
        TechRiderAPI.get("/admin/users?role=technician"),
        TechRiderAPI.get("/admin/users?role=rider")
    ]);

    technicians = techData.users.map(toRecord);
    riders = riderData.users.map(toRecord);

}

const recordsContainer =
document.getElementById(
"recordsContainer"
);

const searchBox =
document.getElementById(
"searchBox"
);

/* -----------------------------
   URL PARAMETERS
------------------------------ */

const params =
new URLSearchParams(
window.location.search
);

const selectedName =
params.get("tech") ||
params.get("rider");

/* -----------------------------
   HELPERS
------------------------------ */

function formatDate(date){

if(!date) return "N/A";

return new Date(date)
.toLocaleDateString(
undefined,
{
year:"numeric",
month:"short",
day:"numeric"
}
);

}

function imageBox(title,doc){

if(!doc){

return `
<div class="imgBox">
<strong>${esc(title)}</strong>
<br><br>
No document uploaded
</div>
`;

}

/* PDFs cannot be shown as images: link to them instead */
if(doc.mimeType === "application/pdf"){

return `
<div class="imgBox">
<strong>${esc(title)}</strong>
<br><br>
<a href="${esc(doc.url)}" target="_blank" rel="noopener">
<i class="fas fa-file-pdf"></i> Open PDF document
</a>
</div>
`;

}

return `
<div class="imgBox">
<strong>${esc(title)}</strong>
<br><br>
<a href="${esc(doc.url)}" target="_blank" rel="noopener">
<img
src="${esc(doc.url)}"
alt="${esc(title)}"
style="
width:100%;
max-height:220px;
object-fit:contain;
border-radius:10px;
">
</a>
</div>
`;

}

/* -----------------------------
   BANK DETAILS (for payouts)
------------------------------ */

function bankBox(rec){

const b = rec.bank;
const has = b && b.accountNumber;

return `
<div class="bankBox ${has ? "" : "missing"}">
<div class="bankHead">
<strong><i class="fas fa-building-columns"></i> Payout bank account</strong>
<button type="button" class="bankEdit" data-bank-edit="${esc(rec.id)}">${has ? "Edit" : "Add"}</button>
</div>
${has ? `
<div class="detailsGrid">
<div class="field"><div class="label">Bank name</div><div class="value">${esc(b.bankName)}</div></div>
<div class="field"><div class="label">Account number</div><div class="value bankNumber">${esc(b.accountNumber)}</div></div>
<div class="field"><div class="label">Account name</div><div class="value">${esc(b.accountName)}</div></div>
</div>` : `<p class="bankMissing">No bank details yet. Add them so this person can be paid.</p>`}
</div>
`;

}

document.addEventListener("click", async (e)=>{

const btn = e.target.closest("[data-bank-edit]");
if(!btn) return;

const rec = [...technicians, ...riders].find(r=>r.id===btn.dataset.bankEdit);
if(!rec) return;
const b = rec.bank || {};

const values = await TR.form({
title:`Bank details for ${rec.fullName}`,
confirmText:"Save",
fields:[
{ name:"bankName", label:"Bank name", value:b.bankName || "", required:true, maxLength:80 },
{ name:"accountNumber", label:"Account number (10 digits)", value:b.accountNumber || "", required:true, maxLength:10, inputmode:"numeric" },
{ name:"accountName", label:"Account name", value:b.accountName || "", required:true, maxLength:120 }
]
});
if(!values) return;

try{
const data = await TechRiderAPI.patch(`/admin/users/${encodeURIComponent(rec.id)}/bank`, values);
rec.bank = data.bankDetails;
renderRecords();
highlightSelectedRecord();
TR.toast("Bank details saved","success");
}catch(err){
TR.toast(err.message,"error");
}

});

/* -----------------------------
   RENDER TECHNICIAN
------------------------------ */

function createTechnicianCard(tech){

const status =
tech.suspended
? "Suspended"
: "Approved";

const statusClass =
tech.suspended
? "suspended"
: "approved";

return `

<div
class="record"
data-role="technician"
data-name="${esc(tech.fullName)}"
>

<div class="selectedLabel">
Selected Record
</div>

<div class="roleTag">
Technician
</div>

<div class="header">

<h3>

${esc(tech.fullName)}

</h3>

<span class="status ${statusClass}">

${status}

</span>

</div>

<div class="detailsGrid">

<div class="field">

<div class="label">
Email
</div>

<div class="value">

${esc(tech.email || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Phone
</div>

<div class="value">

${esc(tech.phone || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Address
</div>

<div class="value">

${esc(tech.address || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Experience
</div>

<div class="value">

${esc(tech.experience || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Submitted
</div>

<div class="value">

${formatDate(
tech.submittedAt
)}

</div>

</div>

</div>

${bankBox(tech)}

<button
class="backBtn toggleDocs"
style="
margin-bottom:20px;
"
>

View Documents ▼

</button>

<div
class="images"
style="display:none;"
>

${imageBox(
"Facial Verification",
tech.facialImage
)}

${imageBox(
"Government ID",
tech.governmentId
)}

${imageBox(
"Business License",
tech.businessLicense
)}

</div>

</div>

`;

}

/* -----------------------------
   INITIAL RENDER
------------------------------ */

function renderRecords(){

recordsContainer.innerHTML = "";

/* ---------- TECHNICIANS ---------- */

technicians.forEach(tech=>{

recordsContainer.innerHTML +=

createTechnicianCard(tech);

});

/* Riders will be added
   in Part 2 */

}

/* ===========================================================
   TECHRIDER ADMIN RECORDS
   PART 2
=========================================================== */

/* -----------------------------
   RENDER RIDER
------------------------------ */

function createRiderCard(rider){

const status =
rider.suspended
? "Suspended"
: "Approved";

const statusClass =
rider.suspended
? "suspended"
: "approved";

return `

<div
class="record"
data-role="rider"
data-name="${esc(rider.fullName)}"
>

<div class="selectedLabel">
Selected Record
</div>

<div class="roleTag">
Rider
</div>

<div class="header">

<h3>

${esc(rider.fullName)}

</h3>

<span class="status ${statusClass}">

${status}

</span>

</div>

<div class="detailsGrid">

<div class="field">

<div class="label">
Email
</div>

<div class="value">

${esc(rider.email || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Phone
</div>

<div class="value">

${esc(rider.phone || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Address
</div>

<div class="value">

${esc(rider.address || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Vehicle Type
</div>

<div class="value">

${esc(rider.vehicleType || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Plate Number
</div>

<div class="value">

${esc(rider.plateNumber || "N/A")}

</div>

</div>

<div class="field">

<div class="label">
Submitted
</div>

<div class="value">

${formatDate(
rider.submittedAt
)}

</div>

</div>

</div>

${bankBox(rider)}

<button
class="backBtn toggleDocs"
style="
margin-bottom:20px;
">

View Documents ▼

</button>

<div
class="images"
style="display:none;"
>

${imageBox(
"Facial Verification",
rider.facialImage
)}

${imageBox(
"Driver's License",
rider.driversLicense
)}

${imageBox(
"Government ID",
rider.governmentId
)}

</div>

</div>

`;

}

/* -----------------------------
   COMPLETE RENDER
------------------------------ */

const originalRender =
renderRecords;

renderRecords = function(){

recordsContainer.innerHTML = "";

/* Technicians */

technicians.forEach(tech=>{

recordsContainer.innerHTML +=
createTechnicianCard(tech);

});

/* Riders */

riders.forEach(rider=>{

recordsContainer.innerHTML +=
createRiderCard(rider);

});

/* Enable document toggles */

setupDocumentButtons();

};

/* -----------------------------
   DOCUMENT TOGGLE
------------------------------ */

function setupDocumentButtons(){

document
.querySelectorAll(".toggleDocs")
.forEach(button=>{

button.onclick = function(){

const images =

this.nextElementSibling;

const opened =

images.style.display === "grid";

images.style.display =

opened
? "none"
: "grid";

this.innerHTML =

opened
? "View Documents ▼"
: "Hide Documents ▲";

};

});

}

/* ===========================================================
   TECHRIDER ADMIN RECORDS
   PART 3
=========================================================== */

/* -----------------------------
   SEARCH
------------------------------ */

searchBox.addEventListener(
"input",
function(){

const query =
this.value
.toLowerCase()
.trim();

document
.querySelectorAll(".record")
.forEach(card=>{

const name =
(card.dataset.name || "")
.toLowerCase();

const role =
(card.dataset.role || "")
.toLowerCase();

const text =
card.innerText
.toLowerCase();

const match =

name.includes(query) ||

role.includes(query) ||

text.includes(query);

card.style.display =
match
? "block"
: "none";

});

});

/* -----------------------------
   ROLE FILTER
------------------------------ */

function filterRole(role,tab){

document
.querySelectorAll(".tab")
.forEach(button=>
button.classList.remove(
"active"
)
);

tab.classList.add(
"active"
);

document
.querySelectorAll(".record")
.forEach(card=>{

if(
role==="all" ||
card.dataset.role===role
){

card.style.display="block";

}else{

card.style.display="none";

}

});

}

/* -----------------------------
   HIGHLIGHT RECORD
------------------------------ */

function highlightSelectedRecord(){

if(!selectedName){

return;

}

const cards =
document.querySelectorAll(
".record"
);

cards.forEach(card=>{

if(
card.dataset.name ===
selectedName
){

card.classList.add(
"highlighted"
);

/* Automatically expand documents */

const images =
card.querySelector(".images");

const button =
card.querySelector(".toggleDocs");

if(images){

images.style.display =
"grid";

}

if(button){

button.innerHTML =
"Hide Documents ▲";

}

/* Smooth scroll */

setTimeout(()=>{

card.scrollIntoView({

behavior:"smooth",

block:"center"

});

},300);

}

});

}

/* -----------------------------
   EMPTY STATE
------------------------------ */

function showEmptyMessage(){

if(

technicians.length===0 &&

riders.length===0

){

recordsContainer.innerHTML =

`

<div
style="
background:white;
padding:60px;
border-radius:20px;
text-align:center;
color:#777;
font-size:1rem;
">

No approved technicians or riders found.

</div>

`;

}

}

/* -----------------------------
   INITIALIZE
------------------------------ */

(async function init(){

    /* wait for the login check; stop if the visitor is being redirected */
    if(!(await TechRiderAPI.ready)) return;

    try{

        await loadRecords();

    }catch(err){

        TR.toast("Could not load records: " + err.message);

    }

    renderRecords();

    /* after rendering, so the message is not wiped out */
    showEmptyMessage();

    highlightSelectedRecord();

})();

/* -----------------------------
   READY
------------------------------ */

console.log(
"TechRider Records Ready"
);
