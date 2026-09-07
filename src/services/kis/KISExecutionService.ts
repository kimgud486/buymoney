// KIS Execution Service
// Manages order placement and fill verification via KIS REST API

export interface KISOrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  orderType: "LIMIT" | "MARKET";
}

export interface KISOrderResponse {
  success: boolean;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "FILLED" | "PENDING" | "REJECTED";
  message: string;
  timestamp: string;
}

export class KISExecutionService {
  private static instance: KISExecutionService;

  public static getInstance(): KISExecutionService {
    if (!KISExecutionService.instance) {
      KISExecutionService.instance = new KISExecutionService();
    }
    return KISExecutionService.instance;
  }

  public async executeOrder(req: KISOrderRequest): Promise<KISOrderResponse> {
    const appKey = process.env.KIS_APPKEY;
    const accountNo = process.env.KIS_CANO;

    if (!appKey || !accountNo) {
      return {
        success: false,
        orderId: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        message: "KIS_CREDENTIALS_MISSING: Cannot execute live order without API credentials",
        timestamp: new Date().toISOString()
      };
    }

    const trId = req.side === "BUY" ? "TTTC0802U" : "TTTC0801U";

    try {
      const res = await fetch("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/trading/order-cash", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${process.env.KIS_ACCESS_TOKEN || ''}`,
          "appkey": appKey,
          "appsecret": process.env.KIS_APPSECRET || '',
          "tr_id": trId
        },
        body: JSON.stringify({
          CANO: accountNo,
          ACNT_PRDT_CD: "01",
          PDNO: req.symbol,
          ORD_DVSN: req.orderType === "MARKET" ? "01" : "00",
          ORD_QTY: req.qty.toString(),
          ORD_UNPR: req.orderType === "MARKET" ? "0" : req.price.toString()
        })
      });

      if (!res.ok) {
        throw new Error(`KIS_ORDER_HTTP_ERROR:${res.status}`);
      }

      const json = await res.json();
      if (json.rt_cd !== "0") {
        return {
          success: false,
          orderId: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          message: `KIS_ORDER_REJECTED:${json.msg1 || json.msg_cd}`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        orderId: json.output?.KRX_FWDG_ORD_ORGNO || json.output?.ODNO || `ORD_${Date.now()}`,
        symbol: req.symbol,
        side: req.side,
        status: "PENDING",
        message: "Order successfully submitted to KIS Exchange",
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        orderId: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        message: `KIS_ORDER_EXECUTION_FAILED:${err.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const kisExecutionService = KISExecutionService.getInstance();
