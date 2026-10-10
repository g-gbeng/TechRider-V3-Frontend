/* Scripts for login-technician.html */

/* ==========================================================
   TECHRIDER TECHNICIAN LOGIN
   PART 1
========================================================== */

/* ==============================
    STORAGE KEYS
============================== */

/* Accounts now live on the TechRider server (see js/api.js) */

/* ==============================
    DOM
============================== */

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const loginMessage = document.getElementById("loginMessage");

/* ==============================
    PASSWORD TOGGLE
============================== */

function togglePassword(icon){

    const input = icon.previousElementSibling;

    if(input.type==="password"){

        input.type="text";

        icon.classList.replace(

            "fa-eye",

            "fa-eye-slash"

        );

    }

    else{

        input.type="password";

        icon.classList.replace(

            "fa-eye-slash",

            "fa-eye"

        );

    }

}

/* ==============================
    MESSAGE BOX
============================== */

function showMessage(type,message){

    loginMessage.className =

        "login-message " + type;

    loginMessage.textContent = message;

}

function clearMessage(){

    loginMessage.className =

        "login-message";

    loginMessage.textContent = "";

}

/* ==============================
    LOGIN
============================== */

// Opening the login page ends any previous session
// (every "Logout" link in the app points here)
TechRiderAPI.logout();

loginForm.addEventListener(

    "submit",

    async function(e){

        e.preventDefault();

        clearMessage();

        const email =

            emailInput.value

            .trim()

            .toLowerCase();

        const password =

            passwordInput.value;

        try{

            await TechRiderAPI.login(

                "technician",

                email,

                password

            );

            showMessage(

                "success",

                "Login successful. Redirecting..."

            );

            setTimeout(()=>{

                window.location.href =

                "dashboard-technician.html";

            },1200);

        }

        catch(err){

            /* awaiting admin approval */

            if(err.code==="PENDING"){

                showMessage(

                    "pending",

                    err.message

                );

                return;

            }

            showMessage(

                "error",

                err.message

            );

        }

    }

);

/* =================================
    CLEAR MESSAGE WHILE TYPING
================================= */

emailInput.addEventListener(

    "input",

    clearMessage

);

passwordInput.addEventListener(

    "input",

    clearMessage

);

/* =================================
    ENTER KEY SUPPORT
================================= */

document.addEventListener(

    "keydown",

    function(e){

        if(

            e.key==="Enter" &&

            document.activeElement===passwordInput

        ){

            loginForm.requestSubmit();

        }

    }

);
