import { TrueMTFTimeframeV20 } from "./TrueMTFSignalGateV20";
import {
  RuntimeBarV204,
  RuntimeHistorySourceV204,
  RuntimeMarketV204,
} from "./TrueMTFRuntimeBuilderV204";
import { ServerScannerRuntimeV204 } from "./ServerScannerRuntimeV204";

export interface HistoricalBarsResultV204 extends RuntimeHistorySourceV204 {
  bars: RuntimeBarV204[];
}

export interface MTFHistoricalBarProviderV204 {
  fetchBars(params: {
    symbol: string;
    market: RuntimeMarketV204;
    timeframe: TrueMTFTimeframeV20;
    limit: number;
  }): Promise<HistoricalBarsResultV204>;
}

export interface MTFBootstrapFrameReportV204 {
  timeframe: TrueMTFTimeframeV20;
  loadedBars: number;
  source: string;
  sourceVerified: boolean;
  passed: boolean;
  reason?: string;
}

export interface MTFBootstrapReportV204 {
  symbol: string;
  market: RuntimeMarketV204;
  ready: boolean;
  frames: MTFBootstrapFrameReportV204[];
  reasons: string[];
}

const REQUIRED_FRAMES: TrueMTFTimeframeV20[] = ["1m", "3m", "5m", "D"];
const MIN_BARS = 50;
const REQUEST_BARS = 80;

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validClosedBars(bars: RuntimeBarV204[]): RuntimeBarV204[] {
  return bars
    .filter(
      (bar) =>
        isFinitePositive(bar.timestamp) &&
        isFinitePositive(bar.open) &&
        isFinitePositive(bar.high) &&
        isFinitePositive(bar.low) &&
        isFinitePositive(bar.close) &&
        Number.isFinite(bar.volume) &&
        bar.volume >= 0 &&
        bar.high >= Math.max(bar.open, bar.close, bar.low) &&
        bar.low <= Math.min(bar.open, bar.close, bar.high),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((bar, index, arr) => index === 0 || bar.timestamp !== arr[index - 1].timestamp)
    .slice(-REQUEST_BARS);
}

/**
 * Loads only broker-sourced historical bars into the True-MTF runtime.
 * It never invents/fills missing bars. A frame with fewer than 50 valid closed
 * bars, blank source metadata, or an unverified source keeps autonomous BUY off.
 */
export class TrueMTFHistoryBootstrapV204 {
  public constructor(
    private readonly provider: MTFHistoricalBarProviderV204,
    private readonly runtime: ServerScannerRuntimeV204,
  ) {}

  public async bootstrapSymbol(
    symbol: string,
    market: RuntimeMarketV204,
  ): Promise<MTFBootstrapReportV204> {
    const frames: MTFBootstrapFrameReportV204[] = [];
    const reasons: string[] = [];

    for (const timeframe of REQUIRED_FRAMES) {
      try {
        const result = await this.provider.fetchBars({
          symbol,
          market,
          timeframe,
          limit: REQUEST_BARS,
        });
        const bars = validClosedBars(Array.isArray(result?.bars) ? result.bars : []);
        const source = String(result?.source ?? "").trim();
        const sourceVerified = result?.sourceVerified === true;

        if (!source) {
          const reason = `${timeframe}:HISTORY_SOURCE_MISSING`;
          reasons.push(reason);
          frames.push({
            timeframe,
            loadedBars: 0,
            source: "",
            sourceVerified: false,
            passed: false,
            reason,
          });
          continue;
        }

        if (bars.length < MIN_BARS) {
          const reason = `${timeframe}:INSUFFICIENT_REAL_HISTORY:${bars.length}/${MIN_BARS}`;
          reasons.push(reason);
          frames.push({
            timeframe,
            loadedBars: bars.length,
            source,
            sourceVerified,
            passed: false,
            reason,
          });
          continue;
        }

        if (!sourceVerified) {
          const reason = `${timeframe}:HISTORY_NOT_EXECUTION_VERIFIED`;
          reasons.push(reason);
          // Seed for analysis, but runtime BUY guard will keep it WATCH.
          this.runtime.seedHistory(symbol, market, timeframe, bars, {
            source,
            sourceVerified: false,
          });
          frames.push({
            timeframe,
            loadedBars: bars.length,
            source,
            sourceVerified: false,
            passed: false,
            reason,
          });
          continue;
        }

        this.runtime.seedHistory(symbol, market, timeframe, bars, {
          source,
          sourceVerified: true,
        });
        frames.push({
          timeframe,
          loadedBars: bars.length,
          source,
          sourceVerified: true,
          passed: true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const reason = `${timeframe}:HISTORY_FETCH_FAILED:${message}`;
        reasons.push(reason);
        frames.push({
          timeframe,
          loadedBars: 0,
          source: "",
          sourceVerified: false,
          passed: false,
          reason,
        });
      }
    }

    const ready =
      frames.length === REQUIRED_FRAMES.length &&
      frames.every((frame) => frame.passed);

    return { symbol, market, ready, frames, reasons };
  }

  public async bootstrapUniverse(
    symbols: string[],
    market: RuntimeMarketV204,
    concurrency: number = 3,
  ): Promise<MTFBootstrapReportV204[]> {
    const unique = Array.from(
      new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
    );
    const results: MTFBootstrapReportV204[] = new Array(unique.length);
    const workers = Math.max(1, Math.min(10, Math.floor(concurrency)));
    let cursor = 0;

    const runWorker = async (): Promise<void> => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= unique.length) return;
        results[index] = await this.bootstrapSymbol(unique[index], market);
      }
    };

    await Promise.all(Array.from({ length: workers }, () => runWorker()));
    return results;
  }
}
