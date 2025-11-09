import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles.css";
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export default function App(){
  const [picks, setPicks] = useState([]);
  const [matches, setMatches] = useState([]);
  const [threshold, setThreshold] = useState(0.7);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ loadMatches(); }, []);
  function loadMatches(){
    axios.get(`${BASE}/matches`).then(r=>setMatches(r.data)).catch(()=>setMatches([]));
  }
  async function handleETL(){
    setLoading(true);
    await axios.post(`${BASE}/etl`);
    await loadMatches();
    setLoading(false);
    alert("ETL ejecutado");
  }
  async function handleTrain(){
    setLoading(true);
    await axios.post(`${BASE}/train`);
    setLoading(false);
    alert("Modelo entrenado");
  }
  async function handleGenerate(){
    setLoading(true);
    const res = await axios.get(`${BASE}/picks`, { params: { threshold }});
    setPicks(res.data);
    setLoading(false);
  }
  function exportCSV(){
    const rows = picks.map(p=>[
      p.match_id, p.home_team, p.away_team, p.prob, p.value, p.pick
    ]);
    const header = ["match_id","home","away","prob","value","pick"];
    const csv = [header, ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quiniela_picks.csv"; a.click();
  }
  return (
    <div className="container">
      <h1>Quiniela AI — MVP</h1>
      <div className="controls">
        <button onClick={handleETL} disabled={loading}>ETL (demo)</button>
        <button onClick={handleTrain} disabled={loading}>Entrenar modelo</button>
        <label>Threshold:
          <input type="range" min="0.5" max="0.95" step="0.01" value={threshold}
            onChange={e=>setThreshold(parseFloat(e.target.value))}/>
          {threshold}
        </label>
        <button onClick={handleGenerate} disabled={loading}>Generar Picks ≥ threshold</button>
        <button onClick={exportCSV} disabled={!picks.length}>Exportar CSV</button>
      </div>
      <section>
        <h2>Picks</h2>
        {picks.length===0 ? <p>No hay picks</p> :
          <table><thead><tr><th>Match</th><th>Prob</th><th>Value</th><th>Pick</th></tr></thead>
          <tbody>{picks.map(p=>(<tr key={p.match_id}><td>{p.home_team} - {p.away_team}</td><td>{p.prob}</td><td>{p.value}</td><td>{p.pick}</td></tr>))}</tbody></table>}
      </section>
      <section><h2>Matches</h2><ul>{matches.map(m=><li key={m.match_id}>{m.home_team} vs {m.away_team} — odds: {m.odds_home}/{m.odds_draw}/{m.odds_away}</li>)}</ul></section>
    </div>
  );
}