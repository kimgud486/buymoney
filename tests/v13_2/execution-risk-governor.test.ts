import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { executionRiskGovernorV132 } from "../../src/services/v13_2/ExecutionRiskGovernorV132";
import { positionSizingEngineV132 } from "../../src/services/v13_2/PositionSizingEngineV132";
import { dailyRiskGovernorV132 } from "../../src/services/v13_2/DailyRiskGovernorV132";
import { paperDryRunLiveGateV132 } from "../../src/services/v13_2/PaperDryRunLiveGateV132";

describe("AISTOCK v13.2 Execution & Risk Governor Test Suite", () => {
  test("1. Position Sizing: Recommends safe quantity capped by account capital limits", () => {
    const input = {
      symbol: "005930",
      targetPrice: 70000,
      proposedQty: 100, // Proposed capital = 7,000,000 KRW
      totalAccountCapitalKRW: 10000000, // 10,000,000 KRW
      currentOpenExposureKRW: 0,
      dailyRealizedLossKRW: 0,
      maxDailyLossLimitKRW: 500000,
      maxPositionSizePct: 0.20 // 20% limit = 2,000,000 KRW -> max 28 shares
    };

    const result = positionSizingEngineV132.calculatePositionSize(input);
    assert.strictEqual(result.riskApproved, true);
    assert.strictEqual(result.recommendedQty, 28); // Math.floor(2,000,000 / 70,000) = 28
    assert.strictEqual(result.calculatedPositionSizeKRW, 1960000);
  });

  test("2. Daily Loss Limit Gate: Blocks trading when daily loss limit is breached", () => {
    const input = {
      symbol: "000660",
      targetPrice: 150000,
      proposedQty: 10,
      totalAccountCapitalKRW: 50000000,
      currentOpenExposureKRW: 5000000,
      dailyRealizedLossKRW: 1000000, // Loss = 1,000,000
      maxDailyLossLimitKRW: 500000   // Max Limit = 500,000
    };

    const gateResult = dailyRiskGovernorV132.evaluateDailyLossGate(input);
    assert.strictEqual(gateResult.canTrade, false);
    assert.strictEqual(gateResult.isDailyLossLimitHit, true);
    assert.strictEqual(gateResult.reason, "MAX_DAILY_LOSS_LIMIT_BREACHED");

    const governorResult = executionRiskGovernorV132.evaluateRisk(input);
    assert.strictEqual(governorResult.approved, false);
    assert.strictEqual(governorResult.approvedQty, 0);
    assert.ok(governorResult.rejectionReasons.includes("MAX_DAILY_LOSS_LIMIT_BREACHED"));
  });

  test("3. Spread & Slippage Limits: Rejects order with excessive bid-ask spread or slippage", () => {
    const input = {
      symbol: "005930",
      targetPrice: 70000,
      proposedQty: 10,
      totalAccountCapitalKRW: 50000000,
      currentOpenExposureKRW: 0,
      dailyRealizedLossKRW: 0,
      maxDailyLossLimitKRW: 1000000,
      bidAskSpreadPct: 0.03,      // 3% > max 2%
      maxSpreadLimitPct: 0.02,
      estimatedSlippagePct: 0.02, // 2% > max 1.5%
      maxSlippageLimitPct: 0.015
    };

    const result = executionRiskGovernorV132.evaluateRisk(input);
    assert.strictEqual(result.approved, false);
    assert.ok(result.rejectionReasons.some(r => r.includes("EXCESSIVE_BID_ASK_SPREAD")));
    assert.ok(result.rejectionReasons.some(r => r.includes("EXCESSIVE_SLIPPAGE")));
  });

  test("4. Account Exposure Cap: Rejects order if total account exposure cap is reached", () => {
    const input = {
      symbol: "005930",
      targetPrice: 70000,
      proposedQty: 10,
      totalAccountCapitalKRW: 10000000,
      currentOpenExposureKRW: 8500000, // 85% exposure already open
      dailyRealizedLossKRW: 0,
      maxDailyLossLimitKRW: 500000,
      maxAccountExposurePct: 0.80      // Max 80% exposure limit
    };

    const result = executionRiskGovernorV132.evaluateRisk(input);
    assert.strictEqual(result.approved, false);
    assert.ok(result.rejectionReasons.includes("MAX_ACCOUNT_EXPOSURE_CAP_EXCEEDED"));
  });

  test("5. PaperDryRunLiveGate: Evaluates promotion criteria for LIVE mode", () => {
    // Failing case: insufficient trades
    const failEval = paperDryRunLiveGateV132.evaluateLivePromotion("PAPER", {
      totalTradesCount: 10, // < 20 required
      winningTradesCount: 7,
      maxDrawdownPct: 1.5,
      accountVerified: true
    });
    assert.strictEqual(failEval.allowLiveTrading, false);
    assert.ok(failEval.rejectionReasons.some(r => r.includes("INSUFFICIENT_TEST_TRADES")));

    // Passing case: >=20 trades, >=55% win rate, <=3.0% drawdown, verified account
    const passEval = paperDryRunLiveGateV132.evaluateLivePromotion("DRY_RUN", {
      totalTradesCount: 25,
      winningTradesCount: 18, // 72% win rate
      maxDrawdownPct: 2.1,
      accountVerified: true
    });
    assert.strictEqual(passEval.allowLiveTrading, true);
    assert.strictEqual(passEval.rejectionReasons.length, 0);
  });
});
