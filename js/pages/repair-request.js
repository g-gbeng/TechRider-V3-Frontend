/* Scripts for repair-request.html */

/* ==========================================
    DOM REFERENCES
========================================== */

const form = document.getElementById("repairForm");
const imageInput = document.getElementById("deviceImages");
const previewContainer = document.getElementById("previewContainer");
const faultChips = document.getElementById("faultChips");
const descriptionLabel = document.getElementById("descriptionLabel");
const formError = document.getElementById("formError");
const locateStatus = document.getElementById("locateStatus");
const useLocationBtn = document.getElementById("useLocationBtn");

const field = (id) => document.getElementById(id);
const esc = TR.esc;

/* ==========================================
    STATES (for the address)
========================================== */

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

field("state").insertAdjacentHTML("beforeend",
  STATES.map(s => `<option>${esc(s)}</option>`).join(""));

/* Select a state, adding it if it isn't in the list (e.g. outside Nigeria) */
function setState(name){
  if(!name) return;
  const select = field("state");
  const match = [...select.options].find(o => o.value.toLowerCase() === name.toLowerCase()
    || (name.toLowerCase() === "abuja" && o.value === "Federal Capital Territory"));
  if(match){ select.value = match.value; return; }
  select.insertAdjacentHTML("beforeend", `<option>${esc(name)}</option>`);
  select.value = name;
}

/* ==========================================
    COMMON FAULTS
========================================== */

let FAULTS = [
  "Cracked or broken screen",
  "Battery drains fast or swollen",
  "Not charging / charging port",
  "Won't turn on",
  "Water or liquid damage",
  "Speaker, microphone or audio",
  "Camera not working",
  "Keyboard or touchpad",
  "Slow, freezing or software problem",
  "Overheating"
];

function renderFaults(){
  faultChips.innerHTML = FAULTS.map((f, i) => `
    <label class="chip">
      <input type="checkbox" name="faults" value="${esc(f)}" id="fault-${i}">
      <span><i class="fas fa-check" aria-hidden="true"></i>${esc(f)}</span>
    </label>`).join("");
}

function chosenFaults(){
  return [...faultChips.querySelectorAll("input:checked")].map(i => i.value);
}

/* The description is only required when no fault is ticked */
function updateDescriptionLabel(){
  const optional = chosenFaults().length > 0;
  descriptionLabel.innerHTML = optional
    ? 'Anything else we should know? <span class="optional">(optional)</span>'
    : 'Describe the problem';
}

faultChips.addEventListener("change", () => { updateDescriptionLabel(); formError.textContent = ""; });

renderFaults();
updateDescriptionLabel();

/* ==========================================
    ADDRESS: use my location / saved location
    Filled in automatically, always editable.
========================================== */

let pin = null;            // { lat, lng } from the customer's location
let pinnedValues = null;   // the street/area we filled in from that pin

function fillAddress(data, how){
  const a = data.address;
  field("street").value = a.street || "";
  field("area").value = a.area || a.city || "";
  setState(a.state);
  pin = { lat: data.lat, lng: data.lng };
  pinnedValues = { street: field("street").value, area: field("area").value };
  const when = TR.ago(data.at);
  locateStatus.innerHTML = `<i class="fas fa-circle-check"></i> ${how === "saved" ? `Filled from your location (${esc(when)})` : "Filled from your current location"}. Check it and edit anything that's off.`;
  locateStatus.className = "locate-status ok";
  if(!a.street) field("street").focus();
}

/* If they change the street or area, the map pin may no longer match: drop it */
["street", "area"].forEach(id => field(id).addEventListener("input", () => {
  if(pin && pinnedValues && field(id).value.trim() !== pinnedValues[id].trim()){
    pin = null;
    locateStatus.innerHTML = '<i class="fas fa-pen"></i> Using the address you typed.';
    locateStatus.className = "locate-status";
  }
}));

useLocationBtn.addEventListener("click", async () => {
  useLocationBtn.disabled = true;
  locateStatus.className = "locate-status";
  locateStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding you…';
  try{
    fillAddress(await TR.location.detect(), "fresh");
  }catch(err){
    locateStatus.className = "locate-status err";
    locateStatus.textContent = err.message;
  }finally{
    useLocationBtn.disabled = false;
  }
});

/* ==========================================
    IMAGE COMPRESSION + SELECTION
========================================== */

let uploadedImages = [];

function compressImage(file){
  return new Promise((resolve, reject) => {
    if(!file.type.startsWith("image/")){ reject(new Error("Invalid file")); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 900;
        let { width, height } = img;
        if(width > height && width > MAX_SIZE){ height *= MAX_SIZE / width; width = MAX_SIZE; }
        else if(height >= width && height > MAX_SIZE){ width *= MAX_SIZE / height; height = MAX_SIZE; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener("change", async function(){
  previewContainer.innerHTML = "";
  uploadedImages = [];
  const files = Array.from(this.files);
  if(files.length > 4){
    TR.toast("You can upload up to 4 photos.", "warning");
    this.value = "";
    return;
  }
  for(const file of files){
    try{
      const compressed = await compressImage(file);
      uploadedImages.push(compressed);
      const img = document.createElement("img");
      img.src = compressed;
      img.alt = "Device photo";
      previewContainer.appendChild(img);
    }catch(err){
      TR.toast(`${file.name} couldn't be read as a photo.`, "warning");
    }
  }
});

/* Turn a compressed "data:image/jpeg;base64,..." string back into a file */
function dataUrlToBlob(dataUrl){
  const [header, data] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header)[1];
  const bytes = atob(data);
  const array = new Uint8Array(bytes.length);
  for(let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

/* ==========================================
    CHECK + SUBMIT
========================================== */

function problem(){
  if(!field("deviceType").value) return ["deviceType", "Choose your device type."];
  if(!field("brand").value.trim()) return ["brand", "Enter the brand."];
  if(!field("model").value.trim()) return ["model", "Enter the model."];
  if(!chosenFaults().length && !field("description").value.trim()) return ["description", "Tick a problem or describe what's wrong."];
  if(!field("street").value.trim()) return ["street", "Enter your house number and street."];
  if(!field("area").value.trim()) return ["area", "Enter your area or city."];
  if(!field("state").value) return ["state", "Choose your state."];
  const phone = field("contactPhone").value.trim();
  if(phone && !/^\d{11}$/.test(phone)) return ["contactPhone", "The rider's phone number must be 11 digits."];
  return null;
}

form.addEventListener("submit", async function(e){

  e.preventDefault();

  form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
  const issue = problem();
  if(issue){
    const [id, message] = issue;
    formError.textContent = message;
    field(id).setAttribute("aria-invalid", "true");
    field(id).focus();
    return;
  }
  formError.textContent = "";

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

  try{

    const data = new FormData();
    data.append("deviceType", field("deviceType").value);
    data.append("brand", field("brand").value.trim());
    data.append("model", field("model").value.trim());
    chosenFaults().forEach(f => data.append("faults", f));
    data.append("description", field("description").value.trim());
    data.append("location", [field("street").value.trim(), field("area").value.trim(), field("state").value].filter(Boolean).join(", "));
    data.append("landmark", field("landmark").value.trim());
    data.append("contactPhone", field("contactPhone").value.trim());
    if(pin){
      data.append("lat", pin.lat);
      data.append("lng", pin.lng);
    }
    uploadedImages.forEach((image, index) => {
      data.append("images", dataUrlToBlob(image), `device-${index + 1}.jpg`);
    });

    const { request } = await TechRiderAPI.upload("/requests", data);

    window.location.href = "select-technician.html?request=" + encodeURIComponent(request.id);

  }catch(err){

    formError.textContent = err.message;
    submitButton.disabled = false;
    submitButton.innerHTML = 'Continue: choose a technician <i class="fas fa-arrow-right"></i>';

  }

});

/* ==========================================
    START
    1. a location found on the dashboard (or earlier here) fills the address
    2. otherwise, if location is already allowed, find it now
    3. otherwise leave the button for the customer to tap
========================================== */

(async function init(){

  const user = await TechRiderAPI.ready;
  if(!user) return;

  // the server's fault list wins if it has changed
  TechRiderAPI.get("/requests/options").then(({ faults }) => {
    if(Array.isArray(faults) && faults.join("|") !== FAULTS.join("|")){
      const ticked = chosenFaults();
      FAULTS = faults;
      renderFaults();
      faultChips.querySelectorAll("input").forEach(i => { i.checked = ticked.includes(i.value); });
      updateDescriptionLabel();
    }
  }).catch(() => { /* keep the built-in list */ });

  field("contactPhone").placeholder = user.phone ? `Leave empty to use ${user.phone}` : "11 digits";

  const saved = TR.location.saved();
  if(saved && saved.fresh){
    fillAddress(saved, "saved");
    return;
  }

  const permission = await TR.location.permission();
  if(permission === "granted"){
    useLocationBtn.click();
  }else if(permission === "unsupported"){
    document.getElementById("locateBar").hidden = true;
  }else if(saved){
    // an older location: offer it, but don't assume they're still there
    locateStatus.innerHTML = `Last time you were near <strong>${esc(saved.address.short)}</strong>. Tap the button to update it.`;
  }

})();
