import { test, describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { KISBrokerGatewayV125, KISOrderRequest } from "../server/broker/KISBrokerGatewayV125.js";
import { PersistentOrderJournalV20, JournalOrderEntry } from "../src/execution/PersistentOrderJournalV20.js";
import { AutonomousTradingOrchestrator } from "../src/autonomous/AutonomousTradingOrchestrator.js";
import { BrokerGatewayRouter } from "../src/execution/BrokerGatewayRouter.js";
import { OrderManager } from "../src/execution/OrderManager.js";
import { KillSwitch } from "../src/autonomous/KillSwitch.js";
import { ExecutionReconciler } from "../src/execution/ExecutionReconciler.js";
import { KISBrokerGateway } from "../src/broker/kis/KISBrokerGateway.js";
import { UpbitBrokerGateway } from "../src/broker/upbit/UpbitBrokerGateway.js";

describe("AISTOCK RC5 KIS Broker Gateway & Persistent Order Journal Tests", () => {
  const testJournalPath = path.join(process.cwd(), "test_order_journal_rc5.json");

  beforeEach(() => {
    delete process.env.KIS_LIVE_ORDER_ENABLED;
    if (fs.existsSync(testJournalPath)) {
      fs.unlinkSync(testJournalPath);
    }
  });

  afterEach(() => {
    delete process.env.KIS_LIVE_ORDER_ENABLED;
    if (fs.existsSync(testJournalPath)) {
      fs.unlinkSync(testJournalPath);
    }
  });

  it("1. KISBrokerGatewayV125: Correctly maps TR IDs for KR & US LIVE and PAPER mode", () => {
    const gateway = new KISBrokerGatewayV125();

    // Domestic (KR)
    assert.equal(gateway.getTRID("KOREA", "BUY", false), "TTTC0012U");
    assert.equal(gateway.getTRID("KOREA", "SELL", false), "TTTC0011U");
    assert.equal(gateway.getTRID("KOREA", "BUY", true), "VTTC0012U");
    assert.equal(gateway.getTRID("KOREA", "SELL", true), "VTTC0011U");

    // Overseas (US)
    assert.equal(gateway.getTRID("US", "BUY", false), "TTTT1002U");
    assert.equal(gateway.getTRID("US", "SELL", false), "TTTT1006U");
    assert.equal(gateway.getTRID("US", "BUY", true), "VTTT1002U");
    assert.equal(gateway.getTRID("US", "SELL", true), "VTTT1001U");
  });

  it("2. KISBrokerGatewayV125: Rejects LIVE order fail-closed when KIS_LIVE_ORDER_ENABLED is not 'true'", async () => {
    const gateway = new KISBrokerGatewayV125();
    const req: KISOrderRequest = {
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      side: "BUY",
      price: 70000,
      qty: 10,
      orderType: "LIMIT",
      isPaperTrading: false // LIVE mode
    };

    const res = await gateway.executeOrder(req);
    assert.equal(res.success, false);
    assert.equal(res.status, "REJECTED");
    assert.ok(res.message.includes("LIVE_LOCK_ACTIVE"));
  });

  it("3. KISBrokerGatewayV125: Rejects US order when exchange is unknown or missing", async () => {
    process.env.KIS_LIVE_ORDER_ENABLED = "true";
    const gateway = new KISBrokerGatewayV125();
    const req: KISOrderRequest = {
      symbol: "AAPL",
      name: "Apple Inc.",
      market: "US",
      exchange: "UNKNOWN_EXCG",
      side: "BUY",
      price: 180,
      qty: 5,
      orderType: "LIMIT",
      isPaperTrading: false
    };

    const res = await gateway.executeOrder(req);
    assert.equal(res.success, false);
    assert.equal(res.status, "REJECTED");
    assert.ok(res.message.includes("EXCHANGE_UNKNOWN"));
  });

  it("4. PersistentOrderJournalV20: Throws JOURNAL_CORRUPTED when file contains invalid JSON", () => {
    fs.writeFileSync(testJournalPath, "{ corrupted_json: ... [invalid] }", "utf8");

    assert.throws(
      () => {
        new PersistentOrderJournalV20(testJournalPath);
      },
      (err: any) => {
        return err.message.includes("JOURNAL_CORRUPTED");
      }
    );
  });

  it("5. PersistentOrderJournalV20: Saves, retrieves, and detects active partial exposure cleanly", () => {
    const journal = new PersistentOrderJournalV20(testJournalPath);

    const entry1: JournalOrderEntry = {
      idempotencyKey: "KEY_1001",
      orderId: "ORD_1001",
      symbol: "005930",
      market: "KR",
      side: "BUY",
      quantity: 100,
      price: 70000,
      status: "PARTIAL",
      filledQuantity: 30,
      averageFillPrice: 70000,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    journal.recordOrder(entry1);

    assert.equal(journal.hasIdempotencyKey("KEY_1001"), true);
    assert.equal(journal.hasActivePartialExposure(), true);
    assert.equal(journal.getPartialOrders().length, 1);

    // Load fresh instance from file
    const journalReloaded = new PersistentOrderJournalV20(testJournalPath);
    assert.equal(journalReloaded.hasIdempotencyKey("KEY_1001"), true);
    assert.equal(journalReloaded.hasActivePartialExposure(), true);
  });

  it("6. AutonomousTradingOrchestrator: PARTIAL_FILL_EXPOSURE_LOCKED blocks new entries when partial fills exist", async () => {
    const kis = new KISBrokerGateway();
    const upbit = new UpbitBrokerGateway();
    const router = new BrokerGatewayRouter(kis, upbit);
    const orderManager = new OrderManager();
    const killSwitch = new KillSwitch();
    const reconciler = new ExecutionReconciler(router);

    const orchestrator = new AutonomousTradingOrchestrator(router, orderManager, killSwitch, reconciler, {
      enabled: true,
      mode: "LIVE",
      maxConcurrentPositions: 5,
      maxPositionWeightPct: 20,
      maxDailyLossPct: 3.0,
      maxPortfolioDrawdownPct: 5.0,
      killSwitchEnabled: true,
      maxSpreadBps: 50,
      maxSlippageBps: 30,
      maxOrdersPerMinute: 10,
      requireRealtimeVerified: true
    });

    // Submit an initial buy
    const decision = {
      symbol: "005930",
      market: "KR" as const,
      action: "BUY_CANDIDATE" as const,
      dataStatus: "REALTIME_VERIFIED",
      evidence: ["BULLISH_BREAKOUT"],
      score: 85,
      suggestedPrice: 70000,
      invalidationPrice: 68000,
      targetPrice: 75000
    };

    await orchestrator.evaluateCandidateAndTrade(decision, {
      dailyPnlPct: 0,
      portfolioDrawdownPct: 0,
      spreadBps: 10,
      estimatedSlippageBps: 5,
      marketOpen: true
    });

    // Simulate partial fill on the position
    const managedPositions = orchestrator.getManagedPositions();
    assert.equal(managedPositions.length, 1);
    
    // Simulate broker PARTIAL fill event
    orchestrator.handleBrokerExecutionEvent({
      orderId: managedPositions[0].pendingOrderId || "ORD_1",
      symbol: "005930",
      side: "BUY",
      status: "PARTIAL",
      filledQuantity: 5,
      remainingQuantity: 5,
      averageFillPrice: 70000,
      timestamp: Date.now()
    });

    assert.equal(orchestrator.hasPartialExposure(), true);

    // Attempt to evaluate another candidate for entry
    const candidate2 = {
      symbol: "000660",
      market: "KR" as const,
      action: "BUY_CANDIDATE" as const,
      dataStatus: "REALTIME_VERIFIED",
      evidence: ["STRONG_MOMENTUM"],
      score: 90,
      suggestedPrice: 120000,
      invalidationPrice: 115000,
      targetPrice: 130000
    };

    const res = await orchestrator.evaluateCandidateAndTrade(candidate2, {
      dailyPnlPct: 0,
      portfolioDrawdownPct: 0,
      spreadBps: 10,
      estimatedSlippageBps: 5,
      marketOpen: true
    });

    assert.equal(res.executed, false);
    assert.equal(res.reason, "PARTIAL_FILL_EXPOSURE_LOCKED");
  });
});
