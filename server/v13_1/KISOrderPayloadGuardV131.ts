// AISTOCK v13.1 KIS Order Payload Guard
// Sanitizes and formats KIS API order payloads. Enforces exchange code mapping & US order safety gates.

import { UsExchangeRouterV131 } from "../../src/services/v13_1/UsExchangeRouterV131";

export interface KisOrderParamsV131 {
  market: "KOREA" | "US";
  exchange?: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  orderType: "LIMIT" | "MARKET";
  isLiveTrading?: boolean;
}

export interface SanitizedKisOrderPayloadV131 {
  tr_id: string;
  exchangeCode: string;
  symbol: string;
  qty: number;
  price: number;
  ord_type: string;
  allowed: boolean;
  rejectReason?: string;
  bodyPayload: Record<string, any>;
}

export class KISOrderPayloadGuardV131 {
  /**
   * Validates and constructs official KIS OpenAPI order request payload
   */
  public static prepareOrderPayload(params: KisOrderParamsV131): SanitizedKisOrderPayloadV131 {
    const { market, exchange, symbol, side, qty, price, orderType, isLiveTrading = false } = params;

    // 1. Quantity & Price sanity checks
    if (qty <= 0 || isNaN(qty)) {
      return {
        tr_id: "", exchangeCode: "", symbol, qty, price, ord_type: "",
        allowed: false, rejectReason: "⛔ [INVALID_QTY] 주문 수량이 0 이하입니다."
      };
    }

    if (orderType === "LIMIT" && (price <= 0 || isNaN(price))) {
      return {
        tr_id: "", exchangeCode: "", symbol, qty, price, ord_type: "",
        allowed: false, rejectReason: "⛔ [INVALID_PRICE] 지정가 주문 시 가격은 0보다 커야 합니다."
      };
    }

    // 2. US LIVE Market Order Safety Constraint: Restrict US MARKET orders to LIMIT only in LIVE trading!
    if (market === "US" && isLiveTrading && orderType === "MARKET") {
      return {
        tr_id: "", exchangeCode: "", symbol, qty, price, ord_type: "",
        allowed: false, rejectReason: "⛔ [US_LIVE_MARKET_ORDER_BLOCKED] 미국주식 실계좌 시장가 주문은 공식 검증 전까지 LIMIT(지정가)만 허용됩니다."
      };
    }

    // 3. Resolve Exchange
    const route = UsExchangeRouterV131.routeExchange(market, exchange, symbol);
    if (!route.isValid || !route.allowKisRouting) {
      return {
        tr_id: "", exchangeCode: "", symbol, qty, price, ord_type: "",
        allowed: false, rejectReason: route.rejectionReason || "⛔ [EXCHANGE_ROUTING_FAILED] 거래소 경로를 확인할 수 없습니다."
      };
    }

    const exchangeCode = route.resolvedExchange;

    // 4. Select TR_ID
    let tr_id = "";
    if (market === "KOREA") {
      if (isLiveTrading) {
        tr_id = side === "BUY" ? "TTTC0802U" : "TTTC0801U";
      } else {
        tr_id = side === "BUY" ? "VTTC0802U" : "VTTC0801U";
      }
    } else { // US
      if (isLiveTrading) {
        tr_id = side === "BUY" ? "TTTT1002U" : "TTTT1006U";
      } else {
        tr_id = side === "BUY" ? "VTTT1002U" : "VTTT1006U";
      }
    }

    // 5. Construct Body Payload
    let bodyPayload: Record<string, any> = {};
    const ord_type = orderType === "MARKET" ? "01" : "00";

    if (market === "KOREA") {
      bodyPayload = {
        CANO: "", // Injected by broker client
        ACNT_PRDT_CD: "01",
        PDNO: symbol,
        ORD_DVSN: ord_type,
        ORD_QTY: String(qty),
        ORD_UNPR: orderType === "MARKET" ? "0" : String(price)
      };
    } else { // US
      bodyPayload = {
        CANO: "",
        ACNT_PRDT_CD: "01",
        OVRS_EXCG_CD: exchangeCode, // NASD, NYSE, AMEX
        PDNO: symbol,
        ORD_QTY: String(qty),
        OVRS_ORD_UNPR: String(price),
        ORD_DVSN: "00" // Overseas Limit Order
      };
    }

    return {
      tr_id,
      exchangeCode,
      symbol,
      qty,
      price,
      ord_type,
      allowed: true,
      bodyPayload
    };
  }
}
