// JUSIK2 V21 PERFORMANCE ENGINE
// Calculates audited signal performance statistics (TP1 touch rate, Expectancy R, Profit Factor).

import { PerformanceStatsV21, SignalLifecycleV21 } from "./types";

export class PerformanceEngineV21 {
  public static calculateStats(signals: SignalLifecycleV21[]): PerformanceStatsV21 {
    const total = signals.length;
    if (total === 0) {
      return {
        totalSignals: 0,
        activeSignalsCount: 0,
        completedSignalsCount: 0,
        tp1HitCount: 0,
        tp2HitCount: 0,
        tp3HitCount: 0,
        stopFirstCount: 0,
        ambiguousCount: 0,
        tp1FirstTouchRatePct: 0,
        tp2HitRatePct: 0,
        tp3HitRatePct: 0,
        stopFirstRatePct: 0,
        expectancyR: 0,
        profitFactor: 1.0,
        maxDrawdownPct: 0,
      };
    }

    const activeCount = signals.filter((s) => s.outcome === "PENDING").length;
    const completedCount = total - activeCount;

    const tp1Count = signals.filter((s) => s.tp1Hit).length;
    const tp2Count = signals.filter((s) => s.tp2Hit).length;
    const tp3Count = signals.filter((s) => s.tp3Hit).length;
    const stopFirstCount = signals.filter((s) => s.outcome === "STOP_FIRST").length;
    const ambiguousCount = signals.filter((s) => s.outcome === "AMBIGUOUS").length;

    const tp1Rate = Number(((tp1Count / total) * 100).toFixed(1));
    const tp2Rate = Number(((tp2Count / total) * 100).toFixed(1));
    const tp3Rate = Number(((tp3Count / total) * 100).toFixed(1));
    const stopFirstRate = Number(((stopFirstCount / total) * 100).toFixed(1));

    // Calculate Expectancy R
    let grossWinsR = 0;
    let grossLossesR = 0;

    for (const s of signals) {
      if (s.tp3Hit) {
        grossWinsR += s.plan.rMultipliers.tp3;
      } else if (s.tp2Hit) {
        grossWinsR += s.plan.rMultipliers.tp2;
      } else if (s.tp1Hit) {
        grossWinsR += s.plan.rMultipliers.tp1;
      } else if (s.outcome === "STOP_FIRST") {
        grossLossesR += 1.0;
      }
    }

    const netR = grossWinsR - grossLossesR;
    const expectancyR = Number((netR / total).toFixed(2));
    const profitFactor = grossLossesR > 0 ? Number((grossWinsR / grossLossesR).toFixed(2)) : grossWinsR > 0 ? 9.99 : 1.0;

    return {
      totalSignals: total,
      activeSignalsCount: activeCount,
      completedSignalsCount: completedCount,
      tp1HitCount: tp1Count,
      tp2HitCount: tp2Count,
      tp3HitCount: tp3Count,
      stopFirstCount,
      ambiguousCount,
      tp1FirstTouchRatePct: tp1Rate,
      tp2HitRatePct: tp2Rate,
      tp3HitRatePct: tp3Rate,
      stopFirstRatePct: stopFirstRate,
      expectancyR,
      profitFactor,
      maxDrawdownPct: 0,
    };
  }
}
