// AISTOCK v12.3.1 HOTFIX Server-Side KIS Broker Gateway (REAL FILL ENGINE)
// Implements Fail-Closed OAuth Token Enforcer, Strict ODNO Verification, BTC KIS Hard Block,
// Correct Overseas Fill Query Parameter (CCLD_NCCS_DVSN), and Domestic Average Price Field (avg_prvs).

export const KIS_REAL_REST_DOMAIN = process.env.KIS_REAL_DOMAIN ?? "https://openapi.koreainvestment.com:9443";
export const KIS_PAPER_REST_DOMAIN = process.env.KIS_PAPER_DOMAIN ?? "https://openapivts.koreainvestment.com:29443";

export interface KISOrderRequest {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
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
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED" | "NOT_CONFIGURED";
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
  status: "PENDING" | "FILLED" | "PARTIAL" | "CANCELLED" | "REJECTED";
  message: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class KISBrokerGatewayV123 {
  private appKey: string;
  private appSecret: string;
  private accountNo: string;
  private productCode: string;
  private tokenCachePaper: TokenCache | null = null;
  private tokenCacheLive: TokenCache | null = null;

  constructor() {
    this.appKey = process.env.KIS_APPKEY || "";
    this.appSecret = process.env.KIS_APPSECRET || "";
    this.accountNo = process.env.KIS_CANO || "";
    this.productCode = process.env.KIS_ACNT_PRDT_CD || "01";
  }

  public isConfigured(): boolean {
    return Boolean(this.appKey && this.appSecret && this.accountNo);
  }

  /**
   * Acquire or reuse cached KIS OAuth2 Access Token (/oauth2/tokenP)
   */
  public async getOAuthToken(isPaper: boolean): Promise<string | null> {
    if (isPaper) {
      console.warn("[KIS OAuth2] PAPER trading path is disabled in live-only mode.");
      return null;
    }
    if (!this.isConfigured()) return null;

    const cache = this.tokenCacheLive;
    const now = Date.now();

    if (cache && cache.expiresAt > now + 60000) {
      return cache.accessToken;
    }

    const domain = KIS_REAL_REST_DOMAIN;

    try {
      const res = await fetch(`${domain}/oauth2/tokenP`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey: this.appKey,
          appsecret: this.appSecret
        })
      });

      if (!res.ok) {
        console.error(`[KIS OAuth2] Token error HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.access_token) {
        const expiresInMs = (data.expires_in || 86400) * 1000;
        const newCache: TokenCache = {
          accessToken: data.access_token,
          expiresAt: now + expiresInMs
        };
        this.tokenCacheLive = newCache;
        return data.access_token;
      }
    } catch (err) {
      console.error("[KIS OAuth2] Failed to acquire token:", err);
    }
    return null;
  }

  /**
   * Determine exact KIS TR_ID based on market, order side, and paper/live mode
   */
  public getTRID(market: "KOREA" | "US" | "BTC", side: "BUY" | "SELL", isPaper: boolean): string {
    if (isPaper) {
      return "REJECTED_PAPER_TR";
    }
    if (market === "KOREA") {
      return side === "BUY" ? "TTTC0802U" : "TTTC0801U";
    } else if (market === "US") {
      // Official KIS US live TR IDs: BUY TTTT1002U, SELL TTTT1006U
      return side === "BUY" ? "TTTT1002U" : "TTTT1006U";
    }
    return "UNKNOWN_TR";
  }

  /**
   * Dispatch Order to KIS OpenAPI Gateway
   */
  public async executeOrder(req: KISOrderRequest): Promise<KISOrderGatewayResponse> {
    const timestamp = new Date().toLocaleTimeString("ko-KR");

    // 0. HARD BLOCK PAPER TRADING PATH
    if (req.isPaperTrading) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "⛔ [LIVE_TRADING_ONLY] PAPER 모의주문 경로(isPaperTrading=true)는 LIVE-ONLY 안전 가드레일에 의해 즉시 차단됩니다.",
        trId: "NONE",
        timestamp
      };
    }

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
        message: "⛔ [BTC_NOT_SUPPORTED_BY_KIS_GATEWAY] BTC/암호화폐는 KIS 주문 경로를 지원하지 않습니다. Upbit 전용 브로커 경로를 사용하세요.",
        trId: "NONE",
        timestamp
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "NOT_CONFIGURED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: "❌ [KIS 설정 없음] KIS_APPKEY / KIS_APPSECRET / KIS_CANO 환경변수가 미설정되었습니다.",
        trId: "NONE",
        timestamp
      };
    }

    const trId = this.getTRID(req.market, req.side, req.isPaperTrading);

    // 2. FAIL-CLOSED OAUTH TOKEN CHECK
    const token = await this.getOAuthToken(req.isPaperTrading);
    if (!token && !req.isPaperTrading) {
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

    const endpoint = req.market === "US"
      ? "/uapi/overseas-stock/v1/trading/order"
      : "/uapi/domestic-stock/v1/trading/order-cash";

    try {
      const payload = req.market === "US"
        ? {
            CANO: this.accountNo,
            ACNT_PRDT_CD: this.productCode,
            OVRS_EXCG_CD: "NASD",
            PDNO: req.symbol,
            ORD_QTY: String(req.qty),
            OVRS_ORD_UNPR: String(req.price),
            ORD_DVSN: "00"
          }
        : {
            CANO: this.accountNo,
            ACNT_PRDT_CD: this.productCode,
            PDNO: req.symbol,
            ORD_DVSN: "01", // Market Order
            ORD_QTY: String(req.qty),
            ORD_UNPR: "0"
          };

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "appkey": this.appKey,
        "appsecret": this.appSecret,
        "tr_id": trId
      };

      if (token) {
        headers["authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${domain}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

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

      // 3. STRICT ODNO CHECK (Removed KRX_FWDG_ORD_ORGNO fallback)
      if (data.rt_cd === "0" && data.output?.ODNO) {
        const orderNo = String(data.output.ODNO).trim();
        return {
          success: true,
          orderNo,
          symbol: req.symbol,
          side: req.side,
          status: "PENDING", // PENDING state requiring real fill verification!
          filledQty: 0,
          filledAvgPrice: 0,
          message: `✅ [KIS 주문 접수 완료] ODNO: ${orderNo} (상태: PENDING)`,
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
      return {
        success: false,
        orderNo: "",
        symbol: req.symbol,
        side: req.side,
        status: "REJECTED",
        filledQty: 0,
        filledAvgPrice: 0,
        message: `🚨 [네트워크 오류] KIS 서버 접속 실패: ${err?.message || err}`,
        trId,
        timestamp
      };
    }
  }

  /**
   * Check Fill Execution Status for an ODNO Order Number (REAL FILL ENGINE v12.3.1 HOTFIX)
   * Queries KIS inquire-daily-ccld (domestic TTTC0081R) or inquire-ccnl (overseas TTTS3035R)
   */
  public async checkFillStatus(
    orderNo: string,
    symbol: string,
    market: "KOREA" | "US" | "BTC" = "KOREA",
    isPaper: boolean = false
  ): Promise<KISFillCheckResult> {
    // 1. HARD BLOCK BTC FROM KIS FILL INQUIRY
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

    // PAPER mode simulated fill is strictly blocked in 100% Live-Only mode
    if (isPaper) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "REJECTED",
        message: "⛔ [LIVE_TRADING_ONLY] PAPER 모의체결은 실거래 운영 경로에서 금지되어 있습니다."
      };
    }

    // LIVE MODE: Real KIS Execution Inquiry
    if (!this.isConfigured()) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: "❌ KIS_APPKEY 미설정으로 체결 조회 불가능"
      };
    }

    // 2. FAIL-CLOSED OAUTH TOKEN CHECK
    const token = await this.getOAuthToken(false);
    if (!token) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: "⛔ [Fail-Closed 차단] KIS OAuth2 토큰 발급 실패로 체결 조회가 보류되었습니다."
      };
    }

    const domain = KIS_REAL_REST_DOMAIN;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    try {
      if (market === "KOREA") {
        // KIS Domestic Stock Daily Execution Inquiry (inquire-daily-ccld, TR: TTTC0081R)
        const trId = "TTTC0081R";
        const queryParams = new URLSearchParams({
          CANO: this.accountNo,
          ACNT_PRDT_CD: this.productCode,
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
            "appkey": this.appKey,
            "appsecret": this.appSecret,
            "tr_id": trId,
            "custtype": "P"
          }
        });

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
        
        // Find matching order in output
        const matched = Array.isArray(outputList)
          ? outputList.find((item: any) => String(item.odno || item.ODNO || "").trim() === String(orderNo).trim())
          : null;

        if (matched) {
          const ordQty = Number(matched.ord_qty || matched.ORD_QTY || 0);
          const ccldQty = Number(matched.tot_ccld_qty || matched.ccld_qty || matched.CCLD_QTY || 0);
          
          // 4. DOMESTIC AVERAGE PRICE FIELD FIX (avg_prvs)
          const avgPrice = Number(matched.avg_prvs || matched.avg_prc || matched.ccld_prc || matched.CCLD_PRC || 0);

          if (ccldQty >= ordQty && ordQty > 0) {
            return {
              isFilled: true,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "FILLED",
              message: `✅ [KIS 실거래 국내 체결 완료] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          } else if (ccldQty > 0) {
            return {
              isFilled: false,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "PARTIAL",
              message: `⏳ [KIS 국내 부분체결] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          }
        }

        return {
          isFilled: false,
          filledQty: 0,
          filledAvgPrice: 0,
          status: "PENDING",
          message: `⏳ [KIS 국내 체결 대기] ODNO:${orderNo} 거래소 미체결`
        };
      } else {
        // KIS Overseas Stock Execution Inquiry (inquire-ccnl, TR: TTTS3035R)
        const trId = "TTTS3035R";
        
        // 5. US FILL QUERY PARAMETER TYPO FIX: CCLD_NCCS_DVSN (was CCLD_NCCL_DVSN)
        const queryParams = new URLSearchParams({
          CANO: this.accountNo,
          ACNT_PRDT_CD: this.productCode,
          PDNO: symbol || "",
          ORD_STRT_DT: todayStr,
          ORD_END_DT: todayStr,
          SLL_BUY_DVSN: "00",
          CCLD_NCCS_DVSN: "00",
          OVRS_EXCG_CD: "NASD",
          SORT_SQN: "DS",
          CTX_AREA_FK200: "",
          CTX_AREA_NK200: ""
        });

        const res = await fetch(`${domain}/uapi/overseas-stock/v1/trading/inquire-ccnl?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": this.appKey,
            "appsecret": this.appSecret,
            "tr_id": trId,
            "custtype": "P"
          }
        });

        if (!res.ok) {
          return {
            isFilled: false,
            filledQty: 0,
            filledAvgPrice: 0,
            status: "PENDING",
            message: `⚠️ KIS 미국 체결조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const outputList = data.output || data.output1 || [];

        const matched = Array.isArray(outputList)
          ? outputList.find((item: any) => String(item.odno || item.ODNO || "").trim() === String(orderNo).trim())
          : null;

        if (matched) {
          const ordQty = Number(matched.ft_ord_qty || matched.ord_qty || 0);
          const ccldQty = Number(matched.ft_ccld_qty || matched.ccld_qty || 0);
          const avgPrice = Number(matched.ft_ccld_unpr3 || matched.ccld_prc || 0);

          if (ccldQty >= ordQty && ordQty > 0) {
            return {
              isFilled: true,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "FILLED",
              message: `✅ [KIS 실거래 미국 체결 완료] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          } else if (ccldQty > 0) {
            return {
              isFilled: false,
              filledQty: ccldQty,
              filledAvgPrice: avgPrice,
              status: "PARTIAL",
              message: `⏳ [KIS 미국 부분체결] ODNO:${orderNo} (${ccldQty}/${ordQty}주)`
            };
          }
        }

        return {
          isFilled: false,
          filledQty: 0,
          filledAvgPrice: 0,
          status: "PENDING",
          message: `⏳ [KIS 미국 체결 대기] ODNO:${orderNo} 거래소 미체결`
        };
      }
    } catch (err: any) {
      return {
        isFilled: false,
        filledQty: 0,
        filledAvgPrice: 0,
        status: "PENDING",
        message: `🚨 [체결 조회 오류] ${err?.message || err}`
      };
    }
  }

  /**
   * KIS Real Account Balance & Holdings Query (Domestic TTTC8434R / Overseas TTTS3012R)
   */
  public async getAccountBalance(market: "KOREA" | "US" = "KOREA", isPaper: boolean = false): Promise<{
    success: boolean;
    depositKRW: number;
    totalEvalAmt: number;
    holdings: Array<{ symbol: string; name: string; qty: number; avgPrice: number; currentPrice: number; pnlPct: number; evalAmt: number }>;
    message: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        depositKRW: 0,
        totalEvalAmt: 0,
        holdings: [],
        message: "❌ KIS_APPKEY / KIS_APPSECRET / KIS_CANO 환경변수가 미설정되었습니다."
      };
    }

    const token = await this.getOAuthToken(isPaper);
    if (!token && !isPaper) {
      return {
        success: false,
        depositKRW: 0,
        totalEvalAmt: 0,
        holdings: [],
        message: "⛔ [Fail-Closed 차단] KIS OAuth2 토큰 발급 실패로 계좌 잔고 조회가 보류되었습니다."
      };
    }

    const domain = isPaper ? KIS_PAPER_REST_DOMAIN : KIS_REAL_REST_DOMAIN;

    if (market === "KOREA") {
      const trId = isPaper ? "VTTC8434R" : "TTTC8434R";
      const queryParams = new URLSearchParams({
        CANO: this.accountNo,
        ACNT_PRDT_CD: this.productCode,
        AFHR_FLG: "N",
        OFL_YN: "N",
        INQR_DVSN: "02",
        UNPR_DVSN: "01",
        FUND_STTL_ICLD_YN: "N",
        FNCG_AMT_AUTO_RDPT_YN: "N",
        PRCS_DVSN: "01",
        CTX_AREA_FK100: "",
        CTX_AREA_NK100: ""
      });

      try {
        const res = await fetch(`${domain}/uapi/domestic-stock/v1/trading/inquire-balance?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": this.appKey,
            "appsecret": this.appSecret,
            "tr_id": trId,
            "custtype": "P"
          }
        });

        if (!res.ok) {
          return {
            success: false,
            depositKRW: 0,
            totalEvalAmt: 0,
            holdings: [],
            message: `⚠️ KIS 국내 계좌 잔고 조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const output1 = data.output1 || [];
        const output2 = (data.output2 || [])[0] || {};

        const depositKRW = Number(output2.dnca_tot_amt || output2.prvs_rcdl_exn_amt || 0);
        const totalEvalAmt = Number(output2.tot_evlu_amt || 0);

        const holdings = output1.map((item: any) => ({
          symbol: String(item.pdno || item.PDNO || "").trim(),
          name: String(item.prdt_name || item.PRDT_NAME || "").trim(),
          qty: Number(item.hldg_qty || item.HLDG_QTY || 0),
          avgPrice: Number(item.pchs_avg_pric || item.PCHS_AVG_PRIC || 0),
          currentPrice: Number(item.prpr || item.PRPR || 0),
          pnlPct: Number(item.evlu_pfls_rt || item.EVLU_PFLS_RT || 0),
          evalAmt: Number(item.evlu_amt || item.EVLU_AMT || 0)
        })).filter((h: any) => h.qty > 0);

        return {
          success: true,
          depositKRW,
          totalEvalAmt,
          holdings,
          message: `✅ [KIS 국내 계좌 대조 성공] 보유종목: ${holdings.length}개 | 예수금: ${depositKRW.toLocaleString()}원`
        };
      } catch (err: any) {
        return {
          success: false,
          depositKRW: 0,
          totalEvalAmt: 0,
          holdings: [],
          message: `🚨 [계좌 조회 오류] ${err?.message || err}`
        };
      }
    } else {
      // Overseas US balance
      const trId = isPaper ? "VTTS3012R" : "TTTS3012R";
      const queryParams = new URLSearchParams({
        CANO: this.accountNo,
        ACNT_PRDT_CD: this.productCode,
        OVRS_EXCG_CD: "NASD",
        TR_CRCY_CD: "USD",
        CTX_AREA_FK200: "",
        CTX_AREA_NK200: ""
      });

      try {
        const res = await fetch(`${domain}/uapi/overseas-stock/v1/trading/inquire-balance?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`,
            "appkey": this.appKey,
            "appsecret": this.appSecret,
            "tr_id": trId,
            "custtype": "P"
          }
        });

        if (!res.ok) {
          return {
            success: false,
            depositKRW: 0,
            totalEvalAmt: 0,
            holdings: [],
            message: `⚠️ KIS 미국 계좌 잔고 조회 HTTP ${res.status}`
          };
        }

        const data = await res.json();
        const output1 = data.output1 || [];
        const output2 = (data.output2 || [])[0] || {};

        const depositKRW = Number(output2.frcr_pchs_amt1 || 0);
        const totalEvalAmt = Number(output2.tot_evlu_pfls_amt || 0);

        const holdings = output1.map((item: any) => ({
          symbol: String(item.ovrs_pdno || item.OVRS_PDNO || item.pdno || "").trim(),
          name: String(item.ovrs_item_name || item.item_name || "").trim(),
          qty: Number(item.ovrs_ccls_qty || item.ccls_qty || 0),
          avgPrice: Number(item.pchs_avg_pric || 0),
          currentPrice: Number(item.now_pric2 || 0),
          pnlPct: Number(item.evlu_pfls_rt || 0),
          evalAmt: Number(item.ovrs_stck_evlu_amt || 0)
        })).filter((h: any) => h.qty > 0);

        return {
          success: true,
          depositKRW,
          totalEvalAmt,
          holdings,
          message: `✅ [KIS 미국 계좌 대조 성공] 보유종목: ${holdings.length}개`
        };
      } catch (err: any) {
        return {
          success: false,
          depositKRW: 0,
          totalEvalAmt: 0,
          holdings: [],
          message: `🚨 [미국 계좌 조회 오류] ${err?.message || err}`
        };
      }
    }
  }
}
