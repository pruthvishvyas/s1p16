from src.utils import *

def run_eda(df, config):
    c = config
    plt.rcParams.update({'figure.dpi': 150, 'axes.spines.top': False, 'axes.spines.right': False})

    def _save(name):
        plt.tight_layout()
        plt.savefig(c['REPORTS_DIR'] + name + '.png', dpi=150)
        plt.show()
        plt.close('all')
        print('saved', name)

    # Chart 1 -> UNDERSTAND: Which lanes drive 80% of my revenue?
    try:
        lane = df.groupby(c['LANE'])[c['REV']].sum().sort_values(ascending=False)
        cum = lane.cumsum() / lane.sum() * 100
        n80 = int((cum < 80).sum() + 1)
        top = lane.head(15)
        fig, ax = plt.subplots(figsize=(11, 5))
        ax.bar(range(len(top)), top.values, color='#1f77b4')
        ax.set_xticks(range(len(top)))
        ax.set_xticklabels(top.index, rotation=60, ha='right', fontsize=8)
        ax.set_ylabel('Revenue')
        ax2 = ax.twinx()
        ax2.plot(range(len(top)), cum.head(15).values, color='#d62728', marker='o')
        ax2.axhline(80, ls='--', color='grey')
        ax2.set_ylim(0, 105)
        ax2.set_ylabel('Cumulative % of revenue')
        ax.set_title('[UNDERSTAND] Which lanes drive 80% of revenue? ' + str(n80) + ' of ' + str(len(lane)) + ' lanes')
        _save('eda_01_lane_revenue_pareto')
    except Exception as e:
        print('Chart 1 skipped:', e)

    # Chart 2 -> UNDERSTAND: Where (service x carrier) do I earn or lose net margin?
    try:
        g = df.groupby([c['MODE'], c['CARRIER']])[['net_profit', c['REV']]].sum()
        m = (g['net_profit'] / g[c['REV']].replace(0, np.nan) * 100).unstack(c['CARRIER'])
        fig, ax = plt.subplots(figsize=(9, 5))
        im = ax.imshow(m.values, cmap='RdYlGn', aspect='auto')
        ax.set_xticks(range(m.shape[1]))
        ax.set_xticklabels(m.columns, rotation=30, ha='right')
        ax.set_yticks(range(m.shape[0]))
        ax.set_yticklabels(m.index)
        for i in range(m.shape[0]):
            for j in range(m.shape[1]):
                v = m.values[i, j]
                if not np.isnan(v):
                    ax.text(j, i, str(round(v, 1)) + '%', ha='center', va='center', fontsize=9)
        plt.colorbar(im, label='Net margin %')
        ax.set_title('[UNDERSTAND] Which service mode x carrier type earns the best net margin?')
        _save('eda_02_margin_service_carrier')
    except Exception as e:
        print('Chart 2 skipped:', e)

    # Chart 3 -> DECIDE: Which delay causes cost me the most?
    try:
        lt = df[df['late_flag'] == 1]
        if len(lt) == 0:
            raise ValueError('no late shipments')
        r = lt.groupby(c['DELAY_REASON']).agg(cnt=('late_flag', 'size'), cost=('penalty_claims', 'sum')).sort_values('cost', ascending=False).head(8)
        fig, axs = plt.subplots(1, 2, figsize=(12, 5))
        axs[0].barh(r.index[::-1], r['cnt'].values[::-1], color='#ff7f0e')
        axs[0].set_title('Late shipments by reason')
        axs[1].barh(r.index[::-1], r['cost'].values[::-1], color='#d62728')
        axs[1].set_title('Penalties + claims by reason')
        fig.suptitle('[DECIDE] Which delay causes cost me the most?')
        _save('eda_03_delay_reason_cost')
    except Exception as e:
        print('Chart 3 skipped:', e)

    # Chart 4 -> DECIDE: Does an under-filled truck really cost margin?
    try:
        s = df.sample(min(len(df), 3000), random_state=c['RANDOM_STATE'])
        fig, ax = plt.subplots(figsize=(9, 5))
        for flag, col, lab in [(0, '#2ca02c', 'On time'), (1, '#d62728', 'Late')]:
            sub = s[s['late_flag'] == flag]
            ax.scatter(sub[c['LOAD']], sub['net_margin_pct'].clip(-60, 60), s=8, alpha=0.5, color=col, label=lab)
        ax.axvline(c['THRESHOLDS']['load_factor_min'], ls='--', color='grey')
        ax.axhline(0, color='black', lw=0.6)
        ax.set_xlabel('Load factor %')
        ax.set_ylabel('Net margin %')
        ax.legend()
        ax.set_title('[DECIDE] Does an under-filled load cost margin? (dashed = load floor)')
        _save('eda_04_load_vs_margin')
    except Exception as e:
        print('Chart 4 skipped:', e)

    # Chart 5 -> UNDERSTAND: What drives profit and lateness?
    try:
        cols = [c['DIST'], c['WEIGHT'], c['LOAD'], c['EMPTY_KM'], c['PLAN_DAYS'], c['ACT_DAYS'], c['REV'], c['COST'], 'net_profit', 'net_margin_pct', 'late_flag']
        cols = [x for x in cols if x in df.columns and df[x].nunique() > 1]
        corr = df[cols].corr()
        mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
        mm = np.ma.array(corr.values, mask=mask)
        fig, ax = plt.subplots(figsize=(9, 7))
        im = ax.imshow(mm, cmap='RdYlGn', vmin=-1, vmax=1)
        ax.set_xticks(range(len(cols)))
        ax.set_xticklabels(cols, rotation=60, ha='right', fontsize=8)
        ax.set_yticks(range(len(cols)))
        ax.set_yticklabels(cols, fontsize=8)
        for i in range(len(cols)):
            for j in range(i + 1):
                ax.text(j, i, str(round(corr.values[i, j], 2)), ha='center', va='center', fontsize=7)
        plt.colorbar(im)
        ax.set_title('[UNDERSTAND] What drives profit and lateness? (correlations)')
        _save('eda_05_correlation')
    except Exception as e:
        print('Chart 5 skipped:', e)

    # Chart 6 -> DECIDE: Which shippers hold my cash?
    try:
        a = df.groupby(c['CUSTOMER']).agg(ar=(c['AR'], 'sum'), over=('pay_days_over_terms', 'mean')).sort_values('ar', ascending=False).head(10)
        fig, axs = plt.subplots(1, 2, figsize=(12, 5))
        axs[0].barh(a.index[::-1], a['ar'].values[::-1], color='#9467bd')
        axs[0].set_title('Outstanding receivables')
        axs[1].barh(a.index[::-1], a['over'].fillna(0).values[::-1], color='#8c564b')
        axs[1].axvline(0, color='black', lw=0.6)
        axs[1].set_title('Avg days paid beyond terms')
        fig.suptitle('[DECIDE] Which shippers are holding my cash?')
        _save('eda_06_customer_cash')
    except Exception as e:
        print('Chart 6 skipped:', e)

    # Chart 7 -> MONITOR: Is revenue and on-time delivery on track?
    try:
        w = df.groupby(df[c['DATE']].dt.to_period('W').dt.start_time).agg(rev=(c['REV'], 'sum'), late=('late_flag', 'mean'))
        fig, ax = plt.subplots(figsize=(11, 5))
        ax.plot(w.index, w['rev'], color='#1f77b4', marker='o')
        ax.set_ylabel('Weekly revenue')
        ax2 = ax.twinx()
        ax2.plot(w.index, 100 * (1 - w['late']), color='#2ca02c', marker='s')
        ax2.axhline(c['THRESHOLDS']['on_time_target_pct'], ls='--', color='red')
        ax2.set_ylabel('On-time %  (red = target)')
        ax.set_title('[MONITOR] Is revenue and on-time delivery on track?')
        _save('eda_07_weekly_revenue_otd')
    except Exception as e:
        print('Chart 7 skipped:', e)
