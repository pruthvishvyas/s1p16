# Freight Operations - Your Business Dashboard

## What this is
Your private business analytics dashboard. It shows you what is happening in your business, helps you decide what to do about it, and tracks whether you are on target - all in one place.

## Your 3 sections
**UNDERSTAND** - See your key numbers, charts, and any unusual patterns
**DECIDE** - Read insights and recommendations written in plain English
**MONITOR** - Track forecasts, set targets, and get alerts automatically

## New here? Start with the User Manual tab
Click "User Manual" in the sidebar. It explains every section in plain English.

## Deployment Checklist
- [ ] npm install (run once - generates package-lock.json)
- [ ] wrangler.toml: name = "s1p16", main before [site], bucket = "./dist"
- [ ] npm run build -> check the dist/ folder was created
- [ ] npx wrangler deploy -> note the live URL
- [ ] Optional: wrangler secret put FORECAST_LOOKUP (the forecast lookup works without it, from the deployed forecast file)
- [ ] Test: open the live URL -> dashboard loads with data
- [ ] Test: open the live URL + /mcp -> MCP manifest appears

## How to run locally
1. npm install
2. npm run dev -> open http://localhost:5173

## How to deploy
1. npm run build
2. npx wrangler deploy
-> Live at: https://s1p16.<your-account>.workers.dev

## MCP Integration (for Claude)
Add this URL to Claude as an MCP connector: https://s1p16.<your-account>.workers.dev/mcp
Claude can then read your live business data (read-only).

## How to update your dashboard
1. Run the pipeline: python main.py
2. Then: python export_for_frontend.py
3. Then: python generate_react_frontend.py (refreshes public/data)
4. Then: npm run build && npx wrangler deploy

## Access control
No login screens exist in this app. Protect the site with Cloudflare Zero Trust (Access).
