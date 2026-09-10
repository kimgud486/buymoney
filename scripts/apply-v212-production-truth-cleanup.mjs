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

    if (ch === '"' || ch === "'" || ch === "`") {
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

replaceExpressRoute("get", "/api/search/theme", `app.get("/api/search/theme", (_req, res) => {
  return res.status(503).json({
    error: "VERIFIED_THEME_DATA_REQUIRED",
    dataStatus: "NO_DATA",
    provider: null,
    stocks: [],
    relatedStocks: [],
    news: [],
    message: "Theme intelligence is fail-closed until verified market/news providers supply the result. AI-generated prices, flows, news and scores are not used as facts."
  });
});`);

replaceExpressRoute("get", "/api/market/arbitrage", (_req => `app.get("/api/market/arbitrage", (_req, res) => {
  return res.status(503).json({
    error: "VERIFIED_ARBITRAGE_DATA_REQUIRED",
    dataStatus: "NO_DATA",
    provider: null,
    opportunities: [],
    message: "Arbitrage output is disabled until both venue prices and FX are verified live inputs."
  });
});`)());

fs.writeFileSync(FILE, source);
console.log("V21.2 production truth cleanup applied.");
