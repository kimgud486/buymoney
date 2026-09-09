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

// Existing broad random-generator guard.
const serverContent = read("server.ts");
if (serverContent) {
  const randomMatches = serverContent.match(/Math\.random\(\)/g) || [];
  if (randomMatches.length > 10) {
    errors.push(`Excessive Math.random() usage in server.ts (${randomMatches.length} occurrences)`);
  }
}

// V20 must remain the final BUY/HOLD authority. The client-side daily scanner
// is allowed only as PRECHECK and must explicitly route selected candidates
// toward SERVER_V20 rather than presenting itself as final authority.
const precheckUi = read("src/components/VerifiedAiOpportunityScanner.tsx");
if (!precheckUi.includes('finalAuthority: "SERVER_V20"')) {
  errors.push("VerifiedAiOpportunityScanner must hand candidates to SERVER_V20 authority");
}
if (!precheckUi.includes("최종 BUY 아님")) {
  errors.push("VerifiedAiOpportunityScanner must visibly state that PRECHECK is not final BUY");
}

const finalService = read("server/v20/FinalBuyHoldDecisionServiceV20.ts");
for (const requiredToken of [
  "ServerGlobalRealtimeScannerV20.evaluateCandidate",
  "ExecutablePatternGateV20.evaluate",
  "BuyHoldSystemFacadeV20.evaluate",
  "buyHoldPerformanceStoreV20.evaluate"
]) {
  if (!finalService.includes(requiredToken)) {
    errors.push(`FinalBuyHoldDecisionServiceV20 missing authority link: ${requiredToken}`);
  }
}

// Decision service intentionally cannot place orders. Execution remains behind
// the existing account/risk/idempotency/kill-switch/broker acknowledgement path.
for (const forbiddenExecutionToken of ["placeOrder(", "submitOrder(", "sendOrder("]) {
  if (finalService.includes(forbiddenExecutionToken)) {
    errors.push(`FinalBuyHoldDecisionServiceV20 must not execute orders directly: ${forbiddenExecutionToken}`);
  }
}

const patternGate = read("server/v20/ExecutablePatternGateV20.ts");
if (!patternGate.includes("PATTERN_EXECUTION_AUDIT")) {
  errors.push("ExecutablePatternGateV20 must use audited executable pattern registry");
}

const performanceGate = read("server/v20/VerifiedPerformanceGateV20.ts");
if (!performanceGate.includes("minSamples") || !performanceGate.includes("minProfitFactor") || !performanceGate.includes("minExpectancyPct")) {
  errors.push("VerifiedPerformanceGateV20 must verify sample size, profit factor and expectancy");
}

if (errors.length > 0) {
  console.error("❌ BUYMONEY FINAL Production Truth Audit FAILED:");
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

console.log("✅ BUYMONEY FINAL Production Truth Audit PASSED cleanly.");
process.exit(0);
