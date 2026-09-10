export type LiveTruthStatus = "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
export type LiveMarketSession = "OPEN" | "CLOSED" | "UNKNOWN";
export type LiveBrokerAuthStatus = "AUTHENTICATED" | "NOT_CONFIGURED" | "AUTH_FAILED" | "UNVERIFIED";

export interface KISLiveAccountSnapshot {
  dataStatus: LiveTruthStatus;
  provider: "KIS";
  brokerConfigured: boolean;
  authStatus: LiveBrokerAuthStatus;
  marketSession: LiveMarketSession;
  quoteAsOf?: string | null;
  accountAsOf?: string | null;
  orderableCash?: number | null;
  orderableQty?: number | null;
}

export interface KISLiveAccountTruth {
  verified: boolean;
  dataStatus: LiveTruthStatus;
  provider: "KIS";
  brokerConfigured: boolean;
  authStatus: LiveBrokerAuthStatus;
  marketSession: LiveMarketSession;
  quoteAsOf: string | null;
  quoteAgeMs: number | null;
  accountAsOf: string | null;
  accountAgeMs: number | null;
  orderableCash: number | null;
  orderableQty: number | null;
  blockers: string[];
}

function parseAgeMs(asOf: string | null | undefined, nowMs: number): number | null {
  if (!asOf) return null;
  const parsed = Date.parse(asOf);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, nowMs - parsed);
}

export function evaluateKISLiveAccountTruth(
  snapshot: KISLiveAccountSnapshot,
  options: { nowMs?: number; maxQuoteAgeMs?: number; maxAccountAgeMs?: number } = {},
): KISLiveAccountTruth {
  const nowMs = options.nowMs ?? Date.now();
  const maxQuoteAgeMs = options.maxQuoteAgeMs ?? 30_000;
  const maxAccountAgeMs = options.maxAccountAgeMs ?? 30_000;
  const quoteAsOf = snapshot.quoteAsOf ?? null;
  const accountAsOf = snapshot.accountAsOf ?? null;
  const quoteAgeMs = parseAgeMs(quoteAsOf, nowMs);
  const accountAgeMs = parseAgeMs(accountAsOf, nowMs);
  const blockers: string[] = [];

  if (!snapshot.brokerConfigured) blockers.push("KIS 실계좌 설정이 확인되지 않았습니다.");
  if (snapshot.authStatus !== "AUTHENTICATED") blockers.push(`KIS 인증 상태가 ${snapshot.authStatus} 입니다.`);
  if (snapshot.dataStatus !== "REALTIME_VERIFIED") blockers.push(`실시간 시세 상태가 ${snapshot.dataStatus} 입니다.`);
  if (snapshot.marketSession !== "OPEN") blockers.push(`시장 세션이 ${snapshot.marketSession} 입니다.`);

  if (quoteAgeMs === null) blockers.push("실시간 시세 타임스탬프가 없습니다.");
  else if (quoteAgeMs > maxQuoteAgeMs) blockers.push(`실시간 시세가 ${quoteAgeMs}ms 지연되어 있습니다.`);

  if (accountAgeMs === null) blockers.push("KIS 계좌조회 타임스탬프가 없습니다.");
  else if (accountAgeMs > maxAccountAgeMs) blockers.push(`KIS 계좌정보가 ${accountAgeMs}ms 지연되어 있습니다.`);

  const orderableCash = Number.isFinite(snapshot.orderableCash) && Number(snapshot.orderableCash) >= 0
    ? Number(snapshot.orderableCash)
    : null;
  const orderableQty = Number.isInteger(snapshot.orderableQty) && Number(snapshot.orderableQty) >= 0
    ? Number(snapshot.orderableQty)
    : null;

  if (orderableCash === null) blockers.push("실계좌 주문가능금액을 확인하지 못했습니다.");
  if (orderableQty === null) blockers.push("실계좌 주문가능수량을 확인하지 못했습니다.");

  return {
    verified: blockers.length === 0,
    dataStatus: snapshot.dataStatus,
    provider: "KIS",
    brokerConfigured: snapshot.brokerConfigured,
    authStatus: snapshot.authStatus,
    marketSession: snapshot.marketSession,
    quoteAsOf,
    quoteAgeMs,
    accountAsOf,
    accountAgeMs,
    orderableCash,
    orderableQty,
    blockers,
  };
}
