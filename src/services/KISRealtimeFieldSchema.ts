// ----------------------------------------------------------------------
// KIS REALTIME FIELD SCHEMA V18.4
// Official KIS WebSocket Schema Constants for 국내주식 시세/체결/호가/통보
// ----------------------------------------------------------------------

export const H0STCNT0 = {
  SYMBOL: 0,              // 유가증권 단축 종목코드
  TIME: 1,                // 주식 체결 시간
  PRICE: 2,               // 주식 현재가
  PRDY_SIGN: 3,           // 전일 대비 부호 (1: 상한, 2: 상승, 3: 보합, 4: 하한, 5: 하락)
  PRDY_CHANGE: 4,         // 전일 대비
  CHANGE_RATE: 5,         // 전일 대비율
  ASK1: 10,               // 매도호가1
  BID1: 11,               // 매수호가1
  TRADE_VOLUME: 12,       // 체결 수량
  ACC_VOLUME: 13,         // 누적 체결 수량
  ACC_TRADE_VALUE: 14,    // 누적 거래 대금
  SELL_TRADE_COUNT: 15,   // 매도 체결 건수
  BUY_TRADE_COUNT: 16,    // 매수 체결 건수
  NET_BUY_TRADE_COUNT: 17,// 순매수 체결 건수
  TRADE_STRENGTH: 18,     // 체결 강도
} as const;

export const H0STASP0 = {
  SYMBOL: 0,              // 유가증권 단축 종목코드
  TIME: 1,                // 영업 시간
  ASK1: 3,                // 매도호가1
  BID1: 13,               // 매수호가1
  ASK_QTY1: 23,           // 매도호가 잔량1
  BID_QTY1: 33,           // 매수호가 잔량1
  TOTAL_ASK_QTY: 43,      // 총 매도호가 잔량
  TOTAL_BID_QTY: 44,      // 총 매수호가 잔량
} as const;

export const H0STCNI0 = {
  ACCOUNT_NO: 1,          // 계좌번호
  ORDER_ID: 2,            // 주문번호
  ORIGINAL_ORDER_ID: 3,   // 원주문번호
  SIDE_CODE: 4,           // 매도매수구분코드 (01: 매도, 02: 매수)
  SYMBOL: 8,              // 종목코드
  EXEC_QTY: 9,            // 체결수량
  EXEC_PRICE: 10,         // 체결단가
  EXEC_TIME: 11,          // 체결시각
  REJECT_FLAG: 12,        // 거부플래그
  EXEC_FLAG: 13,          // 체결여부/플래그 (1:체결, 2:미체결 등)
  ACCEPT_FLAG: 14,        // 접수플래그
  ORDER_QTY: 16,          // 주문수량
} as const;

export const H0GSCNI0 = {
  ACCOUNT_NO: 1,          // 계좌번호
  ORDER_ID: 2,            // 주문번호
  ORIGINAL_ORDER_ID: 3,   // 원주문번호
  SIDE_CODE: 4,           // 매도매수구분코드
  SYMBOL: 7,              // 종목코드
  EXEC_QTY: 8,            // 체결수량
  EXEC_PRICE: 9,          // 체결단가
  EXEC_TIME: 10,          // 체결시각
  REJECT_FLAG: 11,        // 거부플래그
  EXEC_FLAG: 12,          // 체결여부
  ACCEPT_FLAG: 13,        // 접수플래그
  ORDER_QTY: 15,          // 주문수량
} as const;

export function classifyAggressor(
  tradePrice: number,
  bestBid: number | null,
  bestAsk: number | null,
  previousTradePrice: number | null
): "BUY" | "SELL" | "NEUTRAL" {
  if (tradePrice <= 0) return "NEUTRAL";

  if (bestAsk != null && bestAsk > 0 && tradePrice >= bestAsk) {
    return "BUY";
  }

  if (bestBid != null && bestBid > 0 && tradePrice <= bestBid) {
    return "SELL";
  }

  if (previousTradePrice != null && previousTradePrice > 0) {
    if (tradePrice > previousTradePrice) return "BUY";
    if (tradePrice < previousTradePrice) return "SELL";
  }

  return "NEUTRAL";
}
