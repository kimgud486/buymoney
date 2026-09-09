import {
  GraphShapeScanner,
  type CandleData,
  type ShapeResult,
} from "./GraphShapeScanner";

export type TimeframeKey = "1m" | "3m" | "5m" | "1d";

export interface MultiTimeframeCandles {
  tf1m: CandleData[];
  tf3m: CandleData[];
  tf5m: CandleData[];
  tfDaily: CandleData[];
}

export interface LiveOrderFlowData {
  /** KIS 체결강도. 100 이상이면 매수 체결 우위로 해석하는 기본 규칙에 사용. */
  cttr?: number | null;
  buyVolume?: number | null;
  sellVolume?: number | null;
  totalBidQty?: number | null;
  totalAskQty?: number | null;
  turnover?: number | null;
}

export interface MultiTimeframeStockInput {
  symbol: string;
  name: string;
  frames: MultiTimeframeCandles;
  live: LiveOrderFlowData;
}

export interface TimeframeValidation {
  timeframe: TimeframeKey;
  passed: boolean;
  score: number;
  reasons: string[];
  blockers: string[];
  shape: ShapeResult;
}

export interface MultiTimeframeYesCandidate {
  symbol: string;
  name: string;
  verdict: "YES";
  grade: "S" | "A+" | "A";
  finalScore: number;
  graphScore: number;
  flowScore: number;
  riskScore: number;
  timeframeValidations: TimeframeValidation[];
  price: number;
  entryLow: number;
  entryHigh: number;
  stop: number;
  target1: number;
  target2: number;
  rewardRisk: number;
  reasons: string[];
  thesis: string;
  invalidation: string;
}

export interface RejectedMultiTimeframeCandidate {
  symbol: string;
  name: string;
  reasons: string[];
}

export interface TrueMultiTimeframeConfig {
  minCandlesPerFrame: number;
  minFinalScore: number;
  minGraphScore: number;
  minFlowScore: number;
  minRiskScore: number;
  minCttr: number;
  strongCttr: number;
  minRvol1m: number;
  maxRsi: number;
  maxVwapExtensionPct: number;
  requireLiveCttr: boolean;
}

export interface ShapeScannerLike {
  scan(candles: CandleData[], symbol?: string): ShapeResult;
}

const DEFAULT_CONFIG: TrueMultiTimeframeConfig = {
  minCandlesPerFrame: 30,
  minFinalScore: 80,
  minGraphScore: 65,
  minFlowScore: 65,
  minRiskScore: 60,
  minCttr: 105,
  strongCttr: 125,
  minRvol1m: 1.2,
  maxRsi: 80,
  maxVwapExtensionPct: 4.5,
  requireLiveCttr: true,
};

const BULLISH_CANDLE_PATTERNS = new Set([
  "BULLISH_ENGULFING",
  "HAMMER",
  "MORNING_STAR",
  "THREE_WHITE_SOLDIERS",
  "PIERCING",
]);

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1): number {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function hasBullishCandle(shape: ShapeResult): boolean {
  return shape.details.candlePatterns.some((pattern) =>
    BULLISH_CANDLE_PATTERNS.has(pattern),
  );
}

function computeAtr(candles: CandleData[], period = 14): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previousClose = candles[i - 1].close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previousClose),
      Math.abs(current.low - previousClose),
    );
    trueRanges.push(tr);
  }

  const sample = trueRanges.slice(-period);
  if (sample.length === 0) return 0;
  return sample.reduce((sum, value) => sum + value, 0) / sample.length;
}

/**
 * TRUE MULTI-TIMEFRAME YES-ONLY SCANNER
 *
 * Important difference from GraphShapeScanner.timeframeChecks:
 * this engine receives four independent OHLCV series and scans each one.
 * It never fabricates 1m/3m/5m/daily confirmation from a single candle set.
 *
 * Output policy is fail-closed:
 * - Only fully approved candidates are returned.
 * - NO / WAIT candidates are stored only in rejectLog.
 * - rankYesOnly never pads the result to five names.
 *
 * YES means "all configured technical/order-flow rules passed".
 * It does not mean guaranteed profit.
 */
export class TrueMultiTimeframeYesScanner {
  private readonly config: TrueMultiTimeframeConfig;
  private readonly shapeScanner: ShapeScannerLike;

  public readonly rejectLog: RejectedMultiTimeframeCandidate[] = [];

  constructor(
    config: Partial<TrueMultiTimeframeConfig> = {},
    shapeScanner: ShapeScannerLike = new GraphShapeScanner(),
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.shapeScanner = shapeScanner;
  }

  public analyze(input: MultiTimeframeStockInput): MultiTimeframeYesCandidate | null {
    const { symbol, name, frames, live } = input;

    const dataBlockers = this.validateFrameLengths(frames);
    if (dataBlockers.length > 0) {
      return this.reject(symbol, name, dataBlockers);
    }

    // Each call receives a genuinely different timeframe series.
    const shape1m = this.shapeScanner.scan(frames.tf1m, `${symbol}:1m`);
    const shape3m = this.shapeScanner.scan(frames.tf3m, `${symbol}:3m`);
    const shape5m = this.shapeScanner.scan(frames.tf5m, `${symbol}:5m`);
    const shapeDaily = this.shapeScanner.scan(frames.tfDaily, `${symbol}:1d`);

    const validations: TimeframeValidation[] = [
      this.validate1m(shape1m),
      this.validate3m(shape3m),
      this.validate5m(shape5m),
      this.validateDaily(shapeDaily),
    ];

    const failedFrames = validations.filter((validation) => !validation.passed);
    if (failedFrames.length > 0) {
      const reasons = failedFrames.flatMap((validation) =>
        validation.blockers.map(
          (blocker) => `[${validation.timeframe}] ${blocker}`,
        ),
      );
      return this.reject(symbol, name, reasons);
    }

    const graphScore = round(
      shape1m.graphScore * 0.2 +
        shape3m.graphScore * 0.25 +
        shape5m.graphScore * 0.3 +
        shapeDaily.graphScore * 0.25,
      1,
    );

    const flow = this.scoreLiveOrderFlow(live, shape1m);
    if (flow.blockers.length > 0) {
      return this.reject(symbol, name, flow.blockers);
    }

    const risk = this.scoreRisk(frames.tf1m, live, {
      shape1m,
      shape3m,
      shape5m,
      shapeDaily,
    });
    if (risk.blockers.length > 0) {
      return this.reject(symbol, name, risk.blockers);
    }

    const riskScore = risk.score;
    const flowScore = flow.score;
    const finalScore = round(
      graphScore * 0.4 + flowScore * 0.35 + riskScore * 0.25,
      1,
    );

    const scoreBlockers: string[] = [];
    if (graphScore < this.config.minGraphScore) {
      scoreBlockers.push(
        `실제 멀티타임프레임 Graph Score ${graphScore} < ${this.config.minGraphScore}`,
      );
    }
    if (flowScore < this.config.minFlowScore) {
      scoreBlockers.push(
        `실시간 Flow Score ${flowScore} < ${this.config.minFlowScore}`,
      );
    }
    if (riskScore < this.config.minRiskScore) {
      scoreBlockers.push(
        `Risk Score ${riskScore} < ${this.config.minRiskScore}`,
      );
    }
    if (finalScore < this.config.minFinalScore) {
      scoreBlockers.push(
        `FINAL Score ${finalScore} < ${this.config.minFinalScore}`,
      );
    }

    if (scoreBlockers.length > 0) {
      return this.reject(symbol, name, scoreBlockers);
    }

    const tradePlan = this.buildTradePlan(frames.tf1m, shape1m);
    if (!tradePlan) {
      return this.reject(symbol, name, ["1분봉 ATR/가격 기반 거래계획 계산 실패"]);
    }

    const grade: MultiTimeframeYesCandidate["grade"] =
      finalScore >= 90 ? "S" : finalScore >= 85 ? "A+" : "A";

    const timeframeReasons = validations.flatMap((validation) =>
      validation.reasons.map(
        (reason) => `[${validation.timeframe}] ${reason}`,
      ),
    );
    const reasons = unique([
      ...timeframeReasons,
      ...flow.reasons,
      ...risk.reasons,
    ]);

    const thesis = this.buildThesis(reasons);
    const invalidation = [
      `${tradePlan.stop.toLocaleString()}원 이탈`,
      "1분/3분 VWAP 회복 실패",
      `체결강도 ${this.config.minCttr} 미만으로 약화`,
      "Fake Breakout 발생",
    ].join(" 또는 ");

    return {
      symbol,
      name,
      verdict: "YES",
      grade,
      finalScore,
      graphScore,
      flowScore,
      riskScore,
      timeframeValidations: validations,
      ...tradePlan,
      reasons,
      thesis,
      invalidation,
    };
  }

  /**
   * Returns YES candidates only. If only two names pass, result length is two.
   * It never inserts NO/WAIT candidates just to fill TOP 5.
   */
  public rankYesOnly(
    inputs: MultiTimeframeStockInput[],
    topN = 5,
  ): MultiTimeframeYesCandidate[] {
    const approved = inputs
      .map((input) => this.analyze(input))
      .filter((candidate): candidate is MultiTimeframeYesCandidate => candidate !== null)
      .sort(
        (a, b) =>
          b.finalScore - a.finalScore ||
          b.flowScore - a.flowScore ||
          b.graphScore - a.graphScore,
      );

    return approved.slice(0, Math.max(0, topN));
  }

  private validateFrameLengths(frames: MultiTimeframeCandles): string[] {
    const entries: Array<[TimeframeKey, CandleData[]]> = [
      ["1m", frames.tf1m],
      ["3m", frames.tf3m],
      ["5m", frames.tf5m],
      ["1d", frames.tfDaily],
    ];

    return entries
      .filter(([, candles]) => candles.length < this.config.minCandlesPerFrame)
      .map(
        ([timeframe, candles]) =>
          `[${timeframe}] OHLCV ${candles.length}개: 최소 ${this.config.minCandlesPerFrame}개 필요`,
      );
  }

  private validate1m(shape: ShapeResult): TimeframeValidation {
    const reasons: string[] = [];
    const blockers: string[] = [];

    const trigger =
      shape.details.breakout ||
      shape.details.breakoutRetest ||
      shape.details.vwapReclaimed ||
      hasBullishCandle(shape);

    if (trigger) reasons.push("돌파/리테스트/VWAP Reclaim/상승캔들 중 트리거 확인");
    else blockers.push("실행 트리거 없음");

    if (shape.details.rvol >= this.config.minRvol1m) {
      reasons.push(`RVOL ${round(shape.details.rvol, 2)}배`);
    } else {
      blockers.push(
        `RVOL ${round(shape.details.rvol, 2)} < ${this.config.minRvol1m}`,
      );
    }

    this.applyCommonIntradayBlockers(shape, blockers);

    return {
      timeframe: "1m",
      passed: blockers.length === 0,
      score: shape.graphScore,
      reasons: unique(reasons),
      blockers: unique(blockers),
      shape,
    };
  }

  private validate3m(shape: ShapeResult): TimeframeValidation {
    const reasons: string[] = [];
    const blockers: string[] = [];

    const momentum =
      shape.details.macdExpansion ||
      shape.details.macdCross ||
      shape.details.rsiRebound ||
      shape.details.rsiReclaimed ||
      shape.details.breakoutRetest;

    if (momentum) reasons.push("MACD/RSI/Retest 모멘텀 확인");
    else blockers.push("3분봉 모멘텀 확인 실패");

    this.applyCommonIntradayBlockers(shape, blockers);

    return {
      timeframe: "3m",
      passed: blockers.length === 0,
      score: shape.graphScore,
      reasons: unique(reasons),
      blockers: unique(blockers),
      shape,
    };
  }

  private validate5m(shape: ShapeResult): TimeframeValidation {
    const reasons: string[] = [];
    const blockers: string[] = [];

    const trend =
      (shape.details.emaAligned && shape.details.emaRising) ||
      (shape.details.emaAligned &&
        (shape.details.higherLow ||
          shape.details.breakout ||
          shape.details.breakoutRetest));

    if (trend) reasons.push("EMA 정배열 기반 5분 추세 확인");
    else blockers.push("5분봉 추세 구조 미확인");

    this.applyCommonIntradayBlockers(shape, blockers);

    return {
      timeframe: "5m",
      passed: blockers.length === 0,
      score: shape.graphScore,
      reasons: unique(reasons),
      blockers: unique(blockers),
      shape,
    };
  }

  private validateDaily(shape: ShapeResult): TimeframeValidation {
    const reasons: string[] = [];
    const blockers: string[] = [];

    const structure =
      shape.details.emaAligned ||
      shape.details.higherLow ||
      shape.details.wBottom ||
      shape.details.breakout ||
      shape.details.breakoutRetest;

    if (structure) reasons.push("일봉 추세/저점상승/돌파 구조 확인");
    else blockers.push("일봉 상승 구조 미확인");

    if (shape.details.fakeBreakout) blockers.push("일봉 Fake Breakout");
    if (shape.details.rsiOverbought || shape.details.rsi > this.config.maxRsi) {
      blockers.push(`일봉 RSI 과열 ${round(shape.details.rsi, 1)}`);
    }

    return {
      timeframe: "1d",
      passed: blockers.length === 0,
      score: shape.graphScore,
      reasons: unique(reasons),
      blockers: unique(blockers),
      shape,
    };
  }

  private applyCommonIntradayBlockers(
    shape: ShapeResult,
    blockers: string[],
  ): void {
    if (shape.details.fakeBreakout) blockers.push("Fake Breakout 감지");
    if (shape.details.belowVwap) blockers.push("VWAP 아래");
    if (shape.details.rsiOverbought || shape.details.rsi > this.config.maxRsi) {
      blockers.push(`RSI 과열 ${round(shape.details.rsi, 1)}`);
    }
  }

  private scoreLiveOrderFlow(
    live: LiveOrderFlowData,
    shape1m: ShapeResult,
  ): { score: number; reasons: string[]; blockers: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const blockers: string[] = [];

    if (live.cttr == null || !Number.isFinite(live.cttr)) {
      if (this.config.requireLiveCttr) blockers.push("실시간 체결강도(CTTR) 없음");
    } else if (live.cttr >= this.config.strongCttr) {
      score += 40;
      reasons.push(`체결강도 ${round(live.cttr, 1)} 강한 매수 우위`);
    } else if (live.cttr >= 115) {
      score += 32;
      reasons.push(`체결강도 ${round(live.cttr, 1)} 매수 우위`);
    } else if (live.cttr >= this.config.minCttr) {
      score += 24;
      reasons.push(`체결강도 ${round(live.cttr, 1)} 기준 통과`);
    } else {
      blockers.push(
        `체결강도 ${round(live.cttr, 1)} < ${this.config.minCttr}`,
      );
    }

    if (
      live.buyVolume != null &&
      live.sellVolume != null &&
      live.buyVolume + live.sellVolume > 0
    ) {
      const buyShare = live.buyVolume / (live.buyVolume + live.sellVolume);
      if (buyShare >= 0.6) {
        score += 25;
        reasons.push(`매수체결 비중 ${round(buyShare * 100, 1)}%`);
      } else if (buyShare >= 0.55) {
        score += 18;
        reasons.push(`매수체결 비중 ${round(buyShare * 100, 1)}%`);
      } else if (buyShare >= 0.5) {
        score += 8;
      } else if (buyShare < 0.45) {
        blockers.push(`매수체결 비중 ${round(buyShare * 100, 1)}%로 매도 우위`);
      }
    }

    if (
      live.totalBidQty != null &&
      live.totalAskQty != null &&
      live.totalAskQty > 0
    ) {
      const imbalance = live.totalBidQty / live.totalAskQty;
      if (imbalance >= 1.4) {
        score += 20;
        reasons.push(`매수/매도 호가잔량비 ${round(imbalance, 2)}배`);
      } else if (imbalance >= 1.15) {
        score += 14;
        reasons.push(`매수호가 잔량 우위 ${round(imbalance, 2)}배`);
      } else if (imbalance >= 1) {
        score += 6;
      } else if (imbalance <= 0.7) {
        score -= 10;
        reasons.push(`매도호가 잔량 우위 ${round(imbalance, 2)}배`);
      }
    }

    if (shape1m.details.rvol >= 2) score += 15;
    else if (shape1m.details.rvol >= 1.5) score += 12;
    else if (shape1m.details.rvol >= this.config.minRvol1m) score += 8;

    return {
      score: clamp(score),
      reasons: unique(reasons),
      blockers: unique(blockers),
    };
  }

  private scoreRisk(
    oneMinuteCandles: CandleData[],
    live: LiveOrderFlowData,
    shapes: {
      shape1m: ShapeResult;
      shape3m: ShapeResult;
      shape5m: ShapeResult;
      shapeDaily: ShapeResult;
    },
  ): { score: number; reasons: string[]; blockers: string[] } {
    let score = 100;
    const reasons: string[] = [];
    const blockers: string[] = [];

    const allShapes = [
      shapes.shape1m,
      shapes.shape3m,
      shapes.shape5m,
      shapes.shapeDaily,
    ];

    if (allShapes.some((shape) => shape.details.fakeBreakout)) {
      blockers.push("멀티타임프레임 중 Fake Breakout 감지");
    }

    const current = oneMinuteCandles[oneMinuteCandles.length - 1];
    const vwap = shapes.shape1m.details.vwap;
    if (vwap > 0) {
      const extension = ((current.close - vwap) / vwap) * 100;
      if (extension > this.config.maxVwapExtensionPct) {
        blockers.push(
          `1분봉 VWAP +${round(extension, 1)}% 과대이격: 추격매수 금지`,
        );
      } else if (extension > 3) {
        score -= 15;
        reasons.push(`VWAP 이격 +${round(extension, 1)}%: 주의 구간`);
      }
    }

    if (shapes.shape1m.details.rsi > 74) score -= 10;
    if (shapes.shape3m.details.rsi > 74) score -= 10;
    if (shapes.shapeDaily.details.rsi > 75) score -= 10;

    if (
      live.totalBidQty != null &&
      live.totalAskQty != null &&
      live.totalAskQty > 0 &&
      live.totalBidQty / live.totalAskQty <= 0.7
    ) {
      score -= 15;
      reasons.push("호가잔량은 매도측 우위라 Risk Score 감점");
    }

    if (blockers.length === 0 && score >= 80) {
      reasons.push("Fake Breakout/과대이격 하드 블로커 없음");
    }

    return {
      score: clamp(score),
      reasons: unique(reasons),
      blockers: unique(blockers),
    };
  }

  private buildTradePlan(
    candles: CandleData[],
    shape1m: ShapeResult,
  ):
    | Pick<
        MultiTimeframeYesCandidate,
        | "price"
        | "entryLow"
        | "entryHigh"
        | "stop"
        | "target1"
        | "target2"
        | "rewardRisk"
      >
    | null {
    const current = candles[candles.length - 1];
    const price = current.close;
    const atr = computeAtr(candles, 14);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(atr) || atr <= 0) {
      return null;
    }

    const recentLow = Math.min(...candles.slice(-5).map((candle) => candle.low));
    let stop = Math.max(recentLow, price - atr * 1.5);
    if (!Number.isFinite(stop) || stop >= price) stop = price - atr * 1.5;

    // Prevent an unrealistically tiny stop from producing a misleading R:R.
    const minimumRisk = price * 0.005;
    const risk = Math.max(price - stop, minimumRisk);
    stop = price - risk;

    const entryLow = Math.max(shape1m.details.vwap, price - atr * 0.25);
    const entryHigh = price + atr * 0.1;
    const target1 = price + risk * 2;
    const target2 = price + risk * 3;

    return {
      price: round(price, 0),
      entryLow: round(entryLow, 0),
      entryHigh: round(entryHigh, 0),
      stop: round(stop, 0),
      target1: round(target1, 0),
      target2: round(target2, 0),
      rewardRisk: 2,
    };
  }

  private buildThesis(reasons: string[]): string {
    const top = reasons.slice(0, 7);
    return `${top.join(" / ")}. 실제 1분·3분·5분·일봉과 실시간 수급 게이트가 동시에 통과한 YES 후보입니다.`;
  }

  private reject(
    symbol: string,
    name: string,
    reasons: string[],
  ): null {
    this.rejectLog.push({
      symbol,
      name,
      reasons: unique(reasons),
    });
    return null;
  }
}

export const defaultTrueMultiTimeframeYesScanner =
  new TrueMultiTimeframeYesScanner();
