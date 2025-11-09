from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os, pathlib

app = FastAPI(title="Quiniela-AI (rooted)")

# static frontend (dist) placed in ./frontend/dist
frontend_dist = pathlib.Path(__file__).resolve().parent / "frontend" / "dist"
if not frontend_dist.exists():
    print("Warning: frontend dist not found at", str(frontend_dist))

app.mount("/static", StaticFiles(directory=str(frontend_dist)), name="static")

API_BASE = os.getenv("API_BASE", "http://localhost:8000")

@app.get("/health")
def health():
    return {"status":"ok", "api_base": API_BASE}

@app.get("/matches")
def matches():
    demo = frontend_dist.parent.parent / "backend_demo_data" / "demo_matches.csv"
    if demo.exists():
        import csv
        rows=[]
        with open(demo, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append(r)
        return rows
    raise HTTPException(status_code=404, detail="No demo data")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    idx = frontend_dist / "index.html"
    if not idx.exists():
        return HTMLResponse("<h1>No frontend built</h1>", status_code=200)
    html = idx.read_text(encoding='utf-8')
    inject = f"<script>window.API_BASE = '{API_BASE}';</script>"
    if "<script src=" in html:
        html = html.replace("<script src=", inject + "<script src=", 1)
    else:
        html = html.replace("</head>", inject + "</head>", 1)
    return HTMLResponse(content=html)