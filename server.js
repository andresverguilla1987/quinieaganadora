// server.js - Quiniela PRO minimal backend (placeholder data + external API hooks)
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(express.json());
// Allow all origins for convenience - in production tighten this.
app.use(cors());

// Simple in-memory store for demo (matches, leagues, predictions)
let LEAGUES = [
  { id: 'liga_mx', name: 'Liga MX' },
  { id: 'epl', name: 'Premier League' },
  { id: 'laliga', name: 'LaLiga' }
];

// example matches (id, league, teams, date, optional ratings)
let MATCHES = [
  { id: 1, league: 'liga_mx', team_a: 'América', team_b: 'Chivas', match_date: new Date(Date.now()+3600*1000).toISOString(), team_a_rating:1500, team_b_rating:1480, home: 'A' },
  { id: 2, league: 'epl', team_a: 'Manchester City', team_b: 'Arsenal', match_date: new Date(Date.now()+7200*1000).toISOString(), team_a_rating:1750, team_b_rating:1700, home: 'A' },
  { id: 3, league: 'laliga', team_a: 'Real Madrid', team_b: 'Barcelona', match_date: new Date(Date.now()+10800*1000).toISOString(), team_a_rating:1760, team_b_rating:1755, home: 'A' }
];

// Simple predictions store
let PREDICTIONS = []; // {user, match_id, prediction, points}

// Helpers: convert odds to implied probs (expects decimal odds {home, draw, away})
function oddsToImplied(odds) {
  if(!odds || !odds.home) return null;
  const inv = { home: 1/odds.home, draw: 1/odds.draw, away: 1/odds.away };
  const s = inv.home + inv.draw + inv.away;
  return { home: inv.home/s, draw: inv.draw/s, away: inv.away/s };
}

// Simple Elo -> Poisson model utilities
function eloExpected(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}
function expectedGoalsFromElo(rA, rB, homeAdv = 0) {
  const expA = eloExpected(rA + homeAdv, rB);
  const base = 1.2;
  const scale = 1.8;
  const lambdaA = Math.max(0.1, base + (expA - 0.5) * scale + (homeAdv>0?0.25:0));
  const lambdaB = Math.max(0.05, base - (expA - 0.5) * scale);
  return { lambdaA, lambdaB };
}
function samplePoisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  while (p > L) {
    k++;
    p *= Math.random();
  }
  return k - 1;
}
function simulateMatch(lambdaA, lambdaB, sims = 2000) {
  let winsA = 0, winsB = 0, draws = 0;
  const scoreCounts = {};
  for (let i=0;i<sims;i++) {
    const gA = samplePoisson(lambdaA);
    const gB = samplePoisson(lambdaB);
    if (gA > gB) winsA++;
    else if (gB > gA) winsB++;
    else draws++;
    const key = `${gA}-${gB}`;
    scoreCounts[key] = (scoreCounts[key] || 0) + 1;
  }
  return {
    pA: winsA / sims,
    pDraw: draws / sims,
    pB: winsB / sims,
    topScores: Object.entries(scoreCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([score,count])=>({score,prob:count/sims}))
  };
}

// Routes
app.get('/api/leagues', (req,res) => {
  return res.json({ leagues: LEAGUES });
});

app.get('/api/fixtures', (req,res) => {
  const league = req.query.league;
  const date = req.query.date; // optional
  let items = MATCHES;
  if (league) items = items.filter(m=>m.league===league);
  if (date) items = items.filter(m => m.match_date.startsWith(date));
  return res.json({ fixtures: items });
});

app.get('/api/match/:id', (req,res) => {
  const id = Number(req.params.id);
  const match = MATCHES.find(m=>m.id===id);
  if(!match) return res.status(404).json({ error: 'not found' });
  // placeholder details: events empty, lineups empty
  return res.json({ match, events: [], lineups: {} });
});

// Probabilities endpoint: returns odds-based and model-based probabilities
app.get('/api/match/:id/probabilities', async (req,res) => {
  const id = Number(req.params.id);
  const match = MATCHES.find(m=>m.id===id);
  if(!match) return res.status(404).json({ error: 'not found' });

  // Try to fetch odds from a third-party if API key provided (placeholder)
  let odds = null;
  const ODDS_API_KEY = process.env.ODDS_API_KEY || null;
  if (ODDS_API_KEY) {
    try {
      // Example: The Odds API (this is illustrative; adjust per provider)
      // const oddsResp = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`);
      // const oddsJson = await oddsResp.json();
      // parse provider response to find match odds...
    } catch (err) {
      console.warn('odds fetch failed', err);
    }
  }

  // If no odds, we return null for odds-based (frontend can handle)
  const implied = odds ? oddsToImplied(odds) : null;

  // Model-based using Elo->Poisson Monte Carlo (fast, low sims)
  const rA = match.team_a_rating || 1500;
  const rB = match.team_b_rating || 1500;
  const homeAdv = match.home === 'A' ? 30 : 0;
  const lambdas = expectedGoalsFromElo(rA, rB, homeAdv);
  const sim = simulateMatch(lambdas.lambdaA, lambdas.lambdaB, 2000);

  return res.json({
    odds: odds, // raw odds if any (null otherwise)
    impliedProbabilities: implied, // null if no odds
    model: {
      lambdaA: lambdas.lambdaA,
      lambdaB: lambdas.lambdaB,
      pA: sim.pA,
      pDraw: sim.pDraw,
      pB: sim.pB,
      topScores: sim.topScores
    }
  });
});

// Predictions endpoints (minimal)
app.post('/api/predictions', (req,res) => {
  const { user, match_id, prediction } = req.body || {};
  if(!match_id || !prediction) return res.status(400).json({ error: 'missing' });
  PREDICTIONS.push({ user: user || 'anon', match_id, prediction, points: 0 });
  return res.json({ ok: true });
});

app.get('/api/ranking', (req,res) => {
  // naive ranking: count predictions per user (placeholder)
  const scores = {};
  PREDICTIONS.forEach(p => { scores[p.user] = (scores[p.user]||0) + (p.points||0); });
  const arr = Object.entries(scores).map(([u,pts])=>({ user: u, points: pts })).sort((a,b)=>b.points-a.points);
  return res.json(arr);
});

// Simple admin endpoint to create match (for the demo)
app.post('/api/matches', (req,res) => {
  const body = req.body || {};
  const id = MATCHES.length ? Math.max(...MATCHES.map(m=>m.id))+1 : 1;
  const m = {
    id,
    league: body.league || 'liga_mx',
    team_a: body.team_a || 'Team A',
    team_b: body.team_b || 'Team B',
    match_date: body.match_date || new Date().toISOString(),
    team_a_rating: body.team_a_rating || 1500,
    team_b_rating: body.team_b_rating || 1500,
    home: body.home || 'A'
  };
  MATCHES.push(m);
  return res.json({ ok: true, match: m });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Quiniela backend listening on', PORT));
