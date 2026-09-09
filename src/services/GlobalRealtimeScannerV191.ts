// ----------------------------------------------------------------------
// AISTOCK GLOBAL REALTIME SCANNER V19.1 - COMPATIBILITY FACADE
// ----------------------------------------------------------------------
// DEPRECATED: Do not add scanning/scoring logic to this file.
//
// V19.1 used to duplicate the complete realtime scan pipeline. That created
// multiple sources of truth for indicators, pattern detection, risk guards,
// grading, and ATR objectives. V19.1 now delegates to V19.2 so old imports keep
// working without running a second independent scanner implementation.
//
// Production decision authority belongs to ServerGlobalRealtimeScannerV20.
// V19.2 remains a legacy hot-list compatibility layer while callers migrate.
// ----------------------------------------------------------------------

import type { LiveStockItem } from "../data/stockUniverse";
import {
  GlobalRealtimeScannerV192,
  scanGlobalRealtimeHotListV192,
  type HotListItemV192,
  type ScannerMetricsV192,
} from "./GlobalRealtimeScannerV192";

export type UsExchange = "NASDAQ" | "NYSE" | "AMEX";

export type ScannerMetricsV191 = ScannerMetricsV192;

export interface HotListItemV191 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange?: UsExchange | string;
  currentPrice: number;
  priceChange24hPct: number;
  volatilityScore: number;
  aiMatchScore: number;
  expectedReturnPct: number;
  planningObjectiveNote: string;
  patternType: string;
  patternName: string;
  targetPrice: number;
  stopLoss: number;
  holdingPeriod: string;
  riskRewardRatio: string;
  volumeIncreaseRatio: number | null;
  rsiIndicator: number | null;
  reasoning: string;
  grade: "S" | "A" | "B" | "WATCH" | "REJECT";
  setupScore: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  evidenceCount: number;
  metrics: ScannerMetricsV191;
}

export interface ScanResultV191 {
  scanTimestamp: string;
  scannedTotal: number;
  filteredCount: number;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  marketCounts: {
    KOREA: number;
    US: number;
    UPBIT: number;
  };
  hotItems: HotListItemV191[];
}

/**
 * V19.1 required numeric ATR-derived planning levels. V19.2 intentionally
 * returns null when ATR evidence is unavailable. For truth-first compatibility
 * we drop those incomplete rows instead of manufacturing a fallback target.
 */
function toV191Item(item: HotListItemV192): HotListItemV191 | null {
  if (
    item.expectedReturnPct == null ||
    item.targetPrice == null ||
    item.stopLoss == null
  ) {
    return null;
  }

  return {
    symbol: item.symbol,
    name: item.name,
    market: item.market,
    exchange: item.exchange,
    currentPrice: item.currentPrice,
    priceChange24hPct: item.priceChange24hPct,
    volatilityScore: item.volatilityScore,
    aiMatchScore: item.aiMatchScore,
    expectedReturnPct: item.expectedReturnPct,
    planningObjectiveNote: item.planningObjectiveNote,
    patternType: item.patternType,
    patternName: item.patternName,
    targetPrice: item.targetPrice,
    stopLoss: item.stopLoss,
    holdingPeriod: item.holdingPeriod,
    riskRewardRatio: item.riskRewardRatio,
    volumeIncreaseRatio: item.volumeIncreaseRatio,
    rsiIndicator: item.rsiIndicator,
    reasoning: item.reasoning,
    grade: item.grade,
    setupScore: item.setupScore,
    dataStatus: item.dataStatus,
    evidenceCount: item.evidenceCount,
    metrics: item.metrics,
  };
}

function mapV191Items(items: HotListItemV192[]): HotListItemV191[] {
  return items
    .map(toV191Item)
    .filter((item): item is HotListItemV191 => item !== null);
}

/**
 * @deprecated Use GlobalRealtimeScannerV192 for legacy hot-list collection or
 * ServerGlobalRealtimeScannerV20 for production candidate decisions.
 */
export class GlobalRealtimeScannerV191 {
  public static scanMarket(
    stocks: LiveStockItem[],
    marketType: "KOREA" | "US" | "UPBIT",
    options?: { exchangeFilter?: string; minSetupScore?: number }
  ): { items: HotListItemV191[]; scannedCount: number } {
    const result = GlobalRealtimeScannerV192.scanMarket(stocks, marketType, {
      exchangeFilter: options?.exchangeFilter,
      minSetupScore: options?.minSetupScore,
    });

    return {
      items: mapV191Items(result.items),
      scannedCount: result.scannedCount,
    };
  }
}

/**
 * @deprecated Compatibility entry point. It delegates to V19.2 and never runs
 * a separate V19.1 scan implementation.
 */
export async function scanGlobalRealtimeHotListV191(options?: {
  marketFilter?: "ALL" | "KOREA" | "US" | "UPBIT";
  exchangeFilter?: string;
}): Promise<ScanResultV191> {
  const result = await scanGlobalRealtimeHotListV192({
    marketFilter: options?.marketFilter,
    exchangeFilter: options?.exchangeFilter,
  });

  const hotItems = mapV191Items(result.hotItems);

  return {
    scanTimestamp: result.scanTimestamp,
    scannedTotal: result.scannedTotal,
    filteredCount: hotItems.length,
    dataStatus: hotItems.length > 0 ? "REALTIME_VERIFIED" : "NO_DATA",
    marketCounts: result.marketCounts,
    hotItems,
  };
}
