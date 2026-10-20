import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id"
};

const PROJECT_NAME = "Freight Operations";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (method === "POST" && url.pathname === "/api") {
      return handleForecast(request, env, ctx);
    }
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return handleMCP(request, env, ctx, url);
    }
    return serveAsset(request, env, ctx);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: CORS });
}

// ---- static assets with SPA fallback ----
async function serveAsset(request, env, ctx) {
  const options = {
    ASSET_NAMESPACE: env.__STATIC_CONTENT,
    ASSET_MANIFEST: assetManifest,
    mapRequestToAsset: (req) => {
      const u = new URL(req.url);
      if (!u.pathname.includes(".")) {
        u.pathname = "/index.html";
        return new Request(u.toString(), req);
      }
      return req;
    }
  };
  if (new URL(request.url).pathname.startsWith("/data/")) {
    options.cacheControl = { browserTTL: 0, edgeTTL: 0, bypassCache: true };
  }
  try {
    return await getAssetFromKV({ request, waitUntil: ctx.waitUntil.bind(ctx) }, options);
  } catch (e) {
    if (new URL(request.url).pathname.startsWith("/data/")) {
      return new Response("Not found", { status: 404 });
    }
    try {
      const fallback = new Request(new URL("/index.html", request.url).toString(), request);
      const res = await getAssetFromKV(
        { request: fallback, waitUntil: ctx.waitUntil.bind(ctx) },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
      );
      return new Response(res.body, { status: 200, headers: res.headers });
    } catch (e2) {
      return new Response("Not found", { status: 404 });
    }
  }
}

// read one of the deployed static JSON files (same asset store, no network hop)
async function fetchStatic(request, env, ctx, path) {
  try {
    const req = new Request(new URL(path, request.url).toString(), { method: "GET" });
    const res = await getAssetFromKV(
      { request: req, waitUntil: ctx.waitUntil.bind(ctx) },
      { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest, cacheControl: { browserTTL: 0, edgeTTL: 0, bypassCache: true } }
    );
    return JSON.parse(await res.text());
  } catch (e) {
    return null;
  }
}

// ---- Forecaster API: POST /api  { "input": <days ahead> } ----
async function buildLookup(request, env, ctx) {
  if (env.FORECAST_LOOKUP) {
    try {
      return JSON.parse(env.FORECAST_LOOKUP);
    } catch (e) {
      throw new Error("FORECAST_LOOKUP secret is not valid JSON");
    }
  }
  const data = await fetchStatic(request, env, ctx, "/data/monitor/forecast.json");
  const rows = data && Array.isArray(data.forecast) ? data.forecast : [];
  if (rows.length === 0) return null;
  const out = {};
  rows.forEach((r, i) => {
    out[String(i + 1)] = { value: r.forecast_revenue, confidence: 0.8, range_low: r.lower_80, range_high: r.upper_80, date: r.date };
  });
  return out;
}

async function handleForecast(request, env, ctx) {
  try {
    const body = await request.json().catch(() => ({}));
    const inputVal = Number(body.input);
    if (body.input === undefined || body.input === null || body.input === "" || isNaN(inputVal)) {
      return json({ error: "Invalid input value. Must be a number (days ahead)." }, 400);
    }
    const lookup = await buildLookup(request, env, ctx);
    if (!lookup) {
      return json({ error: "Forecast data not available. Run the pipeline, export, and redeploy (or set secret FORECAST_LOOKUP)." }, 503);
    }
    const keys = Object.keys(lookup).map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    if (keys.length === 0) {
      return json({ error: "Forecast lookup table is empty." }, 503);
    }
    const nearest = keys.reduce((a, b) => (Math.abs(b - inputVal) < Math.abs(a - inputVal) ? b : a));
    const result = lookup[String(nearest)];
    const isObj = result !== null && typeof result === "object";
    return json({
      prediction: isObj ? (result.value ?? null) : (result ?? null),
      confidence: isObj ? (result.confidence ?? null) : null,
      range_low: isObj ? (result.range_low ?? null) : null,
      range_high: isObj ? (result.range_high ?? null) : null,
      date: isObj ? (result.date ?? null) : null,
      input_received: inputVal,
      nearest_key: nearest
    }, 200);
  } catch (e) {
    return json({ error: "Forecast error: " + e.message }, 500);
  }
}

// ---- MCP (read-only). GET /mcp = manifest, POST /mcp = {tool} or JSON-RPC (initialize / tools/list / tools/call) ----
const TOOLS = [
  { name: "get_kpis", description: "Get all current KPI values for " + PROJECT_NAME, path: "/data/understand/kpis.json" },
  { name: "get_insights", description: "Get business insights ranked by severity (HIGH/MEDIUM/LOW)", path: "/data/decide/insights.json", severity: true },
  { name: "get_anomalies", description: "Get detected anomalies and unusual business patterns", path: "/data/understand/anomalies.json" },
  { name: "get_recommendations", description: "Get prioritized action recommendations", path: "/data/decide/recommendations.json" },
  { name: "get_forecast", description: "Get the latest forecast data and predictions", path: "/data/monitor/forecast.json" },
  { name: "get_alerts", description: "Get active monitoring alerts", path: "/data/monitor/alerts.json" },
  { name: "get_goal_progress", description: "Get progress of actuals against targets", path: "/data/monitor/goal_progress.json" },
  { name: "get_summary", description: "Get pipeline run summary and data freshness info", path: "summary" }
];

function toolManifest() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.severity
      ? { type: "object", properties: { severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "ALL"], default: "ALL" } }, required: [] }
      : { type: "object", properties: {}, required: [] }
  }));
}

async function runTool(name, params, request, env, ctx) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { error: 'Unknown tool: "' + name + '". Call GET /mcp for available tools.', status: 400 };
  if (tool.path === "summary") {
    const log = await fetchStatic(request, env, ctx, "/data/meta/run_log.json");
    const summary = await fetchStatic(request, env, ctx, "/data/meta/summary.json");
    return { result: { run_log: log, summary: summary } };
  }
  const data = await fetchStatic(request, env, ctx, tool.path);
  if (!data) return { error: "Data not available for " + name + ". Run the pipeline, export, and redeploy.", status: 503 };
  if (tool.severity) {
    const sev = String((params && params.severity) || "ALL").toUpperCase();
    const filtered = sev === "ALL" || !Array.isArray(data) ? data : data.filter((i) => i.severity === sev);
    return { result: filtered, filter: sev };
  }
  return { result: data };
}

async function handleMCP(request, env, ctx, url) {
  const method = request.method;
  if (method === "GET") {
    return json({
      name: PROJECT_NAME + " Analytics MCP",
      description: "Read-only business analytics tools for " + PROJECT_NAME,
      version: "1.0.0",
      tools: toolManifest()
    }, 200);
  }
  if (method !== "POST") {
    return json({ error: "MCP: use GET /mcp for the manifest, POST /mcp to call tools." }, 405);
  }
  try {
    const body = await request.json().catch(() => ({}));

    // JSON-RPC (standard MCP clients)
    if (body && body.jsonrpc === "2.0" && body.method) {
      const id = body.id === undefined ? null : body.id;
      const rpc = (result) => json({ jsonrpc: "2.0", id: id, result: result }, 200);
      const rpcErr = (code, message) => json({ jsonrpc: "2.0", id: id, error: { code: code, message: message } }, 200);
      if (body.method.startsWith("notifications/")) return new Response(null, { status: 202, headers: CORS });
      if (body.method === "initialize") {
        return rpc({
          protocolVersion: (body.params && body.params.protocolVersion) || "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: PROJECT_NAME + " Analytics MCP", version: "1.0.0" }
        });
      }
      if (body.method === "ping") return rpc({});
      if (body.method === "tools/list") return rpc({ tools: toolManifest() });
      if (body.method === "tools/call") {
        const p = body.params || {};
        const out = await runTool(p.name, p.arguments || {}, request, env, ctx);
        if (out.error) return rpc({ content: [{ type: "text", text: out.error }], isError: true });
        return rpc({ content: [{ type: "text", text: JSON.stringify(out.result) }] });
      }
      return rpcErr(-32601, "Method not found: " + body.method);
    }

    // simple form: { "tool": "get_kpis", "params": {} }
    const name = body.tool || body.name || "";
    const out = await runTool(name, body.params || body.arguments || {}, request, env, ctx);
    if (out.error) return json({ error: out.error }, out.status || 500);
    return json({ tool: name, result: out.result, filter: out.filter }, 200);
  } catch (e) {
    return json({ error: "MCP error: " + e.message }, 500);
  }
}
