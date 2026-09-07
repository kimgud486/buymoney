import React, { useState, useMemo, useCallback } from "react";
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ChevronRight,
  Layers,
  Coins,
  Building2,
  BarChart3,
  RefreshCw,
  Sliders,
  Sparkles,
  Info,
  Award,
  Flame,
  ShieldAlert,
  Wallet,
  Globe,
  Trash2,
  RotateCcw
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { AiTradingPerformanceReportModal } from "./AiTradingPerformanceReportModal";
import { HoldingExecutionRationaleModal, HoldingDetailData } from "./HoldingExecutionRationaleModal";
import { EditMockBalanceModal } from "../../demo/EditMockBalanceModal";

interface PortfolioAssetStatusWidgetProps {
  onOpenHoldingsModal?: () => void;
  onOpenQuickOrder?: (symbol: string, name: string, type: "BUY" | "SELL") => void;
  onOpenApiConnectModal?: () => void;
}

export const PortfolioAssetStatusWidget: React.FC<PortfolioAssetStatusWidgetProps> = ({
  onOpenHoldingsModal,
  onOpenQuickOrder,
  onOpenApiConnectModal
}) => {
  const {
    profile,
    positions,
    cashBreakdown,
    syncRealAccountBalance,
    updateProfileSettings,
    purgeAllMockData,
    addToast
  } = useApp();

  const isRealTrade = Boolean(profile?.isRealTrade);
  // View mode tab: "REAL" for 실거래 투자 자산 현황, "MOCK" for 모의 투자 자산 현황
  const [activeAssetView, setActiveAssetView] = useState<"REAL" | "MOCK">(isRealTrade ? "REAL" : "MOCK");
  const [showDetails, setShowDetails] = useState(true);
  const [isPerformanceReportOpen, setIsPerformanceReportOpen] = useState(false);
  const [isEditMockBalanceOpen, setIsEditMockBalanceOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedHoldingForRationale, setSelectedHoldingForRationale] = useState<HoldingDetailData | null>(null);

  // Synchronize activeAssetView when profile.isRealTrade changes
  React.useEffect(() => {
    setActiveAssetView(isRealTrade ? "REAL" : "MOCK");
  }, [isRealTrade]);

  const fxRate = 1385.5; // Live USD/KRW reference

  // Broker connection flags
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTossKey = Boolean(profile?.tossApiKey);

  // Manual real account sync handler
  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncRealAccountBalance("all", false);
      if (res && res.success) {
        addToast({
          type: "SUCCESS",
          title: "실계좌 실시간 동기화 완료",
          message: res.message || "한국투자증권, 업비트, 토스증권 잔고 및 실시간 보유종목이 최신 상태로 갱신되었습니다."
        });
      }
    } catch (e: any) {
      console.warn("Manual sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch global trade mode
  const handleToggleGlobalMode = async (targetReal: boolean) => {
    try {
      await updateProfileSettings({ isRealTrade: targetReal });
      setActiveAssetView(targetReal ? "REAL" : "MOCK");
      if (targetReal) {
        syncRealAccountBalance("all", false).catch(() => {});
      }
      addToast({
        type: targetReal ? "WARNING" : "INFO",
        title: targetReal ? "🔥 실전 거래 모드로 전환됨" : "🛡️ 모의투자 모드로 전환됨",
        message: targetReal
          ? "실제 증권사/거래소 계좌 잔고를 기준으로 주문이 실행됩니다."
          : "가상 자산 및 모의 포트폴리오 환경으로 안전하게 전환되었습니다."
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 100만원 즉시 초기화
  const handleReset1Million = async () => {
    try {
      await updateProfileSettings({ balance: 1000000, initialBalance: 1000000 });
      if (purgeAllMockData) await purgeAllMockData();
      addToast({
        type: "SUCCESS",
        title: "🎯 모의 예수금 100만원 초기화 완료",
        message: "모의 포트폴리오가 비워지고 가상 예수금이 1,000,000원으로 재설정되었습니다."
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleOpenRationale = (item: any) => {
    const buyVal = item.qty * item.buyPrice;
    const evalVal = item.qty * item.currentPrice;
    const itemPnl = evalVal - buyVal;
    const itemPnlRate = buyVal > 0 ? (itemPnl / buyVal) * 100 : 0;

    setSelectedHoldingForRationale({
      symbol: item.symbol,
      name: item.name,
      category: item.type === "가상자산" ? "가상자산" : "중형주",
      qty: item.qty,
      avgBuyPrice: item.buyPrice,
      currentPrice: item.currentPrice,
      pnlAmount: itemPnl,
      pnlRate: itemPnlRate,
      stopLossPrice: Math.round(item.buyPrice * 0.95),
      targetPrice: Math.round(item.buyPrice * 1.15),
      botManagedBy: item.type === "가상자산" ? "업비트 24H 가상자산 봇" : "SMC 구조 돌파 & 16대 뇌엔진 봇"
    });
  };

  // Position classification helpers
  const isUpbitPos = useCallback((p: any) => p.market === "BTC" || p.broker === "upbit" || p.id?.startsWith("upbit_") || p.symbol?.startsWith("KRW-"), []);
  const isUsPos = useCallback((p: any) => p.market === "US" || p.broker === "us" || p.id?.startsWith("us_"), []);
  const isTossPos = useCallback((p: any) => p.broker === "toss" && !isUpbitPos(p) && !isUsPos(p), [isUpbitPos, isUsPos]);
  const isKoreaPos = useCallback((p: any) => (p.market === "KOREA" || !p.market) && !isTossPos(p) && !isUpbitPos(p) && !isUsPos(p), [isTossPos, isUpbitPos, isUsPos]);

  // Real Cash Breakdowns from backend sync
  const koreaRealCash = Number(cashBreakdown?.koreaCash ?? 0) || 0;
  const tossRealCash = Number(cashBreakdown?.tossCash ?? 0) || 0;
  const upbitRealCash = Number(cashBreakdown?.upbitCash ?? 0) || 0;
  const usRealCash = Number(cashBreakdown?.usCash ?? 0) || 0;

  // Real Holdings
  const koreaRealInvested = Number(cashBreakdown?.koreaInvested ?? 0) || 0;
  const upbitRealInvested = Number(cashBreakdown?.upbitInvested ?? 0) || 0;
  const tossRealInvested = Number(cashBreakdown?.tossInvested ?? 0) || 0;
  const usRealInvested = Number(cashBreakdown?.usInvested ?? 0) || 0;

  // Real Broker Totals
  const kisRealTotal = cashBreakdown?.koreaTotal && cashBreakdown.koreaTotal > 0 ? cashBreakdown.koreaTotal : (koreaRealCash + koreaRealInvested);
  const usRealTotalKrw = cashBreakdown?.usTotal && cashBreakdown.usTotal > 0 ? cashBreakdown.usTotal : ((usRealCash * fxRate) + usRealInvested);
  const tossRealTotal = cashBreakdown?.tossTotal && cashBreakdown.tossTotal > 0 ? cashBreakdown.tossTotal : (tossRealCash + tossRealInvested);
  const upbitRealTotal = cashBreakdown?.upbitTotal && cashBreakdown.upbitTotal > 0 ? cashBreakdown.upbitTotal : (upbitRealCash + upbitRealInvested);

  const realGrandTotal = cashBreakdown?.grandTotalAssets && cashBreakdown.grandTotalAssets > 0
    ? cashBreakdown.grandTotalAssets
    : (kisRealTotal + usRealTotalKrw + tossRealTotal + upbitRealTotal);
  const realTotalCash = koreaRealCash + tossRealCash + upbitRealCash + (usRealCash * fxRate);
  const realTotalInvested = Math.max(0, realGrandTotal - realTotalCash);

  // Mock Calculations
  const mockCash = Number(profile?.balance ?? 1000000);
  const holdingsData = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    const colors = ["bg-blue-500", "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
    const textColors = ["text-blue-500", "text-indigo-500", "text-emerald-500", "text-amber-500", "text-purple-500", "text-rose-500"];

    return positions.map((p, idx) => {
      const isUs = isUsPos(p);
      const curPrice = Number(p.currentPrice || p.avgPrice || 0);
      const buyPrice = Number(p.avgPrice || curPrice);
      const qty = Number(p.quantity || 0);
      return {
        symbol: p.symbol,
        name: p.name || p.symbol,
        type: isUpbitPos(p) ? "가상자산" : isUs ? "미국주식" : "국내주식",
        market: p.market,
        isUs,
        qty,
        buyPrice,
        currentPrice: curPrice,
        evalKrw: isUs ? Math.round(curPrice * qty * fxRate) : Math.round(curPrice * qty),
        costKrw: isUs ? Math.round(buyPrice * qty * fxRate) : Math.round(buyPrice * qty),
        color: colors[idx % colors.length],
        textColor: textColors[idx % textColors.length]
      };
    });
  }, [positions, fxRate, isUpbitPos, isUsPos]);

  const totalHoldingsEval = holdingsData.reduce((acc, h) => acc + h.evalKrw, 0);
  const mockHoldingsEval = totalHoldingsEval;
  const totalHoldingsCost = holdingsData.reduce((acc, h) => acc + h.costKrw, 0);
  const totalHoldingsPnl = totalHoldingsEval - totalHoldingsCost;
  const totalHoldingsPnlRate = totalHoldingsCost > 0 ? (totalHoldingsPnl / totalHoldingsCost) * 100 : 0;
  const mockTotalAssets = mockCash + totalHoldingsEval;

  // Genuine Mock Holdings Breakdown by Market/Broker
  const mockKoreaHoldings = holdingsData.filter(h => isKoreaPos(h)).reduce((acc, h) => acc + h.evalKrw, 0);
  const mockUsHoldings = holdingsData.filter(h => isUsPos(h)).reduce((acc, h) => acc + h.evalKrw, 0);
  const mockTossHoldings = holdingsData.filter(h => isTossPos(h)).reduce((acc, h) => acc + h.evalKrw, 0);
  const mockUpbitHoldings = holdingsData.filter(h => isUpbitPos(h)).reduce((acc, h) => acc + h.evalKrw, 0);

  // Active metrics depending on active tab
  const displayTotalAssets = activeAssetView === "REAL" ? realGrandTotal : mockTotalAssets;
  const displayCash = activeAssetView === "REAL" ? realTotalCash : mockCash;
  const displayInvested = activeAssetView === "REAL" ? (realTotalInvested > 0 ? realTotalInvested : totalHoldingsEval) : totalHoldingsEval;
  const displayPnl = activeAssetView === "REAL" ? totalHoldingsPnl : totalHoldingsPnl;
  const displayPnlRate = activeAssetView === "REAL" ? totalHoldingsPnlRate : totalHoldingsPnlRate;

  // Percent allocations
  const cashWeight = displayTotalAssets > 0 ? (displayCash / displayTotalAssets) * 100 : 100;
  const stockWeight = displayTotalAssets > 0 ? (displayInvested / displayTotalAssets) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm font-sans space-y-4">
      {/* 1. Header Bar with Mode Classification Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xs">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                증권사 및 거래소 계좌별 실시간 자산 현황
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black border border-indigo-200 dark:border-indigo-800">
                ASSET CLASSIFICATION
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              모의 투자 자산 및 실거래 증권사·거래소(한국투자, 미국, 업비트, 토스) 계좌별 실시간 잔고 분류
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Classification View Switcher Tab */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveAssetView("REAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeAssetView === "REAL"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>⚡ 실거래 투자 자산</span>
            </button>
            <button
              onClick={() => setActiveAssetView("MOCK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeAssetView === "MOCK"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>🛡️ 모의 투자 자산</span>
            </button>
          </div>

          {activeAssetView === "REAL" ? (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="한국투자, 업비트, 토스 실시간 잔고 즉시 동기화"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-rose-600" : ""}`} />
              <span>{isSyncing ? "실시간 조회 중..." : "실계좌 잔고 동기화"}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditMockBalanceOpen(true)}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>모의 예수금 수정</span>
            </button>
          )}

          <button
            onClick={() => setIsPerformanceReportOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Award className="w-3.5 h-3.5 text-cyan-200" />
            <span>AI 성과 리포트</span>
          </button>
        </div>
      </div>

      {/* 2. Top Banner Indicating Active Category Context & Real Trading Controls */}
      <div className="space-y-2">
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs ${
          activeAssetView === "REAL"
            ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200"
            : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeAssetView === "REAL" ? "bg-rose-500 animate-pulse" : "bg-blue-500"}`} />
            <span className="font-bold">
              {activeAssetView === "REAL"
                ? "⚡ [실거래 계좌 연동 현황] 한국투자증권(국내주식/미국주식) 및 증권사 API 실시간 라이브 연동 자산입니다."
                : "🛡️ [모의투자 자산 현황] 가상 예수금 및 가상 매매 포트폴리오를 기반으로 안전하게 시뮬레이션 중인 자산입니다."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeAssetView === "REAL" ? (
              <button
                onClick={() => handleToggleGlobalMode(true)}
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition ${
                  isRealTrade
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-900 text-rose-600 border border-rose-300"
                }`}
              >
                {isRealTrade ? "실거래 모드 활성화됨 🟢" : "실거래 모드로 전환하기"}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleReset1Million}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 transition flex items-center gap-1"
                  title="모의 예수금을 100만원으로 리셋"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>100만원 리셋</span>
                </button>
                <button
                  onClick={() => handleToggleGlobalMode(false)}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition ${
                    !isRealTrade
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white dark:bg-slate-900 text-blue-600 border border-blue-300"
                  }`}
                >
                  {!isRealTrade ? "모의투자 모드 활성화됨 🟢" : "모의투자 모드로 전환"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Real-Trading Guard Controls */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={profile?.disableTradeGuardPrompt !== false}
              onChange={async (e) => {
                const checked = e.target.checked;
                await updateProfileSettings({ disableTradeGuardPrompt: checked });
                addToast({
                  type: "INFO",
                  title: checked ? "⚡ 실시간 주문 수동 설정 생략 완료" : "수동 확인 팝업 활성화",
                  message: checked
                    ? "주문 시 수동 설정 창이 뜨지 않고 자동으로 즉시 체결됩니다."
                    : "주문 시 수동 확인 모달이 호출됩니다."
                });
              }}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
            />
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              ⚡ 실시간 주문 수동 설정 창 안 나오게 하기 (자동 즉시 주문)
            </span>
          </label>
        </div>
      </div>

      {/* 3. Main Total Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Assets */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{activeAssetView === "REAL" ? "실계좌 총 평가 자산" : "모의 총 평가 자산"}</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ₩{(displayTotalAssets ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>예수금 + 보유자산 평가금</span>
          </div>
        </div>

        {/* Total PnL */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          displayPnl >= 0 
            ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60" 
            : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60"
        }`}>
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>{activeAssetView === "REAL" ? "실계좌 평가 손익" : "모의 평가 손익"}</span>
            {displayPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
          </div>
          <div className={`text-base sm:text-lg font-black font-mono tracking-tight ${
            displayPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            {displayPnl >= 0 ? "+" : ""}₩{(displayPnl ?? 0).toLocaleString()}
          </div>
          <div className={`text-[11px] font-bold font-mono ${
            displayPnl >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
          }`}>
            수익률: {displayPnlRate >= 0 ? "+" : ""}{displayPnlRate.toFixed(2)}%
          </div>
        </div>

        {/* Total Stock Evaluation */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{activeAssetView === "REAL" ? "실계좌 주식/가상자산" : "모의 주식/가상자산"}</span>
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ₩{(displayInvested ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            투자비중: <strong className="text-indigo-600 dark:text-indigo-400">{stockWeight.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Available Cash */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{activeAssetView === "REAL" ? "실계좌 주문가능 예수금" : "모의 주문가능 예수금"}</span>
            <Coins className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ₩{(displayCash ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            현금비중: <strong className="text-amber-600 dark:text-amber-400">{cashWeight.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* 4. Broker-by-Broker Accounts Breakdown Cards Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>
              {activeAssetView === "REAL" ? "증권사 및 거래소별 실시간 자산 상세" : "모의 증권사 및 가상 거래소별 자산 배분"}
            </span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            {activeAssetView === "REAL" ? "실제 OpenAPI 실시간 수신값" : "모의투자 시뮬레이션 배분"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* A. 한국투자증권 (KIS 국내) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>한국투자증권 (국내)</span>
              </span>
              {activeAssetView === "REAL" ? (
                hasKoreaKey ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    연동됨 🟢
                  </span>
                ) : (
                  <button
                    onClick={onOpenApiConnectModal}
                    className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800"
                  >
                    미연동 🔴
                  </button>
                )
              ) : (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  모의 계좌 🛡️
                </span>
              )}
            </div>
            <div className="font-mono">
              <div className="text-[10px] text-slate-400">계좌 총자산</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {activeAssetView === "REAL" ? (kisRealTotal ?? 0).toLocaleString() : (mockKoreaHoldings + mockCash).toLocaleString()}원
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">예수금</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeAssetView === "REAL" ? (koreaRealCash ?? 0).toLocaleString() : (mockCash ?? 0).toLocaleString()}원
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">보유주식</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeAssetView === "REAL" ? (koreaRealInvested ?? 0).toLocaleString() : (mockKoreaHoldings ?? 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* B. 미국/해외주식 (US & FX) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>미국/해외주식 (USD)</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                ${fxRate.toFixed(0)} 🌐
              </span>
            </div>
            <div className="font-mono">
              <div className="text-[10px] text-slate-400">총 평가 ($ / ₩)</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                ${activeAssetView === "REAL" ? (usRealTotalKrw / fxRate).toFixed(1) : (mockUsHoldings / fxRate).toFixed(1)}
                <span className="text-[11px] font-normal text-slate-500 ml-1">
                  (₩{activeAssetView === "REAL" ? Math.round(usRealTotalKrw).toLocaleString() : (mockUsHoldings ?? 0).toLocaleString()})
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">달러 예수금</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ${activeAssetView === "REAL" ? (usRealCash ?? 0).toLocaleString() : "0"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">해외주식</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ₩{activeAssetView === "REAL" ? (usRealInvested ?? 0).toLocaleString() : (mockUsHoldings ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* C. 토스증권 (Toss) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>토스증권</span>
              </span>
              {activeAssetView === "REAL" ? (
                hasTossKey ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    연동됨 🟢
                  </span>
                ) : (
                  <button
                    onClick={onOpenApiConnectModal}
                    className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800"
                  >
                    미연동 🔴
                  </button>
                )
              ) : (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  모의 계좌 🛡️
                </span>
              )}
            </div>
            <div className="font-mono">
              <div className="text-[10px] text-slate-400">계좌 총자산</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {activeAssetView === "REAL" ? (tossRealTotal ?? 0).toLocaleString() : (mockTossHoldings ?? 0).toLocaleString()}원
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">예수금</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeAssetView === "REAL" ? (tossRealCash ?? 0).toLocaleString() : "0"}원
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">보유주식</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeAssetView === "REAL" ? (tossRealInvested ?? 0).toLocaleString() : (mockTossHoldings ?? 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* D. 업비트 (Upbit 24H) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>업비트 (Upbit 24H)</span>
              </span>
              {activeAssetView === "REAL" ? (
                hasUpbitKey ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    연동됨 🟢
                  </span>
                ) : (
                  <button
                    onClick={onOpenApiConnectModal}
                    className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800"
                  >
                    미연동 🔴
                  </button>
                )
              ) : (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  모의 코인 🛡️
                </span>
              )}
            </div>
            <div className="font-mono">
              <div className="text-[10px] text-slate-400">계좌 총자산</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {activeAssetView === "REAL" ? (upbitRealTotal ?? 0).toLocaleString() : (mockUpbitHoldings ?? 0).toLocaleString()}원
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">원화 잔고</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeAssetView === "REAL" ? (upbitRealCash ?? 0).toLocaleString() : "0"}원
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans">가상자산</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeAssetView === "REAL" ? (upbitRealInvested ?? 0).toLocaleString() : (mockUpbitHoldings ?? 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Multi-Segment Allocation Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>포트폴리오 비중 구성 (Weight Allocation)</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showDetails ? "상세 닫기" : "보유 종목별 상세 보기"}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/60 dark:border-slate-700">
          <div
            style={{ width: `${cashWeight}%` }}
            className="h-full bg-slate-400 dark:bg-slate-600 rounded-xs transition-all duration-500"
            title={`예수금: ${cashWeight.toFixed(1)}%`}
          />
          {holdingsData.map((h, i) => {
            const itemWeight = displayTotalAssets > 0 ? (h.evalKrw / displayTotalAssets) * 100 : 0;
            return (
              <div
                key={h.symbol + i}
                style={{ width: `${itemWeight}%` }}
                className={`h-full ${h.color} rounded-xs transition-all duration-500`}
                title={`${h.name}: ${itemWeight.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Legend Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
            <span>예수금 ({cashWeight.toFixed(1)}%)</span>
          </div>
          {holdingsData.map((h, i) => {
            const itemWeight = displayTotalAssets > 0 ? (h.evalKrw / displayTotalAssets) * 100 : 0;
            return (
              <div key={h.symbol + i} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200">
                <span className={`w-2 h-2 rounded-full ${h.color}`} />
                <span>{h.name} ({itemWeight.toFixed(1)}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Expanded Holdings Breakdown List (Spacious Mobile Cards + Desktop Table) */}
      {showDetails && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <span>📋 보유 종목 실시간 평가 & 빠른 제어</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                {holdingsData.length}개 종목 보유
              </span>
            </span>
            <span className="text-[11px] text-indigo-400 font-bold">
              터치 시 AI 체결근거 &amp; 30일 예측
            </span>
          </div>

          {holdingsData.length > 0 ? (
            <div className="space-y-3">
              {/* A. MOBILE VIEW: Large Spacious Cards */}
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                {holdingsData.map((item, idx) => {
                  const itemPnl = item.evalKrw - item.costKrw;
                  const itemPnlRate = item.costKrw > 0 ? (itemPnl / item.costKrw) * 100 : 0;
                  const itemWeight = displayTotalAssets > 0 ? (item.evalKrw / displayTotalAssets) * 100 : 0;
                  const isCrypto = item.type === "가상자산" || item.symbol.startsWith("KRW-");

                  return (
                    <div
                      key={item.symbol + idx}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs space-y-2.5 transition hover:border-indigo-500/50"
                    >
                      {/* Card Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => handleOpenRationale(item)}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                            {isCrypto ? "🪙" : "📈"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-400 transition">
                                {item.name}
                              </span>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <span>{item.symbol}</span>
                              <span>•</span>
                              <span className="text-slate-300 font-bold">{item.type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Weight Badge */}
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-black">
                            비중 {itemWeight.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Financial Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">현재가 / 매수가</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₩{(item.currentPrice ?? 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            매수: ₩{(item.buyPrice ?? 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-sans">평가손익 (수익률)</span>
                          <span className={`font-black text-sm ${
                            itemPnl >= 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                          }`}>
                            {itemPnl >= 0 ? "+" : ""}₩{(itemPnl ?? 0).toLocaleString()}
                          </span>
                          <span className={`text-[11px] font-black block ${
                            itemPnlRate >= 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                          }`}>
                            ({itemPnlRate >= 0 ? "+" : ""}{itemPnlRate.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Quantity, AI Rationale & Quick Trade */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[11px] font-mono text-slate-400">
                          수량: <strong className="text-slate-800 dark:text-slate-200">{(item.qty ?? 0).toLocaleString()}</strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenRationale(item)}
                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>AI 이유</span>
                          </button>
                          <button
                            onClick={() => onOpenQuickOrder && onOpenQuickOrder(item.symbol, item.name, "BUY")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg transition cursor-pointer"
                          >
                            매수
                          </button>
                          <button
                            onClick={() => onOpenQuickOrder && onOpenQuickOrder(item.symbol, item.name, "SELL")}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black rounded-lg transition cursor-pointer"
                          >
                            매도
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* B. DESKTOP VIEW: Detailed Table */}
              <div className="hidden sm:block mobile-table-wrapper rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800">
                      <th className="p-2.5">종목명 / 코드</th>
                      <th className="p-2.5 text-right">보유수량</th>
                      <th className="p-2.5 text-right">매수단가 / 현재가</th>
                      <th className="p-2.5 text-right">평가손익 (수익률)</th>
                      <th className="p-2.5 text-right">투자 비중</th>
                      <th className="p-2.5 text-center">빠른 매매</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {holdingsData.map((item, idx) => {
                      const itemPnl = item.evalKrw - item.costKrw;
                      const itemPnlRate = item.costKrw > 0 ? (itemPnl / item.costKrw) * 100 : 0;
                      const itemWeight = displayTotalAssets > 0 ? (item.evalKrw / displayTotalAssets) * 100 : 0;

                      return (
                        <tr key={item.symbol + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-2.5 font-bold">
                            <div
                              onClick={() => handleOpenRationale(item)}
                              className="flex items-center gap-1.5 cursor-pointer group"
                              title="클릭 시 AI 체결 이유 및 미래 예측 그래프 보기"
                            >
                              <span className={`w-2 h-2 rounded-full ${item.color}`} />
                              <span className="text-slate-900 dark:text-white group-hover:text-indigo-600 transition">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.symbol})</span>
                              <Sparkles className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition" />
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {(item.qty ?? 0).toLocaleString()}주
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            <div>₩{(item.currentPrice ?? 0).toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400">매수: ₩{(item.buyPrice ?? 0).toLocaleString()}</div>
                          </td>
                          <td className={`p-2.5 text-right font-mono font-bold ${
                            itemPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            <div>{itemPnl >= 0 ? "+" : ""}₩{(itemPnl ?? 0).toLocaleString()}</div>
                            <div className="text-[10px]">{itemPnlRate >= 0 ? "+" : ""}{itemPnlRate.toFixed(2)}%</div>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {itemWeight.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onOpenQuickOrder && onOpenQuickOrder(item.symbol, item.name, "BUY")}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                              >
                                매수
                              </button>
                              <button
                                onClick={() => onOpenQuickOrder && onOpenQuickOrder(item.symbol, item.name, "SELL")}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                              >
                                매도
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-500">
              현재 보유 중인 종목이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* AI Trading Performance Report Modal */}
      <AiTradingPerformanceReportModal
        isOpen={isPerformanceReportOpen}
        onClose={() => setIsPerformanceReportOpen(false)}
      />

      {/* AI Holding Execution Rationale & Predictive Trajectory Modal */}
      <HoldingExecutionRationaleModal
        isOpen={Boolean(selectedHoldingForRationale)}
        onClose={() => setSelectedHoldingForRationale(null)}
        holding={selectedHoldingForRationale}
        onQuickOrder={onOpenQuickOrder}
      />

      {/* Edit Mock Balance Modal */}
      <EditMockBalanceModal
        isOpen={isEditMockBalanceOpen}
        onClose={() => setIsEditMockBalanceOpen(false)}
      />
    </div>
  );
};
