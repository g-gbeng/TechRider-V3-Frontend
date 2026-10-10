/* Scripts for dashboard-customer.html */

    const sidebar =
      document.getElementById('sidebar');

    const overlay =
      document.getElementById('overlay');

    const hamburger =
      document.getElementById('hamburger');

    // MOBILE SIDEBAR
    function openSidebar(){

      sidebar.classList.add('open');
      overlay.classList.add('show');

    }

    function closeSidebar(){

      sidebar.classList.remove('open');
      overlay.classList.remove('show');

    }

    hamburger.addEventListener(
      'click',
      openSidebar
    );

    overlay.addEventListener(
      'click',
      closeSidebar
    );

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

    // GET FIRST NAME
    const fullName =
      currentCustomer.fullName || 'User';

    const firstName =
      fullName.split(' ')[0];

    const firstLetter =
      firstName.charAt(0).toUpperCase();

    // UPDATE UI
    document.getElementById(
      'welcomeText'
    ).textContent =
      `Welcome, ${firstName}`;

    document.getElementById(
      'avatar'
    ).textContent =
      firstLetter;

    document.getElementById(
      'sidebarLogo'
    ).textContent =
      firstLetter;

    document.getElementById(
      'sidebarName'
    ).textContent =
      firstName;

    /* =========================
       NOTIFICATIONS
    ========================= */

    async function updateNotifications(){

      // unread count and newest unread, from the server (cached for 30 seconds)
      if(!(await TechRiderAPI.ready)) return;

      try{

        const { unread, latest } = await TechRiderAPI.notificationSummary();

        const badge = document.getElementById('notificationBadge');
        badge.hidden = unread === 0;
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.setAttribute('aria-label', `${unread} unread notifications`);

        document.getElementById('notificationPreview').textContent =
          latest
          ? `${unread} unread · ${latest.message || latest.title}`
          : 'No new notifications';

      }catch(err){

        /* keep the previous text if the server is unreachable */

      }

    }

    /* =========================
       REQUESTS
    ========================= */

    let lastRequestsFetch = 0;

    async function updateRequests(){

      // counts come from the server, at most every 30 seconds
      // (this function is called every second by the timer below)
      if(Date.now() - lastRequestsFetch < 30000) return;
      lastRequestsFetch = Date.now();

      if(!(await TechRiderAPI.ready)) return;

      try{

        const { requests } =
          await TechRiderAPI.get('/requests?scope=all');

        const FINISHED = ['completed', 'cancelled', 'quote_rejected'];

        document.getElementById(
          'activeRequestsCount'
        ).textContent =
          requests.filter(r => !FINISHED.includes(r.status)).length;

        document.getElementById(
          'completedRequestsCount'
        ).textContent =
          requests.filter(r => r.status === 'completed').length;

      }catch(err){

        /* keep the previous numbers if the server is unreachable */

      }

    }

    /* =========================
       INITIAL LOAD
    ========================= */

    updateNotifications();
    updateRequests();

    /* =========================
       LIVE REALTIME UPDATES
    ========================= */

    window.addEventListener(
      'storage',
      () => {

        updateNotifications();
        updateRequests();

      }
    );

    setInterval(() => {

      updateNotifications();
      updateRequests();

    }, 1000);

    /* Live updates: refresh as soon as the server says something changed */
    TechRiderAPI.onUpdate(() => {
      lastRequestsFetch = 0;
      updateNotifications();
      updateRequests();
    });

    // LOGOUT
    document.getElementById(
      'logoutBtn'
    ).addEventListener('click', () => {

      localStorage.removeItem(
        'techrider_current_customer'
      );

    });
