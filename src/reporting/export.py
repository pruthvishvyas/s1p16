from src.utils import *

def export(df, config):
    c = config
    cur = '$' if c['CURRENCY'] == 'USD' else c['CURRENCY'] + ' '
    as_of = df[c['DATE']].max()
    tot_rev, tot_np = float(df[c['REV']].sum()), float(df['net_profit'].sum())
    w30 = window(df, c, 30)
    kpi = pd.DataFrame([
        ('Period', str(df[c['DATE']].min())[:10] + ' to ' + str(as_of)[:10]), ('Shipments', len(df)),
        ('Freight Revenue', round(tot_rev, 2)), ('Total Cost', round(float(df[c['COST']].sum()), 2)),
        ('Late Penalties + Claims', round(float(df['penalty_claims'].sum()), 2)), ('Net Profit', round(tot_np, 2)),
        ('Net Margin %', round(100 * tot_np / max(tot_rev, 1.0), 2)), ('On-Time %', round(100 * (1 - df['late_flag'].mean()), 2)),
        ('Avg Load Factor %', round(float(df[c['LOAD']].mean()), 2)),
        ('Empty Return Ratio %', round(100 * float(df[c['EMPTY_KM']].sum()) / max(float(df[c['DIST']].sum()), 1.0), 2)),
        ('Outstanding Receivables', round(float(df[c['AR']].sum()), 2)), ('Last 30d Revenue', round(float(w30[c['REV']].sum()), 2)),
        ('P1 Urgent Shipments', int((df['priority'] == 'P1_URGENT').sum()) if 'priority' in df.columns else 0),
        ('Anomalous Shipments', int(df['is_anomaly'].sum()) if 'is_anomaly' in df.columns else 0)], columns=['Metric', 'Value'])
    rd = lambda name: pd.read_csv(c['PROC_DIR'] + name) if os.path.exists(c['PROC_DIR'] + name) else pd.DataFrame()
    lane_sc, cust_sc, fc = rd('lane_scorecard.csv'), rd('customer_scorecard.csv'), rd('forecast_output.csv')
    reason = df[df['late_flag'] == 1].groupby(c['DELAY_REASON']).agg(late_shipments=('late_flag', 'size'), penalties_claims=('penalty_claims', 'sum')).sort_values('penalties_claims', ascending=False).reset_index()
    mode = df.groupby(c['MODE']).agg(shipments=(c['ID'], 'count'), on_time_pct=('late_flag', lambda x: 100 * (1 - x.mean())), net_profit=('net_profit', 'sum')).reset_index()
    path = c['REPORTS_DIR'] + c['CLIENT_ID'] + '_report.xlsx'
    with pd.ExcelWriter(path, engine='openpyxl') as xw:
        kpi.to_excel(xw, sheet_name='Network Summary', index=False)
        lane_sc.to_excel(xw, sheet_name='Lane Performance', index=False)
        cust_sc.to_excel(xw, sheet_name='Customer & Cash', index=False)
        reason.to_excel(xw, sheet_name='Delivery Performance', index=False)
        mode.to_excel(xw, sheet_name='Delivery Performance', index=False, startrow=len(reason) + 3)
        if 'priority' in df.columns:
            al = df[df['priority'].isin(['P1_URGENT', 'P2_HIGH'])].sort_values(['priority_score', 'net_profit'], ascending=[False, True])
            al[[c['ID'], c['DATE'], c['LANE'], c['CUSTOMER'], 'priority', 'alerts', 'recommendations', 'net_profit']].head(5000).to_excel(xw, sheet_name='Action List', index=False)
        fc.to_excel(xw, sheet_name='Revenue Forecast', index=False)
        if len(df) <= 200000:
            df.to_excel(xw, sheet_name='Full Dataset', index=False)
    print('Excel ->', path)
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots
        fig = make_subplots(rows=2, cols=2, subplot_titles=['Monthly revenue', 'Net margin % by lane (top 10 by revenue)', 'Weekly on-time %', 'Shipments by priority'])
        mo = df.groupby('ship_month')[c['REV']].sum()
        fig.add_trace(go.Bar(x=mo.index, y=mo.values, name='Revenue'), row=1, col=1)
        lt = lane_table(df, c).sort_values('revenue', ascending=False).head(10)
        fig.add_trace(go.Bar(x=lt[c['LANE']], y=lt['net_margin_pct'], name='Net margin %'), row=1, col=2)
        wk = df.groupby(df[c['DATE']].dt.to_period('W').dt.start_time)['late_flag'].mean()
        fig.add_trace(go.Scatter(x=wk.index, y=100 * (1 - wk.values), mode='lines+markers', name='On-time %'), row=2, col=1)
        if 'priority' in df.columns:
            pc = df['priority'].value_counts().sort_index()
            fig.add_trace(go.Bar(x=pc.index, y=pc.values, name='Shipments'), row=2, col=2)
        fig.update_layout(height=800, title=c['CLIENT_NAME'] + ' - Interactive Dashboard', showlegend=False)
        fig.write_html(c['REPORTS_DIR'] + 'interactive_dashboard.html')
        print('Dashboard ->', c['REPORTS_DIR'] + 'interactive_dashboard.html')
    except Exception as e:
        print('Plotly dashboard skipped:', e)
    print('=' * 60)
    print(c['CLIENT_NAME'].upper() + ' - PIPELINE SUMMARY')
    print('=' * 60)
    print('Shipments:', len(df), '| Revenue:', cur + format(tot_rev, ',.0f'), '| Net profit:', cur + format(tot_np, ',.0f'))
    print('On-time %:', round(100 * (1 - df['late_flag'].mean()), 1), '| Anomalies:', int(df['is_anomaly'].sum()) if 'is_anomaly' in df.columns else 0,
          '| P1 shipments:', int((df['priority'] == 'P1_URGENT').sum()) if 'priority' in df.columns else 0)
    print('=' * 60)
