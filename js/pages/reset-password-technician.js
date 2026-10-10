/* Scripts for reset-password-technician.html */

    /*
      This page is used two ways:
      1. From the emailed link (the address contains ?token=...): choose a new password.
      2. From the profile page while logged in: change password, confirming the current one.
    */

    const ROLE = 'technician';
    const token = new URLSearchParams(window.location.search).get('token');

    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const currentPassword = document.getElementById('currentPassword');
    const currentPasswordGroup = document.getElementById('currentPasswordGroup');
    const resetForm = document.getElementById('resetForm');
    const submitButton = resetForm.querySelector('button[type="submit"]');

    const passwordError = document.getElementById('passwordError');
    const matchError = document.getElementById('matchError');

    const toggleNew = document.getElementById('toggleNew');
    const toggleConfirm = document.getElementById('toggleConfirm');
    const toggleCurrent = document.getElementById('toggleCurrent');

    let changingWhileLoggedIn = false;

    function validatePassword(pwd){
      return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    }

    toggleNew.addEventListener('click', ()=>{
      newPassword.type = newPassword.type === 'password' ? 'text' : 'password';
      toggleNew.classList.toggle('fa-eye-slash');
    });

    toggleConfirm.addEventListener('click', ()=>{
      confirmPassword.type = confirmPassword.type === 'password' ? 'text' : 'password';
      toggleConfirm.classList.toggle('fa-eye-slash');
    });

    toggleCurrent.addEventListener('click', ()=>{
      currentPassword.type = currentPassword.type === 'password' ? 'text' : 'password';
      toggleCurrent.classList.toggle('fa-eye-slash');
    });

    /* No emailed token: only allowed when logged in */
    if (!token) {
      submitButton.disabled = true;

      TechRiderAPI.get('/auth/me')
        .then(({ user }) => {
          if (user.role !== ROLE) throw new Error('wrong role');
          changingWhileLoggedIn = true;
          currentPasswordGroup.hidden = false;
          currentPassword.required = true;
          submitButton.disabled = false;
        })
        .catch(() => {
          alert('Open the reset link from your email, or request a new one.');
          window.location.replace('forgot-password-technician.html');
        });
    }

    resetForm.addEventListener('submit', async (e)=>{
      e.preventDefault();

      let valid = true;

      if(!validatePassword(newPassword.value)){
        passwordError.style.display='block';
        valid=false;
      } else {
        passwordError.style.display='none';
      }

      if(newPassword.value !== confirmPassword.value){
        matchError.style.display='block';
        valid=false;
      } else {
        matchError.style.display='none';
      }

      if(!valid) return;

      submitButton.disabled = true;

      try {
        if (changingWhileLoggedIn) {
          await TechRiderAPI.patch('/me/password', {
            currentPassword: currentPassword.value,
            newPassword: newPassword.value
          });
          alert('Password changed successfully.');
          window.location.href = "profile-technician.html";
        } else {
          const result = await TechRiderAPI.post('/auth/reset-password', {
            token: token,
            password: newPassword.value
          });
          TechRiderAPI.clearSession();
          alert(result.message);
          window.location.href = "login-technician.html";
        }
      } catch (err) {
        alert(err.message);
      } finally {
        submitButton.disabled = false;
      }

    });
