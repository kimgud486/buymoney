import { realtimeMarketFeedService, type LiveMarketQuote } from "../../src/services/realtimeMarketFeedService";
import type { ServerMarketQuoteV20 } from "./ServerRealtimeMarketHubV20";

const originalGetQuote = realtimeMarketFeedService.getQuote.bind(realtimeMarketFeedService);
const serverQuotes = new Map<string, ServerMarketQuoteV20>();
let installed = false;

function keysFor(symbol: string): string[] {
  const clean = String(symbol || "").trim().toUpperCase();
  if (!clean) return [];
  const keys = [clean];
  if (clean.startsWith("KRW-")) keys.push(clean.replace("KRW-", ""));
  else if (/^[A-Z0-9-]+$/.test(clean)) keys.push(`KRW-${clean}`);
  return Array.from(new Set(keys));
}

function toLiveMarketQuote(quote: ServerMarketQuoteV20): LiveMarketQuote | undefined {
  const ageMs = Math.max(0, Date.now() - quote.updatedAt);
  if (!(quote.price > 0)) return undefined;

  const market: LiveMarketQuote["market"] = quote.market === "UPBIT"
    ? "UPBIT"
    : quote.market === "US"
      ? "US"
      : "KOSPI";
  const executionGrade = quote.grade === "EXECUTION_GRADE" && ageMs <= 5_000;

  return {
    symbol: quote.symbol,
    name: quote.name,
    market,
    price: quote.price,
    changeRate: Number.isFinite(quote.changePct) ? quote.changePct : null,
    changeAmount: Number.isFinite(quote.changeAmount) ? quote.changeAmount : null,
    volume: Number.isFinite(quote.volume) && quote.volume > 0 ? quote.volume : null,
    tradeValue: Number.isFinite(quote.tradeValue) && quote.tradeValue > 0 ? quote.tradeValue : null,
    marketCap: null,
    provider: quote.source,
    source: "SERVER_REALTIME_MARKET_HUB_V20",
    exchange: quote.market,
    providerTimestamp: quote.updatedAt,
    receivedAt: quote.updatedAt,
    ageMs,
    isVerified: executionGrade,
    trust: executionGrade ? "EXECUTION_GRADE" : "DISPLAY_ONLY",
    status: executionGrade ? "LIVE" : "STALE",
  };
}

function installBridge(): void {
  if (installed) return;
  installed = true;
  const service = realtimeMarketFeedService as typeof realtimeMarketFeedService & {
    getQuote: (symbol: any) => LiveMarketQuote | undefined;
  };
  service.getQuote = (symbol: any): LiveMarketQuote | undefined => {
    const clean = String(symbol || "").trim().toUpperCase();
    for (const key of keysFor(clean)) {
      const serverQuote = serverQuotes.get(key);
      if (serverQuote) {
        const live = toLiveMarketQuote(serverQuote);
        if (live?.status === "LIVE") return live;
      }
    }
    return originalGetQuote(symbol);
  };
}

export function publishServerQuoteToScannerV20(quote: ServerMarketQuoteV20): void {
  installBridge();
  for (const key of keysFor(quote.symbol)) serverQuotes.set(key, quote);
}

export function getServerQuoteBridgeSizeV20(): number {
  return serverQuotes.size;
}

installBridge();
