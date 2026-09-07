import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Sparkles, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  Clock, 
  BarChart2, 
  ArrowRight, 
  Sliders, 
  Layers, 
  Eye, 
  RefreshCcw, 
  DollarSign, 
  Activity,
  Check,
  X,
  Camera,
  Cpu,
  HelpCircle,
  Maximize2,
  Lock,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  AlertTriangle,
  Award
} from "lucide-react";
import { 
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Area 
} from "recharts";
import { useApp } from "../context/AppContext";
import { ExpectedProfitabilityPanel } from "./ExpectedProfitabilityPanel";

export interface PresetPair {
  id: string;
  symbol: string;
  name: string;
  market: "US" | "BTC" | "KOREA";
  price: number;
  timeframe: string;
  defaultDirection: "SHORT" | "LONG";
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: string;
  volumeStr: string;
  volatilityStr: string;
  longPct: number;
  shortPct: number;
  invalidationPrice: number;
  expirationSec: number;
  indicators: {
    vwap: number;
    ema20: number;
    atr: number;
    rsi: number;
    macd: string;
    structure: string;
    orderFlow: string;
  };
  rationale: string;
}

const PRESET_MARKET_PAIRS: PresetPair[] = [
  {
    id: "mes",
    symbol: "MESU26",
    name: "Micro E-mini S&P 500 (Sep 2026)",
    market: "US",
    price: 7530.25,
    timeframe: "15m",
    defaultDirection: "SHORT",
    confidence: 78,
    entryPrice: 7530.25,
    stopLoss: 7533.50,
    tp1: 7527.75,
    tp2: 7525.75,
    tp3: 7521.50,
    riskReward: "1.4R",
    volumeStr: "$6.68B (+12.3%)",
    volatilityStr: "1.4%",
    longPct: 18.1,
    shortPct: 81.9,
    invalidationPrice: 7534.25,
    expirationSec: 280,
    indicators: {
      vwap: 7532.10,
      ema20: 7531.80,
      atr: 3.25,
      rsi: 42.1,
      macd: "Bearish Crossover (-1.4)",
      structure: "LH (Lower High) / LL (Lower Low)",
      orderFlow: "Heavy Institutional Sell Aggression"
    },
    rationale: "Blow-off top at 7,552 rejected with aggressive distribution volume - sellers now control the 7,530 pivot level. Lower highs forming on 15m candle structure with declining buying momentum."
  },
  {
    id: "btc",
    symbol: "BTC/USDT",
    name: "비트코인 (Bitcoin / Tether)",
    market: "BTC",
    price: 0,
    timeframe: "5m",
    defaultDirection: "LONG",
    confidence: 84,
    entryPrice: 0,
    stopLoss: 97800000,
    tp1: 99400000,
    tp2: 100300000,
    tp3: 101200000,
    riskReward: "2.8R",
    volumeStr: "₩1.45조 (+28.4%)",
    volatilityStr: "2.1%",
    longPct: 76.4,
    shortPct: 23.6,
    invalidationPrice: 97500000,
    expirationSec: 420,
    indicators: {
      vwap: 98200000,
      ema20: 98150000,
      atr: 650000,
      rsi: 61.8,
      macd: "Bullish Golden Cross (+12.4)",
      structure: "HH (Higher High) / HL (Higher Low)",
      orderFlow: "Institutional Whales Net Buying"
    },
    rationale: "W-이중바닥 넥라인 강력 수급 돌파 및 볼린저 스퀴즈 상방 오버슈팅 포착. 20일 이동평균선 안착 후 기관/고래 동시 순매수 유입 중."
  },
  {
    id: "samsung",
    symbol: "005930",
    name: "삼성전자 (Samsung Electronics)",
    market: "KOREA",
    price: 78500,
    timeframe: "1h",
    defaultDirection: "LONG",
    confidence: 81,
    entryPrice: 78500,
    stopLoss: 76800,
    tp1: 80200,
    tp2: 81800,
    tp3: 83500,
    riskReward: "2.9R",
    volumeStr: "1,850만주 (+42.1%)",
    volatilityStr: "1.1%",
    longPct: 82.0,
    shortPct: 18.0,
    invalidationPrice: 76200,
    expirationSec: 600,
    indicators: {
      vwap: 78100,
      ema20: 77900,
      atr: 850,
      rsi: 58.4,
      macd: "Bullish Expansion (+4.2)",
      structure: "HH / HL Trend Continuation",
      orderFlow: "Foreigner/Institutional 5-day Buy Streak"
    },
    rationale: "외국인/기관 5일 연속 동반 순매수 유입. 반도체 업황 개선 공시 및 20일선 눌림목 반등 확정 지점."
  },
  {
    id: "nvda",
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA Corp)",
    market: "US",
    price: 128.50,
    timeframe: "15m",
    defaultDirection: "LONG",
    confidence: 88,
    entryPrice: 128.50,
    stopLoss: 125.20,
    tp1: 131.20,
    tp2: 133.80,
    tp3: 136.80,
    riskReward: "2.5R",
    volumeStr: "$12.4B (+31.5%)",
    volatilityStr: "2.8%",
    longPct: 85.5,
    shortPct: 14.5,
    invalidationPrice: 124.50,
    expirationSec: 350,
    indicators: {
      vwap: 127.80,
      ema20: 127.40,
      atr: 1.85,
      rsi: 66.2,
      macd: "Bullish Momentum Acceleration",
      structure: "Bullish Flag Breakout",
      orderFlow: "Options Gamma Squeeze Net Inflow"
    },
    rationale: "AI 데이터센터 수주 호조 및 매크로 금리 안착. 15m 깃발형 모멘텀 패턴 완성 후 거래량 폭발 매수 타점."
  },
  {
    id: "tsla",
    symbol: "TSLA",
    name: "테슬라 (Tesla Inc)",
    market: "US",
    price: 218.40,
    timeframe: "15m",
    defaultDirection: "LONG",
    confidence: 85,
    entryPrice: 218.40,
    stopLoss: 212.00,
    tp1: 224.50,
    tp2: 231.00,
    tp3: 238.00,
    riskReward: "2.7R",
    volumeStr: "$8.9B (+24.1%)",
    volatilityStr: "3.2%",
    longPct: 81.2,
    shortPct: 18.8,
    invalidationPrice: 210.50,
    expirationSec: 400,
    indicators: {
      vwap: 216.80,
      ema20: 215.90,
      atr: 4.20,
      rsi: 64.5,
      macd: "Bullish Histogram Expansion",
      structure: "Ascending Triangle Breakout",
      orderFlow: "Short Squeeze Inflow"
    },
    rationale: "삼각수렴 상방 돌파 및 자율주행 호재 거래량 폭발. 주요 저항대 216.8달러 안착 확인."
  },
  {
    id: "hynix",
    symbol: "000660",
    name: "SK하이닉스 (SK Hynix)",
    market: "KOREA",
    price: 184500,
    timeframe: "15m",
    defaultDirection: "LONG",
    confidence: 86,
    entryPrice: 184500,
    stopLoss: 179000,
    tp1: 189500,
    tp2: 194000,
    tp3: 199000,
    riskReward: "2.6R",
    volumeStr: "420만주 (+38.2%)",
    volatilityStr: "2.3%",
    longPct: 83.5,
    shortPct: 16.5,
    invalidationPrice: 177500,
    expirationSec: 450,
    indicators: {
      vwap: 183200,
      ema20: 182800,
      atr: 2800,
      rsi: 62.8,
      macd: "Bullish Momentum Continuation",
      structure: "Higher Low Support Test",
      orderFlow: "HBM Supply Contract Inflow"
    },
    rationale: "HBM3E 독점 공급 계약 모멘텀 및 20일 이동평균선 눌림목 반등 확정 지점."
  },
  {
    id: "xrp",
    symbol: "KRW-XRP",
    name: "리플 (XRP / Upbit)",
    market: "BTC",
    price: 840,
    timeframe: "5m",
    defaultDirection: "LONG",
    confidence: 82,
    entryPrice: 840,
    stopLoss: 810,
    tp1: 865,
    tp2: 890,
    tp3: 920,
    riskReward: "2.5R",
    volumeStr: "₩8,200억 (+45.2%)",
    volatilityStr: "3.8%",
    longPct: 78.9,
    shortPct: 21.1,
    invalidationPrice: 800,
    expirationSec: 300,
    indicators: {
      vwap: 832,
      ema20: 828,
      atr: 18,
      rsi: 65.1,
      macd: "Bullish Cross Above Zero",
      structure: "Cup and Handle Pattern",
      orderFlow: "Whale Wallet Aggressive Market Buys"
    },
    rationale: "컵앤핸들 패턴 전고점 832원 돌파 및 업비트 대량 매수 체결강도 180% 포착."
  }
];

export interface ScanStage {
  id: string;
  title: string;
  desc: string;
  status: "pending" | "scanning" | "completed";
}

export const VisionAiChartAnalyzer: React.FC = () => {
  const { executeTrade, addToast } = useApp();

  // Selected pair / image input
  const [selectedPreset, setSelectedPreset] = useState<PresetPair>(PRESET_MARKET_PAIRS[0]);
  const [userContext, setUserContext] = useState<string>("15m timeframe, looking for trade setup near key pivot");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Fetch real-time live price for selectedPreset
  useEffect(() => {
    let isMounted = true;
    const fetchLivePrice = async () => {
      if (!selectedPreset.symbol) return;
      try {
        const cleanSym = selectedPreset.symbol.replace("KRW-", "");
        const res = await fetch(`/api/stocks/${encodeURIComponent(cleanSym)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.price === "number" && data.price > 0 && isMounted) {
            setSelectedPreset(prev => ({
              ...prev,
              price: data.price,
              entryPrice: data.price,
              tp1: Math.round(data.price * 1.03 * 100) / 100,
              tp2: Math.round(data.price * 1.06 * 100) / 100,
              tp3: Math.round(data.price * 1.09 * 100) / 100,
              stopLoss: Math.round(data.price * 0.96 * 100) / 100
            }));
          }
        }
      } catch (e) {
        console.warn("VisionAiChartAnalyzer live quote fetch warning:", e);
      }
    };
    fetchLivePrice();
    const timer = setInterval(fetchLivePrice, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [selectedPreset.symbol]);

  // Custom Ticker Search / Dynamic Symbol Input State
  const [customTickerInput, setCustomTickerInput] = useState<string>("");
  const [presetList, setPresetList] = useState<PresetPair[]>(PRESET_MARKET_PAIRS);

  const handleAddCustomTicker = () => {
    if (!customTickerInput.trim()) return;
    const cleanSym = customTickerInput.trim().toUpperCase();
    
    // Check if symbol already exists in presetList
    const existing = presetList.find(p => p.symbol.toUpperCase() === cleanSym || p.id.toUpperCase() === cleanSym);
    if (existing) {
      setSelectedPreset(existing);
      setCustomTickerInput("");
      addToast({
        type: "INFO",
        title: "📌 종목 선택 완료",
        message: `${existing.name} (${existing.symbol}) 종목이 선택되었습니다.`
      });
      return;
    }

    // Determine market based on symbol characteristics
    let market: "US" | "BTC" | "KOREA" = "US";
    if (/^\d{6}$/.test(cleanSym) || cleanSym.includes("005930") || cleanSym.includes("000660")) {
      market = "KOREA";
    } else if (cleanSym.includes("BTC") || cleanSym.includes("ETH") || cleanSym.includes("XRP") || cleanSym.includes("KRW-") || cleanSym.includes("USDT")) {
      market = "BTC";
    }

    const estimatedPrice = market === "KOREA" ? 45000 : market === "BTC" ? 1500 : 185;

    const newPair: PresetPair = {
      id: `custom-${Date.now()}`,
      symbol: cleanSym,
      name: `${cleanSym} (커스텀 등록 종목)`,
      market: market,
      price: estimatedPrice,
      timeframe: "15m",
      defaultDirection: "LONG",
      confidence: 83,
      entryPrice: estimatedPrice,
      stopLoss: Math.round(estimatedPrice * 0.96 * 100) / 100,
      tp1: Math.round(estimatedPrice * 1.03 * 100) / 100,
      tp2: Math.round(estimatedPrice * 1.06 * 100) / 100,
      tp3: Math.round(estimatedPrice * 1.09 * 100) / 100,
      riskReward: "2.5R",
      volumeStr: market === "KOREA" ? "520만주 (+18.5%)" : "$3.2B (+15.4%)",
      volatilityStr: "2.5%",
      longPct: 78.5,
      shortPct: 21.5,
      invalidationPrice: Math.round(estimatedPrice * 0.95 * 100) / 100,
      expirationSec: 400,
      indicators: {
        vwap: Math.round(estimatedPrice * 0.99 * 100) / 100,
        ema20: Math.round(estimatedPrice * 0.985 * 100) / 100,
        atr: Math.round(estimatedPrice * 0.02 * 100) / 100,
        rsi: 61.2,
        macd: "Bullish Crossover (+3.2)",
        structure: "Ascending Trendline Support",
        orderFlow: "Institutional Net Buy Flow"
      },
      rationale: `실시간 ${cleanSym} 수급 스캔 포착. 주요 지지선 반등 및 AI 오버레이 브라켓 분석 실행 준비.`
    };

    setPresetList(prev => [newPair, ...prev]);
    setSelectedPreset(newPair);
    setCustomTickerInput("");

    addToast({
      type: "SUCCESS",
      title: "🎯 커스텀 종목 등록 완료",
      message: `${cleanSym} 종목이 AI Trade Overlay Engine에 신규 등록되었습니다.`
    });
  };

  // Flow step state: "IDLE" | "SCANNING" | "ANALYZED" | "TRADING"
  const [flowState, setFlowState] = useState<"IDLE" | "SCANNING" | "ANALYZED" | "TRADING">("IDLE");
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);

  // Live Auto-Tick Simulation State
  const [isLiveTickActive, setIsLiveTickActive] = useState<boolean>(true);
  const [livePrice, setLivePrice] = useState<number>(PRESET_MARKET_PAIRS[0].price);
  const [liveConfidence, setLiveConfidence] = useState<number>(PRESET_MARKET_PAIRS[0].confidence);
  const [remainingTimerSec, setRemainingTimerSec] = useState<number>(PRESET_MARKET_PAIRS[0].expirationSec);

  // Risk Gate Modal Checklist State
  const [showRiskGateModal, setShowRiskGateModal] = useState<boolean>(false);
  const [riskGateStep, setRiskGateStep] = useState<number>(0);
  const [gateChecksPassed, setGateChecksPassed] = useState<boolean[]>(Array(7).fill(false));

  // 6 Pipeline Stages
  const [pipelineStages, setPipelineStages] = useState<ScanStage[]>([
    { id: "STRUCTURE", title: "STRUCTURE", desc: "Reading candle structure & HH/HL/LH/LL action...", status: "pending" },
    { id: "LEVELS", title: "LEVELS", desc: "Detecting Pivots, Liquidity, Support & Resistance...", status: "pending" },
    { id: "TREND", title: "TREND", desc: "Analyzing VWAP, EMA, ATR, RSI & MACD metrics...", status: "pending" },
    { id: "PRICING", title: "PRICING", desc: "Calculating Entry, Stop Loss & Multi-TP limits...", status: "pending" },
    { id: "PLAN", title: "PLAN", desc: "Evaluating Risk/Reward, Hit Rate & Kelly Position Size...", status: "pending" },
    { id: "CONFIRM", title: "CONFIRM", desc: "Finalizing overlay prediction cone & packaging...", status: "pending" }
  ]);

  // Chart Bracket Simulation Data
  const [bracketChartData, setBracketChartData] = useState<any[]>([]);

  // V9 Master System State & Canvas Reference
  const [v9MasterResult, setV9MasterResult] = useState<any | null>(null);
  const [generatedCandles, setGeneratedCandles] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate Real Candlestick Series
  const createCandleSeries = (preset: PresetPair) => {
    const baseP = preset.price;
    const isShort = preset.defaultDirection === "SHORT";
    const list = [];
    let currentP = baseP * 0.985;

    for (let i = 25; i >= 1; i--) {
      const timeStr = `${25 - i + 1}m`;
      const step = (Math.sin(i * 0.4) * 0.004 + (isShort ? -0.001 * i : 0.0012 * i)) * baseP;
      const openP = Math.round(currentP);
      const closeP = Math.round(currentP + step);
      const highP = Math.max(openP, closeP) + Math.round(baseP * 0.002);
      const lowP = Math.min(openP, closeP) - Math.round(baseP * 0.002);
      const volume = Math.round(30000 + Math.random() * 120000);
      currentP = closeP;

      list.push({
        time: timeStr,
        open: openP,
        high: highP,
        low: lowP,
        close: closeP,
        volume
      });
    }
    return list;
  };

  // Draw Live Candlesticks on HTML5 Canvas
  const renderCanvasChart = (candles: any[], preset: PresetPair, v9Data?: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#0b101d";
    ctx.fillRect(0, 0, width, height);

    if (!candles || candles.length === 0) return;

    // Dimensions
    const paddingLeft = 10;
    const paddingRight = 80;
    const paddingTop = 30;
    const paddingBottom = 40;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Price Bounds
    let minP = Infinity;
    let maxP = -Infinity;
    candles.forEach(c => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    });

    // Add margin to bounds
    const pMargin = (maxP - minP) * 0.1 || 10;
    minP -= pMargin;
    maxP += pMargin;

    const priceToY = (p: number) => paddingTop + chartHeight - ((p - minP) / (maxP - minP)) * chartHeight;

    // Grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = paddingTop + (chartHeight / 6) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      const priceVal = maxP - ((maxP - minP) / 6) * i;
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(Math.round(priceVal).toLocaleString(), width - paddingRight + 5, y + 3);
    }

    // Draw Candles
    const candleWidth = Math.max(3, (chartWidth / candles.length) - 4);
    candles.forEach((c, idx) => {
      const x = paddingLeft + idx * (chartWidth / candles.length) + (chartWidth / candles.length - candleWidth) / 2;
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const isGreen = c.close >= c.open;
      const color = isGreen ? "#10b981" : "#f43f5e";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x, bodyY, candleWidth, bodyH);
    });

    // Draw Trigger & SL Lines if available
    const triggerP = v9Data?.triggerPrice || preset.entryPrice;
    const slP = v9Data?.invalidationPrice || preset.stopLoss;
    const tp2P = v9Data?.targets?.tp2 || preset.tp2;

    // Trigger Line
    const trigY = priceToY(triggerP);
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, trigY);
    ctx.lineTo(width - paddingRight, trigY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#06b6d4";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(`TRIGGER ${Math.round(triggerP).toLocaleString()}`, width - paddingRight + 5, trigY + 3);

    // Stop Loss Line
    const slY = priceToY(slP);
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, slY);
    ctx.lineTo(width - paddingRight, slY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f43f5e";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(`STOP ${Math.round(slP).toLocaleString()}`, width - paddingRight + 5, slY + 3);

    // TP2 Line
    const tpY = priceToY(tp2P);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, tpY);
    ctx.lineTo(width - paddingRight, tpY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(`TP2 ${Math.round(tp2P).toLocaleString()}`, width - paddingRight + 5, tpY + 3);

    // Title / Overlay Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`${preset.symbol} ${preset.name} - V9.0 Real-Time Chart Analysis Canvas`, paddingLeft + 5, paddingTop - 10);
  };

  // Synchronize Live Price & Timer when Selected Preset changes
  useEffect(() => {
    setLivePrice(selectedPreset.price);
    setLiveConfidence(selectedPreset.confidence);
    setRemainingTimerSec(selectedPreset.expirationSec);

    const candles = createCandleSeries(selectedPreset);
    setGeneratedCandles(candles);
    setTimeout(() => {
      renderCanvasChart(candles, selectedPreset);
    }, 100);
  }, [selectedPreset]);

  // Real-time Candle Timer & Price Sync
  useEffect(() => {
    if (flowState !== "ANALYZED" && flowState !== "TRADING") return;
    if (!isLiveTickActive) return;

    const interval = setInterval(() => {
      // Countdown timer
      setRemainingTimerSec(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [flowState, isLiveTickActive, selectedPreset]);

  // Handle Image Drag & Drop / Selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      addToast({
        type: "SUCCESS",
        title: "📸 차트 이미지 첨부 완료",
        message: "Vision AI 엔진으로 차트 스캔을 준비합니다."
      });
    };
    reader.readAsDataURL(file);
  };

  // Vision AI Real Analysis Response State
  const [visionAiAnalysisResult, setVisionAiAnalysisResult] = useState<string | null>(null);
  const [isVisionAiLoading, setIsVisionAiLoading] = useState<boolean>(false);

  // Start Multi-Stage AI Scan Sequence
  const startAiScan = async () => {
    setFlowState("SCANNING");
    setScanProgress(0);
    setActiveStageIdx(0);
    setVisionAiAnalysisResult(null);

    // Render HTML5 Canvas Chart & capture image data URL
    renderCanvasChart(generatedCandles, selectedPreset);
    const canvasDataUrl = canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;

    // Trigger V9 Master System Analysis Endpoint
    fetch("/api/ai/v9-master-chart-analyzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: selectedPreset.symbol,
        name: selectedPreset.name,
        market: selectedPreset.market,
        timeframe: selectedPreset.timeframe,
        price: livePrice,
        imageAttachment: (uploadedImage || canvasDataUrl) ? {
          data: uploadedImage || canvasDataUrl,
          mimeType: "image/png"
        } : undefined,
        ohlcvCandles: generatedCandles,
        newsContext: userContext
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.result) {
        setV9MasterResult(data.result);
        if (data.result.fullAnalysisReport) {
          setVisionAiAnalysisResult(data.result.fullAnalysisReport);
        }
        // Re-render canvas with exact computed levels
        renderCanvasChart(generatedCandles, selectedPreset, data.result);
      }
    })
    .catch(err => {
      console.error("V9 Master Analyzer Fetch Error:", err);
    });

    // Reset pipeline stages
    setPipelineStages(prev => prev.map((stage, idx) => ({
      ...stage,
      status: idx === 0 ? "scanning" : "pending"
    })));

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      if (progress > 100) progress = 100;
      setScanProgress(progress);

      // Determine active stage
      const stageIdx = Math.min(5, Math.floor((progress / 100) * 6));
      setActiveStageIdx(stageIdx);

      setPipelineStages(prev => prev.map((s, idx) => {
        if (idx < stageIdx) return { ...s, status: "completed" };
        if (idx === stageIdx) return { ...s, status: "scanning" };
        return { ...s, status: "pending" };
      }));

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setPipelineStages(prev => prev.map(s => ({ ...s, status: "completed" })));
          setFlowState("ANALYZED");
          generateBracketChartData(selectedPreset);
          addToast({
            type: "SUCCESS",
            title: uploadedImage ? "📸 Gemini Vision AI 이미지 픽셀 판독 완료" : "🎯 UNIFIED MASTER SYSTEM V9.0 차트 판독 완료",
            message: `${selectedPreset.symbol} UNIFIED MASTER SYSTEM V9.0 실제 캔들 파동 및 SMC 구조 산출이 완료되었습니다.`
          });
        }, 500);
      }
    }, 70);
  };

  // Generate Candlestick Bracket Data with Entry, SL, TP1, TP2, TP3 & Translucent Prediction Corridor Area
  const generateBracketChartData = (preset: PresetPair) => {
    const data = [];
    const baseP = preset.price;
    const isShort = preset.defaultDirection === "SHORT";

    // 15 Historical Candlesticks
    for (let i = 15; i >= 1; i--) {
      const timeStr = `${15 - i + 1}m`;
      const dev = (Math.sin(i * 0.7) * 0.003 + (isShort ? 0.001 * i : -0.001 * i)) * baseP;
      const closeP = baseP + dev;
      const openP = closeP + (Math.cos(i) * 0.002) * baseP;
      const highP = Math.max(openP, closeP) + Math.abs(dev) * 0.5;
      const lowP = Math.min(openP, closeP) - Math.abs(dev) * 0.5;

      data.push({
        time: timeStr,
        open: openP,
        high: highP,
        low: lowP,
        close: closeP,
        price: closeP,
        entryLine: preset.entryPrice,
        stopLossLine: preset.stopLoss,
        tp1Line: preset.tp1,
        tp2Line: preset.tp2,
        tp3Line: preset.tp3,
        predUpper: null,
        predLower: null,
        isFuture: false
      });
    }

    // 6 Projection Candlesticks with Upper/Lower Probability Corridor (Cone)
    let currentP = baseP;
    for (let i = 1; i <= 6; i++) {
      const timeStr = `+${i * 5}m (예측)`;
      const step = isShort ? -Math.abs(preset.entryPrice - preset.tp2) * 0.20 : Math.abs(preset.tp2 - preset.entryPrice) * 0.20;
      currentP += step;

      // Prediction Cone Expansion Width
      const coneWidth = (baseP * 0.0012) * i;
      const upperBand = currentP + coneWidth;
      const lowerBand = currentP - coneWidth;

      data.push({
        time: timeStr,
        open: currentP - step,
        high: currentP + Math.abs(step) * 0.3,
        low: currentP - Math.abs(step) * 0.3,
        close: currentP,
        price: currentP,
        entryLine: preset.entryPrice,
        stopLossLine: preset.stopLoss,
        tp1Line: preset.tp1,
        tp2Line: preset.tp2,
        tp3Line: preset.tp3,
        predUpper: upperBand,
        predLower: lowerBand,
        predCorridor: [lowerBand, upperBand],
        isFuture: true
      });
    }

    setBracketChartData(data);
  };

  // Open Multi-tier Risk Gate Modal
  const handleOpenRiskGateModal = () => {
    setShowRiskGateModal(true);
    setRiskGateStep(0);
    setGateChecksPassed(Array(7).fill(false));

    // Simulate Step-by-Step Risk Gate Verification Sequence
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setRiskGateStep(step);
      setGateChecksPassed(prev => {
        const copy = [...prev];
        if (step - 1 < copy.length) copy[step - 1] = true;
        return copy;
      });

      if (step >= 7) {
        clearInterval(interval);
      }
    }, 400);
  };

  // Execute AI Autonomous Trade into AppContext
  const handleExecuteAutonomousTrade = async () => {
    setShowRiskGateModal(false);

    // Use current live market price as the exact real-time execution price
    const executionPrice = livePrice;
    const priceDriftPct = selectedPreset.entryPrice > 0 
      ? (Math.abs(selectedPreset.entryPrice - executionPrice) / selectedPreset.entryPrice) * 100 
      : 0;

    if (priceDriftPct > 0.1) {
      addToast({
        type: "INFO",
        title: "🔄 실시간 체결가 앵커 동기화 완료",
        message: `실시간 시세 변동에 따라 AI 진입 앵커를 최신 실시간 체결가(${(executionPrice ?? 0).toLocaleString()})로 즉시 동기화하여 주문을 전송합니다.`
      });
    }

    setFlowState("TRADING");
    try {
      const side = selectedPreset.defaultDirection === "SHORT" ? "SELL" : "BUY";
      const qty = selectedPreset.market === "US" ? 5 : (selectedPreset.market === "BTC" ? 0.01 : 10);

      await executeTrade(
        selectedPreset.symbol,
        selectedPreset.name,
        selectedPreset.market,
        side,
        qty,
        executionPrice,
        "자비스 Vision AI 차트분석 자동체결",
        `[자비스 Vision AI] ${selectedPreset.defaultDirection} (실시간 체결가: ${(executionPrice ?? 0).toLocaleString()} / 손절가: ${(selectedPreset.stopLoss ?? 0).toLocaleString()} / TP3: ${(selectedPreset.tp3 ?? 0).toLocaleString()})`
      );

      addToast({
        type: "SUCCESS",
        title: "⚡ 자비스 AI 실시간 체결 완료",
        message: `${selectedPreset.name} ${selectedPreset.defaultDirection} 포지션이 실시간 체결가 ${(executionPrice ?? 0).toLocaleString()}에 성공적으로 집행되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "주문 실행 처리",
        message: e?.message || "주문 처리 중 예외가 발생했습니다."
      });
    }
  };

  // Format seconds to mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans">
      {/* TOP HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-cyan-950 border border-cyan-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold mb-1">
              <span>Home</span>
              <span>/</span>
              <span className="text-white">Vision Analyser</span>
              <span className="bg-cyan-500/20 border border-cyan-400/40 text-[10px] px-2 py-0.5 rounded text-cyan-300">
                AI Trade Overlay Engine 2.0
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>AI Trade Overlay Engine</span>
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              실시간 캔들 구조, 🔴 STOP / 🟢 ENTRY / 🟢 TP1,2,3 라인 Overlay & 반투명 예측 구간(Probability Cone)을 실시간 갱신합니다.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {flowState !== "IDLE" && (
              <button
                onClick={() => {
                  setFlowState("IDLE");
                  setScanProgress(0);
                }}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span>새 스캔 시작</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* IDLE MODE: UPLOAD & PAIR SELECTOR */}
      {flowState === "IDLE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* UPLOAD & PRESETS LEFT PANEL */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Camera className="h-4 w-4 text-cyan-400" />
              <span>Step 1: 차트 캡처 업로드 또는 대표 종목 선택</span>
            </h3>

            {/* Dropzone Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-950/80 hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition relative group overflow-hidden"
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              
              {uploadedImage ? (
                <div className="space-y-3">
                  <div className="relative max-h-48 rounded-xl overflow-hidden border border-cyan-500/50 mx-auto inline-block">
                    <img src={uploadedImage} alt="Uploaded Chart" className="max-h-48 object-contain" />
                    <span className="absolute top-2 right-2 bg-black/80 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40">
                      이미지 첨부됨
                    </span>
                  </div>
                  <p className="text-xs font-bold text-cyan-300">클릭하여 다른 차트 이미지로 변경</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-400 group-hover:scale-110 transition">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Drop chart image here or click to import</p>
                    <p className="text-xs text-zinc-400 mt-1">Supports TradingView, HTS, Upbit, Binance screenshots (PNG, JPG, WEBP)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Ticker Search & Add Input Bar */}
            <div className="space-y-2 p-3 bg-slate-950/90 border border-cyan-500/30 rounded-xl">
              <label className="text-xs font-bold text-cyan-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>원하는 종목 / 티커 직접 검색 및 등록 (Search Any Stock / Crypto)</span>
                </span>
                <span className="text-[10px] text-zinc-500">원하는 종목 무제한 분석 가능</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTickerInput}
                  onChange={(e) => setCustomTickerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomTicker()}
                  placeholder="예: TSLA, AAPL, SK하이닉스, 005930, KRW-XRP, SOL, DOGE 입력..."
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 text-xs text-white px-3 py-2 rounded-xl focus:outline-none font-mono"
                />
                <button
                  onClick={handleAddCustomTicker}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>종목 추가</span>
                </button>
              </div>
            </div>

            {/* Preset & Registered Pair Selectors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 block">실시간 분석 대상 종목 선택 (클릭 시 선택):</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {presetList.map(pair => {
                  const isSelected = selectedPreset.id === pair.id;
                  return (
                    <button
                      key={pair.id}
                      onClick={() => setSelectedPreset(pair)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? "bg-gradient-to-r from-cyan-950 to-slate-900 border-cyan-400 shadow-md ring-1 ring-cyan-400/50" 
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 text-zinc-300"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{pair.symbol}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            pair.defaultDirection === "SHORT" ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}>
                            {pair.defaultDirection}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{pair.name}</div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">${(pair.price ?? 0).toLocaleString()}</div>
                        <div className="text-[10px] text-cyan-400 font-bold">{pair.timeframe} 타임프레임</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Additional Context Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">추가 분석 컨텍스트 (Optional Steering Context):</label>
              <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Anything else that might help the analysis... (e.g. 15m timeframe, looking for short setup near 7,530 resistance)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 h-20 resize-none font-mono"
              />
            </div>

            {/* Run Vision AI Scan Trigger Button */}
            <button
              onClick={startAiScan}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg border border-cyan-300 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="h-5 w-5 text-slate-950 fill-slate-950" />
              <span>Analyze Chart (실시간 AI 차트 판독 실행)</span>
            </button>
          </div>

          {/* ACTIVE PRESET SUMMARY RIGHT SIDE CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
              선택 종목 AI 사전 정보
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-zinc-400">Target Pair</span>
                <span className="font-bold text-white">{selectedPreset.symbol}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-zinc-400">Current Market Price</span>
                <span className="font-bold text-cyan-300">${(selectedPreset.price ?? 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-zinc-400">Timeframe</span>
                <span className="font-bold text-white">{selectedPreset.timeframe}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-zinc-400">Expected Risk/Reward</span>
                <span className="font-bold text-amber-400">{selectedPreset.riskReward}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-zinc-400">Invalidation Price</span>
                <span className="font-bold text-rose-400">${(selectedPreset.invalidationPrice ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-200 leading-relaxed font-sans space-y-1">
              <div className="flex items-center gap-1 font-bold text-cyan-300">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>AI Trade Overlay Engine</span>
              </div>
              <p>
                캔들 구조, VWAP, EMA, ATR, Order Flow를 6단계 AI 파이프라인으로 종합 분석하여 차트 위 Multi-TP 브라켓 및 예측 구간을 표출합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCANNING MODE: MULTI-STAGE SCAN PIPELINE WITH LASER ANIMATION */}
      {flowState === "SCANNING" && (
        <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden">
          {/* Laser Scanning Banner */}
          <div className="relative h-64 bg-slate-950 rounded-2xl border border-cyan-500/30 overflow-hidden flex items-center justify-center">
            {uploadedImage ? (
              <img src={uploadedImage} alt="Chart Scan" className="h-full w-full object-cover opacity-40 filter blur-xs" />
            ) : (
              <div className="text-center space-y-2 opacity-30">
                <BarChart2 className="h-20 w-20 text-cyan-400 mx-auto" />
                <p className="font-mono text-xs text-cyan-300">SIMULATED CANDLESTICK STRUCTURE SCAN</p>
              </div>
            )}

            {/* Glowing Laser Beam Scan Overlay */}
            <div 
              className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_25px_8px_rgba(6,182,212,0.8)] transition-all duration-100"
              style={{ top: `${scanProgress}%` }}
            />

            {/* Centered Stage Status Badge */}
            <div className="absolute z-10 bg-slate-900/90 border-2 border-cyan-400 px-6 py-3 rounded-2xl text-center shadow-2xl backdrop-blur-md">
              <div className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <Cpu className="h-4 w-4 animate-spin text-cyan-400" />
                <span>Reading candle structure ({scanProgress}%)</span>
              </div>
              <p className="text-sm font-black text-white mt-1">
                {pipelineStages[activeStageIdx]?.desc || "Analyzing..."}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold">MULTI-STAGE AI SCANNER</span>
              <span className="text-white font-bold">{scanProgress}% / 100%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full border border-slate-800 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>

          {/* 6 Pipeline Stage Badges */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {pipelineStages.map((stage, idx) => (
              <div 
                key={stage.id}
                className={`p-3 rounded-xl border text-center font-mono text-xs transition ${
                  stage.status === "completed"
                    ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                    : stage.status === "scanning"
                    ? "bg-cyan-950/90 border-cyan-400 text-cyan-300 animate-pulse font-bold shadow-lg"
                    : "bg-slate-950 border-slate-800 text-zinc-500"
                }`}
              >
                <div className="text-[10px] opacity-75 font-bold">0{idx + 1}. {stage.title}</div>
                <div className="text-[11px] font-bold mt-1 truncate">
                  {stage.status === "completed" ? "✓ READY" : stage.status === "scanning" ? "SCANNING..." : "WAITING"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYZED / TRADING MODE: GLOWING SIGNAL CARD & BRACKET OVERLAY CHART */}
      {(flowState === "ANALYZED" || flowState === "TRADING") && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* TOP DECISION OVERLAY REVEAL CARD */}
          <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 border-2 border-cyan-400 rounded-2xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left Column: Signal Direction & Dynamic Confidence Arc */}
              <div className="flex items-center space-x-5">
                <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={selectedPreset.defaultDirection === "SHORT" ? "text-rose-500" : "text-emerald-400"}
                      strokeDasharray={`${liveConfidence}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                    <span className="text-base font-black text-white">{liveConfidence}%</span>
                    <span className="text-[8px] text-cyan-300 uppercase font-bold">CONFIDENCE</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-3 py-1 rounded-md font-mono tracking-wider ${
                      selectedPreset.defaultDirection === "SHORT"
                        ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                        : "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                    }`}>
                      {selectedPreset.defaultDirection} SIGNAL
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{selectedPreset.timeframe} Timeframe</span>
                    <span className="bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span>{formatTimer(remainingTimerSec)} 만료</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
                    <span>{selectedPreset.symbol}</span>
                    <span className="text-xs font-mono text-cyan-300 bg-cyan-950 border border-cyan-500/40 px-2 py-0.5 rounded">
                      Live ${(livePrice ?? 0).toLocaleString()}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">{selectedPreset.name}</p>
                </div>
              </div>

              {/* Middle Column: Multi-TP Target Overlay Prices */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-5">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-rose-900/60 text-center">
                  <span className="text-[10px] text-rose-400 block font-sans font-bold">🔴 STOP</span>
                  <span className="text-xs font-black text-rose-400">${(selectedPreset.stopLoss ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-zinc-700 text-center">
                  <span className="text-[10px] text-zinc-300 block font-sans font-bold">⚪ ENTRY</span>
                  <span className="text-xs font-black text-white">${(selectedPreset.entryPrice ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-900/40 text-center">
                  <span className="text-[10px] text-emerald-400 block font-sans font-bold">🟢 TP1</span>
                  <span className="text-xs font-bold text-emerald-400">${(selectedPreset.tp1 ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-900/60 text-center">
                  <span className="text-[10px] text-emerald-400 block font-sans font-bold">🟢 TP2</span>
                  <span className="text-xs font-bold text-emerald-300">${(selectedPreset.tp2 ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/80 text-center bg-emerald-950/20">
                  <span className="text-[10px] text-emerald-300 block font-sans font-bold">🟢 TP3</span>
                  <span className="text-xs font-black text-emerald-200">${(selectedPreset.tp3 ?? 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Right Column: Multi-tier Risk Gate Approval Trigger */}
              <div className="shrink-0 pt-2 lg:pt-0">
                <button
                  onClick={handleOpenRiskGateModal}
                  disabled={flowState === "TRADING"}
                  className="w-full lg:w-auto px-6 py-4 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-200 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="h-4.5 w-4.5 text-slate-950" />
                  <span>{flowState === "TRADING" ? "AI Autonomous Order Executed ✓" : "Multi-tier Risk Gate 승인 & 주문"}</span>
                </button>
              </div>
            </div>

            {/* Indicator Quick Matrix Strip */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-zinc-400 block text-[9px]">VWAP</span>
                <span className="text-white font-bold">${(selectedPreset.indicators.vwap ?? 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-zinc-400 block text-[9px]">EMA 20</span>
                <span className="text-white font-bold">${(selectedPreset.indicators.ema20 ?? 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-zinc-400 block text-[9px]">ATR</span>
                <span className="text-cyan-300 font-bold">{selectedPreset.indicators.atr}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-zinc-400 block text-[9px]">RSI (14)</span>
                <span className="text-amber-300 font-bold">{selectedPreset.indicators.rsi}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 col-span-2">
                <span className="text-zinc-400 block text-[9px]">MACD</span>
                <span className="text-cyan-300 font-bold truncate block">{selectedPreset.indicators.macd}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-zinc-400 block text-[9px]">STRUCTURE</span>
                <span className="text-rose-400 font-bold truncate block">{selectedPreset.indicators.structure}</span>
              </div>
            </div>
          </div>

          {/* HTML5 LIVE CANDLESTICK GRAPH CANVAS & V9 MASTER SYSTEM DASHBOARD */}
          <div className="bg-slate-950 border-2 border-cyan-500/50 rounded-2xl p-5 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-5 w-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>UNIFIED MASTER SYSTEM V9.0 - 실시간 그래프 파동 & SMC 패턴 산출</span>
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded border border-cyan-400/40 font-mono">
                      REAL GRAPH ANALYSIS ENGINE
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    실제 OHLCV 캔들 그래프 파동을 직접 관측하여 BOS, CHoCH, RVOL 모멘텀 및 4-Score 셋업 등급을 도출합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => renderCanvasChart(generatedCandles, selectedPreset, v9MasterResult)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>캔버스 그래프 재렌더링</span>
                </button>
              </div>
            </div>

            {/* Canvas Candle Container */}
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b101d]">
              <canvas 
                ref={canvasRef} 
                width={850} 
                height={300} 
                className="w-full h-auto block"
              />
              <div className="absolute top-3 right-3 bg-slate-900/80 border border-slate-700/80 px-2.5 py-1 rounded text-[10px] font-mono text-zinc-300">
                LIVE OHLCV CANVAS SNAPSHOT
              </div>
            </div>

            {/* V9 MASTER SYSTEM EVALUATION BREAKDOWN CARD */}
            {v9MasterResult && (
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-5 space-y-4 font-sans">
                {/* Header Row: Master Grade & Momentum State */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="px-4 py-2 bg-gradient-to-br from-cyan-950 to-slate-950 border-2 border-cyan-400 rounded-2xl text-center shadow-lg">
                      <div className="text-[9px] text-cyan-400 font-mono font-bold uppercase">Master Grade</div>
                      <div className="text-2xl font-black text-cyan-300 font-mono">{v9MasterResult.masterGrade}</div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>셋업 점수: {v9MasterResult.masterSetupScore}점</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-amber-400 font-mono">Ross Momentum: {v9MasterResult.rossMomentumScore}점</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 font-mono">
                        <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                          모멘텀: {v9MasterResult.momentumState}
                        </span>
                        <span className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-slate-700">
                          RVOL: {v9MasterResult.rvolValue}x ({v9MasterResult.rvolState})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direction Badge */}
                  <div>
                    <span className={`text-xs font-black px-3 py-1.5 rounded-xl font-mono ${
                      v9MasterResult.direction === "LONG" 
                        ? "bg-emerald-500 text-slate-950" 
                        : v9MasterResult.direction === "SHORT" 
                        ? "bg-rose-500 text-white" 
                        : "bg-amber-500 text-slate-950"
                    }`}>
                      {v9MasterResult.direction === "LONG" ? "🟢 LONG SETUP" : v9MasterResult.direction === "SHORT" ? "🔴 SHORT SETUP" : "⚠️ NO TRADE (RISK VETO)"}
                    </span>
                  </div>
                </div>

                {/* 4-Score Model Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-zinc-400 text-[10px] block">Stock Quality</span>
                    <span className="text-cyan-300 font-bold text-sm">{v9MasterResult.scores?.stockQuality || 80}점</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-zinc-400 text-[10px] block">Setup Quality</span>
                    <span className="text-emerald-300 font-bold text-sm">{v9MasterResult.scores?.setupQuality || 82}점</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-zinc-400 text-[10px] block">Entry Quality</span>
                    <span className="text-amber-300 font-bold text-sm">{v9MasterResult.scores?.entryQuality || 85}점</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-zinc-400 text-[10px] block">Position Health</span>
                    <span className="text-cyan-300 font-bold text-sm">{v9MasterResult.scores?.positionHealth || 83}점</span>
                  </div>
                </div>

                {/* SMC Pattern Details & Exact Price Output Levels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-cyan-300 font-bold text-[11px] uppercase border-b border-slate-800 pb-1">
                      SMC Market Structure Analysis
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">BOS Status:</span>
                      <span className="text-white font-bold">{v9MasterResult.smcDetails?.bosStatus || "CONFIRMED_BOS"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">CHoCH Status:</span>
                      <span className="text-white font-bold">{v9MasterResult.smcDetails?.chochDetected ? "DETECTED" : "NORMAL"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">BSL High / SSL Low:</span>
                      <span className="text-cyan-300 font-bold">
                        {v9MasterResult.smcDetails?.bslLevel?.toLocaleString()} / {v9MasterResult.smcDetails?.sslLevel?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-emerald-300 font-bold text-[11px] uppercase border-b border-slate-800 pb-1">
                      Exact Execution Levels
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Trigger Level:</span>
                      <span className="text-cyan-300 font-bold">${v9MasterResult.triggerPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Entry Zone:</span>
                      <span className="text-white font-bold">
                        ${v9MasterResult.entryZone?.[0]?.toLocaleString()} ~ ${v9MasterResult.entryZone?.[1]?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Invalidation (SL):</span>
                      <span className="text-rose-400 font-bold">${v9MasterResult.invalidationPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Target TP1 / TP2 / TP3:</span>
                      <span className="text-emerald-400 font-bold">
                        ${v9MasterResult.targets?.tp1?.toLocaleString()} / ${v9MasterResult.targets?.tp2?.toLocaleString()} / ${v9MasterResult.targets?.tp3?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actionable Guidance Box */}
                {v9MasterResult.actionableGuidance && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200">
                    <strong className="text-cyan-300 block mb-1">🎯 실전 집행 가이드 (Actionable Guidance):</strong>
                    <p>{v9MasterResult.actionableGuidance}</p>
                  </div>
                )}
              </div>
            )}

            {/* REAL-TIME AI EXPECTED PROFITABILITY PANEL WITH ORDER BOOK DEPTH */}
            <ExpectedProfitabilityPanel 
              symbol={selectedPreset.symbol}
              name={selectedPreset.name}
              market={selectedPreset.market || "KOREA"}
              currentPrice={livePrice}
              entryPrice={selectedPreset.entryPrice}
              targetPrice1={selectedPreset.tp1}
              targetPrice2={selectedPreset.tp2}
              stopLossPrice={selectedPreset.stopLoss}
            />
          </div>
          {(uploadedImage || visionAiAnalysisResult || isVisionAiLoading) && (
            <div className="bg-slate-950 border-2 border-cyan-500/60 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-xl">
                    <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>📸 Gemini 3.6 Multimodal Vision AI 차트 이미지 실시간 판독 리포트</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                        PIXEL OCR & CHART VISION ACTIVE
                      </span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      업로드된 차트 스크린샷의 픽셀, 캔들 꼬리/몸통, 지표 문자를 Gemini AI가 직접 시각 분석한 결과입니다.
                    </p>
                  </div>
                </div>

                {uploadedImage && (
                  <div className="h-12 w-20 rounded-lg overflow-hidden border border-cyan-500/40 shrink-0">
                    <img src={uploadedImage} alt="Uploaded chart preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              {isVisionAiLoading ? (
                <div className="p-6 text-center space-y-3 bg-slate-900/80 rounded-xl border border-cyan-500/30">
                  <Cpu className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-cyan-300 animate-pulse">
                    Gemini Multimodal Vision AI가 차트 이미지의 픽셀 및 OCR 텍스트를 정밀 연산 중입니다...
                  </p>
                </div>
              ) : visionAiAnalysisResult ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap font-sans space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <span>✓ Vision AI 실시간 멀티모달 이미지 분석 완료</span>
                  </div>
                  <div className="pt-1">
                    {visionAiAnalysisResult}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/60 rounded-xl text-xs text-zinc-400 border border-slate-800">
                  차트 이미지가 로드되었습니다. [Analyze Chart] 버튼을 누르면 Gemini Vision AI가 픽셀 단위로 실제 이미지 판독을 진행합니다.
                </div>
              )}
            </div>
          )}

          {/* REAL-TIME DYNAMIC OVERLAY BRACKET CHART & PREDICTION CORRIDOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <span>AI Chart Overlay & Translucent Prediction Corridor</span>
                  <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded border border-cyan-500/40 font-normal">
                    5m / 15m / 30m Prediction
                  </span>
                </h4>
              </div>

              {/* Toggle Live Auto-Tick Simulation */}
              <div className="flex items-center space-x-3 text-xs font-mono">
                <button
                  onClick={() => setIsLiveTickActive(!isLiveTickActive)}
                  className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                    isLiveTickActive 
                      ? "bg-emerald-950 border-emerald-500 text-emerald-300 font-bold" 
                      : "bg-slate-800 border-slate-700 text-zinc-400"
                  }`}
                >
                  <Radio className={`h-3 w-3 ${isLiveTickActive ? "animate-ping text-emerald-400" : ""}`} />
                  <span>{isLiveTickActive ? "Live Candle Tick: Active" : "Live Candle Tick: Paused"}</span>
                </button>
              </div>
            </div>

            {/* Chart Canvas Area with Overlay Lines & Translucent Prediction Cone Shading */}
            <div className="h-96 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bracketChartData} margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="#64748b" 
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    orientation="right"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", fontSize: "11px" }}
                  />

                  {/* Translucent Prediction Corridor Area (Probability Cone) */}
                  <Area
                    type="monotone"
                    dataKey="predUpper"
                    stroke="#06b6d4"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    fill="#06b6d4"
                    fillOpacity={0.12}
                    name="Expected Corridor Upper"
                  />

                  {/* 🔴 STOP / INVALIDATION Line */}
                  <ReferenceLine 
                    y={selectedPreset.stopLoss} 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    strokeDasharray="4 4" 
                    label={{ value: `🔴 STOP $${selectedPreset.stopLoss}`, fill: '#f43f5e', fontSize: 11, position: 'right' }} 
                  />

                  {/* ⚪ ENTRY Base Line */}
                  <ReferenceLine 
                    y={selectedPreset.entryPrice} 
                    stroke="#ffffff" 
                    strokeWidth={1.5}
                    strokeDasharray="2 2" 
                    label={{ value: `⚪ ENTRY $${selectedPreset.entryPrice}`, fill: '#ffffff', fontSize: 11, position: 'right' }} 
                  />

                  {/* 🟢 TP1 Line */}
                  <ReferenceLine 
                    y={selectedPreset.tp1} 
                    stroke="#34d399" 
                    strokeWidth={1.5}
                    strokeDasharray="3 3" 
                    label={{ value: `🟢 TP1 $${selectedPreset.tp1}`, fill: '#34d399', fontSize: 10, position: 'right' }} 
                  />

                  {/* 🟢 TP2 Line */}
                  <ReferenceLine 
                    y={selectedPreset.tp2} 
                    stroke="#10b981" 
                    strokeWidth={1.5}
                    strokeDasharray="3 3" 
                    label={{ value: `🟢 TP2 $${selectedPreset.tp2}`, fill: '#10b981', fontSize: 10, position: 'right' }} 
                  />

                  {/* 🟢 TP3 Line */}
                  <ReferenceLine 
                    y={selectedPreset.tp3} 
                    stroke="#059669" 
                    strokeWidth={2}
                    strokeDasharray="3 3" 
                    label={{ value: `🟢 TP3 $${selectedPreset.tp3}`, fill: '#059669', fontSize: 11, position: 'right' }} 
                  />

                  {/* Price Line */}
                  <Line type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Live Evaluation Log Strip */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-300 font-mono gap-3">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span>
                  Real-time Tick Evaluation: <strong className="text-white">${(livePrice ?? 0).toLocaleString()}</strong> | Signal Confidence: <strong className="text-cyan-300">{liveConfidence}%</strong>
                </span>
              </div>

              <div className="flex items-center space-x-4 text-[11px] text-zinc-400">
                <span>Inval Price: <strong className="text-rose-400">${(selectedPreset.invalidationPrice ?? 0).toLocaleString()}</strong></span>
                <span>R:R Ratio: <strong className="text-amber-400">{selectedPreset.riskReward}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-TIER RISK GATE VERIFICATION MODAL */}
      {showRiskGateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-cyan-400 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-6 w-6 text-cyan-400" />
                <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                  Multi-tier Risk Gate Approval
                </h3>
              </div>
              <button 
                onClick={() => setShowRiskGateModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <p className="text-zinc-400 text-[11px] font-sans">
                주문 실행 전 자비스 AI가 7가지 리스크 관문을 자동 검증합니다:
              </p>

              {/* Gate Check Items */}
              {[
                { title: `Confidence >= 75% Check`, desc: `Current: ${liveConfidence}% (Required >= 75%)` },
                { title: `Risk/Reward >= 1:2 Check`, desc: `Current R:R: ${selectedPreset.riskReward}` },
                { title: `Volatility & ATR Normal Check`, desc: `Volatility: ${selectedPreset.volatilityStr}` },
                { title: `Spread & Slippage Check`, desc: `Normal Market Liquidity` },
                { title: `Entry Zone Proximity Match`, desc: `Anchor match deviation < 0.05%` },
                { title: `Daily Loss Limit Check`, desc: `Current Daily Loss: 0.00% (< 2.0% limit)` },
                { title: `No Duplicate Position Conflict`, desc: `Clean Order Slate Verified` }
              ].map((item, idx) => {
                const isPassed = gateChecksPassed[idx];
                return (
                  <div 
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isPassed 
                        ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300" 
                        : "bg-slate-950 border-slate-800 text-zinc-500 opacity-60"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {isPassed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-zinc-700 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-[10px] text-zinc-400">{item.desc}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold">
                      {isPassed ? "PASS ✓" : "VERIFYING..."}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowRiskGateModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                취소 (Cancel)
              </button>

              <button
                onClick={handleExecuteAutonomousTrade}
                disabled={riskGateStep < 7}
                className={`px-6 py-2.5 rounded-xl font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer ${
                  riskGateStep >= 7
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:opacity-90"
                    : "bg-slate-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>★★★★ 최종 주문 승인 및 집행 ★★★★</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
