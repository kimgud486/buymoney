import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from "recharts";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { fetchInvestorFlow, InvestorFlowResult } from "../../services/InvestorFlowService";

interface InvestorFlowChartProps {
  symbol?: string;
}

export const InvestorFlowChart: React.FC<InvestorFlowChartProps> = ({ symbol }) => {
  const [flowResult, setFlowResult] = useState<InvestorFlowResult>({
    status: "UNAVAILABLE",
    points: []
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchInvestorFlow(symbol).then((res) => {
      if (isMounted) {
        setFlowResult(res);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  const latestPoint = flowResult.points.length > 0 ? flowResult.points[flowResult.points.length - 1] : null;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-white tracking-tight">INVESTOR FLOW (실시간 기관/외국인 수급)</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">(단위: 억원)</span>
      </div>

      {loading ? (
        <div className="p-6 flex items-center justify-center text-xs text-slate-400 gap-2 font-mono">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          실시간 수급 데이터 동기화 중...
        </div>
      ) : flowResult.status === "UNAVAILABLE" || flowResult.points.length === 0 ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-mono space-y-1 my-2">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            기관/외국인 실시간 수급 데이터 미연결 (INVESTOR_FLOW_UNAVAILABLE)
          </div>
          <div className="text-[11px] text-amber-200/70">
            실시간 기관/외국인 수급 데이터 피드가 미연결 상태입니다. 허위 샘플 수급 데이터 표시는 전면 금지되어 있습니다.
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-1.5 pb-2 mb-2 border-b border-slate-800 font-mono text-xs">
            <div className="bg-emerald-950/40 rounded-lg p-1.5 border border-emerald-500/30">
              <div className="text-[10px] text-slate-400 font-sans font-medium">외국인</div>
              <div className="text-xs font-black text-emerald-400">
                {latestPoint?.foreignNet != null ? `${latestPoint.foreignNet > 0 ? "+" : ""}${(latestPoint.foreignNet ?? 0).toLocaleString()}억` : "--"}
              </div>
            </div>
            <div className="bg-sky-950/40 rounded-lg p-1.5 border border-sky-500/30">
              <div className="text-[10px] text-slate-400 font-sans font-medium">기관</div>
              <div className="text-xs font-black text-sky-400">
                {latestPoint?.institutionNet != null ? `${latestPoint.institutionNet > 0 ? "+" : ""}${(latestPoint.institutionNet ?? 0).toLocaleString()}억` : "--"}
              </div>
            </div>
            <div className="bg-rose-950/40 rounded-lg p-1.5 border border-rose-500/30">
              <div className="text-[10px] text-slate-400 font-sans font-medium">개인</div>
              <div className="text-xs font-black text-rose-400">
                {latestPoint?.retailNet != null ? `${latestPoint.retailNet > 0 ? "+" : ""}${(latestPoint.retailNet ?? 0).toLocaleString()}억` : "--"}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] font-sans font-semibold mb-1 text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full inline-block"></span>
              <span>외국인</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-sky-500 rounded-full inline-block"></span>
              <span>기관</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-400 rounded-full inline-block"></span>
              <span>개인</span>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flowResult.points} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="timeStr"
                  tick={{ fill: "#94A3B8", fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#475569" }}
                />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <ReferenceLine y={0} stroke="#64748B" strokeWidth={1} strokeDasharray="3 3" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs font-mono shadow-xl space-y-1">
                          <div className="text-slate-400 font-sans text-[10px]">{label}</div>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
                              <span style={{ color: entry.color }}>{entry.name}:</span>
                              <span className="font-bold" style={{ color: entry.color }}>
                                {entry.value != null ? `${entry.value > 0 ? "+" : ""}${entry.value}억` : "--"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="foreignNet" name="외국인" stroke="#10B981" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="institutionNet" name="기관" stroke="#38BDF8" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="retailNet" name="개인" stroke="#FB7185" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
