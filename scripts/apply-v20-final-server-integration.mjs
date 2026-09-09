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

server = replaceExact(
  server,
  `    // Fallback if APIs were unreachable: fetch live quote via fetchLiveStockData
    if (!livePrice) {
      const dummyPreset: PresetStock = {
        symbol: rawSymbol,
        name: resolvedName,
        market: marketType,
        price: 0,
        change: 0,
        changePct: 0,
        marketCap: "N/A",
        per: 15, pbr: 1.2, roe: 10, debtRatio: 20, revenueGrowth: 5, operatingMargin: 10,
        news: [],
        technical: { rsi: 50, macd: "Bullish", bollinger: "middle", trend: "up" }
      };
      const fetchedLive = await fetchLiveStockData(dummyPreset);
      livePrice = fetchedLive.price || 0;
      liveChangePct = fetchedLive.changePct || 0;
      liveChangePrice = fetchedLive.change || 0;
      liveOpen = Math.round(livePrice * 0.98);
      liveHigh = Math.round(livePrice * 1.02);
      liveLow = Math.round(livePrice * 0.97);
      liveVolume = 250000;
      liveTradingValue = 1200;
    }

    // Do not fabricate synthetic bars if empty
    if (candles.length === 0 && livePrice > 0) {
      candles.push({
        time: "1m",
        open: liveOpen || livePrice,
        high: liveHigh || livePrice,
        low: liveLow || livePrice,
        close: livePrice,
        volume: liveVolume || 0
      });
    }
`,
  `    // Truth-first hard gate. Quant factors require provider-backed price,
    // absolute volume and enough real OHLCV history. Missing evidence is NO_DATA.
    const realVolumeCandles = candles.filter(c => Number.isFinite(c.volume) && c.volume > 0);
    if (!(livePrice > 0) || !(liveVolume > 0) || candles.length < 20 || realVolumeCandles.length < 5) {
      return res.status(200).json({
        symbol: rawSymbol,
        name: resolvedName,
        market: marketType,
        dataValid: false,
        dataStatus: "NO_DATA",
        reason: "INSUFFICIENT_VERIFIED_QUANT_MARKET_DATA",
        currentPrice: livePrice > 0 ? livePrice : 0,
        volume: liveVolume > 0 ? liveVolume : 0,
        candles: []
      });
    }
`,
  "QUANT_SYNTHETIC_FALLBACK_BLOCK"
);

server = replaceExact(
  server,
  '    const recentVolumes = candles.map(c => c.volume);\n    const avgVol = recentVolumes.length > 1 ? recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length : 10000;\n    const currentVol = candles[candles.length - 1]?.volume || avgVol;\n    const rvol = +(Math.max(0.5, currentVol / (avgVol || 1))).toFixed(2);',
  '    const recentVolumes = candles.map(c => c.volume).filter(v => Number.isFinite(v) && v > 0);\n    const avgVol = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;\n    const currentVol = candles[candles.length - 1]?.volume;\n    if (!(avgVol > 0) || !(currentVol > 0)) {\n      return res.status(200).json({ symbol: rawSymbol, name: resolvedName, market: marketType, dataValid: false, dataStatus: "NO_DATA", reason: "INVALID_VERIFIED_VOLUME_HISTORY" });\n    }\n    const rvol = +(currentVol / avgVol).toFixed(2);',
  "QUANT_RVOL_REAL_ONLY"
);

// Pattern truth: no chart/candle pattern is a valid result. Never fill an
// unmatched candidate with a bullish label just to keep the UI populated.
server = replaceExact(
  server,
  '    let detectedCandlePattern = "Bullish Engulfing (상승 장악형)";',
  '    let detectedCandlePattern = "NO_PATTERN";',
  "QUANT_CANDLE_PATTERN_DEFAULT"
);
server = replaceExact(
  server,
  '    } else {\n      detectedCandlePattern = liveChangePct >= 0 ? "Bullish Engulfing (상승 장악형)" : "Tweezer Bottom (집게형 바닥)";\n    }\n\n    // 6. Real Chart Pattern Recognition',
  '    }\n\n    // 6. Real Chart Pattern Recognition',
  "QUANT_CANDLE_PATTERN_FORCED_FALLBACK"
);
server = replaceExact(
  server,
  '    let detectedChartPattern = "Double Bottom (더블 바텀)";',
  '    let detectedChartPattern = "NO_PATTERN";',
  "QUANT_CHART_PATTERN_DEFAULT"
);
server = replaceExact(
  server,
  '    } else if (sslSwept) {\n      detectedChartPattern = "Double Bottom (더블 바텀 반등)";\n    } else {\n      detectedChartPattern = "Inverse Head & Shoulders (역H&S 반전)";\n    }',
  '    } else if (sslSwept) {\n      detectedChartPattern = "Double Bottom (더블 바텀 반등)";\n    }',
  "QUANT_CHART_PATTERN_FORCED_FALLBACK"
);
server = replaceExact(
  server,
  '    const atr = candles.length > 1 ? +(sumTr / (candles.length - 1)).toFixed(2) : +(livePrice * 0.03).toFixed(2);',
  '    const atr = +(sumTr / (candles.length - 1)).toFixed(2);',
  "QUANT_ATR_NO_SYNTHETIC_FALLBACK"
);
server = replaceExact(
  server,
  '    // Factor 2: Candlestick Confirmation (Max 20 pts)\n    score += 20;',
  '    // Factor 2: Candlestick Confirmation (Max 20 pts)\n    if (detectedCandlePattern !== "NO_PATTERN") score += 20;',
  "QUANT_PATTERN_SCORE_ONLY_WHEN_DETECTED"
);
server = replaceExact(
  server,
  '      candleTag: idx === candles.length - 1 ? detectedCandlePattern.split(" ")[0] : undefined,',
  '      candleTag: idx === candles.length - 1 && detectedCandlePattern !== "NO_PATTERN" ? detectedCandlePattern.split(" ")[0] : undefined,',
  "QUANT_NO_PATTERN_CHART_TAG"
);
server = replaceExact(
  server,
  '      isTradeable: score >= 75 && rule30MinId !== "rule_rise_drop" && rule30MinId !== "rule_drop_fail",',
  '      isTradeable: detectedCandlePattern !== "NO_PATTERN" && detectedChartPattern !== "NO_PATTERN" && score >= 75 && rule30MinId !== "rule_rise_drop" && rule30MinId !== "rule_drop_fail",',
  "QUANT_TRADEABLE_REQUIRES_PATTERN"
);

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
  "50123984-01",
  "liveVolume = 250000",
  "liveTradingValue = 1200",
  "recentVolumes.length > 1 ? recentVolumes.reduce",
  "Math.max(0.5, currentVol / (avgVol || 1))",
  'let detectedCandlePattern = "Bullish Engulfing (상승 장악형)"',
  'detectedCandlePattern = liveChangePct >= 0 ? "Bullish Engulfing',
  'let detectedChartPattern = "Double Bottom (더블 바텀)"',
  'detectedChartPattern = "Inverse Head & Shoulders (역H&S 반전)"',
  'candles.length > 1 ? +(sumTr / (candles.length - 1)).toFixed(2) : +(livePrice * 0.03)',
  '// Factor 2: Candlestick Confirmation (Max 20 pts)\n    score += 20;'
];
for (const token of forbidden) {
  if (server.includes(token)) throw new Error(`FORBIDDEN_LEGACY_TOKEN_REMAINS:${token}`);
}

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(scannerPath, scanner, "utf8");
console.log("V20 final server integration migration applied safely.");
