// AISTOCK v13.1 Validation & Safety Engine - Type Definitions

import { CalculatedIndicatorsV13 } from "../v13/TechnicalAnalysisEngineV13";

export interface CandleOHLCV131 {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
  timestamp?: number;
}

export interface RealTimePriceFeedV131 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange?: string;
  currentPrice: number;
  changeRatePct: number;
  volume: number;
  tradingValueKRW: number;
  candles: CandleOHLCV131[];
  lastUpdatedTimestamp: number; // Unix Epoch ms
}

export interface FreshnessGateResultV131 {
  isValid: boolean;
  isStale: boolean;
  staleSeconds: number;
  completedBarCount: number;
  totalBarCount: number;
  allowTrading: boolean;
  reasonCode: "OK" | "STALE_DATA" | "INSUFFICIENT_COMPLETED_BARS" | "INVALID_PRICE" | "MISSING_FEED";
  message: string;
}

export type UsExchangeCodeV131 = "NASD" | "NYSE" | "AMEX" | "UNKNOWN";

export interface ExchangeRouteResultV131 {
  isValid: boolean;
  market: "KOREA" | "US" | "BTC";
  resolvedExchange: string; // NASD, NYSE, AMEX, KRX, UPBIT, UNKNOWN
  isCrypto: boolean;
  allowKisRouting: boolean;
  rejectionReason?: string;
}

export interface IndividualCheckStatusV131 {
  vwapOk: boolean;
  emaOk: boolean;
  macdOk: boolean;
  rsiOk: boolean;
  rvolOk: boolean;
  hhHlOk: boolean;
  completedBarOk: boolean;
  freshDataOk: boolean;
  riskApproved: boolean;
  exchangeOk: boolean;
}

export type BuyGateDecisionStateV131 = "BUY APPROVED" | "BUY WATCH" | "NO BUY" | "LOCKED";

export interface BuyGateInputV131 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  exchange?: string;
  currentPrice: number;
  scannerScore: number;
  unifiedShapeScore: number;
  confirmationScore: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  indicators: CalculatedIndicatorsV13;
  freshness: FreshnessGateResultV131;
  exchangeRoute: ExchangeRouteResultV131;
  riskApproved: boolean;
  discoveryMode?: "SCANNER" | "MANUAL" | "PRE_SCANNER";
}

export interface BuyGateEvaluationResultV131 {
  symbol: string;
  market: "KOREA" | "US" | "BTC";
  decision: BuyGateDecisionStateV131;
  approved: boolean;
  totalScoresPass: boolean;
  checks: IndividualCheckStatusV131;
  failedChecks: string[];
  aiSummary: string;
  timestamp: string;
}

export type PendingOrderSideV131 = "BUY" | "SELL";
export type PendingOrderStatusV131 = "PENDING" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED";

export interface FillRecordV131 {
  fillQty: number;
  fillPrice: number;
  timestamp: number;
}

export interface PendingOrderV131 {
  orderKey: string; // e.g. "US:AAPL:BUY"
  odno: string; // Order Number
  symbol: string;
  name: string;
  market: "KOREA" | "US";
  exchange: string;
  side: PendingOrderSideV131;
  orderQty: number;
  filledQty: number;
  remainingQty: number;
  orderPrice: number;
  avgFilledPrice: number;
  status: PendingOrderStatusV131;
  createdAt: number;
  updatedAt: number;
  rawFills?: FillRecordV131[];
}
