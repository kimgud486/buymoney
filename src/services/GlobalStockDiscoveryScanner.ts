// AISTOCK 24 v10 Global Stock Discovery Scanner Pipeline Service
// TRUTH-FIRST compatibility layer: verified market values only, no synthetic fallbacks.
import { getAllStocks } from "../data/stockUniverse";
import { realCandleStore } from "./RealCandleStore";
import { IndicatorTruthEngine } from "./IndicatorTruthEngine";

export type MarketType = "KOREA" | "US" | "BTC";
export type ScannerGrade = "S" | "A+" | "A" | "B" | "WATCH" | "NO SETUP";
export type SetupType =
  | "Breakout"
  | "Breakout+Retest"
  | "52W High"
  | "VCP"
  | "EMA Pullback"
  | "First Pullback"
  | "Volume Breakout"
  | "Gap & Go"
  | "ORB"
  | "Base Breakout"
  | "Momentum Continuation"
  | "Relative Strength Leader";

export type SetupLifecycleState = "FORMING" | "CONFIRMED" | "ACTIVE" | "INVALIDATED";

export interface ScoreBreakdown {
  relativeStrength: number;
  rvolScore: number;
  liquidityScore: number;
  emaAlignment: number;
  adxScore: number;
  high52wScore: number;
  breakoutScore: number;
  vcpScore: number;
  pullbackScore: number;
  momentumScore: number;
  sectorStrength: number;
  regionalBoost: number;
  riskPenalty: number;
  totalScore: number;
}

export interface GlobalScannedStock {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  market: MarketType;
  marketLabel: string;
  price: number;
  changePct: number;
  tradingValue: number;
  rvol: number;
  rsScore: number;
  adx: number;
  gapPct?: number;
  setup: SetupType;
  setupState: SetupLifecycleState;
  grade: ScannerGrade;
  scores: ScoreBreakdown;
  catalysts: string[];
  v9UnifiedShapeEligible: boolean;
  pipelineStage: "UNIVERSE" | "LIQUIDITY_PASS" | "MOMENTUM_PASS" | "SETUP_PASS" | "TOP_20_CANDIDATE";
  sparklineData: number[];
}

export interface PipelineFilterOptions {
  market: "ALL" | "KOREA" | "US" | "BTC";
  minScore: number;
  gradeFilter: "ALL" | "S" | "A+" | "A" | "B";
  setupFilter: "ALL" | SetupType;
  searchQuery: string;
}

const MIN_VERIFIED_15M_BARS = 35;

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positiveNumber(value: unknown): number | null {
  const n = finiteNumber(value);
  return n != null && n > 0 ? n : null;
}

function parsedVolume(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * @deprecated ANALYSIS_ONLY
 * Legacy compatibility service used by older scanner UI code.
 * Production authority remains the verified realtime V19.2/V20 scanner path.
 *
 * Truth rule: a symbol is omitted unless price, volume, RVOL, change and a
 * verified non-stale 15m candle snapshot are all available. Missing evidence
 * never receives a believable default value.
 */
export class GlobalStockDiscoveryScannerService {
  private static getDynamicUniverse(): GlobalScannedStock[] {
    const rawStocks = getAllStocks();
    const candidates: GlobalScannedStock[] = [];

    rawStocks.forEach((s, idx) => {
      const price = positiveNumber(s.price);
      const rvol = positiveNumber(s.rvol);
      const changePct = finiteNumber(s.changeRate);
      const volume = parsedVolume(s.volume);
      const candleSnapshot = realCandleStore.getSnapshot(s.symbol, "15m");

      if (
        price == null ||
        rvol == null ||
        changePct == null ||
        volume == null ||
        !candleSnapshot ||
        !candleSnapshot.verified ||
        candleSnapshot.stale ||
        candleSnapshot.candles.length < MIN_VERIFIED_15M_BARS
      ) {
        return;
      }

      const candles = candleSnapshot.candles;
      const indicators = IndicatorTruthEngine.computeSnapshot(candles);
      const isUs = s.market === "US";
      const isBtc = s.market === "UPBIT";
      const marketType: MarketType = isUs ? "US" : isBtc ? "BTC" : "KOREA";
      const marketLabel = isUs ? "NASDAQ/NYSE" : isBtc ? "UPBIT KRW" : "KOSPI/KOSDAQ";

      const monetaryValue = price * volume;
      const tradingValue = isUs ? monetaryValue / 1_000_000 : monetaryValue / 100_000_000;

      const previous20 = candles.slice(-21, -1);
      const previous20High = previous20.length > 0 ? Math.max(...previous20.map((c) => c.high)) : null;
      const breakout = previous20High != null && price > previous20High && rvol >= 1.5;
      const ema20 = indicators.ema20;
      const ema9 = indicators.ema9;
      const ema50 = indicators.ema50;
      const nearEma20 = ema20 != null && ema20 > 0 && price >= ema20 && ((price - ema20) / ema20) <= 0.015;

      const relativeStrength = changePct > 0 ? Math.min(15, Math.round(changePct * 1.5)) : 0;
      const rvolScore = Math.min(12, Math.round(rvol * 3));
      const liquidityScore = tradingValue >= (isUs ? 20 : 500) ? 10 : tradingValue >= (isUs ? 5 : 100) ? 6 : 2;
      const emaAlignment = ema9 != null && ema20 != null && ema50 != null
        ? ema9 > ema20 && ema20 > ema50
          ? 10
          : ema9 > ema20
            ? 5
            : 0
        : 0;
      const adxScore = 0;
      const high52wScore = 0;
      const breakoutScore = breakout ? 10 : 0;
      const vcpScore = 0;
      const pullbackScore = nearEma20 ? 5 : 0;
      const momentumScore = changePct > 0 ? Math.min(10, Math.round(changePct * 1.5)) : 0;
      const sectorStrength = 0;
      const regionalBoost = 0;
      const riskPenalty = Math.abs(changePct) > 20 || (indicators.rsi14 != null && indicators.rsi14 > 80) ? 10 : 0;

      const totalScore = Math.max(0, Math.min(100,
        relativeStrength + rvolScore + liquidityScore + emaAlignment + adxScore +
        high52wScore + breakoutScore + vcpScore + pullbackScore + momentumScore +
        sectorStrength + regionalBoost - riskPenalty
      ));

      let grade: ScannerGrade = "NO SETUP";
      if (totalScore >= 70) grade = "A";
      else if (totalScore >= 60) grade = "B";
      else if (totalScore >= 45) grade = "WATCH";

      let setup: SetupType = "Momentum Continuation";
      if (breakout) setup = "Breakout";
      else if (nearEma20) setup = "EMA Pullback";
      else if (rvol >= 2.0) setup = "Volume Breakout";

      const sparklineData = candles.slice(-20).map((c) => c.close).filter((v) => Number.isFinite(v) && v > 0);
      if (sparklineData.length < 5) return;

      candidates.push({
        id: `scanned_${s.symbol}_${idx}`,
        rank: idx + 1,
        symbol: s.symbol,
        name: s.name,
        market: marketType,
        marketLabel,
        price,
        changePct,
        tradingValue: Number(tradingValue.toFixed(2)),
        rvol,
        rsScore: Math.round((relativeStrength / 15) * 100),
        adx: 0,
        gapPct: 0,
        setup,
        setupState: totalScore >= 60 ? "ACTIVE" : totalScore >= 45 ? "CONFIRMED" : "FORMING",
        grade,
        scores: {
          relativeStrength,
          rvolScore,
          liquidityScore,
          emaAlignment,
          adxScore,
          high52wScore,
          breakoutScore,
          vcpScore,
          pullbackScore,
          momentumScore,
          sectorStrength,
          regionalBoost,
          riskPenalty,
          totalScore
        },
        catalysts: [
          `검증된 실시간 가격/거래량`,
          `RVOL ${rvol.toFixed(2)}배`,
          `15분봉 ${candles.length}개 검증 완료`
        ],
        v9UnifiedShapeEligible: totalScore >= 55,
        pipelineStage: totalScore >= 60 ? "TOP_20_CANDIDATE" : totalScore >= 45 ? "SETUP_PASS" : "MOMENTUM_PASS",
        sparklineData
      });
    });

    return candidates;
  }

  public static runPipeline(options: PipelineFilterOptions): GlobalScannedStock[] {
    let dataset = this.getDynamicUniverse();

    if (options.market !== "ALL") dataset = dataset.filter((s) => s.market === options.market);
    if (options.gradeFilter !== "ALL") dataset = dataset.filter((s) => s.grade === options.gradeFilter);
    if (options.setupFilter !== "ALL") dataset = dataset.filter((s) => s.setup === options.setupFilter);
    if (options.minScore > 0) dataset = dataset.filter((s) => s.scores.totalScore >= options.minScore);

    if (options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.toLowerCase().trim();
      dataset = dataset.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.setup.toLowerCase().includes(q)
      );
    }

    dataset.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
    return dataset.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  public static getTop20Candidates(): GlobalScannedStock[] {
    return this.runPipeline({
      market: "ALL",
      minScore: 0,
      gradeFilter: "ALL",
      setupFilter: "ALL",
      searchQuery: ""
    }).slice(0, 20);
  }
}
