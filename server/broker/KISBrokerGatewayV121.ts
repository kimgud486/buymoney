// AISTOCK v12.1 compatibility wrapper with production account-risk admission.
// All server.ts KIS orders pass through this class before reaching V123.

import {
  KISBrokerGatewayV123,
  KISOrderRequest,
  KISOrderGatewayResponse,
} from "./KISBrokerGatewayV123";

export type {
  KISOrderRequest,
  KISOrderGatewayResponse,
  KISFillCheckResult,
} from "./KISBrokerGatewayV123";

const rejected = (
  req: KISOrderRequest,
  message: string,
  trId = "RISK_GATE",
): KISOrderGatewayResponse => ({
  success: false,
  orderNo: "",
  symbol: req.symbol,
  side: req.side,
  status: "REJECTED",
  filledQty: 0,
  filledAvgPrice: 0,
  message,
  trId,
  timestamp: new Date().toLocaleTimeString("ko-KR"),
});

const finitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Universal live-account admission wrapper.
 *
 * This class deliberately sits at the broker boundary so UI/API callers cannot
 * bypass cash/holding/position checks by calling a different frontend action.
 */
export class KISBrokerGatewayV121 extends KISBrokerGatewayV123 {
  public override async executeOrder(req: KISOrderRequest): Promise<KISOrderGatewayResponse> {
    if (!req || !req.symbol || !/^[A-Za-z0-9._-]+$/.test(req.symbol)) {
      return rejected(req, "⛔ [RISK_GATE] 유효하지 않은 종목 코드입니다.");
    }

    if (req.side !== "BUY" && req.side !== "SELL") {
      return rejected(req, "⛔ [RISK_GATE] BUY/SELL 외 주문 방향은 허용되지 않습니다.");
    }

    if (!finitePositive(req.qty) || !Number.isInteger(req.qty)) {
      return rejected(req, "⛔ [RISK_GATE] 주문수량은 1주 이상의 정수여야 합니다.");
    }

    if (req.isPaperTrading) {
      return super.executeOrder(req);
    }

    if (req.market === "BTC") {
      return super.executeOrder(req);
    }

    // US native USD risk/cash semantics are intentionally locked until the
    // dedicated adapter is explicitly enabled and validated.
    if (req.market === "US" && process.env.KIS_US_LIVE_RISK_ENABLED !== "true") {
      return rejected(
        req,
        "⛔ [US_LIVE_RISK_ADAPTER_NOT_READY] 미국 실거래는 USD 예수금/주문가능금액 Risk Adapter 검증 전까지 잠금 상태입니다.",
      );
    }

    const market = req.market === "US" ? "US" : "KOREA";
    const balance = await this.getAccountBalance(market, false);
    if (!balance.success) {
      return rejected(
        req,
        `⛔ [ACCOUNT_TRUTH_UNAVAILABLE] 실계좌 잔고 검증 실패로 주문을 차단했습니다: ${balance.message}`,
      );
    }

    const holding = balance.holdings.find((item) => item.symbol === req.symbol);

    if (req.side === "SELL") {
      const heldQty = holding?.qty ?? 0;
      if (heldQty < req.qty) {
        return rejected(
          req,
          `⛔ [OVERSELL_BLOCK] 실보유 ${heldQty}주보다 많은 ${req.qty}주 매도를 차단했습니다.`,
        );
      }
      return super.executeOrder(req);
    }

    // BUY risk checks require a positive reference price even for a market order,
    // because the gate must estimate notional before KIS submission.
    if (!finitePositive(req.price)) {
      return rejected(
        req,
        "⛔ [REFERENCE_PRICE_REQUIRED] BUY 주문 전 실시간 기준가격이 필요합니다.",
      );
    }

    const estimatedNotional = req.price * req.qty;
    const cashBufferPct = Number(process.env.KIS_ORDER_CASH_BUFFER_PCT ?? "0.01");
    const requiredCash = estimatedNotional * (1 + Math.max(0, cashBufferPct));

    if (!finitePositive(balance.depositKRW) || balance.depositKRW < requiredCash) {
      return rejected(
        req,
        `⛔ [INSUFFICIENT_VERIFIED_CASH] 검증 예수금 ${balance.depositKRW.toLocaleString()}원 / 필요 약 ${Math.ceil(requiredCash).toLocaleString()}원`,
      );
    }

    const configuredMaxWeight = Number(process.env.KIS_MAX_POSITION_WEIGHT ?? "0.20");
    const maxPositionWeight = Number.isFinite(configuredMaxWeight)
      ? Math.min(1, Math.max(0.01, configuredMaxWeight))
      : 0.20;

    const portfolioValue = Math.max(balance.totalEvalAmt, balance.depositKRW, 1);
    const existingPositionValue = holding?.evalAmt ?? 0;
    const projectedWeight = (existingPositionValue + estimatedNotional) / portfolioValue;

    if (projectedWeight > maxPositionWeight) {
      return rejected(
        req,
        `⛔ [MAX_POSITION_WEIGHT] 예상 종목비중 ${(projectedWeight * 100).toFixed(1)}%가 한도 ${(maxPositionWeight * 100).toFixed(1)}%를 초과합니다.`,
      );
    }

    return super.executeOrder(req);
  }
}
