import { DataGradeV20 } from "./KISOverseasParserV20";

export interface DomesticTradeTickV204 {
  symbol: string;
  market: "KOREA";
  tradeTime: string;
  businessDate: string;
  lastPrice: number;
  changeAmount: number;
  ratePct: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  askPrice: number;
  bidPrice: number;
  executedVolume: number;
  totalVolume: number;
  totalAmount: number;
  executionStrength: number;
  tradingHalted: boolean;
  timestamp: number;
  grade: DataGradeV20;
  rawPayload: string;
}

const FIELD_COUNT = 46;

function num(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseKstTimestamp(businessDate: string, tradeTime: string): number {
  if (!/^\d{8}$/.test(businessDate) || !/^\d{6}$/.test(tradeTime)) {
    return Date.now();
  }

  const y = businessDate.slice(0, 4);
  const m = businessDate.slice(4, 6);
  const d = businessDate.slice(6, 8);
  const hh = tradeTime.slice(0, 2);
  const mm = tradeTime.slice(2, 4);
  const ss = tradeTime.slice(4, 6);
  const parsed = Date.parse(`${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/**
 * KIS H0STCNT0 official realtime domestic trade mapping.
 * Field order is based on KIS Open Trading API's official WebSocket sample:
 * symbol=0, time=1, price=2, change=4, rate=5, open=7, high=8, low=9,
 * ask1=10, bid1=11, executionVolume=12, cumulativeVolume=13,
 * cumulativeAmount=14, executionStrength=18, businessDate=33, halt=35.
 */
export class KISDomesticParserV204 {
  public static parseH0STCNT0(
    rawMessage: string,
    dataCount: number = 1,
    executionGrade: boolean = true,
  ): DomesticTradeTickV204[] {
    if (!rawMessage || !rawMessage.includes("^")) return [];

    const fields = rawMessage.split("^");
    const count = Math.max(1, Math.floor(dataCount));
    const result: DomesticTradeTickV204[] = [];

    for (let recordIndex = 0; recordIndex < count; recordIndex += 1) {
      const offset = recordIndex * FIELD_COUNT;
      if (fields.length < offset + FIELD_COUNT) break;

      const row = fields.slice(offset, offset + FIELD_COUNT);
      const symbol = (row[0] || "").trim().toUpperCase();
      const tradeTime = (row[1] || "").trim();
      const businessDate = (row[33] || "").trim();
      const lastPrice = num(row[2]);
      const executedVolume = num(row[12]);
      const totalVolume = num(row[13]);
      const totalAmount = num(row[14]);

      if (
        !symbol ||
        !Number.isFinite(lastPrice) ||
        lastPrice <= 0 ||
        !Number.isFinite(executedVolume) ||
        executedVolume < 0 ||
        !Number.isFinite(totalVolume) ||
        totalVolume < 0 ||
        !Number.isFinite(totalAmount) ||
        totalAmount < 0
      ) {
        continue;
      }

      result.push({
        symbol,
        market: "KOREA",
        tradeTime,
        businessDate,
        lastPrice,
        changeAmount: num(row[4]),
        ratePct: num(row[5]),
        openPrice: num(row[7]),
        highPrice: num(row[8]),
        lowPrice: num(row[9]),
        askPrice: num(row[10]),
        bidPrice: num(row[11]),
        executedVolume,
        totalVolume,
        totalAmount,
        executionStrength: num(row[18]),
        tradingHalted: (row[35] || "").trim() === "Y",
        timestamp: parseKstTimestamp(businessDate, tradeTime),
        grade: executionGrade ? "EXECUTION_GRADE" : "ANALYSIS_ONLY",
        rawPayload: row.join("^"),
      });
    }

    return result;
  }
}
