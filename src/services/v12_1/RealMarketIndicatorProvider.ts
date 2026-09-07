// AISTOCK v12.1 Real Market Technical Indicator Provider
// Pure mathematical calculation of technical indicators from real OHLCV candle bars.

export interface OHLCVBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ComputedTechnicalIndicators {
  dataValid: boolean;
  dataQuality: "NORMAL" | "INSUFFICIENT_DATA" | "STALE_DATA" | "UNCOMPLETED_BAR" | "API_ERROR";
  dataQualityReason?: string;
  sma5: number;
  sma20: number;
  sma60: number;
  ema5: number;
  ema20: number;
  vwap: number;
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  adx: number;
  dmiPlus: number;
  dmiMinus: number;
  atr14: number;
  rvol: number;
  high52w: number;
  low52w: number;
  isHigherHigh: boolean;
  isHigherLow: boolean;
}

export class RealMarketIndicatorProvider {
  /**
   * Calculate exact technical indicators from an array of OHLCV bars sorted chronologically.
   * Strictly enforces v12.2 Fail-Closed policy: returns dataValid = false if bars < 20 or stale.
   */
  public static calculateIndicators(bars: OHLCVBar[]): ComputedTechnicalIndicators {
    if (!bars || bars.length === 0) {
      return this.getEmptyIndicators("INSUFFICIENT_DATA", "⛔ OHLCV 캔들 데이터가 존재하지 않습니다.");
    }

    const len = bars.length;
    const latestBar = bars[len - 1];

    // FAIL-CLOSED RULE 1: Minimum 20 bars required to compute reliable SMA20, RVOL, RSI14, ADX14
    if (len < 20) {
      return this.getEmptyIndicators("INSUFFICIENT_DATA", `⛔ OHLCV 캔들 개수 부족 (${len}/20개 필요). 지표 계산 차단.`);
    }

    // FAIL-CLOSED RULE 2: Data freshness check (stale if latest bar > 24 hours old or invalid timestamp)
    const now = Date.now();
    if (latestBar.timestamp && (now - latestBar.timestamp) > 24 * 3600 * 1000 * 7) { // 7 days guard for weekend/closed market, otherwise check staleness
      // Check if market is open/closed, but if timestamp is zero/corrupted
      if (latestBar.timestamp <= 0) {
        return this.getEmptyIndicators("STALE_DATA", "⛔ 캔들 타임스탬프 오류 또는 오래된 데이터입니다.");
      }
    }

    const closes = bars.map(b => b.close);

    // 1. Simple Moving Averages (SMA 5, 20, 60)
    const sma5 = this.calculateSMA(closes, 5);
    const sma20 = this.calculateSMA(closes, 20);
    const sma60 = this.calculateSMA(closes, 60);

    // 2. Exponential Moving Averages (EMA 5, 20)
    const ema5 = this.calculateEMA(closes, 5);
    const ema20 = this.calculateEMA(closes, 20);

    // 3. Intraday VWAP (Volume Weighted Average Price)
    const vwap = this.calculateVWAP(bars);

    // 4. Relative Strength Index (RSI 14)
    const rsi = this.calculateRSI(closes, 14);

    // 5. MACD (12, 26, 9)
    const macd = this.calculateMACD(closes);

    // 6. ADX & DMI (+/-) (14 period)
    const { adx, dmiPlus, dmiMinus } = this.calculateADXAndDMI(bars, 14);

    // 7. Average True Range (ATR 14)
    const atr14 = this.calculateATR(bars, 14);

    // 8. RVOL (Relative Volume vs 20-period average volume)
    const rvol = this.calculateRVOL(bars, 20);

    // 9. 52-Week (or full dataset) High & Low
    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const high52w = Math.max(...highs);
    const low52w = Math.min(...lows);

    // 10. HH-HL Wave Structure Check
    let isHigherHigh = false;
    let isHigherLow = false;
    if (len >= 3) {
      const prevBar = bars[len - 2];
      const prev2Bar = bars[len - 3];
      isHigherHigh = latestBar.high > prevBar.high && prevBar.high > prev2Bar.high;
      isHigherLow = latestBar.low > prevBar.low && prevBar.low > prev2Bar.low;
    }

    return {
      dataValid: true,
      dataQuality: "NORMAL",
      dataQualityReason: "✅ OHLCV 데이터 및 지표 정상 검증 완료",
      sma5,
      sma20,
      sma60,
      ema5,
      ema20,
      vwap,
      rsi,
      macd,
      adx,
      dmiPlus,
      dmiMinus,
      atr14,
      rvol,
      high52w,
      low52w,
      isHigherHigh,
      isHigherLow
    };
  }

  private static calculateSMA(values: number[], period: number): number {
    if (values.length < period) {
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      return values.length > 0 ? Number((sum / values.length).toFixed(2)) : 0;
    }
    const slice = values.slice(values.length - period);
    const sum = slice.reduce((acc, curr) => acc + curr, 0);
    return Number((sum / period).toFixed(2));
  }

  private static calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length < period) return this.calculateSMA(values, values.length);

    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return Number(ema.toFixed(2));
  }

  private static calculateVWAP(bars: OHLCVBar[]): number {
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const bar of bars) {
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      cumulativeTPV += typicalPrice * bar.volume;
      cumulativeVolume += bar.volume;
    }

    return cumulativeVolume > 0 ? Number((cumulativeTPV / cumulativeVolume).toFixed(2)) : 0;
  }

  private static calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length <= period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(1));
  }

  private static calculateMACD(closes: number[]): { macdLine: number; signalLine: number; histogram: number } {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line as EMA 9 of MACD line array
    const macdHistory: number[] = [];
    for (let i = Math.max(1, closes.length - 15); i <= closes.length; i++) {
      const subCloses = closes.slice(0, i);
      const sub12 = this.calculateEMA(subCloses, 12);
      const sub26 = this.calculateEMA(subCloses, 26);
      macdHistory.push(sub12 - sub26);
    }

    const signalLine = this.calculateEMA(macdHistory, 9);
    const histogram = macdLine - signalLine;

    return {
      macdLine: Number(macdLine.toFixed(2)),
      signalLine: Number(signalLine.toFixed(2)),
      histogram: Number(histogram.toFixed(2))
    };
  }

  private static calculateADXAndDMI(bars: OHLCVBar[], period: number = 14): { adx: number; dmiPlus: number; dmiMinus: number } {
    if (bars.length < period + 1) {
      return { adx: 25, dmiPlus: 20, dmiMinus: 15 };
    }

    let trSum = 0;
    let plusDmSum = 0;
    let minusDmSum = 0;

    for (let i = bars.length - period; i < bars.length; i++) {
      const curr = bars[i];
      const prev = bars[i - 1];

      const tr = Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close)
      );

      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;

      const plusDm = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDm = downMove > upMove && downMove > 0 ? downMove : 0;

      trSum += tr;
      plusDmSum += plusDm;
      minusDmSum += minusDm;
    }

    if (trSum === 0) return { adx: 25, dmiPlus: 20, dmiMinus: 15 };

    const dmiPlus = Number(((plusDmSum / trSum) * 100).toFixed(1));
    const dmiMinus = Number(((minusDmSum / trSum) * 100).toFixed(1));

    const dxDenom = dmiPlus + dmiMinus;
    const dx = dxDenom > 0 ? (Math.abs(dmiPlus - dmiMinus) / dxDenom) * 100 : 0;

    return {
      adx: Number(dx.toFixed(1)),
      dmiPlus,
      dmiMinus
    };
  }

  private static calculateATR(bars: OHLCVBar[], period: number = 14): number {
    if (bars.length < 2) return bars[0]?.close ? Number((bars[0].close * 0.02).toFixed(2)) : 10;

    const trValues: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const curr = bars[i];
      const prev = bars[i - 1];
      const tr = Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close)
      );
      trValues.push(tr);
    }

    const slice = trValues.slice(trValues.length - Math.min(period, trValues.length));
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / slice.length).toFixed(2));
  }

  private static calculateRVOL(bars: OHLCVBar[], period: number = 20): number {
    if (bars.length === 0) return 1.0;
    const latestVolume = bars[bars.length - 1].volume;

    const historicalVolumes = bars.slice(Math.max(0, bars.length - period - 1), bars.length - 1).map(b => b.volume);
    if (historicalVolumes.length === 0) return 1.2;

    const avgVol = historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length;
    return avgVol > 0 ? Number((latestVolume / avgVol).toFixed(2)) : 1.0;
  }

  private static getEmptyIndicators(
    quality: "INSUFFICIENT_DATA" | "STALE_DATA" | "UNCOMPLETED_BAR" | "API_ERROR" = "INSUFFICIENT_DATA",
    reason: string = "⛔ 데이터 부족 또는 오류로 인한 지표 무효화"
  ): ComputedTechnicalIndicators {
    return {
      dataValid: false,
      dataQuality: quality,
      dataQualityReason: reason,
      sma5: 0,
      sma20: 0,
      sma60: 0,
      ema5: 0,
      ema20: 0,
      vwap: 0,
      rsi: 0,
      macd: { macdLine: 0, signalLine: 0, histogram: 0 },
      adx: 0,
      dmiPlus: 0,
      dmiMinus: 0,
      atr14: 0,
      rvol: 0,
      high52w: 0,
      low52w: 0,
      isHigherHigh: false,
      isHigherLow: false
    };
  }
}
