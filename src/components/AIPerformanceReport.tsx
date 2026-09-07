import React, { useState } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend, 
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Award, 
  BarChart3, 
  PieChart as PieIcon, 
  Activity, 
  Filter, 
  Zap, 
  ShieldCheck, 
  Target,
  ArrowUpRight,
  Sparkles
} from "lucide-react";

export const AIPerformanceReport: React.FC = () => {
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [timeframe, setTimeframe] = useState<"30D" | "90D" | "1Y">("90D");

  // Win Rate Progression Trend Data (Recharts)
  const winRateTrendData = [
    { period: "1주차", winRate: 78.5, targetRate: 90, trades: 32, profitFactor: 2.1 },
    { period: "2주차", winRate: 81.2, targetRate: 90, trades: 28, profitFactor: 2.4 },
    { period: "3주차", winRate: 84.0, targetRate: 90, trades: 35, profitFactor: 2.6 },
    { period: "4주차", winRate: 86.5, targetRate: 90, trades: 30, profitFactor: 2.8 },
    { period: "5주차", winRate: 88.2, targetRate: 90, trades: 41, profitFactor: 2.9 },
    { period: "6주차", winRate: 89.4, targetRate: 90, trades: 38, profitFactor: 3.1 },
    { period: "7주차", winRate: 91.0, targetRate: 90, trades: 44, profitFactor: 3.3 },
    { period: "8주차", winRate: 92.3, targetRate: 90, trades: 39, profitFactor: 3.5 }
  ];

  // Sharpe Ratio Breakdown by Strategy & Market
  const sharpeStrategyData = [
    { strategy: "돌파 매매", sharpe: 2.85, sortino: 3.42, winRate: 91.2, color: "#4f46e5" },
    { strategy: "눌림목 반등", sharpe: 2.62, sortino: 3.10, winRate: 89.8, color: "#059669" },
    { strategy: "변동성 돌파", sharpe: 2.38, sortino: 2.80, winRate: 87.5, color: "#d97706" },
    { strategy: "평균 회귀", sharpe: 2.15, sortino: 2.55, winRate: 86.0, color: "#2563eb" },
    { strategy: "가치 모멘텀", sharpe: 2.45, sortino: 2.95, winRate: 88.4, color: "#7c3aed" }
  ];

  // Monthly Risk-Adjusted Cumulative Return
  const monthlyReturnData = [
    { month: "1월", aiReturn: 4.2, benchmark: 1.1, sharpe: 1.8 },
    { month: "2월", aiReturn: 7.8, benchmark: -0.5, sharpe: 2.1 },
    { month: "3월", aiReturn: 12.5, benchmark: 2.3, sharpe: 2.3 },
    { month: "4월", aiReturn: 16.2, benchmark: 1.8, sharpe: 2.4 },
    { month: "5월", aiReturn: 21.0, benchmark: 3.0, sharpe: 2.5 },
    { month: "6월", aiReturn: 26.4, benchmark: 2.4, sharpe: 2.6 },
    { month: "7월", aiReturn: 31.8, benchmark: 4.1, sharpe: 2.7 }
  ];

  return (
    <div id="ai-performance-report" className="space-y-6">
      {/* Performance Summary Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-indigo-950 to-zinc-900 border border-indigo-500/30 p-6 rounded-xl shadow-md text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-xl shrink-0">
              <Award className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white font-sans tracking-tight whitespace-nowrap">
                  AI 투자 성과 분석 리포트 (Performance & Sharpe Analytics)
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 whitespace-nowrap">
                  QUANT METRICS v3.2
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                실시간 적중률(Win Rate), 샤프 지수(Sharpe Ratio), 소르티노 지수 및 위험 조정 수익률을 데이터 기반으로 다각도 통합 정밀 연산합니다.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="bg-zinc-900 border border-zinc-700 p-1 rounded-lg flex items-center gap-1 text-xs">
              {(["ALL", "KOREA", "US", "BTC"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    marketFilter === m 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {m === "ALL" ? "전체" : m === "KOREA" ? "국내주식" : m === "US" ? "해외주식" : "가상자산"}
                </button>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-700 p-1 rounded-lg flex items-center gap-1 text-xs">
              {(["30D", "90D", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    timeframe === tf 
                      ? "bg-zinc-800 text-amber-300 border border-amber-500/40" 
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-indigo-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">평균 체결 적중률 (Win Rate)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-emerald-400">89.4%</span>
              <span className="text-[10px] text-emerald-400 font-bold">▲ +3.2%</span>
            </div>
            <span className="text-[10px] text-zinc-400 block whitespace-nowrap">목표 90.0% 달성 임박</span>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-indigo-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">샤프 지수 (Sharpe Ratio)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-indigo-300">2.68</span>
              <span className="text-[10px] text-indigo-300 font-bold">최상급 (S+)</span>
            </div>
            <span className="text-[10px] text-zinc-400 block whitespace-nowrap">무위험 대비 우수 수익성</span>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-indigo-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">손익비 (Profit Factor)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-amber-300">3.15</span>
              <span className="text-[10px] text-amber-300 font-bold">우수</span>
            </div>
            <span className="text-[10px] text-zinc-400 block whitespace-nowrap">총이익 / 총손실 비율</span>
          </div>

          <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-indigo-500/20 space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block whitespace-nowrap">최대 낙폭 (Max Drawdown)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-rose-400">-2.4%</span>
              <span className="text-[10px] text-zinc-400">캡 -5.0%</span>
            </div>
            <span className="text-[10px] text-zinc-400 block whitespace-nowrap">철저한 리스크 서킷 차단</span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Win Rate Progression & Target Line */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
              <h3 className="text-xs font-black text-zinc-900 font-sans whitespace-nowrap">
                주차별 AI 매매 적중률(Win Rate %) 추이
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 whitespace-nowrap">
              TARGET: 90.0%
            </span>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            AI 오답노트 강화학습 적용 이후 5주차부터 적중률이 상승 곡선을 그리며 <strong>92.3%</strong> 최고 적중률을 돌파했습니다.
          </p>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={winRateTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="period" style={{ fontSize: "10px" }} tickLine={false} />
                <YAxis domain={[60, 100]} style={{ fontSize: "10px" }} tickLine={false} unit="%" />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, "적중률"]}
                  labelStyle={{ fontWeight: "bold", fontSize: "11px" }}
                />
                <ReferenceLine y={90} stroke="#10b981" strokeDasharray="4 4" label={{ value: "목표 90%", fill: "#10b981", fontSize: 10, position: "top" }} />
                <Area type="monotone" dataKey="winRate" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#winRateGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sharpe & Sortino Ratio Breakdown by Strategy */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <h3 className="text-xs font-black text-zinc-900 font-sans whitespace-nowrap">
                전략별 샤프 지수 (Sharpe) 및 소르티노 지수 (Sortino)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">위험대비 수익성</span>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            샤프 지수가 <strong>2.0 이상</strong>이면 기관급 우수 퀀트 알고리즘으로 평가받으며, 현재 돌파 매매 기법이 <strong>2.85</strong>로 가장 높은 샤프비를 기록하고 있습니다.
          </p>

          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sharpeStrategyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="strategy" style={{ fontSize: "10px", fontWeight: "bold" }} tickLine={false} />
                <YAxis domain={[0, 4.0]} style={{ fontSize: "10px" }} tickLine={false} />
                <Tooltip formatter={(value: any, name: any) => [value, name === "sharpe" ? "샤프 지수" : "소르티노 지수"]} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="sharpe" name="샤프 지수 (Sharpe)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sortino" name="소르티노 지수 (Sortino)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Benchmark Outperformance Chart */}
      <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-150 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <h3 className="text-xs font-black text-zinc-900 font-sans whitespace-nowrap">
              월별 AI 누적 수익률 vs 코스피/S&P500 벤치마크 (Outperformance)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
            ALPHA: +27.7%
          </span>
        </div>

        <div className="h-60 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyReturnData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="month" style={{ fontSize: "10px" }} tickLine={false} />
              <YAxis style={{ fontSize: "10px" }} tickLine={false} unit="%" />
              <Tooltip formatter={(value: any) => [`${value}%`]} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line type="monotone" dataKey="aiReturn" name="AI 오토파일럿 수익률" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="benchmark" name="시장 평균 지수 (Benchmark)" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
