/* Scripts for admin-riders.html */

    /* ===========================================================
   RIDER MANAGEMENT
   PART 1
   Sidebar + Storage + Metrics + Rendering
=========================================================== */

/* =========================================
SIDEBAR
========================================= */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function toggleSidebar(){

    if(window.innerWidth <= 768){

        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");

    }else{

        sidebar.classList.toggle("collapsed");

    }

}

document
.getElementById("hamburger")
.addEventListener("click",toggleSidebar);

overlay.addEventListener("click",()=>{

    sidebar.classList.remove("open");
    overlay.classList.remove("show");

});

window.addEventListener("resize",()=>{

    if(window.innerWidth > 768){

        sidebar.classList.remove("open");
        overlay.classList.remove("show");

    }

});


/* =========================================
STORAGE
========================================= */

/* Riders are loaded from the TechRider server (see js/api.js) */
let riderList = [];

const esc = TechRiderAPI.escapeHtml;

/* Safe text for inside onclick="..." attributes */
const jsArg = (value) => esc(JSON.stringify(String(value ?? "")));

const riderTable =
document.getElementById("riderTable");


/* =========================================
HELPERS
========================================= */

function getRiders(){

    return riderList;

}

async function loadRiders(){

    const [data, deliveryData] = await Promise.all([
        TechRiderAPI.get("/admin/users?role=rider"),
        TechRiderAPI.get("/admin/riders/available")
    ]);

    /* delivered trips and current job, per rider */
    const stats = new Map(
        deliveryData.riders.map(r => [r.id, r])
    );

    riderList = data.users.map(user => ({
        ...user,
        approvedAt:user.reviewedAt,
        vehicleType:(user.riderProfile || {}).vehicleType,
        plateNumber:(user.riderProfile || {}).plateNumber,
        completedDeliveries:(stats.get(user.id) || {}).completedDeliveries || 0,
        busy:Boolean((stats.get(user.id) || {}).busy)
    }));

}




/* =========================================
DATE FORMAT
========================================= */

function formatJoinedDate(date){

    if(!date) return "N/A";

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


/* =========================================
METRICS
========================================= */

function updateMetrics(){

    const riders = getRiders();

    document.getElementById(
        "totalRidersCount"
    ).textContent = riders.length;

    document.getElementById(
        "suspendedCount"
    ).textContent = riders.filter(

        rider => rider.suspended

    ).length;

    /* -------------------------
       New This Week
    ------------------------- */

    const today = new Date();

    const oneWeekAgo =
    new Date();

    oneWeekAgo.setDate(
        today.getDate()-7
    );

    const newThisWeek = riders.filter(rider=>{

        if(!rider.approvedAt &&
           !rider.createdAt &&
           !rider.submittedAt){

            return false;

        }

        const joined = new Date(

            rider.approvedAt ||
            rider.createdAt ||
            rider.submittedAt

        );

        return joined >= oneWeekAgo;

    });

    document.getElementById(
        "newThisWeekCount"
    ).textContent = newThisWeek.length;

    /* -------------------------
       Completed Deliveries
    ------------------------- */

    let totalCompleted = 0;

    riders.forEach(rider=>{

        totalCompleted +=
        Number(
            rider.completedDeliveries || 0
        );

    });

    document.getElementById(
        "completedDeliveriesCount"
    ).textContent = totalCompleted;

}


/* =========================================
PROFILE
========================================= */

function openProfile(name){

    location.href =

    "admin-records.html?rider=" +

    encodeURIComponent(name);

}


/* =========================================
RENDER TABLE
========================================= */

function renderTable(){

    const riders = getRiders();

    riderTable.innerHTML = "";

    riders.forEach(rider=>{

        const completed =

        rider.completedDeliveries || 0;

        riderTable.innerHTML += `

<tr

data-id="${esc(rider.id)}"
data-name="${esc(rider.fullName)}"
data-status="${
rider.suspended
? "suspended"
: "active"
}"
data-joined="${
rider.approvedAt ||
rider.createdAt ||
rider.submittedAt
}"
data-deliveries="${completed}">

<td>${esc(rider.fullName)}</td>

<td>${esc(rider.email || "-")}</td>

<td>${esc(rider.vehicleType || "-")}</td>

<td>${esc(rider.plateNumber || "-")}</td>

<td>${completed}</td>

<td>

<span class="badge
${rider.suspended
? "suspendedStat"
: "activeStat"}">

${rider.suspended
? "Suspended"
: "Active"}

</span>

</td>

<td>

${formatJoinedDate(

rider.approvedAt ||
rider.createdAt ||
rider.submittedAt

)}

</td>

<td>

<div class="tr-menu">
<button type="button" class="tr-menu-btn" aria-haspopup="menu" aria-expanded="false">Actions <i class="fas fa-chevron-down chev" aria-hidden="true"></i></button>
<div class="tr-menu-list" role="menu" hidden>
<button type="button" role="menuitem" class="tr-menu-item btnGhost" onclick="openProfile(${jsArg(rider.fullName)})"><i class="fas fa-id-card"></i> View profile</button>
<div class="tr-menu-sep" role="separator"></div>
<button type="button" role="menuitem" class="tr-menu-item btnPrimary ${rider.suspended ? "" : "danger"}" onclick="toggleSuspend(${jsArg(rider.id)})"><i class="fas ${rider.suspended ? "fa-user-check" : "fa-ban"}"></i> ${rider.suspended ? "Reactivate" : "Suspend"}</button>
</div>

</div>

</td>

</tr>

`;

    });

    updateMetrics();

}

/* ===========================================================
   RIDER MANAGEMENT
   PART 2
   Suspend + Search + Filters + Sorting
=========================================================== */

/* =========================================
SUSPEND / REACTIVATE
========================================= */

async function toggleSuspend(id){

    const rider = getRiders().find(r=>r.id===id);

    if(!rider){
        return;
    }

    /* -------------------------
       CONFIRMATION
    ------------------------- */

    const decision = await TR.suspendDialog(rider.fullName, rider.suspended, "rider");

    if(!decision){
        return;
    }

    const reason = decision.reason;

    /* -------------------------
       SAVE ON THE SERVER
    ------------------------- */

    try{

        const { user } =
        await TechRiderAPI.patch(
            `/admin/users/${rider.id}/suspend`,
            { suspended:!rider.suspended, reason:reason.trim() }
        );

        rider.suspended = user.suspended;

    }catch(err){

        TR.toast(err.message, "error");
        return;

    }

    refreshPage();

}


/* =========================================
SEARCH + FILTER + SORT
========================================= */

function applyFiltersAndSort(){

    const query =
    document
    .getElementById("searchBox")
    .value
    .toLowerCase();

    const status =
    document
    .getElementById("statusFilter")
    .value;

    const sort =
    document
    .getElementById("sortFilter")
    .value;

    const rows = [

        ...riderTable.querySelectorAll("tr")

    ];

    /* -------------------------
       FILTER
    ------------------------- */

    rows.forEach(row=>{

        const matchesSearch =

        row.dataset.name
        .toLowerCase()
        .includes(query);

        const matchesStatus =

        status==="all" ||

        row.dataset.status===status;

        row.style.display =

        matchesSearch &&
        matchesStatus

        ? "table-row"

        : "none";

    });

    /* -------------------------
       SORT
    ------------------------- */

    const visibleRows =

    rows.filter(

        row=>row.style.display!=="none"

    );

    visibleRows.sort((a,b)=>{

        switch(sort){

            case "newest":

                return new Date(
                    b.dataset.joined
                ) -

                new Date(
                    a.dataset.joined
                );

            case "oldest":

                return new Date(
                    a.dataset.joined
                ) -

                new Date(
                    b.dataset.joined
                );

            case "deliveries":

                return Number(
                    b.dataset.deliveries
                ) -

                Number(
                    a.dataset.deliveries
                );

            case "alpha":

                return a.dataset.name
                .localeCompare(
                    b.dataset.name
                );

            default:

                return 0;

        }

    });

    visibleRows.forEach(row=>{

        riderTable.appendChild(row);

    });

}


/* =========================================
EVENTS
========================================= */

document
.getElementById("searchBox")
.addEventListener(
    "input",
    applyFiltersAndSort
);

document
.getElementById("statusFilter")
.addEventListener(
    "change",
    applyFiltersAndSort
);

document
.getElementById("sortFilter")
.addEventListener(
    "change",
    applyFiltersAndSort
);

/* ===========================================================
   RIDER MANAGEMENT
   PART 3
   Initialization + Live Updates
=========================================================== */

/* =========================================
EMPTY STATE
========================================= */

function checkEmptyTable(){

    const visibleRows = [

        ...riderTable.querySelectorAll("tr")

    ].filter(row=>row.style.display!=="none");

    const existingEmpty =
    document.getElementById("emptyRow");

    if(existingEmpty){
        existingEmpty.remove();
    }

    if(visibleRows.length===0){

        riderTable.innerHTML = `

<tr id="emptyRow">

<td colspan="8"
style="
text-align:center;
padding:40px;
color:#777;
font-weight:500;
">

No riders found.

</td>

</tr>

`;

    }

}


/* =========================================
REFRESH PAGE DATA
========================================= */

function refreshPage(){

    renderTable();

    applyFiltersAndSort();

    checkEmptyTable();

}


/* =========================================
INITIAL LOAD
========================================= */

(async function init(){

    /* wait for the login check; stop if the visitor is being redirected */
    if(!(await TechRiderAPI.ready)) return;

    try{

        await loadRiders();

    }catch(err){

        TR.toast("Could not load riders: " + err.message);

    }

    refreshPage();

})();

console.log(

    "TechRider Rider Management Ready"

);
