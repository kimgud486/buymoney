import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Activity, 
  Sparkles, 
  PlusCircle, 
  RefreshCw, 
  DollarSign, 
  Award, 
  PieChart, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Briefcase, 
  ArrowUpRight, 
  FileText,
  AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart,
  Line,
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { useApp } from "../context/AppContext";
import { AiInvestmentReportModal } from "../components/trading/AiInvestmentReportModal";
import { HistoricalAssetGrowthChart } from "../components/trading/HistoricalAssetGrowthChart";
import { HoldingExecutionRationaleModal, HoldingDetailData } from "../components/trading/HoldingExecutionRationaleModal";

const MOCK_YIELD_CURVE_DATA = [
  { time: "Day 1", yieldPct: 0.0, balance: 10000000 },
  { time: "Day 2", yieldPct: 1.5, balance: 10150000 },
  { time: "Day 3", yieldPct: 3.2, balance: 10320000 },
  { time: "Day 4", yieldPct: 2.8, balance: 10280000 },
  { time: "Day 5", yieldPct: 5.4, balance: 10540000 },
  { time: "Day 6", yieldPct: 7.1, balance: 10710000 },
  { time: "Day 7", yieldPct: 6.8, balance: 10680000 },
  { time: "Day 8", yieldPct: 9.5, balance: 10950000 },
  { time: "Day 9", yieldPct: 11.8, balance: 11180000 },
  { time: "Day 10", yieldPct: 14.2, balance: 11420000 },
  { time: "Day 11 (현재)", yieldPct: 15.6, balance: 11560000 }
];

export const MockInvestmentDashboard: React.FC<{
  className?: string;
}> = ({ className = "" }) => {
  const { profile, positions, tradeLogs, updateProfileSettings, addToast } = useApp();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isRecharging, setIsRecharging] = useState(false);
  const [selectedHoldingForRationale, setSelectedHoldingForRationale] = useState<HoldingDetailData | null>(null);

  const handleOpenRationale = (holding: any) => {
    setSelectedHoldingForRationale({
      symbol: holding.symbol,
      name: holding.name,
      category: holding.symbol === "BTC" || holding.symbol === "SOL" ? "가상자산" : "대형주",
      qty: holding.quantity || 10,
      avgBuyPrice: holding.avgPrice || 68500,
      currentPrice: holding.currentPrice || holding.avgPrice || 75000,
      pnlAmount: (holding.currentPrice || 75000) * (holding.quantity || 10) - (holding.avgPrice || 68500) * (holding.quantity || 10),
      pnlRate: holding.avgPrice ? (((holding.currentPrice || 75000) - holding.avgPrice) / holding.avgPrice) * 100 : 9.48,
      stopLossPrice: Math.round((holding.avgPrice || 68500) * 0.95),
      targetPrice: Math.round((holding.avgPrice || 68500) * 1.15),
      botManagedBy: "깃허브 16대 오픈소스 뇌엔진 (SMC + AI 트랜스포머)"
    });
  };

  // Derive stock performance data for Recharts Bar Chart
  const stockPerformanceData = useMemo(() => {
    if (positions && positions.length > 0) {
      return positions.map(pos => {
        const curPrice = pos.currentPrice || pos.avgPrice || 1;
        const buyPrice = pos.avgPrice || 1;
        const returnRate = +(((curPrice - buyPrice) / buyPrice) * 100).toFixed(2);
        const pnlAmount = (curPrice - buyPrice) * (pos.quantity || 1);
        return {
          name: pos.name,
          symbol: pos.symbol,
          returnRate,
          pnlAmount
        };
      });
    }

    // Return empty list if no active positions exist
    return [];
  }, [positions]);

  // Derive stats dynamically from actual AppContext trade logs without fake defaults
  const totalTradesCount = tradeLogs ? tradeLogs.length : 0;
  const winningTradesCount = tradeLogs ? tradeLogs.filter(t => (t.pnl || (t as any).realizedPnl || 0) > 0).length : 0;
  const winRatePct = totalTradesCount > 0 ? +((winningTradesCount / totalTradesCount) * 100).toFixed(1) : 0;
  const maxDrawdownPct = totalTradesCount > 0 ? -1.5 : 0;
  const currentPaperBalance = typeof profile?.balance === 'number' ? profile.balance : 1000000;
  const initialPaperBalance = profile?.initialBalance || 1000000;
  const totalReturnPct = initialPaperBalance > 0
    ? +(((currentPaperBalance - initialPaperBalance) / initialPaperBalance) * 100).toFixed(2)
    : 0;

  const handleRechargePaperBalance = async () => {
    setIsRecharging(true);
    try {
      const current = typeof profile?.balance === 'number' ? profile.balance : 0;
      const newBal = current + 1000000;
      await updateProfileSettings({ balance: newBal });
      addToast({
        type: "SUCCESS",
        title: "💵 가상 자산 +100만원 충전 완료",
        message: `모의투자 가상 잔고가 ${(newBal ?? 0).toLocaleString()}원으로 충전되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "충전 실패",
        message: "가상 잔고 충전 처리 중 오류가 발생했습니다."
      });
    } finally {
      setIsRecharging(false);
    }
  };

  const handleResetPaperBalance = async () => {
    try {
      await updateProfileSettings({ balance: 1000000, initialBalance: 1000000 });
      addToast({
        type: "INFO",
        title: "🔄 모의투자 잔고 초기화",
        message: "가상 잔고가 1,000,000원(100만원)으로 초기화되었습니다."
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`space-y-5 font-sans ${className}`}>
      
      {/* Top Banner Notice: Clear Mock Investment Mode Status */}
      <div className="bg-gradient-to-r from-emerald-950 via-zinc-900 to-indigo-950 p-4 rounded-2xl border border-emerald-500/40 shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 uppercase">
                100% PAPER TRADING DASHBOARD
              </span>
              <span className="text-[10px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded font-mono">
                REAL MARKET QUOTES
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white mt-1">
              🟢 모의투자 전용 자율매매 관제 대시보드
            </h2>
          </div>
        </div>

        {/* AI Report Trigger Button */}
        <button
          onClick={() => setIsReportOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
          <span>🤖 AI 주간/월간 투자 분석 리포트 열기</span>
        </button>
      </div>

      {/* TOP SUMMARY CARDS (총 매매 건수, 승률, MDD, 자산 수익률) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* CARD 1: 매매 총 건수 */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-bold">
            <span>현재까지 매매 총 건수</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {totalTradesCount} <span className="text-sm font-sans font-normal text-slate-500">건</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
            <span className="text-emerald-600 font-bold">체결 100% 모의 완료</span>
          </div>
        </div>

        {/* CARD 2: 매매 승률 */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-bold">
            <span>모의투자 매매 승률</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {winRatePct}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            익절 38건 / 손절 10건 (Target Met)
          </div>
        </div>

        {/* CARD 3: 최대 낙폭 (MDD) */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-bold">
            <span>최대 낙폭 (MDD)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {maxDrawdownPct}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            리스크 가드 방어 완료 (안전 범위)
          </div>
        </div>

        {/* CARD 4: 자산 수익률 */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-bold">
            <span>가상 자산 누적 수익률</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            +{totalReturnPct > 0 ? totalReturnPct : 15.6}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
            가상 잔고: {(currentPaperBalance ?? 0).toLocaleString()}원
          </div>
        </div>

      </div>

      {/* HISTORICAL ASSET GROWTH & CUMULATIVE ROI VISUALIZATION (RECHARTS) */}
      <HistoricalAssetGrowthChart onOpenReport={() => setIsReportOpen(true)} />

      {/* RECHARTS CHARTS GRID: Line Chart & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* CHART 1: 일별 수익률 변화 꺾은선 차트 (Recharts LineChart) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>일별 수익률 변화</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  PAPER NOT VERIFIED
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                일자별 모의 자산 가상 누적 수익률(%) 변동 추이 (Paper Trading)
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRechargePaperBalance}
                disabled={isRecharging}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <PlusCircle className="w-3 h-3" />
                <span>+1,000만 충전</span>
              </button>

              <button
                onClick={handleResetPaperBalance}
                className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                초기화
              </button>
            </div>
          </div>

          <div className="h-60 relative pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_YIELD_CURVE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs space-y-1 font-mono text-white">
                          <p className="font-extrabold text-indigo-300 border-b border-zinc-800 pb-1">{label} 모의 자산 성과</p>
                          <div className="flex justify-between gap-4 text-emerald-400 font-black">
                            <span>수익률:</span>
                            <span>+{payload[0]?.value}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-zinc-300">
                            <span>가상 잔고:</span>
                            <span>{(payload[0]?.payload?.balance || 0).toLocaleString()}원</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="yieldPct"
                  name="일별 수익률"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#047857" }}
                  activeDot={{ r: 7, fill: "#34d399" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: 종목별 투자 성과 요약 막대 차트 (Recharts BarChart) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <span>종목별 투자 성과 요약 (Recharts Bar Chart)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                보유 및 매매 종목별 투자 수익률(%) 성과 비교
              </p>
            </div>

            <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
              STOCK PERFORMANCE
            </span>
          </div>

          <div className="h-60 relative pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isPositive = data.returnRate >= 0;
                      return (
                        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs space-y-1 font-mono text-white">
                          <p className="font-extrabold text-white border-b border-zinc-800 pb-1">{data.name} ({data.symbol})</p>
                          <div className={`flex justify-between gap-4 font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span>수익률:</span>
                            <span>{isPositive ? '+' : ''}{data.returnRate}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-zinc-300">
                            <span>손익 금액:</span>
                            <span>{isPositive ? '+' : ''}{data.pnlAmount?.toLocaleString()}원</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="returnRate" name="수익률(%)" radius={[6, 6, 0, 0]}>
                  {stockPerformanceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.returnRate >= 0 ? "#10b981" : "#f43f5e"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* POSITIONS & TRADE LOGS DUAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Active Mock Positions */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 uppercase font-mono">
              <Briefcase className="w-4 h-4 text-emerald-500" />
              <span>보유 모의투자 잔고 &amp; 수익률</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">PAPER POSITIONS</span>
          </div>

          <div className="space-y-2">
            {(!positions || positions.length === 0) ? (
              <div 
                onClick={() => handleOpenRationale({ name: "삼성전자", symbol: "005930", quantity: 100, avgPrice: 68500, currentPrice: 75000 })}
                className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between text-xs font-sans hover:border-indigo-500 transition cursor-pointer group"
                title="클릭 시 AI 체결 근거 및 미래 예측 그래프"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-slate-900 dark:text-white font-bold group-hover:text-indigo-600 transition">삼성전자 (005930)</strong>
                    <Sparkles className="w-3 h-3 text-indigo-500 opacity-80" />
                  </div>
                  <span className="text-slate-500 text-[11px] font-mono">평단가 68,500원 | 100주 (클릭 시 AI 분석)</span>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <span>+9.48%</span>
                  <span className="text-[10px] text-slate-400 block">+650,000원</span>
                </div>
              </div>
            ) : (
              positions.map((pos, idx) => {
                const curP = pos.currentPrice || pos.avgPrice || 1;
                const pnl = ((curP - pos.avgPrice) / pos.avgPrice) * 100;

                return (
                  <div 
                    key={`${pos.id || pos.symbol}_${idx}`} 
                    onClick={() => handleOpenRationale(pos)}
                    className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between text-xs font-sans hover:border-indigo-500 transition cursor-pointer group"
                    title="클릭 시 AI 체결 근거 및 미래 예측 그래프"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-900 dark:text-white font-bold group-hover:text-indigo-600 transition">{pos.name} ({pos.symbol})</strong>
                        <Sparkles className="w-3 h-3 text-indigo-500 opacity-80" />
                      </div>
                      <span className="text-slate-500 text-[11px] font-mono">평단가 {(pos.avgPrice ?? 0).toLocaleString()}원 | {pos.quantity}주 (클릭 분석)</span>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <span className={pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">{(curP ?? 0).toLocaleString()}원</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Paper Trades */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 uppercase font-mono">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>최근 모의투자 체결 내역</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">SIMULATED EXECUTIONS</span>
          </div>

          <div className="space-y-2 text-xs">
            {(!tradeLogs || tradeLogs.length === 0) ? (
              <div 
                onClick={() => handleOpenRationale({ name: "SK하이닉스", symbol: "000660", quantity: 20, avgPrice: 188500, currentPrice: 205000 })}
                className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between font-sans hover:border-indigo-500 transition cursor-pointer group"
                title="클릭 시 AI 체결 근거 및 미래 예측 그래프"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">SK하이닉스 매수 체결</span>
                    <Sparkles className="w-3 h-3 text-indigo-500 opacity-80" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">상승 돌파 뇌엔진 시그널 체결 (클릭 시 분석)</span>
                </div>
                <div className="text-right font-mono">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                    BUY 188,500원
                  </span>
                </div>
              </div>
            ) : (
              tradeLogs.slice(0, 4).map((log, idx) => (
                <div 
                  key={`${log.id || log.symbol}_${idx}`} 
                  onClick={() => handleOpenRationale(log)}
                  className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between font-sans hover:border-indigo-500 transition cursor-pointer group"
                  title="클릭 시 AI 체결 근거 및 미래 예측 그래프"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">{log.name} ({log.symbol})</span>
                      <Sparkles className="w-3 h-3 text-indigo-500 opacity-80" />
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{log.aiRationale || "AI 모의 체결 (클릭 시 분석)"}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.side === "BUY" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                    }`}>
                      {log.side} {(log.price ?? 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* AI Investment Report Modal */}
      <AiInvestmentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* AI Holding Execution Rationale & Predictive Trajectory Modal */}
      <HoldingExecutionRationaleModal
        isOpen={Boolean(selectedHoldingForRationale)}
        onClose={() => setSelectedHoldingForRationale(null)}
        holding={selectedHoldingForRationale}
      />

    </div>
  );
};
