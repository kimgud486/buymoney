// AISTOCK v12.4 / v13 Position AI & Multi-Evidence Dynamic Trailing Exit AI Engine
// Independent of Scanner AI! Evaluates active position post-fill using authentic multi-evidence scoring.

export type PositionAiState =
  | "HOLD"
  | "PROFIT HOLD"
  | "TRAIL UP"
  | "SELL WATCH"
  | "SELL"
  | "EMERGENCY EXIT";

export interface PositionEvidenceV13 {
  price: number;
  structure: "HH_HL" | "LH_LL" | "RANGE" | "SIDEWAYS";
  priceAboveVWAP: boolean;
  priceAboveEMA20: boolean;
  macdSlope: number;
  rsiSlope: number;
  adx: number;
  volumeDistribution: boolean;
  relativeStrengthSlope: number;
  supportBroken: boolean;
  breakoutFailed: boolean;
}

export interface ActivePositionMetrics {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  buyPrice: number;
  currentPrice: number;
  pnlPct: number;
  qty: number;
  lastHigherLow: number;
  vwapSupport: number;
  emaSupport: number;
  atrStop: number;
  breakoutSupport: number;
  previousTrailingFloor?: number;
  evidence?: PositionEvidenceV13;
}

export interface PositionAiEvaluationResult {
  symbol: string;
  state: PositionAiState;
  dynamicExitFloor: number;
  sellEvidenceScore: number;
  pnlPct: number;
  aiActionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL";
  explanation: string;
  scannerIndependent: boolean; // Always true!
  timestamp: string;
}

export class PositionAndExitAiV124 {
  /**
   * 1. Calculate Multi-Evidence Sell Score (0 ~ 100)
   */
  public calculateSellEvidence(evidence?: PositionEvidenceV13): number {
    if (!evidence) return 0;
    let score = 0;

    if (evidence.structure === "LH_LL") score += 25;
    if (!evidence.priceAboveVWAP) score += 20;
    if (!evidence.priceAboveEMA20) score += 10;
    if (evidence.macdSlope < 0) score += 10;
    if (evidence.rsiSlope < 0) score += 5;
    if (evidence.volumeDistribution) score += 15;
    if (evidence.relativeStrengthSlope < 0) score += 5;
    if (evidence.supportBroken) score += 20;
    if (evidence.breakoutFailed) score += 15;

    return Math.min(score, 100);
  }

  /**
   * 2. Dynamic Trailing Exit Floor Calculation
   * Guarantees monotonic increase: newTrailingFloor = max(previousTrailingFloor, validNewTrailingFloor)
   */
  public calculateDynamicTrailingExitFloor(metrics: ActivePositionMetrics): number {
    const {
      buyPrice,
      currentPrice,
      lastHigherLow,
      vwapSupport,
      emaSupport,
      atrStop,
      breakoutSupport,
      previousTrailingFloor = 0
    } = metrics;

    const defaultBaselineStop = buyPrice * 0.975;

    const candidateStops = [
      lastHigherLow,
      vwapSupport,
      emaSupport,
      atrStop,
      breakoutSupport,
      defaultBaselineStop
    ];

    const validStops = candidateStops.filter(s => typeof s === "number" && s > 0 && s < currentPrice);

    let calculatedFloor = currentPrice * 0.975;
    if (validStops.length > 0) {
      calculatedFloor = Math.max(...validStops);
    }

    // Cap floor so it does not exceed 0.5% below current price
    calculatedFloor = Math.min(calculatedFloor, currentPrice * 0.995);

    // Monotonic Trailing Principle: floor NEVER moves downwards
    const finalFloor = Math.max(previousTrailingFloor, calculatedFloor);

    return Number(finalFloor.toFixed(2));
  }

  /**
   * 3. Position AI Per-Bar Multi-Evidence Evaluation
   */
  public evaluatePosition(metrics: ActivePositionMetrics): PositionAiEvaluationResult {
    const {
      symbol,
      currentPrice,
      pnlPct,
      evidence
    } = metrics;

    const dynamicExitFloor = this.calculateDynamicTrailingExitFloor(metrics);
    const sellEvidenceScore = this.calculateSellEvidence(evidence);

    let state: PositionAiState = "HOLD";
    let aiActionAdvice: "HOLD" | "TRAIL_FLOOR_RAISED" | "PREPARE_SELL" | "EXECUTE_SELL" = "HOLD";
    let explanation = "";

    // Emergency Exit: Hard stop breach (-3.5% or loss below floor)
    if (currentPrice <= dynamicExitFloor) {
      state = "SELL";
      aiActionAdvice = "EXECUTE_SELL";
      explanation = `🚨 [동적 트레일링 스탑 이탈] 현재가(${(currentPrice ?? 0).toLocaleString()}원)가 동적 이탈 바닥가(${(dynamicExitFloor ?? 0).toLocaleString()}원)를 하향 이탈하여 매도를 이행합니다.`;
    } else if (pnlPct <= -3.5) {
      state = "EMERGENCY EXIT";
      aiActionAdvice = "EXECUTE_SELL";
      explanation = `🚨 [비상 손절 발동] 손실률(${pnlPct.toFixed(2)}%)이 최대 허용 비상 손절 한도(-3.5%)를 초과하여 즉시 청산합니다.`;
    } else if (sellEvidenceScore >= 70) {
      state = "SELL";
      aiActionAdvice = "EXECUTE_SELL";
      explanation = `⚠️ [AI 매도 확정] 다중 매도 근거 점수가 ${sellEvidenceScore}점으로 위험 수치(70)를 초과하여 매도를 실행합니다.`;
    } else if (sellEvidenceScore >= 45) {
      state = "SELL WATCH";
      aiActionAdvice = "PREPARE_SELL";
      explanation = `🔍 [매도 경계] 매도 증거 점수 ${sellEvidenceScore}점 감지. VWAP 또는 EMA20 지지 여부를 실시간 추적 중입니다.`;
    } else if (pnlPct > 0 && evidence?.structure === "HH_HL" && evidence?.priceAboveVWAP) {
      state = "PROFIT HOLD";
      aiActionAdvice = "HOLD";
      explanation = `✅ [수익 홀딩] PnL +${pnlPct.toFixed(2)}% 보유 중. HH/HL 상승 파동 구조 및 VWAP 지지가 견고하게 유지되고 있습니다.`;
    } else if (pnlPct >= 3.0) {
      state = "TRAIL UP";
      aiActionAdvice = "TRAIL_FLOOR_RAISED";
      explanation = `🚀 [트레일링 업] 수익률 +${pnlPct.toFixed(2)}% 상승. 동적 이탈 바닥가를 ${(dynamicExitFloor ?? 0).toLocaleString()}원으로 상향 고정합니다.`;
    } else {
      state = "HOLD";
      aiActionAdvice = "HOLD";
      explanation = `보유 지속 (PnL: ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%). 매도 위험 증거 점수 ${sellEvidenceScore}점 내에서 유지 중입니다.`;
    }

    return {
      symbol,
      state,
      dynamicExitFloor,
      sellEvidenceScore,
      pnlPct,
      aiActionAdvice,
      explanation,
      scannerIndependent: true,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}
