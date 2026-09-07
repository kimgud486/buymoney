// ----------------------------------------------------------------------
// RISK GATE (V16.1 PRODUCTION GRADE FAIL-CLOSED RISK CONTROLLER)
// Pre-Order Execution Risk Controls & Hard Circuit Breaker Gate
// ----------------------------------------------------------------------

import { LiveMarketQuote, requireLiveData } from "./realtimeMarketFeedService";
import { CandleSnapshot, realCandleStore } from "./RealCandleStore";

export interface RiskGateRequest {
  symbol: string;
  price: number;
  quantity: number;
  quote?: LiveMarketQuote;
  candleSnapshot?: CandleSnapshot | null;
  brokerAuthenticated: boolean;
  spreadPct?: number | null;
  dailyLossLimitExceeded: boolean;
  cooldownActive: boolean;
}

export interface RiskGateResult {
  passed: boolean;
  tradingAllowed: boolean;
  rejectionReason: string | null;
  checks: {
    executionQuoteFresh: boolean;
    candlesFresh: boolean;
    brokerAuthenticated: boolean;
    spreadAcceptable: boolean;
    dailyLossLimitOk: boolean;
    cooldownOk: boolean;
    priceValid: boolean;
  };
}

export class RiskGate {
  /**
   * Evaluate pre-order execution risk requirements (Fail-Closed)
   */
  public static evaluate(req: RiskGateRequest): RiskGateResult {
    const executionQuoteFresh = requireLiveData(req.quote);
    const snapshot = req.candleSnapshot || realCandleStore.getSnapshot(req.symbol);
    const candlesFresh = realCandleStore.isExecutionReady(snapshot);
    const brokerAuthenticated = Boolean(req.brokerAuthenticated);
    const spreadAcceptable = req.spreadPct == null || req.spreadPct <= 1.0; // max 1% spread allowed
    const dailyLossLimitOk = !req.dailyLossLimitExceeded;
    const cooldownOk = !req.cooldownActive;
    const priceValid = Boolean(req.price && req.price > 0 && req.quantity > 0);

    const checks = {
      executionQuoteFresh,
      candlesFresh,
      brokerAuthenticated,
      spreadAcceptable,
      dailyLossLimitOk,
      cooldownOk,
      priceValid
    };

    let rejectionReason: string | null = null;

    if (!executionQuoteFresh) {
      rejectionReason = "실시간 EXECUTION_GRADE 시세 데이터 누락 또는 Stale (>5s)";
    } else if (!candlesFresh) {
      rejectionReason = "OHLCV 캔들 데이터 미검증 또는 Stale (>5m)";
    } else if (!brokerAuthenticated) {
      rejectionReason = "증권사(KIS) 실거래 인증 세션 누락";
    } else if (!spreadAcceptable) {
      rejectionReason = "호가 스프레드 초과 (>1.0%)";
    } else if (!dailyLossLimitOk) {
      rejectionReason = "일별 최대 손실 한도 초과 (Daily Loss Guard Activated)";
    } else if (!cooldownOk) {
      rejectionReason = "매매 쿨다운 진행 중 (Cooldown Active)";
    } else if (!priceValid) {
      rejectionReason = "유효하지 않은 주문 가격 또는 수량";
    }

    const passed = Object.values(checks).every(Boolean);

    return {
      passed,
      tradingAllowed: passed,
      rejectionReason,
      checks
    };
  }
}
