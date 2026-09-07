import React, { useState } from "react";
import { 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  Activity, 
  Target, 
  ShieldAlert, 
  ChevronRight, 
  RefreshCw, 
  Layers, 
  ArrowUpRight, 
  BarChart2, 
  Search, 
  AlertCircle,
  Clock,
  Sliders,
  Check,
  XCircle,
  HelpCircle,
  TrendingDown,
  Gauge,
  Flame,
  Award,
  Filter
} from "lucide-react";
import { useEffect } from "react";
import {
  BullishIntelligenceEngine,
  BULLISH_PATTERN_CATALOG,
  BullishPatternDef,
  BullishCategory,
  BullishEngineAnalysisOutput
} from "../lib/bullishMasterEngine";
import { realtimeMarketFeedService, LiveMarketQuote } from "../services/realtimeMarketFeedService";
import { useApp } from "../context/AppContext";

export type PatternLifecycleStage = 
  | "DETECTED" 
  | "WATCHING" 
  | "CONFIRMING" 
  | "CONFIRMED" 
  | "RETESTING" 
  | "CONTINUATION" 
  | "FAILED";

export interface BullishPatternInfo {
  id: number;
  code: string;
  nameKr: string;
  nameEn: string;
  structure: string;
  breakoutTrigger: string;
  targetCalcFormula: string;
  targetType: "HEIGHT" | "FLAGPOLE" | "CUP_DEPTH";
  keyPoint: string;
  winRate: string;
  diagramSvgType: string;
}

export const CORE_8_BULLISH_PATTERNS: BullishPatternInfo[] = [
  {
    id: 1,
    code: "IHNS",
    nameKr: "역헤드앤숄더",
    nameEn: "Inverse Head & Shoulders",
    structure: "왼쪽 어깨 → 머리(최저점) → 오른쪽 어깨 → Neckline 돌파",
    breakoutTrigger: "오른쪽 어깨 완성 후상단 Neckline 양봉 돌파 시점",
    targetCalcFormula: "Neckline + (Neckline - Head 깊이 높이)",
    targetType: "HEIGHT",
    keyPoint: "가장 낮은 머리 중앙 배치, 오른쪽 어깨 형성 후 Neckline 돌파가 핵심",
    winRate: "85%",
    diagramSvgType: "ihns"
  },
  {
    id: 2,
    code: "DOUBLE_BOTTOM",
    nameKr: "더블 바텀 (W 패턴)",
    nameEn: "Double Bottom",
    structure: "1차 저점 → 반등 중간고점 → 2차 저점 → Neckline 돌파",
    breakoutTrigger: "2차 바닥 생성 후 중간 반등 고점(Neckline) 돌파 시점",
    targetCalcFormula: "Neckline + (Neckline - Bottom 저점 높이)",
    targetType: "HEIGHT",
    keyPoint: "2차 바닥 형성 자체보다 중간 반등 고점(Neckline) 돌파 확인이 핵심",
    winRate: "81%",
    diagramSvgType: "double_bottom"
  },
  {
    id: 3,
    code: "TRIPLE_BOTTOM",
    nameKr: "트리플 바텀",
    nameEn: "Triple Bottom",
    structure: "비슷한 가격대에서 1차 · 2차 · 3차 지지 → 상단 저항 돌파",
    breakoutTrigger: "3번의 지지 확인 후 상단 수평 저항선 종가 돌파 시점",
    targetCalcFormula: "상단저항 + (상단저항 - 바닥저점 높이)",
    targetType: "HEIGHT",
    keyPoint: "3번 지지받은 사실보다 마지막 상단 저항을 매수세로 넘어서는지가 핵심",
    winRate: "83%",
    diagramSvgType: "triple_bottom"
  },
  {
    id: 4,
    code: "ASC_TRIANGLE",
    nameKr: "상승 삼각형",
    nameEn: "Ascending Triangle",
    structure: "고점 수평 저항선(일정) + 저점 연속 상승(수렴)",
    breakoutTrigger: "압축된 가격이 상단 수평 저항선 거래량 폭발 돌파 시점",
    targetCalcFormula: "돌파가격 + 삼각형 가장 넓은 입구 높이(Base)",
    targetType: "HEIGHT",
    keyPoint: "매도자는 같은 가격에서 막지만 매수자가 더 높은 가격에서 계속 진입하여 압축",
    winRate: "79%",
    diagramSvgType: "asc_triangle"
  },
  {
    id: 5,
    code: "FALLING_WEDGE",
    nameKr: "하락 쐐기",
    nameEn: "Falling Wedge",
    structure: "고점/저점 모두 낮아지며 변동폭 수렴 → 상단 추세선 돌파",
    breakoutTrigger: "하락 쐐기 상단 추세선 양봉 돌파 시점",
    targetCalcFormula: "돌파가격 + 쐐기 시작 지점 수직 높이",
    targetType: "HEIGHT",
    keyPoint: "단순 과매도 매수가 아닌, 상단 하락 추세선 돌파가 확인되어야 상승 전환",
    winRate: "80%",
    diagramSvgType: "falling_wedge"
  },
  {
    id: 6,
    code: "BULL_FLAG",
    nameKr: "강세 깃발",
    nameEn: "Bull Flag",
    structure: "수직 급등 깃대(Flag Pole) → 짧은 채널형 하향 조정(Flag) → 돌파",
    breakoutTrigger: "깃발 채널 상단 저항선 강한 거래량 돌파 시점",
    targetCalcFormula: "돌파가격 + 1차 상승 깃대(Flag Pole) 수직 높이",
    targetType: "FLAGPOLE",
    keyPoint: "급등 후 거래량이 줄어들며 깃발 조정을 받다가 상단 돌파 시 폭발적인 2차 급등",
    winRate: "84%",
    diagramSvgType: "bull_flag"
  },
  {
    id: 7,
    code: "BULL_PENNANT",
    nameKr: "강세 페넌트",
    nameEn: "Bull Pennant",
    structure: "수직 급등 깃대 → 짧은 삼각 수렴(Pennant) → 상단 돌파",
    breakoutTrigger: "삼각 수렴 상단 저항선 양봉 돌파 시점",
    targetCalcFormula: "돌파가격 + 1차 상승 깃대(Flag Pole) 수직 높이",
    targetType: "FLAGPOLE",
    keyPoint: "Bull Flag와 유사하나 조정이 채널형이 아닌 삼각수렴형 형태로 나타남",
    winRate: "82%",
    diagramSvgType: "bull_pennant"
  },
  {
    id: 8,
    code: "CUP_AND_HANDLE",
    nameKr: "컵앤핸들",
    nameEn: "Cup & Handle",
    structure: "U자형 완만한 컵(Cup) → 이전 고점 근처 Handle 손잡이 조정 → 돌파",
    breakoutTrigger: "Handle 상단 또는 컵 넥라인 저항선 양봉 돌파 시점",
    targetCalcFormula: "돌파가격 + 컵의 바닥부터 넥라인까지의 깊이(Cup Depth)",
    targetType: "CUP_DEPTH",
    keyPoint: "V자가 아닌 U자형 컵 바닥 매집 후 짧은 손잡이 조정을 거쳐 전고점을 파괴",
    winRate: "86%",
    diagramSvgType: "cup_handle"
  }
];

export interface TrackedPatternStock {
  id: string;
  symbol: string;
  name: string;
  patternCode: string;
  patternNameKr: string;
  market: "KOREA" | "US" | "CRYPTO";
  stage: PatternLifecycleStage;
  currentPrice: number;
  breakoutPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  heightValue: number;
  rvol: number;
  tradingValue: string;
  vwapAbove: boolean;
  relativeStrength: number;
  retestConfirmed: boolean;
  score: number;
  lastUpdate: string;
  rationale: string;
}

export const INITIAL_TRACKED_STOCKS: TrackedPatternStock[] = [
  {
    id: "stk-1",
    symbol: "457550",
    name: "우진엔텍",
    patternCode: "BULL_FLAG",
    patternNameKr: "강세 깃발 (Bull Flag)",
    market: "KOREA",
    stage: "CONFIRMED",
    currentPrice: 28800,
    breakoutPrice: 28000,
    stopLossPrice: 26800,
    targetPrice: 32500,
    heightValue: 4500,
    rvol: 5.8,
    tradingValue: "₩1,280억",
    vwapAbove: true,
    relativeStrength: 88,
    retestConfirmed: true,
    score: 94,
    lastUpdate: "1분 전",
    rationale: "깃대 상승 +45% 후 깃발 채널 상단 28,000원 RVOL 5.8배 돌파 확정 완료!"
  },
  {
    id: "stk-2",
    symbol: "080220",
    name: "제주반도체",
    patternCode: "CUP_AND_HANDLE",
    patternNameKr: "컵앤핸들 (Cup & Handle)",
    market: "KOREA",
    stage: "CONTINUATION",
    currentPrice: 22400,
    breakoutPrice: 20500,
    stopLossPrice: 19800,
    targetPrice: 24200,
    heightValue: 3700,
    rvol: 4.2,
    tradingValue: "₩2,150억",
    vwapAbove: true,
    relativeStrength: 92,
    retestConfirmed: true,
    score: 96,
    lastUpdate: "3분 전",
    rationale: "U자형 컵 형성 후 20,500원 넥라인 돌파 및 리테스트 지지 완료, 2차 파동 진행 중"
  },
  {
    id: "stk-3",
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    patternCode: "IHNS",
    patternNameKr: "역헤드앤숄더",
    market: "US",
    stage: "CONFIRMING",
    currentPrice: 129.5,
    breakoutPrice: 128.0,
    stopLossPrice: 124.5,
    targetPrice: 138.5,
    heightValue: 10.5,
    rvol: 3.6,
    tradingValue: "$8.4B",
    vwapAbove: true,
    relativeStrength: 85,
    retestConfirmed: false,
    score: 89,
    lastUpdate: "방금 전",
    rationale: "오른쪽 어깨 완성 후 128달러 넥라인 양봉 거래량 유입 돌파 검증 단계"
  },
  {
    id: "stk-4",
    symbol: "000660",
    name: "SK하이닉스",
    patternCode: "ASC_TRIANGLE",
    patternNameKr: "상승 삼각형",
    market: "KOREA",
    stage: "RETESTING",
    currentPrice: 185000,
    breakoutPrice: 184000,
    stopLossPrice: 180000,
    targetPrice: 198000,
    heightValue: 14000,
    rvol: 3.1,
    tradingValue: "₩3,800억",
    vwapAbove: true,
    relativeStrength: 84,
    retestConfirmed: true,
    score: 91,
    lastUpdate: "2분 전",
    rationale: "184,000원 수평 저항 돌파 후 음봉 눌림목에서 저항선이 지지선으로 변했는지 Retest 중"
  },
  {
    id: "stk-5",
    symbol: "TSLA",
    name: "테슬라 (Tesla)",
    patternCode: "DOUBLE_BOTTOM",
    patternNameKr: "더블 바텀 (W 패턴)",
    market: "US",
    stage: "WATCHING",
    currentPrice: 218.4,
    breakoutPrice: 222.0,
    stopLossPrice: 208.0,
    targetPrice: 242.0,
    heightValue: 20.0,
    rvol: 2.1,
    tradingValue: "$6.2B",
    vwapAbove: true,
    relativeStrength: 76,
    retestConfirmed: false,
    score: 79,
    lastUpdate: "5분 전",
    rationale: "2차 바닥 형성 후 중간 반등 고점인 222.0달러 돌파를 위한 저항선 응축 관찰 중"
  },
  {
    id: "stk-6",
    symbol: "KRW-XRP",
    name: "리플 (XRP)",
    patternCode: "FALLING_WEDGE",
    patternNameKr: "하락 쐐기",
    market: "CRYPTO",
    stage: "DETECTED",
    currentPrice: 840,
    breakoutPrice: 855,
    stopLossPrice: 810,
    targetPrice: 935,
    heightValue: 80,
    rvol: 1.8,
    tradingValue: "₩8,200억",
    vwapAbove: false,
    relativeStrength: 71,
    retestConfirmed: false,
    score: 72,
    lastUpdate: "7분 전",
    rationale: "수렴 끝자락에서 하락 쐐기 상단 추세선 855원 접근. 돌파 여부 신규 감지 단계"
  }
];

export const BullishPatternsLifecycleEngine: React.FC = () => {
  const { selectedSymbol } = useApp();
  // Top-Level Active Mode: "ENGINE_V5" vs "LIFECYCLE_STAGE" vs "TARGET_SIMULATOR"
  const [viewMode, setViewMode] = useState<"ENGINE_V5" | "LIFECYCLE_STAGE" | "TARGET_SIMULATOR">("ENGINE_V5");

  // V5.0 Interactive Simulator State
  const [inputSymbol, setInputSymbol] = useState("005930");
  const [inputName, setInputName] = useState("삼성전자");
  const [inputPrice, setInputPrice] = useState(78500);
  const [inputChange, setInputChange] = useState(2.4);
  const [analysisResult, setAnalysisResult] = useState<BullishEngineAnalysisOutput>(() =>
    BullishIntelligenceEngine.analyzeStock("005930", "삼성전자", 78500, 2.4)
  );

  // Sync with AppContext selectedSymbol
  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== inputSymbol) {
      setInputSymbol(selectedSymbol);
      setInputName(selectedSymbol === "005930" ? "삼성전자" : (selectedSymbol === "000660" ? "SK하이닉스" : selectedSymbol));
      setAnalysisResult(BullishIntelligenceEngine.analyzeStock(selectedSymbol, selectedSymbol, inputPrice, inputChange));
    }
  }, [selectedSymbol]);

  useEffect(() => {
    const handleStockSelected = (e: CustomEvent) => {
      if (e.detail?.symbol) {
        const sym = e.detail.symbol;
        const nm = e.detail.name || sym;
        const prc = e.detail.price || 50000;
        const chg = e.detail.changeRate || 2.4;
        setInputSymbol(sym);
        setInputName(nm);
        setInputPrice(prc);
        setInputChange(chg);
        setAnalysisResult(BullishIntelligenceEngine.analyzeStock(sym, nm, prc, chg));
      }
    };
    window.addEventListener("stock-selected" as any, handleStockSelected);
    return () => window.removeEventListener("stock-selected" as any, handleStockSelected);
  }, [inputPrice, inputChange]);

  // Pattern Catalog Category Filter
  const [selectedCategory, setSelectedCategory] = useState<BullishCategory | "ALL">("ALL");

  // Existing Lifecycle States
  const [selectedPattern, setSelectedPattern] = useState<BullishPatternInfo>(CORE_8_BULLISH_PATTERNS[0]);
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [trackedStocks, setTrackedStocks] = useState<TrackedPatternStock[]>(INITIAL_TRACKED_STOCKS);

  // Real-time market feed subscription
  useEffect(() => {
    const unsub = realtimeMarketFeedService.subscribe((quotesMap) => {
      setTrackedStocks((prevList) =>
        prevList.map((st) => {
          const q = quotesMap.get(st.symbol) || quotesMap.get(st.symbol.replace("KRW-", ""));
          if (q) {
            return {
              ...st,
              currentPrice: q.price,
              lastUpdate: "방금 전"
            };
          }
          return st;
        })
      );
    });
    return () => unsub();
  }, []);

  // Existing Target Calculator State
  const [calcPatternType, setCalcPatternType] = useState<number>(1);
  const [calcBreakoutPrice, setCalcBreakoutPrice] = useState<number>(10000);
  const [calcLowPoint, setCalcLowPoint] = useState<number>(8500);
  const [calcFlagPole, setCalcFlagPole] = useState<number>(3000);

  const handleRunAnalysis = () => {
    const res = BullishIntelligenceEngine.analyzeStock(
      inputSymbol,
      inputName,
      inputPrice,
      inputChange,
      Date.now()
    );
    setAnalysisResult(res);
  };

  const getTargetCalcResult = () => {
    const pat = CORE_8_BULLISH_PATTERNS.find(p => p.id === calcPatternType) || CORE_8_BULLISH_PATTERNS[0];
    let projHeight = 0;
    if (pat.targetType === "HEIGHT" || pat.targetType === "CUP_DEPTH") {
      projHeight = Math.max(0, calcBreakoutPrice - calcLowPoint);
    } else {
      projHeight = calcFlagPole;
    }
    const targetPrice = calcBreakoutPrice + projHeight;
    const returnPct = ((projHeight / calcBreakoutPrice) * 100).toFixed(1);
    const recommendedSL = Math.round(calcBreakoutPrice - (projHeight * 0.4));
    
    return {
      targetPrice,
      projHeight,
      returnPct,
      recommendedSL,
      pat
    };
  };

  const calcRes = getTargetCalcResult();

  const filteredCatalog = BULLISH_PATTERN_CATALOG.filter(p => {
    if (selectedCategory === "ALL") return true;
    return p.category === selectedCategory;
  });

  const filteredStocks = trackedStocks.filter(st => {
    if (stageFilter === "ALL") return true;
    return st.stage === stageFilter;
  });

  const getStageBadge = (stage: PatternLifecycleStage) => {
    switch (stage) {
      case "DETECTED":
        return { label: "1️⃣ DETECTED (포착)", bg: "bg-zinc-800 text-zinc-300 border-zinc-700" };
      case "WATCHING":
        return { label: "2️⃣ WATCHING (관찰/수렴)", bg: "bg-blue-950/80 text-blue-300 border-blue-600/40" };
      case "CONFIRMING":
        return { label: "3️⃣ CONFIRMING (돌파검증)", bg: "bg-amber-950/80 text-amber-300 border-amber-600/40 animate-pulse" };
      case "CONFIRMED":
        return { label: "4️⃣ CONFIRMED (돌파확정)", bg: "bg-emerald-950/80 text-emerald-300 border-emerald-500/50" };
      case "RETESTING":
        return { label: "5️⃣ RETESTING (리테스트)", bg: "bg-cyan-950/80 text-cyan-300 border-cyan-500/50" };
      case "CONTINUATION":
        return { label: "6️⃣ CONTINUATION (상승지속)", bg: "bg-purple-950/80 text-purple-300 border-purple-500/50" };
      case "FAILED":
        return { label: "❌ FAILED (거짓돌파/손절)", bg: "bg-rose-950/80 text-rose-300 border-rose-600/40" };
    }
  };

  const renderPatternSvgDiagram = (type: string) => {
    switch (type) {
      case "ihns":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="20" y1="40" x2="280" y2="40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
            <text x="220" y="32" fill="#f59e0b" fontSize="10" fontWeight="bold">Neckline 저항선</text>
            <path d="M 20 40 L 50 70 L 80 40 L 140 110 L 200 40 L 230 70 L 260 40 L 290 15" stroke="#10b981" strokeWidth="3" />
            <circle cx="50" cy="70" r="4" fill="#3b82f6" />
            <text x="35" y="88" fill="#93c5fd" fontSize="9">왼쪽 어깨</text>
            <circle cx="140" cy="110" r="5" fill="#ef4444" />
            <text x="125" y="128" fill="#fca5a5" fontSize="10" fontWeight="bold">머리(Head)</text>
            <circle cx="230" cy="70" r="4" fill="#3b82f6" />
            <text x="215" y="88" fill="#93c5fd" fontSize="9">오른쪽 어깨</text>
            <line x1="260" y1="40" x2="290" y2="15" stroke="#10b981" strokeWidth="3" />
            <text x="245" y="15" fill="#34d399" fontSize="10" fontWeight="bold">🚀 돌파 Breakout!</text>
          </svg>
        );
      case "double_bottom":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="20" y1="45" x2="280" y2="45" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
            <text x="200" y="35" fill="#f59e0b" fontSize="10" fontWeight="bold">Neckline (중간 고점)</text>
            <path d="M 30 45 L 80 110 L 140 45 L 200 110 L 260 45 L 285 20" stroke="#10b981" strokeWidth="3" />
            <circle cx="80" cy="110" r="4" fill="#ef4444" />
            <text x="65" y="126" fill="#fca5a5" fontSize="9">1차 바닥</text>
            <circle cx="200" cy="110" r="4" fill="#ef4444" />
            <text x="185" y="126" fill="#fca5a5" fontSize="9">2차 바닥</text>
            <text x="240" y="20" fill="#34d399" fontSize="10" fontWeight="bold">🚀 W 돌파</text>
          </svg>
        );
      case "triple_bottom":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="20" y1="45" x2="280" y2="45" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 20 45 L 60 110 L 100 45 L 140 110 L 180 45 L 220 110 L 260 45 L 285 20" stroke="#10b981" strokeWidth="3" />
            <circle cx="60" cy="110" r="3" fill="#ef4444" />
            <circle cx="140" cy="110" r="3" fill="#ef4444" />
            <circle cx="220" cy="110" r="3" fill="#ef4444" />
            <text x="100" y="128" fill="#fca5a5" fontSize="9">비슷한 가격 3회 지지</text>
            <text x="235" y="20" fill="#34d399" fontSize="10" fontWeight="bold">🚀 3차 지지후 돌파</text>
          </svg>
        );
      case "asc_triangle":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="30" y1="35" x2="270" y2="35" stroke="#ef4444" strokeWidth="2.5" />
            <text x="170" y="25" fill="#fca5a5" fontSize="10" fontWeight="bold">수평 저항선 (매도)</text>
            <line x1="30" y1="120" x2="240" y2="35" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
            <text x="50" y="130" fill="#93c5fd" fontSize="9">저점 상승 추세선</text>
            <path d="M 30 120 L 70 35 L 110 85 L 150 35 L 190 55 L 230 35 L 275 10" stroke="#10b981" strokeWidth="3" />
            <text x="220" y="15" fill="#34d399" fontSize="10" fontWeight="bold">🚀 상단 돌파!</text>
          </svg>
        );
      case "falling_wedge":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="20" y1="20" x2="220" y2="90" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="20" y1="80" x2="220" y2="120" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 20 20 L 60 88 L 100 45 L 140 102 L 180 75 L 210 86 L 260 20" stroke="#10b981" strokeWidth="3" />
            <text x="190" y="25" fill="#34d399" fontSize="10" fontWeight="bold">🚀 하락 추세선 돌파</text>
          </svg>
        );
      case "bull_flag":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="30" y1="120" x2="110" y2="30" stroke="#10b981" strokeWidth="4" />
            <text x="25" y="70" fill="#34d399" fontSize="10" fontWeight="bold" transform="rotate(-48, 25, 70)">깃대 Flagpole</text>
            <line x1="110" y1="30" x2="200" y2="60" stroke="#f59e0b" strokeWidth="2" />
            <line x1="100" y1="60" x2="190" y2="90" stroke="#f59e0b" strokeWidth="2" />
            <path d="M 110 30 L 130 70 L 150 43 L 170 83 L 190 53 L 260 10" stroke="#10b981" strokeWidth="3" />
            <text x="200" y="20" fill="#34d399" fontSize="10" fontWeight="bold">🚀 깃발 상단 폭등</text>
          </svg>
        );
      case "bull_pennant":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="30" y1="120" x2="120" y2="30" stroke="#10b981" strokeWidth="4" />
            <line x1="120" y1="30" x2="220" y2="70" stroke="#f59e0b" strokeWidth="2" />
            <line x1="120" y1="110" x2="220" y2="70" stroke="#f59e0b" strokeWidth="2" />
            <path d="M 120 30 L 140 90 L 165 45 L 185 80 L 205 60 L 270 10" stroke="#10b981" strokeWidth="3" />
            <text x="210" y="20" fill="#34d399" fontSize="10" fontWeight="bold">🚀 페넌트 수렴 돌파</text>
          </svg>
        );
      case "cup_handle":
        return (
          <svg viewBox="0 0 300 140" className="w-full h-32 stroke-current fill-none">
            <line x1="30" y1="40" x2="270" y2="40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
            <text x="200" y="30" fill="#f59e0b" fontSize="10" fontWeight="bold">Cup Rim 넥라인</text>
            <path d="M 30 40 C 40 120, 160 120, 170 40 L 190 65 L 210 40 L 270 10" stroke="#10b981" strokeWidth="3" />
            <text x="80" y="115" fill="#6EE7B7" fontSize="10" fontWeight="bold">U자형 Cup 매집</text>
            <text x="175" y="78" fill="#93c5fd" fontSize="9">Handle 손잡이</text>
            <text x="220" y="20" fill="#34d399" fontSize="10" fontWeight="bold">🚀 전고점 파괴</text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* MAIN ENGINE BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 rounded-2xl p-6 border border-emerald-500/40 text-white shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                BULLISH MASTER INTELLIGENCE ENGINE V5.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                38종 상승 패턴 정밀 분석 엔진
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <TrendingUp className="w-7 h-7 text-emerald-400" />
              <span>상승 봉 탐지 봇 뇌엔진 (Bullish Pattern Intelligence V5)</span>
            </h2>
            <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
              단순 양봉 생성이 곧 상승이 아닙니다. <strong className="text-emerald-400 font-bold">10개 Sub-Engines 교차 검증</strong>을 통해
              <strong className="text-cyan-300 font-bold"> 캔들 형태 · 발생 위치 · 거래량/RVOL · VWAP 재탈환 · 시장구조(HL+HH) · 돌파 리테스트 · 모멘텀 다이버전스</strong>를 100점 점수화하고, 
              <strong className="text-amber-300 font-bold"> 가짜 상승 신호(Fake Bull Filter)</strong>까지 자동으로 걸러냅니다.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 shrink-0 mobile-tab-scroll no-scrollbar max-w-full overflow-x-auto">
            <button
              onClick={() => setViewMode("ENGINE_V5")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === "ENGINE_V5"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Gauge className="w-4 h-4 text-emerald-300" />
              <span>10 Sub-Engine 뇌엔진 V5</span>
            </button>

            <button
              onClick={() => setViewMode("LIFECYCLE_STAGE")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === "LIFECYCLE_STAGE"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-300" />
              <span>6-Stage 라이프사이클</span>
            </button>

            <button
              onClick={() => setViewMode("TARGET_SIMULATOR")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === "TARGET_SIMULATOR"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Target className="w-4 h-4 text-amber-300" />
              <span>목표가 시뮬레이터</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: ENGINE V5 MULTI-SUBENGINE MATRIX */}
      {viewMode === "ENGINE_V5" && (
        <div className="space-y-6">
          {/* REALTIME ANALYSIS INPUT BAR & DUAL AI SENSORY BATTLE */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-xl text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>실시간 종목 100점 상승 Confluence 및 가짜신호 분석기</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  종목 정보를 입력하면 10개 Sub-Engine이 다차원 점수를 산출하고 상승 vs 하락 AI 배틀을 진행합니다.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value)}
                  placeholder="종목코드 (예: 005930)"
                  className="w-full sm:w-28 bg-zinc-900 border border-zinc-700 text-xs text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-400 font-mono"
                />
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="종목명"
                  className="w-full sm:w-28 bg-zinc-900 border border-zinc-700 text-xs text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="number"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(Number(e.target.value))}
                  placeholder="현재가"
                  className="w-full sm:w-24 bg-zinc-900 border border-zinc-700 text-xs text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-400 font-mono"
                />
                <input
                  type="number"
                  value={inputChange}
                  onChange={(e) => setInputChange(Number(e.target.value))}
                  placeholder="등락률%"
                  className="w-full sm:w-20 bg-zinc-900 border border-zinc-700 text-xs text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-400 font-mono"
                />
                <button
                  onClick={handleRunAnalysis}
                  className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>진단 실행</span>
                </button>
              </div>
            </div>

            {/* DUAL AI SENSORY BATTLE BOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* BULL AI ENGINE */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    🟢 BULL ENGINE (상승 AI)
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {analysisResult.battle.bullScore}점
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analysisResult.battle.bullScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  감지된 상승 패턴: <strong className="text-white">{analysisResult.detectedPatterns.map(p => p.nameKr).join(", ")}</strong>
                </p>
              </div>

              {/* VS BATTLE CENTER STATUS */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center space-y-2 flex flex-col justify-center items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  ⚡ DUAL AI REALTIME COMPETITION
                </span>
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                  analysisResult.battle.dominantSide === "BULL_DOMINANT"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    : analysisResult.battle.dominantSide === "BEAR_DOMINANT"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/50"
                }`}>
                  {analysisResult.battle.dominantSide === "BULL_DOMINANT" && "🚀 BULL DOMINANT (상승 압도)"}
                  {analysisResult.battle.dominantSide === "BEAR_DOMINANT" && "⚠️ BEAR DOMINANT (하락 매물대 압박)"}
                  {analysisResult.battle.dominantSide === "BALANCED_NEUTRAL" && "⚖️ NEUTRAL BALANCED (수급 균형)"}
                </span>
                <p className="text-[11px] text-zinc-300 font-medium">
                  {analysisResult.battle.actionAdvice}
                </p>
              </div>

              {/* BEAR AI ENGINE */}
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    🔴 BEAR ENGINE (하락 AI)
                  </span>
                  <span className="text-xl font-black text-rose-400 font-mono">
                    {analysisResult.battle.bearScore}점
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analysisResult.battle.bearScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-rose-200/80 leading-relaxed">
                  하락 압박 요소: <strong className="text-white">{analysisResult.noiseFilter.reason}</strong>
                </p>
              </div>
            </div>

            {/* FAKE BULL FILTER PENALTY STATUS */}
            {analysisResult.noiseFilter.hasPenalty ? (
              <div className="p-3 bg-amber-950/60 border border-amber-500/50 rounded-xl flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong className="text-amber-300 font-black">[가짜 상승 필터 작동]</strong> {analysisResult.noiseFilter.reason}
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400 shrink-0">
                  -{analysisResult.noiseFilter.penaltyDeduction}pt 감점 적용
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>속임수 돌파 필터 통과: 거래량 + VWAP 지지 + 모멘텀 삼박자 충족</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">NO NOISE PENALTY</span>
              </div>
            )}
          </div>

          {/* 10 SUB-ENGINES CONFLUENCE BREAKDOWN */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>10대 SUB-ENGINES Confluence 점수 세부 분해 (Total 100pt Matrix)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">1. 캔들 패턴</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.bullishCandle} / 10pt
                </span>
                <span className="text-[9px] text-zinc-400 block">ATR비율 {analysisResult.metrics.bodyAtrRatio}</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">2. 지지/아랫꼬리</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.supportDefense} / 15pt
                </span>
                <span className="text-[9px] text-zinc-400 block">꼬리비율 {analysisResult.metrics.lowerWickRatio}</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">3. 시장구조 (HL+HH)</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.marketStructure} / 15pt
                </span>
                <span className="text-[9px] text-zinc-400 block">구조점수 {analysisResult.metrics.breakoutStrengthScore}</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">4. 거래량 / RVOL</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.volumeRvol} / 15pt
                </span>
                <span className="text-[9px] text-zinc-400 block">RVOL {analysisResult.metrics.rvol}배</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">5. 돌파/리테스트</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.breakoutRetest} / 15pt
                </span>
                <span className="text-[9px] text-zinc-400 block">Retest 지지 확인</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">6. VWAP 재탈환</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.vwapLevel} / 10pt
                </span>
                <span className="text-[9px] text-zinc-400 block">VWAP이격 {analysisResult.metrics.vwapDistancePct}%</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">7. RSI 다이버전스</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.momentum} / 10pt
                </span>
                <span className="text-[9px] text-zinc-400 block">모멘텀 갭 {analysisResult.metrics.rsiDivergenceGap}p</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 block font-bold">8. 후속봉 확인</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {analysisResult.scores.followThrough} / 10pt
                </span>
                <span className="text-[9px] text-zinc-400 block">회복률 {analysisResult.metrics.penetrationPct}%</span>
              </div>
            </div>
          </div>

          {/* 38-PATTERN CATALOG EXPLORER */}
          <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  <span>38종 상승 패턴 전수 카탈로그 (Bullish Pattern Master Library)</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  단일봉, 2봉, 3봉, 다중봉, 시장구조, 돌파/리테스트, 지지이탈실패, VWAP, 거래량, 다이버전스, 갭/ORB 카테고리별 패턴 탐색
                </p>
              </div>

              {/* CATEGORY FILTER BUTTONS */}
              <div className="flex flex-wrap items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                {[
                  { key: "ALL", label: "전체 (38)" },
                  { key: "SINGLE_CANDLE", label: "단일봉" },
                  { key: "TWO_CANDLES", label: "2봉" },
                  { key: "THREE_CANDLES", label: "3봉" },
                  { key: "MARKET_STRUCTURE", label: "시장구조" },
                  { key: "BREAKOUT_RETEST", label: "돌파/리테스트" },
                  { key: "FAILED_BREAKDOWN", label: "지지이탈실패" },
                  { key: "VWAP_LEVEL", label: "VWAP" },
                  { key: "VOLUME_ACCUMULATION", label: "거래량/매집" },
                  { key: "MOMENTUM_DIVERGENCE", label: "다이버전스" },
                  { key: "GAP_OPENING_RANGE", label: "갭/ORB" }
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key as any)}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer text-[10px] ${
                      selectedCategory === cat.key
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PATTERN CATALOG CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCatalog.map((pat) => (
                <div
                  key={pat.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 hover:border-emerald-500 transition shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                        {pat.code}
                      </span>
                      <h4 className="text-xs font-black text-zinc-900 dark:text-white">
                        {pat.nameKr}
                      </h4>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-500">
                      {"★".repeat(pat.importance)}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {pat.coreMeaning}
                  </p>

                  <div className="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    트리거: {pat.triggerCondition}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: 6-STAGE LIFECYCLE MONITORING BOARD */}
      {viewMode === "LIFECYCLE_STAGE" && (
        <div className="space-y-6">
          {/* 6-STAGE PIPELINE EXPLANATION BANNER */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>실시간 패턴 6단계 추적 파이프라인 (Pattern Lifecycle Pipeline)</span>
              </h3>
              <span className="text-[10px] text-zinc-400">패턴 발견 ≠ 즉시 매수 (6단계 검증 필수)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-zinc-800 text-zinc-300 block">1단계: DETECTED</span>
                <span className="font-bold text-zinc-200 block text-[11px]">패턴 구조 포착</span>
                <span className="text-[9px] text-zinc-400 block">저점/고점 캔들 구조 형성</span>
              </div>

              <div className="p-2.5 bg-blue-950/60 border border-blue-800/50 rounded-xl space-y-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-900/80 text-blue-300 block">2단계: WATCHING</span>
                <span className="font-bold text-blue-200 block text-[11px]">관찰 및 수렴</span>
                <span className="text-[9px] text-zinc-400 block">핵심 저항선 접근 대기</span>
              </div>

              <div className="p-2.5 bg-amber-950/60 border border-amber-800/50 rounded-xl space-y-1 animate-pulse">
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-900/80 text-amber-300 block">3단계: CONFIRMING</span>
                <span className="font-bold text-amber-200 block text-[11px]">돌파 수급 검증</span>
                <span className="text-[9px] text-zinc-400 block">RVOL 2.5x + VWAP 위</span>
              </div>

              <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-xl space-y-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-900/80 text-emerald-300 block">4단계: CONFIRMED</span>
                <span className="font-bold text-emerald-200 block text-[11px]">돌파 종가 확정</span>
                <span className="text-[9px] text-zinc-400 block">1차 진입 타점 (Breakout)</span>
              </div>

              <div className="p-2.5 bg-cyan-950/60 border border-cyan-800/50 rounded-xl space-y-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-900/80 text-cyan-300 block">5단계: RETESTING</span>
                <span className="font-bold text-cyan-200 block text-[11px]">리테스트 눌림목</span>
                <span className="text-[9px] text-zinc-400 block">저항이 지지로 변함 확인</span>
              </div>

              <div className="p-2.5 bg-purple-950/60 border border-purple-800/50 rounded-xl space-y-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-900/80 text-purple-300 block">6단계: CONTINUATION</span>
                <span className="font-bold text-purple-200 block text-[11px]">2차 파동 지속</span>
                <span className="text-[9px] text-zinc-400 block">패턴 높이 목표가 도달</span>
              </div>
            </div>
          </div>

          {/* SECTION: CORE 8 BULLISH PATTERNS CATALOG */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span>📌 핵심 8대 상승 패턴 카탈로그 (Core 8 Bullish Patterns)</span>
              </h3>
              <span className="text-xs text-zinc-500 font-mono">클릭하여 패턴별 구조 및 목표가 산정 공식 확인</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {CORE_8_BULLISH_PATTERNS.map((p) => {
                const isSelected = selectedPattern.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPattern(p)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-lg ring-2 ring-cyan-400/50"
                        : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-cyan-500"
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] font-mono font-bold block ${isSelected ? "text-cyan-200" : "text-zinc-400"}`}>
                        #{p.id.toString().padStart(2, "0")}
                      </span>
                      <span className="text-xs font-black block mt-0.5 leading-tight">{p.nameKr}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        isSelected ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      }`}>
                        승률 {p.winRate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SELECTED PATTERN CARD */}
            <div className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-5 space-y-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                      패턴 #{selectedPattern.id}
                    </span>
                    <h4 className="text-lg font-black text-white">
                      {selectedPattern.nameKr} <span className="text-zinc-400 text-sm font-normal">({selectedPattern.nameEn})</span>
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">{selectedPattern.structure}</p>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-bold block">백테스트 승률</span>
                    <span className="text-base font-black text-emerald-400">{selectedPattern.winRate}</span>
                  </div>
                  <div className="text-right pl-3 border-l border-zinc-800">
                    <span className="text-[10px] text-zinc-400 font-bold block">목표가 계산 타입</span>
                    <span className="text-xs font-bold text-cyan-300">{selectedPattern.targetType}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 block">📐 벡터 차트 구조도 (Vector Structural Diagram)</span>
                  {renderPatternSvgDiagram(selectedPattern.diagramSvgType)}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                    <span className="font-extrabold text-amber-400 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      <span>핵심 돌파 매수 트리거 (Breakout Trigger)</span>
                    </span>
                    <p className="text-zinc-200 font-medium">{selectedPattern.breakoutTrigger}</p>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                    <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>상승 목표구간 산정 공식 (Target Height Calculation)</span>
                    </span>
                    <p className="text-zinc-200 font-mono font-bold text-sm text-cyan-300">{selectedPattern.targetCalcFormula}</p>
                  </div>

                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                    <span className="font-extrabold text-cyan-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>실전 유의사항 및 핵심 포인트</span>
                    </span>
                    <p className="text-zinc-300">{selectedPattern.keyPoint}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: LIVE STOCKS LIFECYCLE MONITORING BOARD */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-500" />
                  <span>⚡ 실시간 6단계 패턴 추적 포착기 (Live Pattern Lifecycle Scanner)</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  현재 8대 상승 패턴을 다지며 6단계 파이프라인에서 진행 중인 종목 현황
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                {["ALL", "DETECTED", "WATCHING", "CONFIRMING", "CONFIRMED", "RETESTING", "CONTINUATION"].map((stg) => (
                  <button
                    key={stg}
                    onClick={() => setStageFilter(stg)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      stageFilter === stg
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {stg === "ALL" ? "전체 보기" : stg}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">종목명 / 티커</th>
                      <th className="py-3 px-4">포착 패턴</th>
                      <th className="py-3 px-4 text-center">진행 단계 (Stage)</th>
                      <th className="py-3 px-4 text-right">현재가</th>
                      <th className="py-3 px-4 text-right">핵심 돌파가</th>
                      <th className="py-3 px-4 text-right">목표가 (높이투영)</th>
                      <th className="py-3 px-4 text-center">수급 검증 (RVOL / VWAP)</th>
                      <th className="py-3 px-4 text-center">AI 검증점수</th>
                      <th className="py-3 px-4">진단 및 대응 전략</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium">
                    {filteredStocks.map((st) => {
                      const badge = getStageBadge(st.stage);
                      const returnPct = (((st.targetPrice - st.breakoutPrice) / st.breakoutPrice) * 100).toFixed(1);
                      return (
                        <tr key={st.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-900 dark:text-white">{st.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">{st.symbol} ({st.market})</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-300/40">
                              {st.patternNameKr}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {(st.currentPrice ?? 0).toLocaleString()}원
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {(st.breakoutPrice ?? 0).toLocaleString()}원
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            <div>{(st.targetPrice ?? 0).toLocaleString()}원</div>
                            <div className="text-[10px] text-emerald-500 font-normal">+{returnPct}% 예상</div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-0.5 text-[10px]">
                              <span className="font-bold text-cyan-600 dark:text-cyan-400">RVOL {st.rvol}x</span>
                              <span className={st.vwapAbove ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                {st.vwapAbove ? "✓ VWAP 상위" : "✕ VWAP 하위"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 bg-zinc-900 text-amber-400 font-mono font-black rounded-lg text-xs shadow-2xs">
                              {st.score}점
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300 max-w-xs">
                            <p className="line-clamp-2">{st.rationale}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: TARGET SIMULATOR TOOL */}
      {viewMode === "TARGET_SIMULATOR" && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-black text-white">
                  📐 패턴 높이 기반 실시간 목표가 &amp; 손절가 시뮬레이터
                </h3>
                <p className="text-[11px] text-zinc-400">
                  원하는 종목의 돌파 가격과 패턴 높이를 입력하면 정밀 상승 목표구간과 손절가(SL)를 즉시 산정합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">1. 적용할 상승 패턴 선택</label>
              <select
                value={calcPatternType}
                onChange={(e) => setCalcPatternType(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
              >
                {CORE_8_BULLISH_PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} {p.nameKr} ({p.targetType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">2. 돌파 저항선 가격 (Breakout Price)</label>
              <input
                type="number"
                value={calcBreakoutPrice}
                onChange={(e) => setCalcBreakoutPrice(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {calcRes.pat.targetType === "FLAGPOLE" ? (
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">3. 1차 상승 깃대(Flag Pole) 높이</label>
                <input
                  type="number"
                  value={calcFlagPole}
                  onChange={(e) => setCalcFlagPole(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">3. 패턴 바닥 저점 (Bottom Price)</label>
                <input
                  type="number"
                  value={calcLowPoint}
                  onChange={(e) => setCalcLowPoint(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold block">산출된 1차 상승 목표가</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {(calcRes.targetPrice ?? 0).toLocaleString()}원 (+{calcRes.returnPct}%)
                </span>
              </div>
              <div className="text-[11px] text-zinc-300 font-mono flex items-center justify-between border-t border-zinc-800 pt-1 mt-1">
                <span className="text-zinc-500">권장 손절가(SL)</span>
                <span className="text-rose-400 font-bold">{(calcRes.recommendedSL ?? 0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
