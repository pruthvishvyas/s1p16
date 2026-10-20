export function kpiDefs(term) {
  const R = term('revenue')
  const C = term('customer', { plural: true })
  const L = term('product', { plural: true })
  const T = term('transaction', { plural: true })
  return [
    { key: 'total_revenue', label: 'Total ' + R, format: 'money', group: 'Money' },
    { key: 'net_profit', label: 'Net profit', format: 'money', group: 'Money' },
    { key: 'net_margin_pct', label: 'Net margin', format: 'pct', group: 'Money' },
    { key: 'revenue_last_30d', label: R + ' (last 30 days)', format: 'money', group: 'Money' },
    { key: 'net_margin_last_30d_pct', label: 'Net margin (last 30 days)', format: 'pct', group: 'Money' },
    { key: 'total_cost', label: 'Total cost', format: 'money', group: 'Money' },
    { key: 'late_penalties', label: 'Late penalties paid', format: 'money', group: 'Money', tone: 'danger' },
    { key: 'claims', label: 'Claims paid', format: 'money', group: 'Money', tone: 'danger' },
    { key: 'on_time_pct', label: 'On-time delivery', format: 'pct', group: 'Delivery' },
    { key: 'on_time_last_30d_pct', label: 'On-time (last 30 days)', format: 'pct', group: 'Delivery' },
    { key: 'p1_urgent_shipments', label: 'Urgent ' + T.toLowerCase(), format: 'int', group: 'Delivery', tone: 'danger' },
    { key: 'anomalous_shipments', label: 'Unusual ' + T.toLowerCase(), format: 'int', group: 'Delivery' },
    { key: 'outstanding_ar', label: 'Money still owed to you', format: 'money', group: 'Cash' },
    { key: 'overdue_ar', label: 'Overdue invoices', format: 'money', group: 'Cash', tone: 'danger' },
    { key: 'avg_days_to_pay', label: 'Average days to get paid', format: 'days', group: 'Cash' },
    { key: 'total_shipments', label: 'Total ' + T, format: 'int', group: 'Network' },
    { key: 'active_lanes', label: 'Active ' + L, format: 'int', group: 'Network' },
    { key: 'active_customers', label: 'Active ' + C, format: 'int', group: 'Network' },
    { key: 'avg_load_factor_pct', label: 'Average load factor', format: 'pct', group: 'Network' },
    { key: 'empty_return_ratio_pct', label: 'Empty return distance', format: 'pct', group: 'Network' },
    { key: 'late_model_auc', label: 'Late-risk model accuracy (AUC)', format: 'num', group: 'Models' },
    { key: 'late_model_recall', label: 'Late deliveries the model catches', format: 'ratio', group: 'Models' },
    { key: 'forecast_method', label: 'Forecast method', format: 'text', group: 'Models' }
  ]
}

export const KPI_GROUP_ORDER = ['Money', 'Delivery', 'Cash', 'Network', 'Models', 'Other']
