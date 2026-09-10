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
    symbol: input.symbol ? String(input.symbol).trim().toUpperCase() : null,
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
    orderReadiness,
    requiresUserConfirmation: Boolean(orderReadiness?.ready),
    canSubmitOrder: false,
    blockers,
  };
}
