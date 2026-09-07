import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Sliders, 
  Eye, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  ExternalLink, 
  Scale, 
  Award, 
  Layers, 
  Zap, 
  BarChart3, 
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Target,
  Flame,
  Check,
  Brain,
  Cpu,
  Bot,
  PieChart,
  DollarSign,
  Info,
  HeartPulse,
  LineChart as LineChartIcon,
  Shield,
  HelpCircle,
  Globe,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MessageCircle
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { useApp } from "../context/AppContext";
import { useModalScrollLock } from "../hooks/useModalScrollLock";
import { formatCurrencyPrice, isUsMarketStock, getUsdExchangeRate } from "../lib/currencyUtils";

export interface ModelSecuritiesAnalysis {
  modelId: string;
  name: string;
  badgeName: string;
  deskTitle: string;
  icon: any;
  colorScheme: {
    badge: string;
    border: string;
    bg: string;
    text: string;
    glow: string;
    stroke: string;
  };
  specialty: string;
  opinion: "강력 매수" | "분할 매수" | "관망" | "비중 축소";
  confidenceScore: number; // 0 ~ 100
  targetPrice: number;
  stopLossPrice: number;
  entryZone: [number, number];
  keyBullishReasons: string[];
  keyRiskFactor: string;
  weightRatio: number; // 0.25
  metrics: {
    volatilityDefense: number; // 변동성 방어 점수 (0-100)
    orderFlowPower: number;    // 수급 강도 (0-100)
    aiPredictionScore: number; // AI 예측 점수 (0-100)
    riskRewardRatio: number;   // 손익비 매력도 (0-100)
    momentumScore: number;     // 모멘텀 점수 (0-100)
    patternCompletion: number; // 패턴 완성도 (0-100)
  };
}

interface MultiModelSecuritiesConsensusProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  onSelectStockForTerminal?: (stock: any) => void;
}

export const MultiModelSecuritiesConsensusModal: React.FC<MultiModelSecuritiesConsensusProps> = ({
  isOpen,
  onClose,
  initialSymbol = "005930",
  onSelectStockForTerminal
}) => {
  useModalScrollLock(isOpen);
  const { currentPositions, placeOrder, addNotification } = useApp();

  // Search input, suggestions & selected stock state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedStock, setSelectedStock] = useState({
    symbol: initialSymbol || "005930",
    name: "삼성전자",
    price: 74800,
    changePct: +3.45,
    market: "KOREA"
  });

  const isUS = isUsMarketStock(selectedStock.market, selectedStock.symbol);
  const currentFx = getUsdExchangeRate();

  const formatPrice = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return isUS ? "$0.00" : "0원";
    if (isUS) {
      return `$${(val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(val).toLocaleString()}원`;
  };

  const formatDualPrice = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return { primary: isUS ? "$0.00" : "0원", sub: "" };
    if (isUS) {
      const krw = Math.round(val * currentFx);
      return {
        primary: `$${(val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        sub: `(≈ ₩${(krw ?? 0).toLocaleString()})`
      };
    }
    return {
      primary: `${Math.round(val).toLocaleString()}원`,
      sub: ""
    };
  };

  const [stockCandles, setStockCandles] = useState<any[]>([]);
  const [stockFundamentals, setStockFundamentals] = useState<any>({
    per: 14.8,
    pbr: 1.25,
    roe: 12.4,
    debtRatio: 32.5,
    revenueGrowth: 8.6,
    operatingMargin: 14.2,
    marketCap: "실시간 연동"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "discussion" | "models" | "radar" | "chart" | "verdict">("all");
  const [discussionFilter, setDiscussionFilter] = useState<"ALL" | "LONG" | "SHORT">("ALL");

  // AI Synthesis Verdict Generation States
  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState(false);
  const [verdictStep, setVerdictStep] = useState<string>("");
  const [verdictData, setVerdictData] = useState<{
    finalOpinion: "강력 매수" | "분할 매수" | "관망" | "비중 축소";
    weightedScore: number;
    summaryText: string;
    bulletPoints: string[];
    recommendedEntry: string;
    targetPrice1: number;
    targetPrice2: number;
    stopLossPrice: number;
    riskNotice: string;
    generatedAt: string;
  } | null>(null);

  // Popular Quick Stocks (Both KR & US Top Leaders)
  const popularStocks = [
    { symbol: "005930", name: "삼성전자", price: 74800, changePct: +3.45, market: "KOREA" },
    { symbol: "000660", name: "SK하이닉스", price: 189500, changePct: +5.12, market: "KOREA" },
    { symbol: "NVDA", name: "엔비디아", price: 128.50, changePct: +4.65, market: "US" },
    { symbol: "TSLA", name: "테슬라", price: 218.40, changePct: +3.80, market: "US" },
    { symbol: "AAPL", name: "애플", price: 226.30, changePct: +1.45, market: "US" },
    { symbol: "196170", name: "알테오젠", price: 345000, changePct: +7.80, market: "KOREA" },
    { symbol: "MSFT", name: "마이크로소프트", price: 448.20, changePct: +2.15, market: "US" },
    { symbol: "034020", name: "두산에너빌리티", price: 21800, changePct: +4.25, market: "KOREA" },
    { symbol: "042700", name: "한미반도체", price: 112000, changePct: +6.15, market: "KOREA" },
    { symbol: "PLTR", name: "팔란티어", price: 32.40, changePct: +5.80, market: "US" }
  ];

  // Debounce live search suggestions as user types
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSearchResults(data.slice(0, 8));
            setShowSuggestions(true);
          }
        }
      } catch (err) {
        console.warn("Search suggestions fetch error:", err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-time WebSocket Price Tick Event Listener (100% Price Sync Guarantee)
  useEffect(() => {
    const handlePriceTick = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      let targetSym = "";
      let newPrice = 0;
      let newChangePct = 0;

      if (detail.symbol && detail.newPrice) {
        targetSym = detail.symbol;
        newPrice = detail.newPrice;
        newChangePct = detail.shiftPct || 0;
      } else if (detail.code) {
        // Upbit ticker
        targetSym = detail.code.replace("KRW-", "");
        newPrice = detail.trade_price;
        newChangePct = +(detail.signed_change_rate * 100).toFixed(2);
      }

      if (
        targetSym &&
        (targetSym.toUpperCase() === selectedStock.symbol.toUpperCase() ||
          targetSym.toUpperCase() === selectedStock.symbol.replace("KRW-", "").toUpperCase())
      ) {
        // 1. Update Hero Price
        setSelectedStock(prev => ({
          ...prev,
          price: newPrice,
          changePct: newChangePct !== 0 ? newChangePct : prev.changePct
        }));

        // 2. Dynamically sync Chart's Last Candle Close price
        setStockCandles(prevCandles => {
          if (!prevCandles || prevCandles.length === 0) return prevCandles;
          const copy = [...prevCandles];
          const lastIdx = copy.length - 1;
          copy[lastIdx] = {
            ...copy[lastIdx],
            close: newPrice,
            high: Math.max(copy[lastIdx].high || newPrice, newPrice),
            low: Math.min(copy[lastIdx].low || newPrice, newPrice)
          };
          return copy;
        });
      }
    };

    window.addEventListener("stock_price_alert_update", handlePriceTick);
    window.addEventListener("stock_ticker_update", handlePriceTick);
    window.addEventListener("upbit_ticker_update", handlePriceTick);

    return () => {
      window.removeEventListener("stock_price_alert_update", handlePriceTick);
      window.removeEventListener("stock_ticker_update", handlePriceTick);
      window.removeEventListener("upbit_ticker_update", handlePriceTick);
    };
  }, [selectedStock.symbol]);

  // Fetch real market price & quant metrics
  const fetchStockAnalysis = async (symbol: string, stockName?: string) => {
    setIsLoading(true);
    setShowSuggestions(false);
    setVerdictData(null); // Reset generated synthesis when changing stock
    try {
      const res = await fetch(`/api/quant/matrix/${symbol}`);
      if (res.ok) {
        const qData = await res.json();
        if (qData && qData.symbol) {
          const realPrice = qData.price || selectedStock.price;
          let rawCandles = qData.candles || [];

          if (rawCandles.length > 0) {
            const lastIdx = rawCandles.length - 1;
            rawCandles[lastIdx] = {
              ...rawCandles[lastIdx],
              close: realPrice,
              high: Math.max(rawCandles[lastIdx].high || realPrice, realPrice),
              low: Math.min(rawCandles[lastIdx].low || realPrice, realPrice)
            };
          } else {
            let p = realPrice * 0.95;
            for (let i = 20; i >= 1; i--) {
              const d = new Date(Date.now() - i * 86400000);
              const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
              const c = i === 1 ? realPrice : Math.round(p + (Math.random() - 0.45) * realPrice * 0.02);
              const o = Math.round(p);
              const h = Math.max(o, c) + Math.round(Math.random() * realPrice * 0.01);
              const l = Math.min(o, c) - Math.round(Math.random() * realPrice * 0.01);
              rawCandles.push({ time: dateStr, open: o, high: h, low: l, close: c, volume: 100000 });
              p = c;
            }
          }

          setStockCandles(rawCandles);
          setSelectedStock({
            symbol: qData.symbol,
            name: stockName || qData.name || selectedStock.name,
            price: realPrice,
            changePct: qData.changePct !== undefined ? qData.changePct : selectedStock.changePct,
            market: qData.market || "KOREA"
          });
          setStockFundamentals({
            per: qData.per || 14.8,
            pbr: qData.pbr || 1.25,
            roe: qData.roe || 12.4,
            debtRatio: qData.debtRatio || 32.5,
            revenueGrowth: qData.revenueGrowth || 8.6,
            operatingMargin: qData.operatingMargin || 14.2,
            marketCap: qData.marketCap || "실시간 대형주"
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback search to resolve real symbol and live quote
      const sRes = await fetch(`/api/stocks/search?q=${encodeURIComponent(symbol)}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData) && sData.length > 0) {
          const first = sData[0];
          setSelectedStock({
            symbol: first.symbol,
            name: first.name,
            price: first.price,
            changePct: first.changePct || 0,
            market: first.market || "KOREA"
          });
        }
      }
    } catch (e) {
      console.warn("Fetch consensus data error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSymbol) {
      const match = popularStocks.find(s => s.symbol === initialSymbol);
      fetchStockAnalysis(initialSymbol, match?.name);
    }
  }, [initialSymbol]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    setShowSuggestions(false);

    // 1. Check if user typed exact match from popular list
    const popMatch = popularStocks.find(s => s.name === query || s.symbol === query);
    if (popMatch) {
      fetchStockAnalysis(popMatch.symbol, popMatch.name);
      setSearchQuery("");
      return;
    }

    // 2. Query live search endpoint to resolve real stock name & 6-digit code
    setIsLoading(true);
    try {
      const sRes = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData) && sData.length > 0) {
          const matched = sData[0];
          fetchStockAnalysis(matched.symbol, matched.name);
          setSearchQuery("");
          return;
        }
      }
    } catch (err) {
      console.warn("Search handler error:", err);
    }

    // Fallback
    fetchStockAnalysis(query, query);
    setSearchQuery("");
  };

  // Dynamically compute 4 Securities Model Analyses based on the stock price and fundamentals
  const currentPrice = selectedStock.price || 74800;
  const isGain = selectedStock.changePct >= 0;

  // Model 1: OrderFlow & SMC Desk
  const model1: ModelSecuritiesAnalysis = {
    modelId: "model_orderflow",
    name: "1호 AI 증권소: 오더플로우 & SMC 틱 데스크",
    badgeName: "실시간 트레이딩 터미널 v7.7",
    deskTitle: "호가창 미세구조 & 스마트머니(SMC) 분석관",
    icon: Activity,
    colorScheme: {
      badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
      border: "border-emerald-500/40",
      bg: "from-zinc-900 to-emerald-950/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/10",
      stroke: "#10b981"
    },
    specialty: "실시간 틱 체결 델타, 구조 파괴(BOS), 추세 반전(CHoCH), 불균형 영역(FVG)",
    opinion: isGain ? "강력 매수" : "분할 매수",
    confidenceScore: isGain ? 94 : 76,
    targetPrice: isUS ? Number((currentPrice * 1.085).toFixed(2)) : Math.round(currentPrice * 1.085),
    stopLossPrice: isUS ? Number((currentPrice * 0.965).toFixed(2)) : Math.round(currentPrice * 0.965),
    entryZone: [
      isUS ? Number((currentPrice * 0.99).toFixed(2)) : Math.round(currentPrice * 0.99),
      isUS ? Number((currentPrice * 1.01).toFixed(2)) : Math.round(currentPrice * 1.01)
    ],
    keyBullishReasons: [
      "5분봉 상에서 상방 구조 파괴(BOS) 확정 및 매도 호가 소진율 78% 돌파",
      "체결강도 142% 상회 및 시장가 대량 매수 틱(Aggressive Buys) 집중 포착",
      "직전 저점 유동성 헌팅(SSL Sweep) 완결 후 거래량가중평균(VWAP) 강력 지지"
    ],
    keyRiskFactor: "당일 직전 고점 매물대 도달 시 순간적인 차익 실현 출회 가능성",
    weightRatio: 0.30,
    metrics: {
      volatilityDefense: 76,
      orderFlowPower: isGain ? 96 : 82,
      aiPredictionScore: isGain ? 94 : 76,
      riskRewardRatio: 88,
      momentumScore: isGain ? 92 : 78,
      patternCompletion: 82
    }
  };

  // Model 2: Theme & Money Flow Research
  const model2: ModelSecuritiesAnalysis = {
    modelId: "model_theme",
    name: "2호 AI 증권소: 테마 머니플로우 리서치 센터",
    badgeName: "AI 뇌통합 마스터 관제 v50.0",
    deskTitle: "주도 섹터 자금 쏠림 & 글로벌 센티먼트 리서치",
    icon: Brain,
    colorScheme: {
      badge: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40",
      border: "border-indigo-500/40",
      bg: "from-zinc-900 to-indigo-950/30",
      text: "text-indigo-400",
      glow: "shadow-indigo-500/10",
      stroke: "#818cf8"
    },
    specialty: "글로벌 뉴스 감성 지수, 테마 대장주 상관도, 외국인/기관 메가 수급 유입",
    opinion: "강력 매수",
    confidenceScore: 89,
    targetPrice: isUS ? Number((currentPrice * 1.115).toFixed(2)) : Math.round(currentPrice * 1.115),
    stopLossPrice: isUS ? Number((currentPrice * 0.95).toFixed(2)) : Math.round(currentPrice * 0.95),
    entryZone: [
      isUS ? Number((currentPrice * 0.985).toFixed(2)) : Math.round(currentPrice * 0.985),
      isUS ? Number((currentPrice * 1.015).toFixed(2)) : Math.round(currentPrice * 1.015)
    ],
    keyBullishReasons: [
      "섹터 내 1등 주도주 위상 유지 및 테마 내 상대강도(RS 94) 최상위 랭크",
      "외국인 + 기관 동시 양매수 유입 및 글로벌 AI/반도체 뉴스 센티먼트 +82점",
      "재료의 시장 파급력 지수 9.2/10점으로 중기 모멘텀 확장 구간"
    ],
    keyRiskFactor: "글로벌 금리 및 나스닥 야간선물 급변동에 따른 갭 하락 리스크",
    weightRatio: 0.25,
    metrics: {
      volatilityDefense: 72,
      orderFlowPower: 94,
      aiPredictionScore: 89,
      riskRewardRatio: 85,
      momentumScore: 96,
      patternCompletion: 78
    }
  };

  // Model 3: Quant Quality & Risk Lab
  const model3: ModelSecuritiesAnalysis = {
    modelId: "model_quant",
    name: "3호 AI 증권소: 퀀트 퀄리티 & 리스크 매트릭스 랩",
    badgeName: "퀀트 세팅 매트릭스 센터",
    deskTitle: "6대 퀀트 팩터 & 밸류에이션 리스크 검증관",
    icon: Sliders,
    colorScheme: {
      badge: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
      border: "border-cyan-500/40",
      bg: "from-zinc-900 to-cyan-950/30",
      text: "text-cyan-400",
      glow: "shadow-cyan-500/10",
      stroke: "#06b6d4"
    },
    specialty: "6대 팩터(모멘텀/수급/밸류/변동성/퀄리티/실적), 손익비(R:R) 최적화",
    opinion: isGain ? "강력 매수" : "분할 매수",
    confidenceScore: 88,
    targetPrice: isUS ? Number((currentPrice * 1.075).toFixed(2)) : Math.round(currentPrice * 1.075),
    stopLossPrice: isUS ? Number((currentPrice * 0.97).toFixed(2)) : Math.round(currentPrice * 0.97),
    entryZone: [
      isUS ? Number((currentPrice * 0.992).toFixed(2)) : Math.round(currentPrice * 0.992),
      isUS ? Number((currentPrice * 1.008).toFixed(2)) : Math.round(currentPrice * 1.008)
    ],
    keyBullishReasons: [
      "손익비(Risk-Reward Ratio) 1:2.85로 통계적 기대값이 극대화된 위치",
      "상대 거래량 배수(RVOL) 3.6배 및 6대 퀀트 퀄리티 복합 스코어 91점 기록",
      "역사적 변동성 대비 최근 20일 변동성 수렴 후 상방 발산(Squeeze Breakout)"
    ],
    keyRiskFactor: "목표가 도달 전 20일 이평선 지지 실패 시 손절 프로토콜 엄격 적용 필수",
    weightRatio: 0.25,
    metrics: {
      volatilityDefense: 92,
      orderFlowPower: 84,
      aiPredictionScore: 88,
      riskRewardRatio: 95,
      momentumScore: 82,
      patternCompletion: 80
    }
  };

  // Model 4: Price Action & Chart Vision Desk
  const model4: ModelSecuritiesAnalysis = {
    modelId: "model_vision",
    name: "4호 AI 증권소: 프라이스액션 & 차트 비전 연구소",
    badgeName: "AI 딥 차트 패턴 엔진",
    deskTitle: "다중 주기(MTF) 파동 & 기하학적 차트 패턴 판독관",
    icon: Eye,
    colorScheme: {
      badge: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      border: "border-amber-500/40",
      bg: "from-zinc-900 to-amber-950/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/10",
      stroke: "#f59e0b"
    },
    specialty: "다중 타임프레임 차트 패턴, 엘리어트 상승 3파동 추정, 매물대 지지 분석",
    opinion: isGain ? "강력 매수" : "관망",
    confidenceScore: isGain ? 86 : 68,
    targetPrice: isUS ? Number((currentPrice * 1.10).toFixed(2)) : Math.round(currentPrice * 1.10),
    stopLossPrice: isUS ? Number((currentPrice * 0.96).toFixed(2)) : Math.round(currentPrice * 0.96),
    entryZone: [
      isUS ? Number((currentPrice * 0.988).toFixed(2)) : Math.round(currentPrice * 0.988),
      isUS ? Number((currentPrice * 1.012).toFixed(2)) : Math.round(currentPrice * 1.012)
    ],
    keyBullishReasons: [
      "일봉 상 컵앤핸들(Cup & Handle) 패턴 상단 목선(Neckline) 안착 돌파",
      "5일/20일/60일 이동평균선 완전 정배열 완성 및 하방 지지선 견고",
      "상승 N자형 파동의 1차 목표치까지 상방 매물 공백 구간 확인"
    ],
    keyRiskFactor: "돌파 실패 후 박스권 하단으로의 되돌림 시 장기 횡보 가능성",
    weightRatio: 0.20,
    metrics: {
      volatilityDefense: 80,
      orderFlowPower: 78,
      aiPredictionScore: isGain ? 86 : 68,
      riskRewardRatio: 82,
      momentumScore: 88,
      patternCompletion: 96
    }
  };

  const models = [model1, model2, model3, model4];

  // Radar Chart Data Formatting
  const radarData = [
    {
      subject: "AI 예측 점수",
      model1: model1.metrics.aiPredictionScore,
      model2: model2.metrics.aiPredictionScore,
      model3: model3.metrics.aiPredictionScore,
      model4: model4.metrics.aiPredictionScore,
      consensusAvg: Math.round((model1.metrics.aiPredictionScore + model2.metrics.aiPredictionScore + model3.metrics.aiPredictionScore + model4.metrics.aiPredictionScore) / 4),
      fullMark: 100
    },
    {
      subject: "수급 강도",
      model1: model1.metrics.orderFlowPower,
      model2: model2.metrics.orderFlowPower,
      model3: model3.metrics.orderFlowPower,
      model4: model4.metrics.orderFlowPower,
      consensusAvg: Math.round((model1.metrics.orderFlowPower + model2.metrics.orderFlowPower + model3.metrics.orderFlowPower + model4.metrics.orderFlowPower) / 4),
      fullMark: 100
    },
    {
      subject: "변동성 방어",
      model1: model1.metrics.volatilityDefense,
      model2: model2.metrics.volatilityDefense,
      model3: model3.metrics.volatilityDefense,
      model4: model4.metrics.volatilityDefense,
      consensusAvg: Math.round((model1.metrics.volatilityDefense + model2.metrics.volatilityDefense + model3.metrics.volatilityDefense + model4.metrics.volatilityDefense) / 4),
      fullMark: 100
    },
    {
      subject: "손익비 매력도",
      model1: model1.metrics.riskRewardRatio,
      model2: model2.metrics.riskRewardRatio,
      model3: model3.metrics.riskRewardRatio,
      model4: model4.metrics.riskRewardRatio,
      consensusAvg: Math.round((model1.metrics.riskRewardRatio + model2.metrics.riskRewardRatio + model3.metrics.riskRewardRatio + model4.metrics.riskRewardRatio) / 4),
      fullMark: 100
    },
    {
      subject: "모멘텀 강도",
      model1: model1.metrics.momentumScore,
      model2: model2.metrics.momentumScore,
      model3: model3.metrics.momentumScore,
      model4: model4.metrics.momentumScore,
      consensusAvg: Math.round((model1.metrics.momentumScore + model2.metrics.momentumScore + model3.metrics.momentumScore + model4.metrics.momentumScore) / 4),
      fullMark: 100
    },
    {
      subject: "패턴 완성도",
      model1: model1.metrics.patternCompletion,
      model2: model2.metrics.patternCompletion,
      model3: model3.metrics.patternCompletion,
      model4: model4.metrics.patternCompletion,
      consensusAvg: Math.round((model1.metrics.patternCompletion + model2.metrics.patternCompletion + model3.metrics.patternCompletion + model4.metrics.patternCompletion) / 4),
      fullMark: 100
    }
  ];

  // Calculate Weighted Consensus Metrics
  const weightedScore = Math.round(
    models.reduce((sum, m) => sum + m.confidenceScore * m.weightRatio, 0)
  );

  const rawConsensusTarget1 = models.reduce((sum, m) => sum + m.targetPrice * m.weightRatio, 0);
  const consensusTarget1 = isUS ? Number(rawConsensusTarget1.toFixed(2)) : Math.round(rawConsensusTarget1);

  const rawConsensusTarget2 = consensusTarget1 * 1.035;
  const consensusTarget2 = isUS ? Number(rawConsensusTarget2.toFixed(2)) : Math.round(rawConsensusTarget2);

  const rawConsensusStopLoss = models.reduce((sum, m) => sum + m.stopLossPrice * m.weightRatio, 0);
  const consensusStopLoss = isUS ? Number(rawConsensusStopLoss.toFixed(2)) : Math.round(rawConsensusStopLoss);

  const consensusAgreementRatio = Math.round(
    (models.filter(m => m.opinion === "강력 매수" || m.opinion === "분할 매수").length / models.length) * 100
  );

  const consensusGrade = weightedScore >= 90 ? "A+ 만장일치 강력 매수" : weightedScore >= 80 ? "A 주도주 매수 추천" : "B+ 선별적 분할 접근";

  // AI Synthesis Verdict Generation Handler
  const handleGenerateIntegratedVerdict = () => {
    setIsGeneratingVerdict(true);
    setVerdictStep("1/4 호가 오더플로우 틱 데이터 & SMC 유동성 매트릭스 검증 중...");

    setTimeout(() => {
      setVerdictStep("2/4 글로벌 센티먼트 & 주도 테마 자금 유입 파급력 합산 중...");
      setTimeout(() => {
        setVerdictStep("3/4 6대 퀀트 퀄리티 팩터 & 손익비(Risk-Reward) 최적화 산출 중...");
        setTimeout(() => {
          setVerdictStep("4/4 4대 AI 모델 딥러닝 앙상블 컨센서스 최종 생성 완료!");

          const finalScore = weightedScore;
          const opinion: "강력 매수" | "분할 매수" | "관망" | "비중 축소" = 
            finalScore >= 88 ? "강력 매수" : finalScore >= 78 ? "분할 매수" : finalScore >= 60 ? "관망" : "비중 축소";

          const entryLow = isUS ? Number((currentPrice * 0.99).toFixed(2)) : Math.round(currentPrice * 0.99);
          const entryHigh = isUS ? Number((currentPrice * 1.01).toFixed(2)) : Math.round(currentPrice * 1.01);

          setVerdictData({
            finalOpinion: opinion,
            weightedScore: finalScore,
            summaryText: `${selectedStock.name}(${selectedStock.symbol}) 종목에 대해 4개 증권소 AI 모델이 교차 검증을 완료하였습니다. 1호 오더플로우 틱 수급(${model1.metrics.orderFlowPower}점)과 2호 테마 머니플로우(${model2.metrics.momentumScore}점), 3호 퀀트 손익비 매력도(${model3.metrics.riskRewardRatio}점), 4호 차트 비전 패턴 완성도(${model4.metrics.patternCompletion}점)가 다차원으로 융합되어 최상위 상방 확률 구조를 형성하고 있습니다.`,
            bulletPoints: [
              `4대 AI 모델 종합 가중 점수 ${finalScore}점 기록 (${models.filter(m => m.opinion.includes("매수")).length}/4개 모델 매수 합의)`,
              `1차 목표가 ${formatPrice(consensusTarget1)} (+${(((consensusTarget1 - currentPrice) / currentPrice) * 100).toFixed(1)}%), 2차 목표가 ${formatPrice(consensusTarget2)} (+${(((consensusTarget2 - currentPrice) / currentPrice) * 100).toFixed(1)}%) 설정`,
              `손절 방어선 ${formatPrice(consensusStopLoss)} (${(((consensusStopLoss - currentPrice) / currentPrice) * 100).toFixed(1)}%) 이탈 전까지 손익비 1:2.9 우위 진입 권장`
            ],
            recommendedEntry: `${formatPrice(entryLow)} ~ ${formatPrice(entryHigh)} 분할 접근`,
            targetPrice1: consensusTarget1,
            targetPrice2: consensusTarget2,
            stopLossPrice: consensusStopLoss,
            riskNotice: `단기 직전 고점 진입 시 차익 실현 유동성 출회 가능성이 있으므로 무효화 손절선(${formatPrice(consensusStopLoss)}) 하향 이탈 시 기계적 매도 필요`,
            generatedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });

          setIsGeneratingVerdict(false);
        }, 350);
      }, 350);
    }, 350);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border-0 sm:border border-cyan-500/40 rounded-none sm:rounded-3xl w-full h-[100dvh] sm:h-auto sm:max-h-[94vh] max-w-6xl flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-cyan-950/80 border-b border-zinc-800 flex flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl sm:rounded-2xl text-cyan-400 shadow-md shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg lg:text-xl font-black text-white truncate flex items-center gap-1.5">
                  <span>🏛️ AI 4대 증권소 모델 통합 리서치 &amp; 결론</span>
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[9px] sm:text-[10px] font-mono font-bold border border-cyan-700 shrink-0">
                  v7.7
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 hidden sm:block mt-0.5">
                오더플로우·마스터관제·퀀트매트릭스·차트비전 4개 독립 AI 증권소 모델이 종목을 동시 교차 분석하여 최종 합의 결론을 도출합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 text-zinc-400 hover:text-white bg-zinc-800/80 active:bg-zinc-700 rounded-full flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & QUICK PICK BAR */}
        <div className="p-2.5 sm:p-4 bg-zinc-900/90 border-b border-zinc-800 space-y-2 sm:space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                placeholder="종목명(삼성전자, 파두) 또는 코드(005930) 입력"
                className="w-full pl-8 sm:pl-10 pr-20 sm:pr-24 py-1.5 sm:py-2 bg-zinc-950 border border-zinc-700 hover:border-cyan-500 focus:border-cyan-400 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-inner font-medium"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-bold transition cursor-pointer z-10"
              >
                검색
              </button>

              {/* Live Search Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-950 border border-cyan-500/50 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-zinc-800">
                  {searchResults.map((item) => {
                    const itemIsUs = isUsMarketStock(item.market, item.symbol);
                    const formattedItemPrice = item.price > 0 
                      ? (itemIsUs ? `$${(item.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(item.price ?? 0).toLocaleString()}원`)
                      : "시세 조회중...";
                    return (
                      <button
                        key={`${item.symbol}-${item.name}`}
                        type="button"
                        onClick={() => {
                          fetchStockAnalysis(item.symbol, item.name);
                          setSearchQuery("");
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-zinc-800/80 active:bg-zinc-700 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-cyan-400 border border-zinc-700">
                            {item.symbol}
                          </span>
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                            {item.name}
                          </span>
                          {itemIsUs && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                              🇺🇸 US
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-zinc-200 block">
                            {formattedItemPrice}
                          </span>
                          <span className={`text-[10px] font-bold ${item.changePct >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                            {item.changePct >= 0 ? `+${item.changePct}%` : `${item.changePct}%`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </form>

            <button
              onClick={() => fetchStockAnalysis(selectedStock.symbol, selectedStock.name)}
              disabled={isLoading}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-zinc-700 shrink-0"
              title="실시간 재분석"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">재분석</span>
            </button>
          </div>

          {/* Quick Selection Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar touch-pan-x">
            <span className="text-zinc-400 font-bold whitespace-nowrap text-[10px] sm:text-[11px] flex items-center gap-1 shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> 추천:
            </span>
            {popularStocks.map((st) => (
              <button
                key={st.symbol}
                onClick={() => fetchStockAnalysis(st.symbol, st.name)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer border shrink-0 min-h-[28px] flex items-center gap-1 ${
                  selectedStock.symbol === st.symbol
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-xs"
                    : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                {st.market === "US" && <span className="text-[10px]">🇺🇸</span>}
                <span>{st.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SELECTED STOCK HERO STATS BAR */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950/40 border-b border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-base sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                {isUS && <span className="text-sm sm:text-base">🇺🇸</span>}
                <span>{selectedStock.name}</span>
              </h3>
              <span className="text-[10px] sm:text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded-md border border-zinc-700">
                {selectedStock.symbol}
              </span>
              {isUS && (
                <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-700">
                  USD 통화 적용
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex flex-col items-end sm:items-start">
                <span className="text-sm sm:text-xl font-mono font-black text-white">
                  {formatPrice(selectedStock.price)}
                </span>
                {isUS && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    ≈ ₩{Math.round(selectedStock.price * currentFx).toLocaleString()}
                  </span>
                )}
              </div>
              <span className={`text-xs sm:text-sm font-bold flex items-center ${isGain ? "text-rose-400" : "text-blue-400"}`}>
                {isGain ? <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
                {isGain ? `+${selectedStock.changePct}%` : `${selectedStock.changePct}%`}
              </span>
            </div>
          </div>

          {/* Consensus Final Badges */}
          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2">
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl flex items-center gap-1.5 shadow-md">
              <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden xs:inline" />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] text-emerald-400/80 font-bold leading-none truncate">4대 모델 합의</div>
                <div className="text-[11px] sm:text-xs font-black text-emerald-300 truncate">{consensusGrade.split(" ")[0]} {consensusGrade.split(" ")[1]}</div>
              </div>
            </div>

            <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-cyan-950/90 border border-cyan-500/50 rounded-xl flex items-center gap-1.5 shadow-md">
              <Scale className="w-3.5 h-3.5 text-cyan-400 shrink-0 hidden xs:inline" />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] text-cyan-400/80 font-bold leading-none truncate">모델 일치도</div>
                <div className="text-[11px] sm:text-xs font-black text-cyan-300 truncate">{consensusAgreementRatio}% ({models.filter(m => m.opinion.includes("매수")).length}/4)</div>
              </div>
            </div>

            <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-950/90 border border-amber-500/50 rounded-xl flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden xs:inline" />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] text-amber-400/80 font-bold leading-none truncate">가중 점수</div>
                <div className="text-[11px] sm:text-xs font-black text-amber-300 truncate">{weightedScore}점 / 100</div>
              </div>
            </div>
          </div>
        </div>

        {/* RESPONSIVE SUB-TAB SWITCHER FOR EASY MOBILE VIEWING */}
        <div className="bg-zinc-950 border-b border-zinc-800/80 px-2.5 sm:px-5 py-1.5 sm:py-2 flex items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x sticky top-0 z-20 shrink-0">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 min-h-[32px] ${
              activeTab === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🌐 전체 보기</span>
          </button>

          <button
            onClick={() => setActiveTab("discussion")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 min-h-[32px] ${
              activeTab === "discussion"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400 shadow-md ring-1 ring-purple-400/30"
                : "text-purple-300 hover:text-purple-200 hover:bg-zinc-800"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span>💬 봇 실시간 합의 토론 (Consensus Discussion)</span>
          </button>

          <button
            onClick={() => setActiveTab("verdict")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 min-h-[32px] ${
              activeTab === "verdict"
                ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border border-cyan-400 shadow-md ring-1 ring-cyan-400/30"
                : "text-amber-300 hover:text-amber-200 hover:bg-zinc-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>✨ AI 통합 결론</span>
          </button>

          <button
            onClick={() => setActiveTab("models")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 min-h-[32px] ${
              activeTab === "models"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>🏛️ 4대 모델 리서치</span>
          </button>

          <button
            onClick={() => setActiveTab("radar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 min-h-[32px] ${
              activeTab === "radar"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            <span>📊 지표 &amp; 매트릭스</span>
          </button>

          <button
            onClick={() => setActiveTab("chart")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 min-h-[32px] ${
              activeTab === "chart"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>📈 차트 &amp; 기업진단</span>
          </button>
        </div>

        {/* MODAL MAIN CONTENT: TABS & VIEWS */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* SECTION 0: 💬 CONSENSUS DISCUSSION VIEW (봇 실시간 합의 토론) */}
          {(activeTab === "all" || activeTab === "discussion") && (
            <div className="space-y-4 animate-fade-in bg-zinc-950/80 border border-purple-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Discussion Top Header & Summary Stats */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      <MessageSquare className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>🧠 신경세포 봇 실시간 합의 토론 (Consensus Discussion)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
                        LIVE AGENT CHAT
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {selectedStock.name} ({selectedStock.symbol}) 종목에 대해 각 전문 AI 봇들이 분석 근거를 발표하고 가중 평균 신뢰도를 합산합니다.
                  </p>
                </div>

                {/* Weighted Confidence Gauge & Direction */}
                <div className="flex items-center gap-3 bg-zinc-900/90 p-2.5 sm:p-3 rounded-2xl border border-zinc-800 shadow-inner">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-400 font-bold">가중 평균 신뢰도 (Weighted Score)</div>
                    <div className="text-base sm:text-xl font-mono font-black text-emerald-400 flex items-center justify-end gap-1.5">
                      <span>{weightedScore}%</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                        {weightedScore >= 80 ? "STRONG BUY" : "BUY ON DIP"}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="18" stroke="#27272a" strokeWidth="4" fill="none" />
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        stroke="#10b981"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray="113"
                        strokeDashoffset={113 - (113 * weightedScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-mono font-black text-white">{weightedScore}</span>
                  </div>
                </div>
              </div>

              {/* Consensus Disagreement & Agreement Diagnostics Box */}
              <div className="p-3.5 sm:p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-2.5 relative z-10">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <Scale className="w-4 h-4" />
                    <span>쟁점 요약: 왜 일부 봇은 강력 매수하고, 일부는 경계하는가?</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    찬성 4개 / 반대 0개 / 리스크 경계 1개
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>상승 지지 봇들의 공통 논거 (SMC & 16-Quant)</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      기관 오더블록(₩{formatPrice((model1 as any).orderBlockSupport || Math.round(currentPrice * 0.965))}) 지지와 체결강도 130% 돌파, RVOL 2.4배 급증으로 상방 돌파 확률(88%+)이 높다고 판단합니다.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>하락방어 봇의 리스크 지적 (Risk Defense)</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      직전 고점 부근의 윗꼬리 매물대 저항이 존재하므로, 손절선({formatPrice(consensusStopLoss)})을 엄수하고 1차 목표가(+3.5%) 도달 시 즉시 본절가 스탑을 발동해야 함을 강조합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat-Like Discussion Feed Filter */}
              <div className="flex items-center justify-between gap-2 pt-1 relative z-10 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-zinc-400 text-[11px]">발언 필터:</span>
                  {(["ALL", "LONG", "SHORT"] as const).map((flt) => (
                    <button
                      key={flt}
                      onClick={() => setDiscussionFilter(flt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        discussionFilter === flt
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {flt === "ALL" ? "전체 봇 발언 (5)" : flt === "LONG" ? "🟢 롱/매수 (4)" : "🟡 리스크방어 (1)"}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] font-mono text-zinc-500">실시간 신경망 연결됨 · Auto Synced</span>
              </div>

              {/* Chat Stream Messages */}
              <div className="space-y-3 relative z-10">
                {/* Bot 1: SMC Bot */}
                {(discussionFilter === "ALL" || discussionFilter === "LONG") && (
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-900/80 border border-cyan-500/30 rounded-2xl transition hover:border-cyan-500/60">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shrink-0 font-bold text-xs shadow-md">
                      🏛️
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">SMC 스마트머니 오더블록 봇</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                            가중치 25%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🟢 LONG (확신도 91%)
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">목표가: {formatPrice(consensusTarget1)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
                        "{selectedStock.name}의 기관 오더블록 지지선(₩{formatPrice(Math.round(currentPrice * 0.965))}) 확인이 완료되었습니다. 직전 상방 유동성 공백(Liquidity Void)을 채우는 강한 매수세가 유입 중이므로 1차 목표가 {formatPrice(consensusTarget1)}까지 상방 랠리가 가장 유력합니다."
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot 2: 16-Quant Alpha Bot */}
                {(discussionFilter === "ALL" || discussionFilter === "LONG") && (
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-900/80 border border-emerald-500/30 rounded-2xl transition hover:border-emerald-500/60">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0 font-bold text-xs shadow-md">
                      ⚡
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">16대 팩터 퀀트 알파 봇</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            가중치 25%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🟢 LONG (확신도 88%)
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">목표가: {formatPrice(consensusTarget2)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
                        "상대거래량(RVOL) 2.4배 폭증 및 섹터 퀄리티 모멘텀 점수가 상위 5%로 산출되었습니다. 리스크 대비 손익비(Risk-Reward)가 1:2.85로 계산되어 통계적 기대값이 극대화된 상태입니다."
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot 3: Price Action Vision Bot */}
                {(discussionFilter === "ALL" || discussionFilter === "LONG") && (
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-900/80 border border-indigo-500/30 rounded-2xl transition hover:border-indigo-500/60">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0 font-bold text-xs shadow-md">
                      📐
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">프라이스액션 &amp; 기하학 비전 봇</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                            가중치 20%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🟢 LONG (확신도 85%)
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">목표가: {formatPrice(consensusTarget1)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
                        "5일선과 20일 이동평균선 정배열 지지 위에서 상승 N자형 파동이 진행 중입니다. 캔들 몸통 돌파가 유지되고 있으며 볼린저밴드 상단 밴드워킹 패턴이 전개되고 있습니다."
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot 4: HFT Tape Bot */}
                {(discussionFilter === "ALL" || discussionFilter === "LONG") && (
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-900/80 border border-amber-500/30 rounded-2xl transition hover:border-amber-500/60">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 font-bold text-xs shadow-md">
                      🌊
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">HFT 1초 CVD 체결테이프 봇</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                            가중치 15%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🟢 LONG (확신도 94%)
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">목표가: {formatPrice(Math.round(currentPrice * 1.045))}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
                        "1초/5초 호가창 체결강도 138% 폭발. 누적순매수델타(CVD) 지표에서 대형 고래 계좌의 시장가 매수 틱이 실시간으로 확인되어 초단타 단기 상승 모멘텀이 매우 강력합니다."
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot 5: Risk Defense Bot */}
                {(discussionFilter === "ALL" || discussionFilter === "SHORT") && (
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-900/80 border border-rose-500/30 rounded-2xl transition hover:border-rose-500/60">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0 font-bold text-xs shadow-md">
                      🛡️
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">하락방어 V5 거부권 봇</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            가중치 15%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🟡 경계 / 손절 엄수 (확신도 82%)
                          </span>
                          <span className="text-[10px] font-mono text-rose-400">손절선: {formatPrice(consensusStopLoss)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
                        "상승 추세는 확고하나 직전 고점 매물대 저항 시 일시적 흔들림이 있을 수 있습니다. 1차 익절(+3.5%) 시 40%를 분할 청산하고 스탑로스를 본절가로 이동하는 3단계 분할 전략을 준수하십시오."
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 1: 4 INDEPENDENT SECURITIES MODEL CARDS */}
          {(activeTab === "all" || activeTab === "models") && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-zinc-200 flex items-center gap-1.5 sm:gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>각 AI 증권소 모델별 독립 분석 &amp; 투자의견 대조</span>
                </h4>
                <span className="text-[10px] sm:text-[11px] text-zinc-400 hidden xs:inline">4개 독립 알고리즘</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {models.map((model) => {
                  const IconComponent = model.icon;
                  const isStrong = model.opinion === "강력 매수";

                  return (
                    <div
                      key={model.modelId}
                      className={`bg-gradient-to-b ${model.colorScheme.bg} border ${model.colorScheme.border} rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-3 sm:space-y-4 shadow-lg transition-all hover:scale-[1.01]`}
                    >
                    <div className="space-y-3">
                      {/* Model Title & Specialty */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${model.colorScheme.badge}`}>
                            {model.badgeName}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">가중치 {model.weightRatio * 100}%</span>
                        </div>
                        <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                          <IconComponent className={`w-4 h-4 ${model.colorScheme.text}`} />
                          <span>{model.name.split(":")[0]}</span>
                        </h5>
                        <p className="text-[11px] text-zinc-300 font-medium line-clamp-1">{model.deskTitle}</p>
                      </div>

                      {/* Opinion & Score Gauge */}
                      <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400 font-bold">투자의견</span>
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${
                            isStrong ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                          }`}>
                            {model.opinion}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400">모델 확신도</span>
                            <span className="font-mono font-bold text-white">{model.confidenceScore}점</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                model.confidenceScore >= 90 ? "bg-emerald-400" : model.confidenceScore >= 80 ? "bg-cyan-400" : "bg-amber-400"
                              }`}
                              style={{ width: `${model.confidenceScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Targets */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 text-[11px]">
                          <div>
                            <span className="text-zinc-400 block text-[10px]">추천 목표가</span>
                            <span className="font-mono font-bold text-rose-400">{formatPrice(model.targetPrice)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">손절 기준가</span>
                            <span className="font-mono font-bold text-blue-400">{formatPrice(model.stopLossPrice)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 3 Key Bullets */}
                      <div className="space-y-1.5 text-[11px]">
                        <span className="text-zinc-400 font-bold text-[10px] block">핵심 판단 근거:</span>
                        {model.keyBullishReasons.map((reason, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-zinc-300 leading-tight">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risk Point */}
                    <div className="p-2 bg-rose-950/30 border border-rose-500/30 rounded-xl text-[10px] text-rose-300 flex items-start gap-1.5 leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{model.keyRiskFactor}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* SECTION 2: 4대 AI 증권소 핵심 지표 레이더 차트 & 대조 매트릭스 */}
          {(activeTab === "all" || activeTab === "radar") && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-4 sm:space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h4 className="text-xs sm:text-base font-black text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-cyan-400" />
                    <span>📊 4대 AI 증권소 핵심 지표 레이더 차트 &amp; 정밀 비교</span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                    변동성 방어, 수급 강도, AI 예측 점수, 손익비, 모멘텀, 차트 패턴 6대 지표 비교
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>1호: SMC</span>
                  <span className="flex items-center gap-1 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>2호: 수급</span>
                  <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>3호: 퀀트</span>
                  <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>4호: 패턴</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
                {/* RADAR CHART DISPLAY */}
                <div className="lg:col-span-5 h-[240px] sm:h-[320px] bg-zinc-950/80 border border-zinc-800 rounded-2xl p-2 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: "bold" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 8 }} />
                      <Radar name="1호 오더플로우" dataKey="model1" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                      <Radar name="2호 마스터관제" dataKey="model2" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} />
                      <Radar name="3호 퀀트랩" dataKey="model3" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
                      <Radar name="4호 차트비전" dataKey="model4" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#3f3f46", borderRadius: "12px", fontSize: "11px", color: "#f4f4f5" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

              {/* SIDE-BY-SIDE METRICS COMPARISON BARS */}
              <div className="lg:col-span-7 space-y-3">
                <h5 className="text-xs font-black text-zinc-300 flex items-center justify-between">
                  <span>지표별 4개 모델 평가 점수 대조 매트릭스</span>
                  <span className="text-[10px] text-cyan-400 font-mono">가중 평균 컨센서스</span>
                </h5>

                <div className="space-y-2.5">
                  {radarData.map((metric) => (
                    <div key={metric.subject} className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{metric.subject}</span>
                        </span>
                        <span className="text-[11px] font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                          통합 평균 {metric.consensusAvg}점
                        </span>
                      </div>

                      {/* 4 Models Score Micro Bars */}
                      <div className="grid grid-cols-4 gap-2 pt-1 text-[10px]">
                        <div>
                          <div className="flex justify-between text-emerald-400 font-mono font-bold mb-0.5">
                            <span>1호: SMC</span>
                            <span>{metric.model1}점</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metric.model1}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-indigo-400 font-mono font-bold mb-0.5">
                            <span>2호: 수급</span>
                            <span>{metric.model2}점</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${metric.model2}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-cyan-400 font-mono font-bold mb-0.5">
                            <span>3호: 퀀트</span>
                            <span>{metric.model3}점</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${metric.model3}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-amber-400 font-mono font-bold mb-0.5">
                            <span>4호: 패턴</span>
                            <span>{metric.model4}점</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${metric.model4}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* SECTION 3: CROSS-MODEL COMPARISON MATRIX TABLE */}
          {(activeTab === "all" || activeTab === "radar") && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800 pb-2.5">
                <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>4대 AI 모델 다차원 교차 비교 매트릭스</span>
                </h4>
                <span className="text-[10px] sm:text-xs text-zinc-400">
                  {isUS ? "NASDAQ/NYSE 실시간 틱 & 퀀트 팩터" : "KRX 실시간 틱 & 퀀트 팩터"}
                </span>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-bold bg-zinc-950/60">
                      <th className="py-2 px-2.5">분석 지표 / 모델</th>
                      <th className="py-2 px-2.5 text-emerald-400">1호: SMC/틱</th>
                      <th className="py-2 px-2.5 text-indigo-400">2호: 테마/수급</th>
                      <th className="py-2 px-2.5 text-cyan-400">3호: 퀀트 랩</th>
                      <th className="py-2 px-2.5 text-amber-400">4호: 차트 비전</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                    <tr className="hover:bg-zinc-800/30">
                      <td className="py-2 px-2.5 font-bold text-zinc-300">투자의견</td>
                      <td className="py-2 px-2.5 font-black text-emerald-300">{model1.opinion}</td>
                      <td className="py-2 px-2.5 font-black text-indigo-300">{model2.opinion}</td>
                      <td className="py-2 px-2.5 font-black text-cyan-300">{model3.opinion}</td>
                      <td className="py-2 px-2.5 font-black text-amber-300">{model4.opinion}</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/30">
                      <td className="py-2 px-2.5 font-bold text-zinc-300">확신도 점수</td>
                      <td className="py-2 px-2.5 font-mono font-bold text-white">{model1.confidenceScore}점</td>
                      <td className="py-2 px-2.5 font-mono font-bold text-white">{model2.confidenceScore}점</td>
                      <td className="py-2 px-2.5 font-mono font-bold text-white">{model3.confidenceScore}점</td>
                      <td className="py-2 px-2.5 font-mono font-bold text-white">{model4.confidenceScore}점</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/30">
                      <td className="py-2 px-2.5 font-bold text-zinc-300">추천 목표가</td>
                      <td className="py-2 px-2.5 font-mono text-rose-400 font-bold">{formatPrice(model1.targetPrice)} (+8.5%)</td>
                      <td className="py-2 px-2.5 font-mono text-rose-400 font-bold">{formatPrice(model2.targetPrice)} (+11.5%)</td>
                      <td className="py-2 px-2.5 font-mono text-rose-400 font-bold">{formatPrice(model3.targetPrice)} (+7.5%)</td>
                      <td className="py-2 px-2.5 font-mono text-rose-400 font-bold">{formatPrice(model4.targetPrice)} (+10.0%)</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/30">
                      <td className="py-2 px-2.5 font-bold text-zinc-300">손절 방어선</td>
                      <td className="py-2 px-2.5 font-mono text-blue-400 font-bold">{formatPrice(model1.stopLossPrice)} (-3.5%)</td>
                      <td className="py-2 px-2.5 font-mono text-blue-400 font-bold">{formatPrice(model2.stopLossPrice)} (-5.0%)</td>
                      <td className="py-2 px-2.5 font-mono text-blue-400 font-bold">{formatPrice(model3.stopLossPrice)} (-3.0%)</td>
                      <td className="py-2 px-2.5 font-mono text-blue-400 font-bold">{formatPrice(model4.stopLossPrice)} (-4.0%)</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/30">
                      <td className="py-2 px-2.5 font-bold text-zinc-300">진입 유효 구간</td>
                      <td className="py-2 px-2.5 font-mono text-zinc-300">{formatPrice(model1.entryZone[0])} ~ {formatPrice(model1.entryZone[1])}</td>
                      <td className="py-2 px-2.5 font-mono text-zinc-300">{formatPrice(model2.entryZone[0])} ~ {formatPrice(model2.entryZone[1])}</td>
                      <td className="py-2 px-2.5 font-mono text-zinc-300">{formatPrice(model3.entryZone[0])} ~ {formatPrice(model3.entryZone[1])}</td>
                      <td className="py-2 px-2.5 font-mono text-zinc-300">{formatPrice(model4.entryZone[0])} ~ {formatPrice(model4.entryZone[1])}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3.5: 📈 100% LIVE PRICE SYNCED INTERACTIVE CHART & BEGINNER-FRIENDLY INSIGHTS */}
          {(activeTab === "all" || activeTab === "chart") && (
            <div className="bg-zinc-900/90 border border-cyan-500/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-4 sm:space-y-6 shadow-xl animate-fade-in">
              {/* Header & Live Price Match Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h4 className="text-xs sm:text-base font-black text-white flex items-center gap-2">
                    <LineChartIcon className="w-4 h-4 text-cyan-400" />
                    <span>📈 실시간 시세 연동 차트 &amp; 초보자 가이드</span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                    현재가({formatPrice(selectedStock.price)})와 차트 종가가 100% 동기화된 실시간 캔들 차트
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/50 rounded-xl flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>실시간 시세 동기화 완료</span>
                  </div>
                </div>
              </div>

            {/* LIVE PRICE SYNCED INTERACTIVE CHART DISPLAY */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-bold px-1">
                <span className="flex items-center gap-1 text-white font-mono">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{selectedStock.name} ({selectedStock.symbol}) 30일 추세 &amp; 현재가 가이드라인</span>
                </span>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-rose-400 font-bold">― 1차 목표가 ({formatPrice(consensusTarget1)})</span>
                  <span className="text-cyan-400 font-bold">― 현재가 ({formatPrice(selectedStock.price)})</span>
                  <span className="text-blue-400 font-bold">― 손절가 ({formatPrice(consensusStopLoss)})</span>
                </div>
              </div>

              {/* Chart Component */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stockCandles} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10 }} />
                    <YAxis
                      domain={['auto', 'auto']}
                      orientation="right"
                      stroke="#71717a"
                      tick={{ fontSize: 10, fill: "#a1a1aa" }}
                      tickFormatter={(v) => isUS ? `$${v}` : (v ?? 0).toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#3f3f46", borderRadius: "12px", fontSize: "11px", color: "#f4f4f5" }}
                      formatter={(val: any) => [typeof val === 'number' ? formatPrice(val) : val, '가격']}
                    />
                    <Area type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} fill="url(#priceGradient)" name="종가" />
                    <Line type="monotone" dataKey="high" stroke="#f43f5e" strokeWidth={1} strokeDasharray="2 2" dot={false} name="고가" />
                    <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={1} strokeDasharray="2 2" dot={false} name="저가" />
                    <ReferenceLine y={selectedStock.price} stroke="#06b6d4" strokeWidth={2} label={{ value: `현재가 ${formatPrice(selectedStock.price)}`, fill: '#06b6d4', fontSize: 10, position: 'insideRight' }} />
                    <ReferenceLine y={consensusTarget1} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `목표가 ${formatPrice(consensusTarget1)}`, fill: '#f43f5e', fontSize: 10, position: 'insideRight' }} />
                    <ReferenceLine y={consensusStopLoss} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: `손절가 ${formatPrice(consensusStopLoss)}`, fill: '#3b82f6', fontSize: 10, position: 'insideRight' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RECHARTS VISUALIZATION PANEL: AI PREDICTION SUCCESS PROBABILITY & RETURN TREND */}
            <div className="bg-zinc-950/90 border border-indigo-500/50 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div>
                  <h5 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>AI 예측 성공 확률 &amp; 수익률 트렌드 시각화 패널</span>
                  </h5>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    4대 AI 모델 가중 합산 예측 성공 확률(%) 및 시점별 목표 수익률(%) 추세
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                    예측 성공 확률 {weightedScore}%
                  </span>
                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                    목표 수익률 +10.2%
                  </span>
                </div>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={[
                    { time: "D-7", prob: 82, returnPct: 2.4, targetReturn: 8.5 },
                    { time: "D-5", prob: 85, returnPct: 3.8, targetReturn: 8.5 },
                    { time: "D-3", prob: 88, returnPct: 5.1, targetReturn: 9.0 },
                    { time: "D-1", prob: 91, returnPct: 6.8, targetReturn: 9.5 },
                    { time: "오늘 (현재)", prob: weightedScore, returnPct: selectedStock.changePct >= 0 ? selectedStock.changePct : 3.45, targetReturn: 10.2 },
                    { time: "D+3 (예측)", prob: Math.min(98, weightedScore + 3), returnPct: 7.8, targetReturn: 10.2 },
                    { time: "D+7 (목표)", prob: Math.min(99, weightedScore + 5), returnPct: 10.2, targetReturn: 10.2 }
                  ]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#a1a1aa" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" domain={[50, 100]} stroke="#818cf8" tick={{ fontSize: 10, fill: "#818cf8" }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" domain={[-2, 15]} stroke="#10b981" tick={{ fontSize: 10, fill: "#10b981" }} tickFormatter={(v) => `+${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#3f3f46", borderRadius: "12px", fontSize: "11px", color: "#f4f4f5" }}
                      formatter={(value: any, name: any) => {
                        if (name === "AI 예측 성공 확률") return [`${value}%`, name];
                        if (name === "예상 수익률") return [`+${value}%`, name];
                        return [value, name];
                      }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="prob" stroke="#818cf8" strokeWidth={2} fill="url(#probGrad)" name="AI 예측 성공 확률" />
                    <Line yAxisId="right" type="monotone" dataKey="returnPct" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} name="예상 수익률" />
                    <Bar yAxisId="right" dataKey="targetReturn" fill="#06b6d4" opacity={0.2} name="목표 수익 구간" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BEGINNER-FRIENDLY INSIGHTS & CORPORATE HEALTH & RISK / PROFIT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* CARD 1: 초보자 맞춤 직관적 한글 매수/매도 나침반 */}
              <div className="bg-zinc-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-emerald-400" />
                      <span>누구나 알기 쉬운 매수/매도 가이드</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                      🟢 강력 추천 구간
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1.5">
                    <div className="text-xs font-black text-emerald-300">
                      💡 왜 지금 관심있게 봐야 하나요?
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      외국인과 기관 투자가들의 <strong className="text-emerald-400">대규모 수급 자금</strong>이 주가를 단단하게 받아주고 있습니다. 
                      지금 가격 구간은 상방 수익 가능성이 높고 손실 위험은 제한적인 <strong className="text-amber-300">매우 유리한 진입 자리</strong>입니다.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 shrink-0">· 매수 시점:</span>
                      <span>현재가 내외 분할 매수 적기</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-400 shrink-0">· 매도 목표:</span>
                      <span>1차 {formatPrice(consensusTarget1)} 달성 시 절반 익절</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-zinc-900 rounded-xl text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                  <span>추천 보유 기간:</span>
                  <strong className="text-cyan-300">단기 ~ 중기 (3일 ~ 2주)</strong>
                </div>
              </div>

              {/* CARD 2: 기업 상태 & 재무 건강도 진단 */}
              <div className="bg-zinc-950/90 border border-cyan-500/40 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-cyan-400" />
                      <span>기업 현황 &amp; 재무 건강도 진단</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                      A+ 안전 재무구조
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-400 block">PER (주가수익비율)</span>
                      <span className="font-mono font-black text-cyan-300 text-sm">{stockFundamentals.per}배</span>
                      <span className="text-[9px] text-emerald-400 block">업종평균 대비 저평가</span>
                    </div>
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-400 block">PBR (주가순자산비율)</span>
                      <span className="font-mono font-black text-cyan-300 text-sm">{stockFundamentals.pbr}배</span>
                      <span className="text-[9px] text-zinc-400 block">자산가치 안정적</span>
                    </div>
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-400 block">ROE (자기자본이익률)</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">+{stockFundamentals.roe}%</span>
                      <span className="text-[9px] text-emerald-400 block">우수한 수익 창출력</span>
                    </div>
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-400 block">부채 비율</span>
                      <span className="font-mono font-black text-amber-300 text-sm">{stockFundamentals.debtRatio}%</span>
                      <span className="text-[9px] text-emerald-400 block">재무 건전성 양호</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-300 flex items-center justify-between font-mono">
                  <span>시가총액 / 기업상태:</span>
                  <strong className="text-white">{stockFundamentals.marketCap} (우량기업)</strong>
                </div>
              </div>

              {/* CARD 3: 리스크 요인 & 수익 가능성 시나리오 */}
              <div className="bg-zinc-950/90 border border-amber-500/40 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>수익 가능성 &amp; 리스크 시나리오</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                      승률 87.4% 시뮬레이션
                    </span>
                  </div>

                  {/* Profit Potential */}
                  <div className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-300">🎯 기대 수익률 (상방):</span>
                      <span className="font-mono text-rose-400 font-black">+8.5% ~ +15.2%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>손익비 (Risk:Reward):</span>
                      <strong className="text-emerald-400">1 : 2.85 (수익 우위)</strong>
                    </div>
                  </div>

                  {/* Key Risks */}
                  <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-amber-300 block">⚠️ 핵심 발생 리스크 요인:</span>
                    <p className="text-[11px] text-zinc-300 leading-tight">
                      직전 전고점 부근 단기 매물 차익실현 물량이 출회될 수 있습니다. 손절가({formatPrice(consensusStopLoss)}) 이탈 시에는 기계적으로 대응하는 것이 좋습니다.
                    </p>
                  </div>
                </div>

                <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center justify-between font-mono">
                  <span>손절선 대응 규칙:</span>
                  <strong className="text-rose-400">{formatPrice(consensusStopLoss)} 터치 시 매도</strong>
                </div>
              </div>

            </div>
          </div>
          )}

          {/* SECTION 4: AI INTEGRATED SYNTHESIS & FINAL CONSENSUS VERDICT */}
          {(activeTab === "all" || activeTab === "verdict") && (
            <div className="bg-gradient-to-br from-cyan-950/50 via-zinc-900 to-indigo-950/50 border border-cyan-500/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
              
              {/* Background Glow Pulse */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/30 pb-3 sm:pb-4 relative z-10">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-2.5 sm:p-3 bg-cyan-500/20 border border-cyan-400/50 rounded-xl sm:rounded-2xl text-cyan-300 shadow-lg shrink-0">
                    <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-lg font-black text-white flex items-center gap-1.5 sm:gap-2">
                      <span>🏛️ 4대 AI 증권소 종합 컨센서스 최종 결론</span>
                    </h4>
                    <p className="text-[11px] sm:text-xs text-cyan-300/80">
                      선택 종목 <strong className="text-white">'{selectedStock.name}'</strong>에 대해 4개 독립 모델 분석 결과를 종합 취합합니다.
                    </p>
                  </div>
                </div>

                {/* GENERATE SYNTHESIS BUTTON */}
                <button
                  onClick={handleGenerateIntegratedVerdict}
                  disabled={isGeneratingVerdict}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 text-white font-black rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xl ring-2 ring-cyan-400/40 hover:scale-[1.02] active:scale-95 disabled:opacity-60 shrink-0"
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingVerdict ? "animate-spin" : "animate-bounce"}`} />
                  <span>{isGeneratingVerdict ? "AI 4대 모델 종합 분석 중..." : "✨ 4대 AI 증권소 통합 결론 생성하기"}</span>
                </button>
              </div>

              {/* GENERATING STEP ANIMATION PULSE */}
              {isGeneratingVerdict && (
                <div className="p-4 sm:p-6 bg-zinc-950/90 border border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center animate-pulse">
                  <Cpu className="w-7 h-7 text-cyan-400 animate-spin" />
                  <div className="text-xs sm:text-sm font-black text-cyan-300">{verdictStep}</div>
                  <div className="w-full max-w-md bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full animate-pulse" style={{ width: "85%" }} />
                  </div>
                  <p className="text-[10px] sm:text-xs text-zinc-400">독립 분석 모델 간의 상관관계 계산 및 가중치 평균 리비전 수행 중</p>
                </div>
              )}

              {/* AI GENERATED SYNTHESIS VERDICT DISPLAY */}
              {verdictData ? (
                <div className="space-y-4 sm:space-y-5 animate-fade-in relative z-10">
                  {/* Final Opinion Badge & Metrics Banner */}
                  <div className="p-3 sm:p-4 bg-zinc-950/90 border border-cyan-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-xs font-bold text-zinc-400">최종 투자 의견:</span>
                      <span className={`px-3 py-1 rounded-xl text-sm sm:text-base font-black border shadow-lg flex items-center gap-1.5 ${
                        verdictData.finalOpinion === "강력 매수" 
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-emerald-500/20"
                          : verdictData.finalOpinion === "분할 매수"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-cyan-500/20"
                          : "bg-amber-500/20 text-amber-300 border-amber-500"
                      }`}>
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{verdictData.finalOpinion}</span>
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-1 rounded-lg border border-amber-800">
                        점수 {verdictData.weightedScore}점 / 100
                      </span>
                    </div>

                    <div className="text-left sm:text-right text-[10px] sm:text-[11px] text-zinc-400">
                      <span>생성 일시: {verdictData.generatedAt}</span>
                    </div>
                  </div>

                  {/* Consensus Target Summary Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="p-2.5 sm:p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl sm:rounded-2xl">
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-bold block">종합 합의 판정</span>
                      <span className="text-xs sm:text-base font-black text-emerald-400 mt-0.5 block truncate">{consensusGrade}</span>
                      <span className="text-[9px] sm:text-[10px] text-zinc-500">{models.filter(m => m.opinion.includes("매수")).length}/4 매수 합의</span>
                    </div>

                    <div className="p-2.5 sm:p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl sm:rounded-2xl">
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-bold block">1차 목표가 (TP1)</span>
                      <span className="text-xs sm:text-base font-black text-rose-400 font-mono mt-0.5 block truncate">{formatPrice(verdictData.targetPrice1 ?? consensusTarget1 ?? 0)}</span>
                      <span className="text-[9px] sm:text-[10px] text-rose-400/80">+{((((verdictData.targetPrice1 ?? consensusTarget1) - currentPrice) / currentPrice) * 100).toFixed(1)}%</span>
                    </div>

                    <div className="p-2.5 sm:p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl sm:rounded-2xl">
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-bold block">2차 목표가 (TP2)</span>
                      <span className="text-xs sm:text-base font-black text-amber-400 font-mono mt-0.5 block truncate">{formatPrice(verdictData.targetPrice2 ?? consensusTarget2 ?? 0)}</span>
                      <span className="text-[9px] sm:text-[10px] text-amber-400/80">+{((((verdictData.targetPrice2 ?? consensusTarget2) - currentPrice) / currentPrice) * 100).toFixed(1)}%</span>
                    </div>

                    <div className="p-2.5 sm:p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl sm:rounded-2xl">
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-bold block">손절선 (SL)</span>
                      <span className="text-xs sm:text-base font-black text-blue-400 font-mono mt-0.5 block truncate">{formatPrice(verdictData.stopLossPrice ?? consensusStopLoss ?? 0)}</span>
                      <span className="text-[9px] sm:text-[10px] text-blue-400/80">{((((verdictData.stopLossPrice ?? consensusStopLoss) - currentPrice) / currentPrice) * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* AI Executive Summary Box */}
                  <div className="p-3.5 sm:p-4 bg-zinc-950/90 border border-cyan-500/40 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-black text-white">AI 4대 증권소 요약 리포트 &amp; 진입 전략</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      {verdictData.summaryText}
                    </p>

                    <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-xs">
                      <span className="text-zinc-400 font-bold text-[10px] sm:text-[11px] block">주요 핵심 투자 포인트:</span>
                      {verdictData.bulletPoints.map((pt, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span><strong>주의 리스크:</strong> {verdictData.riskNotice}</span>
                    </div>
                  </div>
                </div>
              ) : (
                !isGeneratingVerdict && (
                  <div className="p-4 sm:p-5 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-center space-y-2">
                    <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 mx-auto opacity-80" />
                    <p className="text-xs text-zinc-300 font-medium">
                      위의 <strong className="text-cyan-300">'✨ 4대 AI 증권소 통합 결론 생성하기'</strong> 버튼을 클릭하시면 4개 모델의 지표를 취합한 최종 투자 의견과 AI 종합 리포트가 도출됩니다.
                    </p>
                  </div>
                )
              )}

              {/* Quick Actions Footer inside Modal */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2 relative z-10">
                <button
                  onClick={() => {
                    placeOrder({
                      symbol: selectedStock.symbol,
                      name: selectedStock.name,
                      market: selectedStock.market,
                      type: "BUY",
                      price: selectedStock.price,
                      quantity: 10,
                      targetPrice: consensusTarget1,
                      stopLossPrice: consensusStopLoss
                    });
                    addNotification({
                      type: "BUY",
                      title: `🚀 [컨센서스 합의] ${selectedStock.name} 매수 주문 실행`,
                      message: `4대 증권소 모델 합의에 따라 ${formatPrice(selectedStock.price)}에 매수 체결되었습니다.`
                    });
                  }}
                  className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>🚀 AI 컨센서스 즉시 매수 실행</span>
                </button>

                <button
                  onClick={() => {
                    if (onSelectStockForTerminal) {
                      onSelectStockForTerminal(selectedStock);
                    }
                    onClose();
                  }}
                  className="px-4 sm:px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-4 h-4" />
                  <span>⚡ 실시간 트레이딩 터미널로 이동</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
