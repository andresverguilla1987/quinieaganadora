import os
import pandas as pd
import numpy as np
from joblib import dump
from dotenv import load_dotenv
from .db import load_matches
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
load_dotenv()
MODEL_PATH = os.getenv("MODEL_PATH", "./app/model.pkl")
def compute_rolling_features(df, n_last=3):
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    team_history = {}
    features = []
    for idx, r in df.iterrows():
        home = r['home_team']; away = r['away_team']
        def last_stats(team):
            hist = team_history.get(team, [])
            if not hist:
                return {'pts_mean':0.0,'gf_mean':0.0,'ga_mean':0.0,'gd_mean':0.0,'matches':0}
            tail = hist[-n_last:]
            matches = len(tail)
            pts = np.mean([x['pts'] for x in tail]) if matches>0 else 0.0
            gf = np.mean([x['gf'] for x in tail]) if matches>0 else 0.0
            ga = np.mean([x['ga'] for x in tail]) if matches>0 else 0.0
            gd = np.mean([x['gd'] for x in tail]) if matches>0 else 0.0
            return {'pts_mean':pts,'gf_mean':gf,'ga_mean':ga,'gd_mean':gd,'matches':matches}
        hs = last_stats(home); as_ = last_stats(away)
        feat = {
            'match_id': r.get('match_id'),
            'date': r.get('date'),
            'home_team': home,
            'away_team': away,
            'pts_diff': hs['pts_mean'] - as_['pts_mean'],
            'gf_diff': hs['gf_mean'] - as_['gf_mean'],
            'ga_diff': hs['ga_mean'] - as_['ga_mean'],
            'gd_diff': hs['gd_mean'] - as_['gd_mean'],
            'implied_home': r.get('implied_home',0.33),
            'implied_draw': r.get('implied_draw',0.33),
            'implied_away': r.get('implied_away',0.33),
            'home_goals': r.get('home_goals'),
            'away_goals': r.get('away_goals')
        }
        features.append(feat)
        if pd.notna(r.get('home_goals')) and pd.notna(r.get('away_goals')):
            hg = r.get('home_goals'); ag = r.get('away_goals')
            if hg > ag:
                home_pts, away_pts = 3,0
            elif hg == ag:
                home_pts, away_pts = 1,1
            else:
                home_pts, away_pts = 0,3
            team_history.setdefault(home, []).append({'pts':home_pts, 'gf':hg, 'ga':ag, 'gd': hg-ag})
            team_history.setdefault(away, []).append({'pts':away_pts, 'gf':ag, 'ga':hg, 'gd': ag-hg})
    return pd.DataFrame(features)
def label_from_result(df):
    y = []
    for _, r in df.iterrows():
        hg = r.get('home_goals'); ag = r.get('away_goals')
        if pd.isna(hg) or pd.isna(ag):
            y.append(None)
        else:
            if hg > ag: y.append(2)
            elif hg == ag: y.append(1)
            else: y.append(0)
    df['y'] = y
    return df
def train_and_save():
    df_raw = load_matches()
    if df_raw is None or df_raw.empty:
        raise ValueError("No hay datos. Ejecuta ETL primero.")
    feats = compute_rolling_features(df_raw, n_last=3)
    feats = label_from_result(feats)
    train_df = feats[feats['y'].notnull()].reset_index(drop=True)
    X = train_df[['pts_diff','gf_diff','ga_diff','gd_diff','implied_home','implied_draw','implied_away']].fillna(0)
    y = train_df['y'].astype(int)
    if len(train_df) < 5:
        print("Dataset pequeño.")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    model = XGBClassifier(objective='multi:softprob', num_class=3, use_label_encoder=False, eval_metric='mlogloss', n_estimators=50, learning_rate=0.1)
    model.fit(X_train, y_train)
    calib = CalibratedClassifierCV(model, method='isotonic', cv='prefit')
    calib.fit(X_test, y_test)
    dump(calib, MODEL_PATH)
    return MODEL_PATH