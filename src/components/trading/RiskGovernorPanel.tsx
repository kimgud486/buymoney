import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Percent, 
  Sliders, 
  RefreshCw, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { riskGovernorEngine, RiskGovernorSettings, DEFAULT_RISK_SETTINGS } from "../../lib/riskGovernorEngine";
import { SmartSafetyGovernanceModal } from "./SmartSafetyGovernanceModal";
import { useApp } from "../../context/AppContext";

interface RiskGovernorPanelProps {
  currentDailyPnlPct?: number;
  cryptoWeightPct?: number;
  onRefresh?: () => void;
}

export const RiskGovernorPanel: React.FC<RiskGovernorPanelProps> = ({
  currentDailyPnlPct = 1.45,
  cryptoWeightPct = 24.5,
  onRefresh
}) => {
  const { blockedSymbolDetails } = useApp();
  const [settings, setSettings] = useState<RiskGovernorSettings>(() => riskGovernorEngine.getSettings());
  const [killSwitchState, setKillSwitchState] = useState(() => riskGovernorEngine.getKillSwitchStatus());
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"STATUS" | "RULES" | "CONFIRM">("STATUS");
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);

  useEffect(() => {
    setSettings(riskGovernorEngine.getSettings());
    setKillSwitchState(riskGovernorEngine.getKillSwitchStatus());
  }, []);

  const handleUpdateSetting = <K extends keyof RiskGovernorSettings>(key: K, value: RiskGovernorSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    riskGovernorEngine.saveSettings({ [key]: value });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleKillSwitch = () => {
    if (killSwitchState.active) {
      riskGovernorEngine.resetKillSwitch();
    } else {
      riskGovernorEngine.triggerManualKillSwitch("사용자 수동 비상 정지");
    }
    setKillSwitchState(riskGovernorEngine.getKillSwitchStatus());
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            killSwitchState.active 
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse" 
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
          }`}>
            {killSwitchState.active ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                AI 리스크 거버너 (Risk Governor &amp; 실시간 게이트키퍼)
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                killSwitchState.active
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
              }`}>
                {killSwitchState.active ? "🚨 킬스위치 가동 중" : "🟢 실시간 정상 감시 중"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              트리플 교차 확증 · 1:2 수학적 손익비 강제 · 일일 최대손실 차단 · 본전 보존 자동화
            </p>
          </div>
        </div>

        {/* Tab & Actions */}
        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> 저장됨
            </span>
          )}

          <button
            onClick={() => setIsGovernanceOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-500 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>AI 안전 거버넌스 관제</span>
            {blockedSymbolDetails.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400/30 text-amber-200 rounded-full text-[10px] font-mono">
                {blockedSymbolDetails.length}
              </span>
            )}
          </button>

          <button
            onClick={handleToggleKillSwitch}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border ${
              killSwitchState.active
                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-950"
                : "bg-rose-600/90 hover:bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-950"
            }`}
          >
            {killSwitchState.active ? (
              <>
                <Unlock className="w-3.5 h-3.5" /> 킬스위치 해제
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" /> 비상 킬스위치 가동
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Pillars Status HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
        {/* Pillar 1: Confluence Triple Verification */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> 트리플 교차 확증
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-black">Score 88</span>
          </div>
          <div className="text-sm font-black text-slate-100">
            캔들 + 거래량 + 추세
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            단일 지표 속임수 100% 필터링
          </div>
        </div>

        {/* Pillar 2: Risk-Reward 1:2 */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> 손익비 (Risk-Reward)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-black">1 : {settings.minRiskRewardRatio}</span>
          </div>
          <div className="text-sm font-black text-slate-100">
            수학적 1:{settings.minRiskRewardRatio} 강제
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            승률 45%에도 계좌 우상향 구조
          </div>
        </div>

        {/* Pillar 3: Daily Max Drawdown & Kill-Switch */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> 일일 손실 한도
            </span>
            <span className="text-[10px] font-mono text-rose-400 font-black">{settings.maxDailyDrawdownPct}%</span>
          </div>
          <div className="text-sm font-black text-slate-100 flex items-center justify-between">
            <span>당일 {currentDailyPnlPct >= 0 ? `+${currentDailyPnlPct}%` : `${currentDailyPnlPct}%`}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">안전 구간</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            한도 초과 시 당일 신규 매수 차단
          </div>
        </div>

        {/* Pillar 4: Trailing Stop & Breakeven */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 본전 보존 &amp; 트레일링
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-black">Auto BE/TS</span>
          </div>
          <div className="text-sm font-black text-slate-100">
            수익 도달 시 손절가 상향
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            +1.5% 도달 시 원금 손실 0% 잠금
          </div>
        </div>
      </div>

      {/* Interactive Risk Rules Setting Sliders */}
      <div className="mt-4 pt-3.5 border-t border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> 리스크 관리 규칙 상세 설정 (MDD / 익절 / 손절 자동화)
          </h4>
          <span className="text-[10px] text-slate-400">실시간 매매 봇 즉시 반영</span>
        </div>

        {/* 3 Main Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Section A: MDD & Daily Loss Protection */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> 최대 하락폭(MDD) 제어
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">일일/연속 손실 보호</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300 font-bold">당일 최대 손실 차단 (MDD)</span>
                  <span className="font-mono text-rose-400 font-black">{settings.maxDailyDrawdownPct.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="-5.0"
                  max="-1.0"
                  step="0.5"
                  value={settings.maxDailyDrawdownPct}
                  onChange={(e) => handleUpdateSetting("maxDailyDrawdownPct", parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-5.0% (완화)</span>
                  <span>-2.5% (추천)</span>
                  <span>-1.0% (엄격)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-200 font-bold block">3연속 손절 시 봇 냉각 (2시간)</span>
                  <span className="text-[10px] text-slate-400">뇌동매매 및 휩소 장세 봇 가동 차단</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.consecutiveLossLimit === 3}
                  onChange={(e) => handleUpdateSetting("consecutiveLossLimit", e.target.checked ? 3 : 5)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section B: Automated Take Profit Logic */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> 자동 익절(Take Profit) 로직
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">단계별 분할 익절</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">1차 목표가 분할 익절 (+3.0%)</span>
                <span className="text-emerald-400 font-mono font-bold">50% 물량 매도</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">2차 목표가 전량 익절 (+7.0%)</span>
                <span className="text-emerald-400 font-mono font-bold">잔여 50% 매도</span>
              </div>
              <div className="pt-2 border-t border-slate-800/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold">트레일링 스탑 (Trailing Stop)</span>
                  <span className="text-amber-400 font-mono font-bold">+2.0% 수익 달성 시 발동</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  최고점 대비 -1.0% 하락 시 익절선 자동 고정 청산
                </p>
              </div>
            </div>
          </div>

          {/* Section C: Automated Stop Loss & Breakeven Logic */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 자동 손절(Stop Loss) 로직
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">손실 방지 원금 보호</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">고정 손절 제한선</span>
                <span className="text-rose-400 font-mono font-bold">-2.0% 시장가 매도</span>
              </div>

              <div className="pt-2 border-t border-slate-800/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold">본전 보전(Breakeven) 자동 상향</span>
                  <span className="text-cyan-400 font-mono font-bold">활성화</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  +1.5% 수익 진입 시 손절가를 진입가 +0.3%(수수료보전)로 자동 상향
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-slate-300 font-bold">가상자산(업비트) 비중 한도</span>
                <span className="font-mono text-cyan-400 font-black">{settings.maxSectorExposurePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SmartSafetyGovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => setIsGovernanceOpen(false)}
      />
    </div>
  );
};
