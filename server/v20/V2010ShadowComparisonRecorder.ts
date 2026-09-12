import fs from "fs";
import path from "path";

export type ShadowRecommendationV2010 = "BUY_CANDIDATE" | "WATCH" | "REJECT";
export type ShadowGradeV2010 = "S" | "A" | "B" | "C" | "REJECT";
export type ShadowHorizonKeyV2010 = "5m" | "15m" | "30m";

export interface ShadowScanSnapshotV2010 {
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  price: number;
  setupScore: number;
  grade: ShadowGradeV2010;
  recommendation: ShadowRecommendationV2010;
  patterns?: string[];
  microstructure?: {
    status?: string;
    phase?: string;
    spreadBps?: number | null;
    atrPct?: number | null;
    rvol?: number | null;
  };
}

export interface ShadowOutcomeV2010 {
  resolvedAt: number;
  targetMinutes: 5 | 15 | 30;
  exitPrice: number;
  returnPct: number;
  mfePct: number | null;
  maePct: number | null;
  resolutionLagMs: number;
}

export interface V2010ShadowRecord {
  id: string;
  liveOnly: true;
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  observedAt: number;
  entryPrice: number;
  baseline: {
    setupScore: number;
    grade: ShadowGradeV2010;
    recommendation: ShadowRecommendationV2010;
  };
  v2010: {
    setupScore: number;
    grade: ShadowGradeV2010;
    recommendation: ShadowRecommendationV2010;
    keptBaselineBuy: boolean;
    microstructureStatus: string | null;
    marketPhase: string | null;
    spreadBps: number | null;
    rvol: number | null;
    atrPct: number | null;
  };
  patterns: string[];
  continuityBroken: boolean;
  outcomes: Partial<Record<ShadowHorizonKeyV2010, ShadowOutcomeV2010>>;
}

interface PendingStateV2010 {
  record: V2010ShadowRecord;
  runningMfePct: number;
  runningMaePct: number;
}

export interface ShadowGroupSummaryV2010 {
  count: number;
  winRatePct: number | null;
  avgReturnPct: number | null;
  avgMfePct: number | null;
  avgMaePct: number | null;
}

export interface ShadowHorizonSummaryV2010 {
  horizon: ShadowHorizonKeyV2010;
  baseline: ShadowGroupSummaryV2010;
  keptByV2010: ShadowGroupSummaryV2010;
  blockedByV2010: ShadowGroupSummaryV2010;
  keptWinRateDeltaPct: number | null;
  keptAvgReturnDeltaPct: number | null;
  reviewReady: boolean;
}

export interface V2010ShadowSummary {
  totalBaselineBuySamples: number;
  pendingSamples: number;
  completed30mSamples: number;
  horizons: ShadowHorizonSummaryV2010[];
  note: string;
}

const HORIZONS: Array<{ key: ShadowHorizonKeyV2010; minutes: 5 | 15 | 30 }> = [
  { key: "5m", minutes: 5 },
  { key: "15m", minutes: 15 },
  { key: "30m", minutes: 30 },
];

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function average(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => finite(value));
  if (!clean.length) return null;
  return round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function summarizeGroup(records: V2010ShadowRecord[], horizon: ShadowHorizonKeyV2010): ShadowGroupSummaryV2010 {
  const outcomes = records
    .map((record) => record.outcomes[horizon])
    .filter((outcome): outcome is ShadowOutcomeV2010 => Boolean(outcome));

  if (!outcomes.length) {
    return { count: 0, winRatePct: null, avgReturnPct: null, avgMfePct: null, avgMaePct: null };
  }

  const wins = outcomes.filter((outcome) => outcome.returnPct > 0).length;
  return {
    count: outcomes.length,
    winRatePct: round((wins / outcomes.length) * 100, 2),
    avgReturnPct: average(outcomes.map((outcome) => outcome.returnPct)),
    avgMfePct: average(outcomes.map((outcome) => outcome.mfePct)),
    avgMaePct: average(outcomes.map((outcome) => outcome.maePct)),
  };
}

export class V2010ShadowComparisonRecorder {
  private readonly filePath: string;
  private readonly persistenceEnabled: boolean;
  private readonly records: V2010ShadowRecord[] = [];
  private readonly pending = new Map<string, PendingStateV2010>();

  constructor(
    filePath = process.env.AISTOCK_V20_10_SHADOW_FILE
      || path.resolve(process.cwd(), "data", "v20-10-shadow-comparison.json"),
    persistenceEnabled = process.env.CI !== "true",
  ) {
    this.filePath = filePath;
    this.persistenceEnabled = persistenceEnabled;
    this.load();
  }

  private load(): void {
    if (!this.persistenceEnabled) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      for (const item of parsed) {
        if (!item || typeof item.id !== "string" || !positive(item.entryPrice) || !finite(item.observedAt)) continue;
        const record = item as V2010ShadowRecord;
        const completed = HORIZONS.every(({ key }) => Boolean(record.outcomes?.[key]));
        if (!completed) record.continuityBroken = true;
        this.records.push(record);
        if (!completed) {
          this.pending.set(record.id, {
            record,
            runningMfePct: 0,
            runningMaePct: 0,
          });
        }
      }
    } catch {
      // Truth-first: unreadable historical shadow data is ignored, never invented.
    }
  }

  private persist(): void {
    if (!this.persistenceEnabled) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.records.slice(-20_000), null, 2), "utf-8");
    fs.renameSync(temp, this.filePath);
  }

  public recordComparison(
    baseline: ShadowScanSnapshotV2010,
    v2010: ShadowScanSnapshotV2010,
    observedAt = Date.now(),
  ): V2010ShadowRecord | null {
    if (baseline.recommendation !== "BUY_CANDIDATE") return null;
    if (!baseline.symbol || baseline.symbol !== v2010.symbol || baseline.market !== v2010.market) return null;
    if (!positive(baseline.price) || !finite(observedAt)) return null;

    const minuteBucket = Math.floor(observedAt / 60_000);
    const id = `${baseline.market}:${baseline.symbol}:${minuteBucket}`;
    const existing = this.records.find((record) => record.id === id);
    if (existing) return existing;

    const micro = v2010.microstructure;
    const record: V2010ShadowRecord = {
      id,
      liveOnly: true,
      symbol: baseline.symbol,
      market: baseline.market,
      observedAt,
      entryPrice: baseline.price,
      baseline: {
        setupScore: baseline.setupScore,
        grade: baseline.grade,
        recommendation: baseline.recommendation,
      },
      v2010: {
        setupScore: v2010.setupScore,
        grade: v2010.grade,
        recommendation: v2010.recommendation,
        keptBaselineBuy: v2010.recommendation === "BUY_CANDIDATE",
        microstructureStatus: micro?.status ?? null,
        marketPhase: micro?.phase ?? null,
        spreadBps: finite(micro?.spreadBps) ? micro!.spreadBps! : null,
        rvol: finite(micro?.rvol) ? micro!.rvol! : null,
        atrPct: finite(micro?.atrPct) ? micro!.atrPct! : null,
      },
      patterns: Array.isArray(v2010.patterns) ? [...v2010.patterns] : [],
      continuityBroken: false,
      outcomes: {},
    };

    this.records.push(record);
    this.pending.set(id, { record, runningMfePct: 0, runningMaePct: 0 });
    this.persist();
    return record;
  }

  public observeQuote(symbol: string, price: number, observedAt = Date.now()): void {
    if (!symbol || !positive(price) || !finite(observedAt)) return;
    const key = symbol.trim().toUpperCase();
    let changed = false;

    for (const [id, state] of this.pending.entries()) {
      const record = state.record;
      if (record.symbol.trim().toUpperCase() !== key || observedAt < record.observedAt) continue;

      const returnPct = ((price / record.entryPrice) - 1) * 100;
      if (!record.continuityBroken) {
        state.runningMfePct = Math.max(state.runningMfePct, returnPct);
        state.runningMaePct = Math.min(state.runningMaePct, returnPct);
      }

      for (const { key: horizonKey, minutes } of HORIZONS) {
        if (record.outcomes[horizonKey]) continue;
        const targetAt = record.observedAt + minutes * 60_000;
        if (observedAt < targetAt) continue;

        record.outcomes[horizonKey] = {
          resolvedAt: observedAt,
          targetMinutes: minutes,
          exitPrice: price,
          returnPct: round(returnPct),
          mfePct: record.continuityBroken ? null : round(state.runningMfePct),
          maePct: record.continuityBroken ? null : round(state.runningMaePct),
          resolutionLagMs: Math.max(0, observedAt - targetAt),
        };
        changed = true;
      }

      if (HORIZONS.every(({ key: horizonKey }) => Boolean(record.outcomes[horizonKey]))) {
        this.pending.delete(id);
      }
    }

    if (changed) this.persist();
  }

  public getRecords(): V2010ShadowRecord[] {
    return this.records.map((record) => ({ ...record, outcomes: { ...record.outcomes } }));
  }

  public summarize(reviewMinimum = 100, subgroupMinimum = 20): V2010ShadowSummary {
    const horizons = HORIZONS.map(({ key }) => {
      const baseline = summarizeGroup(this.records, key);
      const keptRecords = this.records.filter((record) => record.v2010.keptBaselineBuy);
      const blockedRecords = this.records.filter((record) => !record.v2010.keptBaselineBuy);
      const keptByV2010 = summarizeGroup(keptRecords, key);
      const blockedByV2010 = summarizeGroup(blockedRecords, key);

      const reviewReady = baseline.count >= reviewMinimum
        && keptByV2010.count >= subgroupMinimum
        && blockedByV2010.count >= subgroupMinimum;

      return {
        horizon: key,
        baseline,
        keptByV2010,
        blockedByV2010,
        keptWinRateDeltaPct: baseline.winRatePct !== null && keptByV2010.winRatePct !== null
          ? round(keptByV2010.winRatePct - baseline.winRatePct, 2)
          : null,
        keptAvgReturnDeltaPct: baseline.avgReturnPct !== null && keptByV2010.avgReturnPct !== null
          ? round(keptByV2010.avgReturnPct - baseline.avgReturnPct)
          : null,
        reviewReady,
      } satisfies ShadowHorizonSummaryV2010;
    });

    return {
      totalBaselineBuySamples: this.records.length,
      pendingSamples: this.pending.size,
      completed30mSamples: this.records.filter((record) => Boolean(record.outcomes["30m"])).length,
      horizons,
      note: "Shadow metrics are observational only. reviewReady is a sample-size review guard, not statistical significance or a profit guarantee.",
    };
  }
}

export const v2010ShadowComparisonRecorder = new V2010ShadowComparisonRecorder();
