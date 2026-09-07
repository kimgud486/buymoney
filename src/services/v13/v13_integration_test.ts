// AISTOCK v13 Real Intelligence Core Integration Test Suite
// Verifies DataQualityGate, TechnicalAnalysisEngineV13, MissingReasonAnalyzerV124, UnifiedBuyGateV121, and PositionAndExitAiV124.

import { TechnicalAnalysisEngineV13 } from "./TechnicalAnalysisEngineV13";
import { MissingReasonAnalyzerV124 } from "../v12_4/MissingReasonAnalyzerV124";
import { UnifiedBuyGateV121, CandidateBuySignalV121 } from "../v12_1/UnifiedBuyGateV121";
import { globalExecutionStateMachine } from "../v11/ExecutionStateMachine";
import { PositionAndExitAiV124 } from "../v12_4/PositionAndExitAiV124";

export async function runV13IntegrationTests(): Promise<{ passed: boolean; log: string[] }> {
  const log: string[] = [];
  let allPassed = true;

  log.push("🧪 [TEST 1] TechnicalAnalysisEngineV13 Data Quality Verification...");
  const insufficientCandles = Array.from({ length: 20 }, (_, i) => ({
    time: `10:${i}`,
    timestamp: Date.now() - (20 - i) * 60000,
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000 + i * 10
  }));

  try {
    TechnicalAnalysisEngineV13.calculateIndicators(insufficientCandles);
    log.push("  ❌ FAIL: Insufficient candles were NOT rejected!");
    allPassed = false;
  } catch (err: any) {
    if (err?.message?.includes("INSUFFICIENT_CANDLES_FOR_TA")) {
      log.push("  ✅ PASS: Insufficient candles (<35) properly rejected with INSUFFICIENT_CANDLES_FOR_TA exception.");
    } else {
      log.push(`  ❌ FAIL: Unexpected error: ${err?.message}`);
      allPassed = false;
    }
  }

  log.push("🧪 [TEST 2] TechnicalAnalysisEngineV13 Indicator Calculation Integrity...");
  const valid35Candles = Array.from({ length: 40 }, (_, i) => ({
    time: `10:${i}`,
    timestamp: Date.now() - (40 - i) * 60000,
    open: 100 + Math.sin(i * 0.2) * 5,
    high: 105 + Math.sin(i * 0.2) * 5,
    low: 95 + Math.sin(i * 0.2) * 5,
    close: 101 + Math.sin(i * 0.2) * 5,
    volume: 1000 + i * 50
  }));

  try {
    const taPassResult = TechnicalAnalysisEngineV13.calculateIndicators(valid35Candles);
    if (
      taPassResult.vwap > 0 &&
      taPassResult.rsi14 > 0 &&
      taPassResult.adx14 > 0 &&
      taPassResult.atr14 > 0
    ) {
      log.push(`  ✅ PASS: Indicators calculated successfully (VWAP: ${taPassResult.vwap.toFixed(2)}, RSI: ${taPassResult.rsi14.toFixed(2)}, ADX: ${taPassResult.adx14.toFixed(2)}, ATR: ${taPassResult.atr14.toFixed(2)}).`);
    } else {
      log.push("  ❌ FAIL: Indicator values were <= 0!");
      allPassed = false;
    }
  } catch (err: any) {
    log.push(`  ❌ FAIL: TA Calculation threw error: ${err?.message}`);
    allPassed = false;
  }

  log.push("🧪 [TEST 3] MissingReasonAnalyzerV124 Fail-Closed Verification...");
  const analyzer = new MissingReasonAnalyzerV124();
  const missingAnalysis = analyzer.analyzeSymbol("005930", "삼성전자", "KOREA", 0, [], []);
  if (missingAnalysis.hardReject.hasHardReject && missingAnalysis.hardReject.rejectDescription?.includes("REAL_OHLCV_UNAVAILABLE")) {
    log.push("  ✅ PASS: Missing real OHLCV correctly triggers REAL_OHLCV_UNAVAILABLE hard reject.");
  } else {
    log.push("  ❌ FAIL: Missing real OHLCV did NOT trigger hard reject!");
    allPassed = false;
  }

  log.push("🧪 [TEST 4] UnifiedBuyGateV121 Fail-Closed Gate Check...");
  const buyGate = new UnifiedBuyGateV121("PAPER", false);
  globalExecutionStateMachine.resetToIdle();

  const invalidSignal: CandidateBuySignalV121 = {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    price: 70000,
    scannerScore: 85,
    shapeScore: 80,
    confirmationScore: 80,
    direction: "BULLISH",
    aiReason: "Test signal",
    dataValid: false,
    dataQualityReason: "OHLCV 캔들 수 부족"
  };

  const gateResult = await buyGate.processBuyGate(invalidSignal, globalExecutionStateMachine);
  if (!gateResult.passed && gateResult.rejectReason?.includes("DATA_NOT_VERIFIED")) {
    log.push("  ✅ PASS: Invalid data signal strictly rejected by UnifiedBuyGateV121.");
  } else {
    log.push("  ❌ FAIL: Invalid signal passed through UnifiedBuyGateV121!");
    allPassed = false;
  }

  log.push("🧪 [TEST 5] PositionAndExitAiV124 Monotonic Trailing Exit Floor...");
  const exitAi = new PositionAndExitAiV124();
  const floorResult1 = exitAi.calculateDynamicTrailingExitFloor({
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    buyPrice: 70000,
    currentPrice: 75000,
    pnlPct: 7.14,
    qty: 10,
    lastHigherLow: 73500,
    vwapSupport: 73000,
    emaSupport: 72500,
    atrStop: 72000,
    breakoutSupport: 73000,
    previousTrailingFloor: 72000
  });

  const floorResult2 = exitAi.calculateDynamicTrailingExitFloor({
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    buyPrice: 70000,
    currentPrice: 73000, // Price pulled back
    pnlPct: 4.28,
    qty: 10,
    lastHigherLow: 71000,
    vwapSupport: 70500,
    emaSupport: 70000,
    atrStop: 70000,
    breakoutSupport: 70500,
    previousTrailingFloor: floorResult1 // Carry over high floor
  });

  if (floorResult2 >= floorResult1) {
    log.push(`  ✅ PASS: Dynamic exit floor guaranteed monotonic rise (${floorResult1} -> ${floorResult2}).`);
  } else {
    log.push(`  ❌ FAIL: Floor moved downwards! (${floorResult1} -> ${floorResult2})`);
    allPassed = false;
  }

  return { passed: allPassed, log };
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runV13IntegrationTests().then(res => {
    console.log("\n==========================================");
    console.log("AISTOCK v13.0 INTEGRATION TEST RESULTS");
    console.log("==========================================");
    res.log.forEach(l => console.log(l));
    console.log("==========================================");
    console.log(res.passed ? "🎉 ALL TESTS PASSED!" : "🚨 TEST SUITE FAILED!");
    process.exit(res.passed ? 0 : 1);
  });
}
