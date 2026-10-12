/* Scripts for login-customer.html */

    const password = document.getElementById('password');

    const togglePassword =
      document.getElementById('togglePassword');

    const form =
      document.getElementById('loginForm');

    const loginError =
      document.getElementById('loginError');

    // TOGGLE PASSWORD
    togglePassword.addEventListener('click', () => {

      const type =
        password.type === 'password'
        ? 'text'
        : 'password';

      password.type = type;

      togglePassword.classList.toggle('fa-eye-slash');

    });

    // OPENING THE LOGIN PAGE ENDS ANY PREVIOUS SESSION
    // (every "Logout" link in the app points here)
    TechRiderAPI.logout();

    // LOGIN FUNCTION
    form.addEventListener('submit', async (e) => {

      e.preventDefault();

      const email =
        document.getElementById('email')
        .value
        .trim()
        .toLowerCase();

      const pwd =
        password.value;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {

        await TechRiderAPI.login('customer', email, pwd);

        // HIDE ERROR
        loginError.style.display = 'none';

        // SUCCESS MESSAGE
        TR.toast('Login successful!');

        // REDIRECT TO DASHBOARD
        window.location.href =
          "dashboard-customer.html";

      } catch (err) {

        // SHOW ERROR
        loginError.textContent = err.message;
        loginError.style.display = 'block';

      } finally {

        if (submitBtn) submitBtn.disabled = false;

      }

    });
