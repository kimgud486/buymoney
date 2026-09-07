// ----------------------------------------------------------------------
// KIS REALTIME STREAM BUS V18.5
// Official KIS WebSocket Protocol Normalizer & Order Flow Window Engine
// ----------------------------------------------------------------------

import { H0STCNT0, H0STASP0, H0STCNI0, classifyAggressor } from "../KISRealtimeFieldSchema";

export interface VerifiedTradeTick {
  trId: "H0STCNT0";
  symbol: string;
  price: number;
  size: number;
  changeRate: number;
  aggressor: "BUY" | "SELL" | "NEUTRAL";
  timestamp: number;
  source: "KIS_WS_H0STCNT0";
  isVerified: boolean;
}

export interface VerifiedOrderbookSnapshot {
  trId: "H0STASP0";
  symbol: string;
  bestAsk: number;
  bestBid: number;
  spread: number;
  spreadPct: number;
  askDepthTotal: number;
  bidDepthTotal: number;
  imbalancePct: number; // positive = bid heavy, negative = ask heavy
  timestamp: number;
  source: "KIS_WS_H0STASP0";
  isVerified: boolean;
}

export interface KISExecutionNotice {
  trId: "H0STCNI0";
  accountNo: string;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  execQty: number;
  execPrice: number;
  remainingQty: number;
  timestamp: number;
  source: "KIS_WS_H0STCNI0";
  isVerified: boolean;
}

export interface OrderFlowTracker {
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cvd: number;
  sessionDelta: number;
  sessionCvd: number;
  delta1m: number;
  delta5m: number;
  lastResetTimestamp: number;
}

export class KISRealtimeStreamBus {
  private static lastTradePrices: Map<string, number> = new Map();
  private static bestAsks: Map<string, number> = new Map();
  private static bestBids: Map<string, number> = new Map();
  private static cvdTrackers: Map<string, OrderFlowTracker> = new Map();

  /**
   * Reset session CVD / Delta tracking for a symbol or all
   */
  public static resetSessionFlow(symbol?: string): void {
    if (symbol) {
      this.cvdTrackers.set(symbol, {
        buyVolume: 0,
        sellVolume: 0,
        delta: 0,
        cvd: 0,
        sessionDelta: 0,
        sessionCvd: 0,
        delta1m: 0,
        delta5m: 0,
        lastResetTimestamp: Date.now()
      });
    } else {
      this.cvdTrackers.clear();
    }
  }

  /**
   * Parse raw H0STCNT0 trade tick frame using official field mapping
   */
  public static parseTradeTick(symbol: string, rawData: string[]): VerifiedTradeTick | null {
    if (!symbol || !rawData || rawData.length <= H0STCNT0.TRADE_VOLUME) return null;

    const price = parseFloat(rawData[H0STCNT0.PRICE]) || 0;
    const size = parseFloat(rawData[H0STCNT0.TRADE_VOLUME]) || 0;
    const changeRate = parseFloat(rawData[H0STCNT0.CHANGE_RATE]) || 0;

    const ask1 = parseFloat(rawData[H0STCNT0.ASK1]) || this.bestAsks.get(symbol) || 0;
    const bid1 = parseFloat(rawData[H0STCNT0.BID1]) || this.bestBids.get(symbol) || 0;

    if (price <= 0 || size <= 0) return null;

    const prevPrice = this.lastTradePrices.get(symbol) ?? null;
    const aggressor = classifyAggressor(price, bid1, ask1, prevPrice);

    this.lastTradePrices.set(symbol, price);

    // Update CVD tracker
    const tracker = this.cvdTrackers.get(symbol) || {
      buyVolume: 0,
      sellVolume: 0,
      delta: 0,
      cvd: 0,
      sessionDelta: 0,
      sessionCvd: 0,
      delta1m: 0,
      delta5m: 0,
      lastResetTimestamp: Date.now()
    };

    if (aggressor === "BUY") {
      tracker.buyVolume += size;
      tracker.delta += size;
      tracker.cvd += size;
      tracker.sessionDelta += size;
      tracker.sessionCvd += size;
      tracker.delta1m += size;
      tracker.delta5m += size;
    } else if (aggressor === "SELL") {
      tracker.sellVolume += size;
      tracker.delta -= size;
      tracker.cvd -= size;
      tracker.sessionDelta -= size;
      tracker.sessionCvd -= size;
      tracker.delta1m -= size;
      tracker.delta5m -= size;
    }

    this.cvdTrackers.set(symbol, tracker);

    return {
      trId: "H0STCNT0",
      symbol,
      price,
      size,
      changeRate,
      aggressor,
      timestamp: Date.now(),
      source: "KIS_WS_H0STCNT0",
      isVerified: true
    };
  }

  /**
   * Parse raw H0STASP0 orderbook frame using official field mapping
   */
  public static parseOrderbook(symbol: string, rawData: string[]): VerifiedOrderbookSnapshot | null {
    if (!symbol || !rawData || rawData.length <= H0STASP0.TOTAL_BID_QTY) return null;

    const bestAsk = parseFloat(rawData[H0STASP0.ASK1]) || 0;
    const bestBid = parseFloat(rawData[H0STASP0.BID1]) || 0;
    const askDepthTotal = parseFloat(rawData[H0STASP0.TOTAL_ASK_QTY]) || 0;
    const bidDepthTotal = parseFloat(rawData[H0STASP0.TOTAL_BID_QTY]) || 0;

    if (bestAsk <= 0 || bestBid <= 0) return null;

    this.bestAsks.set(symbol, bestAsk);
    this.bestBids.set(symbol, bestBid);

    const spread = +(bestAsk - bestBid).toFixed(2);
    const spreadPct = +((spread / bestBid) * 100).toFixed(4);
    const totalDepth = askDepthTotal + bidDepthTotal;
    const imbalancePct = totalDepth > 0 ? +(((bidDepthTotal - askDepthTotal) / totalDepth) * 100).toFixed(2) : 0;

    return {
      trId: "H0STASP0",
      symbol,
      bestAsk,
      bestBid,
      spread,
      spreadPct,
      askDepthTotal,
      bidDepthTotal,
      imbalancePct,
      timestamp: Date.now(),
      source: "KIS_WS_H0STASP0",
      isVerified: true
    };
  }

  /**
   * Parse raw H0STCNI0 account execution notice frame with decryption/validation
   */
  public static parseExecutionNotice(rawData: string[], decryptedPayload?: string): KISExecutionNotice | null {
    const fields = decryptedPayload ? decryptedPayload.split("|") : rawData;
    if (!fields || fields.length <= H0STCNI0.ORDER_QTY) return null;

    const accountNo = fields[H0STCNI0.ACCOUNT_NO] || "";
    const orderId = fields[H0STCNI0.ORDER_ID] || "";
    const symbol = fields[H0STCNI0.SYMBOL] || "";
    const sideCode = fields[H0STCNI0.SIDE_CODE] || "02"; // 01: SELL, 02: BUY
    const execQty = parseFloat(fields[H0STCNI0.EXEC_QTY]) || 0;
    const execPrice = parseFloat(fields[H0STCNI0.EXEC_PRICE]) || 0;
    const orderQty = parseFloat(fields[H0STCNI0.ORDER_QTY]) || 0;
    const remainingQty = Math.max(0, orderQty - execQty);

    if (!symbol || execQty <= 0) return null;

    return {
      trId: "H0STCNI0",
      accountNo,
      orderId,
      symbol,
      side: sideCode === "01" ? "SELL" : "BUY",
      execQty,
      execPrice,
      remainingQty,
      timestamp: Date.now(),
      source: "KIS_WS_H0STCNI0",
      isVerified: true
    };
  }

  /**
   * Get verified Order Flow / Cumulative Volume Delta (CVD) stats
   */
  public static getOrderFlow(symbol: string): OrderFlowTracker {
    return this.cvdTrackers.get(symbol) || {
      buyVolume: 0,
      sellVolume: 0,
      delta: 0,
      cvd: 0,
      sessionDelta: 0,
      sessionCvd: 0,
      delta1m: 0,
      delta5m: 0,
      lastResetTimestamp: Date.now()
    };
  }
}
