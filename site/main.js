
import { API_BASE } from './config.js';

const $ = id => document.getElementById(id);
const status = $('status');
const matchesList = $('matches-list');
const picksList = $('picks-list');
const leagueSelect = $('league');
const refreshBtn = $('refresh');
const genBtn = $('gen');

function setStatus(t){ status.textContent = t; }
async function fetchJSON(path){
  const url = API_BASE.replace(/\/+$/,'') + path;
  setStatus('Probando endpoint: '+url);
  const res = await fetch(url);
  if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function loadLeagues(){
  try{
    // many backends may not have /leagues - fallback demo
    let data;
    try{ data = await fetchJSON('/leagues'); } catch(e){ data = { leagues: [{id:1,name:'Demo League'}] }; }
    leagueSelect.innerHTML = data.leagues.map(l=>`<option value="${l.id}">${l.name}</option>`).join('');
  }catch(err){
    console.error(err); setStatus('Error cargando ligas: '+err.message);
  }
}

async function loadMatches(){
  matchesList.innerHTML = '<li>Cargando partidos...</li>';
  try{
    const data = await fetchJSON('/matches');
    if(!data.matches || data.matches.length===0){ matchesList.innerHTML = '<li>Sin partidos</li>'; return; }
    matchesList.innerHTML = data.matches.map(m=>`<li><strong>${m.home} vs ${m.away}</strong> — ${m.kickoff||''}</li>`).join('');
    setStatus('Partidos cargados');
  }catch(err){
    console.error(err); setStatus('Error fetching matches: '+err.message); matchesList.innerHTML = '<li>Error fetching matches: '+err.message+'</li>';
  }
}

async function generatePicks(){
  picksList.textContent = 'Generando picks...';
  try{
    const res = await fetch(API_BASE.replace(/\/+$/,'') + '/generate-picks');
    if(!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    picksList.innerHTML = data.picks.map((p,i)=>`<div>#${i+1} — <strong>${p.team}</strong><div>${p.reason||''}</div><div style="float:right">${Math.round(p.score||0)}%</div></div>`).join('');
    setStatus('Picks generados');
  }catch(err){ console.error(err); setStatus('Error generando picks: '+err.message); picksList.textContent = 'Error generando picks: '+err.message; }
}

refreshBtn.addEventListener('click', loadMatches);
genBtn.addEventListener('click', generatePicks);

window.addEventListener('load', async ()=>{ await loadLeagues(); await loadMatches(); });
