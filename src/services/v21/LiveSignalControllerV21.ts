// JUSIK2 V21 LIVE SIGNAL CONTROLLER
// Master pipeline orchestrator connecting real ticks to bars, indicators, setup score, signal plans, and stats.

import { IndicatorEngineV21 } from "./IndicatorEngineV21";
import { LiveTickBarBuilderV21 } from "./LiveTickBarBuilderV21";
import { MarketStructureEngineV21 } from "./MarketStructureEngineV21";
import { PerformanceEngineV21 } from "./PerformanceEngineV21";
import { SetupScorerV21 } from "./SetupScorerV21";
import { SignalLifecycleEngineV21 } from "./SignalLifecycleEngineV21";
import { TradePlanEngineV21 } from "./TradePlanEngineV21";
import {
  BarV21,
  IndicatorSnapshotV21,
  MarketStructureV21,
  PerformanceStatsV21,
  SetupScoreV21,
  SignalLifecycleV21,
  TickV21,
} from "./types";

export class LiveSignalControllerV21 {
  private symbol: string;
  private barBuilder: LiveTickBarBuilderV21;
  private indicatorEngine: IndicatorEngineV21;
  private lifecycleEngine: SignalLifecycleEngineV21;

  private bars: BarV21[] = [];
  private latestIndicators: IndicatorSnapshotV21 | null = null;
  private latestStructure: MarketStructureV21 | null = null;
  private latestSetupScore: SetupScoreV21 | null = null;

  constructor(symbol: string, timeframe = "1m") {
    this.symbol = symbol;
    this.barBuilder = new LiveTickBarBuilderV21(symbol, timeframe);
    this.indicatorEngine = new IndicatorEngineV21();
    this.lifecycleEngine = new SignalLifecycleEngineV21();
  }

  public processTick(tick: TickV21): {
    currentPrice: number;
    updatedBar: BarV21;
    completedBar: BarV21 | null;
    indicators: IndicatorSnapshotV21;
    structure: MarketStructureV21;
    setupScore: SetupScoreV21;
    activeSignal: SignalLifecycleV21 | null;
    stats: PerformanceStatsV21;
  } {
    if (tick.symbol !== this.symbol) {
      throw new Error(`[LiveSignalControllerV21] Symbol mismatch: expected ${this.symbol}, got ${tick.symbol}`);
    }

    // 1. Process Tick through Bar Builder
    const { updatedBar, completedBar } = this.barBuilder.processTick(tick);

    // 2. Compute Indicators
    if (completedBar) {
      this.bars.push(completedBar);
      if (this.bars.length > 300) this.bars.shift();
    }

    const currentBarSlice = completedBar ? this.bars : [...this.bars, updatedBar];
    this.latestIndicators = this.indicatorEngine.ingestBar(updatedBar);

    // 3. Compute Market Structure
    this.latestStructure = MarketStructureEngineV21.evaluate(currentBarSlice, this.latestIndicators);

    // 4. Compute Setup Score
    this.latestSetupScore = SetupScorerV21.evaluate(
      this.symbol,
      tick.price,
      this.latestIndicators,
      this.latestStructure,
      tick.status
    );

    // 5. Trigger Signal on Qualified Bar Completion
    let activeSignal = this.lifecycleEngine.getActiveSignal(this.symbol);
    if (this.latestSetupScore.isQualified && !activeSignal && completedBar) {
      const plan = TradePlanEngineV21.createTradePlan(
        this.symbol,
        tick.market,
        tick.price,
        this.latestIndicators
      );
      activeSignal = this.lifecycleEngine.registerSignal(plan);
    }

    // 6. Process Ticks through Signal Lifecycle
    this.lifecycleEngine.processTick(tick);
    activeSignal = this.lifecycleEngine.getActiveSignal(this.symbol);

    // 7. Calculate Performance Stats
    const stats = PerformanceEngineV21.calculateStats(this.lifecycleEngine.getAllSignals(this.symbol));

    return {
      currentPrice: tick.price,
      updatedBar,
      completedBar,
      indicators: this.latestIndicators,
      structure: this.latestStructure,
      setupScore: this.latestSetupScore,
      activeSignal,
      stats,
    };
  }

  public getActiveSignal(): SignalLifecycleV21 | null {
    return this.lifecycleEngine.getActiveSignal(this.symbol);
  }

  public getStats(): PerformanceStatsV21 {
    return PerformanceEngineV21.calculateStats(this.lifecycleEngine.getAllSignals(this.symbol));
  }
}
