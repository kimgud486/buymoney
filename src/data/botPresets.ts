export interface BotPresetItem {
  id: string;
  name: string;
  category: "SMALL" | "MID" | "LARGE" | "CRYPTO" | "CORE" | "US_TECH" | "HFT_QUANT";
  categoryLabel: string;
  status: "ONLINE" | "SCANNING" | "DETECTED" | "IDLE" | "REINFORCED";
  statusText: string;
  description: string;
  activeCountText?: string;
  winRate: number;
  totalSignals: number;
  pf: number;
  targetUniverse: string;
  latencyMs: number;
  iconName: string;
  badgeColor: string;
  topDiscoveredStocks: string[];
  level?: number;
  reinforced?: boolean;
  powerMultiplier?: number;
}

export const DEFAULT_BOT_PRESETS: BotPresetItem[] = [
  // 12 AI CORE NETWORK BOTS (left 6 & right 6)
  {
    id: "bot-market-macro",
    name: "시장 분석 실세 연동 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "실시간 연동",
    description: "KOSPI/KOSDAQ 및 글로벌 매크로 유동성 지수 실시간 주식 호가·체결 시세 연동 추적",
    winRate: 74.5,
    totalSignals: 1420,
    pf: 1.85,
    targetUniverse: "전체 시장 (실시세 연동)",
    latencyMs: 8.2,
    iconName: "Activity",
    badgeColor: "text-cyan-600 bg-cyan-50 border-cyan-200",
    topDiscoveredStocks: ["KOSPI", "KOSDAQ", "선물"]
  },
  {
    id: "bot-stock-discovery",
    name: "종목 발굴 실세 연동 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "SCANNING",
    statusText: "시세 연동 중",
    description: "전체 2,500개 전 종목 대상 0.1초 단위 거래량/체결강도 및 실시간 주식 실세가 정밀 연동 스캔",
    winRate: 68.9,
    totalSignals: 950,
    pf: 1.74,
    targetUniverse: "전체 상장종목 (실시간 호가)",
    latencyMs: 9.1,
    iconName: "Search",
    badgeColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
    topDiscoveredStocks: ["한화에어로스페이스", "레인보우로보틱스", "제주반도체"]
  },
  {
    id: "bot-trade-value",
    name: "거래대금 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "분당 거래대금 30억 이상 급증 종목 및 당일 1,000억 이상 주도주 감지",
    winRate: 72.1,
    totalSignals: 830,
    pf: 1.82,
    targetUniverse: "거래대금 상위",
    latencyMs: 6.4,
    iconName: "Flame",
    badgeColor: "text-amber-600 bg-amber-50 border-amber-200",
    topDiscoveredStocks: ["두산에너빌리티", "SK하이닉스", "삼성전자"]
  },
  {
    id: "bot-rvol-surge",
    name: "거래량/RVOL 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "5일 평균 대비 상대 거래량(RVOL) 2.5배 이상 폭발 구간 감지",
    winRate: 70.4,
    totalSignals: 1120,
    pf: 1.76,
    targetUniverse: "급증 거래량",
    latencyMs: 7.3,
    iconName: "BarChart2",
    badgeColor: "text-purple-600 bg-purple-50 border-purple-200",
    topDiscoveredStocks: ["유진로봇", "우리기술", "LS ELECTRIC"]
  },
  {
    id: "bot-pattern-vision",
    name: "패턴 분석 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "DETECTED",
    statusText: "12건 감지",
    activeCountText: "12건 감지",
    description: "Bull Flag, 컵앤핸들, 역헤드앤숄더 차트 비전 딥러닝 인식",
    winRate: 67.8,
    totalSignals: 1284,
    pf: 1.82,
    targetUniverse: "패턴 완성군",
    latencyMs: 12.5,
    iconName: "Layers",
    badgeColor: "text-rose-600 bg-rose-50 border-rose-200",
    topDiscoveredStocks: ["한화에어로스페이스", "삼천당제약", "알테오젠"]
  },
  {
    id: "bot-bos-choch",
    name: "BOS/CHoCH 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "DETECTED",
    statusText: "7건 감지",
    activeCountText: "7건 감지",
    description: "SMC 스마트머니 구조 돌파(Break of Structure) & 추세 전환점 포착",
    winRate: 75.3,
    totalSignals: 640,
    pf: 2.15,
    targetUniverse: "SMC 구조 돌파",
    latencyMs: 8.8,
    iconName: "TrendingUp",
    badgeColor: "text-orange-600 bg-orange-50 border-orange-200",
    topDiscoveredStocks: ["두산에너빌리티", "솔라나", "현대로템"]
  },
  // Right 6 bots
  {
    id: "bot-vwap-liquidity",
    name: "VWAP/유동성 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "기관 평균 매수가격선(VWAP) 상향 안착 및 유동성 스윕(Sweep) 감지",
    winRate: 66.4,
    totalSignals: 987,
    pf: 1.58,
    targetUniverse: "VWAP 상단 지지",
    latencyMs: 6.9,
    iconName: "Radio",
    badgeColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
    topDiscoveredStocks: ["삼성전자", "HD현대일렉트릭", "POSCO홀딩스"]
  },
  {
    id: "bot-investor-flow",
    name: "수급 분석 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "외국인/기관 순매수 수급 동시 유입(쌍끌이) 0.5초 단위 모니터링",
    winRate: 71.8,
    totalSignals: 890,
    pf: 1.88,
    targetUniverse: "외인/기관 집중",
    latencyMs: 8.5,
    iconName: "Users",
    badgeColor: "text-teal-600 bg-teal-50 border-teal-200",
    topDiscoveredStocks: ["현대로템", "SK하이닉스", "한화에어로스페이스"]
  },
  {
    id: "bot-news-sentiment",
    name: "뉴스/이슈 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "공시, HTS 속보, 글로벌 뉴스 감성 지수 실시간 AI 분석",
    winRate: 63.5,
    totalSignals: 1540,
    pf: 1.45,
    targetUniverse: "뉴스 속보 종목",
    latencyMs: 14.2,
    iconName: "Newspaper",
    badgeColor: "text-blue-600 bg-blue-50 border-blue-200",
    topDiscoveredStocks: ["삼성바이오로직스", "에이비엘바이오", "우리기술"]
  },
  {
    id: "bot-relative-strength",
    name: "상대강도 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "코스피/코스닥 지수 대비 초과 수익률(RS > 85) 기록 중인 주도주 판별",
    winRate: 73.2,
    totalSignals: 760,
    pf: 1.92,
    targetUniverse: "시장 대비 초과상승",
    latencyMs: 7.7,
    iconName: "Zap",
    badgeColor: "text-violet-600 bg-violet-50 border-violet-200",
    topDiscoveredStocks: ["한화에어로스페이스", "두산에너빌리티", "솔라나"]
  },
  {
    id: "bot-risk-management",
    name: "리스크 관리 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "정상",
    description: "ATR 변동성 기반 손절라인(-2.5%~-3.5%) 및 슬리피지 방어선 실시간 계산",
    winRate: 88.0,
    totalSignals: 2400,
    pf: 2.40,
    targetUniverse: "보유 및 진입 전 종목",
    latencyMs: 5.1,
    iconName: "ShieldCheck",
    badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-300",
    topDiscoveredStocks: ["전체 포지션 보호"]
  },
  {
    id: "bot-performance-analytics",
    name: "성과 분석 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "SCANNING",
    statusText: "분석 중",
    description: "실시간 손익비, 승률, Profit Factor 및 기대값(Expectancy) 머신러닝 피드백",
    winRate: 78.4,
    totalSignals: 1890,
    pf: 2.05,
    targetUniverse: "전략 백테스트 & 실전 체결",
    latencyMs: 11.0,
    iconName: "FileCheck",
    badgeColor: "text-sky-600 bg-sky-50 border-sky-200",
    topDiscoveredStocks: ["전략 성과 최적화"]
  },

  // SPECIAL CATEGORY BOTS REQUESTED BY USER
  {
    id: "bot-small-cap-alpha",
    name: "소형주 급등 알파 발굴 봇",
    category: "SMALL",
    categoryLabel: "소형주",
    status: "ONLINE",
    statusText: "18개 탐색",
    description: "시총 500억~5000억 원 소형주 중 거래대금 5배 급증 & 세력 매집 돌파 종목 집중 발굴",
    winRate: 72.8,
    totalSignals: 430,
    pf: 2.18,
    targetUniverse: "코스닥 소형 테마주 / 수급 폭발주",
    latencyMs: 8.5,
    iconName: "Rocket",
    badgeColor: "text-rose-600 bg-rose-50 border-rose-200",
    topDiscoveredStocks: ["레인보우로보틱스", "제주반도체", "유진로봇", "우리기술", "삼천당제약"]
  },
  {
    id: "bot-mid-cap-swing",
    name: "중형주 주도 스윙 봇",
    category: "MID",
    categoryLabel: "중형주",
    status: "ONLINE",
    statusText: "14개 탐색",
    description: "시총 5,000억~3조 원 주도주 중 실적 모멘텀 + 기관/외인 쌍끌이 20일선 눌림목 반등 타겟",
    winRate: 76.4,
    totalSignals: 520,
    pf: 2.05,
    targetUniverse: "코스피/코스닥 중형 우량주",
    latencyMs: 7.2,
    iconName: "TrendingUp",
    badgeColor: "text-blue-600 bg-blue-50 border-blue-200",
    topDiscoveredStocks: ["한화에어로스페이스", "두산에너빌리티", "현대로템", "LS ELECTRIC", "알테오젠"]
  },
  {
    id: "bot-large-cap-quant",
    name: "대형주 퀀트 가치 봇",
    category: "LARGE",
    categoryLabel: "대형주",
    status: "ONLINE",
    statusText: "8개 탐색",
    description: "코스피 200 시총 상위 대형 우량주 VWAP 지지선 및 저PBR/밸류업 퀀트 리밸런싱",
    winRate: 81.2,
    totalSignals: 310,
    pf: 1.95,
    targetUniverse: "코스피 대형주 (삼성전자, SK하이닉스 등)",
    latencyMs: 6.1,
    iconName: "Shield",
    badgeColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
    topDiscoveredStocks: ["삼성전자", "SK하이닉스", "POSCO홀딩스", "현대차", "삼성바이오로직스"]
  },
  {
    id: "bot-upbit-crypto",
    name: "업비트 24H 가상자산 봇",
    category: "CRYPTO",
    categoryLabel: "가상자산",
    status: "ONLINE",
    statusText: "24H 실시간",
    description: "업비트 실시간 웹소켓 틱 연동 기반 BTC/ETH/SOL 거래량 변동성 돌파 및 김치프리미엄 차익 탐색",
    winRate: 69.5,
    totalSignals: 880,
    pf: 1.78,
    targetUniverse: "업비트 KRW 원화마켓",
    latencyMs: 4.8,
    iconName: "Coins",
    badgeColor: "text-amber-600 bg-amber-50 border-amber-200",
    topDiscoveredStocks: ["BTC (비트코인)", "ETH (이더리움)", "SOL (솔라나)", "XRP (리플)", "DOGE (도지)"],
    level: 1
  },
  // NEW ENHANCED HIGH-PERFORMANCE BOTS
  {
    id: "bot-us-nasdaq-bigtech",
    name: "미국 빅테크 & M7 AI 모멘텀 봇",
    category: "US_TECH",
    categoryLabel: "미국주식",
    status: "REINFORCED",
    statusText: "강화 가동중",
    description: "엔비디아(NVDA), 테슬라(TSLA), 애플(AAPL) 등 미국 나스닥 100 기술주 실시간 모멘텀 알파 추출",
    winRate: 89.2,
    totalSignals: 620,
    pf: 2.35,
    targetUniverse: "NASDAQ 100 / M7 빅테크",
    latencyMs: 3.2,
    iconName: "Globe",
    badgeColor: "text-cyan-700 bg-cyan-50 border-cyan-300",
    topDiscoveredStocks: ["NVDA", "TSLA", "AAPL", "MSFT", "AMZN"],
    level: 3,
    reinforced: true,
    powerMultiplier: 1.25
  },
  {
    id: "bot-hft-orderbook-v2",
    name: "HFT Ultra 호가잔량 초고속 봇",
    category: "HFT_QUANT",
    categoryLabel: "초고속 HFT",
    status: "REINFORCED",
    statusText: "초고속 응답",
    description: "0.1ms 초저지연 호가잔량 체결강도 250% 돌파 매수 + 틱 스캘핑 하이퍼엔진",
    winRate: 91.8,
    totalSignals: 1450,
    pf: 2.62,
    targetUniverse: "코스피/코스닥 호가 주도주",
    latencyMs: 0.8,
    iconName: "Zap",
    badgeColor: "text-amber-700 bg-amber-50 border-amber-300",
    topDiscoveredStocks: ["한화에어로스페이스", "두산에너빌리티", "레인보우로보틱스"],
    level: 3,
    reinforced: true,
    powerMultiplier: 1.30
  },
  {
    id: "bot-sector-rotation-master",
    name: "주도 섹터 순환매 로테이션 봇",
    category: "CORE",
    categoryLabel: "코어",
    status: "ONLINE",
    statusText: "실시간 감지",
    description: "반도체, 방산, 로봇, 제약바이오, 2차전지 등 테마 수급 이동 실시간 선점 매수",
    winRate: 85.4,
    totalSignals: 790,
    pf: 2.12,
    targetUniverse: "당일 주도 테마 섹터",
    latencyMs: 5.5,
    iconName: "Compass",
    badgeColor: "text-purple-700 bg-purple-50 border-purple-300",
    topDiscoveredStocks: ["알테오젠", "제주반도체", "유진로봇", "현대로템"],
    level: 2,
    reinforced: false
  }
];

export function getCustomBots(): BotPresetItem[] {
  try {
    const raw = localStorage.getItem("aistock_custom_registered_bots");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load custom bots", e);
  }
  return [];
}

export function saveCustomBot(bot: BotPresetItem): void {
  try {
    const existing = getCustomBots();
    const updated = [bot, ...existing.filter((b) => b.id !== bot.id)];
    localStorage.setItem("aistock_custom_registered_bots", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save custom bot", e);
  }
}

export function getAllBots(): BotPresetItem[] {
  const custom = getCustomBots();
  const map = new Map<string, BotPresetItem>();
  DEFAULT_BOT_PRESETS.forEach((b) => map.set(b.id, b));
  custom.forEach((b) => map.set(b.id, b));
  return Array.from(map.values());
}

export function upgradeBotPreset(botId: string): BotPresetItem | null {
  const all = getAllBots();
  const target = all.find((b) => b.id === botId);
  if (!target) return null;

  const currentLevel = target.level || 1;
  const nextLevel = Math.min(5, currentLevel + 1);
  const winRateBoost = 2.5;
  const newWinRate = Math.min(98.5, +(target.winRate + winRateBoost).toFixed(1));
  const newPf = +(target.pf + 0.15).toFixed(2);
  const newLatency = Math.max(0.5, +(target.latencyMs * 0.85).toFixed(1));

  const upgraded: BotPresetItem = {
    ...target,
    level: nextLevel,
    reinforced: true,
    status: "REINFORCED",
    statusText: `LV.${nextLevel} 강화완료`,
    winRate: newWinRate,
    pf: newPf,
    latencyMs: newLatency,
    powerMultiplier: +((target.powerMultiplier || 1.0) + 0.15).toFixed(2),
    badgeColor: "text-amber-700 bg-amber-50 border-amber-400 font-bold"
  };

  saveCustomBot(upgraded);
  return upgraded;
}
