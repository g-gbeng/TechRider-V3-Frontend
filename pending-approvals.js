/* ==========================================================
   TECHRIDER ADMIN - PENDING APPROVALS
   PART 1 (Refactored)
========================================================== */

const PENDING_KEY = "techrider_pending_registrations";
const TECHNICIAN_KEY = "techrider_technicians";
const RIDER_KEY = "techrider_riders";

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

function getPendingRegistrations(){

    return JSON.parse(
        localStorage.getItem(PENDING_KEY)
    ) || [];

}

function savePendingRegistrations(data){

    localStorage.setItem(
        PENDING_KEY,
        JSON.stringify(data)
    );

}

function getApprovedTechnicians(){

    return JSON.parse(
        localStorage.getItem(TECHNICIAN_KEY)
    ) || [];

}

function getApprovedRiders(){

    return JSON.parse(
        localStorage.getItem(RIDER_KEY)
    ) || [];

}

function saveApprovedTechnicians(data){

    localStorage.setItem(
        TECHNICIAN_KEY,
        JSON.stringify(data)
    );

}

function saveApprovedRiders(data){

    localStorage.setItem(
        RIDER_KEY,
        JSON.stringify(data)
    );

}

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

${value(getField(applicant,"fullName"))}

</div>

<div class="info">

<i class="fas fa-envelope"></i>

${value(getField(applicant,"email"))}

</div>

</div>

<span class="badge ${badge}">

<i class="fas ${icon}"></i>

${applicant.userType}

</span>

</div>

<div class="info">

<i class="fas fa-phone"></i>

${value(getField(applicant,"phone"))}

</div>

<div class="info">

<i class="fas fa-location-dot"></i>

${value(getField(applicant,"address"))}

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

<label>${field[0]}</label>

<span>${value(field[1])}</span>

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

function approveApplicantAction(){

    if(!currentApplicant) return;

    let queue = getPendingRegistrations();

    queue = queue.filter(applicant =>

        String(applicant.id) !== String(currentApplicant.id)

    );

    savePendingRegistrations(queue);

    if(currentApplicant.userType === "Technician"){

        const technicians = getApprovedTechnicians();

        technicians.push({

            ...currentApplicant,

            approvedAt:new Date().toISOString(),

            status:"Approved"

        });

        saveApprovedTechnicians(technicians);

    }

    else{

        const riders = getApprovedRiders();

        riders.push({

            ...currentApplicant,

            approvedAt:new Date().toISOString(),

            status:"Approved"

        });

        saveApprovedRiders(riders);

    }

    closeModalFn();

    renderQueue();

    alert(

        currentApplicant.userType +

        " approved successfully."

    );

}

/* ==========================================================
   REJECT APPLICANT
========================================================== */

function rejectApplicantAction(){

    if(!currentApplicant) return;

    const confirmReject = confirm(

        "Reject this application?"

    );

    if(!confirmReject) return;

    let queue = getPendingRegistrations();

    queue = queue.filter(applicant =>

        String(applicant.id) !== String(currentApplicant.id)

    );

    savePendingRegistrations(queue);

    closeModalFn();

    renderQueue();

    alert("Application rejected.");

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

        renderQueue();

    }

);