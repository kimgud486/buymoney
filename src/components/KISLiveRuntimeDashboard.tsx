import React, { useCallback, useEffect, useMemo, useState } from "react";

type RuntimeStatus = "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
type MarketSession = "OPEN" | "CLOSED" | "UNKNOWN";

type RuntimePayload = {
  provider?: "KIS";
  mode?: "LIVE_ONLY";
  connected?: boolean;
  oauth?: "AUTHENTICATED" | "NOT_CONFIGURED" | "AUTH_FAILED";
  marketSession?: MarketSession;
  dataStatus?: RuntimeStatus;
  symbol?: string | null;
  lastPrice?: number | null;
  quoteAsOf?: string | null;
  quoteAgeMs?: number | null;
  accountAsOf?: string | null;
  accountAgeMs?: number | null;
  depositKRW?: number | null;
  totalEvalAmt?: number | null;
  orderableCash?: number | null;
  orderableQty?: number | null;
  requiresUserConfirmation?: boolean;
  canSubmitOrder?: boolean;
  blockers?: string[];
  liveEnvironmentProof?: {
    status?: "ESTABLISHED" | "PROOF_NOT_ESTABLISHED";
    checkedAt?: string;
    symbol?: string | null;
    evidence?: {
      brokerConfigured?: boolean;
      oauthAuthenticated?: boolean;
      accountQuerySucceeded?: boolean;
      quoteQuerySucceeded?: boolean;
      marketOpen?: boolean;
      realtimeQuoteVerified?: boolean;
      accountFresh?: boolean;
      exactOrderabilityVerified?: boolean;
    };
    quoteAsOf?: string | null;
    accountAsOf?: string | null;
    blockers?: string[];
  };
  orderReadiness?: {
    ready?: boolean;
    blockers?: string[];
    warnings?: string[];
  } | null;
};

function formatWon(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "-";
  return `${Math.round(Number(value)).toLocaleString("ko-KR")}원`;
}

function formatAge(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "-";
  const ms = Math.max(0, Number(value));
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function badgeClass(ok: boolean) {
  return ok
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
}

function ProofEvidence({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${badgeClass(ok)}`}>
      <div className="text-[9px] font-semibold opacity-70">{label}</div>
      <div className="mt-0.5 text-[10px] font-black">{ok ? "VERIFIED" : "MISSING"}</div>
    </div>
  );
}

export function KISLiveRuntimeDashboard() {
  const [symbol, setSymbol] = useState("005930");
  const [payload, setPayload] = useState<RuntimePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const normalizedSymbol = useMemo(() => symbol.replace(/\D/g, "").slice(0, 6), [symbol]);

  const refresh = useCallback(async () => {
    if (!/^\d{6}$/.test(normalizedSymbol)) {
      setError("국내주식 종목코드 6자리를 입력하세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/broker/v21/runtime?symbol=${encodeURIComponent(normalizedSymbol)}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) {
        throw new Error(body?.message || body?.error || `runtime endpoint ${response.status}`);
      }
      setPayload(body);
      setLastCheckedAt(new Date().toISOString());
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "KIS 런타임 상태 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [normalizedSymbol]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const blockers = Array.from(new Set([
    ...(payload?.blockers ?? []),
    ...(payload?.orderReadiness?.blockers ?? []),
  ]));
  const proofBlockers = Array.from(new Set(payload?.liveEnvironmentProof?.blockers ?? []));
  const warnings = Array.from(new Set(payload?.orderReadiness?.warnings ?? []));
  const ready = Boolean(payload?.orderReadiness?.ready || payload?.requiresUserConfirmation);
  const connected = Boolean(payload?.connected);
  const quoteFresh = payload?.dataStatus === "REALTIME_VERIFIED" && Number(payload?.quoteAgeMs) <= 30_000;
  const accountFresh = Number.isFinite(Number(payload?.accountAgeMs)) && Number(payload?.accountAgeMs) <= 30_000;
  const proofEstablished = payload?.liveEnvironmentProof?.status === "ESTABLISHED";
  const evidence = payload?.liveEnvironmentProof?.evidence;

  const tiles = [
    ["KIS", connected ? "CONNECTED" : "DISCONNECTED", connected],
    ["OAuth", payload?.oauth ?? "UNKNOWN", payload?.oauth === "AUTHENTICATED"],
    ["Market", payload?.marketSession ?? "UNKNOWN", payload?.marketSession === "OPEN"],
    ["Data", payload?.dataStatus ?? "NO_DATA", quoteFresh],
  ] as const;

  return (
    <section className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">KIS LIVE RUNTIME</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">LIVE ONLY</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${badgeClass(proofEstablished)}`}>
              ENV PROOF: {proofEstablished ? "ESTABLISHED" : "NOT ESTABLISHED"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">실계좌 연결과 시세·계좌 freshness를 읽기 전용으로 검증합니다. 자동주문은 전송하지 않습니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            inputMode="numeric"
            aria-label="KIS 국내주식 종목코드"
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-slate-500"
            placeholder="005930"
          />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {loading ? "CHECKING" : "REFRESH"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map(([label, value, ok]) => (
          <div key={label} className={`rounded-xl border p-3 ${badgeClass(ok)}`}>
            <div className="text-[10px] font-semibold opacity-70">{label}</div>
            <div className="mt-1 text-sm font-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className={`rounded-xl border p-3 ${badgeClass(quoteFresh)}`}>
          <div className="text-[10px] font-semibold opacity-70">QUOTE AGE</div>
          <div className="mt-1 text-sm font-black">{formatAge(payload?.quoteAgeMs)}</div>
        </div>
        <div className={`rounded-xl border p-3 ${badgeClass(accountFresh)}`}>
          <div className="text-[10px] font-semibold opacity-70">ACCOUNT AGE</div>
          <div className="mt-1 text-sm font-black">{formatAge(payload?.accountAgeMs)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-semibold text-slate-500">ORDERABLE CASH</div>
          <div className="mt-1 text-sm font-black text-slate-900">{formatWon(payload?.orderableCash)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] font-semibold text-slate-500">ORDERABLE QTY</div>
          <div className="mt-1 text-sm font-black text-slate-900">{Number.isFinite(Number(payload?.orderableQty)) ? `${Number(payload?.orderableQty).toLocaleString("ko-KR")}주` : "-"}</div>
        </div>
      </div>

      <div className={`mt-3 rounded-xl border p-3 ${badgeClass(proofEstablished)}`}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold opacity-70">LIVE ENVIRONMENT PROOF</div>
            <div className="mt-1 text-base font-black">{proofEstablished ? "ESTABLISHED" : "PROOF_NOT_ESTABLISHED"}</div>
            <div className="mt-1 text-[10px] font-semibold opacity-70">
              {payload?.liveEnvironmentProof?.checkedAt
                ? `Checked ${new Date(payload.liveEnvironmentProof.checkedAt).toLocaleString("ko-KR")}`
                : "실제 KIS 증거 응답 대기중"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-8">
            <ProofEvidence label="CONFIG" ok={Boolean(evidence?.brokerConfigured)} />
            <ProofEvidence label="OAUTH" ok={Boolean(evidence?.oauthAuthenticated)} />
            <ProofEvidence label="ACCOUNT" ok={Boolean(evidence?.accountQuerySucceeded)} />
            <ProofEvidence label="QUOTE" ok={Boolean(evidence?.quoteQuerySucceeded)} />
            <ProofEvidence label="MARKET" ok={Boolean(evidence?.marketOpen)} />
            <ProofEvidence label="FRESH QUOTE" ok={Boolean(evidence?.realtimeQuoteVerified)} />
            <ProofEvidence label="FRESH ACCT" ok={Boolean(evidence?.accountFresh)} />
            <ProofEvidence label="ORDERABLE" ok={Boolean(evidence?.exactOrderabilityVerified)} />
          </div>
        </div>
        {!proofEstablished && proofBlockers.length > 0 && (
          <ul className="mt-3 space-y-1 text-[11px] font-semibold">
            {proofBlockers.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold text-slate-500">CURRENT QUOTE</div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {payload?.symbol ?? normalizedSymbol} · {formatWon(payload?.lastPrice)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Quote {payload?.quoteAsOf ? new Date(payload.quoteAsOf).toLocaleTimeString("ko-KR") : "-"} · Account {payload?.accountAsOf ? new Date(payload.accountAsOf).toLocaleTimeString("ko-KR") : "-"}
          </div>
        </div>

        <div className={`rounded-xl border px-4 py-3 text-center ${badgeClass(ready)}`}>
          <div className="text-[10px] font-bold opacity-70">ORDER PREFLIGHT</div>
          <div className="mt-1 text-base font-black">{ready ? "READY FOR USER CONFIRMATION" : "BLOCKED"}</div>
          <div className="mt-1 text-[10px] font-semibold">ORDER SUBMIT: {payload?.canSubmitOrder === false ? "DISABLED" : "NOT AVAILABLE"}</div>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>
      )}

      {blockers.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-black text-amber-800">BLOCKED REASONS</div>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {blockers.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          {warnings.map((warning) => <div key={warning}>• {warning}</div>)}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span>15초 자동 갱신 · fail-closed · read-only proof</span>
        <span>{lastCheckedAt ? `Last check ${new Date(lastCheckedAt).toLocaleTimeString("ko-KR")}` : "Not checked"}</span>
      </div>
    </section>
  );
}
