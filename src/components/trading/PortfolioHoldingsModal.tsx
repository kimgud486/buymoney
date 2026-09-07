import React, { useState } from "react";
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  X,
  DollarSign,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Key,
  AlertTriangle,
  Coins,
  Building2,
  Zap,
  Award,
  BarChart2,
  Target,
  Sparkles
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { AiLossCauseAnalysisModal } from "./AiLossCauseAnalysisModal";
import { AiTradingPerformanceReportModal } from "./AiTradingPerformanceReportModal";
import { HoldingExecutionRationaleModal, HoldingDetailData } from "./HoldingExecutionRationaleModal";
import { AutoTradingFilterConfigModal } from "./AutoTradingFilterConfigModal";

interface PortfolioHoldingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock?: (symbol: string) => void;
  isRealTradingMode?: boolean;
  onOpenApiConnectModal?: () => void;
}

interface HoldingItem {
  symbol: string;
  name: string;
  category: "소형주" | "중형주" | "대형주" | "가상자산" | "미국주식" | string;
  market?: "KOREA" | "US" | "BTC" | string;
  qty: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnlAmount: number;
  pnlRate: number;
  stopLossPrice: number;
  targetPrice: number;
  botManagedBy: string;
}

const MOCK_HOLDINGS: HoldingItem[] = [
  {
    symbol: "012450",
    name: "한화에어로스페이스",
    category: "중형주",
    market: "KOREA",
    qty: 35,
    avgBuyPrice: 280000,
    currentPrice: 301000,
    pnlAmount: 735000,
    pnlRate: 7.50,
    stopLossPrice: 273000,
    targetPrice: 330000,
    botManagedBy: "중형주 주도 스윙 봇"
  },
  {
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    category: "미국주식",
    market: "US",
    qty: 15,
    avgBuyPrice: 120.50,
    currentPrice: 128.80,
    pnlAmount: 124.50,
    pnlRate: 6.89,
    stopLossPrice: 114.00,
    targetPrice: 145.00,
    botManagedBy: "토스증권 US 모멘텀 봇"
  },
  {
    symbol: "277810",
    name: "레인보우로보틱스",
    category: "소형주",
    market: "KOREA",
    qty: 60,
    avgBuyPrice: 151500,
    currentPrice: 168400,
    pnlAmount: 1014000,
    pnlRate: 11.15,
    stopLossPrice: 147000,
    targetPrice: 190000,
    botManagedBy: "소형주 급등 알파 발굴 봇"
  },
  {
    symbol: "005930",
    name: "삼성전자",
    category: "대형주",
    market: "KOREA",
    qty: 120,
    avgBuyPrice: 71800,
    currentPrice: 73800,
    pnlAmount: 240000,
    pnlRate: 2.78,
    stopLossPrice: 69900,
    targetPrice: 79000,
    botManagedBy: "대형주 퀀트 가치 봇"
  },
  {
    symbol: "034020",
    name: "두산에너빌리티",
    category: "중형주",
    market: "KOREA",
    qty: 250,
    avgBuyPrice: 29800,
    currentPrice: 32450,
    pnlAmount: 662500,
    pnlRate: 8.89,
    stopLossPrice: 28900,
    targetPrice: 36000,
    botManagedBy: "BOS/CHoCH 구조 돌파 봇"
  },
  {
    symbol: "BTC",
    name: "비트코인 (BTC)",
    category: "가상자산",
    market: "BTC",
    qty: 0.045,
    avgBuyPrice: 130800000,
    currentPrice: 134500000,
    pnlAmount: 166500,
    pnlRate: 2.82,
    stopLossPrice: 127000000,
    targetPrice: 145000000,
    botManagedBy: "업비트 24H 가상자산 봇"
  }
];

export const PortfolioHoldingsModal: React.FC<PortfolioHoldingsModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  isRealTradingMode = false,
  onOpenApiConnectModal
}) => {
  const { profile, positions, cashBreakdown, marketStatus, purgeAllMockData, addToast } = useApp();
  const [mockHoldings, setMockHoldings] = useState<HoldingItem[]>(MOCK_HOLDINGS);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [selectedSymbolForLoss, setSelectedSymbolForLoss] = useState<string | null>(null);
  const [isPerformanceReportOpen, setIsPerformanceReportOpen] = useState(false);
  const [isFilterConfigModalOpen, setIsFilterConfigModalOpen] = useState(false);
  const [selectedHoldingForRationale, setSelectedHoldingForRationale] = useState<HoldingDetailData | null>(null);

  const fxRate = marketStatus?.exchangeRate?.value;
  const safeFxRate = fxRate || 1;

  const handleOpenRationale = (holdingItem: HoldingItem) => {
    setSelectedHoldingForRationale({
      symbol: holdingItem.symbol,
      name: holdingItem.name,
      category: holdingItem.category,
      market: holdingItem.market,
      qty: holdingItem.qty,
      avgBuyPrice: holdingItem.avgBuyPrice,
      currentPrice: holdingItem.currentPrice,
      pnlAmount: holdingItem.pnlAmount,
      pnlRate: holdingItem.pnlRate,
      stopLossPrice: holdingItem.stopLossPrice,
      targetPrice: holdingItem.targetPrice,
      botManagedBy: holdingItem.botManagedBy
    });
  };

  const handleOpenLossAnalysis = (symbol?: string) => {
    setSelectedSymbolForLoss(symbol || null);
    setIsLossModalOpen(true);
  };

  const handlePurgeMockData = async () => {
    try {
      await purgeAllMockData();
      setMockHoldings([]);
      if (addToast) {
        addToast({
          type: "SUCCESS",
          title: "모의자산 및 매수매도 내역 완전 삭제 완료",
          message: "모든 모의 데이터가 초기화되었습니다."
        });
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Real accounts connection check
  const hasKoreaKey = Boolean(profile?.koreaAppKey && profile?.koreaAccountNo);
  const hasUpbitKey = Boolean(profile?.upbitAccessKey);
  const hasTossKey = Boolean(typeof window !== "undefined" && localStorage.getItem("toss_api_key"));
  const isAnyRealConnected = hasKoreaKey || hasUpbitKey || hasTossKey;

  // Map AppContext real positions if available
  const mappedRealHoldings: HoldingItem[] = React.useMemo(() => {
    if (!positions || positions.length === 0) return [];
    return (positions || []).map((p) => {
      const isUs = p.market === "US" || p.broker === "us" || p.id?.startsWith("us_") || (/^[A-Z]{1,5}$/.test(p.symbol) && !["BTC", "ETH", "XRP", "SOL", "DOGE"].includes(p.symbol) && !p.symbol.startsWith("KRW-"));
      const isCrypto = p.market === "BTC" || p.broker === "upbit" || p.symbol.startsWith("KRW-") || p.symbol === "BTC";
      const curPrice = p.currentPrice || p.avgPrice || 0;
      const qty = p.quantity || 0;
      const avgBuyPrice = p.avgPrice || 0;
      const pnlAmount = (curPrice - avgBuyPrice) * qty;
      const pnlRate = avgBuyPrice > 0 ? ((curPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;
      const category: "소형주" | "중형주" | "대형주" | "가상자산" | "미국주식" =
        isCrypto ? "가상자산" : isUs ? "미국주식" : "중형주";

      return {
        symbol: p.symbol,
        name: p.name,
        category,
        market: isCrypto ? "BTC" : isUs ? "US" : "KOREA",
        qty,
        avgBuyPrice,
        currentPrice: curPrice,
        pnlAmount,
        pnlRate,
        stopLossPrice: isUs ? Number((avgBuyPrice * 0.95).toFixed(2)) : Math.round(avgBuyPrice * 0.95),
        targetPrice: isUs ? Number((avgBuyPrice * 1.15).toFixed(2)) : Math.round(avgBuyPrice * 1.15),
        botManagedBy: isCrypto ? "업비트 가상자산 봇" : isUs ? "토스증권 US 모멘텀 봇" : (p as any).broker === "toss" ? "토스증권 스윙 봇" : "한국투자증권 주도주 봇"
      };
    });
  }, [positions]);

  const isRealTrade = Boolean(profile?.isRealTrade || isRealTradingMode);
  const isRealAndDisconnected = isRealTrade && !isAnyRealConnected;
  const currentHoldings = mappedRealHoldings.length > 0 ? mappedRealHoldings : (isRealTrade ? [] : mockHoldings);

  const totalEvaluation = currentHoldings.reduce((acc, h) => {
    const isUs = h.market === "US" || h.category === "미국주식";
    const itemVal = h.qty * h.currentPrice;
    return acc + (isUs ? itemVal * fxRate : itemVal);
  }, 0);

  const totalCost = currentHoldings.reduce((acc, h) => {
    const isUs = h.market === "US" || h.category === "미국주식";
    const itemCost = h.qty * h.avgBuyPrice;
    return acc + (isUs ? itemCost * fxRate : itemCost);
  }, 0);

  const totalPnL = totalEvaluation - totalCost;
  const totalPnLRate = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const availableCash = cashBreakdown?.totalCash ?? profile?.cash ?? profile?.balance ?? 0;
  const totalAssets = totalEvaluation + availableCash;

  const handleSell = (symbol: string, name: string) => {
    setMockHoldings((prev) => prev.filter((h) => h.symbol !== symbol));
    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "시장가 매도 접수",
        message: `[${name}] 포지션이 전량 청산되었습니다.`
      });
    }
  };

  // Lock body scrolling when modal is active
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] overflow-hidden flex flex-col overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">보유 종목 현황 및 실시간 수익 대시보드</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono tracking-wide ${
                    isRealTrade ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {isRealTrade ? "실계좌 LIVE 모드" : "모의투자 DEMO 모드"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRealTrade
                  ? "연결된 한국투자증권, 업비트, 토스증권 실계좌의 보유 잔고 및 실시간 평가손익을 관제합니다."
                  : "AI 봇이 실시간으로 운용하는 모의 포트폴리오의 실시간 원장 및 평가손익을 관제합니다."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsFilterConfigModalOpen(true)}
              className="px-2.5 py-1.5 text-[11px] bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
              title="무차별 매수 방지 및 업비트 코인 엄선 필터 설정"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-200" />
              <span>자율매매 필터 설정</span>
            </button>
            <button
              onClick={() => setIsPerformanceReportOpen(true)}
              className="px-2.5 py-1.5 text-[11px] bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
              title="모의투자 자율매매 승률 및 매수/매도 시점 AI 성과 리포트"
            >
              <Award className="w-3.5 h-3.5 text-cyan-200" />
              <span>AI 성과 리포트</span>
            </button>
            <button
              onClick={() => handleOpenLossAnalysis()}
              className="px-2.5 py-1.5 text-[11px] bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
              title="마이너스 종목 손실 원인 정밀 분석"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>손실원인 분석</span>
            </button>
            <button
              onClick={handlePurgeMockData}
              className="px-2.5 py-1.5 text-[11px] bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-700"
              title="모의 보유자산 및 가상 매수/매도 내역 완전 삭제"
            >
              <span>모의자산 삭제</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Advisory Filter Banner */}
        <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-indigo-900">
            <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>🛡️ 무차별 매수 방지 필터 가동 중:</strong> 업비트 코인은 Top 4(BTC/ETH/SOL/XRP) 또는 설정된 조건만 매수되며, 최대 보유 개수({profile?.maxHoldingsCount || 5}개)가 제한됩니다.
            </span>
          </div>
          <button
            onClick={() => setIsFilterConfigModalOpen(true)}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer"
          >
            필터 변경
          </button>
        </div>

        {/* Real Mode Unconnected Warning Banner */}
        {isRealAndDisconnected && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-rose-900">실계좌 API가 아직 등록되지 않았습니다 (보유 자산 0원)</h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  한국투자증권(KIS), 업비트, 토스증권 중 하나 이상의 API를 등록해야 실제 계좌의 보유 종목과 잔고가 실시간 표시됩니다.
                </p>
              </div>
            </div>

            {onOpenApiConnectModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenApiConnectModal();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Key className="w-4 h-4" />
                <span>증권사 API 연결하기</span>
              </button>
            )}
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-sans font-semibold">총 자산 평가액</div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {Math.round(totalAssets).toLocaleString()}원
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5 truncate">
              예수금: {(availableCash ?? 0).toLocaleString()}원
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-sans font-semibold">총 평가 손익</div>
            <div
              className={`text-base font-black mt-0.5 flex items-center gap-0.5 ${
                totalPnL >= 0 ? "text-rose-600" : "text-blue-600"
              }`}
            >
              {totalPnL >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>
                {totalPnL >= 0 ? "+" : ""}
                {Math.round(totalPnL).toLocaleString()}원
              </span>
            </div>
            <div
              className={`text-[10px] font-sans font-bold mt-0.5 ${
                totalPnL >= 0 ? "text-rose-600" : "text-blue-600"
              }`}
            >
              수익률 {totalPnLRate >= 0 ? "+" : ""}
              {totalPnLRate.toFixed(2)}%
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-sans font-semibold">보유 종목 수</div>
            <div className="text-base font-black text-indigo-600 mt-0.5">
              {currentHoldings.length}개 종목
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">AI 분산 운용중</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-sans font-semibold">계좌 운용 상태</div>
            <div className="text-base font-black text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>정상 운용</span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">
              {isRealTrade ? "실계좌 LIVE 주문" : "모의투자 시뮬레이션"}
            </div>
          </div>
        </div>

        {/* Holdings List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentHoldings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-sans">
              <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <div className="text-sm font-bold text-slate-700">보유 종목이 없습니다.</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {isRealAndDisconnected
                  ? "실계좌 API를 연결하면 증권사에서 실제 보유 중인 주식 및 가상자산이 자동으로 불러와집니다."
                  : "AI 봇이 시장 진입 조건을 충족할 때 자동으로 매수를 실행합니다."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              {currentHoldings.map((h) => {
                const isUs = h.market === "US" || h.category === "미국주식";
                const itemTotal = h.qty * h.currentPrice;
                const isPlus = h.pnlRate >= 0;
                const isCrypto = h.category === "가상자산" || h.symbol.startsWith("KRW-") || h.symbol === "BTC";
                const qtyDisplay = isCrypto
                  ? `${(h.qty ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}개`
                  : `${(h.qty ?? 0).toLocaleString()}주`;

                return (
                  <div
                    key={h.symbol}
                    className="p-4 hover:bg-slate-50 transition flex flex-col space-y-3 font-sans"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-black text-xs text-slate-700 shrink-0 border border-slate-200">
                          {h.symbol.replace("KRW-", "").slice(0, 4)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => handleOpenRationale(h)}
                              className="text-sm font-black text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                              title="클릭 시 AI 체결 이유 및 미래 예측 그래프 보기"
                            >
                              <span>{h.name}</span>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold">
                              {h.symbol}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                              isCrypto 
                                ? "bg-amber-100 text-amber-800 border border-amber-300" 
                                : isUs 
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-300" 
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {isCrypto ? "🪙 24H 업비트 코인" : isUs ? "🇺🇸 미국주식" : "🇰🇷 국내주식"}
                            </span>
                            <span
                              onClick={() => handleOpenRationale(h)}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 cursor-pointer transition flex items-center gap-1"
                            >
                              <span>AI 체결근거 &amp; 예측</span>
                              <ArrowUpRight className="w-3 h-3 text-indigo-500" />
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>수량: <strong className="text-slate-800 font-mono">{qtyDisplay}</strong></span>
                            <span>•</span>
                            <span>
                              평균매수가:{" "}
                              <strong className="text-slate-800 font-mono">
                                {isUs ? `$${(h.avgBuyPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(h.avgBuyPrice ?? 0).toLocaleString()}원`}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              현재가:{" "}
                              <strong className="text-slate-900 font-mono">
                                {isUs ? `$${(h.currentPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(h.currentPrice ?? 0).toLocaleString()}원`}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 font-mono shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">
                            {isUs ? (
                              <>
                                <span>평가액 ${(itemTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="block text-[10px] text-slate-400 font-normal">₩{Math.round(itemTotal * fxRate).toLocaleString()}</span>
                              </>
                            ) : (
                              <span>평가액 {Math.round(itemTotal).toLocaleString()}원</span>
                            )}
                          </div>
                          <div
                            className={`text-xs font-black flex items-center justify-end gap-0.5 ${
                              isPlus ? "text-rose-600" : "text-blue-600"
                            }`}
                          >
                            {isPlus ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>
                              {isPlus ? "+" : ""}
                              {h.pnlRate.toFixed(2)}% (
                              {isUs ? (
                                `${isPlus ? "+" : ""}$${(h.pnlAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              ) : (
                                `${isPlus ? "+" : ""}${Math.round(h.pnlAmount).toLocaleString()}원`
                              )}
                              )
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenLossAnalysis(h.symbol)}
                            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                              !isPlus
                                ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-black"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            }`}
                            title="AI 자율매매 손실/마이너스 원인 분석"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>{!isPlus ? "손실원인 분석" : "AI 진단"}</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onSelectStock) onSelectStock(h.symbol);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer border border-slate-200"
                          >
                            차트
                          </button>
                          <button
                            onClick={() => handleSell(h.symbol, h.name)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition cursor-pointer"
                          >
                            청산
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Target Price (TP) & Stop Loss (SL) Progress Bar */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-blue-600 font-bold">🔴 손절가(SL -2.5%): {Math.round(h.avgBuyPrice * 0.975).toLocaleString()}원</span>
                        <span className="text-slate-700 font-black">📍 현재가: {(h.currentPrice ?? 0).toLocaleString()}원</span>
                        <span className="text-emerald-600 font-bold">🟢 1차 목표가(TP +3.5%): {Math.round(h.avgBuyPrice * 1.035).toLocaleString()}원</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden p-0.5 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPlus ? "bg-gradient-to-r from-emerald-500 to-rose-500" : "bg-gradient-to-r from-blue-500 to-slate-400"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(5, ((h.currentPrice - (h.avgBuyPrice * 0.975)) / ((h.avgBuyPrice * 1.035) - (h.avgBuyPrice * 0.975))) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-sans">
          <span>실시간 호가 및 체결 엔진 자동 연동 중</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>

      {/* AI Loss Cause Analysis Modal */}
      <AiLossCauseAnalysisModal
        isOpen={isLossModalOpen}
        onClose={() => setIsLossModalOpen(false)}
        selectedSymbol={selectedSymbolForLoss}
      />

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
      />

      {/* AI Auto-Trading & Upbit Crypto Filter Config Modal */}
      <AutoTradingFilterConfigModal
        isOpen={isFilterConfigModalOpen}
        onClose={() => setIsFilterConfigModalOpen(false)}
      />
    </div>
  );
};
