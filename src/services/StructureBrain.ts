/**
 * StructureBrain.ts
 * High-Precision Institutional Market Structure Analysis Engine
 * Calculates:
 * 1. Swing-High / Swing-Low Fractal Detection (N-bar left/right window)
 * 2. Market Structure Breaks: BOS (Break of Structure) & CHoCH (Change of Character)
 * 3. Institutional Order Blocks (Bullish & Bearish OBs with Top/Bottom, Volume, Mitigation Status & Strength)
 * 4. Fair Value Gaps (FVG) (Bullish & Bearish imbalances with Fill % & Mitigation tracking)
 * 5. Liquidity Sweeps (Buy-side & Sell-side Liquidity Grabs at EQH/EQL and Key Fractals)
 */

export interface Candle {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  id: string;
  index: number;
  confirmedAtIndex?: number;
  price: number;
  high: number;
  low: number;
  timestamp: number | string;
  type: "SWING_HIGH" | "SWING_LOW";
  isBroken: boolean;
  brokenIndex?: number;
}

export type MitigationStatus = "UNTOUCHED" | "PARTIAL" | "MITIGATED" | "INVALIDATED";

export interface OrderBlockQuality {
  displacementRatio: number;
  volumeRatio: number;
  bodyExpansion: number;
  bosDistanceAtr: number;
  qualityScore: number | null;
}

export interface OrderBlock {
  id: string;
  type: "BULLISH" | "BEARISH";
  startIndex: number;
  priceTop: number;
  priceBottom: number;
  volume: number;
  mitigationStatus: MitigationStatus;
  isMitigated: boolean;
  mitigatedIndex?: number;
  strength: number; // 0 ~ 100 quality score
  associatedBOSIndex?: number;
  description: string;
}

export interface FairValueGap {
  id: string;
  type: "BULLISH" | "BEARISH";
  candleIndex: number;
  top: number;
  bottom: number;
  gapSize: number;
  fillPercentage: number; // 0 ~ 100%
  isFilled: boolean;
  filledIndex?: number;
  description: string;
}

export interface LiquiditySweep {
  id: string;
  type: "BSL_SWEEP" | "SSL_SWEEP"; // BSL = Buy-Side Liquidity (above Highs), SSL = Sell-Side Liquidity (below Lows)
  candleIndex: number;
  sweptLevel: number;
  wickPrice: number;
  reclaimedClose: number;
  volume: number;
  description: string;
}

export interface StructureBreak {
  type: "BOS" | "CHOCH";
  direction: "BULLISH" | "BEARISH";
  candleIndex: number;
  brokenSwingPrice: number;
  triggerPrice: number;
  description: string;
}

export interface StructureBrainAnalysisResult {
  symbol?: string;
  status?: "READY" | "WAIT";
  reason?: string;
  candlesCount: number;
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  liquiditySweeps: LiquiditySweep[];
  structureBreaks: StructureBreak[];
  currentStructureTrend: "BULLISH_BOS" | "BEARISH_BOS" | "BULLISH_CHOCH" | "BEARISH_CHOCH" | "RANGING";
  smcStructureScore: number | null; // 0 ~ 100 or null if insufficient data
  institutionalScore?: number | null; // Alias for backward compatibility
  institutionalBias: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL" | "NO_DATA";
  summary: string;
  keyLevels: {
    nearestBullishOB: OrderBlock | null;
    nearestBearishOB: OrderBlock | null;
    activeBullishFVG: FairValueGap | null;
    activeBearishFVG: FairValueGap | null;
    lastSweep: LiquiditySweep | null;
  };
}

export interface StructureBrainConfig {
  swingWindowLeft?: number; // default 2
  swingWindowRight?: number; // default 2
  obVolumeMultiplier?: number; // default 1.2
  fvgThresholdPercent?: number; // default 0.15%
  eqhEqlTolerancePercent?: number; // default 0.1%
}

export class StructureBrain {
  /**
   * Main Market Structure Analysis Entry Point
   */
  public static analyze(
    candles: Candle[],
    config: StructureBrainConfig = {},
    symbolName: string = "UNKNOWN"
  ): StructureBrainAnalysisResult {
    const leftWindow = config.swingWindowLeft ?? 2;
    const rightWindow = config.swingWindowRight ?? 2;
    const minFvgPercent = config.fvgThresholdPercent ?? 0.15;

    if (!candles || candles.length < leftWindow + rightWindow + 5) {
      return this.getEmptyResult(symbolName, candles?.length || 0);
    }

    // 1. Detect Swing Highs and Swing Lows
    const { swingHighs, swingLows } = this.detectSwingPoints(candles, leftWindow, rightWindow);

    // 2. Detect Structure Breaks (BOS & CHoCH)
    const { structureBreaks, structureTrend } = this.detectStructureBreaks(candles, swingHighs, swingLows);

    // 3. Detect Institutional Order Blocks
    const orderBlocks = this.detectOrderBlocks(candles, structureBreaks);

    // 4. Detect Fair Value Gaps (FVG)
    const fairValueGaps = this.detectFairValueGaps(candles, minFvgPercent);

    // 5. Detect Liquidity Sweeps (BSL / SSL)
    const liquiditySweeps = this.detectLiquiditySweeps(candles, swingHighs, swingLows);

    // 6. Calculate Institutional Score & Bias
    const { score, bias, summary, keyLevels } = this.calculateInstitutionalMetrics(
      candles,
      structureTrend,
      orderBlocks,
      fairValueGaps,
      liquiditySweeps,
      structureBreaks
    );

    return {
      symbol: symbolName,
      status: "READY",
      reason: "REAL_CANDLES_ANALYZED",
      candlesCount: candles.length,
      swingHighs,
      swingLows,
      orderBlocks,
      fairValueGaps,
      liquiditySweeps,
      structureBreaks,
      currentStructureTrend: structureTrend,
      smcStructureScore: score,
      institutionalScore: score,
      institutionalBias: bias,
      summary,
      keyLevels
    };
  }

  /**
   * 1. Swing High & Swing Low Fractal Detection Algorithm
   */
  private static detectSwingPoints(
    candles: Candle[],
    leftWindow: number,
    rightWindow: number
  ): { swingHighs: SwingPoint[]; swingLows: SwingPoint[] } {
    const swingHighs: SwingPoint[] = [];
    const swingLows: SwingPoint[] = [];

    for (let i = leftWindow; i < candles.length - rightWindow; i++) {
      const current = candles[i];
      let isSwingHigh = true;
      let isSwingLow = true;

      // Check left and right bounds
      for (let j = 1; j <= leftWindow; j++) {
        if (candles[i - j].high >= current.high) isSwingHigh = false;
        if (candles[i - j].low <= current.low) isSwingLow = false;
      }
      for (let j = 1; j <= rightWindow; j++) {
        if (candles[i + j].high > current.high) isSwingHigh = false;
        if (candles[i + j].low < current.low) isSwingLow = false;
      }

      if (isSwingHigh) {
        swingHighs.push({
          id: `sh_${i}_${current.high}`,
          index: i,
          confirmedAtIndex: i + rightWindow,
          price: current.high,
          high: current.high,
          low: current.low,
          timestamp: current.timestamp,
          type: "SWING_HIGH",
          isBroken: false
        });
      }

      if (isSwingLow) {
        swingLows.push({
          id: `sl_${i}_${current.low}`,
          index: i,
          confirmedAtIndex: i + rightWindow,
          price: current.low,
          high: current.high,
          low: current.low,
          timestamp: current.timestamp,
          type: "SWING_LOW",
          isBroken: false
        });
      }
    }

    // Mark broken swings
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      for (const sh of swingHighs) {
        if (!sh.isBroken && i > sh.index && c.close > sh.price) {
          sh.isBroken = true;
          sh.brokenIndex = i;
        }
      }
      for (const sl of swingLows) {
        if (!sl.isBroken && i > sl.index && c.close < sl.price) {
          sl.isBroken = true;
          sl.brokenIndex = i;
        }
      }
    }

    return { swingHighs, swingLows };
  }

  /**
   * 2. Detect BOS (Break of Structure) & CHoCH (Change of Character)
   */
  private static detectStructureBreaks(
    candles: Candle[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[]
  ): {
    structureBreaks: StructureBreak[];
    structureTrend: "BULLISH_BOS" | "BEARISH_BOS" | "BULLISH_CHOCH" | "BEARISH_CHOCH" | "RANGING";
  } {
    const structureBreaks: StructureBreak[] = [];
    let currentTrend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";

    // Combine all swings in chronological order
    const allSwings = [...swingHighs, ...swingLows].sort((a, b) => a.index - b.index);

    let lastSwingHigh: SwingPoint | null = null;
    let lastSwingLow: SwingPoint | null = null;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];

      // Update active swings (only those confirmed at or before current candle i)
      for (const sw of allSwings) {
        const confirmedAt = sw.confirmedAtIndex ?? (sw.index + 2);
        if (confirmedAt <= i) {
          if (sw.type === "SWING_HIGH") lastSwingHigh = sw;
          else lastSwingLow = sw;
        }
      }

      // Check Bullish Break
      if (lastSwingHigh && c.close > lastSwingHigh.price && i > lastSwingHigh.index) {
        const isBOS = currentTrend === "BULLISH" || currentTrend === "NEUTRAL";
        const breakType = isBOS ? "BOS" : "CHOCH";

        structureBreaks.push({
          type: breakType,
          direction: "BULLISH",
          candleIndex: i,
          brokenSwingPrice: lastSwingHigh.price,
          triggerPrice: c.close,
          description: isBOS
            ? `Bullish BOS: Previous Swing High (₩${(lastSwingHigh.price ?? 0).toLocaleString()}) broken to continuation`
            : `Bullish CHoCH: Character changed upward breaking Swing High (₩${(lastSwingHigh.price ?? 0).toLocaleString()})`
        });

        currentTrend = "BULLISH";
        lastSwingHigh = null; // reset broken swing
      }

      // Check Bearish Break
      if (lastSwingLow && c.close < lastSwingLow.price && i > lastSwingLow.index) {
        const isBOS = currentTrend === "BEARISH" || currentTrend === "NEUTRAL";
        const breakType = isBOS ? "BOS" : "CHOCH";

        structureBreaks.push({
          type: breakType,
          direction: "BEARISH",
          candleIndex: i,
          brokenSwingPrice: lastSwingLow.price,
          triggerPrice: c.close,
          description: isBOS
            ? `Bearish BOS: Previous Swing Low (₩${(lastSwingLow.price ?? 0).toLocaleString()}) broken to continuation`
            : `Bearish CHoCH: Character changed downward breaking Swing Low (₩${(lastSwingLow.price ?? 0).toLocaleString()})`
        });

        currentTrend = "BEARISH";
        lastSwingLow = null; // reset broken swing
      }
    }

    const lastBreak = structureBreaks[structureBreaks.length - 1];
    let finalTrend: "BULLISH_BOS" | "BEARISH_BOS" | "BULLISH_CHOCH" | "BEARISH_CHOCH" | "RANGING" = "RANGING";

    if (lastBreak) {
      if (lastBreak.direction === "BULLISH") {
        finalTrend = lastBreak.type === "BOS" ? "BULLISH_BOS" : "BULLISH_CHOCH";
      } else {
        finalTrend = lastBreak.type === "BOS" ? "BEARISH_BOS" : "BEARISH_CHOCH";
      }
    }

    return { structureBreaks, structureTrend: finalTrend };
  }

  /**
   * 3. Order Blocks Detection (Bullish OB & Bearish OB)
   */
  private static detectOrderBlocks(candles: Candle[], structureBreaks: StructureBreak[]): OrderBlock[] {
    const orderBlocks: OrderBlock[] = [];
    const seenOBKeys = new Set<string>();

    for (let sbIdx = 0; sbIdx < structureBreaks.length; sbIdx++) {
      const sb = structureBreaks[sbIdx];
      const breakIdx = sb.candleIndex;

      if (sb.direction === "BULLISH") {
        // Look back from breakIdx to find the last DOWN (bearish) candle before displacement
        let obCandleIdx = -1;
        for (let j = breakIdx - 1; j >= Math.max(0, breakIdx - 10); j--) {
          if (candles[j].close < candles[j].open) {
            obCandleIdx = j;
            break;
          }
        }

        if (obCandleIdx !== -1) {
          const obKey = `BULL_${obCandleIdx}`;
          if (seenOBKeys.has(obKey)) {
            continue;
          }
          seenOBKeys.add(obKey);

          const obCandle = candles[obCandleIdx];
          const top = Math.max(obCandle.open, obCandle.high);
          const bottom = obCandle.low;

          // Check displacement impulse volume & quality
          let impulseVol = 0;
          for (let v = obCandleIdx + 1; v <= breakIdx; v++) {
            impulseVol += candles[v].volume;
          }
          const impulseCount = breakIdx - obCandleIdx || 1;
          const avgImpulseVol = impulseVol / impulseCount;
          
          // Prior 20-period average volume & body
          const priorSlice = candles.slice(Math.max(0, obCandleIdx - 20), obCandleIdx);
          const priorAvgVol = priorSlice.length > 0 ? priorSlice.reduce((s, c) => s + c.volume, 0) / priorSlice.length : obCandle.volume || 1;
          const priorAvgBody = priorSlice.length > 0 ? priorSlice.reduce((s, c) => s + Math.abs(c.close - c.open), 0) / priorSlice.length : Math.abs(obCandle.close - obCandle.open) || 1;

          const volumeRatio = priorAvgVol > 0 ? avgImpulseVol / priorAvgVol : 1.0;
          const bodyExpansion = priorAvgBody > 0 ? Math.abs(candles[breakIdx].close - candles[breakIdx].open) / priorAvgBody : 1.0;
          const bosMove = Math.abs(candles[breakIdx].close - obCandle.close);
          const estAtr = Math.abs(obCandle.high - obCandle.low) || 1;
          const bosDistanceAtr = bosMove / estAtr;

          const strength = Math.min(
            100,
            Math.round(
              Math.min(volumeRatio / 2, 1) * 35 +
              Math.min(bodyExpansion / 2, 1) * 35 +
              Math.min(bosDistanceAtr / 2, 1) * 30
            )
          );

          // Check mitigation status
          let isMitigated = false;
          let mitigatedIndex: number | undefined;
          let mitigationStatus: MitigationStatus = "UNTOUCHED";

          for (let m = breakIdx + 1; m < candles.length; m++) {
            if (candles[m].close < bottom) {
              mitigationStatus = "INVALIDATED";
              isMitigated = true;
              mitigatedIndex = m;
              break;
            } else if (candles[m].low <= bottom) {
              mitigationStatus = "MITIGATED";
              isMitigated = true;
              mitigatedIndex = m;
              break;
            } else if (candles[m].low <= top) {
              mitigationStatus = "PARTIAL";
              isMitigated = true;
              mitigatedIndex = m;
            }
          }

          orderBlocks.push({
            id: `ob_bull_${obCandleIdx}_${breakIdx}_${sbIdx}`,
            type: "BULLISH",
            startIndex: obCandleIdx,
            priceTop: top,
            priceBottom: bottom,
            volume: obCandle.volume,
            mitigationStatus,
            isMitigated,
            mitigatedIndex,
            strength,
            associatedBOSIndex: breakIdx,
            description: `Bullish Order Block (₩${(bottom ?? 0).toLocaleString()} ~ ₩${(top ?? 0).toLocaleString()}) [${mitigationStatus}]`
          });
        }
      } else {
        // Look back from breakIdx to find the last UP (bullish) candle before displacement
        let obCandleIdx = -1;
        for (let j = breakIdx - 1; j >= Math.max(0, breakIdx - 10); j--) {
          if (candles[j].close > candles[j].open) {
            obCandleIdx = j;
            break;
          }
        }

        if (obCandleIdx !== -1) {
          const obKey = `BEAR_${obCandleIdx}`;
          if (seenOBKeys.has(obKey)) {
            continue;
          }
          seenOBKeys.add(obKey);

          const obCandle = candles[obCandleIdx];
          const top = obCandle.high;
          const bottom = Math.min(obCandle.open, obCandle.low);

          let impulseVol = 0;
          for (let v = obCandleIdx + 1; v <= breakIdx; v++) {
            impulseVol += candles[v].volume;
          }
          const impulseCount = breakIdx - obCandleIdx || 1;
          const avgImpulseVol = impulseVol / impulseCount;

          const priorSlice = candles.slice(Math.max(0, obCandleIdx - 20), obCandleIdx);
          const priorAvgVol = priorSlice.length > 0 ? priorSlice.reduce((s, c) => s + c.volume, 0) / priorSlice.length : obCandle.volume || 1;
          const priorAvgBody = priorSlice.length > 0 ? priorSlice.reduce((s, c) => s + Math.abs(c.close - c.open), 0) / priorSlice.length : Math.abs(obCandle.close - obCandle.open) || 1;

          const volumeRatio = priorAvgVol > 0 ? avgImpulseVol / priorAvgVol : 1.0;
          const bodyExpansion = priorAvgBody > 0 ? Math.abs(candles[breakIdx].close - candles[breakIdx].open) / priorAvgBody : 1.0;
          const bosMove = Math.abs(obCandle.close - candles[breakIdx].close);
          const estAtr = Math.abs(obCandle.high - obCandle.low) || 1;
          const bosDistanceAtr = bosMove / estAtr;

          const strength = Math.min(
            100,
            Math.round(
              Math.min(volumeRatio / 2, 1) * 35 +
              Math.min(bodyExpansion / 2, 1) * 35 +
              Math.min(bosDistanceAtr / 2, 1) * 30
            )
          );

          let isMitigated = false;
          let mitigatedIndex: number | undefined;
          let mitigationStatus: MitigationStatus = "UNTOUCHED";

          for (let m = breakIdx + 1; m < candles.length; m++) {
            if (candles[m].close > top) {
              mitigationStatus = "INVALIDATED";
              isMitigated = true;
              mitigatedIndex = m;
              break;
            } else if (candles[m].high >= top) {
              mitigationStatus = "MITIGATED";
              isMitigated = true;
              mitigatedIndex = m;
              break;
            } else if (candles[m].high >= bottom) {
              mitigationStatus = "PARTIAL";
              isMitigated = true;
              mitigatedIndex = m;
            }
          }

          orderBlocks.push({
            id: `ob_bear_${obCandleIdx}_${breakIdx}_${sbIdx}`,
            type: "BEARISH",
            startIndex: obCandleIdx,
            priceTop: top,
            priceBottom: bottom,
            volume: obCandle.volume,
            mitigationStatus,
            isMitigated,
            mitigatedIndex,
            strength,
            associatedBOSIndex: breakIdx,
            description: `Bearish Order Block (₩${(bottom ?? 0).toLocaleString()} ~ ₩${(top ?? 0).toLocaleString()}) [${mitigationStatus}]`
          });
        }
      }
    }

    return orderBlocks;
  }

  /**
   * 4. Fair Value Gap (FVG) Detection
   */
  private static detectFairValueGaps(candles: Candle[], minFvgPercent: number): FairValueGap[] {
    const fvgs: FairValueGap[] = [];

    for (let i = 2; i < candles.length; i++) {
      const c1 = candles[i - 2];
      const c2 = candles[i - 1];
      const c3 = candles[i];

      // Bullish FVG: Low of candle 3 is higher than High of candle 1
      if (c3.low > c1.high) {
        const gapSize = c3.low - c1.high;
        const gapPct = (gapSize / c1.high) * 100;

        if (gapPct >= minFvgPercent) {
          const top = c3.low;
          const bottom = c1.high;

          // Track fill status
          let lowestTouch = top;
          let isFilled = false;
          let filledIndex: number | undefined;

          for (let j = i + 1; j < candles.length; j++) {
            if (candles[j].low < lowestTouch) {
              lowestTouch = candles[j].low;
            }
            if (candles[j].low <= bottom) {
              isFilled = true;
              filledIndex = j;
              break;
            }
          }

          const filledRange = Math.max(0, top - lowestTouch);
          const fillPercentage = isFilled ? 100 : Math.min(Math.round((filledRange / gapSize) * 100), 99);

          fvgs.push({
            id: `fvg_bull_${i}_${Math.round(gapSize)}_${Math.round(top)}`,
            type: "BULLISH",
            candleIndex: i - 1,
            top,
            bottom,
            gapSize,
            fillPercentage,
            isFilled,
            filledIndex,
            description: `Bullish FVG (₩${(bottom ?? 0).toLocaleString()} ~ ₩${(top ?? 0).toLocaleString()}) - ${fillPercentage}% Filled`
          });
        }
      }

      // Bearish FVG: High of candle 3 is lower than Low of candle 1
      if (c3.high < c1.low) {
        const gapSize = c1.low - c3.high;
        const gapPct = (gapSize / c3.high) * 100;

        if (gapPct >= minFvgPercent) {
          const top = c1.low;
          const bottom = c3.high;

          let highestTouch = bottom;
          let isFilled = false;
          let filledIndex: number | undefined;

          for (let j = i + 1; j < candles.length; j++) {
            if (candles[j].high > highestTouch) {
              highestTouch = candles[j].high;
            }
            if (candles[j].high >= top) {
              isFilled = true;
              filledIndex = j;
              break;
            }
          }

          const filledRange = Math.max(0, highestTouch - bottom);
          const fillPercentage = isFilled ? 100 : Math.min(Math.round((filledRange / gapSize) * 100), 99);

          fvgs.push({
            id: `fvg_bear_${i}_${Math.round(gapSize)}_${Math.round(bottom)}`,
            type: "BEARISH",
            candleIndex: i - 1,
            top,
            bottom,
            gapSize,
            fillPercentage,
            isFilled,
            filledIndex,
            description: `Bearish FVG (₩${(bottom ?? 0).toLocaleString()} ~ ₩${(top ?? 0).toLocaleString()}) - ${fillPercentage}% Filled`
          });
        }
      }
    }

    return fvgs;
  }

  /**
   * 5. Liquidity Sweeps Detection (BSL / SSL)
   */
  private static detectLiquiditySweeps(
    candles: Candle[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[]
  ): LiquiditySweep[] {
    const sweeps: LiquiditySweep[] = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];

      // Check Buy-Side Liquidity Sweep (BSL): Wick above Swing High, Close below Swing High
      for (const sh of swingHighs) {
        if (i > sh.index && c.high > sh.price && c.close <= sh.price) {
          sweeps.push({
            id: `sweep_bsl_${i}_${sh.index}`,
            type: "BSL_SWEEP",
            candleIndex: i,
            sweptLevel: sh.price,
            wickPrice: c.high,
            reclaimedClose: c.close,
            volume: c.volume,
            description: `Buy-Side Liquidity (BSL) Sweep at ₩${(sh.price ?? 0).toLocaleString()} (Wick high ₩${(c.high ?? 0).toLocaleString()} → Reclaimed close ₩${(c.close ?? 0).toLocaleString()})`
          });
        }
      }

      // Check Sell-Side Liquidity Sweep (SSL): Wick below Swing Low, Close above Swing Low
      for (const sl of swingLows) {
        if (i > sl.index && c.low < sl.price && c.close >= sl.price) {
          sweeps.push({
            id: `sweep_ssl_${i}_${sl.index}`,
            type: "SSL_SWEEP",
            candleIndex: i,
            sweptLevel: sl.price,
            wickPrice: c.low,
            reclaimedClose: c.close,
            volume: c.volume,
            description: `Sell-Side Liquidity (SSL) Sweep at ₩${(sl.price ?? 0).toLocaleString()} (Wick low ₩${(c.low ?? 0).toLocaleString()} → Reclaimed close ₩${(c.close ?? 0).toLocaleString()})`
          });
        }
      }
    }

    return sweeps;
  }

  /**
   * 6. Calculate Overall Institutional Metrics & Summary
   */
  private static calculateInstitutionalMetrics(
    candles: Candle[],
    structureTrend: "BULLISH_BOS" | "BEARISH_BOS" | "BULLISH_CHOCH" | "BEARISH_CHOCH" | "RANGING",
    orderBlocks: OrderBlock[],
    fairValueGaps: FairValueGap[],
    liquiditySweeps: LiquiditySweep[],
    structureBreaks: StructureBreak[]
  ): {
    score: number;
    bias: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
    summary: string;
    keyLevels: {
      nearestBullishOB: OrderBlock | null;
      nearestBearishOB: OrderBlock | null;
      activeBullishFVG: FairValueGap | null;
      activeBearishFVG: FairValueGap | null;
      lastSweep: LiquiditySweep | null;
    };
  } {
    const currentPrice = candles[candles.length - 1].close;

    // Nearest active Order Blocks
    const unmitigatedBullOBs = orderBlocks.filter((ob) => ob.type === "BULLISH" && !ob.isMitigated);
    const nearestBullishOB = unmitigatedBullOBs.length > 0 ? unmitigatedBullOBs[unmitigatedBullOBs.length - 1] : null;

    const unmitigatedBearOBs = orderBlocks.filter((ob) => ob.type === "BEARISH" && !ob.isMitigated);
    const nearestBearishOB = unmitigatedBearOBs.length > 0 ? unmitigatedBearOBs[unmitigatedBearOBs.length - 1] : null;

    // Active FVGs
    const activeBullishFVGs = fairValueGaps.filter((f) => f.type === "BULLISH" && !f.isFilled);
    const activeBullishFVG = activeBullishFVGs.length > 0 ? activeBullishFVGs[activeBullishFVGs.length - 1] : null;

    const activeBearishFVGs = fairValueGaps.filter((f) => f.type === "BEARISH" && !f.isFilled);
    const activeBearishFVG = activeBearishFVGs.length > 0 ? activeBearishFVGs[activeBearishFVGs.length - 1] : null;

    const lastSweep = liquiditySweeps.length > 0 ? liquiditySweeps[liquiditySweeps.length - 1] : null;

    // Calculate score
    let baseScore = 50;

    if (structureTrend === "BULLISH_BOS") baseScore += 25;
    if (structureTrend === "BULLISH_CHOCH") baseScore += 20;
    if (structureTrend === "BEARISH_BOS") baseScore -= 25;
    if (structureTrend === "BEARISH_CHOCH") baseScore -= 20;

    if (nearestBullishOB && currentPrice >= nearestBullishOB.priceBottom && currentPrice <= nearestBullishOB.priceTop * 1.02) {
      baseScore += 15; // Retesting Bullish OB
    }
    if (lastSweep && lastSweep.type === "SSL_SWEEP") {
      baseScore += 15; // SSL Sweep indicates institutional accumulation
    }
    if (lastSweep && lastSweep.type === "BSL_SWEEP") {
      baseScore -= 15; // BSL Sweep indicates institutional distribution trap
    }
    if (activeBullishFVG && !activeBullishFVG.isFilled) {
      baseScore += 10;
    }

    const score = Math.min(Math.max(Math.round(baseScore), 10), 99);

    let bias: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL" = "NEUTRAL";
    if (score >= 85) bias = "STRONG_BUY";
    else if (score >= 70) bias = "BUY";
    else if (score <= 30) bias = "STRONG_SELL";
    else if (score <= 45) bias = "SELL";

    const summary = `[StructureBrain 분석 결론] 현재 시장 구조는 ${structureTrend} 상태입니다. 미체결 Bullish Order Block (${
      nearestBullishOB ? `₩${(nearestBullishOB.priceBottom ?? 0).toLocaleString()}~₩${(nearestBullishOB.priceTop ?? 0).toLocaleString()}` : "없음"
    })과 SSL Liquidity Sweep (${
      lastSweep ? `최근 ${lastSweep.type}` : "없음"
    })을 종합 검증한 기관 수급 점수는 ${score}점 (${bias})입니다.`;

    return {
      score,
      bias,
      summary,
      keyLevels: {
        nearestBullishOB,
        nearestBearishOB,
        activeBullishFVG,
        activeBearishFVG,
        lastSweep
      }
    };
  }

  /**
   * Helper to generate candle data for live structure testing (DISABLED)
   */
  public static disabledCandleGenerator(): Candle[] {
    throw new Error("SYNTHETIC_CANDLE_GENERATOR_DISABLED: Real verified candles required.");
  }

  private static getEmptyResult(symbolName: string, count: number): StructureBrainAnalysisResult {
    return {
      symbol: symbolName,
      status: "WAIT",
      reason: "WAIT_FOR_REAL_CANDLES",
      candlesCount: count,
      swingHighs: [],
      swingLows: [],
      orderBlocks: [],
      fairValueGaps: [],
      liquiditySweeps: [],
      structureBreaks: [],
      currentStructureTrend: "RANGING",
      smcStructureScore: null,
      institutionalScore: null,
      institutionalBias: "NO_DATA",
      summary: "실시간 캔들 데이터 수량 부족으로 기관 수급 구조 분석 대기 중 (WAIT_FOR_REAL_CANDLES)",
      keyLevels: {
        nearestBullishOB: null,
        nearestBearishOB: null,
        activeBullishFVG: null,
        activeBearishFVG: null,
        lastSweep: null
      }
    };
  }
}
