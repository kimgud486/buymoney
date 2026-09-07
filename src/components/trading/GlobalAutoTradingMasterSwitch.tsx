import React from "react";
import { Play, Pause, Bot, ShieldAlert, Sparkles, CheckCircle2, Zap, Radio, Power } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getAllBots, saveCustomBot } from "../../data/botPresets";
import { aiDynamicBotThresholdEngine } from "../../lib/aiDynamicBotThresholdEngine";

interface GlobalAutoTradingMasterSwitchProps {
  isAutoTradingActive: boolean;
  onToggleAutoTrading: (active: boolean) => void;
}

export const GlobalAutoTradingMasterSwitch: React.FC<GlobalAutoTradingMasterSwitchProps> = ({
  isAutoTradingActive,
  onToggleAutoTrading,
}) => {
  const { profile, updateProfileSettings, addToast, isKillSwitchActive } = useApp();
  const allBots = getAllBots();
  const activeBotsCount = isAutoTradingActive ? allBots.length : 0;

  const handleResumeAll = () => {
    onToggleAutoTrading(true);
    
    // Update all bots status immediately
    allBots.forEach(b => {
      try {
        saveCustomBot({
          ...b,
          status: "ONLINE",
          statusText: "자율 매매 가동중"
        });
        aiDynamicBotThresholdEngine.updateBotThreshold(b.id, { operationalState: "ACTIVE" });
      } catch (e) {
        console.warn("Failed to update bot state:", b.id, e);
      }
    });

    // Async persist profile in background without blocking UI
    try {
      updateProfileSettings({ autoTradingEnabled: true }).catch(() => {});
    } catch (_) {}

    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "⚡ [AI 전 종목 자율매매 일괄 재개]",
        message: `총 ${allBots.length}개 AI 봇의 실시간 자동 주문 및 퀀트 엔진이 즉시 가동되었습니다.`
      });
    }
  };

  const handlePauseAll = () => {
    onToggleAutoTrading(false);

    // Pause all bots status immediately
    allBots.forEach(b => {
      try {
        saveCustomBot({
          ...b,
          status: "IDLE",
          statusText: "일시 정지됨"
        });
        aiDynamicBotThresholdEngine.updateBotThreshold(b.id, { operationalState: "PAUSED" });
      } catch (e) {
        console.warn("Failed to pause bot state:", b.id, e);
      }
    });

    // Async persist profile in background without blocking UI
    try {
      updateProfileSettings({ autoTradingEnabled: false }).catch(() => {});
    } catch (_) {}

    if (addToast) {
      addToast({
        type: "WARNING",
        title: "🛑 [AI 전 종목 자율매매 일괄 일시정지]",
        message: `모든 AI 봇의 실시간 매수/매도 자동 실행이 동결되었습니다. (안전 방어 유지)`
      });
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 border border-indigo-500/30 shadow-md my-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Status Info */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isAutoTradingActive && !isKillSwitchActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
          }`}>
            <Bot className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight">
                AI 글로벌 자율매매 마스터 커맨드
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border flex items-center gap-1 ${
                isAutoTradingActive && !isKillSwitchActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}>
                <Radio className="w-3 h-3 animate-ping" />
                {isAutoTradingActive && !isKillSwitchActive ? "ACTIVE RUNNING" : "GLOBAL PAUSED"}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              전체 {allBots.length}개 AI 트레이딩 봇의 실시간 매매 파이프라인을 일괄 제어합니다. (현재 {activeBotsCount}개 봇 가동 중)
            </p>
          </div>
        </div>

        {/* Master Switches Group */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleResumeAll}
            disabled={isAutoTradingActive && !isKillSwitchActive}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-sm ${
              isAutoTradingActive && !isKillSwitchActive
                ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 opacity-60 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/30"
            }`}
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>▶️ 전체 봇 자율매매 시작 (Resume All)</span>
          </button>

          <button
            type="button"
            onClick={handlePauseAll}
            disabled={!isAutoTradingActive}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-sm ${
              !isAutoTradingActive
                ? "bg-rose-600/30 text-rose-200 border border-rose-500/30 opacity-60 cursor-not-allowed"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
            }`}
          >
            <Pause className="w-4 h-4 fill-current shrink-0" />
            <span>⏸️ 전체 봇 일시정지 (Pause All)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
