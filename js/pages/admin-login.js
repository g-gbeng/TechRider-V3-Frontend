/* Scripts for admin-login.html */

    /* =========================================
ADMIN LOGIN METRICS
========================================= */

async function loadStatistics(){

    try{

        const stats =
        await TechRiderAPI.get("/stats/public");

        document.getElementById("customerCount").textContent =
        stats.customers;

        document.getElementById("technicianCount").textContent =
        stats.technicians;

        document.getElementById("riderCount").textContent =
        stats.riders;

    }catch(err){

        /* counts are optional: leave the placeholders */

    }

}

let attempts=0;


function togglePass(){

let p=
document.getElementById(
'password'
);

p.type=
p.type==='password'
?'text'
:'password';

}



function loginAdmin(){

let email=
document.getElementById(
'email'
).value.trim();

let pass=
document.getElementById(
'password'
).value.trim();

let err=
document.getElementById(
'errorBox'
);

let ok=
document.getElementById(
'successBox'
);

err.style.display='none';
ok.style.display='none';


if(!email || !pass){

err.innerHTML=
'Fill in all required fields.';

err.style.display='block';

return;

}


if(attempts>=5){

err.innerHTML=
'Account temporarily locked after too many attempts.';

err.style.display='block';

return;

}


let btn=
document.getElementById(
'loginBtn'
);

btn.disabled=true;
btn.innerHTML='Signing in...';

TechRiderAPI.login('admin',email,pass)
.then(function(){

ok.innerHTML=
'Login successful. Redirecting to dashboard...';

ok.style.display='block';

setTimeout(function(){

window.location.href=
'admin-dashboard.html';

},800);

})
.catch(function(error){

attempts++;

err.textContent=
error.status===401
? 'Invalid credentials. Attempt '+attempts+' of 5'
: error.message;

err.style.display='block';

btn.disabled=false;
btn.innerHTML='Login';

});

}

/* =========================================
INITIALIZE
========================================= */

// Opening the login page ends any previous session
TechRiderAPI.logout();

loadStatistics();
