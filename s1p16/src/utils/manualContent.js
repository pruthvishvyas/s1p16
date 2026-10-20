export function buildManual(term, origin) {
  const R = term('revenue'), Rl = term('revenue', { lower: true })
  const C = term('customer'), Cp = term('customer', { plural: true })
  const L = term('product'), Lp = term('product', { plural: true })
  const T = term('transaction'), Tp = term('transaction', { plural: true })
  const sections = [
    { id: 'how', outcome: 'START', title: 'How to use this dashboard', items: [
      { h: 'Three questions, three sections', p: 'UNDERSTAND answers "What is happening in my business right now?". DECIDE answers "What should I do about it?". MONITOR answers "Am I on track without checking manually?". Use the menu on the left to move between them.' },
      { h: 'Where the numbers come from', p: 'Every number comes from your own ' + Tp.toLowerCase() + ' records, processed automatically. The top bar shows when the data was last refreshed.' },
      { h: 'Light and dark mode', p: 'Use the moon/sun button at the top right. Your choice is remembered on this device.' }
    ] },
    { id: 'kpis', outcome: 'UNDERSTAND', title: 'Your Numbers', items: [
      { h: 'What you see', p: 'Cards showing your total ' + Rl + ', profit, on-time delivery, money owed to you, and the size of your network (' + Lp.toLowerCase() + ', ' + Cp.toLowerCase() + ', ' + Tp.toLowerCase() + ').' },
      { h: 'What it means', p: 'Net profit is what is left after all costs, late penalties and claims. Net margin is net profit as a share of ' + Rl + '. A margin that is too low means you are working hard without keeping enough money.' },
      { h: 'What to do', p: 'Compare the "last 30 days" cards with the all-time cards. If recent numbers are worse, open DECIDE to see why.' }
    ] },
    { id: 'charts', outcome: 'UNDERSTAND', title: 'Analysis charts', items: [
      { h: 'Reading a bar chart', p: 'Each bar is one group (for example one ' + L.toLowerCase() + '). A longer bar means a bigger amount. Hover over a bar to see the exact figure.' },
      { h: 'Reading a line chart', p: 'The line shows how a number changes over time. Going up means growing; going down means shrinking. Look for sudden drops.' },
      { h: 'What to look for', p: 'A few ' + Lp.toLowerCase() + ' usually bring most of your ' + Rl + '. Protect those, and check whether the weakest groups can be fixed or dropped.' }
    ] },
    { id: 'segments', outcome: 'UNDERSTAND', title: 'Segments (' + Lp + ' grouped by performance)', items: [
      { h: 'What you see', p: 'Every ' + L.toLowerCase() + ' is placed in a group: Profit Engine (earns well), Core ' + L + ' (average) or Margin Drain (earns little or loses money).' },
      { h: 'What to do', p: 'Click a group name to filter the table. Start with the Margin Drain list: raise the price, cut cost, or stop serving the ' + L.toLowerCase() + '.' }
    ] },
    { id: 'anomalies', outcome: 'UNDERSTAND', title: 'Unusual ' + Tp.toLowerCase(), items: [
      { h: 'What you see', p: 'A list of ' + Tp.toLowerCase() + ' that do not look like your normal business, with a plain reason (for example "cost per km unusually high").' },
      { h: 'What to do', p: 'Check the biggest ones first. They are either real problems (a loss-making job) or data-entry mistakes that distort your reports.' }
    ] },
    { id: 'insights', outcome: 'DECIDE', title: 'Insights', items: [
      { h: 'Severity explained', p: 'HIGH = needs attention this week. MEDIUM = review this month. LOW = good to know. Severity is ranked by how much money is at stake.' },
      { h: 'How to read a card', p: 'Finding = what the data shows. Evidence = the numbers behind it. What to do = the action for this week. Money at stake = the estimated amount involved.' }
    ] },
    { id: 'recs', outcome: 'DECIDE', title: 'Recommendations', items: [
      { h: 'Three lists', p: 'Action list for individual ' + Tp.toLowerCase() + ', then ' + Lp.toLowerCase() + ' that need repricing or service fixes, then ' + Cp.toLowerCase() + ' who need a conversation about price or payment.' },
      { h: 'Priority', p: 'P1 Urgent should be handled first, then P2 High. Priority is higher when several problems hit the same ' + T.toLowerCase() + '.' }
    ] },
    { id: 'whatif', outcome: 'DECIDE', title: 'What-If Simulator', items: [
      { h: 'How to use it', p: 'Pick a scenario, then move the slider. The cards and chart show the projected effect, for example what happens to profit if prices rise 5%.' },
      { h: 'Important', p: 'These are estimates based on your past data and stated assumptions (shown under each scenario). Use them to compare options, not as a guarantee.' }
    ] },
    { id: 'goals', outcome: 'DECIDE', title: 'Goals', items: [
      { h: 'What you see', p: 'Your targets: minimum margin, on-time target, alert thresholds, and an optional monthly ' + Rl + ' target.' },
      { h: 'Changing a target', p: 'Type a new value to preview it on this device. To make it permanent for every user, edit the goals file in the pipeline project and re-run it.' }
    ] },
    { id: 'forecast', outcome: 'MONITOR', title: 'Forecast', items: [
      { h: 'What you see', p: 'Our prediction of your daily ' + Rl + ' for the coming weeks. The shaded band is the likely range: real results should land inside it about 4 times out of 5.' },
      { h: 'Quick lookup', p: 'Enter a number of days ahead to get the forecast for that day.' }
    ] },
    { id: 'progress', outcome: 'MONITOR', title: 'Goal progress', items: [
      { h: 'Status', p: 'ON TRACK means you meet the target. OFF TRACK means you are missing it. NOT SET means no target has been entered yet.' }
    ] },
    { id: 'alerts', outcome: 'MONITOR', title: 'Alerts', items: [
      { h: 'What you see', p: 'Warnings raised automatically when something crosses a limit: a sharp drop in ' + Rl + ', late deliveries, thin margin, or overdue invoices. Each alert says what to do.' },
      { h: 'No alerts', p: 'If the page says everything is within limits, nothing needs your attention right now.' }
    ] },
    { id: 'explorer', outcome: 'TOOLS', title: 'Explorer', items: [
      { h: 'What it is', p: 'A free-form way to slice your ' + Lp.toLowerCase() + '. Pick what to group by and what to measure.' },
      { h: 'Click to filter', p: 'Click any bar to filter everything else on the page to that group. Click it again, or use Clear filters, to go back.' },
      { h: 'Drill down', p: 'Clicking a bar also opens a side panel with the details for that group.' }
    ] },
    { id: 'claude', outcome: 'TOOLS', title: 'Connect to Claude', items: [
      { h: 'Read-only access', p: 'You can let Claude read this dashboard\'s data. Add this address as a connector in Claude: ' + origin + '/mcp . Claude can only read, never change anything.' }
    ] }
  ]
  const glossary = [
    { term: R, meaning: 'The money you bill your ' + Cp.toLowerCase() + ' for moving their freight.' },
    { term: C, meaning: 'The business that pays you to move freight.' },
    { term: L, meaning: 'A route from one hub to another.' },
    { term: T, meaning: 'One freight job from pickup to delivery.' },
    { term: 'Net margin', meaning: 'Profit left after all costs, penalties and claims, as a share of ' + Rl + '.' },
    { term: 'On-time delivery', meaning: 'Share of ' + Tp.toLowerCase() + ' delivered by the promised date.' },
    { term: 'Load factor', meaning: 'How full the truck or container was. Low numbers mean you are paying to move air.' },
    { term: 'Empty return', meaning: 'Distance a vehicle drives back with no cargo.' },
    { term: 'Outstanding receivables', meaning: 'Money ' + Cp.toLowerCase() + ' still owe you for delivered ' + Tp.toLowerCase() + '.' },
    { term: 'Anomaly', meaning: 'An unusual ' + T.toLowerCase() + ' that does not match your normal business behaviour.' },
    { term: 'Segment', meaning: 'A group of similar ' + Lp.toLowerCase() + ' that behave alike.' },
    { term: 'Forecast', meaning: 'Our prediction of your future ' + Rl + ' based on your historical patterns.' },
    { term: 'Simulation', meaning: 'A "what if" estimate of what would change if you changed one thing.' },
    { term: 'Bar chart / line chart', meaning: 'Bars compare groups; a line shows change over time.' },
    { term: 'Priority P1 / P2 / P3 / P4', meaning: 'How urgent a ' + T.toLowerCase() + ' is to fix: P1 first, P4 routine.' }
  ]
  return { sections, glossary }
}
