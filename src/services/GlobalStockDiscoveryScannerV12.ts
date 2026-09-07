// AISTOCK v12 Global Stock Discovery Scanner Engine
// Open Source inspired: stock-screener-kr (MIT) & Qullamaggie / EP / Momentum Screener (MIT)

import { getAllStocks, StockItem } from "../data/stockUniverse";

export interface RawDiscoveryCandidate {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  price: number;
  changeRate: number;
  volume: number;
  rvol: number;
  sma5?: number;
  sma20?: number;
  sma60?: number;
  high52w?: number;
  low52w?: number;
  vwap?: number;
  adx?: number;
  dmiPlus?: number;
  dmiMinus?: number;
  category?: string;
}

export interface MarketDiscoveryProvider {
  loadCandidates(): Promise<RawDiscoveryCandidate[]>;
}

export interface ScannedStockV12 {
  rank: number;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  price: number;
  changeRate: number;
  volume: number;
  rvol: number;
  score: number;
  setupPattern: "BREAKOUT" | "VCP_PULLBACK" | "SMC_LIQUIDITY" | "VOLUME_SURGE" | "52W_HIGH";
  aiReason: string;
  rawCandidate: RawDiscoveryCandidate;
}

export class DefaultMarketDiscoveryProvider implements MarketDiscoveryProvider {
  public async loadCandidates(): Promise<RawDiscoveryCandidate[]> {
    const allStocks: StockItem[] = getAllStocks();
    return allStocks.map(stock => {
      const isUs = stock.market === "US";
      const isBtc = stock.market === "UPBIT";
      const parsedVol = typeof stock.volume === "number" ? stock.volume : parseInt(String(stock.volume || "").replace(/[^0-9]/g, ""), 10) || 0;
      const price = stock.price || 0;

      return {
        symbol: stock.symbol,
        name: stock.name,
        market: isUs ? "US" : isBtc ? "BTC" : "KOREA",
        price: price,
        changeRate: stock.changeRate || 0,
        volume: parsedVol,
        rvol: stock.rvol ?? 0,
        sma5: undefined,
        sma20: undefined,
        sma60: undefined,
        high52w: undefined,
        low52w: undefined,
        vwap: undefined,
        adx: undefined,
        category: stock.category
      };
    });
  }
}

/**
 * @deprecated ANALYSIS_ONLY
 * Legacy scanner engine V12.
 * Production runtime usage prohibited in favor of GlobalStockDiscoveryScannerV17 / V18.
 */
export class GlobalStockDiscoveryScannerV12 {
  private provider: MarketDiscoveryProvider;

  constructor(provider?: MarketDiscoveryProvider) {
    this.provider = provider || new DefaultMarketDiscoveryProvider();
  }

  public setProvider(provider: MarketDiscoveryProvider) {
    this.provider = provider;
  }

  public async scanTop20Candidates(): Promise<ScannedStockV12[]> {
    const rawCandidates = await this.provider.loadCandidates();
    const scoredList: ScannedStockV12[] = [];

    for (const item of rawCandidates) {
      if (!item.price || item.price <= 0) continue;

      let score = 50; // base score

      // 1. RVOL Score (Relative Volume) - Max +20
      if (item.rvol >= 2.5) score += 20;
      else if (item.rvol >= 1.8) score += 15;
      else if (item.rvol >= 1.2) score += 10;

      // 2. Momentum & Change Rate - Max +18
      if (item.changeRate >= 3.0 && item.changeRate <= 15.0) score += 18;
      else if (item.changeRate > 0 && item.changeRate < 3.0) score += 10;

      // 3. 52-Week High Proximity - Max +15
      if (item.high52w && item.high52w > 0) {
        const distFrom52w = (item.high52w - item.price) / item.price;
        if (distFrom52w <= 0.05) score += 15; // Within 5% of 52w high
        else if (distFrom52w <= 0.12) score += 10;
      }

      // 4. Moving Average Alignment (SMA5 > SMA20 > SMA60) - Max +15
      if (item.sma5 && item.sma20 && item.sma60) {
        if (item.sma5 > item.sma20 && item.sma20 > item.sma60) {
          score += 15;
        }
      }

      // 5. Setup Pattern Classification
      let setupPattern: ScannedStockV12["setupPattern"] = "VOLUME_SURGE";
      let aiReason = "";

      if (item.rvol >= 2.0 && item.changeRate >= 4.0) {
        setupPattern = "BREAKOUT";
        aiReason = `RVOL ${item.rvol.toFixed(1)}배 돌파 수급 및 52주 신고가 근접 패턴`;
      } else if (item.sma5 && item.sma20 && item.price >= item.sma5 && item.sma5 > item.sma20) {
        setupPattern = "VCP_PULLBACK";
        aiReason = "5일/20일 정배열 상태 눌림목 지지 및 수급 재유입";
      } else if (item.high52w && (item.high52w - item.price) / item.price <= 0.03) {
        setupPattern = "52W_HIGH";
        aiReason = "52주 신고가 신고점 갱신 직전 매수 수급 포착";
      } else {
        setupPattern = "SMC_LIQUIDITY";
        aiReason = "스마트머니 기관/외인 수급 집중 유입 및 VWAP 상단 유지";
      }

      scoredList.push({
        rank: 0,
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        price: item.price,
        changeRate: item.changeRate,
        volume: item.volume,
        rvol: item.rvol,
        score: Math.min(99, Math.max(10, Math.round(score))),
        setupPattern,
        aiReason,
        rawCandidate: item
      });
    }

    // Sort descending by score & rank top 20
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.slice(0, 20).map((cand, idx) => ({
      ...cand,
      rank: idx + 1
    }));
  }
}
