/* Scripts for awaiting-approval-technician.html */

/*
  Applicants are not logged in while they wait, so "Refresh Status"
  takes them to the login page: logging in shows whether the account
  is still under review or has been approved.
*/
function checkApproval(){
  window.location.href = "login-technician.html";
}

function logout(){
  TechRiderAPI.logout().finally(function(){
    window.location.href = "login-technician.html";
  });
}
