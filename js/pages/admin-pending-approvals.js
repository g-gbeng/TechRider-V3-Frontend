/* ==========================================================
   TECHRIDER ADMIN - PENDING APPROVALS
   PART 1 (Refactored)
========================================================== */

/* Applications are loaded from the TechRider server (see js/api.js) */

/* ==========================================================
   DOM
========================================================== */

const technicianList = document.getElementById("technicianList");
const riderList = document.getElementById("riderList");

const technicianCount = document.getElementById("technicianCount");
const riderCount = document.getElementById("riderCount");

const techMetric = document.getElementById("techMetric");
const riderMetric = document.getElementById("riderMetric");
const queueMetric = document.getElementById("queueMetric");

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");

const emptyState = document.getElementById("emptyState");

const reviewModal = document.getElementById("reviewModal");
const closeModal = document.getElementById("closeModal");

const modalApplicantName = document.getElementById("modalApplicantName");
const modalSubtitle = document.getElementById("modalSubtitle");

const detailsGrid = document.getElementById("detailsGrid");
const documentGrid = document.getElementById("documentGrid");

const modalApprove = document.getElementById("modalApprove");
const modalReject = document.getElementById("modalReject");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const closeLightbox = document.getElementById("closeLightbox");

let currentApplicant = null;

/* ==========================================================
   STORAGE
========================================================== */

/* Applications currently waiting for review (loaded from the server) */
let pendingQueue = [];

/* Turn a server account into the shape this page displays */
function toApplicant(user){

    const tech = user.technicianProfile || {};
    const rider = user.riderProfile || {};

    return {
        id:user.id,
        userType:user.role === "technician" ? "Technician" : "Rider",
        fullName:user.fullName,
        email:user.email,
        phone:user.phone,
        address:user.address,
        specialization:tech.specialization,
        experience:tech.yearsExperience,
        vehicleType:rider.vehicleType,
        vehicleBrand:rider.vehicleBrand,
        plateNumber:rider.plateNumber,
        submittedAt:user.createdAt,
        documents:(user.documents || []).map(doc => ({
            title:doc.label,
            image:doc.url,
            mimeType:doc.mimeType
        }))
    };

}

async function loadQueue(){

    /* wait for the login check; stop if the visitor is being redirected */
    if(!(await TechRiderAPI.ready)) return;

    try{

        const data =
            await TechRiderAPI.get("/admin/applications");

        pendingQueue =
            data.applications.map(toApplicant);

    }catch(err){

        alert("Could not load applications: " + err.message);

    }

    renderQueue();

}

function getPendingRegistrations(){

    return pendingQueue;

}

const esc = TechRiderAPI.escapeHtml;

/* ==========================================================
   SAFE PROPERTY HELPERS
========================================================== */

function value(v){

    if(v === undefined || v === null || v === "")
        return "-";

    return v;

}

function getField(applicant, field){

    if(applicant[field] !== undefined)
        return applicant[field];

    if(applicant.profile && applicant.profile[field] !== undefined)
        return applicant.profile[field];

    return "";

}

function getDocuments(applicant){

    if(Array.isArray(applicant.documents))
        return applicant.documents;

    const docs = [];

    if(applicant.facialImage){

        docs.push({

            title:"Facial Image",

            image:applicant.facialImage

        });

    }

    if(applicant.userType==="Technician"){

        if(applicant.governmentId){

            docs.push({

                title:"Government ID",

                image:applicant.governmentId

            });

        }

        if(applicant.businessLicense){

            docs.push({

                title:"Business License",

                image:applicant.businessLicense

            });

        }

    }

    else{

        if(applicant.driversLicense){

            docs.push({

                title:"Driver's License",

                image:applicant.driversLicense

            });

        }

        if(applicant.governmentId){

            docs.push({

                title:"Government ID",

                image:applicant.governmentId

            });

        }

    }

    return docs;

}

/* ==========================================================
   METRICS
========================================================== */

function updateMetrics(queue){

    const technicians = queue.filter(
        x => x.userType === "Technician"
    ).length;

    const riders = queue.filter(
        x => x.userType === "Rider"
    ).length;

    technicianCount.textContent = technicians;
    riderCount.textContent = riders;

    techMetric.textContent = technicians;
    riderMetric.textContent = riders;
    queueMetric.textContent = queue.length;

}

/* ==========================================================
   SEARCH
========================================================== */

function matchesSearch(applicant, term){

    term = term.toLowerCase();

    const values = [

        getField(applicant,"fullName"),
        getField(applicant,"email"),
        getField(applicant,"phone"),
        getField(applicant,"address"),
        getField(applicant,"specialization"),
        getField(applicant,"experience"),
        getField(applicant,"vehicleType"),
        getField(applicant,"vehicleBrand"),
        getField(applicant,"plateNumber")

    ];

    return values.some(v =>

        String(v)
        .toLowerCase()
        .includes(term)

    );

}

/* ==========================================================
   CARD TEMPLATE
========================================================== */

function applicantCard(applicant){

    const isTech =
        applicant.userType === "Technician";

    const icon =
        isTech ? "fa-tools" : "fa-motorcycle";

    const badge =
        isTech ? "tech" : "rider";

    const secondary =
        isTech
        ? getField(applicant,"specialization")
        : getField(applicant,"vehicleBrand");

    return `

<div class="applicant-card">

<div class="applicant-header">

<div>

<div class="applicant-name">

${esc(value(getField(applicant,"fullName")))}

</div>

<div class="info">

<i class="fas fa-envelope"></i>

${esc(value(getField(applicant,"email")))}

</div>

</div>

<span class="badge ${badge}">

<i class="fas ${icon}"></i>

${applicant.userType}

</span>

</div>

<div class="info">

<i class="fas fa-phone"></i>

${esc(value(getField(applicant,"phone")))}

</div>

<div class="info">

<i class="fas fa-location-dot"></i>

${esc(value(getField(applicant,"address")))}

</div>


<div class="actions">

<button
class="btn review"
onclick="openApplicant('${applicant.id}')">

<i class="fas fa-folder-open"></i>

Review Docs

</button>

</div>

</div>

`;

}

/* ==========================================================
   RENDER QUEUE
========================================================== */

function renderQueue(){

    const queue = getPendingRegistrations();

    updateMetrics(queue);

    technicianList.innerHTML = "";
    riderList.innerHTML = "";

    const search =
        searchInput.value.trim();

    const filter =
        filterType.value;

    const technicians = queue.filter(applicant=>{

        if(applicant.userType !== "Technician")
            return false;

        if(filter !== "all" &&
           filter !== "Technician")
            return false;

        return matchesSearch(
            applicant,
            search
        );

    });

    const riders = queue.filter(applicant=>{

        if(applicant.userType !== "Rider")
            return false;

        if(filter !== "all" &&
           filter !== "Rider")
            return false;

        return matchesSearch(
            applicant,
            search
        );

    });

    technicians.forEach(applicant=>{

        technicianList.innerHTML +=
            applicantCard(applicant);

    });

    riders.forEach(applicant=>{

        riderList.innerHTML +=
            applicantCard(applicant);

    });

    emptyState.style.display =
        (technicians.length===0 &&
         riders.length===0)
         ? "block"
         : "none";

}

/* ==========================================================
   REVIEW APPLICANT
========================================================== */

function openApplicant(id){

    const queue = getPendingRegistrations();

    currentApplicant = queue.find(

        applicant => String(applicant.id) === String(id)

    );

    if(!currentApplicant){

        alert("Applicant not found.");

        return;

    }

    populateModal(currentApplicant);

    reviewModal.classList.add("show");

}

/* ==========================================================
   POPULATE MODAL
========================================================== */

function populateModal(applicant){

    modalApplicantName.textContent =
        value(getField(applicant,"fullName"));

    const submitted = applicant.submittedAt
        ? new Date(applicant.submittedAt).toLocaleString()
        : "Unknown Date";

    modalSubtitle.textContent =
        applicant.userType + " • Submitted " + submitted;

    detailsGrid.innerHTML = "";

    documentGrid.innerHTML = "";

    const fields = [

        ["Full Name",getField(applicant,"fullName")],
        ["Email",getField(applicant,"email")],
        ["Phone",getField(applicant,"phone")],
        ["Address",getField(applicant,"address")],
        ["User Type",applicant.userType]

    ];

    if(applicant.userType==="Technician"){

        fields.push(

            ["Specialization",
            getField(applicant,"specialization")]

        );

        fields.push(

            ["Experience",
            getField(applicant,"experience")]

        );

    }

    else{

        fields.push(

            ["Vehicle Type",
            getField(applicant,"vehicleType")]

        );

        fields.push(

            ["Vehicle Brand",
            getField(applicant,"vehicleBrand")]

        );

        fields.push(

            ["Plate Number",
            getField(applicant,"plateNumber")]

        );

    }

    fields.forEach(field=>{

        const card = document.createElement("div");

        card.className = "detail-card";

        card.innerHTML = `

<label>${esc(field[0])}</label>
<span>${esc(value(field[1]))}</span>

`;

        detailsGrid.appendChild(card);

    });

    renderDocuments(applicant);

}

/* ==========================================================
   DOCUMENT RENDERER
========================================================== */

function renderDocuments(applicant){

    documentGrid.innerHTML = "";

    const docs = getDocuments(applicant);

    if(docs.length===0){

        documentGrid.innerHTML = `

<div class="detail-card">

<label>

No documents uploaded

</label>

<span>

This applicant has no stored images.

</span>

</div>

`;

        return;

    }

    docs.forEach(doc=>{

        if(!doc.image) return;

        const card = document.createElement("div");

        card.className = "document-card";

        /* PDF documents open in a new tab */
        if(doc.mimeType === "application/pdf"){

            const link = document.createElement("a");
            link.href = doc.image;
            link.target = "_blank";
            link.rel = "noopener";
            link.className = "document-info";
            link.style.display = "block";
            link.style.padding = "24px";
            link.style.textAlign = "center";
            link.innerHTML =
                '<i class="fas fa-file-pdf" style="font-size:2rem;color:#d62839;"></i>' +
                '<h4>' + esc(doc.title) + '</h4><p>PDF document: click to open</p>';

            card.appendChild(link);
            documentGrid.appendChild(card);

            return;

        }

        const img = document.createElement("img");

        img.src = doc.image;

        img.alt = doc.title;

        img.loading = "lazy";

        img.addEventListener("click",()=>{

            openLightbox(doc.image);

        });

        img.onerror = function(){

            this.src = "";

            this.style.display = "none";

        };

        const info = document.createElement("div");

        info.className = "document-info";

        info.innerHTML = `

<h4>${doc.title}</h4>

<p>Click image to enlarge</p>

`;

        card.appendChild(img);

        card.appendChild(info);

        documentGrid.appendChild(card);

    });

}

/* ==========================================================
   LIGHTBOX
========================================================== */

function openLightbox(src){

    if(!src) return;

    lightboxImage.src = src;

    lightbox.classList.add("show");

}

function closeLightboxFn(){

    lightbox.classList.remove("show");

    lightboxImage.src = "";

}

/* ==========================================================
   MODAL CLOSE
========================================================== */

function closeModalFn(){

    reviewModal.classList.remove("show");

    currentApplicant = null;

    detailsGrid.innerHTML = "";

    documentGrid.innerHTML = "";

}

/* ==========================================================
   APPROVE APPLICANT
========================================================== */

async function approveApplicantAction(){

    if(!currentApplicant) return;

    const applicant = currentApplicant;

    modalApprove.disabled = true;

    try{

        await TechRiderAPI.post(
            "/admin/applications/" + applicant.id + "/approve"
        );

        pendingQueue = pendingQueue.filter(item =>
            String(item.id) !== String(applicant.id)
        );

        closeModalFn();

        renderQueue();

        alert(
            applicant.userType +
            " approved successfully."
        );

    }catch(err){

        alert(err.message);

    }finally{

        modalApprove.disabled = false;

    }

}

/* ==========================================================
   REJECT APPLICANT
========================================================== */

async function rejectApplicantAction(){

    if(!currentApplicant) return;

    const applicant = currentApplicant;

    const confirmReject = confirm(
        "Reject this application?"
    );

    if(!confirmReject) return;

    const reason = prompt(
        "Reason for rejection (optional). The applicant sees this when they try to log in:",
        ""
    );

    if(reason === null) return;

    modalReject.disabled = true;

    try{

        await TechRiderAPI.post(
            "/admin/applications/" + applicant.id + "/reject",
            { reason:reason.trim() }
        );

        pendingQueue = pendingQueue.filter(item =>
            String(item.id) !== String(applicant.id)
        );

        closeModalFn();

        renderQueue();

        alert("Application rejected.");

    }catch(err){

        alert(err.message);

    }finally{

        modalReject.disabled = false;

    }

}

/* ==========================================================
   MODAL EVENTS
========================================================== */

closeModal.addEventListener(

    "click",

    closeModalFn

);

reviewModal.addEventListener(

    "click",

    function(e){

        if(e.target===reviewModal){

            closeModalFn();

        }

    }

);

modalApprove.addEventListener(

    "click",

    approveApplicantAction

);

modalReject.addEventListener(

    "click",

    rejectApplicantAction

);

/* ==========================================================
   LIGHTBOX EVENTS
========================================================== */

closeLightbox.addEventListener(

    "click",

    closeLightboxFn

);

lightbox.addEventListener(

    "click",

    function(e){

        if(

            e.target===lightbox ||

            e.target===closeLightbox

        ){

            closeLightboxFn();

        }

    }

);

/* ==========================================================
   SEARCH EVENTS
========================================================== */

searchInput.addEventListener(

    "input",

    renderQueue

);

filterType.addEventListener(

    "change",

    renderQueue

);

/* ==========================================================
   ESC KEY SUPPORT
========================================================== */

document.addEventListener(

    "keydown",

    function(e){

        if(e.key==="Escape"){

            closeModalFn();

            closeLightboxFn();

        }

    }

);

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function(){
        loadQueue();
    }
);

/* Live updates: refresh as soon as the server says something changed */
TechRiderAPI.onUpdate(() => {
    if(!reviewModal.classList.contains("show")) loadQueue();
});
