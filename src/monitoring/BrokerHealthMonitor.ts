import { BrokerGatewayRouter } from "../execution/BrokerGatewayRouter";

export class BrokerHealthMonitor {
  constructor(private router: BrokerGatewayRouter) {}

  public isHealthy(market: "KR" | "US" | "CRYPTO"): boolean {
    const gateway = this.router.forMarket(market);
    return gateway.isHealthy();
  }
}
