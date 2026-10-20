from src.utils import *

def run_insights(df, config):
    c = config
    T = c['THRESHOLDS']
    cur = '$' if c['CURRENCY'] == 'USD' else c['CURRENCY'] + ' '
    m = lambda x: cur + format(float(x), ',.0f')
    items = []
    as_of = df[c['DATE']].max()
    tot_rev, tot_np = float(df[c['REV']].sum()), float(df['net_profit'].sum())

    def add(cat, finding, evidence, action, impact):
        items.append({'category': cat, 'finding': finding, 'evidence': evidence, 'action': action, 'outcome': 'DECIDE', 'impact_value': round(float(impact), 2)})

    def i_leak():
        leak, pen, clm = float(df['penalty_claims'].sum()), float(df[c['PENALTY']].sum()), float(df[c['CLAIMS']].sum())
        if leak > 0:
            add('Revenue Leakage', 'Late penalties and claims consume ' + str(round(100 * leak / tot_rev, 1)) + '% of revenue',
                'Late penalties ' + m(pen) + ' + claims ' + m(clm) + ' = ' + m(leak) + ' on ' + m(tot_rev) + ' revenue (' + format(len(df), ',') + ' shipments)',
                'Agree corrective actions with carriers for the 3 costliest delay reasons this week', leak)

    def i_lanes():
        lt = lane_table(df, c)
        lt = lt[lt['shipments'] >= c['MIN_LANE_SHIPMENTS']].copy()
        lt['shortfall'] = (T['margin_floor_pct'] / 100 * lt['revenue'] - lt['net_profit']).clip(lower=0)
        bad = lt[lt['net_margin_pct'] < T['margin_floor_pct']].sort_values('shortfall', ascending=False)
        if len(bad) == 0:
            return
        ev = '; '.join(r[c['LANE']] + ': ' + str(round(r['net_margin_pct'], 1)) + '% on ' + m(r['revenue']) for _, r in bad.head(3).iterrows())
        add('Lane Profitability', str(len(bad)) + ' of ' + str(len(lt)) + ' lanes earn below the ' + str(T['margin_floor_pct']) + '% net margin floor',
            'Worst lanes by profit shortfall - ' + ev + '. Total shortfall vs floor ' + m(bad['shortfall'].sum()),
            'Reprice or exit the worst 3 lanes; see price_increase_to_floor_pct in Lane Performance', bad['shortfall'].sum())

    def i_cash():
        op = df[df[c['AR']] > 0]
        if len(op) == 0:
            return
        due = op['invoice_due_date'] + pd.Timedelta(days=T['overdue_grace_days'])
        over = op[due < as_of]
        top = op.groupby(c['CUSTOMER'])[c['AR']].sum().sort_values(ascending=False).head(3)
        ev = '; '.join(k + ' ' + m(v) for k, v in top.items())
        late_pay = df['pay_days_over_terms'].dropna()
        extra = (' Paid invoices average ' + str(round(late_pay.mean(), 1)) + ' days vs terms.') if len(late_pay) else ''
        add('Cash Collection', m(op[c['AR']].sum()) + ' is outstanding, ' + m(over[c['AR']].sum()) + ' of it overdue',
            'Largest balances: ' + ev + '.' + extra, 'Chase the top 3 balances this week and tighten terms for repeat late payers', over[c['AR']].sum() if len(over) else op[c['AR']].sum())

    def i_concentration():
        cu = df.groupby(c['CUSTOMER']).agg(rev=(c['REV'], 'sum'), np_=('net_profit', 'sum')).sort_values('rev', ascending=False)
        share = 100 * cu['rev'].head(3).sum() / max(tot_rev, 1.0)
        add('Customer Concentration', 'Top 3 shippers generate ' + str(round(share, 1)) + '% of revenue',
            ', '.join(k + ' ' + str(round(100 * v / tot_rev, 1)) + '%' for k, v in cu['rev'].head(3).items()),
            'Lock in multi-year contracts with the top 3 and build pipeline to dilute dependence', cu['np_'].head(1).sum())

    def i_empty():
        own = df[df[c['PURCH']] <= 0]
        den = float((own[c['DIST']] + own[c['EMPTY_KM']]).sum())
        if den <= 0:
            return
        cpk = float((own[c['FUEL_COST']] + own[c['DRIVER']]).sum()) / den
        ek = float(own[c['EMPTY_KM']].sum())
        ratio = ek / max(float(own[c['DIST']].sum()), 1.0)
        add('Asset Utilization', 'Own-fleet empty return km equal ' + str(round(100 * ratio, 1)) + '% of loaded km (limit ' + str(int(100 * T['empty_ratio_max'])) + '%)',
            format(ek, ',.0f') + ' empty km x ' + str(round(cpk, 2)) + ' per km = ' + m(ek * cpk) + ' of fuel and driver cost',
            'Match backhaul loads on the highest-deadhead lanes', ek * cpk)

    def i_load():
        lo = df[df[c['LOAD']] < T['load_factor_min']]
        hi = df[df[c['LOAD']] >= T['load_factor_min']]
        if len(lo) == 0 or len(hi) == 0:
            return
        mg = lambda x: 100 * x['net_profit'].sum() / max(x[c['REV']].sum(), 1.0)
        gap = mg(hi) - mg(lo)
        add('Asset Utilization', str(round(100 * len(lo) / len(df), 1)) + '% of shipments move below ' + str(int(T['load_factor_min'])) + '% load factor',
            'Net margin ' + str(round(mg(lo), 1)) + '% (under-filled) vs ' + str(round(mg(hi), 1)) + '% (well-filled)',
            'Consolidate partial loads and set minimum-charge rules for under-filled shipments', max(0.0, gap) / 100 * float(lo[c['REV']].sum()))

    def i_carrier():
        g = df.groupby(c['CARRIER'])[['net_profit', c['REV']]].sum()
        g = g[g[c['REV']] > 0]
        g['mg'] = 100 * g['net_profit'] / g[c['REV']]
        if len(g) < 2:
            return
        w, b = g['mg'].idxmin(), g['mg'].idxmax()
        add('Carrier Cost', w + ' earns ' + str(round(g.loc[w, 'mg'], 1)) + '% net margin vs ' + str(round(g.loc[b, 'mg'], 1)) + '% for ' + b,
            w + ' revenue ' + m(g.loc[w, c['REV']]) + '; best carrier type ' + b + ' revenue ' + m(g.loc[b, c['REV']]),
            'Renegotiate purchased-transport rates or shift volume toward ' + b, max(0.0, (g.loc[b, 'mg'] - g.loc[w, 'mg']) / 100 * g.loc[w, c['REV']]))

    def i_otd():
        otd = 100 * (1 - df['late_flag'].mean())
        lt = df[df['late_flag'] == 1]
        if len(lt) == 0:
            return
        r = lt.groupby(c['DELAY_REASON']).agg(n=('late_flag', 'size'), cost=('penalty_claims', 'sum')).sort_values('cost', ascending=False)
        top = r.index[0]
        add('On-Time Delivery', 'On-time delivery is ' + str(round(otd, 1)) + '% vs ' + str(T['on_time_target_pct']) + '% target; top cost driver is ' + top,
            str(len(lt)) + ' late shipments; ' + top + ' = ' + str(int(r.iloc[0]['n'])) + ' late shipments costing ' + m(r.iloc[0]['cost']),
            'Assign an owner to ' + top + ' and review the worst lanes weekly', float(r.iloc[0]['cost']))

    def i_fuel():
        fu = df[df[c['FUEL_COST']] > 0]
        if len(fu) == 0:
            return
        rec = float(fu[c['FUEL_SUR']].sum()) / max(float(fu[c['FUEL_COST']].sum()), 1.0)
        gap = max(0.0, float(fu[c['FUEL_COST']].sum() - fu[c['FUEL_SUR']].sum()))
        add('Revenue Leakage', 'Fuel surcharges recover ' + str(round(100 * rec, 1)) + '% of own-fleet fuel cost',
            'Fuel cost ' + m(fu[c['FUEL_COST']].sum()) + ' vs surcharge ' + m(fu[c['FUEL_SUR']].sum()),
            'Index the surcharge table to the fuel price and apply it on every contract' if rec < 1 else 'Surcharge fully covers fuel; keep the index table current', gap)

    def i_anom():
        if 'is_anomaly' not in df.columns or df['is_anomaly'].sum() == 0:
            return
        an = df[df['is_anomaly'] == 1]
        add('Data & Pricing Quality', str(len(an)) + ' shipments are statistically unusual (rate, cost, load or delay)',
            'Their average net margin is ' + str(round(an['net_margin_pct'].mean(), 1)) + '% vs ' + str(round(df['net_margin_pct'].mean(), 1)) + '% overall; net profit ' + m(an['net_profit'].sum()),
            'Audit the flagged shipments for pricing or cost-entry errors', abs(float(an.loc[an['net_profit'] < 0, 'net_profit'].sum())))

    def i_forecast():
        fm = load_json(c['PROC_DIR'] + 'forecast_metrics.json', {})
        if not fm or fm.get('forecast_vs_trailing_pct') is None:
            return
        d = fm['forecast_total_revenue'] - fm['trailing_30d_revenue']
        add('Demand Outlook', 'Next ' + str(fm['horizon_days']) + ' days revenue forecast is ' + str(fm['forecast_vs_trailing_pct']) + '% vs the last 30 days',
            'Forecast ' + m(fm['forecast_total_revenue']) + ' vs trailing ' + m(fm['trailing_30d_revenue']) + ' (' + fm['method'] + ')',
            'Plan driver and subcontractor capacity to the forecast', abs(d) * 0.1)

    def i_summary():
        add('Network Summary', 'Network earned ' + m(tot_np) + ' net profit on ' + m(tot_rev) + ' revenue (' + str(round(100 * tot_np / max(tot_rev, 1.0), 1)) + '% net margin)',
            format(len(df), ',') + ' shipments from ' + str(df[c['DATE']].min())[:10] + ' to ' + str(as_of)[:10], 'Use this as the baseline for the margin goal', 0.0)

    def i_best_lane():
        lt = lane_table(df, c)
        lt = lt[lt['shipments'] >= c['MIN_LANE_SHIPMENTS']].sort_values('net_profit', ascending=False)
        if len(lt) == 0:
            return
        r = lt.iloc[0]
        add('Lane Profitability', 'Best lane is ' + r[c['LANE']] + ' with ' + m(r['net_profit']) + ' net profit',
            str(int(r['shipments'])) + ' shipments at ' + str(round(r['net_margin_pct'], 1)) + '% net margin', 'Protect capacity and service quality on this lane', 0.0)

    def i_dow():
        g = df.groupby('ship_dow')[c['REV']].sum()
        names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        add('Demand Patterns', 'Busiest dispatch day is ' + names[int(g.idxmax())] + ' and quietest is ' + names[int(g.idxmin())],
            names[int(g.idxmax())] + ' ' + m(g.max()) + ' vs ' + names[int(g.idxmin())] + ' ' + m(g.min()), 'Shift staffing and driver rosters toward the peak day', 0.0)

    for fn in [i_leak, i_lanes, i_cash, i_concentration, i_empty, i_load, i_carrier, i_otd, i_fuel, i_anom, i_forecast, i_summary, i_best_lane, i_dow]:
        try:
            fn()
        except Exception as e:
            print('Insight skipped:', fn.__name__, e)
    items.sort(key=lambda x: -x['impact_value'])
    for i, it in enumerate(items):
        it['severity'] = 'HIGH' if i < 3 else ('MEDIUM' if i < 7 else 'LOW')   # severity = rank by quantified money impact
    ordered = [{k: it[k] for k in ['severity', 'category', 'finding', 'evidence', 'action', 'outcome', 'impact_value']} for it in items]
    save_json(ordered, c['REPORTS_DIR'] + 'insights.json')
    for it in ordered:
        print('[' + it['severity'] + '] ' + it['category'] + ': ' + it['finding'])
    print('Insights:', len(ordered), '->', c['REPORTS_DIR'] + 'insights.json')
