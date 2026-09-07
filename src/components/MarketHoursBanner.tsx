import React, { useState, useEffect } from "react";
import { getMarketStatus, getExecutionPhase, MarketStatus, ExecutionPhaseInfo } from "../lib/marketHours";
import { Clock, ShieldAlert, Zap, Lock, Unlock, RotateCcw, ShieldCheck, Sliders, Globe, Cpu, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { SmartSafetyGovernanceModal } from "./trading/SmartSafetyGovernanceModal";
import { UsScalperSuperBrainModal } from "./trading/UsScalperSuperBrainModal";

export const MarketHoursBanner: React.FC = () => {
  const { 
    consecutiveLossCount, 
    killSwitchUntil, 
    isKillSwitchActive, 
    killSwitchMode,
    resetKillSwitch,
    blockedSymbolDetails,
    selectedSymbol,
    executeTrade
  } = useApp() as any;
  const [koreaStatus, setKoreaStatus] = useState<MarketStatus>(() => getMarketStatus('KOREA'));
  const [usStatus, setUsStatus] = useState<MarketStatus>(() => getMarketStatus('US'));
  const [btcStatus, setBtcStatus] = useState<MarketStatus>(() => getMarketStatus('BTC'));
  const [koreaPhase, setKoreaPhase] = useState<ExecutionPhaseInfo>(() => getExecutionPhase('KOREA'));
  const [nowString, setNowString] = useState<string>("");
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [isUsBrainOpen, setIsUsBrainOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setKoreaStatus(getMarketStatus('KOREA', now));
      setUsStatus(getMarketStatus('US', now));
      setBtcStatus(getMarketStatus('BTC', now));
      setKoreaPhase(getExecutionPhase('KOREA', now));
      
      const kstStr = now.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      setNowString(kstStr);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingKillSwitchMins = isKillSwitchActive 
    ? Math.max(1, Math.ceil((killSwitchUntil - Date.now()) / 60000))
    : 0;

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950 text-white rounded-xl p-4 border border-zinc-800 shadow-md space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              <span>국내/해외 장시간 자동전환 듀얼 뇌엔진 통제 센터</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/40">
                DUAL BRAIN ENGINE v5.0
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              국내장(09:00~15:30)에는 <strong>🇰🇷 국내 수급·오더플로우 엔진</strong>이 작동하며, 미국장(22:30~05:00) 개장 시 <strong>🇺🇸 US SCALPER SUPER BRAIN 20-Agent</strong>로 자동 전환됩니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* US Scalper Super Brain Direct Access Button */}
          <button
            onClick={() => setIsUsBrainOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-300" />
            <span>🧠 미국주식 20-Agent 뇌엔진 열기</span>
          </button>

          <button
            onClick={() => setIsGovernanceOpen(true)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isKillSwitchActive
                ? "bg-rose-600/90 hover:bg-rose-500 text-white border-rose-400 animate-pulse"
                : blockedSymbolDetails?.length > 0
                ? "bg-amber-600/80 hover:bg-amber-500 text-white border-amber-400"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>AI 안전 거버넌스</span>
            {blockedSymbolDetails?.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400/30 text-amber-200 rounded-full text-[10px] font-mono font-bold">
                {blockedSymbolDetails.length}
              </span>
            )}
          </button>

          <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-zinc-400 text-[11px]">KST:</span>
            <span className="text-emerald-300 font-bold text-[11px]">{nowString || "시간 계산 중..."}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* 1. KOREA STOCK */}
        <div className={`p-3 rounded-lg border transition-all ${
          koreaStatus.isOpen 
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100" 
            : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🇰🇷</span>
              <span className="font-bold text-xs text-white">국내주식 (KOSPI/KOSDAQ)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                koreaStatus.isOpen 
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse" 
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {koreaStatus.statusBadgeText}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {/* 시간대별 자율매매 페이즈 배지 */}
            <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800 text-[10px]">
              <span className="text-zinc-400 flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3 text-amber-400" />
                국내 활성 엔진:
              </span>
              <span className={`font-bold font-mono px-1.5 py-0.2 rounded ${
                koreaStatus.isOpen 
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-700 text-zinc-300'
              }`}>
                {koreaStatus.isOpen ? '🇰🇷 국내 6단계 퀀트 파이프라인 가동' : '장마감 대기'}
              </span>
            </div>

            {/* 킬 스위치 가동 여부 표시 및 즉시 해제 버튼 */}
            {isKillSwitchActive ? (
              <div className="bg-rose-950/80 text-rose-200 p-2 rounded-lg border border-rose-600/70 text-[10px] space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-rose-300">
                    <Lock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    킬-스위치 가동 중 (신규매수 차단)
                  </span>
                  <span className="font-mono text-rose-200 font-black">
                    {remainingKillSwitchMins}분 남음
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-rose-800/60">
                  <span className="text-[9px] text-rose-300/80">안전잠금 즉시 해제하기:</span>
                  <button
                    type="button"
                    onClick={resetKillSwitch}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded text-[10px] transition flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>킬-스위치 즉시 해제</span>
                  </button>
                </div>
              </div>
            ) : consecutiveLossCount > 0 ? (
              <div className="bg-amber-950/40 text-zinc-300 p-2 rounded-lg border border-amber-500/40 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    연속 손절 경고
                  </span>
                  <span className="font-mono text-amber-200 font-bold">
                    {consecutiveLossCount} / 3회
                  </span>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={resetKillSwitch}
                    className="text-[9px] text-zinc-400 hover:text-amber-300 underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    카운트 리셋
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-between text-zinc-400 font-mono text-[10px]">
              <span>운영시간</span>
              <span className="text-zinc-200 font-bold">{koreaStatus.operatingHoursText}</span>
            </div>
            <div className="text-zinc-300 font-medium pt-1 border-t border-zinc-800/60 text-[11px]">
              • {koreaPhase.reasonText}
            </div>
            <div className="text-indigo-300 font-mono text-[10px] font-bold">
              ⏱ {koreaStatus.nextSessionText}
            </div>
          </div>
        </div>

        {/* 2. US STOCK */}
        <div className={`p-3 rounded-lg border transition-all ${
          usStatus.isOpen 
            ? "bg-blue-950/40 border-blue-500/40 text-blue-100" 
            : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🇺🇸</span>
              <span className="font-bold text-xs text-white">미국주식 (NYSE/NASDAQ)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsUsBrainOpen(true)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white font-bold transition flex items-center gap-0.5 cursor-pointer"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>20-Agent AI 분석</span>
              </button>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                usStatus.isOpen 
                  ? "bg-blue-500/30 text-blue-300 border border-blue-500/50 animate-pulse" 
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {usStatus.statusBadgeText}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800 text-[10px]">
              <span className="text-zinc-400 flex items-center gap-1 font-mono">
                <Cpu className="w-3 h-3 text-indigo-400" />
                해외 뇌엔진:
              </span>
              <span className="font-bold font-mono text-cyan-300">
                US SCALPER BRAIN v5.0
              </span>
            </div>

            <div className="flex justify-between text-zinc-400 font-mono text-[10px]">
              <span>운영시간</span>
              <span className="text-zinc-200 font-bold">{usStatus.operatingHoursText}</span>
            </div>
            <div className="text-zinc-300 font-medium pt-1 border-t border-zinc-800/60 text-[11px]">
              • {usStatus.detailText}
            </div>
            <div className="text-indigo-300 font-mono text-[10px] font-bold">
              ⏱ {usStatus.nextSessionText}
            </div>
          </div>
        </div>

        {/* 3. CRYPTO */}
        <div className="p-3 rounded-lg border bg-amber-950/20 border-amber-500/30 text-amber-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🪙</span>
              <span className="font-bold text-xs text-white">가상자산 (업비트 KRW)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono bg-amber-500/30 text-amber-300 border border-amber-500/50">
              {btcStatus.statusBadgeText}
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-zinc-400 font-mono text-[10px]">
              <span>운영시간</span>
              <span className="text-zinc-200 font-bold">{btcStatus.operatingHoursText}</span>
            </div>
            <div className="text-zinc-300 font-medium pt-1 border-t border-zinc-800/60 text-[11px]">
              • {btcStatus.detailText}
            </div>
            <div className="text-amber-300 font-mono text-[10px] font-bold">
              ⏱ {btcStatus.nextSessionText}
            </div>
          </div>
        </div>
      </div>

      <SmartSafetyGovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => setIsGovernanceOpen(false)}
      />

      <UsScalperSuperBrainModal
        isOpen={isUsBrainOpen}
        onClose={() => setIsUsBrainOpen(false)}
        stock={{ symbol: selectedSymbol || "NVDA", name: selectedSymbol || "엔비디아", market: "US" }}
        onExecuteTrade={executeTrade}
      />
    </div>
  );
};
