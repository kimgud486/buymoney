// AISTOCK V20 LIVE TRADE SIGNAL TRACKER
// Anti-repainting tick-by-tick signal lifecycle tracker with hit rate statistics.

import { TradePlanResult } from "./AdaptiveTradePlanEngineV20";
import { V20Tick } from "./LiveTickBarBuilderV20";

export type SignalOutcome = "PENDING" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "AMBIGUOUS";

export interface FrozenTradeSignal {
  id: string;
  symbol: string;
  createdAt: number; // ms
  plan: TradePlanResult;
  currentTrailingFloor: number;
  highestPriceSinceSignal: number;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  slHit: boolean;
  outcome: SignalOutcome;
  closedAt?: number;
}

export interface SignalOverlayStats {
  totalSignals: number;
  tp1HitCount: number;
  tp2HitCount: number;
  tp3HitCount: number;
  slHitCount: number;
  ambiguousCount: number;
  tp1HitRate: number; // %
  tp2HitRate: number; // %
  tp3HitRate: number; // %
  slHitRate: number; // %
}

export class LiveTradeSignalTrackerV20 {
  private activeSignals: Map<string, FrozenTradeSignal> = new Map();
  private completedSignals: FrozenTradeSignal[] = [];

  public registerSignal(plan: TradePlanResult): FrozenTradeSignal {
    const id = `SIG_${plan.symbol}_${Date.now()}`;
    const signal: FrozenTradeSignal = {
      id,
      symbol: plan.symbol,
      createdAt: Date.now(),
      plan: { ...plan }, // Freeze plan snapshot
      currentTrailingFloor: plan.stopLossPrice,
      highestPriceSinceSignal: plan.entryPrice,
      tp1Hit: false,
      tp2Hit: false,
      tp3Hit: false,
      slHit: false,
      outcome: "PENDING",
    };

    this.activeSignals.set(id, signal);
    return signal;
  }

  public processTick(tick: V20Tick): FrozenTradeSignal[] {
    const updated: FrozenTradeSignal[] = [];

    for (const [id, signal] of this.activeSignals.entries()) {
      if (signal.symbol !== tick.symbol) continue;

      const price = tick.price;
      let stateChanged = false;

      // 1. Update Highest Price & Monotonic Trailing Floor
      if (price > signal.highestPriceSinceSignal) {
        signal.highestPriceSinceSignal = price;
        // Trail floor upward as price moves above TP1 (ratchet effect)
        if (price > signal.plan.tp1) {
          const newFloor = Math.max(
            signal.currentTrailingFloor,
            signal.plan.entryPrice // Move stop to breakeven once TP1 breached
          );
          if (newFloor > signal.currentTrailingFloor) {
            signal.currentTrailingFloor = newFloor;
            stateChanged = true;
          }
        }
      }

      // 2. Check TP & SL Breaches
      const hitsTp1 = price >= signal.plan.tp1;
      const hitsTp2 = price >= signal.plan.tp2;
      const hitsTp3 = price >= signal.plan.tp3;
      const hitsSL = price <= signal.currentTrailingFloor;

      // Ambiguity Check: If tick price somehow violates both TP and SL in one jump
      if (hitsSL && (hitsTp1 || hitsTp2 || hitsTp3) && signal.outcome === "PENDING") {
        signal.slHit = true;
        signal.tp1Hit = hitsTp1;
        signal.outcome = "AMBIGUOUS";
        signal.closedAt = Date.now();
        this.completedSignals.push(signal);
        this.activeSignals.delete(id);
        updated.push(signal);
        continue;
      }

      if (hitsTp1 && !signal.tp1Hit) {
        signal.tp1Hit = true;
        if (signal.outcome === "PENDING") signal.outcome = "TP1_HIT";
        stateChanged = true;
      }

      if (hitsTp2 && !signal.tp2Hit) {
        signal.tp2Hit = true;
        signal.outcome = "TP2_HIT";
        stateChanged = true;
      }

      if (hitsTp3 && !signal.tp3Hit) {
        signal.tp3Hit = true;
        signal.outcome = "TP3_HIT";
        signal.closedAt = Date.now();
        this.completedSignals.push(signal);
        this.activeSignals.delete(id);
        updated.push(signal);
        continue;
      }

      if (hitsSL && !signal.slHit) {
        signal.slHit = true;
        signal.outcome = "SL_HIT";
        signal.closedAt = Date.now();
        this.completedSignals.push(signal);
        this.activeSignals.delete(id);
        updated.push(signal);
        continue;
      }

      if (stateChanged) {
        updated.push(signal);
      }
    }

    return updated;
  }

  public getActiveSignals(symbol?: string): FrozenTradeSignal[] {
    const list = Array.from(this.activeSignals.values());
    return symbol ? list.filter((s) => s.symbol === symbol) : list;
  }

  public getCompletedSignals(symbol?: string): FrozenTradeSignal[] {
    return symbol ? this.completedSignals.filter((s) => s.symbol === symbol) : this.completedSignals;
  }

  public getStats(symbol?: string): SignalOverlayStats {
    const all = [
      ...Array.from(this.activeSignals.values()),
      ...this.completedSignals,
    ].filter((s) => !symbol || s.symbol === symbol);

    const total = all.length;
    if (total === 0) {
      return {
        totalSignals: 0,
        tp1HitCount: 0,
        tp2HitCount: 0,
        tp3HitCount: 0,
        slHitCount: 0,
        ambiguousCount: 0,
        tp1HitRate: 0,
        tp2HitRate: 0,
        tp3HitRate: 0,
        slHitRate: 0,
      };
    }

    const tp1Count = all.filter((s) => s.tp1Hit).length;
    const tp2Count = all.filter((s) => s.tp2Hit).length;
    const tp3Count = all.filter((s) => s.tp3Hit).length;
    const slCount = all.filter((s) => s.slHit && s.outcome === "SL_HIT").length;
    const ambiguousCount = all.filter((s) => s.outcome === "AMBIGUOUS").length;

    return {
      totalSignals: total,
      tp1HitCount: tp1Count,
      tp2HitCount: tp2Count,
      tp3HitCount: tp3Count,
      slHitCount: slCount,
      ambiguousCount,
      tp1HitRate: Number(((tp1Count / total) * 100).toFixed(1)),
      tp2HitRate: Number(((tp2Count / total) * 100).toFixed(1)),
      tp3HitRate: Number(((tp3Count / total) * 100).toFixed(1)),
      slHitRate: Number(((slCount / total) * 100).toFixed(1)),
    };
  }
}
