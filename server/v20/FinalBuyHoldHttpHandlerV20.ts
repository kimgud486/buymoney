import type { Request, Response } from "express";
import {
  FinalBuyHoldDecisionServiceV20,
  FinalBuyHoldRequestV20
} from "./FinalBuyHoldDecisionServiceV20";
import { ServerTrueMTFEvidenceProviderV20 } from "./ServerTrueMTFEvidenceProviderV20";
import type { TrueMTFEvidenceV20 } from "./TrueMTFSignalGateV20";

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

function requestBaseUrl(req: Request): string | null {
  const host = typeof req.get === "function" ? req.get("host") : req.headers?.host;
  if (!host) return null;
  const protocol = req.protocol === "https" ? "https" : "http";
  return `${protocol}://${host}`;
}

export interface FinalBuyHoldHttpDependenciesV20 {
  buildTrueMtf: (input: { symbol: string; baseUrl: string }) => Promise<TrueMTFEvidenceV20>;
}

const DEFAULT_DEPENDENCIES: FinalBuyHoldHttpDependenciesV20 = {
  buildTrueMtf: (input) => ServerTrueMTFEvidenceProviderV20.build(input)
};

/**
 * Production HTTP boundary for the single V20 BUY & HOLD authority.
 *
 * Security/truth property:
 * - client-supplied trueMtf is NEVER trusted;
 * - the server rebuilds 1m/3m/5m/D evidence from its verified candle route;
 * - missing server evidence remains missing and therefore WATCH/NO, never BUY;
 * - this endpoint only returns a decision and cannot submit/simulate orders.
 */
export function createFinalBuyHoldHttpHandlerV20(
  dependencies: FinalBuyHoldHttpDependenciesV20 = DEFAULT_DEPENDENCIES
) {
  return async function finalBuyHoldHttpHandler(req: Request, res: Response) {
    if (!validateRequest(req.body)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_FINAL_BUY_HOLD_REQUEST",
        message: "검증된 시장 입력이 부족하여 V20 최종판정을 실행하지 않았습니다."
      });
    }

    try {
      const baseUrl = requestBaseUrl(req);
      const serverTrueMtf = baseUrl
        ? await dependencies.buildTrueMtf({ symbol: req.body.candidate.symbol, baseUrl })
        : {};

      const serverOwnedRequest: FinalBuyHoldRequestV20 = {
        ...req.body,
        candidate: {
          ...req.body.candidate,
          // Explicit overwrite prevents a browser/API caller from spoofing MTF PASS.
          trueMtf: serverTrueMtf
        }
      };

      const decision = FinalBuyHoldDecisionServiceV20.evaluate(serverOwnedRequest);
      return res.json({
        success: true,
        authority: "SERVER_V20_FINAL",
        execution: "DECISION_ONLY",
        mtfAuthority: "SERVER_OWNED",
        decision
      });
    } catch (error) {
      console.error("[V20 Final BuyHold] decision error:", error);
      return res.status(500).json({
        success: false,
        error: "FINAL_BUY_HOLD_DECISION_FAILED"
      });
    }
  };
}

export const finalBuyHoldHttpHandlerV20 = createFinalBuyHoldHttpHandlerV20();
