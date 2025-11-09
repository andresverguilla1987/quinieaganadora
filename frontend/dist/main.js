/*
  Static frontend expects window.API_BASE to be set by the server at runtime.
*/
function el(id){return document.getElementById(id);}
const thInput = el("threshold"), thValue = el("th-value");
thInput.addEventListener("input", ()=> thValue.textContent = thInput.value);

async function fetchMatches(){
  try{
    const res = await fetch(window.API_BASE + "/matches");
    if(!res.ok) throw new Error("No matches");
    const data = await res.json();
    const ul = el("matches"); ul.innerHTML = "";
    data.forEach(m=>{ const li=document.createElement("li"); li.textContent = `${m.home_team} vs ${m.away_team} — odds: ${m.odds_home}/${m.odds_draw}/${m.odds_away}`; ul.appendChild(li); });
  }catch(e){
    el("matches").innerHTML = "<li>Error fetching matches (configure API_BASE)</li>";
  }
}

async function postETL(){
  try{
    const res = await fetch(window.API_BASE + "/etl", { method: "POST" });
    if(!res.ok) throw new Error("ETL failed");
    const j = await res.json();
    alert("ETL rows: "+j.rows);
    fetchMatches();
  }catch(e){
    alert("ETL error: "+e.message);
  }
}

async function generatePicks(){
  try{
    const threshold = parseFloat(thInput.value);
    const res = await fetch(window.API_BASE + "/picks?threshold=" + threshold);
    if(!res.ok) throw new Error("No picks");
    const data = await res.json();
    const container = el("picks");
    if(data.length === 0){ container.innerHTML = "<p>No hay picks para ese threshold.</p>"; return; }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Match</th><th>Prob</th><th>Value</th><th>Pick</th></tr>";
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    data.forEach(p=>{ const tr = document.createElement("tr"); tr.innerHTML = `<td>${p.home_team} - ${p.away_team}</td><td>${p.prob}</td><td>${p.value ?? "-"}</td><td>${p.pick ?? "-"}</td>`; tbody.appendChild(tr); });
    table.appendChild(tbody); container.innerHTML = ""; container.appendChild(table);
  }catch(e){ alert("Error generando picks: "+e.message); }
}

function exportCSV(){
  const tbl = document.querySelector("#picks table tbody");
  if(!tbl) { alert("No picks to export"); return; }
  const rows = Array.from(tbl.rows).map(r=>Array.from(r.cells).map(c=>c.textContent).join(","));
  const csv = ["match,prob,value,pick", ...rows].join("\n");
  const blob = new Blob([csv], {type: "text/csv"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "quiniela_picks.csv"; a.click();
}

document.getElementById("btn-etl").addEventListener("click", postETL);
document.getElementById("btn-gen").addEventListener("click", generatePicks);
document.getElementById("btn-export").addEventListener("click", exportCSV);

fetchMatches();