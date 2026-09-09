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
  /** Actual KIS trade time converted from STCK_CNTG_HOUR (Asia/Seoul). */
  timestamp: number;
  grade: DataGradeV20;
  rawPayload: string;
}

function finiteNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Convert the KIS HHMMSS domestic execution field into epoch milliseconds.
 * The trading clock is Asia/Seoul, independent of the Node server timezone.
 */
export function parseKisDomesticTradeTimestamp(
  tradeTime: string,
  receivedAt: number = Date.now(),
): number {
  const digits = String(tradeTime || "").replace(/\D/g, "");
  if (digits.length !== 6 || !Number.isFinite(receivedAt) || receivedAt <= 0) {
    return receivedAt;
  }

  const hour = Number(digits.slice(0, 2));
  const minute = Number(digits.slice(2, 4));
  const second = Number(digits.slice(4, 6));
  if (hour > 23 || minute > 59 || second > 59) return receivedAt;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(receivedAt));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (!year || !month || !day) return receivedAt;

  // KST = UTC+9.
  let timestamp = Date.UTC(year, month - 1, day, hour - 9, minute, second);

  // Around Korean midnight, a delayed packet can belong to the previous date.
  // Never allow the parsed provider time to jump materially into the future.
  if (timestamp > receivedAt + 5 * 60_000) {
    timestamp -= 86_400_000;
  }

  return timestamp > 0 ? timestamp : receivedAt;
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
    const receivedAt = Date.now();

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
      timestamp: parseKisDomesticTradeTimestamp(tradeTime, receivedAt),
      grade: "EXECUTION_GRADE",
      rawPayload: rawMessage,
    };
  }
}
