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
  const { profile, updateProfileSettings, addToast, isKillSwitchActive, systemHealth } = useApp();
  const allBots = getAllBots();
  const activeBotsCount = isAutoTradingActive ? allBots.length : 0;

  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTossKey = Boolean(typeof window !== "undefined" && localStorage.getItem("toss_api_key"));
  const hasRealCredentials = hasKoreaKey || hasUpbitKey || hasTossKey;

  const isRealTradeMode = profile?.isRealTrade ?? false;
  const brokerHealthy = systemHealth ? systemHealth.brokerConnected : true;
  const accountSynced = systemHealth ? systemHealth.accountSynced : true;
  const feedFresh = systemHealth ? systemHealth.feedFresh : true;

  const realAutoTradingReady =
    (!isRealTradeMode || hasRealCredentials) &&
    brokerHealthy &&
    accountSynced &&
    feedFresh &&
    !isKillSwitchActive;

  const handleResumeAll = async () => {
    if (isKillSwitchActive) {
      addToast?.({
        type: "ERROR",
        title: "🛑 [자율매매 재개 불가]",
        message: "Emergency Kill Switch가 활성화되어 있습니다. 킬스위치 해제 후 가동하십시오."
      });
      return;
    }

    if (isRealTradeMode && !hasRealCredentials) {
      addToast?.({
        type: "ERROR",
        title: "❌ [실거래 자율매매 가동 불가]",
        message: "연결된 증권사(KIS/토스) 또는 거래소(업비트) API Key가 없습니다. API 설정 후 가동하십시오."
      });
      return;
    }

    if (!realAutoTradingReady) {
      addToast?.({
        type: "ERROR",
        title: "❌ [실거래 실행 Gate 미충족]",
        message: "브로커 연결 또는 실시간 데이터 동기화 상태를 확인하십시오."
      });
      return;
    }

    try {
      await updateProfileSettings({ autoTradingEnabled: true });
      onToggleAutoTrading(true);

      allBots.forEach(b => {
        try {
          saveCustomBot({
            ...b,
            status: "ONLINE",
            statusText: "실거래 가동중"
          });
          aiDynamicBotThresholdEngine.updateBotThreshold(b.id, { operationalState: "ACTIVE" });
        } catch (e) {
          console.warn("Failed to update bot state:", b.id, e);
        }
      });

      addToast?.({
        type: "SUCCESS",
        title: "⚡ [AI 전 종목 자율매매 일괄 재개]",
        message: `총 ${allBots.length}개 AI 봇의 실시간 자동 주문 및 퀀트 엔진이 가동되었습니다.`
      });
    } catch (error) {
      onToggleAutoTrading(false);
      addToast?.({
        type: "ERROR",
        title: "자율매매 활성화 실패",
        message: "설정 저장 또는 실행 준비 확인에 실패했습니다."
      });
    }
  };

  const handlePauseAll = async () => {
    try {
      await updateProfileSettings({ autoTradingEnabled: false });
      onToggleAutoTrading(false);

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

      addToast?.({
        type: "WARNING",
        title: "🛑 [AI 전 종목 자율매매 일괄 일시정지]",
        message: `모든 AI 봇의 실시간 매수/매도 자동 실행이 동결되었습니다. (안전 방어 유지)`
      });
    } catch (error) {
      addToast?.({
        type: "ERROR",
        title: "일시정지 설정 저장 실패",
        message: "설정 저장 중 오류가 발생했습니다."
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

            {/* Status Reason Badges */}
            {(!realAutoTradingReady || !isRealTradeMode) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {!isRealTradeMode && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-500/20 border border-slate-500/40 text-slate-300 rounded">
                    REAL MODE OFF
                  </span>
                )}
                {isKillSwitchActive && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded">
                    KILL SWITCH ACTIVE
                  </span>
                )}
                {isRealTradeMode && !hasRealCredentials && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded">
                    NO CREDENTIALS
                  </span>
                )}
                {!brokerHealthy && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded">
                    BROKER DISCONNECTED
                  </span>
                )}
                {systemHealth && systemHealth.brokerHealthy === false && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded">
                    BROKER UNHEALTHY
                  </span>
                )}
                {!accountSynced && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded">
                    ACCOUNT NOT SYNCED
                  </span>
                )}
                {!feedFresh && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded">
                    STALE FEED
                  </span>
                )}
                {systemHealth && systemHealth.feedVerified === false && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded">
                    UNVERIFIED DATA
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Master Switches Group */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            data-testid="auto-trading-start"
            onClick={handleResumeAll}
            disabled={(isAutoTradingActive && !isKillSwitchActive) || !realAutoTradingReady}
            title={
              isKillSwitchActive
                ? "Emergency Kill Switch가 발동 중입니다."
                : isRealTradeMode && !hasRealCredentials
                ? "증권사/거래소 API Key가 등록되지 않았습니다."
                : !brokerHealthy
                ? "브로커 서버와 연결되지 않았습니다."
                : !accountSynced
                ? "계좌 상태가 동기화되지 않았습니다."
                : !feedFresh
                ? "실시간 데이터 피드가 오래되었습니다."
                : isAutoTradingActive
                ? "자율매매가 이미 가동 중입니다."
                : "전체 AI 봇 자율매매 시작"
            }
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-sm ${
              (isAutoTradingActive && !isKillSwitchActive) || !realAutoTradingReady
                ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/30 opacity-60 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/30"
            }`}
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>▶️ 전체 봇 자율매매 시작 (Resume All)</span>
          </button>

          <button
            type="button"
            data-testid="auto-trading-pause"
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
