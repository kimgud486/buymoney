import React, { useState, useEffect } from "react";
import { 
  Clock, 
  ShieldAlert, 
  Zap, 
  Activity, 
  Flame, 
  Lock, 
  Unlock,
  Radio, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2,
  AlertTriangle,
  Bell,
  Coins,
  Building2,
  Key,
  Play,
  Pause,
  Sparkles
} from "lucide-react";
import { getMarketStatus, getExecutionPhase, MarketStatus, ExecutionPhaseInfo } from "../../lib/marketHours";
import { useApp } from "../../context/AppContext";
import { SmartSafetyGovernanceModal } from "./SmartSafetyGovernanceModal";

interface TopMarketHoursLiveWidgetProps {
  isRealTradingMode: boolean;
  onToggleRealTradingMode?: () => void;
  onSetRealTradingMode?: (isReal: boolean) => void;
  onOpenThresholdModal: () => void;
  onOpenApiConnectModal: () => void;
  onOpenPipelineHubModal?: () => void;
  alertCount?: number;
  isAutoTradingActive?: boolean;
  onToggleAutoTrading?: () => void;
}

export const TopMarketHoursLiveWidget: React.FC<TopMarketHoursLiveWidgetProps> = ({
  isRealTradingMode,
  onToggleRealTradingMode,
  onSetRealTradingMode,
  onOpenThresholdModal,
  onOpenApiConnectModal,
  onOpenPipelineHubModal,
  alertCount = 0,
  isAutoTradingActive = true,
  onToggleAutoTrading
}) => {
  const { profile, updateProfileSettings, addToast, isKillSwitchActive, toggleKillSwitch, safetyMode } = useApp();
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);
  const isProfitOptActive = profile?.aiProfitOptimization ?? true;

  const handleToggleProfitOpt = () => {
    const nextState = !isProfitOptActive;
    updateProfileSettings({
      aiProfitOptimization: nextState,
      aiAggressivenessLevel: nextState ? "DYNAMIC" : "BALANCED"
    });
    addToast({
      type: nextState ? "SUCCESS" : "INFO",
      title: nextState ? "✨ [AI Profit Optimization ACTIVE]" : "⚖️ [AI Strategy: BALANCED]",
      message: nextState
        ? "변동성 및 실시간 유동성에 따라 손익비(R:R 1:3.2 이상)와 트레일링 스탑이 동적으로 승율을 최적화합니다."
        : "기본 균형 손익비(R:R 1:1.5) 모드로 전환되었습니다."
    });
  };
  const [koreaStatus, setKoreaStatus] = useState<MarketStatus>(() => getMarketStatus('KOREA'));
  const [usStatus, setUsStatus] = useState<MarketStatus>(() => getMarketStatus('US'));
  const [koreaPhase, setKoreaPhase] = useState<ExecutionPhaseInfo>(() => getExecutionPhase('KOREA'));
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>("");
  const [kstTimeStr, setKstTimeStr] = useState<string>("");

  // Real accounts connection status
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTossKey = Boolean(typeof window !== "undefined" && localStorage.getItem("toss_api_key"));
  const isAnyRealConnected = hasKoreaKey || hasUpbitKey || hasTossKey;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const status = getMarketStatus('KOREA', now);
      const uStatus = getMarketStatus('US', now);
      const phase = getExecutionPhase('KOREA', now);
      setKoreaStatus(status);
      setUsStatus(uStatus);
      setKoreaPhase(phase);

      // KST Time formatted
      const kstStr = now.toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      setKstTimeStr(kstStr);

      // Calculate countdown to market close (15:30 KST) or market open (09:00 KST)
      const kstFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      });
      const parts = kstFormatter.formatToParts(now);
      const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
      const second = parseInt(parts.find(p => p.type === "second")?.value || "0", 10);

      const totalSec = hour * 3600 + minute * 60 + second;
      const marketOpenSec = 9 * 3600; // 09:00:00
      const marketCloseSec = 15 * 3600 + 30 * 60; // 15:30:00

      if (totalSec >= marketOpenSec && totalSec < marketCloseSec) {
        const remaining = marketCloseSec - totalSec;
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = remaining % 60;
        setTimeRemainingStr(`정규장 마감까지 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else if (totalSec < marketOpenSec) {
        const remaining = marketOpenSec - totalSec;
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = remaining % 60;
        setTimeRemainingStr(`장 시작까지 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else {
        setTimeRemainingStr("정규장 마감 (시간외 종가/단일가 거래)");
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-950 text-slate-200 border-b border-slate-800/80 px-3 sm:px-4 py-1.5 select-none shadow-xs text-xs font-sans">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
        {/* Section 1: Market Clock & Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-bold text-[11px] text-slate-200 whitespace-nowrap">
              KST {kstTimeStr || "09:30:00"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px]">
            <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] font-mono whitespace-nowrap ${
              koreaStatus.isOpen 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {koreaStatus.statusBadgeText}
            </span>
            <span className="text-slate-300 font-mono font-medium whitespace-nowrap">
              {timeRemainingStr}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px]">
            <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] font-mono whitespace-nowrap ${
              usStatus.isOpen 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {usStatus.isOpen ? "미국 🟢 개장" : "미국 🔴 장마감"}
            </span>
            <span className="text-slate-400 font-mono text-[10px] whitespace-nowrap">
              {usStatus.isOpen ? "NYSE/NASDAQ" : "22:30 KST 개장"}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-slate-300 font-medium">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">연동:</span>
            <span className={`px-1.5 py-0.2 rounded border font-mono text-[9px] whitespace-nowrap ${
              hasKoreaKey ? "bg-emerald-950/60 border-emerald-600/60 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-500"
            }`}>
              한투 {hasKoreaKey ? "●" : "○"}
            </span>
            <span className={`px-1.5 py-0.2 rounded border font-mono text-[9px] whitespace-nowrap ${
              hasTossKey ? "bg-blue-950/60 border-blue-600/60 text-blue-300" : "bg-slate-950 border-slate-800 text-slate-500"
            }`}>
              토스 {hasTossKey ? "●" : "○"}
            </span>
          </div>
        </div>

        {/* Section 3: Essential Controls (Pipeline, Strategy, Alerts, API, Trading Mode) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Master Pipeline Control Hub */}
          <button
            onClick={() => {
              if (onOpenPipelineHubModal) {
                onOpenPipelineHubModal();
              } else {
                window.dispatchEvent(new CustomEvent("open-master-pipeline-modal"));
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer whitespace-nowrap border border-indigo-400/40"
            title="AI 뇌엔진 및 13개 자율매매 파이프라인 관제 허브"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>파이프라인</span>
          </button>

          {/* AI Profit Optimization Dynamic Strategy Toggle */}
          <button
            onClick={handleToggleProfitOpt}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border whitespace-nowrap shadow-xs ${
              isProfitOptActive
                ? "bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border-teal-400/50"
                : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700"
            }`}
            title="시장 변동성 및 유동성 맞춤 손익비(R:R) 동적 최적화"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isProfitOptActive ? "text-teal-300 animate-spin" : "text-slate-500"}`} />
            <span>{isProfitOptActive ? "수익최적화 ON" : "수익최적화 OFF"}</span>
          </button>

          {/* Threshold Alert Notification Settings Button */}
          <button
            onClick={onOpenThresholdModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer whitespace-nowrap"
            title="사용자 정의 임계값 및 알림 설정"
          >
            <Bell className="w-3 h-3 text-blue-400 shrink-0" />
            <span>알림</span>
            {alertCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black font-mono">
                {alertCount}
              </span>
            )}
          </button>

          {/* Broker API Connect Button */}
          <button
            onClick={onOpenApiConnectModal}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border whitespace-nowrap ${
              isRealTradingMode && !isAnyRealConnected
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 animate-pulse"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
            title="한국투자증권, 토스증권 API 연결"
          >
            <Key className="w-3 h-3 text-indigo-400 shrink-0" />
            <span>{isRealTradingMode && !isAnyRealConnected ? "API 연결 필요" : "API 설정"}</span>
          </button>

          {/* KILL SWITCH ON / OFF MASTER TOGGLE BUTTON */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (isKillSwitchActive) {
                  // If ON, click turns it OFF (resumes normal trading)
                  toggleKillSwitch(false);
                  addToast({
                    type: "SUCCESS",
                    title: "🟢 [킬-스위치 해제] 정상 자율매매 가동",
                    message: "킬-스위치가 OFF 되었습니다. AI 주문 및 실시간 매수 스캔이 재개됩니다."
                  });
                } else {
                  // If OFF, click turns it ON (activates kill-switch guard)
                  toggleKillSwitch(true, "USER_MANUAL_EMERGENCY");
                  addToast({
                    type: "CRITICAL",
                    title: "🛑 [킬-스위치 가동] 전 종목 매수 긴급 동결",
                    message: "킬-스위치가 ON 되었습니다. 신규 매수가 전면 차단되고 안전 방어 모드가 가동됩니다."
                  });
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer whitespace-nowrap ${
                isKillSwitchActive
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md animate-pulse ring-1 ring-rose-400"
                  : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
              }`}
              title={
                isKillSwitchActive
                  ? "킬-스위치 작동 중 (신규 매수 차단). 클릭하여 정상 매매로 해제(OFF)"
                  : "정상 가동 중. 비상 시 클릭하여 신규 매수 전면 차단(ON)"
              }
            >
              {isKillSwitchActive ? (
                <>
                  <Lock className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                  <span>킬스위치 ON</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>킬스위치 OFF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsGovernanceModalOpen(true)}
              className="px-1.5 py-1 text-slate-400 hover:text-white text-[10px] font-mono hover:bg-slate-800 rounded transition cursor-pointer"
              title="세이프티 거버넌스 및 손절 쿨다운 상세 설정"
            >
              ⚙️
            </button>
          </div>

          {/* REAL TRADING VS PAPER MODE DEDICATED SEGMENTED SELECTOR */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (onSetRealTradingMode) {
                  onSetRealTradingMode(false);
                } else if (onToggleRealTradingMode && isRealTradingMode) {
                  onToggleRealTradingMode();
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                !isRealTradingMode
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="가상 모의투자 시뮬레이션 모드 선택"
            >
              <span>🛡️ 모의투자</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSetRealTradingMode) {
                  onSetRealTradingMode(true);
                } else if (onToggleRealTradingMode && !isRealTradingMode) {
                  onToggleRealTradingMode();
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer whitespace-nowrap ${
                isRealTradingMode
                  ? "bg-rose-600 text-white shadow-xs animate-pulse"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="실전계좌 LIVE 모드 선택 (한국투자/업비트/토스)"
            >
              {isRealTradingMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
              <span>🔥 실전 LIVE</span>
            </button>
          </div>
        </div>
      </div>

      <SmartSafetyGovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
      />
    </div>
  );
};
