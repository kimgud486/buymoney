// AISTOCK v13.1 Validation & Safety Engine Facade
// Unifies Freshness, Completed Bar Gate, Exchange Routing, TA Engine, Buy Gate, and Duplicate Guard into a single master evaluation pipeline.

import {
  RealTimePriceFeedV131,
  BuyGateEvaluationResultV131,
  FreshnessGateResultV131,
  ExchangeRouteResultV131
} from "./typesV131";
import { FreshnessAndCompletedBarGateV131 } from "./FreshnessAndCompletedBarGateV131";
import { UsExchangeRouterV131 } from "./UsExchangeRouterV131";
import { TechnicalAnalysisEngineV13, CalculatedIndicatorsV13 } from "../v13/TechnicalAnalysisEngineV13";
import { CompletedBarBuyGateV131 } from "./CompletedBarBuyGateV131";
import { PendingOrderCoordinatorV131, globalPendingOrderCoordinator } from "./PendingOrderCoordinatorV131";

export interface ValidationSafetyInputV131 {
  feed: RealTimePriceFeedV131;
  scannerScore: number;
  unifiedShapeScore: number;
  confirmationScore: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  riskApproved: boolean;
  discoveryMode?: "SCANNER" | "MANUAL" | "PRE_SCANNER";
}

export interface ValidationSafetyReportV131 {
  symbol: string;
  market: "KOREA" | "US" | "BTC";
  freshness: FreshnessGateResultV131;
  exchangeRoute: ExchangeRouteResultV131;
  indicators: CalculatedIndicatorsV13;
  buyGate: BuyGateEvaluationResultV131;
  duplicateCheck: { allowed: boolean; rejectionReason?: string };
  overallApproved: boolean;
  verdictMessage: string;
  timestamp: string;
}

export class ValidationSafetyEngineV131 {
  private coordinator: PendingOrderCoordinatorV131;

  constructor(coordinator: PendingOrderCoordinatorV131 = globalPendingOrderCoordinator) {
    this.coordinator = coordinator;
  }

  /**
   * Master Pipeline Evaluation:
   * Feed -> Freshness/50 Bar Gate -> US Exchange Router -> TA Indicators -> Completed Bar Buy Gate -> Duplicate Guard
   */
  public evaluateBuy(input: ValidationSafetyInputV131): ValidationSafetyReportV131 {
    const {
      feed,
      scannerScore,
      unifiedShapeScore,
      confirmationScore,
      direction,
      riskApproved,
      discoveryMode = "SCANNER"
    } = input;

    // Step 1. Freshness & 50 Completed Bars Gate
    const freshness = FreshnessAndCompletedBarGateV131.evaluate(feed);

    // Step 2. US Exchange & Market Router
    const exchangeRoute = UsExchangeRouterV131.routeExchange(feed.market, feed.exchange, feed.symbol);

    // Step 3. Technical Analysis Calculation (completed bars)
    const completedCandles = (feed.candles || []).filter(c => c.isClosed !== false);
    const indicators = TechnicalAnalysisEngineV13.calculateIndicators(completedCandles);

    // Step 4. Completed Bar Buy Safety Gate
    const buyGate = CompletedBarBuyGateV131.evaluate({
      symbol: feed.symbol,
      name: feed.name,
      market: feed.market,
      exchange: exchangeRoute.resolvedExchange,
      currentPrice: feed.currentPrice,
      scannerScore,
      unifiedShapeScore,
      confirmationScore,
      direction,
      indicators,
      freshness,
      exchangeRoute,
      riskApproved,
      discoveryMode
    });

    // Step 5. Duplicate Order Guard
    let duplicateCheck: { allowed: boolean; rejectionReason?: string } = { allowed: true };
    if (buyGate.approved && (feed.market === "KOREA" || feed.market === "US")) {
      duplicateCheck = this.coordinator.assertNoDuplicate(feed.market, feed.symbol, "BUY");
    }

    const overallApproved = buyGate.approved && duplicateCheck.allowed;

    let verdictMessage = "";
    if (overallApproved) {
      verdictMessage = `🎉 [BUY APPROVED] ${feed.symbol} (${feed.market}/${exchangeRoute.resolvedExchange}) 주문 전송 승인.`;
    } else if (!duplicateCheck.allowed) {
      verdictMessage = `⛔ [DUPLICATE_ORDER_BLOCK] ${duplicateCheck.rejectionReason}`;
    } else {
      verdictMessage = `⛔ [${buyGate.decision}] ${buyGate.aiSummary}`;
    }

    return {
      symbol: feed.symbol,
      market: feed.market,
      freshness,
      exchangeRoute,
      indicators,
      buyGate,
      duplicateCheck,
      overallApproved,
      verdictMessage,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}

export const globalValidationSafetyEngineV131 = new ValidationSafetyEngineV131();
