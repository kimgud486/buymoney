// ----------------------------------------------------------------------
// REAL-TIME LIVE MARKET FEED & REAL QUOTES SERVICE (KRX & UPBIT & US)
// V15 Zero Fake Data & Provenance Standards
// ----------------------------------------------------------------------

import { safeSymbolStr } from "../lib/stockDictionary";
import { MarketDataIntegrityGate } from "./MarketDataIntegrityGate";
import { DataTrustLevel } from "../types/DataTrust";

export interface LiveMarketQuote {
  symbol: string;
  name: string;

  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US";

  price: number | null;

  changeRate: number | null;
  changeAmount: number | null;

  volume: number | null;
  tradeValue: number | null;

  // Separated from tradeValue
  marketCap: number | null;

  provider: string | null;
  source: string | null;
  exchange: string | null;

  providerTimestamp: number | null;
  receivedAt: number;

  ageMs: number | null;

  isVerified: boolean;

  trust: DataTrustLevel;

  status: "LIVE" | "STALE" | "UNAVAILABLE";
}

export function requireLiveData(quote: LiveMarketQuote | undefined): boolean {
  if (!quote) return false;
  if (quote.status !== "LIVE" || !quote.isVerified) return false;
  if (quote.trust !== "EXECUTION_GRADE") return false;
  if (quote.ageMs == null || quote.ageMs > 5_000) return false;
  if (quote.price == null || quote.price <= 0) return false;
  return true;
}

class RealtimeMarketFeedService {
  private quotes: Map<string, LiveMarketQuote> = new Map();
  private registeredSymbols: Map<string, "KOSPI" | "KOSDAQ" | "UPBIT" | "US"> = new Map();
  private subscribers: Set<(quotes: Map<string, LiveMarketQuote>) => void> = new Set();
  private isPolling = false;
  private pollTimer: any = null;

  private isFeedEnabled = true;

  constructor() {
    try {
      const savedFeedState = localStorage.getItem("aistock_realtime_feed_active");
      if (savedFeedState !== null) {
        this.isFeedEnabled = savedFeedState === "true";
      }
    } catch {
      this.isFeedEnabled = true;
    }
  }

  public isFeedActive(): boolean {
    return this.isFeedEnabled;
  }

  public toggleFeed(targetState?: boolean): boolean {
    const newState = targetState !== undefined ? targetState : !this.isFeedEnabled;
    this.isFeedEnabled = newState;
    try {
      localStorage.setItem("aistock_realtime_feed_active", String(newState));
    } catch (e) {
      console.warn("Feed state save error:", e);
    }

    if (newState) {
      this.start();
    } else {
      this.stop();
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("realtime_feed_status_change", {
        detail: { isFeedActive: newState }
      }));
    }

    return this.isFeedEnabled;
  }

  public registerSymbol(symbol: any, market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US") {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return;
    if (!this.registeredSymbols.has(cleanSym)) {
      const determinedMarket: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" =
        market ||
        (cleanSym === "BTC" || cleanSym === "ETH" || cleanSym === "SOL" || cleanSym === "XRP" || cleanSym === "DOGE" ? "UPBIT" :
         /^[A-Z]{1,5}$/.test(cleanSym) ? "US" : "KOSPI");
      this.registeredSymbols.set(cleanSym, determinedMarket);
      this.fetchRealQuotes();
    }
  }

  public registerSymbols(symbols: Array<{ symbol: string; market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" }>) {
    let count = 0;
    symbols.forEach((item) => {
      if (item.symbol && !this.registeredSymbols.has(item.symbol.toUpperCase())) {
        this.registerSymbol(item.symbol, item.market);
        count++;
      }
    });
    if (count > 0 && this.isPolling) {
      this.fetchRealQuotes();
    }
  }

  public start() {
    if (!this.isFeedEnabled) return;
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchRealQuotes();
    this.pollTimer = setInterval(() => {
      if (!this.isFeedEnabled) {
        this.stop();
        return;
      }
      this.fetchRealQuotes();
    }, 3500);
  }

  public stop() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async fetchRealQuotes() {
    // 1. Fetch live quotes for Registered Crypto via Upbit API
    try {
      const upbitSymbols = Array.from(this.registeredSymbols.entries())
        .filter(([_, m]) => m === "UPBIT")
        .map(([sym]) => `KRW-${sym.replace("KRW-", "")}`);

      if (upbitSymbols.length > 0) {
        const uniqueMarkets = Array.from(new Set(upbitSymbols)).join(",");
        const res = await fetch(`/api/upbit/public/ticker?markets=${encodeURIComponent(uniqueMarkets)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              const sym = item.market.replace("KRW-", "");
              const prev = this.quotes.get(sym);
              const { isVerified, metadata } = MarketDataIntegrityGate.verifyQuote({
                symbol: sym,
                price: typeof item.trade_price === "number" ? item.trade_price : null,
                market: "UPBIT",
                providerTimestamp: typeof item.trade_timestamp === "number" ? item.trade_timestamp : null,
                provider: "UPBIT",
                source: "UPBIT_PUBLIC_TICKER"
              });

              const providerTs = typeof item.trade_timestamp === "number" ? item.trade_timestamp : null;
              const ageMs = providerTs ? Math.max(0, Date.now() - providerTs) : null;
              const isFresh = ageMs !== null && ageMs <= 5000;

              const updated: LiveMarketQuote = {
                symbol: sym,
                name: prev?.name || sym,
                market: "UPBIT",
                price: typeof item.trade_price === "number" && item.trade_price > 0 ? item.trade_price : null,
                changeRate: typeof item.signed_change_rate === "number" ? +(item.signed_change_rate * 100).toFixed(2) : null,
                changeAmount: typeof item.signed_change_price === "number" ? item.signed_change_price : null,
                tradeValue: typeof item.acc_trade_price_24h === "number" ? Math.round(item.acc_trade_price_24h) : null,
                volume: typeof item.acc_trade_volume_24h === "number" ? item.acc_trade_volume_24h : null,
                marketCap: null,
                provider: "UPBIT",
                source: "UPBIT_PUBLIC_TICKER",
                exchange: "UPBIT",
                providerTimestamp: providerTs,
                receivedAt: Date.now(),
                ageMs,
                isVerified,
                trust: isVerified && isFresh ? "EXECUTION_GRADE" : "ANALYSIS_ONLY",
                status: isVerified && isFresh ? "LIVE" : "STALE"
              };
              this.quotes.set(sym, updated);
              this.quotes.set(`KRW-${sym}`, updated);
            });

            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("upbit_ticker_update", { detail: data }));
            }
          }
        }
      }
    } catch (e) {
      // Silently handle transient network glitches
    }

    // 2. Fetch live quotes for KRX (KOSPI & KOSDAQ) via Naver Finance Batch Polling API
    try {
      const krxSymbols = Array.from(this.registeredSymbols.entries())
        .filter(([sym, m]) => /^\d{6}$/.test(sym) && (m === "KOSPI" || m === "KOSDAQ"))
        .map(([sym]) => sym);

      const defaultKrxCodes = ["005930", "000660", "005380", "000270", "035420", "035720", "068270", "005490", "373220", "006400", "012450", "277810", "034020", "080220", "064350", "042700", "247540", "086520"];
      const allKrxCodes = Array.from(new Set([...krxSymbols, ...defaultKrxCodes]));

      const chunkSize = 30;
      for (let i = 0; i < allKrxCodes.length; i += chunkSize) {
        const chunk = allKrxCodes.slice(i, i + chunkSize);
        const codeParam = chunk.join(",");
        const pollRes = await fetch(`/api/market/naver-batch?codes=${encodeURIComponent(codeParam)}`);

        if (pollRes.ok) {
          const pollData = await pollRes.json() as any;
          const items = pollData?.datas;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const code = item.itemCode;
              if (code && (item.closePrice || item.closePriceRaw)) {
                const rawP = String(item.closePriceRaw || item.closePrice || "").replace(/,/g, '');
                const priceNum = parseFloat(rawP);
                if (!isNaN(priceNum) && priceNum > 0) {
                  const rawChange = String(item.compareToPreviousClosePriceRaw || item.compareToPreviousClosePrice || "").replace(/,/g, '');
                  const changeNum = parseFloat(rawChange);
                  const rawRatio = String(item.fluctuationsRatioRaw || item.fluctuationsRatio || "").replace(/,/g, '');
                  const ratioNum = parseFloat(rawRatio);
                  const isDown = item.compareToPreviousPrice?.code === "5" || item.compareToPreviousPrice?.name === "FALLING";
                  const prev = this.quotes.get(code);

                  const mappedMarket: "KOSPI" | "KOSDAQ" = item.stockExchangeType?.nameKor === "코스닥" ? "KOSDAQ" : "KOSPI";

                  const { isVerified } = MarketDataIntegrityGate.verifyQuote({
                    symbol: code,
                    price: priceNum,
                    market: mappedMarket,
                    provider: "NAVER_POLLING",
                    source: "NAVER_BATCH_POLLING"
                  });

                  const rawVol = String(item.accumulatedTradingVolume || "").replace(/,/g, '');
                  const volNum = parseFloat(rawVol);
                  const rawVal = String(item.accumulatedTradingValue || "").replace(/,/g, '');
                  const valNum = parseFloat(rawVal);
                  const rawCap = String(item.marketValueFull || item.marketValue || "").replace(/,/g, '');
                  const capNum = parseFloat(rawCap);

                  const updated: LiveMarketQuote = {
                    symbol: code,
                    name: item.stockName || prev?.name || code,
                    market: mappedMarket,
                    price: priceNum,
                    changeRate: !isNaN(ratioNum) ? (isDown ? -Math.abs(ratioNum) : Math.abs(ratioNum)) : null,
                    changeAmount: !isNaN(changeNum) ? (isDown ? -Math.abs(changeNum) : Math.abs(changeNum)) : null,
                    tradeValue: !isNaN(valNum) && valNum > 0 ? valNum : null,
                    volume: !isNaN(volNum) && volNum > 0 ? volNum : null,
                    marketCap: !isNaN(capNum) && capNum > 0 ? capNum : null,
                    provider: "NAVER_POLLING",
                    source: "NAVER_BATCH_POLLING",
                    exchange: mappedMarket,
                    providerTimestamp: null,
                    receivedAt: Date.now(),
                    ageMs: null,
                    isVerified,
                    trust: "DISPLAY_ONLY",
                    status: isVerified ? "LIVE" : "STALE"
                  };
                  this.quotes.set(code, updated);
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn("[RealtimeFeed] Naver batch polling fetch error:", e);
    }

    // 3. Query Backend `/api/stocks` for US & Other Stocks
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const stocks = await res.json();
        if (Array.isArray(stocks)) {
          stocks.forEach((s: any) => {
            if (s.symbol && typeof s.price === "number" && s.price > 0) {
              const prev = this.quotes.get(s.symbol);
              const mappedMarket: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" =
                s.market === "US" ? "US" : (s.market === "UPBIT" || s.market === "BTC") ? "UPBIT" : (s.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI");

              const { isVerified } = MarketDataIntegrityGate.verifyQuote({
                symbol: s.symbol,
                price: s.price,
                market: mappedMarket,
                provider: mappedMarket === "US" ? "YAHOO_FINANCE" : "SYSTEM_HUB",
                source: "API_STOCKS"
              });

              const updated: LiveMarketQuote = {
                symbol: s.symbol,
                name: s.name || prev?.name || s.symbol,
                market: mappedMarket,
                price: s.price,
                changeRate: typeof s.changePct === "number" ? s.changePct : null,
                changeAmount: typeof s.change === "number" ? s.change : null,
                tradeValue: typeof s.tradeValue === "number" ? s.tradeValue : null,
                volume: typeof s.volume === "number" ? s.volume : null,
                marketCap: typeof s.marketCap === "number" ? s.marketCap : null,
                provider: mappedMarket === "US" ? "YAHOO_FINANCE" : "SYSTEM_HUB",
                source: "API_STOCKS",
                exchange: mappedMarket,
                providerTimestamp: typeof s.timestamp === "number" ? s.timestamp : null,
                receivedAt: Date.now(),
                ageMs: null,
                isVerified,
                trust: "ANALYSIS_ONLY",
                status: isVerified ? "LIVE" : "STALE"
              };
              this.quotes.set(s.symbol, updated);
            }
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("stock_ticker_update", { detail: stocks }));
          }
        }
      }
    } catch (e) {
      console.warn("[RealtimeFeed] Real API stocks fetch error:", e);
    }

    this.notifySubscribers();
  }

  public getQuote(symbol: any): LiveMarketQuote | undefined {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return undefined;
    return this.quotes.get(cleanSym);
  }

  public getAllQuotes(): LiveMarketQuote[] {
    return Array.from(this.quotes.values());
  }

  public subscribe(callback: (quotes: Map<string, LiveMarketQuote>) => void): () => void {
    this.subscribers.add(callback);
    setTimeout(() => {
      if (this.subscribers.has(callback)) {
        try {
          callback(this.quotes);
        } catch (e) {
          console.error("Error in realtimeMarketFeedService initial callback:", e);
        }
      }
    }, 0);
    this.start();
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.quotes);
      } catch (err) {
        console.error("Error in realtimeMarketFeedService subscriber:", err);
      }
    });
  }
}

export const realtimeMarketFeedService = new RealtimeMarketFeedService();
