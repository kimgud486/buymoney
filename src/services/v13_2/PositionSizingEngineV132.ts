import { RiskGovernorInputV132, PositionSizingResultV132 } from "./typesV132";

export class PositionSizingEngineV132 {
  /**
   * Calculates safe position sizing based on account capital, position limits, and total exposure limits.
   */
  public calculatePositionSize(input: RiskGovernorInputV132): PositionSizingResultV132 {
    const {
      symbol,
      targetPrice,
      proposedQty,
      totalAccountCapitalKRW,
      currentOpenExposureKRW,
      maxPositionSizePct = 0.20, // Default 20% max per position
      maxAccountExposurePct = 0.80 // Default 80% total account exposure cap
    } = input;

    if (targetPrice <= 0 || totalAccountCapitalKRW <= 0) {
      return {
        symbol,
        targetPrice,
        recommendedQty: 0,
        calculatedPositionSizeKRW: 0,
        positionSizePctOfAccount: 0,
        riskApproved: false,
        rejectionReason: "INVALID_PRICE_OR_CAPITAL"
      };
    }

    // 1. Calculate max capital allowed for a single position
    const maxPositionCapitalAllowed = totalAccountCapitalKRW * maxPositionSizePct;

    // 2. Calculate remaining account exposure capital allowed
    const maxTotalExposureCapitalAllowed = totalAccountCapitalKRW * maxAccountExposurePct;
    const remainingExposureCapitalAllowed = Math.max(0, maxTotalExposureCapitalAllowed - currentOpenExposureKRW);

    if (remainingExposureCapitalAllowed <= 0) {
      return {
        symbol,
        targetPrice,
        recommendedQty: 0,
        calculatedPositionSizeKRW: 0,
        positionSizePctOfAccount: 0,
        riskApproved: false,
        rejectionReason: "MAX_ACCOUNT_EXPOSURE_CAP_EXCEEDED"
      };
    }

    // 3. Cap the capital to the lesser of position limit and remaining account exposure budget
    const maxCapitalForThisTrade = Math.min(maxPositionCapitalAllowed, remainingExposureCapitalAllowed);

    // 4. Determine maximum quantity allowed by capital cap
    const maxQtyByCapital = Math.floor(maxCapitalForThisTrade / targetPrice);

    // 5. Final recommended quantity is the minimum of proposed quantity and max quantity allowed
    const recommendedQty = Math.min(proposedQty, maxQtyByCapital);

    if (recommendedQty <= 0) {
      return {
        symbol,
        targetPrice,
        recommendedQty: 0,
        calculatedPositionSizeKRW: 0,
        positionSizePctOfAccount: 0,
        riskApproved: false,
        rejectionReason: "PROPOSED_QTY_EXCEEDS_POSITION_LIMITS"
      };
    }

    const calculatedPositionSizeKRW = recommendedQty * targetPrice;
    const positionSizePctOfAccount = calculatedPositionSizeKRW / totalAccountCapitalKRW;

    return {
      symbol,
      targetPrice,
      recommendedQty,
      calculatedPositionSizeKRW,
      positionSizePctOfAccount,
      riskApproved: true
    };
  }
}

export const positionSizingEngineV132 = new PositionSizingEngineV132();
