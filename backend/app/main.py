from fastapi import FastAPI, HTTPException
from .etl import run_etl_fetch_demo
from .model_train import train_and_save
from .predict import model_predict_for_upcoming
from .db import load_matches
app = FastAPI(title="Quiniela-AI MVP")
@app.get("/health")
def health():
    return {"status":"ok"}
@app.post("/etl")
def run_etl():
    try:
        df = run_etl_fetch_demo()
        return {"rows": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/train")
def train():
    try:
        path = train_and_save()
        return {"model_path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/picks")
def picks(threshold: float = 0.70):
    return model_predict_for_upcoming(threshold=threshold)
@app.get("/matches")
def matches():
    df = load_matches()
    return df.to_dict(orient="records")