from src.utils import *

def _fc_row(vals, d):
    n = len(vals)
    l1 = vals[-1]
    l7 = vals[-7] if n >= 7 else l1
    l14 = vals[-14] if n >= 14 else l7
    return [l1, l7, l14, float(np.mean(vals[-7:])), float(np.mean(vals[-28:])), d.dayofweek, d.day, int(d.dayofweek >= 5)]


def _fc_recursive(model, vals, start, steps):
    vals = list(vals)
    out = []
    for i in range(steps):
        d = start + pd.Timedelta(days=i)
        yhat = max(0.0, float(model.predict(np.array([_fc_row(vals, d)]))[0]))
        out.append(yhat)
        vals.append(yhat)
    return out


def run_forecast(df, config):
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.metrics import mean_absolute_error, r2_score
    c = config
    H = c['FORECAST_HORIZON']
    daily = df.groupby(df[c['DATE']].dt.normalize())[c['REV']].sum()
    daily = daily.reindex(pd.date_range(daily.index.min(), daily.index.max(), freq='D'), fill_value=0.0)
    vals = daily.values.astype(float)
    dates = daily.index
    n = len(vals)
    last = dates[-1]
    fdates = pd.date_range(last + pd.Timedelta(days=1), periods=H, freq='D')
    metrics = {'history_days': int(n), 'horizon_days': H}
    model, method, resid_sd, hold_pred, hold = None, 'moving_average', float(np.std(vals[-28:])) if n > 1 else 0.0, None, 0
    if n < c['MIN_FORECAST_DAYS']:
        print('[Phase 7] Only', n, 'days of history (need', c['MIN_FORECAST_DAYS'], '): using 14-day moving average fallback, wide uncertainty.')
        fc = [float(np.mean(vals[-14:]))] * H
    else:
        hold = int(min(14, max(7, n // 5)))
        rows = [(_fc_row(list(vals[:i]), dates[i]), vals[i]) for i in range(14, n)]
        X_all = np.array([r[0] for r in rows])
        y_all = np.array([r[1] for r in rows])
        n_tr = len(rows) - hold
        X_tr, y_tr = X_all[:n_tr], y_all[:n_tr]
        assert len(X_tr) >= 20, 'not enough training days'
        mk = lambda: GradientBoostingRegressor(n_estimators=250, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=c['RANDOM_STATE'])
        m_ho = mk().fit(X_tr, y_tr)
        hold_start = dates[n - hold]
        hold_pred = np.array(_fc_recursive(m_ho, list(vals[:n - hold]), hold_start, hold))
        actual = vals[n - hold:]
        naive = np.array([vals[n - hold - 7 + (i % 7)] if n - hold - 7 >= 0 else vals[n - hold - 1] for i in range(hold)])
        wape = lambda a, p: float(np.abs(a - p).sum() / max(np.abs(a).sum(), 1.0))
        metrics.update({'holdout_days': hold, 'mae': round(float(mean_absolute_error(actual, hold_pred)), 2),
                        'r2': round(float(r2_score(actual, hold_pred)), 4) if hold > 1 else None,
                        'wape_model': round(wape(actual, hold_pred), 4), 'wape_seasonal_naive': round(wape(actual, naive), 4)})
        print('Holdout', hold, 'days | MAE', metrics['mae'], '| R2', metrics['r2'], '| WAPE model', metrics['wape_model'], 'vs seasonal-naive', metrics['wape_seasonal_naive'])
        resid_sd = float(np.std(actual - hold_pred)) if hold > 1 else resid_sd
        if metrics['wape_model'] <= metrics['wape_seasonal_naive']:
            method = 'GradientBoostingRegressor'
            model = mk().fit(X_all, y_all)
            fc = _fc_recursive(model, list(vals), fdates[0], H)
        else:
            method = 'seasonal_naive_weekly'
            base = vals[-7:]
            fc = [float(base[i % 7]) for i in range(H)]
            print('Seasonal-naive beat the ML model on holdout -> using weekly seasonal profile (honest choice).')
    fc = np.array(fc)
    z = 1.28
    tail = df[df[c['DATE']] > last - pd.Timedelta(days=90)]
    margin90 = float(tail['net_profit'].sum() / tail[c['REV']].sum()) if tail[c['REV']].sum() > 0 else 0.0
    out = pd.DataFrame({'date': fdates, 'forecast_revenue': fc.round(2), 'lower_80': np.maximum(0, fc - z * resid_sd).round(2),
                        'upper_80': (fc + z * resid_sd).round(2), 'forecast_net_profit_est': (fc * margin90).round(2), 'method': method})
    save_df(out, c['PROC_DIR'] + 'forecast_output.csv')
    last30 = float(vals[-30:].sum())
    metrics.update({'method': method, 'forecast_total_revenue': round(float(fc.sum()), 2), 'trailing_30d_revenue': round(last30, 2),
                    'forecast_vs_trailing_pct': round(100 * (float(fc.sum()) - last30) / last30, 2) if last30 > 0 else None, 'last_actual_date': str(last)[:10]})
    joblib.dump({'model': model, 'method': method, 'features': ['lag1', 'lag7', 'lag14', 'roll7', 'roll28', 'dow', 'dom', 'is_weekend'],
                 'history_tail': vals[-28:].tolist(), 'last_date': str(last)[:10], 'horizon': H}, c['MODELS_DIR'] + 'forecast_model.pkl')
    save_json(metrics, c['PROC_DIR'] + 'forecast_metrics.json')
    try:
        fig, axs = plt.subplots(1, 2, figsize=(13, 5), gridspec_kw={'width_ratios': [2.2, 1]})
        show = min(n, 60)
        axs[0].plot(dates[-show:], vals[-show:], color='#1f77b4', label='Actual')
        if hold_pred is not None:
            axs[0].plot(dates[n - hold:], hold_pred, color='#ff7f0e', ls='--', label='Holdout prediction')
        axs[0].plot(fdates, fc, color='#d62728', label='Forecast')
        axs[0].fill_between(fdates, out['lower_80'], out['upper_80'], color='#d62728', alpha=0.15)
        axs[0].legend(); axs[0].set_title('[MONITOR] Next ' + str(H) + ' days revenue (' + method + ')')
        if hold_pred is not None:
            axs[1].hist(vals[n - hold:] - hold_pred, bins=10, color='#7f7f7f')
            axs[1].set_title('Holdout residuals')
        plt.tight_layout(); plt.savefig(c['REPORTS_DIR'] + 'forecast_diagnostics.png', dpi=150); plt.show(); plt.close('all')
    except Exception as e:
        print('Chart skipped:', e)
    print('Forecast next', H, 'days revenue:', round(float(fc.sum()), 0), '| trailing 30d:', round(last30, 0))
    return metrics
