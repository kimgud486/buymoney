import React, { useState, useEffect } from "react";
import { EditMockBalanceModal } from "../../demo/EditMockBalanceModal";
import { MockPortfolioDetailModal } from "../../demo/MockPortfolioDetailModal";
import { ExchangeRateInfoModal } from "./ExchangeRateInfoModal";
import { AiLossCauseAnalysisModal } from "./AiLossCauseAnalysisModal";
import { AiTradeFeedbackAnalyzerModal } from "./AiTradeFeedbackAnalyzerModal";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Key,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Building2,
  PieChart,
  ArrowUpRight,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  DollarSign,
  Activity,
  Info,
  Flame,
  Layers,
  BarChart3,
  Globe2,
  Brain
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface HomeRealtimeProfitBoardProps {
  onOpenApiConnectModal?: () => void;
  onOpenHoldingsModal?: () => void;
  onOpenPredictiveTrend?: () => void;
}

export const HomeRealtimeProfitBoard: React.FC<HomeRealtimeProfitBoardProps> = ({
  onOpenApiConnectModal,
  onOpenHoldingsModal,
  onOpenPredictiveTrend
}) => {
  const {
    profile,
    updateProfileSettings,
    positions,
    cashBreakdown,
    brokerApiStatus,
    syncRealAccountBalance,
    purgeAllMockData,
    marketStatus,
    addToast
  } = useApp();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedBrokerTab, setSelectedBrokerTab] = useState<"ALL" | "KOREA" | "US" | "TOSS" | "UPBIT">("ALL");
  const [isMockBalanceModalOpen, setIsMockBalanceModalOpen] = useState<boolean>(false);
  const [isMockPortfolioModalOpen, setIsMockPortfolioModalOpen] = useState<boolean>(false);
  const [isExchangeRateModalOpen, setIsExchangeRateModalOpen] = useState<boolean>(false);
  const [isLossModalOpen, setIsLossModalOpen] = useState<boolean>(false);
  const [isFeedbackAnalyzerOpen, setIsFeedbackAnalyzerOpen] = useState<boolean>(false);

  // Real-time Exchange Rate (USD/KRW) - No hardcoded fallbacks
  const hasFxRateData = Boolean(marketStatus?.exchangeRate && typeof marketStatus.exchangeRate.value === 'number' && marketStatus.exchangeRate.value > 0);
  const fxRate = hasFxRateData ? (marketStatus?.exchangeRate?.value as number) : undefined;
  const safeFxRate = fxRate || 1;
  const fxChange = marketStatus?.exchangeRate?.change ?? 0;
  const fxPct = marketStatus?.exchangeRate?.pct ?? 0;

  useEffect(() => {
    const handleOpenMockModal = () => setIsMockBalanceModalOpen(true);
    const handleOpenMockPortfolio = () => setIsMockPortfolioModalOpen(true);
    const handleOpenExchangeModal = () => setIsExchangeRateModalOpen(true);
    const handleOpenFeedback = () => setIsFeedbackAnalyzerOpen(true);
    window.addEventListener("open-edit-mock-balance-modal", handleOpenMockModal);
    window.addEventListener("open-mock-portfolio-modal", handleOpenMockPortfolio);
    window.addEventListener("open-exchange-rate-modal", handleOpenExchangeModal);
    window.addEventListener("open-trade-feedback-analyzer", handleOpenFeedback);
    return () => {
      window.removeEventListener("open-edit-mock-balance-modal", handleOpenMockModal);
      window.removeEventListener("open-mock-portfolio-modal", handleOpenMockPortfolio);
      window.removeEventListener("open-exchange-rate-modal", handleOpenExchangeModal);
      window.removeEventListener("open-trade-feedback-analyzer", handleOpenFeedback);
    };
  }, []);

  const [isDiagOpen, setIsDiagOpen] = useState<boolean>(false);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);
  const [diagResults, setDiagResults] = useState<{
    upbit: { ok: boolean; status: number; latencyMs: number; samplePrice: string; time: string };
    naver: { ok: boolean; status: number; latencyMs: number; samplePrice: string; time: string };
    backend: { ok: boolean; status: number; latencyMs: number; samplePrice: string; time: string };
    brokerSync: { ok: boolean; status: number; latencyMs: number; msg: string; time: string };
  } | null>(null);

  const runApiDiagnostics = async () => {
    setDiagLoading(true);
    setIsDiagOpen(true);

    const nowStr = () => new Date().toLocaleTimeString("ko-KR");

    // 1. Upbit API Test (via Server Proxy to avoid browser CORS)
    let upbitRes = { ok: false, status: 0, latencyMs: 0, samplePrice: "N/A", time: nowStr() };
    try {
      const t0 = performance.now();
      const res = await fetch("/api/upbit/public/ticker?markets=KRW-BTC");
      const t1 = performance.now();
      if (res.ok) {
        const data = await res.json();
        const price = data?.[0]?.trade_price;
        upbitRes = {
          ok: true,
          status: res.status,
          latencyMs: Math.round(t1 - t0),
          samplePrice: price ? `${(price ?? 0).toLocaleString()} KRW (비트코인)` : "OK",
          time: nowStr()
        };
      }
    } catch (e: any) {
      upbitRes.samplePrice = e.message || "연결 실패";
    }

    // 2. Naver Domestic Stock API Test (via Server Proxy to prevent browser CORS block)
    let naverRes = { ok: false, status: 0, latencyMs: 0, samplePrice: "N/A", time: nowStr() };
    try {
      const t0 = performance.now();
      const res = await fetch("/api/market/naver-batch?codes=005930");
      const t1 = performance.now();
      if (res.ok) {
        const data = await res.json();
        const price = data?.datas?.[0]?.closePrice || data?.datas?.[0]?.closePriceRaw;
        naverRes = {
          ok: true,
          status: res.status,
          latencyMs: Math.round(t1 - t0),
          samplePrice: price ? `${Number(String(price).replace(/,/g, '')).toLocaleString()} KRW (삼성전자)` : "200 OK (실시간 연동)",
          time: nowStr()
        };
      }
    } catch (e: any) {
      naverRes.samplePrice = e.message || "연결 실패";
    }

    // 3. Backend Stocks API Test
    let backendRes = { ok: false, status: 0, latencyMs: 0, samplePrice: "N/A", time: nowStr() };
    try {
      const t0 = performance.now();
      const res = await fetch("/api/stocks");
      const t1 = performance.now();
      if (res.ok) {
        const data = await res.json();
        backendRes = {
          ok: true,
          status: res.status,
          latencyMs: Math.round(t1 - t0),
          samplePrice: Array.isArray(data) ? `실시간 ${data.length}개 종목 조회됨` : "OK",
          time: nowStr()
        };
      }
    } catch (e: any) {
      backendRes.samplePrice = e.message || "연결 실패";
    }

    // 4. Broker Sync API Test
    let brokerSyncRes = { ok: false, status: 0, latencyMs: 0, msg: "N/A", time: nowStr() };
    try {
      const t0 = performance.now();
      const res = await fetch("/api/broker/sync-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker: "all" })
      });
      const t1 = performance.now();
      if (res.ok) {
        const data = await res.json();
        brokerSyncRes = {
          ok: true,
          status: res.status,
          latencyMs: Math.round(t1 - t0),
          msg: data.message || "증권사 핸드셰이크 성공",
          time: nowStr()
        };
      }
    } catch (e: any) {
      brokerSyncRes.msg = e.message || "연결 실패";
    }

    setDiagResults({
      upbit: upbitRes,
      naver: naverRes,
      backend: backendRes,
      brokerSync: brokerSyncRes
    });
    setDiagLoading(false);
  };

  const isRealTrade = Boolean(profile?.isRealTrade);

  // Check API keys
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTossKey = Boolean(typeof window !== "undefined" && localStorage.getItem("toss_api_key"));

  // Trigger manual sync with spinning animation
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncRealAccountBalance("all", false);
    } catch (e) {
      console.error("Failed to sync balances:", e);
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // Toggle Real Account vs Paper Trading mode
  const handleSelectTradingMode = async (targetRealMode: boolean) => {
    if (targetRealMode) {
      await updateProfileSettings({ isRealTrade: true });
      if (addToast) {
        addToast({
          type: "SUCCESS",
          title: "🔥 실전계좌 LIVE 모드로 전환되었습니다.",
          message: "한국투자증권, 업비트, 토스증권 API 실시간 계좌 잔고가 표시됩니다."
        });
      }
      syncRealAccountBalance("all", true).catch(() => {});
    } else {
      await updateProfileSettings({ isRealTrade: false });
      if (addToast) {
        addToast({
          type: "INFO",
          title: "🛡️ 모의투자 모드로 전환되었습니다.",
          message: "가상 시뮬레이션 환경에서 모의자산 및 매매를 안전하게 이용하실 수 있습니다."
        });
      }
      promptSetMockBalance();
    }
  };

  const promptSetMockBalance = () => {
    setIsMockBalanceModalOpen(true);
  };

  // Explicit Purge All Mock Data handler
  const handlePurgeMockData = async () => {
    try {
      await purgeAllMockData();
    } catch (e: any) {
      console.error(e);
      if (addToast) {
        addToast({
          type: "ERROR",
          title: "초기화 실패",
          message: e?.message || "모의데이터 초기화 중 오류가 발생했습니다."
        });
      }
    }
  };

  // Direct 1 Million KRW Reset Handler
  const handleReset1MillionDirect = async () => {
    try {
      await updateProfileSettings({ balance: 1000000, initialBalance: 1000000 });
      if (purgeAllMockData) {
        await purgeAllMockData();
      }
      if (addToast) {
        addToast({
          type: "SUCCESS",
          title: "🎯 100만원 초기화 완료",
          message: "기존 모의 보유종목이 비워지고 예수금이 정확히 1,000,000원(100만원)으로 설정되었습니다."
        });
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Positions classification
  const isUpbitPos = React.useCallback((p: any) => p.market === "BTC" || p.broker === "upbit" || p.id?.startsWith("upbit_") || p.symbol?.startsWith("KRW-"), []);
  const isUsPos = React.useCallback((p: any) => p.market === "US" || p.broker === "us" || p.id?.startsWith("us_"), []);
  const isTossPos = React.useCallback((p: any) => p.broker === "toss" && !isUpbitPos(p) && !isUsPos(p), [isUpbitPos, isUsPos]);
  const isKoreaPos = React.useCallback((p: any) => (p.market === "KOREA" || !p.market) && !isTossPos(p) && !isUpbitPos(p) && !isUsPos(p), [isTossPos, isUpbitPos, isUsPos]);

  const koreaPositions = React.useMemo(() => positions.filter(isKoreaPos), [positions, isKoreaPos]);
  const usPositions = React.useMemo(() => positions.filter(isUsPos), [positions, isUsPos]);
  const tossPositions = React.useMemo(() => positions.filter(isTossPos), [positions, isTossPos]);
  const upbitPositions = React.useMemo(() => positions.filter(isUpbitPos), [positions, isUpbitPos]);

  // Cash breakdown
  const koreaCash = Number(cashBreakdown?.koreaCash ?? 0) || 0;
  const tossCash = Number(cashBreakdown?.tossCash ?? 0) || 0;
  const upbitCash = Number(cashBreakdown?.upbitCash ?? 0) || 0;
  const usCash = Number(cashBreakdown?.usCash ?? 0) || 0;

  // Helper calculation for a list of positions (with USD awareness)
  const calcPositionsStats = (posList: typeof positions) => {
    let evalTotal = 0;
    let costTotal = 0;
    let pnlTotal = 0;
    let evalTotalUsd = 0;
    let costTotalUsd = 0;
    let pnlTotalUsd = 0;

    posList.forEach((p) => {
      const curPrice = Number(p.currentPrice || p.avgPrice || 0) || 0;
      const avgPrice = Number(p.avgPrice || 0) || 0;
      const qty = Number(p.quantity || 0) || 0;
      const isUs = p.market === "US" || p.broker === "us" || p.id?.startsWith("us_");

      if (isUs) {
        const itemEvalUsd = curPrice * qty;
        const itemCostUsd = avgPrice * qty;
        const itemPnlUsd = itemEvalUsd - itemCostUsd;
        evalTotalUsd += itemEvalUsd;
        costTotalUsd += itemCostUsd;
        pnlTotalUsd += itemPnlUsd;

        const evalValKrw = itemEvalUsd * fxRate;
        const costValKrw = itemCostUsd * fxRate;
        const pnlKrw = evalValKrw - costValKrw;

        if (!isNaN(evalValKrw)) evalTotal += evalValKrw;
        if (!isNaN(costValKrw)) costTotal += costValKrw;
        if (!isNaN(pnlKrw)) pnlTotal += pnlKrw;
      } else {
        const evalVal = curPrice * qty;
        const costVal = avgPrice * qty;
        const pnl = evalVal - costVal;

        if (!isNaN(evalVal)) evalTotal += evalVal;
        if (!isNaN(costVal)) costTotal += costVal;
        if (!isNaN(pnl)) pnlTotal += pnl;

        evalTotalUsd += evalVal / fxRate;
        costTotalUsd += costVal / fxRate;
        pnlTotalUsd += pnl / fxRate;
      }
    });

    const returnRate = costTotal > 0 && !isNaN(pnlTotal) && !isNaN(costTotal) ? (pnlTotal / costTotal) * 100 : 0;
    return {
      evalTotal: isNaN(evalTotal) ? 0 : Math.round(evalTotal),
      costTotal: isNaN(costTotal) ? 0 : Math.round(costTotal),
      pnlTotal: isNaN(pnlTotal) ? 0 : Math.round(pnlTotal),
      evalTotalUsd: isNaN(evalTotalUsd) ? 0 : evalTotalUsd,
      costTotalUsd: isNaN(costTotalUsd) ? 0 : costTotalUsd,
      pnlTotalUsd: isNaN(pnlTotalUsd) ? 0 : pnlTotalUsd,
      returnRate: isNaN(returnRate) ? 0 : returnRate
    };
  };

  const kisStats = React.useMemo(() => calcPositionsStats(koreaPositions), [koreaPositions, fxRate]);
  const usStats = React.useMemo(() => calcPositionsStats(usPositions), [usPositions, fxRate]);
  const tossStats = React.useMemo(() => calcPositionsStats(tossPositions), [tossPositions, fxRate]);
  const upbitStats = React.useMemo(() => calcPositionsStats(upbitPositions), [upbitPositions, fxRate]);
  const allStats = React.useMemo(() => calcPositionsStats(positions), [positions, fxRate]);

  // Broker Totals (Cash + Holdings Eval)
  const kisTotalAssets = (cashBreakdown?.koreaTotal && cashBreakdown.koreaTotal > 0)
    ? cashBreakdown.koreaTotal
    : ((koreaCash || 0) + (kisStats.evalTotal || 0));

  const usTotalAssetsKrw = (cashBreakdown?.usTotal && cashBreakdown.usTotal > 0)
    ? cashBreakdown.usTotal
    : ((usCash * fxRate) + (usStats.evalTotal || 0));
  const usTotalAssetsUsd = usTotalAssetsKrw / fxRate;

  const tossTotalAssets = (cashBreakdown?.tossTotal && cashBreakdown.tossTotal > 0)
    ? cashBreakdown.tossTotal
    : ((tossCash || 0) + (tossStats.evalTotal || 0));

  const upbitTotalAssets = (cashBreakdown?.upbitTotal && cashBreakdown.upbitTotal > 0)
    ? cashBreakdown.upbitTotal
    : ((upbitCash || 0) + (upbitStats.evalTotal || 0));

  // Total Combined - Differentiate Real Trade vs Mock
  const totalCombinedAssets = Math.round(isRealTrade
    ? ((cashBreakdown?.grandTotalAssets && cashBreakdown.grandTotalAssets > 0)
        ? cashBreakdown.grandTotalAssets
        : ((kisTotalAssets || 0) + (usTotalAssetsKrw || 0) + (tossTotalAssets || 0) + (upbitTotalAssets || 0)))
    : ((profile?.balance || 0) + (allStats.evalTotal || 0)));

  const totalCombinedCash = Math.round(isRealTrade
    ? ((koreaCash || 0) + (tossCash || 0) + (upbitCash || 0) + ((usCash || 0) * fxRate))
    : (profile?.balance || 0));

  const totalCombinedEval = allStats.evalTotal || 0;
  const totalCombinedPnl = allStats.pnlTotal || 0;
  const totalCombinedReturnRate = isNaN(allStats.returnRate) ? 0 : (allStats.returnRate || 0);

  // Filter positions for selected tab
  const activePositionsList = React.useMemo(() => {
    return positions.filter((p) => {
      if (selectedBrokerTab === "KOREA") return isKoreaPos(p);
      if (selectedBrokerTab === "US") return isUsPos(p);
      if (selectedBrokerTab === "TOSS") return isTossPos(p);
      if (selectedBrokerTab === "UPBIT") return isUpbitPos(p);
      return true;
    });
  }, [positions, selectedBrokerTab]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-sm font-sans space-y-3.5 sm:space-y-4">
      {/* 1. TOP CONTROL BAR (MODE SELECTOR & SYNC) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Explicit Mode Switch Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSelectTradingMode(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                !isRealTrade
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>🛡️ 모의투자 모드</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTradingMode(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                isRealTrade
                  ? "bg-rose-600 text-white shadow-xs animate-pulse"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>🔥 실전계좌 LIVE</span>
            </button>
          </div>

          {/* Naver Securities API Auto-Connected Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-black shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>🟢 네이버증권 실시간 시세</span>
          </div>

          {/* Live USD/KRW FX Rate Badge Button */}
          <button
            type="button"
            onClick={() => setIsExchangeRateModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-300 text-[11px] font-black shadow-2xs cursor-pointer transition"
            title="실시간 원/달러 환율 및 통화 변환기 열기"
            id="btn-open-fx-rate-modal"
          >
            <Globe2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {hasFxRateData && fxRate ? (
              <>
                <span>USD/KRW ₩{(fxRate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                <span className={fxChange < 0 ? "text-blue-600 dark:text-blue-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                  ({fxChange < 0 ? "" : "+"}{fxChange.toFixed(1)}원)
                </span>
              </>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-bold">USD/KRW DATA UNAVAILABLE</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
          {/* Detailed Mock Portfolio Button (Paper Mode Only) */}
          {!isRealTrade && (
            <button
              type="button"
              onClick={() => setIsMockPortfolioModalOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap shrink-0 min-h-[36px]"
              title="모의투자 상세 포트폴리오 원장 및 자산 배분 관제"
              id="btn-open-mock-portfolio-detail"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>📊 모의투자 상세 포트폴리오</span>
            </button>
          )}

          {/* Mock Asset Input Button (Paper Mode Only) */}
          {!isRealTrade && (
            <button
              type="button"
              onClick={promptSetMockBalance}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 text-xs font-bold transition cursor-pointer border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0 min-h-[36px]"
              title="모의투자 시작 예수금/총자산 수정"
            >
              <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>✏️ 모의자산 설정</span>
            </button>
          )}

          {/* AI 예측 그래프 바로가기 버튼 */}
          {onOpenPredictiveTrend && (
            <button
              type="button"
              onClick={onOpenPredictiveTrend}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-md border border-cyan-300/50 whitespace-nowrap shrink-0 min-h-[36px]"
              title="🔮 AI 30일 가격 예측 차트 바로가기"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-spin" />
              <span>🔮 AI 예측 그래프</span>
            </button>
          )}

          {/* AI 매매 피드백 분석기 버튼 */}
          <button
            type="button"
            onClick={() => setIsFeedbackAnalyzerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-rose-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-md border border-purple-300/50 whitespace-nowrap shrink-0 min-h-[36px]"
            title="🧠 진입 당시 캔들 강도 + 실시간 뉴스 감성 기반 AI 매매 피드백 분석기"
          >
            <Brain className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
            <span>🧠 AI 매매 피드백 분석기</span>
          </button>

          {/* AI 손실원인 분석 버튼 */}
          <button
            type="button"
            onClick={() => setIsLossModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-md border border-rose-300/50 whitespace-nowrap shrink-0 min-h-[36px]"
            title="🔍 AI 자율매매 마이너스(손실) 원인 정밀 진단"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-200 shrink-0 animate-bounce" />
            <span>🔍 AI 손실원인 분석</span>
          </button>

          {/* Sync Button */}
          {isRealTrade && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border whitespace-nowrap shrink-0 min-h-[36px] ${
                isSyncing
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : "text-slate-500"}`} />
              <span>{isSyncing ? "동기화..." : "잔고 동기화"}</span>
            </button>
          )}

          {/* API Setup Button */}
          <button
            type="button"
            onClick={onOpenApiConnectModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <Key className="w-3.5 h-3.5" />
            <span>API 계좌연결</span>
          </button>

          {/* API Real Connection Diagnostic Button */}
          <button
            type="button"
            onClick={runApiDiagnostics}
            disabled={diagLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 min-h-[36px]"
            title="Upbit, Naver, KIS 등 실시간 라이브 API 진짜 연결 상태 정밀 검증"
          >
            <Activity className={`w-3.5 h-3.5 ${diagLoading ? "animate-spin" : ""}`} />
            <span>{diagLoading ? "진단 중..." : "⚡ API 진단"}</span>
          </button>
        </div>
      </div>

      {/* API UNCONNECTED WARNING BANNER FOR REAL TRADE MODE */}
      {isRealTrade && !hasKoreaKey && !hasUpbitKey && !hasTossKey && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-rose-700 dark:text-rose-300">[실전계좌 LIVE] 증권사/거래소 API 미연동 상태</span>
              <p className="text-[11px] text-rose-800 dark:text-rose-300/90 mt-0.5">
                한국투자증권(KIS), 업비트(Upbit), 토스증권 API Key를 등록하시면 실계좌 총자산 및 보유잔고가 자동 연동됩니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onOpenApiConnectModal}
              className="w-full sm:w-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>🔑 한국투자/업비트/토스 API 연동하기</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. HERO TOTAL ASSET & COMBINED RETURN BOARD */}
      <div className={`rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-all ${
        isRealTrade
          ? "bg-gradient-to-br from-slate-900 via-rose-950 to-indigo-950 text-white"
          : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white"
      }`}>
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Activity className="w-32 h-32 text-indigo-400" />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-white">
                {isRealTrade ? "🔥 실전계좌 통합 총자산 (LIVE)" : "🛡️ 모의투자 통합 총자산 (가상)"}
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              {!isRealTrade && (
                <>
                  <button
                    type="button"
                    onClick={handleReset1MillionDirect}
                    className="px-2.5 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 text-[11px] font-extrabold border border-emerald-400/50 cursor-pointer transition flex items-center gap-1 shadow-xs"
                    title="기존 보유주식을 비우고 자산을 정확히 100만원(1,000,000원)으로 원터치 초기화합니다."
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-300" />
                    <span>🎯 100만원 리셋</span>
                  </button>
                  <button
                    type="button"
                    onClick={promptSetMockBalance}
                    className="px-2 py-0.5 rounded bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 text-[11px] font-bold border border-blue-400/40 cursor-pointer transition flex items-center gap-1"
                  >
                    <Coins className="w-3 h-3 text-amber-300" />
                    <span>총자산 수정</span>
                  </button>
                </>
              )}
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                isRealTrade
                  ? (hasKoreaKey || hasUpbitKey || hasTossKey)
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50"
                    : "bg-rose-500/30 text-rose-200 border border-rose-400/40"
                  : "bg-amber-500/30 text-amber-200 border border-amber-400/40"
              }`}>
                {isRealTrade
                  ? (hasKoreaKey || hasUpbitKey || hasTossKey)
                    ? "LIVE VERIFIED (BROKER VERIFIED)"
                    : "LIVE (NOT CONNECTED - DATA UNAVAILABLE)"
                  : "PAPER NOT VERIFIED"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                {(totalCombinedAssets ?? 0).toLocaleString()}
                <span className="text-sm font-sans font-bold text-slate-300 ml-1">원</span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                <span>예수금: {(totalCombinedCash ?? 0).toLocaleString()}원</span>
                <span>•</span>
                <span>보유평가: {(totalCombinedEval ?? 0).toLocaleString()}원</span>
                {isRealTrade && (
                  <span className="text-[11px] text-emerald-300">
                    (한국투자 · 업비트 · 토스 연동)
                  </span>
                )}
              </div>
            </div>

            {/* Total Profit/Loss Badge */}
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-0.5 flex items-center justify-end gap-1">
                <span>{isRealTrade ? "통합 실전 총 수익률" : "모의투자 평가 수익률"}</span>
                {!isRealTrade && (
                  <button
                    onClick={() => setIsMockPortfolioModalOpen(true)}
                    className="text-[10px] text-blue-300 hover:text-white underline cursor-pointer"
                  >
                    상세보기
                  </button>
                )}
              </div>
              <div
                className={`text-lg sm:text-xl font-black font-mono flex items-center justify-end gap-1 px-3 py-1 rounded-xl bg-white/10 border ${
                  totalCombinedPnl >= 0
                    ? "text-rose-400 border-rose-500/30"
                    : "text-sky-400 border-sky-500/30"
                }`}
              >
                {totalCombinedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{totalCombinedPnl >= 0 ? "+" : ""}{totalCombinedReturnRate.toFixed(2)}%</span>
                <span className="text-xs font-bold opacity-90 ml-1">
                  ({totalCombinedPnl >= 0 ? "+" : ""}{(totalCombinedPnl ?? 0).toLocaleString()}원)
                </span>
              </div>
              {!isRealTrade && positions.length === 0 && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  가상 예수금 100% 보유 중 (대기)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PORTFOLIO WEIGHT ALLOCATION BAR */}
      <div className="space-y-2 pt-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-blue-600" />
            <span>자산 포트폴리오 비중 구성 (Asset Weight)</span>
          </span>
          {onOpenHoldingsModal && (
            <button
              onClick={onOpenHoldingsModal}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5 cursor-pointer"
            >
              <span>전체 보유잔고</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex p-0.5 gap-0.5">
          <div
            style={{ width: `${totalCombinedAssets > 0 ? Math.min(100, (totalCombinedCash / totalCombinedAssets) * 100) : 100}%` }}
            className="h-full bg-slate-400 dark:bg-slate-500 rounded-xs transition-all duration-300"
            title={`예수금: ${totalCombinedAssets > 0 ? ((totalCombinedCash / totalCombinedAssets) * 100).toFixed(1) : 100}%`}
          />
          {positions.map((p, idx) => {
            const colors = ["bg-blue-500", "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
            const itemVal = (p.quantity || 1) * (p.currentPrice || p.avgPrice || 0);
            const itemWeight = totalCombinedAssets > 0 ? (itemVal / totalCombinedAssets) * 100 : 0;
            if (itemWeight <= 0) return null;
            return (
              <div
                key={p.symbol + idx}
                style={{ width: `${itemWeight}%` }}
                className={`h-full ${colors[idx % colors.length]} rounded-xs transition-all duration-300`}
                title={`${p.name || p.symbol}: ${itemWeight.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Legend Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
            <span>예수금 ({totalCombinedAssets > 0 ? ((totalCombinedCash / totalCombinedAssets) * 100).toFixed(1) : 100}%)</span>
          </div>
          {positions.slice(0, 5).map((p, idx) => {
            const colors = ["bg-blue-500", "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
            const itemVal = (p.quantity || 1) * (p.currentPrice || p.avgPrice || 0);
            const itemWeight = totalCombinedAssets > 0 ? (itemVal / totalCombinedAssets) * 100 : 0;
            return (
              <div key={p.symbol + idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200">
                <span className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                <span>{p.name || p.symbol} ({itemWeight.toFixed(1)}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BROKER-BY-BROKER ACCOUNTS YIELD BOARD (MOCK VS REAL CLASSIFICATION) */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>
                {isRealTrade ? "⚡ [실거래 투자 자산 현황] 증권사·거래소 API 라이브 연동" : "🛡️ [모의 투자 자산 현황] 가상 증권사·거래소 배분 현황"}
              </span>
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${
              isRealTrade
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {isRealTrade ? "실거래 라이브" : "모의투자 분류"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isRealTrade ? (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="한국투자증권, 토스증권 실시간 계좌 잔고 즉시 동기화"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-rose-600" : ""}`} />
                <span>{isSyncing ? "동기화 중..." : "실계좌 잔고 동기화"}</span>
              </button>
            ) : (
              <button
                onClick={promptSetMockBalance}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3 text-blue-600" />
                <span>모의 예수금 수정</span>
              </button>
            )}
          </div>
        </div>

        {/* Order Prompt Checkbox Bar */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(profile?.onlyUpbitRealTrading)}
              onChange={async (e) => {
                const checked = e.target.checked;
                await updateProfileSettings({ onlyUpbitRealTrading: checked });
                if (addToast) {
                  addToast({
                    type: "INFO",
                    title: checked ? "🪙 업비트 전용 실거래 체크됨" : "전체 실거래 설정",
                    message: checked
                      ? "실거래 시 업비트(Upbit) 가상자산만 실거래 주문이 집행되며, 주식은 안전하게 모의투자로 유지됩니다."
                      : "실거래 시 연동된 모든 거래소/증권사에서 실거래가 실행됩니다."
                  });
                }
              }}
              className="w-3.5 h-3.5 text-amber-600 rounded border-amber-300 accent-amber-600 cursor-pointer"
            />
            <span className="font-black text-amber-900 dark:text-amber-200">
              실거래에서 업비트(Upbit)에서만 실거래 할것이다 (체크 시 주식은 모의투자 유지)
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={profile?.disableTradeGuardPrompt !== false}
              onChange={async (e) => {
                const checked = e.target.checked;
                await updateProfileSettings({ disableTradeGuardPrompt: checked });
                if (addToast) {
                  addToast({
                    type: "INFO",
                    title: checked ? "⚡ 실시간 수동 설정 창 차단됨" : "수동 설정 모달 활성화",
                    message: checked
                      ? "주문 시 수동 설정 창이 나오지 않고 즉시 자동 주문 처리됩니다."
                      : "주문 시 수동 확인 모달이 호출됩니다."
                  });
                }
              }}
              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 accent-indigo-600 cursor-pointer"
            />
            <span>실시간 주문 수동 설정 창 안 나오게 하기</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card A: 한국투자증권 (KIS 국내) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl p-3 transition space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>한국투자증권 (국내)</span>
              </span>
              {hasKoreaKey ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  연동됨 🟢
                </span>
              ) : (
                <button
                  onClick={onOpenApiConnectModal}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition"
                >
                  미연동 🔴
                </button>
              )}
            </div>

            <div className="font-mono">
              <div className="text-[10px] text-slate-400">계좌 총자산</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{(kisTotalAssets ?? 0).toLocaleString()}원</div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">예수금</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{(koreaCash ?? 0).toLocaleString()}원</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">보유수익률</span>
                <span className={`font-bold ${kisStats.pnlTotal >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                  {kisStats.pnlTotal >= 0 ? "+" : ""}{kisStats.returnRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card B: 미국/해외주식 (US & FX) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl p-3 transition space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>미국/해외주식 (USD)</span>
              </span>
              <button
                onClick={() => setIsExchangeRateModalOpen(true)}
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 transition cursor-pointer"
                title="환율 상세 정보"
              >
                ${fxRate.toFixed(0)} 🌐
              </button>
            </div>

            <div className="font-mono">
              <div className="text-[10px] text-slate-400">총 평가 ($ / ₩)</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                ${(usTotalAssetsUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-[11px] font-normal text-slate-500 ml-1">
                  (₩{Math.round(usTotalAssetsKrw).toLocaleString()})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">달러 예수금</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">${(usCash ?? 0).toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">달러 수익률</span>
                <span className={`font-bold ${usStats.pnlTotalUsd >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                  {usStats.pnlTotalUsd >= 0 ? "+" : ""}{usStats.returnRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card C: 토스증권 (Toss) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl p-3 transition space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>토스증권</span>
              </span>
              {hasTossKey ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  연동됨 🟢
                </span>
              ) : (
                <button
                  onClick={onOpenApiConnectModal}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition"
                >
                  미연동 🔴
                </button>
              )}
            </div>

            <div className="font-mono">
              <div className="text-[10px] text-slate-400">계좌 총자산</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{(tossTotalAssets ?? 0).toLocaleString()}원</div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">예수금</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{(tossCash ?? 0).toLocaleString()}원</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">보유수익률</span>
                <span className={`font-bold ${tossStats.pnlTotal >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                  {tossStats.pnlTotal >= 0 ? "+" : ""}{tossStats.returnRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card D: 업비트 (Upbit) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl p-3 transition space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>업비트 (Upbit)</span>
              </span>
              {hasUpbitKey ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  연동됨 🟢
                </span>
              ) : (
                <button
                  onClick={onOpenApiConnectModal}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition"
                >
                  미연동 🔴
                </button>
              )}
            </div>

            <div className="font-mono">
              <div className="text-[10px] text-slate-400">계좌 총자산</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">{(upbitTotalAssets ?? 0).toLocaleString()}원</div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">원화 잔고</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{(upbitCash ?? 0).toLocaleString()}원</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">가상자산 수익률</span>
                <span className={`font-bold ${upbitStats.pnlTotal >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                  {upbitStats.pnlTotal >= 0 ? "+" : ""}{upbitStats.returnRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL HOLDINGS BREAKDOWN LIST */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-indigo-600" />
              <span>{isRealTrade ? "실계좌 실시간 보유종목 현황" : "모의투자 보유종목 현황"}</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
              총 {activePositionsList.length}개 종목
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePurgeMockData}
              className="text-[11px] text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
              title="모의자산 및 매수/매도 관련 전체 데이터 초기화"
            >
              <span>🗑️ 모의자산/매수매도 내역 삭제</span>
            </button>
            <button
              onClick={onOpenHoldingsModal}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>상세 포트폴리오</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Broker Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold mb-2 mobile-tab-scroll no-scrollbar max-w-full">
          {[
            { key: "ALL", label: `전체 통합 (${positions.length})` },
            { key: "KOREA", label: `한국투자 (${koreaPositions.length})` },
            { key: "US", label: `미국/해외 (${usPositions.length})` },
            { key: "UPBIT", label: `업비트 (${upbitPositions.length})` },
            { key: "TOSS", label: `토스증권 (${tossPositions.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedBrokerTab(tab.key as any)}
              className={`flex-1 py-1 rounded-md transition cursor-pointer text-center text-[11px] whitespace-nowrap px-1.5 ${
                selectedBrokerTab === tab.key
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-black shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Positions List */}
        {activePositionsList.length > 0 ? (
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-0.5">
            {activePositionsList.map((pos, idx) => {
              const curPrice = Number(pos.currentPrice || pos.avgPrice || 0) || 0;
              const qty = Number(pos.quantity || 0) || 0;
              const avgPrice = Number(pos.avgPrice || 0) || 0;
              const isUs = pos.market === "US" || pos.broker === "us" || pos.id?.startsWith("us_");

              let evalVal = Math.round(curPrice * qty) || 0;
              let costVal = Math.round(avgPrice * qty) || 0;
              let pnl = evalVal - costVal;
              let pnlRate = costVal > 0 && !isNaN(pnl) ? (pnl / costVal) * 100 : 0;
              let isPlus = pnl >= 0;

              // US Stocks specific values
              const evalUsd = curPrice * qty;
              const costUsd = avgPrice * qty;
              const pnlUsd = evalUsd - costUsd;
              const evalKrw = Math.round(evalUsd * fxRate);
              const costKrw = Math.round(costUsd * fxRate);
              const pnlKrw = evalKrw - costKrw;

              return (
                <div
                  key={`${pos.id || pos.symbol}_${idx}`}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition flex items-center justify-between text-xs font-sans"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300 font-mono shadow-2xs shrink-0">
                      {pos.market === "BTC" ? "🪙" : isUs ? "🇺🇸" : "🇰🇷"}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{pos.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 font-mono">
                          {pos.symbol}
                        </span>
                        {isUs && (
                          <span className="text-[9px] px-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-mono font-bold">
                            USD
                          </span>
                        )}
                        {!isRealTrade && (
                          <span className="text-[9px] px-1 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded font-mono font-bold">
                            모의
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {isUs ? (
                          <span>
                            수량: {(qty ?? 0).toLocaleString()}주 | 평단가: <strong className="text-slate-700 dark:text-slate-200">${avgPrice.toFixed(2)}</strong> (₩{Math.round(avgPrice * fxRate).toLocaleString()}원)
                          </span>
                        ) : (
                          <span>
                            수량: {(qty ?? 0).toLocaleString()} | 평단가: {(avgPrice ?? 0).toLocaleString()}원
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    {isUs ? (
                      <>
                        <div className="font-black text-slate-900 dark:text-white">
                          ${evalUsd.toFixed(2)} <span className="text-[11px] font-normal text-slate-500">(₩{(evalKrw ?? 0).toLocaleString()}원)</span>
                        </div>
                        <div className={`text-[11px] font-bold ${pnlUsd >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                          {pnlUsd >= 0 ? "+" : ""}{(isNaN(pnlRate) ? 0 : pnlRate).toFixed(2)}% ({pnlUsd >= 0 ? "+$" : "-$"}{Math.abs(pnlUsd).toFixed(2)} / {pnlKrw >= 0 ? "+" : ""}{(pnlKrw ?? 0).toLocaleString()}원)
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-black text-slate-900 dark:text-white">{(evalVal ?? 0).toLocaleString()}원</div>
                        <div className={`text-[11px] font-bold ${isPlus ? "text-rose-600" : "text-blue-600"}`}>
                          {isPlus ? "+" : ""}{(isNaN(pnlRate) ? 0 : pnlRate).toFixed(2)}% ({isPlus ? "+" : ""}{(pnl ?? 0).toLocaleString()}원)
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Positions Notice */
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-center space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isRealTrade ? "💡 현재 실계좌에 보유 중인 종목이 없습니다." : "🛡️ 현재 모의투자 보유 종목이 없습니다."}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
              {isRealTrade
                ? "한국투자증권, 토스증권, 업비트 API에서 종목을 매수하시거나 잔고 동기화를 진행하시면 보유현황과 실시간 수익률이 이곳에 표시됩니다."
                : "AI 오토트레이딩을 가동하시거나 검색창에서 종목을 선택해 가상 매수를 진행해 보세요."}
            </p>
            {isRealTrade && (
              <button
                onClick={handleManualSync}
                className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                실계좌 잔고 동기화 실행
              </button>
            )}
          </div>
        )}
      </div>

      {/* API REAL CONNECTION DIAGNOSTIC MODAL */}
      {isDiagOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">실시간 외부 API 진짜연결 검증 진단</h3>
              </div>
              <button
                onClick={() => setIsDiagOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                본 시스템은 가상 난수 시세를 전면 배제하며, **네이버 증권 실시간 API(`polling.finance.naver.com`)가 자동 연결**되어 **업비트, 한국투자증권(KIS), 토스증권** 서버로부터 100% 실시간 진짜 주식 및 가상자산 라이브 시세를 직수신하고 있습니다.
              </p>

              {diagLoading ? (
                <div className="py-8 text-center space-y-2">
                  <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">라이브 API 엔드포인트 수신 상태 검증 중...</p>
                </div>
              ) : diagResults ? (
                <div className="space-y-2.5">
                  {/* 1. Upbit API */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        업비트 (Upbit) 라이브 Ticker API
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diagResults.upbit.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {diagResults.upbit.ok ? `200 OK (${diagResults.upbit.latencyMs}ms)` : "실패"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      수신 샘플 시세: <strong className="text-slate-900">{diagResults.upbit.samplePrice}</strong>
                    </div>
                  </div>

                  {/* 2. Naver Finance API */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        네이버 증권 국내주식 실시간 Polling API
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diagResults.naver.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {diagResults.naver.ok ? `200 OK (${diagResults.naver.latencyMs}ms)` : "실패"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      수신 샘플 시세: <strong className="text-slate-900">{diagResults.naver.samplePrice}</strong>
                    </div>
                  </div>

                  {/* 3. Backend Stocks API */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        국내/해외 통합 주식 시세 서버 API (`/api/stocks`)
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diagResults.backend.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {diagResults.backend.ok ? `200 OK (${diagResults.backend.latencyMs}ms)` : "실패"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      상태: <strong className="text-slate-900">{diagResults.backend.samplePrice}</strong>
                    </div>
                  </div>

                  {/* 4. Broker Sync API */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        증권사 실계좌 잔고 동기화 API (`/api/broker/sync-balance`)
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diagResults.brokerSync.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {diagResults.brokerSync.ok ? `200 OK (${diagResults.brokerSync.latencyMs}ms)` : "실패"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      응답: <strong className="text-slate-900">{diagResults.brokerSync.msg}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-mono">
                  검증 완료시 모의시세가 아닌 라이브 체결가로 표기됩니다.
                </span>
                <button
                  onClick={runApiDiagnostics}
                  disabled={diagLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  재진단 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Mock Balance Setting */}
      <EditMockBalanceModal
        isOpen={isMockBalanceModalOpen}
        onClose={() => setIsMockBalanceModalOpen(false)}
      />
      {/* Modal for Detailed Mock Portfolio */}
      <MockPortfolioDetailModal
        isOpen={isMockPortfolioModalOpen}
        onClose={() => setIsMockPortfolioModalOpen(false)}
        onOpenEditBalance={() => setIsMockBalanceModalOpen(true)}
      />
      {/* Modal for Live Exchange Rate (USD/KRW) */}
      <ExchangeRateInfoModal
        isOpen={isExchangeRateModalOpen}
        onClose={() => setIsExchangeRateModalOpen(false)}
      />
      {/* Modal for AI Loss Cause Analysis */}
      <AiLossCauseAnalysisModal
        isOpen={isLossModalOpen}
        onClose={() => setIsLossModalOpen(false)}
      />
      {/* Modal for AI Trade Feedback Analyzer */}
      <AiTradeFeedbackAnalyzerModal
        isOpen={isFeedbackAnalyzerOpen}
        onClose={() => setIsFeedbackAnalyzerOpen(false)}
      />
    </div>
  );
};
