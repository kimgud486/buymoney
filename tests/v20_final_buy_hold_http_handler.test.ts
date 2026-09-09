import assert from "node:assert/strict";
import test from "node:test";
import { finalBuyHoldHttpHandlerV20 } from "../server/v20/FinalBuyHoldHttpHandlerV20";

function createResponse() {
  const state: { statusCode: number; payload: any } = { statusCode: 200, payload: null };
  const res: any = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.payload = payload;
      return res;
    }
  };
  return { res, state };
}

test("final V20 HTTP handler rejects missing market truth fields", () => {
  const { res, state } = createResponse();
  finalBuyHoldHttpHandlerV20({ body: { candidate: { symbol: "005930" } } } as any, res);
  assert.equal(state.statusCode, 400);
  assert.equal(state.payload?.success, false);
  assert.equal(state.payload?.error, "INVALID_FINAL_BUY_HOLD_REQUEST");
});

test("final V20 HTTP handler never invents missing absolute volume/trade value", () => {
  const { res, state } = createResponse();
  finalBuyHoldHttpHandlerV20({
    body: {
      candidate: {
        symbol: "005930",
        name: "삼성전자",
        market: "KR",
        exchange: "KOSPI",
        price: 100,
        changePct: 1.2,
        volume: 0,
        tradeValue: 0,
        rvol: 2,
        dataStatus: "REALTIME_VERIFIED"
      },
      performanceKey: { setup: "DOUBLE_BOTTOM", symbol: "005930", market: "KR" }
    }
  } as any, res);
  assert.equal(state.statusCode, 400);
  assert.equal(state.payload?.error, "INVALID_FINAL_BUY_HOLD_REQUEST");
});
