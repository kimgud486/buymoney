#!/usr/bin/env node
import fs from "node:fs";

const path = "server.ts";
let s = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  if (!s.includes(before)) {
    throw new Error(`[V21.7] marker not found: ${label}`);
  }
  s = s.replace(before, after);
  console.log(`✅ ${label}`);
}

replaceOnce(
  "Cloud Run PORT",
  'const PORT = 3000;',
  'const PORT = Number(process.env.PORT || 3000);'
);

replaceOnce(
  "disable simulated safety bypass",
  `    // If this is a SIMULATED trade (isRealTrade === false or isSimulated === true), pass safety check cleanly\n    const isSimulatedTrade = !isRealTrade || req.body?.isSimulated === true || isRealTrade === "false" || req.body?.strictReal === false;\n    if (isSimulatedTrade) {\n      console.log(\`[SafetyCheck] Trade for \${symbol} is in SIMULATED mode. Bypassing real broker balance queries.\`);\n      return next();\n    }`,
  `    // V21.7: production order paths are REAL-ONLY. Never bypass broker truth with simulation flags.\n    const isSimulatedTrade = !isRealTrade || req.body?.isSimulated === true || isRealTrade === "false" || req.body?.strictReal === false;\n    if (isSimulatedTrade) {\n      return res.status(410).json({\n        success: false,\n        error: "SIMULATED_TRADE_DISABLED_V217",\n        dataStatus: "NO_DATA",\n        message: "Production order validation is real-only. Simulation/paper/virtual-ledger execution is disabled."\n      });\n    }`
);

replaceOnce(
  "disable virtual dust cleanup",
  `        if (estimatedSellValue > 0 && estimatedSellValue < 5000) {\n          return res.json({\n            success: true,\n            isRealTrade: false,\n            isSimulated: true,\n            isDustCleanup: true,\n            executionType: "DUST_CLEANUP",\n            brokerName: "업비트 (소액 잔량 청산 원장)",\n            orderId: \`DUST-BTC-\${Date.now()}\`,\n            brokerOrderId: \`DUST-BTC-\${Date.now()}\`,\n            fee: 0,\n            message: \`[소액 잔량 청산 완료] 평가금액(약 ₩\${Math.round(estimatedSellValue).toLocaleString()})이 업비트 마켓 최소 매도 가능 금액(5,000원) 미만이므로, 거래소 제출 없이 포트폴리오 원장에서 정리 청산되었습니다.\`\n          });\n        }`,
  `        if (estimatedSellValue > 0 && estimatedSellValue < 5000) {\n          return res.status(409).json({\n            success: false,\n            error: "UPBIT_MIN_ORDER_NOT_MET_V217",\n            dataStatus: "REALTIME_VERIFIED",\n            estimatedSellValue: Math.round(estimatedSellValue),\n            minRequired: 5000,\n            message: "Real Upbit sell value is below the exchange minimum. No synthetic ledger close was performed."\n          });\n        }`
);

replaceOnce(
  "require explicit user confirmation",
  `  const isRealRequested = req.body.isRealTrade === true && req.body.isSimulated !== true;\n  const isSimulated = !isRealRequested || req.body.isSimulated === true;\n  const isBypass = req.body.bypassGuard === true || req.body.allowOffHours === true;`,
  `  const isRealRequested = req.body.isRealTrade === true && req.body.isSimulated !== true;\n  if (!isRealRequested) {\n    return res.status(410).json({\n      success: false,\n      error: "SIMULATED_TRADE_DISABLED_V217",\n      dataStatus: "NO_DATA",\n      message: "Only explicit real-order preparation is accepted on this production endpoint."\n    });\n  }\n  if (req.body.userConfirmed !== true || req.body.confirmationSource !== "USER_ACTION") {\n    return res.status(428).json({\n      success: false,\n      error: "EXPLICIT_USER_CONFIRMATION_REQUIRED_V217",\n      message: "A deliberate user action must confirm the live order. AI/autonomous submission is not accepted."\n    });\n  }\n  const isSimulated = false;\n  const isBypass = false;`
);

replaceOnce(
  "disable Upbit simulated order fallback",
  `      if (!isRealRequested || req.body.isSimulated === true || req.body.isRealTrade === false || (!decUpbitKey1 && !decUpbitKey2)) {\n        const btcOdno = \`SIM-BTC-\${Date.now()}\`;\n        return res.json({\n          success: true,\n          isRealTrade: false,\n          isSimulated: true,\n          executionType: "SIMULATED",\n          brokerName: "업비트(Upbit) 가상 모의투자 원장",\n          orderId: btcOdno,\n          brokerOrderId: btcOdno,\n          fee: Math.round(stockQty * price * 0.0005),\n          message: \`[모의투자 체결 완료] \${symbol || "BTC"} \${stockQty} \${side === "BUY" ? "매수" : "매도"} 가상 주문이 정상 체결되었습니다.\`\n        });\n      }`,
  `      if (!isRealRequested || req.body.isSimulated === true || req.body.isRealTrade === false || (!decUpbitKey1 && !decUpbitKey2)) {\n        return res.status(503).json({\n          success: false,\n          error: "UPBIT_REAL_CREDENTIALS_REQUIRED_V217",\n          dataStatus: "NO_DATA",\n          message: "Real Upbit credentials are required. No simulated order or virtual fill was created."\n        });\n      }`
);

const upbitPingStart = '// Upbit Real-time Public Feed Ping Probe\napp.get("/api/broker/upbit/ping"';
const kisPingMarker = '// ---------------------------------------------------------\n// 5-Second Real-Time KIS OpenAPI Ping / Health Probe Endpoint';
const upbitIdx = s.indexOf(upbitPingStart);
const kisMarkerIdx = s.indexOf(kisPingMarker, upbitIdx);
if (upbitIdx < 0 || kisMarkerIdx < 0) throw new Error('[V21.7] Upbit ping section markers not found');
const upbitReplacement = `// Upbit Real-time Public Feed Ping Probe - truth-first V21.7\napp.get("/api/broker/upbit/ping", async (_req, res) => {\n  const startTime = Date.now();\n  try {\n    const upbitProbe = await fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC", { signal: AbortSignal.timeout(3500) });\n    const latency = Date.now() - startTime;\n    if (!upbitProbe.ok) {\n      return res.status(503).json({ success: false, broker: "UPBIT_PUBLIC", status: "UNAVAILABLE", latency, dataStatus: "NO_DATA" });\n    }\n    const rows = await upbitProbe.json() as any[];\n    const row = Array.isArray(rows) ? rows[0] : null;\n    const tradePrice = Number(row?.trade_price);\n    const timestamp = Number(row?.timestamp);\n    if (!Number.isFinite(tradePrice) || tradePrice <= 0 || !Number.isFinite(timestamp)) {\n      return res.status(503).json({ success: false, broker: "UPBIT_PUBLIC", status: "INVALID_RESPONSE", latency, dataStatus: "NO_DATA" });\n    }\n    return res.json({ success: true, broker: "UPBIT_PUBLIC", status: "HEALTHY", latency, dataStatus: "REALTIME_VERIFIED", price: tradePrice, asOf: new Date(timestamp).toISOString(), mode: "PUBLIC_MARKET_FEED_ONLY" });\n  } catch (error: any) {\n    return res.status(503).json({ success: false, broker: "UPBIT_PUBLIC", status: "UNAVAILABLE", latency: Date.now() - startTime, dataStatus: "NO_DATA", error: String(error?.message || error) });\n  }\n});\n\n`;
s = s.slice(0, upbitIdx) + upbitReplacement + s.slice(kisMarkerIdx);
console.log('✅ truth-first Upbit ping');

const kisStart = s.indexOf(kisPingMarker);
const dailyMarker = '// ---------------------------------------------------------\n// AI Daily Market Briefing Endpoint';
const dailyIdx = s.indexOf(dailyMarker, kisStart);
if (kisStart < 0 || dailyIdx < 0) throw new Error('[V21.7] KIS ping section markers not found');
const kisReplacement = `// ---------------------------------------------------------\n// KIS OpenAPI Read-Only Health Probe - truth-first V21.7\n// ---------------------------------------------------------\napp.get("/api/broker/korea/ping", async (_req, res) => {\n  const startTime = Date.now();\n  try {\n    const configured = kisBrokerGateway.isConfigured();\n    if (!configured) {\n      return res.status(503).json({ success: false, broker: "KIS", status: "NOT_CONFIGURED", dataStatus: "NO_DATA" });\n    }\n    const token = await kisBrokerGateway.getOAuthToken(false);\n    if (!token) {\n      return res.status(503).json({ success: false, broker: "KIS", status: "AUTH_FAILED", dataStatus: "NO_DATA", latency: Date.now() - startTime });\n    }\n    return res.json({ success: true, broker: "KIS", status: "AUTHENTICATED_READ_ONLY", dataStatus: "REALTIME_VERIFIED", latency: Date.now() - startTime, serverTime: new Date().toISOString(), automaticOrderSubmission: false });\n  } catch (error: any) {\n    return res.status(503).json({ success: false, broker: "KIS", status: "UNAVAILABLE", dataStatus: "NO_DATA", latency: Date.now() - startTime, error: String(error?.message || error) });\n  }\n});\n\n`;
s = s.slice(0, kisStart) + kisReplacement + s.slice(dailyIdx);
console.log('✅ truth-first KIS ping');

fs.writeFileSync(path, s);
console.log('✅ V21.7 truth hardening applied');
