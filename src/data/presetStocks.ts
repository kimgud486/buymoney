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
    bollinger: 'upper' | 'middle' | 'lower' | 'NO_DATA';
    trend: 'up' | 'down' | 'sideways';
  };
}

/**
 * Production truth rule:
 * this module must never contain quoted prices, fabricated news, indicators,
 * market caps, or simulated stock rows. Production routes may import the
 * compatibility exports below, but they are intentionally empty so missing
 * provider data fails closed instead of becoming a believable fake quote.
 */
export const PRESET_CATALOG_STOCKS: PresetStock[] = [];
export const DEMO_FIXTURE_STOCKS: PresetStock[] = [];
