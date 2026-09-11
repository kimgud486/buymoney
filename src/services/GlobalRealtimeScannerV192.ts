// ----------------------------------------------------------------------
// AISTOCK GLOBAL REALTIME SCANNER V19.2 (TRUTH-FIRST UNIFIED)
// Real Data Only - Zero Synthetic Fallback - Provenance & Evidence Driven
// ----------------------------------------------------------------------

import { LiveStockItem } from "../data/stockUniverse";
import { realtimeMarketFeedService, requireLiveData } from "./realtimeMarketFeedService";
import { realCandleStore } from "./RealCandleStore";
import { IndicatorTruthEngine } from "./IndicatorTruthEngine";
import { PatternTruthEngineV192 } from "./PatternTruthEngineV192";
import { Candle } from "./StructureBrain";
import { getExchangeMasterUniverseV20 } from "./ExchangeMasterUniverseSyncV20";
import { buildRealtimeHubStatusV20, RealtimeHubStatusV20 } from "../../server/v20/RealtimeHubStatusV20";
import { serverCandleWarmCoordinatorV20 } from "../../server/v20/ServerCandleWarmCoordinatorV20";

export type UsExchange = "NASDAQ" | "NYSE" | "AMEX" | "UNKNOWN";

export interface ScannerMetricsV192 {
  rvol: number | null;
  vwap: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  atr14: number | null;
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
  volume: number | null;
  tradeValue: number | null;
  quoteProvider: string | null;
  quoteSource: string | null;
  quoteTimestamp: number | null;
  volatilityScore: number;
  aiMatchScore: number;
  expectedReturnPct: number | null;
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

export interface MarketScanDiagnosticV192 {
  universe: number;
  liveQuoteReady: number;
  candle15mReady: number;
  passed: number;
}

export interface ScanResultV192 {
  scanTimestamp: string;
  scannedTotal: number;
  filteredCount: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  marketCounts: { KOREA: number; US: number; UPBIT: number };
  diagnostics: {
    KOREA: MarketScanDiagnosticV192;
    US: MarketScanDiagnosticV192;
    UPBIT: MarketScanDiagnosticV192;
  };
  hubStatus: RealtimeHubStatusV20;
  hotItems: HotListItemV192[];
}

type DetailedMarketScanResult = {
  items: HotListItemV192[];
  scannedCount: number;
  liveQuoteReady: number;
  candle15mReady: number;
};

const MIN_ANALYSIS_15M_BARS = 20;

const US_EXCHANGE_MAP: Record<string, UsExchange> = {
  NVDA: "NASDAQ", TSLA: "NASDAQ", AAPL: "NASDAQ", MSFT: "NASDAQ",
  AMZN: "NASDAQ", GOOGL: "NASDAQ", META: "NASDAQ", AMD: "NASDAQ",
  INTC: "NASDAQ", AVGO: "NASDAQ", ARM: "NASDAQ", SMCI: "NASDAQ",
  MSTR: "NASDAQ", QQQ: "NASDAQ", TQQQ: "NASDAQ", SOXL: "NASDAQ",
  SOXS: "NASDAQ", TSM: "NYSE", PLTR: "NYSE", COIN: "NASDAQ",
  LLY: "NYSE", NVO: "NYSE", SPY: "AMEX"
};

function scanMarketDetailed(
  stocks: LiveStockItem[],
  marketType: "KOREA" | "US" | "UPBIT",
  options?: { exchangeFilter?: string; patternFilter?: string; minObjectivePct?: number; minSetupScore?: number }
): DetailedMarketScanResult {
  const exchangeFilter = options?.exchangeFilter || "ALL";
  const patternFilter = options?.patternFilter || "ALL";
  const minObjectivePct = options?.minObjectivePct ?? 0;
  const minSetupScore = options?.minSetupScore ?? 50;
  const results: HotListItemV192[] = [];
  let scannedCount = 0;
  let liveQuoteReady = 0;
  let candle15mReady = 0;

  for (const stock of stocks) {
    scannedCount++;
    const exchange: UsExchange | string = marketType === "US"
      ? (US_EXCHANGE_MAP[stock.symbol] || "UNKNOWN")
      : marketType === "KOREA" ? stock.market : "UPBIT";
    if (marketType === "US" && exchangeFilter !== "ALL" && exchange !== exchangeFilter) continue;

    const quote = realtimeMarketFeedService.getQuote(stock.symbol);
    if (!requireLiveData(quote)) continue;
    liveQuoteReady++;

    const price = quote!.price!;
    const candles15m = realCandleStore.getCachedCandles(stock.symbol, "15m");
    if (!candles15m || candles15m.length < MIN_ANALYSIS_15M_BARS) continue;
    candle15mReady++;

    const rawCandles: Candle[] = candles15m.map(c => ({
      timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume
    }));
    const snapshot = IndicatorTruthEngine.computeSnapshot(rawCandles);
    const patternResults = PatternTruthEngineV192.evaluatePatterns(rawCandles);
    const changePct = quote!.changeRate ?? ((price - candles15m[0].close) / candles15m[0].close) * 100;
    const rvol = snapshot.rvol;
    const vwap = snapshot.vwap;
    const rsi = snapshot.rsi14;
    const atr = snapshot.atr14;
    const bullishPatterns = patternResults.filter(p => p.direction === "BULLISH");

    if (patternFilter !== "ALL") {
      const matchesPattern = patternResults.some(
        p => p.patternId.toLowerCase() === patternFilter.toLowerCase() || p.patternName.toLowerCase().includes(patternFilter.toLowerCase())
      );
      if (!matchesPattern) continue;
    }

    const distFromVwap = vwap != null ? ((price - vwap) / vwap) * 100 : 0;
    const chaseRisk = vwap != null && distFromVwap > 7.5;
    const exhaustionRisk = Math.abs(changePct) > 30.0 || (rsi != null && rsi > 80);
    if (chaseRisk || exhaustionRisk) continue;

    let evidenceCount = 0;
    const evidenceList: string[] = [];
    let totalMaxPoints = 0;
    let earnedPoints = 0;

    totalMaxPoints += 20;
    if (changePct > 0) {
      earnedPoints += Math.min(20, changePct * 2);
      evidenceCount++;
      evidenceList.push(`24h 변동률 +${changePct.toFixed(2)}% 모멘텀`);
    }
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
    if (vwap != null) {
      totalMaxPoints += 20;
      if (price >= vwap) {
        earnedPoints += 20;
        evidenceList.push(`VWAP $${vwap.toFixed(2)} 지지선 상회`);
      }
      evidenceCount++;
    }
    if (rsi != null) {
      totalMaxPoints += 20;
      if (rsi >= 45 && rsi <= 72) {
        earnedPoints += 20;
        evidenceList.push(`RSI14 ${rsi.toFixed(1)} 적정 매수 범위`);
      }
      evidenceCount++;
    }
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
    if (minObjectivePct > 0 && (planningYieldPct == null || planningYieldPct < minObjectivePct)) continue;

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
        rs15m: null,
        breakoutConfirmed: vwap != null ? price >= vwap : null,
        chaseRisk,
        exhaustionRisk,
        evidenceCoveragePct: Math.round(coverageRatio * 100)
      }
    });
  }

  results.sort((a, b) => b.setupScore - a.setupScore);
  return { items: results, scannedCount, liveQuoteReady, candle15mReady };
}

export class GlobalRealtimeScannerV192 {
  public static normalizeMarketInput(marketInput?: string): "ALL" | "KOREA" | "US" | "UPBIT" {
    if (!marketInput || marketInput === "ALL") return "ALL";
    const u = marketInput.toUpperCase();
    if (u === "BTC" || u === "CRYPTO" || u === "UPBIT") return "UPBIT";
    if (u === "US" || u === "USA") return "US";
    if (u === "KOREA" || u === "KR" || u === "KRX") return "KOREA";
    return "ALL";
  }

  public static scanMarket(
    stocks: LiveStockItem[],
    marketType: "KOREA" | "US" | "UPBIT",
    options?: { exchangeFilter?: string; patternFilter?: string; minObjectivePct?: number; minSetupScore?: number }
  ): { items: HotListItemV192[]; scannedCount: number } {
    const result = scanMarketDetailed(stocks, marketType, options);
    return { items: result.items, scannedCount: result.scannedCount };
  }
}

function emptyDiagnostic(universe = 0): MarketScanDiagnosticV192 {
  return { universe, liveQuoteReady: 0, candle15mReady: 0, passed: 0 };
}

async function prewarmKoreaLiveCandidates(krStocks: LiveStockItem[]): Promise<void> {
  const requests = krStocks
    .filter((stock) => {
      const quote = realtimeMarketFeedService.getQuote(stock.symbol);
      if (!requireLiveData(quote)) return false;
      return realCandleStore.getCachedCandles(stock.symbol, "15m").length < MIN_ANALYSIS_15M_BARS;
    })
    .slice(0, 6)
    .map((stock) => ({ symbol: stock.symbol, market: "KOREA" as const }));
  if (requests.length > 0) await serverCandleWarmCoordinatorV20.warmBatch(requests, 6);
}

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
  const universe = await getExchangeMasterUniverseV20();
  const allStocks = universe.liveStocks;
  const krStocks = allStocks.filter(s => s.market === "KOSPI" || s.market === "KOSDAQ");
  const usStocks = allStocks.filter(s => s.market === "US");
  const upbitStocks = allStocks.filter(s => s.market === "UPBIT");
  let hotItems: HotListItemV192[] = [];
  let totalScanned = 0;
  let krCount = 0;
  let usCount = 0;
  let upbitCount = 0;
  const diagnostics = {
    KOREA: emptyDiagnostic(krStocks.length),
    US: emptyDiagnostic(usStocks.length),
    UPBIT: emptyDiagnostic(upbitStocks.length),
  };
  const scanOpts = { exchangeFilter, patternFilter, minObjectivePct, minSetupScore };

  if (normalizedMarket === "ALL" || normalizedMarket === "KOREA") {
    await prewarmKoreaLiveCandidates(krStocks);
    const krRes = scanMarketDetailed(krStocks, "KOREA", scanOpts);
    hotItems.push(...krRes.items);
    krCount = krRes.scannedCount;
    totalScanned += krRes.scannedCount;
    diagnostics.KOREA = {
      universe: krStocks.length,
      liveQuoteReady: krRes.liveQuoteReady,
      candle15mReady: krRes.candle15mReady,
      passed: krRes.items.length
    };
  }
  if (normalizedMarket === "ALL" || normalizedMarket === "US") {
    const usRes = scanMarketDetailed(usStocks, "US", scanOpts);
    hotItems.push(...usRes.items);
    usCount = usRes.scannedCount;
    totalScanned += usRes.scannedCount;
    diagnostics.US = {
      universe: usStocks.length,
      liveQuoteReady: usRes.liveQuoteReady,
      candle15mReady: usRes.candle15mReady,
      passed: usRes.items.length
    };
  }
  if (normalizedMarket === "ALL" || normalizedMarket === "UPBIT") {
    const upbitRes = scanMarketDetailed(upbitStocks, "UPBIT", scanOpts);
    hotItems.push(...upbitRes.items);
    upbitCount = upbitRes.scannedCount;
    totalScanned += upbitRes.scannedCount;
    diagnostics.UPBIT = {
      universe: upbitStocks.length,
      liveQuoteReady: upbitRes.liveQuoteReady,
      candle15mReady: upbitRes.candle15mReady,
      passed: upbitRes.items.length
    };
  }

  hotItems.sort((a, b) => b.setupScore - a.setupScore);
  return {
    scanTimestamp: new Date().toLocaleTimeString("ko-KR"),
    scannedTotal: totalScanned,
    filteredCount: hotItems.length,
    dataStatus: hotItems.length > 0 ? "REALTIME_VERIFIED" : "NO_DATA",
    marketCounts: { KOREA: krCount, US: usCount, UPBIT: upbitCount },
    diagnostics,
    hubStatus: buildRealtimeHubStatusV20(),
    hotItems
  };
}
