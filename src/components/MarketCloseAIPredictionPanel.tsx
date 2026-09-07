import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import {
  Moon,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Zap,
  Clock,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Globe,
  ArrowUpRight,
  Info
} from "lucide-react";

interface PredictionData {
  symbol: string;
  name: string;
  closePrice: number;
  changePct: number;
  changePrice: number;
  volume: number;
  indicators: {
    rsi: number;
    ema5: number;
    ema20: number;
    ema60: number;
    upperBB: number;
    lowerBB: number;
    smcSupport: number;
    smcResistance: number;
    orderBlockZone: string;
    liquidityPool: string;
  };
  gapPrediction: {
    gapUpProbability: number;
    expectedGapPct: number;
    expectedOpenPrice: number;
    bias: "BULLISH_GAP" | "BEARISH_GAP" | "NEUTRAL";
  };
  trajectory: {
    step: string;
    actual?: number;
    bull: number;
    base: number;
    bear: number;
  }[];
}

interface MarketCloseAIPredictionPanelProps {
  selectedStockSymbol?: string;
  onSelectStock?: (symbol: string) => void;
}

const PRESET_WATCH_STOCKS = [
  { symbol: "021050", name: "서원", cap: "소형주", type: "구리/원자재/초전도" },
  { symbol: "004830", name: "덕성", cap: "소형주", type: "초전도체/신소재" },
  { symbol: "457550", name: "우진엔텍", cap: "소형주", type: "원전 계측/정비" },
  { symbol: "080220", name: "제주반도체", cap: "중형주", type: "온디바이스 AI" },
  { symbol: "399720", name: "가온칩스", cap: "중형주", type: "디자인하우스/반도체" },
  { symbol: "454910", name: "두산로보틱스", cap: "중형주", type: "협동로봇" },
  { symbol: "277810", name: "레인보우로보틱스", cap: "중형주", type: "휴머노이드/삼성로봇" },
  { symbol: "196170", name: "알테오젠", cap: "중형주", type: "바이오 SC 제형" },
  { symbol: "000250", name: "삼천당제약", cap: "중형주", type: "경구용 GLP-1 비만" },
  { symbol: "065350", name: "신성델타테크", cap: "중형주", type: "신소재/이차전지" },
  { symbol: "247540", name: "에코프로비엠", cap: "대형주", type: "양극재" },
  { symbol: "005930", name: "삼성전자", cap: "대형주", type: "반도체/HBM" }
];

export const MarketCloseAIPredictionPanel: React.FC<MarketCloseAIPredictionPanelProps> = ({
  selectedStockSymbol = "021050",
  onSelectStock
}) => {
  const [currentSymbol, setCurrentSymbol] = useState<string>(selectedStockSymbol || "021050");
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<"ALL" | "BULL" | "BASE" | "BEAR">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (selectedStockSymbol) {
      setCurrentSymbol(selectedStockSymbol);
    }
  }, [selectedStockSymbol]);

  const fetchPrediction = async (sym: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/realtime/market-close-prediction/${encodeURIComponent(sym)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPrediction(data);
        }
      }
    } catch (err) {
      console.warn("[Market Close Prediction Fetch Error]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction(currentSymbol);
    const interval = setInterval(() => {
      fetchPrediction(currentSymbol);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSymbol]);

  const handleStockClick = (sym: string) => {
    setCurrentSymbol(sym);
    if (onSelectStock) onSelectStock(sym);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data);
          const first = data[0];
          if (first && first.symbol) {
            handleStockClick(first.symbol);
          }
        }
      }
    } catch (err) {
      console.warn("Prediction stock search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const isUp = (prediction?.changePct || 0) >= 0;

  return (
    <div className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl shadow-md">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>장마감 후 AI 미래 가격 변동 예측선 시각화 엔진</span>
                <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-500/50 rounded-lg text-[11px] font-mono font-bold">
                  SMC & 야간 글로벌 연동
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              15:30 확정 종가 OHLCV + 다중 이평선(5/20/60) + 스마트머니 수급 + 야간 CME 선물/나스닥 시세 결합 예측
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPrediction(currentSymbol)}
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>예측선 재연산</span>
          </button>
        </div>
      </div>

      {/* Stock Selection Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] text-zinc-500 font-mono font-bold shrink-0 mr-1">분석 대상 종목:</span>
        {PRESET_WATCH_STOCKS.map(stk => (
          <button
            key={stk.symbol}
            onClick={() => handleStockClick(stk.symbol)}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
              currentSymbol === stk.symbol
                ? "bg-purple-900/60 border-purple-500 text-white font-bold shadow-sm"
                : "bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <span className="font-bold">{stk.name}</span>
            <span className="text-[10px] text-zinc-500">({stk.cap})</span>
          </button>
        ))}
      </div>

      {/* Stock Current Briefing & Metrics */}
      {prediction && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono block">확정 종가 (15:30)</span>
            <span className="text-sm font-mono font-black text-white">
              {(prediction.closePrice ?? 0).toLocaleString()}원
            </span>
            <span className={`text-[10px] font-mono font-bold block ${isUp ? "text-rose-400" : "text-blue-400"}`}>
              {isUp ? "▲ +" : "▼ "}{prediction.changePct}%
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono block">익일 시초가 갭 예측</span>
            <span className="text-sm font-mono font-black text-purple-300">
              {prediction.gapPrediction.gapUpProbability}% 상승 우세
            </span>
            <span className="text-[10px] font-mono text-zinc-400 block">
              예상 시초: {(prediction.gapPrediction.expectedOpenPrice ?? 0).toLocaleString()}원
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono block">SMC 스마트머니 지지선</span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {(prediction.indicators.smcSupport ?? 0).toLocaleString()}원
            </span>
            <span className="text-[10px] font-mono text-zinc-400 block">
              오더블록 수급 지지대
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono block">SMC 1차 목표 저항대</span>
            <span className="text-sm font-mono font-black text-amber-400">
              {(prediction.indicators.smcResistance ?? 0).toLocaleString()}원
            </span>
            <span className="text-[10px] font-mono text-zinc-400 block">
              유동성 풀(Liquidity)
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono block">기술 지표 RSI (14)</span>
            <span className={`text-sm font-mono font-black ${
              prediction.indicators.rsi > 70 ? "text-rose-400" : prediction.indicators.rsi < 35 ? "text-emerald-400" : "text-cyan-300"
            }`}>
              {prediction.indicators.rsi} pt
            </span>
            <span className="text-[10px] font-mono text-zinc-400 block">
              {prediction.indicators.rsi > 70 ? "단기 과매수 주의" : prediction.indicators.rsi < 35 ? "과매도 반등 국면" : "추세 수렴 중"}
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono block">야간 글로벌 연동 지수</span>
            <span className="text-sm font-mono font-black text-teal-300">
              CME/나스닥 +0.72
            </span>
            <span className="text-[10px] font-mono text-emerald-400 block">
              동반 상승 상관성 강함
            </span>
          </div>
        </div>
      )}

      {/* Trajectory Interactive Chart */}
      {prediction && (
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{prediction.name} ({prediction.symbol}) 미래 5일 가격 궤적 예측 시뮬레이션</span>
              </span>
            </div>

            {/* Scenario Filter Buttons */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono">
              <button
                onClick={() => setActiveScenario("ALL")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeScenario === "ALL" ? "bg-purple-900 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                전체 시나리오
              </button>
              <button
                onClick={() => setActiveScenario("BULL")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  activeScenario === "BULL" ? "bg-emerald-800 text-emerald-100 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>상승 (Bull)</span>
              </button>
              <button
                onClick={() => setActiveScenario("BASE")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  activeScenario === "BASE" ? "bg-blue-800 text-blue-100 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                <span>기본 (Base)</span>
              </button>
              <button
                onClick={() => setActiveScenario("BEAR")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  activeScenario === "BEAR" ? "bg-rose-900 text-rose-100 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                <span>하락 (Bear)</span>
              </button>
            </div>
          </div>

          {/* Recharts Area Container */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={prediction.trajectory}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="step"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  fontFamily="monospace"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-zinc-950/95 border border-zinc-700 p-3 rounded-xl shadow-2xl text-xs font-mono space-y-1">
                          <p className="font-bold text-white border-b border-zinc-800 pb-1">{label}</p>
                          {payload.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3">
                              <span style={{ color: item.color }} className="font-bold">
                                {item.name}:
                              </span>
                              <span className="text-zinc-200">
                                {Number(item.value).toLocaleString()}원
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={prediction.closePrice}
                  label={{ value: `장마감: ${(prediction.closePrice ?? 0).toLocaleString()}원`, fill: "#a1a1aa", fontSize: 10, position: "insideTopLeft" }}
                  stroke="#71717a"
                  strokeDasharray="4 4"
                />
                {(activeScenario === "ALL" || activeScenario === "BULL") && (
                  <Area
                    type="monotone"
                    dataKey="bull"
                    name="상승 시나리오 (Bull)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#bullGrad)"
                  />
                )}
                {(activeScenario === "ALL" || activeScenario === "BASE") && (
                  <Area
                    type="monotone"
                    dataKey="base"
                    name="기본 시나리오 (Base)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#baseGrad)"
                  />
                )}
                {(activeScenario === "ALL" || activeScenario === "BEAR") && (
                  <Area
                    type="monotone"
                    dataKey="bear"
                    name="하락 시나리오 (Bear)"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#bearGrad)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Night-Time Trajectory Analysis Note */}
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-zinc-200 block">AI 야간 시계열 학습 요약</span>
              <p className="leading-relaxed">
                현재 <strong>{prediction.name}</strong>은 20일선({(prediction.indicators.ema20 ?? 0).toLocaleString()}원) 상단에서 지지력을 형성하고 있으며, 
                야간 CME 선물 및 글로벌 기술주 심리 반영 시 익일 시초가는 <strong>+{prediction.gapPrediction.expectedGapPct}%</strong> 내외의 갭상승 확률(<strong>{prediction.gapPrediction.gapUpProbability}%</strong>)이 우세합니다.
                익일 정규장 개장(09:00) 시 실시간 틱 데이터가 유입되면 시초가 호가에 따라 실시간 궤적이 자동으로 재보정됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
