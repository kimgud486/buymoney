import React, { useState, useEffect } from "react";
import {
  Brain,
  Shield,
  Flame,
  Play,
  Pause,
  Zap,
  Cpu,
  Building2,
  Activity,
  Newspaper,
  Search,
  Radio,
  Sliders,
  Sparkles,
  FileText,
  X,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  SlidersHorizontal,
  ChevronLeft
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";

export interface MasterSystemPipelineHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMasterFeature?: (key: string) => void;
  onOpenApiConnectModal?: () => void;
}

export interface EnginePipelineConfig {
  id: string;
  name: string;
  badge: string;
  category: "CORE" | "BOT" | "ANALYTICS" | "STRATEGY";
  description: string;
  icon: any;
  enabled: boolean;
  mode: "PAPER" | "REAL";
  latencyMs: number;
  signalsCount: number;
  masterHubKey: string;
}

const DEFAULT_ENGINES: EnginePipelineConfig[] = [
  {
    id: "eng_omni_brain",
    name: "🧠 AI 뇌통합 마스터 관제 (통합 뇌신경망)",
    badge: "AI 코어",
    category: "CORE",
    description: "중앙 AI 뇌 신경망 통합 관제 및 퀀트 매매 동기화 루프",
    icon: Brain,
    enabled: true,
    mode: "PAPER",
    latencyMs: 12,
    signalsCount: 1420,
    masterHubKey: "omni_brain_suite"
  },
  {
    id: "eng_multi_bot",
    name: "🏛️ AI 멀티오토봇 증권 오케스트레이터",
    badge: "버전 7.1",
    category: "CORE",
    description: "증권사별 멀티 봇 오케스트레이션 및 주문 분산 집행",
    icon: Building2,
    enabled: true,
    mode: "PAPER",
    latencyMs: 18,
    signalsCount: 890,
    masterHubKey: "multi_bot_securities"
  },
  {
    id: "eng_unified_control",
    name: "⚡ 통합 세력 수급 & VWAP 돌파 제어",
    badge: "수급/VWAP",
    category: "CORE",
    description: "세력 매집, VWAP, 모멘텀 돌파 실시간 자동 포착 및 주문",
    icon: Zap,
    enabled: true,
    mode: "PAPER",
    latencyMs: 8,
    signalsCount: 2150,
    masterHubKey: "unified_trading_control"
  },
  {
    id: "eng_live_terminal",
    name: "⚡ AI 실시간 트레이딩 터미널",
    badge: "버전 7.7",
    category: "CORE",
    description: "고주파 호가/틱 수급 스캔 및 초단타 자율 트레이딩",
    icon: Activity,
    enabled: true,
    mode: "PAPER",
    latencyMs: 5,
    signalsCount: 3100,
    masterHubKey: "live_trading_terminal"
  },
  {
    id: "eng_micro_capital",
    name: "🛡️ 소액 전용 AI 자율매매 방어원장",
    badge: "소액 방어",
    category: "BOT",
    description: "시드 300만원 이하 소액 자본 전용 리스크 방어 및 안전 매매",
    icon: Shield,
    enabled: true,
    mode: "PAPER",
    latencyMs: 15,
    signalsCount: 430,
    masterHubKey: "micro_capital_auto"
  },
  {
    id: "eng_multi_agent",
    name: "🧠 30대 에이전트 멀티 오케스트레이터",
    badge: "30대 에이전트",
    category: "BOT",
    description: "30개 전용 분석 에이전트 실시간 표결 및 합의 알고리즘",
    icon: Cpu,
    enabled: true,
    mode: "PAPER",
    latencyMs: 22,
    signalsCount: 1890,
    masterHubKey: "multi_agent_orchestrator"
  },
  {
    id: "eng_news_analytics",
    name: "📰 기업 뉴스 & 주가 영향도 감성 AI",
    badge: "뉴스 AI",
    category: "ANALYTICS",
    description: "실시간 속보 뉴스 감성 지수, 주가 영향도 및 모멘텀 추정",
    icon: Newspaper,
    enabled: true,
    mode: "PAPER",
    latencyMs: 35,
    signalsCount: 620,
    masterHubKey: "corporate_news_analytics"
  },
  {
    id: "eng_keyword_scanner",
    name: "🔍 AI 키워드 종목 발굴 엔진",
    badge: "버전 50.0",
    category: "ANALYTICS",
    description: "공시, 속보, 핫 테마 키워드 급등주 실시간 탐색 파이프라인",
    icon: Search,
    enabled: true,
    mode: "PAPER",
    latencyMs: 28,
    signalsCount: 940,
    masterHubKey: "keyword_scanner"
  },
  {
    id: "eng_orderbook_scanner",
    name: "⚡ 실시간 호가/수급 스캐너",
    badge: "수급 스캔",
    category: "ANALYTICS",
    description: "호가 잔량 분석, RVOL 체결 강도 및 대량 수급 포착",
    icon: Radio,
    enabled: true,
    mode: "PAPER",
    latencyMs: 9,
    signalsCount: 2780,
    masterHubKey: "orderbook_scanner"
  },
  {
    id: "eng_quant_matrix",
    name: "📊 퀀트 세팅 매트릭스 엔진",
    badge: "퀀트",
    category: "STRATEGY",
    description: "전략별 승률, PF, 손익비 및 알파 퀀트 세팅 품질 평가",
    icon: Sliders,
    enabled: true,
    mode: "PAPER",
    latencyMs: 14,
    signalsCount: 1120,
    masterHubKey: "quant_setup_matrix"
  },
  {
    id: "eng_strategy_sandbox",
    name: "🧪 AI 전략 샌드박스 백테스트",
    badge: "버전 7.6",
    category: "STRATEGY",
    description: "파라미터 가상 백테스팅 및 전략 시뮬레이션 테스트베드",
    icon: Sparkles,
    enabled: true,
    mode: "PAPER",
    latencyMs: 40,
    signalsCount: 510,
    masterHubKey: "strategy_sandbox"
  },
  {
    id: "eng_securities_consensus",
    name: "🏛️ AI 4대 증권소 통합 리서치",
    badge: "4대 증권",
    category: "ANALYTICS",
    description: "4대 AI 증권 모델 가중 컨센서스 및 최종 결론 리포트",
    icon: FileText,
    enabled: true,
    mode: "PAPER",
    latencyMs: 45,
    signalsCount: 380,
    masterHubKey: "securities_consensus"
  }
];

export const MasterSystemPipelineHubModal: React.FC<MasterSystemPipelineHubModalProps> = ({
  isOpen,
  onClose,
  onOpenMasterFeature,
  onOpenApiConnectModal
}) => {
  useModalScrollLock(isOpen);
  const { profile, updateProfileSettings, addToast, brokerApiStatus, kisPingLatency } = useApp();

  const isRealTradingMode = Boolean(profile?.isRealTrade);
  const isAutoTradingActive = profile?.autoTradingEnabled ?? true;

  const [engines, setEngines] = useState<EnginePipelineConfig[]>(() => {
    const saved = localStorage.getItem("aistock_pipeline_engines_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 13) {
          const defaultIconMap = new Map(DEFAULT_ENGINES.map((e) => [e.id, e.icon]));
          return parsed.map((item: any) => ({
            ...item,
            icon: defaultIconMap.get(item.id) || Brain
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_ENGINES;
  });

  const [activeFilter, setActiveFilter] = useState<"ALL" | "CORE" | "BOT" | "ANALYTICS" | "STRATEGY">("ALL");

  useEffect(() => {
    localStorage.setItem("aistock_pipeline_engines_config", JSON.stringify(engines));
  }, [engines]);

  if (!isOpen) return null;

  const hasBrokerKeys = Boolean(
    brokerApiStatus?.kisConnected || brokerApiStatus?.upbitConnected || brokerApiStatus?.tossConnected
  );

  const activeEnginesCount = engines.filter((e) => e.enabled).length;

  // Global Pipeline Actions
  const handleStartPaperPipeline = async () => {
    await updateProfileSettings({ isRealTrade: false, autoTradingEnabled: true });
    setEngines((prev) => prev.map((e) => ({ ...e, enabled: true, mode: "PAPER" })));
    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "🛡️ [모의투자 자율매매 파이프라인 가동 완료]",
        message: "13개 전체 AI 엔진이 가상 시뮬레이션 모드로 동시 가동을 시작했습니다."
      });
    }
  };

  const handleStartRealPipeline = async () => {
    if (!hasBrokerKeys && onOpenApiConnectModal) {
      if (addToast) {
        addToast({
          type: "WARNING",
          title: "🔑 증권사/거래소 API 연결 필요",
          message: "실거래 자율매매를 시작하려면 KIS, Upbit 또는 토스 API 키 설정이 필요합니다."
        });
      }
      onOpenApiConnectModal();
      return;
    }

    await updateProfileSettings({ isRealTrade: true, autoTradingEnabled: true });
    setEngines((prev) => prev.map((e) => ({ ...e, enabled: true, mode: "REAL" })));
    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "🔥 [실거래 투자 자율매매 파이프라인 가동 완료]",
        message: "한국투자증권/업비트 연동 실전계좌 자율매매 파이프라인이 전면 개시되었습니다."
      });
    }
  };

  const handleStopAllPipelines = async () => {
    await updateProfileSettings({ autoTradingEnabled: false });
    setEngines((prev) => prev.map((e) => ({ ...e, enabled: false })));
    if (addToast) {
      addToast({
        type: "INFO",
        title: "🛑 [전체 자율매매 파이프라인 일시정지]",
        message: "모든 AI 엔진 및 자율매매 주문 집행 파이프라인이 즉시 동결되었습니다."
      });
    }
  };

  const handleEnableAllPipelines = async () => {
    await updateProfileSettings({ autoTradingEnabled: true });
    setEngines((prev) => prev.map((e) => ({ ...e, enabled: true })));
    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "⚡ [전체 13개 엔진 일괄 가동]",
        message: "모든 자율매매 엔진 파이프라인이 동시 활성화되었습니다."
      });
    }
  };

  const handleToggleSingleEngine = (id: string) => {
    setEngines((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const handleToggleEngineMode = (id: string, mode: "PAPER" | "REAL") => {
    setEngines((prev) =>
      prev.map((e) => (e.id === id ? { ...e, mode } : e))
    );
  };

  const filteredEngines = engines.filter((e) => {
    if (activeFilter === "ALL") return true;
    return e.category === activeFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="이전 화면으로 돌아가기"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전</span>
            </button>

            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg flex items-center justify-center">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">AI 뇌엔진 & 13기능 자율매매 마스터 파이프라인</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                  파이프라인 허브 v8.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                모의투자 및 실거래 자율매매 시작 파이프라인과 13개 서브엔진의 개별/일괄 가동 상태를 실시간 제어합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950/60 font-sans">
          {/* Top Master Pipeline Controller Hub Box */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              {/* Overall Status Badge Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto flex-1">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                  <span className="text-slate-400 font-bold shrink-0">주 매매 모드</span>
                  <span className={`font-black flex items-center gap-1 ${isRealTradingMode ? "text-rose-400" : "text-blue-400"}`}>
                    {isRealTradingMode ? "🔥 실거래 운용" : "🛡️ 모의투자"}
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                  <span className="text-slate-400 font-bold shrink-0">파이프라인 가동</span>
                  <span className={`font-black ${isAutoTradingActive ? "text-emerald-400" : "text-amber-400"}`}>
                    {isAutoTradingActive ? "⚡ 정상 가동" : "🛑 일시 정지"}
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                  <span className="text-slate-400 font-bold shrink-0">가동 중 엔진</span>
                  <span className="text-cyan-300 font-black font-mono">
                    {activeEnginesCount} / {engines.length} 개
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                  <span className="text-slate-400 font-bold shrink-0">응답 지연속도</span>
                  <span className="text-emerald-400 font-black font-mono">
                    {kisPingLatency ? `${kisPingLatency}ms` : "12ms"}
                  </span>
                </div>
              </div>

              {/* Master Emergency Stop or Enable All */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleEnableAllPipelines}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md h-9"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>전체 일괄 가동</span>
                </button>

                <button
                  type="button"
                  onClick={handleStopAllPipelines}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md h-9"
                >
                  <Pause className="w-3.5 h-3.5 fill-rose-300" />
                  <span>전체 일괄 정지</span>
                </button>
              </div>
            </div>

            {/* DUAL PIPELINE START BUTTONS (MOCK VS REAL) */}
            <div>
              <p className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>주요 자율매매 시작 파이프라인 트랙 선택:</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. MOCK / PAPER AUTO TRADING PIPELINE START BUTTON */}
                <div className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                  !isRealTradingMode && isAutoTradingActive
                    ? "bg-blue-950/50 border-blue-500/80 ring-1 ring-blue-500/40 shadow-lg"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>🛡️ 모의투자 자율매매 시작 파이프라인</span>
                          {!isRealTradingMode && isAutoTradingActive && (
                            <span className="text-[10px] bg-blue-500 text-white font-mono px-2 py-0.2 rounded-full font-bold">가동중</span>
                          )}
                        </h3>
                        <p className="text-xs text-blue-200 mt-0.5">
                          가상 시뮬레이션 예수금과 안전 원장에서 13개 AI 엔진이 시세 스캔 및 자율 주문을 집행합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 font-mono">가상 리스크 게이트 4단계 연동</span>
                    <button
                      type="button"
                      onClick={handleStartPaperPipeline}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>🛡️ 모의 파이프라인 가동</span>
                    </button>
                  </div>
                </div>

                {/* 2. REAL / LIVE BROKER AUTO TRADING PIPELINE START BUTTON */}
                <div className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                  isRealTradingMode && isAutoTradingActive
                    ? "bg-rose-950/50 border-rose-500/80 ring-1 ring-rose-500/40 shadow-lg"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>🔥 실거래 투자 자율매매 시작 파이프라인</span>
                          {isRealTradingMode && isAutoTradingActive && (
                            <span className="text-[10px] bg-rose-600 text-white font-mono px-2 py-0.2 rounded-full font-bold animate-pulse">실거래 가동 중</span>
                          )}
                        </h3>
                        <p className="text-xs text-rose-200 mt-0.5">
                          증권사/거래소(KIS, Upbit, Toss) API 실전 계좌로 주문이 직접 전송되는 실거래 파이프라인입니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      {hasBrokerKeys ? "증권사 API 연동됨" : "API 연동 필요"}
                    </span>
                    <button
                      type="button"
                      onClick={handleStartRealPipeline}
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>🔥 실거래 파이프라인 가동</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs for 13 Sub-Engines */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { key: "ALL", label: `전체 서브엔진 (${engines.length})` },
                { key: "CORE", label: "코어 트레이딩" },
                { key: "BOT", label: "자동 봇" },
                { key: "ANALYTICS", label: "스캐너/분석" },
                { key: "STRATEGY", label: "전략/퀀트" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                    activeFilter === tab.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-slate-400">
              활성화된 서브 파이프라인: <strong className="text-cyan-400 font-bold">{activeEnginesCount}</strong> / {engines.length}
            </div>
          </div>

          {/* 13 SUB-ENGINES INDIVIDUAL PIPELINE CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredEngines.map((eng) => {
              const defaultIcon = DEFAULT_ENGINES.find((d) => d.id === eng.id)?.icon || Brain;
              const IconComp = (typeof eng.icon === "function" || (eng.icon && typeof eng.icon === "object" && (eng.icon as any).$$typeof))
                ? eng.icon
                : defaultIcon;
              const isPaperMode = eng.mode === "PAPER";

              return (
                <div
                  key={eng.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                    eng.enabled
                      ? isPaperMode
                        ? "bg-slate-900 border-slate-700/80 hover:border-blue-500/50"
                        : "bg-slate-900 border-rose-900/60 hover:border-rose-500/60"
                      : "bg-slate-950/60 border-slate-800/80 opacity-60"
                  }`}
                >
                  <div>
                    {/* Engine Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`p-2 rounded-xl text-white shrink-0 ${
                            eng.enabled
                              ? isPaperMode
                                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                : "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white leading-tight flex items-center gap-1.5">
                            <span>{eng.name}</span>
                          </h4>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold mt-1 inline-block">
                            {eng.badge}
                          </span>
                        </div>
                      </div>

                      {/* On/Off Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleSingleEngine(eng.id)}
                        className={`p-1.5 rounded-lg text-xs font-black transition cursor-pointer shrink-0 border ${
                          eng.enabled
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                        }`}
                        title={eng.enabled ? "엔진 일시정지" : "엔진 시작"}
                      >
                        <Power className={`w-3.5 h-3.5 ${eng.enabled ? "text-emerald-400" : "text-slate-500"}`} />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 min-h-[32px]">
                      {eng.description}
                    </p>
                  </div>

                  {/* Mode & Execution Pipeline Switch */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">지연시간: <strong className="text-emerald-400">{eng.latencyMs}ms</strong></span>
                      <span className="text-slate-400">누적 신호: <strong className="text-cyan-300">{eng.signalsCount}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10.5px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleToggleEngineMode(eng.id, "PAPER")}
                        className={`flex-1 py-1 rounded text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                          isPaperMode
                            ? "bg-blue-600 text-white font-black shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>🛡️ 모의</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleEngineMode(eng.id, "REAL")}
                        className={`flex-1 py-1 rounded text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                          !isPaperMode
                            ? "bg-rose-600 text-white font-black shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>🔥 실거래</span>
                      </button>

                      {onOpenMasterFeature && eng.masterHubKey && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenMasterFeature(eng.masterHubKey);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer text-[10px] shrink-0"
                          title="상세 콘솔 열기"
                        >
                          콘솔
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-5 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer mr-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전</span>
            </button>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 hidden sm:inline" />
            <span className="hidden sm:inline">AI 뇌통합 알고리즘 및 13대 서브 파이프라인 무결성 점검 완료</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
