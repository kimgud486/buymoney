// ----------------------------------------------------------------------
// AISTOCK V20 KIS OVERSEAS REALTIME PARSER & ENTITLEMENT GATE
// KIS Official Specs: HDFSCNT0 (Trade Tick), HDFSASP0 (Orderbook Depth), H0GSCNI0 (Account Execution)
// ----------------------------------------------------------------------

export type DataGradeV20 = "EXECUTION_GRADE" | "ANALYSIS_ONLY" | "DISPLAY_ONLY";

export interface OverseasTradeTickV20 {
  symbol: string;
  market: "US";
  lastPrice: number;
  ratePct: number;
  bidPrice: number;
  askPrice: number;
  executedVolume: number;
  totalVolume: number;
  totalAmount: number;
  timestamp: number;
  sequence: number;
  grade: DataGradeV20;
  rawPayload: string;
}

export class KISOverseasParserV20 {
  /**
   * Parse raw HDFSCNT0 WebSocket packet string into structured OverseasTradeTickV20.
   * KIS Official 26-field index mapping:
   * RSYM=0, SYMB=1, ZDIV=2, TYMD=3, XYMD=4, XTIM=5, LAST=11, RATE=14, PBID=15, PASK=16, EVOL=19, TVOL=20, TAMT=21
   */
  public static parseHDFSCNT0(rawMessage: string, isEntitled: boolean = false): OverseasTradeTickV20 | null {
    if (!rawMessage || !rawMessage.includes("^")) {
      return null;
    }

    const tokens = rawMessage.split("^");
    if (tokens.length < 12) {
      return null;
    }

    try {
      const symbol = (tokens[1] || tokens[0] || "US_STOCK").trim().toUpperCase();

      // Support official 26-field array (LAST=11, RATE=14, PBID=15, PASK=16, EVOL=19, TVOL=20, TAMT=21)
      // and truncated arrays (> 21 vs 12~21)
      const lastPrice = tokens.length > 21 ? parseFloat(tokens[11] || "0") : (parseFloat(tokens[11] || "0") || parseFloat(tokens[6] || "0"));
      const ratePct = tokens.length > 21 ? parseFloat(tokens[14] || "0") : (parseFloat(tokens[14] || "0") || parseFloat(tokens[9] || "0"));
      const bidPrice = tokens.length > 21 ? parseFloat(tokens[15] || "0") : (parseFloat(tokens[15] || "0") || parseFloat(tokens[10] || "0"));
      const askPrice = tokens.length > 21 ? parseFloat(tokens[16] || "0") : (parseFloat(tokens[16] || "0") || parseFloat(tokens[11] || "0"));
      const executedVolume = tokens.length > 21 ? parseFloat(tokens[19] || "0") : (parseFloat(tokens[19] || "0") || parseFloat(tokens[12] || "0"));
      const totalVolume = tokens.length > 21 ? parseFloat(tokens[20] || "0") : (parseFloat(tokens[20] || "0") || parseFloat(tokens[13] || "0"));
      const totalAmount = tokens.length > 21 ? parseFloat(tokens[21] || "0") : (parseFloat(tokens[21] || "0") || parseFloat(tokens[14] || "0"));

      if (isNaN(lastPrice) || lastPrice <= 0) {
        return null;
      }

      // Entitlement Rule: KIS officially designates HDFSCNT0 as delayed by default unless real-time entitlement is verified
      const grade: DataGradeV20 = isEntitled ? "EXECUTION_GRADE" : "ANALYSIS_ONLY";

      return {
        symbol,
        market: "US",
        lastPrice,
        ratePct,
        bidPrice,
        askPrice,
        executedVolume,
        totalVolume,
        totalAmount,
        timestamp: Date.now(),
        sequence: Date.now(),
        grade,
        rawPayload: rawMessage
      };
    } catch (e) {
      return null;
    }
  }
}
