/* Scripts for admin-customers.html */

const sidebar=document.getElementById('sidebar');
const overlay=document.getElementById('overlay');
const hamburger=document.getElementById('hamburger');

function toggleSidebar(){

if(window.innerWidth > 768){
sidebar.classList.toggle('collapsed');
}

}

hamburger.addEventListener('click',()=>{

sidebar.classList.add('open');
overlay.classList.add('show');

});

overlay.addEventListener('click',()=>{

sidebar.classList.remove('open');
overlay.classList.remove('show');
closeHistory();

});

/* GET CUSTOMERS */

/* ==========================================================
   CUSTOMER STORAGE
========================================================== */

/* Customers are loaded from the TechRider server (see js/api.js) */
let customerList = [];

const esc = TechRiderAPI.escapeHtml;

/* Safe text for inside onclick="..." attributes */
const jsArg = (value) => esc(JSON.stringify(String(value ?? "")));

function getCustomers() {

    return customerList;

}

async function loadCustomers() {

    const [customerData, requestData] = await Promise.all([
        TechRiderAPI.get("/admin/users?role=customer"),
        TechRiderAPI.get("/admin/requests")
    ]);

    customerList = customerData.users;

    requestList = requestData.requests.map(toHistoryRequest);

}



/* All repair requests (loaded from the server with the customers) */
let requestList = [];

function getRequests() {

    return requestList;

}

function toHistoryRequest(r) {

    return {
        id:r.id,
        customerId:r.customerId,
        customerEmail:r.customer ? r.customer.email : '',
        brand:r.brand,
        model:r.model,
        deviceType:r.deviceType,
        description:r.description,
        location:r.location,
        technicianName:r.technician ? r.technician.fullName : '',
        status:r.status === 'completed' ? 'completed'
            : (r.status === 'cancelled' || r.status === 'quote_rejected') ? 'cancelled'
            : 'pending',
        statusLabel:r.statusLabel,
        createdAt:r.createdAt
    };

}

/* ==========================================================
   GLOBAL CUSTOMER CACHE
========================================================== */

let customers = getCustomers();

/* ==========================================================
   REQUEST COUNT
========================================================== */

function getCustomerRequestCount(customerId, email) {

    const requests = getRequests();

    return requests.filter(request => {

        if (
            customerId &&
            request.customerId &&
            String(request.customerId) === String(customerId)
        ) {
            return true;
        }

        return (

            (request.customerEmail || "")
            .toLowerCase()

            ===

            (email || "")
            .toLowerCase()

        );

    }).length;

}

/* ==========================================================
   METRICS
========================================================== */

function updateMetrics(filteredCustomers = customers) {

    const total = customers.length;

    const suspended = customers.filter(

        customer => customer.suspended === true

    ).length;

    const active = total - suspended;

    const oneWeekAgo =

        Date.now() - (7 * 24 * 60 * 60 * 1000);

    const newUsers = customers.filter(customer => {

        if (!customer.createdAt) {

            return false;

        }

        return (

            new Date(customer.createdAt).getTime()

            >=

            oneWeekAgo

        );

    }).length;

    document.getElementById(

        "totalUsers"

    ).textContent = total;

    document.getElementById(

        "activeUsers"

    ).textContent = active;

    document.getElementById(

        "suspendedUsers"

    ).textContent = suspended;

    document.getElementById(

        "newUsers"

    ).textContent = newUsers;

}

/* ==========================================================
   RENDER CUSTOMERS
========================================================== */

function renderCustomers() {

    customers = getCustomers();

    const tbody =

        document.getElementById(

            "customerTable"

        );

    tbody.innerHTML = "";

    const search =

        document.getElementById(

            "searchBox"

        )

        .value

        .trim()

        .toLowerCase();

    const statusFilter =

        document.getElementById(

            "statusFilter"

        ).value;

    const sortFilter =

        document.getElementById(

            "sortFilter"

        ).value;

    let filtered = customers.filter(customer => {

        const name =

            (customer.fullName || "")

            .toLowerCase();

        const status =

            customer.suspended

            ? "suspended"

            : "active";

        const matchName =

            name.includes(search);

        const matchStatus =

            statusFilter === "all"

            ||

            statusFilter === status;

        return (

            matchName &&

            matchStatus

        );

    });

    /* ==========================
       SORTING
    ========================== */

    filtered.sort((a, b) => {

        switch (sortFilter) {

            case "oldest":

                return (

                    new Date(a.createdAt || 0)

                    -

                    new Date(b.createdAt || 0)

                );

            case "requests":

                return (

                    getCustomerRequestCount(

                        b.id,

                        b.email

                    )

                    -

                    getCustomerRequestCount(

                        a.id,

                        a.email

                    )

                );

            case "alpha":

                return (

                    (a.fullName || "")

                    .localeCompare(

                        b.fullName || ""

                    )

                );

            case "newest":

            default:

                return (

                    new Date(b.createdAt || 0)

                    -

                    new Date(a.createdAt || 0)

                );

        }

    });

    /* ==========================
       EMPTY STATE
    ========================== */

    document.getElementById(

        "emptyState"

    ).style.display =

        filtered.length

        ? "none"

        : "block";

    /* ==========================
       TABLE
    ========================== */

    filtered.forEach(customer => {

        const requestCount =

            getCustomerRequestCount(

                customer.id,

                customer.email

            );

        tbody.innerHTML += `

<tr>

<td>

${esc(customer.fullName || "-")}

</td>

<td>

${esc(customer.email || "-")}

</td>

<td>

${esc(customer.phone || "-")}

</td>

<td>

${requestCount}

</td>

<td>

<span class="status ${customer.suspended ? "suspendedStat" : "activeStat"}">

${customer.suspended ? "Suspended" : "Active"}

</span>

</td>

<td>

${customer.createdAt
? new Date(customer.createdAt).toLocaleDateString()
: "-"}

</td>

<td>

<div class="actions">

<button
class="btn btnGhost"
onclick="viewHistory(${jsArg(customer.email)})">

History

</button>

<button
class="btn btnPrimary"
onclick="toggleSuspend(${jsArg(customer.email)})">

${customer.suspended ? "Reactivate" : "Suspend"}

</button>

</div>

</td>

</tr>

`;

    });

    updateMetrics();

}

/* ==========================================================
   FILTER EVENTS
========================================================== */

document

.getElementById(

    "searchBox"

)

.addEventListener(

    "input",

    renderCustomers

);

document

.getElementById(

    "statusFilter"

)

.addEventListener(

    "change",

    renderCustomers

);

document

.getElementById(

    "sortFilter"

)

.addEventListener(

    "change",

    renderCustomers

);
/* VIEW HISTORY */

/* ==========================================================
   CUSTOMER HISTORY
========================================================== */

function viewHistory(email){

    const modal =
        document.getElementById(
            "historyModal"
        );

    const content =
        document.getElementById(
            "historyContent"
        );

    const title =
        document.getElementById(
            "historyTitle"
        );

    const customer =
        customers.find(customer =>

            customer.email === email

        );

    if(!customer){

        return;

    }

    title.textContent =
        `${customer.fullName} Repair History`;

    const requests =
        getRequests();

    /* ======================================
       GET THIS CUSTOMER'S REQUESTS
    ====================================== */

    const customerRequests =
        requests.filter(request=>{

            if(

                request.customerId &&
                customer.id &&
                String(request.customerId) ===
                String(customer.id)

            ){

                return true;

            }

            return (

                (request.customerEmail || "")
                .toLowerCase()

                ===

                email.toLowerCase()

            );

        });

    content.innerHTML = "";

    /* ======================================
       EMPTY HISTORY
    ====================================== */

    if(customerRequests.length===0){

        content.innerHTML = `

<div class="no-history">

No repair requests found.

</div>

`;

        modal.classList.add("show");

        overlay.classList.add("show");

        return;

    }

    /* ======================================
       SORT NEWEST FIRST
    ====================================== */

    customerRequests.sort((a,b)=>{

        return (

            new Date(b.createdAt || 0)

            -

            new Date(a.createdAt || 0)

        );

    });

    /* ======================================
       BUILD HISTORY
    ====================================== */

    customerRequests.forEach(request=>{

        let statusColor =
            "#f59e0b";

        if(

            request.status === "completed"

        ){

            statusColor =
                "#16a34a";

        }

        if(

            request.status === "cancelled"

        ){

            statusColor =
                "#dc2626";

        }

        if(

            request.status === "pending"

        ){

            statusColor =
                "#5a189a";

        }

        content.innerHTML += `

<div class="history-card">

<div class="history-title">

${esc(request.deviceType || "-")}

${esc(request.brand || "")}

${esc(request.model || "")}

</div>

<div class="history-item">

<strong>Status:</strong>

<span style="color:${statusColor};font-weight:600;">

${esc(request.statusLabel || request.status || "Pending")}

</span>

</div>

<div class="history-item">

<strong>Issue:</strong>

${esc(request.description || "-")}

</div>

<div class="history-item">

<strong>Location:</strong>

${esc(request.location || "-")}

</div>

<div class="history-item">
<strong>Technician:</strong>
${esc(request.technicianName || "Not Assigned")}
</div>

<div class="history-item">

<strong>Created:</strong>

${

request.createdAt

?

new Date(request.createdAt)

.toLocaleString()

:

"-"

}

</div>

</div>

`;

    });

    modal.classList.add("show");

    overlay.classList.add("show");

}

/* CLOSE MODAL */

/* ==========================================================
   CLOSE HISTORY MODAL
========================================================== */

function closeHistory(){

    document
    .getElementById("historyModal")
    .classList.remove("show");

    overlay.classList.remove("show");

}

/* ==========================================================
   SUSPEND / REACTIVATE CUSTOMER
========================================================== */

async function toggleSuspend(email){

    const customer = getCustomers().find(
        customer =>
            customer.email === email
    );

    if(!customer){
        return;
    }

    /* ==========================
       CONFIRM
    ========================== */

    const decision = await TR.suspendDialog(customer.fullName, customer.suspended, "customer");

    if(!decision){
        return;
    }

    const reason = decision.reason;

    /* ==========================
       SAVE ON THE SERVER
    ========================== */

    try{

        const { user } =
            await TechRiderAPI.patch(
                `/admin/users/${customer.id}/suspend`,
                { suspended:!customer.suspended, reason:reason.trim() }
            );

        customer.suspended = user.suspended;

    }catch(err){

        TR.toast(err.message, "error");
        return;

    }

    /* ==========================
       SUCCESS MESSAGE
    ========================== */

    if(customer.suspended){

        TR.toast(
            `${customer.fullName} has been suspended.`
        );

    }
    else{

        TR.toast(
            `${customer.fullName} has been reactivated.`
        );

    }

    renderCustomers();

}

/* ==========================================================
   FILTER EVENTS
========================================================== */

document

.getElementById(

    "searchBox"

)

.addEventListener(

    "input",

    renderCustomers

);

document

.getElementById(

    "statusFilter"

)

.addEventListener(

    "change",

    renderCustomers

);

document

.getElementById(

    "sortFilter"

)

.addEventListener(

    "change",

    renderCustomers

);

/* ==========================================================
   INITIALIZE PAGE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function(){

        /* wait for the login check; stop if the visitor is being redirected */
        if(!(await TechRiderAPI.ready)) return;

        try{

            await loadCustomers();

        }catch(err){

            TR.toast("Could not load customers: " + err.message);

        }

        renderCustomers();

    }
);
