/**
 * Professional Stock Precision, Tick Rules & Order Sizing Engine
 * Supports KRX (KOSPI/KOSDAQ) and US (NASDAQ/NYSE/AMEX) with strict Korean regulatory compliance.
 */

export interface StockOrderCapacity {
  maxAffordableShares: number;
  investAmountKRW: number;
  investAmountUSD?: number;
  estimatedFeeKRW: number;
  estimatedFeeUSD?: number;
  estimatedTaxKRW: number;
  totalRequiredCapitalKRW: number;
  isExecutable: boolean;
  rejectReason?: string;
}

/**
 * Returns the official KRX (한국거래소) tick size (호가 가격단위) based on the latest 2023 KRX rules.
 *
 * < 2,000원: 1원
 * 2,000원 ~ 5,000원 미만: 5원
 * 5,000원 ~ 20,000원 미만: 10원
 * 20,000원 ~ 50,000원 미만: 50원
 * 50,000원 ~ 200,000원 미만: 100원
 * 200,000원 ~ 500,000원 미만: 500원
 * 500,000원 이상: 1,000원
 */
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

/**
 * Adjusts a stock price to the nearest valid KRX tick.
 */
export function roundToKRXTick(
  price: number,
  mode: 'nearest' | 'floor' | 'ceil' = 'nearest'
): number {
  if (price <= 0) return 0;
  const tick = getKRXTickSize(price);
  if (mode === 'floor') {
    return Math.floor(price / tick) * tick;
  }
  if (mode === 'ceil') {
    return Math.ceil(price / tick) * tick;
  }
  return Math.round(price / tick) * tick;
}

/**
 * US Stock tick size (Standard US cent tick $0.01)
 */
export function getUSTickSize(price: number): number {
  return 0.01;
}

/**
 * Adjusts US stock price to 2 decimal places ($0.01).
 */
export function roundToUSTick(price: number): number {
  if (price <= 0) return 0;
  return Math.round(price * 100) / 100;
}

import { safeSymbolStr } from './stockDictionary';

/**
 * Maps US stock symbols to exchange codes for KIS Overseas API (NASD, NYSE, AMEX).
 */
export function resolveUSExchangeCode(symbol: any): 'NASD' | 'NYSE' | 'AMEX' {
  const sym = safeSymbolStr(symbol).toUpperCase();
  
  const nyseSymbols = new Set([
    'TSM', 'BABA', 'BRK.B', 'BRK.A', 'JNJ', 'JPM', 'V', 'UNH', 'MA', 'HD',
    'PG', 'XOM', 'CVX', 'NKE', 'DIS', 'PFE', 'BAC', 'WMT', 'KO', 'SPY',
    'IVV', 'VOO', 'DIA', 'SCHD', 'LLY', 'NVO', 'ORCL', 'CRM', 'IBM', 'GE',
    'RTX', 'CAT', 'MCD', 'GS', 'MS', 'C', 'AXP', 'BA', 'LMT', 'BMY', 'T'
  ]);

  const amexSymbols = new Set([
    'SPY', 'GLD', 'SLV', 'GDX', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLY', 'XLU'
  ]);

  if (nyseSymbols.has(sym)) return 'NYSE';
  if (amexSymbols.has(sym)) return 'AMEX';
  return 'NASD';
}

/**
 * Exact Brokerage Fee & Tax calculations for Korean and US Stock Markets.
 * 
 * - Domestic (KOREA): 
 *   - Broker fee: 0.015% (매수/매도 공통)
 *   - Securities Transaction Tax (거래세): 0.18% (매도 시에만 부과)
 * - Overseas (US):
 *   - Broker fee: 0.25% (매수/매도 공통)
 *   - SEC Fee / TAF: 매도 시 약 0.00278%
 */
export function calculateEstimatedFeeAndTax(
  market: 'KOREA' | 'US' | 'BTC',
  side: 'BUY' | 'SELL',
  priceOrAmount: number,
  qty: number = 1,
  fxRate: number = 1350
) {
  const isUS = market === 'US';
  const isCrypto = market === 'BTC';
  const tradeValue = qty > 0 && priceOrAmount > 0 ? priceOrAmount * qty : Math.max(0, priceOrAmount);

  if (isCrypto) {
    const brokerFeeKRW = Math.round(tradeValue * 0.0005); // Upbit 0.05%
    return {
      fee: brokerFeeKRW,
      tax: 0,
      brokerFeeKRW,
      taxKRW: 0,
      totalFeeAndTaxKRW: brokerFeeKRW
    };
  }

  if (isUS) {
    // US Stock
    const brokerFeeUSD = Math.max(0.01, tradeValue * 0.0025);
    const secFeeUSD = side === 'SELL' ? tradeValue * 0.0000278 : 0;
    const totalFeeUSD = Number((brokerFeeUSD + secFeeUSD).toFixed(2));
    const totalFeeKRW = Math.round(totalFeeUSD * fxRate);

    return {
      fee: totalFeeKRW,
      tax: 0,
      brokerFeeUSD,
      secFeeUSD,
      totalFeeUSD,
      totalFeeKRW,
      taxKRW: 0,
      totalFeeAndTaxKRW: totalFeeKRW
    };
  }

  // Domestic Stock
  const brokerFeeKRW = Math.round(tradeValue * 0.00015);
  const taxKRW = side === 'SELL' ? Math.floor(tradeValue * 0.0018) : 0;
  const totalFeeAndTaxKRW = brokerFeeKRW + taxKRW;

  return {
    fee: brokerFeeKRW,
    tax: taxKRW,
    brokerFeeKRW,
    taxKRW,
    totalFeeAndTaxKRW
  };
}

/**
 * Computes exact maximum buyable integer shares without overdrafting cash or margin.
 */
export function calculateAffordableShares(
  availableCashKRW: number,
  price: number,
  market: 'KOREA' | 'US',
  fxRate: number = 1350,
  maxPositionWeightPct: number = 100
): StockOrderCapacity {
  if (price <= 0 || availableCashKRW <= 0) {
    return {
      maxAffordableShares: 0,
      investAmountKRW: 0,
      estimatedFeeKRW: 0,
      estimatedTaxKRW: 0,
      totalRequiredCapitalKRW: 0,
      isExecutable: false,
      rejectReason: '가용 예수금이 없거나 종목 가격이 0원입니다.'
    };
  }

  const effectiveCash = (availableCashKRW * Math.min(100, Math.max(1, maxPositionWeightPct))) / 100;
  const isUS = market === 'US';

  if (isUS) {
    const priceKRW = price * fxRate;
    // Account for 0.25% fee buffer
    const priceWithFeeKRW = priceKRW * 1.0025;
    const maxShares = Math.floor(effectiveCash / priceWithFeeKRW);

    if (maxShares < 1) {
      return {
        maxAffordableShares: 0,
        investAmountKRW: 0,
        investAmountUSD: 0,
        estimatedFeeKRW: 0,
        estimatedTaxKRW: 0,
        totalRequiredCapitalKRW: Math.round(priceWithFeeKRW),
        isExecutable: false,
        rejectReason: `미국주식 1주 매수 최소 필요금액(₩${Math.round(priceWithFeeKRW).toLocaleString()}원 / $${price.toFixed(2)}) 대비 예수금이 부족합니다.`
      };
    }

    const investUSD = maxShares * price;
    const investKRW = Math.round(investUSD * fxRate);
    const feeUSD = Number((investUSD * 0.0025).toFixed(2));
    const feeKRW = Math.round(feeUSD * fxRate);

    return {
      maxAffordableShares: maxShares,
      investAmountKRW: investKRW,
      investAmountUSD: investUSD,
      estimatedFeeKRW: feeKRW,
      estimatedFeeUSD: feeUSD,
      estimatedTaxKRW: 0,
      totalRequiredCapitalKRW: investKRW + feeKRW,
      isExecutable: true
    };
  }

  // Domestic Stock
  const priceWithFeeKRW = price * 1.00015;
  const maxShares = Math.floor(effectiveCash / priceWithFeeKRW);

  if (maxShares < 1) {
    return {
      maxAffordableShares: 0,
      investAmountKRW: 0,
      estimatedFeeKRW: 0,
      estimatedTaxKRW: 0,
      totalRequiredCapitalKRW: Math.round(priceWithFeeKRW),
      isExecutable: false,
      rejectReason: `국내주식 1주 매수 최소 필요금액(₩${Math.round(priceWithFeeKRW).toLocaleString()}원) 대비 가용 예수금이 부족합니다.`
    };
  }

  const investKRW = maxShares * price;
  const feeKRW = Math.round(investKRW * 0.00015);

  return {
    maxAffordableShares: maxShares,
    investAmountKRW: investKRW,
    estimatedFeeKRW: feeKRW,
    estimatedTaxKRW: 0,
    totalRequiredCapitalKRW: investKRW + feeKRW,
    isExecutable: true
  };
}
