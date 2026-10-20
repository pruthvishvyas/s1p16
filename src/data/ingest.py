from src.utils import *

def find_raw_csv(config):
    if os.path.exists(config['RAW_CSV']):
        return config['RAW_CSV']
    cands = []
    for pat in ['*.csv', 'data/*.csv', 'data/raw/*.csv', 'data/raw/*/*.csv']:
        cands += glob.glob(pat)
    for f in cands:
        parts = f.replace('\\', '/').split('/')
        if any(p in ('processed', 'output', 'reports', 'models') for p in parts):
            continue
        try:
            head = pd.read_csv(f, nrows=2)
        except Exception:
            continue
        if config['ID'] in head.columns and config['REV'] in head.columns:
            return f
    raise FileNotFoundError('Raw CSV not found. Place it at ' + config['RAW_CSV'])


def load_and_validate(config):
    c = config
    path = find_raw_csv(c)
    df = pd.read_csv(path, low_memory=False)
    df.columns = [str(x).strip() for x in df.columns]
    missing = [v for v in c['REQUIRED_COLS'] if v not in df.columns]
    if missing:
        raise ValueError('Schema check failed. Missing columns: ' + ', '.join(missing))
    num = lambda col: pd.to_numeric(df[col], errors='coerce')
    dates = pd.to_datetime(df[c['DATE']], errors='coerce')
    rev, tol = num(c['REV']), 1.0
    pen, clm = num(c['PENALTY']).fillna(0), num(c['CLAIMS']).fillna(0)
    cost_sum = sum(num(x).fillna(0) for x in c['COST_PARTS'])
    rev_sum = sum(num(x).fillna(0) for x in c['REV_PARTS'])
    gp = num(c['GP'])
    m1 = float(((gp - (rev - num(c['COST']))).abs() <= tol).mean())
    m2 = float(((gp - (rev - num(c['COST']) - pen - clm)).abs() <= tol).mean())
    late = df[c['ON_TIME']].astype(str).str.strip().str.lower().isin(['no', 'n', 'false', '0', 'late'])
    n, n_late = len(df), int(late.sum())
    nulls = df.isnull().sum()
    rep = {
        'source_file': path, 'rows': int(n), 'cols': int(df.shape[1]), 'missing_columns': missing, 'schema_ok': True,
        'date_min': str(dates.min())[:10], 'date_max': str(dates.max())[:10],
        'history_days': int((dates.max() - dates.min()).days + 1) if dates.notna().any() else 0,
        'null_counts': {k: int(v) for k, v in nulls[nulls > 0].items()},
        'dtypes': {k: str(v) for k, v in df.dtypes.items()},
        'duplicate_shipment_ids': int(df[c['ID']].duplicated().sum()),
        'non_positive_revenue_rows': int((rev <= 0).sum()),
        'non_positive_distance_rows': int((num(c['DIST']) <= 0).sum()),
        'revenue_components_reconcile_pct': round(float(((rev_sum - rev).abs() <= tol).mean() * 100), 2),
        'cost_components_reconcile_pct': round(float(((cost_sum - num(c['COST'])).abs() <= tol).mean() * 100), 2),
        'gross_profit_basis': 'revenue_minus_cost_penalties_claims' if m2 > m1 else 'revenue_minus_cost',
        'late_without_reason': int((late & df[c['DELAY_REASON']].isnull()).sum()),
        'on_time_value_counts': {str(k): int(v) for k, v in df[c['ON_TIME']].value_counts(dropna=False).items()},
        'payment_status_counts': {str(k): int(v) for k, v in df[c['PAY_STATUS']].value_counts(dropna=False).items()},
        'paid_without_paid_date': int((df[c['PAY_STATUS']].astype(str).str.lower().eq('paid') & df[c['PAID_DATE']].isnull()).sum()),
        'late_rate_pct': round(100 * n_late / max(n, 1), 2),
    }
    rep['readiness'] = {
        'classifier': bool(n >= c['MIN_ROWS_CLASSIFIER'] and min(n_late, n - n_late) >= c['MIN_MINORITY_CLASS']),
        'anomaly': bool(n >= c['MIN_ROWS_ANOMALY']),
        'forecast': bool(rep['history_days'] >= c['MIN_FORECAST_DAYS']),
        'lane_segmentation': bool(df[c['LANE']].nunique() >= 4),
    }
    save_json(rep, c['PROC_DIR'] + 'validation_report.json')
    print('Source:', path, '| rows:', n, '| cols:', df.shape[1], '| period:', rep['date_min'], '->', rep['date_max'])
    print('Columns with nulls:', rep['null_counts'] if rep['null_counts'] else 'none')
    print('Duplicate shipment IDs:', rep['duplicate_shipment_ids'], '| non-positive revenue rows:', rep['non_positive_revenue_rows'])
    print('Revenue reconciles %:', rep['revenue_components_reconcile_pct'], '| Cost reconciles %:', rep['cost_components_reconcile_pct'])
    print('Gross_Profit basis detected:', rep['gross_profit_basis'], '| Late rate %:', rep['late_rate_pct'])
    for col in [c['SEGMENT'], c['MODE'], c['CARRIER'], c['RATE'], c['ON_TIME'], c['PAY_STATUS']]:
        print('\n' + col); print(df[col].value_counts(dropna=False).head(8).to_string())
    print('\nReadiness:', rep['readiness'])
    return df
