/* Scripts for admin-technicians.html */

/* ===========================================================
   TECHNICIAN MANAGEMENT
   PART 1
=========================================================== */

/* -----------------------------
   STORAGE KEYS
------------------------------ */

/* Technicians are loaded from the TechRider server (see js/api.js) */
let technicianList = [];

const esc = TechRiderAPI.escapeHtml;

/* -----------------------------
   DOM REFERENCES
------------------------------ */

const sidebar =
document.getElementById("sidebar");

const overlay =
document.getElementById("overlay");

const hamburger =
document.getElementById("hamburger");

const techTable =
document.getElementById("techTable");

const searchBox =
document.getElementById("searchBox");

const statusFilter =
document.getElementById("statusFilter");

const sortFilter =
document.getElementById("sortFilter");

const totalCount =
document.getElementById("totalCount");

const activeCount =
document.getElementById("activeCount");

const suspendedCount =
document.getElementById("suspendedCount");

const newCount =
document.getElementById("newCount");

/* -----------------------------
   SIDEBAR
------------------------------ */

/*
Desktop:
expanded by default
click logo to collapse

Mobile:
hamburger opens
overlay closes
*/

function toggleSidebar(){

    if(window.innerWidth <= 768){

        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");

        return;

    }

    sidebar.classList.toggle("collapsed");

}

hamburger.addEventListener("click",toggleSidebar);

overlay.addEventListener("click",()=>{

    sidebar.classList.remove("open");

    overlay.classList.remove("show");

});

window.addEventListener("resize",()=>{

    if(window.innerWidth>768){

        sidebar.classList.remove("open");

        overlay.classList.remove("show");

    }

});

/* -----------------------------
   LOAD TECHNICIANS
------------------------------ */

function getTechnicians(){

    return technicianList;

}

/* -----------------------------
   LOAD FROM SERVER
------------------------------ */

async function loadTechnicians(){

    const [techData, completedData] = await Promise.all([
        TechRiderAPI.get("/admin/users?role=technician"),
        TechRiderAPI.get("/admin/requests?group=completed")
    ]);

    technicianList = techData.users.map(user => ({
        ...user,
        approvedAt:user.reviewedAt,
        specialization:(user.technicianProfile || {}).specialization
    }));

    completedByTechnician = {};

    completedData.requests.forEach(r => {
        if(r.technicianId){
            completedByTechnician[r.technicianId] =
                (completedByTechnician[r.technicianId] || 0) + 1;
        }
    });

}

/* completed jobs per technician id */
let completedByTechnician = {};

/* -----------------------------
   DATE FORMAT
------------------------------ */

function formatDate(date){

    if(!date)
        return "-";

    return new Date(date)

        .toLocaleDateString(

            "en-GB",

            {

                day:"2-digit",

                month:"short",

                year:"numeric"

            }

        );

}

/* -----------------------------
   NEW THIS WEEK
------------------------------ */

function isThisWeek(date){

    if(!date)
        return false;

    const today =
    new Date();

    const joined =
    new Date(date);

    const sevenDaysAgo =
    new Date();

    sevenDaysAgo.setDate(

        today.getDate()-7

    );

    return joined >= sevenDaysAgo;

}

/* -----------------------------
   METRICS
------------------------------ */

function updateMetrics(){

    const technicians =
    getTechnicians();

    totalCount.textContent =
    technicians.length;

    activeCount.textContent =

    technicians.filter(

        tech=>!tech.suspended

    ).length;

    suspendedCount.textContent =

    technicians.filter(

        tech=>tech.suspended

    ).length;

    newCount.textContent =

    technicians.filter(

        tech=>

        isThisWeek(

            tech.approvedAt ||

            tech.createdAt ||

            tech.submittedAt

        )

    ).length;

}

/* -----------------------------
   COMPLETED JOBS
------------------------------ */

function getCompletedJobs(technicianId){

    return completedByTechnician[technicianId] || 0;

}

/* ===========================================================
   TECHNICIAN MANAGEMENT
   PART 2
=========================================================== */

/* -----------------------------
   PROFILE
------------------------------ */

function openProfile(name){

    window.location.href =

        "admin-records.html?tech=" +

        encodeURIComponent(name);

}

/* -----------------------------
   SUSPEND / REACTIVATE
------------------------------ */

async function toggleSuspend(technicianId){

    const technician =
    getTechnicians().find(t=>
        String(t.id)===String(technicianId)
    );

    if(!technician){
        return;
    }

    /* -----------------------------
       CONFIRM ACTION
    ------------------------------ */

    const action = technician.suspended
        ? "reactivate"
        : "suspend";

    const decision = await TR.suspendDialog(technician.fullName, technician.suspended, "technician");

    if(!decision){
        return;
    }

    const reason = decision.reason;

    /* -----------------------------
       SAVE ON THE SERVER
    ------------------------------ */

    try{

        const { user } =
        await TechRiderAPI.patch(
            `/admin/users/${technician.id}/suspend`,
            { suspended:!technician.suspended, reason:reason.trim() }
        );

        technician.suspended = user.suspended;

    }catch(err){

        TR.toast(err.message, "error");
        return;

    }

    renderTable();
    applyFiltersAndSort();
    updateMetrics();

    TR.toast(
        technician.suspended
        ? `${technician.fullName} has been suspended successfully.`
        : `${technician.fullName} has been reactivated successfully.`
    );

}
/* -----------------------------
   TABLE
------------------------------ */

function renderTable(){

    techTable.innerHTML = "";

    const technicians =
    getTechnicians();

    technicians.forEach(tech=>{

        const row =
        document.createElement("tr");

        row.dataset.name =
        tech.fullName || "";

        row.dataset.status =

        tech.suspended ?

        "suspended"

        :

        "active";

        row.dataset.joined =

        tech.approvedAt ||

        tech.createdAt ||

        tech.submittedAt ||

        "";

        row.dataset.jobs =

        getCompletedJobs(

            tech.id

        );

        row.innerHTML = `

<td>

${esc(tech.fullName || "-")}

</td>

<td>

${esc(tech.email || "-")}

</td>

<td>

${getCompletedJobs(tech.id)}

</td>

<td>

<span class="badge ${

tech.suspended ?

"suspendedStat"

:

"activeStat"

}">

${

tech.suspended ?

"Suspended"

:

"Active"

}

</span>

</td>

<td>

${formatDate(

tech.approvedAt ||

tech.createdAt ||

tech.submittedAt

)}

</td>

<td>

<div class="actions">

<button
class="btn btnGhost">

Profile

</button>

<button
class="btn btnPrimary">

${

tech.suspended ?

"Reactivate"

:

"Suspend"

}

</button>

</div>

</td>

`;

        /* ------------------
           PROFILE
        ------------------- */

        row

        .querySelector(".btnGhost")

        .addEventListener(

            "click",

            ()=>{

                openProfile(

                    tech.fullName

                );

            }

        );

        /* ------------------
           SUSPEND
        ------------------- */

        row

        .querySelector(".btnPrimary")

        .addEventListener(

            "click",

            ()=>{

                toggleSuspend(

                    tech.id

                );

            }

        );

        techTable.appendChild(row);

    });

    updateMetrics();

}

/* ===========================================================
   TECHNICIAN MANAGEMENT
   PART 3
=========================================================== */

/* -----------------------------
   SEARCH + FILTER + SORT
------------------------------ */

function applyFiltersAndSort(){

    const query =
    searchBox.value
    .trim()
    .toLowerCase();

    const status =
    statusFilter.value;

    const sort =
    sortFilter.value;

    let rows =

    Array.from(

        techTable.querySelectorAll("tr")

    );

    /* -------------------------
       FILTER
    -------------------------- */

    rows.forEach(row=>{

        const matchesSearch =

            row.dataset.name
            .toLowerCase()
            .includes(query);

        const matchesStatus =

            status==="all" ||

            row.dataset.status===status;

        row.style.display =

            matchesSearch && matchesStatus

            ?

            "table-row"

            :

            "none";

    });

    /* -------------------------
       SORT
    -------------------------- */

    const visibleRows =

    rows.filter(

        row=>row.style.display!=="none"

    );

    visibleRows.sort((a,b)=>{

        switch(sort){

            case "newest":

                return new Date(b.dataset.joined)

                -

                new Date(a.dataset.joined);

            case "oldest":

                return new Date(a.dataset.joined)

                -

                new Date(b.dataset.joined);

            case "jobs":

                return Number(b.dataset.jobs)

                -

                Number(a.dataset.jobs);

            case "alpha":

                return a.dataset.name.localeCompare(

                    b.dataset.name

                );

            default:

                return 0;

        }

    });

    visibleRows.forEach(row=>{

        techTable.appendChild(row);

    });

}

/* -----------------------------
   EVENTS
------------------------------ */

searchBox.addEventListener(

    "input",

    applyFiltersAndSort

);

statusFilter.addEventListener(

    "change",

    applyFiltersAndSort

);

sortFilter.addEventListener(

    "change",

    applyFiltersAndSort

);

/* -----------------------------
   INITIAL LOAD
------------------------------ */

(async function init(){

    /* wait for the login check; stop if the visitor is being redirected */
    if(!(await TechRiderAPI.ready)) return;

    try{

        await loadTechnicians();

    }catch(err){

        TR.toast("Could not load technicians: " + err.message);

    }

    renderTable();
    applyFiltersAndSort();

})();

console.log(

    "Technician Management Ready"

);
