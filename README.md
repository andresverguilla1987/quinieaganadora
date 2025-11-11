Quiniela Backend - Football-Data.org integration
------------------------------------------------
This backend connects to the football-data.org API (v4) using the X-Auth-Token header.
It exposes endpoints:
  GET /api/leagues                -> competitions list (cached)
  GET /api/fixtures?competition=ID -> scheduled matches for competition
  GET /api/match/:id              -> match details
  GET /api/match/:id/probabilities -> model probabilities using standings strengths

Setup:
1) Create a Node environment and install dependencies:
     npm install express node-fetch@2 cors
2) Set environment variable FOOTBALL_DATA_KEY to your API key (from football-data.org)
3) Run: node server.js (or deploy to Render, set PORT and env var there)

Notes:
- The code uses simple heuristics: derives attack/defense strengths from standings goalsFor/goalsAgainst per game.
- The /probabilities endpoint performs a Monte Carlo Poisson simulation (server-side).
- football-data.org has rate limits; cache is enabled (5 min TTL) to reduce calls.
- If you want odds-based probabilities, provide an ODDS_API_KEY and I can integrate The Odds API too.
