import {
  KISBrokerGatewayV123,
  KISOrderGatewayResponse,
} from "../broker/KISBrokerGatewayV123";
import {
  AutonomousBrokerDispatcherV26,
  AutonomousBrokerDispatchRequestV26,
  AutonomousBrokerDispatchResultV26,
} from "./AutonomousTradeExecutionCoordinatorV26";

/**
 * Production adapter between the autonomous coordinator and the real KIS gateway.
 *
 * V26 intentionally enables KOREA + MARKET only. The existing KIS domestic
 * gateway submits ORD_DVSN=01 / ORD_UNPR=0, so pretending that LIMIT semantics
 * are supported here would be unsafe. US stays behind its dedicated USD risk
 * readiness gate until that adapter is completed and verified.
 */
export class KisAutonomousBrokerDispatcherV26 implements AutonomousBrokerDispatcherV26 {
  constructor(private readonly gateway: KISBrokerGatewayV123) {}

  async submit(request: AutonomousBrokerDispatchRequestV26): Promise<AutonomousBrokerDispatchResultV26> {
    if (request.market !== "KOREA") {
      return {
        accepted: false,
        status: "BLOCKED",
        message: `KIS_AUTONOMOUS_V26_MARKET_NOT_ENABLED: ${request.market}`,
      };
    }

    if (request.orderType !== "MARKET") {
      return {
        accepted: false,
        status: "BLOCKED",
        message: "KIS_AUTONOMOUS_V26_LIMIT_NOT_ENABLED: existing domestic gateway uses market-order semantics.",
      };
    }

    const response: KISOrderGatewayResponse = await this.gateway.executeOrder({
      symbol: request.symbol,
      name: request.name,
      market: "KOREA",
      side: request.side,
      price: request.price,
      qty: request.quantity,
      orderType: "MARKET",
      isPaperTrading: false,
    });

    return {
      accepted: response.success && Boolean(response.orderNo),
      orderNo: response.orderNo || undefined,
      status: response.status,
      message: response.message,
    };
  }
}
