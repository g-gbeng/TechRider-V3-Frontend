/* Scripts for login-rider.html */

/* ==========================================================
   TECHRIDER RIDER LOGIN
   PART 1
========================================================== */

/* =========================
    STORAGE KEYS
========================= */

/* Accounts now live on the TechRider server (see js/api.js) */

/* =========================
    DOM
========================= */

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const errorBox = document.getElementById("errorMessage");

const successBox = document.getElementById("successMessage");

const pendingBox = document.getElementById("pendingMessage");

/* =========================
    PASSWORD TOGGLE
========================= */

function togglePassword(id,icon){

    const field = document.getElementById(id);

    if(field.type==="password"){

        field.type="text";

        icon.classList.replace(
            "fa-eye",
            "fa-eye-slash"
        );

    }

    else{

        field.type="password";

        icon.classList.replace(
            "fa-eye-slash",
            "fa-eye"
        );

    }

}

/* =========================
    MESSAGE HELPERS
========================= */

function clearMessages(){

    errorBox.style.display = "none";

    successBox.style.display = "none";

    pendingBox.style.display = "none";

    errorBox.textContent = "";

    successBox.textContent = "";

    pendingBox.textContent = "";

}

function showError(message){

    clearMessages();

    errorBox.style.display = "block";

    errorBox.textContent = message;

}

function showSuccess(message){

    clearMessages();

    successBox.style.display = "block";

    successBox.textContent = message;

}

function showPending(message){

    clearMessages();

    pendingBox.style.display = "block";

    pendingBox.textContent = message;

}

/* =========================
    LOGIN
========================= */

// Opening the login page ends any previous session
// (every "Logout" link in the app points here)
TechRiderAPI.logout();

loginForm.addEventListener(

    "submit",

    async function(e){

        e.preventDefault();

        clearMessages();

        const email =

            emailInput.value

            .trim()

            .toLowerCase();

        const password =

            passwordInput.value;

        try{

            await TechRiderAPI.login(

                "rider",

                email,

                password

            );

            showSuccess(

                "Login successful. Redirecting..."

            );

            setTimeout(()=>{

                window.location.href =

                "dashboard-rider.html";

            },1200);

        }

        catch(err){

            /* awaiting admin approval */

            if(err.code==="PENDING"){

                showPending(err.message);

                return;

            }

            showError(err.message);

        }

    }

);

/* =================================
    CLEAR MESSAGES WHILE TYPING
================================= */

emailInput.addEventListener(

    "input",

    clearMessages

);

passwordInput.addEventListener(

    "input",

    clearMessages

);

/* =================================
    ENTER KEY SUPPORT
================================= */

document.addEventListener(

    "keydown",

    function(e){

        if(

            e.key === "Enter" &&

            document.activeElement === passwordInput

        ){

            loginForm.requestSubmit();

        }

    }

);
