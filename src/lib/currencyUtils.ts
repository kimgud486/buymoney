/**
 * Global USD/KRW Exchange Rate & Dual Currency Conversion Utilities
 * Handles automatic live conversion of US stock prices to KRW and provides formatted dual-currency displays.
 */

// Default live market standard exchange rate (하나은행 매매기준율 연동 기준)
export const DEFAULT_USD_KRW_EXCHANGE_RATE = 1385.50;

let currentLiveExchangeRate = DEFAULT_USD_KRW_EXCHANGE_RATE;

/**
 * Get current USD/KRW exchange rate
 */
export function getUsdExchangeRate(): number {
  return currentLiveExchangeRate;
}

/**
 * Update current exchange rate from live API / feeds
 */
export function setUsdExchangeRate(rate: number): void {
  if (typeof rate === "number" && !isNaN(rate) && rate > 0) {
    currentLiveExchangeRate = rate;
  }
}

/**
 * Convert USD to KRW
 */
export function usdToKrw(usdAmount: number, rate: number = currentLiveExchangeRate): number {
  if (!usdAmount || isNaN(usdAmount)) return 0;
  return Math.round(usdAmount * rate);
}

/**
 * Convert KRW to USD
 */
export function krwToUsd(krwAmount: number, rate: number = currentLiveExchangeRate): number {
  if (!krwAmount || isNaN(krwAmount) || rate <= 0) return 0;
  return Number((krwAmount / rate).toFixed(2));
}

import { safeSymbolStr } from "./stockDictionary";

/**
 * Check if a symbol or market represents a US Stock
 */
export function isUsMarketStock(market?: string, symbol?: any): boolean {
  if (market === "US") return true;
  if (!symbol) return false;
  const clean = safeSymbolStr(symbol).toUpperCase().replace(/^KRW-/, "");
  if (!clean) return false;
  // Crypto or Korean 6-digit codes
  if (/^\d{6}$/.test(clean)) return false;
  if (["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "AVAX", "DOT", "LINK", "MATIC", "SHIB", "SEI", "SUI", "XLM"].includes(clean)) return false;
  // Alphabet ticker between 1-5 letters
  if (/^[A-Z]{1,5}$/.test(clean)) return true;
  return false;
}

/**
 * Format raw price string with dual currency support if US Stock
 */
export function formatCurrencyPrice(
  price: number | null | undefined,
  market?: string,
  symbol?: string,
  rate: number = currentLiveExchangeRate
): {
  primary: string;
  secondary: string | null;
  isUs: boolean;
  rawKrw: number;
} {
  const safeVal = typeof price === "number" && !isNaN(price) ? price : (Number(price) || 0);
  const isUs = isUsMarketStock(market, symbol);

  if (isUs) {
    const krw = Math.round(safeVal * rate);
    return {
      primary: `$${(safeVal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      secondary: `≈ ₩${(krw ?? 0).toLocaleString()}원`,
      isUs: true,
      rawKrw: krw
    };
  }

  return {
    primary: `${Math.round(safeVal).toLocaleString()}원`,
    secondary: null,
    isUs: false,
    rawKrw: Math.round(safeVal)
  };
}

/**
 * Format trading value ($M or 억원) with KRW conversion for US stocks
 */
export function formatTradingValue(
  value: number | null | undefined,
  market?: string,
  symbol?: string,
  rate: number = currentLiveExchangeRate
): {
  primary: string;
  secondary: string | null;
} {
  const safeVal = typeof value === "number" && !isNaN(value) ? value : (Number(value) || 0);
  const isUs = isUsMarketStock(market, symbol);

  if (isUs) {
    // value is in Million USD ($M)
    // $1M = $1,000,000 * rate = ~13.85억원
    const krwHundredMillion = Math.round((safeVal * 1000000 * rate) / 100000000);
    return {
      primary: `$${(safeVal ?? 0).toLocaleString()}M`,
      secondary: `≈ ${(krwHundredMillion ?? 0).toLocaleString()}억원`
    };
  }

  return {
    primary: `${(safeVal ?? 0).toLocaleString()}억원`,
    secondary: null
  };
}
