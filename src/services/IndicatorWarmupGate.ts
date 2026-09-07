// AISTOCK v13.8 INDICATOR WARM-UP GATE
// Strictly enforces bar count requirements before computing or using technical indicators.
// NO DEFAULT NEUTRAL FILLERS (RSI=50, MACD=0, EMA=0) ALLOWED. Returns null if insufficient bars.

export interface IndicatorWarmupRequirements {
  ema5: number;   // 5
  ema20: number;  // 20
  ema60: number;  // 60
  rsi14: number;  // 15
  atr14: number;  // 15
  rvol20: number; // 20
  macd: number;   // 35
}

export const WARMUP_REQUIREMENTS: IndicatorWarmupRequirements = {
  ema5: 5,
  ema20: 20,
  ema60: 60,
  rsi14: 15,
  atr14: 15,
  rvol20: 20,
  macd: 35,
};

export interface IndicatorWarmupResult {
  barCount: number;
  coverageRatio: number; // 0.0 to 1.0
  isWarmupComplete: boolean;
  canGenerateSignal: boolean; // coverageRatio >= 0.8
  readyIndicators: {
    ema5: boolean;
    ema20: boolean;
    ema60: boolean;
    rsi14: boolean;
    atr14: boolean;
    rvol20: boolean;
    macd: boolean;
  };
  computedValues: {
    ema5: number | null;
    ema20: number | null;
    ema60: number | null;
    rsi14: number | null;
    atr14: number | null;
    rvol20: number | null;
    macd: { macd: number; signal: number; histogram: number } | null;
  };
}

export class IndicatorWarmupGate {
  public static evaluateWarmup(barCount: number): {
    coverageRatio: number;
    canGenerateSignal: boolean;
    ready: Record<keyof IndicatorWarmupRequirements, boolean>;
  } {
    const keys = Object.keys(WARMUP_REQUIREMENTS) as Array<keyof IndicatorWarmupRequirements>;
    let readyCount = 0;

    const ready = {
      ema5: barCount >= WARMUP_REQUIREMENTS.ema5,
      ema20: barCount >= WARMUP_REQUIREMENTS.ema20,
      ema60: barCount >= WARMUP_REQUIREMENTS.ema60,
      rsi14: barCount >= WARMUP_REQUIREMENTS.rsi14,
      atr14: barCount >= WARMUP_REQUIREMENTS.atr14,
      rvol20: barCount >= WARMUP_REQUIREMENTS.rvol20,
      macd: barCount >= WARMUP_REQUIREMENTS.macd,
    };

    keys.forEach((k) => {
      if (ready[k]) readyCount++;
    });

    const coverageRatio = readyCount / keys.length;
    const canGenerateSignal = coverageRatio >= 0.8;

    return {
      coverageRatio,
      canGenerateSignal,
      ready,
    };
  }

  // Safe accessor that returns null if bar count is insufficient (NEVER 50, 0, or fake defaults)
  public static safeEma(prices: number[], period: number): number | null {
    if (!prices || prices.length < period) {
      return null;
    }
    // Simple EMA calculation for verified array
    let k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return Number.isFinite(ema) ? +ema.toFixed(4) : null;
  }

  public static safeRsi(closes: number[], period = 14): number | null {
    if (!closes || closes.length < period + 1) {
      return null;
    }
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return Number.isFinite(rsi) ? +rsi.toFixed(2) : null;
  }

  public static safeAtr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
    if (!highs || !lows || !closes || highs.length < period + 1) {
      return null;
    }
    const trs: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }
    if (trs.length < period) return null;
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }
    return Number.isFinite(atr) ? +atr.toFixed(4) : null;
  }

  public static safeRvol(volumes: number[], period = 20): number | null {
    if (!volumes || volumes.length < period) {
      return null;
    }
    const recent = volumes[volumes.length - 1];
    const historical = volumes.slice(Math.max(0, volumes.length - period - 1), volumes.length - 1);
    if (historical.length === 0) return null;

    const avg = historical.reduce((a, b) => a + b, 0) / historical.length;
    if (avg <= 0) return null;

    const rvol = recent / avg;
    return Number.isFinite(rvol) ? +rvol.toFixed(2) : null;
  }

  public static safeMacd(closes: number[]): { macd: number; signal: number; histogram: number } | null {
    if (!closes || closes.length < WARMUP_REQUIREMENTS.macd) {
      return null; // Insufficient bars -> MUST BE NULL (NOT { macd: 0, signal: 0, histogram: 0 })
    }
    const fastEma = IndicatorWarmupGate.safeEma(closes, 12);
    const slowEma = IndicatorWarmupGate.safeEma(closes, 26);
    if (fastEma === null || slowEma === null) return null;

    const macdLine = fastEma - slowEma;
    // Compute signal line from macd history over last 9 bars
    const macdHistory: number[] = [];
    for (let i = 26; i <= closes.length; i++) {
      const sub = closes.slice(0, i);
      const f = IndicatorWarmupGate.safeEma(sub, 12);
      const s = IndicatorWarmupGate.safeEma(sub, 26);
      if (f !== null && s !== null) {
        macdHistory.push(f - s);
      }
    }
    const signalLine = IndicatorWarmupGate.safeEma(macdHistory, 9);
    if (signalLine === null) return null;

    const histogram = macdLine - signalLine;
    return {
      macd: +macdLine.toFixed(4),
      signal: +signalLine.toFixed(4),
      histogram: +histogram.toFixed(4),
    };
  }
}
