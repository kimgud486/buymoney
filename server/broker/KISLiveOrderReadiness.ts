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
}): LiveOrderReadiness {
  const { intent, dataStatus } = params;
  const brokerConfigured = params.brokerConfigured ?? isKisLiveBrokerConfigured();
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!brokerConfigured) blockers.push("KIS 실계좌 API 환경변수가 설정되지 않았습니다.");
  if (dataStatus !== "REALTIME_VERIFIED") blockers.push(`시장 데이터 상태가 ${dataStatus} 입니다.`);

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
  if (intent.orderType === "LIMIT" && Number.isFinite(lastPrice) && lastPrice > 0 && Number(intent.price) > 0) {
    const distancePct = Math.abs(Number(intent.price) / lastPrice - 1) * 100;
    if (distancePct >= 10) warnings.push(`지정가가 현재가와 ${distancePct.toFixed(1)}% 이상 떨어져 있습니다.`);
  }

  if (intent.side === "SELL") warnings.push("매도 가능수량과 보유잔고는 주문 전 KIS 계좌조회로 재확인해야 합니다.");

  return {
    ready: blockers.length === 0,
    dataStatus,
    brokerConfigured,
    blockers,
    warnings,
  };
}
