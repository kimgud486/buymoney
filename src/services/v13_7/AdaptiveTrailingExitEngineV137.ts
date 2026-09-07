// AISTOCK v13.7 Adaptive Dynamic Trailing Exit Engine

export type ExitState =
  | "HOLD"
  | "PROFIT_HOLD"
  | "TRAIL_UP"
  | "SELL_WATCH"
  | "SELL"
  | "EMERGENCY_EXIT";

export interface AdaptiveTrailingInput {
  symbol: string;
  market?: "KOREA" | "US" | "CRYPTO";

  entryPrice: number;
  currentPrice: number;

  // Position state tracked persistently
  highestPriceSinceBuy: number;
  previousTrailingFloor: number;

  // Technical Indicators
  atr14: number;
  sessionVwap: number;
  ema20: number;

  // Structural Supports
  recentSwingLow?: number;
  confirmedSupport?: number;

  structure: "HH_HL" | "LH_LL" | "SIDEWAYS";

  rsi14: number;
  macdHist: number;

  adx14?: number;
  plusDi14?: number;
  minusDi14?: number;

  // Round trip costs (commission + tax + spread + slippage)
  estimatedRoundTripCostPct?: number;
}

export interface AdaptiveTrailingResult {
  symbol: string;
  state: ExitState;

  trailingFloor: number;
  previousTrailingFloor: number;

  peakPrice: number;
  mfePct: number;
  pnlPct: number;

  atrPct: number;
  atrMultiplier: number;
  volatilityRegime: "LOW" | "NORMAL" | "HIGH" | "EXTREME";

  candidates: {
    peakAtr: number;
    swingLow?: number;
    vwap: number;
    support?: number;
    ema20: number;
    profitLock?: number;
  };

  sellRiskScore: number;
  reasons: string[];
}

const validPrice = (v?: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export class AdaptiveTrailingExitEngineV137 {
  /**
   * Calculates Wilder smoothed ATR (14-period) from OHLCV candles
   */
  public static calculateWilderATR(
    candles: Array<{ high: number; low: number; close: number }>,
    period = 14
  ): number {
    if (!candles || candles.length < period + 1) {
      throw new Error("INSUFFICIENT_CANDLES_FOR_ATR");
    }

    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      trs.push(tr);
    }

    let atr = trs.slice(0, period).reduce((sum, x) => sum + x, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }

    return Number(atr.toFixed(4));
  }

  /**
   * Helper to round prices to valid market tick size (KRX / US)
   */
  public static normalizeTickSize(price: number, market: "KOREA" | "US" | "CRYPTO" = "KOREA"): number {
    if (!validPrice(price)) return price;

    if (market === "KOREA") {
      let tick = 1;
      if (price >= 500000) tick = 1000;
      else if (price >= 100000) tick = 500;
      else if (price >= 50000) tick = 100;
      else if (price >= 10000) tick = 50;
      else if (price >= 5000) tick = 10;
      else if (price >= 2000) tick = 5;
      else tick = 1;
      return Math.floor(price / tick) * tick;
    } else if (market === "US") {
      if (price >= 1.0) {
        return Math.floor(price * 100) / 100;
      }
      return Math.floor(price * 10000) / 10000;
    }

    return Number(price.toFixed(2));
  }

  public static evaluate(input: AdaptiveTrailingInput): AdaptiveTrailingResult {
    const {
      symbol,
      market = "KOREA",
      entryPrice,
      currentPrice,
      atr14,
      sessionVwap,
      ema20,
      recentSwingLow,
      confirmedSupport,
      previousTrailingFloor,
      structure,
      rsi14,
      macdHist,
    } = input;

    if (!validPrice(entryPrice) || !validPrice(currentPrice) || !validPrice(atr14)) {
      throw new Error("INVALID_REAL_MARKET_DATA");
    }

    // 1. Highest Price (Peak Price Ratchet)
    const peakPrice = Math.max(
      validPrice(input.highestPriceSinceBuy) ? input.highestPriceSinceBuy : entryPrice,
      currentPrice
    );

    // 2. Check if previous persisted stop was breached BEFORE calculating new stop!
    const previousStopBreached =
      validPrice(previousTrailingFloor) && currentPrice <= previousTrailingFloor;

    // 3. Calculate PnL & MFE
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const mfePct = ((peakPrice - entryPrice) / entryPrice) * 100;

    // 4. Volatility Regime
    const atrPct = (atr14 / currentPrice) * 100;
    let volatilityRegime: "LOW" | "NORMAL" | "HIGH" | "EXTREME";
    let atrMultiplier: number;

    if (atrPct < 0.8) {
      volatilityRegime = "LOW";
      atrMultiplier = 1.8;
    } else if (atrPct < 1.8) {
      volatilityRegime = "NORMAL";
      atrMultiplier = 2.1;
    } else if (atrPct < 3.0) {
      volatilityRegime = "HIGH";
      atrMultiplier = 2.6;
    } else {
      volatilityRegime = "EXTREME";
      atrMultiplier = 3.2;
    }

    // Strong trend check: allow wider noise tolerance in healthy uptrends
    const strongTrend =
      structure === "HH_HL" &&
      (input.adx14 ?? 0) >= 25 &&
      (input.plusDi14 ?? 0) > (input.minusDi14 ?? 0);

    if (strongTrend) {
      atrMultiplier += 0.25;
    }

    // 5. Peak + ATR Chandelier Stop
    const peakAtrStop = peakPrice - atr14 * atrMultiplier;

    // 6. Swing Low Stop
    const swingBuffer = atr14 * 0.25;
    const swingStop = validPrice(recentSwingLow) ? recentSwingLow - swingBuffer : undefined;

    // 7. Session VWAP Stop
    const vwapStop = sessionVwap - atr14 * 0.20;

    // 8. Structural Support Stop
    const supportStop = validPrice(confirmedSupport) ? confirmedSupport - atr14 * 0.20 : undefined;

    // 9. EMA20 Trend Support
    const emaStop = ema20 - atr14 * 0.30;

    // 10. Profit Lock
    const costs = input.estimatedRoundTripCostPct ?? 0.25;
    let profitLock: number | undefined;

    // If peak profit expanded >= 1.5x ATR, lock breakeven + costs + safety margin
    if (peakPrice - entryPrice >= atr14 * 1.5) {
      profitLock = entryPrice * (1 + (costs + 0.15) / 100);
    }

    // 11. Proposed Floor Calculation
    const candidates = [
      peakAtrStop,
      swingStop,
      vwapStop,
      supportStop,
      emaStop,
      profitLock,
    ].filter((x): x is number => validPrice(x) && x < currentPrice);

    let proposedFloor = peakAtrStop;

    if (structure === "HH_HL") {
      const structural = [peakAtrStop, swingStop, supportStop].filter(
        (x): x is number => validPrice(x) && x < currentPrice
      );
      if (structural.length > 0) {
        proposedFloor = Math.max(...structural);
      }
    } else if (structure === "SIDEWAYS") {
      const defensive = [peakAtrStop, swingStop, vwapStop, supportStop].filter(
        (x): x is number => validPrice(x) && x < currentPrice
      );
      if (defensive.length > 0) {
        proposedFloor = Math.max(...defensive);
      }
    } else {
      // LH_LL: Tighten floor to protect remaining gains
      if (candidates.length > 0) {
        proposedFloor = Math.max(...candidates);
      }
    }

    if (validPrice(profitLock) && profitLock < currentPrice) {
      proposedFloor = Math.max(proposedFloor, profitLock);
    }

    // 12. Monotonic Ratchet Principle: TRAILING FLOOR NEVER MOVES DOWNWARD!
    const newTrailingFloor = Math.max(
      validPrice(previousTrailingFloor) ? previousTrailingFloor : 0,
      proposedFloor
    );

    // Prevent floor from exceeding maximum fresh threshold immediately below current price
    const maximumFreshFloor = currentPrice - atr14 * 0.15;
    const rawFloor =
      validPrice(previousTrailingFloor) && previousTrailingFloor > maximumFreshFloor
        ? previousTrailingFloor
        : Math.min(newTrailingFloor, maximumFreshFloor);

    const trailingFloor = AdaptiveTrailingExitEngineV137.normalizeTickSize(rawFloor, market);

    // 13. Sell Risk Assessment
    let sellRiskScore = 0;
    const reasons: string[] = [];

    if (currentPrice < sessionVwap) {
      sellRiskScore += 15;
      reasons.push("VWAP_LOSS");
    }

    if (currentPrice < ema20) {
      sellRiskScore += 10;
      reasons.push("EMA20_LOSS");
    }

    if (macdHist < 0) {
      sellRiskScore += 15;
      reasons.push("MACD_WEAK");
    }

    if (rsi14 < 45) {
      sellRiskScore += 10;
      reasons.push("RSI_WEAK");
    }

    if (structure === "LH_LL") {
      sellRiskScore += 30;
      reasons.push("MARKET_STRUCTURE_BREAK");
    }

    if (validPrice(recentSwingLow) && currentPrice < recentSwingLow) {
      sellRiskScore += 25;
      reasons.push("SWING_LOW_BREAK");
    }

    if (validPrice(confirmedSupport) && currentPrice < confirmedSupport) {
      sellRiskScore += 25;
      reasons.push("SUPPORT_BREAK");
    }

    sellRiskScore = clamp(sellRiskScore, 0, 100);

    // 14. Determine Exit State
    let state: ExitState;

    if (previousStopBreached) {
      state = "SELL";
      reasons.unshift("PREVIOUS_TRAILING_STOP_BREACHED");
    } else if (pnlPct <= -3.5) {
      state = "EMERGENCY_EXIT";
      reasons.unshift("MAX_LOSS_BREACHED");
    } else if (sellRiskScore >= 70) {
      state = "SELL";
    } else if (sellRiskScore >= 40) {
      state = "SELL_WATCH";
    } else if (trailingFloor > (previousTrailingFloor || 0) && pnlPct > 0) {
      state = "TRAIL_UP";
    } else if (pnlPct > 0) {
      state = "PROFIT_HOLD";
    } else {
      state = "HOLD";
    }

    return {
      symbol,
      state,
      trailingFloor,
      previousTrailingFloor: previousTrailingFloor || 0,
      peakPrice: Number(peakPrice.toFixed(2)),
      mfePct: Number(mfePct.toFixed(2)),
      pnlPct: Number(pnlPct.toFixed(2)),
      atrPct: Number(atrPct.toFixed(3)),
      atrMultiplier: Number(atrMultiplier.toFixed(2)),
      volatilityRegime,
      candidates: {
        peakAtr: Number(peakAtrStop.toFixed(2)),
        swingLow: swingStop == null ? undefined : Number(swingStop.toFixed(2)),
        vwap: Number(vwapStop.toFixed(2)),
        support: supportStop == null ? undefined : Number(supportStop.toFixed(2)),
        ema20: Number(emaStop.toFixed(2)),
        profitLock: profitLock == null ? undefined : Number(profitLock.toFixed(2)),
      },
      sellRiskScore,
      reasons,
    };
  }
}
