/**
 * Comprehensive Market Classification and Real-time Open/Closed Status Utility.
 * Takes Market Closing Hours into consideration (장시간 마감 고려).
 */

export type MarketCategory = "KOREA" | "US" | "BTC";

export interface MarketStatus {
  marketType: MarketCategory;
  marketNameKo: string;         // e.g. "국내주식 (한국투자/코스피·코스닥)"
  marketBadgeLabel: string;     // e.g. "🇰🇷 국내주식"
  marketBadgeShort: string;     // e.g. "🇰🇷 국내"
  badgeClass: string;           // Tailwind class for solid high-contrast badge
  pillClass: string;            // Tailwind class for soft border pill
  isOpen: boolean;              // True if trading session is currently open
  sessionStatusText: string;    // e.g. "정규장 실시간" | "장마감 (공식 종가)" | "24시간 실시간"
  fullStatusLabel: string;      // e.g. "🇰🇷 국내주식 · 장마감 (공식 종가)"
  statusColorClass: string;     // Color class for status text
  brokerNameText: string;       // e.g. "한국투자증권 (KIS)"
}

/**
 * Returns detailed market classification and real-time open/closed status for any stock symbol and market code.
 */
import { safeSymbolStr } from "./stockDictionary";

export function getMarketStatus(symbol: any, marketInput?: any): MarketStatus {
  const sym = safeSymbolStr(symbol).toUpperCase();
  const mInput = safeSymbolStr(marketInput).toUpperCase();

  let marketType: MarketCategory = "KOREA";

  // Determine market classification accurately
  if (
    mInput === "BTC" || 
    mInput === "UPBIT" || 
    sym.startsWith("KRW-") || 
    ["BTC", "ETH", "XRP", "SOL", "DOGE", "SUI", "ADA", "SHIB", "PEPE", "AVAX", "DOT", "LINK", "XLM", "SEI"].includes(sym)
  ) {
    marketType = "BTC";
  } else if (
    mInput === "US" || 
    mInput === "NASDAQ" || 
    mInput === "NYSE" || 
    /^[A-Z]{1,5}$/.test(sym)
  ) {
    marketType = "US";
  } else {
    marketType = "KOREA";
  }

  // Calculate current Korean time (KST = UTC + 9)
  const now = new Date();
  const utcOffsetMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstDate = new Date(utcOffsetMs + (9 * 60 * 60 * 1000));
  const dayOfWeek = kstDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = kstDate.getHours();
  const minutes = kstDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 1. UPBIT CRYPTO (24/365 Non-stop Trading)
  if (marketType === "BTC") {
    return {
      marketType: "BTC",
      marketNameKo: "가상자산 (업비트 원화마켓)",
      marketBadgeLabel: "🪙 가상자산",
      marketBadgeShort: "🪙 업비트",
      badgeClass: "bg-amber-600 text-white font-extrabold shadow-xs border border-amber-500",
      pillClass: "bg-amber-950/90 text-amber-300 border border-amber-700/80 font-black",
      isOpen: true,
      sessionStatusText: "24시간 실시간",
      fullStatusLabel: "🪙 가상자산 · 24시간 실시간",
      statusColorClass: "text-emerald-400",
      brokerNameText: "업비트 (Upbit)"
    };
  }

  // 2. KOREA DOMESTIC STOCKS (Mon~Fri 09:00 ~ 15:30 KST)
  if (marketType === "KOREA") {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isTradeHours = isWeekday && (timeInMinutes >= 9 * 60 && timeInMinutes <= 15 * 60 + 30);

    return {
      marketType: "KOREA",
      marketNameKo: "국내주식 (한국투자증권 · KOSPI/KOSDAQ)",
      marketBadgeLabel: "🇰🇷 국내주식",
      marketBadgeShort: "🇰🇷 국내",
      badgeClass: "bg-blue-600 text-white font-extrabold shadow-xs border border-blue-500",
      pillClass: "bg-blue-950/90 text-blue-300 border border-blue-700/80 font-black",
      isOpen: isTradeHours,
      sessionStatusText: isTradeHours ? "정규장 실시간" : "장마감 (공식 종가)",
      fullStatusLabel: isTradeHours ? "🇰🇷 국내주식 · 정규장 실시간" : "🇰🇷 국내주식 · 장마감 (공식 종가)",
      statusColorClass: isTradeHours ? "text-emerald-400" : "text-amber-400",
      brokerNameText: "한국투자증권 (KIS)"
    };
  }

  // 3. US OVERSEAS STOCKS (Mon~Fri 09:30 ~ 16:00 EST -> Approx 22:30 ~ 05:00 KST)
  const isUsTradeHours = (dayOfWeek >= 1 && dayOfWeek <= 6) && (timeInMinutes >= 22 * 60 + 30 || timeInMinutes <= 6 * 60);

  return {
    marketType: "US",
    marketNameKo: "해외주식 (한국투자증권 · NASDAQ/NYSE)",
    marketBadgeLabel: "🇺🇸 미국주식",
    marketBadgeShort: "🇺🇸 미국",
    badgeClass: "bg-blue-600 text-white font-extrabold shadow-xs border border-blue-500",
    pillClass: "bg-blue-950/90 text-blue-300 border border-blue-700/80 font-black",
    isOpen: isUsTradeHours,
    sessionStatusText: isUsTradeHours ? "정규장 실시간" : "미국장 마감 (공식 종가)",
    fullStatusLabel: isUsTradeHours ? "🇺🇸 미국주식 · 정규장 실시간" : "🇺🇸 미국주식 · 장마감 (공식 종가)",
    statusColorClass: isUsTradeHours ? "text-emerald-400" : "text-blue-300",
    brokerNameText: "한국투자증권 (KIS 해외주식)"
  };
}
