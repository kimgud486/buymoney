// ----------------------------------------------------------------------
// AISTOCK V20 NET EXPECTANCY & PERFORMANCE ENGINE
// Mathematically sound performance evaluation with real costs (Fees, Taxes, Slippage)
// ----------------------------------------------------------------------

export interface TradeRecordV20 {
  id: string;
  symbol: string;
  market: "KOREA" | "US" | "UPBIT";
  setup: string;
  pattern: string;
  timeframe: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  grossPnLAmt: number;
  grossPnLPct: number;
  feeAmt: number;
  taxAmt: number;
  slippageAmt: number;
  netPnLAmt: number;
  netPnLPct: number;
  maePct: number; // Maximum Adverse Excursion (%)
  mfePct: number; // Maximum Favorable Excursion (%)
  holdingDurationMs: number;
  entryTimestamp: number;
  exitTimestamp: number;
  exitReason: string;
}

export interface NetExpectancyMetricsV20 {
  sampleCount: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  lossRatePct: number;
  avgWinPct: number;
  avgLossPct: number;
  avgWinAmt: number;
  avgLossAmt: number;
  profitFactor: number;
  expectancyR: number; // Expectancy relative to avg loss R
  netExpectancyPctPerTrade: number;
  netExpectancyAmtPerTrade: number;
  totalGrossPnLAmt: number;
  totalFeesTaxesSlippageAmt: number;
  totalNetPnLAmt: number;
  maxDrawdownPct: number;
  isPositiveEdge: boolean;
}

export class NetExpectancyEngineV20 {
  /**
   * Compute strict Net Expectancy for a set of executed trade records.
   */
  public static calculateNetExpectancy(trades: TradeRecordV20[]): NetExpectancyMetricsV20 {
    if (!trades || trades.length === 0) {
      return {
        sampleCount: 0,
        winCount: 0,
        lossCount: 0,
        winRatePct: 0,
        lossRatePct: 0,
        avgWinPct: 0,
        avgLossPct: 0,
        avgWinAmt: 0,
        avgLossAmt: 0,
        profitFactor: 0,
        expectancyR: 0,
        netExpectancyPctPerTrade: 0,
        netExpectancyAmtPerTrade: 0,
        totalGrossPnLAmt: 0,
        totalFeesTaxesSlippageAmt: 0,
        totalNetPnLAmt: 0,
        maxDrawdownPct: 0,
        isPositiveEdge: false
      };
    }

    const sampleCount = trades.length;
    let winCount = 0;
    let lossCount = 0;

    let winNetPctSum = 0;
    let lossNetPctSum = 0;
    let winNetAmtSum = 0;
    let lossNetAmtSum = 0;

    let totalGrossPnLAmt = 0;
    let totalCostsAmt = 0;
    let totalNetPnLAmt = 0;

    let peakEquity = 0;
    let currentEquity = 0;
    let maxDrawdownAmt = 0;
    let maxDrawdownPct = 0;

    for (const t of trades) {
      const netPnL = t.netPnLAmt;
      const netPct = t.netPnLPct;
      const costs = t.feeAmt + t.taxAmt + t.slippageAmt;

      totalGrossPnLAmt += t.grossPnLAmt;
      totalCostsAmt += costs;
      totalNetPnLAmt += netPnL;

      if (netPnL > 0) {
        winCount++;
        winNetPctSum += netPct;
        winNetAmtSum += netPnL;
      } else if (netPnL < 0) {
        lossCount++;
        lossNetPctSum += Math.abs(netPct);
        lossNetAmtSum += Math.abs(netPnL);
      }

      // Max Drawdown tracking
      currentEquity += netPnL;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const dd = peakEquity - currentEquity;
      if (dd > maxDrawdownAmt) {
        maxDrawdownAmt = dd;
        if (peakEquity > 0) {
          maxDrawdownPct = Math.max(maxDrawdownPct, (dd / peakEquity) * 100);
        }
      }
    }

    const winRatePct = (winCount / sampleCount) * 100;
    const lossRatePct = (lossCount / sampleCount) * 100;

    const avgWinPct = winCount > 0 ? winNetPctSum / winCount : 0;
    const avgLossPct = lossCount > 0 ? lossNetPctSum / lossCount : 0;

    const avgWinAmt = winCount > 0 ? winNetAmtSum / winCount : 0;
    const avgLossAmt = lossCount > 0 ? lossNetAmtSum / lossCount : 0;

    const profitFactor = lossNetAmtSum > 0 ? winNetAmtSum / lossNetAmtSum : winNetAmtSum > 0 ? 999 : 0;

    // Net Expectancy Formula: P(win) * AvgWin - P(loss) * AvgLoss
    const winProb = winCount / sampleCount;
    const lossProb = lossCount / sampleCount;

    const netExpectancyPctPerTrade = (winProb * avgWinPct) - (lossProb * avgLossPct);
    const netExpectancyAmtPerTrade = (winProb * avgWinAmt) - (lossProb * avgLossAmt);

    const expectancyR = avgLossPct > 0 ? netExpectancyPctPerTrade / avgLossPct : 0;

    return {
      sampleCount,
      winCount,
      lossCount,
      winRatePct: Math.round(winRatePct * 100) / 100,
      lossRatePct: Math.round(lossRatePct * 100) / 100,
      avgWinPct: Math.round(avgWinPct * 100) / 100,
      avgLossPct: Math.round(avgLossPct * 100) / 100,
      avgWinAmt: Math.round(avgWinAmt),
      avgLossAmt: Math.round(avgLossAmt),
      profitFactor: Math.round(profitFactor * 100) / 100,
      expectancyR: Math.round(expectancyR * 100) / 100,
      netExpectancyPctPerTrade: Math.round(netExpectancyPctPerTrade * 100) / 100,
      netExpectancyAmtPerTrade: Math.round(netExpectancyAmtPerTrade),
      totalGrossPnLAmt: Math.round(totalGrossPnLAmt),
      totalFeesTaxesSlippageAmt: Math.round(totalCostsAmt),
      totalNetPnLAmt: Math.round(totalNetPnLAmt),
      maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
      isPositiveEdge: netExpectancyPctPerTrade > 0 && sampleCount >= 5
    };
  }
}
