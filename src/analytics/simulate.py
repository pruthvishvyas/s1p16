from src.utils import *

def run_simulations(df, config):
    c = config
    out_dir = c['PROC_DIR'] + 'simulations/'
    days = max((df[c['DATE']].max() - df[c['DATE']].min()).days + 1, 1)
    months = max(days / 30.44, 1e-9)
    rev, cost, net = float(df[c['REV']].sum()), float(df[c['COST']].sum()), float(df['net_profit'].sum())
    base = {'period_days': int(days), 'period_months': round(months, 2), 'currency': c['CURRENCY'],
            'baseline_revenue': round(rev, 2), 'baseline_net_profit': round(net, 2)}
    # 1) price change with volume response by rate type (elasticity = ASSUMPTION, editable in CONFIG)
    el = c['ELASTICITY']
    rt = df[c['RATE']].astype(str).str.lower()
    e_vec = np.where(rt.str.contains('spot'), el['spot'], np.where(rt.str.contains('contract'), el['contract'], el['default']))
    r_, k_ = df[c['REV']].values, df[c['COST']].values + df['penalty_claims'].values
    rows = []
    for p in range(0, 16):
        pc = p / 100.0
        vm = np.maximum(0.0, 1 + e_vec * pc)
        new_rev = float((r_ * (1 + pc) * vm).sum())
        new_net = new_rev - float((k_ * vm).sum())
        rows.append({'price_change_pct': p, 'revenue': round(new_rev, 2), 'net_profit': round(new_net, 2), 'delta_net_profit': round(new_net - net, 2),
                     'volume_change_pct': round(float(((vm - 1) * r_).sum() / max(rev, 1.0) * 100), 2)})
    best = max(rows, key=lambda x: x['net_profit'])
    save_json(dict(base, variable='price_change_pct', assumptions={'elasticity': el, 'note': 'Volume response to price by Rate_Type; confirm with account managers'},
                   best_price_change_pct=best['price_change_pct'], scenarios=rows), out_dir + 'price_change_impact.json')
    # 2) late-delivery reduction -> penalty + claim savings
    leak = float(df['penalty_claims'].sum())
    late_n = int(df['late_flag'].sum())
    rows = []
    for r in range(0, 55, 5):
        rr = r / 100.0
        rows.append({'late_reduction_pct': r, 'late_shipments': int(round(late_n * (1 - rr))), 'on_time_pct': round(100 * (1 - late_n * (1 - rr) / max(len(df), 1)), 2),
                     'savings_period': round(leak * rr, 2), 'savings_per_month': round(leak * rr / months, 2)})
    save_json(dict(base, variable='late_reduction_pct', baseline_penalties_claims=round(leak, 2), assumptions={'note': 'Penalties and claims scale with number of late shipments'}, scenarios=rows),
              out_dir + 'late_reduction_impact.json')
    # 3) empty-return reduction -> fuel + driver cost saving (own fleet only)
    own = df[df[c['PURCH']] <= 0]
    denom = float((own[c['DIST']] + own[c['EMPTY_KM']]).sum())
    cpk = float((own[c['FUEL_COST']] + own[c['DRIVER']]).sum()) / denom if denom > 0 else 0.0
    empty_km = float(own[c['EMPTY_KM']].sum())
    co2_pk = float(df[c['CO2']].sum()) / max(float(df[c['DIST']].sum()), 1.0)
    rows = []
    for r in range(0, 55, 5):
        rr = r / 100.0
        rows.append({'empty_reduction_pct': r, 'empty_km_saved': round(empty_km * rr, 0), 'savings_period': round(empty_km * rr * cpk, 2),
                     'savings_per_month': round(empty_km * rr * cpk / months, 2), 'co2_kg_saved': round(empty_km * rr * co2_pk, 0)})
    save_json(dict(base, variable='empty_reduction_pct', own_fleet_cost_per_km=round(cpk, 4), own_fleet_empty_km=round(empty_km, 0),
                   assumptions={'note': 'Own-fleet shipments only (Purchased_Transport_Cost = 0); saved empty km valued at fuel + driver cost per km'}, scenarios=rows),
              out_dir + 'empty_return_reduction.json')
    print('Simulation JSONs written to', out_dir, '| best price change %:', best['price_change_pct'])
    return {'best_price_change_pct': best['price_change_pct'], 'own_fleet_cost_per_km': cpk}
