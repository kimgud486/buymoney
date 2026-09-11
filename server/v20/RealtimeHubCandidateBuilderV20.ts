import { serverRealtimeMarketHubV20 } from "./ServerRealtimeMarketHubV20";
import { ServerTrueMTFEvidenceProviderV20 } from "./ServerTrueMTFEvidenceProviderV20";
import {
  ServerGlobalRealtimeScannerV20,
  type DataTruthStatus,
  type ScanCandidateInput,
  type ScanCandidateResult,
} from "./ServerGlobalRealtimeScannerV20";

export interface RealtimeScanTelemetryV20 {
  symbol: string;
  source: string | null;
  lastTickAt: number | null;
  latencyMs: number | null;
  candleCount: number;
  dataStatus: DataTruthStatus;
  reason?: string;
}

export interface RealtimeCandidateBuildResultV20 {
  candidate: ScanCandidateInput | null;
  telemetry: RealtimeScanTelemetryV20;
}

type HubCandle = {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function finite(values: number[]): number[] {
  return values.filter((v) => Number.isFinite(v));
}

function ema(values: number[], period: number): number | undefined {
  const xs = finite(values);
  if (xs.length < period) return undefined;
  const k = 2 / (period + 1);
  let value = xs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < xs.length; i++) value = xs[i] * k + value * (1 - k);
  return Number.isFinite(value) ? value : undefined;
}

function rsi(values: number[], period = 14): number | undefined {
  const xs = finite(values);
  if (xs.length < period + 1) return undefined;
  let gains = 0;
  let losses = 0;
  for (let i = xs.length - period; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    if (d >= 0) gains += d;
    else losses += Math.abs(d);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atr(candles: HubCandle[], period = 14): number | undefined {
  if (candles.length < period + 1) return undefined;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    if (Number.isFinite(tr)) trs.push(tr);
  }
  if (trs.length < period) return undefined;
  const w = trs.slice(-period);
  return w.reduce((a, b) => a + b, 0) / w.length;
}

function vwap(candles: HubCandle[]): number | undefined {
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    if (!Number.isFinite(c.volume) || c.volume <= 0) continue;
    const typical = (c.high + c.low + c.close) / 3;
    if (!Number.isFinite(typical)) continue;
    pv += typical * c.volume;
    vol += c.volume;
  }
  return vol > 0 ? pv / vol : undefined;
}

function rvol(candles: HubCandle[], lookback = 20): number {
  if (candles.length < 3) return 0;
  const current = Math.max(0, Number(candles[candles.length - 1].volume) || 0);
  const prior = candles.slice(Math.max(0, candles.length - 1 - lookback), -1)
    .map((c) => Math.max(0, Number(c.volume) || 0))
    .filter((v) => v > 0);
  if (current <= 0 || prior.length < 2) return 0;
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  return avg > 0 ? current / avg : 0;
}

function structure(candles: HubCandle[]): "BULLISH" | "BEARISH" | "SIDEWAYS" {
  const closes = candles.map((c) => c.close).filter(Number.isFinite);
  const e9 = ema(closes, 9);
  const e20 = ema(closes, 20);
  if (e9 === undefined || e20 === undefined) return "SIDEWAYS";
  if (e9 > e20 * 1.001) return "BULLISH";
  if (e9 < e20 * 0.999) return "BEARISH";
  return "SIDEWAYS";
}

function breakout(candles: HubCandle[], lookback = 20): boolean {
  if (candles.length < lookback + 1) return false;
  const last = candles[candles.length - 1];
  const priorHigh = Math.max(...candles.slice(-lookback - 1, -1).map((c) => c.high));
  return Number.isFinite(priorHigh) && last.close > priorHigh;
}

function retest(candles: HubCandle[], vwapValue?: number): boolean {
  if (!vwapValue || candles.length < 2) return false;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const touched = last.low <= vwapValue * 1.002 && last.high >= vwapValue * 0.998;
  return touched && last.close >= vwapValue && prev.close >= vwapValue;
}

function usablePattern(pattern?: string | null): string[] | undefined {
  const code = String(pattern || "").trim().toUpperCase();
  if (!code || code === "NO_PATTERN" || code === "WARMING_UP") return undefined;
  return [code];
}

export class RealtimeHubCandidateBuilderV20 {
  public static build(symbol: string): RealtimeCandidateBuildResultV20 {
    const key = String(symbol || "").trim().toUpperCase();
    const quote = key ? serverRealtimeMarketHubV20.getQuote(key) : null;
    const candles = key ? (serverRealtimeMarketHubV20.getCandles(key) as HubCandle[]) : [];
    const unifiedSignal = key ? serverRealtimeMarketHubV20.getLatestSignal(key) : null;

    if (!key || !quote) {
      return {
        candidate: null,
        telemetry: {
          symbol: key,
          source: null,
          lastTickAt: null,
          latencyMs: null,
          candleCount: candles.length,
          dataStatus: "NO_DATA",
          reason: "REALTIME_QUOTE_UNAVAILABLE",
        },
      };
    }

    const latencyMs = Math.max(0, Date.now() - quote.updatedAt);
    const dataStatus: DataTruthStatus = quote.grade === "DISPLAY_ONLY" || latencyMs > 15_000
      ? "STALE"
      : quote.grade === "EXECUTION_GRADE"
        ? "REALTIME_VERIFIED"
        : "REALTIME_DERIVED";

    const telemetry: RealtimeScanTelemetryV20 = {
      symbol: key,
      source: quote.source || null,
      lastTickAt: quote.updatedAt,
      latencyMs,
      candleCount: candles.length,
      dataStatus,
    };

    if (dataStatus === "STALE") {
      return { candidate: null, telemetry: { ...telemetry, reason: "STALE_REALTIME_QUOTE" } };
    }
    if (candles.length < 15) {
      return { candidate: null, telemetry: { ...telemetry, reason: "INSUFFICIENT_REALTIME_CANDLES" } };
    }

    const closes = candles.map((c) => c.close);
    const signalIndicators = unifiedSignal?.dataStatus === "READY" ? unifiedSignal.indicators : null;
    const vwapValue = signalIndicators?.vwap ?? vwap(candles);
    const ema9 = signalIndicators?.ema9 ?? ema(closes, 9);
    const ema20 = signalIndicators?.ema20 ?? ema(closes, 20);
    const ema50 = signalIndicators?.ema50 ?? ema(closes, 50);
    const atr14 = signalIndicators?.atr14 ?? atr(candles, 14);
    const rsi14 = signalIndicators?.rsi14 ?? rsi(closes, 14);
    const currentRvol = signalIndicators?.rvol20 ?? rvol(candles, 20);
    const first = candles[0];
    const latest = candles[candles.length - 1];
    const spreadBps = quote.askPrice && quote.bidPrice && quote.askPrice >= quote.bidPrice && quote.price > 0
      ? ((quote.askPrice - quote.bidPrice) / quote.price) * 10_000
      : undefined;
    const detectedPatterns = unifiedSignal?.dataStatus === "READY"
      ? usablePattern(unifiedSignal.pattern)
      : undefined;

    const candidate: ScanCandidateInput = {
      symbol: quote.symbol,
      name: quote.name,
      market: quote.market === "KOREA" ? "KR" : quote.market === "US" ? "US" : "CRYPTO",
      exchange: quote.market === "UPBIT" ? "UPBIT" : "UNKNOWN",
      price: quote.price,
      openPrice: first?.open,
      highPrice: latest?.high,
      lowPrice: latest?.low,
      changePct: quote.changePct,
      volume: quote.volume,
      tradeValue: quote.tradeValue,
      rvol: currentRvol,
      liquiditySource: quote.source,
      vwap: vwapValue,
      ema9,
      ema20,
      ema50,
      atr14,
      rsi14,
      spreadBps,
      patterns: detectedPatterns,
      structureTrend: structure(candles),
      isBreakout: unifiedSignal?.pattern === "BREAKOUT_20" || breakout(candles, 20),
      isRetest: retest(candles, vwapValue),
      chaseRisk: rsi14 !== undefined && rsi14 >= 82,
      exhaustionRisk: atr14 !== undefined && quote.price > 0 && atr14 / quote.price >= 0.12,
      dataStatus,
    };

    return { candidate, telemetry };
  }

  /**
   * Builds the same realtime candidate, then attaches server-owned 1m/3m/5m/D
   * evidence. This keeps the fast capture path backward compatible while giving
   * BUY promotion a truth-checked MTF path without trusting browser input.
   */
  public static async buildWithTrueMtf(
    symbol: string,
    baseUrl: string,
    fetchImpl?: typeof fetch,
  ): Promise<RealtimeCandidateBuildResultV20> {
    const built = this.build(symbol);
    if (!built.candidate) return built;

    const trueMtf = await ServerTrueMTFEvidenceProviderV20.build({
      symbol: built.candidate.symbol,
      baseUrl,
      fetchImpl,
    });

    return {
      ...built,
      candidate: {
        ...built.candidate,
        trueMtf,
      },
    };
  }

  public static scan(symbols: string[]): { candidates: ScanCandidateResult[]; telemetry: RealtimeScanTelemetryV20[] } {
    const built = symbols.map((s) => this.build(s));
    const inputs = built.flatMap((x) => x.candidate ? [x.candidate] : []);
    return {
      candidates: ServerGlobalRealtimeScannerV20.scanCandidates(inputs),
      telemetry: built.map((x) => x.telemetry),
    };
  }

  public static async scanWithTrueMtf(
    symbols: string[],
    baseUrl: string,
    fetchImpl?: typeof fetch,
  ): Promise<{ candidates: ScanCandidateResult[]; telemetry: RealtimeScanTelemetryV20[] }> {
    const built = await Promise.all(
      symbols.map((symbol) => this.buildWithTrueMtf(symbol, baseUrl, fetchImpl)),
    );
    const inputs = built.flatMap((x) => x.candidate ? [x.candidate] : []);
    return {
      candidates: ServerGlobalRealtimeScannerV20.scanCandidates(inputs),
      telemetry: built.map((x) => x.telemetry),
    };
  }
}
