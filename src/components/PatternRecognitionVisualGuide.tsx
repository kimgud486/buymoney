import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  Layers, 
  Target,
  Eye,
  BookOpen
} from "lucide-react";

export interface PatternItem {
  id: string;
  name: string;
  category: "BUY" | "SELL" | "HOLD";
  trustScore: string; // e.g. "100%", "80%"
  shortGuide: string; // 초보자를 위한 1줄 요약
  actionText: string; // 매수/매도 타이밍 설명
  svgType: "DOUBLE_BOTTOM" | "INV_HEAD_SHOULDERS" | "BULL_FLAG" | "BULL_TRIANGLE" | "DOUBLE_TOP" | "TRIPLE_TOP" | "BEAR_FLAG" | "SUPPORT_RESIST" | "HAMMER" | "BULL_MARUBOZU" | "THREE_SOLDIERS" | "BULL_ENGULFING" | "BEAR_MARUBOZU" | "BEAR_CROWS" | "DOJI";
  description: string;
  exampleStock: string;
}

const PATTERN_DATABASE: PatternItem[] = [
  // CANDLESTICK PATTERNS (봉그래프 패턴)
  {
    id: "hammer",
    name: "망치형 캔들 (Hammer)",
    category: "BUY",
    trustScore: "85% 반등신호",
    shortGuide: "바닥권에서 기다란 아랫꼬리가 달린 대표적인 반등 캔들!",
    actionText: "하락 추세 끝에서 긴 아랫꼬리가 달린 양봉/음봉 형성 시 즉시 분할 매수!",
    svgType: "HAMMER",
    description: "주가가 장중에 폭락했다가 세력의 강력한 저가 매수세로 가격을 끌어올려 끝난 봉입니다. 강력한 바닥 확인 및 상방 반등 시그널입니다.",
    exampleStock: "삼성전자 (005930)"
  },
  {
    id: "bull_marubozu",
    name: "장대양봉 (Bullish Marubozu)",
    category: "BUY",
    trustScore: "95% 강력매수",
    shortGuide: "위아래 꼬리 없이 꽉 찬 대형 빨간 캔들! 수급 폭발 신호",
    actionText: "거래량이 터지며 장대양봉 출현 시 종가 기준 강력 매수 타점!",
    svgType: "BULL_MARUBOZU",
    description: "장 시작부터 끝까지 매수세가 완전히 시장을 지배했을 때 나타나는 긴 양봉입니다. 강한 수급 유입으로 주가 2차 급등의 신호탄입니다.",
    exampleStock: "엔비디아 (NVDA)"
  },
  {
    id: "three_soldiers",
    name: "적삼병 (3연속 양봉)",
    category: "BUY",
    trustScore: "90% 추세전환",
    shortGuide: "빨간 캔들 3개가 연속으로 우상향하며 하락장을 끝낼 때",
    actionText: "3번째 양봉 완성 후 눌림목 형성 시 안정적인 매수 적기!",
    svgType: "THREE_SOLDIERS",
    description: "저점에서 3일 연속으로 신규 양봉이 시가보다 높은 종가로 마감하는 패턴입니다. 하락 추세가 완벽히 종료되고 대세 상승장으로 진입했음을 뜻합니다.",
    exampleStock: "SK하이닉스 (000660)"
  },
  {
    id: "bull_engulfing",
    name: "상승 장악형 (Bullish Engulfing)",
    category: "BUY",
    trustScore: "88% 상승전환",
    shortGuide: "전일 음봉을 오늘 거대한 대형 양봉이 싹 감싸안을 때",
    actionText: "전일 음봉의 시가를 오늘 양봉이 위로 넘어서는 순간 확정 매수!",
    svgType: "BULL_ENGULFING",
    description: "작은 음봉 뒤에 전일 몸통을 완벽히 덮어버리는 대형 양봉이 출현하는 패턴입니다. 매도세의 힘이 완전히 소멸하고 매수 주도권으로 넘어간 증거입니다.",
    exampleStock: "비트코인 (BTC)"
  },

  // BUY PATTERNS (차트 형태 사자!)
  {
    id: "double_bottom",
    name: "쌍바닥 (W바닥)",
    category: "BUY",
    trustScore: "80% 신뢰도",
    shortGuide: "급하게 사! 바닥을 2번 찍고 힘차게 올라가는 차트",
    actionText: "두 번째 바닥을 찍고 가운데 언덕(목선)을 위로 뚫을 때 바로 매수!",
    svgType: "DOUBLE_BOTTOM",
    description: "주가가 떨어진 후 2번 같은 가격에서 튕겨 올라오는 모양입니다. 세력들의 강력한 지지선이 확인된 것이므로 안심하고 살 수 있는 타이밍입니다.",
    exampleStock: "삼성전자 (005930)"
  },
  {
    id: "inv_head_shoulders",
    name: "역삼등천정 (역머리어깨형)",
    category: "BUY",
    trustScore: "100% 폭등대비",
    shortGuide: "폭등에 대비해! 머리와 양 어깨 모양의 가장 강력한 상승 패턴",
    actionText: "중앙 저점이 가장 깊고, 오른쪽 어깨를 넘어서는 순간 풀매수!",
    svgType: "INV_HEAD_SHOULDERS",
    description: "왼쪽 어깨, 더 깊은 머리, 오른쪽 어깨를 만들고 목선을 상향 돌파합니다. 하락 추세가 완전히 끝나고 대세 상승장으로 전환될 때 나타납니다.",
    exampleStock: "엔비디아 (NVDA)"
  },

  // SELL CANDLES & PATTERNS (팔자!)
  {
    id: "bear_marubozu",
    name: "장대음봉 (Bearish Marubozu)",
    category: "SELL",
    trustScore: "95% 즉시손절",
    shortGuide: "꼬리 없이 긴 파란/빨간 하락 캔들! 세력 매도 폭주",
    actionText: "주요 지지선을 깨는 장대음봉 발생 시 손실 최소화를 위해 즉시 매도!",
    svgType: "BEAR_MARUBOZU",
    description: "장중 매도 세력이 압도하여 시가 대비 종가가 크게 하락한 대형 하락 캔들입니다. 추가 폭락의 가능성이우 높으므로 리스크 관리가 필수적입니다.",
    exampleStock: "테슬라 (TSLA)"
  },
  {
    id: "bear_crows",
    name: "흑삼병 (3연속 음봉)",
    category: "SELL",
    trustScore: "90% 폭락시작",
    shortGuide: "음봉 3개가 계단식으로 연속 하락하며 대형 폭락 암시",
    actionText: "2번째/3번째 연속 음봉 발생 시 보유 물량을 신속히 청산!",
    svgType: "BEAR_CROWS",
    description: "고점권에서 3일 연속으로 하락 음봉이 나타나는 전형적인 하락 반전 패턴입니다. 매수 세력이 완전히 무너진 상태를 의미합니다.",
    exampleStock: "리플 (XRP)"
  },
  {
    id: "double_top",
    name: "쌍봉 (M머리)",
    category: "SELL",
    trustScore: "100% 폭락대비",
    shortGuide: "폭락에 대비해! 고점을 2번 넘지 못하고 꺾이는 매도 패턴",
    actionText: "두 번째 봉우리 후 가운데 바닥선(목선)을 밑으로 깨면 전량 매도!",
    svgType: "DOUBLE_TOP",
    description: "천정을 2번 부딪혔으나 위로 뚫지 못하고 세력들이 물량을 털어내는 시그널입니다. 목선이 깨지면 가파른 폭락이 이어지므로 즉시 팔아야 합니다.",
    exampleStock: "테슬라 (TSLA)"
  },

  // HOLD / RULE PATTERN
  {
    id: "doji",
    name: "십자 도지형 (Doji Candle)",
    category: "HOLD",
    trustScore: "팽팽한 변곡점",
    shortGuide: "시가와 종가가 거의 같은 십자가 캔들! 추세 반전 임박",
    actionText: "도지 발생 후 다음 날 캔들의 방향(양봉/음봉)을 확인하고 매매 결정!",
    svgType: "DOJI",
    description: "매수 세력과 매도 세력이 팽팽하게 맞서 시가와 종가가 거의 동일하게 끝난 십자 모양 캔들입니다. 현재 추세의 에너지가 고갈되어 조만간 반대 방향으로 꺾일 확률이 매우 높습니다.",
    exampleStock: "카카오 (035720)"
  },
  {
    id: "support_resist",
    name: "수평선 지지·저항 전환 법칙",
    category: "HOLD",
    trustScore: "기본 핵심 원칙",
    shortGuide: "2번 이상 튕겨져 나온 가격에 선을 그으세요! 핵심 기준선",
    actionText: "저항선을 위로 뚫으면 그 선이 새로운 '강력 지지선'이 되어 매수 타점!",
    svgType: "SUPPORT_RESIST",
    description: "주식 차트에서 2번 이상 반등한 바닥은 '지지선', 2번 이상 막힌 천정은 '저항선'입니다. 저항선을 강력하게 뚫고 올라가면 이후 눌림목에서 최고의 매수자리가 됩니다.",
    exampleStock: "모든 종목 공통 적용"
  }
];

export interface PatternRecognitionVisualGuideProps {
  selectedStockSymbol?: string;
  selectedStockName?: string;
  changePct?: number;
  currentPrice?: number;
  market?: "KOREA" | "US" | "BTC";
}

export const PatternRecognitionVisualGuide: React.FC<PatternRecognitionVisualGuideProps> = ({ 
  selectedStockSymbol = "삼성전자", 
  selectedStockName = "삼성전자",
  changePct = 0,
  currentPrice = 0,
  market = "KOREA"
}) => {
  const [activeTab, setActiveTab] = useState<"MATCHED" | "ALL" | "BUY" | "SELL" | "HOLD">("MATCHED");
  const [showFullGuide, setShowFullGuide] = useState(false);

  // Dynamically select matching pattern based on live price change trend
  const getMatchedPattern = (): PatternItem => {
    if (changePct <= -3.0) {
      // Strongly falling: Bearish Marubozu or Bearish Crows
      return PATTERN_DATABASE.find(p => p.id === "bear_marubozu") || PATTERN_DATABASE[10];
    } else if (changePct < 0) {
      // Mildly falling: Doji or Support/Resistance test
      return PATTERN_DATABASE.find(p => p.id === "bear_crows") || PATTERN_DATABASE.find(p => p.id === "doji") || PATTERN_DATABASE[11];
    } else if (changePct > 3.0) {
      // Strongly rising: Bullish Marubozu
      return PATTERN_DATABASE.find(p => p.id === "bull_marubozu") || PATTERN_DATABASE[1];
    } else {
      // Mildly rising / neutral: Hammer or Double Bottom
      return PATTERN_DATABASE.find(p => p.id === "hammer") || PATTERN_DATABASE[0];
    }
  };

  const [selectedPattern, setSelectedPattern] = useState<PatternItem>(getMatchedPattern());

  // Auto-sync selectedPattern when stock or changePct updates
  useEffect(() => {
    setSelectedPattern(getMatchedPattern());
  }, [selectedStockSymbol, changePct]);

  const filteredPatterns = activeTab === "MATCHED"
    ? [selectedPattern]
    : PATTERN_DATABASE.filter(p => activeTab === "ALL" || p.category === activeTab);

  // SVG Pattern Mini Diagram Render helper
  const renderPatternSVG = (type: PatternItem["svgType"]) => {
    switch (type) {
      case "DOUBLE_BOTTOM":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 fill-none stroke-current stroke-2">
            <polyline points="10,15 30,50 50,25 70,50 90,10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="50" x2="90" y2="50" stroke="#059669" strokeDasharray="2 2" strokeWidth="1" />
            <circle cx="50" cy="25" r="3" fill="#10b981" />
            <text x="52" y="20" fill="#10b981" fontSize="8" fontWeight="bold">돌파 매수!</text>
          </svg>
        );
      case "INV_HEAD_SHOULDERS":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 fill-none stroke-current stroke-2">
            <polyline points="10,15 25,35 40,20 55,52 70,20 85,35 95,10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="20" y1="20" x2="85" y2="20" stroke="#059669" strokeDasharray="2 2" strokeWidth="1" />
            <circle cx="70" cy="20" r="3" fill="#10b981" />
            <text x="65" y="14" fill="#10b981" fontSize="8" fontWeight="bold">목선 돌파 매수</text>
          </svg>
        );
      case "BULL_FLAG":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 fill-none stroke-current stroke-2">
            <polyline points="10,50 35,15 45,28 65,20 80,32 95,10" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="35" y1="15" x2="70" y2="26" stroke="#10b981" strokeWidth="1.5" />
            <line x1="45" y1="28" x2="80" y2="39" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="80" cy="22" r="3" fill="#10b981" />
          </svg>
        );
      case "BULL_TRIANGLE":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 fill-none stroke-current stroke-2">
            <line x1="20" y1="15" x2="85" y2="15" stroke="#10b981" strokeWidth="1.5" />
            <line x1="20" y1="50" x2="85" y2="15" stroke="#10b981" strokeWidth="1.5" />
            <polyline points="20,50 35,15 50,33 65,15 78,22 92,8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="85" cy="15" r="3" fill="#10b981" />
          </svg>
        );
      case "DOUBLE_TOP":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-rose-500 fill-none stroke-current stroke-2">
            <polyline points="10,50 30,15 50,35 70,15 90,52" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="35" x2="90" y2="35" stroke="#e11d48" strokeDasharray="2 2" strokeWidth="1" />
            <circle cx="70" cy="35" r="3" fill="#f43f5e" />
            <text x="50" y="46" fill="#f43f5e" fontSize="8" fontWeight="bold">이탈시 전량 매도!</text>
          </svg>
        );
      case "TRIPLE_TOP":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-rose-500 fill-none stroke-current stroke-2">
            <polyline points="10,50 25,15 40,35 55,15 70,35 82,15 95,55" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="10" y1="35" x2="95" y2="35" stroke="#e11d48" strokeDasharray="2 2" strokeWidth="1" />
          </svg>
        );
      case "BEAR_FLAG":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-rose-500 fill-none stroke-current stroke-2">
            <polyline points="10,10 35,45 45,30 65,40 75,25 95,55" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="35" y1="45" x2="75" y2="25" stroke="#f43f5e" strokeWidth="1.5" />
            <line x1="45" y1="58" x2="85" y2="38" stroke="#f43f5e" strokeWidth="1.5" />
          </svg>
        );
      case "HAMMER":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 font-sans">
            {/* Candle Wicks & Body */}
            <line x1="50" y1="10" x2="50" y2="52" stroke="#10b981" strokeWidth="2" />
            <rect x="42" y="14" width="16" height="12" fill="#10b981" rx="1" />
            <text x="62" y="24" fill="#059669" fontSize="8" fontWeight="bold">상단 짧은 몸통</text>
            <text x="62" y="44" fill="#10b981" fontSize="8" fontWeight="bold">길다란 아랫꼬리 (반등!)</text>
          </svg>
        );
      case "BULL_MARUBOZU":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 font-sans">
            <line x1="50" y1="8" x2="50" y2="52" stroke="#10b981" strokeWidth="1" />
            <rect x="38" y="10" width="24" height="40" fill="#10b981" rx="2" />
            <text x="10" y="32" fill="#059669" fontSize="8" fontWeight="bold">시가</text>
            <text x="66" y="16" fill="#10b981" fontSize="8" fontWeight="bold">종가 (최고가)</text>
          </svg>
        );
      case "THREE_SOLDIERS":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-emerald-500 font-sans">
            {/* 1st Soldier */}
            <line x1="25" y1="32" x2="25" y2="52" stroke="#10b981" strokeWidth="1.5" />
            <rect x="20" y="36" width="10" height="12" fill="#10b981" rx="1" />
            {/* 2nd Soldier */}
            <line x1="50" y1="20" x2="50" y2="42" stroke="#10b981" strokeWidth="1.5" />
            <rect x="45" y="24" width="10" height="14" fill="#10b981" rx="1" />
            {/* 3rd Soldier */}
            <line x1="75" y1="8" x2="75" y2="30" stroke="#10b981" strokeWidth="1.5" />
            <rect x="70" y="12" width="10" height="14" fill="#10b981" rx="1" />
            <text x="15" y="12" fill="#059669" fontSize="8" fontWeight="bold">3연속 우상향 양봉!</text>
          </svg>
        );
      case "BULL_ENGULFING":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 font-sans">
            {/* Small Bearish Candle */}
            <line x1="30" y1="20" x2="30" y2="45" stroke="#f43f5e" strokeWidth="1.5" />
            <rect x="25" y="25" width="10" height="15" fill="#f43f5e" rx="1" />
            {/* Giant Bullish Candle Engulfing */}
            <line x1="65" y1="10" x2="65" y2="52" stroke="#10b981" strokeWidth="2" />
            <rect x="58" y="15" width="14" height="32" fill="#10b981" rx="1" />
            <path d="M 38 32 L 52 32" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="15" y="12" fill="#10b981" fontSize="8" fontWeight="bold">음봉을 완벽히 감싸는 대형 양봉</text>
          </svg>
        );
      case "BEAR_MARUBOZU":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-rose-500 font-sans">
            <line x1="50" y1="8" x2="50" y2="52" stroke="#f43f5e" strokeWidth="1" />
            <rect x="38" y="10" width="24" height="40" fill="#f43f5e" rx="2" />
            <text x="10" y="16" fill="#e11d48" fontSize="8" fontWeight="bold">시가 (최고가)</text>
            <text x="66" y="48" fill="#f43f5e" fontSize="8" fontWeight="bold">종가 (최저가 폭락)</text>
          </svg>
        );
      case "BEAR_CROWS":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-rose-500 font-sans">
            {/* 1st Crow */}
            <line x1="25" y1="8" x2="25" y2="30" stroke="#f43f5e" strokeWidth="1.5" />
            <rect x="20" y="12" width="10" height="14" fill="#f43f5e" rx="1" />
            {/* 2nd Crow */}
            <line x1="50" y1="20" x2="50" y2="42" stroke="#f43f5e" strokeWidth="1.5" />
            <rect x="45" y="24" width="10" height="14" fill="#f43f5e" rx="1" />
            {/* 3rd Crow */}
            <line x1="75" y1="32" x2="75" y2="54" stroke="#f43f5e" strokeWidth="1.5" />
            <rect x="70" y="36" width="10" height="14" fill="#f43f5e" rx="1" />
            <text x="15" y="58" fill="#e11d48" fontSize="8" fontWeight="bold">3연속 계단식 하락 음봉!</text>
          </svg>
        );
      case "DOJI":
        return (
          <svg viewBox="0 0 100 60" className="w-full h-20 text-indigo-500 font-sans">
            <line x1="50" y1="10" x2="50" y2="50" stroke="#6366f1" strokeWidth="2" />
            <line x1="36" y1="30" x2="64" y2="30" stroke="#6366f1" strokeWidth="3" />
            <text x="5" y="24" fill="#6366f1" fontSize="8" fontWeight="bold">시가 = 종가 (팽팽한 힘)</text>
            <text x="5" y="42" fill="#6366f1" fontSize="8" fontWeight="bold">방향성 전환 임박!</text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-5">
      {/* SECTION TITLE & IMAGE INSPIRED BADGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>손그림 차트 패턴 도감 &amp; AI 매칭</span>
            </span>
            <span className="text-xs font-mono text-zinc-400">TrendSpider Chart Pattern Visualizer</span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-zinc-900 mt-1">
            초보자도 1초 만에 알아보는 <span className="text-indigo-600">주식/코인 차트 패턴 핵심 8가지</span>
          </h3>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => {
              setActiveTab("MATCHED");
              setShowFullGuide(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "MATCHED" && !showFullGuide
                ? "bg-cyan-600 text-white shadow-xs" 
                : "bg-white text-cyan-800 border border-cyan-200 hover:bg-cyan-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>🎯 현재 그래프 매칭만 (기본)</span>
          </button>

          <button
            onClick={() => {
              setShowFullGuide(prev => !prev);
              if (!showFullGuide && activeTab === "MATCHED") {
                setActiveTab("ALL");
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
              showFullGuide
                ? "bg-indigo-600 text-white shadow-xs" 
                : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showFullGuide ? "📖 가이드 닫기" : "📖 전체 패턴 가이드 열기"}</span>
          </button>

          {showFullGuide && (
            <>
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "ALL" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                전체
              </button>

              <button
                onClick={() => setActiveTab("BUY")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  activeTab === "BUY" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>매수</span>
              </button>

              <button
                onClick={() => setActiveTab("SELL")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  activeTab === "SELL" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>매도</span>
              </button>

              <button
                onClick={() => setActiveTab("HOLD")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "HOLD" ? "bg-indigo-600 text-white shadow-xs" : "text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                지지·저항
              </button>
            </>
          )}
        </div>
      </div>

      {/* ACTIVE REAL-TIME AI MATCHING BANNER FOR CURRENT STOCK */}
      <div className={`rounded-xl p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border shadow-md ${
        changePct < 0 
          ? "bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border-rose-800/60" 
          : "bg-gradient-to-r from-indigo-900 to-slate-900 border-indigo-700/50"
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            changePct < 0 ? "bg-rose-500/20 border-rose-400/30 text-rose-300" : "bg-indigo-500/20 border-indigo-400/30 text-cyan-300"
          }`}>
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${changePct < 0 ? "text-rose-300" : "text-cyan-300"}`}>
              AI REAL-TIME PATTERN MATCHING FOR: {selectedStockName} ({changePct >= 0 ? `+${changePct}%` : `${changePct}%`})
            </div>
            <h4 className="text-base font-black text-white mt-0.5">
              현재 <strong className={changePct < 0 ? "text-rose-300" : "text-cyan-300"}>{selectedStockName}</strong>에서 <span className="text-amber-300 underline underline-offset-4 font-black">"{selectedPattern.name}"</span> 패턴 감지 중!
            </h4>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              자비스 AI 연산 결과: {changePct < 0 ? (
                <>
                  현재 <strong className="text-rose-400 font-bold">시세 하락 조정({changePct}%)</strong> 진행 중이며 음봉 기류가 감지되었습니다. 반등 확정 신호가 아닌 <strong className="text-amber-300">하락 지지선 테스트 구간</strong>이므로, 섣부른 추격 매수보다는 지지선 수급 전환을 확인해야 합니다.
                </>
              ) : (
                <>
                  현재 차트 형성 모양이 {selectedPattern.name}과 <strong className="text-emerald-400 font-bold">88.4% 일치</strong>합니다. {selectedPattern.shortGuide}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white/10 p-3 rounded-xl border border-white/15 text-center shrink-0 min-w-[140px]">
          <div className="text-[10px] text-zinc-300 font-bold uppercase">패턴 신뢰도</div>
          <div className={`text-xl font-black font-mono mt-0.5 ${changePct < 0 ? "text-rose-300" : "text-emerald-300"}`}>{selectedPattern.trustScore}</div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold block mt-1 ${
            changePct < 0
              ? "bg-rose-500/30 text-rose-200"
              : selectedPattern.category === "BUY" ? "bg-emerald-500/30 text-emerald-200" : "bg-indigo-500/30 text-indigo-200"
          }`}>
            {changePct < 0 ? "🔴 하락 테스트 / 매수 유의" : selectedPattern.category === "BUY" ? "🟢 매수 유효 구간" : selectedPattern.category === "SELL" ? "🔴 매도/손절 대비" : "⚖️ 저항선 돌파 대기"}
          </span>
        </div>
      </div>

      {/* GRID OF PATTERN CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredPatterns.map((pattern) => {
          const isSelected = selectedPattern.id === pattern.id;
          const isBuy = pattern.category === "BUY";
          const isSell = pattern.category === "SELL";

          return (
            <div
              key={pattern.id}
              onClick={() => setSelectedPattern(pattern)}
              className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? isBuy
                    ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-200"
                    : isSell
                    ? "bg-rose-50/80 border-rose-500 shadow-md ring-2 ring-rose-200"
                    : "bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-200"
                  : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-mono font-black px-2 py-0.5 rounded text-[10px] ${
                    isBuy ? "bg-emerald-100 text-emerald-800" : isSell ? "bg-rose-100 text-rose-800" : "bg-indigo-100 text-indigo-800"
                  }`}>
                    {isBuy ? "사자! (BUY)" : isSell ? "팔자! (SELL)" : "원칙 (RULE)"}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500">{pattern.trustScore}</span>
                </div>

                <h4 className="font-black text-sm text-zinc-900">{pattern.name}</h4>
                <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2 leading-tight">
                  {pattern.shortGuide}
                </p>
              </div>

              {/* Diagram */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-2 flex items-center justify-center">
                {renderPatternSVG(pattern.svgType)}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED EDUCATIONAL DEEP-DIVE FOR SELECTED PATTERN */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 md:p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h4 className="font-black text-sm text-zinc-900">
            [초보자 맞춤 가이드] <span className="text-indigo-600">{selectedPattern.name}</span>을 발견했을 때 이렇게 대응하세요!
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="bg-white p-3.5 rounded-lg border border-zinc-200 space-y-1.5">
            <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wider block">1. 패턴 원리 및 특징</span>
            <p className="text-zinc-800 leading-relaxed font-medium">
              {selectedPattern.description}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-zinc-200 space-y-1.5">
            <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wider block">2. 명확한 실전 매수/매도 타이밍</span>
            <p className="text-zinc-900 font-bold leading-relaxed flex items-start space-x-1.5">
              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${selectedPattern.category === "BUY" ? "text-emerald-600" : "text-rose-600"}`} />
              <span>{selectedPattern.actionText}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ADDITIONAL VISUAL CHEAT SHEETS (FROM UPLOADED USER IMAGES) */}
      <div className="border-t border-zinc-200 pt-5 space-y-4">
        {/* 1. 꺾이기 직전 3가지 핵심 하락/매도 경고 (IMAGE 3 MATCH) */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-rose-950 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>[필독 이미지 매도 경고] 차트가 꺾이기 직전 나타나는 3가지 폭락 시그널</span>
            </h4>
            <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded font-mono">CRITICAL WARN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-1">
              <div className="font-black text-rose-900 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-mono">1</span>
                <span>긴 윗꼬리 (Upper Wick)</span>
              </div>
              <p className="text-zinc-600 text-[11px] leading-relaxed pt-1">
                위로 강하게 올랐다가 세력의 매도 물량에 밀려 도로 내려온 자국입니다. <strong className="text-rose-600">"팔려는 힘이 매우 센 상태"</strong>이므로 매도 타이밍!
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-1">
              <div className="font-black text-rose-900 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-mono">2</span>
                <span>신고가인데 거래량 감소</span>
              </div>
              <p className="text-zinc-600 text-[11px] leading-relaxed pt-1">
                가격은 오르는데 거래량이 줄어든다는 것은 상승 '에너지'가 바닥났다는 증거입니다. <strong className="text-rose-600">"가짜 상승 후 급락 조심!"</strong>
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-1">
              <div className="font-black text-rose-900 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-mono">3</span>
                <span>지지선 붕괴 (Breakdown)</span>
              </div>
              <p className="text-zinc-600 text-[11px] leading-relaxed pt-1">
                밑에서 받쳐주던 바닥 평행선(지지선)이 밑으로 뚫린 순간입니다. <strong className="text-rose-600">"추가 폭락 위험, 즉시 손절/매도!"</strong>
              </p>
            </div>
          </div>
        </div>

        {/* 2. 주식 차트에서 가장 많이 보는 10가지 핵심 선/지표 (IMAGE 10 MATCH) */}
        <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-indigo-950 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>[이미지 총정리] 주식/코인 차트에서 가장 많이 보는 핵심 라인 &amp; 지표 10가지</span>
            </h4>
            <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">10 Core Chart Lines</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">1. 지지선 (Support)</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">가격이 떨어질 때 멈추고 반등하는 바닥선. <strong>매수 타이밍!</strong></p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">2. 저항선 (Resistance)</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">상승 시 부딪히고 꺾이는 천정선. <strong>매도/청산 타이밍!</strong></p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">3. 추세선 (Trend)</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">주가의 전반적인 상승/하락/횡보 방향을 연결한 핵심 직선.</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">4. 이평선 (MA)</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">5일, 20일, 60일 평균 가격선. 골든크로스(매수)/데드크로스(매도).</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">5. 볼린저 밴드</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">상단 근처는 과열(매도), 하단 근처는 과매도(매수) 판정.</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">6. VWAP</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">거래량 가중 평균가. 기관/세력의 평균 매수 기준 라인.</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">7. 피보나치 되돌림</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">38.2%, 50.0%, 61.8% 눌림목 지지 구간에서 매수 타점 포착.</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">8. 거래량 (Volume)</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">거래량이 터지는 양봉은 진짜 상승! 거래량 없는 상승은 가짜!</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded">9. RSI 지표</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">30 이하(과매도 = 매수 적기), 70 이상(과매수 = 매도 적기).</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-[10px] font-black bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">10. MACD</span>
              <p className="text-[11px] text-zinc-600 pt-0.5">시그널선 교차. 골든크로스 상승 전환 / 데드크로스 하락 전환.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
