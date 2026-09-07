import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  Search,
  BookOpen,
  Layers,
  Target,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  BarChart3,
  HelpCircle,
  Award,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  Clock,
  Eye,
  Info,
  ChevronRight,
  Flame,
  LineChart as LineChartIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Line,
  Area,
  ReferenceLine
} from "recharts";
import { useApp } from "../context/AppContext";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";
import { realtimeMarketFeedService, LiveMarketQuote } from "../services/realtimeMarketFeedService";

// ----------------------------------------------------------------------
// DATA TYPES & TYPES
// ----------------------------------------------------------------------
export interface TradingTerm {
  term: string;
  krName: string;
  definition: string;
  keyRole: string;
}

export interface ChartPattern {
  id: string;
  name: string;
  krName: string;
  type: "BULLISH" | "BEARISH";
  structureText: string;
  keyFeature: string;
  favorableConditions: string[];
  svgDiagram: string;
}

export interface BullishCandlePattern {
  id: number;
  name: string;
  krName: string;
  structureDescription: string;
  marketMeaning: string;
  reinforcementConditions: string[];
  svgIcon: string;
}

export interface StockSampleData {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  price: number;
  changePct: number;
  rvol: number;
  tradingValueBn: number; // 거래대금 (억원 or $M)
  vwapStatus: "ABOVE" | "RECLAIM" | "BELOW";
  sslSwept: boolean;
  rsScore: number; // 0-100 Relative Strength
  detectedChartPattern: string;
  detectedCandlePattern: string;
  necklinePrice: number;
  stopLossPrice: number;
  targetPrice1: number;
  targetPrice2: number;
}

// ----------------------------------------------------------------------
// 장 시작 30분 법칙 (MARKET OPEN 30-MINUTE RULE) DATA & TYPES
// ----------------------------------------------------------------------
export interface ThirtyMinuteRule {
  id: string;
  ruleNumber: number;
  title: string;
  subtitle: string;
  judgment: "매수 가능 (Bullish)" | "매수 금지 (Forbidden)" | "관망 / 약세 (Flat)";
  statusType: "BUY" | "FORBIDDEN" | "NEUTRAL";
  badgeText: string;
  badgeBg: string;
  description: string;
  keyAction: string;
  svgChartType: "flat" | "rise_drop_below" | "rise_hold_open" | "drop_reclaim_open" | "drop_fail_reclaim";
}

export const THIRTY_MINUTE_RULES: ThirtyMinuteRule[] = [
  {
    id: "rule_flat",
    ruleNumber: 1,
    title: "횡보 / 무반응 패턴",
    subtitle: "장 시작 후 30분 동안 움직임이 거의 없는 경우",
    judgment: "관망 / 약세 (Flat)",
    statusType: "NEUTRAL",
    badgeText: "⛔ 관망 - 시세 분출 희박",
    badgeBg: "bg-slate-800 text-slate-300 border-slate-700",
    description: "장 시작 후 30분 동안 시가 근처에서 주가 변화가 없으면 세력의 주도 수급이 전혀 실리지 않은 상태입니다. 그날 큰 시세는 나오기 어렵습니다.",
    keyAction: "매수 대상 제외 및 관망 (주도주 거래대금 종목으로 이동)",
    svgChartType: "flat"
  },
  {
    id: "rule_rise_drop",
    ruleNumber: 2,
    title: "상승 후 시가 붕괴 패턴",
    subtitle: "장 시작 30분 안에 상승 후 하락하고 시가를 깨버린 경우",
    judgment: "매수 금지 (Forbidden)",
    statusType: "FORBIDDEN",
    badgeText: "❌ 매수 금지! (Pumping & Dumping)",
    badgeBg: "bg-rose-950 text-rose-300 border-rose-700",
    description: "장 초반 상승 시늉으로 개미 물량을 유인한 뒤 30분 안에 시가를 깨고 내려가는 전형적인 음봉 털기 패턴입니다. 추가 하락 가능성이 크므로 절대 매수 금지입니다.",
    keyAction: "매수 절대 금지 및 보유자 손절/비중 축소 대응",
    svgChartType: "rise_drop_below"
  },
  {
    id: "rule_rise_hold",
    ruleNumber: 3,
    title: "상승 후 시가 지지 패턴",
    subtitle: "장 시작 30분 안에 상승 후 하락했지만 시가를 지켜낸 경우",
    judgment: "매수 가능 (Bullish)",
    statusType: "BUY",
    badgeText: "💙 강세 상승 가능성 (시가 지지 성공)",
    badgeBg: "bg-emerald-950 text-emerald-300 border-emerald-600",
    description: "장 시작 후 상승했다가 눌림목 하락이 나왔으나 시가(Open Price) 방어선을 무너뜨리지 않고 강하게 지지받는 경우입니다. 이후 2차 폭등이 나올 확률이 매우 큽니다.",
    keyAction: "시가 부근 지지 확인 즉시 적극 매수 (Setup Quality 급상승)",
    svgChartType: "rise_hold_open"
  },
  {
    id: "rule_drop_reclaim",
    ruleNumber: 4,
    title: "하락 후 시가 재돌파 패턴",
    subtitle: "장 시작 30분 안에 하락 후 반등해서 시가를 돌파한 경우",
    judgment: "매수 가능 (Bullish)",
    statusType: "BUY",
    badgeText: "💙 본격 상승 개시 (시가 Reclaim V자 반등)",
    badgeBg: "bg-blue-950 text-blue-300 border-blue-600",
    description: "장 초반 의도적 하락으로 손절 물량(SSL Sweep)을 흡수한 후, 강력한 거래량과 함께 시가를 상향 재돌파하는 시점입니다. 강력한 V자 급등 파동이 개시됩니다.",
    keyAction: "시가 재돌파 확인 즉시 매수 진입 (Bullish CHoCH 성립)",
    svgChartType: "drop_reclaim_open"
  },
  {
    id: "rule_drop_fail",
    ruleNumber: 5,
    title: "하락 후 시가 저항 저지 패턴",
    subtitle: "장 시작 30분 안에 하락 후 반등했지만 시가를 넘지 못한 경우",
    judgment: "매수 금지 (Forbidden)",
    statusType: "FORBIDDEN",
    badgeText: "❌ 매수하지 마세요! (시가 저항 2차 하락)",
    badgeBg: "bg-rose-950 text-rose-300 border-rose-700",
    description: "하락 후 기술적 반등을 시도했으나 시가 가격대가 강한 저항선으로 작용하여 밀리는 케이스입니다. 시가 회복 실패 시 재차 2차 하락 파동으로 진입하므로 매수 금지입니다.",
    keyAction: "매수 금지 및 시가 회복 전까지 진입 절대 보류",
    svgChartType: "drop_fail_reclaim"
  }
];

export const ThirtyMinuteRuleChartSVG: React.FC<{ type: ThirtyMinuteRule["svgChartType"] }> = ({ type }) => {
  return (
    <svg className="w-full h-36 bg-slate-950 border border-slate-800 rounded-xl p-2" viewBox="0 0 300 150">
      {/* Background & Axes */}
      <line x1="30" y1="20" x2="30" y2="130" stroke="#475569" strokeWidth="1.5" />
      <line x1="30" y1="130" x2="280" y2="130" stroke="#475569" strokeWidth="1.5" />
      <text x="12" y="15" fill="#94a3b8" fontSize="10" fontWeight="bold">주가↑</text>
      <text x="245" y="145" fill="#94a3b8" fontSize="10" fontWeight="bold">시간</text>
      
      {/* 30Min Vertical Guideline */}
      <line x1="160" y1="20" x2="160" y2="130" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      <text x="148" y="142" fill="#64748b" fontSize="9" fontWeight="bold">30분</text>

      {/* Red Dashed OPEN PRICE Line */}
      <line x1="30" y1="80" x2="280" y2="80" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
      <text x="32" y="75" fill="#ef4444" fontSize="10" fontWeight="bold">시가</text>

      {/* DRAW SPECIFIC RULE PATHS */}
      {type === "flat" && (
        <g>
          {/* Flat line around Open price */}
          <path d="M 30,80 L 60,78 L 90,82 L 120,79 L 160,81 L 200,80 L 240,81" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Badge: Neutral Minus */}
          <circle cx="255" cy="80" r="14" fill="#334155" stroke="#64748b" strokeWidth="2" />
          <line x1="247" y1="80" x2="263" y2="80" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {type === "rise_drop_below" && (
        <g>
          {/* Rises up, then crashes below open line */}
          <path d="M 30,80 Q 70,25 100,35 T 160,85 L 230,120" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Red arrow down */}
          <path d="M 210,110 L 235,123 L 232,98" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          {/* Badge: Red X */}
          <circle cx="255" cy="50" r="14" fill="#991b1b" stroke="#f87171" strokeWidth="2" />
          <path d="M 248,43 L 262,57 M 262,43 L 248,57" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {type === "rise_hold_open" && (
        <g>
          {/* Rises, dips to open, then rebounds strong */}
          <path d="M 30,80 Q 70,30 100,45 T 160,75 Q 200,60 250,25" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Green arrow up */}
          <path d="M 235,35 L 252,23 L 250,45" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          {/* Badge: Blue Check */}
          <circle cx="255" cy="70" r="14" fill="#1e40af" stroke="#60a5fa" strokeWidth="2" />
          <path d="M 248,70 L 253,75 L 262,65" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {type === "drop_reclaim_open" && (
        <g>
          {/* Drops below open, then V-recovers and breaks above open */}
          <path d="M 30,80 L 70,115 L 110,120 L 160,70 L 210,50 L 250,25" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Green arrow up */}
          <path d="M 235,35 L 252,23 L 250,45" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          {/* Badge: Blue Checkmark */}
          <circle cx="255" cy="70" r="14" fill="#1e40af" stroke="#60a5fa" strokeWidth="2" />
          <path d="M 248,70 L 253,75 L 262,65" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {type === "drop_fail_reclaim" && (
        <g>
          {/* Drops, weak bounce to open, rejected down */}
          <path d="M 30,80 L 70,110 L 120,115 L 160,82 L 200,105 L 240,125" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Red X Badge */}
          <circle cx="255" cy="70" r="14" fill="#991b1b" stroke="#f87171" strokeWidth="2" />
          <path d="M 248,63 L 262,77 M 262,63 L 248,77" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};

// ----------------------------------------------------------------------
// TRADING TERMS LIBRARY DATA
// ----------------------------------------------------------------------
export const TRADING_TERMS_LIBRARY: TradingTerm[] = [
  { term: "OB", krName: "오더블록 (Order Block)", definition: "기관 및 세력의 대량 주문이 체결된 핵심 가격 지지/저항 구간", keyRole: "반등 및 분할 진입 타점 지지선 활용" },
  { term: "BOS", krName: "구조 파괴 (Break of Structure)", definition: "기존 고점/저점을 강한 분봉 양봉으로 돌파하여 추세 지속 확정", keyRole: "추세 추종 매수 확정 신호" },
  { term: "CHoCH", krName: "추세 변곡 (Change of Character)", definition: "하락 구조 중 최초로 이전 유의미한 고점을 위로 돌파하여 방향 전환 시그널", keyRole: "상승 반전 최우선 경보 신호" },
  { term: "FVG / IFVG", krName: "공정가치 갭 (Fair Value Gap)", definition: "급등/급락 시 3개 캔들 사이의 수급 불균형 빈 공간, 가격 재방문 채움 특징", keyRole: "눌림목 매수 유동성 수급 구역" },
  { term: "BSL", krName: "매수 유동성 (Buy-Side Liquidity)", definition: "전고점 상단에 대거 몰려있는 매도 손절 주문 및 돌파 매수 물량", keyRole: "기관의 돌파 유인 타겟 구간" },
  { term: "SSL", krName: "매도 유동성 (Sell-Side Liquidity)", definition: "전저점 하단에 위치한 개미 매수자들의 손절(Stop-loss) 물량", keyRole: "SSL Sweep 후 V자 반등 헌팅 타점" },
  { term: "EQH / EQL", krName: "동일 고/저점 (Equal Highs / Lows)", definition: "차트상 거의 동일한 가격대에서 형성된 이중/삼중 고점 및 저점", keyRole: "강한 유동성 응축 구역으로 스위프 빈번" },
  { term: "PDH / PDL", krName: "전일 고가/저가 (Prev Day High/Low)", definition: "직전 거래일의 최고가 및 최저가 지점", keyRole: "당일 피봇 분석 및 데이트레이딩 핵심 지지/저항" }
];

// ----------------------------------------------------------------------
// 5 MAJOR CHART PATTERNS
// ----------------------------------------------------------------------
export const MAJOR_CHART_PATTERNS: ChartPattern[] = [
  {
    id: "falling_wedge",
    name: "Falling Wedge",
    krName: "하락 쐐기형 (상승 반전)",
    type: "BULLISH",
    structureText: "가격은 하락하지만 변동폭(수렴 각도)이 점점 좁아지는 구간",
    keyFeature: "하락 에너지 소진 → 상단 추세선 강하게 돌파 시 대폭등 시작",
    favorableConditions: [
      "하락 수렴 구간 내 거래량 지속 감소",
      "상단 추세선 돌파 시 거래량 & RVOL 급증",
      "VWAP Reclaim (거래량가중평균가 상향 회복)",
      "Bullish CHoCH (변곡 구조 파괴) 동반"
    ],
    svgDiagram: "falling_wedge"
  },
  {
    id: "bullish_rectangle",
    name: "Bullish Rectangle",
    krName: "상승형 박스권 (추세 지속)",
    type: "BULLISH",
    structureText: "강한 급등 후 일정 가격 범위(저항선~지지선) 내에서 에너지 응축 횡보",
    keyFeature: "상단 저항선 돌파 시 강한 2차 상승 파동 개시",
    favorableConditions: [
      "박스권 하단에서 매수 방어 캔들(Hammer, Engulfing) 발생",
      "상단 저항선 돌파 시 거래대금 + 거래량 동시 폭발",
      "RVOL 2.0x 이상 수급 과열 수반",
      "업종/시장 대장주 상대강도(RS) 우위"
    ],
    svgDiagram: "bullish_rectangle"
  },
  {
    id: "bullish_pennant",
    name: "Bullish Pennant",
    krName: "강세 페넌트 (급등 후 수렴)",
    type: "BULLISH",
    structureText: "수직 깃대(Flagpole) 급등 후 대칭 삼각수렴 형태로 가격이 좁아짐",
    keyFeature: "Bull Flag와 유사하나 조동 형태가 삼각수렴이라는 점이 차이점",
    favorableConditions: [
      "깃대 구간의 폭발적 거래대금",
      "삼각수렴 내부 거래량 바닥권 축소",
      "수렴 상단 돌파 시 RVOL 및 체결강도 150% 이상 급증",
      "SSL Sweep 후 빠른 넥라인 지지 확인"
    ],
    svgDiagram: "bullish_pennant"
  },
  {
    id: "double_bottom",
    name: "Double Bottom",
    krName: "더블 바텀 (W바닥 반전)",
    type: "BULLISH",
    structureText: "비슷한 가격대에서 두 번 강한 지지를 받는 W자형 구조",
    keyFeature: "1차 저점 → 반등 → 2차 저점 지지 → Neckline(넥라인) 돌파 확정",
    favorableConditions: [
      "2차 저점이 1차 저점보다 높거나 SSL Sweep 후 꼬리 달고 즉시 반등",
      "중앙 Neckline 돌파 전까지는 단순 관망 (CONFIRMING 단계)",
      "Neckline 돌파 시 장대양봉 또는 Bullish Engulfing 캔들 완성",
      "목표가 = 돌파 넥라인 + 바닥권 높이"
    ],
    svgDiagram: "double_bottom"
  },
  {
    id: "inverse_head_shoulders",
    name: "Inverse Head & Shoulders",
    krName: "역헤드앤숄더 (역H&S 반전)",
    type: "BULLISH",
    structureText: "왼쪽 어깨(LS) → 머리(Head) → 오른쪽 어깨(RS) 중 머리가 가장 깊은 구조",
    keyFeature: "상승 전환형 패턴 중 가장 신뢰도가 높은 대형 추세 전환 구조",
    favorableConditions: [
      "오른쪽 어깨(RS) 형성이 왼쪽 어깨보다 높게 단축 형성될 때 강세",
      "Neckline(넥라인) 저항선 거래량 2배 이상 돌파",
      "돌파 후 넥라인 리테스트(Retest) 지지 확정 시 2차 진입 최적",
      "목표가 = 돌파 넥라인 + 머리(Head) 깊이"
    ],
    svgDiagram: "inverse_head_shoulders"
  }
];

// ----------------------------------------------------------------------
// 9 BULLISH CANDLESTICK CONFIRMATION PATTERNS
// ----------------------------------------------------------------------
export const BULLISH_CANDLE_PATTERNS: BullishCandlePattern[] = [
  {
    id: 1,
    name: "Bullish Engulfing",
    krName: "상승 장악형",
    structureDescription: "이전 음봉 몸통을 이번 양봉이 완전히 감싸는 강한 수급 전환",
    marketMeaning: "매도 우위 시장에서 압도적 매수 우위로의 주체 교체 시그널",
    reinforcementConditions: ["주요 Support/OB 구역", "SSL Sweep 직후", "거래량 급증", "VWAP Reclaim"],
    svgIcon: "engulfing"
  },
  {
    id: 2,
    name: "Hammer",
    krName: "망치형 (Hammer)",
    structureDescription: "몸통은 작고 밑꼬리가 몸통의 2배 이상 길게 달린 반등 캔들",
    marketMeaning: "장중 매도세로 밀렸으나 강한 저가 매수세가 가격을 올려놓음",
    reinforcementConditions: ["단독 신호 매수 금지", "이전 전저점 터치 지지", "다음 캔들 양봉 확인", "RVOL 상승"],
    svgIcon: "hammer"
  },
  {
    id: 3,
    name: "Morning Star",
    krName: "샛별형 (Morning Star)",
    structureDescription: "강한 음봉 → 작은 도지/팽이 캔들 → 강한 양봉 (3캔들 조합)",
    marketMeaning: "하락 추세 완전 소진 후 강력한 변곡 상승전환 신호",
    reinforcementConditions: ["3번째 양봉이 1번째 음봉의 50% 이상 회복", "거래량 3번째에서 폭발", "주요 피봇 지지선"],
    svgIcon: "morning_star"
  },
  {
    id: 4,
    name: "Piercing Pattern",
    krName: "관통형 (Piercing)",
    structureDescription: "음봉 출현 후, 다음 양봉이 음봉 몸통의 50% 이상을 위로 관통 회복",
    marketMeaning: "하락 갭다운 출발 후 강력한 실체 매수 물량이 유입되어 추세 회복",
    reinforcementConditions: ["Support / Previous Low 지지", "VWAP 상향 돌파", "거래대금 상위 종목"],
    svgIcon: "piercing"
  },
  {
    id: 5,
    name: "Bullish Marubozu",
    krName: "장대 양봉 (Marubozu)",
    structureDescription: "위아래 꼬리가 거의 없는 강한 실체 장대 양봉",
    marketMeaning: "시가부터 종가까지 매수세가 캔들 전체를 지배하는 강한 모멘텀",
    reinforcementConditions: ["박스권 저항 돌파 구간", "이미 급등한 위치에서는 추격 위험(Chase Risk) 주의"],
    svgIcon: "marubozu"
  },
  {
    id: 6,
    name: "Three White Soldiers",
    krName: "적삼병 (Three White Soldiers)",
    structureDescription: "3개의 강한 양봉이 연속으로 주가를 상향 갱신하며 발생",
    marketMeaning: "상승 모멘텀이 극도로 강화되어 주도 추세를 형성함",
    reinforcementConditions: ["바닥권 탈출 직후 최고 신뢰도", "3번째 캔들 후 단기 과열 조정 분할 진입 고려"],
    svgIcon: "three_soldiers"
  },
  {
    id: 7,
    name: "Bullish Harami",
    krName: "상승 임신형 (Harami)",
    structureDescription: "장대 음봉의 몸통 안에 작은 양봉이 완전히 잉태되어 포함됨",
    marketMeaning: "기존 강한 하락 모멘텀이 급격히 둔화되어 매도세 멈춤 의미",
    reinforcementConditions: ["단독 매수 금지", "다음 캔들 돌파 수반 필수", "OB 저항 돌파 테스트"],
    svgIcon: "harami"
  },
  {
    id: 8,
    name: "Inverted Hammer",
    krName: "역망치형 (Inverted Hammer)",
    structureDescription: "윗꼬리가 길고 작은 몸통이 아래쪽에 형성된 형태",
    marketMeaning: "하락 추세 저점에서 상단 매수 테스트 진행, 저점 반전 가능성",
    reinforcementConditions: ["하락 바닥권 위치", "다음 날 시가 갭상승 또는 추가 양봉 확인 필수"],
    svgIcon: "inverted_hammer"
  },
  {
    id: 9,
    name: "Tweezer Bottom",
    krName: "집게형 바닥 (Tweezer Bottom)",
    structureDescription: "연속된 두 캔들이 거의 동일한 최저가를 기록하며 지지받음",
    marketMeaning: "특정 가격대에서 세력이 반복적으로 강한 매수 방어선 구축 (미니 더블바텀)",
    reinforcementConditions: ["SSL 스위프 라인 지지", "RVOL 상승 동반", "이동평균선 중첩 지지"],
    svgIcon: "tweezer_bottom"
  }
];

// INITIAL LEADER STOCKS FOR REALTIME QUANT MATRIX
export const INITIAL_POPULAR_STOCKS: StockSampleData[] = [
  {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    price: 78500,
    changePct: 4.8,
    rvol: 2.7,
    tradingValueBn: 18500,
    vwapStatus: "RECLAIM",
    sslSwept: true,
    rsScore: 88,
    detectedChartPattern: "Double Bottom (더블 바텀)",
    detectedCandlePattern: "Bullish Engulfing (상승 장악형)",
    necklinePrice: 77200,
    stopLossPrice: 75000,
    targetPrice1: 82500,
    targetPrice2: 86000
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    price: 238500,
    changePct: 7.2,
    rvol: 3.8,
    tradingValueBn: 24100,
    vwapStatus: "ABOVE",
    sslSwept: true,
    rsScore: 96,
    detectedChartPattern: "Falling Wedge (하락 쐐기 돌파)",
    detectedCandlePattern: "Morning Star (샛별형)",
    necklinePrice: 228000,
    stopLossPrice: 222000,
    targetPrice1: 255000,
    targetPrice2: 270000
  },
  {
    symbol: "086520",
    name: "에코프로",
    market: "KOREA",
    price: 92400,
    changePct: 5.1,
    rvol: 2.4,
    tradingValueBn: 6400,
    vwapStatus: "ABOVE",
    sslSwept: true,
    rsScore: 85,
    detectedChartPattern: "Bullish Rectangle (박스권 돌파)",
    detectedCandlePattern: "Bullish Marubozu (장대 양봉)",
    necklinePrice: 89000,
    stopLossPrice: 86000,
    targetPrice1: 99000,
    targetPrice2: 106000
  },
  {
    symbol: "NVDA",
    name: "엔비디아 (NVIDIA)",
    market: "US",
    price: 128.5,
    changePct: 8.6,
    rvol: 4.2,
    tradingValueBn: 4800, // $M
    vwapStatus: "ABOVE",
    sslSwept: true,
    rsScore: 98,
    detectedChartPattern: "Bullish Pennant (강세 페넌트)",
    detectedCandlePattern: "Three White Soldiers (적삼병)",
    necklinePrice: 122.0,
    stopLossPrice: 118.0,
    targetPrice1: 142.0,
    targetPrice2: 155.0
  },
  {
    symbol: "TSLA",
    name: "테슬라 (Tesla)",
    market: "US",
    price: 245.8,
    changePct: 6.4,
    rvol: 3.1,
    tradingValueBn: 3900,
    vwapStatus: "ABOVE",
    sslSwept: true,
    rsScore: 91,
    detectedChartPattern: "Inverse Head & Shoulders (역H&S)",
    detectedCandlePattern: "Bullish Engulfing (상승 장악형)",
    necklinePrice: 238.0,
    stopLossPrice: 229.0,
    targetPrice1: 268.0,
    targetPrice2: 285.0
  },
  {
    symbol: "KRW-BTC",
    name: "비트코인 (Upbit)",
    market: "BTC",
    price: 138500000,
    changePct: 5.3,
    rvol: 2.9,
    tradingValueBn: 12800,
    vwapStatus: "ABOVE",
    sslSwept: true,
    rsScore: 92,
    detectedChartPattern: "Inverse Head & Shoulders (역H&S)",
    detectedCandlePattern: "Piercing Pattern (관통형)",
    necklinePrice: 134000000,
    stopLossPrice: 129000000,
    targetPrice1: 148000000,
    targetPrice2: 158000000
  },
  {
    symbol: "KRW-ETH",
    name: "이더리움 (Upbit)",
    market: "BTC",
    price: 4950000,
    changePct: 4.2,
    rvol: 2.5,
    tradingValueBn: 5400,
    vwapStatus: "RECLAIM",
    sslSwept: true,
    rsScore: 89,
    detectedChartPattern: "Double Bottom (더블 바텀)",
    detectedCandlePattern: "Hammer (망치형 반등)",
    necklinePrice: 4820000,
    stopLossPrice: 4680000,
    targetPrice1: 5350000,
    targetPrice2: 5600000
  },
  {
    symbol: "KRW-XRP",
    name: "리플 (Upbit)",
    market: "BTC",
    price: 3450,
    changePct: 9.8,
    rvol: 4.8,
    tradingValueBn: 9200,
    vwapStatus: "ABOVE",
    sslSwept: true,
    rsScore: 97,
    detectedChartPattern: "Bullish Pennant (강세 페넌트)",
    detectedCandlePattern: "Bullish Marubozu (장대 양봉)",
    necklinePrice: 3200,
    stopLossPrice: 3050,
    targetPrice1: 3950,
    targetPrice2: 4400
  }
];

// Alias for backward compatibility
export const SAMPLE_STOCKS = INITIAL_POPULAR_STOCKS;

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------
export interface QuantSetupQualityMatrixEngineProps {
  targetSymbol?: string;
  onSelectStock?: (stock: StockSampleData) => void;
}

export const QuantSetupQualityMatrixEngine: React.FC<QuantSetupQualityMatrixEngineProps> = ({
  targetSymbol,
  onSelectStock
}) => {
  const { addToast, executeTrade, selectedSymbol, setSelectedSymbol, openStockChart } = useApp();

  // Navigation Sub-tabs
  const [activeTab, setActiveTab] = useState<
    "MATRIX_CALCULATOR" | "MARKET_OPEN_30MIN" | "CANDLE_LIBRARY" | "CHART_PATTERNS" | "TRADING_TERMS" | "PIPELINE_FLOW"
  >("MATRIX_CALCULATOR");

  // Stock List & Selection
  const [analyzedStocks, setAnalyzedStocks] = useState<StockSampleData[]>(INITIAL_POPULAR_STOCKS);
  const [selectedStock, setSelectedStock] = useState<StockSampleData>(() => {
    const initSym = targetSymbol || selectedSymbol;
    if (initSym) {
      const found = INITIAL_POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === initSym.toUpperCase());
      if (found) return found;
    }
    return INITIAL_POPULAR_STOCKS[0];
  });
  const [customAddedSymbols, setCustomAddedSymbols] = useState<string[]>([]);
  
  // Real-Time Live API Integration States
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string>(new Date().toLocaleTimeString());
  const [liveChartSeries, setLiveChartSeries] = useState<any[]>([]);
  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState<boolean>(true);

  // Subscribe to real-time market feed pipeline
  useEffect(() => {
    const unsub = realtimeMarketFeedService.subscribe((quotesMap) => {
      setAnalyzedStocks((prevList) =>
        prevList.map((st) => {
          const q = quotesMap.get(st.symbol);
          if (q) {
            return {
              ...st,
              currentPrice: q.price,
              changePct: q.changeRate,
            };
          }
          return st;
        })
      );

      setSelectedStock((prev) => {
        const q = quotesMap.get(prev.symbol);
        if (q) {
          return {
            ...prev,
            currentPrice: q.price,
            changePct: q.changeRate,
          };
        }
        return prev;
      });
    });
    return () => unsub();
  }, []);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "KOREA" | "US" | "BTC" | "CUSTOM">("ALL");

  // Interactive Adjustments for Custom Setup Quality Simulation
  const [customRvol, setCustomRvol] = useState<number>(selectedStock.rvol ?? 2.5);
  const [customVwap, setCustomVwap] = useState<"ABOVE" | "RECLAIM" | "BELOW">(selectedStock.vwapStatus ?? "ABOVE");
  const [customSslSwept, setCustomSslSwept] = useState<boolean>(selectedStock.sslSwept ?? true);
  const [customRs, setCustomRs] = useState<number>(selectedStock.rsScore ?? 85);
  const [customNecklinePassed, setCustomNecklinePassed] = useState<boolean>(true);
  const [customCandleConfirmed, setCustomCandleConfirmed] = useState<boolean>(true);
  const [custom30MinRuleId, setCustom30MinRuleId] = useState<string>("rule_rise_hold");

  // Unified Stock Selection Handler - Broadcasts globally to AppContext, services and window events
  const handleSelectStock = (st: StockSampleData, skipEmit = false) => {
    setSelectedStock(st);
    fetchLiveStockMatrix(st.symbol, true);

    if (setSelectedSymbol) {
      setSelectedSymbol(st.symbol);
    }

    if (!skipEmit) {
      stockSyncService.emit({
        symbol: st.symbol,
        name: st.name,
        market: st.market,
        price: st.price,
        changePercent: st.changePct
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stock-selected", { detail: st }));
      }
    }

    if (onSelectStock) {
      onSelectStock(st);
    }
  };

  // =========================================================================
  // REAL-TIME API FETCH FUNCTION (Upbit / Naver / Yahoo / Quantitative Analysis)
  // =========================================================================
  const fetchLiveStockMatrix = async (symbol: string, selectImmediately = true) => {
    try {
      setIsLoadingLive(true);
      const res = await fetch(`/api/quant/matrix/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        const updatedStock: StockSampleData = {
          symbol: data.symbol || symbol,
          name: data.name || symbol,
          market: data.market || (symbol.startsWith("KRW-") ? "BTC" : /^\d{6}$/.test(symbol) ? "KOREA" : "US"),
          price: data.price || 0,
          changePct: data.changePct || 0,
          rvol: data.rvol || 1.5,
          tradingValueBn: data.tradingValueBn || 0,
          vwapStatus: data.vwapStatus || "ABOVE",
          sslSwept: data.sslSwept ?? true,
          rsScore: data.rsScore || 75,
          detectedChartPattern: data.detectedChartPattern || "Double Bottom (더블 바텀)",
          detectedCandlePattern: data.detectedCandlePattern || "Bullish Engulfing (상승 장악형)",
          necklinePrice: data.necklinePrice || data.price,
          stopLossPrice: data.stopLossPrice || Math.round(data.price * 0.96),
          targetPrice1: data.targetPrice1 || Math.round(data.price * 1.05),
          targetPrice2: data.targetPrice2 || Math.round(data.price * 1.10)
        };

        // Update or append to analyzed stock list
        setAnalyzedStocks(prev => {
          const exists = prev.some(s => s.symbol.toUpperCase() === updatedStock.symbol.toUpperCase());
          if (exists) {
            return prev.map(s => s.symbol.toUpperCase() === updatedStock.symbol.toUpperCase() ? updatedStock : s);
          }
          return [updatedStock, ...prev];
        });

        if (selectImmediately) {
          setSelectedStock(updatedStock);
          setCustomRvol(updatedStock.rvol);
          setCustomVwap(updatedStock.vwapStatus);
          setCustomSslSwept(updatedStock.sslSwept);
          setCustomRs(updatedStock.rsScore);
          setCustomNecklinePassed(updatedStock.price >= updatedStock.necklinePrice);
          setCustom30MinRuleId(data.rule30MinId || "rule_rise_hold");
          setCustomCandleConfirmed(true);

          if (Array.isArray(data.chartSeries) && data.chartSeries.length > 0) {
            setLiveChartSeries(data.chartSeries);
          }

          if (onSelectStock) {
            onSelectStock(updatedStock);
          }
        }

        setLastAnalyzedTime(data.analyzedAt || new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn(`[Quant Engine] Real-time fetch error for ${symbol}:`, err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Initial mount: Fetch live real-time quotes for the selected stock and key leaders
  useEffect(() => {
    const initSym = targetSymbol || selectedSymbol || selectedStock.symbol;
    fetchLiveStockMatrix(initSym, true);
    
    // Background fetch for top presets
    INITIAL_POPULAR_STOCKS.slice(0, 4).forEach(st => {
      if (st.symbol !== initSym) {
        fetchLiveStockMatrix(st.symbol, false);
      }
    });
  }, []);

  // Synchronize when global selectedSymbol or targetSymbol prop changes from parent components
  useEffect(() => {
    const activeTarget = targetSymbol || selectedSymbol;
    if (activeTarget && activeTarget.toUpperCase() !== selectedStock.symbol.toUpperCase()) {
      const found = analyzedStocks.find(s => s.symbol.toUpperCase() === activeTarget.toUpperCase());
      if (found) {
        setSelectedStock(found);
      }
      fetchLiveStockMatrix(activeTarget, true);
    }
  }, [selectedSymbol, targetSymbol]);

  // Synchronize with real-time stock sync events from brokerages / ticker / search
  useEffect(() => {
    const unsubscribe = stockSyncService.subscribe((evt: StockSyncEvent) => {
      if (evt && evt.symbol && evt.symbol.toUpperCase() !== selectedStock.symbol.toUpperCase()) {
        fetchLiveStockMatrix(evt.symbol, true);
      }
    });
    return unsubscribe;
  }, [selectedStock.symbol]);

  // Auto-refresh interval for selected stock (every 10 seconds if enabled)
  useEffect(() => {
    if (!isLiveAutoRefresh) return;
    const interval = setInterval(() => {
      if (selectedStock && selectedStock.symbol) {
        fetchLiveStockMatrix(selectedStock.symbol, true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedStock.symbol, isLiveAutoRefresh]);

  // Live Stock Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSearchResults(data.slice(0, 10));
            setShowSearchDropdown(true);
          }
        }
      } catch (err) {
        console.warn("[Quant Engine] Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add Searched Stock to Analysis Target & Global Broadcast
  const handleAddStockToAnalysis = async (stockItem: any) => {
    const symbol = stockItem.symbol;
    const name = stockItem.name || symbol;
    setSearchQuery("");
    setShowSearchDropdown(false);

    if (!customAddedSymbols.includes(symbol)) {
      setCustomAddedSymbols(prev => [symbol, ...prev]);
    }

    if (setSelectedSymbol) {
      setSelectedSymbol(symbol);
    }

    stockSyncService.emit({
      symbol,
      name,
      market: stockItem.market || (symbol.startsWith("KRW-") ? "BTC" : /^\d{6}$/.test(symbol) ? "KOREA" : "US"),
      price: stockItem.price || 0,
      changePercent: stockItem.changePct || 0
    });

    addToast({
      type: "INFO",
      title: "분석 대상 종목 추가",
      message: `${name}(${symbol}) 실시간 퀀트 분석 엔진 연동을 시작합니다.`
    });

    await fetchLiveStockMatrix(symbol, true);
  };

  // Remove a custom stock
  const handleRemoveStock = (symbolToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzedStocks(prev => prev.filter(s => s.symbol !== symbolToRemove));
    setCustomAddedSymbols(prev => prev.filter(s => s !== symbolToRemove));
    if (selectedStock.symbol === symbolToRemove) {
      const remaining = analyzedStocks.filter(s => s.symbol !== symbolToRemove);
      if (remaining.length > 0) {
        setSelectedStock(remaining[0]);
        fetchLiveStockMatrix(remaining[0].symbol, true);
      }
    }
  };

  // Filtered Stock List for Left Panel
  const filteredStocks = useMemo(() => {
    if (categoryFilter === "ALL") return analyzedStocks;
    if (categoryFilter === "CUSTOM") {
      return analyzedStocks.filter(s => customAddedSymbols.includes(s.symbol));
    }
    return analyzedStocks.filter(s => s.market === categoryFilter);
  }, [analyzedStocks, categoryFilter, customAddedSymbols]);

  // Calculate Comprehensive Multi-Factor Setup Quality Score (0~100)
  const setupQualityResult = useMemo(() => {
    let score = 0;

    // 1. Chart Pattern + Neckline Status (Max 25 pts)
    if (customNecklinePassed) score += 25;
    else score += 10;

    // 2. Candlestick Confirmation (Max 20 pts)
    if (customCandleConfirmed) score += 20;

    // 3. RVOL & Trading Value (Max 20 pts)
    if (customRvol >= 3.0) score += 20;
    else if (customRvol >= 2.0) score += 16;
    else if (customRvol >= 1.5) score += 12;
    else score += 5;

    // 4. VWAP Position (Max 15 pts)
    if (customVwap === "ABOVE") score += 15;
    else if (customVwap === "RECLAIM") score += 12;
    else score += 2;

    // 5. SSL Liquidity Sweep (Max 10 pts)
    if (customSslSwept) score += 10;

    // 6. Relative Strength RS (Max 10 pts)
    score += Math.round((customRs / 100) * 10);

    // 7. 장 시작 30분 법칙 (30-Min Open Rule) Bonus/Penalty
    if (custom30MinRuleId === "rule_rise_hold" || custom30MinRuleId === "rule_drop_reclaim") {
      score += 10; // 시가 지지/재돌파 가산점
    } else if (custom30MinRuleId === "rule_rise_drop" || custom30MinRuleId === "rule_drop_fail") {
      score = Math.max(0, score - 25); // 시가 붕괴/저항 거절 매수금지 감점
    } else if (custom30MinRuleId === "rule_flat") {
      score = Math.max(0, score - 10);
    }

    // Final Grade & Status Determination
    let grade: "S+ Tier" | "A+ Tier" | "A Tier" | "B Tier" | "C Tier" = "C Tier";
    let status: "CONFIRMED" | "CONFIRMING" | "RETESTING" | "NO SETUP" = "NO SETUP";

    if (score >= 90) {
      grade = "S+ Tier";
      status = customNecklinePassed ? "CONFIRMED" : "CONFIRMING";
    } else if (score >= 80) {
      grade = "A+ Tier";
      status = customNecklinePassed ? "CONFIRMED" : "CONFIRMING";
    } else if (score >= 70) {
      grade = "A Tier";
      status = "CONFIRMING";
    } else if (score >= 55) {
      grade = "B Tier";
      status = "RETESTING";
    } else {
      grade = "C Tier";
      status = "NO SETUP";
    }

    return {
      score,
      grade,
      status,
      isTradeable: score >= 75 && customNecklinePassed && custom30MinRuleId !== "rule_rise_drop" && custom30MinRuleId !== "rule_drop_fail"
    };
  }, [
    customRvol,
    customVwap,
    customSslSwept,
    customRs,
    customNecklinePassed,
    customCandleConfirmed,
    custom30MinRuleId
  ]);

  // Real-Time Chart Graph Data (uses real API chart series if available, otherwise synthetic)
  const chartGraphData = useMemo(() => {
    if (Array.isArray(liveChartSeries) && liveChartSeries.length > 0) {
      return liveChartSeries;
    }

    const baseP = selectedStock.price || 10000;
    const isUs = selectedStock.market === "US";
    const delta = isUs ? 0.5 : baseP * 0.005;

    const data = [];
    const timestamps = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
      "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "현재(Live)"
    ];

    let runningP = baseP * 0.94;
    for (let i = 0; i < timestamps.length; i++) {
      const open = isUs ? +runningP.toFixed(2) : Math.round(runningP);
      const randChange = (Math.random() - 0.42) * (delta * 1.8);
      const close = i === timestamps.length - 1 ? baseP : (isUs ? +(open + randChange).toFixed(2) : Math.round(open + randChange));
      const high = isUs ? +(Math.max(open, close) + Math.random() * delta).toFixed(2) : Math.max(open, close) + Math.round(Math.random() * delta);
      const low = isUs ? +(Math.min(open, close) - Math.random() * delta).toFixed(2) : Math.min(open, close) - Math.round(Math.random() * delta);
      const volume = Math.round(15000 + Math.random() * 80000);

      // Overlay specific candle pattern tag on latest bar
      const candleTag = i === timestamps.length - 1 ? (selectedStock.detectedCandlePattern || "").split(" ")[0] : undefined;

      data.push({
        time: timestamps[i],
        open,
        high,
        low,
        close,
        volume,
        candleTag,
        entryLine: selectedStock.necklinePrice,
        stopLossLine: selectedStock.stopLossPrice,
        target1Line: selectedStock.targetPrice1,
        target2Line: selectedStock.targetPrice2
      });

      runningP = close;
    }

    // AI Future Trajectory Path (5 Projection Candlesticks T+1 ~ T+5)
    let lastClose = data[data.length - 1].close;
    for (let f = 1; f <= 5; f++) {
      const futureTime = `T+${f} (예측)`;
      const expectedUp = delta * 1.5 * f;
      const forecastP = isUs ? +(lastClose + expectedUp).toFixed(2) : Math.round(lastClose + expectedUp);
      const band = isUs ? +(delta * 0.8 * f).toFixed(2) : Math.round(delta * 0.8 * f);

      data.push({
        time: futureTime,
        open: lastClose,
        high: isUs ? +(forecastP + band).toFixed(2) : forecastP + band,
        low: isUs ? +(forecastP - band).toFixed(2) : forecastP - band,
        close: forecastP,
        volume: Math.round(20000 + Math.random() * 40000),
        isForecast: true,
        aiTrajectory: forecastP,
        aiUpperBand: isUs ? +(forecastP + band).toFixed(2) : forecastP + band,
        aiLowerBand: isUs ? +(forecastP - band).toFixed(2) : forecastP - band,
        entryLine: selectedStock.necklinePrice,
        stopLossLine: selectedStock.stopLossPrice,
        target1Line: selectedStock.targetPrice1,
        target2Line: selectedStock.targetPrice2
      });
      lastClose = forecastP;
    }

    return data;
  }, [selectedStock, liveChartSeries]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-6 text-white shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-950 via-teal-950 to-indigo-950 border border-cyan-500/50 rounded-2xl text-cyan-300 shadow-lg">
            <BarChart3 className="h-7 w-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                PRICE ACTION & QUANT SETUP QUALITY MATRIX
              </h2>
              <span className="text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-700 px-2.5 py-0.5 rounded-full font-mono">
                9-CANDLE + CHART PATTERN + MULTI-FACTOR ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              단순 매수 신호가 아닌 가격 구조 + 9대 상승 캔들 + RVOL + VWAP + 유동성 스위프(SSL)를 통과한 **Setup Quality (0~100 점수)** 검증 시스템
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl text-xs font-mono">
          <span className="text-slate-400 px-2">엔진 상태:</span>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-700 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>REAL-TIME QUANT READY</span>
          </span>
        </div>
      </div>

      {/* MAIN TOP SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab("MATRIX_CALCULATOR")}
            className={`px-4 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "MATRIX_CALCULATOR"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="h-4 w-4 text-cyan-200" />
            <span>📊 셋업 퀄리티 매트릭스 & AI 차트</span>
          </button>

          <button
            onClick={() => setActiveTab("MARKET_OPEN_30MIN")}
            className={`px-4 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "MARKET_OPEN_30MIN"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg ring-2 ring-amber-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="h-4 w-4 text-amber-300" />
            <span>⏱️ 장 시작 30분 법칙 (Market Open 30M)</span>
          </button>

          <button
            onClick={() => setActiveTab("CANDLE_LIBRARY")}
            className={`px-4 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "CANDLE_LIBRARY"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="h-4 w-4 text-amber-400" />
            <span>🕯️ 9대 상승 캔들 패턴</span>
          </button>

          <button
            onClick={() => setActiveTab("CHART_PATTERNS")}
            className={`px-4 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "CHART_PATTERNS"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4 text-cyan-300" />
            <span>📐 5대 핵심 차트 구조 (5 Chart Patterns)</span>
          </button>

          <button
            onClick={() => setActiveTab("TRADING_TERMS")}
            className={`px-4 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "TRADING_TERMS"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4 text-indigo-300" />
            <span>📚 프라이스 액션 용어 사전 (Terms)</span>
          </button>

          <button
            onClick={() => setActiveTab("PIPELINE_FLOW")}
            className={`px-4 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "PIPELINE_FLOW"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-300" />
            <span>🔄 전체 분석 파이프라인 (Process Flow)</span>
          </button>
        </div>

        <span className="text-[11px] text-cyan-300 font-bold bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 hidden lg:inline-block">
          {activeTab === "MATRIX_CALCULATOR" ? "실시간 매수/손절/목표선 & AI 예측선 시각화" : "기관급 퀀트 프라이스 액션 매뉴얼"}
        </span>
      </div>

      {/* RENDER ACTIVE TAB SECTION */}

      {/* ========================================================================= */}
      {/* TAB 1: QUANT SETUP QUALITY MATRIX CALCULATOR & REAL-TIME CHART GRAPH */}
      {/* ========================================================================= */}
      {activeTab === "MATRIX_CALCULATOR" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* TOP SEARCH BAR & REAL-TIME STATUS CONTROLLER */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Left: Search Input with Auto-complete */}
              <div className="relative flex-1 min-w-[280px]">
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-cyan-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                    placeholder="분석 대상 종목 검색 (종목명, 심볼: 카카오, 035720, TSLA, KRW-ETH 등)..."
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }}
                      className="absolute right-3 text-slate-400 hover:text-white text-xs font-mono"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950 border border-cyan-500/50 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800 font-mono">
                    <div className="p-2 text-[10px] text-cyan-300 font-bold bg-slate-900/90 flex justify-between items-center">
                      <span>검색된 실시간 종목 ({searchResults.length}건)</span>
                      <span className="text-slate-400">클릭 시 즉시 실시간 퀀트 분석 추가</span>
                    </div>
                    {searchResults.map((item, idx) => (
                      <button
                        key={`${item.symbol}-${idx}`}
                        onClick={() => handleAddStockToAnalysis(item)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-cyan-950/60 transition flex items-center justify-between text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.market === "KOREA" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                            item.market === "US" ? "bg-blue-950 text-blue-300 border border-blue-800" :
                            "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}>
                            {item.market || "STOCK"}
                          </span>
                          <div>
                            <span className="font-bold text-white group-hover:text-cyan-300 transition">{item.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">({item.symbol})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-200">
                            {item.market === "US" ? `$${item.price ?? 0}` : `₩${(item.price ?? 0).toLocaleString()}`}
                          </span>
                          <span className={`text-xs font-bold ${(item.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {(item.changePct ?? 0) >= 0 ? "+" : ""}{item.changePct ?? 0}%
                          </span>
                          <span className="text-[10px] bg-cyan-600 group-hover:bg-cyan-500 text-white px-2 py-0.5 rounded font-bold transition">
                            + 분석 추가
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Live API Connection Status & Refresh Controls */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-bold">LIVE API</span>
                  <span className="text-slate-400 text-[10px] hidden sm:inline">(Upbit·Naver·Yahoo)</span>
                </div>

                <div className="text-[11px] text-slate-400 hidden md:block">
                  최근 분석: <span className="text-cyan-300 font-bold">{lastAnalyzedTime}</span>
                </div>

                <button
                  onClick={() => fetchLiveStockMatrix(selectedStock.symbol, true)}
                  disabled={isLoadingLive}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-700 to-teal-700 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isLoadingLive ? "animate-spin" : ""}`} />
                  <span>{isLoadingLive ? "분석 중..." : "실시간 재분석"}</span>
                </button>

                <button
                  onClick={() => setIsLiveAutoRefresh(!isLiveAutoRefresh)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] border transition cursor-pointer ${
                    isLiveAutoRefresh
                      ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                      : "bg-slate-950 text-slate-500 border-slate-800"
                  }`}
                >
                  {isLiveAutoRefresh ? "⚡ 자동 갱신 ON (10초)" : "⏸️ 자동 갱신 OFF"}
                </button>
              </div>

            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80 font-mono text-xs">
              <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-cyan-400" />
                <span>카테고리 필터:</span>
              </span>
              {[
                { id: "ALL", label: `전체 종목 (${analyzedStocks.length})` },
                { id: "KOREA", label: "🇰🇷 국내 주식" },
                { id: "US", label: "🇺🇸 미국 주식" },
                { id: "BTC", label: "🪙 가상자산 (Upbit)" },
                { id: "CUSTOM", label: `⭐ 내가 추가한 종목 (${customAddedSymbols.length})` }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    categoryFilter === cat.id
                      ? "bg-cyan-600 text-white shadow"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* STOCK SELECTOR & REAL-TIME SUMMARY CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: Stock Picker List */}
            <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span>분석 대상 종목 ({filteredStocks.length}개)</span>
                </span>
                <span className="text-[10px] text-slate-400">선택 시 실시간 퀀트 분석 적용</span>
              </div>

              {/* Stock Cards Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredStocks.map(st => {
                  const isSelected = selectedStock.symbol === st.symbol;
                  const isCustom = customAddedSymbols.includes(st.symbol);
                  return (
                    <div
                      key={st.symbol}
                      onClick={() => handleSelectStock(st)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between relative group ${
                        isSelected
                          ? "bg-cyan-950/90 border-cyan-400 text-white ring-2 ring-cyan-400/40 shadow-lg"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black truncate max-w-[130px]">{st.name}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              st.market === "KOREA" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                              st.market === "US" ? "bg-blue-950 text-blue-300 border border-blue-800" :
                              "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}>
                              {st.market}
                            </span>
                            {isCustom && (
                              <button
                                onClick={(e) => handleRemoveStock(st.symbol, e)}
                                title="분석 목록에서 삭제"
                                className="text-slate-500 hover:text-rose-400 text-[10px] px-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{st.symbol}</span>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between font-mono">
                        <span className="text-xs font-bold">
                          {st.market === "US" ? `$${st.price ?? 0}` : `₩${(st.price ?? 0).toLocaleString()}`}
                        </span>
                        <span className={`text-xs font-bold ${(st.changePct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {(st.changePct ?? 0) >= 0 ? "+" : ""}{st.changePct ?? 0}%
                        </span>
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>RVOL: <strong className="text-cyan-300">{(st.rvol ?? 1.5).toFixed(1)}x</strong></span>
                        <span className="truncate max-w-[120px] text-[9px] text-amber-300 font-bold">{st.detectedCandlePattern?.split(" ")[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detected Pattern Badges for Selected Stock */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>포착된 차트 구조:</span>
                  <span className="text-cyan-300 font-bold">{selectedStock.detectedChartPattern}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>포착된 9대 캔들:</span>
                  <span className="text-amber-400 font-bold">{selectedStock.detectedCandlePattern}</span>
                </div>
              </div>
            </div>

            {/* Right: Setup Quality Multi-Factor Calculator Result */}
            <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/70 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-cyan-950 border border-cyan-700 rounded-xl text-cyan-300">
                    <Target className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white font-sans">
                      {selectedStock.name} ({selectedStock.symbol}) MULTI-FACTOR SETUP QUALITY
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      가격 구조 + 캔들 패턴 + RVOL + VWAP + SSL 유동성 + 상대강도 종합 점수
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">SETUP QUALITY SCORE</span>
                    <span className="text-2xl font-black text-cyan-300 font-mono">
                      {setupQualityResult.score} <span className="text-sm text-slate-400">/ 100</span>
                    </span>
                  </div>

                  <div className={`px-4 py-2 rounded-2xl font-black text-center border shadow-lg ${
                    setupQualityResult.score >= 80 ? "bg-emerald-950 text-emerald-300 border-emerald-600" :
                    setupQualityResult.score >= 65 ? "bg-amber-950 text-amber-300 border-amber-600" :
                    "bg-rose-950 text-rose-300 border-rose-600"
                  }`}>
                    <span className="text-sm font-mono block">{setupQualityResult.grade}</span>
                    <span className="text-[10px] opacity-80">{setupQualityResult.status}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Factor Adjusters (Simulate real quant condition testing) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                
                {/* 1. RVOL Slider */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>RVOL (상대거래량)</span>
                    <span className="text-cyan-300">{customRvol.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    value={customRvol}
                    onChange={(e) => setCustomRvol(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* 2. VWAP Status */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-300 font-bold block">VWAP 위치</span>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(["ABOVE", "RECLAIM", "BELOW"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setCustomVwap(v)}
                        className={`py-1 text-[10px] rounded font-bold border transition cursor-pointer ${
                          customVwap === v
                            ? "bg-cyan-600 text-white border-cyan-400"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. SSL Swept Toggle */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-300 font-bold block">SSL Sweep (유동성 스위프)</span>
                  <button
                    onClick={() => setCustomSslSwept(!customSslSwept)}
                    className={`w-full py-1 text-[11px] rounded font-bold border transition cursor-pointer ${
                      customSslSwept
                        ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    }`}
                  >
                    {customSslSwept ? "✓ SSL Sweep 완료 (손절물량 수급)" : "✕ SSL 미스위프"}
                  </button>
                </div>

                {/* 4. Neckline Breakout Status */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-300 font-bold block">Neckline 돌파 여부</span>
                  <button
                    onClick={() => setCustomNecklinePassed(!customNecklinePassed)}
                    className={`w-full py-1 text-[11px] rounded font-bold border transition cursor-pointer ${
                      customNecklinePassed
                        ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                        : "bg-amber-950 text-amber-300 border-amber-600"
                    }`}
                  >
                    {customNecklinePassed ? "✓ 돌파 확정 (CONFIRMED)" : "⏳ 돌파 대기중 (CONFIRMING)"}
                  </button>
                </div>

                {/* 5. Candle Confirmation */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-300 font-bold block">9대 상승 캔들 완결</span>
                  <button
                    onClick={() => setCustomCandleConfirmed(!customCandleConfirmed)}
                    className={`w-full py-1 text-[11px] rounded font-bold border transition cursor-pointer ${
                      customCandleConfirmed
                        ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    }`}
                  >
                    {customCandleConfirmed ? "✓ 캔들 완결 (Confirmed)" : "✕ 캔들 미완결"}
                  </button>
                </div>

                {/* 6. Relative Strength Slider */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>상대강도 (RS Score)</span>
                    <span className="text-cyan-300">{customRs} pt</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={1}
                    value={customRs}
                    onChange={(e) => setCustomRs(parseInt(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

              </div>

              {/* Action Button: Instant Execution trigger */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-400 font-mono">
                  💡 <strong className="text-cyan-300">Setup Quality 75점 이상 + Neckline 돌파 확정 시</strong> AI 자동매수 승인 조건이 만족됩니다.
                </div>

                <button
                  onClick={() => {
                    executeTrade(
                      selectedStock.symbol,
                      selectedStock.name,
                      selectedStock.market,
                      "BUY",
                      10,
                      selectedStock.price,
                      "Setup Quality Matrix AI 즉시 주문",
                      `Setup Quality Score: ${setupQualityResult.score}/100 (${setupQualityResult.grade}), 9대 캔들: ${selectedStock.detectedCandlePattern}`
                    );
                    addToast({
                      type: "SUCCESS",
                      title: "Quant Setup Quality 주문 발주",
                      message: `${selectedStock.name}(${selectedStock.symbol}) 10주 매수 주문이 제출되었습니다.`
                    });
                  }}
                  disabled={!setupQualityResult.isTradeable}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs font-mono transition flex items-center gap-2 cursor-pointer shadow-lg ${
                    setupQualityResult.isTradeable
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white ring-2 ring-emerald-400/50"
                      : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span>{setupQualityResult.isTradeable ? "SETUP QUALITY 매수 즉시 주문" : "SETUP 조건 미충족 (대기)"}</span>
                </button>
              </div>

            </div>

          </div>

          {/* REAL-TIME CHART GRAPH WITH BUY LINE, SL LINE, TP LINES & AI PREDICTION CURVE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                  <span>{selectedStock.name} ({selectedStock.symbol}) 실시간 차트 & AI 예측 궤적 (AI Trajectory)</span>
                </span>
                <span className="text-amber-400 font-bold text-[11px]">
                  ━━ 진입/넥라인: {selectedStock.market === "US" ? `$${selectedStock.necklinePrice ?? 0}` : `₩${(selectedStock.necklinePrice ?? 0).toLocaleString()}`}
                </span>
                <span className="text-rose-400 font-bold text-[11px]">
                  ━━ 손절가(SL): {selectedStock.market === "US" ? `$${selectedStock.stopLossPrice ?? 0}` : `₩${(selectedStock.stopLossPrice ?? 0).toLocaleString()}`}
                </span>
                <span className="text-emerald-400 font-bold text-[11px]">
                  ━━ 1차목표가(TP1): {selectedStock.market === "US" ? `$${selectedStock.targetPrice1 ?? 0}` : `₩${(selectedStock.targetPrice1 ?? 0).toLocaleString()}`}
                </span>
              </div>

              <span className="text-[11px] text-purple-300 font-bold bg-purple-950/80 border border-purple-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>T+5 AI 미래 예측 보라색 밴드 영역</span>
              </span>
            </div>

            {/* Recharts Canvas */}
            <div className="w-full h-[380px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartGraphData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.7} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  
                  {/* Price Y Axis */}
                  <YAxis
                    yAxisId="price"
                    domain={["auto", "auto"]}
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(val) => selectedStock.market === "US" ? `$${val}` : `₩${Math.round(val).toLocaleString()}`}
                  />

                  {/* Volume Y Axis */}
                  <YAxis yAxisId="volume" domain={[0, (dataMax: number) => dataMax * 4]} hide={true} />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-950/95 border-2 border-cyan-500/70 rounded-2xl p-3 text-xs font-mono space-y-1 text-white shadow-2xl backdrop-blur-md">
                            <p className="font-bold text-cyan-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                              <span>{d.time} {d.isForecast ? "[AI 예측 영역]" : "실시간 봉"}</span>
                              {d.candleTag && <span className="bg-amber-950 text-amber-300 border border-amber-700 px-1.5 py-0.2 rounded text-[10px]">{d.candleTag}</span>}
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                              <span>시가: ₩{(d.open ?? 0).toLocaleString()}</span>
                              <span className="text-emerald-400">고가: ₩{(d.high ?? 0).toLocaleString()}</span>
                              <span className="text-rose-400">저가: ₩{(d.low ?? 0).toLocaleString()}</span>
                              <span className="font-bold text-cyan-300">종가: ₩{(d.close ?? 0).toLocaleString()}</span>
                            </div>
                            {d.isForecast && (
                              <p className="text-[10px] text-purple-300 pt-1 border-t border-slate-800">
                                AI 상단예측: ₩{d.aiUpperBand?.toLocaleString()}원 / 하단: ₩{d.aiLowerBand?.toLocaleString()}원
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Volume Bar Overlay */}
                  <Bar yAxisId="volume" dataKey="volume" fill="#0284c7" opacity={0.3} barSize={10} radius={[2, 2, 0, 0]} />

                  {/* Reference Line: Buy/Entry Line (Amber) */}
                  <ReferenceLine yAxisId="price" y={selectedStock.necklinePrice} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" label={{ value: '🟡 Entry/Neckline', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />

                  {/* Reference Line: Stop Loss Line (Red) */}
                  <ReferenceLine yAxisId="price" y={selectedStock.stopLossPrice} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ value: '🔴 Stop-Loss (SL)', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />

                  {/* Reference Line: Target Profit 1 (Green) */}
                  <ReferenceLine yAxisId="price" y={selectedStock.targetPrice1} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: '🟢 Target 1 (TP1)', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />

                  {/* AI Prediction Area Corridor (Purple Translucent) */}
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="aiUpperBand"
                    stroke="#a855f7"
                    strokeDasharray="2 2"
                    fill="#a855f7"
                    fillOpacity={0.12}
                    dot={false}
                  />

                  {/* Historical Candlestick Bar Custom Shape */}
                  <Bar
                    yAxisId="price"
                    dataKey="close"
                    shape={(props: any) => {
                      const { x, y, width, payload } = props;
                      if (!payload) return <g />;
                      const { open, close, high, low, isForecast } = payload;
                      const isUp = (close || 0) >= (open || 0);
                      const color = isForecast ? "#c084fc" : isUp ? "#ef4444" : "#3b82f6";

                      const safeX = Number.isFinite(x) ? x : 0;
                      const safeY = Number.isFinite(y) ? y : 0;
                      const safeWidth = Number.isFinite(width) ? width : 12;

                      const bodyTop = Math.min(open || 0, close || 0);
                      const bodyBottom = Math.max(open || 0, close || 0);

                      const candleWidth = Math.max(safeWidth * 0.65, 5);
                      const candleX = safeX + (safeWidth - candleWidth) / 2;

                      return (
                        <g key={`candle-${safeX}`}>
                          {/* Candle Wick */}
                          <line
                            x1={safeX + safeWidth / 2}
                            y1={safeY}
                            x2={safeX + safeWidth / 2}
                            y2={safeY + 20}
                            stroke={color}
                            strokeWidth={1.5}
                          />
                          {/* Candle Body */}
                          <rect
                            x={candleX}
                            y={safeY}
                            width={candleWidth}
                            height={Math.max(Math.abs(open - close) * 0.05, 6)}
                            fill={color}
                            rx={1.5}
                          />
                        </g>
                      );
                    }}
                  />

                  {/* AI Future Trajectory Line (Purple Glow) */}
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="aiTrajectory"
                    stroke="#c084fc"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#a855f7", stroke: "#ffffff" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MARKET OPEN 30-MINUTE RULE (장 시작 30분 법칙) */}
      {/* ========================================================================= */}
      {activeTab === "MARKET_OPEN_30MIN" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Hero Banner */}
          <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-7xl text-amber-400 select-none pointer-events-none">
              30M RULE
            </div>
            
            <div className="space-y-3 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider font-mono shadow-md">
                  실전 트레이딩 핵심 수급 법칙
                </span>
                <span className="text-xs text-amber-300 font-mono flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>장 시작 09:00 ~ 09:30 모멘텀 검증</span>
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                한국 주식이 급등해도 꼭 기억해야 할 <span className="text-amber-400 underline underline-offset-4 decoration-amber-500">“장 시작 30분 법칙”</span>
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-sans">
                장 개장 후 첫 30분 동안의 시가(Open Price) 지지 및 재돌파 여부는 당일 세력 주도주의 흐름을 결정짓는 가장 강력한 분기점입니다.
                아래 5가지 가격 파동 패턴을 완벽히 숙지하여 시가 붕괴 종목의 뇌동매매를 방지하고, 시가 지지/재돌파 종목에만 한정하여 진입하세요!
              </p>
            </div>
          </div>

          {/* 5 Rules Grid Cards with SVG Diagrams */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {THIRTY_MINUTE_RULES.map((rule) => (
              <div
                key={rule.id}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl transition-all duration-200 hover:scale-[1.01] ${
                  rule.statusType === "BUY"
                    ? "border-emerald-500/60 hover:border-emerald-400 bg-slate-900/90 shadow-emerald-950/30"
                    : rule.statusType === "FORBIDDEN"
                    ? "border-rose-500/60 hover:border-rose-400 bg-slate-900/90 shadow-rose-950/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header Badge & Title */}
                <div className="space-y-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="h-7 w-7 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-mono text-xs font-black flex items-center justify-center">
                      #{rule.ruleNumber}
                    </span>
                    <span className={`text-[11px] font-mono font-black px-2.5 py-1 rounded-lg border ${rule.badgeBg}`}>
                      {rule.badgeText}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-1.5">
                      <span>{rule.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">{rule.subtitle}</p>
                  </div>
                </div>

                {/* SVG Visual Graphic Diagram */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>30분 분봉 파동 구조 시각화</span>
                    <span className="text-amber-400 font-bold">빨간 점선 = 시가(Open)</span>
                  </div>
                  <ThirtyMinuteRuleChartSVG type={rule.svgChartType} />
                </div>

                {/* Explanation Description */}
                <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">패턴 해설 & 세력 수급 의미</span>
                    <p className="text-slate-300 font-sans leading-relaxed">{rule.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-amber-300 font-bold block mb-0.5">💡 권장 트레이딩 행동 수칙</span>
                    <p className="text-cyan-300 font-mono text-[11px] font-bold">{rule.keyAction}</p>
                  </div>
                </div>

                {/* Rule Test Button */}
                <button
                  onClick={() => {
                    setCustom30MinRuleId(rule.id);
                    setActiveTab("MATRIX_CALCULATOR");
                    addToast({
                      type: "INFO",
                      title: "30분 법칙 적용 완료",
                      message: `매트릭스 계산기에 [${rule.title}] 조건이 반영되었습니다.`
                    });
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    rule.statusType === "BUY"
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
                      : rule.statusType === "FORBIDDEN"
                      ? "bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>이 법칙으로 퀀트 매트릭스 계산기 검증하기</span>
                </button>
              </div>
            ))}
          </div>

          {/* Interactive Live 30M Diagnostic Console */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <span>실시간 장 시작 30분 법칙 진단 콘솔</span>
                </h4>
                <p className="text-xs text-slate-400">현재 분석 중인 종목의 장 시작 30분 파동 구조를 직접 테스트해보세요.</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">선택 종목:</span>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-700 px-3 py-1 rounded-xl font-bold">
                  {selectedStock.name} ({selectedStock.symbol})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {THIRTY_MINUTE_RULES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setCustom30MinRuleId(r.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                    custom30MinRuleId === r.id
                      ? "bg-cyan-950 border-cyan-400 text-white ring-2 ring-cyan-400/50 shadow-lg"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-500 block">경우 #{r.ruleNumber}</span>
                  <span className="text-xs font-bold text-white block truncate">{r.title}</span>
                  <span className={`text-[10px] font-mono block truncate ${
                    r.statusType === "BUY" ? "text-emerald-400" : r.statusType === "FORBIDDEN" ? "text-rose-400" : "text-slate-400"
                  }`}>
                    {r.judgment}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Rule Result Alert Box */}
            {(() => {
              const activeRuleObj = THIRTY_MINUTE_RULES.find(r => r.id === custom30MinRuleId) || THIRTY_MINUTE_RULES[0];
              return (
                <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  activeRuleObj.statusType === "BUY"
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-200"
                    : activeRuleObj.statusType === "FORBIDDEN"
                    ? "bg-rose-950/60 border-rose-500 text-rose-200"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}>
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider block opacity-80">
                      30분 법칙 진단 결과: [{activeRuleObj.title}]
                    </span>
                    <div className="text-lg font-black">{activeRuleObj.badgeText}</div>
                    <p className="text-xs max-w-2xl font-sans">{activeRuleObj.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTab("MATRIX_CALCULATOR");
                      }}
                      className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                    >
                      실시간 퀀트 차트 분석 ➔
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 9 BULLISH CANDLESTICK PATTERNS MANUAL & CARDS */}
      {/* ========================================================================= */}
      {activeTab === "CANDLE_LIBRARY" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" />
                <span>9 BULLISH CANDLESTICK CONFIRMATION LIBRARY</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                영상에 제시된 9가지 핵심 상승 캔들 패턴의 형태, 시장 심리 의미, 및 퀀트 강화 검증 조건
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-xl border border-amber-700">
              단독 신호 사용 금지 → 위치 + 거래량 + VWAP 검증 필수
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BULLISH_CANDLE_PATTERNS.map(cp => (
              <div
                key={cp.id}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 space-y-3 shadow-lg transition duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 text-xs font-black flex items-center justify-center font-mono">
                      #{cp.id}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-white">{cp.krName}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{cp.name}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-md">
                    상승 반전
                  </span>
                </div>

                {/* SVG Visual Graphic Diagram Simulation */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-center h-28 relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-500">캔들 구조 시각화</div>
                  
                  {cp.id === 1 && ( // Bullish Engulfing
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-3 bg-rose-500" />
                        <div className="w-4 h-8 bg-rose-500 rounded-sm" />
                        <div className="w-1 h-3 bg-rose-500" />
                        <span className="text-[9px] text-rose-400 mt-1">음봉</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-4 bg-emerald-400" />
                        <div className="w-6 h-14 bg-emerald-400 rounded-sm" />
                        <div className="w-1 h-4 bg-emerald-400" />
                        <span className="text-[9px] text-emerald-300 mt-1">장악 양봉</span>
                      </div>
                    </div>
                  )}

                  {cp.id === 2 && ( // Hammer
                    <div className="flex flex-col items-center">
                      <div className="w-1 h-2 bg-emerald-400" />
                      <div className="w-5 h-4 bg-emerald-400 rounded-sm" />
                      <div className="w-1 h-14 bg-emerald-400" />
                      <span className="text-[9px] text-emerald-300 mt-1">긴 밑꼬리 망치</span>
                    </div>
                  )}

                  {cp.id === 3 && ( // Morning Star
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-12 bg-rose-500 rounded-sm" />
                        <span className="text-[9px] text-rose-400 mt-1">1. 하락</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-amber-400 rounded-sm" />
                        <span className="text-[9px] text-amber-300 mt-1">2. 변곡</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-12 bg-emerald-400 rounded-sm" />
                        <span className="text-[9px] text-emerald-300 mt-1">3. 반등</span>
                      </div>
                    </div>
                  )}

                  {cp.id === 4 && ( // Piercing Pattern
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-12 bg-rose-500 rounded-sm" />
                        <span className="text-[9px] text-rose-400 mt-1">음봉</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-10 bg-emerald-400 rounded-sm" />
                        <span className="text-[9px] text-emerald-300 mt-1">50% 이상 회복</span>
                      </div>
                    </div>
                  )}

                  {cp.id === 5 && ( // Marubozu
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-16 bg-emerald-400 rounded-sm shadow-emerald-500/20 shadow-lg" />
                      <span className="text-[9px] text-emerald-300 mt-1">꼬리 없는 장대양봉</span>
                    </div>
                  )}

                  {cp.id === 6 && ( // Three White Soldiers
                    <div className="flex items-baseline gap-1.5">
                      <div className="w-4 h-8 bg-emerald-400 rounded-sm" />
                      <div className="w-4 h-10 bg-emerald-400 rounded-sm" />
                      <div className="w-4 h-12 bg-emerald-400 rounded-sm" />
                    </div>
                  )}

                  {cp.id === 7 && ( // Harami
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-14 bg-rose-500 rounded-sm" />
                      <div className="w-3 h-5 bg-emerald-400 rounded-sm" />
                    </div>
                  )}

                  {cp.id === 8 && ( // Inverted Hammer
                    <div className="flex flex-col items-center">
                      <div className="w-1 h-12 bg-emerald-400" />
                      <div className="w-5 h-4 bg-emerald-400 rounded-sm" />
                      <div className="w-1 h-2 bg-emerald-400" />
                    </div>
                  )}

                  {cp.id === 9 && ( // Tweezer Bottom
                    <div className="flex items-baseline gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-8 bg-rose-500 rounded-sm" />
                        <div className="w-1 h-6 bg-rose-500" />
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-8 bg-emerald-400 rounded-sm" />
                        <div className="w-1 h-6 bg-emerald-400" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="space-y-1.5 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">구조 형태:</span>
                    <p className="text-slate-200 text-xs font-sans">{cp.structureDescription}</p>
                  </div>

                  <div>
                    <span className="text-cyan-300 text-[10px] block">시장 심리 의미:</span>
                    <p className="text-cyan-200 text-xs font-sans">{cp.marketMeaning}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-amber-400 text-[10px] font-bold block mb-1">💡 퀀트 강화 조건 (Reinforcement):</span>
                    <div className="flex flex-wrap gap-1">
                      {cp.reinforcementConditions.map((rc, idx) => (
                        <span key={idx} className="bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                          • {rc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 5 MAJOR CHART PATTERNS MANUAL */}
      {/* ========================================================================= */}
      {activeTab === "CHART_PATTERNS" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-300" />
                <span>MAJOR CHART PATTERN STRUCTURES (5대 핵심 차트 파동)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                가격 변동폭 압축 → 넥라인/저항선 돌파 → 2차 대세 상승 파동으로 연결되는 핵심 패턴 구조
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-xl border border-cyan-700">
              목표가 & 손절가 자동 수식 적용
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MAJOR_CHART_PATTERNS.map(pt => (
              <div
                key={pt.id}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 space-y-4 shadow-xl transition"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-black text-white">{pt.krName}</h4>
                    <span className="text-xs font-mono text-cyan-300">{pt.name}</span>
                  </div>
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                    강세 파동 (Bullish)
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">가격 구조:</span>
                    <p className="text-slate-200 text-xs font-sans mt-0.5">{pt.structureText}</p>
                  </div>

                  <div className="bg-cyan-950/50 p-3 rounded-xl border border-cyan-800">
                    <span className="text-cyan-300 text-[10px] block">핵심 돌파 특징:</span>
                    <p className="text-cyan-100 text-xs font-sans mt-0.5">{pt.keyFeature}</p>
                  </div>

                  <div className="pt-2">
                    <span className="text-amber-400 text-[11px] font-bold block mb-1.5">✅ 높은 승률을 위한 조건 (Favorable Conditions):</span>
                    <div className="space-y-1">
                      {pt.favorableConditions.map((fc, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-300 text-xs font-sans">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{fc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRADING TERMS REFERENCE DICTIONARY */}
      {/* ========================================================================= */}
      {activeTab === "TRADING_TERMS" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-300" />
                <span>TRADING TERMS REFERENCE DICTIONARY (프라이스 액션 핵심 용어)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                기관 세력 매집, 구조 파괴, 유동성 스위프(Sweep)를 식별하기 위한 필수 용어 사전
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {TRADING_TERMS_LIBRARY.map((term, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 space-y-2 shadow-md transition"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-base font-black text-cyan-300 font-mono">{term.term}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {term.krName}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-sans leading-relaxed">{term.definition}</p>

                <div className="pt-2 border-t border-slate-800/80 font-mono text-[11px] text-amber-300">
                  <strong className="text-slate-400 block text-[10px]">실전 활용:</strong>
                  <span>{term.keyRole}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FULL PIPELINE PROCESS FLOW VISUALIZER */}
      {/* ========================================================================= */}
      {activeTab === "PIPELINE_FLOW" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-300" />
              <span>FULL QUANT ANALYSIS PIPELINE PROCESS FLOW (전체 분석 프로세스)</span>
            </h3>
            <p className="text-xs text-slate-400">
              영상 속 전체 분석 절차를 시스템 로직으로 정밀 이식한 10단계 멀티팩터 필터링 흐름도
            </p>
          </div>

          {/* Vertical Stepper Process Graphic */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 font-mono">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-slate-400 block text-[10px]">1단계: 거시 환경</span>
                <span className="font-bold text-cyan-300 text-sm">시장 → 업종 → 테마</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-slate-400 block text-[10px]">2단계: 수급 검증</span>
                <span className="font-bold text-cyan-300 text-sm">Relative Strength & RVOL</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-slate-400 block text-[10px]">3단계: 구조 파악</span>
                <span className="font-bold text-cyan-300 text-sm">가격 구조 & 5대 차트 패턴</span>
              </div>
            </div>

            <div className="flex justify-center my-1">
              <ChevronRight className="h-6 w-6 text-cyan-400 rotate-90 animate-bounce" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-slate-400 block text-[10px]">4단계: 캔들 완결</span>
                <span className="font-bold text-amber-400 text-sm">9 Bullish Candle Confirmation</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-slate-400 block text-[10px]">5단계: 지지 회복</span>
                <span className="font-bold text-emerald-400 text-sm">VWAP Reclaim & SSL Sweep</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-slate-400 block text-[10px]">6단계: 리스크 통제</span>
                <span className="font-bold text-rose-400 text-sm">Breakout Quality & Chase Risk</span>
              </div>
            </div>

            <div className="flex justify-center my-1">
              <ChevronRight className="h-6 w-6 text-emerald-400 rotate-90 animate-bounce" />
            </div>

            {/* Final Outcome Box */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-cyan-950 border-2 border-emerald-500 p-5 rounded-2xl text-center space-y-2 shadow-2xl">
              <span className="text-xs text-emerald-300 font-bold block">FINAL QUANT EVALUATION RESULT</span>
              <div className="text-2xl font-black text-white">
                SETUP QUALITY SCORE <span className="text-emerald-400">(0 ~ 100 점)</span>
              </div>
              <p className="text-xs text-slate-300 font-sans max-w-xl mx-auto">
                점수가 80점 이상이며 Neckline 돌파가 확정(CONFIRMED)된 종목만 진입하며, 미돌파 상태는 CONFIRMING 대기, 조건 미달 시 NO SETUP으로 필터링합니다.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
