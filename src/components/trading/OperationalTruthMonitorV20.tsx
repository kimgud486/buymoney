import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, CircleDollarSign, Database, Radio, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { v11ExecutionEngine } from "../AistockV11ExecutionConsole";
import { buildOperationalTruthViewModelV20 } from "../../monitoring/OperationalTruthViewModelV20";

type KisRuntimeResponse = {
  connected?: boolean;
  dataStatus?: string;
  blockers?: string[];
  holdings?: Array<{ symbol?: string; qty?: number; avgPrice?: number; currentPrice?: number; evalAmt?: number; pnlPct?: number }>;
  liveEnvironmentProof?: { status?: string };
  accountAgeMs?: number | null;
  quoteAgeMs?: number | null;
};

const money = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString()}원`;
function brokerUnrealized(holdings: KisRuntimeResponse["holdings"]): number {
  return (holdings || []).reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const avg = Number(item.avgPrice) || 0;
    const current = Number(item.currentPrice) || 0;
    if (qty <= 0 || avg <= 0 || current <= 0) return sum;
    return sum + (current - avg) * qty;
  }, 0);
}

export const OperationalTruthMonitorV20: React.FC = () => {
  const { selectedSymbol: rawSelectedSymbol = "005930" } = useApp() as any;
  const selectedSymbol = typeof rawSelectedSymbol === "string" ? rawSelectedSymbol : String(rawSelectedSymbol?.symbol || "005930");
  const isKoreaSymbol = /^\d{6}$/.test(selectedSymbol);
  const [engineStatus, setEngineStatus] = useState<any>(() => v11ExecutionEngine.getStatus());
  const [kis, setKis] = useState<KisRuntimeResponse | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => v11ExecutionEngine.subscribe((status) => setEngineStatus(status)), []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const load = async () => {
      if (!isKoreaSymbol) { setKis(null); setFetchError(null); return; }
      try {
        const response = await fetch(`/api/broker/v21/runtime?symbol=${encodeURIComponent(selectedSymbol)}`, { headers: { "cache-control": "no-cache" } });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const payload = await response.json();
        if (!active) return;
        setKis(payload); setLastFetchAt(Date.now()); setFetchError(null);
      } catch (error: any) {
        if (!active) return;
        setFetchError(String(error?.message || "BROKER_RUNTIME_FETCH_FAILED"));
      }
    };
    void load();
    timer = setInterval(() => void load(), 5000);
    return () => { active = false; if (timer) clearInterval(timer); };
  }, [isKoreaSymbol, selectedSymbol]);

  const view = useMemo(() => {
    const risk = engineStatus?.riskMetrics || {};
    return buildOperationalTruthViewModelV20({
      engineRunning: Boolean(engineStatus?.isEngineRunning),
      mode: String(engineStatus?.mode || "DRY_RUN"),
      liveTradingEnabled: Boolean(engineStatus?.liveTradingEnabled),
      killSwitchActive: Boolean(risk.killSwitchActive),
      executionState: String(engineStatus?.stateMachine?.currentState || "NO_TRADE"),
      dailyRealizedPnLKRW: Number(risk.dailyRealizedPnLKRW) || 0,
      activeUnrealizedPnLKRW: Number(engineStatus?.activePosition?.unrealizedPnLAmt) || 0,
      brokerConnected: Boolean(kis?.connected),
      brokerDataStatus: String(kis?.dataStatus || "NO_DATA"),
      brokerProofStatus: String(kis?.liveEnvironmentProof?.status || "PROOF_NOT_ESTABLISHED"),
      brokerBlockers: Array.isArray(kis?.blockers) ? kis!.blockers! : [],
      brokerHoldingsUnrealizedPnLKRW: brokerUnrealized(kis?.holdings)
    });
  }, [engineStatus, kis]);

  const gateTone = view.gateState === "READY" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : view.gateState === "TEST_ONLY" ? "bg-cyan-100 text-cyan-800 border-cyan-300" : "bg-rose-100 text-rose-800 border-rose-300";

  return <section data-testid="operational-truth-monitor-v20" className="mx-auto w-full max-w-[1920px] px-2 pt-2" aria-label="실거래 운영 진실 모니터">
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2"><span className="rounded-xl bg-slate-950 p-2 text-cyan-300"><Radio className="h-4 w-4" /></span><div><div className="flex items-center gap-2 flex-wrap"><h2 className="text-sm font-black text-zinc-900">운영 진실 모니터 V20</h2><span data-testid="operational-gate-state" className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${gateTone}`}>{view.gateLabel}</span></div><p className="text-[10px] text-zinc-500">주문상태 · Risk Gate · KIS 실계좌 truth · 오늘 손익을 같은 화면에서 확인</p></div></div>
        <div className="text-[10px] text-zinc-500">{isKoreaSymbol ? fetchError ? `KIS 조회 오류: ${fetchError}` : lastFetchAt ? `KIS 확인 ${new Date(lastFetchAt).toLocaleTimeString("ko-KR")}` : "KIS 확인 중" : "해외/업비트 선택 중: KIS 국내 실계좌 proof는 적용 안 됨"}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <TruthCard icon={<Activity className="h-3.5 w-3.5" />} label="Execution State" value={view.executionLabel} sub={view.executionState} />
        <TruthCard icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Risk Gate" value={view.riskGateLabel} sub={engineStatus?.riskMetrics?.killSwitchActive ? "킬스위치 작동" : "안전조건 검사"} />
        <TruthCard icon={<Database className="h-3.5 w-3.5" />} label="KIS Broker" value={isKoreaSymbol ? view.brokerLabel : "N/A"} sub={isKoreaSymbol ? view.dataLabel : "국내종목 선택 시 확인"} />
        <TruthCard icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="LIVE Proof" value={isKoreaSymbol ? String(kis?.liveEnvironmentProof?.status || "미확인") : "N/A"} sub={isKoreaSymbol ? `시세 ${kis?.quoteAgeMs ?? "-"}ms · 계좌 ${kis?.accountAgeMs ?? "-"}ms` : "KIS 전용"} />
        <TruthCard icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="오늘 실현손익" value={money(view.todayRealizedPnLKRW)} sub="ENGINE 체결기준" />
        <TruthCard icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="현재 평가손익" value={isKoreaSymbol ? money(view.brokerUnrealizedPnLKRW) : "N/A"} sub="BROKER 보유잔고 기준" />
        <TruthCard icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="합산 참고값" value={isKoreaSymbol ? money(view.todayCombinedPnLKRW) : money(view.todayRealizedPnLKRW)} sub={view.sourceLabel} />
      </div>
      {(view.blockers.length > 0 || fetchError) && <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"><summary className="cursor-pointer text-[11px] font-black text-amber-900 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> 차단/주의 사유 보기 ({view.blockers.length + (fetchError ? 1 : 0)})</summary><div className="mt-2 flex flex-wrap gap-1.5">{view.blockers.slice(0,12).map((item)=><span key={item} className="rounded bg-white px-2 py-1 text-[10px] font-bold text-amber-900 border border-amber-200">{item}</span>)}{fetchError && <span className="rounded bg-white px-2 py-1 text-[10px] font-bold text-rose-700 border border-rose-200">{fetchError}</span>}</div></details>}
    </div>
  </section>;
};

const TruthCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string }> = ({ icon, label, value, sub }) => <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5"><div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">{icon}<span>{label}</span></div><div className="mt-1 truncate text-xs font-black text-zinc-900">{value}</div><div className="mt-0.5 truncate text-[9px] text-zinc-500">{sub}</div></div>;
export default OperationalTruthMonitorV20;
