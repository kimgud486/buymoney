// ----------------------------------------------------------------------
// MARKET SESSION SERVICE (V16.1 PRECISION TRADING ENGINE)
// Timezone-Aware Session Management for KRX, US Markets & Crypto
// ----------------------------------------------------------------------

export type MarketSession =
  | "KR_REGULAR"
  | "US_PREMARKET"
  | "US_REGULAR"
  | "US_AFTER_HOURS"
  | "CRYPTO_24H"
  | "CLOSED";

export interface SessionInfo {
  market: "KR" | "US" | "CRYPTO";
  session: MarketSession;
  openTimestamp: number | null;
  closeTimestamp: number | null;
  isOpen: boolean;
}

export class MarketSessionService {
  /**
   * Get session info for a given market at specific timestamp (defaults to Date.now())
   */
  public static getSessionInfo(market: "KR" | "US" | "CRYPTO" | string, targetTime = Date.now()): SessionInfo {
    const normMarket = this.normalizeMarket(market);
    const date = new Date(targetTime);

    if (normMarket === "CRYPTO") {
      const utcStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).getTime();
      const utcEnd = utcStart + 86400000;
      return {
        market: "CRYPTO",
        session: "CRYPTO_24H",
        openTimestamp: utcStart,
        closeTimestamp: utcEnd,
        isOpen: true
      };
    }

    if (normMarket === "KR") {
      // KST is UTC+9
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(targetTime + kstOffset);
      const day = kstDate.getUTCDay();

      // Weekend check (0 = Sunday, 6 = Saturday)
      if (day === 0 || day === 6) {
        return { market: "KR", session: "CLOSED", openTimestamp: null, closeTimestamp: null, isOpen: false };
      }

      const year = kstDate.getUTCFullYear();
      const month = kstDate.getUTCMonth();
      const dayOfMonth = kstDate.getUTCDate();

      const krOpen = Date.UTC(year, month, dayOfMonth, 0, 0, 0); // 09:00 KST is 00:00 UTC
      const krClose = Date.UTC(year, month, dayOfMonth, 6, 30, 0); // 15:30 KST is 06:30 UTC

      const isOpen = targetTime >= krOpen && targetTime <= krClose;
      return {
        market: "KR",
        session: isOpen ? "KR_REGULAR" : "CLOSED",
        openTimestamp: krOpen,
        closeTimestamp: krClose,
        isOpen
      };
    }

    // US Market (EST/EDT) - Dynamic DST Offset Calculation for America/New_York
    const nyDateStr = new Date(targetTime).toLocaleString("en-US", { timeZone: "America/New_York" });
    const nyDate = new Date(nyDateStr);

    const year = nyDate.getFullYear();
    const month = nyDate.getMonth();
    const dayOfMonth = nyDate.getDate();
    const day = nyDate.getDay();

    if (day === 0 || day === 6) {
      return { market: "US", session: "CLOSED", openTimestamp: null, closeTimestamp: null, isOpen: false };
    }

    // Determine UTC offset for America/New_York at targetTime (EDT: UTC-4, EST: UTC-5)
    const utcDateStr = new Date(targetTime).toLocaleString("en-US", { timeZone: "UTC" });
    const utcDate = new Date(utcDateStr);
    const offsetMs = utcDate.getTime() - nyDate.getTime();

    // Session Bounds in New York Time converted to exact UTC
    const usRegOpen = new Date(year, month, dayOfMonth, 9, 30, 0).getTime() + offsetMs;
    const usRegClose = new Date(year, month, dayOfMonth, 16, 0, 0).getTime() + offsetMs;
    const usPreOpen = new Date(year, month, dayOfMonth, 4, 0, 0).getTime() + offsetMs;
    const usAfterClose = new Date(year, month, dayOfMonth, 20, 0, 0).getTime() + offsetMs;

    if (targetTime >= usRegOpen && targetTime <= usRegClose) {
      return { market: "US", session: "US_REGULAR", openTimestamp: usRegOpen, closeTimestamp: usRegClose, isOpen: true };
    } else if (targetTime >= usPreOpen && targetTime < usRegOpen) {
      return { market: "US", session: "US_PREMARKET", openTimestamp: usPreOpen, closeTimestamp: usRegOpen, isOpen: true };
    } else if (targetTime > usRegClose && targetTime <= usAfterClose) {
      return { market: "US", session: "US_AFTER_HOURS", openTimestamp: usRegClose, closeTimestamp: usAfterClose, isOpen: false };
    }

    return { market: "US", session: "CLOSED", openTimestamp: usRegOpen, closeTimestamp: usRegClose, isOpen: false };
  }

  private static normalizeMarket(m: string): "KR" | "US" | "CRYPTO" {
    if (!m) return "KR";
    const upper = m.toUpperCase();
    if (upper === "US" || upper === "NASDAQ" || upper === "NYSE") return "US";
    if (upper === "BTC" || upper === "UPBIT" || upper === "CRYPTO") return "CRYPTO";
    return "KR";
  }
}
