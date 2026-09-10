import fs from "node:fs";

const FILE = "server.ts";
let source = fs.readFileSync(FILE, "utf8");

const importMarker = 'import { KISBrokerGatewayV121 } from "./server/broker/KISBrokerGatewayV121";';
const imports = `${importMarker}\nimport { buildKISRuntimePanel } from "./server/broker/KISRuntimePanelV213";\nimport { probeKISDomesticRuntime } from "./server/broker/KISRuntimeProbeV213";`;
if (!source.includes('KISRuntimePanelV213')) {
  if (!source.includes(importMarker)) throw new Error("KIS gateway import marker not found");
  source = source.replace(importMarker, imports);
}

const routeMarker = '// Initialize Gemini SDK lazily';
const route = `// V21.3 KIS REAL ACCOUNT RUNTIME DIAGNOSTICS.\n// Read-only endpoint: never submits an order.\napp.get("/api/broker/v21/runtime", async (req, res) => {\n  const symbol = String(req.query.symbol || "005930").trim();\n  if (!/^\\d{6}$/.test(symbol)) {\n    return res.status(400).json({ error: "INVALID_KOREA_SYMBOL", dataStatus: "NO_DATA" });\n  }\n\n  const nowMs = Date.now();\n  const brokerConfigured = kisBrokerGateway.isConfigured();\n  const token = brokerConfigured ? await kisBrokerGateway.getOAuthToken(false) : null;\n  const oauthAuthenticated = Boolean(token);\n\n  const account = token\n    ? await kisBrokerGateway.getAccountBalance("KOREA", false)\n    : { success: false, depositKRW: 0, totalEvalAmt: 0, holdings: [], message: "KIS OAuth unavailable" };\n  const accountAsOf = account.success ? new Date(nowMs).toISOString() : null;\n\n  const probe = token\n    ? await probeKISDomesticRuntime({ symbol, token, nowMs })\n    : {\n        quoteSuccess: false, quoteAsOf: null, lastPrice: null, marketSession: "UNKNOWN" as const,\n        orderableSuccess: false, orderableCash: null, orderableQty: null, errors: ["KIS OAuth unavailable"],\n      };\n\n  const side = String(req.query.side || "").toUpperCase();\n  const qty = Number(req.query.qty);\n  const orderType = String(req.query.orderType || "LIMIT").toUpperCase();\n  const price = Number(req.query.price);\n  const hasIntent = (side === "BUY" || side === "SELL") && Number.isInteger(qty) && qty > 0;\n  const intent = hasIntent ? {\n    symbol,\n    market: "KOREA" as const,\n    side: side as "BUY" | "SELL",\n    orderType: orderType === "MARKET" ? "MARKET" as const : "LIMIT" as const,\n    qty,\n    ...(orderType === "MARKET" ? {} : { price }),\n  } : null;\n\n  const panel = buildKISRuntimePanel({\n    brokerConfigured,\n    oauthAuthenticated,\n    accountSuccess: account.success,\n    accountAsOf,\n    depositKRW: account.success ? account.depositKRW : null,\n    totalEvalAmt: account.success ? account.totalEvalAmt : null,\n    holdings: account.success ? account.holdings : [],\n    quoteSuccess: probe.quoteSuccess,\n    quoteAsOf: probe.quoteAsOf,\n    lastPrice: probe.lastPrice,\n    marketSession: probe.marketSession,\n    orderableCash: probe.orderableSuccess ? probe.orderableCash : null,\n    orderableQty: probe.orderableSuccess ? probe.orderableQty : null,\n    symbol,\n    intent,\n    nowMs,\n  });\n\n  return res.json({\n    ...panel,\n    diagnostics: {\n      accountMessage: account.message,\n      probeErrors: probe.errors,\n    },\n    safety: {\n      readOnly: true,\n      automaticOrderSubmission: false,\n      userConfirmationRequired: true,\n    },\n  });\n});\n\n`;

if (!source.includes('/api/broker/v21/runtime')) {
  if (!source.includes(routeMarker)) throw new Error("route insertion marker not found");
  source = source.replace(routeMarker, route + routeMarker);
}

fs.writeFileSync(FILE, source);
console.log("V21.3 KIS runtime panel route applied.");
