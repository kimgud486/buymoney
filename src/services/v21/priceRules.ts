// JUSIK2 V21 PRICE & TICK SIZE RULES
// Compliant with official 2023 KRX (한국거래소) tick size regulations.

export function getKRXTickSize(price: number): number {
  const p = Math.abs(price);
  if (p < 2000) return 1;
  if (p < 5000) return 5;
  if (p < 20000) return 10;
  if (p < 50000) return 50;
  if (p < 200000) return 100;
  if (p < 500000) return 500;
  return 1000;
}

export function roundToKRXTick(
  price: number,
  mode: "nearest" | "floor" | "ceil" = "nearest"
): number {
  if (price <= 0) return 0;
  const tick = getKRXTickSize(price);
  if (mode === "floor") {
    return Math.floor(price / tick) * tick;
  }
  if (mode === "ceil") {
    return Math.ceil(price / tick) * tick;
  }
  return Math.round(price / tick) * tick;
}

export function formatPriceV21(price: number, market = "KOREA"): string {
  if (market === "KOREA") {
    return `₩${Math.round(price).toLocaleString()}`;
  }
  if (market === "US") {
    return `$${price.toFixed(2)}`;
  }
  return price.toLocaleString();
}
