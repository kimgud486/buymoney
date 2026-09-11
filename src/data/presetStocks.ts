import { KRX_AND_GLOBAL_MASTER_UNIVERSE } from "./krxMasterUniverse";

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
  news: { title: string; source: string; time: string; sentiment: "positive" | "neutral" | "negative" }[];
  technical: {
    rsi: number;
    macd: string;
    bollinger: "upper" | "middle" | "lower" | "NO_DATA";
    trend: "up" | "down" | "sideways";
  };
}

/**
 * Truth-only compatibility seed.
 *
 * This object contains exchange metadata only. It intentionally carries no
 * believable quote, fundamental, news or indicator value. server.ts passes
 * these rows through fetchLiveStockData(), and provider failure remains
 * price=0 / NO_DATA instead of falling back to a fabricated quote.
 */
function toTruthOnlyPreset(record: (typeof KRX_AND_GLOBAL_MASTER_UNIVERSE)[number]): PresetStock {
  return {
    symbol: record.symbol,
    name: record.name,
    market: record.market === "US" ? "US" : record.market === "UPBIT" ? "UPBIT" : "KOREA",
    price: 0,
    change: 0,
    changePct: 0,
    marketCap: "N/A",
    per: 0,
    pbr: 0,
    roe: 0,
    debtRatio: 0,
    revenueGrowth: 0,
    operatingMargin: 0,
    news: [],
    technical: { rsi: 0, macd: "NO_DATA", bollinger: "NO_DATA", trend: "sideways" }
  };
}

/** Full metadata catalog for compatibility/search surfaces. No market values. */
export const PRESET_CATALOG_STOCKS: PresetStock[] = KRX_AND_GLOBAL_MASTER_UNIVERSE.map(toTruthOnlyPreset);

/**
 * Bounded default quote list used by legacy /api/stocks with an empty query.
 * Keep it intentionally small so one page load does not fan out thousands of
 * provider requests. Full-market discovery remains the V19.2/V20 scanner job.
 */
const DEFAULT_KOREA_QUOTE_LIMIT = 24;
const DEFAULT_US_QUOTE_LIMIT = 12;

const koreaDefaults = KRX_AND_GLOBAL_MASTER_UNIVERSE
  .filter((record) => record.market === "KOSPI" || record.market === "KOSDAQ" || record.market === "KONEX")
  .slice(0, DEFAULT_KOREA_QUOTE_LIMIT);

const usDefaults = KRX_AND_GLOBAL_MASTER_UNIVERSE
  .filter((record) => record.market === "US")
  .slice(0, DEFAULT_US_QUOTE_LIMIT);

export const DEMO_FIXTURE_STOCKS: PresetStock[] = [...koreaDefaults, ...usDefaults].map(toTruthOnlyPreset);
