from src.utils import *

def run_business_logic(df, config):
    c = config
    T = c['THRESHOLDS']
    df = df.copy()
    as_of = df[c['DATE']].max()
    f = pd.DataFrame(index=df.index)
    f['LOSS_MAKING'] = df['net_profit'] < 0
    f['BELOW_MARGIN_FLOOR'] = (df['net_profit'] >= 0) & (df['net_margin_pct'] < T['margin_floor_pct'])
    f['LOW_LOAD'] = df[c['LOAD']] < T['load_factor_min']
    f['HIGH_EMPTY_RETURN'] = df['empty_return_ratio'] > T['empty_ratio_max']
    f['LATE_PENALTY'] = df[c['PENALTY']] > 0
    f['CLAIM'] = df[c['CLAIMS']] > 0
    due = df['invoice_due_date'] + pd.Timedelta(days=T['overdue_grace_days'])
    f['OVERDUE_AR'] = ((df[c['AR']] > 0) & (due < as_of)).fillna(False)
    f['ANOMALY'] = (df['is_anomaly'] == 1) if 'is_anomaly' in df.columns else False
    ACTIONS = {
        'LOSS_MAKING': 'Reprice or decline this lane/shipper combination',
        'BELOW_MARGIN_FLOOR': 'Raise rate or cut cost to reach the margin floor',
        'LOW_LOAD': 'Consolidate with other freight before dispatch',
        'HIGH_EMPTY_RETURN': 'Find a backhaul load for the return leg',
        'LATE_PENALTY': 'Root-cause the delay and agree corrective action with carrier',
        'CLAIM': 'Review packing/handling and insurance recovery',
        'OVERDUE_AR': 'Chase invoice today and escalate to account owner',
        'ANOMALY': 'Audit rate/cost entry for errors',
    }
    WEIGHTS = {'LOSS_MAKING': 3, 'BELOW_MARGIN_FLOOR': 1, 'LOW_LOAD': 1, 'HIGH_EMPTY_RETURN': 1, 'LATE_PENALTY': 2, 'CLAIM': 2, 'OVERDUE_AR': 2, 'ANOMALY': 1}
    alerts = pd.Series('', index=df.index)
    recs = pd.Series('', index=df.index)
    score = pd.Series(0, index=df.index)
    for k in ACTIONS:
        m = f[k].astype(bool)
        alerts = alerts + np.where(m, k + '|', '')
        recs = recs + np.where(m, ACTIONS[k] + '; ', '')
        score = score + m.astype(int) * WEIGHTS[k]
    df['alerts'] = alerts.str.rstrip('|').replace('', 'NORMAL')
    df['recommendations'] = recs.str.rstrip('; ')
    df['priority_score'] = score
    df['priority'] = np.select([score >= 5, score >= 3, score >= 1], ['P1_URGENT', 'P2_HIGH', 'P3_MEDIUM'], default='P4_ROUTINE')
    print(df.groupby('priority').agg(shipments=(c['ID'], 'count'), late_rate=('late_flag', 'mean'), avg_net_margin=('net_margin_pct', 'mean')).round(3))
    # ---- lane scorecard ----
    lane = lane_table(df, c)
    fl = T['margin_floor_pct'] / 100.0
    need = (fl * lane['revenue'] - lane['net_profit']) / (1 - fl)
    lane['price_increase_to_floor_pct'] = np.where(lane['net_margin_pct'] < T['margin_floor_pct'], safe_div(need, lane['revenue']) * 100, 0.0).round(2)
    late_cap = 2 * (100 - T['on_time_target_pct'])
    lane['action'] = np.select(
        [lane['shipments'] < c['MIN_LANE_SHIPMENTS'], lane['net_margin_pct'] < 0, lane['net_margin_pct'] < T['margin_floor_pct'], lane['late_rate_pct'] > late_cap],
        ['Insufficient data - monitor', 'Reprice or exit lane', 'Raise rate to margin floor', 'Fix service reliability on this lane'], default='Keep - healthy lane')
    lane = lane.sort_values('revenue', ascending=False)
    save_df(lane, c['PROC_DIR'] + 'lane_scorecard.csv')
    # ---- customer scorecard ----
    cu = df.groupby(c['CUSTOMER']).agg(
        shipments=(c['ID'], 'count'), revenue=(c['REV'], 'sum'), net_profit=('net_profit', 'sum'), late_rate=('late_flag', 'mean'),
        avg_terms_days=(c['TERMS'], 'mean'), avg_days_to_pay=(c['DTP'], 'mean'), open_ar=(c[ 'AR'], 'sum')).reset_index()
    cu['net_margin_pct'] = safe_div(cu['net_profit'], cu['revenue']) * 100
    cu['late_rate_pct'] = cu['late_rate'] * 100
    cu['revenue_share_pct'] = safe_div(cu['revenue'], pd.Series([cu['revenue'].sum()] * len(cu), index=cu.index)) * 100
    cu['days_over_terms'] = cu['avg_days_to_pay'] - cu['avg_terms_days']
    ov = df[f['OVERDUE_AR']].groupby(c['CUSTOMER'])[c['AR']].sum()
    cu['overdue_ar'] = cu[c['CUSTOMER']].map(ov).fillna(0.0)
    cu['action'] = np.select(
        [cu['shipments'] < c['MIN_CUSTOMER_SHIPMENTS'], (cu['overdue_ar'] > 0) & (cu['days_over_terms'] > T['overdue_grace_days']),
         cu['net_margin_pct'] < T['margin_floor_pct'], cu['late_rate_pct'] > 2 * (100 - T['on_time_target_pct'])],
        ['Insufficient data - monitor', 'Enforce payment terms / chase overdue invoices', 'Renegotiate rates', 'Review service levels and SLA'],
        default='Maintain relationship')
    cu = cu.sort_values('revenue', ascending=False)
    save_df(cu, c['PROC_DIR'] + 'customer_scorecard.csv')
    try:
        pc = df['priority'].value_counts().reindex(['P1_URGENT', 'P2_HIGH', 'P3_MEDIUM', 'P4_ROUTINE']).fillna(0)
        plt.figure(figsize=(7, 4))
        plt.bar(pc.index, pc.values, color=['#d62728', '#ff7f0e', '#bcbd22', '#2ca02c'])
        plt.title('[DECIDE] Shipments by action priority')
        plt.tight_layout(); plt.savefig(c['REPORTS_DIR'] + 'business_priority.png', dpi=150); plt.show(); plt.close('all')
    except Exception as e:
        print('Chart skipped:', e)
    keep = [c['ID'], c['DATE'], c['LANE'], c['CUSTOMER'], 'priority', 'priority_score', 'alerts', 'recommendations', 'net_profit', 'net_margin_pct']
    save_df(df[keep], c['PROC_DIR'] + 'business_logic_output.csv')
    save_df(df, c['ENRICHED_CSV'])
    print('Lanes needing action:', int((~lane['action'].isin(['Keep - healthy lane', 'Insufficient data - monitor'])).sum()), 'of', len(lane))
    return df
