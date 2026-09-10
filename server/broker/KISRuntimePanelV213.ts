import { evaluateKISLiveAccountTruth, type KISLiveAccountTruth, type LiveMarketSession } from "./KISLiveAccountTruthV212";
import { validateLiveOrderReadiness, type LiveOrderIntent, type LiveOrderReadiness } from "./KISLiveOrderReadiness";

export interface KISRuntimePanelInput {
  brokerConfigured: boolean;
  oauthAuthenticated: boolean;
  accountSuccess: boolean;
  accountAsOf?: string | null;
  depositKRW?: number | null;
  totalEvalAmt?: number | null;
  holdings?: Array<{ symbol: string; name?: string; qty: number; avgPrice?: number; currentPrice?: number; pnlPct?: number; evalAmt?: number }>;
  quoteSuccess: boolean;
  quoteAsOf?: string | null;
  lastPrice?: number | null;
  marketSession: LiveMarketSession;
  orderableCash?: number | null;
  orderableQty?: number | null;
  symbol?: string | null;
  intent?: LiveOrderIntent | null;
  nowMs?: number;
}

export interface KISLiveEnvironmentProof {
  status: "ESTABLISHED" | "PROOF_NOT_ESTABLISHED";
  checkedAt: string;
  symbol: string | null;
  evidence: {
    brokerConfigured: boolean;
    oauthAuthenticated: boolean;
    accountQuerySucceeded: boolean;
    quoteQuerySucceeded: boolean;
    marketOpen: boolean;
    realtimeQuoteVerified: boolean;
    accountFresh: boolean;
    exactOrderabilityVerified: boolean;
  };
  quoteAsOf: string | null;
  accountAsOf: string | null;
  blockers: string[];
}

export interface KISRuntimePanel {
  provider: "KIS";
  mode: "LIVE_ONLY";
  connected: boolean;
  oauth: "AUTHENTICATED" | "NOT_CONFIGURED" | "AUTH_FAILED";
  marketSession: LiveMarketSession;
  dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  symbol: string | null;
  lastPrice: number | null;
  quoteAsOf: string | null;
  quoteAgeMs: number | null;
  accountAsOf: string | null;
  accountAgeMs: number | null;
  depositKRW: number | null;
  totalEvalAmt: number | null;
  holdings: KISRuntimePanelInput["holdings"];
  orderableCash: number | null;
  orderableQty: number | null;
  accountTruth: KISLiveAccountTruth;
  liveEnvironmentProof: KISLiveEnvironmentProof;
  orderReadiness: LiveOrderReadiness | null;
  requiresUserConfirmation: boolean;
  canSubmitOrder: false;
  blockers: string[];
}

function finiteOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function buildKISRuntimePanel(input: KISRuntimePanelInput): KISRuntimePanel {
  const nowMs = input.nowMs ?? Date.now();
  const quoteAsOf = input.quoteAsOf ?? null;
  const accountAsOf = input.accountAsOf ?? null;
  const lastPrice = finiteOrNull(input.lastPrice);
  const depositKRW = finiteOrNull(input.depositKRW);
  const totalEvalAmt = finiteOrNull(input.totalEvalAmt);
  const orderableCash = finiteOrNull(input.orderableCash);
  const orderableQty = Number.isInteger(input.orderableQty) && Number(input.orderableQty) >= 0 ? Number(input.orderableQty) : null;
  const symbol = input.symbol ? String(input.symbol).trim().toUpperCase() : null;

  const dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA" =
    input.quoteSuccess && lastPrice !== null && quoteAsOf
      ? "REALTIME_VERIFIED"
      : "NO_DATA";

  const authStatus = !input.brokerConfigured
    ? "NOT_CONFIGURED"
    : input.oauthAuthenticated
      ? "AUTHENTICATED"
      : "AUTH_FAILED";

  const accountTruth = evaluateKISLiveAccountTruth({
    dataStatus,
    provider: "KIS",
    brokerConfigured: input.brokerConfigured,
    authStatus,
    marketSession: input.marketSession,
    quoteAsOf,
    accountAsOf: input.accountSuccess ? accountAsOf : null,
    orderableCash,
    orderableQty,
  }, { nowMs });

  const exactOrderabilityVerified = orderableCash !== null && orderableQty !== null;
  const realtimeQuoteVerified = input.quoteSuccess && dataStatus === "REALTIME_VERIFIED" && lastPrice !== null && accountTruth.quoteAgeMs !== null && accountTruth.quoteAgeMs <= 30_000;
  const accountFresh = input.accountSuccess && accountTruth.accountAgeMs !== null && accountTruth.accountAgeMs <= 30_000;

  const proofBlockers = Array.from(new Set([
    ...accountTruth.blockers,
    ...(input.accountSuccess ? [] : ["KIS 실계좌 조회 성공 증거가 없습니다."]),
    ...(input.quoteSuccess && lastPrice !== null ? [] : ["KIS 실시간 현재가 조회 성공 증거가 없습니다."]),
    ...(exactOrderabilityVerified ? [] : ["KIS 주문가능금액/수량의 실제 조회 증거가 없습니다."]),
  ]));

  const liveEnvironmentProof: KISLiveEnvironmentProof = {
    status:
      accountTruth.verified &&
      input.accountSuccess &&
      realtimeQuoteVerified &&
      accountFresh &&
      exactOrderabilityVerified
        ? "ESTABLISHED"
        : "PROOF_NOT_ESTABLISHED",
    checkedAt: new Date(nowMs).toISOString(),
    symbol,
    evidence: {
      brokerConfigured: input.brokerConfigured,
      oauthAuthenticated: input.oauthAuthenticated,
      accountQuerySucceeded: input.accountSuccess,
      quoteQuerySucceeded: input.quoteSuccess && lastPrice !== null,
      marketOpen: input.marketSession === "OPEN",
      realtimeQuoteVerified,
      accountFresh,
      exactOrderabilityVerified,
    },
    quoteAsOf,
    accountAsOf,
    blockers: proofBlockers,
  };

  const orderReadiness = input.intent
    ? validateLiveOrderReadiness({
        intent: input.intent,
        dataStatus,
        brokerConfigured: input.brokerConfigured,
        lastPrice: lastPrice ?? undefined,
        accountTruth,
      })
    : null;

  const blockers = Array.from(new Set([
    ...accountTruth.blockers,
    ...(input.accountSuccess ? [] : ["KIS 실계좌 잔고 조회에 실패했습니다."]),
    ...(orderReadiness?.blockers ?? []),
  ]));

  return {
    provider: "KIS",
    mode: "LIVE_ONLY",
    connected: input.brokerConfigured && input.oauthAuthenticated,
    oauth: authStatus,
    marketSession: input.marketSession,
    dataStatus,
    symbol,
    lastPrice,
    quoteAsOf,
    quoteAgeMs: accountTruth.quoteAgeMs,
    accountAsOf,
    accountAgeMs: accountTruth.accountAgeMs,
    depositKRW,
    totalEvalAmt,
    holdings: input.holdings ?? [],
    orderableCash,
    orderableQty,
    accountTruth,
    liveEnvironmentProof,
    orderReadiness,
    requiresUserConfirmation: Boolean(orderReadiness?.ready),
    canSubmitOrder: false,
    blockers,
  };
}
