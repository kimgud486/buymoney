import { livePositionRuntime } from "./livePositionRuntime";
import { BrokerExecutionNotice } from "./LivePositionRuntimeService";

export interface BrokerOrderAdapter {
  submitMarketSell(
    symbol: string,
    qty: number
  ): Promise<{
    accepted: boolean;
    orderId?: string;
    reason?: string;
  }>;
}

export class PositionExecutionBridge {
  constructor(private broker: BrokerOrderAdapter) {}

  async handleRuntimeResult(
    positionId: string,
    actionRequired: string
  ) {
    if (actionRequired !== "SUBMIT_SELL_ORDER") {
      return;
    }

    const position = livePositionRuntime.getPosition(positionId);

    if (!position) {
      throw new Error("POSITION_NOT_FOUND");
    }

    if (position.state !== "SELL_PENDING") {
      throw new Error("INVALID_SELL_STATE");
    }

    const qty = position.quantities.currentPositionQty;

    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("NO_SELLABLE_QUANTITY");
    }

    const result = await this.broker.submitMarketSell(
      position.symbol,
      qty
    );

    if (!result.accepted) {
      throw new Error(result.reason || "BROKER_REJECTED");
    }

    return result;
  }

  onBrokerExecutionNotice(positionId: string, notice: BrokerExecutionNotice) {
    return livePositionRuntime.onBrokerExecutionNotice(positionId, notice);
  }
}
