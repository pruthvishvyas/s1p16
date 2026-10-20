from src.utils import *

def run_classification(df, config):
    from sklearn.base import clone
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.model_selection import StratifiedKFold, cross_val_score, cross_val_predict, train_test_split
    from sklearn.metrics import (roc_auc_score, average_precision_score, recall_score, precision_score, accuracy_score,
                                 classification_report, confusion_matrix, roc_curve, fbeta_score)
    c = config
    RS = c['RANDOM_STATE']
    df = df.sort_values([c['DATE'], c['ID']]).reset_index(drop=True)
    y = df['late_flag'].astype(int)
    NUM = [x for x in c['MODEL_NUM_COLS'] if x in df.columns]
    CAT = [x for x in c['MODEL_CAT_COLS'] if x in df.columns]
    FEATURE_COLS = NUM + CAT
    X = df[FEATURE_COLS].copy()
    for col in CAT:
        X[col] = X[col].astype(str)
    n, n_late = len(df), int(y.sum())
    minority = min(n_late, n - n_late)
    rule_pred = ((df['planned_km_per_day'] > df['planned_km_per_day'].quantile(0.75)) |
                 (df['lane_prior_late_rate'] > 1.5 * y.mean())).astype(int)
    metrics = {'rows': n, 'late_rate_pct': round(100 * n_late / max(n, 1), 2), 'target': 'late_flag (late delivery)',
               'rule_baseline': {'recall': round(float(recall_score(y, rule_pred, zero_division=0)), 4),
                                 'precision': round(float(precision_score(y, rule_pred, zero_division=0)), 4)}}
    print('Rule baseline (tight schedule OR lane history) -> recall', metrics['rule_baseline']['recall'], 'precision', metrics['rule_baseline']['precision'])
    thr = 0.5
    if n < c['MIN_ROWS_CLASSIFIER'] or minority < c['MIN_MINORITY_CLASS']:
        print('[Phase 5] Not enough data for a reliable ML model (rows=' + str(n) + ', minority class=' + str(minority) + '). Using rule-based risk score only.')
        df['pred_late_prob'] = (df['ops_risk_score'] / 100).round(4)
        df['pred_late'] = rule_pred.values
        df['pred_split'] = 'rule_based'
        metrics['mode'] = 'rule_based_fallback'
        metrics['best_model'] = 'rule_based'
    else:
        cut = int(n * (1 - c['TEST_FRAC']))
        tr_idx, te_idx = np.arange(cut), np.arange(cut, n)
        if y.iloc[tr_idx].nunique() < 2 or y.iloc[te_idx].nunique() < 2 or y.iloc[tr_idx].sum() < 15:
            tr_idx, te_idx = train_test_split(np.arange(n), test_size=c['TEST_FRAC'], stratify=y, random_state=RS)
            metrics['split'] = 'stratified_random'
        else:
            metrics['split'] = 'time_based: newest ' + str(int(c['TEST_FRAC'] * 100)) + '% of shipments held out'
        X_tr, X_te, y_tr, y_te = X.iloc[tr_idx], X.iloc[te_idx], y.iloc[tr_idx], y.iloc[te_idx]
        assert len(X_tr) >= 100, 'training set too small'
        n_splits = int(max(2, min(5, y_tr.value_counts().min())))
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RS)

        def prep():
            return ColumnTransformer([
                ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), NUM),
                ('cat', OneHotEncoder(handle_unknown='ignore'), CAT)])

        cands = {
            'LogisticRegression': Pipeline([('prep', prep()), ('clf', LogisticRegression(max_iter=2000, class_weight='balanced'))]),
            'RandomForest': Pipeline([('prep', prep()), ('clf', RandomForestClassifier(n_estimators=200, min_samples_leaf=3, class_weight='balanced_subsample', n_jobs=-1, random_state=RS))]),
            'GradientBoosting': Pipeline([('prep', prep()), ('clf', GradientBoostingClassifier(n_estimators=150, max_depth=3, learning_rate=0.08, subsample=0.8, random_state=RS))]),
        }
        res = {}
        for name, pipe in cands.items():
            cv_auc = cross_val_score(pipe, X_tr, y_tr, cv=cv, scoring='roc_auc')
            pipe.fit(X_tr, y_tr)
            pr = pipe.predict_proba(X_te)[:, 1]
            res[name] = {'cv_auc_mean': float(cv_auc.mean()), 'cv_auc_std': float(cv_auc.std()),
                         'test_auc': float(roc_auc_score(y_te, pr)), 'test_pr_auc': float(average_precision_score(y_te, pr)),
                         'test_acc': float(accuracy_score(y_te, (pr >= 0.5).astype(int)))}
            print(name.ljust(20), 'CV-AUC %.3f +/- %.3f' % (cv_auc.mean(), cv_auc.std()), '| Test-AUC %.3f | Test-Acc %.3f' % (res[name]['test_auc'], res[name]['test_acc']))
        best_name = max(res, key=lambda k: res[k]['cv_auc_mean'])
        best = cands[best_name]
        # threshold tuned on out-of-fold TRAIN predictions, F2 (recall-weighted): a missed late shipment costs more than an extra alert
        oof = cross_val_predict(clone(best), X_tr, y_tr, cv=cv, method='predict_proba')[:, 1]
        grid = np.arange(0.05, 0.96, 0.01)
        f2 = np.array([fbeta_score(y_tr, (oof >= t).astype(int), beta=2, zero_division=0) for t in grid])
        share = np.array([(oof >= t).mean() for t in grid])
        ok = share <= 0.5   # an alert list that flags more than half of all shipments is not actionable
        thr = float(grid[int(np.argmax(np.where(ok, f2, -1.0)))]) if ok.any() else 0.5
        p_te = best.predict_proba(X_te)[:, 1]
        yp_te = (p_te >= thr).astype(int)
        metrics.update({'mode': 'ml', 'best_model': best_name, 'threshold': round(thr, 2), 'models': res,
                        'test_recall': round(float(recall_score(y_te, yp_te, zero_division=0)), 4),
                        'test_precision': round(float(precision_score(y_te, yp_te, zero_division=0)), 4),
                        'test_f2': round(float(fbeta_score(y_te, yp_te, beta=2, zero_division=0)), 4),
                        'test_roc_auc': round(res[best_name]['test_auc'], 4), 'test_pr_auc': round(res[best_name]['test_pr_auc'], 4),
                        'test_rows': int(len(te_idx)), 'train_rows': int(len(tr_idx))})
        metrics['signal'] = 'weak' if res[best_name]['cv_auc_mean'] < 0.60 else 'usable'
        if metrics['signal'] == 'weak':
            print('WARNING: CV-AUC below 0.60 - late deliveries are hard to predict from pre-shipment fields; treat risk scores as indicative only.')
        print('\nBest model:', best_name, '| threshold', round(thr, 2), '| TEST recall', metrics['test_recall'], '| precision', metrics['test_precision'])
        print('Lift check: rule-baseline recall', metrics['rule_baseline']['recall'], 'vs ML recall', metrics['test_recall'])
        print(classification_report(y_te, yp_te, target_names=['On Time', 'Late'], zero_division=0))
        # diagnostics
        try:
            fig, axs = plt.subplots(1, 2, figsize=(12, 5))
            cm = confusion_matrix(y_te, yp_te)
            axs[0].imshow(cm, cmap='Blues')
            for i in range(2):
                for j in range(2):
                    axs[0].text(j, i, int(cm[i, j]), ha='center', va='center', fontsize=14)
            axs[0].set_xticks([0, 1]); axs[0].set_xticklabels(['Pred On Time', 'Pred Late'])
            axs[0].set_yticks([0, 1]); axs[0].set_yticklabels(['On Time', 'Late'])
            axs[0].set_title('Confusion matrix (held-out shipments)')
            fpr, tpr, _ = roc_curve(y_te, p_te)
            axs[1].plot(fpr, tpr, color='#d62728', label='AUC ' + str(round(res[best_name]['test_auc'], 3)))
            axs[1].plot([0, 1], [0, 1], '--', color='grey')
            axs[1].set_xlabel('False positive rate'); axs[1].set_ylabel('True positive rate'); axs[1].legend()
            axs[1].set_title('ROC - late delivery risk')
            plt.tight_layout(); plt.savefig(c['REPORTS_DIR'] + 'ml1_confusion_roc.png', dpi=150); plt.show(); plt.close('all')
            names = best.named_steps['prep'].get_feature_names_out()
            clf = best.named_steps['clf']
            imp = clf.feature_importances_ if hasattr(clf, 'feature_importances_') else np.abs(clf.coef_[0])
            top = pd.Series(imp, index=names).sort_values(ascending=False).head(15)
            plt.figure(figsize=(9, 6))
            plt.barh(top.index[::-1], top.values[::-1], color='#1f77b4')
            plt.title('[UNDERSTAND] What drives late deliveries? Top 15 features')
            plt.tight_layout(); plt.savefig(c['REPORTS_DIR'] + 'ml1_feature_importance.png', dpi=150); plt.show(); plt.close('all')
            metrics['top_features'] = {str(k): round(float(v), 4) for k, v in top.head(10).items()}
        except Exception as e:
            print('Diagnostics plot skipped:', e)
        # scoring: train-period model scores every row (test rows are genuinely out-of-sample)
        df['pred_late_prob'] = np.round(best.predict_proba(X)[:, 1], 4)
        df['pred_late'] = (df['pred_late_prob'] >= thr).astype(int)
        split = np.array(['train'] * n, dtype=object)
        split[te_idx] = 'test'
        df['pred_split'] = split
        deploy = clone(best).fit(X, y)   # deployment model uses all history
        joblib.dump(deploy, c['MODELS_DIR'] + 'best_classifier.pkl')
        joblib.dump({'numeric': NUM, 'categorical': CAT, 'threshold': thr}, c['MODELS_DIR'] + 'feature_cols.pkl')
    df['late_risk_band'] = np.where(df['pred_late_prob'] >= thr, 'High', np.where(df['pred_late_prob'] >= thr / 2, 'Medium', 'Low'))
    save_json(metrics, c['PROC_DIR'] + 'classifier_metrics.json')
    out_cols = [c['ID'], c['DATE'], c['LANE'], c['CUSTOMER'], 'late_flag', 'pred_late_prob', 'pred_late', 'late_risk_band', 'pred_split']
    save_df(df[out_cols], c['PROC_DIR'] + 'ml_task1_output.csv')
    save_df(df, c['ENRICHED_CSV'])
    return df
