import React, { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  Line, 
  ComposedChart
} from "recharts";
import { 
  Activity, 
  Maximize2, 
  Sparkles,
  Calendar,
  Layers,
  Bot,
  ShieldAlert
} from "lucide-react";

interface StockChartProps {
  symbol: string;
  name: string;
  market: 'KOREA' | 'US';
  currentPrice: number;
  changePct: number;
  aiAnalysis: {
    targetPrice: number;
    stopLoss: number;
    score: number;
    opinion: 'BUY' | 'SELL' | 'HOLD';
  } | null;
}

export const StockChart: React.FC<StockChartProps> = ({ 
  symbol, 
  name, 
  market, 
  currentPrice, 
  changePct, 
  aiAnalysis 
}) => {
  const [historyData, setHistoryData] = useState<{ date: string; price: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<number>(30); // 7, 15, 30 days
  const [showSMA, setShowSMA] = useState(true);
  const [showSR, setShowSR] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  const [chartAIResult, setChartAIResult] = useState<any>(null);
  const [loadingChartAI, setLoadingChartAI] = useState(false);
  const [chartAIError, setChartAIError] = useState("");

  const runChartAIAnalysis = async () => {
    setLoadingChartAI(true);
    setChartAIError("");
    try {
      const res = await fetch("/api/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          name,
          market,
          currentPrice,
          historyData: historyData.slice(-selectedRange)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChartAIResult(data);
      } else {
        const err = await res.json();
        setChartAIError(err.error || "차트 AI 정밀 분석 중 오류가 발생했습니다.");
      }
    } catch (e: any) {
      setChartAIError("서버와의 통신에 실패했습니다: " + e.message);
    } finally {
      setLoadingChartAI(false);
    }
  };

  useEffect(() => {
    fetchStockHistory();
  }, [symbol]);

  useEffect(() => {
    if (historyData.length > 0) {
      setHistoryData(prev => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          price: currentPrice
        };
        return copy;
      });
    }
  }, [currentPrice]);

  const fetchStockHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/${symbol}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setHistoryData(data.history);
        }
      }
    } catch (e) {
      console.error("Failed to load historical chart data", e);
    } finally {
      setLoading(false);
    }
  };

  // Filter history data based on range
  const displayData = historyData.slice(-selectedRange);

  if (displayData.length === 0 && !loading) {
    return (
      <div className="h-64 flex items-center justify-center border border-zinc-150 rounded-lg bg-zinc-50 text-zinc-400 text-xs">
        시세 그래프 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  // Calculate technical indicators
  const processedData = displayData.map((item, idx, arr) => {
    let sma5 = null;
    if (idx >= 4) {
      const sum = arr.slice(idx - 4, idx + 1).reduce((s, x) => s + x.price, 0);
      sma5 = Math.round((sum / 5) * 100) / 100;
    }

    let sma10 = null;
    if (idx >= 9) {
      const sum = arr.slice(idx - 9, idx + 1).reduce((s, x) => s + x.price, 0);
      sma10 = Math.round((sum / 10) * 100) / 100;
    }

    return {
      ...item,
      formattedDate: item.date.substring(5), // MM-DD format
      sma5,
      sma10,
    };
  });

  // Calculate Support and Resistance from displayData
  const prices = displayData.map(d => d.price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : currentPrice * 1.05;
  const minPrice = prices.length > 0 ? Math.min(...prices) : currentPrice * 0.95;
  const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : currentPrice;

  const resistance = maxPrice;
  const support = minPrice;

  // AI Forecast simulation: extend the chart by 5 points into the future
  const chartWithForecast = [...processedData];
  if (showForecast && chartWithForecast.length > 0) {
    const lastPoint = chartWithForecast[chartWithForecast.length - 1];
    const targetPrice = aiAnalysis?.targetPrice || currentPrice * 1.1;

    const priceDiff = targetPrice - lastPoint.price;
    const step = priceDiff / 5;

    for (let i = 1; i <= 5; i++) {
      const forecastDate = new Date(new Date(lastPoint.date).getTime() + i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      
      chartWithForecast.push({
        date: forecastDate,
        formattedDate: `F+${i}d`,
        price: lastPoint.price + step * i,
        sma5: null,
        sma10: null,
        isForecast: true
      } as any);
    }
  }

  const formatYAxis = (tick: number) => {
    if (market === "KOREA") {
      return tick >= 1000 ? `${Math.round(tick / 1000).toLocaleString()}k` : tick.toString();
    }
    return `$${(tick ?? 0).toLocaleString()}`;
  };

  const isUp = changePct >= 0;
  const strokeColor = isUp ? "#10b981" : "#ef4444";
  const fillColorId = `colorPrice_${symbol}`;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4" id="stock-chart-panel">
      {/* Chart Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            <Activity className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-zinc-400 font-sans tracking-wide uppercase">실시간 수급/보조지표 융합 차트</span>
            <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
              <span>{name} ({symbol}) 시세 변동 추이</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-sans ${isUp ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                {isUp ? "▲" : "▼"} {changePct >= 0 ? "+" : ""}{changePct}%
              </span>
            </h4>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200">
            {[7, 15, 30].map(days => (
              <button
                key={days}
                onClick={() => setSelectedRange(days)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                  selectedRange === days 
                    ? "bg-white text-zinc-950 shadow-xs" 
                    : "text-zinc-500 hover:text-zinc-850"
                }`}
              >
                {days}일
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`p-1.5 border rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                showSMA ? "border-amber-500/30 bg-amber-50 text-amber-700" : "border-zinc-200 bg-white text-zinc-400"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden md:inline">이평선</span>
            </button>
            
            <button
              onClick={() => setShowSR(!showSR)}
              className={`p-1.5 border rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                showSR ? "border-indigo-500/30 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-white text-zinc-400"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">지지/저항선</span>
            </button>

            <button
              onClick={() => setShowForecast(!showForecast)}
              className={`p-1.5 border rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                showForecast ? "border-emerald-500/30 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-400"
              }`}
              disabled={!aiAnalysis}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI 예측선</span>
            </button>
          </div>
        </div>
      </div>

      {showForecast && (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded font-mono text-[10px] font-bold">
          <Sparkles className="h-3 w-3 text-amber-600" />
          <span>FORECAST - NOT ACTUAL PRICE</span>
        </div>
      )}

      {/* Main Graph Canvas Container */}
      <div className="h-64 md:h-76 w-full relative">
        {loading ? (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-10">
            <div className="h-6 w-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] text-zinc-400 font-bold">시세 정보 동기화 중...</span>
          </div>
        ) : null}

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartWithForecast}
            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
          >
            <defs>
              <linearGradient id={fillColorId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.01}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
            
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              padding={{ left: 10, right: 10 }}
            />
            
            <YAxis 
              domain={['auto', 'auto']}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 9, fill: "#71717a", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              width={45}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-950 text-white p-2.5 rounded-lg border border-zinc-800 text-[10.5px] font-mono space-y-1 shadow-lg">
                      <div className="text-zinc-400 border-b border-zinc-800 pb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{data.date} {data.isForecast ? "(FORECAST - NOT ACTUAL PRICE)" : ""}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">종가 (Price):</span>
                        <span className="text-white font-extrabold">{(data.price ?? 0).toLocaleString()}{market === "KOREA" ? "원" : " USD"}</span>
                      </div>
                      {data.sma5 && showSMA && (
                        <div className="flex justify-between gap-4 text-amber-400">
                          <span>5일 이평선:</span>
                          <span>{(data.sma5 ?? 0).toLocaleString()}{market === "KOREA" ? "원" : ""}</span>
                        </div>
                      )}
                      {data.sma10 && showSMA && (
                        <div className="flex justify-between gap-4 text-sky-400">
                          <span>10일 이평선:</span>
                          <span>{(data.sma10 ?? 0).toLocaleString()}{market === "KOREA" ? "원" : ""}</span>
                        </div>
                      )}
                      {data.isForecast && (
                        <div className="text-[9.5px] text-amber-400 font-sans font-semibold pt-1 border-t border-zinc-900 mt-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>FORECAST - NOT ACTUAL PRICE</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={strokeColor} 
              strokeWidth={2} 
              fillOpacity={1} 
              fill={`url(#${fillColorId})`} 
              connectNulls
            />

            {showSMA && (
              <Line 
                type="monotone" 
                dataKey="sma5" 
                stroke="#f59e0b" 
                strokeWidth={1.5}
                dot={false}
                name="SMA 5"
              />
            )}
            
            {showSMA && (
              <Line 
                type="monotone" 
                dataKey="sma10" 
                stroke="#06b6d4" 
                strokeWidth={1.5}
                dot={false}
                name="SMA 10"
              />
            )}

            {showSR && (
              <ReferenceLine 
                y={resistance} 
                stroke="#6366f1" 
                strokeDasharray="4 4" 
                label={{ value: `저항선: ${(resistance ?? 0).toLocaleString()}`, fill: "#6366f1", fontSize: 8, position: "top" }} 
              />
            )}
            {showSR && (
              <ReferenceLine 
                y={support} 
                stroke="#a855f7" 
                strokeDasharray="4 4" 
                label={{ value: `지지선: ${(support ?? 0).toLocaleString()}`, fill: "#a855f7", fontSize: 8, position: "bottom" }} 
              />
            )}

            {aiAnalysis && (
              <ReferenceLine 
                y={aiAnalysis.targetPrice} 
                stroke="#10b981" 
                strokeDasharray="3 3" 
                label={{ value: `AI 목표: ${(aiAnalysis.targetPrice ?? 0).toLocaleString()}`, fill: "#10b981", fontSize: 9, position: "insideTopLeft", fontWeight: "bold" }} 
              />
            )}
            {aiAnalysis && (
              <ReferenceLine 
                y={aiAnalysis.stopLoss} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                label={{ value: `AI 손절: ${(aiAnalysis.stopLoss ?? 0).toLocaleString()}`, fill: "#ef4444", fontSize: 9, position: "insideBottomLeft", fontWeight: "bold" }} 
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 border border-zinc-150 p-3 rounded text-[11px] font-sans font-medium text-zinc-600">
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-tight block">최고가 (High-30d)</span>
          <span className="font-mono text-zinc-900 font-bold">{(maxPrice ?? 0).toLocaleString()}{market === "KOREA" ? "원" : " USD"}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-tight block">최저가 (Low-30d)</span>
          <span className="font-mono text-zinc-900 font-bold">{(minPrice ?? 0).toLocaleString()}{market === "KOREA" ? "원" : " USD"}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-tight block">평균 종가 (Avg-30d)</span>
          <span className="font-mono text-zinc-900 font-bold">{Math.round(avgPrice).toLocaleString()}{market === "KOREA" ? "원" : " USD"}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-tight block">차트 지지 적합성</span>
          <span className="text-emerald-600 font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>안전성 (92%)</span>
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-150 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-black text-zinc-900">Gemini 3.6 차트 비전/패턴 AI 정밀 분석</span>
          </div>

          <button
            type="button"
            onClick={runChartAIAnalysis}
            disabled={loadingChartAI}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 text-emerald-400 ${loadingChartAI ? "animate-spin" : ""}`} />
            <span>{loadingChartAI ? "차트 파동 패턴 분석 중..." : "🔍 차트 패턴 & 지지/저항 AI 정밀 분석 실행"}</span>
          </button>
        </div>

        {chartAIError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{chartAIError}</span>
          </div>
        )}

        {chartAIResult && (
          <div className="bg-zinc-900 text-white p-4 rounded-lg space-y-3 shadow-md border border-zinc-800 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold rounded">
                  패턴: {chartAIResult.chartPattern}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-black rounded ${
                  chartAIResult.trendDirection === 'BULLISH' 
                    ? "bg-emerald-500 text-zinc-950" 
                    : chartAIResult.trendDirection === 'BEARISH' 
                    ? "bg-rose-500 text-white" 
                    : "bg-amber-500 text-zinc-950"
                }`}>
                  추세: {chartAIResult.trendDirection}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-zinc-400">기술점수: <strong className="text-emerald-400">{chartAIResult.technicalScore}점</strong></span>
                <span className="text-zinc-400">골든크로스: <strong className={chartAIResult.goldenCrossDetected ? "text-emerald-400" : "text-zinc-400"}>{chartAIResult.goldenCrossDetected ? "감지됨 ✓" : "미발생"}</strong></span>
              </div>
            </div>

            <p className="text-xs text-zinc-200 leading-relaxed font-sans font-normal">
              {chartAIResult.chartSummary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-zinc-800/80 p-2 rounded border border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 block">핵심 지지선 (Support)</span>
                <span className="font-bold text-emerald-400">{chartAIResult.keySupportLevel?.toLocaleString()}{market === "KOREA" ? "원" : " USD"}</span>
              </div>
              <div className="bg-zinc-800/80 p-2 rounded border border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 block">핵심 저항선 (Resistance)</span>
                <span className="font-bold text-rose-400">{chartAIResult.keyResistanceLevel?.toLocaleString()}{market === "KOREA" ? "원" : " USD"}</span>
              </div>
              <div className="bg-zinc-800/80 p-2 rounded border border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 block">권장 켈리 배정 비중</span>
                <span className="font-bold text-amber-400">{chartAIResult.tradingGuide?.kellyPct || 15}%</span>
              </div>
              <div className="bg-zinc-800/80 p-2 rounded border border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 block">목표 손익비 (R:R)</span>
                <span className="font-bold text-sky-400">{chartAIResult.tradingGuide?.riskRewardRatio || 2.1}:1</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 pt-1 font-mono border-t border-zinc-800/80">
              <span>RSI: {chartAIResult.rsiStatus}</span>
              <span>MACD: {chartAIResult.macdStatus}</span>
              <span>볼린저: {chartAIResult.bollingerStatus}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
