/* Scripts for signup-customer.html */

    const form = document.getElementById('signupForm');

    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    const passwordError = document.getElementById('passwordError');
    const matchError = document.getElementById('matchError');

    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirm = document.getElementById('toggleConfirm');

    const phoneInput = document.getElementById('phone');

    // PASSWORD TOGGLE
    togglePassword.addEventListener('click', () => {
      const type = password.type === 'password'
        ? 'text'
        : 'password';

      password.type = type;

      togglePassword.classList.toggle('fa-eye-slash');
    });

    toggleConfirm.addEventListener('click', () => {
      const type = confirmPassword.type === 'password'
        ? 'text'
        : 'password';

      confirmPassword.type = type;

      toggleConfirm.classList.toggle('fa-eye-slash');
    });

    // PHONE NUMBER RESTRICTION
    phoneInput.addEventListener('input', () => {

      // Remove non-numeric characters
      phoneInput.value = phoneInput.value
        .replace(/\D/g, '')
        .slice(0, 11);

    });

    // PASSWORD VALIDATION
    function validatePassword(pwd) {

      const hasUpper = /[A-Z]/.test(pwd);
      const hasNumber = /[0-9]/.test(pwd);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

      return (
        pwd.length >= 8 &&
        hasUpper &&
        hasNumber &&
        hasSpecial
      );
    }

    // FORM SUBMIT
    form.addEventListener('submit', function(e) {

      e.preventDefault();

      const pwd = password.value;
      const confirmPwd = confirmPassword.value;

      let valid = true;

      // PASSWORD CHECK
      if (!validatePassword(pwd)) {

        passwordError.style.display = 'block';
        valid = false;

      } else {

        passwordError.style.display = 'none';
      }

      // PASSWORD MATCH CHECK
      if (pwd !== confirmPwd) {

        matchError.style.display = 'block';
        valid = false;

      } else {

        matchError.style.display = 'none';
      }

      // PHONE NUMBER CHECK
      if (phoneInput.value.length !== 11) {

        TR.toast('Phone number must be exactly 11 digits');
        valid = false;
      }

      if (valid) {

        const createBtn = document.getElementById('createBtn');
        createBtn.disabled = true;

        TechRiderAPI.post('/auth/signup/customer', {
          fullName: document.getElementById('name').value.trim(),
          email: document.getElementById('email').value.trim(),
          phone: phoneInput.value,
          password: pwd
        })
          .then(() => {
            TR.toast('Account created successfully!');

            // REDIRECT
            window.location.href = "login-customer.html";
          })
          .catch((err) => {
            TR.toast(err.message, "error");
          })
          .finally(() => {
            createBtn.disabled = false;
          });
      }

    });
