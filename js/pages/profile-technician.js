/* Scripts for profile-technician.html */

/* =========================
   CURRENT TECHNICIAN
========================= */

const currentTechnician =
  JSON.parse(
    localStorage.getItem(
      "techrider_current_technician"
    )
  );

/* =========================
   SECURITY
========================= */

if(!currentTechnician){

  window.location.href =
    "login-technician.html";

}

/* =========================
   DOM
========================= */

const avatar =
  document.getElementById(
    "avatar"
  );

const profileName =
  document.getElementById(
    "profileName"
  );

/* =========================
   INITIALS
========================= */

function getInitials(name){

  if(!name) return "T";

  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0,2)
    .toUpperCase();

}

/* =========================
   PROFILE DATA
========================= */

const technicianName =
  currentTechnician.fullName ||
  "Technician";

profileName.textContent =
  technicianName;

/* AVATAR */

if(currentTechnician.profileImage){

  avatar.innerHTML = `
    <img
      src="${currentTechnician.profileImage}"
      alt="Profile"
    >
  `;

}else{

  avatar.textContent =
    getInitials(technicianName);

}

/* REMOVE PROFILE PHOTO (back to initials) */

const removePhotoBtn = document.getElementById("removePhotoBtn");
removePhotoBtn.hidden = !currentTechnician.profileImage;
removePhotoBtn.addEventListener("click", async () => {
  if(!(await TR.removeAvatar())) return;
  currentTechnician.profileImage = null;
  avatar.textContent = getInitials(technicianName);
  removePhotoBtn.hidden = true;
});

/* DETAILS */

document.getElementById(
  "fullName"
).textContent =
  technicianName;

document.getElementById(
  "email"
).textContent =
  currentTechnician.email ||
  "Not provided";

document.getElementById(
  "phone"
).textContent =
  currentTechnician.phone ||
  "Not provided";

document.getElementById(
  "specialization"
).textContent =
  currentTechnician.specialization ||
  "General Technician";

document.getElementById(
  "location"
).textContent =
  currentTechnician.location ||
  currentTechnician.address ||
  "Not provided";

document.getElementById(
  "experience"
).textContent =
  currentTechnician.experience ||
  currentTechnician.yearsOfExperience ||
  "Not specified";

/* =========================
   IMAGE UPLOAD
========================= */

document
.getElementById(
  "profileUpload"
)
.addEventListener(
  "change",
  function(event){

    const file =
      event.target.files[0];

    if(!file) return;

    /* upload to the server, then show the new photo */

        const formData =
          new FormData();

        formData.append('avatar', file);

        TechRiderAPI.upload('/me/avatar', formData)
          .then(({ user }) => {

            TechRiderAPI.cacheSession(user);

            currentTechnician.profileImage =
              user.profileImageUrl;

            avatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = user.profileImageUrl;
            img.alt = 'Profile';
            avatar.appendChild(img);
            removePhotoBtn.hidden = false;

          })
          .catch((err) => {

            TR.toast(err.message, "error");

          })
          .finally(() => {

            event.target.value = '';

          });

  }
);

/* =========================
   LOGOUT
========================= */

function logoutTechnician(){

  localStorage.removeItem(
    "techrider_current_technician"
  );

}
