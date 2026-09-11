import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChartCandlestick,
  CheckCircle2,
  Clock3,
  Coins,
  DollarSign,
  Key,
  RefreshCw,
  ShieldAlert,
  Wallet,
  XCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StockPosition, TradeLog } from "../../types";
import {
  LiveMarketQuote,
  realtimeMarketFeedService,
} from "../../services/realtimeMarketFeedService";
import { SmartSafetyGovernanceModal } from "./SmartSafetyGovernanceModal";
import { BrokerApiConnectModal } from "./BrokerApiConnectModal";

interface RealBrokerDetailedBalanceAndHoldingsProps {
  onSelectAssetForChart?: (
    symbol: string,
    name: string,
    market: "KOREA" | "US" | "BTC",
  ) => void;
  /** @deprecated Direct quick-order execution is intentionally not exposed from this truth-first view. */
  onQuickTrade?: (
    symbol: string,
    name: string,
    market: "KOREA" | "US" | "BTC",
    side: "BUY" | "SELL",
    qty: number,
    price: number,
  ) => Promise<void>;
  /** Verified USD/KRW rate only. Missing or invalid values stay NO_DATA. */
  exchangeRateKRW?: number | null;
  exchangeRateSource?: string | null;
}

type AccountBroker = "korea" | "us" | "upbit";
type SyncState = "NO_DATA" | "READY" | "FAILED";
type BrokerState = "CONNECTED" | "FAILED" | "DISCONNECTED" | "NOT_CONFIGURED";
type ActiveTab = "BALANCES" | "HOLDINGS" | "TRADES";

type BrokerSyncTruth = {
  state: SyncState;
  observedAt: string | null;
  message: string | null;
};

type PositionFact = {
  position: StockPosition;
  quantity: number | null;
  currentPrice: number | null;
  avgPrice: number | null;
  valuationKrw: number | null;
  costKrw: number | null;
  pnlKrw: number | null;
  pnlRate: number | null;
  quote: LiveMarketQuote | null;
};

const EMPTY_SYNC_TRUTH: BrokerSyncTruth = {
  state: "NO_DATA",
  observedAt: null,
  message: null,
};

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed != null && parsed >= 0 ? parsed : null;
}

function formatKrw(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return `₩${Math.round(value).toLocaleString()}원`;
}

function formatUsd(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatQuantity(value: unknown, market: StockPosition["market"]): string {
  const quantity = nonNegativeNumber(value);
  if (quantity == null) return "NO_DATA";
  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: market === "BTC" ? 8 : 6,
  });
}

function maskAccount(accountNo: string | undefined): string {
  const clean = String(accountNo || "").replace(/\s+/g, "").trim();
  if (!clean) return "NO_DATA";
  if (clean.length <= 4) return "****";
  return `${clean.slice(0, 4)}****${clean.slice(-2)}`;
}

function brokerForMarket(market: StockPosition["market"]): AccountBroker | null {
  if (market === "KOREA") return "korea";
  if (market === "US") return "us";
  if (market === "BTC") return "upbit";
  return null;
}

function isVerifiedDisplayQuote(quote: LiveMarketQuote | undefined): quote is LiveMarketQuote {
  if (!quote || !quote.isVerified || quote.status !== "LIVE") return false;
  if (quote.price == null || quote.price <= 0) return false;
  if (quote.providerTimestamp == null || quote.ageMs == null) return false;
  return quote.ageMs <= 15_000;
}

function resolveSessionBrokerState(configured: boolean, truth: BrokerSyncTruth): BrokerState {
  if (!configured) return "NOT_CONFIGURED";
  if (truth.state === "READY") return "CONNECTED";
  if (truth.state === "FAILED") return "FAILED";
  return "DISCONNECTED";
}

function BrokerStateBadge({ state }: { state: BrokerState }) {
  const config =
    state === "CONNECTED"
      ? { text: "ACCOUNT VERIFIED", classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", Icon: CheckCircle2 }
      : state === "FAILED"
        ? { text: "SYNC FAILED", classes: "border-rose-500/30 bg-rose-500/10 text-rose-300", Icon: XCircle }
        : state === "NOT_CONFIGURED"
          ? { text: "NOT_CONFIGURED", classes: "border-slate-700 bg-slate-900 text-slate-400", Icon: Key }
          : { text: "ACCOUNT NO_DATA", classes: "border-amber-500/30 bg-amber-500/10 text-amber-300", Icon: AlertTriangle };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${config.classes}`}>
      <config.Icon className="h-3 w-3" />
      {config.text}
    </span>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  const unavailable = value === "NO_DATA";
  return (
    <div className="rounded-xl border border-slate-800 bg-[#07101b] p-4">
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      <div className={`mt-2 break-words text-base font-black ${unavailable ? "text-slate-500" : "text-slate-100"}`}>{value}</div>
      {note && <div className="mt-1 text-[10px] leading-5 text-slate-600">{note}</div>}
    </div>
  );
}

function BrokerCard({
  title,
  subtitle,
  state,
  error,
  rows,
  syncLabel,
  syncing,
  canSync,
  onSync,
}: {
  title: string;
  subtitle: string;
  state: BrokerState;
  error?: string | null;
  rows: Array<{ label: string; value: string }>;
  syncLabel: string;
  syncing: boolean;
  canSync: boolean;
  onSync: () => void;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#08111d] p-4">
      <div>
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="font-black text-white">{title}</div>
            <div className="mt-1 text-[10px] text-slate-500">{subtitle}</div>
          </div>
          <BrokerStateBadge state={state} />
        </div>

        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 rounded-lg bg-slate-950/70 px-3 py-2 text-xs">
              <span className="text-slate-500">{row.label}</span>
              <strong className={row.value === "NO_DATA" ? "text-slate-600" : "text-slate-200"}>{row.value}</strong>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-950/10 p-3 text-[11px] leading-5 text-rose-200">
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSync}
        disabled={!canSync || syncing}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {canSync ? (syncing ? "검증 중..." : syncLabel) : "API 등록 필요"}
      </button>
    </div>
  );
}

export const RealBrokerDetailedBalanceAndHoldings: React.FC<RealBrokerDetailedBalanceAndHoldingsProps> = ({
  onSelectAssetForChart,
  exchangeRateKRW,
  exchangeRateSource,
}) => {
  const {
    profile,
    positions,
    trades,
    cashBreakdown,
    syncRealAccountBalance,
    addToast,
    blockedSymbolDetails,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>("BALANCES");
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [isApiConnectModalOpen, setIsApiConnectModalOpen] = useState(false);
  const [syncingBroker, setSyncingBroker] = useState<AccountBroker | "all" | null>(null);
  const [quotes, setQuotes] = useState<Map<string, LiveMarketQuote>>(new Map());
  const [syncTruth, setSyncTruth] = useState<Record<AccountBroker, BrokerSyncTruth>>({
    korea: { ...EMPTY_SYNC_TRUTH },
    us: { ...EMPTY_SYNC_TRUTH },
    upbit: { ...EMPTY_SYNC_TRUTH },
  });

  const fxRate = positiveNumber(exchangeRateKRW);
  const koreaConfigured = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const upbitConfigured = Boolean(profile?.upbitAccessKey);

  useEffect(() => {
    positions.forEach((position) => {
      const symbol = String(position.symbol || "").trim().toUpperCase();
      if (!symbol) return;
      if (position.market === "US") realtimeMarketFeedService.registerSymbol(symbol, "US");
      else if (position.market === "BTC") realtimeMarketFeedService.registerSymbol(symbol, "UPBIT");
      else if (position.market === "KOREA") realtimeMarketFeedService.registerSymbol(symbol);
    });

    return realtimeMarketFeedService.subscribe((nextQuotes) => {
      setQuotes(new Map(nextQuotes));
    });
  }, [positions]);

  const markSync = (broker: AccountBroker, next: BrokerSyncTruth) => {
    setSyncTruth((prev) => ({ ...prev, [broker]: next }));
  };

  const syncOneBroker = async (broker: AccountBroker): Promise<boolean> => {
    markSync(broker, { state: "NO_DATA", observedAt: null, message: "검증 중" });
    try {
      const result = await syncRealAccountBalance(broker, false);
      if (result?.success !== true) {
        const message = result?.message || `${broker} 계좌 검증 응답이 성공 상태가 아닙니다.`;
        markSync(broker, { state: "FAILED", observedAt: null, message });
        return false;
      }

      const observedAt = new Date().toLocaleTimeString("ko-KR", { hour12: false });
      markSync(broker, {
        state: "READY",
        observedAt,
        message: result?.message || "이번 세션 계좌 동기화 성공",
      });
      return true;
    } catch (error: any) {
      const message = error?.message || "계좌 동기화 중 오류가 발생했습니다.";
      markSync(broker, { state: "FAILED", observedAt: null, message });
      return false;
    }
  };

  const handleSync = async (target: AccountBroker | "all") => {
    if (syncingBroker != null) return;
    setSyncingBroker(target);
    try {
      const targets: AccountBroker[] = target === "all"
        ? [
            ...(koreaConfigured ? (["korea", "us"] as AccountBroker[]) : []),
            ...(upbitConfigured ? (["upbit"] as AccountBroker[]) : []),
          ]
        : [target];

      if (targets.length === 0) return;

      const results: boolean[] = [];
      for (const broker of targets) {
        results.push(await syncOneBroker(broker));
      }

      if (results.every(Boolean)) {
        addToast({
          type: "SUCCESS",
          title: target === "all" ? "계좌별 검증 완료" : "계좌 검증 완료",
          message: "요청한 계좌가 각각 별도 API 조회로 검증되었습니다.",
        });
      } else {
        addToast({
          type: "WARNING",
          title: "일부 계좌 NO_DATA",
          message: "성공한 계좌만 READY로 표시합니다. 실패한 계좌는 다른 계좌의 값으로 채우지 않습니다.",
        });
      }
    } finally {
      setSyncingBroker(null);
    }
  };

  const quoteForPosition = (position: StockPosition): LiveMarketQuote | null => {
    const symbol = String(position.symbol || "").trim().toUpperCase();
    if (!symbol) return null;
    const direct = quotes.get(symbol);
    const withoutKrw = symbol.replace(/^KRW-/, "");
    const candidate = direct || quotes.get(withoutKrw) || quotes.get(`KRW-${withoutKrw}`);
    return isVerifiedDisplayQuote(candidate) ? candidate : null;
  };

  const positionFacts = useMemo<PositionFact[]>(() => {
    return positions
      .filter((position) => {
        const broker = brokerForMarket(position.market);
        return broker != null && syncTruth[broker].state === "READY";
      })
      .map((position) => {
        const quantity = positiveNumber(position.quantity);
        const avgPrice = positiveNumber(position.avgPrice);
        const quote = quoteForPosition(position);
        const currentPrice = quote?.price ?? null;
        const factor = position.market === "US" ? fxRate : 1;
        const hasValuationInputs = quantity != null && currentPrice != null && factor != null;
        const hasCostInputs = quantity != null && avgPrice != null && factor != null;
        const valuationKrw = hasValuationInputs ? quantity * currentPrice * factor : null;
        const costKrw = hasCostInputs ? quantity * avgPrice * factor : null;
        const pnlKrw = valuationKrw != null && costKrw != null ? valuationKrw - costKrw : null;
        const pnlRate = pnlKrw != null && costKrw != null && costKrw > 0 ? (pnlKrw / costKrw) * 100 : null;
        return { position, quantity, currentPrice, avgPrice, valuationKrw, costKrw, pnlKrw, pnlRate, quote };
      });
  }, [positions, quotes, syncTruth, fxRate]);

  const configuredBrokerStates: Array<{ configured: boolean; ready: boolean }> = [
    { configured: koreaConfigured, ready: syncTruth.korea.state === "READY" },
    { configured: koreaConfigured, ready: syncTruth.us.state === "READY" },
    { configured: upbitConfigured, ready: syncTruth.upbit.state === "READY" },
  ];
  const configuredCount = configuredBrokerStates.filter((item) => item.configured).length;
  const allConfiguredReady = configuredCount > 0 && configuredBrokerStates
    .filter((item) => item.configured)
    .every((item) => item.ready);

  const holdingsSummary = useMemo(() => {
    if (!allConfiguredReady) return { valuation: null, cost: null, pnl: null, pnlRate: null };
    if (positionFacts.length === 0) return { valuation: 0, cost: 0, pnl: 0, pnlRate: 0 };
    if (positionFacts.some((fact) => fact.valuationKrw == null || fact.costKrw == null)) {
      return { valuation: null, cost: null, pnl: null, pnlRate: null };
    }

    const valuation = positionFacts.reduce((sum, fact) => sum + Number(fact.valuationKrw), 0);
    const cost = positionFacts.reduce((sum, fact) => sum + Number(fact.costKrw), 0);
    const pnl = valuation - cost;
    const pnlRate = cost > 0 ? (pnl / cost) * 100 : 0;
    return { valuation, cost, pnl, pnlRate };
  }, [allConfiguredReady, positionFacts]);

  const verifiedKoreaCash = syncTruth.korea.state === "READY"
    ? nonNegativeNumber(cashBreakdown?.koreaCash)
    : null;
  const verifiedUpbitCash = syncTruth.upbit.state === "READY"
    ? nonNegativeNumber(cashBreakdown?.upbitCash)
    : null;

  // The current server contract does not prove the US cash currency/unit separately.
  // Never display its legacy zero as a verified account value.
  const verifiedUsCashRaw: number | null = null;
  const verifiedCashTotal = allConfiguredReady && verifiedKoreaCash != null && verifiedUpbitCash != null
    ? verifiedKoreaCash + verifiedUpbitCash
    : allConfiguredReady && koreaConfigured && !upbitConfigured && verifiedKoreaCash != null
      ? verifiedKoreaCash
      : allConfiguredReady && !koreaConfigured && upbitConfigured && verifiedUpbitCash != null
        ? verifiedUpbitCash
        : null;

  const grandTotal = verifiedCashTotal != null && holdingsSummary.valuation != null
    ? verifiedCashTotal + holdingsSummary.valuation
    : null;

  const formatPositionPrice = (value: number | null, market: StockPosition["market"]) => {
    if (value == null) return <span className="text-slate-600">NO_DATA</span>;
    if (market === "US") {
      return (
        <span className="inline-flex flex-col items-end">
          <strong>{formatUsd(value)}</strong>
          <span className="text-[10px] text-slate-600">{fxRate != null ? `≈ ${formatKrw(value * fxRate)}` : "KRW 환산: NO_DATA"}</span>
        </span>
      );
    }
    return <strong>{formatKrw(value)}</strong>;
  };

  const latestObserved = [syncTruth.korea.observedAt, syncTruth.us.observedAt, syncTruth.upbit.observedAt]
    .filter(Boolean)
    .join(" / ") || "동기화 전";

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: "BALANCES", label: "계좌 상태" },
    { id: "HOLDINGS", label: `검증 보유종목 (${positionFacts.length})` },
    { id: "TRADES", label: `체결기록 (${trades.length})` },
  ];

  const koreaState = resolveSessionBrokerState(koreaConfigured, syncTruth.korea);
  const usState = resolveSessionBrokerState(koreaConfigured, syncTruth.us);
  const upbitState = resolveSessionBrokerState(upbitConfigured, syncTruth.upbit);

  return (
    <section
      className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#050a12] text-slate-100 shadow-2xl"
      data-testid="real-broker-truth-panel"
    >
      <header className="border-b border-slate-800 bg-[#08111d] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-300">VERIFIED ACCOUNT VIEW</span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-300">DIRECT ORDER DISABLED</span>
            </div>
            <h2 className="mt-3 text-xl font-black">실계좌 잔고 · 보유종목</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">
              국내·미국·업비트를 각각 따로 검증합니다. 계좌 API의 현재가는 평가에 사용하지 않고, 별도 실시간 시세가 LIVE + VERIFIED일 때만 평가액을 계산합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsGovernanceOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800"
            >
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              안전상태 {blockedSymbolDetails.length > 0 ? `(${blockedSymbolDetails.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setIsApiConnectModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/15"
            >
              <Key className="h-4 w-4" />
              API 연결
            </button>
            <button
              type="button"
              onClick={() => void handleSync("all")}
              disabled={syncingBroker != null || (!koreaConfigured && !upbitConfigured)}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${syncingBroker === "all" ? "animate-spin" : ""}`} />
              계좌별 전체 검증
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span>이번 세션 검증 시각: <strong className="text-slate-300">{latestObserved}</strong></span>
          <span>•</span>
          <span>통합 상태: <strong className={allConfiguredReady ? "text-emerald-300" : "text-amber-300"}>{allConfiguredReady ? "READY" : "NO_DATA"}</strong></span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="검증 가용 예수금" value={formatKrw(verifiedCashTotal)} note="통화가 확인되지 않은 미국 현금은 합산하지 않음" />
          <MetricCard label="보유종목 평가액" value={formatKrw(holdingsSummary.valuation)} note="계좌별 READY + LIVE VERIFIED 현재가 + 필요한 환율이 모두 있어야 계산" />
          <MetricCard label="총 평가손익" value={formatKrw(holdingsSummary.pnl)} note={holdingsSummary.pnlRate == null ? "수익률: NO_DATA" : `수익률: ${formatPercent(holdingsSummary.pnlRate)}`} />
          <MetricCard label="통합 순자산" value={formatKrw(grandTotal)} note="부분 데이터로 총자산을 추정하지 않음" />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-300" />
            <span className="text-slate-400">USD/KRW 검증 환율</span>
            <strong className={fxRate == null ? "text-slate-600" : "text-emerald-300"}>{fxRate == null ? "NO_DATA" : `1 USD = ${formatKrw(fxRate)}`}</strong>
          </div>
          <span className="text-[10px] text-slate-600">출처: {fxRate != null && exchangeRateSource ? exchangeRateSource : "검증 공급자 미연결"}</span>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-[#07101b] px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-black ${activeTab === tab.id ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "BALANCES" && (
        <div className="p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-3">
            <BrokerCard
              title="한국투자증권 국내"
              subtitle={`계좌: ${maskAccount(profile?.koreaAccountNo)}`}
              state={koreaState}
              error={syncTruth.korea.state === "FAILED" ? syncTruth.korea.message : null}
              rows={[
                { label: "국내 가용 예수금", value: formatKrw(verifiedKoreaCash) },
                { label: "이번 세션 계좌 검증", value: syncTruth.korea.state },
              ]}
              syncLabel="국내 계좌 검증"
              syncing={syncingBroker === "korea" || syncingBroker === "all"}
              canSync={koreaConfigured}
              onSync={() => void handleSync("korea")}
            />

            <BrokerCard
              title="한국투자증권 미국"
              subtitle={`KIS 계좌: ${maskAccount(profile?.koreaAccountNo)}`}
              state={usState}
              error={syncTruth.us.state === "FAILED" ? syncTruth.us.message : null}
              rows={[
                { label: "US 현금", value: verifiedUsCashRaw == null ? "NO_DATA" : verifiedUsCashRaw.toLocaleString() },
                { label: "현금 통화단위", value: "NO_DATA" },
                { label: "이번 세션 계좌 검증", value: syncTruth.us.state },
                { label: "USD/KRW", value: fxRate == null ? "NO_DATA" : fxRate.toLocaleString() },
              ]}
              syncLabel="미국 계좌 검증"
              syncing={syncingBroker === "us" || syncingBroker === "all"}
              canSync={koreaConfigured}
              onSync={() => void handleSync("us")}
            />

            <BrokerCard
              title="업비트"
              subtitle={upbitConfigured ? "Open API 키 등록됨" : "API 미등록"}
              state={upbitState}
              error={syncTruth.upbit.state === "FAILED" ? syncTruth.upbit.message : null}
              rows={[
                { label: "원화 예수금", value: formatKrw(verifiedUpbitCash) },
                { label: "이번 세션 계좌 검증", value: syncTruth.upbit.state },
              ]}
              syncLabel="업비트 계좌 검증"
              syncing={syncingBroker === "upbit" || syncingBroker === "all"}
              canSync={upbitConfigured}
              onSync={() => void handleSync("upbit")}
            />
          </div>

          {!koreaConfigured && !upbitConfigured && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <Wallet className="mx-auto h-7 w-7 text-slate-600" />
              <div className="mt-3 text-sm font-black text-slate-300">연결된 실계좌가 없습니다.</div>
              <p className="mt-2 text-xs text-slate-600">API 연결 후 계좌별 검증을 실행해야 잔고 숫자가 표시됩니다.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "HOLDINGS" && (
        <div className="p-4 sm:p-5">
          {positionFacts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
              <Coins className="mx-auto h-7 w-7 text-slate-600" />
              <div className="mt-3 text-sm font-black text-slate-300">이번 세션에 검증된 보유종목이 없습니다.</div>
              <p className="mt-2 text-xs text-slate-600">이전 캐시나 추천 종목을 대신 표시하지 않습니다.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {positionFacts.map((fact) => {
                const { position } = fact;
                const dataComplete = fact.valuationKrw != null && fact.pnlKrw != null && fact.quote != null;
                return (
                  <article key={`${position.id}-${position.symbol}`} className="rounded-2xl border border-slate-800 bg-[#08111d] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-white">{position.name || position.symbol}</div>
                        <div className="mt-1 text-[10px] font-mono text-slate-500">{position.symbol} · {position.market}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${dataComplete ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
                        {dataComplete ? "LIVE VALUATION" : "NO_DATA"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">수량</div><strong>{formatQuantity(fact.quantity, position.market)}</strong></div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">평단</div>{formatPositionPrice(fact.avgPrice, position.market)}</div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">검증 현재가</div>{formatPositionPrice(fact.currentPrice, position.market)}</div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">평가액</div><strong>{formatKrw(fact.valuationKrw)}</strong></div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">평가손익</div><strong>{formatKrw(fact.pnlKrw)}</strong></div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">수익률</div><strong>{formatPercent(fact.pnlRate)}</strong></div>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-[10px] leading-5 text-slate-500">
                      시세 출처: {fact.quote?.provider || "NO_DATA"} / {fact.quote?.source || "NO_DATA"} / age {fact.quote?.ageMs == null ? "NO_DATA" : `${fact.quote.ageMs}ms`}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                      <div className="text-[10px] leading-5 text-slate-600">이 화면에서는 주문을 전송하지 않습니다. 거래는 Stock GPT 검토 단계에서 별도 확인합니다.</div>
                      {onSelectAssetForChart && (
                        <button
                          type="button"
                          onClick={() => onSelectAssetForChart(position.symbol, position.name, position.market)}
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/15"
                        >
                          <ChartCandlestick className="h-4 w-4" />
                          차트 보기
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "TRADES" && (
        <div className="p-4 sm:p-5">
          {trades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-slate-600" />
              <div className="mt-3 text-sm font-black text-slate-300">저장된 체결기록이 없습니다.</div>
              <p className="mt-2 text-xs text-slate-600">가짜 체결내역이나 AI 사유를 생성하지 않습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...trades].reverse().slice(0, 100).map((trade: TradeLog) => {
                const pnl = finiteNumber(trade.pnl);
                const pnlRate = finiteNumber(trade.pnlRate);
                const quantity = nonNegativeNumber(trade.quantity);
                const price = positiveNumber(trade.price);
                const verifiedBroker = trade.verificationStatus === "VERIFIED_BROKER" || trade.executionType === "REAL_BROKER";
                return (
                  <div key={trade.id} className="rounded-xl border border-slate-800 bg-[#08111d] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{trade.name || trade.symbol}</strong>
                          <span className="text-[10px] font-mono text-slate-500">{trade.symbol}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${trade.side === "BUY" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{trade.side}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${verifiedBroker ? "bg-cyan-500/10 text-cyan-300" : "bg-slate-900 text-slate-500"}`}>{verifiedBroker ? "BROKER VERIFIED" : "PENDING/LOCAL"}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-600">{trade.timestamp || "시간 NO_DATA"}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-black">{pnl == null ? "손익 NO_DATA" : formatKrw(pnl)}</div>
                        <div className="mt-1 text-[10px] text-slate-500">{pnlRate == null ? "수익률 NO_DATA" : formatPercent(pnlRate)}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">체결수량</div><strong>{quantity == null ? "NO_DATA" : formatQuantity(quantity, trade.market)}</strong></div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">체결단가</div><strong>{price == null ? "NO_DATA" : trade.market === "US" ? formatUsd(price) : formatKrw(price)}</strong></div>
                      <div className="rounded-lg bg-slate-950/70 p-3"><div className="text-[10px] text-slate-500">주문 ID</div><strong className="break-all text-[10px]">{trade.brokerOrderId || trade.id || "NO_DATA"}</strong></div>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs leading-5 text-slate-400">
                      <span className="font-black text-slate-300">기록된 판단 근거: </span>{trade.aiRationale?.trim() || "NO_DATA"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SmartSafetyGovernanceModal isOpen={isGovernanceOpen} onClose={() => setIsGovernanceOpen(false)} />
      <BrokerApiConnectModal isOpen={isApiConnectModalOpen} onClose={() => setIsApiConnectModalOpen(false)} />
    </section>
  );
};