from src.utils import *

def run_goals(df, config):
    c = config
    T = c['THRESHOLDS']
    path = c['CFG_DIR'] + 'goals.json'
    goals = {
        'revenue_target': {'value': None, 'unit': 'monthly', 'client_sets': True, 'description': 'Monthly freight revenue target'},
        'margin_floor_pct': {'value': T['margin_floor_pct'], 'unit': 'percent', 'client_sets': True, 'description': 'Minimum net margin per lane/shipper'},
        'on_time_target_pct': {'value': T['on_time_target_pct'], 'unit': 'percent', 'client_sets': True, 'description': 'On-time delivery target'},
        'alert_drop_pct': {'value': T['alert_drop_pct'], 'unit': 'percent', 'description': 'Alert if weekly revenue drops by this % vs prior 4-week average'},
        'forecast_horizon': {'value': c['FORECAST_HORIZON'], 'unit': 'days'},
        'load_factor_min': {'value': T['load_factor_min'], 'unit': 'percent', 'client_sets': True, 'description': 'Minimum acceptable load factor'},
        'empty_ratio_max': {'value': T['empty_ratio_max'], 'unit': 'ratio', 'client_sets': True, 'description': 'Maximum empty km / loaded km'},
        'overdue_grace_days': {'value': T['overdue_grace_days'], 'unit': 'days', 'client_sets': True, 'description': 'Days after terms before an invoice is overdue'},
    }
    saved = load_json(path, {}) or {}
    for k, v in saved.items():
        if k in goals and isinstance(v, dict) and 'value' in v:
            goals[k]['value'] = v['value']   # client-set values survive re-runs
    save_json(goals, path)
    G = {k: v['value'] for k, v in goals.items()}
    dcol = c['DATE']
    as_of = df[dcol].max()
    w30, w7 = window(df, c, 30), window(df, c, 7)
    prior = df[(df[dcol] > as_of - pd.Timedelta(days=35)) & (df[dcol] <= as_of - pd.Timedelta(days=7))]
    hist_days = (as_of - df[dcol].min()).days + 1
    rev30 = float(w30[c['REV']].sum())
    otd30 = float(100 * (1 - w30['late_flag'].mean())) if len(w30) else None
    mar30 = float(100 * w30['net_profit'].sum() / w30[c['REV']].sum()) if rev30 > 0 else None
    emp30 = float(w30[c['EMPTY_KM']].sum() / w30[c['DIST']].sum()) if len(w30) and w30[c['DIST']].sum() > 0 else None
    load30 = float(w30[c['LOAD']].mean()) if len(w30) else None
    paid90 = df[(df[c['INV_DATE']] > as_of - pd.Timedelta(days=90)) & df['pay_days_over_terms'].notna()]
    over_terms = float(paid90['pay_days_over_terms'].mean()) if len(paid90) else None
    fc = None
    fpath = c['PROC_DIR'] + 'forecast_output.csv'
    if os.path.exists(fpath):
        fdf = pd.read_csv(fpath)
        fc = float(fdf['forecast_revenue'].head(int(G['forecast_horizon'])).sum())

    def st(actual, target, higher=True):
        if actual is None or target is None:
            return 'NOT_SET' if target is None else 'NO_DATA'
        return 'ON_TRACK' if ((actual >= target) if higher else (actual <= target)) else 'OFF_TRACK'

    prog = [
        {'goal': 'on_time_target_pct', 'label': 'On-time delivery (last 30d)', 'actual': otd30, 'target': G['on_time_target_pct'], 'status': st(otd30, G['on_time_target_pct'])},
        {'goal': 'margin_floor_pct', 'label': 'Net margin (last 30d)', 'actual': mar30, 'target': G['margin_floor_pct'], 'status': st(mar30, G['margin_floor_pct'])},
        {'goal': 'revenue_target', 'label': 'Revenue (last 30d)', 'actual': rev30, 'target': G['revenue_target'], 'status': st(rev30, G['revenue_target'])},
        {'goal': 'revenue_target', 'label': 'Forecast revenue (next 30d)', 'actual': fc, 'target': G['revenue_target'], 'status': st(fc, G['revenue_target'])},
        {'goal': 'empty_ratio_max', 'label': 'Empty-return ratio (last 30d)', 'actual': emp30, 'target': G['empty_ratio_max'], 'status': st(emp30, G['empty_ratio_max'], False)},
        {'goal': 'load_factor_min', 'label': 'Load factor (last 30d)', 'actual': load30, 'target': G['load_factor_min'], 'status': st(load30, G['load_factor_min'])},
        {'goal': 'overdue_grace_days', 'label': 'Days paid beyond terms (invoices, last 90d)', 'actual': over_terms, 'target': G['overdue_grace_days'], 'status': st(over_terms, G['overdue_grace_days'], False)},
    ]
    for p in prog:
        p['gap'] = None if (p['actual'] is None or p['target'] is None) else round(p['actual'] - p['target'], 4)
    alerts = []

    def alert(aid, sev, metric, actual, thr, msg, action):
        alerts.append({'id': aid, 'severity': sev, 'metric': metric, 'actual': actual, 'threshold': thr, 'message': msg, 'action': action, 'outcome': 'MONITOR', 'as_of': str(as_of)[:10]})

    if hist_days >= 35 and len(prior) > 0:
        wk7, base_wk = float(w7[c['REV']].sum()), float(prior[c['REV']].sum()) / 4.0
        drop = 100 * (base_wk - wk7) / base_wk if base_wk > 0 else 0.0
        if drop > G['alert_drop_pct']:
            alert('REV_DROP', 'HIGH', 'weekly_revenue_drop_pct', round(drop, 1), G['alert_drop_pct'], 'Last 7 days revenue is ' + str(round(drop, 1)) + '% below the prior 4-week weekly average',
                  'Call top 5 shippers and review lost or delayed bookings this week')
    if otd30 is not None and otd30 < G['on_time_target_pct']:
        gap = G['on_time_target_pct'] - otd30
        alert('OTD_BELOW_TARGET', 'HIGH' if gap > 5 else 'MEDIUM', 'on_time_pct_30d', round(otd30, 1), G['on_time_target_pct'], 'On-time delivery is ' + str(round(otd30, 1)) + '% vs target ' + str(G['on_time_target_pct']) + '%',
              'Review the top delay reason and the worst 3 lanes with the carrier managers')
    if mar30 is not None and mar30 < G['margin_floor_pct']:
        alert('MARGIN_BELOW_FLOOR', 'HIGH', 'net_margin_pct_30d', round(mar30, 1), G['margin_floor_pct'], 'Net margin over the last 30 days is below the floor',
              'Reprice lanes flagged Raise rate to margin floor in the Lane Performance sheet')
    open_ = df[df[c['AR']] > 0]
    due = open_['invoice_due_date'] + pd.Timedelta(days=G['overdue_grace_days'])
    over_amt = float(open_[due < as_of][c['AR']].sum())
    if over_amt > 0:
        share = over_amt / max(rev30, 1.0)
        alert('OVERDUE_AR', 'HIGH' if share > 0.5 else 'MEDIUM', 'overdue_ar', round(over_amt, 2), 0, 'Overdue receivables: ' + format(over_amt, ',.0f') + ' ' + c['CURRENCY'],
              'Work the overdue list in Customer & Cash, start with the largest balances')
    n_loss = int((w30['net_profit'] < 0).sum())
    if n_loss > 0:
        alert('LOSS_SHIPMENTS', 'MEDIUM', 'loss_making_shipments_30d', n_loss, 0, str(n_loss) + ' loss-making shipments in the last 30 days', 'Review rate cards for the lanes involved')
    if fc is not None and rev30 > 0 and 100 * (rev30 - fc) / rev30 > G['alert_drop_pct']:
        alert('FORECAST_DROP', 'MEDIUM', 'forecast_vs_trailing_pct', round(100 * (fc - rev30) / rev30, 1), -G['alert_drop_pct'], 'Forecast revenue for the next period is well below the last 30 days',
              'Check booking pipeline and plan capacity down or fill with spot freight')
    save_json({'as_of': str(as_of)[:10], 'goals': prog}, c['PROC_DIR'] + 'goal_progress.json')
    save_json({'as_of': str(as_of)[:10], 'alerts': alerts}, c['PROC_DIR'] + 'alerts.json')
    print('Goal progress:', [(p['label'], p['status']) for p in prog])
    print('Alerts raised:', [a['id'] + ' (' + a['severity'] + ')' for a in alerts])
    return {'progress': prog, 'alerts': alerts}
