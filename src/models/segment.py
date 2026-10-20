from src.utils import *

def run_segmentation(df, config):
    from sklearn.preprocessing import StandardScaler
    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA
    from sklearn.ensemble import IsolationForest
    from sklearn.metrics import silhouette_score
    c = config
    RS = c['RANDOM_STATE']
    df = df.copy()
    # ---- lane segmentation ----
    lane = lane_table(df, c)
    elig = lane[lane['shipments'] >= c['MIN_LANE_SHIPMENTS']].copy()
    lane['lane_segment'] = 'Insufficient data'
    sil = None
    seg_feats = ['net_margin_pct', 'late_rate_pct', 'avg_load', 'avg_empty_ratio']
    Zl = None
    if len(elig) >= 4:
        k = 3 if len(elig) >= 9 else 2
        Zl = StandardScaler().fit_transform(np.column_stack([elig[seg_feats].fillna(0).values, np.log1p(elig['revenue'].values)]))
        km = KMeans(n_clusters=k, n_init=10, random_state=RS).fit(Zl)
        elig['cluster'] = km.labels_
        sil = float(silhouette_score(Zl, km.labels_)) if len(elig) > k else None
        order = elig.groupby('cluster')['net_margin_pct'].mean().sort_values(ascending=False).index.tolist()
        names = ['Profit Engine', 'Core Lane', 'Margin Drain'] if k == 3 else ['Profit Engine', 'Margin Drain']
        elig['lane_segment'] = elig['cluster'].map({cl: names[i] for i, cl in enumerate(order)})
        lane.loc[elig.index, 'lane_segment'] = elig['lane_segment']
        print('Lane segmentation: k =', k, '| silhouette =', None if sil is None else round(sil, 3))
        print(lane.groupby('lane_segment').agg(lanes=(c['LANE'], 'count'), revenue=('revenue', 'sum'), margin=('net_margin_pct', 'mean')).round(2))
    else:
        print('[Phase 6] Fewer than 4 lanes with >=' + str(c['MIN_LANE_SHIPMENTS']) + ' shipments: segmentation skipped (graceful fallback).')
    save_df(lane, c['PROC_DIR'] + 'lane_segments.csv')
    df['lane_segment'] = df[c['LANE']].map(lane.set_index(c['LANE'])['lane_segment'])
    # ---- anomaly detection ----
    feats = [x for x in [c['REV_KM'], c['COST_KM'], c['LOAD'], 'empty_return_ratio', 'net_margin_pct', 'weight_per_cbm', c['DELAY_DAYS'], 'accessorial_share'] if x in df.columns]
    LABELS = {c['REV_KM']: 'revenue per km', c['COST_KM']: 'cost per km', c['LOAD']: 'load factor', 'empty_return_ratio': 'empty-return share',
              'net_margin_pct': 'net margin', 'weight_per_cbm': 'cargo density', c['DELAY_DAYS']: 'delay days', 'accessorial_share': 'accessorial share'}
    Xa = df[feats].replace([np.inf, -np.inf], np.nan)
    med = Xa.median()
    Xa = Xa.fillna(med)
    df['is_anomaly'] = 0
    df['anomaly_score'] = 0.0
    df['anomaly_reason'] = ''
    Za = None
    if len(df) >= c['MIN_ROWS_ANOMALY'] and len(feats) >= 3:
        scaler = StandardScaler().fit(Xa)
        Za = np.clip(scaler.transform(Xa), -10, 10)
        iso = IsolationForest(n_estimators=200, contamination=c['ANOMALY_CONT'], random_state=RS).fit(Za)
        df['is_anomaly'] = (iso.predict(Za) == -1).astype(int)
        df['anomaly_score'] = np.round(-iso.score_samples(Za), 4)
        idx = np.abs(Za).argmax(axis=1)
        reasons = np.array([''] * len(df), dtype=object)
        for i in np.where(df['is_anomaly'].values == 1)[0]:
            j = idx[i]
            f = feats[j]
            reasons[i] = LABELS[f] + (' unusually high' if Za[i, j] > 0 else ' unusually low') + ' (' + format(Xa.iloc[i, j], ',.2f') + ' vs typical ' + format(med[f], ',.2f') + ')'
        df['anomaly_reason'] = reasons
        joblib.dump(iso, c['MODELS_DIR'] + 'isolation_forest.pkl')
        joblib.dump({'scaler': scaler, 'features': feats}, c['MODELS_DIR'] + 'anomaly_scaler.pkl')
        an = df[df['is_anomaly'] == 1]
        print('Anomalous shipments:', len(an), '| late rate', round(100 * an['late_flag'].mean(), 1), '% vs', round(100 * df['late_flag'].mean(), 1), '% overall | avg net margin',
              round(an['net_margin_pct'].mean(), 1), '% vs', round(df['net_margin_pct'].mean(), 1), '%')
    else:
        print('[Phase 6] Not enough rows/features for anomaly detection: no anomalies flagged.')
    # ---- combined chart ----
    try:
        fig, axs = plt.subplots(1, 2, figsize=(13, 5))
        if Zl is not None and len(elig) >= 3:
            P = PCA(n_components=2, random_state=RS).fit_transform(Zl)
            for sname in elig['lane_segment'].unique():
                mk = (elig['lane_segment'] == sname).values
                axs[0].scatter(P[mk, 0], P[mk, 1], s=40, label=sname)
            axs[0].legend(); axs[0].set_title('[UNDERSTAND] Lane segments (PCA view)')
        if Za is not None:
            P2 = PCA(n_components=2, random_state=RS).fit_transform(Za)
            nm = df['is_anomaly'].values == 0
            axs[1].scatter(P2[nm, 0], P2[nm, 1], s=5, alpha=0.3, color='#7f7f7f', label='Normal')
            axs[1].scatter(P2[~nm, 0], P2[~nm, 1], s=14, color='#d62728', label='Anomaly')
            axs[1].legend(); axs[1].set_title('[UNDERSTAND] Unusual shipments (PCA view)')
        plt.tight_layout(); plt.savefig(c['REPORTS_DIR'] + 'ml2_segments_anomalies.png', dpi=150); plt.show(); plt.close('all')
    except Exception as e:
        print('Chart skipped:', e)
    save_df(df[[c['ID'], c['DATE'], c['LANE'], c['CUSTOMER'], 'lane_segment', 'is_anomaly', 'anomaly_score', 'anomaly_reason']], c['PROC_DIR'] + 'ml_task2_output.csv')
    save_df(df, c['ENRICHED_CSV'])
    return df
