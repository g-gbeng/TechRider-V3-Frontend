/* Scripts for active-repairs-customer.html */

    /* =========================================
    ELEMENTS
    ========================================= */

    const repairsGrid =
      document.getElementById(
        'repairsGrid'
      );

    const emptyState =
      document.getElementById(
        'emptyState'
      );

    const esc = TechRiderAPI.escapeHtml;

    let repairs = [];

    /* =========================================
    FORMAT HELPERS
    ========================================= */

    function formatDate(dateString){

      if(!dateString){
        return 'Recently';
      }

      return new Date(dateString).toLocaleString(
        'en-NG',
        {
          day:'numeric',
          month:'short',
          year:'numeric',
          hour:'numeric',
          minute:'2-digit'
        }
      );

    }

    function formatNaira(value){
      return '₦' + Number(value || 0).toLocaleString('en-NG');
    }

    /* =========================================
    STATUS DISPLAY
    ========================================= */

    function getStatusClass(repair){

      if(repair.needsTechnician) return 'pending';

      switch(repair.status){
        case 'quote_sent':
          return 'quote';
        case 'quote_accepted':
        case 'pickup_in_transit':
        case 'repair_in_progress':
        case 'repair_done':
        case 'return_in_transit':
          return 'in-progress';
        case 'cancelled':
        case 'quote_rejected':
          return 'cancelled';
        default:
          return 'pending';
      }

    }

    function getStatusMessage(repair){

      if(repair.needsTechnician){
        return repair.technician === null && repair.timeline.some(t => t.role === 'technician')
          ? 'The technician you chose could not take this job. Please choose another technician.'
          : 'Choose a technician to send this request to.';
      }

      switch(repair.status){
        case 'awaiting_technician':
          return 'Waiting for the technician to review your device and send a quote.';
        case 'quoted':
          return 'The technician has reviewed your request. TechRider is preparing your quote.';
        case 'quote_sent':
          return repair.paymentPending
            ? 'Your quote is ready. If you already paid, it can take a moment to confirm.'
            : 'Your quote is ready. Accept and pay to continue, or decline.';
        case 'quote_accepted':
          return repair.rider && repair.rider.active
            ? 'Payment received. A rider has been assigned to collect your device.'
            : 'Payment received. We are arranging pickup of your device.';
        case 'pickup_in_transit':
          return 'A rider has collected your device and is taking it to the technician.';
        case 'repair_in_progress':
          return 'Your repair is currently being worked on by the technician.';
        case 'repair_done':
          return repair.rider && repair.rider.active
            ? 'The repair is finished. A rider has been assigned to bring your device back.'
            : 'The repair is finished. We are arranging to return your device.';
        case 'return_in_transit':
          return 'Your device is on its way back to you.';
        default:
          return repair.statusLabel;
      }

    }

    /* =========================================
    ACTION BUTTONS
    ========================================= */

    function actionsFor(repair){

      const buttons = [];

      if(repair.needsTechnician){
        buttons.push(
          `<a class="action-btn primary" href="select-technician.html?request=${encodeURIComponent(repair.id)}">
             <i class="fas fa-user-cog"></i> Choose technician
           </a>`
        );
      }

      if(repair.status === 'quote_sent' && repair.quote){
        buttons.push(
          `<button class="action-btn primary" data-action="accept" data-id="${esc(repair.id)}">
             <i class="fas fa-credit-card"></i> Accept &amp; pay ${formatNaira(repair.quote.customerPrice)}
           </button>`,
          `<button class="action-btn secondary" data-action="reject" data-id="${esc(repair.id)}">
             Decline quote
           </button>`
        );
      }

      if(repair.canCancel && repair.status !== 'quote_sent'){
        buttons.push(
          `<button class="action-btn danger" data-action="cancel" data-id="${esc(repair.id)}">
             Cancel request
           </button>`
        );
      }

      return buttons.length
        ? `<div class="card-actions">${buttons.join('')}</div>`
        : '';

    }

    /* =========================================
    RENDER ACTIVE REPAIRS
    ========================================= */

    function renderRepairs(){

      repairsGrid.innerHTML = '';

      if(repairs.length === 0){
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';

      repairs.forEach(repair => {

        const statusClass = getStatusClass(repair);

        const statusLabel = repair.needsTechnician
          ? 'Choose technician'
          : repair.statusLabel;

        repairsGrid.innerHTML += `
          <div class="repair-card">

            <div class="top">
              <div>
                <div class="title">
                  ${esc(repair.brand)} ${esc(repair.model)} (${esc(repair.deviceType)})
                </div>
                <div class="request-id">
                  ${esc(repair.code)}
                </div>
              </div>

              <div class="status ${statusClass}">
                ${esc(statusLabel)}
              </div>
            </div>

            <div class="details">
              <div>
                <i class="fas fa-mobile-alt"></i>
                <strong>Device Type:</strong>
                ${esc(repair.deviceType)}
              </div>
              <div>
                <i class="fas fa-tag"></i>
                <strong>Brand:</strong>
                ${esc(repair.brand)}
              </div>
              <div>
                <i class="fas fa-microchip"></i>
                <strong>Model:</strong>
                ${esc(repair.model)}
              </div>
              <div>
                <i class="fas fa-map-marker-alt"></i>
                <strong>Location:</strong>
                ${esc(repair.location)}
              </div>
              <div>
                <i class="fas fa-user-cog"></i>
                <strong>Technician:</strong>
                ${esc(repair.technician ? repair.technician.fullName : 'Awaiting Assignment')}
              </div>
              ${
                repair.rider && repair.rider.active
                ? `<div>
                     <i class="fas fa-motorcycle"></i>
                     <strong>Rider:</strong>
                     ${esc(repair.rider.fullName)}
                     ${repair.rider.phone
                       ? `· <a class="rider-phone" href="tel:${esc(repair.rider.phone)}">${esc(repair.rider.phone)}</a>`
                       : '<span class="rider-wait">(contact shown once they accept)</span>'}
                   </div>`
                : ''
              }
            </div>

            <div class="desc">
              <strong>Issue Description:</strong>
              <br><br>
              ${esc(repair.description)}
            </div>

            ${
              repair.quote
              ? `<div class="quote-box">
                   <span>Repair quote</span>
                   <strong>${formatNaira(repair.quote.customerPrice)}</strong>
                 </div>`
              : ''
            }

            <div class="status-info ${statusClass}">
              ${esc(getStatusMessage(repair))}
            </div>

            ${actionsFor(repair)}

            <div class="timestamp">
              <i class="fas fa-clock"></i>
              Requested:
              ${formatDate(repair.createdAt)}
            </div>

          </div>
        `;

      });

    }

    /* =========================================
    ACTIONS
    ========================================= */

    async function acceptQuote(id, button){

      const repair = repairs.find(r => r.id === id);

      if(!confirm(`Accept the quote of ${formatNaira(repair.quote.customerPrice)} for ${repair.code}? You will be taken to Paystack to pay securely.`)){
        return;
      }

      button.disabled = true;

      try{

        const result =
          await TechRiderAPI.post(`/requests/${encodeURIComponent(id)}/quote/accept`);

        /* go to Paystack (or the test-payment page in development) */
        window.location.href = result.authorizationUrl;

      }catch(err){

        alert(err.message);
        button.disabled = false;

      }

    }

    async function rejectQuote(id, button){

      if(!confirm('Decline this quote? The repair request will be closed.')){
        return;
      }

      button.disabled = true;

      try{
        await TechRiderAPI.post(`/requests/${encodeURIComponent(id)}/quote/reject`);
        await loadRepairs();
      }catch(err){
        alert(err.message);
        button.disabled = false;
      }

    }

    async function cancelRequest(id, button){

      const reason = prompt('Cancel this repair request? You can tell us why (optional):', '');

      if(reason === null) return;

      button.disabled = true;

      try{
        await TechRiderAPI.post(`/requests/${encodeURIComponent(id)}/cancel`, { reason });
        await loadRepairs();
      }catch(err){
        alert(err.message);
        button.disabled = false;
      }

    }

    repairsGrid.addEventListener('click', (e) => {

      const button = e.target.closest('button[data-action]');

      if(!button) return;

      const id = button.dataset.id;

      if(button.dataset.action === 'accept') acceptQuote(id, button);
      if(button.dataset.action === 'reject') rejectQuote(id, button);
      if(button.dataset.action === 'cancel') cancelRequest(id, button);

    });

    /* =========================================
    LOAD
    ========================================= */

    async function loadRepairs(){

      try{

        const data =
          await TechRiderAPI.get('/requests?scope=active');

        repairs = data.requests;

      }catch(err){

        alert('Could not load your repairs: ' + err.message);

      }

      renderRepairs();

    }

    (async function init(){

      if(!(await TechRiderAPI.ready)) return;

      await loadRepairs();

      /* Live updates: refresh as soon as the server says something changed */
      TechRiderAPI.onUpdate(loadRepairs);

      // fallback when live updates aren't available
      setInterval(() => { if(!document.hidden) loadRepairs(); }, 60000);

    })();
