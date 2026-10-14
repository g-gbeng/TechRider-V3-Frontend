/* Scripts for admin-reports.html */

/* =====================================================
   REPORTS
   Every number is calculated by the server from real
   jobs, deliveries and accounts. Money only counts jobs
   the customer paid for and that were not refunded.
   Login is checked by the page guard in js/api.js.
===================================================== */

let report = null;

function setMetric(id, value){

    const element = document.getElementById(id);
    if(element) element.textContent = value;

}

function formatNaira(value){

    return "₦" + Number(value || 0).toLocaleString("en-NG");

}

const percent = (value) => `${value}%`;

/* =====================================================
   LOAD + RENDER
===================================================== */

async function loadReport(){

    try{

        report = (await TechRiderAPI.get("/admin/reports")).report;

    }catch(err){

        TR.toast("Could not load reports: " + err.message);
        return;

    }

    render();

}

function render(){

    const { financial, customers, technicians, riders } = report;

    // KPI row
    setMetric("reportTotalCustomers", customers.total);
    setMetric("reportTotalTechnicians", technicians.total);
    setMetric("reportTotalRiders", riders.total);
    setMetric("reportTotalRequests", customers.requests);
    setMetric("reportTotalRevenue", formatNaira(financial.totalRevenue));
    setMetric("reportGenerated", "Updated " + new Date(report.generatedAt).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }));

    // Financial
    for(const key of ["customerPayments", "repairFees", "technicianEarnings", "platformCommission", "logisticsFees", "deliveryPayouts", "platformNet", "refundsDue", "refundsProcessed"]){
        setMetric(key, formatNaira(financial[key]));
    }
    if(financial.tripFees){
        setMetric("pricingNote",
            `Current pricing: ${Math.round(financial.commissionRate * 1000) / 10}% commission · ` +
            `mainland ${formatNaira(financial.tripFees.mainland)} and island ${formatNaira(financial.tripFees.island)} per trip ` +
            `(customers pay two trips). Change these on Job Monitoring.`);
    }

    setMetric("technicianOwedNote", financial.technicianOwed ? `Settled on Payouts · ${formatNaira(financial.technicianOwed)} still owed` : "Settled on the Payouts page");
    setMetric("deliveryOwedNote", financial.deliveryOwed ? `Settled on Payouts · ${formatNaira(financial.deliveryOwed)} still owed` : "Settled on the Payouts page");

    // Customers
    setMetric("customerTotal", customers.total);
    setMetric("customerRequests", customers.requests);
    setMetric("customerCompleted", customers.completed);
    setMetric("customerCancelled", customers.cancelled);
    setMetric("customerCompletionRate", percent(customers.completionRate));

    // Technicians
    setMetric("technicianTotal", technicians.total);
    setMetric("technicianRequests", technicians.requests);
    setMetric("technicianCompleted", technicians.completed);
    setMetric("technicianRejected", technicians.declined);
    setMetric("technicianCompletionRate", percent(technicians.completionRate));

    // Riders
    setMetric("riderTotal", riders.total);
    setMetric("riderDeliveries", riders.deliveries);
    setMetric("riderCompleted", riders.delivered);
    setMetric("riderFailed", riders.failed);
    setMetric("riderCompletionRate", percent(riders.completionRate));

}

/* =====================================================
   TEXT REPORT DOWNLOADS
===================================================== */

function download(content, filename, type){

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

}

const stamp = () => new Date().toISOString().slice(0, 10);

function textReport(title, lines, filename){

    if(!report) return;

    download(
        [title, "Generated: " + new Date().toLocaleString("en-NG"), "", ...lines].join("\n"),
        `${filename}-${stamp()}.txt`,
        "text/plain;charset=utf-8"
    );

}

function generateFinancial(){

    const f = report.financial;

    textReport("TECHRIDER FINANCIAL REPORT", [
        "Paid jobs: " + f.paidJobs,
        "Total Revenue (customer payments): " + formatNaira(f.customerPayments),
        "  Repair Fees (technician quotes + commission): " + formatNaira(f.repairFees),
        "  Logistics Fees (pickup and return): " + formatNaira(f.logisticsFees),
        "  Platform Commission: " + formatNaira(f.platformCommission),
        "Technician Earnings Paid: " + formatNaira(f.technicianEarnings),
        "Delivery Payouts Paid: " + formatNaira(f.deliveryPayouts),
        "TechRider Net (total revenue - technician earnings - delivery payouts): " + formatNaira(f.platformNet),
        "Still owed to technicians: " + formatNaira(f.technicianOwed),
        "Still owed to riders: " + formatNaira(f.deliveryOwed),
        "Refunds Due: " + formatNaira(f.refundsDue),
        "Refunded through Paystack: " + formatNaira(f.refundsProcessed),
    ], "techrider-financial-report");

}

function generateCustomerReport(){

    const c = report.customers;

    textReport("TECHRIDER CUSTOMER ACTIVITY REPORT", [
        "Total Customers: " + c.total,
        "Total Requests: " + c.requests,
        "Completed Requests: " + c.completed,
        "Cancelled or Declined Requests: " + c.cancelled,
        "Completion Rate: " + percent(c.completionRate)
    ], "techrider-customer-report");

}

function generateTechnicianReport(){

    const t = report.technicians;

    textReport("TECHRIDER TECHNICIAN ACTIVITY REPORT", [
        "Approved Technicians: " + t.total,
        "Repair Requests: " + t.requests,
        "Completed Repairs: " + t.completed,
        "Declined by Technicians: " + t.declined,
        "Completion Rate: " + percent(t.completionRate)
    ], "techrider-technician-report");

}

function generateRiderReport(){

    const r = report.riders;

    textReport("TECHRIDER RIDER ACTIVITY REPORT", [
        "Approved Riders: " + r.total,
        "Total Deliveries: " + r.deliveries,
        "Completed Deliveries: " + r.delivered,
        "Declined or Cancelled Deliveries: " + r.failed,
        "Completion Rate: " + percent(r.completionRate)
    ], "techrider-rider-report");

}

/* =====================================================
   CSV EXPORTS
===================================================== */

function exportCSV(){

    if(!report) return;

    const { financial: f, customers: c, technicians: t, riders: r } = report;

    const rows = [
        ["Report", "Metric", "Value"],
        ["Financial", "Paid Jobs", f.paidJobs],
        ["Financial", "Total Revenue (NGN)", f.customerPayments],
        ["Financial", "Repair Fees (NGN)", f.repairFees],
        ["Financial", "Logistics Fees (NGN)", f.logisticsFees],
        ["Financial", "Technician Earnings Paid (NGN)", f.technicianEarnings],
        ["Financial", "Platform Commission (NGN)", f.platformCommission],
        ["Financial", "Delivery Payouts Paid (NGN)", f.deliveryPayouts],
        ["Financial", "TechRider Net (NGN)", f.platformNet],
        ["Financial", "Refunds Due (NGN)", f.refundsDue],
        ["Financial", "Refunded through Paystack (NGN)", f.refundsProcessed],
        ["Customer", "Total Customers", c.total],
        ["Customer", "Total Requests", c.requests],
        ["Customer", "Completed Requests", c.completed],
        ["Customer", "Cancelled or Declined Requests", c.cancelled],
        ["Customer", "Completion Rate (%)", c.completionRate],
        ["Technician", "Approved Technicians", t.total],
        ["Technician", "Repair Requests", t.requests],
        ["Technician", "Completed Repairs", t.completed],
        ["Technician", "Declined by Technicians", t.declined],
        ["Rider", "Approved Riders", r.total],
        ["Rider", "Total Deliveries", r.deliveries],
        ["Rider", "Completed Deliveries", r.delivered],
        ["Rider", "Declined or Cancelled Deliveries", r.failed]
    ];

    const csv = rows
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

    download("﻿" + csv, `techrider-reports-${stamp()}.csv`, "text/csv;charset=utf-8");

}

/* One row per repair, built by the server */
async function exportJobsCSV(){

    try{

        const response = await fetch(`${TechRiderAPI.API_BASE}/admin/reports/jobs.csv`, { credentials: "include" });
        if(!response.ok) throw new Error("The export could not be created. Please try again.");

        download(await response.blob(), `techrider-jobs-${stamp()}.csv`, "text/csv;charset=utf-8");

    }catch(err){

        TR.toast(err.message, "error");

    }

}

function generatePDF(){

    window.print();

}

/* =====================================================
   MODAL (kept for the incident view)
===================================================== */

function closeModal(){

    document.getElementById("incidentModal").style.display = "none";

}

/* =====================================================
   SIDEBAR
===================================================== */

function toggleSidebar(){

    const sidebar = document.getElementById("sidebar");

    if(window.innerWidth <= 950){
        sidebar.classList.toggle("open");
        document.getElementById("overlay").classList.toggle("show");
        return;
    }

    sidebar.classList.toggle("collapsed");

}

function openSidebar(){

    document.getElementById("sidebar").classList.add("open");
    document.getElementById("overlay").classList.add("show");

}

/* =====================================================
   EXPORT DROPDOWN
===================================================== */

function toggleExport(event){

    event.stopPropagation();
    document.getElementById("exportDropdown").classList.toggle("show");

}

document.addEventListener("click", function(e){

    const dropdown = document.getElementById("exportDropdown");

    if(dropdown && !dropdown.contains(e.target)){
        dropdown.classList.remove("show");
    }

    if(
        window.innerWidth <= 950 &&
        !e.target.closest(".sidebar") &&
        !e.target.closest(".hamburger")
    ){
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("overlay").classList.remove("show");
    }

});

document.getElementById("overlay").addEventListener("click", function(){

    document.getElementById("sidebar").classList.remove("open");
    this.classList.remove("show");

});

/* =====================================================
   START (refreshes every minute while open)
===================================================== */

(async function init(){

    if(!(await TechRiderAPI.ready)) return;

    loadReport();

    setInterval(() => {
        if(!document.hidden) loadReport();
    }, 60000);

})();
