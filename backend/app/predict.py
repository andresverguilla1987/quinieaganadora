import os
from joblib import load
import numpy as np
from dotenv import load_dotenv
from .db import load_matches
from .model_train import compute_rolling_features
load_dotenv()
MODEL_PATH = os.getenv("MODEL_PATH", "./app/model.pkl")
def model_predict_for_upcoming(threshold=0.70, min_value=0.03):
    df_raw = load_matches()
    if df_raw is None or df_raw.empty:
        return []
    feats = compute_rolling_features(df_raw, n_last=3)
    model = None
    if os.path.exists(MODEL_PATH):
        model = load(MODEL_PATH)
    picks = []
    for _, r in feats.iterrows():
        X = np.array([[r['pts_diff'], r['gf_diff'], r['ga_diff'], r['gd_diff'], r.get('implied_home',0.33), r.get('implied_draw',0.33), r.get('implied_away',0.33)]])
        if model is not None:
            probs = model.predict_proba(X)[0]
            p_away, p_draw, p_home = float(probs[0]), float(probs[1]), float(probs[2])
        else:
            ih, idraw, ia = r.get('implied_home',0.33), r.get('implied_draw',0.33), r.get('implied_away',0.33)
            s = ih + idraw + ia if (ih+idraw+ia)>0 else 1.0
            p_home, p_draw, p_away = ih/s, idraw/s, ia/s
        implied_home = r.get('implied_home', 0.33)
        value_home = p_home - implied_home
        candidate = None
        if p_home >= threshold and value_home >= min_value:
            candidate = ("HOME", p_home, value_home)
        if candidate:
            picks.append({
                "match_id": r.get("match_id"),
                "date": r.get("date"),
                "home_team": r.get("home_team"),
                "away_team": r.get("away_team"),
                "pick": candidate[0],
                "prob": round(candidate[1], 3),
                "value": round(candidate[2], 3),
                "implied_home": implied_home
            })
    picks = sorted(picks, key=lambda x: x["prob"], reverse=True)
    return picks