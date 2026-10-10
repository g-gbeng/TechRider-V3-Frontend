/* Scripts for repair-request.html */

/* ==========================================
    DOM REFERENCES
========================================== */

const form = document.getElementById("repairForm");

const imageInput =
document.getElementById("deviceImages");

const previewContainer =
document.getElementById("previewContainer");





/* ==========================================
    IMAGE STORAGE
========================================== */

let uploadedImages = [];

/* ==========================================
    LOGIN + SUSPENSION
    Checked by the page guard in js/api.js
========================================== */

/* ==========================================
    IMAGE COMPRESSION
========================================== */

function compressImage(file){

return new Promise((resolve,reject)=>{

if(!file.type.startsWith("image/")){

reject("Invalid file");

return;

}

const reader =
new FileReader();

reader.onload = function(e){

const img =
new Image();

img.onload = function(){

const canvas =
document.createElement("canvas");

const ctx =
canvas.getContext("2d");

let width =
img.width;

let height =
img.height;

const MAX_SIZE = 900;

/* Keep aspect ratio */

if(width>height){

if(width>MAX_SIZE){

height *= MAX_SIZE/width;
width = MAX_SIZE;

}

}else{

if(height>MAX_SIZE){

width *= MAX_SIZE/height;
height = MAX_SIZE;

}

}

canvas.width = width;
canvas.height = height;

ctx.drawImage(

img,

0,
0,

width,
height

);

/* Same quality used elsewhere */

resolve(

canvas.toDataURL(

"image/jpeg",

0.7

)

);

};

img.onerror = reject;

img.src =
e.target.result;

};

reader.onerror = reject;

reader.readAsDataURL(file);

});

}

/* ==========================================
    IMAGE SELECTION
========================================== */

imageInput.addEventListener(

"change",

async function(){

previewContainer.innerHTML = "";

uploadedImages = [];

const files =
Array.from(this.files);

if(files.length>4){

alert(

"You can upload a maximum of 4 images."

);

this.value="";

return;

}

for(const file of files){

try{

const compressed =

await compressImage(file);

uploadedImages.push(

compressed

);

/* Preview */

const img =
document.createElement("img");

img.src = compressed;

img.style.width="100%";
img.style.height="120px";
img.style.objectFit="cover";
img.style.borderRadius="10px";
img.style.border="1px solid #ddd";

previewContainer.appendChild(img);

}catch(err){

console.error(err);

}

}

});

/* ==========================================
    SUBMIT REPAIR REQUEST
========================================== */

/* Turn a compressed "data:image/jpeg;base64,..." string back into a file */
function dataUrlToBlob(dataUrl){

const [header, data] = dataUrl.split(",");

const mime = /data:([^;]+)/.exec(header)[1];

const bytes = atob(data);

const array = new Uint8Array(bytes.length);

for(let i = 0; i < bytes.length; i++){
array[i] = bytes.charCodeAt(i);
}

return new Blob([array], { type: mime });

}

form.addEventListener(

"submit",

async function(e){

e.preventDefault();

const submitButton =
form.querySelector('button[type="submit"]');

submitButton.disabled = true;

submitButton.textContent = "Saving...";

try{

const data = new FormData();

data.append("deviceType", document.getElementById("deviceType").value);
data.append("brand", document.getElementById("brand").value.trim());
data.append("model", document.getElementById("model").value.trim());
data.append("description", document.getElementById("description").value.trim());
data.append("location", document.getElementById("location").value.trim());

uploadedImages.forEach((image, index) => {
data.append("images", dataUrlToBlob(image), `device-${index + 1}.jpg`);
});

const { request } =
await TechRiderAPI.upload("/requests", data);

/* -----------------------------
   CONTINUE FLOW
------------------------------ */

window.location.href =
"select-technician.html?request=" +
encodeURIComponent(request.id);

}catch(err){

alert(err.message);

submitButton.disabled = false;

submitButton.textContent = "Select Technician";

}

});

/* ==========================================
    PAGE INITIALIZATION
========================================== */

document.addEventListener(

    "DOMContentLoaded",

    ()=>{

        /*
            Clear previous previews
        */

        previewContainer.innerHTML = "";

        /*
            Reset uploaded images
        */

        uploadedImages = [];

    }

);
