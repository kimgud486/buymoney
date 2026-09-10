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
  private notifyScheduled = false;
  private streamBound = false;
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
    this.bindRealtimeStream();
  }

  private bindRealtimeStream() {
    if (this.streamBound || typeof window === "undefined") return;
    this.streamBound = true;
    import("./RealtimeMarketStreamManager")
      .then(({ realtimeMarketStreamManager }) => {
        realtimeMarketStreamManager.subscribeTick((tick) => {
          this.ingestRealtimeTick(tick);
        });
      })
      .catch((error) => {
        this.streamBound = false;
        console.warn("[RealtimeFeed] WebSocket tick bridge unavailable, polling fallback remains active", error);
      });
  }

  private ingestRealtimeTick(tick: any) {
    if (!this.isFeedEnabled || !tick) return;
    const cleanSym = safeSymbolStr(tick.symbol || tick.code || "").toUpperCase().replace(/^KRW-/, "");
    const price = Number(tick.price);
    if (!cleanSym || !Number.isFinite(price) || price <= 0) return;

    const market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" =
      tick.market === "UPBIT" ? "UPBIT" : tick.market === "US" ? "US" :
      (this.registeredSymbols.get(cleanSym) === "KOSDAQ" ? "KOSDAQ" : "KOSPI");
    const provider = tick.feedSource === "KIS_REALTIME_WS" ? "KIS" : tick.feedSource === "UPBIT_WS" ? "UPBIT" : "SYSTEM_HUB";
    const providerTs = Number.isFinite(Number(tick.timestamp)) ? Number(tick.timestamp) : null;
    const ageMs = providerTs == null ? null : Math.max(0, Date.now() - providerTs);
    const { isVerified } = MarketDataIntegrityGate.verifyQuote({
      symbol: cleanSym,
      price,
      volume: Number(tick.accumulatedVolume ?? tick.volume ?? 0),
      market,
      providerTimestamp: providerTs,
      provider,
      source: String(tick.feedSource || "REALTIME_STREAM")
    });
    const directExecutionStream = tick.feedSource === "KIS_REALTIME_WS" || tick.feedSource === "UPBIT_WS";
    const executionGrade = Boolean(isVerified && directExecutionStream && ageMs != null && ageMs <= 5_000);
    const prev = this.quotes.get(cleanSym);
    const quote: LiveMarketQuote = {
      symbol: cleanSym,
      name: String(tick.name || prev?.name || cleanSym),
      market,
      price,
      changeRate: Number.isFinite(Number(tick.changePct)) ? Number(tick.changePct) : prev?.changeRate ?? null,
      changeAmount: Number.isFinite(Number(tick.change)) ? Number(tick.change) : prev?.changeAmount ?? null,
      volume: Number.isFinite(Number(tick.accumulatedVolume ?? tick.volume)) ? Number(tick.accumulatedVolume ?? tick.volume) : prev?.volume ?? null,
      tradeValue: Number.isFinite(Number(tick.accumulatedAmount)) ? Number(tick.accumulatedAmount) : prev?.tradeValue ?? null,
      marketCap: prev?.marketCap ?? null,
      provider,
      source: String(tick.feedSource || "REALTIME_STREAM"),
      exchange: market === "UPBIT" ? "UPBIT" : prev?.exchange ?? market,
      providerTimestamp: providerTs,
      receivedAt: Date.now(),
      ageMs,
      isVerified,
      trust: executionGrade ? "EXECUTION_GRADE" : isVerified ? "ANALYSIS_ONLY" : "NO_DATA",
      status: isVerified && ageMs != null && ageMs <= 5_000 ? "LIVE" : "STALE"
    };
    this.quotes.set(cleanSym, quote);
    if (market === "UPBIT") this.quotes.set(`KRW-${cleanSym}`, quote);
    this.scheduleNotifySubscribers();
  }

  private scheduleNotifySubscribers() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    const flush = () => {
      this.notifyScheduled = false;
      this.notifySubscribers();
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(flush);
    } else {
      setTimeout(flush, 16);
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
      this.bindRealtimeStream();
      this.start();
    } else {
      this.stop();
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("realtime_feed_status_change", { detail: { isFeedActive: newState } }));
    }
    return this.isFeedEnabled;
  }

  public registerSymbol(symbol: any, market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US") {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return;
    if (!this.registeredSymbols.has(cleanSym)) {
      const determinedMarket: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" =
        market ||
        (cleanSym === "BTC" || cleanSym === "ETH" || cleanSym === "SOL" || cleanSym === "XRP" || cleanSym === "DOGE" ? "UPBIT" : /^[A-Z]{1,5}$/.test(cleanSym) ? "US" : "KOSPI");
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
    if (count > 0 && this.isPolling) this.fetchRealQuotes();
  }

  public start() {
    if (!this.isFeedEnabled || this.isPolling) return;
    this.bindRealtimeStream();
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
              const { isVerified } = MarketDataIntegrityGate.verifyQuote({
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
            if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("upbit_ticker_update", { detail: data }));
          }
        }
      }
    } catch (e) {}

    try {
      const krxSymbols = Array.from(this.registeredSymbols.entries())
        .filter(([sym, m]) => /^\d{6}$/.test(sym) && (m === "KOSPI" || m === "KOSDAQ"))
        .map(([sym]) => sym);
      const defaultKrxCodes = ["005930", "000660", "005380", "000270", "035420", "035720", "068270", "005490", "373220", "006400", "012450", "277810", "034020", "080220", "064350", "042700", "247540", "086520"];
      const allKrxCodes = Array.from(new Set([...krxSymbols, ...defaultKrxCodes]));
      const chunkSize = 30;
      for (let i = 0; i < allKrxCodes.length; i += chunkSize) {
        const chunk = allKrxCodes.slice(i, i + chunkSize);
        const pollRes = await fetch(`/api/market/naver-batch?codes=${encodeURIComponent(chunk.join(","))}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json() as any;
          const items = pollData?.datas;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const code = item.itemCode;
              if (!code || !(item.closePrice || item.closePriceRaw)) return;
              const priceNum = parseFloat(String(item.closePriceRaw || item.closePrice || "").replace(/,/g, ""));
              if (!Number.isFinite(priceNum) || priceNum <= 0) return;
              const changeNum = parseFloat(String(item.compareToPreviousClosePriceRaw || item.compareToPreviousClosePrice || "").replace(/,/g, ""));
              const ratioNum = parseFloat(String(item.fluctuationsRatioRaw || item.fluctuationsRatio || "").replace(/,/g, ""));
              const isDown = item.compareToPreviousPrice?.code === "5" || item.compareToPreviousPrice?.name === "FALLING";
              const prev = this.quotes.get(code);
              const mappedMarket: "KOSPI" | "KOSDAQ" = item.stockExchangeType?.nameKor === "코스닥" ? "KOSDAQ" : "KOSPI";
              const { isVerified } = MarketDataIntegrityGate.verifyQuote({ symbol: code, price: priceNum, market: mappedMarket, provider: "NAVER_POLLING", source: "NAVER_BATCH_POLLING" });
              const volNum = parseFloat(String(item.accumulatedTradingVolume || "").replace(/,/g, ""));
              const valNum = parseFloat(String(item.accumulatedTradingValue || "").replace(/,/g, ""));
              const capNum = parseFloat(String(item.marketValueFull || item.marketValue || "").replace(/,/g, ""));
              const updated: LiveMarketQuote = {
                symbol: code,
                name: item.stockName || prev?.name || code,
                market: mappedMarket,
                price: priceNum,
                changeRate: Number.isFinite(ratioNum) ? (isDown ? -Math.abs(ratioNum) : Math.abs(ratioNum)) : null,
                changeAmount: Number.isFinite(changeNum) ? (isDown ? -Math.abs(changeNum) : Math.abs(changeNum)) : null,
                tradeValue: Number.isFinite(valNum) && valNum > 0 ? valNum : null,
                volume: Number.isFinite(volNum) && volNum > 0 ? volNum : null,
                marketCap: Number.isFinite(capNum) && capNum > 0 ? capNum : null,
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
            });
          }
        }
      }
    } catch (e) {
      console.warn("[RealtimeFeed] Naver batch polling fetch error:", e);
    }

    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const stocks = await res.json();
        if (Array.isArray(stocks)) {
          stocks.forEach((s: any) => {
            if (!s.symbol || typeof s.price !== "number" || s.price <= 0) return;
            const prev = this.quotes.get(s.symbol);
            const mappedMarket: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" = s.market === "US" ? "US" : (s.market === "UPBIT" || s.market === "BTC") ? "UPBIT" : s.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI";
            const { isVerified } = MarketDataIntegrityGate.verifyQuote({ symbol: s.symbol, price: s.price, market: mappedMarket, provider: mappedMarket === "US" ? "YAHOO_FINANCE" : "SYSTEM_HUB", source: "API_STOCKS" });
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
          });
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("stock_ticker_update", { detail: stocks }));
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
        try { callback(this.quotes); } catch (e) { console.error("Error in realtimeMarketFeedService initial callback:", e); }
      }
    }, 0);
    this.start();
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) this.stop();
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try { cb(this.quotes); } catch (err) { console.error("Error in realtimeMarketFeedService subscriber:", err); }
    });
  }
}

export const realtimeMarketFeedService = new RealtimeMarketFeedService();