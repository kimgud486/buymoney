import type { ParsedExecutionNotice } from "./KISExecutionNoticeParserV20";
import { buyHoldPerformanceStoreV20 } from "./BuyHoldPerformanceStoreV20";

interface FillAccumulatorV20 {
  positionId: string;
  symbol: string;
  setup: string;
  buyQty: number;
  buyNotional: number;
  sellQty: number;
  sellNotional: number;
  openedAt?: number;
}

export interface BrokerFillPerformanceContextV20 {
  positionId: string;
  symbol: string;
  setup: string;
  runtimeEntryPrice?: number;
  runtimePositionQtyBeforeFill?: number;
  nextState: string;
}

function positive(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * Converts authoritative broker fills into one closed-trade performance record.
 * Partial exits are accumulated and never counted as separate wins.
 * No record is written until the runtime position reaches CLOSED.
 */
export class BrokerFillPerformanceRecorderV20 {
  private readonly fills = new Map<string, FillAccumulatorV20>();

  public onVerifiedFill(
    notice: ParsedExecutionNotice,
    context: BrokerFillPerformanceContextV20
  ): boolean {
    if (!notice?.isExecuted || !positive(notice.execQty) || !positive(notice.execPrice)) return false;
    if (!context.positionId || !context.symbol || !context.setup) return false;
    if (notice.symbol !== context.symbol) return false;

    const existing = this.fills.get(context.positionId) ?? {
      positionId: context.positionId,
      symbol: context.symbol,
      setup: context.setup,
      buyQty: 0,
      buyNotional: 0,
      sellQty: 0,
      sellNotional: 0,
      openedAt: undefined
    };

    if (notice.side === "BUY") {
      existing.buyQty += notice.execQty;
      existing.buyNotional += notice.execQty * notice.execPrice;
      existing.openedAt = existing.openedAt ?? notice.timestamp;
    } else {
      existing.sellQty += notice.execQty;
      existing.sellNotional += notice.execQty * notice.execPrice;
    }

    this.fills.set(context.positionId, existing);

    if (context.nextState !== "CLOSED" || existing.sellQty <= 0) return false;

    const averageEntry = existing.buyQty > 0
      ? existing.buyNotional / existing.buyQty
      : context.runtimeEntryPrice;
    const averageExit = existing.sellNotional / existing.sellQty;

    if (!positive(averageEntry) || !positive(averageExit)) {
      console.warn(`[BrokerFillPerformanceRecorderV20] Closed ${context.positionId} without verified entry/exit basis; performance not recorded.`);
      this.fills.delete(context.positionId);
      return false;
    }

    const pnlPct = ((averageExit - averageEntry) / averageEntry) * 100;
    buyHoldPerformanceStoreV20.appendClosedTrade({
      id: `broker-close:${context.positionId}:${notice.noticeId}`,
      setup: context.setup,
      symbol: context.symbol,
      openedAt: existing.openedAt,
      closedAt: notice.timestamp,
      pnlPct
    });

    this.fills.delete(context.positionId);
    console.log(`[BrokerFillPerformanceRecorderV20] Recorded verified closed trade`, {
      positionId: context.positionId,
      symbol: context.symbol,
      setup: context.setup,
      pnlPct: Number(pnlPct.toFixed(4)),
      sellQty: existing.sellQty
    });
    return true;
  }

  public clear(positionId?: string): void {
    if (positionId) this.fills.delete(positionId);
    else this.fills.clear();
  }
}

export const brokerFillPerformanceRecorderV20 = new BrokerFillPerformanceRecorderV20();
