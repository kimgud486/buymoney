import { KIS_REAL_REST_DOMAIN } from "./KISBrokerGatewayV123";

export interface KISRuntimeProbeResult {
  quoteSuccess: boolean;
  quoteAsOf: string | null;
  lastPrice: number | null;
  marketSession: "OPEN" | "CLOSED" | "UNKNOWN";
  orderableSuccess: boolean;
  orderableCash: number | null;
  orderableQty: number | null;
  errors: string[];
}

export interface KISDomesticFundamentalsTruth {
  dataStatus: "REALTIME_VERIFIED" | "NO_DATA";
  source: "KIS_INQUIRE_PRICE";
  symbol: string;
  asOf: string | null;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
}

type FetchLike = typeof fetch;

const fundamentalsCache = new Map<string, KISDomesticFundamentalsTruth>();
const FUNDAMENTALS_MAX_AGE_MS = 60_000;

function emptyFundamentals(symbol: string): KISDomesticFundamentalsTruth {
  return {
    dataStatus: "NO_DATA",
    source: "KIS_INQUIRE_PRICE",
    symbol: String(symbol || "").trim().toUpperCase(),
    asOf: null,
    per: null,
    pbr: null,
    eps: null,
    bps: null,
  };
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toPositiveMetric(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNonZeroMetric(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function storeFundamentalsFromQuote(symbol: string, output: any, asOf: string | null): void {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  const per = toPositiveMetric(output?.per ?? output?.PER);
  const pbr = toPositiveMetric(output?.pbr ?? output?.PBR);
  const eps = toNonZeroMetric(output?.eps ?? output?.EPS);
  const bps = toPositiveMetric(output?.bps ?? output?.BPS);
  const hasAnyVerifiedMetric = per !== null || pbr !== null || eps !== null || bps !== null;

  fundamentalsCache.set(cleanSymbol, {
    dataStatus: hasAnyVerifiedMetric && asOf ? "REALTIME_VERIFIED" : "NO_DATA",
    source: "KIS_INQUIRE_PRICE",
    symbol: cleanSymbol,
    asOf: hasAnyVerifiedMetric ? asOf : null,
    per,
    pbr,
    eps,
    bps,
  });
}

export function getCachedKISDomesticFundamentals(
  symbol: string,
  nowMs: number = Date.now(),
): KISDomesticFundamentalsTruth {
  const cleanSymbol = String(symbol || "").trim().toUpperCase();
  const cached = fundamentalsCache.get(cleanSymbol);
  if (!cached || cached.dataStatus !== "REALTIME_VERIFIED" || !cached.asOf) {
    return emptyFundamentals(cleanSymbol);
  }

  const asOfMs = Date.parse(cached.asOf);
  if (!Number.isFinite(asOfMs) || nowMs - asOfMs > FUNDAMENTALS_MAX_AGE_MS || nowMs < asOfMs - 5_000) {
    return emptyFundamentals(cleanSymbol);
  }

  return cached;
}

function seoulClock(nowMs: number): { weekday: number; hhmm: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(nowMs));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdays[map.weekday] ?? -1, hhmm: Number(map.hour || 0) * 100 + Number(map.minute || 0) };
}

export function inferKoreaMarketSession(nowMs: number): "OPEN" | "CLOSED" | "UNKNOWN" {
  const { weekday, hhmm } = seoulClock(nowMs);
  if (weekday < 0) return "UNKNOWN";
  if (weekday === 0 || weekday === 6) return "CLOSED";
  return hhmm >= 900 && hhmm <= 1530 ? "OPEN" : "CLOSED";
}

export async function probeKISDomesticRuntime(params: {
  symbol: string;
  token: string;
  appKey?: string;
  appSecret?: string;
  accountNo?: string;
  productCode?: string;
  nowMs?: number;
  fetchImpl?: FetchLike;
}): Promise<KISRuntimeProbeResult> {
  const nowMs = params.nowMs ?? Date.now();
  const fetchImpl = params.fetchImpl ?? fetch;
  const appKey = params.appKey ?? process.env.KIS_APPKEY ?? "";
  const appSecret = params.appSecret ?? process.env.KIS_APPSECRET ?? "";
  const accountNo = params.accountNo ?? process.env.KIS_CANO ?? "";
  const productCode = params.productCode ?? process.env.KIS_ACNT_PRDT_CD ?? "01";
  const symbol = String(params.symbol || "").trim();
  const errors: string[] = [];

  if (!/^\d{6}$/.test(symbol) || !params.token || !appKey || !appSecret || !accountNo) {
    if (/^\d{6}$/.test(symbol)) fundamentalsCache.set(symbol, emptyFundamentals(symbol));
    return {
      quoteSuccess: false,
      quoteAsOf: null,
      lastPrice: null,
      marketSession: inferKoreaMarketSession(nowMs),
      orderableSuccess: false,
      orderableCash: null,
      orderableQty: null,
      errors: ["KIS runtime probe prerequisites are incomplete."],
    };
  }

  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${params.token}`,
    appkey: appKey,
    appsecret: appSecret,
    custtype: "P",
  };

  let quoteSuccess = false;
  let quoteAsOf: string | null = null;
  let lastPrice: number | null = null;

  try {
    const query = new URLSearchParams({ FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: symbol });
    const res = await fetchImpl(`${KIS_REAL_REST_DOMAIN}/uapi/domestic-stock/v1/quotations/inquire-price?${query}`, {
      method: "GET",
      headers: { ...headers, tr_id: "FHKST01010100" },
    });
    if (res.ok) {
      const data: any = await res.json();
      if (String(data?.rt_cd ?? "0") === "0") {
        lastPrice = toFiniteNumber(data?.output?.stck_prpr ?? data?.output?.STCK_PRPR);
        quoteSuccess = Boolean(lastPrice && lastPrice > 0);
        quoteAsOf = quoteSuccess ? new Date(nowMs).toISOString() : null;
        storeFundamentalsFromQuote(symbol, data?.output ?? {}, quoteAsOf);
      } else {
        fundamentalsCache.set(symbol, emptyFundamentals(symbol));
        errors.push(`KIS quote rejected: ${String(data?.msg1 || data?.msg_cd || "UNKNOWN")}`);
      }
    } else {
      fundamentalsCache.set(symbol, emptyFundamentals(symbol));
      errors.push(`KIS quote HTTP ${res.status}`);
    }
  } catch (error: any) {
    fundamentalsCache.set(symbol, emptyFundamentals(symbol));
    errors.push(`KIS quote error: ${error?.message || String(error)}`);
  }

  let orderableSuccess = false;
  let orderableCash: number | null = null;
  let orderableQty: number | null = null;

  if (quoteSuccess && lastPrice) {
    try {
      const query = new URLSearchParams({
        CANO: accountNo,
        ACNT_PRDT_CD: productCode,
        PDNO: symbol,
        ORD_UNPR: String(Math.trunc(lastPrice)),
        ORD_DVSN: "00",
        CMA_EVLU_AMT_ICLD_YN: "Y",
        OVRS_ICLD_YN: "N",
      });
      const res = await fetchImpl(`${KIS_REAL_REST_DOMAIN}/uapi/domestic-stock/v1/trading/inquire-psbl-order?${query}`, {
        method: "GET",
        headers: { ...headers, tr_id: "TTTC8908R" },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (String(data?.rt_cd ?? "0") === "0") {
          const output = data?.output ?? {};
          orderableCash = toFiniteNumber(output?.ord_psbl_cash ?? output?.ORD_PSBL_CASH);
          orderableQty = toFiniteNumber(output?.max_buy_qty ?? output?.MAX_BUY_QTY);
          if (orderableQty !== null) orderableQty = Math.trunc(orderableQty);
          orderableSuccess = orderableCash !== null && orderableQty !== null;
        } else {
          errors.push(`KIS orderable inquiry rejected: ${String(data?.msg1 || data?.msg_cd || "UNKNOWN")}`);
        }
      } else {
        errors.push(`KIS orderable inquiry HTTP ${res.status}`);
      }
    } catch (error: any) {
      errors.push(`KIS orderable inquiry error: ${error?.message || String(error)}`);
    }
  }

  return {
    quoteSuccess,
    quoteAsOf,
    lastPrice,
    marketSession: inferKoreaMarketSession(nowMs),
    orderableSuccess,
    orderableCash: orderableSuccess ? orderableCash : null,
    orderableQty: orderableSuccess ? orderableQty : null,
    errors,
  };
}