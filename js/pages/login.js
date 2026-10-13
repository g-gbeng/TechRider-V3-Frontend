/* Scripts for login-customer.html, login-technician.html and login-rider.html
   The role comes from <body data-role="...">. */

const ROLE = document.body.dataset.role;

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggle = document.getElementById('togglePassword');
const message = document.getElementById('loginMessage');
const loginBtn = document.getElementById('loginBtn');

/* Opening a login page ends any previous session
   (every "Logout" link in the app points here) */
TechRiderAPI.logout();

/* ---------- show / hide password ---------- */
toggle.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  toggle.querySelector('i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  toggle.setAttribute('aria-pressed', String(show));
  passwordInput.focus();
});

/* ---------- messages under the form ---------- */
function showMessage(type, text){
  const icons = { error: 'fa-circle-exclamation', pending: 'fa-hourglass-half', success: 'fa-circle-check' };
  message.className = `login-message show ${type}`;
  message.innerHTML = `<i class="fas ${icons[type]}"></i><span></span>`;
  message.querySelector('span').textContent = text;
}

function clearMessage(){
  message.className = 'login-message';
  message.textContent = '';
}

[emailInput, passwordInput].forEach(input => input.addEventListener('input', () => {
  clearMessage();
  input.removeAttribute('aria-invalid');
}));

/* ---------- log in ---------- */
form.addEventListener('submit', async (e) => {

  e.preventDefault();
  clearMessage();

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if(!email){
    emailInput.setAttribute('aria-invalid', 'true');
    emailInput.focus();
    return showMessage('error', 'Enter your email address.');
  }
  if(!password){
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.focus();
    return showMessage('error', 'Enter your password.');
  }

  loginBtn.disabled = true;
  loginBtn.classList.add('busy');

  try{

    await TechRiderAPI.login(ROLE, email, password);
    showMessage('success', 'Welcome back! Opening your dashboard…');
    window.location.href = TechRiderAPI.DASHBOARDS[ROLE];

  }catch(err){

    // technicians and riders waiting for approval get a calmer message
    showMessage(err.code === 'PENDING' ? 'pending' : 'error', err.message);
    loginBtn.disabled = false;
    loginBtn.classList.remove('busy');

  }

});
