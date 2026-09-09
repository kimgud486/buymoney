import test from "node:test";
import assert from "node:assert/strict";
import { KISBrokerGatewayV121, KISOrderRequest } from "../server/broker/KISBrokerGatewayV121";

class TestGateway extends KISBrokerGatewayV121 {
  constructor(
    private readonly cash: number,
    private readonly holdings: Array<{ symbol: string; name: string; qty: number; avgPrice: number; currentPrice: number; pnlPct: number; evalAmt: number }> = [],
  ) {
    super();
  }

  override async getAccountBalance() {
    return {
      success: true,
      depositKRW: this.cash,
      totalEvalAmt: 10_000_000,
      holdings: this.holdings,
      message: "TEST_ACCOUNT_TRUTH",
    };
  }
}

const baseOrder: KISOrderRequest = {
  symbol: "005930",
  name: "삼성전자",
  market: "KOREA",
  side: "BUY",
  price: 74_200,
  qty: 10,
  orderType: "MARKET",
  isPaperTrading: false,
};

test("KIS wrapper rejects BUY when verified cash is insufficient", async () => {
  const gateway = new TestGateway(100_000);
  const result = await gateway.executeOrder(baseOrder);
  assert.equal(result.success, false);
  assert.match(result.message, /INSUFFICIENT_VERIFIED_CASH/);
});

test("KIS wrapper rejects SELL that exceeds real holding quantity", async () => {
  const gateway = new TestGateway(5_000_000, [{
    symbol: "005930",
    name: "삼성전자",
    qty: 3,
    avgPrice: 70_000,
    currentPrice: 74_200,
    pnlPct: 6,
    evalAmt: 222_600,
  }]);
  const result = await gateway.executeOrder({ ...baseOrder, side: "SELL", qty: 5 });
  assert.equal(result.success, false);
  assert.match(result.message, /OVERSELL_BLOCK/);
});

test("KIS wrapper requires reference price before a live BUY", async () => {
  const gateway = new TestGateway(10_000_000);
  const result = await gateway.executeOrder({ ...baseOrder, price: 0 });
  assert.equal(result.success, false);
  assert.match(result.message, /REFERENCE_PRICE_REQUIRED/);
});
