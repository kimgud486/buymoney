import React, { useState, useMemo, useEffect } from "react";
import { 
  TargetStockScanItem, 
  AgentProfile, 
  EvidenceItem, 
  MarketRegimeState,
  PositionGuardianState
} from "../../types/stockAiTradingFloor";
import { 
  INITIAL_30_AI_AGENTS, 
  INITIAL_EVIDENCES, 
  INITIAL_SCANNED_STOCKS, 
  INITIAL_MARKET_REGIME 
} from "../../data/stockAiAgentsMasterData";
import { AgentDetailInspectModal } from "./AgentDetailInspectModal";
import { AiWarRoomModal } from "./AiWarRoomModal";
import { WhyExplainerModal } from "./WhyExplainerModal";
import { DayNight24hTradingEngineSuite } from "./DayNight24hTradingEngineSuite";
import { useApp } from "../../context/AppContext";
import { realtimeMarketFeedService, LiveMarketQuote } from "../../services/realtimeMarketFeedService";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Zap, 
  Layers, 
  BarChart3, 
  RefreshCw, 
  Flame, 
  Scale, 
  Sliders, 
  Clock, 
  Cpu, 
  ArrowRight,
  Eye,
  Maximize2,
  DollarSign,
  ChevronRight,
  Info,
  Radio,
  Play,
  Pause
} from "lucide-react";

export const StockAiTradingFloorMasterScreen: React.FC = () => {
  const { profile, executeTrade, addToast, isRealTrade } = useApp();

  // 마스터 상태
  const [agents, setAgents] = useState<AgentProfile[]>(INITIAL_30_AI_AGENTS);
  const [evidences, setEvidences] = useState<EvidenceItem[]>(INITIAL_EVIDENCES);
  const [scannedStocks, setScannedStocks] = useState<TargetStockScanItem[]>(INITIAL_SCANNED_STOCKS);
  const [selectedStock, setSelectedStock] = useState<TargetStockScanItem>(INITIAL_SCANNED_STOCKS[0]);
  const [marketRegime, setMarketRegime] = useState<MarketRegimeState>(INITIAL_MARKET_REGIME);

  // 실시간 시세 피드 실시간 연동 (KRX / 업비트 / 미국주식 실시간 가격 동기화)
  useEffect(() => {
    const unsub = realtimeMarketFeedService.subscribe((quotesMap: Map<string, LiveMarketQuote>) => {
      if (!quotesMap || quotesMap.size === 0) return;

      setScannedStocks(prev => {
        let hasChanged = false;
        const updated = prev.map(stock => {
          const live = quotesMap.get(stock.symbol) || 
                       quotesMap.get(stock.symbol.replace("KRW-", "")) || 
                       quotesMap.get(`KRW-${stock.symbol}`);
          if (live && live.price > 0 && (live.price !== stock.currentPrice || live.changeRate !== stock.changePct)) {
            hasChanged = true;
            const entryMin = Math.round(live.price * 0.985);
            const entryMax = Math.round(live.price * 0.995);
            const tp1 = Math.round(live.price * 1.035);
            const tp2 = Math.round(live.price * 1.07);
            const sl = Math.round(live.price * 0.97);
            const volNum = typeof live.volume === "number" ? live.volume : (Number(live.volume) || 0);

            return {
              ...stock,
              currentPrice: live.price,
              changePct: Number(live.changeRate.toFixed(2)),
              volume: volNum > 0 ? `${Math.round(volNum).toLocaleString()}주` : stock.volume,
              idealEntryRange: [entryMin, entryMax] as [number, number],
              targetPrice1: tp1,
              targetPrice2: tp2,
              stopLoss: sl
            };
          }
          return stock;
        });
        return hasChanged ? updated : prev;
      });
    });

    return () => unsub();
  }, []);

  // 선택 종목이 변경되거나 scannedStocks가 갱신될 때 selectedStock 실시간 동기화
  useEffect(() => {
    const updated = scannedStocks.find(s => s.symbol === selectedStock.symbol);
    if (updated && (updated.currentPrice !== selectedStock.currentPrice || updated.changePct !== selectedStock.changePct)) {
      setSelectedStock(updated);
    }
  }, [scannedStocks, selectedStock.symbol]);

  // 화면 모드 및 필터
  const [screenMode, setScreenMode] = useState<"FLOOR" | "PRO">("FLOOR");
  const [activeScannerFilter, setActiveScannerFilter] = useState<string>("ALL");
  const [activeBottomTab, setActiveBottomTab] = useState<string>("WAR_ROOM");
  const [chartTimeframe, setChartTimeframe] = useState<string>("5m");

  // 모달 제어
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<AgentProfile | null>(null);
  const [isWarRoomModalOpen, setIsWarRoomModalOpen] = useState<boolean>(false);
  const [whyModalConfig, setWhyModalConfig] = useState<{ isOpen: boolean; mode: "LONG" | "WAIT" | "EXIT" }>({
    isOpen: false,
    mode: "LONG"
  });

  // 실시간 AI 분석관 상태 순환 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => {
        return prev.map(ag => {
          if (Math.random() < 0.15) {
            const statuses: AgentProfile["status"][] = ["CONFIRMED", "ANALYZING", "DEBATING", "DECIDING"];
            const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];
            return { ...ag, status: ag.department === "CIO" ? "DECIDING" : nextStatus };
          }
          return ag;
        });
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 스캐너 필터링
  const filteredStocks = useMemo(() => {
    if (activeScannerFilter === "ALL") return scannedStocks;
    if (activeScannerFilter === "PULLBACK") return scannedStocks.filter(s => s.primarySetup.includes("PULLBACK"));
    if (activeScannerFilter === "BREAKOUT") return scannedStocks.filter(s => s.primarySetup.includes("BREAKOUT"));
    if (activeScannerFilter === "MOMENTUM") return scannedStocks.filter(s => s.primarySetup.includes("MOMENTUM") || s.relativeStrength > 1.8);
    if (activeScannerFilter === "VWAP") return scannedStocks.filter(s => s.primarySetup.includes("VWAP"));
    if (activeScannerFilter === "SHORT") return scannedStocks.filter(s => s.direction.includes("SHORT"));
    return scannedStocks;
  }, [scannedStocks, activeScannerFilter]);

  // 포지션 수호자 상태
  const positionGuardian: PositionGuardianState = useMemo(() => {
    return {
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      entryPrice: selectedStock.idealEntryRange[0],
      currentPrice: selectedStock.currentPrice,
      pnlPct: Number(((selectedStock.currentPrice - selectedStock.idealEntryRange[0]) / selectedStock.idealEntryRange[0] * 100).toFixed(2)),
      pnlAmountKRW: 145000,
      positionHealthScore: 84,
      exitRiskScore: selectedStock.riskScore,
      structureStatus: "HEALTHY",
      vwapStatus: "ABOVE_HOLD",
      momentumStatus: "EXPANDING",
      flowStatus: "STRONG_BUY",
      recommendedAction: "HOLD",
      trailingStopPrice: selectedStock.idealEntryRange[0] + 500,
      tp1Hit: false,
      tp2Hit: false
    };
  }, [selectedStock]);

  // 매매 주문 실행 핸들러
  const handleExecuteOrder = async (side: "BUY" | "SELL") => {
    try {
      await executeTrade(
        selectedStock.symbol,
        selectedStock.name,
        selectedStock.market,
        side,
        10,
        selectedStock.currentPrice,
        `AI 자율투자 V6.2 ${getSetupNameKorean(selectedStock.primarySetup)}`,
        `30인 AI 전문단 합의: ${selectedStock.consensusScore}% 승인 (${getDirectionKorean(selectedStock.direction)})`,
        true
      );
      addToast({
        type: "SUCCESS",
        title: `⚡ ${selectedStock.name} ${side === "BUY" ? "매수" : "매도"} 주문 전송 완료`,
        message: `가격: ₩${(selectedStock.currentPrice ?? 0).toLocaleString()} | AI 승인율: ${selectedStock.consensusScore}%`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "주문 실패",
        message: err?.message || "주문 전송 중 오류가 발생했습니다."
      });
    }
  };

  // 한글 변환 헬퍼 함수들
  const getSetupNameKorean = (setup: string) => {
    if (setup.includes("PULLBACK")) return "첫 눌림목 반등 포착";
    if (setup.includes("BREAKOUT")) return "전고점 돌파 가속";
    if (setup.includes("MOMENTUM")) return "초강력 수급 모멘텀";
    if (setup.includes("VWAP")) return "기관 평단가(VWAP) 지지";
    if (setup.includes("SHORT")) return "고점 매물벽 하락 반락";
    return "AI 퀀트 알고리즘 진입";
  };

  const getDirectionKorean = (dir: string) => {
    if (dir === "STRONG_LONG") return "적극 매수 (강력 상승)";
    if (dir === "READY_LONG") return "분할 매수 (눌림목)";
    if (dir === "WAIT") return "매수 대기 (확인 후 진입)";
    if (dir === "SHORT") return "하락 베팅 / 비중 축소";
    return "중립 관망";
  };

  const getDepartmentKorean = (dept: AgentProfile["department"]) => {
    switch (dept) {
      case "MARKET": return "거시 시장 총괄실";
      case "TECHNICAL": return "기술적 차트 분석실";
      case "FLOW": return "수급·외인기관 추적실";
      case "INTELLIGENCE": return "AI 뉴스·공시 분석실";
      case "BULL_TEAM": return "상승 낙관 분석팀";
      case "BEAR_TEAM": return "하락 리스크 분석팀";
      case "RISK_COMMITTEE": return "리스크 관리 위원회";
      case "CIO": return "최고투자책임자(CIO)";
      default: return "전문 분석실";
    }
  };

  const getStatusBadge = (status: AgentProfile["status"]) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />승인 완료</span>;
      case "ANALYZING":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 animate-spin" />분석 중</span>;
      case "DEBATING":
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />격론 중</span>;
      case "DECIDING":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />최종 결정</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">대기 중</span>;
    }
  };

  // AI 분석관 부서별 분류
  const marketAgents = agents.filter(a => a.department === "MARKET");
  const techAgents = agents.filter(a => a.department === "TECHNICAL");
  const flowAgents = agents.filter(a => a.department === "FLOW");
  const intelAgents = agents.filter(a => a.department === "INTELLIGENCE");
  const bullAgents = agents.filter(a => a.department === "BULL_TEAM");
  const bearAgents = agents.filter(a => a.department === "BEAR_TEAM");
  const riskAgents = agents.filter(a => a.department === "RISK_COMMITTEE");
  const cioAgent = agents.find(a => a.department === "CIO") || agents[agents.length - 1];

  // 30인 AI 분석관 카드 렌더러 (크고 또렷한 폰트 & 가독성 극대화)
  const renderAgentDesk = (agent: AgentProfile) => {
    return (
      <div
        key={agent.id}
        onClick={() => setSelectedAgentForModal(agent)}
        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        title={`${agent.name} - 클릭하여 상세 분석 및 판단 근거 확인`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">{agent.avatar}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {agent.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {getDepartmentKorean(agent.department)}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            {getStatusBadge(agent.status)}
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg mb-2">
          {agent.currentTask}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">{agent.primaryMetric}</span>
          <span className="font-extrabold text-blue-600 dark:text-emerald-400 text-sm">{agent.score}점</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100">
      {/* 0. 24시간 AI 자율순환 매매 & 손실원인 DB 강화학습 엔진 */}
      <DayNight24hTradingEngineSuite
        addToast={(msg, type) =>
          addToast({
            type: type === "success" ? "SUCCESS" : type === "error" ? "ERROR" : "INFO",
            title: "24H AI 자율엔진",
            message: msg
          })
        }
      />

      {/* 1. 최상단 실시간 시장 국면 및 관제 헤더 (글씨 크기 확대 및 100% 한글화) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 브랜딩 및 실시간 상태 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  AI 자율투자 통합 관제 센터 V6.2 (30인 전문 AI 트레이딩 룸)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  실시간 자율 분석 중
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                30인 전문 AI 에이전트(거시경제·수급·차트·리스크) 실시간 전원 합의 기반 자율 트레이딩
              </p>
            </div>
          </div>

          {/* 시장 종합 지수 및 매크로 현황 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs md:text-sm font-semibold">
              <span className="text-slate-500 dark:text-slate-400">시장 국면:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-white font-bold">
                🟢 {marketRegime.regime === "BULL_EXPANSION" ? "상승 확장 국면" : marketRegime.regime} ({marketRegime.overallScore}점)
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">코스피 +{marketRegime.kospiChange}%</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">코스닥 +{marketRegime.kosdaqChange}%</span>
              <span className="text-slate-700 dark:text-slate-300">원/달러 ₩{marketRegime.usdKrw}</span>
            </div>

            {/* 보기 모드 전환 */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setScreenMode("FLOOR")}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition ${
                  screenMode === "FLOOR"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                30인 AI 분석단 뷰
              </button>
              <button
                onClick={() => setScreenMode("PRO")}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition ${
                  screenMode === "PRO"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                전문가 퀀트 뷰
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 핵심 3열 메인 작업대 (시인성 극대화, 폰트 확대, 100% 한글) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* [좌측 패널 3.5열] : 실시간 급등·포착 종목 랭킹 스캐너 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full">
            {/* 스캐너 타이틀 & 필터 탭 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  실시간 AI 급등·포착 종목 ({filteredStocks.length})
                </h2>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                0.5초 실시간 갱신
              </span>
            </div>

            {/* 조건별 빠른 필터 버튼 */}
            <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar">
              {[
                { id: "ALL", label: "전체" },
                { id: "PULLBACK", label: "눌림목 반등" },
                { id: "BREAKOUT", label: "신고가 돌파" },
                { id: "MOMENTUM", label: "수급 폭발" },
                { id: "VWAP", label: "기관 평단가 지지" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveScannerFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeScannerFilter === f.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 종목 리스트 카드 (크고 선명한 한글 정보) */}
            <div className="space-y-2.5 overflow-y-auto max-h-[640px] pr-1 mt-1">
              {filteredStocks.map((stock, idx) => {
                const isSelected = selectedStock.id === stock.id;
                const isPlus = stock.changePct >= 0;

                return (
                  <div
                    key={stock.id}
                    onClick={() => setSelectedStock(stock)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 shadow-md"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    {/* 상단: 순위 + 종목명 + 현재가 + 등락률 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          idx === 0 ? "bg-amber-500 text-white" : idx === 1 ? "bg-slate-400 text-white" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}>
                          {stock.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {stock.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {stock.symbol} · {stock.sectorName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          ₩{(stock.currentPrice ?? 0).toLocaleString()}
                        </div>
                        <div className={`text-xs font-extrabold flex items-center justify-end gap-0.5 ${
                          isPlus ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                        }`}>
                          {isPlus ? "+" : ""}{stock.changePct}%
                        </div>
                      </div>
                    </div>

                    {/* 중간: 핵심 진입 패턴 및 포지션 추천 */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                        🎯 {getSetupNameKorean(stock.primarySetup)}
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        거래대금: <span className="text-rose-600 dark:text-rose-400">{stock.moneyFlowKRW}</span>
                      </span>
                    </div>

                    {/* 하단: AI 합의율 & 매수가 / 손절가 가이드 */}
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg font-medium">
                      <div>
                        <div className="text-slate-400">AI 합의율</div>
                        <div className="font-extrabold text-blue-600 dark:text-blue-400">{stock.consensusScore}%</div>
                      </div>
                      <div>
                        <div className="text-slate-400">적정 매수가</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">₩{(stock.idealEntryRange[0] ?? 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">손절 기준가</div>
                        <div className="font-bold text-rose-600 dark:text-rose-400">₩{(stock.stopLossPrice ?? 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* [중앙 패널 5열] : 선택 종목 심층 분석 차트 & CIO 최종 매매 결정 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. 선택 종목 요약 헤더 카드 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  {selectedStock.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedStock.name}
                    </h2>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      ({selectedStock.symbol})
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold text-xs">
                      {selectedStock.sectorName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    핵심 모멘텀: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStock.catalystTag}</span>
                  </div>
                </div>
              </div>

              {/* 실시간 시세 */}
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ₩{(selectedStock.currentPrice ?? 0).toLocaleString()}
                </div>
                <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  +{selectedStock.changePct}% (거래량 강도 {selectedStock.rvol}배)
                </div>
              </div>
            </div>

            {/* 차트 주기 선택 버튼 */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">차트 주기:</span>
                {["1분봉", "5분봉", "15분봉", "1시간봉", "일봉", "주봉"].map((tf, i) => {
                  const tfCode = ["1m", "5m", "15m", "1h", "1D", "1W"][i];
                  return (
                    <button
                      key={tfCode}
                      onClick={() => setChartTimeframe(tfCode)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        chartTimeframe === tfCode
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWhyModalConfig({ isOpen: true, mode: "LONG" })}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  상승 추천 근거 보기
                </button>
              </div>
            </div>
          </div>

          {/* AI 100% 자율매매 작동 매커니즘 정밀 안내 카운터 */}
          <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/90 border border-cyan-500/40 rounded-2xl p-4 text-white space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg text-xs font-black animate-pulse">
                  🤖 100% AI 자율 자동 매매 (FULL-AUTO) 가동 중
                </span>
                <span className="text-xs text-slate-300 font-bold">
                  24시간 AI가 어디서 사고 팔며 이익을 실현하는지 실시간 관제합니다.
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-300 font-extrabold">
                한국투자증권(KIS) OpenAPI 0.1초 자동 발주 연동
              </span>
            </div>

            {/* 자율 매매 어디서 사고 팔고 얼마를 이익보는지 3단계 요약 */}
            {(() => {
              const isUsd = selectedStock.symbol?.match(/^[A-Z]+$/) || selectedStock.name?.includes("엔비디아") || selectedStock.name?.includes("테슬라");
              const currSign = isUsd ? "$" : "₩";
              const entryBase = selectedStock.idealEntryRange ? selectedStock.idealEntryRange[0] : selectedStock.currentPrice;
              const tp1Pct = ((selectedStock.targetPrice1 - entryBase) / entryBase * 100).toFixed(1);
              const tp2Pct = ((selectedStock.targetPrice2 - entryBase) / entryBase * 100).toFixed(1);
              
              // Standard trade allocation per position: 5,000,000 KRW or $5,000 USD
              const capital = isUsd ? 5000 : 5000000;
              const profit1 = Math.round(capital * (parseFloat(tp1Pct) / 100));
              const profit2 = Math.round(capital * (parseFloat(tp2Pct) / 100));

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/30 space-y-1">
                    <div className="text-cyan-400 font-black flex items-center justify-between">
                      <span>1. 어디서 사고 (AI 자율 매수)</span>
                      <span className="text-[10px] text-cyan-300 font-mono font-bold">종목: {selectedStock.name}</span>
                    </div>
                    <div className="text-white font-extrabold text-sm font-mono">
                      {currSign}{(selectedStock.idealEntryRange[0] ?? 0).toLocaleString()} ~ {currSign}{(selectedStock.idealEntryRange[1] ?? 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      30인 AI 수급/돌파 시그널 합의 시 매수 타점에서 KIS API 자동 발주
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 space-y-1">
                    <div className="text-emerald-400 font-black flex items-center gap-1">
                      <span>2. 어디서 팔고 (AI 자율 매도)</span>
                    </div>
                    <div className="text-white font-extrabold text-sm font-mono">
                      1차 {currSign}{(selectedStock.targetPrice1 ?? 0).toLocaleString()} / 2차 {currSign}{(selectedStock.targetPrice2 ?? 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      목표 도달 시 1/2차 익절 분할 매도 및 칼손절선({currSign}{(selectedStock.stopLossPrice ?? 0).toLocaleString()}) 자동 청산
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 space-y-1">
                    <div className="text-amber-300 font-black flex items-center gap-1">
                      <span>3. 얼마의 이익을 보는지 (선택종목 목표수익)</span>
                    </div>
                    <div className="text-amber-300 font-extrabold text-sm font-mono">
                      {isUsd 
                        ? `+${tp1Pct}% ~ +${tp2Pct}% (+$${(profit1 ?? 0).toLocaleString()} ~ +$${(profit2 ?? 0).toLocaleString()} / $5천불 기준)`
                        : `+${tp1Pct}% ~ +${tp2Pct}% (+${Math.round(profit1/10000)}만 ~ +${Math.round(profit2/10000)}만원 / 500만 투자 시)`
                      }
                    </div>
                    <p className="text-[11px] text-slate-400">
                      [{selectedStock.name}] 가격 연동 AI 리스크 대비 익절 비율(R배수 &gt; 2.0) 실시간 자동 연산
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 2. 최고투자책임자(CIO) 최종 매매 승인 & 실행 카드 (핵심 하이라이트) */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    AI 최고투자책임자(CIO) 최종 의사결정
                  </h3>
                  <p className="text-xs text-blue-100">
                    30인 전문 분석단 검증 완료 · 실시간 자율주문 승인 대기
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 font-black text-xs">
                {getDirectionKorean(selectedStock.direction)}
              </span>
            </div>

            {/* 의사결정 수치 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="bg-black/25 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="text-xs text-blue-200 font-medium">30인 합의 승인률</div>
                <div className="text-xl font-black text-emerald-300 mt-0.5">
                  {selectedStock.consensusScore}%
                </div>
                <div className="text-[11px] text-blue-200 mt-0.5">상승 14 : 하락 6</div>
              </div>

              <div className="bg-black/25 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="text-xs text-blue-200 font-medium">추천 분할 매수가</div>
                <div className="text-lg font-black text-white mt-0.5">
                  ₩{(selectedStock.idealEntryRange[0] ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-blue-200 mt-0.5">~ ₩{(selectedStock.idealEntryRange[1] ?? 0).toLocaleString()}</div>
              </div>

              <div className="bg-black/25 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="text-xs text-blue-200 font-medium">1차 목표가 (익절)</div>
                <div className="text-lg font-black text-amber-300 mt-0.5">
                  ₩{(selectedStock.targetPrice1 ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-200 mt-0.5">예상 수익률 +2.56%</div>
              </div>

              <div className="bg-black/25 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <div className="text-xs text-blue-200 font-medium">칼손절 기준선</div>
                <div className="text-lg font-black text-rose-300 mt-0.5">
                  ₩{(selectedStock.stopLossPrice ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-rose-200 mt-0.5">최대 손실 -1.28%</div>
              </div>
            </div>

            {/* 원클릭 매매 실행 버튼 */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => handleExecuteOrder("BUY")}
                className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-slate-950" />
                <span>AI 권장가 즉시 매수 집행 (₩{(selectedStock.currentPrice ?? 0).toLocaleString()})</span>
              </button>

              <button
                onClick={() => handleExecuteOrder("SELL")}
                className="py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition cursor-pointer"
              >
                즉시 매도
              </button>
            </div>
          </div>

          {/* 3. 포지션 수호자 & 리스크 실시간 감시 패널 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  실시간 포지션 수호 & 위험 감시자
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                포지션 건전성 84점 (매우 안전)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">차트 구조 안정성</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">상승 N자형 지속</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">기관 평단가 위치</div>
                <div className="font-bold text-blue-600 dark:text-blue-400 mt-1">평단가 상단 안착</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">수급 모멘텀 강도</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-1">거래량 가속 중</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">트레일링 스탑 가격</div>
                <div className="font-bold text-slate-900 dark:text-white mt-1">₩{(positionGuardian.trailingStopPrice ?? 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* [우측 패널 3.5열] : 30인 AI 실시간 격론 & 4대 핵심 근거 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full">
            {/* 우측 탭 네비게이션 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveBottomTab("WAR_ROOM")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    activeBottomTab === "WAR_ROOM"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  ⚔️ AI 실시간 격론
                </button>
                <button
                  onClick={() => setActiveBottomTab("EVIDENCE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    activeBottomTab === "EVIDENCE"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  📋 4대 투자 근거
                </button>
              </div>

              <button
                onClick={() => setIsWarRoomModalOpen(true)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                title="토론실 전체화면 확대"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* 탭 내용 1: AI 실시간 격론 (상승 낙관 vs 하락 리스크) */}
            {activeBottomTab === "WAR_ROOM" && (
              <div className="space-y-3 mt-3 overflow-y-auto max-h-[640px] pr-1">
                {/* 상승 낙관팀 대표 의견 */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      상승 낙관 분석팀 (14명 동의)
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">평균 92점</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    "외국인·기관 2,800억 이상 연속 순매수와 함께 5분봉 VWAP 지지선에서 정확하게 눌림목 반등 형성. 거래량이 직전 대비 3.4배 폭발하여 1차 목표가 ₩84,100원 도달 확률 82% 이상으로 산출됨."
                  </p>
                </div>

                {/* 하락 리스크팀 대표 의견 */}
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                      하락 리스크 경고팀 (6명 유보)
                    </span>
                    <span className="font-extrabold text-rose-600 dark:text-rose-400">위험도 24점</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    "직전 고점인 ₩82,800원 부근에 단기 매물벽이 집중되어 있어 시장가 추격 매수는 절대 금지. 반드시 ₩82,000원 이하 지정가 분할 매수로 진입하고 ₩80,950원 이탈 시 엄격 손절 필요."
                  </p>
                </div>

                {/* 리스크 위원회 권고 */}
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-500" />
                      리스크 관리 위원회 최종 권고
                    </span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">비중 15%</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    "손익비(Reward/Risk) 2.3 : 1 충족. 켈리 최적 포트폴리오 비중 15% 이내로 분할 진입 시 계좌 건전성 유지 승인."
                  </p>
                </div>
              </div>
            )}

            {/* 탭 내용 2: 4대 핵심 투자 근거 (증거 목록) */}
            {activeBottomTab === "EVIDENCE" && (
              <div className="space-y-2.5 mt-3 overflow-y-auto max-h-[640px] pr-1">
                {evidences.map(evi => (
                  <div
                    key={evi.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                        {evi.sentiment === "BULLISH" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        )}
                        {evi.title}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-extrabold">{evi.score}점</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {evi.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 하단 30인 AI 전문 분석단 실시간 근무 현황 (시원하고 직관적인 카드 그리드) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                30인 전문 AI 분석단 실시간 근무 현황
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                각 AI 분석관 카드를 클릭하면 성과 기록, 최근 매매 신호, 세부 알고리즘 판단 내역을 열람할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 승인 완료
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 분석 중
            </span>
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> 격론 중
            </span>
          </div>
        </div>

        {/* 부서별 AI 분석관 배치 그리드 (가독성 높은 2~4열 반응형 그리드) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {agents.map(agent => renderAgentDesk(agent))}
        </div>
      </div>

      {/* 대화형 상세 모달들 */}
      <AgentDetailInspectModal
        agent={selectedAgentForModal}
        isOpen={Boolean(selectedAgentForModal)}
        onClose={() => setSelectedAgentForModal(null)}
      />

      <AiWarRoomModal
        isOpen={isWarRoomModalOpen}
        onClose={() => setIsWarRoomModalOpen(false)}
        stock={selectedStock}
        agents={agents}
        evidences={evidences}
        onOpenAgentDetail={(ag) => {
          setIsWarRoomModalOpen(false);
          setSelectedAgentForModal(ag);
        }}
      />

      <WhyExplainerModal
        isOpen={whyModalConfig.isOpen}
        onClose={() => setWhyModalConfig(prev => ({ ...prev, isOpen: false }))}
        stock={selectedStock}
        mode={whyModalConfig.mode}
      />
    </div>
  );
};
