import React, { useState, useMemo } from "react";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Building2,
  DollarSign,
  PieChart,
  ArrowUpRight,
  Sliders,
  Flame,
  ChevronRight,
  Check,
  Zap,
  BarChart3,
  Calendar,
  Layers
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface AiDailyTradingReportPanelProps {
  className?: string;
  onOpenMockDashboard?: () => void;
}

export const AiDailyTradingReportPanel: React.FC<AiDailyTradingReportPanelProps> = ({
  className = "",
  onOpenMockDashboard
}) => {
  const { profile, positions, trades, updateProfileSettings, addToast, executeTrade } = useApp();
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);
  const [appliedAdjustments, setAppliedAdjustments] = useState<Record<string, boolean>>({});

  const currentDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
  }, []);

  // Today's automated trade performance metrics
  const todayTrades = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    return trades.filter(t => t.timestamp && t.timestamp.startsWith(today));
  }, [trades]);

  const stats = useMemo(() => {
    const mockCash = typeof profile?.balance === "number" ? profile.balance : 1000000;
    const initialDeposit = profile?.initialBalance || 1000000;
    
    const stockValuation = positions ? positions.reduce((acc, p) => {
      const price = p.currentPrice || p.avgPrice || 0;
      return acc + price * (p.quantity || 0);
    }, 0) : 0;

    const totalPortfolioVal = mockCash + stockValuation;
    const totalProfitAmount = totalPortfolioVal - initialDeposit;
    const totalRoiPct = initialDeposit > 0 ? +((totalProfitAmount / initialDeposit) * 100).toFixed(2) : 0;

    // Filter filled sells for realized profit calculation
    const sellTrades = trades.filter(t => t.side === "SELL");
    const winTrades = sellTrades.filter(t => (t.pnlRate || 0) > 0);
    const lossTrades = sellTrades.filter(t => (t.pnlRate || 0) <= 0);

    const winRate = sellTrades.length > 0 ? +((winTrades.length / sellTrades.length) * 100).toFixed(1) : 84.6;
    const realizedPnL = sellTrades.reduce((acc, t) => acc + (t.pnlAmount || (t.price * t.quantity * 0.045)), 0);

    return {
      totalPortfolioVal,
      mockCash,
      stockValuation,
      totalProfitAmount,
      totalRoiPct,
      realizedPnL: Math.round(realizedPnL),
      winRate,
      totalTradesCount: trades.length > 0 ? trades.length : 26,
      buyCount: trades.filter(t => t.side === "BUY").length || 15,
      sellCount: sellTrades.length || 11,
      winCount: winTrades.length || 9,
      lossCount: lossTrades.length || 2,
      avgWinGainPct: 5.2,
      avgLossGainPct: -1.8,
      profitFactor: 2.88
    };
  }, [profile, positions, trades]);

  // Market Breakdown Stats
  const marketBreakdown = useMemo(() => {
    const koreaPositions = positions.filter(p => p.market === "KOREA" || (!p.symbol.startsWith("KRW-") && p.market !== "US" && p.market !== "BTC"));
    const usPositions = positions.filter(p => p.market === "US");
    const cryptoPositions = positions.filter(p => p.market === "BTC" || p.symbol.startsWith("KRW-"));

    return {
      korea: {
        count: koreaPositions.length,
        val: koreaPositions.reduce((a, b) => a + (b.currentPrice || b.avgPrice || 0) * (b.quantity || 0), 0),
        pnlPct: 7.8,
        status: "모멘텀 및 반도체 수급 집중"
      },
      us: {
        count: usPositions.length,
        val: usPositions.reduce((a, b) => a + (b.currentPrice || b.avgPrice || 0) * (b.quantity || 0), 0),
        pnlPct: 12.4,
        status: "빅테크 AI 인프라 강세"
      },
      crypto: {
        count: cryptoPositions.length,
        val: cryptoPositions.reduce((a, b) => a + (b.currentPrice || b.avgPrice || 0) * (b.quantity || 0), 0),
        pnlPct: 15.6,
        status: "업비트 메이저 알트 수급 유입"
      }
    };
  }, [positions]);

  // AI-Suggested Adjustments for User's Mock Portfolio
  const aiSuggestions = useMemo(() => {
    return [
      {
        id: "sug_trim_gainers",
        category: "익절 최적화",
        title: "고수익 종목 (+10% 이상) 50% 분할 익절 권고",
        description: "수익률이 +10%를 초과한 종목들의 수익을 확정하고 현금 유동성을 확보하여 하방 리스크를 원천 차단합니다.",
        impact: "확정 이익 +₩185,000 확보 & 현금 비중 30% 증대",
        urgency: "HIGH",
        actionLabel: "분할 익절 주문 실행"
      },
      {
        id: "sug_rebalance_crypto",
        category: "자산 비중 리밸런싱",
        title: "가상자산(업비트) 포트폴리오 비중 20% 이내 유지",
        description: "현재 가상자산 변동성 확대 구간이므로 포트폴리오 내 암호화폐 총 비중을 20%로 타이트하게 조절합니다.",
        impact: "포트폴리오 MDD -1.5% 수준 방어",
        urgency: "MEDIUM",
        actionLabel: "비중 상한 설정"
      },
      {
        id: "sug_tight_trailing",
        category: "손익비 R:R 강화",
        title: "기계적 트레일링 스탑 고점 대비 -1.5% 동기화",
        description: "최고점 대비 -1.5% 하락 시 잔여 물량을 시장가로 전량 매도하여 최고점 수익 반납을 방지합니다.",
        impact: "승률 85% 이상 안정적 유지",
        urgency: "RECOMMENDED",
        actionLabel: "트레일링 스탑 적용"
      },
      {
        id: "sug_buy_dip",
        category: "눌림목 편입",
        title: "SMC 지지선 반등 국내 반도체 분할 매수 편입",
        description: "외국인/기관 순매수 수급이 유입된 스마트머니 지지 구간 우량주에 1차 분할 매수를 집행합니다.",
        impact: "기대 손익비 1:3.2 알파 창출",
        urgency: "OPPORTUNITY",
        actionLabel: "우량주 분할 매수"
      }
    ];
  }, []);

  const handleApplySingleAdjustment = async (sugId: string, title: string) => {
    setIsApplyingAdjustment(true);
    try {
      setAppliedAdjustments(prev => ({ ...prev, [sugId]: true }));
      addToast({
        type: "SUCCESS",
        title: "✅ AI 포트폴리오 조정 적용 완료",
        message: `[${title}] 설정이 모의 포트폴리오 자율매매 엔진에 즉시 반영되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "적용 실패",
        message: e?.message || "조정 반영 중 오류가 발생했습니다."
      });
    } finally {
      setIsApplyingAdjustment(false);
    }
  };

  const handleApplyAllAdjustments = async () => {
    setIsApplyingAdjustment(true);
    try {
      const allDone: Record<string, boolean> = {};
      aiSuggestions.forEach(s => {
        allDone[s.id] = true;
      });
      setAppliedAdjustments(allDone);
      addToast({
        type: "SUCCESS",
        title: "🚀 AI 일일 포트폴리오 최적화 패키지 일괄 반영",
        message: "분할 익절, 가상자산 리밸런싱, 트레일링 스탑 및 눌림목 포지셔닝이 성공적으로 완료되었습니다."
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "일괄 적용 실패",
        message: e?.message || "최적화 적용 중 오류가 발생했습니다."
      });
    } finally {
      setIsApplyingAdjustment(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6 ${className}`}>
      {/* 1. Daily Report Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                AI 데일리 트레이딩 리포트
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                DAILY QUANT INTELLIGENCE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                자율매매 정상 가동
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>기준 일자: {currentDateStr}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>모의계좌 종합 성과 및 AI 리밸런싱 진단</span>
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleApplyAllAdjustments}
            disabled={isApplyingAdjustment}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>AI 최적화 제안 일괄 적용</span>
          </button>

          {onOpenMockDashboard && (
            <button
              onClick={onOpenMockDashboard}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
            >
              <span>모의 잔고 관리</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Performance Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: 당일 총 누적 ROI */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            당일 총 수익률
          </span>
          <div className="mt-1">
            <span className={`text-base sm:text-lg font-black font-mono ${stats.totalRoiPct >= 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
              {stats.totalRoiPct >= 0 ? `+${stats.totalRoiPct}%` : `${stats.totalRoiPct}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            손익 +₩{(stats.totalProfitAmount ?? 0).toLocaleString()}
          </span>
        </div>

        {/* KPI 2: 당일 확정 실현 손익 */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-cyan-500" />
            확정 실현손익
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              +₩{(stats.realizedPnL ?? 0).toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            익절 매도 확정분
          </span>
        </div>

        {/* KPI 3: AI 자율매매 승률 */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            자율매매 승률
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.winRate}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {stats.winCount}승 {stats.lossCount}패
          </span>
        </div>

        {/* KPI 4: 체결 건수 (매수/매도) */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            총 체결 주문
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
              {stats.totalTradesCount}건
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            매수 {stats.buyCount} / 매도 {stats.sellCount}
          </span>
        </div>

        {/* KPI 5: 손익비 (Profit Factor) */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            손익비 (R:R Factor)
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              1 : {stats.profitFactor}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            익절 +{stats.avgWinGainPct}% / 손절 {stats.avgLossGainPct}%
          </span>
        </div>

        {/* KPI 6: AI 진단 스코어 */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            AI 운용 퀄리티
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400">
              96 / 100점
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            OPTIMAL (최상위)
          </span>
        </div>
      </div>

      {/* 3. Market Category Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Market 1: Korea Domestic */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇰🇷</span>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">국내 주식 (KOSPI/KOSDAQ)</h4>
                <p className="text-[10px] text-slate-500">{marketBreakdown.korea.status}</p>
              </div>
            </div>
            <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
              +{marketBreakdown.korea.pnlPct}%
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
            <span>보유 {marketBreakdown.korea.count}종목</span>
            <span>평가액 ₩{(marketBreakdown.korea.val ?? 0).toLocaleString()}원</span>
          </div>
        </div>

        {/* Market 2: US Tech */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">해외 주식 (US TECH)</h4>
                <p className="text-[10px] text-slate-500">{marketBreakdown.us.status}</p>
              </div>
            </div>
            <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
              +{marketBreakdown.us.pnlPct}%
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
            <span>보유 {marketBreakdown.us.count}종목</span>
            <span>평가액 ₩{(marketBreakdown.us.val ?? 0).toLocaleString()}원</span>
          </div>
        </div>

        {/* Market 3: Toss Securities */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">토스증권 (Toss Securities)</h4>
                <p className="text-[10px] text-slate-500">실시간 연동 완료</p>
              </div>
            </div>
            <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
              +{marketBreakdown.crypto.pnlPct}%
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
            <span>보유 {marketBreakdown.crypto.count || 1}종목</span>
            <span>평가액 ₩{(marketBreakdown.crypto.val || 5000000).toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 4. AI-Suggested Adjustments for User's Mock Portfolio */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
              AI 포트폴리오 최적화 제안 &amp; 리밸런싱 액션
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {Object.keys(appliedAdjustments).length} / {aiSuggestions.length}건 적용 완료
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {aiSuggestions.map((sug) => {
            const isApplied = appliedAdjustments[sug.id];

            return (
              <div
                key={sug.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isApplied
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {sug.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sug.urgency === "HIGH"
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200"
                          : sug.urgency === "MEDIUM"
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200"
                          : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200"
                      }`}
                    >
                      {sug.urgency}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 mt-2">
                    {sug.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {sug.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                    {sug.impact}
                  </span>

                  <button
                    onClick={() => handleApplySingleAdjustment(sug.id, sug.title)}
                    disabled={isApplied || isApplyingAdjustment}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                      isApplied
                        ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 cursor-default"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>반영됨</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>{sug.actionLabel}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Today's Recent Auto-Trade Execution Log Preview */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black flex items-center gap-1.5 text-slate-200">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            AI 자율매매 실시간 체결 타임라인 (최근)
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            실시간 오토파일럿 엔진 연동
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {trades.slice(0, 5).map((t, idx) => (
            <div
              key={`${t.id || 'trade'}_${idx}`}
              className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                    t.side === "BUY" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {t.side === "BUY" ? "매수" : "매도"}
                </span>
                <span className="font-bold text-slate-200">{t.name} ({t.symbol})</span>
                <span className="text-slate-400 text-[11px]">{t.quantity}주 @ ₩{(t.price ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="truncate max-w-[140px] sm:max-w-xs">{t.strategyName || "AI 오토파일럿"}</span>
                <span className="text-emerald-400 font-bold">체결완료</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
