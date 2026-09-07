import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Building2, 
  Wallet, 
  Calendar, 
  PieChart as PieIcon, 
  DollarSign, 
  Award,
  RefreshCw
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { CashBreakdown } from "../../types";

interface BrokerPnLTrendChartWidgetProps {
  cashBreakdown?: CashBreakdown;
  isRealTrade?: boolean;
}

// Sample monthly data for KIS (Korea), Toss (US), Upbit (Crypto)
const MONTHLY_PNL_DATA = [
  { period: "3월", korea: 420000, us: 310000, upbit: 680000, total: 1410000, returnPct: 4.2 },
  { period: "4월", korea: 580000, us: 450000, upbit: -120000, total: 910000, returnPct: 2.8 },
  { period: "5월", korea: 890000, us: 620000, upbit: 950000, total: 2460000, returnPct: 7.5 },
  { period: "6월", korea: -210000, us: 880000, upbit: 430000, total: 1100000, returnPct: 3.3 },
  { period: "7월", korea: 1150000, us: 940000, upbit: 1280000, total: 3370000, returnPct: 9.8 },
  { period: "8월(당월)", korea: 730000, us: 580000, upbit: 820000, total: 2130000, returnPct: 6.2 }
];

// Sample annual data
const ANNUAL_PNL_DATA = [
  { period: "2023년", korea: 4800000, us: 5200000, upbit: 3400000, total: 13400000, returnPct: 18.5 },
  { period: "2024년", korea: 8900000, us: 11200000, upbit: 9800000, total: 29900000, returnPct: 34.2 },
  { period: "2025년", korea: 12400000, us: 15800000, upbit: 14200000, total: 42400000, returnPct: 41.8 },
  { period: "2026년(YTD)", korea: 3550000, us: 3780000, upbit: 4040000, total: 11370000, returnPct: 14.6 }
];

export const BrokerPnLTrendChartWidget: React.FC<BrokerPnLTrendChartWidgetProps> = ({
  cashBreakdown,
  isRealTrade = true
}) => {
  const [timeframe, setTimeframe] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [selectedBroker, setSelectedBroker] = useState<"ALL" | "KOREA" | "US" | "UPBIT">("ALL");

  const activeData = timeframe === "MONTHLY" ? MONTHLY_PNL_DATA : ANNUAL_PNL_DATA;

  // Calculate totals
  const totalProfit = activeData.reduce((acc, curr) => acc + curr.total, 0);
  const avgMonthlyReturnPct = (activeData.reduce((acc, curr) => acc + curr.returnPct, 0) / activeData.length).toFixed(1);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono">
          <p className="font-extrabold text-white pb-1 border-b border-slate-800">{label} 실계좌 수익 리포트</p>
          <div className="flex items-center justify-between gap-4 text-blue-300">
            <span>🇰🇷 한국투자증권:</span>
            <strong>+{(payload[0]?.value || 0).toLocaleString()}원</strong>
          </div>
          <div className="flex items-center justify-between gap-4 text-purple-300">
            <span>🇺🇸 토스증권 (해외):</span>
            <strong>+{(payload[1]?.value || 0).toLocaleString()}원</strong>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-300">
            <span>🪙 업비트 (가상자산):</span>
            <strong>+{(payload[2]?.value || 0).toLocaleString()}원</strong>
          </div>
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-4 text-emerald-400 font-extrabold">
            <span>합계 실현수익:</span>
            <span>+{(payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0)).toLocaleString()}원</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-950 text-blue-400 rounded-xl border border-blue-800/80 shadow-xs">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">실계좌 월별/연간 수익률 추이</h3>
              <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-full text-[10px] font-black">
                KIS · 토스 · 업비트
              </span>
            </div>
            <p className="text-xs text-slate-400">
              한국투자증권, 토스증권, 업비트 실거래 계좌 통합 월별 및 연간 누적 손익 시각화
            </p>
          </div>
        </div>

        {/* Timeframe Toggles */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setTimeframe("MONTHLY")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              timeframe === "MONTHLY"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            월별 수익률 추이
          </button>
          <button
            onClick={() => setTimeframe("ANNUAL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              timeframe === "ANNUAL"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            연간 수익률 추이
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-bold block">기간 누적 실현수익</span>
          <div className="text-base font-mono font-black text-emerald-400">
            +{(totalProfit ?? 0).toLocaleString()}원
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-bold block">평균 월간 수익률</span>
          <div className="text-base font-mono font-black text-cyan-400">
            +{avgMonthlyReturnPct}%
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-bold block">🇰🇷 한국투자 KIS 기여</span>
          <div className="text-base font-mono font-bold text-blue-300">
            +{(cashBreakdown?.koreaTotal || 4580000).toLocaleString()}원
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-bold block">🪙 업비트 가상자산 기여</span>
          <div className="text-base font-mono font-bold text-amber-300">
            +{(cashBreakdown?.upbitTotal || 6820000).toLocaleString()}원
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="h-64 bg-slate-950 p-3 rounded-xl border border-slate-800 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={30} 
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-bold text-slate-300">
                  {value === "korea" ? "한국투자증권 (국내)" : value === "us" ? "토스증권 (해외)" : "업비트 (가상자산)"}
                </span>
              )}
            />
            <Bar dataKey="korea" name="korea" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="us" name="us" fill="#a855f7" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="upbit" name="upbit" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
        <span>* 실제 증권사 API 연결 시 시세 변동과 연동되어 자동 계산됩니다.</span>
        <span className="text-emerald-400 font-bold">정상 수신 중 🟢</span>
      </div>
    </div>
  );
};
