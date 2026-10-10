/* Scripts for select-technician.html */

const techGrid = document.getElementById("techGrid");
const emptyState = document.getElementById("emptyState");
const submitBtn = document.getElementById("submitBtn");

const esc = TechRiderAPI.escapeHtml;

let selectedTechnician = null;

/* =========================
   WHICH REQUEST?
   Comes from repair-request.html (or the
   "Choose technician" button on Active Repairs)
========================= */

const requestId =
  new URLSearchParams(window.location.search).get("request");

if(!requestId){
  window.location.replace("repair-request.html");
}

/* =========================
   INITIALS
========================= */

function getInitials(name){

  if(!name) return "T";

  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

}

/* =========================
   RENDER TECHS
========================= */

function renderTechnicians(technicians){

  techGrid.innerHTML = "";

  if(technicians.length === 0){
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  technicians.forEach(tech => {

    const card = document.createElement("div");

    card.className = "tech-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    card.innerHTML = `
      <div class="avatar">
        ${
          tech.profileImageUrl
            ? `<img src="${esc(tech.profileImageUrl)}" alt="${esc(tech.fullName)}"/>`
            : esc(getInitials(tech.fullName))
        }
      </div>

      <div class="info">

        <div class="name">

          ${esc(tech.fullName || "Unnamed Technician")}

          ${
            tech.verified
              ? `<i class="fas fa-check-circle badge" title="Verified"></i>`
              : ""
          }

        </div>

        <div class="specialization">
          ${esc(tech.specialization || "General Technician")}
          ${tech.yearsExperience ? ` · ${esc(tech.yearsExperience)} yrs experience` : ""}
        </div>

        <div class="location">
          <i class="fas fa-location-dot"></i>
           ${esc(tech.location || "Location unavailable")}
        </div>

      </div>
    `;

    /* SELECT TECHNICIAN (click or Enter) */

    const select = () => {

      document
        .querySelectorAll(".tech-card")
        .forEach(c => c.classList.remove("active"));

      card.classList.add("active");

      selectedTechnician = tech;

      submitBtn.disabled = false;

    };

    card.addEventListener("click", select);
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        select();
      }
    });

    techGrid.appendChild(card);

  });

}

/* =========================
   SUBMIT REQUEST
========================= */

submitBtn.addEventListener("click", async () => {

  if(!selectedTechnician) return;

  submitBtn.disabled = true;

  try{

    await TechRiderAPI.patch(
      `/requests/${encodeURIComponent(requestId)}/technician`,
      { technicianId: selectedTechnician.id }
    );

    /* SHOW SUCCESS MODAL */
    document
      .getElementById("successModal")
      .classList.add("show");

  }catch(err){

    alert(err.message);
    submitBtn.disabled = false;

  }

});

/* =========================
   CLOSE MODAL
========================= */

function closeModal(){

  document
    .getElementById("successModal")
    .classList.remove("show");

  window.location.href =
    "active-repairs-customer.html";

}

document
  .getElementById("closeModalBtn")
  .addEventListener("click", closeModal);

document
  .getElementById("successModal")
  .addEventListener("click", (e) => {

    if(e.target.id === "successModal"){
      closeModal();
    }

});

/* =========================
   LOAD
========================= */

(async function init(){

  if(!requestId) return;

  if(!(await TechRiderAPI.ready)) return;

  try{

    const { technicians } =
      await TechRiderAPI.get(
        "/technicians/available?request=" + encodeURIComponent(requestId)
      );

    renderTechnicians(technicians);

  }catch(err){

    alert("Could not load technicians: " + err.message);

  }

})();
