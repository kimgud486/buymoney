import type { LiveCandle, MarketStructureSnapshot } from "./types";
import { ConfirmedSwingEngineV138 } from "../services/v13_8/ConfirmedSwingEngineV138";

export class MarketStructureEngine {
  public static analyze(candles: LiveCandle[], vwap: number): MarketStructureSnapshot {
    if (!candles || candles.length < 5) {
      return {
        trend: "SIDEWAYS",
        hhhlValid: false,
        lhllValid: false,
        higherHigh: false,
        higherLow: false,
        lowerHigh: false,
        lowerLow: false,
        structure: "SIDEWAYS",
        breakoutValid: false,
        pullbackValid: false,
        vwapReclaim: false,
        volumeExpansion: false,
        chochDetected: false,
        bosDetected: false
      };
    }

    const recent = candles.slice(-20);
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];

    // Find pivot highs and pivot lows
    const swingHighs: { price: number; idx: number }[] = [];
    const swingLows: { price: number; idx: number }[] = [];

    for (let i = 2; i < recent.length - 2; i++) {
      const c = recent[i];
      const isHigh =
        c.high > recent[i - 1].high &&
        c.high > recent[i - 2].high &&
        c.high > recent[i + 1].high &&
        c.high > recent[i + 2].high;

      const isLow =
        c.low < recent[i - 1].low &&
        c.low < recent[i - 2].low &&
        c.low < recent[i + 1].low &&
        c.low < recent[i + 2].low;

      if (isHigh) swingHighs.push({ price: c.high, idx: i });
      if (isLow) swingLows.push({ price: c.low, idx: i });
    }

    const lastHigh = swingHighs[swingHighs.length - 1]?.price;
    const prevHigh = swingHighs[swingHighs.length - 2]?.price;
    const lastLow = swingLows[swingLows.length - 1]?.price;
    const prevLow = swingLows[swingLows.length - 2]?.price;

    const higherHigh = Boolean(lastHigh && prevHigh && lastHigh > prevHigh);
    const higherLow = Boolean(lastLow && prevLow && lastLow > prevLow);
    const lowerHigh = Boolean(lastHigh && prevHigh && lastHigh < prevHigh);
    const lowerLow = Boolean(lastLow && prevLow && lastLow < prevLow);

    let hhhlValid = false;
    let lhllValid = false;
    let structure: "HH_HL" | "LH_LL" | "SIDEWAYS" = "SIDEWAYS";
    let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";

    if (lastHigh && prevHigh && lastLow && prevLow) {
      if (lastHigh >= prevHigh && lastLow >= prevLow) {
        hhhlValid = true;
        structure = "HH_HL";
        trend = "BULLISH";
      } else if (lastHigh <= prevHigh && lastLow <= prevLow) {
        lhllValid = true;
        structure = "LH_LL";
        trend = "BEARISH";
      }
    } else {
      // Fallback simple slope
      const firstClose = recent[0].close;
      if (last.close > firstClose && last.close > vwap) {
        hhhlValid = true;
        structure = "HH_HL";
        trend = "BULLISH";
      } else if (last.close < firstClose && last.close < vwap) {
        lhllValid = true;
        structure = "LH_LL";
        trend = "BEARISH";
      }
    }

    // Confirmed Swing Low via ConfirmedSwingEngineV138
    const confirmedLowPoint = ConfirmedSwingEngineV138.findLastConfirmedLow(
      candles.map((c) => ({
        high: c.high,
        low: c.low,
        close: c.close,
        time: c.time,
      })),
      2,
      2
    );

    const lastConfirmedSwingLow = confirmedLowPoint?.price;
    const confirmedSupport = lastConfirmedSwingLow ?? lastLow;

    // Breakout detection
    const highRange = Math.max(...recent.slice(0, -1).map(c => c.high));
    const breakoutValid = last.close > highRange;

    // Pullback detection: price dipped towards vwap or previous high and held
    const pullbackValid = prev.low <= vwap * 1.002 && last.close > vwap;

    // VWAP Reclaim: previous was below vwap, current closed above
    const vwapReclaim = prev.close < vwap && last.close >= vwap;

    // Volume expansion: current volume > 1.5x average
    const avgVol = recent.reduce((a, b) => a + b.volume, 0) / recent.length;
    const volumeExpansion = last.volume > avgVol * 1.35;

    // BOS / CHOCH
    const bosDetected = breakoutValid && volumeExpansion;
    const chochDetected = trend === "BEARISH" && vwapReclaim && last.close > prev.high;

    return {
      trend,
      hhhlValid,
      lhllValid,
      higherHigh,
      higherLow,
      lowerHigh,
      lowerLow,
      structure,
      lastHigherHigh: lastHigh,
      lastHigherLow: lastLow,
      lastLowerHigh: prevHigh,
      lastLowerLow: prevLow,
      lastConfirmedSwingHigh: lastHigh,
      lastConfirmedSwingLow,
      confirmedSupport,
      breakoutValid,
      pullbackValid,
      vwapReclaim,
      volumeExpansion,
      chochDetected,
      bosDetected
    };
  }
}
