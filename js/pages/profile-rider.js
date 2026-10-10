/* Scripts for profile-rider.html */

/* =========================
CURRENT RIDER
========================= */

const currentRider =
JSON.parse(
localStorage.getItem(
'techrider_current_rider'
)
);

if(!currentRider){

window.location.href =
'login-rider.html';

}

/* =========================
GET ELEMENTS
========================= */

const fullNameEl =
document.getElementById('fullName');

const emailEl =
document.getElementById('email');

const phoneEl =
document.getElementById('phone');

const addressEl =
document.getElementById('address');

const plateEl =
document.getElementById('plateNumber');

const vehicleEl =
document.getElementById('vehicleType');

const profileName =
document.getElementById('profileName');

const topAvatar =
document.getElementById('topAvatar');

const profileImageContainer =
document.getElementById(
'profileImageContainer'
);

/* =========================
POPULATE DETAILS
========================= */

const fullName =
currentRider.fullName ||
'Rider';

const firstName =
fullName.split(' ')[0];

const initials =
firstName.charAt(0).toUpperCase();

fullNameEl.textContent =
fullName;

emailEl.textContent =
currentRider.email || '-';

phoneEl.textContent =
currentRider.phone || '-';

addressEl.textContent =
currentRider.address || '-';

plateEl.textContent =
currentRider.plateNumber || '-';

vehicleEl.textContent =
currentRider.vehicleType || '-';

profileName.textContent =
fullName;

/* =========================
PROFILE IMAGE
========================= */

function renderProfileImage(){

if(currentRider.profileImage){

profileImageContainer.innerHTML = `
<img src="${currentRider.profileImage}">
`;

topAvatar.innerHTML = `
<img src="${currentRider.profileImage}">
`;

}else{

profileImageContainer.textContent =
initials;

topAvatar.textContent =
initials;

}

}

renderProfileImage();

/* =========================
UPLOAD PROFILE IMAGE
========================= */

document.getElementById(
'profileUpload'
).addEventListener(
'change',
function(event){

const file = event.target.files[0];

if(!file) return;

/* upload to the server, then show the new photo */

        const formData =
          new FormData();

        formData.append('avatar', file);

        TechRiderAPI.upload('/me/avatar', formData)
          .then(({ user }) => {

            TechRiderAPI.cacheSession(user);

            currentRider.profileImage =
              user.profileImageUrl;

            renderProfileImage();

          })
          .catch((err) => {

            alert(err.message);

          })
          .finally(() => {

            event.target.value = '';

          });

}
);
/* =========================
LOGOUT
========================= */

function logoutRider(){

localStorage.removeItem(
'techrider_current_rider'
);

}

/* =========================
STORAGE LISTENER
========================= */

window.addEventListener(
'storage',
() => {

location.reload();

}
);
