/* Scripts for profile-customer.html */

    // CURRENT CUSTOMER
    const currentCustomer =
      JSON.parse(
        localStorage.getItem(
          'techrider_current_customer'
        )
      );

    // SECURITY CHECK
    if(!currentCustomer){

      window.location.href =
        'login-customer.html';

    }

    // DOM ELEMENTS
    const avatar =
      document.getElementById('avatar');

    const nameElement =
      document.getElementById('name');

    const emailElement =
      document.getElementById('email');

    const phoneElement =
      document.getElementById('phone');

    const profileImageInput =
      document.getElementById(
        'profileImageInput'
      );

    const uploadTrigger =
      document.getElementById(
        'uploadTrigger'
      );

    // GET INITIALS
    function getInitials(name){

      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();

    }

    // LOAD PROFILE INFO
    nameElement.textContent =
      currentCustomer.fullName;

    emailElement.textContent =
      currentCustomer.email;

    phoneElement.textContent =
      currentCustomer.phone;

    // PROFILE IMAGE OR INITIALS
    if(currentCustomer.profileImage){

      avatar.innerHTML = `
        <img src="${currentCustomer.profileImage}" alt="Profile">
      `;

    } else {

      avatar.textContent =
        getInitials(
          currentCustomer.fullName
        );

    }

    // PROFILE IMAGE UPLOAD
    uploadTrigger.addEventListener(
      'click',
      () => {

        profileImageInput.click();

      }
    );

    profileImageInput.addEventListener(
      'change',
      (event) => {

        const file =
          event.target.files[0];

        if(!file) return;

        /* upload to the server, then show the new photo */

        const formData =
          new FormData();

        formData.append('avatar', file);

        TechRiderAPI.upload('/me/avatar', formData)
          .then(({ user }) => {

            TechRiderAPI.cacheSession(user);

            currentCustomer.profileImage =
              user.profileImageUrl;

            avatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = user.profileImageUrl;
            img.alt = 'Profile';
            avatar.appendChild(img);

          })
          .catch((err) => {

            alert(err.message);

          })
          .finally(() => {

            event.target.value = '';

          });

      }
    );

    // REQUEST STATS (from the server)
    (async function loadStats(){

      if(!(await TechRiderAPI.ready)) return;

      try{

        const { requests } =
          await TechRiderAPI.get('/requests?scope=all');

        document.getElementById('totalRequests').textContent =
          requests.length;

        document.getElementById('completedRequests').textContent =
          requests.filter(r => r.status === 'completed').length;

        document.getElementById('cancelledRequests').textContent =
          requests.filter(r => r.status === 'cancelled' || r.status === 'quote_rejected').length;

      }catch(err){
        /* leave the stats as they are */
      }

    })();

    // LOGOUT
    document.getElementById(
      'logoutBtn'
    ).addEventListener('click', () => {

      localStorage.removeItem(
        'techrider_current_customer'
      );

      window.location.href =
        'login-customer.html';

    });
