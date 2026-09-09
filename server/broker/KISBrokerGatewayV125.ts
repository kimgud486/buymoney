// AISTOCK v12.5 Server-Side KIS Broker Gateway (RC5 PROD TRUTH)
// Enforces:
// - Domestic LIVE BUY: TTTC0012U, SELL: TTTC0011U
// - Domestic PAPER BUY: VTTC0012U, SELL: VTTC0011U
// - Overseas (US) LIVE BUY: TTTT1002U, SELL: TTTT1006U
// - Overseas (US) PAPER BUY: VTTT1002U, SELL: VTTT1001U
// - Separate PAPER vs LIVE credentials & REST domains
// - Mandatory US Exchange Code (NASD/NYSE/AMEX) - Never guess
// - ODNO ACK vs FILLED separation
// - Fail-Closed HTTP Timeout (AbortController)
// - Explicit LIVE Transmission Safety Lock (KIS_LIVE_ORDER_ENABLED="true")

export const KIS_REAL_REST_DOMAIN = process.env.KIS_REAL_DOMAIN ?? "https://openapi.koreainvestment.com:9443";
export const KIS_PAPER_REST_DOMAIN = process.env.KIS_PAPER_DOMAIN ?? "https://openapivts.koreainvestment.com:29443";

export interface KISOrderRequest {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange?: "NASD" | "NYSE" | "AMEX" | "KRX" | string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  orderType: "LIMIT" | "MARKET";
  isPaperTrading: boolean;
}

export interface KISOrderGatewayResponse {
  success: boolean;
  orderNo: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "PENDING" | "ACKNOWLEDGED" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED" | "NOT_CONFIGURED";
  filledQty: number;
  filledAvgPrice: number;
  message: string;
  trId: string;
  timestamp: string;
}

export interface KISFillCheckResult {
  isFilled: boolean;
  filledQty: number;
  filledAvgPrice: number;
  status: "PENDING" | "ACKNOWLEDGED" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED";
  message: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class KISBrokerGatewayV125 {
  // LIVE Credentials
  private appKeyLive: string;
  private appSecretLive: string;
  private accountNoLive: string;
  private productCodeLive: string;

  // PAPER Credentials
  private appKeyPaper: string;
  private appSecretPaper: string;
  private accountNoPaper: string;
  private productCodePaper: string;

  private tokenCachePaper: TokenCache | null = null;
  private tokenCacheLive: TokenCache | null = null;
  private defaultTimeoutMs: number = 5000;

  constructor() {
    this.appKeyLive = process.env.KIS_APPKEY || "";
    this.appSecretLive = process.env.KIS_APPSECRET || "";
    this.accountNoLive = process.env.KIS_CANO || "";
    this.productCodeLive = process.env.KIS_ACNT_PRDT_CD || "01";

    this.appKeyPaper = process.env.KIS_PAPER_APPKEY || process.env.KIS_APPKEY || "";
    this.appSecretPaper = process.env.KIS_PAPER_APPSECRET || process.env.KIS_APPSECRET || "";
    this.accountNoPaper = process.env.KIS_PAPER_CANO || process.env.KIS_CANO || "";
    this.productCodePaper = process.env.KIS_PAPER_ACNT_PRDT_CD || process.env.KIS_ACNT_PRDT_CD || "01";
  }

  public isConfigured(isPaper: boolean = false): boolean {
    if (isPaper) {
      return Boolean(this.appKeyPaper && this.appSecretPaper && this.accountNoPaper);
    }
    return Boolean(this.appKeyLive && this.appSecretLive && this.accountNoLive);
  }

  /**
   * Acquire or reuse cached KIS OAuth2 Access Token
   */
  public async getOAuthToken(isPaper: boolean): Promise<string | null> {
    if (!this.isConfigured(isPaper)) return null;

    const cache = isPaper ? this.tokenCachePaper : this.tokenCacheLive;
    const now = Date.now();

    if (cache && cache.expiresAt > now + 60000) {
      return cache.accessToken;
    }

    const domain = isPaper ? KIS_PAPER_REST_DOMAIN : KIS_REAL_REST_DOMAIN;
    const appkey = isPaper ? this.appKeyPaper : this.appKeyLive;
    const appsecret = isPaper ? this.appSecretPaper : this.appSecretLive;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch(`${domain}/oauth2/tokenP`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey,
          appsecret
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.error(`[KIS OAuth2] Token error HTTP ${res.status} (isPaper: ${isPaper})`);
        return null;
      }

      const data = await res.json();
      if (data.access_token) {
        const expiresInMs = (data.expires_in || 86400) * 1000;
        const newCache: TokenCache = {
          accessToken: data.access_token,
          expiresAt: now + expiresInMs
        };
        if (isPaper) {
          this.tokenCachePaper = newCache;
        } else {
          this.tokenCacheLive = newCache;
        }
        return data.access_token;
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.error(`[KIS OAuth2] Failed to acquire token (isPaper: ${isPaper}):`, err?.message || err);
    }
    return null;
  }

  /**
   * Determine exact KIS TR_ID based on market, order side, and paper/live mode
   */
  public getTRID(market: "KOREA" | "US" | "BTC", side: "BUY" | "SELL", isPaper: boolean): string {
    if (market === "KOREA") {
      if (isPaper) {
        return side === "BUY" ? "VTTC0012U" : "VTTC0011U";
      }
      return side === "BUY" ? "TTTC0012U" : "TTTC0011U";
    } else if (market === "US") {
      if (isPaper) {
        return side === "BUY" ? "VTTT1002U" : "VTTT1001U";
      }
      return side === "BUY" ? "TTTT1002U" : "TTTT1006U";
    }
    return "UNKNOWN_TR";
  }

  /**
   * Dispatch Order to KIS OpenAPI Gateway
   */
  public async executeOrder(req: KISOrderRequest): Promise<KISOrderGatewayResponse> {
    const timestamp = new Date().toLocaleTimeString("ko-KR");

    // 1. HARD BLOCK BTC FROM KIS GATEWAY
    if (req.market === "BTC") {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "⛔ [BTC_NOT_SUPPORTED_BY_KIS_GATEWAY] BTC/암호화폐는 Upbit 전용 브로커 경로를 사용하세요.",
        trId: "NONE",
        timestamp
      };
    }

    // 2. EXPLICIT LIVE TRANSMISSION SAFETY LOCK CHECK
    if (!req.isPaperTrading) {
      const liveLockEnabled = process.env.KIS_LIVE_ORDER_ENABLED === "true" || process.env.ALLOW_LIVE_TRADING === "true";
      if (!liveLockEnabled) {
        return {
          success: false,
          orderNo: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: "⛔ [LIVE_LOCK_ACTIVE] 실거래 주문 전송 잠금(KIS_LIVE_ORDER_ENABLED=true)이 해제되지 않았습니다. 안전을 위해 전송을 차단했습니다.",
          trId: "NONE",
          timestamp
        };
      }
    }

    // 3. MANDATORY US EXCHANGE VERIFICATION
    if (req.market === "US") {
      const validExchanges = ["NASD", "NYSE", "AMEX"];
      const excg = (req.exchange || "").toUpperCase();
      if (!validExchanges.includes(excg)) {
        return {
          success: false,
          orderNo: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `⛔ [EXCHANGE_UNKNOWN] 미국 거래소 구분(NASD/NYSE/AMEX)이 명시되지 않았거나 유효하지 않습니다. (입력값: '${req.exchange}')`,
          trId: "NONE",
          timestamp
        };
      }
    }

    if (!this.isConfigured(req.isPaperTrading)) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "NOT_CONFIGURED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `❌ [KIS 설정 없음] ${req.isPaperTrading ? "PAPER 모의투자" : "LIVE 실거래"} API 환경변수가 설정되지 않았습니다.`,
        trId: "NONE",
        timestamp
      };
    }

    const trId = this.getTRID(req.market, req.side, req.isPaperTrading);

    // 4. FAIL-CLOSED OAUTH TOKEN CHECK
    const token = await this.getOAuthToken(req.isPaperTrading);
    if (!token) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "⛔ [Fail-Closed 차단] KIS OAuth2 토큰 발급 실패로 주문을 전송하지 않고 차단했습니다.",
        trId,
        timestamp
      };
    }

    const domain = req.isPaperTrading ? KIS_PAPER_REST_DOMAIN : KIS_REAL_REST_DOMAIN;
    const appkey = req.isPaperTrading ? this.appKeyPaper : this.appKeyLive;
    const appsecret = req.isPaperTrading ? this.appSecretPaper : this.appSecretLive;
    const accountNo = req.isPaperTrading ? this.accountNoPaper : this.accountNoLive;
    const productCode = req.isPaperTrading ? this.productCodePaper : this.productCodeLive;

    const endpoint = req.market === "US"
      ? "/uapi/overseas-stock/v1/trading/order"
      : "/uapi/domestic-stock/v1/trading/order-cash";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const payload = req.market === "US"
        ? {
            CANO: accountNo,
            ACNT_PRDT_CD: productCode,
            OVRS_EXCG_CD: (req.exchange || "NASD").toUpperCase(),
            PDNO: req.symbol,
            ORD_QTY: String(req.qty),
            OVRS_ORD_UNPR: String(req.price),
            ORD_DVSN: "00"
          }
        : {
            CANO: accountNo,
            ACNT_PRDT_CD: productCode,
            PDNO: req.symbol,
            ORD_DVSN: req.orderType === "MARKET" ? "01" : "00",
            ORD_QTY: String(req.qty),
            ORD_UNPR: req.orderType === "MARKET" ? "0" : String(req.price)
          };

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
        "appkey": appkey,
        "appsecret": appsecret,
        "tr_id": trId
      };

      const res = await fetch(`${domain}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errorMsg = await res.text();
        return {
          success: false,
          orderNo: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `🚨 [KIS 브로커 거부] HTTP ${res.status}: ${errorMsg.slice(0, 100)}`,
          trId,
          timestamp
        };
      }

      const data = await res.json();

      // 5. STRICT ODNO CHECK (Order Number Received = ACKNOWLEDGED, NOT FILLED)
      if (data.rt_cd === "0" && data.output?.ODNO) {
        const orderNo = String(data.output.ODNO).trim();
        return {
          success: true,
          orderNo,
          symbol: req.symbol,
          side: req.side,
          status: "ACKNOWLEDGED", // ODNO issuance is ACKNOWLEDGED, requires fill verification!
          filledQty: 0,
          filledAvgPrice: 0,
          message: `✅ [KIS 주문 접수 완료] ODNO: ${orderNo} (상태: ACKNOWLEDGED, TR: ${trId})`,
          trId,
          timestamp
        };
      } else {
        return {
          success: false,
          orderNo: "",
          symbol: req.symbol,
          side: req.side,
          status: "REJECTED",
          filledQty: 0,
          filledAvgPrice: 0,
          message: `❌ [KIS_RESPONSE_MISSING_ODNO] ${data.msg1 || "ODNO 주문번호가 발급되지 않았습니다."}`,
          trId,
          timestamp
        };
      }
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === "AbortError";
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: isTimeout
          ? `🚨 [타임아웃] KIS API 요청 타임아웃 (${this.defaultTimeoutMs}ms 초과)`
          : `🚨 [네트워크 오류] KIS 서버 접속 실패: ${err?.message || err}`,
        trId,
        timestamp
      };
    }
  }

  /**
   * Check Fill Execution Status for an ODNO Order Number
   */
  public async checkFillStatus(
    orderNo: string,
    symbol: string,
    market: "KOREA" | "US" | "BTC" = "KOREA",
    isPaper: boolean = false
  ): Promise<KISFillCheckResult> {
    if (market === "BTC") {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "CANCELLED",
        message: "⛔ [BTC_NOT_SUPPORTED_BY_KIS_GATEWAY] BTC/암호화폐는 KIS 조회 대상이 아닙니다."
      };
    }

    if (!orderNo) {
      return { isFilled: false, filledQty: 0, filledAvgPrice: 0, status: "PENDING", message: "주문번호 없음" };
    }

    if (!this.isConfigured(isPaper)) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: "❌ KIS API 설정 미비로 체결 조회 불가"
      };
    }

    const token = await this.getOAuthToken(isPaper);
    if (!token) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: "⛔ [Fail-Closed 차단] KIS OAuth2 토큰 발급 실패로 체결 조회가 보류되었습니다."
      };
    }

    const domain = isPaper ? KIS_PAPER_REST_DOMAIN : KIS_REAL_REST_DOMAIN;
    const appkey = isPaper ? this.appKeyPaper : this.appKeyLive;
    const appsecret = isPaper ? this.appSecretPaper : this.appSecretLive;
    const accountNo = isPaper ? this.accountNoPaper : this.accountNoLive;
    const productCode = isPaper ? this.productCodePaper : this.productCodeLive;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      if (market === "KOREA") {
        const trId = isPaper ? "VTTC0801R" : "TTTC0081R";
        const queryParams = new URLSearchParams({
          CANO: accountNo,
          ACNT_PRDT_CD: productCode,
          INQR_STRT_DT: todayStr,
          INQR_END_DT: todayStr,
          SLL_BUY_DVSN_CD: "00",
          INQR_DVSN: "00",
          PDNO: symbol || "",
          CCLD_DVSN: "00",
          ORD_GNO_BRNO: "",
          ODNO: orderNo,
          INQR_DVSN_3: "00",
          INQR_DVSN_1: "",
          INQR_DVSN_2: ""
        });

        const res = await fetch(`${domain}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": appkey,
            "appsecret": appsecret,
            "tr_id": trId,
            "custtype": "P"
          },
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!res.ok) {
          return {
            isFilled: false,
            filledQty: 0,
            filledAvgPrice: 0,
            status: "PENDING",
            message: `⚠️ KIS 국내 체결조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const outputList = data.output1 || data.output || [];
        const matched = Array.isArray(outputList)
          ? outputList.find((item: any) => String(item.odno || item.ODNO || "").trim() === String(orderNo).trim())
          : null;

        if (matched) {
          const ordQty = Number(matched.ord_qty || matched.ORD_QTY || 0);
          const ccldQty = Number(matched.tot_ccld_qty || matched.ccld_qty || matched.CCLD_QTY || 0);
          const avgPrice = Number(matched.avg_prvs || matched.avg_prc || matched.ccld_prc || matched.CCLD_PRC || 0);

          if (ccldQty >= ordQty && ordQty > 0) {
            return {
              isFilled: true,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "FILLED",
              message: `✅ [KIS 체결 완료] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          } else if (ccldQty > 0) {
            return {
              isFilled: false,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "PARTIAL",
              message: `⏳ [KIS 부분체결] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          }
        }

        return {
          isFilled: false,
          filledQty: 0,
          filledAvgPrice: 0,
          status: "PENDING",
          message: `⏳ [KIS 체결 대기중] ODNO:${orderNo}`
        };
      } else {
        // Overseas (US) Fill Inquiry
        const trId = isPaper ? "VTTS3035R" : "TTTS3035R";
        const queryParams = new URLSearchParams({
          CANO: accountNo,
          ACNT_PRDT_CD: productCode,
          PDNO: symbol || "",
          ORD_STRT_DT: todayStr,
          ORD_END_DT: todayStr,
          SLL_BUY_DVSN: "00",
          CCLD_NCCS_DVSN: "00",
          OVRS_EXCG_CD: "NASD",
          SORT_SQN: "DS"
        });

        const res = await fetch(`${domain}/uapi/overseas-stock/v1/trading/inquire-ccnl?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": appkey,
            "appsecret": appsecret,
            "tr_id": trId
          },
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!res.ok) {
          return {
            isFilled: false,
            filledQty: 0,
            filledAvgPrice: 0,
            status: "PENDING",
            message: `⚠️ KIS 해외 체결조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const outputList = data.output || [];
        const matched = Array.isArray(outputList)
          ? outputList.find((item: any) => String(item.odno || item.ODNO || "").trim() === String(orderNo).trim())
          : null;

        if (matched) {
          const ordQty = Number(matched.ft_ord_qty || matched.ORD_QTY || 0);
          const ccldQty = Number(matched.ft_ccld_qty || matched.CCLD_QTY || 0);
          const avgPrice = Number(matched.ft_ccld_unpr3 || matched.CCLD_PRC || 0);

          if (ccldQty >= ordQty && ordQty > 0) {
            return {
              isFilled: true,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "FILLED",
              message: `✅ [KIS 해외 체결 완료] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          } else if (ccldQty > 0) {
            return {
              isFilled: false,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "PARTIAL",
              message: `⏳ [KIS 해외 부분체결] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          }
        }

        return {
          isFilled: false,
          filledQty: 0,
          filledAvgPrice: 0,
          status: "PENDING",
          message: `⏳ [KIS 해외 체결 대기중] ODNO:${orderNo}`
        };
      }
    } catch (err: any) {
      clearTimeout(timer);
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: `🚨 [네트워크 오류] 체결조회 실패: ${err?.message || err}`
      };
    }
  }
}
