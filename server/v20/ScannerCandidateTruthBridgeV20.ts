// ----------------------------------------------------------------------
// SCANNER CANDIDATE TRUTH BRIDGE V20
// Repairs only the known legacy liquidity projection using verified live data.
// Missing verified liquidity fails closed. No neutral/default market values.
// ----------------------------------------------------------------------

import type {
  ExchangeType,
  MarketType,
  ScanCandidateInput,
} from "./ServerGlobalRealtimeScannerV20";
import {
  serverRealtimeMarketHubV20,
  type ServerMarketQuoteV20,
} from "./ServerRealtimeMarketHubV20";
import {
  realtimeMarketFeedService,
  requireLiveData,
  type LiveMarketQuote,
} from "../../src/services/realtimeMarketFeedService";

export interface ScannerCandidateTruthBridgeResultV20 {
  candidate: ScanCandidateInput;
  repairedLiquidity: boolean;
  rejectionReason?: "LIQUIDITY_TRUTH_UNVERIFIED";
  source?: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function positive(v: unknown): v is number {
  return finite(v) && v > 0;
}

function almostEqual(a: number, b: number): boolean {
  const tolerance = Math.max(1e-9, Math.abs(b) * 1e-9);
  return Math.abs(a - b) <= tolerance;
}

function normalizeMarket(raw: unknown): MarketType {
  const value = String(raw || "").toUpperCase();
  if (value === "KR" || value === "KOREA" || value === "KOSPI" || value === "KOSDAQ") {
    return "KR";
  }
  if (value === "CRYPTO" || value === "BTC" || value === "UPBIT") {
    return "CRYPTO";
  }
  return "US";
}

function normalizeExchange(raw: unknown, fallbackMarket: MarketType): ExchangeType {
  const value = String(raw || "").toUpperCase();
  const allowed: ExchangeType[] = [
    "KOSPI",
    "KOSDAQ",
    "NASDAQ",
    "NYSE",
    "AMEX",
    "UPBIT",
    "UNKNOWN",
  ];
  if (allowed.includes(value as ExchangeType)) return value as ExchangeType;
  if (fallbackMarket === "CRYPTO") return "UPBIT";
  return "UNKNOWN";
}

/**
 * Detect the exact legacy adapter signature that mirrored RVOL into `volume`
 * and then calculated `tradeValue = price * volume`.
 *
 * Cumulative market volume matching RVOL to machine precision is not valid
 * liquidity evidence. The upper bound prevents this guard from classifying a
 * normal high-volume record merely because two unrelated numbers coincide.
 */
export function hasLegacyProjectedLiquidityV20(input: ScanCandidateInput): boolean {
  if (
    !positive(input.price) ||
    !positive(input.volume) ||
    !positive(input.tradeValue) ||
    !positive(input.rvol)
  ) {
    return false;
  }

  const rvolMirroredIntoVolume =
    input.volume <= 50 &&
    input.rvol <= 50 &&
    almostEqual(input.volume, input.rvol);

  const projectedTradeValue = almostEqual(
    input.tradeValue,
    input.price * input.volume,
  );

  return rvolMirroredIntoVolume && projectedTradeValue;
}

function spreadBps(ask?: number, bid?: number): number | undefined {
  if (!positive(ask) || !positive(bid) || ask < bid) return undefined;
  const mid = (ask + bid) / 2;
  if (!positive(mid)) return undefined;
  return +(((ask - bid) / mid) * 10_000).toFixed(2);
}

function validHubQuote(symbol: string): ServerMarketQuoteV20 | null {
  const quote = serverRealtimeMarketHubV20.getQuote(symbol);
  if (!quote) return null;
  if (quote.grade !== "EXECUTION_GRADE") return null;
  if (!positive(quote.price) || !positive(quote.volume) || !positive(quote.tradeValue)) {
    return null;
  }
  return quote;
}

function validRealtimeServiceQuote(symbol: string): LiveMarketQuote | null {
  const quote = realtimeMarketFeedService.getQuote(symbol);
  if (!quote || !requireLiveData(quote)) return null;
  if (!positive(quote.price) || !positive(quote.volume) || !positive(quote.tradeValue)) {
    return null;
  }
  return quote;
}

function fromHub(
  input: ScanCandidateInput,
  quote: ServerMarketQuoteV20,
): ScanCandidateInput {
  const market = normalizeMarket(quote.market);
  return {
    ...input,
    market,
    exchange: normalizeExchange(input.exchange, market),
    price: quote.price,
    changePct: quote.changePct,
    volume: quote.volume,
    tradeValue: quote.tradeValue,
    spreadBps: spreadBps(quote.askPrice, quote.bidPrice) ?? input.spreadBps,
    liquiditySource: quote.source,
  };
}

function fromRealtimeService(
  input: ScanCandidateInput,
  quote: LiveMarketQuote,
): ScanCandidateInput {
  const market = normalizeMarket(quote.market);
  return {
    ...input,
    market,
    exchange: normalizeExchange(quote.exchange || input.exchange, market),
    price: quote.price!,
    changePct: quote.changeRate ?? input.changePct,
    volume: quote.volume!,
    tradeValue: quote.tradeValue!,
    liquiditySource: quote.source || quote.provider || "VERIFIED_REALTIME_FEED",
  };
}

export class ScannerCandidateTruthBridgeV20 {
  public static normalize(
    originalInput: ScanCandidateInput,
  ): ScannerCandidateTruthBridgeResultV20 {
    const normalizedMarket = normalizeMarket(
      (originalInput as unknown as { market?: unknown }).market,
    );

    let candidate: ScanCandidateInput = {
      ...originalInput,
      market: normalizedMarket,
      exchange: normalizeExchange(
        (originalInput as unknown as { exchange?: unknown }).exchange,
        normalizedMarket,
      ),
    };

    if (!hasLegacyProjectedLiquidityV20(candidate)) {
      return {
        candidate,
        repairedLiquidity: false,
      };
    }

    const hubQuote = validHubQuote(candidate.symbol);
    if (hubQuote) {
      candidate = fromHub(candidate, hubQuote);
      return {
        candidate,
        repairedLiquidity: true,
        source: hubQuote.source,
      };
    }

    const serviceQuote = validRealtimeServiceQuote(candidate.symbol);
    if (serviceQuote) {
      candidate = fromRealtimeService(candidate, serviceQuote);
      return {
        candidate,
        repairedLiquidity: true,
        source: serviceQuote.source || serviceQuote.provider || undefined,
      };
    }

    return {
      candidate,
      repairedLiquidity: false,
      rejectionReason: "LIQUIDITY_TRUTH_UNVERIFIED",
    };
  }
}
