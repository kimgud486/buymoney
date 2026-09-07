import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AiLossCauseAnalysisModal } from '../components/trading/AiLossCauseAnalysisModal';
import { AiTradingPerformanceReportModal } from '../components/trading/AiTradingPerformanceReportModal';
import {
  ShieldAlert,
  X,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Layers,
  Clock,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  Trash2,
  AlertTriangle,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sliders,
  Wallet,
  Globe2,
  Award,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { StockPosition, ActiveChartStock } from '../types';
import { ExchangeRateInfoModal } from '../components/trading/ExchangeRateInfoModal';

interface MockPortfolioDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditBalance?: () => void;
  onOpenChart?: (stock: ActiveChartStock) => void;
}

export const MockPortfolioDetailModal: React.FC<MockPortfolioDetailModalProps> = ({
  isOpen,
  onClose,
  onOpenEditBalance,
  onOpenChart
}) => {
  const {
    profile,
    positions,
    trades,
    marketStatus,
    executeTrade,
    rechargeMockBalance,
    resetMockPortfolio,
    clearAllPositions,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'holdings' | 'capital' | 'history'>('holdings');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'KOREA' | 'US' | 'BTC'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customRechargeAmount, setCustomRechargeAmount] = useState<string>('10000000');
  const [isExchangeRateModalOpen, setIsExchangeRateModalOpen] = useState(false);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [selectedSymbolForLoss, setSelectedSymbolForLoss] = useState<string | null>(null);
  const [isPerformanceReportOpen, setIsPerformanceReportOpen] = useState(false);

  const fxRate = marketStatus?.exchangeRate?.value;
  const safeFxRate = fxRate || 1;

  // Stats Calculations
  const mockCash = profile?.balance || 0;
  const initialCapital = profile?.initialBalance && profile.initialBalance > 0 
    ? profile.initialBalance 
    : 50000000;

  // Filter positions
  const filteredPositions = useMemo(() => {
    return positions.filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMarket = marketFilter === 'ALL' || p.market === marketFilter;
      return matchesSearch && matchesMarket;
    });
  }, [positions, searchQuery, marketFilter]);

  // Overall holdings value (currency-aware: US in USD converted to KRW)
  const totalCost = useMemo(() => {
    return positions.reduce((acc, p) => {
      const isUs = p.market === 'US' || p.broker === 'us' || p.id?.startsWith('us_');
      const baseCost = p.quantity * p.avgPrice;
      return acc + (isUs ? baseCost * fxRate : baseCost);
    }, 0);
  }, [positions, fxRate]);

  const totalEval = useMemo(() => {
    return positions.reduce((acc, p) => {
      const isUs = p.market === 'US' || p.broker === 'us' || p.id?.startsWith('us_');
      const curPrice = p.currentPrice || p.avgPrice;
      const baseEval = p.quantity * curPrice;
      return acc + (isUs ? baseEval * fxRate : baseEval);
    }, 0);
  }, [positions, fxRate]);

  const totalUnrealizedPnl = totalEval - totalCost;
  const holdingsReturnRate = totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0;

  const totalAssets = mockCash + totalEval;
  const totalPortfolioRoi = initialCapital > 0 
    ? ((totalAssets - initialCapital) / initialCapital) * 100 
    : holdingsReturnRate;
  const totalPortfolioPnl = totalAssets - initialCapital;

  // Market Breakdown
  const marketBreakdown = useMemo(() => {
    let krwInvested = 0;
    let usInvested = 0;
    let btcInvested = 0;

    positions.forEach(p => {
      const isUs = p.market === 'US' || p.broker === 'us' || p.id?.startsWith('us_');
      const curPrice = p.currentPrice || p.avgPrice;
      const val = p.quantity * curPrice;
      if (p.market === 'KOREA') krwInvested += val;
      else if (isUs) usInvested += val * fxRate;
      else if (p.market === 'BTC') btcInvested += val;
    });

    const cashPct = totalAssets > 0 ? (mockCash / totalAssets) * 100 : 100;
    const krwPct = totalAssets > 0 ? (krwInvested / totalAssets) * 100 : 0;
    const usPct = totalAssets > 0 ? (usInvested / totalAssets) * 100 : 0;
    const btcPct = totalAssets > 0 ? (btcInvested / totalAssets) * 100 : 0;

    return {
      krwInvested,
      usInvested,
      btcInvested,
      cashPct,
      krwPct,
      usPct,
      btcPct
    };
  }, [positions, mockCash, totalAssets, fxRate]);

  // Quick Action Handlers
  const handleQuickBuy = async (position: StockPosition, addQty: number) => {
    try {
      setIsProcessing(true);
      const isUs = position.market === 'US' || position.broker === 'us' || position.id?.startsWith('us_');
      const curPrice = position.currentPrice || position.avgPrice;
      const orderAmountKrw = isUs ? curPrice * addQty * fxRate : curPrice * addQty;

      if (mockCash < orderAmountKrw) {
        addToast({
          type: 'ERROR',
          title: `[가상 예수금 부족] ${position.name} (${position.symbol})`,
          message: `${position.name} (${position.symbol}) 매수 주문 금액(₩${Math.round(orderAmountKrw).toLocaleString()}원)이 현재 가상 예수금(₩${(mockCash ?? 0).toLocaleString()}원)을 초과합니다.`
        });
        return;
      }

      await executeTrade(
        position.symbol,
        position.name,
        position.market,
        'BUY',
        addQty,
        curPrice,
        '모의 포트폴리오 빠른 추가매수',
        '포트폴리오 직접 비중 확대 주문'
      );

      addToast({
        type: 'SUCCESS',
        title: '모의 추가매수 완료',
        message: `${position.name} ${addQty}주가 추가 체결되었습니다.`
      });
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: '매수 실패',
        message: err.message || '추가매수 처리 중 오류가 발생했습니다.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickSell = async (position: StockPosition, ratio: number = 1.0) => {
    try {
      setIsProcessing(true);
      const sellQty = ratio === 1.0 ? position.quantity : Math.max(1, Math.floor(position.quantity * ratio));
      const curPrice = position.currentPrice || position.avgPrice;

      await executeTrade(
        position.symbol,
        position.name,
        position.market,
        'SELL',
        sellQty,
        curPrice,
        ratio === 1.0 ? '모의 포트폴리오 전량 청산' : '모의 포트폴리오 50% 분할매도',
        '포트폴리오 직접 비중 축소 주문'
      );

      addToast({
        type: 'SUCCESS',
        title: ratio === 1.0 ? '전량 매도 청산 완료' : '50% 분할매도 완료',
        message: `${position.name} ${sellQty}주 매도가 정상 체결되었습니다.`
      });
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: '매도 실패',
        message: err.message || '매도 처리 중 오류가 발생했습니다.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFastRecharge = async (amount: number) => {
    await rechargeMockBalance(amount);
  };

  const handleResetWithConfirm = async (capital: number) => {
    await resetMockPortfolio(capital);
  };

  useModalScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col overscroll-contain"
        id="mock-portfolio-detail-modal"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
              title="이전 화면으로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">이전</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">AI 모의투자 상세 포트폴리오 관제</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  실시간 라이브 시세 연동
                </span>
              </div>
              <p className="text-xs text-slate-300">
                100% 안전한 가상 시뮬레이션 원장 · 네이버증권 & 업비트 실시간 호가 기반 가상 체결
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPerformanceReportOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="모의투자 자율매매 승률 및 매수/매도 시점 AI 성과 리포트"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>AI 매매 성과 리포트</span>
            </button>
            <button
              onClick={() => setIsExchangeRateModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition border border-white/10 cursor-pointer shadow-2xs"
              title="실시간 원/달러 환율 정보 및 계산기"
            >
              <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>환율: ₩{fxRate.toFixed(1)}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              id="btn-close-mock-portfolio"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP KPI CARDS (4-GRID) */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Total Assets */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>총 모의 자산</span>
              <PieChart className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {(totalAssets ?? 0).toLocaleString()}<span className="text-xs font-sans text-slate-500 ml-1">원</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs font-bold">
              <span className={totalPortfolioPnl >= 0 ? "text-rose-500" : "text-sky-500"}>
                {totalPortfolioPnl >= 0 ? "+" : ""}{totalPortfolioRoi.toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-400">
                ({totalPortfolioPnl >= 0 ? "+" : ""}{(totalPortfolioPnl ?? 0).toLocaleString()}원)
              </span>
            </div>
          </div>

          {/* 2. Virtual Cash */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>가상 현금 예수금</span>
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {(mockCash ?? 0).toLocaleString()}<span className="text-xs font-sans text-slate-500 ml-1">원</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-slate-500">
                비중: {totalAssets > 0 ? ((mockCash / totalAssets) * 100).toFixed(1) : 100}%
              </span>
              <button
                onClick={() => handleFastRecharge(10000000)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                +1천만 충전
              </button>
            </div>
          </div>

          {/* 3. Holdings Evaluation */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>보유주식 평가금</span>
              <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {(totalEval ?? 0).toLocaleString()}<span className="text-xs font-sans text-slate-500 ml-1">원</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs font-bold">
              <span className={totalUnrealizedPnl >= 0 ? "text-rose-500" : "text-sky-500"}>
                {totalUnrealizedPnl >= 0 ? "+" : ""}{holdingsReturnRate.toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-400">
                ({positions.length}종목)
              </span>
            </div>
          </div>

          {/* 4. Trade Count */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>AI 모의체결 건수</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {trades.length}<span className="text-xs font-sans text-slate-500 ml-1">건</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              시작 원금: {(initialCapital ?? 0).toLocaleString()}원
            </div>
          </div>
        </div>

        {/* ASSET ALLOCATION BAR */}
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-blue-600" />
              <span>자산 배분 비중 (Asset Weight)</span>
            </span>
            <div className="flex items-center gap-3 text-[11px] flex-wrap">
              <span className="text-slate-500">💵 예수금 {marketBreakdown.cashPct.toFixed(1)}%</span>
              <span className="text-blue-500">🇰🇷 국내주식 {marketBreakdown.krwPct.toFixed(1)}%</span>
              <span className="text-indigo-500">🇺🇸 미국주식 {marketBreakdown.usPct.toFixed(1)}%</span>
              <span className="text-amber-500">🪙 가상자산 {marketBreakdown.btcPct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-0.5 p-0.5">
            <div 
              style={{ width: `${marketBreakdown.cashPct}%` }}
              className="h-full bg-slate-400 dark:bg-slate-500 rounded-xs transition-all duration-300"
              title={`현금 예수금: ${marketBreakdown.cashPct.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${marketBreakdown.krwPct}%` }}
              className="h-full bg-blue-500 rounded-xs transition-all duration-300"
              title={`국내 주식: ${marketBreakdown.krwPct.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${marketBreakdown.usPct}%` }}
              className="h-full bg-indigo-500 rounded-xs transition-all duration-300"
              title={`미국 주식: ${marketBreakdown.usPct.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${marketBreakdown.btcPct}%` }}
              className="h-full bg-amber-500 rounded-xs transition-all duration-300"
              title={`가상자산: ${marketBreakdown.btcPct.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'holdings'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>보유 종목 실시간 원장 ({positions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('capital')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'capital'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>가상 자산 & 원금 제어</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>체결 내역 & 일지 ({trades.length})</span>
            </button>
          </div>

          {activeTab === 'holdings' && positions.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedSymbolForLoss(null);
                  setIsLossModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-200" />
                <span>🔍 AI 손실원인 분석</span>
              </button>

              <button
                onClick={() => {
                  clearAllPositions();
                }}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50 transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>보유종목 전체 청산</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: HOLDINGS LEDGER */}
          {activeTab === 'holdings' && (
            <div className="space-y-4">
              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {(['ALL', 'KOREA', 'US', 'BTC'] as const).map(mkt => (
                    <button
                      key={mkt}
                      onClick={() => setMarketFilter(mkt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        marketFilter === mkt
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {mkt === 'ALL' ? '전체 마켓' : mkt === 'KOREA' ? '국내주식' : mkt === 'US' ? '미국주식' : '가상자산'}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="종목명 또는 티커 검색..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Positions Table */}
              {filteredPositions.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">
                    보유 중인 모의투자 종목이 없습니다
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                    AI 자율매매 봇을 가동하거나 상단 관심종목에서 매수 신호를 포착하여 모의 포트폴리오를 구성해 보세요.
                  </p>
                  <button
                    onClick={() => handleFastRecharge(10000000)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>가상 예수금 +1,000만 충전하기</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3.5 py-2.5">종목정보</th>
                        <th className="px-3.5 py-2.5 text-right">보유수량</th>
                        <th className="px-3.5 py-2.5 text-right">평균단가</th>
                        <th className="px-3.5 py-2.5 text-right">현재가</th>
                        <th className="px-3.5 py-2.5 text-right">평가금액</th>
                        <th className="px-3.5 py-2.5 text-right">평가손익 / 수익률</th>
                        <th className="px-3.5 py-2.5 text-center">빠른 제어</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {filteredPositions.map((pos, idx) => {
                        const curPrice = pos.currentPrice || pos.avgPrice;
                        const isUs = pos.market === 'US' || pos.broker === 'us' || pos.id?.startsWith('us_');
                        const posCost = pos.quantity * pos.avgPrice;
                        const posEval = pos.quantity * curPrice;
                        const pnl = posEval - posCost;
                        const returnRate = posCost > 0 ? (pnl / posCost) * 100 : 0;
                        const isProfit = pnl >= 0;

                        // US stock specific KRW conversion
                        const posCostKrw = isUs ? posCost * fxRate : posCost;
                        const posEvalKrw = isUs ? posEval * fxRate : posEval;
                        const pnlKrw = isUs ? pnl * fxRate : pnl;

                        return (
                          <tr key={`${pos.id || pos.symbol}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                            <td className="px-3.5 py-3">
                              <div className="font-sans">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{pos.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                    {pos.symbol}
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                    pos.market === 'KOREA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                    isUs ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  }`}>
                                    {isUs ? 'US ($)' : pos.market}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                              {(pos.quantity ?? 0).toLocaleString()}주
                            </td>
                            <td className="px-3.5 py-3 text-right text-slate-600 dark:text-slate-400">
                              {isUs ? (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">${pos.avgPrice.toFixed(2)}</span>
                                  <span className="block text-[10px] text-slate-400">₩{Math.round(pos.avgPrice * fxRate).toLocaleString()}</span>
                                </div>
                              ) : (
                                <span>{Math.round(pos.avgPrice).toLocaleString()}원</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-slate-900 dark:text-white">
                              {isUs ? (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">${curPrice.toFixed(2)}</span>
                                  <span className="block text-[10px] text-slate-400 font-normal">₩{Math.round(curPrice * fxRate).toLocaleString()}</span>
                                </div>
                              ) : (
                                <span>{Math.round(curPrice).toLocaleString()}원</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-slate-900 dark:text-white">
                              {isUs ? (
                                <div>
                                  <span>${posEval.toFixed(2)}</span>
                                  <span className="block text-[10px] text-slate-400 font-normal">₩{Math.round(posEvalKrw).toLocaleString()}</span>
                                </div>
                              ) : (
                                <span>{Math.round(posEval).toLocaleString()}원</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              <div className={`font-bold flex items-center justify-end gap-1 ${isProfit ? 'text-rose-500' : 'text-sky-500'}`}>
                                {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                <span>{isProfit ? '+' : ''}{returnRate.toFixed(2)}%</span>
                              </div>
                              <div className={`text-[11px] ${isProfit ? 'text-rose-400' : 'text-sky-400'}`}>
                                {isUs ? (
                                  <span>
                                    {isProfit ? '+' : ''}${pnl.toFixed(2)} ({isProfit ? '+' : ''}₩{Math.round(pnlKrw).toLocaleString()})
                                  </span>
                                ) : (
                                  <span>{isProfit ? '+' : ''}{Math.round(pnl).toLocaleString()}원</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1 font-sans">
                                <button
                                  onClick={() => {
                                    setSelectedSymbolForLoss(pos.symbol);
                                    setIsLossModalOpen(true);
                                  }}
                                  title="AI 손실/마이너스 원인 진단"
                                  className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                                    !isProfit
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                  <span>{!isProfit ? "원인분석" : "진단"}</span>
                                </button>
                                {onOpenChart && (
                                  <button
                                    onClick={() => onOpenChart({
                                      symbol: pos.symbol,
                                      name: pos.name,
                                      market: pos.market,
                                      currentPrice: curPrice,
                                      changeRate: returnRate
                                    })}
                                    title="실시간 차트 보기"
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 transition cursor-pointer"
                                  >
                                    <BarChart2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleQuickBuy(pos, 1)}
                                  disabled={isProcessing}
                                  title="+1주 추가매수"
                                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                                >
                                  +1주
                                </button>
                                <button
                                  onClick={() => handleQuickSell(pos, 0.5)}
                                  disabled={isProcessing}
                                  title="50% 분할매도"
                                  className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-[11px] font-bold border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                                >
                                  50% 매도
                                </button>
                                <button
                                  onClick={() => handleQuickSell(pos, 1.0)}
                                  disabled={isProcessing}
                                  title="전량 청산"
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-[11px] font-bold border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                                >
                                  전량 매도
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAPITAL & ASSET CONTROLS */}
          {activeTab === 'capital' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Quick Recharge Section */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">가상 예수금 즉시 충전</h4>
                    <p className="text-xs text-slate-500">원하는 금액만큼 가상 예수금을 추가로 충전합니다.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '+100만 원', val: 1000000 },
                    { label: '+1,000만 원', val: 10000000 },
                    { label: '+5,000만 원', val: 50000000 },
                    { label: '+1억 원', val: 100000000 }
                  ].map(btn => (
                    <button
                      key={btn.val}
                      onClick={() => handleFastRecharge(btn.val)}
                      className="py-2.5 px-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer text-center"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Form */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="number"
                    value={customRechargeAmount}
                    onChange={(e) => setCustomRechargeAmount(e.target.value)}
                    placeholder="충전할 금액 입력..."
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      const amt = Number(customRechargeAmount);
                      if (amt > 0) handleFastRecharge(amt);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    직접 충전
                  </button>
                </div>
              </div>

              {/* Reset Portfolio Section */}
              <div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-900 dark:text-rose-300">모의 포트폴리오 원금 재설정 & 초기화</h4>
                    <p className="text-xs text-rose-700/80 dark:text-rose-400">원금을 새로운 금액으로 초기화하고 보유종목을 모두 비웁니다.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleResetWithConfirm(1000000)}
                    className="py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 transition cursor-pointer"
                  >
                    100만원으로 초기화
                  </button>
                  <button
                    onClick={() => handleResetWithConfirm(10000000)}
                    className="py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 transition cursor-pointer"
                  >
                    1,000만원으로 초기화
                  </button>
                  <button
                    onClick={() => handleResetWithConfirm(50000000)}
                    className="py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 transition cursor-pointer"
                  >
                    5,000만원으로 초기화
                  </button>
                  <button
                    onClick={() => handleResetWithConfirm(100000000)}
                    className="py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 transition cursor-pointer"
                  >
                    1억원으로 초기화
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRADES HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {trades.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">아직 체결된 모의 매매 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3.5 py-2.5">체결일시</th>
                        <th className="px-3.5 py-2.5">종목정보</th>
                        <th className="px-3.5 py-2.5 text-center">구분</th>
                        <th className="px-3.5 py-2.5 text-right">체결단가</th>
                        <th className="px-3.5 py-2.5 text-right">체결수량</th>
                        <th className="px-3.5 py-2.5 text-right">체결총액</th>
                        <th className="px-3.5 py-2.5">전략 및 AI 근거</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {trades.map((t, idx) => (
                        <tr key={`${t.id || 'trade'}_${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="px-3.5 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(t.timestamp).toLocaleString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td className="px-3.5 py-2.5 font-sans">
                            <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-1">({t.symbol})</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                              t.side === 'BUY'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {t.side === 'BUY' ? '매수' : '매도'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                            {Math.round(t.price).toLocaleString()}원
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-slate-700 dark:text-slate-300">
                            {(t.quantity ?? 0).toLocaleString()}주
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                            {Math.round(t.price * t.quantity).toLocaleString()}원
                          </td>
                          <td className="px-3.5 py-2.5 font-sans text-[11px] text-slate-500 max-w-xs truncate">
                            {t.strategyName || t.aiRationale || 'AI 퀀트 알고리즘 체결'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>모의투자 모드에서는 실제 자산 변동 없이 안전하게 AI 봇 전략을 검증할 수 있습니다.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Exchange Rate Info Modal */}
      <ExchangeRateInfoModal
        isOpen={isExchangeRateModalOpen}
        onClose={() => setIsExchangeRateModalOpen(false)}
      />

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
    </div>
  );
};
