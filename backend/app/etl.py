import os, time, requests
import pandas as pd
from dotenv import load_dotenv
from .db import load_matches, save_matches
from dateutil import parser
load_dotenv()
RESULTS_KEY = os.getenv("RESULTS_API_KEY")
ODDS_KEY = os.getenv("ODDS_API_KEY")
FD_BASE = "https://api.football-data.org/v4"
ODDS_BASE = "https://api.the-odds-api.com/v4"
def odds_to_implied(odd):
    try:
        odd = float(odd)
        return 1.0/odd if odd>0 else None
    except:
        return None
def run_etl_fetch_demo():
    df = load_matches()
    # compute implied if odds present
    if "odds_home" in df.columns:
        df["implied_home"] = df["odds_home"].apply(odds_to_implied)
        df["implied_draw"] = df["odds_draw"].apply(odds_to_implied)
        df["implied_away"] = df["odds_away"].apply(odds_to_implied)
    else:
        df["implied_home"] = 0.33
        df["implied_draw"] = 0.33
        df["implied_away"] = 0.33
    save_matches(df)
    return df