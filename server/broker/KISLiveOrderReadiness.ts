import type { KISLiveAccountTruth } from "./KISLiveAccountTruthV212";

export type LiveOrderMarket = "KOREA" | "US";
export type LiveOrderSide = "BUY" | "SELL";
export type LiveOrderType = "LIMIT" | "MARKET";

export interface LiveOrderIntent {
  symbol: string;
  market: LiveOrderMarket;
  side: LiveOrderSide;
  orderType: LiveOrderType;
  qty: number;
  price?: number;
}

export interface LiveOrderReadiness {
  ready: boolean;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  brokerConfigured: boolean;
  accountVerified: boolean;
  blockers: string[];
  warnings: string[];
}

export function isKisLiveBrokerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    String(env.KIS_APPKEY || "").trim()
    && String(env.KIS_APPSECRET || "").trim()
    && String(env.KIS_CANO || "").trim(),
  );
}

export function validateLiveOrderReadiness(params: {
  intent: LiveOrderIntent;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  brokerConfigured?: boolean;
  lastPrice?: number;
  accountTruth?: KISLiveAccountTruth | null;
}): LiveOrderReadiness {
  const { intent, dataStatus } = params;
  const brokerConfigured = params.brokerConfigured ?? isKisLiveBrokerConfigured();
  const accountTruth = params.accountTruth ?? null;
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!brokerConfigured) blockers.push("KIS 실계좌 API 환경변수가 설정되지 않았습니다.");
  if (dataStatus !== "REALTIME_VERIFIED") blockers.push(`시장 데이터 상태가 ${dataStatus} 입니다.`);

  if (!accountTruth) {
    blockers.push("KIS 실계좌 검증 결과가 없습니다.");
  } else {
    if (!accountTruth.verified) blockers.push(...accountTruth.blockers.map((reason) => `계좌검증: ${reason}`));
    if (accountTruth.provider !== "KIS") blockers.push("실계좌 데이터 공급자가 KIS가 아닙니다.");
    if (accountTruth.marketSession !== "OPEN") blockers.push("실거래 가능 장 시간이 아닙니다.");
  }

  const symbol = String(intent.symbol || "").trim().toUpperCase();
  if (intent.market === "KOREA" && !/^\d{6}$/.test(symbol)) {
    blockers.push("국내주식 종목코드는 6자리 숫자여야 합니다.");
  }
  if (intent.market === "US" && !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) {
    blockers.push("미국주식 티커 형식이 올바르지 않습니다.");
  }

  if (!Number.isInteger(intent.qty) || intent.qty <= 0) blockers.push("주문수량은 1주 이상의 정수여야 합니다.");

  if (intent.orderType === "LIMIT") {
    if (!Number.isFinite(intent.price) || Number(intent.price) <= 0) {
      blockers.push("지정가 주문에는 0보다 큰 가격이 필요합니다.");
    }
  }

  const lastPrice = Number(params.lastPrice);
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
    blockers.push("검증된 실시간 현재가가 없습니다.");
  }

  if (intent.orderType === "LIMIT" && Number.isFinite(lastPrice) && lastPrice > 0 && Number(intent.price) > 0) {
    const distancePct = Math.abs(Number(intent.price) / lastPrice - 1) * 100;
    if (distancePct >= 10) warnings.push(`지정가가 현재가와 ${distancePct.toFixed(1)}% 이상 떨어져 있습니다.`);
  }

  if (accountTruth) {
    if (accountTruth.orderableQty !== null && intent.qty > accountTruth.orderableQty) {
      blockers.push(`주문수량 ${intent.qty}주가 KIS 주문가능수량 ${accountTruth.orderableQty}주를 초과합니다.`);
    }

    if (intent.side === "BUY" && accountTruth.orderableCash !== null && Number.isFinite(lastPrice) && lastPrice > 0) {
      const estimatedUnitPrice = intent.orderType === "LIMIT" && Number(intent.price) > 0 ? Number(intent.price) : lastPrice;
      const estimatedCost = estimatedUnitPrice * intent.qty;
      if (estimatedCost > accountTruth.orderableCash) {
        blockers.push(`예상 주문금액이 KIS 주문가능금액 ${accountTruth.orderableCash}원을 초과합니다.`);
      }
    }
  }

  return {
    ready: blockers.length === 0,
    dataStatus,
    brokerConfigured,
    accountVerified: Boolean(accountTruth?.verified),
    blockers: Array.from(new Set(blockers)),
    warnings,
  };
}
