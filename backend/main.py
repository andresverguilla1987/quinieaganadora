from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import os, pathlib

app = FastAPI(title="Quiniela-AI Render-ready")

# serve static files under /static
frontend_dist = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "dist"
static_dir = frontend_dist
if not static_dir.exists():
    raise RuntimeError("frontend dist not found at: " + str(static_dir))

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# env var that points to backend API (should be set in Render environments)
API_BASE = os.getenv("API_BASE", "http://localhost:8000")

@app.get("/health")
def health():
    return {"status": "ok", "api_base": API_BASE}

@app.post("/etl")
def etl():
    # Placeholder: in this simplified package, we proxy to internal demo ETL if available
    # but for now return rows=0
    return {"rows": 0}

@app.get("/matches")
def matches():
    # Return demo matches if demo CSV exists
    demo_csv = pathlib.Path(__file__).resolve().parent.parent / "backend_demo_data" / "demo_matches.csv"
    if demo_csv.exists():
        import csv, json
        rows = []
        with open(demo_csv, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append(r)
        return rows
    raise HTTPException(status_code=404, detail="No demo data")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    # Read the index.html and inject a small script that sets window.API_BASE at runtime from env var
    idx_path = frontend_dist / "index.html"
    html = idx_path.read_text(encoding='utf-8')
    inject = f"<script>window.API_BASE = '{API_BASE}';</script>"
    # insert inject before the first <script src=...> occurrence or before </head>
    if "<script src=" in html:
        html = html.replace("<script src=", inject + "<script src=", 1)
    else:
        html = html.replace("</head>", inject + "</head>", 1)
    return HTMLResponse(content=html)