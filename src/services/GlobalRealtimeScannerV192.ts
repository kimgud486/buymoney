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
import { koreaYesOnlyHotListRuntimeV204 } from "../../server/v20/KoreaYesOnlyHotListRuntimeV204";
import { koreaServerDiscoveryV204 } from "../../server/v20/KoreaServerDiscoveryV204";

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
  v204?: {
    koreaStrictEnabled: boolean;
    yesOnly: boolean;
    evaluatedCount: number;
    rejectedCount: number;
    note: string;
  };
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
 * Legacy/client-assisted V19.2 scan path. KOREA final publication no longer
 * depends on this in V20.4; US/UPBIT continue to use it until equivalent
 * server-side history validators are implemented.
 */
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

      const exchange: UsExchange | string = marketType === "US"
        ? (US_EXCHANGE_MAP[stock.symbol] || "UNKNOWN")
        : marketType;

      if (marketType === "US" && exchangeFilter !== "ALL" && exchange !== exchangeFilter) {
        continue;
      }

      const quote = realtimeMarketFeedService.getQuote(stock.symbol);
      if (!requireLiveData(quote)) {
        continue;
      }

      const price = quote!.price;
      const candles15m = realCandleStore.getCachedCandles(stock.symbol, "15m");
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

      const bullishPatterns = patternResults.filter(p => p.direction === "BULLISH");
      if (patternFilter !== "ALL") {
        const matchesPattern = patternResults.some(
          p => p.patternId.toLowerCase() === patternFilter.toLowerCase() ||
               p.patternName.toLowerCase().includes(patternFilter.toLowerCase())
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
          evidenceList.push(`VWAP ${vwap.toFixed(2)} 지지선 상회`);
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

      if (minObjectivePct > 0) {
        if (planningYieldPct == null || planningYieldPct < minObjectivePct) {
          continue;
        }
      }

      const topBull = bullishPatterns[0];
      const patternType = topBull ? topBull.patternId : "TECHNICAL_SETUP";
      const patternName = topBull ? topBull.patternName : "실시간 수급 변곡 패턴";
      const reasoning = `[${marketType} 실시간 스캐너] ${evidenceList.slice(0, 3).join(", ")}.`;

      results.push({
        symbol: stock.symbol,
        name: stock.name,
        market: marketType === "UPBIT" ? "BTC" : marketType,
        exchange,
        currentPrice: price,
        priceChange24hPct: +changePct.toFixed(2),
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
          rs15m: +changePct.toFixed(1),
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
 * Top-level scan execution.
 * KOREA: server discovery (DISPLAY_ONLY) -> KIS deep verification -> YES-only.
 * US/UPBIT: existing V19.2 path until equivalent server history gates exist.
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
  const usStocks = allStocks.filter(s => s.market === "US");
  const upbitStocks = allStocks.filter(s => s.market === "UPBIT");

  let hotItems: HotListItemV192[] = [];
  let totalScanned = 0;
  let krCount = 0;
  let usCount = 0;
  let upbitCount = 0;
  let v204Meta: ScanResultV192["v204"] | undefined;

  const scanOpts = { exchangeFilter, patternFilter, minObjectivePct, minSetupScore };

  if (normalizedMarket === "ALL" || normalizedMarket === "KOREA") {
    const discovery = await koreaServerDiscoveryV204.discover();
    const strict = await koreaYesOnlyHotListRuntimeV204.filterYesOnly(discovery.candidates);
    hotItems.push(...strict.approved);
    krCount = discovery.scannedTotal;
    totalScanned += discovery.scannedTotal;
    v204Meta = {
      koreaStrictEnabled: true,
      yesOnly: true,
      evaluatedCount: strict.evaluatedCount,
      rejectedCount: strict.rejectedCount,
      note: `KOREA ${discovery.receivedQuotes}개 실시간 발견값은 DISPLAY_ONLY로 후보 압축에만 사용. 최종 결과는 KIS 역사봉/현재가/1m·3m·5m·D/V20.4를 모두 통과한 YES만 표시합니다.`
    };
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
    hotItems,
    ...(v204Meta ? { v204: v204Meta } : {})
  };
}
