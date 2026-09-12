// ----------------------------------------------------------------------
// REAL-TIME LIVE MARKET FEED & REAL QUOTES SERVICE (KRX & UPBIT & US)
// Zero synthetic prices. WebSocket ticks are preferred; 1s polling is fallback.
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

function parseOptionalMarketNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function requireLiveData(quote: LiveMarketQuote | undefined): boolean {
  if (!quote) return false;
  if (quote.status !== "LIVE" || !quote.isVerified) return false;
  if (quote.trust !== "EXECUTION_GRADE") return false;
  if (quote.ageMs == null || quote.ageMs > 5_000) return false;
  if (quote.price == null || quote.price <= 0) return false;
  return true;
}

export interface StreamTickInput {
  symbol: string;
  name?: string;
  market?: "KOREA" | "KOSPI" | "KOSDAQ" | "UPBIT" | "US";
  price: number;
  change?: number;
  changePct?: number;
  volume?: number;
  accumulatedVolume?: number;
  accumulatedAmount?: number;
  timestamp?: number;
  providerTimestamp?: number;
  receivedAt?: number;
  feedSource?: string;
  source?: string;
}

class RealtimeMarketFeedService {
  private quotes: Map<string, LiveMarketQuote> = new Map();
  private registeredSymbols: Map<string, "KOSPI" | "KOSDAQ" | "UPBIT" | "US"> = new Map();
  private subscribers: Set<(quotes: Map<string, LiveMarketQuote>) => void> = new Set();
  private isPolling = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isFeedEnabled = true;
  private fetchInFlight = false;

  constructor() {
    try {
      const savedFeedState = localStorage.getItem("aistock_realtime_feed_active");
      if (savedFeedState !== null) this.isFeedEnabled = savedFeedState === "true";
    } catch {
      this.isFeedEnabled = true;
    }
  }

  public isFeedActive(): boolean {
    return this.isFeedEnabled;
  }

  public toggleFeed(targetState?: boolean): boolean {
    const next = targetState !== undefined ? targetState : !this.isFeedEnabled;
    this.isFeedEnabled = next;
    try {
      localStorage.setItem("aistock_realtime_feed_active", String(next));
    } catch {}

    if (next) this.start();
    else this.stop();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("realtime_feed_status_change", { detail: { isFeedActive: next } }));
    }
    return next;
  }

  private inferMarket(symbol: string): "KOSPI" | "KOSDAQ" | "UPBIT" | "US" {
    const clean = symbol.toUpperCase();
    if (clean.startsWith("KRW-")) return "UPBIT";
    if (["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "KAT"].includes(clean)) return "UPBIT";
    if (/^\d{6}$/.test(clean)) return "KOSPI";
    return "US";
  }

  public registerSymbol(symbol: any, market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US") {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return;

    const determinedMarket = market || this.inferMarket(cleanSym);
    const wasNew = !this.registeredSymbols.has(cleanSym);
    this.registeredSymbols.set(cleanSym, determinedMarket);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("realtime_symbol_registered", {
        detail: { symbol: cleanSym, market: determinedMarket }
      }));
    }

    if (wasNew) void this.fetchRealQuotes();
  }

  public registerSymbols(symbols: Array<{ symbol: string; market?: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" }>) {
    symbols.forEach((item) => this.registerSymbol(item.symbol, item.market));
  }

  public start() {
    if (!this.isFeedEnabled || this.isPolling) return;
    this.isPolling = true;
    void this.fetchRealQuotes();
    this.pollTimer = setInterval(() => {
      if (!this.isFeedEnabled) {
        this.stop();
        return;
      }
      void this.fetchRealQuotes();
    }, 1000);
  }

  public stop() {
    this.isPolling = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  /**
   * Immediate bridge for authenticated KIS / Upbit / backend WebSocket ticks.
   * This path updates subscribers without waiting for the 1-second REST fallback.
   */
  public ingestStreamTick(tick: StreamTickInput): void {
    const rawSymbol = safeSymbolStr(tick.symbol).toUpperCase();
    if (!rawSymbol || !Number.isFinite(tick.price) || tick.price <= 0) return;

    const isUpbit = tick.market === "UPBIT" || rawSymbol.startsWith("KRW-") || String(tick.feedSource || tick.source || "").includes("UPBIT");
    const cleanSymbol = isUpbit ? rawSymbol.replace(/^KRW-/, "") : rawSymbol;
    const market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" = isUpbit
      ? "UPBIT"
      : tick.market === "US"
      ? "US"
      : tick.market === "KOSDAQ"
      ? "KOSDAQ"
      : "KOSPI";

    const source = tick.feedSource || tick.source || "SERVER_STREAM";
    const provider = source.includes("KIS") ? "KIS" : source.includes("UPBIT") ? "UPBIT" : "SYSTEM_HUB";
    const providerTimestamp = parseOptionalTimestamp(tick.providerTimestamp ?? tick.timestamp);
    const receivedAt = parseOptionalTimestamp(tick.receivedAt) ?? Date.now();
    const ageMs = providerTimestamp == null ? null : Math.max(0, receivedAt - providerTimestamp);

    const { isVerified } = MarketDataIntegrityGate.verifyQuote({
      symbol: cleanSymbol,
      price: tick.price,
      volume: tick.accumulatedVolume ?? tick.volume,
      market,
      providerTimestamp,
      provider,
      source
    });

    const executionGradeSource = source === "KIS_REALTIME_WS" || source === "UPBIT_WS" || source === "US_BROKER_WS";
    const fresh = ageMs != null && ageMs <= 5000;
    const prev = this.quotes.get(rawSymbol) || this.quotes.get(cleanSymbol);

    const updated: LiveMarketQuote = {
      symbol: cleanSymbol,
      name: tick.name || prev?.name || cleanSymbol,
      market,
      price: tick.price,
      changeRate: Number.isFinite(tick.changePct) ? Number(tick.changePct) : prev?.changeRate ?? null,
      changeAmount: Number.isFinite(tick.change) ? Number(tick.change) : prev?.changeAmount ?? null,
      volume: Number.isFinite(tick.accumulatedVolume) ? Number(tick.accumulatedVolume) : Number.isFinite(tick.volume) ? Number(tick.volume) : prev?.volume ?? null,
      tradeValue: Number.isFinite(tick.accumulatedAmount) ? Number(tick.accumulatedAmount) : prev?.tradeValue ?? null,
      marketCap: prev?.marketCap ?? null,
      provider,
      source,
      exchange: market,
      providerTimestamp,
      receivedAt,
      ageMs,
      isVerified,
      trust: isVerified && fresh && executionGradeSource ? "EXECUTION_GRADE" : isVerified ? "ANALYSIS_ONLY" : "NO_DATA",
      status: isVerified && fresh ? "LIVE" : providerTimestamp == null ? "UNAVAILABLE" : "STALE"
    };

    this.quotes.set(cleanSymbol, updated);
    if (isUpbit) this.quotes.set(`KRW-${cleanSymbol}`, updated);
    this.notifySubscribers();
  }

  private async fetchRealQuotes() {
    if (this.fetchInFlight) return;
    this.fetchInFlight = true;
    try {
      await Promise.allSettled([
        this.fetchUpbitQuotes(),
        this.fetchKrxQuotes(),
        this.fetchSystemStocks()
      ]);
      this.notifySubscribers();
    } finally {
      this.fetchInFlight = false;
    }
  }

  private async fetchUpbitQuotes() {
    const upbitSymbols = Array.from(this.registeredSymbols.entries())
      .filter(([_, m]) => m === "UPBIT")
      .map(([sym]) => `KRW-${sym.replace(/^KRW-/, "")}`);
    if (upbitSymbols.length === 0) return;

    const markets = Array.from(new Set(upbitSymbols)).join(",");
    try {
      const res = await fetch(`/api/upbit/public/ticker?markets=${encodeURIComponent(markets)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;

      data.forEach((item: any) => {
        const full = String(item.market || "").toUpperCase();
        const sym = full.replace(/^KRW-/, "");
        const price = parseOptionalMarketNumber(item.trade_price);
        if (!sym || price == null || price <= 0) return;

        const providerTimestamp = parseOptionalTimestamp(item.trade_timestamp);
        const receivedAt = Date.now();
        const ageMs = providerTimestamp == null ? null : Math.max(0, receivedAt - providerTimestamp);
        const volume = parseOptionalMarketNumber(item.acc_trade_volume_24h);
        const { isVerified } = MarketDataIntegrityGate.verifyQuote({
          symbol: sym,
          price,
          volume: volume ?? undefined,
          market: "UPBIT",
          providerTimestamp,
          provider: "UPBIT",
          source: "UPBIT_PUBLIC_TICKER"
        });
        const prev = this.quotes.get(full) || this.quotes.get(sym);
        const updated: LiveMarketQuote = {
          symbol: sym,
          name: prev?.name || sym,
          market: "UPBIT",
          price,
          changeRate: parseOptionalMarketNumber(item.signed_change_rate) != null
            ? Number((Number(item.signed_change_rate) * 100).toFixed(2))
            : null,
          changeAmount: parseOptionalMarketNumber(item.signed_change_price),
          volume,
          tradeValue: parseOptionalMarketNumber(item.acc_trade_price_24h),
          marketCap: prev?.marketCap ?? null,
          provider: "UPBIT",
          source: "UPBIT_PUBLIC_TICKER",
          exchange: "UPBIT",
          providerTimestamp,
          receivedAt,
          ageMs,
          isVerified,
          trust: isVerified ? "ANALYSIS_ONLY" : "NO_DATA",
          status: isVerified && ageMs != null && ageMs <= 15000 ? "LIVE" : providerTimestamp == null ? "UNAVAILABLE" : "STALE"
        };
        this.quotes.set(sym, updated);
        this.quotes.set(full, updated);
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("upbit_ticker_update", { detail: data }));
      }
    } catch (error) {
      console.warn("[RealtimeFeed] Upbit ticker fetch error", error);
    }
  }

  private async fetchKrxQuotes() {
    const registered = Array.from(this.registeredSymbols.entries())
      .filter(([sym, m]) => /^\d{6}$/.test(sym) && (m === "KOSPI" || m === "KOSDAQ"))
      .map(([sym]) => sym);
    const codes = Array.from(new Set(registered));
    if (codes.length === 0) return;

    try {
      const res = await fetch(`/api/market/naver-batch?codes=${encodeURIComponent(codes.join(","))}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json();
      const items = payload?.datas;
      if (!Array.isArray(items)) return;

      items.forEach((item: any) => {
        const code = String(item.itemCode || "");
        const price = parseOptionalMarketNumber(item.closePriceRaw ?? item.closePrice);
        if (!/^\d{6}$/.test(code) || price == null || price <= 0) return;

        const market: "KOSPI" | "KOSDAQ" = item.stockExchangeType?.nameKor === "코스닥" ? "KOSDAQ" : "KOSPI";
        const ratio = parseOptionalMarketNumber(item.fluctuationsRatioRaw ?? item.fluctuationsRatio);
        const change = parseOptionalMarketNumber(item.compareToPreviousClosePriceRaw ?? item.compareToPreviousClosePrice);
        const isDown = item.compareToPreviousPrice?.code === "5" || item.compareToPreviousPrice?.name === "FALLING";
        const volume = parseOptionalMarketNumber(item.accumulatedTradingVolume);
        const tradeValue = parseOptionalMarketNumber(item.accumulatedTradingValue);
        const marketCap = parseOptionalMarketNumber(item.marketValueFull ?? item.marketValue);
        const providerTimestamp = parseOptionalTimestamp(item.providerTimestamp ?? item.tradeTimestamp ?? item.timestamp);
        const receivedAt = Date.now();
        const ageMs = providerTimestamp == null ? null : Math.max(0, receivedAt - providerTimestamp);
        const { isVerified } = MarketDataIntegrityGate.verifyQuote({
          symbol: code,
          price,
          volume: volume ?? undefined,
          market,
          providerTimestamp,
          provider: "NAVER_POLLING",
          source: "NAVER_BATCH_POLLING"
        });

        this.quotes.set(code, {
          symbol: code,
          name: item.stockName || this.quotes.get(code)?.name || code,
          market,
          price,
          changeRate: ratio == null ? null : (isDown ? -Math.abs(ratio) : Math.abs(ratio)),
          changeAmount: change == null ? null : (isDown ? -Math.abs(change) : Math.abs(change)),
          volume: volume != null && volume >= 0 ? volume : null,
          tradeValue: tradeValue != null && tradeValue >= 0 ? tradeValue : null,
          marketCap: marketCap != null && marketCap > 0 ? marketCap : null,
          provider: "NAVER_POLLING",
          source: "NAVER_BATCH_POLLING",
          exchange: market,
          providerTimestamp,
          receivedAt,
          ageMs,
          isVerified,
          trust: isVerified ? "DISPLAY_ONLY" : "NO_DATA",
          status: isVerified && ageMs != null ? "LIVE" : providerTimestamp == null ? "UNAVAILABLE" : "STALE"
        });
      });
    } catch (error) {
      console.warn("[RealtimeFeed] Naver batch polling fetch error", error);
    }
  }

  private async fetchSystemStocks() {
    try {
      const res = await fetch("/api/stocks", { cache: "no-store" });
      if (!res.ok) return;
      const stocks = await res.json();
      if (!Array.isArray(stocks)) return;

      stocks.forEach((s: any) => {
        const symbol = String(s.symbol || "").toUpperCase();
        const price = parseOptionalMarketNumber(s.price);
        if (!symbol || price == null || price <= 0) return;
        const market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US" = s.market === "US" ? "US" : s.market === "UPBIT" || s.market === "BTC" ? "UPBIT" : s.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI";
        const provider = market === "US" ? "YAHOO_FINANCE" : "SYSTEM_HUB";
        const providerTimestamp = parseOptionalTimestamp(s.timestamp);
        const receivedAt = Date.now();
        const ageMs = providerTimestamp == null ? null : Math.max(0, receivedAt - providerTimestamp);
        const volume = parseOptionalMarketNumber(s.volume);
        const { isVerified } = MarketDataIntegrityGate.verifyQuote({
          symbol,
          price,
          volume: volume ?? undefined,
          market,
          providerTimestamp,
          provider,
          source: "API_STOCKS"
        });

        const prev = this.quotes.get(symbol);
        this.quotes.set(symbol, {
          symbol,
          name: s.name || prev?.name || symbol,
          market,
          price,
          changeRate: parseOptionalMarketNumber(s.changePct),
          changeAmount: parseOptionalMarketNumber(s.change),
          volume,
          tradeValue: parseOptionalMarketNumber(s.tradeValue),
          marketCap: parseOptionalMarketNumber(s.marketCap),
          provider,
          source: "API_STOCKS",
          exchange: market,
          providerTimestamp,
          receivedAt,
          ageMs,
          isVerified,
          trust: isVerified ? "ANALYSIS_ONLY" : "NO_DATA",
          status: isVerified && ageMs != null && ageMs <= 60000 ? "LIVE" : providerTimestamp == null ? "UNAVAILABLE" : "STALE"
        });
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stock_ticker_update", { detail: stocks }));
      }
    } catch (error) {
      console.warn("[RealtimeFeed] /api/stocks fetch error", error);
    }
  }

  public getQuote(symbol: any): LiveMarketQuote | undefined {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return undefined;
    return this.quotes.get(cleanSym) || this.quotes.get(cleanSym.replace(/^KRW-/, ""));
  }

  public getAllQuotes(): LiveMarketQuote[] {
    return Array.from(this.quotes.values());
  }

  public subscribe(callback: (quotes: Map<string, LiveMarketQuote>) => void): () => void {
    this.subscribers.add(callback);
    queueMicrotask(() => {
      if (this.subscribers.has(callback)) callback(this.quotes);
    });
    this.start();
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) this.stop();
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.quotes);
      } catch (error) {
        console.error("[RealtimeFeed] subscriber error", error);
      }
    });
  }
}

export const realtimeMarketFeedService = new RealtimeMarketFeedService();
