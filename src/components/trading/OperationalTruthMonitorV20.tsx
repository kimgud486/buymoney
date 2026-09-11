import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";

type RuntimeTruth = {
  dataStatus?: string;
  brokerConfigured?: boolean;
  oauthAuthenticated?: boolean;
  accountVerified?: boolean;
  quoteVerified?: boolean;
  liveEnvironmentProof?: boolean;
  marketSession?: string;
  lastPrice?: number | null;
  orderableCash?: number | null;
  orderableQty?: number | null;
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

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/broker/v21/runtime?symbol=${encodeURIComponent(symbol)}`, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`BROKER_RUNTIME_HTTP_${response.status}`);
        }

        const payload = (await response.json()) as RuntimeTruth;
        if (!controller.signal.aborted) {
          setRuntime(payload);
          setError(null);
          setUpdatedAt(Date.now());
        }
      } catch (cause: any) {
        if (cause?.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setRuntime(null);
          setError(cause?.message || "BROKER_RUNTIME_UNAVAILABLE");
          setUpdatedAt(Date.now());
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(load, 15000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [isKoreaSymbol, symbol]);

  const truthReady = Boolean(
    runtime &&
      runtime.safety?.readOnly === true &&
      runtime.safety?.automaticOrderSubmission === false &&
      runtime.safety?.userConfirmationRequired === true,
  );

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
          ) : truthReady ? (
            <span className="text-emerald-300">READ ONLY 확인됨</span>
          ) : (
            <span className="text-amber-300">검증 대기</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>주문전송 없음</span>
          <span>·</span>
          <span>사용자 확인 필요</span>
          {updatedAt && <span>· 갱신 {new Date(updatedAt).toLocaleTimeString()}</span>}
        </div>
      </div>
    </section>
  );
}
