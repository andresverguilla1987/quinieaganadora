import pandas as pd
from pathlib import Path
import os
DATA_CSV = os.getenv("DATA_CSV", "./app/demo_data/demo_matches.csv")
MODEL_PATH = os.getenv("MODEL_PATH", "./app/model.pkl")
def load_matches():
    path = Path(DATA_CSV)
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path, parse_dates=["date"])
def save_matches(df):
    Path(DATA_CSV).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_CSV, index=False)