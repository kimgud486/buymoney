import fs from "fs";
import path from "path";
import { ClosedTradeV20, VerifiedPerformanceGateV20, VerifiedPerformanceResultV20 } from "./VerifiedPerformanceGateV20";

export interface StrategyPerformanceKeyV20 {
  symbol?: string;
  setup: string;
  market?: string;
}

export interface RecordedClosedTradeV20 extends ClosedTradeV20 {
  id: string;
  setup: string;
  symbol?: string;
  market?: string;
  openedAt?: number;
  closedAt: number;
}

export class BuyHoldPerformanceStoreV20 {
  private readonly filePath: string;

  constructor(filePath = path.resolve(process.cwd(), "data", "buy-hold-performance-v20.json")) {
    this.filePath = filePath;
  }

  private readAll(): RecordedClosedTradeV20[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x) => Number.isFinite(x?.pnlPct) && typeof x?.setup === "string") : [];
    } catch {
      return [];
    }
  }

  private writeAll(trades: RecordedClosedTradeV20[]): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(trades, null, 2), "utf-8");
    fs.renameSync(temp, this.filePath);
  }

  public appendClosedTrade(trade: RecordedClosedTradeV20): void {
    if (!trade.id || !trade.setup || !Number.isFinite(trade.pnlPct) || !Number.isFinite(trade.closedAt)) {
      throw new Error("INVALID_CLOSED_TRADE");
    }
    const trades = this.readAll();
    if (trades.some((t) => t.id === trade.id)) return;
    trades.push(trade);
    this.writeAll(trades.slice(-5000));
  }

  public query(key: StrategyPerformanceKeyV20): RecordedClosedTradeV20[] {
    return this.readAll().filter((trade) => {
      if (trade.setup !== key.setup) return false;
      if (key.symbol && trade.symbol !== key.symbol) return false;
      if (key.market && trade.market !== key.market) return false;
      return true;
    });
  }

  public evaluate(key: StrategyPerformanceKeyV20): VerifiedPerformanceResultV20 {
    return VerifiedPerformanceGateV20.evaluate(this.query(key));
  }
}

export const buyHoldPerformanceStoreV20 = new BuyHoldPerformanceStoreV20();
