import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, ShieldAlert, ShieldCheck, Sliders, Unlock } from "lucide-react";
import { riskGovernorEngine, RiskGovernorSettings } from "../../lib/riskGovernorEngine";
import { SmartSafetyGovernanceModal } from "./SmartSafetyGovernanceModal";
import { useApp } from "../../context/AppContext";

interface RiskGovernorPanelProps {
  currentDailyPnlPct?: number | null;
  cryptoWeightPct?: number | null;
  onRefresh?: () => void;
}

export const RiskGovernorPanel: React.FC<RiskGovernorPanelProps> = ({
  currentDailyPnlPct = null,
  cryptoWeightPct = null,
  onRefresh
}) => {
  const { blockedSymbolDetails = [], isKillSwitchActive } = useApp() as any;
  const [settings, setSettings] = useState<RiskGovernorSettings>(() => riskGovernorEngine.getSettings());
  const [killSwitchState, setKillSwitchState] = useState(() => riskGovernorEngine.getKillSwitchStatus());
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    setSettings(riskGovernorEngine.getSettings());
    setKillSwitchState(riskGovernorEngine.getKillSwitchStatus());
  }, [isKillSwitchActive]);

  const updateSetting = <K extends keyof RiskGovernorSettings>(key: K, value: RiskGovernorSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    riskGovernorEngine.saveSettings({ [key]: value });
    setSavedKey(String(key));
    window.setTimeout(() => setSavedKey(null), 1200);
  };

  const toggleKillSwitch = () => {
    if (killSwitchState.active) riskGovernorEngine.resetKillSwitch();
    else riskGovernorEngine.triggerManualKillSwitch("사용자 수동 비상 정지");
    setKillSwitchState(riskGovernorEngine.getKillSwitchStatus());
    onRefresh?.();
  };

  const hasDailyPnl = typeof currentDailyPnlPct === "number" && Number.isFinite(currentDailyPnlPct);
  const hasCryptoWeight = typeof cryptoWeightPct === "number" && Number.isFinite(cryptoWeightPct);
  const dailyLossLimit = Number(settings.maxDailyDrawdownPct);
  const breached = hasDailyPnl && currentDailyPnlPct! <= dailyLossLimit;
  const gateOpen = !killSwitchState.active && !breached;

  return (
    <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-xl border p-2 ${gateOpen ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
            {gateOpen ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black">Risk Gate · TRUTH MODE</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${gateOpen ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-rose-500/40 bg-rose-500/10 text-rose-300"}`}>
                {gateOpen ? "ORDER ALLOWED" : "ORDER BLOCKED"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">실제 값이 전달되지 않으면 고정 숫자를 만들지 않고 -- 로 표시합니다.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsGovernanceOpen(true)} className="rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-200">
            안전 거버넌스 {blockedSymbolDetails.length > 0 ? `(${blockedSymbolDetails.length})` : ""}
          </button>
          <button onClick={toggleKillSwitch} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black text-white ${killSwitchState.active ? "bg-emerald-600" : "bg-rose-600"}`}>
            {killSwitchState.active ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {killSwitchState.active ? "킬스위치 해제" : "비상 정지"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard label="당일 손익률" value={hasDailyPnl ? `${currentDailyPnlPct! >= 0 ? "+" : ""}${currentDailyPnlPct!.toFixed(2)}%` : "--"} detail={hasDailyPnl ? "상위 계좌/손익 데이터에서 전달됨" : "실데이터 미전달"} good={hasDailyPnl && !breached} />
        <StatusCard label="일일 손실 한도" value={`${dailyLossLimit.toFixed(1)}%`} detail={breached ? "한도 도달, 신규 주문 차단" : "설정값"} good={!breached} />
        <StatusCard label="최소 손익비" value={`1 : ${Number(settings.minRiskRewardRatio).toFixed(1)}`} detail="Risk Governor 설정값" good={true} />
        <StatusCard label="코인 비중" value={hasCryptoWeight ? `${cryptoWeightPct!.toFixed(1)}%` : "--"} detail={hasCryptoWeight ? "실제 포트폴리오 비중" : "실데이터 미전달"} good={hasCryptoWeight} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-300"><Sliders className="h-3.5 w-3.5 text-cyan-400" /> 리스크 규칙</h4>
          {savedKey && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle2 className="h-3 w-3" /> 저장됨</span>}
        </div>

        <RangeRow
          label="당일 최대 손실 차단"
          value={Number(settings.maxDailyDrawdownPct)}
          min={-5}
          max={-1}
          step={0.5}
          suffix="%"
          onChange={(v) => updateSetting("maxDailyDrawdownPct", v as any)}
        />
        <RangeRow
          label="최소 손익비"
          value={Number(settings.minRiskRewardRatio)}
          min={1}
          max={5}
          step={0.5}
          suffix=""
          onChange={(v) => updateSetting("minRiskRewardRatio", v as any)}
        />
      </div>

      {!hasDailyPnl && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>현재 `currentDailyPnlPct`가 연결되지 않았습니다. 이전처럼 +1.45% 같은 기본값을 표시하지 않습니다. LIVE 주문 차단 판단에는 실제 계좌 손익률을 연결해야 합니다.</div>
        </div>
      )}

      <SmartSafetyGovernanceModal isOpen={isGovernanceOpen} onClose={() => setIsGovernanceOpen(false)} />
    </section>
  );
};

const StatusCard: React.FC<{ label: string; value: string; detail: string; good: boolean }> = ({ label, value, detail, good }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      {good ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
    </div>
    <div className="mt-1 text-sm font-black text-white">{value}</div>
    <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
  </div>
);

const RangeRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, suffix, onChange }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-bold text-slate-300">{label}</span>
      <span className="font-mono font-black text-cyan-300">{value.toFixed(1)}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-500" />
  </div>
);
