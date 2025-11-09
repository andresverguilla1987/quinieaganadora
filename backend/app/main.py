from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import pathlib, os, csv

app = FastAPI(title="Quiniela-AI Backend Serve (backend/)")

# FRONTEND_DIST relative to backend/app -> backend/frontend/dist
FRONTEND_DIST = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIST)), name="static")
else:
    print("Warning: frontend dist not found at", FRONTEND_DIST)

API_BASE = os.getenv("API_BASE", "")

@app.get("/health")
def health():
    return {"status":"ok", "api_base": API_BASE}

@app.get("/matches")
def matches():
    demo = pathlib.Path(__file__).resolve().parent.parent / "backend_demo_data" / "demo_matches.csv"
    if demo.exists():
        rows = []
        with open(demo, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append(r)
        return rows
    raise HTTPException(status_code=404, detail="No demo data")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    idx = FRONTEND_DIST / "index.html"
    if not idx.exists():
        return HTMLResponse("<h1>No frontend built</h1>", status_code=200)
    html = idx.read_text(encoding='utf-8')
    # inject API_BASE if set
    if API_BASE:
        inject = f"<script>window.API_BASE = '{API_BASE}';</script>"
        if "<script src=" in html:
            html = html.replace("<script src=", inject + "<script src=", 1)
        else:
            html = html.replace("</head>", inject + "</head>", 1)
    return HTMLResponse(content=html)