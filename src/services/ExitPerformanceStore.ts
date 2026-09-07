// ----------------------------------------------------------------------
// EXIT PERFORMANCE STORE V18 (AISTOCK V18 TRADE ANALYTICS RECORD)
// Real Completed Trade Records, MFE/MAE, & Strategy Performance DB
// ----------------------------------------------------------------------

export interface CompletedTradeRecord {
  tradeId: string;
  symbol: string;
  market: "KOREA" | "US" | "BTC";
  strategyId: string;
  entrySetup: string;
  entryScore: number;

  entryTimestamp: number;
  exitTimestamp: number;
  barsHeld: number;

  entryPrice: number;
  exitPrice: number;
  highestPrice: number;
  lowestPrice: number;
  quantity: number;

  grossPnL: number;
  netPnL: number;
  pnLPct: number;

  mfePct: number; // Maximum Favorable Excursion %
  maePct: number; // Maximum Adverse Excursion %
  givebackFromPeakPct: number;

  exitState: string;
  exitReason: string;
  trailingFloorAtExit: number | null;

  fees: number;
  slippage: number;
}

export class ExitPerformanceStore {
  private static instance: ExitPerformanceStore | null = null;
  private records: CompletedTradeRecord[] = [];

  public static getInstance(): ExitPerformanceStore {
    if (!ExitPerformanceStore.instance) {
      ExitPerformanceStore.instance = new ExitPerformanceStore();
    }
    return ExitPerformanceStore.instance;
  }

  /**
   * Record a completed trade
   */
  public recordTrade(trade: CompletedTradeRecord): void {
    if (!trade || !trade.tradeId) return;
    this.records.unshift(trade);
    if (this.records.length > 500) {
      this.records.pop();
    }
  }

  /**
   * Get all completed trade records
   */
  public getRecords(): CompletedTradeRecord[] {
    return [...this.records];
  }

  /**
   * Calculate strategy performance metrics
   */
  public getStrategyMetrics(strategyId?: string): {
    sampleCount: number;
    winRatePct: number;
    netExpectancy: number;
    profitFactor: number;
    avgWinPct: number;
    avgLossPct: number;
    avgMfePct: number;
    avgMaePct: number;
  } {
    const filtered = strategyId
      ? this.records.filter((r) => r.strategyId === strategyId)
      : this.records;

    if (filtered.length === 0) {
      return {
        sampleCount: 0,
        winRatePct: 0,
        netExpectancy: 0,
        profitFactor: 0,
        avgWinPct: 0,
        avgLossPct: 0,
        avgMfePct: 0,
        avgMaePct: 0
      };
    }

    const wins = filtered.filter((r) => r.netPnL > 0);
    const losses = filtered.filter((r) => r.netPnL <= 0);

    const winRatePct = +((wins.length / filtered.length) * 100).toFixed(1);
    const grossWins = wins.reduce((sum, r) => sum + r.netPnL, 0);
    const grossLosses = Math.abs(losses.reduce((sum, r) => sum + r.netPnL, 0));

    const profitFactor = grossLosses > 0 ? +(grossWins / grossLosses).toFixed(2) : grossWins > 0 ? 99.9 : 0;
    const netExpectancy = +(filtered.reduce((sum, r) => sum + r.netPnL, 0) / filtered.length).toFixed(2);

    const avgWinPct = wins.length > 0 ? +(wins.reduce((sum, r) => sum + r.pnLPct, 0) / wins.length).toFixed(2) : 0;
    const avgLossPct = losses.length > 0 ? +(losses.reduce((sum, r) => sum + r.pnLPct, 0) / losses.length).toFixed(2) : 0;

    const avgMfePct = +(filtered.reduce((sum, r) => sum + r.mfePct, 0) / filtered.length).toFixed(2);
    const avgMaePct = +(filtered.reduce((sum, r) => sum + r.maePct, 0) / filtered.length).toFixed(2);

    return {
      sampleCount: filtered.length,
      winRatePct,
      netExpectancy,
      profitFactor,
      avgWinPct,
      avgLossPct,
      avgMfePct,
      avgMaePct
    };
  }
}

export const exitPerformanceStore = ExitPerformanceStore.getInstance();
