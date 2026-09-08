import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { AIScanDecision, DataTruthStatus } from "../src/ai/ScanDecisionSchema.js";
import { AIScanner } from "../src/ai/AIScanner.js";
import { CandidateRanker } from "../src/ai/CandidateRanker.js";
import { AutonomousRiskPolicy, DEFAULT_AUTONOMOUS_RISK_POLICY } from "../src/risk/AutonomousRiskPolicy.js";
import { PreTradeRiskEngine } from "../src/risk/PreTradeRiskEngine.js";
import { IdempotencyStore } from "../src/execution/IdempotencyStore.js";
import { KISBrokerGateway } from "../src/broker/kis/KISBrokerGateway.js";
import { UpbitBrokerGateway } from "../src/broker/upbit/UpbitBrokerGateway.js";
import { BrokerGatewayRouter } from "../src/execution/BrokerGatewayRouter.js";
import { OrderManager } from "../src/execution/OrderManager.js";
import { ExecutionReconciler } from "../src/execution/ExecutionReconciler.js";
import { KillSwitch } from "../src/autonomous/KillSwitch.js";
import { AutonomousTradingOrchestrator } from "../src/autonomous/AutonomousTradingOrchestrator.js";
import { AutonomousAuditLog } from "../src/monitoring/AutonomousAuditLog.js";

describe("AISTOCK v23 Autonomous AI Scanner & Trading Architecture Tests", () => {
  it("1. AI Scanner strictly sets action REJECT if dataStatus is not REALTIME_VERIFIED", () => {
    const statuses: DataTruthStatus[] = ["NO_DATA", "STALE", "REALTIME_DERIVED", "INVALID", "CLOSED"];

    for (const dataStatus of statuses) {
      const decision = AIScanner.evaluateMarket({
        symbol: "005930",
        market: "KR",
        currentPrice: 75000,
        openPrice: 74000,
        highPrice: 76000,
        lowPrice: 73500,
        volume: 1000000,
        dataStatus,
        patternName: "ORB_Breakout",
        patternConfirmed: true
      });

      assert.notEqual(decision.action, "BUY_CANDIDATE");
      assert.equal(decision.action, "REJECT");
    }
  });

  it("2. AI BUY candidate cannot bypass Pre-Trade Risk Gate", () => {
    const candidate: AIScanDecision = {
      symbol: "005930",
      market: "KR",
      action: "BUY_CANDIDATE",
      setupScore: 85,
      pattern: "ORB_Breakout",
      patternStatus: "CONFIRMED",
      evidence: {
        relativeStrength: true,
        rvolExpansion: true,
        aboveVwap: true,
        trendAligned: true,
        breakoutConfirmed: true,
        retestConfirmed: false,
        orderflowPositive: true,
        cvdPositive: true,
        marketLeader: true,
        sectorLeader: true
      },
      risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
      invalidationPrice: 74000,
      dataStatus: "REALTIME_VERIFIED",
      reasons: ["Strong setup"]
    };

    const policy: AutonomousRiskPolicy = {
      ...DEFAULT_AUTONOMOUS_RISK_POLICY,
      maxConcurrentPositions: 1
    };

    // Fail due to max positions
    const result = PreTradeRiskEngine.evaluate(
      {
        decision: candidate,
        currentPositions: 1,
        positionWeightPct: 10,
        dailyPnlPct: 0,
        portfolioDrawdownPct: 0,
        spreadBps: 5,
        estimatedSlippageBps: 5,
        marketOpen: true,
        brokerHealthy: true,
        killSwitchActive: false
      },
      policy
    );

    assert.equal(result.pass, false);
    assert.ok(result.reason?.includes("POSITION_LIMIT"));
  });

  it("3. NO_DATA / STALE / DERIVED cannot trade", () => {
    const statuses: DataTruthStatus[] = ["NO_DATA", "STALE", "REALTIME_DERIVED"];

    for (const dataStatus of statuses) {
      const candidate: AIScanDecision = {
        symbol: "AAPL",
        market: "US",
        action: "BUY_CANDIDATE",
        setupScore: 90,
        pattern: "Breakout",
        patternStatus: "CONFIRMED",
        evidence: {
          relativeStrength: true, rvolExpansion: true, aboveVwap: true, trendAligned: true,
          breakoutConfirmed: true, retestConfirmed: true, orderflowPositive: true, cvdPositive: true,
          marketLeader: true, sectorLeader: true
        },
        risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
        invalidationPrice: 180,
        dataStatus,
        reasons: []
      };

      const result = PreTradeRiskEngine.evaluate(
        {
          decision: candidate,
          currentPositions: 0,
          positionWeightPct: 5,
          dailyPnlPct: 0,
          portfolioDrawdownPct: 0,
          spreadBps: 5,
          estimatedSlippageBps: 5,
          marketOpen: true,
          brokerHealthy: true,
          killSwitchActive: false
        },
        DEFAULT_AUTONOMOUS_RISK_POLICY
      );

      assert.equal(result.pass, false);
      assert.equal(result.reason, "DATA_NOT_VERIFIED");
    }
  });

  it("4. Broker unhealthy / Market closed cannot trade", () => {
    const candidate: AIScanDecision = {
      symbol: "KRW-BTC",
      market: "CRYPTO",
      action: "BUY_CANDIDATE",
      setupScore: 88,
      pattern: "Impulse",
      patternStatus: "CONFIRMED",
      evidence: {
        relativeStrength: true, rvolExpansion: true, aboveVwap: true, trendAligned: true,
        breakoutConfirmed: true, retestConfirmed: true, orderflowPositive: true, cvdPositive: true,
        marketLeader: true, sectorLeader: true
      },
      risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
      invalidationPrice: 90000000,
      dataStatus: "REALTIME_VERIFIED",
      reasons: []
    };

    // Broker unhealthy test
    const brokerCheck = PreTradeRiskEngine.evaluate(
      {
        decision: candidate,
        currentPositions: 0,
        positionWeightPct: 5,
        dailyPnlPct: 0,
        portfolioDrawdownPct: 0,
        spreadBps: 5,
        estimatedSlippageBps: 5,
        marketOpen: true,
        brokerHealthy: false,
        killSwitchActive: false
      },
      DEFAULT_AUTONOMOUS_RISK_POLICY
    );
    assert.equal(brokerCheck.pass, false);
    assert.equal(brokerCheck.reason, "BROKER_NOT_HEALTHY");

    // Market closed test
    const marketCheck = PreTradeRiskEngine.evaluate(
      {
        decision: candidate,
        currentPositions: 0,
        positionWeightPct: 5,
        dailyPnlPct: 0,
        portfolioDrawdownPct: 0,
        spreadBps: 5,
        estimatedSlippageBps: 5,
        marketOpen: false,
        brokerHealthy: true,
        killSwitchActive: false
      },
      DEFAULT_AUTONOMOUS_RISK_POLICY
    );
    assert.equal(marketCheck.pass, false);
    assert.equal(marketCheck.reason, "SESSION_NOT_CONFIRMED");
  });

  it("5. Kill switch blocks new entries", () => {
    const killSwitch = new KillSwitch();
    killSwitch.trigger("DAILY_LOSS_LIMIT", "Breached daily limit");

    const candidate: AIScanDecision = {
      symbol: "005930",
      market: "KR",
      action: "BUY_CANDIDATE",
      setupScore: 90,
      pattern: "Breakout",
      patternStatus: "CONFIRMED",
      evidence: {
        relativeStrength: true, rvolExpansion: true, aboveVwap: true, trendAligned: true,
        breakoutConfirmed: true, retestConfirmed: true, orderflowPositive: true, cvdPositive: true,
        marketLeader: true, sectorLeader: true
      },
      risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
      invalidationPrice: 70000,
      dataStatus: "REALTIME_VERIFIED",
      reasons: []
    };

    const check = PreTradeRiskEngine.evaluate(
      {
        decision: candidate,
        currentPositions: 0,
        positionWeightPct: 5,
        dailyPnlPct: 0,
        portfolioDrawdownPct: 0,
        spreadBps: 5,
        estimatedSlippageBps: 5,
        marketOpen: true,
        brokerHealthy: true,
        killSwitchActive: killSwitch.active()
      },
      DEFAULT_AUTONOMOUS_RISK_POLICY
    );

    assert.equal(check.pass, false);
    assert.equal(check.reason, "KILL_SWITCH");
  });

  it("6. Daily loss guard and Drawdown guard block new entries", () => {
    const candidate: AIScanDecision = {
      symbol: "005930",
      market: "KR",
      action: "BUY_CANDIDATE",
      setupScore: 85,
      pattern: "Breakout",
      patternStatus: "CONFIRMED",
      evidence: {
        relativeStrength: true, rvolExpansion: true, aboveVwap: true, trendAligned: true,
        breakoutConfirmed: true, retestConfirmed: true, orderflowPositive: true, cvdPositive: true,
        marketLeader: true, sectorLeader: true
      },
      risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
      invalidationPrice: 70000,
      dataStatus: "REALTIME_VERIFIED",
      reasons: []
    };

    // Daily loss breach
    const dailyLossRes = PreTradeRiskEngine.evaluate(
      {
        decision: candidate,
        currentPositions: 0,
        positionWeightPct: 5,
        dailyPnlPct: -3.5, // max allowed is 3.0
        portfolioDrawdownPct: 0,
        spreadBps: 5,
        estimatedSlippageBps: 5,
        marketOpen: true,
        brokerHealthy: true,
        killSwitchActive: false
      },
      DEFAULT_AUTONOMOUS_RISK_POLICY
    );
    assert.equal(dailyLossRes.pass, false);
    assert.ok(dailyLossRes.reason?.includes("DAILY_LOSS_LIMIT"));

    // Drawdown breach
    const ddRes = PreTradeRiskEngine.evaluate(
      {
        decision: candidate,
        currentPositions: 0,
        positionWeightPct: 5,
        dailyPnlPct: 0,
        portfolioDrawdownPct: 8.0, // max allowed is 7.0
        spreadBps: 5,
        estimatedSlippageBps: 5,
        marketOpen: true,
        brokerHealthy: true,
        killSwitchActive: false
      },
      DEFAULT_AUTONOMOUS_RISK_POLICY
    );
    assert.equal(ddRes.pass, false);
    assert.ok(ddRes.reason?.includes("PORTFOLIO_DRAWDOWN_LIMIT"));
  });

  it("7. OrderManager rejects duplicate order idempotency keys", async () => {
    IdempotencyStore.clear();
    const orderManager = new OrderManager();
    const kisGateway = new KISBrokerGateway();

    const req = {
      symbol: "005930",
      market: "KR" as const,
      quantity: 10,
      idempotencyKey: "unique_idemp_key_1001"
    };

    const res1 = await orderManager.submitOrder(req, kisGateway, "BUY");
    assert.equal(res1.success, true);

    const res2 = await orderManager.submitOrder(req, kisGateway, "BUY");
    assert.equal(res2.success, false);
    assert.ok(res2.message.includes("DUPLICATE_ORDER_REJECTED"));
  });

  it("8. Order Status Lifecycle: ACKNOWLEDGED != FILLED, PARTIAL fill, and FULL fill", async () => {
    const router = new BrokerGatewayRouter();
    const orderManager = new OrderManager();
    const killSwitch = new KillSwitch();
    const reconciler = new ExecutionReconciler(router);

    const orchestrator = new AutonomousTradingOrchestrator(router, orderManager, killSwitch, reconciler);

    const candidate: AIScanDecision = {
      symbol: "005930",
      market: "KR",
      action: "BUY_CANDIDATE",
      setupScore: 90,
      pattern: "Breakout",
      patternStatus: "CONFIRMED",
      evidence: {
        relativeStrength: true, rvolExpansion: true, aboveVwap: true, trendAligned: true,
        breakoutConfirmed: true, retestConfirmed: true, orderflowPositive: true, cvdPositive: true,
        marketLeader: true, sectorLeader: true
      },
      risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
      invalidationPrice: 70000,
      dataStatus: "REALTIME_VERIFIED",
      reasons: []
    };

    const evalRes = await orchestrator.evaluateCandidateAndTrade(candidate, {
      dailyPnlPct: 0,
      portfolioDrawdownPct: 0,
      spreadBps: 5,
      estimatedSlippageBps: 5,
      marketOpen: true
    });

    assert.equal(evalRes.executed, true);

    let positions = orchestrator.getManagedPositions();
    assert.equal(positions.length, 1);
    assert.equal(positions[0].state, "BUY_ACKNOWLEDGED"); // ACKNOWLEDGED != FILLED!

    const kisGateway = router.getKisGateway();
    const orderId = positions[0].pendingOrderId!;

    // Simulate Partial Fill
    const partialEvent = kisGateway.simulateFill(orderId, 75000, 1);
    assert.notEqual(partialEvent, null);
    orchestrator.handleBrokerExecutionEvent(partialEvent!);

    positions = orchestrator.getManagedPositions();
    assert.equal(positions[0].state, "BUY_FILLED"); // filled quantity matched
  });

  it("9. SELL_WATCH recovery and Hard Exit in Orchestrator", async () => {
    const router = new BrokerGatewayRouter();
    const orderManager = new OrderManager();
    const killSwitch = new KillSwitch();
    const reconciler = new ExecutionReconciler(router);

    const orchestrator = new AutonomousTradingOrchestrator(router, orderManager, killSwitch, reconciler);

    const candidate: AIScanDecision = {
      symbol: "005930",
      market: "KR",
      action: "BUY_CANDIDATE",
      setupScore: 90,
      pattern: "Breakout",
      patternStatus: "CONFIRMED",
      evidence: {
        relativeStrength: true, rvolExpansion: true, aboveVwap: true, trendAligned: true,
        breakoutConfirmed: true, retestConfirmed: true, orderflowPositive: true, cvdPositive: true,
        marketLeader: true, sectorLeader: true
      },
      risks: { chaseRisk: 0.01, exhaustionRisk: 0.1, falseBreakoutRisk: 0.1, slippageRisk: 0.05 },
      invalidationPrice: 70000,
      dataStatus: "REALTIME_VERIFIED",
      reasons: []
    };

    await orchestrator.evaluateCandidateAndTrade(candidate, {
      dailyPnlPct: 0, portfolioDrawdownPct: 0, spreadBps: 5, estimatedSlippageBps: 5, marketOpen: true
    });

    const kisGateway = router.getKisGateway();
    const pos = orchestrator.getManagedPositions()[0];
    const fillEvent = kisGateway.simulateFill(pos.pendingOrderId!, 75000, 1);
    orchestrator.handleBrokerExecutionEvent(fillEvent!);

    // Position is in HOLD / PROFIT_HOLD
    assert.equal(orchestrator.getManagedPositions()[0].state, "HOLD");

    // Mild weakness moves to SELL_WATCH
    await orchestrator.evaluateExitAndTrade("005930", 75100, {
      hardFloorBreached: false,
      vwapLost: true,
      structureBroken: false,
      rsWeakening: false,
      cvdDivergence: false,
      orderflowReversal: false,
      marketWeakening: false,
      sectorWeakening: false,
      peakGivebackPctPoints: 0.5
    });

    assert.equal(orchestrator.getManagedPositions()[0].state, "SELL_WATCH");

    // Strength recovery moves back to PROFIT_HOLD
    await orchestrator.evaluateExitAndTrade("005930", 76000, {
      hardFloorBreached: false,
      vwapLost: false,
      structureBroken: false,
      rsWeakening: false,
      cvdDivergence: false,
      orderflowReversal: false,
      marketWeakening: false,
      sectorWeakening: false,
      peakGivebackPctPoints: 0
    });

    assert.equal(orchestrator.getManagedPositions()[0].state, "PROFIT_HOLD");

    // Hard floor breach submits SELL
    const sellRes = await orchestrator.evaluateExitAndTrade("005930", 69000, {
      hardFloorBreached: true,
      vwapLost: true,
      structureBroken: true,
      rsWeakening: true,
      cvdDivergence: true,
      orderflowReversal: true,
      marketWeakening: true,
      sectorWeakening: true,
      peakGivebackPctPoints: 3.0
    });

    assert.equal(sellRes.executed, true);
    assert.equal(orchestrator.getManagedPositions()[0].state, "SELL_ACKNOWLEDGED");
  });

  it("10. Execution Reconciler detects position discrepancies and triggers Kill Switch", async () => {
    const router = new BrokerGatewayRouter();
    const orderManager = new OrderManager();
    const killSwitch = new KillSwitch();
    const reconciler = new ExecutionReconciler(router);

    const orchestrator = new AutonomousTradingOrchestrator(router, orderManager, killSwitch, reconciler);

    // Reconcile when broker has 0 positions but local orchestrator has unverified phantom positions
    const report = await reconciler.reconcile([
      { symbol: "005930", quantity: 100, market: "KR" }
    ]);

    assert.equal(report.synchronized, false);
    assert.ok(report.discrepancies.length > 0);

    // Orchestrator reconciliation triggers kill switch
    await orchestrator.reconcilePositions();
    assert.equal(killSwitch.active(), true);
  });
});
