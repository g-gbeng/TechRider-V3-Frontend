/* Scripts for signup-technician.html */

/* ===========================================================
   TECHRIDER TECHNICIAN SIGNUP
   PART 1
   =========================================================== */

/* -----------------------------
   STORAGE KEYS
------------------------------*/

/* Registrations are sent to the TechRider server (see js/api.js) */

/* -----------------------------
   DOM ELEMENTS
------------------------------*/

const form = document.getElementById("signupForm");
const submitBtn = document.getElementById("submitBtn");

const toast = document.getElementById("successToast");
const toastMessage = document.getElementById("toastMessage");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const strengthText = document.getElementById("passwordStrength");

const phoneInput = document.getElementById("phone");

/* -----------------------------
   PASSWORD TOGGLE
------------------------------*/

function togglePassword(icon){

    const input = icon.previousElementSibling;

    if(input.type === "password"){

        input.type = "text";

        icon.classList.remove("fa-eye");

        icon.classList.add("fa-eye-slash");

    }

    else{

        input.type = "password";

        icon.classList.remove("fa-eye-slash");

        icon.classList.add("fa-eye");

    }

}

/* -----------------------------
   PHONE NUMBER
------------------------------*/

phoneInput.addEventListener("input",(e)=>{

    e.target.value = e.target.value
        .replace(/\D/g,"")
        .slice(0,11);

});

/* -----------------------------
   PASSWORD STRENGTH
------------------------------*/

passwordInput.addEventListener("input",function(){

    const value = this.value;

    let score = 0;

    if(value.length >= 8)
        score++;

    if(/[A-Z]/.test(value))
        score++;

    if(/[0-9]/.test(value))
        score++;

    if(/[@#$!%*?&]/.test(value))
        score++;

    strengthText.className = "strength";

    if(value.length === 0){

        strengthText.textContent = "";

        return;

    }

    if(score <= 2){

        strengthText.textContent = "Weak Password";

        strengthText.classList.add("weak");

    }

    else if(score === 3){

        strengthText.textContent = "Medium Password";

        strengthText.classList.add("medium");

    }

    else{

        strengthText.textContent = "Strong Password";

        strengthText.classList.add("strong");

    }

});

/* -----------------------------
   TOAST
------------------------------*/

function showToast(message){

    toastMessage.textContent = message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}

/* -----------------------------
   BUTTON LOADING
------------------------------*/

function startLoading(){

    submitBtn.disabled = true;

    submitBtn.classList.add("loading");

    submitBtn.textContent = "Submitting";

}

function stopLoading(){

    submitBtn.disabled = false;

    submitBtn.classList.remove("loading");

    submitBtn.textContent = "Create Technician Account";

}

/* -----------------------------
   IMAGE COMPRESSION
------------------------------*/

function compressImage(file, maxWidth = 800, quality = 0.7) {

    return new Promise((resolve, reject) => {

        if (!file.type.startsWith("image/")) {
            resolve(file);
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {

            const img = new Image();

            img.onload = function () {

                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {

                    height *= maxWidth / width;
                    width = maxWidth;

                }

                const canvas = document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(

                    function (blob) {

                        resolve(blob);

                    },

                    "image/jpeg",

                    quality

                );

            };

            img.src = event.target.result;

        };

        reader.onerror = reject;

        reader.readAsDataURL(file);

    });

}
/* -----------------------------
   PREPARE A FILE FOR UPLOAD
   Compresses photos; gives up after 8 seconds
   and sends the original if compression stalls.
------------------------------*/

function prepareUpload(file){

    const timeout = new Promise(resolve =>
        setTimeout(() => resolve(file), 8000)
    );

    return Promise.race([
        compressImage(file).then(result => result || file),
        timeout
    ]).catch(() => file);

}

/* -----------------------------
   IMAGE PREVIEW
------------------------------*/

function setupPreview(

    inputId,
    previewId,
    imageId,
    filenameId

){

    const input = document.getElementById(inputId);

    const preview = document.getElementById(previewId);

    const image = document.getElementById(imageId);

    const filename = document.getElementById(filenameId);

    input.addEventListener("change",function(){

        const file = this.files[0];

        if(!file){

            preview.style.display = "none";

            return;

        }

        filename.textContent = file.name;

        if(file.type.startsWith("image")){

            const reader = new FileReader();

            reader.onload = function(e){

                image.src = e.target.result;

                preview.style.display = "block";

            };

            reader.readAsDataURL(file);

        }

        else{

            image.src = "";

            preview.style.display = "block";

        }

    });

}

setupPreview(

    "facialImage",
    "facialPreview",
    "facialPreviewImage",
    "facialFileName"

);

setupPreview(

    "governmentId",
    "governmentPreview",
    "governmentPreviewImage",
    "governmentFileName"

);

setupPreview(

    "businessLicense",
    "businessPreview",
    "businessPreviewImage",
    "businessFileName"

);

/* -----------------------------
   VALIDATION
------------------------------*/

function validateForm(){

    if(passwordInput.value !== confirmPasswordInput.value){

        TR.toast("Passwords do not match.");

        return false;

    }

    if(phoneInput.value.length !== 11){

        TR.toast("Phone number must contain exactly 11 digits.");

        return false;

    }

    return true;

}

/* ===========================================================
   TECHRIDER TECHNICIAN SIGNUP
   PART 2
   =========================================================== */

/* -----------------------------
   FORM SUBMISSION
------------------------------*/

form.addEventListener("submit", async function (e) {

    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    startLoading();

    try {

        /* -----------------------------
           FORM FIELDS
        ------------------------------*/

        const data = new FormData();

        data.append("fullName", document.getElementById("fullName").value.trim());
        data.append("email", document.getElementById("email").value.trim());
        data.append("phone", phoneInput.value.trim());
        data.append("address", document.getElementById("address").value.trim());
        data.append("specialization", document.getElementById("specialization").value);
        data.append("experience", document.getElementById("experience").value);
        data.append("password", passwordInput.value);

        /* -----------------------------
           FILES
           Photos are compressed first; PDFs are sent as they are.
        ------------------------------*/

        const files = {
            facialImage: document.getElementById("facialImage").files[0],
            governmentId: document.getElementById("governmentId").files[0],
            businessLicense: document.getElementById("businessLicense").files[0]
        };

        for (const [field, file] of Object.entries(files)) {

            if (!file) continue;

            const prepared = await prepareUpload(file);

            data.append(
                field,
                prepared,
                prepared === file ? file.name : field + ".jpg"
            );

        }

        /* -----------------------------
           SEND TO THE SERVER
        ------------------------------*/

        await TechRiderAPI.upload("/auth/signup/technician", data);

        /* -----------------------------
           SUCCESS
        ------------------------------*/

        showToast(

            "Registration submitted successfully. Awaiting admin approval."

        );

        form.reset();

        strengthText.textContent = "";

        document
            .querySelectorAll(".preview-container")
            .forEach(preview => {

                preview.style.display = "none";

            });

        setTimeout(() => {

            window.location.href =
                "awaiting-approval-technician.html";

        }, 2500);

    }

    catch (error) {

        console.error(error);

        TR.toast(

            error.message ||
            "An unexpected error occurred while submitting your registration."

        );

    }

    finally {

        stopLoading();

    }

});

/* -----------------------------
   PREVENT ACCIDENTAL RESUBMISSION
------------------------------*/

window.addEventListener("pageshow", function () {

    stopLoading();

});

/* -----------------------------
   CONSOLE MESSAGE
------------------------------*/

console.log(

    "TechRider Technician Signup Ready"

);
