import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
const scannerPath = new URL("../src/services/GlobalRealtimeScannerV192.ts", import.meta.url);

function replaceExact(source, from, to, label, required = true) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) {
    if (required) throw new Error(`PATCH_ANCHOR_MISSING:${label}`);
    return source;
  }
  return source.replace(from, to);
}

let server = fs.readFileSync(serverPath, "utf8");
let scanner = fs.readFileSync(scannerPath, "utf8");

server = replaceExact(
  server,
  'import { ServerGlobalRealtimeScannerV20 } from "./server/v20/ServerGlobalRealtimeScannerV20";',
  'import { ServerGlobalRealtimeScannerV20 } from "./server/v20/ServerGlobalRealtimeScannerV20";\nimport { finalBuyHoldHttpHandlerV20 } from "./server/v20/FinalBuyHoldHttpHandlerV20";',
  "FINAL_HTTP_IMPORT"
);

server = replaceExact(
  server,
  'app.use(express.json());',
  'app.use(express.json());\n\n// Single production decision boundary. This route never places or simulates orders.\napp.post("/api/v20/final-buy-hold", finalBuyHoldHttpHandlerV20);',
  "FINAL_HTTP_ROUTE"
);

// Remove fabricated Yahoo volume defaults. Missing provider volume remains 0 and
// downstream V20 truth gates reject it instead of treating it as evidence.
server = server.replaceAll(
  'const v = Math.round(quote.volume?.[i] || 1000);',
  'const rawVolume = quote.volume?.[i];\n                    const v = typeof rawVolume === "number" && Number.isFinite(rawVolume) && rawVolume > 0 ? Math.round(rawVolume) : 0;'
);
server = server.replaceAll(
  'const v = Math.round(quote.volume?.[idx] || 10000);',
  'const rawVolume = quote.volume?.[idx];\n                  const v = typeof rawVolume === "number" && Number.isFinite(rawVolume) && rawVolume > 0 ? Math.round(rawVolume) : 0;'
);
server = server.replaceAll(
  'const v = Math.round(quote.volume?.[idx] || 1000);',
  'const rawVolume = quote.volume?.[idx];\n              const v = typeof rawVolume === "number" && Number.isFinite(rawVolume) && rawVolume > 0 ? Math.round(rawVolume) : 0;'
);

server = replaceExact(
  server,
  '          volume: item.volumeIncreaseRatio || 1,\n          tradeValue: item.currentPrice * (item.volumeIncreaseRatio || 1),\n          rvol: item.volumeIncreaseRatio || 1,',
  '          volume: item.volume,\n          tradeValue: item.tradeValue,\n          rvol: Number(item.volumeIncreaseRatio),',
  "HOTLIST_ABSOLUTE_LIQUIDITY"
);

server = replaceExact(
  server,
  '          patterns: item.patternName ? [item.patternName] : [],',
  '          patterns: item.patternType ? [item.patternType] : [],',
  "HOTLIST_EXECUTABLE_PATTERN_ID"
);

// The old endpoint claimed simulated fills were real KIS fills. Remove the public
// production-looking route. The legacy simulator remains clearly namespaced only.
server = replaceExact(
  server,
  'app.post("/api/autotrade/order", (req, res) => {',
  'app.post("/api/legacy/simulated-autotrade/order", (req, res) => {',
  "LEGACY_SIM_ORDER_ROUTE"
);
server = replaceExact(
  server,
  'app.get("/api/autotrade/status", (req, res) => {',
  'app.get("/api/legacy/simulated-autotrade/status", (req, res) => {',
  "LEGACY_SIM_STATUS_ROUTE"
);
server = server.replaceAll(
  '`✅ [한국투자증권 REST API] 체결 완료 - 계좌 번호: 50123984-01 | 체결가: ${payload.price.toLocaleString()}원 | 수량: ${qty}주`',
  '`[SIMULATION_ONLY] 가상 체결 기록 · 가격 ${payload.price.toLocaleString()} · 수량 ${qty}`'
);
server = server.replaceAll(
  'message: "단일 마스터 뇌엔진 컨센서스 통과: 자율 주문이 성공적으로 체결되었습니다."',
  'message: "SIMULATION_ONLY: 실제 브로커 주문이 전송되지 않았습니다."'
);

// Preserve authoritative absolute liquidity from the verified quote in V19.2.
scanner = replaceExact(
  scanner,
  '  currentPrice: number;\n  priceChange24hPct: number;',
  '  currentPrice: number;\n  volume: number;\n  tradeValue: number;\n  priceChange24hPct: number;',
  "SCANNER_LIQUIDITY_INTERFACE"
);
scanner = replaceExact(
  scanner,
  '      const price = quote!.price;\n      const candles15m = realCandleStore.getCachedCandles(stock.symbol, "15m");',
  '      const price = quote!.price;\n      const absoluteVolume = quote!.volume;\n      const absoluteTradeValue = quote!.tradeValue;\n      if (absoluteVolume == null || absoluteVolume <= 0 || absoluteTradeValue == null || absoluteTradeValue <= 0) {\n        continue;\n      }\n      const candles15m = realCandleStore.getCachedCandles(stock.symbol, "15m");',
  "SCANNER_LIQUIDITY_GATE"
);
scanner = replaceExact(
  scanner,
  '        currentPrice: price,\n        priceChange24hPct: +changePct.toFixed(2),',
  '        currentPrice: price,\n        volume: absoluteVolume,\n        tradeValue: absoluteTradeValue,\n        priceChange24hPct: +changePct.toFixed(2),',
  "SCANNER_LIQUIDITY_OUTPUT"
);

const forbidden = [
  "quote.volume?.[i] || 1000",
  "quote.volume?.[idx] || 10000",
  "quote.volume?.[idx] || 1000",
  "volume: item.volumeIncreaseRatio || 1",
  "tradeValue: item.currentPrice * (item.volumeIncreaseRatio || 1)",
  'app.post("/api/autotrade/order"',
  'app.get("/api/autotrade/status"',
  "50123984-01"
];
for (const token of forbidden) {
  if (server.includes(token)) throw new Error(`FORBIDDEN_LEGACY_TOKEN_REMAINS:${token}`);
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(scannerPath, scanner, "utf8");
console.log("V20 final server integration migration applied safely.");
