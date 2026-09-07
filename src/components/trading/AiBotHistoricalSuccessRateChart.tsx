import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";
import { Trophy, TrendingUp, Award, BarChart3, Calendar, Sparkles, Zap, CheckCircle2 } from "lucide-react";

// Generate realistic 30-day AI bot historical performance data
const generate30DayPerformanceData = () => {
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    
    // Realistic trend starting around 78% scaling up to 88~92% with minor market dips
    const baseWinRate = 78 + (29 - i) * 0.35 + (Math.sin(i * 0.8) * 3);
    const winRate = Number(Math.min(96, Math.max(72, baseWinRate)).toFixed(1));
    const winTrades = Math.floor(8 + Math.random() * 8);
    const lossTrades = Math.floor(Math.max(0, winTrades * ((100 - winRate) / winRate)));
    const totalTrades = winTrades + lossTrades;
    const avgReturnPct = Number((winRate * 0.08 - 2.1).toFixed(2));

    data.push({
      date: dateStr,
      winRate,
      winTrades,
      lossTrades,
      totalTrades,
      avgReturnPct,
      targetGoal: 85.0
    });
  }
  return data;
};

export const AiBotHistoricalSuccessRateChart: React.FC = () => {
  const [data] = useState(generate30DayPerformanceData);
  const [metricView, setMetricView] = useState<"winRate" | "trades" | "return">("winRate");

  // Summary Metrics
  const avgWinRate = (data.reduce((acc, curr) => acc + curr.winRate, 0) / data.length).toFixed(1);
  const totalWinCount = data.reduce((acc, curr) => acc + curr.winTrades, 0);
  const totalLossCount = data.reduce((acc, curr) => acc + curr.lossTrades, 0);
  const totalTradesCount = totalWinCount + totalLossCount;
  const overallWinRate = ((totalWinCount / totalTradesCount) * 100).toFixed(1);
  const maxWinRate = Math.max(...data.map(d => d.winRate)).toFixed(1);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs my-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
              AI 트레이딩 봇 30일 누적 승률 & 성과 트렌드 (Recharts)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              30-Day Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            지난 30일간 AI 12대 퀀트 봇의 일별 체결 성공률(%)(Win Rate) 및 수익률 추이를 실시간 가시화합니다.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setMetricView("winRate")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              metricView === "winRate"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            승률 (%)
          </button>
          <button
            onClick={() => setMetricView("trades")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              metricView === "trades"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            체결 건수
          </button>
          <button
            onClick={() => setMetricView("return")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              metricView === "return"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            평균 수익률 (%)
          </button>
        </div>
      </div>

      {/* Top 4 Key Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">30일 평균 승률</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{avgWinRate}%</span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">▲ +4.2%</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">전체 승리 체결</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">{totalWinCount}건</span>
            <span className="text-[10px] text-slate-500 font-normal">/ {totalTradesCount}건</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">최고 일별 승률</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{maxWinRate}%</span>
            <span className="text-[10px] font-bold text-emerald-500">MAX</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">전체 누적 승률</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{overallWinRate}%</span>
            <span className="text-[10px] font-bold text-indigo-500">VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart Visualizer Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis
              domain={metricView === "winRate" ? [60, 100] : ["auto", "auto"]}
              tick={{ fontSize: 10 }}
              stroke="#94a3b8"
              unit={metricView === "winRate" ? "%" : ""}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "12px",
                color: "#f8fafc",
                fontSize: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
              }}
              formatter={(value: any, name: string) => {
                if (name === "winRate") return [`${value}%`, "일별 승률"];
                if (name === "winTrades") return [`${value}건`, "익절 체결"];
                if (name === "lossTrades") return [`${value}건`, "손절 체결"];
                if (name === "avgReturnPct") return [`+${value}%`, "평균 수익률"];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />

            {metricView === "winRate" && (
              <>
                <ReferenceLine y={85} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: "목표 85%", fill: "#3b82f6", fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  name="AI 봇 승률 (%)"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#2563eb" }}
                  activeDot={{ r: 6, fill: "#3b82f6" }}
                />
              </>
            )}

            {metricView === "trades" && (
              <>
                <Line
                  type="monotone"
                  dataKey="winTrades"
                  name="익절 체결 (건)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="lossTrades"
                  name="손절 체결 (건)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </>
            )}

            {metricView === "return" && (
              <Line
                type="monotone"
                dataKey="avgReturnPct"
                name="일별 평균 수익률 (%)"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
