import type { Request, Response } from "express";
import {
  FinalBuyHoldDecisionServiceV20,
  FinalBuyHoldRequestV20
} from "./FinalBuyHoldDecisionServiceV20";

const VALID_MARKETS = new Set(["KR", "US", "CRYPTO"]);
const VALID_EXCHANGES = new Set([
  "KOSPI",
  "KOSDAQ",
  "NASDAQ",
  "NYSE",
  "AMEX",
  "UPBIT",
  "UNKNOWN"
]);
const VALID_DATA_STATUS = new Set([
  "REALTIME_VERIFIED",
  "REALTIME_DERIVED",
  "STALE",
  "NO_DATA",
  "INVALID",
  "CLOSED"
]);

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateRequest(body: unknown): body is FinalBuyHoldRequestV20 {
  if (!body || typeof body !== "object") return false;
  const request = body as Partial<FinalBuyHoldRequestV20>;
  const candidate = request.candidate as any;
  const key = request.performanceKey as any;

  if (!candidate || typeof candidate !== "object") return false;
  if (!key || typeof key !== "object") return false;

  if (typeof candidate.symbol !== "string" || candidate.symbol.trim() === "") return false;
  if (typeof candidate.name !== "string" || candidate.name.trim() === "") return false;
  if (!VALID_MARKETS.has(candidate.market)) return false;
  if (!VALID_EXCHANGES.has(candidate.exchange)) return false;
  if (!VALID_DATA_STATUS.has(candidate.dataStatus)) return false;

  // Core market fields are never defaulted here. Missing/invalid evidence must
  // fail at the HTTP boundary rather than become a fabricated neutral value.
  if (!finitePositive(candidate.price)) return false;
  if (!finitePositive(candidate.volume)) return false;
  if (!finitePositive(candidate.tradeValue)) return false;
  if (!finitePositive(candidate.rvol)) return false;
  if (!finiteNumber(candidate.changePct)) return false;

  if (typeof key.setup !== "string" || key.setup.trim() === "") return false;
  if (key.symbol != null && typeof key.symbol !== "string") return false;
  if (key.market != null && typeof key.market !== "string") return false;

  if (request.currentPrice != null && !finitePositive(request.currentPrice)) return false;
  if (request.position != null) {
    const position = request.position as any;
    if (!finitePositive(position.quantity)) return false;
    if (!finitePositive(position.averagePrice)) return false;
    if (!finitePositive(position.stopPrice)) return false;
    if (!finitePositive(position.highestPriceSinceEntry)) return false;
  }

  return true;
}

/**
 * Production HTTP boundary for the single V20 BUY & HOLD authority.
 * This handler only returns a decision. It cannot submit or simulate orders.
 */
export function finalBuyHoldHttpHandlerV20(req: Request, res: Response) {
  if (!validateRequest(req.body)) {
    return res.status(400).json({
      success: false,
      error: "INVALID_FINAL_BUY_HOLD_REQUEST",
      message: "검증된 시장/패턴/MTF 입력이 부족하여 V20 최종판정을 실행하지 않았습니다."
    });
  }

  try {
    const decision = FinalBuyHoldDecisionServiceV20.evaluate(req.body);
    return res.json({
      success: true,
      authority: "SERVER_V20_FINAL",
      execution: "DECISION_ONLY",
      decision
    });
  } catch (error) {
    console.error("[V20 Final BuyHold] decision error:", error);
    return res.status(500).json({
      success: false,
      error: "FINAL_BUY_HOLD_DECISION_FAILED"
    });
  }
}
