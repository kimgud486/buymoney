export type StrategyProvenance =
  | "LIVE_VERIFIED"
  | "BROKER_VERIFIED"
  | "BACKTEST_OOS_VERIFIED"
  | "PAPER_NOT_VERIFIED"
  | "DATA_UNAVAILABLE"
  | "OVERFIT_REJECTED";

export interface StrategyValidationInput {
  strategyId: string;
  strategyVersion: string;
  parameterHash: string;
  datasetHash: string;
  dataSource: "REAL_KIS" | "UPBIT" | "NAVER" | "SYNTHETIC_TEST" | "UNKNOWN";
  realMarketDataVerified: boolean;
  market: "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" | "CRYPTO";
  symbol: string;

  tradeCount: number;
  grossPnL: number;
  brokerCommission: number;
  transactionTax: number;
  spreadCost: number;
  slippageCost: number;
  
  winRatePct: number;
  expectancyR: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdownPct: number;

  neighborhoodSharpe: number;
  plateauScore: number;
  oosPassed: boolean;
  walkForwardPassed: boolean;
  walkForwardScore: number;
  monteCarloPassed: boolean;
  monteCarloScore: number;
  regimeStabilityPassed: boolean;
}

export interface StrategyValidationResult {
  strategyId: string;
  strategyVersion: string;
  parameterHash: string;
  datasetHash: string;
  provenance: StrategyProvenance;
  liveAllowed: boolean;
  liveSignalWeight: number;
  orderAllowed: boolean;
  netPnL: number;
  rejectionReasons: string[];
  validationMetadata: {
    dataSource: string;
    market: string;
    symbol: string;
    tradeCount: number;
    winRatePct: number;
    expectancyR: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    grossPnL: number;
    feesAndTaxes: number;
    spreadAndSlippage: number;
    netPnL: number;
    neighborhoodSharpe: number;
    plateauScore: number;
    walkForwardScore: number;
    monteCarloScore: number;
    validationTimestamp: number;
  };
}

export class RobustStrategyValidatorV141 {
  public static evaluate(input: StrategyValidationInput): StrategyValidationResult {
    const rejectionReasons: string[] = [];

    // Net PnL Calculation after fees, taxes, spread, and slippage
    const totalFees = input.brokerCommission + input.transactionTax;
    const totalExecutionCosts = input.spreadCost + input.slippageCost;
    const netPnL = input.grossPnL - totalFees - totalExecutionCosts;

    // Gate checks
    const enoughTrades = input.tradeCount >= 30;
    if (!enoughTrades) rejectionReasons.push("INSUFFICIENT_TRADE_SAMPLE_UNDER_30");

    const positiveExpectancy = input.expectancyR > 0 && netPnL > 0;
    if (!positiveExpectancy) rejectionReasons.push("NEGATIVE_OR_ZERO_NET_EXPECTANCY");

    const profitFactorPassed = input.profitFactor >= 1.2;
    if (!profitFactorPassed) rejectionReasons.push("PROFIT_FACTOR_BELOW_THRESHOLD");

    const maxDrawdownPassed = Math.abs(input.maxDrawdownPct) <= 20.0;
    if (!maxDrawdownPassed) rejectionReasons.push("MAX_DRAWDOWN_EXCEEDED_20_PCT");

    const feeSlippagePassed = netPnL > 0;
    if (!feeSlippagePassed) rejectionReasons.push("NET_PNL_NEGATIVE_AFTER_FEES_AND_SLIPPAGE");

    if (!input.realMarketDataVerified) rejectionReasons.push("MARKET_DATA_NOT_VERIFIED");
    if (!input.oosPassed) rejectionReasons.push("OUT_OF_SAMPLE_VALIDATION_FAILED");
    if (!input.walkForwardPassed) rejectionReasons.push("WALK_FORWARD_VALIDATION_FAILED");
    if (!input.plateauScore || input.plateauScore < 0.5) rejectionReasons.push("PARAMETER_PLATEAU_TOO_NARROW");
    if (!input.monteCarloPassed) rejectionReasons.push("MONTE_CARLO_RESAMPLING_FAILED");
    if (!input.regimeStabilityPassed) rejectionReasons.push("REGIME_STABILITY_CHECK_FAILED");

    const liveAllowed =
      input.realMarketDataVerified &&
      enoughTrades &&
      positiveExpectancy &&
      profitFactorPassed &&
      maxDrawdownPassed &&
      input.oosPassed &&
      input.walkForwardPassed &&
      input.plateauScore >= 0.5 &&
      input.monteCarloPassed &&
      feeSlippagePassed &&
      input.regimeStabilityPassed;

    let provenance: StrategyProvenance;
    if (liveAllowed) {
      provenance = "LIVE_VERIFIED";
    } else if (rejectionReasons.includes("MARKET_DATA_NOT_VERIFIED")) {
      provenance = "PAPER_NOT_VERIFIED";
    } else {
      provenance = "OVERFIT_REJECTED";
    }

    return {
      strategyId: input.strategyId,
      strategyVersion: input.strategyVersion,
      parameterHash: input.parameterHash,
      datasetHash: input.datasetHash,
      provenance,
      liveAllowed,
      liveSignalWeight: liveAllowed ? 1.0 : 0.0,
      orderAllowed: liveAllowed,
      netPnL,
      rejectionReasons,
      validationMetadata: {
        dataSource: input.dataSource,
        market: input.market,
        symbol: input.symbol,
        tradeCount: input.tradeCount,
        winRatePct: input.winRatePct,
        expectancyR: input.expectancyR,
        profitFactor: input.profitFactor,
        sharpeRatio: input.sharpeRatio,
        maxDrawdownPct: input.maxDrawdownPct,
        grossPnL: input.grossPnL,
        feesAndTaxes: totalFees,
        spreadAndSlippage: totalExecutionCosts,
        netPnL,
        neighborhoodSharpe: input.neighborhoodSharpe,
        plateauScore: input.plateauScore,
        walkForwardScore: input.walkForwardScore,
        monteCarloScore: input.monteCarloScore,
        validationTimestamp: Date.now(),
      },
    };
  }
}
