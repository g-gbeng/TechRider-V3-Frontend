/* Scripts for forgot-password.html?role=customer|technician|rider */

    const ROLES = ['customer', 'technician', 'rider'];
    const askedRole = new URLSearchParams(window.location.search).get('role');
    const ROLE = ROLES.includes(askedRole) ? askedRole : 'customer';
    const LOGIN = TechRiderAPI.LOGIN_PAGES[ROLE];

    document.getElementById('loginLink').href = LOGIN;

    const forgotForm = document.getElementById('forgotForm');

    forgotForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const button = forgotForm.querySelector('button[type="submit"]');
      const email = forgotForm.querySelector('input[type="email"]').value.trim();

      if (!email) {
        TR.toast('Enter the email address you signed up with.', 'warning');
        return;
      }

      button.disabled = true;

      try {
        const result = await TechRiderAPI.post('/auth/forgot-password', { email, role: ROLE });

        // stay here and say what happens next
        forgotForm.hidden = true;
        document.getElementById('sentText').textContent =
          `${result.message} Open the link in the email to choose a new password. It can take a few minutes, and may land in your spam folder.`;
        document.getElementById('sentBox').hidden = false;

      } catch (err) {
        TR.toast(err.message, "error");
      } finally {
        button.disabled = false;
      }
    });
