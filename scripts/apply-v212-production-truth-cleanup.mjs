import fs from "node:fs";

const FILE = "server.ts";
let source = fs.readFileSync(FILE, "utf8");

function replaceExpressRoute(method, route, replacement) {
  const marker = `app.${method}("${route}"`;
  const start = source.indexOf(marker);
  if (start < 0) {
    console.log(`skip: ${marker} not found`);
    return;
  }

  let quote = null;
  let escaped = false;
  let parenDepth = 0;
  let started = false;
  let end = -1;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (ch === "(") {
      parenDepth += 1;
      started = true;
    } else if (ch === ")") {
      parenDepth -= 1;
      if (started && parenDepth === 0) {
        let j = i + 1;
        while (/\s/.test(source[j] || "")) j += 1;
        if (source[j] === ";") j += 1;
        end = j;
        break;
      }
    }
  }

  if (end < 0) throw new Error(`Unable to locate end of ${marker}`);
  source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  console.log(`replaced ${method.toUpperCase()} ${route}`);
}

function replaceSection(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    console.log(`skip section: ${startMarker}`);
    return;
  }
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Unable to locate section end: ${endMarker}`);
  source = `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
  console.log(`replaced section starting ${startMarker}`);
}

replaceExpressRoute("post", "/api/backtest", `app.post("/api/backtest", (_req, res) => {
  return res.status(410).json({
    error: "SYNTHETIC_BACKTEST_REMOVED",
    dataStatus: "NO_DATA",
    message: "Production synthetic backtest was removed. Only verified historical market candles may be used for backtesting."
  });
});`);

replaceExpressRoute("post", "/api/legacy/simulated-autotrade/order", `app.post("/api/legacy/simulated-autotrade/order", (_req, res) => {
  return res.status(410).json({
    error: "SIMULATED_AUTOTRADE_REMOVED",
    dataStatus: "NO_DATA",
    message: "Legacy simulated order execution is disabled in production."
  });
});`);

replaceExpressRoute("get", "/api/legacy/simulated-autotrade/status", `app.get("/api/legacy/simulated-autotrade/status", (_req, res) => {
  return res.status(410).json({
    active: false,
    error: "SIMULATED_AUTOTRADE_REMOVED",
    dataStatus: "NO_DATA"
  });
});`);

replaceSection(
  "// Deep Theme & Sector Search Endpoint (/api/search/theme?q=전고체배터리)",
  "// ----------------------------------------------------------------------\n// CROSS-MARKET ARBITRAGE OPPORTUNITY & KIMCHI PREMIUM ENGINE (/api/market/arbitrage)",
  `// Deep Theme & Sector Search Endpoint - REAL DATA ONLY\napp.get("/api/search/theme", (_req, res) => {\n  return res.status(503).json({\n    error: "VERIFIED_THEME_DATA_REQUIRED",\n    dataStatus: "NO_DATA",\n    provider: null,\n    stocks: [],\n    relatedStocks: [],\n    news: [],\n    message: "Theme intelligence is fail-closed until verified market/news providers supply the result. AI-generated prices, flows, news and scores are not used as facts."\n  });\n});`
);

replaceSection(
  "// ----------------------------------------------------------------------\n// CROSS-MARKET ARBITRAGE OPPORTUNITY & KIMCHI PREMIUM ENGINE (/api/market/arbitrage)",
  "// ----------------------------------------------------------------------\n// MARKET SYNCHRONIZATION OVERLAY VIEWER DATA (/api/market/sync-overlay)",
  `// ----------------------------------------------------------------------\n// CROSS-MARKET ARBITRAGE - VERIFIED LIVE INPUTS REQUIRED\n// ----------------------------------------------------------------------\napp.get("/api/market/arbitrage", (_req, res) => {\n  return res.status(503).json({\n    error: "VERIFIED_ARBITRAGE_DATA_REQUIRED",\n    dataStatus: "NO_DATA",\n    provider: null,\n    opportunities: [],\n    message: "Arbitrage output is disabled until both venue prices and FX are verified live inputs."\n  });\n});`
);

replaceSection(
  "// ----------------------------------------------------------------------\n// MARKET SYNCHRONIZATION OVERLAY VIEWER DATA (/api/market/sync-overlay)",
  "// AI 6-Core Quant Algorithm Suite Execution Endpoint",
  `// ----------------------------------------------------------------------\n// MARKET SYNCHRONIZATION OVERLAY - VERIFIED LIVE INPUTS REQUIRED\n// ----------------------------------------------------------------------\napp.get("/api/market/sync-overlay", (_req, res) => {\n  return res.status(503).json({\n    error: "VERIFIED_SYNC_OVERLAY_DATA_REQUIRED",\n    dataStatus: "NO_DATA",\n    provider: null,\n    timeline: [],\n    message: "Synthetic synchronized timelines were removed from production."\n  });\n});`
);

replaceSection(
  "// AI 6-Core Quant Algorithm Suite Execution Endpoint",
  "// AI Chat Explainer Endpoint using Gemini",
  `// AI 6-Core Quant Algorithm Suite - VERIFIED FEATURE INPUTS REQUIRED\napp.post("/api/ai/algorithm-suite", (_req, res) => {\n  return res.status(503).json({\n    error: "VERIFIED_ALGORITHM_INPUTS_REQUIRED",\n    dataStatus: "NO_DATA",\n    signal: "WAIT",\n    message: "Synthetic VIX, win-rate, timeframe, orderbook and correlation inputs were removed from production."\n  });\n});`
);

fs.writeFileSync(FILE, source);
console.log("V21.2 production truth cleanup applied.");
