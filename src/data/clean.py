from src.utils import *

def clean(df, config):
    c = config
    df = df.copy()
    log = {'rows_in': int(len(df))}
    for col in c['TEXT_COLS']:
        df[col] = df[col].map(lambda v: v.strip() if isinstance(v, str) else v).replace('', np.nan)
    for col in c['NUM_COLS']:
        if df[col].dtype == object:
            df[col] = df[col].astype(str).str.replace(r'[$,%\s]', '', regex=True)
        df[col] = pd.to_numeric(df[col], errors='coerce')
    for col in c['DATE_COLS']:
        df[col] = pd.to_datetime(df[col], errors='coerce')
    n0 = len(df)
    df = df.dropna(subset=[c['ID'], c['DATE']])
    log['dropped_missing_id_or_date'] = int(n0 - len(df))
    df = df.sort_values([c['DATE'], c['ID']])
    n0 = len(df)
    df = df.drop_duplicates(subset=[c['ID']], keep='last')
    log['duplicate_shipments_removed'] = int(n0 - len(df))
    print('Duplicate shipments removed:', log['duplicate_shipments_removed'])
    for col in c['ZERO_FILL_COLS']:
        df[col] = df[col].fillna(0)
    df[c['REV']] = df[c['REV']].fillna(df[c['REV_PARTS']].sum(axis=1))
    df[c['COST']] = df[c['COST']].fillna(df[c['COST_PARTS']].sum(axis=1))
    bad = (df[c['REV']] <= 0) | df[c['DIST']].isna() | (df[c['DIST']] <= 0)
    log['dropped_invalid_revenue_or_distance'] = int(bad.sum())
    print('Rows dropped (revenue<=0 or distance<=0, cannot compute per-km economics):', int(bad.sum()))
    df = df[~bad].copy()
    # delivery performance
    delay_fill = (df[c['ACT_DAYS']] - df[c['PLAN_DAYS']]).clip(lower=0)
    df[c['DELAY_DAYS']] = df[c['DELAY_DAYS']].fillna(delay_fill).fillna(0)
    ot = df[c['ON_TIME']].astype(str).str.strip().str.lower()
    late = np.where(ot.isin(['no', 'n', 'false', '0', 'late']), 1,
                    np.where(ot.isin(['yes', 'y', 'true', '1', 'on time', 'ontime']), 0, (df[c['DELAY_DAYS']] > 0).astype(int)))
    df['late_flag'] = np.asarray(late).astype(int)
    log['on_time_vs_delay_days_mismatch'] = int(((df['late_flag'] == 1) != (df[c['DELAY_DAYS']] > 0)).sum())
    df[c['ON_TIME']] = np.where(df['late_flag'] == 1, 'No', 'Yes')
    df['late_label'] = np.where(df['late_flag'] == 1, 'Late', 'On Time')
    fill_reason = pd.Series(np.where(df['late_flag'] == 1, 'Unspecified', 'No Delay'), index=df.index)
    df[c['DELAY_REASON']] = df[c['DELAY_REASON']].where(df[c['DELAY_REASON']].notna(), fill_reason)
    # cash collection
    st = df[c['PAY_STATUS']].astype(str).str.lower()
    paid = st.str.contains('paid') & ~st.str.contains('unpaid') & ~st.str.contains('partial')
    ar_fill = pd.Series(np.where(paid, 0.0, df[c['REV']]), index=df.index)
    log['outstanding_ar_missing_filled'] = int(df[c['AR']].isna().sum())
    df[c['AR']] = df[c['AR']].where(df[c['AR']].notna(), ar_fill)
    df['open_ar_flag'] = (df[c['AR']] > 0).astype(int)
    df['invoice_due_date'] = df[c['INV_DATE']] + pd.to_timedelta(df[c['TERMS']].fillna(0), unit='D')
    # IQR capping on operational columns only (3 x IQR fence = extreme data-entry errors, not real heavy loads)
    cap_log = {}
    for col in c['CAP_COLS']:
        s = df[col]
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        if not (iqr > 0):
            continue
        lo, hi = max(q1 - 3 * iqr, 0), q3 + 3 * iqr
        n_out = int(((s < lo) | (s > hi)).sum())
        df[col] = s.clip(lo, hi)
        cap_log[col] = n_out
        print('IQR cap', col, '| outliers before:', n_out, '| after:', int(((df[col] < lo) | (df[col] > hi)).sum()))
    log['iqr_capped_values'] = cap_log
    df[c['LOAD']] = df[c['LOAD']].clip(0, 100)
    # financial truth: leakage (penalties + claims) is deducted from direct-cost profit
    df['penalty_claims'] = df[c['PENALTY']] + df[c['CLAIMS']]
    df['net_profit'] = df[c['REV']] - df[c['COST']] - df['penalty_claims']
    df['net_margin_pct'] = safe_div(df['net_profit'], df[c['REV']]) * 100
    df['ship_month'] = df[c['DATE']].dt.to_period('M').astype(str)
    df = df.sort_values([c['DATE'], c['ID']]).reset_index(drop=True)
    log['rows_out'] = int(len(df))
    save_df(df, c['CLEAN_CSV'])
    save_json(log, c['PROC_DIR'] + 'cleaning_report.json')
    print('Clean rows:', len(df), '| saved ->', c['CLEAN_CSV'])
    return df
