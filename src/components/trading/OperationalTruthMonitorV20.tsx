import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";

type RuntimeTruth = {
  dataStatus?: string;
  connected?: boolean;
  oauth?: string;
  marketSession?: string;
  lastPrice?: number | null;
  orderableCash?: number | null;
  orderableQty?: number | null;
  liveEnvironmentProof?: {
    status?: string;
    blockers?: string[];
  };
  accountTruth?: {
    verified?: boolean;
    blockers?: string[];
  };
  blockers?: string[];
  safety?: {
    readOnly?: boolean;
    automaticOrderSubmission?: boolean;
    userConfirmationRequired?: boolean;
  };
  diagnostics?: {
    accountMessage?: string;
    probeErrors?: string[];
  };
  [key: string]: unknown;
};

function normalizeSymbol(value: unknown): string {
  if (typeof value === "string") return value.trim().toUpperCase();
  if (value && typeof value === "object" && "symbol" in value) {
    return String((value as { symbol?: unknown }).symbol || "").trim().toUpperCase();
  }
  return "";
}

function truthLabel(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "NO DATA";
}

function isRealtimeDataStatus(value: unknown): boolean {
  const text = String(value ?? "").trim().toUpperCase();
  return ["REALTIME", "REALTIME_VERIFIED", "LIVE", "HEALTHY", "READY"].includes(text);
}

export default function OperationalTruthMonitorV20() {
  const { selectedSymbol } = useApp() as any;
  const symbol = useMemo(() => normalizeSymbol(selectedSymbol) || "005930", [selectedSymbol]);
  const isKoreaSymbol = /^\d{6}$/.test(symbol);
  const [runtime, setRuntime] = useState<RuntimeTruth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isKoreaSymbol) {
      setRuntime(null);
      setError(null);
      setUpdatedAt(null);
      return;
    }

    let alive = true;
    let activeController: AbortController | null = null;

    const load = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      setLoading(true);

      try {
        const response = await fetch(`/api/broker/v21/runtime?symbol=${encodeURIComponent(symbol)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`BROKER_RUNTIME_HTTP_${response.status}`);

        const payload = (await response.json()) as RuntimeTruth;
        if (!alive || controller.signal.aborted) return;
        setRuntime(payload);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (cause: any) {
        if (cause?.name === "AbortError" || !alive) return;
        setRuntime(null);
        setError(cause?.message || "BROKER_RUNTIME_UNAVAILABLE");
        setUpdatedAt(Date.now());
      } finally {
        if (alive && activeController === controller) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 15000);

    return () => {
      alive = false;
      activeController?.abort();
      window.clearInterval(timer);
    };
  }, [isKoreaSymbol, symbol]);

  const readOnlyTruth = Boolean(
    runtime &&
      runtime.safety?.readOnly === true &&
      runtime.safety?.automaticOrderSubmission === false &&
      runtime.safety?.userConfirmationRequired === true,
  );
  const brokerConnected = runtime?.connected === true;
  const brokerProof = runtime?.liveEnvironmentProof?.status === "ESTABLISHED";
  const accountVerified = runtime?.accountTruth?.verified === true;
  const quoteVerified = isRealtimeDataStatus(runtime?.dataStatus) && Number(runtime?.lastPrice) > 0;
  const marketKnown = Boolean(runtime?.marketSession && runtime.marketSession !== "UNKNOWN");
  const evidenceReady = Boolean(
    readOnlyTruth && brokerConnected && brokerProof && accountVerified && quoteVerified && marketKnown,
  );

  const blockers = useMemo(() => {
    const items = new Set<string>();
    (runtime?.blockers || []).forEach((item) => items.add(String(item)));
    (runtime?.liveEnvironmentProof?.blockers || []).forEach((item) => items.add(String(item)));
    (runtime?.accountTruth?.blockers || []).forEach((item) => items.add(String(item)));
    (runtime?.diagnostics?.probeErrors || []).forEach((item) => items.add(String(item)));
    if (error) items.add(error);
    return Array.from(items).filter(Boolean).slice(0, 3);
  }, [runtime, error]);

  return (
    <section
      data-testid="operational-truth-monitor-v20"
      className="mx-2 mt-2 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 sm:mx-4"
      aria-label="운영 진실 모니터"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-slate-100">실계좌 읽기 전용 상태</strong>
          <span className="rounded-md border border-slate-700 px-2 py-0.5 font-mono">{symbol}</span>
          {!isKoreaSymbol ? (
            <span className="text-slate-500">국내 KIS 종목에서 확인</span>
          ) : loading && !runtime ? (
            <span className="text-cyan-300">확인 중...</span>
          ) : error ? (
            <span className="text-amber-300">연결 확인 필요</span>
          ) : evidenceReady ? (
            <span className="text-emerald-300">실계좌 증거 확인됨</span>
          ) : readOnlyTruth ? (
            <span className="text-amber-300">읽기 연결됨 · 증거 검증 대기</span>
          ) : (
            <span className="text-amber-300">검증 대기</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>자동 주문전송 없음</span>
          <span>·</span>
          <span>사용자 확인 필요</span>
          {updatedAt && <span>· 갱신 {new Date(updatedAt).toLocaleTimeString("ko-KR")}</span>}
        </div>
      </div>

      <div
        data-testid="operational-gate-state"
        className={`mt-2 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
          evidenceReady
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="min-w-0">
          <div className="font-black text-amber-300">
            🔒 안전 잠금 중 · 주문권한 현재: DRY_RUN
          </div>
          <div className={`mt-1 font-bold ${evidenceReady ? "text-emerald-300" : "text-amber-200"}`}>
            {evidenceReady
              ? "✅ KIS 읽기 증거 확인 완료 · 실제 주문 승인은 아직 별도 잠금"
              : "KIS 실계좌 증거 검증 대기 · 주문 전송 차단"}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            여기의 DRY_RUN은 <strong className="text-slate-300">자율 감시 엔진 모드가 아니라 주문 권한 잠금 상태</strong>를 뜻합니다.
            RUNNING/LIVE 감시는 켜져 있어도 주문 권한은 잠겨 있을 수 있습니다. 이중 승인 해제 시에만 실제 증권사 매수 주문이 실행됩니다.
          </div>
          {blockers.length > 0 && (
            <div className="mt-1 text-[10px] text-amber-200/80 break-words">
              확인할 것: {blockers.join(" · ")}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 text-[10px]">
          <span className={`rounded border px-2 py-0.5 ${brokerConnected ? "border-emerald-500/30 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
            BROKER {brokerConnected ? "연결" : "NO DATA"}
          </span>
          <span className={`rounded border px-2 py-0.5 ${brokerProof ? "border-emerald-500/30 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
            실계좌 증거 {brokerProof ? "확인" : "대기"}
          </span>
          <span className={`rounded border px-2 py-0.5 ${accountVerified ? "border-emerald-500/30 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
            계좌 {accountVerified ? "검증" : "대기"}
          </span>
          <span className={`rounded border px-2 py-0.5 ${quoteVerified ? "border-emerald-500/30 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
            시세 {truthLabel(runtime?.dataStatus)}
          </span>
          <span className={`rounded border px-2 py-0.5 ${marketKnown ? "border-emerald-500/30 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
            장 {truthLabel(runtime?.marketSession)}
          </span>
        </div>
      </div>
    </section>
  );
}
