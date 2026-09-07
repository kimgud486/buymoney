// JUSIK2 V21 SIGNAL LIFECYCLE ENGINE
// Tracks tick-by-tick signal execution, monotonic stop trailing, and TP/SL hit states.

import { SignalLifecycleV21, SignalOutcomeV21, TickV21, TradePlanV21 } from "./types";

export class SignalLifecycleEngineV21 {
  private activeSignals: Map<string, SignalLifecycleV21> = new Map();
  private completedSignals: SignalLifecycleV21[] = [];

  public registerSignal(plan: TradePlanV21): SignalLifecycleV21 {
    const lifecycle: SignalLifecycleV21 = {
      id: plan.id,
      plan: { ...plan },
      currentTrailingFloor: plan.stopLossPrice,
      highestPriceSinceBuy: plan.entryPrice,
      lowestPriceSinceBuy: plan.entryPrice,
      tp1Hit: false,
      tp2Hit: false,
      tp3Hit: false,
      slHit: false,
      outcome: "PENDING",
      createdAt: Date.now(),
    };

    this.activeSignals.set(plan.id, lifecycle);
    return lifecycle;
  }

  public processTick(tick: TickV21): SignalLifecycleV21[] {
    const updated: SignalLifecycleV21[] = [];

    for (const [id, signal] of this.activeSignals.entries()) {
      if (signal.plan.symbol !== tick.symbol) continue;

      const price = tick.price;
      let stateChanged = false;

      // Update extremes
      if (price > signal.highestPriceSinceBuy) {
        signal.highestPriceSinceBuy = price;
        // Trail floor upward once TP1 is breached (ratchet effect)
        if (price >= signal.plan.tp1) {
          const newFloor = Math.max(signal.currentTrailingFloor, signal.plan.entryPrice);
          if (newFloor > signal.currentTrailingFloor) {
            signal.currentTrailingFloor = newFloor;
            stateChanged = true;
          }
        }
      }

      if (price < signal.lowestPriceSinceBuy) {
        signal.lowestPriceSinceBuy = price;
      }

      // Check Hits
      const hitsTp1 = price >= signal.plan.tp1;
      const hitsTp2 = price >= signal.plan.tp2;
      const hitsTp3 = price >= signal.plan.tp3;
      const hitsSL = price <= signal.currentTrailingFloor;

      // 1. Same-bar / Same-tick Ambiguity Check
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

      // 2. Sequential TP Hits
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

      // 3. Stop Hit (STOP FIRST if TP1 was never reached)
      if (hitsSL && !signal.slHit) {
        signal.slHit = true;
        if (!signal.tp1Hit) {
          signal.outcome = "STOP_FIRST";
        }
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

  public getActiveSignal(symbol?: string): SignalLifecycleV21 | null {
    for (const signal of this.activeSignals.values()) {
      if (!symbol || signal.plan.symbol === symbol) return signal;
    }
    return null;
  }

  public getCompletedSignals(symbol?: string): SignalLifecycleV21[] {
    return symbol
      ? this.completedSignals.filter((s) => s.plan.symbol === symbol)
      : this.completedSignals;
  }

  public getAllSignals(symbol?: string): SignalLifecycleV21[] {
    const list = [
      ...Array.from(this.activeSignals.values()),
      ...this.completedSignals,
    ];
    return symbol ? list.filter((s) => s.plan.symbol === symbol) : list;
  }
}
