import type { Request, Response } from "express";
import {
  FinalBuyHoldDecisionServiceV20,
  FinalBuyHoldRequestV20
} from "./FinalBuyHoldDecisionServiceV20";
import { ServerTrueMTFEvidenceProviderV20 } from "./ServerTrueMTFEvidenceProviderV20";
import type { TrueMTFEvidenceV20 } from "./TrueMTFSignalGateV20";
import { buildRealtimeTruthTelemetryV20 } from "./RealtimeTruthTelemetryV20";
import {
  serverRealtimeMarketHubV20,
  type ServerMarketQuoteV20
} from "./ServerRealtimeMarketHubV20";
import type { UnifiedPatternSignalResultV20 } from "./UnifiedPatternSignalEngineV20";

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

  // These fields must be syntactically valid, but they are never trusted as
  // decision evidence. The handler overwrites them from the server market hub.
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

function mapHubMarket(market: ServerMarketQuoteV20["market"]): "KR" | "US" | "CRYPTO" {
  if (market === "US") return "US";
  if (market === "UPBIT") return "CRYPTO";
  return "KR";
}

function quoteIsFreshEnough(quote: ServerMarketQuoteV20 | null): quote is ServerMarketQuoteV20 {
  return Boolean(
    quote &&
    quote.grade !== "DISPLAY_ONLY" &&
    finitePositive(quote.price) &&
    finitePositive(quote.volume) &&
    finitePositive(quote.tradeValue) &&
    finiteNumber(quote.changePct) &&
    finiteNumber(quote.updatedAt) &&
    Date.now() - quote.updatedAt <= 15_000
  );
}

function signalIsDecisionReady(
  signal: UnifiedPatternSignalResultV20 | null
): signal is UnifiedPatternSignalResultV20 & { indicators: NonNullable<UnifiedPatternSignalResultV20["indicators"]> } {
  return Boolean(
    signal &&
    signal.dataStatus === "READY" &&
    signal.indicators &&
    finitePositive(signal.indicators.rvol20) &&
    finitePositive(signal.indicators.vwap) &&
    finitePositive(signal.indicators.ema20) &&
    finitePositive(signal.indicators.atr14) &&
    finiteNumber(signal.indicators.rsi14)
  );
}

export interface FinalBuyHoldHttpDependenciesV20 {
  buildTrueMtf: (input: { symbol: string; baseUrl: string }) => Promise<TrueMTFEvidenceV20>;
  getQuote: (symbol: string) => ServerMarketQuoteV20 | null;
  getLatestSignal: (symbol: string) => UnifiedPatternSignalResultV20 | null;
}

const DEFAULT_DEPENDENCIES: FinalBuyHoldHttpDependenciesV20 = {
  buildTrueMtf: (input) => ServerTrueMTFEvidenceProviderV20.build(input),
  getQuote: (symbol) => serverRealtimeMarketHubV20.getQuote(symbol),
  getLatestSignal: (symbol) => serverRealtimeMarketHubV20.getLatestSignal(symbol)
};

/**
 * Production HTTP boundary for the single V20 BUY & HOLD authority.
 *
 * Truth/security properties:
 * - client-supplied quote, indicator, pattern and trueMtf evidence is NEVER trusted;
 * - price/change/volume/tradeValue are rebuilt from the fresh server market hub quote;
 * - RVOL/VWAP/EMA/ATR/RSI/pattern are rebuilt from the server unified OHLCV engine;
 * - 1m/3m/5m/D evidence is rebuilt by the server True-MTF provider;
 * - stale/display-only/missing server evidence fails closed before a BUY decision;
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
        message: "입력 형식이 올바르지 않아 V20 최종판정을 실행하지 않았습니다."
      });
    }

    try {
      const symbol = req.body.candidate.symbol.trim().toUpperCase();
      const serverQuote = dependencies.getQuote(symbol);
      if (!quoteIsFreshEnough(serverQuote)) {
        return res.status(503).json({
          success: false,
          error: "SERVER_REALTIME_QUOTE_REQUIRED",
          dataStatus: "NO_DATA",
          message: "서버에서 검증된 최신 실시간 시세가 없어 최종판정을 중단했습니다."
        });
      }

      const serverSignal = dependencies.getLatestSignal(symbol);
      if (!signalIsDecisionReady(serverSignal)) {
        return res.status(503).json({
          success: false,
          error: "SERVER_INDICATOR_EVIDENCE_REQUIRED",
          dataStatus: "NO_DATA",
          message: "서버 OHLCV 지표가 아직 준비되지 않아 최종판정을 중단했습니다."
        });
      }

      const baseUrl = requestBaseUrl(req);
      const serverTrueMtf = baseUrl
        ? await dependencies.buildTrueMtf({ symbol, baseUrl })
        : {};

      const serverMarket = mapHubMarket(serverQuote.market);
      const patterns = serverSignal.pattern && serverSignal.pattern !== "NO_PATTERN"
        ? [serverSignal.pattern]
        : [];

      const serverOwnedRequest: FinalBuyHoldRequestV20 = {
        ...req.body,
        currentPrice: serverQuote.price,
        candidate: {
          ...req.body.candidate,
          symbol,
          name: serverQuote.name || req.body.candidate.name,
          market: serverMarket,
          price: serverQuote.price,
          changePct: serverQuote.changePct,
          volume: serverQuote.volume,
          tradeValue: serverQuote.tradeValue,
          rvol: serverSignal.indicators.rvol20,
          vwap: serverSignal.indicators.vwap,
          ema9: serverSignal.indicators.ema9,
          ema20: serverSignal.indicators.ema20,
          ema50: serverSignal.indicators.ema50,
          atr14: serverSignal.indicators.atr14,
          rsi14: serverSignal.indicators.rsi14,
          patterns,
          dataStatus: serverQuote.grade === "EXECUTION_GRADE"
            ? "REALTIME_VERIFIED"
            : "REALTIME_DERIVED",
          // Explicit overwrite prevents a browser/API caller from spoofing MTF PASS.
          trueMtf: serverTrueMtf
        }
      };

      const decision = FinalBuyHoldDecisionServiceV20.evaluate(serverOwnedRequest);
      const realtimeTruth = buildRealtimeTruthTelemetryV20(symbol);

      return res.json({
        success: true,
        authority: "SERVER_V20_FINAL",
        execution: "DECISION_ONLY",
        quoteAuthority: "SERVER_MARKET_HUB",
        indicatorAuthority: "SERVER_UNIFIED_OHLCV_ENGINE",
        mtfAuthority: "SERVER_OWNED",
        realtimeAuthority: "SERVER_MARKET_HUB",
        serverEvidence: {
          symbol,
          source: serverQuote.source,
          dataGrade: serverQuote.grade,
          price: serverQuote.price,
          changePct: serverQuote.changePct,
          volume: serverQuote.volume,
          tradeValue: serverQuote.tradeValue,
          rvol: serverSignal.indicators.rvol20,
          vwap: serverSignal.indicators.vwap,
          ema20: serverSignal.indicators.ema20,
          atr14: serverSignal.indicators.atr14,
          rsi14: serverSignal.indicators.rsi14,
          pattern: serverSignal.pattern,
          updatedAt: serverQuote.updatedAt
        },
        realtimeTruth,
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
