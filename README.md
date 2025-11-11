Quiniela Backend (demo)
-----------------------
Minimal Node/Express backend with endpoints:
- GET  /api/leagues
- GET  /api/fixtures?league=...&date=YYYY-MM-DD
- GET  /api/match/:id
- GET  /api/match/:id/probabilities
- POST /api/predictions
- GET  /api/ranking
- POST /api/matches  (admin create)

How to run (Render or locally):
1) Create a Node environment (Node 16+ recommended).
2) Install: npm install
3) Start: npm start
4) Optional: set ODDS_API_KEY env var to fetch bookmaker odds (code has placeholder).

Notes:
- This is a demo backend with in-memory storage. For production use a real database (Postgres).
- The probabilities endpoint uses a simple Elo->Poisson Monte-Carlo model.
