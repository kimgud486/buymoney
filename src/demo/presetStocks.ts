export interface PresetStock {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC" | "UPBIT";
  price: number;
  regularClosePrice?: number;
  afterHoursPrice?: number;
  overPrice?: number;
  marketSession?: string;
  priceNote?: string;
  change: number;
  changePct: number;
  marketCap: string;
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
  revenueGrowth: number;
  operatingMargin: number;
  news: { title: string; source: string; time: string; sentiment: 'positive' | 'neutral' | 'negative' }[];
  technical: {
    rsi: number;
    macd: string;
    bollinger: 'upper' | 'middle' | 'lower';
    trend: 'up' | 'down' | 'sideways';
  };
}

/**
 * DEMO & TEST FIXTURE ONLY
 * Do not use in production live trading or real-time scanner paths.
 */
export const DEMO_FIXTURE_STOCKS: PresetStock[] = [
  {
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    price: 255000,
    regularClosePrice: 255000,
    afterHoursPrice: 255000,
    overPrice: 255000,
    marketSession: "REGULAR (정규장)",
    priceNote: "실시간 체결 시세 255,000원",
    change: 1500,
    changePct: 0.59,
    marketCap: "1,655조 원",
    per: 14.8,
    pbr: 1.25,
    roe: 8.5,
    debtRatio: 24.3,
    revenueGrowth: 11.2,
    operatingMargin: 12.1,
    news: [
      { title: "삼성전자, AI 서버용 차세대 HBM4 양산 계획 가속화", source: "경제일보", time: "2시간 전", sentiment: "positive" },
      { title: "글로벌 반도체 수요 회복 신호... 외국인 순매수 유입", source: "한국금융", time: "5시간 전", sentiment: "positive" }
    ],
    technical: { rsi: 58, macd: "Bullish Cross", bollinger: "middle", trend: "up" }
  },
  {
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    price: 1647000,
    change: -3000,
    changePct: -0.18,
    marketCap: "135조 원",
    per: 11.2,
    pbr: 1.85,
    roe: 14.2,
    debtRatio: 45.1,
    revenueGrowth: 22.4,
    operatingMargin: 18.5,
    news: [
      { title: "SK하이닉스, HBM3E 공급 확대로 영업이익률 개선 전망", source: "반도체뉴스", time: "1시간 전", sentiment: "positive" }
    ],
    technical: { rsi: 62, macd: "Bullish Cross", bollinger: "upper", trend: "up" }
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    market: "US",
    price: 128.5,
    change: 3.2,
    changePct: 2.55,
    marketCap: "$3.15T",
    per: 48.2,
    pbr: 32.1,
    roe: 55.4,
    debtRatio: 18.2,
    revenueGrowth: 122.5,
    operatingMargin: 62.1,
    news: [
      { title: "NVIDIA Blackwell B200 Chip Production On Track", source: "TechCrunch", time: "3 hours ago", sentiment: "positive" }
    ],
    technical: { rsi: 66, macd: "Bullish Cross", bollinger: "upper", trend: "up" }
  }
];
