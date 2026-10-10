/* Scripts for dev-api-check.html */

    const results = document.getElementById("results");

    function row(label, value, good){
      return `<div class="row"><span>${label}</span><span class="${good ? "ok" : "bad"}">${value}</span></div>`;
    }

    async function check(){
      results.innerHTML = "<p>Checking...</p>";
      try{
        const data = await TechRiderAPI.health();
        results.innerHTML =
          row("API address", TechRiderAPI.API_BASE, true) +
          row("API server", "Reachable", true) +
          row("Database", data.database, data.database === "connected");
      }catch(err){
        results.innerHTML =
          row("API address", TechRiderAPI.API_BASE, true) +
          row("API server", err.status === 0 ? "Not reachable" : "Reachable", err.status !== 0) +
          row("Database", err.status === 503 ? "Not connected" : "Unknown", false) +
          `<p style="margin-top:10px">${err.message}</p>`;
      }
    }

    document.getElementById("checkBtn").addEventListener("click", check);
    check();
