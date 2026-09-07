import { test } from "node:test";
import assert from "node:assert/strict";
import { H0STCNT0, H0STASP0, H0STCNI0, classifyAggressor } from "../src/services/KISRealtimeFieldSchema";
import { KISRealtimeStreamBus } from "../src/services/kis/KISRealtimeStreamBus";

test("KISRealtimeFieldSchema - Aggressor Classification Logic", () => {
  // Trade price at or above Best Ask -> BUY
  assert.equal(classifyAggressor(70500, 70400, 70500, 70400), "BUY");

  // Trade price at or below Best Bid -> SELL
  assert.equal(classifyAggressor(70400, 70400, 70500, 70500), "SELL");

  // Trade price inside spread, higher than previous trade price -> BUY
  assert.equal(classifyAggressor(70450, 70400, 70500, 70400), "BUY");

  // Trade price inside spread, lower than previous trade price -> SELL
  assert.equal(classifyAggressor(70450, 70400, 70500, 70500), "SELL");

  // Neutral if no prior prices and inside spread
  assert.equal(classifyAggressor(70450, 70400, 70500, null), "NEUTRAL");
});

test("KISRealtimeStreamBus - Official H0STCNT0 Trade Tick Parsing & CVD Accumulation", () => {
  // Construct official H0STCNT0 raw data frame
  // 0: Symbol, 1: Time, 2: Price, 3: Sign, 4: Change, 5: Rate, 10: Ask1, 11: Bid1, 12: Volume
  const rawTickData = new Array(20).fill("0");
  rawTickData[H0STCNT0.SYMBOL] = "005930";
  rawTickData[H0STCNT0.TIME] = "093000";
  rawTickData[H0STCNT0.PRICE] = "70500";      // Price = 70500
  rawTickData[H0STCNT0.PRDY_SIGN] = "2";      // Up (not used for aggressor!)
  rawTickData[H0STCNT0.CHANGE_RATE] = "1.5";
  rawTickData[H0STCNT0.ASK1] = "70500";       // Best Ask
  rawTickData[H0STCNT0.BID1] = "70400";       // Best Bid
  rawTickData[H0STCNT0.TRADE_VOLUME] = "100"; // Trade size = 100 shares

  const tick = KISRealtimeStreamBus.parseTradeTick("005930", rawTickData);

  assert.ok(tick != null);
  assert.equal(tick.symbol, "005930");
  assert.equal(tick.price, 70500);
  assert.equal(tick.size, 100);
  assert.equal(tick.aggressor, "BUY"); // Trade price 70500 >= Best Ask 70500

  const flow = KISRealtimeStreamBus.getOrderFlow("005930");
  assert.ok(flow.buyVolume >= 100);
  assert.ok(flow.delta >= 100);
  assert.ok(flow.cvd >= 100);
});

test("KISRealtimeStreamBus - Official H0STASP0 Orderbook Depth Parsing", () => {
  const rawObData = new Array(50).fill("0");
  rawObData[H0STASP0.SYMBOL] = "005930";
  rawObData[H0STASP0.ASK1] = "70500";            // Best Ask
  rawObData[H0STASP0.BID1] = "70400";            // Best Bid
  rawObData[H0STASP0.TOTAL_ASK_QTY] = "50000";   // Index 43 Total Ask Depth
  rawObData[H0STASP0.TOTAL_BID_QTY] = "100000";  // Index 44 Total Bid Depth

  const ob = KISRealtimeStreamBus.parseOrderbook("005930", rawObData);

  assert.ok(ob != null);
  assert.equal(ob.bestAsk, 70500);
  assert.equal(ob.bestBid, 70400);
  assert.equal(ob.askDepthTotal, 50000);
  assert.equal(ob.bidDepthTotal, 100000);
  assert.equal(ob.spread, 100);
  assert.ok(ob.imbalancePct > 0); // Bid heavy (+33.33%)
});

test("KISRealtimeStreamBus - Official H0STCNI0 Account Execution Notice Parsing", () => {
  const rawNoticeData = new Array(10).fill("");
  rawNoticeData[H0STCNI0.ACCOUNT_NO] = "5012345601";
  rawNoticeData[H0STCNI0.ORDER_ID] = "ORD_0099";
  rawNoticeData[H0STCNI0.SYMBOL] = "005930";
  rawNoticeData[H0STCNI0.SIDE_CODE] = "01"; // SELL
  rawNoticeData[H0STCNI0.EXEC_QTY] = "50";
  rawNoticeData[H0STCNI0.EXEC_PRICE] = "70800";
  rawNoticeData[H0STCNI0.REMAINING_QTY] = "0";

  const notice = KISRealtimeStreamBus.parseExecutionNotice(rawNoticeData);

  assert.ok(notice != null);
  assert.equal(notice.accountNo, "5012345601");
  assert.equal(notice.orderId, "ORD_0099");
  assert.equal(notice.symbol, "005930");
  assert.equal(notice.side, "SELL");
  assert.equal(notice.execQty, 50);
  assert.equal(notice.execPrice, 70800);
  assert.equal(notice.remainingQty, 0);
});
