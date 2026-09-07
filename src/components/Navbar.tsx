import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Shield, Play, Pause, AlertTriangle, User, LogOut, BookOpen, ShieldCheck, Lock, Target, Eye, Crosshair, Building2, Zap, Sparkles, BarChart2, Sliders, Smartphone, Download } from "lucide-react";
import { auth, signOut } from "../lib/firebase";
import { RealTradeGuideModal } from "./RealTradeGuideModal";
import { FloatingSearchBar } from "./FloatingSearchBar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ConnectionHealthDashboard } from "./ConnectionHealthDashboard";
import { MockTradingInfoModal } from "../demo/MockTradingInfoModal";
import { AiInvestmentReportModal } from "./trading/AiInvestmentReportModal";
import { AutoTradingFilterConfigModal } from "./trading/AutoTradingFilterConfigModal";
import { PwaInstallModal } from "./PwaInstallModal";

interface NavbarProps {
  onLock?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLock }) => {
  const { profile, marketStatus, updateProfileSettings, addToast, isLiveTradingActive, apiEnvironmentMode, isFocusMode, toggleFocusMode } = useApp();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMockInfoModalOpen, setIsMockInfoModalOpen] = useState(false);
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  const { isRealTrade, koreaAppKey, koreaAppSecret, upbitAccessKey, upbitSecretKey } = profile || {};
  const { brokerErrors } = useApp();

  // Dynamic real trading status calculation
  const isKoreaMarketOpen = Boolean(marketStatus?.korea?.isOpen);
  const isUsMarketOpen = Boolean(marketStatus?.us?.isOpen);
  const isAnyMarketOpen = isKoreaMarketOpen || isUsMarketOpen;
  const hasBrokerKeys = Boolean((koreaAppKey && koreaAppSecret) || (upbitAccessKey && upbitSecretKey));
  const hasBrokerError = Boolean(brokerErrors?.korea || brokerErrors?.upbit);

  let statusBadgeBg = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  let statusBadgeText = "🟡 가상 모의투자";
  let statusDotColor = "bg-amber-500";
  let statusTooltip = "현재 가상 모의투자 모드로 작동 중입니다.";

  if (isRealTrade) {
    if (!hasBrokerKeys) {
      statusBadgeBg = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse";
      statusBadgeText = "🔴 실거래 불가 (API 미연동)";
      statusDotColor = "bg-rose-500";
      statusTooltip = "API Key 미등록 상태입니다. [설정] 메뉴에서 한국투자증권/업비트 API Key를 입력하세요.";
    } else if (hasBrokerError) {
      statusBadgeBg = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse";
      statusBadgeText = "🔴 실거래 불가 (통신 오류)";
      statusDotColor = "bg-rose-500";
      statusTooltip = "증권사 또는 거래소 API 통신 오류가 감지되어 실거래 주문이 차단되었습니다.";
    } else if (!isAnyMarketOpen) {
      statusBadgeBg = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40";
      statusBadgeText = "🔴 실거래 불가 (장외시간)";
      statusDotColor = "bg-rose-500";
      statusTooltip = "현재 정규장 운영 시간이 아니므로 실거래 주문 전송이 자동으로 차단되었습니다.";
    } else {
      statusBadgeBg = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40";
      statusBadgeText = "🟢 실거래 LIVE 연결됨";
      statusDotColor = "bg-emerald-500";
      statusTooltip = "한국투자증권 / 업비트 실거래 원장 정상 연동 및 주문 가능 상태입니다.";
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  const toggleAutoTrading = async () => {
    if (!profile) return;
    try {
      const nextState = !profile.autoTradingEnabled;
      await updateProfileSettings({ autoTradingEnabled: nextState });
      addToast({
        type: nextState ? "SUCCESS" : "INFO",
        title: nextState ? "🤖 AI 자율매매 가동 시작" : "⏸️ AI 자율매매 일시정지",
        message: nextState
          ? "AI 알고리즘이 실시간 마켓 스캔 및 자동 매매를 시작합니다."
          : "AI 자율매매가 안전하게 일시정지 되었습니다."
      });
    } catch (e: any) {
      console.error("Toggle auto trading failed", e);
    }
  };

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo and App Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 bg-zinc-900 dark:bg-zinc-100 rounded flex items-center justify-center text-white dark:text-zinc-900 font-mono font-bold tracking-tighter text-xs sm:text-sm shadow-xs">
              AS
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">AISTOCK 24</h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[8px] sm:text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-150 dark:border-emerald-800">LIVE</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-widest uppercase hidden xs:block">AI Real Auto Trading</p>
            </div>

            {/* PROMINENT MOCK / REAL MODE TOGGLE SWITCH & CONNECTION HEALTH WIDGET */}
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <ConnectionHealthDashboard />

              {/* DYNAMIC REAL-TIME TRADING STATUS INDICATOR (Instant Color Change: Green / Red / Yellow) */}
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-xs cursor-pointer ${statusBadgeBg}`}
                title={statusTooltip}
                onClick={() => {
                  if (isRealTrade && !hasBrokerKeys) {
                    window.dispatchEvent(new CustomEvent("open-api-connect-modal", { detail: 'korea' }));
                  }
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusDotColor} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDotColor}`} />
                </span>
                <span>{statusBadgeText}</span>
              </div>

              {/* TRADING MODE DEDICATED SEGMENTED SELECTOR */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (profile?.isRealTrade) {
                      updateProfileSettings({ isRealTrade: false });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !profile?.isRealTrade
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                  title="가상 모의투자(Paper Trading) 모드 선택"
                >
                  <span className={`w-2 h-2 rounded-full ${!profile?.isRealTrade ? "bg-white" : "bg-zinc-400"}`} />
                  <span>🛡️ 모의투자</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!profile?.isRealTrade) {
                      updateProfileSettings({ isRealTrade: true });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    profile?.isRealTrade
                      ? "bg-rose-600 text-white shadow-xs animate-pulse"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                  title="실전투자 LIVE 모드 선택 (한국투자/업비트/토스)"
                >
                  <span className={`w-2 h-2 rounded-full ${profile?.isRealTrade ? "bg-white animate-ping" : "bg-zinc-400"}`} />
                  <span>🔥 실전투자 LIVE</span>
                </button>
              </div>
            </div>
          </div>

          {/* FLOATING SEARCH BAR IN NAVBAR (Sticky Header Placement) */}
          <div className="flex-1 max-w-4xl lg:max-w-5xl xl:max-w-6xl min-w-[140px] xs:min-w-[200px] sm:min-w-[380px] mx-1 sm:mx-3">
            <FloatingSearchBar variant="navbar" />
          </div>

          {/* Ticker Row - Hidden on mobile */}
          {marketStatus && (
            <div className="hidden xl:flex items-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-2 border-r border-zinc-100 pr-4">
                <span className="text-zinc-500">KOSPI</span>
                <span className="font-semibold text-zinc-950">{(marketStatus.kospi.value ?? 0).toLocaleString()}</span>
                <span className={marketStatus.kospi.pct >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                  {marketStatus.kospi.pct >= 0 ? "+" : ""}{marketStatus.kospi.pct}%
                </span>
              </div>
              <div className="flex items-center gap-2 border-r border-zinc-100 pr-4">
                <span className="text-zinc-500">NASDAQ</span>
                <span className="font-semibold text-zinc-950">{(marketStatus.nasdaq.value ?? 0).toLocaleString()}</span>
                <span className={marketStatus.nasdaq.pct >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                  {marketStatus.nasdaq.pct >= 0 ? "+" : ""}{marketStatus.nasdaq.pct}%
                </span>
              </div>
              <div className="flex items-center gap-2 border-r border-zinc-100 pr-4">
                <span className="text-zinc-500">USD/KRW</span>
                <span className="font-semibold text-zinc-950">{(marketStatus.exchangeRate.value ?? 0).toLocaleString()}원</span>
                <span className={marketStatus.exchangeRate.pct >= 0 ? "text-rose-600 font-medium" : "text-emerald-600 font-medium"}>
                  {marketStatus.exchangeRate.pct >= 0 ? "+" : ""}{marketStatus.exchangeRate.pct}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
                <Shield className="h-3.5 w-3.5 text-zinc-600" />
                <span className="text-zinc-500 uppercase text-[10px]">RISK:</span>
                <span className="font-bold text-zinc-800 text-[10px]">{marketStatus.riskLevel}</span>
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 4-Securities Research Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-consensus-modal", { detail: "005930" }))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded text-xs font-black transition cursor-pointer border shadow-xs bg-gradient-to-r from-cyan-900 to-indigo-900 hover:from-cyan-800 hover:to-indigo-800 text-cyan-200 border-cyan-500/70 ring-1 ring-cyan-500/30"
              title="AI 4대 증권소 모델 통합 리서치 & 결론 허브"
            >
              <Building2 className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
              <span className="hidden sm:inline">🏛️ AI 증권소 리서치</span>
              <span className="sm:hidden text-[10px]">AI 리서치</span>
            </button>

            {/* Focus Mode Toggle Button */}
            <button
              onClick={toggleFocusMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded text-xs font-black transition cursor-pointer border shadow-xs ${
                isFocusMode
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md ring-1 ring-cyan-400/50"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300"
              }`}
              title="포커스 모드: 핵심 AI 예측 차트와 매매 버튼만 강조 표시"
            >
              <Target className={`h-3.5 w-3.5 shrink-0 ${isFocusMode ? "text-cyan-200 animate-spin" : "text-zinc-600"}`} />
              <span className="hidden sm:inline">{isFocusMode ? "🎯 Focus ON" : "👁️ Focus OFF"}</span>
              <span className="sm:hidden text-[10px]">{isFocusMode ? "Focus ON" : "Focus"}</span>
            </button>

            {/* Master Pipeline Control Hub Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-master-pipeline-modal"))}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs transition cursor-pointer"
              title="AI 뇌엔진 및 13개 자율매매 파이프라인 마스터 관제"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300 shrink-0 fill-amber-300" />
              <span className="hidden sm:inline">🚀 파이프라인</span>
              <span className="sm:hidden text-[11px]">파이프라인</span>
            </button>

            {/* Real Trade Guide Button */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">실거래 가이드</span>
              <span className="sm:hidden text-[11px]">가이드</span>
            </button>

            {/* PWA App Install Button */}
            <button
              onClick={() => setIsPwaModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-xs transition cursor-pointer border border-cyan-400/40"
              title="AISTOCK 24 모바일/PC 홈 화면 앱 설치 (PWA)"
            >
              <Smartphone className="h-3.5 w-3.5 text-cyan-200 shrink-0" />
              <span className="hidden sm:inline">📱 앱 설치</span>
              <span className="sm:hidden text-[11px]">앱설치</span>
            </button>

            {profile && (
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleAutoTrading}
                  className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 rounded text-xs font-medium transition cursor-pointer ${
                    profile.autoTradingEnabled 
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" 
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                  }`}
                >
                  {profile.autoTradingEnabled ? (
                    <>
                      <Play className="h-3 w-3 fill-emerald-700 shrink-0" />
                      <span className="font-bold hidden sm:inline">
                        자율매매 [{profile.autoTradingTargetMarket === "US" ? "🇺🇸 해외" : profile.autoTradingTargetMarket === "BTC" ? "🪙 업비트" : "🇰🇷 국내"}]
                      </span>
                      <span className="font-bold sm:hidden text-[11px]">
                        {profile.autoTradingTargetMarket === "US" ? "🇺🇸" : profile.autoTradingTargetMarket === "BTC" ? "🪙" : "🇰🇷"} 가동중
                      </span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3 fill-amber-700 shrink-0" />
                      <span className="hidden sm:inline">자동매매 일시정지</span>
                      <span className="sm:hidden text-[11px]">일시정지</span>
                    </>
                  )}
                </button>

                {/* Filter Config Button */}
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold transition cursor-pointer"
                  title="자율매매 무차별 매수 방지 및 업비트 코인 엄선 필터 설정"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline text-[11px]">필터설정</span>
                </button>
              </div>
            )}

            {/* AI Investment Report Button */}
            <button
              onClick={() => setIsAiReportModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded text-xs font-black transition cursor-pointer border shadow-xs bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-purple-200 border-purple-500/70 ring-1 ring-purple-500/30"
              title="주간/월간 AI 투자 리포트 분석"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span className="hidden sm:inline">📊 AI 투자 리포트</span>
              <span className="sm:hidden text-[10px]">AI 리포트</span>
            </button>

            {/* Instant Dark / Light Theme Switcher */}
            <ThemeSwitcher />

            {/* Lock System Button */}
            {onLock && (
              <button
                type="button"
                onClick={onLock}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded border border-zinc-200 dark:border-zinc-700 text-xs font-bold transition cursor-pointer"
                title="관제센터 암호 잠금"
              >
                <Lock className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                <span className="hidden sm:inline">잠금</span>
              </button>
            )}

            {/* Session Indicator - Hidden on extra small mobile screens */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span className="text-[10px] font-sans font-bold leading-none tracking-tight">보안 세션</span>
            </div>
          </div>
        </div>
      </header>

      {/* Guide Modal */}
      <RealTradeGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />

      {/* Mock Trading Mode Restriction Modal */}
      <MockTradingInfoModal
        isOpen={isMockInfoModalOpen}
        onClose={() => setIsMockInfoModalOpen(false)}
        onOpenReport={() => setIsAiReportModalOpen(true)}
      />

      {/* AI Investment Report Modal */}
      <AiInvestmentReportModal
        isOpen={isAiReportModalOpen}
        onClose={() => setIsAiReportModalOpen(false)}
      />

      {/* AI Auto-Trading & Upbit Crypto Filter Modal */}
      <AutoTradingFilterConfigModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />

      {/* PWA App Install Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />
    </>
  );
};
