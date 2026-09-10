import { BuyHoldDecisionEngineV20, BuyHoldDecisionInputV20, BuyHoldDecisionResultV20 } from "./BuyHoldDecisionEngineV20";
import { buyHoldPerformanceStoreV20, StrategyPerformanceKeyV20 } from "./BuyHoldPerformanceStoreV20";

export interface BuyHoldSystemEvaluateInputV20 extends Omit<BuyHoldDecisionInputV20, "performance"> {
  performanceKey: StrategyPerformanceKeyV20;
}

/**
 * Single application-facing BUY/HOLD facade.
 * The caller supplies one V20 scan result plus the live position snapshot.
 * Historical performance is always loaded from the verified closed-trade store.
 */
export class BuyHoldSystemFacadeV20 {
  public static evaluate(input: BuyHoldSystemEvaluateInputV20): BuyHoldDecisionResultV20 {
    const performance = buyHoldPerformanceStoreV20.evaluate(input.performanceKey);
    return BuyHoldDecisionEngineV20.evaluate({
      scan: input.scan,
      position: input.position,
      currentPrice: input.currentPrice,
      trailingStopPct: input.trailingStopPct,
      partialTakeProfitPct: input.partialTakeProfitPct,
      performance
    });
  }
}
