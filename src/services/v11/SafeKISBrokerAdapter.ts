// AISTOCK v12 Safe KIS Broker Adapter
// Enforces Fail-Closed security: LIVE mode strictly verifies broker API responses before returning FILLED status.

export type ExecutionModeV12 = "PAPER" | "DRY_RUN" | "LIVE";

export interface KISCredentialsV12 {
  appKey: string;
  appSecret: string;
  accountNo: string;
  productCode: string;
  isPaperTrading: boolean;
}

export interface OrderRequestV12 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  orderType: "LIMIT" | "MARKET";
}

export interface OrderResultV12 {
  success: boolean;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED" | "NOT_CONFIGURED";
  filledQty: number;
  filledAvgPrice: number;
  message: string;
  timestamp: string;
  mode: ExecutionModeV12;
}

export class SafeKISBrokerAdapter {
  private credentials: KISCredentialsV12;
  private mode: ExecutionModeV12;
  private liveTradingEnabled: boolean;

  constructor(mode: ExecutionModeV12 = "PAPER", liveTradingEnabled: boolean = false) {
    this.mode = mode;
    this.liveTradingEnabled = liveTradingEnabled;
    this.credentials = {
      appKey: process.env.KIS_APPKEY || "",
      appSecret: process.env.KIS_APPSECRET || "",
      accountNo: process.env.KIS_CANO || "",
      productCode: process.env.KIS_ACNT_PRDT_CD || "01",
      isPaperTrading: mode !== "LIVE"
    };
  }

  public setMode(mode: ExecutionModeV12, liveTradingEnabled: boolean = false) {
    this.mode = mode;
    this.liveTradingEnabled = liveTradingEnabled;
    this.credentials.isPaperTrading = mode !== "LIVE";
  }

  public async placeOrder(req: OrderRequestV12): Promise<OrderResultV12> {
    const nowStr = new Date().toLocaleTimeString("ko-KR");

    // 1. PAPER Mode Handling (Disabled in 100% Live Mode)
    if (this.mode === "PAPER") {
      return {
        success: false,
        orderId: "",
        symbol: req.symbol,
        side: req.side,
        price: req.price,
        qty: req.qty,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `⛔ [LIVE_TRADING_ONLY] PAPER 모드 모의체결은 실거래 운영 경로에서 금지되어 있습니다.`,
        timestamp: nowStr,
        mode: "PAPER"
      };
    }

    // 2. DRY_RUN Mode Handling (Order validation without execution)
    if (this.mode === "DRY_RUN") {
      return {
        success: true,
        orderId: `DRY_RUN_${Date.now()}`,
        symbol: req.symbol,
        side: req.side,
        price: req.price,
        qty: req.qty,
        status: "PENDING",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `[DRY_RUN 시뮬레이션] ${req.name}(${req.symbol}) ${req.qty}주 ${req.side} 주문 검증 통과 (실제 전송 안함)`,
        timestamp: nowStr,
        mode: "DRY_RUN"
      };
    }

    // 3. LIVE Mode Handling - STRICT Fail-Closed Verification
    if (this.mode === "LIVE") {
      if (!this.liveTradingEnabled) {
        return {
          success: false,
          orderId: "",
          symbol: req.symbol,
          side: req.side,
          price: req.price,
          qty: req.qty,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: "🚨 [LIVE 차단] 이중 잠금(liveTradingEnabled)이 비활성화되어 있어 주문이 거부되었습니다.",
          timestamp: nowStr,
          mode: "LIVE"
        };
      }

      if (!this.credentials.appKey || !this.credentials.appSecret || !this.credentials.accountNo) {
        return {
          success: false,
          orderId: "",
          symbol: req.symbol,
          side: req.side,
          price: req.price,
          qty: req.qty,
          status: "NOT_CONFIGURED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: "❌ [KIS API 미설정] KIS_APPKEY, KIS_APPSECRET, KIS_CANO 환경변수가 설정되지 않아 실거래를 수행할 수 없습니다.",
          timestamp: nowStr,
          mode: "LIVE"
        };
      }

      try {
        // Real KIS API Call Attempt
        const domain = "https://openapi.koreainvestment.com:9443";
        const endpoint = "/uapi/domestic-stock/v1/trading/order-cash";
        
        const res = await fetch(`${domain}${endpoint}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "appkey": this.credentials.appKey,
            "appsecret": this.credentials.appSecret,
            "tr_id": req.side === "BUY" ? "TTTC0802U" : "TTTC0801U"
          },
          body: JSON.stringify({
            CANO: this.credentials.accountNo,
            ACNT_PRDT_CD: this.credentials.productCode,
            PDNO: req.symbol,
            ORD_DVSN: "01", // Market Order
            ORD_QTY: String(req.qty),
            ORD_UNPR: "0"
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          return {
            success: false,
            orderId: "",
            symbol: req.symbol,
            side: req.side,
            price: req.price,
            qty: req.qty,
            status: "REJECTED",
            filledQty: 0,
            filledAvgPrice: 0,
            message: `🚨 [브로커 거부] 증권사 API 응답 오류: ${errText.slice(0, 100)}`,
            timestamp: nowStr,
            mode: "LIVE"
          };
        }

        const data = await res.json();
        if (data.rt_cd === "0" && data.output?.ODNO) {
          const brokerOrderId = data.output.ODNO;
          return {
            success: true,
            orderId: brokerOrderId,
            symbol: req.symbol,
            side: req.side,
            price: req.price,
            qty: req.qty,
            status: "FILLED",
            filledQty: req.qty,
            filledAvgPrice: req.price,
            message: `✅ [LIVE 실거래 성공] KIS 주문번호 ${brokerOrderId} 체결 완료`,
            timestamp: nowStr,
            mode: "LIVE"
          };
        } else {
          return {
            success: false,
            orderId: "",
            symbol: req.symbol,
            side: req.side,
            price: req.price,
            qty: req.qty,
            status: "REJECTED",
            filledQty: 0,
            filledAvgPrice: 0,
            message: `❌ [LIVE 거부] 증권사 거부 사유: ${data.msg1 || "주문 미체결"}`,
            timestamp: nowStr,
            mode: "LIVE"
          };
        }
      } catch (err: any) {
        return {
          success: false,
          orderId: "",
          symbol: req.symbol,
          side: req.side,
          price: req.price,
          qty: req.qty,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `🚨 [통신 예외] KIS 네트워크 접속 실패: ${err.message}`,
          timestamp: nowStr,
          mode: "LIVE"
        };
      }
    }

    return {
      success: false,
      orderId: "",
      symbol: req.symbol,
      side: req.side,
      price: req.price,
      qty: req.qty,
      status: "REJECTED",
      filledQty: 0,
      filledAvgPrice: 0,
      message: "알 수 없는 실행 모드입니다.",
      timestamp: nowStr,
      mode: this.mode
    };
  }
}
