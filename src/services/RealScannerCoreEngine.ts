// ----------------------------------------------------------------------
// REAL SCANNER CORE ENGINE (V14.1 TRUTH ENGINE INTEGRATED)
// Pure Candle Technical Indicators, SMC & Multi-Timeframe Truth Analysis
// ----------------------------------------------------------------------

import { Candle, StructureBrain, StructureBrainAnalysisResult } from "./StructureBrain";
import { MarketDataIntegrityGate } from "./MarketDataIntegrityGate";
import { LiveMarketQuote, requireLiveData } from "./realtimeMarketFeedService";
import { IndicatorSnapshot, IndicatorTruthEngine } from "./IndicatorTruthEngine";
import { MarketSessionService } from "./MarketSessionService";
import { MultiTimeframeAnalysisEngine, MultiTimeframeResult } from "./MultiTimeframeAnalysisEngine";

export interface ScannerAnalysis {
  indicator: {
    vwap: number | null;
    rvol: number | null;
    atr: number | null;
    rsi: number | null;
    macdHistogram: number | null;
    adx: number | null;
    ema20: number | null;
  };

  structure: {
    trend: "UP" | "DOWN" | "RANGE" | "NO_DATA";
    hh: boolean;
    hl: boolean;
    bos: boolean;
    choch: boolean;
  };

  pattern: {
    orb: boolean;
    gapAndGo: boolean;
    firstPullback: boolean;
    breakout: boolean;
    retest: boolean;
    vwapReclaim: boolean;
    bullFlag: boolean;
  };

  smc: {
    fvg: boolean;
    fvgFillRate: number | null;
    orderBlock: boolean;
    liquiditySweep: boolean;
    smcStructureScore: number | null;
  };

  risk: {
    chaseRisk: number | null;
    falseBreakoutRisk: number | null;
    spreadRisk: number | null;
  };
}

export interface RealScannerResult {
  symbol: string;
  dataStatus: "LIVE" | "STALE" | "NO_DATA";
  analysisAllowed: boolean;
  tradingAllowed: boolean;
  score: number | null;
  grade: "S+" | "S" | "A+" | "A" | "B" | "WATCH" | "NO_SETUP" | null;
  signal: "BUY_CANDIDATE" | "WATCH" | "REJECT" | "NO_DATA";
  proposedRiskFloor: number | null;
  projectedSellLow: number | null;
  projectedSellMid: number | null;
  projectedSellHigh: number | null;
  analysis: ScannerAnalysis;
  indicators: IndicatorSnapshot;
  mtfResult: MultiTimeframeResult;
  brainResult: StructureBrainAnalysisResult | null;
  summary: string;
}

export function calculateSetupScore(a: ScannerAnalysis): number | null {
  if (
    a.indicator.vwap == null ||
    a.indicator.rvol == null ||
    a.indicator.atr == null ||
    a.indicator.macdHistogram == null ||
    a.indicator.adx == null
  ) {
    return null;
  }

  let score = 0;

  if (a.structure.trend === "UP") score += 12;
  if (a.structure.hh && a.structure.hl) score += 10;
  if (a.structure.bos) score += 8;

  if (a.indicator.rvol >= 2.0) score += 12;
  else if (a.indicator.rvol >= 1.5) score += 7;

  if (a.indicator.macdHistogram > 0) score += 8;
  if (a.indicator.adx >= 25) score += 8;

  if (a.pattern.breakout) score += 8;
  if (a.pattern.retest) score += 8;
  if (a.pattern.vwapReclaim) score += 7;
  if (a.pattern.firstPullback) score += 8;
  if (a.pattern.orb) score += 5;

  if (a.smc.liquiditySweep) score += 5;
  if (a.smc.orderBlock) score += 5;

  if ((a.risk.chaseRisk ?? 100) > 60) score -= 15;
  if ((a.risk.falseBreakoutRisk ?? 100) > 60) score -= 15;

  return Math.max(0, Math.min(score, 100));
}

export class RealScannerCoreEngine {
  /**
   * Main Analysis Entry Point for Verified Candles & Real Live Quote
   */
  public static analyze(
    symbol: string,
    rawCandles: Candle[],
    liveQuote?: LiveMarketQuote,
    market: "KR" | "US" | "CRYPTO" = "KR"
  ): RealScannerResult {
    // 1. Fail-Closed Data Verification Gate
    const candleVerification = MarketDataIntegrityGate.verifyCandles(rawCandles);
    const quoteVerification = liveQuote
      ? MarketDataIntegrityGate.verifyQuote(liveQuote)
      : { isVerified: false, metadata: null };

    if (!candleVerification.isVerified || rawCandles.length < 10) {
      const emptyIndicators = IndicatorTruthEngine.computeSnapshot([]);
      const emptyMTF: MultiTimeframeResult = {
        m1: null, m3: null, m5: null, m15: null, m30: null, h1: null, d1: null,
        bullishCount: 0, bearishCount: 0, timeframesEvaluated: 0, consensus: "NO_DATA"
      };

      return {
        symbol,
        dataStatus: "NO_DATA",
        analysisAllowed: false,
        tradingAllowed: false,
        score: null,
        grade: null,
        signal: "NO_DATA",
        proposedRiskFloor: null,
        projectedSellLow: null,
        projectedSellMid: null,
        projectedSellHigh: null,
        analysis: {
          indicator: { vwap: null, rvol: null, atr: null, rsi: null, macdHistogram: null, adx: null, ema20: null },
          structure: { trend: "NO_DATA", hh: false, hl: false, bos: false, choch: false },
          pattern: { orb: false, gapAndGo: false, firstPullback: false, breakout: false, retest: false, vwapReclaim: false, bullFlag: false },
          smc: { fvg: false, fvgFillRate: null, orderBlock: false, liquiditySweep: false, smcStructureScore: null },
          risk: { chaseRisk: null, falseBreakoutRisk: null, spreadRisk: null }
        },
        indicators: emptyIndicators,
        mtfResult: emptyMTF,
        brainResult: null,
        summary: "실시간 OHLCV 캔들 데이터 부족 (NO_DATA) - AI 분석 및 매수 차단"
      };
    }

    const candles = rawCandles;
    const len = candles.length;
    const currentPrice = liveQuote?.price || candles[len - 1].close;

    // 2. Compute Pure Indicators via IndicatorTruthEngine with Session Reset
    const sessionInfo = MarketSessionService.getSessionInfo(market);
    const sessionOpen = sessionInfo.openTimestamp || Number(candles[0]?.timestamp) || 0;
    const indicators = IndicatorTruthEngine.computeSnapshot(candles, sessionOpen > 0 ? sessionOpen : undefined);

    // 3. Market Structure Analysis via StructureBrain
    const brainResult = StructureBrain.analyze(candles, { swingWindowLeft: 2, swingWindowRight: 2 }, symbol);

    const isUpTrend = brainResult.currentStructureTrend.startsWith("BULLISH");
    const isDownTrend = brainResult.currentStructureTrend.startsWith("BEARISH");
    const trendState = isUpTrend ? "UP" : isDownTrend ? "DOWN" : "RANGE";

    const hasHh = brainResult.swingHighs.length > 1 &&
      brainResult.swingHighs[brainResult.swingHighs.length - 1].price > brainResult.swingHighs[brainResult.swingHighs.length - 2].price;
    const hasHl = brainResult.swingLows.length > 1 &&
      brainResult.swingLows[brainResult.swingLows.length - 1].price > brainResult.swingLows[brainResult.swingLows.length - 2].price;
    const hasBos = brainResult.structureBreaks.some((b) => b.type === "BOS" && b.direction === "BULLISH");
    const hasChoch = brainResult.structureBreaks.some((b) => b.type === "CHOCH" && b.direction === "BULLISH");

    // 4. Multi-Timeframe Analysis
    const mtfResult = MultiTimeframeAnalysisEngine.analyzeSymbol(symbol);

    // 5. Session-Aware Pattern Recognition (ORB & Gap & Go)
    const rvol = indicators.rvol;
    const vwap = indicators.vwap;
    const ema20 = indicators.ema20;

    // True Session ORB Calculation (First 15m of Regular Session)
    const openingRangeCandles = candles.filter((c) => {
      const ts = Number(c.timestamp);
      return sessionOpen > 0 ? (ts >= sessionOpen && ts < sessionOpen + 15 * 60 * 1000) : false;
    });

    const orbHigh = openingRangeCandles.length > 0
      ? Math.max(...openingRangeCandles.map((c) => c.high))
      : Math.max(...candles.slice(0, Math.min(5, candles.length)).map((c) => c.high));

    const orb = orbHigh > 0 && currentPrice > orbHigh && (rvol ?? 0) >= 1.5;

    // True Session Gap Calculation
    const firstCandleInSession = candles.find((c) => Number(c.timestamp) >= sessionOpen) || candles[0];
    const prevSessionCandles = candles.filter((c) => Number(c.timestamp) < sessionOpen);
    const prevRegularClose = prevSessionCandles.length > 0
      ? prevSessionCandles[prevSessionCandles.length - 1].close
      : (candles[len - 2]?.close || currentPrice);

    const sessionOpenPrice = firstCandleInSession ? firstCandleInSession.open : currentPrice;
    const sessionGapPct = prevRegularClose > 0 ? ((sessionOpenPrice - prevRegularClose) / prevRegularClose) * 100 : 0;
    const gapAndGo = (rvol ?? 0) >= 1.8 && sessionGapPct >= 1.5;

    const recent20 = candles.slice(-20);
    const breakout = currentPrice > Math.max(...recent20.slice(0, -1).map((c) => c.high));
    const vwapReclaim = vwap != null && candles[len - 2].close < vwap && currentPrice > vwap;
    const firstPullback = ema20 != null && isUpTrend && currentPrice <= ema20 * 1.01 && currentPrice >= ema20 * 0.99;
    const retest = breakout && candles[len - 1].low <= Math.max(...recent20.slice(0, -2).map((c) => c.high));
    const bullFlag = rvol != null && ema20 != null && ema20 > 0 && isUpTrend && rvol < 1.2 && Math.abs(currentPrice - ema20) / ema20 < 0.015;

    // 6. SMC Components
    const hasFvg = brainResult.fairValueGaps.some((g) => !g.isFilled);
    const fvgFillRate = brainResult.keyLevels.activeBullishFVG ? brainResult.keyLevels.activeBullishFVG.fillPercentage : null;
    const hasOb = Boolean(brainResult.keyLevels.nearestBullishOB);
    const hasSweep = Boolean(brainResult.keyLevels.lastSweep);

    // 7. Risk Metrics
    const chaseRisk = vwap != null && vwap > 0 ? +(Math.max(0, ((currentPrice - vwap) / vwap) * 100 * 5)).toFixed(1) : null;
    const falseBreakoutRisk = rvol !== null && chaseRisk !== null ? +((1 - Math.min(rvol / 2.0, 1.0)) * 50 + (chaseRisk > 30 ? 30 : 0)).toFixed(1) : null;
    const spreadRisk = null; // null if orderbook spread unavailable

    const analysis: ScannerAnalysis = {
      indicator: {
        vwap: indicators.vwap,
        rvol: indicators.rvol,
        atr: indicators.atr14,
        rsi: indicators.rsi14,
        macdHistogram: indicators.macd.histogram,
        adx: indicators.dmi.adx,
        ema20: indicators.ema20
      },
      structure: {
        trend: trendState,
        hh: hasHh,
        hl: hasHl,
        bos: hasBos,
        choch: hasChoch
      },
      pattern: {
        orb,
        gapAndGo,
        firstPullback,
        breakout,
        retest,
        vwapReclaim,
        bullFlag
      },
      smc: {
        fvg: hasFvg,
        fvgFillRate,
        orderBlock: hasOb,
        liquiditySweep: hasSweep,
        smcStructureScore: brainResult.smcStructureScore
      },
      risk: {
        chaseRisk,
        falseBreakoutRisk,
        spreadRisk
      }
    };

    // 8. Calculate Setup Score
    const score = calculateSetupScore(analysis);

    let grade: RealScannerResult["grade"] = "NO_SETUP";
    let signal: RealScannerResult["signal"] = "REJECT";

    if (score !== null) {
      if (score >= 90) grade = "S+";
      else if (score >= 85) grade = "S";
      else if (score >= 75) grade = "A+";
      else if (score >= 65) grade = "A";
      else if (score >= 50) grade = "B";
      else grade = "WATCH";

      signal = score >= 75 ? "BUY_CANDIDATE" : score >= 50 ? "WATCH" : "REJECT";
    }

    const executionQuoteReady = requireLiveData(liveQuote);

    const marketDataVerified =
      candleVerification.isVerified &&
      executionQuoteReady;

    const tradingAllowed = marketDataVerified && signal === "BUY_CANDIDATE";

    // Pre-Buy Projections (Not LIVE DEFENSE SELL)
    const effectiveAtr = indicators.atr14 != null && indicators.atr14 > 0 ? indicators.atr14 : 0;

    let proposedRiskFloor: number | null = null;
    let projectedSellLow: number | null = null;
    let projectedSellMid: number | null = null;
    let projectedSellHigh: number | null = null;

    if (currentPrice > 0) {
      proposedRiskFloor = +Math.max(currentPrice * 0.95, currentPrice - effectiveAtr * 2.0).toFixed(2);
      projectedSellLow = +(currentPrice + effectiveAtr * 1.5).toFixed(2);
      projectedSellMid = +(currentPrice + effectiveAtr * 2.5).toFixed(2);
      projectedSellHigh = +(currentPrice + effectiveAtr * 3.8).toFixed(2);
    }

    return {
      symbol,
      dataStatus: marketDataVerified ? "LIVE" : "STALE",
      analysisAllowed: candleVerification.isVerified,
      tradingAllowed,
      score,
      grade,
      signal,
      proposedRiskFloor,
      projectedSellLow,
      projectedSellMid,
      projectedSellHigh,
      analysis,
      indicators,
      mtfResult,
      brainResult,
      summary: tradingAllowed
        ? `VERIFIED BUY CANDIDATE ${score}점 (${grade})`
        : `ANALYSIS ONLY / EXECUTION BLOCKED (점수: ${score ?? "NO_DATA"}점 | ${grade})`
    };
  }
}
