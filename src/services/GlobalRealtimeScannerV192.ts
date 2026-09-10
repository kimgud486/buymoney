// ----------------------------------------------------------------------
// AISTOCK GLOBAL REALTIME SCANNER V19.2 (TRUTH-FIRST UNIFIED)
// Real Data Only - Zero Synthetic Fallback - Provenance & Evidence Driven
// ----------------------------------------------------------------------

import { getAllStocks, LiveStockItem } from "../data/stockUniverse";
import { realtimeMarketFeedService, requireLiveData } from "./realtimeMarketFeedService";
import { realCandleStore } from "./RealCandleStore";
import { IndicatorTruthEngine } from "./IndicatorTruthEngine";
import { PatternTruthEngineV192 } from "./PatternTruthEngineV192";
import { Candle } from "./StructureBrain";

export type UsExchange = "NASDAQ" | "NYSE" | "AMEX" | "UNKNOWN";

export interface ScannerMetricsV192 {
  rvol: number | null;
  vwap: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  atr14: number | null;
  /** Benchmark-relative strength only. Null until a real benchmark comparison is available. */
  rs15m: number | null;
  breakoutConfirmed: boolean | null;
  chaseRisk: boolean | null;
  exhaustionRisk: boolean | null;
  evidenceCoveragePct: number;
}

export interface HotListItemV192 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange: UsExchange | string;
  currentPrice: number;
  priceChange24hPct: number;
  /** Actual cumulative/official quote volume when provided by the verified source. */
  volume: number | null;
  /** Actual cumulative/official quote trade value when provided by the verified source. */
  tradeValue: number | null;
  quoteProvider: string | null;
  quoteSource: string | null;
  quoteTimestamp: number | null;
  volatilityScore: number;
  aiMatchScore: number; // Equal to setupScore
  expectedReturnPct: number | null; // ATR 2R Planning Objective (null if no ATR)
  planningObjectiveNote: string;
  patternType: string;
  patternName: string;
  targetPrice: number | null;
  stopLoss: number | null;
  holdingPeriod: string;
  riskRewardRatio: string;
  volumeIncreaseRatio: number | null;
  rsiIndicator: number | null;
  reasoning: string;
  grade: "S" | "A" | "B" | "WATCH" | "REJECT";
  setupScore: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  evidenceCount: number;
  evidenceList: string[];
  metrics: ScannerMetricsV192;
}

export interface ScanResultV192 {
  scanTimestamp: string;
  scannedTotal: number;
  filteredCount: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  marketCounts: {
    KOREA: number;
    US: number;
    UPBIT: number;
  };
  hotItems: HotListItemV192[];
}

const US_EXCHANGE_MAP: Record<string, UsExchange> = {
  NVDA: "NASDAQ", TSLA: "NASDAQ", AAPL: "NASDAQ", MSFT: "NASDAQ",
  AMZN: "NASDAQ", GOOGL: "NASDAQ", META: "NASDAQ", AMD: "NASDAQ",
  INTC: "NASDAQ", AVGO: "NASDAQ", ARM: "NASDAQ", SMCI: "NASDAQ",
  MSTR: "NASDAQ", QQQ: "NASDAQ", TQQQ: "NASDAQ", SOXL: "NASDAQ",
  SOXS: "NASDAQ", TSM: "NYSE", PLTR: "NYSE", COIN: "NASDAQ",
  LLY: "NYSE", NVO: "NYSE", SPY: "AMEX"
};

/**
 * Universal V19.2 Stock Scanner Logic with Strict Real-Data Integrity
 */
export class GlobalRealtimeScannerV192 {
  /**
   * Normalize market input string (BTC/CRYPTO -> UPBIT)
   */
  public static normalizeMarketInput(marketInput?: string): "ALL" | "KOREA" | "US" | "UPBIT" {
    if (!marketInput || marketInput === "ALL") return "ALL";
    const u = marketInput.toUpperCase();
    if (u === "BTC" || u === "CRYPTO" || u === "UPBIT") return "UPBIT";
    if (u === "US" || u === "USA") return "US";
    if (u === "KOREA" || u === "KR" || u === "KRX") return "KOREA";
    return "ALL";
  }

  /**
   * Scan market with strict live data requirement and PatternTruthEngineV192
   */
  public static scanMarket(
    stocks: LiveStockItem[],
    marketType: "KOREA" | "US" | "UPBIT",
    options?: {
      exchangeFilter?: string;
      patternFilter?: string;
      minObjectivePct?: number;
      minSetupScore?: number;
    }
  ): { items: HotListItemV192[]; scannedCount: number } {
    const exchangeFilter = options?.exchangeFilter || "ALL";
    const patternFilter = options?.patternFilter || "ALL";
    const minObjectivePct = options?.minObjectivePct ?? 0;
    const minSetupScore = options?.minSetupScore ?? 50;

    const results: HotListItemV192[] = [];
    let scannedCount = 0;

    for (const stock of stocks) {
      scannedCount++;

      // Preserve the actual domestic exchange instead of collapsing KOSPI/KOSDAQ into "KOREA".
      const exchange: UsExchange | string = marketType === "US"
        ? (US_EXCHANGE_MAP[stock.symbol] || "UNKNOWN")
        : marketType === "KOREA"
          ? stock.market
          : "UPBIT";

      if (marketType === "US" && exchangeFilter !== "ALL" && exchange !== exchangeFilter) {
        continue;
      }

      const quote = realtimeMarketFeedService.getQuote(stock.symbol);

      // DATA INTEGRITY GATE: Must satisfy requireLiveData(quote)
      if (!requireLiveData(quote)) {
        continue; // Skip non-live or unverified execution quotes
      }

      const price = quote!.price!;
      const candles15m = realCandleStore.getCachedCandles(stock.symbol, "15m");

      // Minimum 35 candles required for warm-up of indicators
      if (!candles15m || candles15m.length < 35) {
        continue;
      }

      const rawCandles: Candle[] = candles15m.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      }));

      const snapshot = IndicatorTruthEngine.computeSnapshot(rawCandles);
      const patternResults = PatternTruthEngineV192.evaluatePatterns(rawCandles);

      const changePct = quote!.changeRate ?? ((price - candles15m[0].close) / candles15m[0].close) * 100;
      const rvol = snapshot.rvol;
      const vwap = snapshot.vwap;
      const rsi = snapshot.rsi14;
      const atr = snapshot.atr14;

      // Filter pattern if specific pattern requested
      const bullishPatterns = patternResults.filter(p => p.direction === "BULLISH");
      if (patternFilter !== "ALL") {
        const matchesPattern = patternResults.some(
          p => p.patternId.toLowerCase() === patternFilter.toLowerCase() ||
               p.patternName.toLowerCase().includes(patternFilter.toLowerCase())
        );
        if (!matchesPattern) continue;
      }

      // Risk Guards
      const distFromVwap = vwap != null ? ((price - vwap) / vwap) * 100 : 0;
      const chaseRisk = vwap != null && distFromVwap > 7.5;
      const exhaustionRisk = Math.abs(changePct) > 30.0 || (rsi != null && rsi > 80);

      if (chaseRisk || exhaustionRisk) continue;

      // Evidence-Driven Setup Score (0 to 100)
      let evidenceCount = 0;
      const evidenceList: string[] = [];
      let totalMaxPoints = 0;
      let earnedPoints = 0;

      // 1. Price Momentum (Max 20)
      totalMaxPoints += 20;
      if (changePct > 0) {
        earnedPoints += Math.min(20, changePct * 2);
        evidenceCount++;
        evidenceList.push(`24h 변동률 +${changePct.toFixed(2)}% 모멘텀`);
      }

      // 2. Relative Volume RVOL (Max 20)
      if (rvol != null) {
        totalMaxPoints += 20;
        if (rvol >= 2.0) {
          earnedPoints += 20;
          evidenceList.push(`RVOL ${rvol.toFixed(2)}배 강한 수급 급증`);
        } else if (rvol >= 1.3) {
          earnedPoints += 12;
          evidenceList.push(`RVOL ${rvol.toFixed(2)}배 유효 수급`);
        }
        evidenceCount++;
      }

      // 3. VWAP Support/Breakout (Max 20)
      if (vwap != null) {
        totalMaxPoints += 20;
        if (price >= vwap) {
          earnedPoints += 20;
          evidenceList.push(`VWAP $${vwap.toFixed(2)} 지지선 상회`);
        }
        evidenceCount++;
      }

      // 4. RSI Range (Max 20)
      if (rsi != null) {
        totalMaxPoints += 20;
        if (rsi >= 45 && rsi <= 72) {
          earnedPoints += 20;
          evidenceList.push(`RSI14 ${rsi.toFixed(1)} 적정 매수 범위`);
        }
        evidenceCount++;
      }

      // 5. Verified Candlestick Pattern Evidence (Max 20)
      if (bullishPatterns.length > 0) {
        totalMaxPoints += 20;
        const topPattern = bullishPatterns[0];
        earnedPoints += Math.min(20, Math.round(topPattern.confidence * 0.2));
        evidenceCount++;
        evidenceList.push(...topPattern.evidence);
      }

      const coverageRatio = totalMaxPoints > 0 ? totalMaxPoints / 100 : 0;
      const setupScore = totalMaxPoints > 0 ? Math.round((earnedPoints / totalMaxPoints) * 100) : 0;

      if (setupScore < minSetupScore) continue;

      let grade: HotListItemV192["grade"] = "REJECT";
      if (setupScore >= 85) grade = "S";
      else if (setupScore >= 70) grade = "A";
      else if (setupScore >= 55) grade = "B";
      else if (setupScore >= 45) grade = "WATCH";

      if (grade === "REJECT") continue;

      // Planning Objective based ONLY on actual ATR (No fallback multiplier like price * 0.02!)
      let stopLoss: number | null = null;
      let targetPrice: number | null = null;
      let planningYieldPct: number | null = null;
      let rrRatio = "N/A";

      if (atr != null && atr > 0) {
        stopLoss = Math.round((price - atr * 1.5) * 100) / 100;
        targetPrice = Math.round((price + atr * 3.0) * 100) / 100;
        planningYieldPct = +(((targetPrice - price) / price) * 100).toFixed(1);
        rrRatio = stopLoss < price ? "1 : " + ((targetPrice - price) / (price - stopLoss)).toFixed(1) : "1 : 2.0";
      }

      // If minObjectivePct filter is requested and ATR planning yield is insufficient or missing, skip
      if (minObjectivePct > 0) {
        if (planningYieldPct == null || planningYieldPct < minObjectivePct) {
          continue;
        }
      }

      const topBull = bullishPatterns[0];
      const patternType = topBull ? topBull.patternId : "NO_PATTERN";
      const patternName = topBull ? topBull.patternName : "미검출";

      const reasoning = `[${marketType} 실시간 스캐너] ${evidenceList.slice(0, 3).join(", ")}.`;

      results.push({
        symbol: stock.symbol,
        name: stock.name,
        market: marketType === "UPBIT" ? "BTC" : marketType,
        exchange,
        currentPrice: price,
        priceChange24hPct: +changePct.toFixed(2),
        volume: quote!.volume,
        tradeValue: quote!.tradeValue,
        quoteProvider: quote!.provider,
        quoteSource: quote!.source,
        quoteTimestamp: quote!.providerTimestamp,
        volatilityScore: Math.min(99, Math.round(Math.abs(changePct) * 3 + 50)),
        aiMatchScore: setupScore,
        expectedReturnPct: planningYieldPct,
        planningObjectiveNote: atr != null ? "ATR 기반 2R 계획목표 (수익 보장 수치 아님)" : "ATR 미산출 (계획목표 미제공)",
        patternType,
        patternName,
        targetPrice,
        stopLoss,
        holdingPeriod: "1일~5일",
        riskRewardRatio: rrRatio,
        volumeIncreaseRatio: rvol,
        rsiIndicator: rsi,
        reasoning,
        grade,
        setupScore,
        dataStatus: "REALTIME_VERIFIED",
        evidenceCount,
        evidenceList,
        metrics: {
          rvol,
          vwap,
          ema9: snapshot.ema9,
          ema20: snapshot.ema20,
          ema50: snapshot.ema50,
          rsi14: rsi,
          atr14: atr,
          // Price change is momentum, not benchmark-relative strength.
          rs15m: null,
          breakoutConfirmed: vwap != null ? price >= vwap : null,
          chaseRisk,
          exhaustionRisk,
          evidenceCoveragePct: Math.round(coverageRatio * 100)
        }
      });
    }

    results.sort((a, b) => b.setupScore - a.setupScore);
    return { items: results, scannedCount };
  }
}

/**
 * Top-level Scan Execution Function for AI Hot List V19.2
 */
export async function scanGlobalRealtimeHotListV192(options?: {
  marketFilter?: "ALL" | "KOREA" | "US" | "UPBIT" | "BTC" | "CRYPTO";
  exchangeFilter?: string;
  patternFilter?: string;
  minYield?: number;
  minObjectivePct?: number;
  minSetupScore?: number;
}): Promise<ScanResultV192> {
  const normalizedMarket = GlobalRealtimeScannerV192.normalizeMarketInput(options?.marketFilter);
  const exchangeFilter = options?.exchangeFilter || "ALL";
  const patternFilter = options?.patternFilter || "ALL";
  const minObjectivePct = options?.minObjectivePct ?? options?.minYield ?? 0;
  const minSetupScore = options?.minSetupScore ?? 50;

  const allStocks = getAllStocks();

  const krStocks = allStocks.filter(s => s.market === "KOSPI" || s.market === "KOSDAQ");
  const usStocks = allStocks.filter(s => s.market === "US");
  const upbitStocks = allStocks.filter(s => s.market === "UPBIT");

  let hotItems: HotListItemV192[] = [];
  let totalScanned = 0;

  let krCount = 0;
  let usCount = 0;
  let upbitCount = 0;

  const scanOpts = { exchangeFilter, patternFilter, minObjectivePct, minSetupScore };

  if (normalizedMarket === "ALL" || normalizedMarket === "KOREA") {
    const krRes = GlobalRealtimeScannerV192.scanMarket(krStocks, "KOREA", scanOpts);
    hotItems.push(...krRes.items);
    krCount = krRes.scannedCount;
    totalScanned += krRes.scannedCount;
  }

  if (normalizedMarket === "ALL" || normalizedMarket === "US") {
    const usRes = GlobalRealtimeScannerV192.scanMarket(usStocks, "US", scanOpts);
    hotItems.push(...usRes.items);
    usCount = usRes.scannedCount;
    totalScanned += usRes.scannedCount;
  }

  if (normalizedMarket === "ALL" || normalizedMarket === "UPBIT") {
    const upbitRes = GlobalRealtimeScannerV192.scanMarket(upbitStocks, "UPBIT", scanOpts);
    hotItems.push(...upbitRes.items);
    upbitCount = upbitRes.scannedCount;
    totalScanned += upbitRes.scannedCount;
  }

  hotItems.sort((a, b) => b.setupScore - a.setupScore);

  const dataStatus = hotItems.length > 0 ? "REALTIME_VERIFIED" : "NO_DATA";

  return {
    scanTimestamp: new Date().toLocaleTimeString("ko-KR"),
    scannedTotal: totalScanned,
    filteredCount: hotItems.length,
    dataStatus,
    marketCounts: {
      KOREA: krCount,
      US: usCount,
      UPBIT: upbitCount
    },
    hotItems
  };
}
