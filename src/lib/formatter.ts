/**
 * High-precision numerical formatting utilities for stocks and crypto (ETH, BTC, etc.)
 */

export function formatStockQty(qty: number | null | undefined, isCrypto?: boolean): string {
  if (qty === null || qty === undefined || isNaN(Number(qty))) return "0";
  const num = Number(qty);
  
  if (isCrypto) {
    // Show up to 8 decimal places for crypto without trailing noise
    const cleanStr = Number(num.toFixed(8)).toString();
    const parts = cleanStr.split('.');
    const intPart = parseInt(parts[0], 10).toLocaleString();
    if (parts.length > 1) {
      return `${intPart}.${parts[1]}`;
    }
    return intPart;
  }

  // Stock / standard assets
  return (num ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
}

export function formatCryptoDecimals(qty: number, maxDecimals: number = 8): number {
  if (isNaN(qty) || qty <= 0) return 0;
  return Number(Number(qty).toFixed(maxDecimals));
}
