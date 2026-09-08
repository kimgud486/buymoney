import { BrokerGateway } from "./BrokerGateway";
import { KISBrokerGateway } from "../broker/kis/KISBrokerGateway";
import { UpbitBrokerGateway } from "../broker/upbit/UpbitBrokerGateway";

export class BrokerGatewayRouter {
  private kisGateway: KISBrokerGateway;
  private upbitGateway: UpbitBrokerGateway;

  constructor(kisGateway?: KISBrokerGateway, upbitGateway?: UpbitBrokerGateway) {
    this.kisGateway = kisGateway ?? new KISBrokerGateway();
    this.upbitGateway = upbitGateway ?? new UpbitBrokerGateway();
  }

  public forMarket(market: "KR" | "US" | "CRYPTO"): BrokerGateway {
    if (market === "CRYPTO") {
      return this.upbitGateway;
    }
    return this.kisGateway;
  }

  public getKisGateway(): KISBrokerGateway {
    return this.kisGateway;
  }

  public getUpbitGateway(): UpbitBrokerGateway {
    return this.upbitGateway;
  }
}
