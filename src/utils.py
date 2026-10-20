import os, sys, json, math, glob, warnings, datetime as dt
import numpy as np
import pandas as pd
import joblib
import matplotlib
if 'ipykernel' not in sys.modules:
    matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')
plt.rcParams.update({'figure.dpi': 150, 'axes.spines.top': False, 'axes.spines.right': False})


def clean_text(s):
    return s.replace(chr(0xfffd), '-') if isinstance(s, str) else s


def _jsonable(o):
    if o is pd.NaT:
        return None
    if isinstance(o, dict):
        return {str(k): _jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple, set)):
        return [_jsonable(v) for v in o]
    if isinstance(o, (np.bool_, bool)):
        return bool(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        f = float(o)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, 4)
    if isinstance(o, (pd.Timestamp, dt.datetime)):
        return str(o)[:19]
    if isinstance(o, dt.date):
        return o.isoformat()
    if isinstance(o, str):
        return clean_text(o)
    return o


def save_json(obj, path):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(_jsonable(obj), f, indent=2, ensure_ascii=False)


def load_json(path, default=None):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


def write_text(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text.replace(chr(0xfffd), '-'))


def safe_div(a, b):
    a_ = np.asarray(a, dtype=float)
    b_ = np.asarray(b, dtype=float)
    out = np.where(b_ == 0, 0.0, a_ / np.where(b_ == 0, 1.0, b_))
    return pd.Series(out, index=a.index) if isinstance(a, pd.Series) else out


def save_df(df, path):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    df.to_csv(path, index=False, encoding='utf-8')


def load_df(path, config):
    df = pd.read_csv(path, low_memory=False)
    for col in config['DATE_COLS'] + ['invoice_due_date']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    return df


def ensure_dirs(config):
    base = config['OUT_DIR']
    dirs = [config['PROC_DIR'], config['PROC_DIR'] + 'simulations/', config['REPORTS_DIR'], config['MODELS_DIR'],
            config['CFG_DIR'], config['RAW_DIR'], 'config', 'notebooks', base + 'understand/charts/',
            base + 'decide/simulations/', base + 'monitor/', base + 'meta/']
    for d in dirs:
        os.makedirs(d, exist_ok=True)


def write_config_files(config):
    save_json(config, 'config/config.json')
    save_json(config['TERMINOLOGY'], config['CFG_DIR'] + 'terminology.json')


def window(df, config, days):
    end = df[config['DATE']].max()
    return df[df[config['DATE']] > end - pd.Timedelta(days=days)]


def lane_table(df, config):
    c = config
    t = df.groupby(c['LANE']).agg(
        shipments=(c['ID'], 'count'), revenue=(c['REV'], 'sum'), net_profit=('net_profit', 'sum'),
        late_rate=('late_flag', 'mean'), avg_load=(c['LOAD'], 'mean'), avg_empty_ratio=('empty_return_ratio', 'mean'),
        avg_distance=(c['DIST'], 'mean'), penalties_claims=('penalty_claims', 'sum')).reset_index()
    t['net_margin_pct'] = safe_div(t['net_profit'], t['revenue']) * 100
    t['late_rate_pct'] = t['late_rate'] * 100
    return t
