// AISTOCK v13.8 Confirmed Swing Low Engine

export interface SwingCandle {
  high: number;
  low: number;
  close: number;
  time: string | number;
}

export interface SwingPoint {
  price: number;
  index: number;
  time: string | number;
  confirmed: boolean;
  strength: number;
}

export class ConfirmedSwingEngineV138 {
  /**
   * Finds the most recent pivot-confirmed swing low in a sequence of candles.
   * Unconfirmed recent candles (within the `right` window) are excluded.
   */
  public static findLastConfirmedLow(
    candles: SwingCandle[],
    left = 2,
    right = 2
  ): SwingPoint | null {
    if (!candles || candles.length < left + right + 1) {
      return null;
    }

    let last: SwingPoint | null = null;

    for (let i = left; i < candles.length - right; i++) {
      const current = candles[i];
      let isSwingLow = true;

      for (let j = 1; j <= left; j++) {
        if (current.low > candles[i - j].low) {
          isSwingLow = false;
          break;
        }
      }

      if (!isSwingLow) {
        continue;
      }

      for (let j = 1; j <= right; j++) {
        if (current.low >= candles[i + j].low) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingLow) {
        const surroundingHigh = Math.max(
          ...candles.slice(i - left, i + right + 1).map((c) => c.high)
        );

        const strength =
          current.low > 0
            ? ((surroundingHigh - current.low) / current.low) * 100
            : 0;

        last = {
          price: current.low,
          index: i,
          time: current.time,
          confirmed: true,
          strength: Number(strength.toFixed(2)),
        };
      }
    }

    return last;
  }
}
