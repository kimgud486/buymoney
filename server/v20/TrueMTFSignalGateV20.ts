// ----------------------------------------------------------------------
// TRUE MULTI-TIMEFRAME SIGNAL GATE V20.4
// 1m -> 3m -> 5m -> Daily confirmation before BUY promotion
// Truth-first: missing/invalid/stale timeframe evidence can never become BUY.
// ----------------------------------------------------------------------

export type TrueMTFTimeframeV20 = "1m" | "3m" | "5m" | "D";

export type TrueMTFDataStatusV20 =
  | "REALTIME_VERIFIED"
  | "REALTIME_DERIVED"
  | "STALE"
  | "NO_DATA"
  | "INVALID"
  | "CLOSED";

export interface TrueMTFSnapshotV20 {
  timeframe: TrueMTFTimeframeV20;
  dataStatus: TrueMTFDataStatusV20;
  source: string;

  /** Candle bucket/start timestamp in epoch milliseconds. */
  lastBarTimestamp: number;

  /**
   * Timestamp of the most recent real trade incorporated into this snapshot.
   * V20.4 uses this, not the candle bucket timestamp, for intraday freshness.
   */
  lastTradeTimestamp?: number;

  /** Median/declared source bar interval in milliseconds. */
  barIntervalMs: number;

  close: number;
  high: number;
  ema9: number;
  ema20: number;
  ema50: number;
  rsi14: number;
  macdHist: number;
  rvol: number;

  vwap?: number;
  previousHigh20?: number;
}

export interface TrueMTFEvidenceV20 {
  "1m"?: TrueMTFSnapshotV20;
  "3m"?: TrueMTFSnapshotV20;
  "5m"?: TrueMTFSnapshotV20;
  D?: TrueMTFSnapshotV20;
}

export interface TrueMTFGateConfigV20 {
  minEntryRvol: number;
  maxEntryRsi: number;
  hardOverheatRsi: number;
  maxVwapExtensionPct: number;
  /** Maximum age of the last real intraday trade while scanning for a new BUY. */
  maxIntradayTradeAgeMs: number;
  /** Optional deterministic clock for tests. */
  nowMs?: number;
}

export interface TrueMTFGateResultV20 {
  passed: boolean;
  hardReject: boolean;
  missingTimeframes: TrueMTFTimeframeV20[];
  blockers: string[];
  confirmations: string[];
}

const DEFAULT_CONFIG: TrueMTFGateConfigV20 = {
  minEntryRvol: 1.2,
  maxEntryRsi: 80,
  hardOverheatRsi: 82,
  maxVwapExtensionPct: 4.5,
  maxIntradayTradeAgeMs: 120_000
};

const EXPECTED_INTERVAL_MS: Record<TrueMTFTimeframeV20, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  D: 86_400_000
};

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function positive(v: unknown): v is number {
  return finite(v) && v > 0;
}

function intervalMatches(timeframe: TrueMTFTimeframeV20, intervalMs: number): boolean {
  if (!positive(intervalMs)) return false;
  const expected = EXPECTED_INTERVAL_MS[timeframe];

  // Intraday tolerates +/- 25%. Daily tolerates market/weekend/session variance.
  if (timeframe === "D") {
    return intervalMs >= 43_200_000 && intervalMs <= 129_600_000;
  }

  return intervalMs >= expected * 0.75 && intervalMs <= expected * 1.25;
}

function validateSnapshot(
  key: TrueMTFTimeframeV20,
  snapshot: TrueMTFSnapshotV20,
  blockers: string[],
  confirmations: string[],
  nowMs: number,
  maxIntradayTradeAgeMs: number,
): boolean {
  if (snapshot.timeframe !== key) {
    blockers.push(`${key}:SOURCE_TIMEFRAME_MISMATCH:${snapshot.timeframe}`);
    return false;
  }

  if (
    snapshot.dataStatus !== "REALTIME_VERIFIED" &&
    snapshot.dataStatus !== "REALTIME_DERIVED"
  ) {
    blockers.push(`${key}:DATA_TRUTH_REJECT:${snapshot.dataStatus}`);
    return false;
  }

  if (!snapshot.source || snapshot.source.trim().length === 0) {
    blockers.push(`${key}:MISSING_SOURCE`);
    return false;
  }

  if (!positive(snapshot.lastBarTimestamp)) {
    blockers.push(`${key}:INVALID_BAR_TIMESTAMP`);
    return false;
  }

  if (!intervalMatches(key, snapshot.barIntervalMs)) {
    blockers.push(`${key}:INVALID_BAR_INTERVAL:${snapshot.barIntervalMs}`);
    return false;
  }

  // The daily frame is a higher-timeframe context bar. Intraday frames must
  // prove that a recent real trade actually reached the candle. A 5m candle
  // can begin several minutes ago and still be perfectly live, so bucket time
  // is intentionally not used for this freshness decision.
  if (key !== "D") {
    if (!positive(snapshot.lastTradeTimestamp)) {
      blockers.push(`${key}:MISSING_LAST_TRADE_TIMESTAMP`);
      return false;
    }

    const ageMs = Math.max(0, nowMs - snapshot.lastTradeTimestamp);
    if (ageMs > maxIntradayTradeAgeMs) {
      blockers.push(`${key}:STALE_LAST_TRADE:${ageMs}`);
      return false;
    }
    confirmations.push(`${key}:LAST_TRADE_FRESH:${ageMs}ms`);
  }

  const requiredNumbers: Array<[string, number]> = [
    ["close", snapshot.close],
    ["high", snapshot.high],
    ["ema9", snapshot.ema9],
    ["ema20", snapshot.ema20],
    ["ema50", snapshot.ema50],
    ["rsi14", snapshot.rsi14],
    ["macdHist", snapshot.macdHist],
    ["rvol", snapshot.rvol]
  ];

  const invalid = requiredNumbers.find(([, value]) => !finite(value));
  if (invalid) {
    blockers.push(`${key}:INVALID_${invalid[0].toUpperCase()}`);
    return false;
  }

  if (!positive(snapshot.close) || !positive(snapshot.ema20) || !positive(snapshot.ema50)) {
    blockers.push(`${key}:INVALID_PRICE_OR_EMA`);
    return false;
  }

  return true;
}

/**
 * Final promotion gate for new BUY candidates.
 *
 * Hierarchy:
 *   D  = higher-timeframe trend
 *   5m = setup structure
 *   3m = confirmation
 *   1m = entry trigger
 *
 * This class never fabricates missing frames and never treats one interval as another.
 */
export class TrueMTFSignalGateV20 {
  public static evaluate(
    evidence?: TrueMTFEvidenceV20,
    config?: Partial<TrueMTFGateConfigV20>
  ): TrueMTFGateResultV20 {
    const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
    const nowMs = positive(cfg.nowMs) ? cfg.nowMs : Date.now();
    const blockers: string[] = [];
    const confirmations: string[] = [];
    const missingTimeframes: TrueMTFTimeframeV20[] = [];
    const required: TrueMTFTimeframeV20[] = ["1m", "3m", "5m", "D"];

    if (!evidence) {
      return {
        passed: false,
        hardReject: false,
        missingTimeframes: required,
        blockers: ["TRUE_MTF_EVIDENCE_MISSING"],
        confirmations
      };
    }

    for (const tf of required) {
      const snapshot = evidence[tf];
      if (!snapshot) {
        missingTimeframes.push(tf);
        blockers.push(`${tf}:MISSING`);
        continue;
      }
      validateSnapshot(
        tf,
        snapshot,
        blockers,
        confirmations,
        nowMs,
        cfg.maxIntradayTradeAgeMs,
      );
    }

    if (missingTimeframes.length > 0) {
      return {
        passed: false,
        hardReject: false,
        missingTimeframes,
        blockers,
        confirmations
      };
    }

    const m1 = evidence["1m"]!;
    const m3 = evidence["3m"]!;
    const m5 = evidence["5m"]!;
    const daily = evidence.D!;

    // If source metadata is invalid or the real trade feed is stale, do not
    // continue to directional checks and never promote a BUY candidate.
    if (blockers.length > 0) {
      return {
        passed: false,
        hardReject: false,
        missingTimeframes,
        blockers,
        confirmations
      };
    }

    // Hard overheat applies to new entries on intraday frames.
    const overheated = [m1, m3, m5].find((x) => x.rsi14 > cfg.hardOverheatRsi);
    if (overheated) {
      blockers.push(`${overheated.timeframe}:RSI_OVERHEAT:${overheated.rsi14.toFixed(1)}`);
      return {
        passed: false,
        hardReject: true,
        missingTimeframes,
        blockers,
        confirmations
      };
    }

    // 1m fake breakout: wick/high clears resistance but close falls back below it.
    if (
      positive(m1.previousHigh20) &&
      m1.high > m1.previousHigh20 &&
      m1.close <= m1.previousHigh20
    ) {
      blockers.push("1m:FAKE_BREAKOUT_CLOSE_REJECT");
      return {
        passed: false,
        hardReject: true,
        missingTimeframes,
        blockers,
        confirmations
      };
    }

    // 1m chase filter around VWAP.
    if (positive(m1.vwap)) {
      const vwapExtensionPct = ((m1.close - m1.vwap) / m1.vwap) * 100;
      if (vwapExtensionPct > cfg.maxVwapExtensionPct) {
        blockers.push(`1m:VWAP_EXTENSION:${vwapExtensionPct.toFixed(2)}%`);
        return {
          passed: false,
          hardReject: true,
          missingTimeframes,
          blockers,
          confirmations
        };
      }
    }

    // Daily higher-timeframe trend.
    if (!(daily.close > daily.ema20 && daily.ema20 > daily.ema50)) {
      blockers.push("D:TREND_NOT_BULLISH");
    } else {
      confirmations.push("D:PRICE>EMA20>EMA50");
    }

    if (daily.rsi14 < 48 || daily.rsi14 > 76) {
      blockers.push(`D:RSI_NOT_SUPPORTIVE:${daily.rsi14.toFixed(1)}`);
    } else {
      confirmations.push(`D:RSI_SUPPORTIVE:${daily.rsi14.toFixed(1)}`);
    }

    // 5m setup structure.
    if (!(m5.close > m5.ema20 && m5.ema9 > m5.ema20)) {
      blockers.push("5m:SETUP_TREND_NOT_CONFIRMED");
    } else {
      confirmations.push("5m:EMA_STRUCTURE_CONFIRMED");
    }

    if (positive(m5.vwap) && m5.close <= m5.vwap) {
      blockers.push("5m:BELOW_VWAP");
    } else if (positive(m5.vwap)) {
      confirmations.push("5m:ABOVE_VWAP");
    }

    if (m5.macdHist <= 0) {
      blockers.push("5m:MACD_NOT_POSITIVE");
    } else {
      confirmations.push("5m:MACD_POSITIVE");
    }

    // 3m confirmation.
    if (!(m3.close > m3.ema20 && m3.ema9 > m3.ema20)) {
      blockers.push("3m:TREND_CONFIRMATION_FAILED");
    } else {
      confirmations.push("3m:TREND_CONFIRMED");
    }

    if (m3.macdHist <= 0) {
      blockers.push("3m:MACD_CONFIRMATION_FAILED");
    } else {
      confirmations.push("3m:MACD_POSITIVE");
    }

    // 1m entry trigger.
    if (positive(m1.vwap) && m1.close <= m1.vwap) {
      blockers.push("1m:ENTRY_BELOW_VWAP");
    } else if (positive(m1.vwap)) {
      confirmations.push("1m:ENTRY_ABOVE_VWAP");
    }

    if (m1.rvol < cfg.minEntryRvol) {
      blockers.push(`1m:RVOL_TOO_LOW:${m1.rvol.toFixed(2)}`);
    } else {
      confirmations.push(`1m:RVOL_OK:${m1.rvol.toFixed(2)}`);
    }

    if (m1.macdHist <= 0) {
      blockers.push("1m:MACD_ENTRY_FAILED");
    } else {
      confirmations.push("1m:MACD_POSITIVE");
    }

    if (m1.rsi14 > cfg.maxEntryRsi) {
      blockers.push(`1m:RSI_TOO_HIGH:${m1.rsi14.toFixed(1)}`);
    } else {
      confirmations.push(`1m:RSI_ENTRY_OK:${m1.rsi14.toFixed(1)}`);
    }

    return {
      passed: blockers.length === 0,
      hardReject: false,
      missingTimeframes,
      blockers,
      confirmations
    };
  }
}
