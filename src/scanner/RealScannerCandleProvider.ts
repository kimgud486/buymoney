import type { CandleRecord } from "./ExplainableOpportunityScannerEngine";

export type ScannerMarket = "KOREA" | "US" | "BTC";
export type ScannerCandleSource = "NAVER_DAILY" | "YAHOO_DAILY" | "UPBIT_DAILY";

export interface RealScannerCandleResult {
  source: ScannerCandleSource;
  timeframe: "1D";
  symbol: string;
  candles: CandleRecord[];
  fetchedAt: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function assertEnoughCandles(symbol: string, candles: CandleRecord[]): CandleRecord[] {
  const valid = candles.filter((c) =>
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close) &&
    Number.isFinite(c.volume) &&
    c.open > 0 &&
    c.high > 0 &&
    c.low > 0 &&
    c.close > 0 &&
    c.volume >= 0 &&
    c.high >= Math.max(c.open, c.close) &&
    c.low <= Math.min(c.open, c.close)
  );

  if (valid.length < 20) {
    throw new Error(`${symbol}: verified OHLCV candles insufficient (${valid.length}/20)`);
  }
  return valid;
}

function dateToTimestamp(value: unknown, fallbackIndex: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1000;
  }
  if (typeof value === "string" && value.trim()) {
    const ts = Date.parse(value);
    if (Number.isFinite(ts)) return ts;
  }
  // Timestamp is only a sorting aid here. We intentionally align fallback data
  // to a daily boundary so it cannot resemble the old Date.now() fake-minute fingerprint.
  return Date.UTC(2000, 0, 1 + fallbackIndex);
}

async function fetchJson(url: string, timeoutMs = 4500): Promise<any> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 buymoney-real-scanner/1.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from candle provider`);
  return response.json();
}

async function fetchNaverDaily(symbol: string): Promise<RealScannerCandleResult> {
  if (!/^\d{6}$/.test(symbol)) throw new Error(`Invalid Korean symbol: ${symbol}`);

  const raw = await fetchJson(
    `https://m.stock.naver.com/api/stock/${encodeURIComponent(symbol)}/price?pageSize=60&page=1`
  );
  if (!Array.isArray(raw)) throw new Error(`${symbol}: invalid NAVER candle payload`);

  const candles = raw
    .map((item: any, index: number): CandleRecord => ({
      open: toNumber(item.openPrice ?? item.open),
      high: toNumber(item.highPrice ?? item.high),
      low: toNumber(item.lowPrice ?? item.low),
      close: toNumber(item.closePrice ?? item.close),
      volume: toNumber(
        item.accumulatedTradingVolume ?? item.accumulatedTradeVolume ?? item.volume
      ),
      timestamp: dateToTimestamp(item.localTradedAt ?? item.date, index),
    }))
    .reverse();

  return {
    source: "NAVER_DAILY",
    timeframe: "1D",
    symbol,
    candles: assertEnoughCandles(symbol, candles),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchYahooDaily(symbol: string): Promise<RealScannerCandleResult> {
  const raw = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo&includePrePost=false`
  );
  const result = raw?.chart?.result?.[0];
  const timestamps: number[] = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0];

  if (!quote || timestamps.length === 0) throw new Error(`${symbol}: invalid YAHOO candle payload`);

  const candles: CandleRecord[] = timestamps.map((ts, i) => ({
    open: toNumber(quote.open?.[i]),
    high: toNumber(quote.high?.[i]),
    low: toNumber(quote.low?.[i]),
    close: toNumber(quote.close?.[i]),
    volume: toNumber(quote.volume?.[i]),
    timestamp: dateToTimestamp(ts, i),
  }));

  return {
    source: "YAHOO_DAILY",
    timeframe: "1D",
    symbol,
    candles: assertEnoughCandles(symbol, candles),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchUpbitDaily(symbol: string): Promise<RealScannerCandleResult> {
  const coin = symbol.toUpperCase().replace(/^KRW-/, "");
  if (!/^[A-Z0-9-]{2,15}$/.test(coin)) throw new Error(`Invalid crypto symbol: ${symbol}`);
  const market = `KRW-${coin}`;
  const raw = await fetchJson(
    `https://api.upbit.com/v1/candles/days?market=${encodeURIComponent(market)}&count=60`
  );
  if (!Array.isArray(raw)) throw new Error(`${market}: invalid UPBIT candle payload`);

  const candles = raw
    .map((item: any, index: number): CandleRecord => ({
      open: toNumber(item.opening_price),
      high: toNumber(item.high_price),
      low: toNumber(item.low_price),
      close: toNumber(item.trade_price),
      volume: toNumber(item.candle_acc_trade_volume),
      timestamp: dateToTimestamp(item.candle_date_time_kst ?? item.timestamp, index),
    }))
    .reverse();

  return {
    source: "UPBIT_DAILY",
    timeframe: "1D",
    symbol: market,
    candles: assertEnoughCandles(market, candles),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetches exchange/provider-backed OHLCV data for the scanner.
 * No random/fallback candles are generated. Any provider failure throws so the
 * caller can fail closed and return no YES signal for that candidate.
 */
export async function fetchRealScannerCandles(
  symbol: string,
  market: ScannerMarket
): Promise<RealScannerCandleResult> {
  if (market === "KOREA") return fetchNaverDaily(symbol);
  if (market === "US") return fetchYahooDaily(symbol);
  return fetchUpbitDaily(symbol);
}
