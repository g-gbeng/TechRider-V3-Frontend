/* Scripts for account-suspended.html */

/*
==========================================
ACCOUNT SUSPENSION PAGE
==========================================

Works for customers, technicians and riders.
Asks the server who is logged in:
- still suspended  -> show the reason the admin gave
- reactivated      -> go back to their dashboard
- not logged in    -> go to the start page
Checks again every 30 seconds, so a reactivation
takes effect without refreshing.
*/

const reasonText =
document.getElementById('reasonText');

async function loadReason(){

  try{

    const { user } =
    await TechRiderAPI.get('/auth/me');

    if(!user.suspended){

      TechRiderAPI.cacheSession(user);

      window.location.href =
      TechRiderAPI.DASHBOARDS[user.role] || 'index.html';

      return;

    }

    reasonText.textContent =
    user.suspensionReason ||
    'Your account is currently under review by the administrative team.';

  }catch(err){

    if(err.status === 401){

      window.location.href = 'index.html';

    }

    /* server unreachable: keep the default message */

  }

}

/* initial load, then re-check every 30 seconds */

loadReason();

setInterval(loadReason, 30000);
