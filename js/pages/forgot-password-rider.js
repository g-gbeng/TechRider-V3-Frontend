/* Scripts for forgot-password-rider.html */

    const forgotForm = document.getElementById('forgotForm');

    forgotForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const button = forgotForm.querySelector('button[type="submit"]');
      const email = forgotForm.querySelector('input[type="email"]').value.trim();

      button.disabled = true;

      try {
        const result = await TechRiderAPI.post('/auth/forgot-password', {
          email: email,
          role: 'rider'
        });

        alert(result.message + ' Check your inbox (and spam folder) and open the link to choose a new password.');
        window.location.href = "login-rider.html";

      } catch (err) {
        alert(err.message);
      } finally {
        button.disabled = false;
      }
    });
