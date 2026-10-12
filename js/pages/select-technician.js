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
    emptyState.innerHTML = TR.empty({
      icon: "fa-user-gear",
      title: "No technicians available right now",
      text: "Your request is saved. Check back soon, or find it later under Active Repairs to choose a technician.",
      action: { label: "Go to Active Repairs", href: "active-repairs-customer.html" }
    });
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

        <div class="rating-row">
          ${TR.stars(tech.rating, tech.reviewCount)}
          ${tech.reviewCount ? `<button type="button" class="reviews-link" data-reviews>Read reviews</button>` : ""}
        </div>

        <div class="location">
          <i class="fas fa-location-dot"></i>
           ${esc(tech.location || "Location unavailable")}
          ${tech.jobsCompleted ? ` · <i class="fas fa-circle-check"></i> ${tech.jobsCompleted} repair${tech.jobsCompleted === 1 ? "" : "s"} done` : ""}
        </div>

      </div>
    `;

    card.querySelector("[data-reviews]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showReviews(tech);
    });

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
   REVIEWS
========================= */

async function showReviews(tech){

  const backdrop = document.createElement("div");
  backdrop.className = "tr-dialog-backdrop";
  backdrop.innerHTML = `
    <div class="tr-dialog reviews-dialog" role="dialog" aria-modal="true" aria-labelledby="reviewsTitle">
      <h2 id="reviewsTitle"><i class="fas fa-star"></i>${esc(tech.fullName)}</h2>
      <p>${TR.stars(tech.rating, tech.reviewCount)}</p>
      <div class="reviews-list">${TR.skeleton(2)}</div>
      <div class="tr-dialog-actions"><button type="button" class="tr-btn tr-btn-primary" data-close>Close</button></div>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => { backdrop.remove(); document.removeEventListener("keydown", onKey, true); };
  const onKey = (e) => { if(e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey, true);
  backdrop.addEventListener("click", (e) => { if(e.target === backdrop || e.target.closest("[data-close]")) close(); });
  backdrop.querySelector("[data-close]").focus();

  try{
    const { reviews } = await TechRiderAPI.get(`/technicians/${encodeURIComponent(tech.id)}/reviews`);
    backdrop.querySelector(".reviews-list").innerHTML = reviews.map(r => `
      <div class="review">
        <div>${TR.stars(r.rating)} <span class="review-by">${esc(r.by)} · ${esc(TR.ago(r.createdAt))}</span></div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}
      </div>`).join("") || "<p>No reviews yet.</p>";
  }catch(err){
    backdrop.querySelector(".reviews-list").innerHTML = `<p>${esc(err.message)}</p>`;
  }

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

    TR.toast(err.message, "error");
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

  techGrid.innerHTML = TR.skeleton(3);

  if(!(await TechRiderAPI.ready)) return;

  try{

    const { technicians } =
      await TechRiderAPI.get(
        "/technicians/available?request=" + encodeURIComponent(requestId)
      );

    renderTechnicians(technicians);

  }catch(err){

    techGrid.innerHTML = "";
    emptyState.innerHTML = TR.empty({ icon: "fa-wifi", title: "Couldn't load technicians", text: err.message });
    emptyState.style.display = "block";

  }

})();
