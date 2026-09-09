import type { HotListItemV192 } from "../../src/services/GlobalRealtimeScannerV192";
import { IndicatorTruthEngine } from "../../src/services/IndicatorTruthEngine";
import type { Candle } from "../../src/services/StructureBrain";
import {
  KISHistoricalDataProviderV204,
  VerifiedHistoricalCandleV204,
} from "./KISHistoricalDataProviderV204";
import {
  ServerMarketCandleV204,
  ServerRealtimeMarketHubV20,
} from "./ServerRealtimeMarketHubV20";
import {
  ScanCandidateInput,
  ScanCandidateResult,
  ServerGlobalRealtimeScannerV20,
} from "./ServerGlobalRealtimeScannerV20";
import {
  TrueMTFEvidenceV20,
  TrueMTFSnapshotV20,
  TrueMTFTimeframeV20,
} from "./TrueMTFSignalGateV20";

export interface V204HistoryState {
  symbol: string;
  status: "HISTORY_VERIFIED" | "HISTORY_UNVERIFIED";
  intradayReason: string;
  dailyReason: string;
  seededAt: number;
  dailyCandles: VerifiedHistoricalCandleV204[];
}

export interface V204HotListAudit {
  symbol: string;
  verdict: "YES" | "REJECT";
  reason: string;
  historyStatus: "HISTORY_VERIFIED" | "HISTORY_UNVERIFIED";
  setupScore?: number;
  blockers?: string[];
}

export interface V204StrictHotListResult {
  approved: HotListItemV192[];
  audit: V204HotListAudit[];
  evaluatedCount: number;
  rejectedCount: number;
}

export interface KoreaYesOnlyRuntimeConfigV204 {
  intradayRequiredBars: number;
  dailyRequiredBars: number;
  maxSeedCandidates: number;
  topN: number;
  historyTtlMs: number;
}

const DEFAULT_CONFIG: KoreaYesOnlyRuntimeConfigV204 = {
  // 35 completed 5m bars are required to compute a real MACD histogram.
  // 180 one-minute bars provide 36 five-minute buckets without fabrication.
  intradayRequiredBars: 180,
  dailyRequiredBars: 50,
  maxSeedCandidates: 12,
  topN: 5,
  historyTtlMs: 15 * 60_000,
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

function timestampOf(candle: Candle): number {
  return typeof candle.timestamp === "number"
    ? candle.timestamp
    : Date.parse(candle.timestamp) || 0;
}

function sessionStartKst(timestamp: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  if (!year || !month || !day) return 0;

  // 09:00 KST equals 00:00 UTC. If a timestamp is before the regular session
  // open, use the previous Korean session anchor instead of a future anchor.
  let start = Date.UTC(year, month - 1, day, 0, 0, 0);
  if (hour < 9 || (hour === 9 && minute < 0)) {
    start -= 86_400_000;
  }
  return start;
}

function toIndicatorCandles(candles: Array<Candle>): Candle[] {
  return candles.map((candle) => ({
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

function previousHigh20(candles: Array<Candle>): number | undefined {
  if (candles.length < 21) return undefined;
  const prior = candles.slice(-21, -1);
  const high = Math.max(...prior.map((candle) => candle.high));
  return positive(high) ? high : undefined;
}

function spreadBps(ask?: number, bid?: number): number | undefined {
  if (!positive(ask) || !positive(bid) || ask < bid) return undefined;
  const mid = (ask + bid) / 2;
  return positive(mid) ? ((ask - bid) / mid) * 10_000 : undefined;
}

function mergeCandles(
  historical: VerifiedHistoricalCandleV204[],
  existing: ServerMarketCandleV204[],
): ServerMarketCandleV204[] {
  const byTimestamp = new Map<number, ServerMarketCandleV204>();

  for (const candle of historical) {
    byTimestamp.set(candle.timestamp, {
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      lastTradeTimestamp: candle.lastTradeTimestamp,
      source: candle.source,
    });
  }

  // Existing live candles win on duplicate minute buckets.
  for (const candle of existing) {
    const ts = timestampOf(candle);
    if (!ts) continue;
    byTimestamp.set(ts, { ...candle, timestamp: ts });
  }

  return [...byTimestamp.values()].sort((a, b) => timestampOf(a) - timestampOf(b));
}

function dailyReturnPct(candles: VerifiedHistoricalCandleV204[]): number | null {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!positive(prev.close) || !positive(last.close)) return null;
  return ((last.close - prev.close) / prev.close) * 100;
}

function percentileRanks(valuesBySymbol: Map<string, number>): Map<string, number> {
  const entries = [...valuesBySymbol.entries()].sort((a, b) => a[1] - b[1]);
  const out = new Map<string, number>();
  const n = entries.length;
  if (!n) return out;
  entries.forEach(([symbol], index) => {
    out.set(symbol, Math.round(((index + 1) / n) * 100));
  });
  return out;
}

export class KoreaYesOnlyHotListRuntimeV204 {
  private config: KoreaYesOnlyRuntimeConfigV204;
  private history = new Map<string, V204HistoryState>();

  constructor(
    private provider: KISHistoricalDataProviderV204 = new KISHistoricalDataProviderV204(),
    private hub: ServerRealtimeMarketHubV20 = ServerRealtimeMarketHubV20.getInstance(),
    config: Partial<KoreaYesOnlyRuntimeConfigV204> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public getHistoryState(symbol: string): V204HistoryState | null {
    return this.history.get(symbol.trim().toUpperCase()) ?? null;
  }

  private async ensureHistory(symbol: string): Promise<V204HistoryState> {
    const normalized = symbol.trim().toUpperCase();
    const cached = this.history.get(normalized);
    const now = Date.now();

    if (
      cached?.status === "HISTORY_VERIFIED" &&
      now - cached.seededAt <= this.config.historyTtlMs
    ) {
      return cached;
    }

    const [intraday, daily] = await Promise.all([
      this.provider.fetchIntraday1m(normalized, this.config.intradayRequiredBars),
      this.provider.fetchDaily(normalized, this.config.dailyRequiredBars),
    ]);

    const status = intraday.status === "HISTORY_VERIFIED" && daily.status === "HISTORY_VERIFIED"
      ? "HISTORY_VERIFIED"
      : "HISTORY_UNVERIFIED";

    const state: V204HistoryState = {
      symbol: normalized,
      status,
      intradayReason: intraday.reason,
      dailyReason: daily.reason,
      seededAt: now,
      dailyCandles: daily.candles,
    };

    this.history.set(normalized, state);

    if (status === "HISTORY_VERIFIED") {
      const merged = mergeCandles(intraday.candles, this.hub.getCandles(normalized));
      this.hub.setCandles(normalized, merged);
    }

    return state;
  }

  private buildSnapshot(
    timeframe: TrueMTFTimeframeV20,
    candles: ServerMarketCandleV204[],
    source: string,
  ): TrueMTFSnapshotV20 | null {
    if (candles.length < 35) return null;

    const indicatorCandles = toIndicatorCandles(candles);
    const latest = candles[candles.length - 1];
    const latestTs = timestampOf(latest);
    const sessionStart = timeframe === "D" ? undefined : sessionStartKst(latestTs);
    const snapshot = IndicatorTruthEngine.computeSnapshot(indicatorCandles, sessionStart);

    if (
      !positive(latestTs) ||
      !positive(latest.close) ||
      !positive(snapshot.ema9) ||
      !positive(snapshot.ema20) ||
      !finite(snapshot.rsi14) ||
      !finite(snapshot.macd.histogram) ||
      !positive(snapshot.rvol)
    ) {
      return null;
    }

    if (timeframe === "D" && !positive(snapshot.ema50)) {
      return null;
    }

    const interval = timeframe === "1m"
      ? 60_000
      : timeframe === "3m"
        ? 180_000
        : timeframe === "5m"
          ? 300_000
          : 86_400_000;

    return {
      timeframe,
      dataStatus: timeframe === "1m" ? "REALTIME_VERIFIED" : "REALTIME_DERIVED",
      source,
      lastBarTimestamp: latestTs,
      lastTradeTimestamp: timeframe === "D" ? undefined : latest.lastTradeTimestamp,
      barIntervalMs: interval,
      close: latest.close,
      high: latest.high,
      ema9: snapshot.ema9,
      ema20: snapshot.ema20,
      ema50: snapshot.ema50 ?? undefined,
      rsi14: snapshot.rsi14,
      macdHist: snapshot.macd.histogram,
      rvol: snapshot.rvol,
      vwap: snapshot.vwap ?? undefined,
      previousHigh20: timeframe === "1m" ? previousHigh20(indicatorCandles) : undefined,
    };
  }

  private buildDailySnapshot(
    candles: VerifiedHistoricalCandleV204[],
  ): TrueMTFSnapshotV20 | null {
    if (candles.length < this.config.dailyRequiredBars) return null;

    const serverCandles: ServerMarketCandleV204[] = candles.map((candle) => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      lastTradeTimestamp: candle.lastTradeTimestamp,
      source: candle.source,
    }));

    return this.buildSnapshot("D", serverCandles, "KIS_REST_DAILY_V204");
  }

  private buildCandidate(
    item: HotListItemV192,
    history: V204HistoryState,
    rs1dPercentile: number | undefined,
  ): ScanCandidateInput | null {
    if (history.status !== "HISTORY_VERIFIED") return null;

    const oneMinute = this.hub.getIntradayCandles(item.symbol, 1, false);
    const threeMinute = this.hub.getIntradayCandles(item.symbol, 3, false);
    const fiveMinute = this.hub.getIntradayCandles(item.symbol, 5, false);

    const m1 = this.buildSnapshot("1m", oneMinute, "KIS_REST_PLUS_WS_1M_V204");
    const m3 = this.buildSnapshot("3m", threeMinute, "KIS_1M_AGGREGATED_3M_V204");
    const m5 = this.buildSnapshot("5m", fiveMinute, "KIS_1M_AGGREGATED_5M_V204");
    const daily = this.buildDailySnapshot(history.dailyCandles);

    const trueMtf: TrueMTFEvidenceV20 = {
      "1m": m1 ?? undefined,
      "3m": m3 ?? undefined,
      "5m": m5 ?? undefined,
      D: daily ?? undefined,
    };

    if (!m1 || !m3 || !m5 || !daily) return null;

    const latest1m = oneMinute[oneMinute.length - 1];
    if (!latest1m || !positive(latest1m.volume)) return null;

    const quote = this.hub.getQuote(item.symbol);
    const candidateSpread = quote ? spreadBps(quote.askPrice, quote.bidPrice) : undefined;
    const trend = m1.close > m1.ema20 && m1.ema9 > m1.ema20
      ? "BULLISH"
      : m1.close < m1.ema20
        ? "BEARISH"
        : "SIDEWAYS";

    const exchange = item.exchange === "KOSPI" || item.exchange === "KOSDAQ"
      ? item.exchange
      : "UNKNOWN";

    const prevDaily = history.dailyCandles.length >= 2
      ? history.dailyCandles[history.dailyCandles.length - 2].close
      : 0;
    const changePct = positive(prevDaily)
      ? ((m1.close - prevDaily) / prevDaily) * 100
      : 0;

    return {
      symbol: item.symbol,
      name: item.name,
      market: "KR",
      exchange,
      price: m1.close,
      openPrice: latest1m.open,
      highPrice: latest1m.high,
      lowPrice: latest1m.low,
      changePct,
      volume: latest1m.volume,
      tradeValue: m1.close * latest1m.volume,
      rvol: m1.rvol,
      rs1d: rs1dPercentile,
      vwap: m1.vwap,
      ema9: m1.ema9,
      ema20: m1.ema20,
      ema50: m1.ema50,
      atr14: IndicatorTruthEngine.calculateATR(toIndicatorCandles(oneMinute), 14) ?? undefined,
      rsi14: m1.rsi14,
      spreadBps: candidateSpread,
      // Discovery labels are never promoted to technical pattern evidence.
      patterns: [],
      structureTrend: trend,
      isBreakout: positive(m1.previousHigh20) ? m1.close > m1.previousHigh20 : undefined,
      isRetest: undefined,
      chaseRisk: false,
      exhaustionRisk: false,
      trueMtf,
      // This status is earned from fresh KIS history + final TrueMTF freshness,
      // not inherited from Naver discovery data.
      dataStatus: "REALTIME_VERIFIED",
    };
  }

  private applyApprovedResult(
    item: HotListItemV192,
    result: ScanCandidateResult,
  ): HotListItemV192 {
    const grade: HotListItemV192["grade"] = result.grade === "S"
      ? "S"
      : result.grade === "A"
        ? "A"
        : "B";

    const atr = positive(result.atr14) ? result.atr14 : null;
    const stopLoss = atr ? Math.max(0, result.price - atr * 1.5) : null;
    const targetPrice = atr ? result.price + atr * 3 : null;
    const expectedReturnPct = targetPrice
      ? ((targetPrice - result.price) / result.price) * 100
      : null;

    return {
      ...item,
      currentPrice: result.price,
      priceChange24hPct: result.changePct,
      setupScore: result.setupScore,
      aiMatchScore: result.setupScore,
      grade,
      expectedReturnPct: expectedReturnPct == null ? null : +expectedReturnPct.toFixed(2),
      planningObjectiveNote: atr
        ? "검증된 KIS ATR 기반 2R 계획목표. 수익 보장 수치 아님."
        : "KIS ATR 미산출로 목표가 미제공",
      patternType: "V20_4_TRUE_MTF",
      patternName: "KIS 1m/3m/5m/D 정합",
      targetPrice: targetPrice == null ? null : +targetPrice.toFixed(2),
      stopLoss: stopLoss == null ? null : +stopLoss.toFixed(2),
      holdingPeriod: "신호 유효성 기반",
      riskRewardRatio: atr ? "1 : 2.0" : "N/A",
      volumeIncreaseRatio: result.rvol,
      rsiIndicator: result.rsi14 ?? null,
      reasoning: `[V20.4 YES] ${result.trueMtfGate.confirmations.slice(0, 6).join(", ")}`,
      dataStatus: "REALTIME_VERIFIED",
      evidenceCount: result.trueMtfGate.confirmations.length,
      evidenceList: [...result.trueMtfGate.confirmations],
      metrics: {
        ...item.metrics,
        rvol: result.rvol,
        vwap: result.vwap ?? null,
        ema9: result.ema9 ?? null,
        ema20: result.ema20 ?? null,
        ema50: result.ema50 ?? null,
        rsi14: result.rsi14 ?? null,
        atr14: result.atr14 ?? null,
        rs15m: null,
        breakoutConfirmed: typeof result.isBreakout === "boolean" ? result.isBreakout : null,
        chaseRisk: false,
        exhaustionRisk: false,
        evidenceCoveragePct: result.dataCoveragePct,
      },
    };
  }

  public async filterYesOnly(items: HotListItemV192[]): Promise<V204StrictHotListResult> {
    const koreaItems = items
      .filter((item) => item.market === "KOREA")
      .sort((a, b) => b.setupScore - a.setupScore)
      .slice(0, this.config.maxSeedCandidates);

    const approved: HotListItemV192[] = [];
    const audit: V204HotListAudit[] = [];
    const historyBySymbol = new Map<string, V204HistoryState>();
    const returnBySymbol = new Map<string, number>();

    // Stage A: Naver discovery candidate -> KIS history verification.
    for (const item of koreaItems) {
      const history = await this.ensureHistory(item.symbol);
      historyBySymbol.set(item.symbol, history);
      if (history.status === "HISTORY_VERIFIED") {
        const ret = dailyReturnPct(history.dailyCandles);
        if (ret !== null) returnBySymbol.set(item.symbol, ret);
      }
    }

    // Relative strength is recomputed from KIS daily returns across the
    // deep-verified candidate set. Naver discovery rank is not reused.
    const rsPercentile = percentileRanks(returnBySymbol);

    // Stage B: True MTF + deterministic V20 final gate.
    for (const item of koreaItems) {
      const history = historyBySymbol.get(item.symbol)!;
      if (history.status !== "HISTORY_VERIFIED") {
        audit.push({
          symbol: item.symbol,
          verdict: "REJECT",
          reason: `${history.intradayReason}|${history.dailyReason}`,
          historyStatus: history.status,
        });
        continue;
      }

      const input = this.buildCandidate(item, history, rsPercentile.get(item.symbol));
      if (!input) {
        audit.push({
          symbol: item.symbol,
          verdict: "REJECT",
          reason: "MTF_FEATURE_WARMUP_OR_REAL_VOLUME_INCOMPLETE",
          historyStatus: history.status,
        });
        continue;
      }

      const result = ServerGlobalRealtimeScannerV20.evaluateCandidate(input);
      if (result.recommendation !== "BUY_CANDIDATE" || !result.trueMtfGate.passed) {
        audit.push({
          symbol: item.symbol,
          verdict: "REJECT",
          reason: result.rejectionReason || result.trueMtfGate.blockers.join("|") || "V20_4_NOT_YES",
          historyStatus: history.status,
          setupScore: result.setupScore,
          blockers: result.trueMtfGate.blockers,
        });
        continue;
      }

      approved.push(this.applyApprovedResult(item, result));
      audit.push({
        symbol: item.symbol,
        verdict: "YES",
        reason: "KIS_HISTORY+KIS_PRICE+TRUE_MTF+V20_SCORE_PASS",
        historyStatus: history.status,
        setupScore: result.setupScore,
      });
    }

    approved.sort((a, b) => b.setupScore - a.setupScore);
    const top = approved.slice(0, this.config.topN);

    return {
      approved: top,
      audit,
      evaluatedCount: koreaItems.length,
      rejectedCount: audit.filter((entry) => entry.verdict === "REJECT").length,
    };
  }
}

export const koreaYesOnlyHotListRuntimeV204 = new KoreaYesOnlyHotListRuntimeV204();
