/* Scripts for payment-callback.html */

/*
  Paystack sends the customer back here with ?reference=... (and ?trxref=...).
  We ask our server to confirm the payment with Paystack before showing success.
*/

const params = new URLSearchParams(window.location.search);
const reference = params.get("reference") || params.get("trxref");

const statusIcon = document.getElementById("statusIcon");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");
const referenceText = document.getElementById("reference");
const testNote = document.getElementById("testNote");
const actions = document.getElementById("actions");
const retryBtn = document.getElementById("retryBtn");

if(params.get("test") === "1"){
  testNote.hidden = false;
}

function show(state, title, text){

  statusIcon.className = "icon " + state;

  statusIcon.innerHTML =
    state === "success" ? '<i class="fas fa-check"></i>' :
    state === "failed" ? '<i class="fas fa-xmark"></i>' :
    '<i class="fas fa-spinner fa-spin"></i>';

  statusTitle.textContent = title;
  statusText.textContent = text;

}

async function confirmPayment(){

  if(!reference){
    show("failed", "No payment found", "We could not find a payment reference. Check your repairs for the latest status.");
    actions.hidden = false;
    return;
  }

  referenceText.textContent = "Reference: " + reference;
  show("checking", "Confirming your payment", "Please wait while we confirm your payment with Paystack.");
  actions.hidden = true;

  try{

    const result =
      await TechRiderAPI.post("/payments/verify", { reference });

    if(result.paid){

      show(
        "success",
        "Payment successful",
        `Thank you. Your repair ${result.code} is confirmed and we will arrange pickup of your device.`
      );
      retryBtn.hidden = true;

    }else{

      show(
        "failed",
        "Payment not completed",
        "Your payment was not completed, so nothing was charged. You can try again from your repairs."
      );
      retryBtn.hidden = false;

    }

  }catch(err){

    const reason = /[.!?]$/.test(err.message) ? err.message : err.message + ".";
    show("failed", "We could not confirm your payment", reason + " If you were charged, contact support with the reference below.");
    retryBtn.hidden = false;

  }

  actions.hidden = false;

}

retryBtn.addEventListener("click", confirmPayment);

(async function init(){

  if(!(await TechRiderAPI.ready)) return;

  confirmPayment();

})();
