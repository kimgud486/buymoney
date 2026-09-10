// AISTOCK v12.1/v12.3 Server-Side KIS Broker Gateway Compatibility Wrapper
// Keeps the v12.3 real-fill engine while correcting KIS overseas holdings sync.

import { KISBrokerGatewayV123, KIS_REAL_REST_DOMAIN } from "./KISBrokerGatewayV123";

export type {
  KISOrderRequest,
  KISOrderGatewayResponse,
  KISFillCheckResult
} from "./KISBrokerGatewayV123";

type KISAccountBalance = {
  success: boolean;
  depositKRW: number;
  totalEvalAmt: number;
  holdings: Array<{
    symbol: string;
    name: string;
    qty: number;
    avgPrice: number;
    currentPrice: number;
    pnlPct: number;
    evalAmt: number;
  }>;
  message: string;
};

/**
 * Legacy server.ts still contains a direct overseas-balance parser that reads
 * `ovrs_cqty`. Current KIS overseas balance responses expose the actual held
 * quantity primarily as `ovrs_cblc_qty`.
 *
 * Keep one narrow compatibility bridge at the HTTP response boundary so both
 * the legacy sync route and the V12 gateway see the same quantity. It only
 * touches KIS overseas inquire-balance JSON and leaves every other fetch
 * response unchanged.
 */
let overseasBalanceFetchShimInstalled = false;

function installOverseasBalanceFetchCompatibilityShim(): void {
  if (overseasBalanceFetchShimInstalled || typeof globalThis.fetch !== "function") return;
  overseasBalanceFetchShimInstalled = true;

  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: any, init?: any) => {
    const response = await nativeFetch(input, init);

    try {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input?.url || "");

      if (!url.includes("/uapi/overseas-stock/v1/trading/inquire-balance")) {
        return response;
      }

      const payload = await response.clone().json().catch(() => null);
      if (!payload || !Array.isArray(payload.output1)) return response;

      let patched = false;
      const output1 = payload.output1.map((item: any) => {
        if (!item || typeof item !== "object") return item;

        const heldQty =
          item.ovrs_cblc_qty ??
          item.OVRS_CBLC_QTY ??
          item.ovrs_ccls_qty ??
          item.ccls_qty;

        if ((item.ovrs_cqty === undefined || item.ovrs_cqty === null || item.ovrs_cqty === "") && heldQty !== undefined && heldQty !== null && heldQty !== "") {
          patched = true;
          return { ...item, ovrs_cqty: heldQty };
        }
        return item;
      });

      if (!patched) return response;

      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");

      return new Response(JSON.stringify({ ...payload, output1 }), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      // Fail open to the untouched KIS response. Read-only balance sync must
      // never become unavailable because a compatibility mapper failed.
      return response;
    }
  }) as typeof globalThis.fetch;
}

/**
 * Compatibility gateway used by server.ts.
 *
 * Why this override exists:
 * KIS overseas inquire-balance returns the actual balance quantity primarily
 * in `ovrs_cblc_qty`. The old v12.3 mapper only checked `ovrs_ccls_qty`, so a
 * valid overseas position could be converted to qty=0 and then filtered out.
 */
export class KISBrokerGatewayV121 extends KISBrokerGatewayV123 {
  constructor() {
    super();
    installOverseasBalanceFetchCompatibilityShim();
  }

  public async getAccountBalance(
    market: "KOREA" | "US" = "KOREA",
    isPaper: boolean = false
  ): Promise<KISAccountBalance> {
    if (market !== "US") {
      return super.getAccountBalance(market, isPaper);
    }

    // This project operates in LIVE-only mode. Keep the existing fail-closed rule.
    if (isPaper) {
      return {
        success: false,
        depositKRW: 0,
        totalEvalAmt: 0,
        holdings: [],
        message: "⛔ [LIVE_TRADING_ONLY] KIS 모의계좌 해외잔고 조회는 비활성화되어 있습니다."
      };
    }

    const appKey = process.env.KIS_APPKEY || "";
    const appSecret = process.env.KIS_APPSECRET || "";
    const accountNo = process.env.KIS_CANO || "";
    const productCode = process.env.KIS_ACNT_PRDT_CD || "01";

    if (!appKey || !appSecret || !accountNo) {
      return {
        success: false,
        depositKRW: 0,
        totalEvalAmt: 0,
        holdings: [],
        message: "❌ KIS_APPKEY / KIS_APPSECRET / KIS_CANO 환경변수가 미설정되었습니다."
      };
    }

    const token = await this.getOAuthToken(false);
    if (!token) {
      return {
        success: false,
        depositKRW: 0,
        totalEvalAmt: 0,
        holdings: [],
        message: "⛔ [Fail-Closed 차단] KIS OAuth2 토큰 발급 실패로 미국주식 잔고 조회가 보류되었습니다."
      };
    }

    const allRows: any[] = [];
    let latestSummary: any = {};
    let ctxFk200 = "";
    let ctxNk200 = "";
    const seenCursors = new Set<string>();

    try {
      // Defensive pagination. Most accounts return one page, but this prevents
      // larger portfolios from silently losing later holdings.
      for (let page = 0; page < 10; page += 1) {
        const queryParams = new URLSearchParams({
          CANO: accountNo,
          ACNT_PRDT_CD: productCode,
          OVRS_EXCG_CD: "NASD",
          TR_CRCY_CD: "USD",
          CTX_AREA_FK200: ctxFk200,
          CTX_AREA_NK200: ctxNk200
        });

        const res = await fetch(
          `${KIS_REAL_REST_DOMAIN}/uapi/overseas-stock/v1/trading/inquire-balance?${queryParams.toString()}`,
          {
            method: "GET",
            headers: {
              "content-type": "application/json",
              "authorization": `Bearer ${token}`,
              "appkey": appKey,
              "appsecret": appSecret,
              "tr_id": "TTTS3012R",
              "custtype": "P",
              ...(page > 0 ? { "tr_cont": "N" } : {})
            }
          }
        );

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return {
            success: false,
            depositKRW: 0,
            totalEvalAmt: 0,
            holdings: [],
            message: `⚠️ KIS 미국 계좌 잔고 조회 HTTP ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`
          };
        }

        const data = await res.json();
        if (String(data?.rt_cd ?? "0") !== "0") {
          return {
            success: false,
            depositKRW: 0,
            totalEvalAmt: 0,
            holdings: [],
            message: `⚠️ KIS 미국 계좌 잔고 조회 실패: ${data?.msg1 || data?.msg_cd || "UNKNOWN_KIS_ERROR"}`
          };
        }

        const rows = Array.isArray(data?.output1) ? data.output1 : [];
        allRows.push(...rows);

        const output2 = Array.isArray(data?.output2)
          ? (data.output2[0] || {})
          : (data?.output2 || {});
        latestSummary = output2 || latestSummary;

        const nextFk = String(data?.ctx_area_fk200 || data?.CTX_AREA_FK200 || "").trim();
        const nextNk = String(data?.ctx_area_nk200 || data?.CTX_AREA_NK200 || "").trim();
        const cursorKey = `${nextFk}|${nextNk}`;

        if ((!nextFk && !nextNk) || seenCursors.has(cursorKey)) {
          break;
        }

        seenCursors.add(cursorKey);
        ctxFk200 = nextFk;
        ctxNk200 = nextNk;
      }

      const holdings = allRows
        .map((item: any) => ({
          symbol: String(item.ovrs_pdno || item.OVRS_PDNO || item.pdno || "").trim(),
          name: String(item.ovrs_item_name || item.OVRS_ITEM_NAME || item.item_name || "").trim(),
          // Critical fix: KIS overseas balance quantity is ovrs_cblc_qty.
          qty: Number(
            item.ovrs_cblc_qty ??
            item.OVRS_CBLC_QTY ??
            item.ovrs_ccls_qty ??
            item.ovrs_cqty ??
            item.ccls_qty ??
            0
          ),
          avgPrice: Number(item.pchs_avg_pric ?? item.PCHS_AVG_PRIC ?? 0),
          currentPrice: Number(item.now_pric2 ?? item.NOW_PRIC2 ?? item.ovrs_now_pric1 ?? 0),
          pnlPct: Number(item.evlu_pfls_rt ?? item.EVLU_PFLS_RT ?? 0),
          evalAmt: Number(
            item.ovrs_stck_evlu_amt ??
            item.OVRS_STCK_EVLU_AMT ??
            item.frcr_evlu_amt2 ??
            item.evlu_amt ??
            0
          )
        }))
        .filter((holding) => holding.symbol && Number.isFinite(holding.qty) && holding.qty > 0);

      const depositKRW = Number(
        latestSummary.frcr_pchs_amt1 ??
        latestSummary.FRCR_PCHS_AMT1 ??
        0
      );
      const totalEvalAmt = Number(
        latestSummary.tot_evlu_pfls_amt ??
        latestSummary.TOT_EVLU_PFLS_AMT ??
        latestSummary.tot_asst_amt ??
        0
      );

      return {
        success: true,
        depositKRW,
        totalEvalAmt,
        holdings,
        message: `✅ [KIS 미국 계좌 대조 성공] 실제 보유종목: ${holdings.length}개`
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
