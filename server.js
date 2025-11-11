// server.js - Quiniela backend (Football-Data.org integration)
// Requires: FOOTBALL_DATA_KEY in env
// Installs: npm i express node-fetch@2 cors
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const FOOTBALL_KEY = process.env.FOOTBALL_DATA_KEY || null;
const API_ROOT = 'https://api.football-data.org/v4';
// Simple in-memory cache
const CACHE = { leagues: null, competitions_ts: 0, fixtures: {}, teams: {}, standings: {} };
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function headers() {
  const h = { 'X-Auth-Token': FOOTBALL_KEY };
  return h;
}

async function fetchFootball(path) {
  if (!FOOTBALL_KEY) throw new Error('FOOTBALL_DATA_KEY not set');
  const url = API_ROOT + path;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) {
    const txt = await r.text();
    const e = new Error('Fetch failed ' + r.status + ' ' + txt);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

// GET /api/leagues -> list competitions (filtered common ones)
app.get('/api/leagues', async (req, res) => {
  try {
    // cache check
    if (CACHE.leagues && (Date.now() - CACHE.competitions_ts) < CACHE_TTL) {
      return res.json({ leagues: CACHE.leagues, cached: true });
    }
    const j = await fetchFootball('/competitions');
    // j.competitions array
    // keep only top-tier competitions by plan: filter by area or by known ids
    const keep = j.competitions.filter(c => ['PL','CL','PD','SA','BL1','PD','DED','FL1','FL2','PPL','MSL','CL','EL'].includes(c.code) || c.area && ['England','Spain','Italy','Germany','France','Mexico'].includes(c.area.name));
    const compact = keep.map(c => ({ id: c.id, code: c.code, name: c.name, area: c.area && c.area.name }));
    CACHE.leagues = compact;
    CACHE.competitions_ts = Date.now();
    return res.json({ leagues: compact, cached: false });
  } catch (err) {
    console.error('leagues err', err);
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/fixtures?competition={id}
app.get('/api/fixtures', async (req,res) => {
  const comp = req.query.competition || req.query.league;
  try {
    if (!comp) {
      // fallback: return a small list of upcoming matches across default competitions
      // try /matches endpoint (returns across competitions)
      const all = await fetchFootball('/matches?status=SCHEDULED&limit=50');
      return res.json({ fixtures: all.matches || [] });
    }
    // cache per comp
    if (CACHE.fixtures[comp] && (Date.now() - CACHE.fixtures[comp].ts) < CACHE_TTL) {
      return res.json({ fixtures: CACHE.fixtures[comp].data, cached: true });
    }
    const j = await fetchFootball(`/competitions/${comp}/matches?status=SCHEDULED`);
    const m = j.matches || [];
    CACHE.fixtures[comp] = { ts: Date.now(), data: m };
    return res.json({ fixtures: m, cached: false });
  } catch (err) {
    console.error('fixtures err', err);
    return res.status(err.status || 500).json({ error: String(err) });
  }
});

// GET /api/team/:id -> team info
app.get('/api/team/:id', async (req,res) => {
  const id = req.params.id;
  try {
    if (CACHE.teams[id]) return res.json({ team: CACHE.teams[id], cached: true });
    const j = await fetchFootball(`/teams/${id}`);
    CACHE.teams[id] = j;
    return res.json({ team: j });
  } catch (err) {
    console.error('team err', err);
    return res.status(err.status || 500).json({ error: String(err) });
  }
});

// GET /api/standings?competition={id} -> returns standings with goals for/against (used to compute strengths)
app.get('/api/standings', async (req,res) => {
  const comp = req.query.competition;
  try {
    if (!comp) return res.status(400).json({ error: 'missing competition' });
    if (CACHE.standings[comp] && (Date.now() - CACHE.standings[comp].ts) < CACHE_TTL) {
      return res.json({ standings: CACHE.standings[comp].data, cached: true });
    }
    const j = await fetchFootball(`/competitions/${comp}/standings`);
    // pick the table for the standings (type TOTAL)
    let table = [];
    if (j && j.standings) {
      const s = j.standings.find(x => x.type === 'TOTAL') || j.standings[0];
      table = s ? (s.table || []) : [];
    }
    CACHE.standings[comp] = { ts: Date.now(), data: table };
    return res.json({ standings: table });
  } catch (err) {
    console.error('standings err', err);
    return res.status(err.status || 500).json({ error: String(err) });
  }
});

// Helper: estimate attack/defense strength from standings table row
function estimateStrengthsFromTable(table) {
  // table items have: team {id,name}, playedGames, goalsFor, goalsAgainst
  // compute average goals for and against per team and derive multiplier strengths
  const N = table.length || 1;
  let totalGF = 0, totalGA = 0;
  table.forEach(r => { totalGF += (r.goalsFor || 0); totalGA += (r.goalsAgainst || 0); });
  const avgGF = totalGF / N;
  const avgGA = totalGA / N;
  const strengths = {};
  table.forEach(r => {
    const teamId = r.team && r.team.id;
    const atk = ((r.goalsFor || 0) / (r.playedGames || 1)) / (avgGF || 1);
    const def = ((r.goalsAgainst || 0) / (r.playedGames || 1)) / (avgGA || 1);
    strengths[teamId] = { attack: atk, defense: def, teamName: r.team && r.team.name };
  });
  return strengths;
}

// GET /api/match/:id -> fetch match detail (from /matches endpoint)
app.get('/api/match/:id', async (req,res) => {
  const id = Number(req.params.id);
  try {
    // football-data doesn't provide a direct /matches/{id} in all cases; use /matches?matchIds=
    const j = await fetchFootball(`/matches/${id}`);
    // Some responses return { match: ... }
    if (j && j.match) return res.json({ match: j.match });
    // fallback: search scheduled matches
    const all = await fetchFootball('/matches?limit=500');
    const match = (all.matches || []).find(m => Number(m.id) === id);
    if (!match) return res.status(404).json({ error: 'not found' });
    return res.json({ match });
  } catch (err) {
    console.error('match err', err);
    return res.status(err.status || 500).json({ error: String(err) });
  }
});

// GET /api/match/:id/probabilities -> compute probabilities using standings-based strengths + Poisson MC
app.get('/api/match/:id/probabilities', async (req,res) => {
  const id = Number(req.params.id);
  try {
    const jm = await fetchFootball(`/matches/${id}`);
    const match = jm && jm.match ? jm.match : null;
    if (!match) return res.status(404).json({ error: 'match not found' });
    const compId = match.competition && match.competition.id;
    // get standings for competition to estimate strengths
    const st = await fetchFootball(`/competitions/${compId}/standings`);
    let table = [];
    if (st && st.standings) {
      const s = st.standings.find(x => x.type === 'TOTAL') || st.standings[0];
      table = s ? (s.table || []) : [];
    }
    const strengths = estimateStrengthsFromTable(table);
    // find team ids
    const homeId = match.homeTeam && match.homeTeam.id;
    const awayId = match.awayTeam && match.awayTeam.id;
    const homeStr = strengths[homeId] || { attack:1, defense:1 };
    const awayStr = strengths[awayId] || { attack:1, defense:1 };
    // base league average goals per game (approx)
    const avgGoals = 1.4;
    const lambdaHome = avgGoals * homeStr.attack * (1/awayStr.defense) * 1.08; // home adv
    const lambdaAway = avgGoals * awayStr.attack * (1/homeStr.defense);
    // Monte Carlo
    function samplePoisson(lambda) {
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      while (p > L) {
        k++; p *= Math.random();
      }
      return k-1;
    }
    function simulate(lambdaA, lambdaB, sims=3000) {
      let a=0,b=0,d=0;
      const scoreCounts = {};
      for (let i=0;i<sims;i++) {
        const ga = samplePoisson(lambdaA);
        const gb = samplePoisson(lambdaB);
        if (ga>gb) a++; else if (gb>ga) b++; else d++;
        const key = `${ga}-${gb}`;
        scoreCounts[key] = (scoreCounts[key]||0)+1;
      }
      const top = Object.entries(scoreCounts).sort((x,y)=>y[1]-x[1]).slice(0,6).map(([s,c])=>({score:s,prob:c/sims}));
      return { pHome: a/sims, pDraw: d/sims, pAway: b/sims, topScores: top };
    }
    const sim = simulate(lambdaHome, lambdaAway, 3000);
    return res.json({
      model: { lambdaHome, lambdaAway, pHome: sim.pHome, pDraw: sim.pDraw, pAway: sim.pAway, topScores: sim.topScores },
      used: { homeTeam: match.homeTeam, awayTeam: match.awayTeam, competition: match.competition }
    });
  } catch (err) {
    console.error('prob err', err);
    return res.status(err.status || 500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Quiniela backend (football-data) listening on', PORT));
