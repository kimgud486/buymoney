import { PersistentOrderJournalV20, type JournalOrderEntry } from "../../src/execution/PersistentOrderJournalV20";
import { livePositionRuntimeService, type LivePositionRuntimeService } from "../../src/trading/LivePositionRuntimeService";

export interface VerifiedQuoteV20 {
  symbol: string;
  price: number;
  verified: boolean;
  asOf: number;
}

export interface DailyPnLPositionV20 {
  symbol: string;
  positionId: string;
  qty: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPct: number;
}

export interface DailyPnLSnapshotV20 {
  asOf: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  winningPositions: number;
  losingPositions: number;
  flatPositions: number;
  missingQuotes: string[];
  positions: DailyPnLPositionV20[];
}

function localDayStart(nowMs: number): number {
  const date = new Date(nowMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function weightedAverage(entries: JournalOrderEntry[]): number | null {
  let qty = 0;
  let notional = 0;
  for (const entry of entries) {
    const filled = Math.max(0, Number(entry.filledQuantity) || 0);
    const price = Number(entry.averageFillPrice ?? entry.price);
    if (filled <= 0 || !Number.isFinite(price) || price <= 0) continue;
    qty += filled;
    notional += filled * price;
  }
  return qty > 0 ? notional / qty : null;
}

export class DailyPnLMonitorV20 {
  constructor(
    private readonly journal: PersistentOrderJournalV20 = new PersistentOrderJournalV20(),
    private readonly runtime: LivePositionRuntimeService = livePositionRuntimeService,
  ) {}

  public snapshot(
    quotes: VerifiedQuoteV20[],
    options: { nowMs?: number; maxQuoteAgeMs?: number } = {}
  ): DailyPnLSnapshotV20 {
    const nowMs = options.nowMs ?? Date.now();
    const maxQuoteAgeMs = options.maxQuoteAgeMs ?? 30_000;
    const dayStart = localDayStart(nowMs);
    const allOrders = this.journal.getAllOrders();

    // Realized amount is derived only from broker-filled SELL quantities updated today.
    // Cost basis comes from verified BUY fills for the same durable positionId.
    let realizedPnL = 0;
    const sellsToday = allOrders.filter((entry) =>
      entry.side === "SELL" &&
      Number(entry.filledQuantity) > 0 &&
      entry.updatedAt >= dayStart &&
      entry.updatedAt <= nowMs &&
      Boolean(entry.positionId)
    );

    for (const sell of sellsToday) {
      const buys = allOrders.filter((entry) =>
        entry.side === "BUY" &&
        entry.positionId === sell.positionId &&
        Number(entry.filledQuantity) > 0
      );
      const avgEntry = weightedAverage(buys);
      const avgExit = Number(sell.averageFillPrice ?? sell.price);
      const qty = Math.max(0, Number(sell.filledQuantity) || 0);
      if (avgEntry && Number.isFinite(avgExit) && avgExit > 0 && qty > 0) {
        realizedPnL += (avgExit - avgEntry) * qty;
      }
    }

    const quoteMap = new Map<string, VerifiedQuoteV20>();
    for (const quote of quotes || []) {
      const symbol = String(quote?.symbol || "").trim().toUpperCase();
      const age = nowMs - Number(quote?.asOf || 0);
      if (!symbol || !quote.verified || !Number.isFinite(quote.price) || quote.price <= 0) continue;
      if (!Number.isFinite(age) || age < -60_000 || age > maxQuoteAgeMs) continue;
      quoteMap.set(symbol, quote);
    }

    let unrealizedPnL = 0;
    let winningPositions = 0;
    let losingPositions = 0;
    let flatPositions = 0;
    const missingQuotes: string[] = [];
    const positions: DailyPnLPositionV20[] = [];

    for (const position of this.runtime.getAllPositions().filter((p) => p.state !== "CLOSED")) {
      const symbol = String(position.symbol || "").trim().toUpperCase();
      const quote = quoteMap.get(symbol);
      const qty = Math.max(0, Number(position.quantities.currentPositionQty) || 0);
      const entryPrice = Number(position.entryPrice);
      if (!quote) {
        missingQuotes.push(symbol);
        continue;
      }
      if (!Number.isFinite(entryPrice) || entryPrice <= 0 || qty <= 0) continue;

      const pnl = (quote.price - entryPrice) * qty;
      const pct = ((quote.price - entryPrice) / entryPrice) * 100;
      unrealizedPnL += pnl;
      if (pnl > 0) winningPositions++;
      else if (pnl < 0) losingPositions++;
      else flatPositions++;

      positions.push({
        symbol,
        positionId: position.positionId,
        qty,
        entryPrice,
        currentPrice: quote.price,
        unrealizedPnL: pnl,
        unrealizedPct: pct,
      });
    }

    return {
      asOf: nowMs,
      realizedPnL,
      unrealizedPnL,
      totalPnL: realizedPnL + unrealizedPnL,
      winningPositions,
      losingPositions,
      flatPositions,
      missingQuotes: Array.from(new Set(missingQuotes)),
      positions,
    };
  }
}

export const dailyPnLMonitorV20 = new DailyPnLMonitorV20();
