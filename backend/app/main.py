from fastapi import FastAPI
app = FastAPI(title="Quiniela-AI Fix Pack")

@app.get("/health")
def health():
    return {"status":"ok"}