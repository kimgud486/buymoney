// ----------------------------------------------------------------------
// CHECK FINAL PRODUCTION TRUTH MJS (BUYMONEY FINAL SYSTEM)
// Verifies production zero-fake posture & V20 BUY/HOLD authority wiring
// Final validation anchor after latest main scanner-truth sync.
// ----------------------------------------------------------------------

import fs from "fs";
import path from "path";

console.log("🔍 Running BUYMONEY FINAL Production Truth Audit...");

const requiredFiles = [
  "server/v20/ServerKISRealtimeClientV20.ts",
  "server/v20/BrokerExecutionTruthBusV20.ts",
  "server/v20/BrokerExecutionRuntimeBridgeV20.ts",
  "server/v20/BrokerFillPerformanceRecorderV20.ts",
  "server/v20/KISExecutionNoticeParserV20.ts",
  "server/v20/KISOverseasParserV20.ts",
  "server/v20/ServerRealtimeMarketHubV20.ts",
  "server/v20/ServerUpbitRealtimeClientV20.ts",
  "server/v20/ServerGlobalRealtimeScannerV20.ts",
  "server/v20/TrueMTFSignalGateV20.ts",
  "server/v20/ServerTrueMTFEvidenceProviderV20.ts",
  "server/v20/VerifiedPerformanceGateV20.ts",
  "server/v20/BuyHoldDecisionEngineV20.ts",
  "server/v20/BuyHoldPerformanceStoreV20.ts",
  "server/v20/BuyHoldSystemFacadeV20.ts",
  "server/v20/ExecutablePatternGateV20.ts",
  "server/v20/FinalBuyHoldDecisionServiceV20.ts",
  "server/v20/FinalBuyHoldHttpHandlerV20.ts",
  "src/scanner/patternExecutionAudit.ts",
  "src/components/BuyHoldSystemStatusPanel.tsx",
  "src/components/VerifiedAiOpportunityScanner.tsx",
  "src/components/VerifiedIntradaySignalPanel.tsx",
  "src/services/KISRealtimeFieldSchema.ts",
  "src/trading/PositionStateMachine.ts",
  "src/trading/LivePositionRuntimeService.ts"
];

const errors = [];
for (const file of requiredFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) errors.push(`Missing required FINAL file: ${file}`);
}

function read(relative) {
  const full = path.join(process.cwd(), relative);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

const serverContent = read("server.ts");
if (serverContent) {
  const randomMatches = serverContent.match(/Math\.random\(\)/g) || [];
  if (randomMatches.length > 10) errors.push(`Excessive Math.random() usage in server.ts (${randomMatches.length} occurrences)`);

  for (const token of [
    "quote.volume?.[i] || 1000",
    "quote.volume?.[idx] || 10000",
    "quote.volume?.[idx] || 1000",
    "volume: item.volumeIncreaseRatio || 1",
    "tradeValue: item.currentPrice * (item.volumeIncreaseRatio || 1)",
    "liveVolume = 250000",
    "liveTradingValue = 1200",
    'app.post("/api/autotrade/order"',
    'app.get("/api/autotrade/status"',
    "50123984-01",
    'let detectedCandlePattern = "Bullish Engulfing (상승 장악형)"',
    'detectedCandlePattern = liveChangePct >= 0 ? "Bullish Engulfing',
    'let detectedChartPattern = "Double Bottom (더블 바텀)"',
    'detectedChartPattern = "Inverse Head & Shoulders (역H&S 반전)"',
    'Math.max(0.5, currentVol / (avgVol || 1))',
    "Math.sin(i * 0.7)",
    "Math.floor(Math.random() * 8000) + 1500",
    "history = generateHistory(tickedPreset.price, 30)",
    "Tier 3: Internal Universe fallback to ensure 100% endpoint reliability",
    'compareToPreviousClosePrice: "500"',
    'accumulatedTradingVolume: "1,000,000"',
    "Live stock search failed, falling back to candidates:",
    "return res.json(upbitPresets);",
    "return res.json(DEMO_STOCKS);",
    "return cached.data;",
    "return preset;",
    "data: stockRes, expiresAt:",
    "meta.regularMarketPrice || defaultVal.value",
    "Math.round(realRsi)",
    "Falling back to index presets for ${symbol}"
  ]) {
    if (serverContent.includes(token)) errors.push(`Forbidden production fallback remains in server.ts: ${token}`);
  }

  for (const requiredToken of [
    'app.post("/api/v20/final-buy-hold", finalBuyHoldHttpHandlerV20)',
    "REAL_VERIFIED_PRECHECK_V192",
    'authority: "REAL_PRECHECK_ONLY"',
    'finalAuthority: "SERVER_V20_FINAL_REQUIRED"',
    "PUBLIC_VERIFIED_QUOTE_SANITIZER",
    'dataStatus: "NO_DATA", source: "NAVER_REAL_ONLY"',
    'data: sanitizeVerifiedQuote(stockRes)',
    'return sanitizeVerifiedQuote(cached.data)',
    'history = []'
  ]) {
    if (!serverContent.includes(requiredToken)) errors.push(`Required production truth marker missing in server.ts: ${requiredToken}`);
  }

  if (!serverContent.includes('volume: item.volume') || !serverContent.includes('tradeValue: item.tradeValue')) {
    errors.push("V20 hot-list adapter must preserve authoritative absolute volume/tradeValue");
  }
  if (!serverContent.includes('patterns: item.patternType ? [item.patternType] : []')) {
    errors.push("V20 hot-list adapter must pass executable pattern IDs instead of display labels");
  }
}

const scannerUi = read("src/components/VerifiedAiOpportunityScanner.tsx");
if (!scannerUi.includes('/api/ai/hot-list')) errors.push("VerifiedAiOpportunityScanner must use server PRECHECK candidate compression");
if (!scannerUi.includes('/api/v20/final-buy-hold')) errors.push("VerifiedAiOpportunityScanner must call the SERVER_V20_FINAL endpoint");
if (!scannerUi.includes('"SERVER_V20_FINAL"')) errors.push("VerifiedAiOpportunityScanner must identify SERVER_V20_FINAL as final authority");
if (!scannerUi.includes('payload?.authority !== "SERVER_V20_FINAL"')) errors.push("UI must verify final authority response before displaying a final decision");
if (scannerUi.includes("evaluateVerifiedSignal(")) errors.push("VerifiedAiOpportunityScanner must not self-authorize BUY with a client-side signal engine");
if (scannerUi.includes('verified && score >= 76 ? "BUY"')) errors.push("Browser must never promote PRECHECK score directly to BUY");
if (!scannerUi.includes("PRECHECK는 후보 압축만 합니다")) errors.push("UI must visibly distinguish PRECHECK from FINAL BUY authority");

const appContent = read("src/App.tsx");
if (!appContent.includes("<BuyHoldSystemStatusPanel")) errors.push("App must keep BUY/HOLD system status UI");
if (!appContent.includes("<VerifiedIntradaySignalPanel")) errors.push("Latest main intraday signal panel must survive final integration");

const finalHttp = read("server/v20/FinalBuyHoldHttpHandlerV20.ts");
if (!finalHttp.includes("FinalBuyHoldDecisionServiceV20.evaluate")) errors.push("Final HTTP handler must delegate to FinalBuyHoldDecisionServiceV20");
if (!finalHttp.includes('execution: "DECISION_ONLY"')) errors.push("Final HTTP handler must remain decision-only");
if (!finalHttp.includes("ServerTrueMTFEvidenceProviderV20")) errors.push("Final HTTP handler must use server-owned True MTF evidence");
for (const forbiddenExecutionToken of ["placeOrder(", "submitOrder(", "sendOrder("]) {
  if (finalHttp.includes(forbiddenExecutionToken)) errors.push(`Final HTTP handler must not execute orders directly: ${forbiddenExecutionToken}`);
}

const mtfProvider = read("server/v20/ServerTrueMTFEvidenceProviderV20.ts");
if (!mtfProvider.includes('derived ? "REALTIME_DERIVED" : "REALTIME_VERIFIED"')) errors.push("3m evidence must be explicitly marked REALTIME_DERIVED");
if (!mtfProvider.includes("aggregateOneMinuteToThreeMinuteV20")) errors.push("Server MTF provider must aggregate real 1m bars into 3m evidence");

const v20Scanner = read("server/v20/ServerGlobalRealtimeScannerV20.ts");
if (!v20Scanner.includes("ExecutablePatternGateV20.evaluate")) errors.push("ServerGlobalRealtimeScannerV20 must enforce executable-pattern evidence");
if (!v20Scanner.includes("patternGate.passed")) errors.push("ServerGlobalRealtimeScannerV20 BUY evidence must require patternGate.passed");
if (!v20Scanner.includes("trueMtfGate.passed")) errors.push("ServerGlobalRealtimeScannerV20 BUY evidence must require trueMtfGate.passed");
if (!v20Scanner.includes("SUSPECT_DERIVED_LIQUIDITY_FIELDS")) errors.push("V20 scanner must reject RVOL masquerading as absolute liquidity");

const finalService = read("server/v20/FinalBuyHoldDecisionServiceV20.ts");
for (const requiredToken of [
  "ServerGlobalRealtimeScannerV20.evaluateCandidate",
  "ExecutablePatternGateV20.evaluate",
  "BuyHoldSystemFacadeV20.evaluate",
  "buyHoldPerformanceStoreV20.evaluate"
]) {
  if (!finalService.includes(requiredToken)) errors.push(`FinalBuyHoldDecisionServiceV20 missing authority link: ${requiredToken}`);
}
for (const forbiddenExecutionToken of ["placeOrder(", "submitOrder(", "sendOrder("]) {
  if (finalService.includes(forbiddenExecutionToken)) errors.push(`FinalBuyHoldDecisionServiceV20 must not execute orders directly: ${forbiddenExecutionToken}`);
}

const patternGate = read("server/v20/ExecutablePatternGateV20.ts");
if (!patternGate.includes("PATTERN_EXECUTION_AUDIT")) errors.push("ExecutablePatternGateV20 must use audited executable pattern registry");

const performanceGate = read("server/v20/VerifiedPerformanceGateV20.ts");
if (!performanceGate.includes("minSamples") || !performanceGate.includes("minProfitFactor") || !performanceGate.includes("minExpectancyPct")) {
  errors.push("VerifiedPerformanceGateV20 must verify sample size, profit factor and expectancy");
}

const executionBridge = read("server/v20/BrokerExecutionRuntimeBridgeV20.ts");
if (!executionBridge.includes("brokerFillPerformanceRecorderV20.onVerifiedFill")) {
  errors.push("Verified broker fills must feed the V20 performance recorder");
}
const fillRecorder = read("server/v20/BrokerFillPerformanceRecorderV20.ts");
if (!fillRecorder.includes('context.nextState !== "CLOSED"')) errors.push("Performance recorder must wait for CLOSED position state");
if (!fillRecorder.includes("sellNotional") || !fillRecorder.includes("buyNotional")) errors.push("Performance recorder must aggregate real fill notional instead of guessing P&L");

if (errors.length > 0) {
  console.error("❌ BUYMONEY FINAL Production Truth Audit FAILED:");
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

console.log("✅ BUYMONEY FINAL Production Truth Audit PASSED cleanly.");
process.exit(0);
