// ----------------------------------------------------------------------
// AISTOCK V20 KIS DOMESTIC REALTIME TRADE PARSER
// H0STCNT0 -> normalized domestic execution tick
// Field positions follow KIS official open-trading-api realtime sample.
// ----------------------------------------------------------------------

import type { DataGradeV20 } from "./KISOverseasParserV20";

export interface DomesticTradeTickV20 {
  symbol: string;
  market: "KOREA";
  tradeTime: string;
  lastPrice: number;
  changeAmount: number;
  ratePct: number;
  askPrice: number;
  bidPrice: number;
  executedVolume: number;
  totalVolume: number;
  totalAmount: number;
  tradeStrength: number | null;
  timestamp: number;
  grade: DataGradeV20;
  rawPayload: string;
}

function finiteNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class KISDomesticTradeParserV20 {
  /**
   * H0STCNT0 caret-delimited field map used here:
   *  0 MKSC_SHRN_ISCD, 1 STCK_CNTG_HOUR, 2 STCK_PRPR,
   *  4 PRDY_VRSS, 5 PRDY_CTRT, 10 ASKP1, 11 BIDP1,
   * 12 CNTG_VOL, 13 ACML_VOL, 14 ACML_TR_PBMN, 18 CTTR.
   */
  public static parseH0STCNT0(rawMessage: string): DomesticTradeTickV20 | null {
    if (!rawMessage || !rawMessage.includes("^")) return null;

    const fields = rawMessage.split("^");
    if (fields.length < 15) return null;

    const symbol = (fields[0] || "").trim();
    const tradeTime = (fields[1] || "").trim();
    const lastPrice = finiteNumber(fields[2]);
    const executedVolume = Math.max(0, finiteNumber(fields[12]));
    const totalVolume = Math.max(0, finiteNumber(fields[13]));

    if (!symbol || lastPrice <= 0) return null;

    const cttr = finiteNumber(fields[18], Number.NaN);

    return {
      symbol,
      market: "KOREA",
      tradeTime,
      lastPrice,
      changeAmount: finiteNumber(fields[4]),
      ratePct: finiteNumber(fields[5]),
      askPrice: Math.max(0, finiteNumber(fields[10])),
      bidPrice: Math.max(0, finiteNumber(fields[11])),
      executedVolume,
      totalVolume,
      totalAmount: Math.max(0, finiteNumber(fields[14])),
      tradeStrength: Number.isFinite(cttr) ? cttr : null,
      timestamp: Date.now(),
      grade: "EXECUTION_GRADE",
      rawPayload: rawMessage,
    };
  }
}
