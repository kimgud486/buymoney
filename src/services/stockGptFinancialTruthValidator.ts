export type VerifiedFinancialMetric = number | null;

export interface VerifiedFinancialResult {
  state: 'READY' | 'NO_DATA';
  symbol: string;
  source: 'KIS_INQUIRE_PRICE' | null;
  asOf: string | null;
  per: VerifiedFinancialMetric;
  pbr: VerifiedFinancialMetric;
  eps: VerifiedFinancialMetric;
  bps: VerifiedFinancialMetric;
  reason: string | null;
}

const MAX_FINANCIAL_AGE_MS = 90_000;
const MAX_FUTURE_SKEW_MS = 5_000;

function emptyResult(symbol: string, reason: string): VerifiedFinancialResult {
  return {
    state: 'NO_DATA',
    symbol,
    source: null,
    asOf: null,
    per: null,
    pbr: null,
    eps: null,
    bps: null,
    reason,
  };
}

function positiveOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonZeroOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export function validateStockGptFinancialResponse(
  payload: unknown,
  expectedSymbol: string,
  nowMs: number = Date.now(),
): VerifiedFinancialResult {
  const symbol = String(expectedSymbol || '').trim().toUpperCase();
  if (!/^\d{6}$/.test(symbol)) return emptyResult(symbol, 'KOREA_SYMBOL_REQUIRED');
  if (!payload || typeof payload !== 'object') return emptyResult(symbol, 'INVALID_PAYLOAD');

  const root = payload as Record<string, unknown>;
  if (root.provider !== 'KIS') return emptyResult(symbol, 'UNVERIFIED_PROVIDER');

  const raw = root.fundamentals;
  if (!raw || typeof raw !== 'object') return emptyResult(symbol, 'FUNDAMENTALS_MISSING');
  const fundamentals = raw as Record<string, unknown>;

  if (fundamentals.dataStatus !== 'REALTIME_VERIFIED') {
    return emptyResult(symbol, 'FUNDAMENTALS_NOT_VERIFIED');
  }
  if (fundamentals.source !== 'KIS_INQUIRE_PRICE') {
    return emptyResult(symbol, 'UNVERIFIED_FUNDAMENTALS_SOURCE');
  }

  const returnedSymbol = String(fundamentals.symbol || '').trim().toUpperCase();
  if (returnedSymbol !== symbol) return emptyResult(symbol, 'SYMBOL_MISMATCH');

  const asOf = typeof fundamentals.asOf === 'string' ? fundamentals.asOf : '';
  const asOfMs = Date.parse(asOf);
  if (!asOf || !Number.isFinite(asOfMs)) return emptyResult(symbol, 'INVALID_ASOF');
  if (nowMs - asOfMs > MAX_FINANCIAL_AGE_MS || asOfMs - nowMs > MAX_FUTURE_SKEW_MS) {
    return emptyResult(symbol, 'STALE_FUNDAMENTALS');
  }

  const per = positiveOrNull(fundamentals.per);
  const pbr = positiveOrNull(fundamentals.pbr);
  const eps = nonZeroOrNull(fundamentals.eps);
  const bps = positiveOrNull(fundamentals.bps);

  if (per === null && pbr === null && eps === null && bps === null) {
    return emptyResult(symbol, 'NO_VERIFIED_METRICS');
  }

  return {
    state: 'READY',
    symbol,
    source: 'KIS_INQUIRE_PRICE',
    asOf,
    per,
    pbr,
    eps,
    bps,
    reason: null,
  };
}
