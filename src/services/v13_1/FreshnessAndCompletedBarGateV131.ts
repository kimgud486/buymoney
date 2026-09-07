// AISTOCK v13.1 Freshness & Completed Bar Gate
// Enforces 15-second freshness ceiling AND minimum 50 completed bars requirement.

import { RealTimePriceFeedV131, FreshnessGateResultV131, CandleOHLCV131 } from "./typesV131";

export class FreshnessAndCompletedBarGateV131 {
  public static readonly MAX_ALLOWED_STALE_SECONDS = 15;
  public static readonly MIN_REQUIRED_COMPLETED_BARS = 50;

  /**
   * Evaluates freshness and completed bar count for real-time market feeds.
   * Fail-Closed: Rejects trading if feed is stale (>15s) OR completed bars < 50.
   */
  public static evaluate(feed: RealTimePriceFeedV131): FreshnessGateResultV131 {
    const now = Date.now();

    if (!feed || !feed.symbol || typeof feed.currentPrice !== "number" || feed.currentPrice <= 0) {
      return {
        isValid: false,
        isStale: true,
        staleSeconds: 999,
        completedBarCount: 0,
        totalBarCount: 0,
        allowTrading: false,
        reasonCode: "INVALID_PRICE",
        message: "🚨 [DATA_INVALID] 실시간 시세 데이터가 없거나 유효하지 않습니다."
      };
    }

    const lastUpdated = feed.lastUpdatedTimestamp || now;
    const staleSeconds = Math.max(0, Math.floor((now - lastUpdated) / 1000));
    const isStale = staleSeconds > this.MAX_ALLOWED_STALE_SECONDS;

    // Filter completed bars strictly
    const rawCandles: CandleOHLCV131[] = Array.isArray(feed.candles) ? feed.candles : [];
    const completedCandles = rawCandles.filter(c => c.isClosed !== false);
    const completedBarCount = completedCandles.length;
    const totalBarCount = rawCandles.length;

    // 1. Stale Data Check (>15s -> Lock)
    if (isStale) {
      return {
        isValid: true,
        isStale: true,
        staleSeconds,
        completedBarCount,
        totalBarCount,
        allowTrading: false,
        reasonCode: "STALE_DATA",
        message: `🚨 [STALE_DATA_LOCK] 데이터가 ${staleSeconds}초 지연되었습니다 (최대 허용: ${this.MAX_ALLOWED_STALE_SECONDS}초).`
      };
    }

    // 2. Minimum 50 Completed Bars Check
    if (completedBarCount < this.MIN_REQUIRED_COMPLETED_BARS) {
      return {
        isValid: true,
        isStale: false,
        staleSeconds,
        completedBarCount,
        totalBarCount,
        allowTrading: false,
        reasonCode: "INSUFFICIENT_COMPLETED_BARS",
        message: `🚨 [INSUFFICIENT_COMPLETED_BARS] 완료된 OHLCV 캔들(${completedBarCount}개)이 최소 요구치(${this.MIN_REQUIRED_COMPLETED_BARS}개)에 미달합니다.`
      };
    }

    return {
      isValid: true,
      isStale: false,
      staleSeconds,
      completedBarCount,
      totalBarCount,
      allowTrading: true,
      reasonCode: "OK",
      message: "✅ 데이터 신선도 및 50개 확정 완료봉 검증 통과."
    };
  }
}
