from src.utils import *

ENGINEERED_FEATURES = ['ship_dow', 'ship_month_num', 'is_weekend_ship', 'distance_band', 'weight_per_cbm', 'empty_return_ratio',
                       'planned_km_per_day', 'is_subcontracted', 'purchased_cost_share', 'low_load_flag', 'loss_making_flag',
                       'accessorial_share', 'fuel_surcharge_pct', 'revenue_per_tonne', 'penalty_claim_rate',
                       'pay_days_over_terms', 'co2_per_tonne_km', 'lane_prior_late_rate', 'customer_prior_late_rate',
                       'ops_risk_score']


def _prior_rate(df, key, dcol, target, k=5):
    # smoothed late-rate using ONLY shipments from earlier days (no same-day / future information)
    base = df[target].mean()
    daily = df.groupby([key, dcol])[target].agg(['sum', 'count']).reset_index().sort_values([key, dcol])
    daily['cs'] = daily.groupby(key)['sum'].cumsum() - daily['sum']
    daily['cn'] = daily.groupby(key)['count'].cumsum() - daily['count']
    daily['rate'] = (daily['cs'] + k * base) / (daily['cn'] + k)
    return df[[key, dcol]].merge(daily[[key, dcol, 'rate']], on=[key, dcol], how='left')['rate'].values


def engineer(df, config):
    c = config
    T = c['THRESHOLDS']
    df = df.sort_values([c['DATE'], c['ID']]).reset_index(drop=True).copy()
    d = df[c['DATE']]
    tonnes = df[c['WEIGHT']] / 1000.0
    df['ship_dow'] = d.dt.dayofweek
    df['ship_month_num'] = d.dt.month
    df['is_weekend_ship'] = (d.dt.dayofweek >= 5).astype(int)
    df['distance_band'] = pd.cut(df[c['DIST']], bins=[0, 500, 1500, 3000, np.inf],
                                 labels=['Short (<500km)', 'Medium (500-1500km)', 'Long (1500-3000km)', 'Ultra-long (3000km+)']).astype(str)
    df['weight_per_cbm'] = safe_div(df[c['WEIGHT']], df[c['VOLUME']])
    df['empty_return_ratio'] = safe_div(df[c['EMPTY_KM']], df[c['DIST']])
    df['planned_km_per_day'] = safe_div(df[c['DIST']], df[c['PLAN_DAYS']])
    df['is_subcontracted'] = (df[c['PURCH']] > 0).astype(int)
    df['purchased_cost_share'] = safe_div(df[c['PURCH']], df[c['COST']])
    df['low_load_flag'] = (df[c['LOAD']] < T['load_factor_min']).astype(int)
    df['loss_making_flag'] = (df['net_profit'] < 0).astype(int)
    df['accessorial_share'] = safe_div(df[c['ACC_REV']], df[c['REV']])
    df['fuel_surcharge_pct'] = safe_div(df[c['FUEL_SUR']], df[c['BASE_REV']]) * 100
    df['revenue_per_tonne'] = safe_div(df[c['REV']], tonnes)
    df['penalty_claim_rate'] = safe_div(df['penalty_claims'], df[c['REV']])
    df['pay_days_over_terms'] = df[c['DTP']] - df[c['TERMS']]
    df['co2_per_tonne_km'] = safe_div(df[c['CO2']], tonnes * df[c['DIST']])
    df['lane_prior_late_rate'] = _prior_rate(df, c['LANE'], c['DATE'], 'late_flag')
    df['customer_prior_late_rate'] = _prior_rate(df, c['CUSTOMER'], c['DATE'], 'late_flag')
    pr = lambda s: s.rank(pct=True)
    # composite score (0-100): 35% lane history, 25% schedule tightness, 20% under-filled load, 20% deadhead
    df['ops_risk_score'] = (100 * (0.35 * pr(df['lane_prior_late_rate']) + 0.25 * pr(df['planned_km_per_day'])
                                   + 0.20 * pr(100 - df[c['LOAD']]) + 0.20 * pr(df['empty_return_ratio']))).round(2)
    save_df(df, c['ENRICHED_CSV'])
    fs_cols = []
    for col in [c['ID'], c['DATE'], c['LANE'], c['CUSTOMER']] + c['MODEL_NUM_COLS'] + c['MODEL_CAT_COLS'] + ENGINEERED_FEATURES:
        if col in df.columns and col not in fs_cols:
            fs_cols.append(col)
    save_df(df[fs_cols], c['FEAT_CSV'])
    print('New features:', ENGINEERED_FEATURES)
    print('Feature store ->', c['FEAT_CSV'], '| enriched ->', c['ENRICHED_CSV'])
    return df
