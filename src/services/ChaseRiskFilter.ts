// AISTOCK v13.8 CHASE RISK FILTER & SCANNER V2 MODEL
// Detects overextension from VWAP/EMA20, candle upper wicks, green bar exhaustion, and high chase risk.
// Automatically blocks BUY signals when chase risk is HIGH or dataCoverage < 80.

export type ChaseRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ChaseRiskEvaluationParams {
  symbol: string;
  currentPrice: number;
  vwap: number | null;
  ema20: number | null;
  breakoutLevel?: number | null;
  rvol: number | null;
  candleOpen?: number;
  candleHigh?: number;
  candleLow?: number;
  consecutiveGreenBars?: number;
  dataCoverage?: number; // 0 to 100
}

export interface RealtimeScannerV2Result {
  symbol: string;
  market: "KOREA" | "US";
  price: number;
  rvol: number;
  vwapDistancePct: number;
  relativeStrength: number;
  liquidityScore: number;
  spreadBps: number;
  setup: string;
  setupScore: number;
  chaseRisk: ChaseRiskLevel;
  dataCoverage: number;
  quoteAgeMs: number;
  source: string;
  signal: "BUY_CANDIDATE" | "NO_SIGNAL" | "CHASE_RISK_HIGH";
}

export class ChaseRiskFilter {
  public static evaluate(params: ChaseRiskEvaluationParams): {
    chaseRisk: ChaseRiskLevel;
    vwapDistancePct: number;
    ema20DistancePct: number;
    upperWickRatio: number;
    reasons: string[];
    isBuyBlocked: boolean;
  } {
    const {
      currentPrice,
      vwap,
      ema20,
      breakoutLevel,
      rvol,
      candleOpen,
      candleHigh,
      candleLow,
      consecutiveGreenBars = 0,
      dataCoverage = 100,
    } = params;

    const reasons: string[] = [];
    let riskPoints = 0;

    // 0. Data Coverage Check
    if (dataCoverage < 80) {
      return {
        chaseRisk: "HIGH",
        vwapDistancePct: 0,
        ema20DistancePct: 0,
        upperWickRatio: 0,
        reasons: ["DATA_COVERAGE_BELOW_80_PERCENT"],
        isBuyBlocked: true,
      };
    }

    // 1. VWAP Distance
    let vwapDistancePct = 0;
    if (vwap != null && vwap > 0) {
      vwapDistancePct = +(((currentPrice - vwap) / vwap) * 100).toFixed(2);
      if (vwapDistancePct > 3.5) {
        riskPoints += 2;
        reasons.push(`VWAP_EXTENDED_${vwapDistancePct}%`);
      }
    }

    // 2. EMA20 Distance
    let ema20DistancePct = 0;
    if (ema20 != null && ema20 > 0) {
      ema20DistancePct = +(((currentPrice - ema20) / ema20) * 100).toFixed(2);
      if (ema20DistancePct > 4.5) {
        riskPoints += 2;
        reasons.push(`EMA20_EXTENDED_${ema20DistancePct}%`);
      }
    }

    // 3. Breakout Extension
    if (breakoutLevel != null && breakoutLevel > 0) {
      const breakoutExtensionPct = ((currentPrice - breakoutLevel) / breakoutLevel) * 100;
      if (breakoutExtensionPct > 5.0) {
        riskPoints += 2;
        reasons.push(`BREAKOUT_EXTENDED_${breakoutExtensionPct.toFixed(2)}%`);
      }
    }

    // 4. Upper Wick Ratio (Rejection wick at high)
    let upperWickRatio = 0;
    if (candleHigh != null && candleLow != null && candleOpen != null && candleHigh > candleLow) {
      const range = candleHigh - candleLow;
      const bodyTop = Math.max(candleOpen, currentPrice);
      const upperWick = candleHigh - bodyTop;
      upperWickRatio = +(upperWick / range).toFixed(2);
      if (upperWickRatio > 0.40) {
        riskPoints += 1;
        reasons.push(`HIGH_UPPER_WICK_${upperWickRatio}`);
      }
    }

    // 5. Consecutive Green Bars
    if (consecutiveGreenBars >= 6) {
      riskPoints += 1;
      reasons.push(`CONSECUTIVE_GREEN_BARS_${consecutiveGreenBars}`);
    }

    // 6. RVOL Exhaustion
    if (rvol != null && rvol > 10.0) {
      riskPoints += 1;
      reasons.push(`RVOL_EXHAUSTION_${rvol}`);
    }

    let chaseRisk: ChaseRiskLevel = "LOW";
    if (riskPoints >= 3) {
      chaseRisk = "HIGH";
    } else if (riskPoints >= 1) {
      chaseRisk = "MEDIUM";
    }

    return {
      chaseRisk,
      vwapDistancePct,
      ema20DistancePct,
      upperWickRatio,
      reasons,
      isBuyBlocked: chaseRisk === "HIGH",
    };
  }
}
