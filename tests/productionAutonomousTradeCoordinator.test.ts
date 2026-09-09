import test from "node:test";
import assert from "node:assert/strict";
import {
  ProductionAutonomousTradeCoordinator,
  AutonomousCandidateSource,
  AutonomousRiskAdapter,
  AutonomousBrokerAdapter,
} from "../src/autonomous/ProductionAutonomousTradeCoordinator";

const goodCandidate = {
  symbol: "005930",
  name: "삼성전자",
  market: "KOREA" as const,
  price: 74200,
  rsi: 54,
  rvol: 2.2,
  adx: 31,
  atrPct: 2.0,
  grade: "S" as const,
  stop: 71000,
  target1: 82000,
};

const healthyGate = {
  mode: "AUTO_LIVE" as const,
  explicitLiveEnabled: true,
  confirmationText: "ENABLE AUTO LIVE",
  brokerConfigured: true,
  brokerHealthy: true,
  accountVerified: true,
  accountSynced: true,
  realtimeDataVerified: true,
  marketOpen: true,
  supportedMarket: true,
  dailyLossGuardPassed: true,
  drawdownGuardPassed: true,
  exposureGuardPassed: true,
  slippageGuardPassed: true,
  duplicateOrderFree: true,
  staleData: false,
};

function makeRisk(existingOpenOrderKeys: string[] = []): AutonomousRiskAdapter {
  return {
    async getSnapshot() {
      return {
        verifiedCash: 10_000_000,
        verifiedEquity: 20_000_000,
        currentPositionValue: 0,
        dailyPnl: 0,
        drawdownPct: 0,
        existingOpenOrderKeys,
      };
    },
    async validateOrder() {
      return { allowed: true, reasons: [] };
    },
  };
}

test("AUTO_LIVE does not call broker when central gate is blocked", async () => {
  const source: AutonomousCandidateSource = { async scanYesOnly() { return [goodCandidate]; } };
  let brokerCalls = 0;
  const broker: AutonomousBrokerAdapter = {
    async submitOrder() {
      brokerCalls += 1;
      return { accepted: true, brokerOrderId: "ORDER-1" };
    },
  };
  const coordinator = new ProductionAutonomousTradeCoordinator(source, makeRisk(), broker);
  const decisions = await coordinator.run({
    mode: "AUTO_LIVE",
    maxCandidates: 5,
    maxPositionWeight: 0.1,
    minEnsembleScore: 82,
    gate: { ...healthyGate, brokerHealthy: false },
    sessionId: "2026-09-09",
  });

  assert.equal(brokerCalls, 0);
  assert.equal(decisions[0].status, "BLOCKED");
  assert.ok(decisions[0].reasons.includes("BROKER_UNHEALTHY"));
});

test("AUTO_LIVE submits only after signal, gate and account risk all pass", async () => {
  const source: AutonomousCandidateSource = { async scanYesOnly() { return [goodCandidate]; } };
  let brokerCalls = 0;
  const broker: AutonomousBrokerAdapter = {
    async submitOrder(order) {
      brokerCalls += 1;
      assert.equal(order.clientOrderKey, "AUTO:2026-09-09:005930:BUY");
      return { accepted: true, brokerOrderId: "ORDER-REAL-1" };
    },
  };
  const coordinator = new ProductionAutonomousTradeCoordinator(source, makeRisk(), broker);
  const decisions = await coordinator.run({
    mode: "AUTO_LIVE",
    maxCandidates: 5,
    maxPositionWeight: 0.1,
    minEnsembleScore: 82,
    gate: healthyGate,
    sessionId: "2026-09-09",
  });

  assert.equal(brokerCalls, 1);
  assert.equal(decisions[0].status, "ORDER_SUBMITTED");
  assert.equal(decisions[0].brokerOrderId, "ORDER-REAL-1");
});

test("duplicate YES candidates cannot generate two orders in one run", async () => {
  const source: AutonomousCandidateSource = { async scanYesOnly() { return [goodCandidate, goodCandidate]; } };
  let brokerCalls = 0;
  const broker: AutonomousBrokerAdapter = {
    async submitOrder() {
      brokerCalls += 1;
      return { accepted: true, brokerOrderId: `ORDER-${brokerCalls}` };
    },
  };
  const coordinator = new ProductionAutonomousTradeCoordinator(source, makeRisk(), broker);
  const decisions = await coordinator.run({
    mode: "AUTO_LIVE",
    maxCandidates: 5,
    maxPositionWeight: 0.1,
    minEnsembleScore: 82,
    gate: healthyGate,
    sessionId: "2026-09-09",
  });

  assert.equal(brokerCalls, 1);
  assert.equal(decisions[0].status, "ORDER_SUBMITTED");
  assert.equal(decisions[1].status, "BLOCKED");
  assert.ok(decisions[1].reasons.includes("DUPLICATE_OPEN_ORDER"));
});
