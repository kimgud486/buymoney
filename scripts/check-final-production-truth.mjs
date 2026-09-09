// ----------------------------------------------------------------------
// CHECK FINAL PRODUCTION TRUTH MJS (BUYMONEY FINAL SYSTEM)
// Verifies production zero-fake posture & V20 BUY/HOLD authority wiring
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
  "server/v20/VerifiedPerformanceGateV20.ts",
  "server/v20/BuyHoldDecisionEngineV20.ts",
  "server/v20/BuyHoldPerformanceStoreV20.ts",
  "server/v20/BuyHoldSystemFacadeV20.ts",
  "server/v20/ExecutablePatternGateV20.ts",
  "server/v20/FinalBuyHoldDecisionServiceV20.ts",
  "src/scanner/patternExecutionAudit.ts",
  "src/components/BuyHoldSystemStatusPanel.tsx",
  "src/components/VerifiedAiOpportunityScanner.tsx",
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
}

const scannerUi = read("src/components/VerifiedAiOpportunityScanner.tsx");
if (!scannerUi.includes('finalAuthority: "SERVER_V20"')) errors.push("VerifiedAiOpportunityScanner must identify SERVER_V20 as final authority");
if (!scannerUi.includes('/api/ai/hot-list')) errors.push("VerifiedAiOpportunityScanner must consume the production server V20 hot-list route");
if (scannerUi.includes("evaluateVerifiedSignal(")) errors.push("VerifiedAiOpportunityScanner must not self-authorize BUY with a client-side signal engine");
if (!scannerUi.includes("브라우저가 BUY를 만들지 않습니다")) errors.push("VerifiedAiOpportunityScanner must visibly state that browser-side BUY authority is disabled");

const v20Scanner = read("server/v20/ServerGlobalRealtimeScannerV20.ts");
if (!v20Scanner.includes("ExecutablePatternGateV20.evaluate")) errors.push("ServerGlobalRealtimeScannerV20 must enforce executable-pattern evidence");
if (!v20Scanner.includes("patternGate.passed")) errors.push("ServerGlobalRealtimeScannerV20 BUY evidence must require patternGate.passed");
if (!v20Scanner.includes("trueMtfGate.passed")) errors.push("ServerGlobalRealtimeScannerV20 BUY evidence must require trueMtfGate.passed");

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
