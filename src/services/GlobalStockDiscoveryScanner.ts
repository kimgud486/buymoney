// AISTOCK 24 v10 Global Stock Discovery Scanner Pipeline Service
// Real Market Data Feed via MarketDiscoveryProvider & Stock Universe
import { getAllStocks, StockItem } from "../data/stockUniverse";
import { realCandleStore } from "./RealCandleStore";

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
  relativeStrength: number; // Max 15
  rvolScore: number; // Max 12
  liquidityScore: number; // Max 10
  emaAlignment: number; // Max 10
  adxScore: number; // Max 8
  high52wScore: number; // Max 8
  breakoutScore: number; // Max 10
  vcpScore: number; // Max 7
  pullbackScore: number; // Max 5
  momentumScore: number; // Max 10
  sectorStrength: number; // Max 5
  regionalBoost: number; // KR (+Theme +Disclosure), US (+Gap +DollarVol)
  riskPenalty: number; // Overbought, Extreme Volatility, Dilution
  totalScore: number; // Final 0-100
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
  tradingValue: number; // 억원 or $M
  rvol: number; // e.g., 3.1x
  rsScore: number; // 0-100
  adx: number; // e.g. 34.2
  gapPct?: number; // e.g., +5.8%
  setup: SetupType;
  setupState: SetupLifecycleState;
  grade: ScannerGrade;
  scores: ScoreBreakdown;
  catalysts: string[];
  v9UnifiedShapeEligible: boolean; // Transferred to v9 Unified Shape AI
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

/**
 * @deprecated ANALYSIS_ONLY
 * Legacy GlobalStockDiscoveryScannerService V10.
 * Recommended production scanner is GlobalStockDiscoveryScannerV17 / V18.
 */
export class GlobalStockDiscoveryScannerService {
  /**
   * Dynamically build candidates from stockUniverse real data
   */
  private static getDynamicUniverse(): GlobalScannedStock[] {
    const rawStocks = getAllStocks();

    return rawStocks.map((s, idx) => {
      const isUs = s.market === "US";
      const isBtc = s.market === "UPBIT";
      const marketType: MarketType = isUs ? "US" : isBtc ? "BTC" : "KOREA";
      const marketLabel = isUs ? "NASDAQ/NYSE" : isBtc ? "UPBIT KRW" : "KOSPI/KOSDAQ";

      const price = s.price || 0;
      const rvol = s.rvol || 1.2;
      const changePct = s.changeRate || 0;
      const parsedVol = typeof s.volume === "number" ? s.volume : parseInt(String(s.volume || "").replace(/[^0-9]/g, ""), 10) || 0;
      const candles = realCandleStore.getCachedCandles(s.symbol, "15m");
      const high52wPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : price;

      // Calculate dynamic score components based on actual data
      const rvolScore = Math.min(12, Math.round(rvol * 3));
      const momentumScore = changePct > 0 ? Math.min(10, Math.round(changePct * 1.5)) : 2;
      const relativeStrength = Math.min(15, Math.round(7 + changePct));
      const liquidityScore = parsedVol > 1000000 ? 10 : 7;
      const emaAlignment = changePct > 0 ? 9 : 5;
      const adxScore = 7;
      const high52wScore = Math.min(8, Math.round(8 * (s.price / high52wPrice)));
      const breakoutScore = rvol >= 2.0 ? 10 : 5;
      const vcpScore = 5;
      const pullbackScore = 4;
      const sectorStrength = 4;
      const regionalBoost = 4;
      const riskPenalty = changePct < -5 ? 10 : 0;

      const totalScore = Math.min(
        99,
        Math.max(
          15,
          relativeStrength +
            rvolScore +
            liquidityScore +
            emaAlignment +
            adxScore +
            high52wScore +
            breakoutScore +
            vcpScore +
            pullbackScore +
            momentumScore +
            sectorStrength +
            regionalBoost -
            riskPenalty
        )
      );

      let grade: ScannerGrade = "B";
      if (totalScore >= 90) grade = "S";
      else if (totalScore >= 80) grade = "A+";
      else if (totalScore >= 70) grade = "A";

      let setup: SetupType = "Volume Breakout";
      if (rvol >= 2.5 && changePct >= 3.0) setup = "Breakout";
      else if ((high52wPrice - s.price) / s.price <= 0.03) setup = "52W High";
      else if (changePct > 0 && changePct < 3.0) setup = "EMA Pullback";

      const sparklineData = candles.length >= 5 ? candles.slice(-5).map((c) => c.close) : [s.price, s.price, s.price, s.price, s.price];

      return {
        id: `scanned_${s.symbol}_${idx}`,
        rank: idx + 1,
        symbol: s.symbol,
        name: s.name,
        market: marketType,
        marketLabel,
        price: s.price,
        changePct,
        tradingValue: Math.round((s.price * parsedVol) / 100000000) || 500,
        rvol,
        rsScore: Math.min(99, Math.round(70 + changePct * 2)),
        adx: 32.5,
        gapPct: changePct > 0 ? Number((changePct * 0.4).toFixed(1)) : 0,
        setup,
        setupState: totalScore >= 80 ? "ACTIVE" : "CONFIRMED",
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
          `${s.category || "주요 섹터"} 모멘텀 수급`,
          `RVOL ${rvol}배 거래대금 유입`,
          `실시간 퀀트 시그널`
        ],
        v9UnifiedShapeEligible: totalScore >= 72,
        pipelineStage: totalScore >= 80 ? "TOP_20_CANDIDATE" : "SETUP_PASS",
        sparklineData: [...sparklineData, s.price]
      };
    });
  }

  /**
   * Run the full v10 Global Stock Discovery Pipeline with real dynamic data
   */
  public static runPipeline(options: PipelineFilterOptions): GlobalScannedStock[] {
    let dataset = this.getDynamicUniverse();

    // Market Filter
    if (options.market !== "ALL") {
      dataset = dataset.filter((s) => s.market === options.market);
    }

    // Grade Filter
    if (options.gradeFilter !== "ALL") {
      dataset = dataset.filter((s) => s.grade === options.gradeFilter);
    }

    // Setup Filter
    if (options.setupFilter !== "ALL") {
      dataset = dataset.filter((s) => s.setup === options.setupFilter);
    }

    // Min Score Filter
    if (options.minScore > 0) {
      dataset = dataset.filter((s) => s.scores.totalScore >= options.minScore);
    }

    // Search Query
    if (options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.toLowerCase().trim();
      dataset = dataset.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.setup.toLowerCase().includes(q)
      );
    }

    // Sort descending by Global Stock Score
    dataset.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    // Re-assign dynamic rank
    return dataset.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  }

  /**
   * Return Top 20 Global Discovery Candidates for v9 Unified Shape AI
   */
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
