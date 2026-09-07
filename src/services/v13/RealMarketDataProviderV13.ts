// AISTOCK v13 Real Intelligence Core - Real Market Data Provider
// Strict Data Freshness & Completeness Guard.
// Rule: If real-time market data is missing or stale (>15 seconds old), BUY is strictly FORBIDDEN!

import { TechnicalAnalysisEngineV13, CandleOHLCV, CalculatedIndicatorsV13 } from "./TechnicalAnalysisEngineV13";

export interface RealTimePriceFeedV13 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changeRatePct: number;
  volume: number;
  tradingValueKRW: number;
  candles: CandleOHLCV[];
  lastUpdatedTimestamp: number; // Unix Epoch ms
}

export interface MarketDataQualityReportV13 {
  isValid: boolean;
  isStale: boolean;
  staleSeconds: number;
  candleCount: number;
  allowTrading: boolean;
  rejectionReason?: string;
  indicators: CalculatedIndicatorsV13;
}

export class RealMarketDataProviderV13 {
  private static MAX_ALLOWED_STALE_SECONDS = 15;

  /**
   * Validate market data quality and return calculated indicators
   */
  public static validateAndProcess(feed: RealTimePriceFeedV13): MarketDataQualityReportV13 {
    const now = Date.now();
    const staleSeconds = Math.max(0, Math.floor((now - feed.lastUpdatedTimestamp) / 1000));
    const isStale = staleSeconds > this.MAX_ALLOWED_STALE_SECONDS;

    // 1. Data Integrity Check
    if (!feed || !feed.symbol || !feed.currentPrice || feed.currentPrice <= 0) {
      return {
        isValid: false,
        isStale: true,
        staleSeconds,
        candleCount: 0,
        allowTrading: false,
        rejectionReason: "🚨 [데이터 결함] 실시간 시세 데이터가 없거나 유효하지 않습니다. (NO TRADE)",
        indicators: TechnicalAnalysisEngineV13.calculateIndicators([])
      };
    }

    // 2. Data Freshness Guard Check (Strict Rule: Stale > 15s -> NO TRADE)
    if (isStale) {
      return {
        isValid: true,
        isStale: true,
        staleSeconds,
        candleCount: feed.candles?.length || 0,
        allowTrading: false,
        rejectionReason: `🚨 [STALE DATA LOCK] 실시간 시세 데이터가 ${staleSeconds}초 지연되어 매매가 금지됩니다. (최대 허용: ${this.MAX_ALLOWED_STALE_SECONDS}초)`,
        indicators: TechnicalAnalysisEngineV13.calculateIndicators(feed.candles || [])
      };
    }

    // 3. Candle Count Completeness Check
    if (!feed.candles || feed.candles.length < 5) {
      return {
        isValid: true,
        isStale: false,
        staleSeconds,
        candleCount: feed.candles?.length || 0,
        allowTrading: false,
        rejectionReason: "🚨 [캔들 부족] 정밀 지표 계산을 위한 최소 OHLCV 캔들 데이터(5개)가 부족합니다.",
        indicators: TechnicalAnalysisEngineV13.calculateIndicators(feed.candles || [])
      };
    }

    // Calculate real mathematical indicators
    const indicators = TechnicalAnalysisEngineV13.calculateIndicators(feed.candles);

    return {
      isValid: true,
      isStale: false,
      staleSeconds,
      candleCount: feed.candles.length,
      allowTrading: true,
      indicators
    };
  }
}
