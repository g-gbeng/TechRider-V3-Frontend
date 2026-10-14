/* Scripts for admin-payouts.html

   Everything TechRider owes technicians (per completed repair) and riders
   (per delivered trip). Admins pay by bank transfer, then mark the job as
   settled here. Reports only count settled payouts. */

const esc = TR.esc;
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const day = (d) => d ? new Date(d).toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric" }) : "—";
const jsArg = (v) => esc(JSON.stringify(String(v)));

let data = null;
let kind = "technician";
const selected = new Set();

const WORDS = {
    technician: { person:"Technician", people:"Technician payouts", job:"job", jobs:"Jobs",
        hint:"What each technician has earned from completed repairs, what has been paid and what is still owed." },
    rider: { person:"Rider", people:"Rider payouts", job:"trip", jobs:"Trips",
        hint:"Each delivered trip earns the rider the trip fee priced into that job (mainland or island)." }
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ---------------------------------------------------- load */
async function load(){

    try{
        data = await TechRiderAPI.get("/admin/payouts");
    }catch(err){
        TR.toast("Could not load payouts: " + err.message, "error");
        return;
    }
    // forget selections that are no longer pending
    const pending = new Set(data.items.filter(i => !i.settled).map(i => i.id));
    [...selected].forEach(id => { if(!pending.has(id)) selected.delete(id); });
    render();

}

/* ---------------------------------------------------- search */
function query(){ return document.getElementById("searchBox").value.trim().toLowerCase(); }

function matches(item, q){
    if(!q) return true;
    return [item.code, item.requestCode, item.deliveryCode, item.personName, item.device, item.settlement && item.settlement.reference]
        .some(v => v && String(v).toLowerCase().includes(q));
}

function highlight(text, q){
    const t = String(text || "");
    if(!q) return esc(t);
    const i = t.toLowerCase().indexOf(q);
    if(i < 0) return esc(t);
    return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + q.length)) + "</mark>" + esc(t.slice(i + q.length));
}

/* ---------------------------------------------------- render */
function bankCell(bank){
    if(!bank) return `<span class="noBank"><i class="fas fa-triangle-exclamation"></i> No bank details</span>`;
    return `<div class="bank">${esc(bank.bankName)}<br><strong>${esc(bank.accountNumber)}</strong><br><span class="muted">${esc(bank.accountName)}</span></div>`;
}

function actionMenu(items){
    return `
<div class="tr-menu">
<button type="button" class="tr-menu-btn" aria-haspopup="menu" aria-expanded="false">Actions <i class="fas fa-chevron-down chev" aria-hidden="true"></i></button>
<div class="tr-menu-list" role="menu" hidden>${items.filter(Boolean).join("")}</div>
</div>`;
}

const menuItem = (cls, icon, label, onclick) =>
    `<button type="button" role="menuitem" class="tr-menu-item ${cls}" onclick="${onclick}"><i class="fas ${icon}"></i> ${esc(label)}</button>`;

function idCell(item, q){
    if(item.kind === "rider"){
        return `<span class="code">${highlight(item.deliveryCode, q)}</span><br><span class="sub">for ${highlight(item.requestCode, q)}</span>`;
    }
    return `<span class="code">${highlight(item.requestCode, q)}</span>`;
}

function jobCell(item){
    return `${esc(item.device || "—")}<br><span class="tag">${esc(item.label)}</span>`;
}

function render(){

    const s = data.summary;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set("techOwed", naira(s.technician.owed));
    set("techOwedCount", plural(s.technician.owedCount, "job") + " to settle");
    set("riderOwed", naira(s.rider.owed));
    set("riderOwedCount", plural(s.rider.owedCount, "trip") + " to settle");
    set("techPaid", naira(s.technician.paid));
    set("techPaidCount", plural(s.technician.paidCount, "job"));
    set("riderPaid", naira(s.rider.paid));
    set("riderPaidCount", plural(s.rider.paidCount, "trip"));
    document.getElementById("techOwedCard").classList.toggle("owed", s.technician.owed > 0);
    document.getElementById("riderOwedCard").classList.toggle("owed", s.rider.owed > 0);
    set("tabTechCount", s.technician.owedCount || "");
    set("tabRiderCount", s.rider.owedCount || "");

    const w = WORDS[kind];
    set("peopleTitle", w.people);
    set("peopleHint", w.hint);
    set("personHead", w.person);
    set("jobsHead", w.jobs);
    set("pendingPerson", w.person);
    set("settledPerson", w.person);

    const q = query();
    const items = data.items.filter(i => i.kind === kind && matches(i, q));
    const pending = items.filter(i => !i.settled);
    const settled = items.filter(i => i.settled).sort((a, b) => new Date(b.settlement.settledAt) - new Date(a.settlement.settledAt));

    // people: when searching, only those with a matching job (or name)
    const people = (kind === "technician" ? data.technicians : data.riders)
        .filter(p => !q || p.fullName.toLowerCase().includes(q) || items.some(i => i.personId === p.personId));

    document.getElementById("peopleTable").innerHTML = people.length ? people.map(p => `
<tr>
<td><strong>${highlight(p.fullName, q)}</strong><br><span class="sub">${esc(p.phone || "")}</span></td>
<td>${bankCell(p.bank)}</td>
<td>${p.jobs}</td>
<td class="money">${naira(p.earned)}</td>
<td class="money">${naira(p.paid)}${p.lastPaidAt ? `<br><span class="sub">last ${day(p.lastPaidAt)}</span>` : ""}</td>
<td class="money ${p.owed ? "owedCell" : ""}">${naira(p.owed)}${p.owedCount ? `<br><span class="sub">${plural(p.owedCount, w.job)}</span>` : ""}</td>
<td>${actionMenu([
    menuItem("", "fa-list", `View ${w.jobs.toLowerCase()}`, `viewPerson(${jsArg(p.personId)})`),
    p.owedCount ? menuItem("", "fa-check-double", `Mark all ${naira(p.owed)} as settled`, `settlePerson(${jsArg(p.personId)})`) : ""
])}</td>
</tr>`).join("") : `<tr><td colspan="7" class="emptyRow">${q ? "Nothing matches your search." : `No ${kind} has earned a payout yet.`}</td></tr>`;

    document.getElementById("pendingTable").innerHTML = pending.length ? pending.map(i => `
<tr>
<td class="checkCol"><input type="checkbox" class="pick" data-id="${esc(i.id)}" ${selected.has(i.id) ? "checked" : ""} aria-label="Select ${esc(i.code)}"></td>
<td>${idCell(i, q)}</td>
<td>${jobCell(i)}</td>
<td>${highlight(i.personName, q)}${i.bank ? "" : `<br><span class="noBank"><i class="fas fa-triangle-exclamation"></i> No bank details</span>`}</td>
<td class="money">${naira(i.amount)}</td>
<td>${day(i.earnedAt)}</td>
<td>${actionMenu([
    menuItem("", "fa-eye", `View ${w.job}`, `viewItem(${jsArg(i.id)})`),
    menuItem("", "fa-check", "Mark as settled", `settleItems([${jsArg(i.id)}])`)
])}</td>
</tr>`).join("") : `<tr><td colspan="7" class="emptyRow">${q ? "No pending payouts match your search." : `Nothing to settle. Every ${w.job} has been paid.`}</td></tr>`;

    document.getElementById("settledTable").innerHTML = settled.length ? settled.map(i => `
<tr>
<td>${idCell(i, q)}</td>
<td>${jobCell(i)}</td>
<td>${highlight(i.personName, q)}</td>
<td class="money">${naira(i.amount)}</td>
<td>${day(i.settlement.settledAt)}<br><span class="sub">by ${esc(i.settlement.settledByName)}</span></td>
<td>${i.settlement.reference ? `<span class="ref">${highlight(i.settlement.reference, q)}</span>` : `<span class="muted">—</span>`}</td>
<td>${actionMenu([
    menuItem("", "fa-eye", `View ${w.job}`, `viewItem(${jsArg(i.id)})`),
    menuItem("danger", "fa-rotate-left", "Undo settlement", `unsettle(${jsArg(i.id)})`)
])}</td>
</tr>`).join("") : `<tr><td colspan="7" class="emptyRow">${q ? "No settled payouts match your search." : "Nothing settled yet."}</td></tr>`;

    const all = document.getElementById("checkAll");
    all.checked = pending.length > 0 && pending.every(i => selected.has(i.id));
    all.disabled = !pending.length;
    paintBulk();

}

function paintBulk(){
    const picked = data.items.filter(i => selected.has(i.id) && i.kind === kind);
    const bar = document.getElementById("bulkBar");
    bar.hidden = !picked.length;
    document.getElementById("bulkText").textContent =
        `${plural(picked.length, WORDS[kind].job)} selected · ${naira(picked.reduce((t, i) => t + i.amount, 0))}`;
}

/* ---------------------------------------------------- details */
function showPanel(title, bodyHtml){
    const backdrop = document.createElement("div");
    backdrop.className = "tr-dialog-backdrop";
    backdrop.innerHTML = `
<div class="tr-dialog wide po-detail" role="dialog" aria-modal="true" aria-labelledby="po-detail-title">
<h2 id="po-detail-title"><i class="fas fa-money-check-dollar" aria-hidden="true"></i>${esc(title)}</h2>
${bodyHtml}
<div class="tr-dialog-actions"><button type="button" class="tr-btn tr-btn-primary" data-close>Close</button></div>
</div>`;
    const close = () => { document.removeEventListener("keydown", onKey, true); backdrop.remove(); };
    const onKey = (e) => { if(e.key === "Escape"){ e.preventDefault(); close(); } };
    backdrop.addEventListener("click", (e) => {
        if(e.target === backdrop || e.target.closest("[data-close]")) close();
        if(e.target.closest("[data-settle]")){ close(); settleItems([e.target.closest("[data-settle]").dataset.settle]); }
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.querySelector("[data-close]").focus(), 30);
}

function bankLine(bank){
    return bank ? `${esc(bank.bankName)} · <strong>${esc(bank.accountNumber)}</strong> · ${esc(bank.accountName)}` : `<span class="noBank"><i class="fas fa-triangle-exclamation"></i> No bank details. Add them on Records.</span>`;
}

function viewItem(id){
    const i = data.items.find(x => x.id === id);
    if(!i) return;
    const rows = [
        i.kind === "rider" ? ["Delivery ID", esc(i.deliveryCode)] : null,
        ["Request ID", esc(i.requestCode)],
        ["Job", `${esc(i.device)} · ${esc(i.label)}`],
        [WORDS[i.kind].person, esc(i.personName) + (i.personPhone ? ` · ${esc(i.personPhone)}` : "")],
        ["Bank account", bankLine(i.bank)],
        ["Amount", `<strong>${naira(i.amount)}</strong>`],
        [i.kind === "rider" ? "Delivered" : "Completed", day(i.earnedAt)],
        ["Status", i.settled ? `<span class="po-state settled">Settled ${day(i.settlement.settledAt)}</span>` : `<span class="po-state pending">Pending settlement</span>`],
        i.settled ? ["Settled by", esc(i.settlement.settledByName)] : null,
        i.settled && i.settlement.reference ? ["Reference", `<span class="ref">${esc(i.settlement.reference)}</span>`] : null
    ].filter(Boolean);
    showPanel(`${i.code} payout`, `
<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
${i.settled ? "" : `<div class="tr-dialog-actions"><button type="button" class="tr-btn tr-btn-ghost" data-settle="${esc(i.id)}"><i class="fas fa-check"></i> Mark as settled</button></div>`}`);
}

function viewPerson(personId){
    const list = data.items.filter(i => i.kind === kind && i.personId === personId);
    const p = (kind === "technician" ? data.technicians : data.riders).find(x => x.personId === personId);
    if(!p) return;
    showPanel(`${p.fullName}'s ${WORDS[kind].jobs.toLowerCase()}`, `
<p>${bankLine(p.bank)}</p>
<p>Earned ${naira(p.earned)} · paid ${naira(p.paid)} · <strong>owed ${naira(p.owed)}</strong></p>
<div class="po-jobs">${list.map(i => `
<div class="po-job ${i.settled ? "done" : ""}">
<div><strong class="code">${esc(i.code)}</strong>${i.kind === "rider" ? ` <span class="sub">for ${esc(i.requestCode)}</span>` : ""}<br><span class="sub">${esc(i.device)} · ${esc(i.label)} · ${day(i.earnedAt)}</span></div>
<div style="text-align:right"><strong>${naira(i.amount)}</strong><br>${i.settled
    ? `<span class="po-state settled">Settled</span>`
    : `<button type="button" class="tr-btn tr-btn-ghost" style="padding:4px 10px;font-size:.75rem;margin-top:4px" data-settle="${esc(i.id)}">Mark as settled</button>`}</div>
</div>`).join("")}</div>`);
}

/* ---------------------------------------------------- settle */
async function settleItems(ids){
    const items = data.items.filter(i => ids.includes(i.id) && !i.settled);
    if(!items.length) return;
    const total = items.reduce((t, i) => t + i.amount, 0);
    const people = [...new Set(items.map(i => i.personName))];
    const noBank = items.filter(i => !i.bank).map(i => i.personName);
    const what = items.length === 1 ? items[0].code : plural(items.length, WORDS[items[0].kind].job);

    const reference = await TR.prompt({
        title: `Mark ${naira(total)} as settled?`,
        message: `${what} for ${people.join(", ")}. Only do this after the bank transfer has been sent.` +
            (noBank.length ? `\n\nNo bank details on record for: ${[...new Set(noBank)].join(", ")}.` : ""),
        label: "Transfer reference (optional)",
        placeholder: "e.g. bank transfer ID",
        maxLength: 120,
        confirmText: "Mark as settled",
        icon: "fa-money-check-dollar"
    });
    if(reference === null) return;

    try{
        const res = await TechRiderAPI.post("/admin/payouts/settle", {
            items: items.map(i => ({ kind:i.kind, id:i.id })),
            reference
        });
        items.forEach(i => selected.delete(i.id));
        TR.toast(`${plural(res.settled, WORDS[items[0].kind].job)} marked as settled`, "success");
        await load();
        if(TR.refreshBadges) TR.refreshBadges();
    }catch(err){
        TR.toast(err.message, "error");
    }
}

function settlePerson(personId){
    settleItems(data.items.filter(i => i.kind === kind && i.personId === personId && !i.settled).map(i => i.id));
}

async function unsettle(id){
    const i = data.items.find(x => x.id === id);
    if(!i) return;
    const ok = await TR.confirm({
        title: `Undo settlement for ${i.code}?`,
        message: `${naira(i.amount)} for ${i.personName} goes back to Pending settlement and is taken out of Reports. Only do this if it was marked by mistake.`,
        confirmText: "Undo settlement",
        danger: true
    });
    if(!ok) return;
    try{
        await TechRiderAPI.post("/admin/payouts/unsettle", { kind:i.kind, id:i.id });
        TR.toast(`${i.code} moved back to pending`, "success");
        load();
    }catch(err){
        TR.toast(err.message, "error");
    }
}

/* ---------------------------------------------------- CSV */
function exportCSV(){
    if(!data) return;
    const cell = (v) => {
        let t = v === undefined || v === null ? "" : String(v);
        if(/^[=+\-@]/.test(t)) t = "'" + t;
        return `"${t.replace(/"/g, '""')}"`;
    };
    const rows = [["Type", "Delivery ID", "Request ID", "Job", "Payee", "Bank", "Account number", "Account name", "Amount (NGN)", "Earned on", "Status", "Settled on", "Reference"]]
        .concat(data.items.map(i => [
            i.kind === "rider" ? "Rider" : "Technician", i.deliveryCode || "", i.requestCode, `${i.device} (${i.label})`, i.personName,
            i.bank ? i.bank.bankName : "", i.bank ? i.bank.accountNumber : "", i.bank ? i.bank.accountName : "",
            i.amount, i.earnedAt ? String(i.earnedAt).slice(0, 10) : "", i.settled ? "Settled" : "Pending",
            i.settled ? String(i.settlement.settledAt).slice(0, 10) : "", i.settled ? i.settlement.reference : ""
        ]));
    const blob = new Blob(["﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `techrider-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
}

/* ---------------------------------------------------- wiring */
document.querySelectorAll(".po-tab").forEach(tab => tab.addEventListener("click", () => {
    kind = tab.dataset.kind;
    document.querySelectorAll(".po-tab").forEach(t => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    render();
}));

let searchTimer;
document.getElementById("searchBox").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        // a delivery ID only exists on the riders tab: switch there automatically
        const q = query();
        if(data && q){
            const hit = data.items.find(i => matches(i, q));
            const onTab = data.items.some(i => i.kind === kind && matches(i, q));
            if(hit && !onTab) document.querySelector(`.po-tab[data-kind="${hit.kind}"]`).click();
        }
        if(data) render();
    }, 120);
});

document.addEventListener("change", (e) => {
    if(e.target.classList.contains("pick")){
        e.target.checked ? selected.add(e.target.dataset.id) : selected.delete(e.target.dataset.id);
        render();
    } else if(e.target.id === "checkAll"){
        const q = query();
        data.items.filter(i => i.kind === kind && !i.settled && matches(i, q))
            .forEach(i => e.target.checked ? selected.add(i.id) : selected.delete(i.id));
        render();
    }
});

document.getElementById("bulkSettle").addEventListener("click", () =>
    settleItems(data.items.filter(i => selected.has(i.id) && i.kind === kind).map(i => i.id)));
document.getElementById("exportBtn").addEventListener("click", exportCSV);

/* sidebar */
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
document.getElementById("overlay").addEventListener("click", function(){
    document.getElementById("sidebar").classList.remove("open");
    this.classList.remove("show");
});

/* start: ?q=REQ-1234 or ?q=DLV-ABCD opens with that job found */
(async function init(){
    if(!(await TechRiderAPI.ready)) return;
    const q = new URLSearchParams(location.search).get("q");
    if(q) document.getElementById("searchBox").value = q;
    await load();
    if(q) document.getElementById("searchBox").dispatchEvent(new Event("input"));
    setInterval(() => { if(!document.hidden && !document.querySelector(".tr-dialog-backdrop")) load(); }, 60000);
})();
