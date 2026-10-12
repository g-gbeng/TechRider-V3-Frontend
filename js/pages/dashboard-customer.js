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

    // UPDATE UI (the photo appears once the login check has the latest profile)
    document.getElementById('welcomeText').textContent = `Welcome, ${firstName}`;
    document.getElementById('sidebarName').textContent = firstName;
    TR.setAvatar(document.getElementById('avatar'), currentCustomer);
    TR.setAvatar(document.getElementById('sidebarLogo'), currentCustomer);

    TechRiderAPI.ready.then(user => {
      if(!user) return;
      TR.setAvatar(document.getElementById('avatar'), user);
      TR.setAvatar(document.getElementById('sidebarLogo'), user);
    });

    /* =========================
       CURRENT LOCATION
       Shown here and used to fill in the repair form.
    ========================= */

    const locationCard = document.getElementById('locationCard');
    const locationMain = document.getElementById('locationMain');
    const locationSub = document.getElementById('locationSub');
    const locationBtn = document.getElementById('locationBtn');

    function showLocation(data){
      const a = data.address;
      locationCard.classList.add('found');
      locationMain.textContent = a.short || a.full;
      locationSub.className = 'location-sub';
      locationSub.textContent = `${a.street ? a.street + ' · ' : ''}Updated ${TR.ago(data.at)}${data.accuracy ? ` · within about ${data.accuracy < 1000 ? data.accuracy + ' m' : Math.round(data.accuracy / 100) / 10 + ' km'}` : ''}`;
      locationBtn.querySelector('span').textContent = 'Refresh';
      locationBtn.setAttribute('aria-label', 'Refresh my location');
    }

    async function findLocation(){
      locationBtn.disabled = true;
      locationBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
      try{
        showLocation(await TR.location.detect());
      }catch(err){
        locationSub.className = 'location-sub err';
        locationSub.textContent = err.message;
      }finally{
        locationBtn.disabled = false;
        locationBtn.querySelector('i').className = 'fas fa-location-crosshairs';
      }
    }

    locationBtn.addEventListener('click', findLocation);

    (async function initLocation(){
      if(!(await TechRiderAPI.ready)) return;
      const saved = TR.location.saved();
      if(saved) showLocation(saved);
      const permission = await TR.location.permission();
      if(permission === 'unsupported'){
        if(!saved) locationCard.hidden = true;
        return;
      }
      if(permission === 'denied' && !saved){
        locationSub.className = 'location-sub err';
        locationSub.textContent = 'Location is blocked for TechRider in this browser. You can still type your address when you request a repair.';
        return;
      }
      // already allowed: keep it current without asking
      if(permission === 'granted' && (!saved || !saved.fresh)) findLocation();
    })();

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

        showRatePrompt(requests);

      }catch(err){

        /* keep the previous numbers if the server is unreachable */

      }

    }

    /* =========================
       RATE A FINISHED REPAIR
       The newest completed repair (last 30 days) that isn't rated yet.
    ========================= */

    const DISMISS_KEY = 'techrider_rate_dismissed';

    function dismissed(){
      try{ return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); }catch(e){ return []; }
    }

    function showRatePrompt(requests){
      const slot = document.getElementById('rateSlot');
      const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
      const repair = requests
        .filter(r => r.canReview && new Date(r.completedAt || r.updatedAt).getTime() > monthAgo && !dismissed().includes(r.id))
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
      if(!repair){ slot.innerHTML = ''; return; }
      slot.innerHTML = `
        <div class="rate-banner">
          <i class="fas fa-star rate-icon" aria-hidden="true"></i>
          <p>How did ${TR.esc(repair.technician ? repair.technician.fullName : 'your technician')} do with your ${TR.esc(repair.brand)} ${TR.esc(repair.model)}?
            <small>Your rating helps other customers choose.</small></p>
          <button type="button" class="tr-btn tr-btn-primary tr-btn-sm" id="rateNowBtn">Rate repair</button>
          <button type="button" class="tr-btn tr-btn-ghost tr-btn-sm" id="rateLaterBtn">Not now</button>
        </div>`;
      document.getElementById('rateNowBtn').onclick = async () => {
        if(await TR.rate(repair)){ slot.innerHTML = ''; lastRequestsFetch = 0; updateRequests(); }
      };
      document.getElementById('rateLaterBtn').onclick = () => {
        try{ localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed().concat(repair.id).slice(-50))); }catch(e){ /* ignore */ }
        slot.innerHTML = '';
      };
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
