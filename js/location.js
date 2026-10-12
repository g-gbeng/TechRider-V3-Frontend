/* ==========================================================
   CUSTOMER LOCATION  (TR.location)
   Load after js/api.js and js/ui.js.

   await TR.location.detect()   asks the browser where the customer is,
                                turns it into an address and remembers it
   TR.location.saved()          the last address found (or null)
   await TR.location.permission()  "granted" | "prompt" | "denied" | "unsupported"

   The address is kept in this browser only, so the repair form can fill
   itself in. The customer can always edit it.
========================================================== */
(function () {
  const TR = window.TR;
  const KEY = "techrider_customer_location";
  const FRESH_MS = 6 * 3600 * 1000; // re-check after 6 hours

  function saved() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || !data.address) return null;
      data.fresh = Date.now() - data.at < FRESH_MS;
      return data;
    } catch (e) {
      return null;
    }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ }
  }

  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  async function permission() {
    if (!("geolocation" in navigator)) return "unsupported";
    if (!window.isSecureContext) return "unsupported";
    try {
      if (navigator.permissions && navigator.permissions.query) {
        return (await navigator.permissions.query({ name: "geolocation" })).state;
      }
    } catch (e) { /* Safari without the API */ }
    return "prompt";
  }

  function position() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5 * 60 * 1000
      });
    });
  }

  const ERRORS = {
    1: "Location is blocked for TechRider. Allow it in your browser's site settings, or type your address.",
    2: "We couldn't find your location. Check that location (GPS) is on, or type your address.",
    3: "Finding your location took too long. Try again, or type your address."
  };

  /* Returns { lat, lng, accuracy, address: { street, area, city, state, short, full }, at } */
  async function detect() {
    if ((await permission()) === "unsupported") {
      throw new Error("Your browser can't share your location here. Please type your address.");
    }
    let pos;
    try {
      pos = await position();
    } catch (err) {
      throw new Error(ERRORS[err.code] || "We couldn't get your location. Please type your address.");
    }
    const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
    const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
    const { address } = await window.TechRiderAPI.get(`/geo/reverse?lat=${lat}&lng=${lng}`);
    if (!address || !address.full) throw new Error("We found you on the map but not a street address. Please type it in.");
    const data = { lat, lng, accuracy: Math.round(pos.coords.accuracy || 0), address, at: Date.now() };
    save(data);
    window.dispatchEvent(new CustomEvent("tr:location", { detail: data }));
    return data;
  }

  TR.location = { detect, saved, forget, permission };
})();
