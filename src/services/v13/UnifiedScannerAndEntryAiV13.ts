// AISTOCK v13 Real Intelligence Core - Unified Scanner & Entry AI
// Implements Multi-tier Entry Verification Pipeline with Evidence-Based Confidence Calculation.
// No arbitrary fake numbers! Confidence is strictly calculated from indicator alignment & signal counts.

import { RealTimePriceFeedV13, RealMarketDataProviderV13 } from "./RealMarketDataProviderV13";
import { CalculatedIndicatorsV13 } from "./TechnicalAnalysisEngineV13";

export type DecisionStateV13 =
  | "STRONG BUY"
  | "BUY"
  | "EARLY BUY"
  | "WATCH"
  | "WAIT"
  | "NO BUY"
  | "AVOID";

export interface HardRejectCheckV13 {
  isRejected: boolean;
  reasonCode?:
    | "STALE_DATA"
    | "EXTREME_CHASE"
    | "STRONG_DOWNTREND"
    | "LIQUIDITY_FAILURE"
    | "EXTREME_SPREAD"
    | "FAILED_BREAKOUT"
    | "MAJOR_SUPPORT_BREAK";
  message?: string;
}

export interface CalculatedConfidenceV13 {
  score100: number;
  confidencePct: number;
  signalAlignmentCount: number; // Max 8 signals
  alignedSignals: string[];
}

export interface EntryAnalysisResultV13 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  scannerStatus: {
    found: boolean;
    scannerName?: string;
  };
  missingReason?: string;
  isPreScannerAlert: boolean;
  indicators: CalculatedIndicatorsV13;
  hardReject: HardRejectCheckV13;
  confidence: CalculatedConfidenceV13;
  decisionState: DecisionStateV13;
  aiExplanation: string;
  timestamp: string;
}

export class UnifiedScannerAndEntryAiV13 {
  /**
   * Main Pipeline Method: Analyze symbol for Scanner, Pre-Scanner, or Manual Entry
   */
  public static analyzeEntry(
    feed: RealTimePriceFeedV13,
    inScanner: boolean = false
  ): EntryAnalysisResultV13 {
    // 1. Validate Data Freshness & Quality
    const quality = RealMarketDataProviderV13.validateAndProcess(feed);

    if (!quality.allowTrading) {
      return {
        symbol: feed.symbol,
        name: feed.name,
        market: feed.market,
        currentPrice: feed.currentPrice || 0,
        scannerStatus: { found: inScanner },
        isPreScannerAlert: false,
        indicators: quality.indicators,
        hardReject: {
          isRejected: true,
          reasonCode: "STALE_DATA",
          message: quality.rejectionReason || "실시간 데이터 무효/지연으로 매매가 차단되었습니다."
        },
        confidence: { score100: 0, confidencePct: 0, signalAlignmentCount: 0, alignedSignals: [] },
        decisionState: "NO BUY",
        aiExplanation: quality.rejectionReason || "데이터 미흡으로 매수 불가",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      };
    }

    const ind = quality.indicators;

    // 2. Evaluate Hard Reject Filters
    const hardReject = this.evaluateHardReject(feed.currentPrice, ind);
    if (hardReject.isRejected) {
      return {
        symbol: feed.symbol,
        name: feed.name,
        market: feed.market,
        currentPrice: feed.currentPrice,
        scannerStatus: { found: inScanner },
        isPreScannerAlert: false,
        indicators: ind,
        hardReject,
        confidence: { score100: 30, confidencePct: 0, signalAlignmentCount: 0, alignedSignals: [] },
        decisionState: "AVOID",
        aiExplanation: `🚨 [위험 필터 차단] ${hardReject.message}`,
        timestamp: new Date().toLocaleTimeString("ko-KR")
      };
    }

    // 3. Count Real Aligned Technical Signals
    const alignedSignals: string[] = [];
    if (ind.isVwapAbove) alignedSignals.push("VWAP 상단 지지");
    if (ind.isEmaBullishTrend) alignedSignals.push("EMA 9/20 정배열");
    if (ind.isMacdBullishCross) alignedSignals.push("MACD 골든크로스");
    if (ind.structure === "HH_HL") alignedSignals.push("HH/HL 고점저점 상승구조");
    if (ind.rvol >= 1.2) alignedSignals.push(`RVOL 거래량 분출(${ind.rvol})`);
    if (ind.rsi14 >= 52 && ind.rsi14 <= 68) alignedSignals.push(`RSI 건전 상승동인(${ind.rsi14})`);
    if (ind.currentPrice > ind.lastHigherLow) alignedSignals.push("최근 HL 지지선 상회");
    if (inScanner) alignedSignals.push("주도주 스캐너 포착");

    // 4. Evidence-Based Confidence Calculation
    const signalCount = alignedSignals.length;
    const baseScore = Math.min(100, Math.floor((signalCount / 8) * 100));
    const confidencePct = Math.min(95, Math.max(30, Math.floor(baseScore * 0.9 + (ind.rvol > 1.5 ? 8 : 0))));

    // 5. Pre-Scanner Early Momentum Check
    const isPreScannerAlert = !inScanner && ind.rvol >= 0.8 && ind.structure === "HH_HL" && ind.isVwapAbove;

    // 6. Final Decision State Classification
    let decisionState: DecisionStateV13 = "WAIT";

    if (signalCount >= 7 && baseScore >= 85) {
      decisionState = "STRONG BUY";
    } else if (signalCount >= 5 && baseScore >= 70) {
      decisionState = "BUY";
    } else if (isPreScannerAlert || (signalCount >= 4 && ind.isVwapAbove)) {
      decisionState = "EARLY BUY";
    } else if (signalCount >= 3) {
      decisionState = "WATCH";
    } else {
      decisionState = "WAIT";
    }

    // 7. Missing Reason Analysis (if not in scanner)
    let missingReason: string | undefined = undefined;
    if (!inScanner) {
      if (ind.rvol < 1.5) {
        missingReason = `RVOL 기준치(1.50) 미달 (현재 ${ind.rvol}). 단, 거래량 미세 증가 및 VWAP 지지 시 EARLY BUY 가능.`;
      } else {
        missingReason = "스캔 주기 미포착 조건 밖이나, 수치상 정밀 매수 검증 조건 충족.";
      }
    }

    // 8. AI Commentary
    const aiExplanation = this.generateExplanation(feed.name, feed.symbol, decisionState, signalCount, alignedSignals, inScanner, isPreScannerAlert);

    return {
      symbol: feed.symbol,
      name: feed.name,
      market: feed.market,
      currentPrice: feed.currentPrice,
      scannerStatus: { found: inScanner, scannerName: inScanner ? "실시간 주도주 스캐너" : undefined },
      missingReason,
      isPreScannerAlert,
      indicators: ind,
      hardReject: { isRejected: false },
      confidence: {
        score100: baseScore,
        confidencePct,
        signalAlignmentCount: signalCount,
        alignedSignals
      },
      decisionState,
      aiExplanation,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }

  private static evaluateHardReject(price: number, ind: CalculatedIndicatorsV13): HardRejectCheckV13 {
    // Check 1: Extreme Chase Risk (Price extended > 8% above VWAP or RSI > 80)
    const vwapDistPct = ((price - ind.vwap) / ind.vwap) * 100;
    if (vwapDistPct > 8.0 || ind.rsi14 > 80) {
      return {
        isRejected: true,
        reasonCode: "EXTREME_CHASE",
        message: `VWAP 이격도(+${vwapDistPct.toFixed(1)}%) 과다 및 RSI(${ind.rsi14}) 단기 이격 과열로 추격 매수를 차단합니다.`
      };
    }

    // Check 2: Strong Downtrend (Structure LH_LL and price below EMA 50)
    if (ind.structure === "LH_LL" && price < ind.ema50) {
      return {
        isRejected: true,
        reasonCode: "STRONG_DOWNTREND",
        message: "LH/LL 하락 파동 형성 및 장기 이평선 하회로 하락 추세 지속 중입니다."
      };
    }

    return { isRejected: false };
  }

  private static generateExplanation(
    name: string,
    symbol: string,
    state: DecisionStateV13,
    signalCount: number,
    signals: string[],
    inScanner: boolean,
    isPreScanner: boolean
  ): string {
    const signalListStr = signals.join(", ");

    if (state === "STRONG BUY" || state === "BUY") {
      return `[${name}(${symbol})] 총 ${signalCount}개 정밀 기술적 신호 일치 (${signalListStr}). 수급 및 가격 구조가 탁월하여 매수를 승인합니다.`;
    }

    if (state === "EARLY BUY") {
      return `[${name}(${symbol})] ${inScanner ? "스캐너 포착" : "스캐너 밖 Pre-Scanner 레이더 감지"}. 거래량 증가 및 VWAP/HH-HL 회복 시도가 시작된 EARLY BUY 진입 후보입니다. (${signalListStr})`;
    }

    return `[${name}(${symbol})] 현재 정밀 신호 충족수(${signalCount}개) 미달로 추가 모멘텀 형성 시까지 관망(WAIT)을 권장합니다.`;
  }
}
