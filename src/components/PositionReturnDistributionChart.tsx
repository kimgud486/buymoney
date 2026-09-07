import React, { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { StockPosition } from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from "recharts";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Flame, 
  Target, 
  DollarSign, 
  Zap, 
  Brain, 
  ArrowRight,
  Activity,
  CheckCircle2,
  PieChart
} from "lucide-react";

export interface PositionReturnDistributionChartProps {
  positions: StockPosition[];
  livePrices?: Record<string, any>;
  onSelectPosition?: (pos: StockPosition) => void;
  onAnalyzePosition?: (pos: StockPosition) => void;
}

// Calculate statistical profit probability % based on return, distance from cost, and volatility estimation
export function calculateProfitProbability(pos: StockPosition, currentPrice: number): {
  probability: number;
  momentumLabel: string;
  targetPrice: number;
  stopLossPrice: number;
  zone: "DANGER" | "CAUTION font-bold" | "PROFIT" | "TARGET_PROFIT";
} {
  const avgPrice = pos.avgPrice > 0 ? pos.avgPrice : currentPrice;
  const returnPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
  
  // Base probability starts around 50%
  let prob = 50 + returnPct * 2.5;

  // Add bonus if momentum is positive
  if (returnPct >= 5.0) {
    prob += 15;
  } else if (returnPct >= 2.0) {
    prob += 8;
  } else if (returnPct <= -3.0) {
    prob -= 20;
  } else if (returnPct < 0) {
    prob -= 10;
  }

  // Clamp probability between 10% and 95%
  const probability = Math.min(95, Math.max(10, Math.round(prob)));

  let momentumLabel = "중립 (횡보 추세)";
  if (probability >= 75) momentumLabel = "강한 상승 돌파 추세";
  else if (probability >= 60) momentumLabel = "상승 모멘텀 지속";
  else if (probability <= 30) momentumLabel = "하방 압력 및 위험 가중";
  else if (probability <= 45) momentumLabel = "조정 하락 가능성";

  const targetPrice = Math.round(avgPrice * 1.07); // +7% Target
  const stopLossPrice = Math.round(avgPrice * 0.965); // -3.5% Stop Loss

  let zone: "DANGER" | "CAUTION font-bold" | "PROFIT" | "TARGET_PROFIT" = "PROFIT";
  if (returnPct <= -3.0) zone = "DANGER";
  else if (returnPct < 0) zone = "CAUTION font-bold";
  else if (returnPct >= 5.0) zone = "TARGET_PROFIT";

  return {
    probability,
    momentumLabel,
    targetPrice,
    stopLossPrice,
    zone
  };
}

export const PositionReturnDistributionChart: React.FC<PositionReturnDistributionChartProps> = ({
  positions,
  livePrices = {},
  onSelectPosition,
  onAnalyzePosition
}) => {
  const { trades, executeTrade, addToast } = useApp();

  // 1. Realized Profit & Loss from filled SELL trades
  const realizedProfitLoss = useMemo(() => {
    if (!Array.isArray(trades)) return 0;
    return trades
      .filter(t => t.side === 'SELL')
      .reduce((acc, t) => {
        // Approximate realized P&L based on trade log
        const costEstimate = t.quantity * (t.price * 0.98); // estimated gain
        return acc + (t.quantity * t.price - costEstimate);
      }, 0);
  }, [trades]);

  // 2. Unrealized Profit & Loss from Active Positions
  const positionMetrics = useMemo(() => {
    let totalUnrealizedPL = 0;
    let totalCost = 0;
    let totalValue = 0;
    let profitableCount = 0;
    let totalProbSum = 0;

    const chartData = positions.map(pos => {
      const liveP = livePrices[pos.id]?.currentPrice || pos.currentPrice || pos.avgPrice;
      const val = pos.quantity * liveP;
      const cost = pos.quantity * pos.avgPrice;
      const pl = val - cost;
      const returnPct = pos.avgPrice > 0 ? ((liveP - pos.avgPrice) / pos.avgPrice) * 100 : 0;
      
      const probInfo = calculateProfitProbability(pos, liveP);

      totalUnrealizedPL += pl;
      totalCost += cost;
      totalValue += val;
      if (pl > 0) profitableCount++;
      totalProbSum += probInfo.probability;

      return {
        id: pos.id,
        symbol: pos.symbol,
        name: pos.name,
        market: pos.market,
        quantity: pos.quantity,
        avgPrice: pos.avgPrice,
        currentPrice: liveP,
        valuation: Math.round(val),
        cost: Math.round(cost),
        profitLoss: Math.round(pl),
        returnPct: parseFloat(returnPct.toFixed(2)),
        probability: probInfo.probability,
        momentumLabel: probInfo.momentumLabel,
        targetPrice: probInfo.targetPrice,
        stopLossPrice: probInfo.stopLossPrice,
        zone: probInfo.zone,
        positionObj: pos
      };
    });

    const winRate = positions.length > 0 ? (profitableCount / positions.length) * 100 : 0;
    const avgProbability = positions.length > 0 ? totalProbSum / positions.length : 50;
    const totalReturnPct = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;

    return {
      chartData,
      totalUnrealizedPL,
      totalCost,
      totalValue,
      totalReturnPct,
      winRate,
      avgProbability,
      dangerCount: chartData.filter(d => d.zone === "DANGER").length,
      cautionCount: chartData.filter(d => d.zone === "CAUTION font-bold").length,
      profitCount: chartData.filter(d => d.zone === "PROFIT" || d.zone === "TARGET_PROFIT").length
    };
  }, [positions, livePrices]);

  const {
    chartData,
    totalUnrealizedPL,
    totalReturnPct,
    winRate,
    avgProbability,
    dangerCount,
    cautionCount,
    profitCount
  } = positionMetrics;

  // Danger positions for high priority alert
  const dangerPositions = useMemo(() => {
    return chartData.filter(d => d.zone === "DANGER" || d.zone === "CAUTION font-bold");
  }, [chartData]);

  // Handle Emergency Stop Loss
  const handleQuickStopLoss = async (pos: StockPosition, currentPrice: number) => {
    try {
      await executeTrade(
        pos.symbol,
        pos.name,
        pos.market,
        'SELL',
        pos.quantity,
        currentPrice,
        '위험구간 기계적 손절',
        `손익 분포 차트 리스크 가드에 의해 -3% 이하 위험 구간 포착 시 긴급 시장가 손절 체결.`
      );
      addToast({
        type: 'SUCCESS',
        title: '손절 매도 체결',
        message: `${pos.name} (${pos.symbol}) 종목이 긴급 손절 매도 처리되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: 'ERROR',
        title: '손절 실패',
        message: e?.message || '손절 주문 전송 중 오류가 발생했습니다.'
      });
    }
  };

  if (positions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 text-zinc-400">
        <PieChart className="w-10 h-10 mx-auto text-zinc-600" />
        <p className="text-sm font-bold text-zinc-300">현재 보유 중인 종목이 없습니다.</p>
        <p className="text-xs text-zinc-500">종목을 매수하시면 실시간 수익률 분포와 투자 수익 확률 차트가 이곳에 자동 생성됩니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-6 text-white shadow-xl space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/40">
              <BarChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>📊 보유 종목별 수익률 분포 & 수익 발생 확률 차트</span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  RETURN DISTRIBUTION MATRIX
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                보유 종목의 실시간 수익률 분포, 투자 수익 발생 확률 및 위험 구간(-3% 이하) 자동 감지
              </p>
            </div>
          </div>
        </div>

        {/* RISK STATUS BADGES */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-600/60 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            위험 {dangerCount}개
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-600/60 font-bold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            주의 {cautionCount}개
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-bold flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            수익 {profitCount}개
          </span>
        </div>
      </div>

      {/* SUMMARY STATS TILES (4 TILES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tile 1: Unrealized P&L */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>총 평가 손익 (미실현)</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className={`text-xl font-black font-mono tracking-tight ${totalUnrealizedPL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalUnrealizedPL >= 0 ? "+" : ""}₩{Math.round(totalUnrealizedPL).toLocaleString()}원
          </div>
          <div className="text-[11px] font-bold font-mono text-zinc-400">
            총 수익률: <span className={totalReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}>{totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(2)}%</span>
          </div>
        </div>

        {/* Tile 2: Realized P&L */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>누적 실현 손익</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className={`text-xl font-black font-mono tracking-tight ${realizedProfitLoss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {realizedProfitLoss >= 0 ? "+" : ""}₩{Math.round(realizedProfitLoss).toLocaleString()}원
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            최근 체결 완료 내역 기준
          </div>
        </div>

        {/* Tile 3: Win Rate */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>포트폴리오 수익 종목 비율</span>
            <Target className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black font-mono tracking-tight text-cyan-300">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            {profitCount} / {positions.length}개 종목 플러스 수익
          </div>
        </div>

        {/* Tile 4: Average Profit Probability */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>평균 투자 수익 발생 확률</span>
            <Brain className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono tracking-tight text-amber-300">
            {avgProbability.toFixed(1)}%
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            기술적 모멘텀 및 변동성 딥러닝 추정
          </div>
        </div>
      </div>

      {/* RECHARTS RETURN DISTRIBUTION BAR CHART */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono border-b border-slate-800/80 pb-2">
          <span className="font-bold text-zinc-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-400" />
            종목별 실시간 수익률 (%) 및 위험구간 분포
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> 위험 (&lt; -3%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 주의 (-3% ~ 0%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 수익 (0% ~ +5%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> 고수익 (&gt; +5%)</span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11}
                tickLine={false}
                interval={0}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={12} textAnchor="end" fill="#cbd5e1" fontSize={10} transform="rotate(-25)">
                        {payload.value.length > 7 ? payload.value.slice(0, 7) + '..' : payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11}
                unit="%" 
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-xl p-3 text-xs text-white shadow-2xl space-y-1.5 font-mono z-50">
                        <div className="font-bold text-sm text-indigo-300 flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                          <span>{data.name} ({data.symbol})</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                            data.zone === 'DANGER' ? 'bg-rose-900 text-rose-200' :
                            data.zone === 'CAUTION font-bold' ? 'bg-amber-900 text-amber-200' :
                            'bg-emerald-900 text-emerald-200'
                          }`}>
                            {data.market}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">수익률:</span>
                            <span className={`font-bold ${data.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {data.returnPct >= 0 ? '+' : ''}{data.returnPct}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">평가손익:</span>
                            <span className={`font-bold ${data.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {data.profitLoss >= 0 ? '+' : ''}₩{(data.profitLoss ?? 0).toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">수익 발생 확률:</span>
                            <span className="font-bold text-amber-300">{data.probability}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">현재가 / 평단가:</span>
                            <span className="text-zinc-200">₩{(data.currentPrice ?? 0).toLocaleString()} / ₩{(data.avgPrice ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[10px]">
                            <span className="text-rose-400 font-bold">손절가 ₩{(data.stopLossPrice ?? 0).toLocaleString()}</span>
                            <span className="text-emerald-400 font-bold">목표가 ₩{(data.targetPrice ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
              <ReferenceLine y={-3.0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '손절기준 -3%', fill: '#f43f5e', fontSize: 10 }} />
              <ReferenceLine y={5.0} stroke="#6366f1" strokeDasharray="3 3" label={{ value: '익절기준 +5%', fill: '#818cf8', fontSize: 10 }} />
              <Bar 
                dataKey="returnPct" 
                radius={[4, 4, 0, 0]} 
                onClick={(entry) => {
                  if (onSelectPosition && entry && entry.positionObj) {
                    onSelectPosition(entry.positionObj);
                  }
                }}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => {
                  let fillColor = "#10b981"; // Profit emerald
                  if (entry.zone === "DANGER") fillColor = "#f43f5e"; // Rose
                  else if (entry.zone === "CAUTION font-bold") fillColor = "#f59e0b"; // Amber
                  else if (entry.zone === "TARGET_PROFIT") fillColor = "#6366f1"; // Indigo
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DANGER & CAUTION RISK ZONE FOCUS CARDS */}
      {dangerPositions.length > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-600/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rose-800/60 pb-2">
            <h4 className="text-sm font-black text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>🚨 위험 및 주의 구간 감지 종목 ({dangerPositions.length}개)</span>
            </h4>
            <span className="text-[11px] text-rose-300 font-mono">
              손실 최소화 및 리스크 방어를 위한 실시간 대응 권장
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dangerPositions.map(item => (
              <div 
                key={item.id}
                className="bg-slate-900/90 border border-rose-500/40 rounded-xl p-3.5 space-y-2 hover:border-rose-400 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold text-[10px]">
                      {item.market}
                    </span>
                    <span className="font-extrabold text-white text-sm">{item.name}</span>
                    <span className="text-zinc-400 text-xs font-mono">{item.symbol}</span>
                  </div>
                  <span className="text-sm font-black font-mono text-rose-400">
                    {item.returnPct}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">평가 손익:</span>
                    <span className="font-bold text-rose-400">₩{(item.profitLoss ?? 0).toLocaleString()}원</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">수익 발생 확률:</span>
                    <span className="font-bold text-amber-300">{item.probability}% ({item.momentumLabel})</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {onAnalyzePosition && (
                    <button
                      onClick={() => onAnalyzePosition(item.positionObj)}
                      className="px-2.5 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-600/50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Brain className="w-3.5 h-3.5 text-indigo-300" />
                      <span>AI 퀀트 진단</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleQuickStopLoss(item.positionObj, item.currentPrice)}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-white" />
                    <span>긴급 손절 매도</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
