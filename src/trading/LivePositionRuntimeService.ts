// ----------------------------------------------------------------------
// LIVE POSITION RUNTIME SERVICE V18.3 (AISTOCK UNIFIED ENGINE RUNTIME)
// Connects Verified Market Events -> Indicators -> Structure -> Trailing
// -> Exit Evidence -> Position State Machine -> Broker Execution Fills
// ----------------------------------------------------------------------

import { PositionState, PositionQuantityState, PositionStateMachine } from "./PositionStateMachine";
import { PositionLifecycleOrchestrator, LifecycleInput, LifecycleOutput } from "./PositionLifecycleOrchestrator";
import { IndicatorTruthEngine } from "../services/IndicatorTruthEngine";
import { StructureBrain, Candle } from "../services/StructureBrain";
import { CandlePatternEngine } from "../services/CandlePatternEngine";
import { ExitEvidence } from "../services/ExitEvidenceEngine";
import { IndicatorHistoryEngine } from "../services/IndicatorHistoryEngine";
import { DynamicSellZoneEngine } from "../services/DynamicSellZoneEngine";
import { VerifiedExecutionTick, VerifiedExecutionTickValidator } from "../realtime/VerifiedExecutionTick";

export interface VerifiedMarketSnapshot {
  symbol: string;
  market: "KR" | "US" | "CRYPTO";
  price: number;
  candles: Candle[];
  sessionOpen?: number;
  isVerified: boolean;
  orderFlow?: {
    reversalConfirmed?: boolean;
    bearishCvdDivergence?: boolean;
  };
  relativeStrength?: {
    weakening?: boolean;
    rs5m?: number | null;
    rs15m?: number | null;
    rs1h?: number | null;
    rs1d?: number | null;
  };
  marketContext?: {
    weak?: boolean;
  };
}

export interface LivePosition {
  positionId: string;
  symbol: string;
  strategyId: string;
  state: PositionState;

  entryPrice: number;
  highestPriceSinceBuy: number;
  lowestPriceSinceBuy: number;
  trailingFloor: number | null;
  initialStopPrice: number | null;

  defenseSellPrice: number | null;
  expectedSellLow: number | null;
  expectedSellMid: number | null;
  expectedSellHigh: number | null;
  continuationScore: number | null;

  quantities: PositionQuantityState;

  lastExitEvidence: ExitEvidence | null;
  updatedAt: number;
}

export interface BrokerExecutionNotice {
  noticeId: string;
  symbol: string;
  side: "BUY" | "SELL";
  execQty: number;
  execPrice: number;
  remainingQty: number;
  timestamp: number;
}

export interface RuntimeEvaluationResult {
  positionId: string;
  symbol: string;
  previousState: PositionState;
  nextState: PositionState;
  actionRequired: "NONE" | "SUBMIT_BUY_ORDER" | "SUBMIT_SELL_ORDER" | "UPDATE_TRAILING";
  lifecycleOutput: LifecycleOutput | null;
  reason: string;
}

export class LivePositionRuntimeService {
  private activePositions: Map<string, LivePosition> = new Map();
  private processedExecutionNoticeIds: Set<string> = new Set();

  private normalizeSymbol(symbol: string): string {
    return String(symbol || "")
      .trim()
      .toUpperCase();
  }

  /**
   * Register or restore a live position
   */
  public registerPosition(position: LivePosition): void {
    this.activePositions.set(position.positionId, position);
  }

  /**
   * Get position by ID
   */
  public getPosition(positionId: string): LivePosition | undefined {
    return this.activePositions.get(positionId);
  }

  /**
   * Get all active positions
   */
  public getAllPositions(): LivePosition[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Evaluated on completed bar (1m/5m/15m completed candle update)
   */
  public onCompletedBar(
    positionId: string,
    snapshot: VerifiedMarketSnapshot
  ): RuntimeEvaluationResult {
    const position = this.activePositions.get(positionId);
    if (!position) {
      return {
        positionId,
        symbol: snapshot.symbol,
        previousState: "FLAT",
        nextState: "FLAT",
        actionRequired: "NONE",
        lifecycleOutput: null,
        reason: "POSITION_NOT_FOUND"
      };
    }

    if (!snapshot.isVerified || snapshot.candles.length < 5) {
      return {
        positionId,
        symbol: snapshot.symbol,
        previousState: position.state,
        nextState: position.state,
        actionRequired: "NONE",
        lifecycleOutput: null,
        reason: "UNVERIFIED_OR_INSUFFICIENT_MARKET_DATA"
      };
    }

    const currentPrice = snapshot.price > 0 ? snapshot.price : snapshot.candles[snapshot.candles.length - 1].close;

    // Update highest and lowest price since buy
    position.highestPriceSinceBuy = Math.max(position.highestPriceSinceBuy || currentPrice, currentPrice);
    position.lowestPriceSinceBuy = Math.min(position.lowestPriceSinceBuy || currentPrice, currentPrice);

    // 1. Compute Indicators & Record History Point
    const indicators = IndicatorTruthEngine.computeSnapshot(snapshot.candles, snapshot.sessionOpen);
    const rawTimestamp = snapshot.candles[snapshot.candles.length - 1].timestamp;
    const lastCandleTime = typeof rawTimestamp === "number" ? rawTimestamp : Date.now();

    IndicatorHistoryEngine.addPoint(
      snapshot.symbol,
      lastCandleTime,
      currentPrice,
      indicators
    );

    // 2. Compute Market Structure
    const structure = StructureBrain.analyze(snapshot.candles, {}, snapshot.symbol);

    // 3. Scan Candle Patterns
    const patterns = CandlePatternEngine.scan(snapshot.candles, {
      vwap: indicators.vwap,
      rvol: indicators.rvol
    });
    const bearishPatterns = patterns.filter((p) => p.direction === "BEARISH");

    // 4. Determine Structure Status
    const structureValid = !structure.currentStructureTrend.startsWith("BEARISH");
    const bearishChoch = structure.structureBreaks.some((x) => x.type === "CHOCH" && x.direction === "BEARISH");

    const recentLow = snapshot.candles[snapshot.candles.length - 1].low;
    const swingLows = structure.swingLows;
    const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : null;
    const swingLowBreak = lastSwingLow != null && recentLow < lastSwingLow;

    // 5. Momentum Deterioration Detection via Indicator History Engine
    const macdCheck = IndicatorHistoryEngine.checkMacdDeterioration(snapshot.symbol);
    const macdWeakening = macdCheck.isDeteriorating;

    const rsiCheck = IndicatorHistoryEngine.checkRsiDeterioration(snapshot.symbol);
    const rsiWeakening = rsiCheck.isDeteriorating;

    // 6. Run Position Lifecycle Orchestrator
    const lifecycleInput: LifecycleInput = {
      positionId: position.positionId,
      symbol: position.symbol,
      strategyId: position.strategyId,
      state: position.state,

      entryPrice: position.entryPrice,
      currentPrice,
      highestPriceSinceBuy: position.highestPriceSinceBuy,
      lowestPriceSinceBuy: position.lowestPriceSinceBuy,
      previousTrailingFloor: position.trailingFloor,

      quantities: position.quantities,

      atr14: indicators.atr14,
      vwap: indicators.vwap,
      ema20: indicators.ema20,
      swingLow: lastSwingLow,

      structureValid,
      bearishChoch,
      swingLowBreak,

      macdWeakening,
      rsiWeakening,
      bearishPatterns,

      orderFlowReversal: snapshot.orderFlow?.reversalConfirmed ?? false,
      cvdDivergence: snapshot.orderFlow?.bearishCvdDivergence ?? false,

      relativeStrengthLoss: snapshot.relativeStrength?.weakening ?? false,
      marketWeakness: snapshot.marketContext?.weak ?? false
    };

    const lifecycleOutput = PositionLifecycleOrchestrator.evaluate(lifecycleInput);

    // Apply Monotonic Trailing Floor Update (Never moves down)
    if (lifecycleOutput.trailing.newTrailingFloor != null) {
      if (position.trailingFloor == null || lifecycleOutput.trailing.newTrailingFloor > position.trailingFloor) {
        position.trailingFloor = lifecycleOutput.trailing.newTrailingFloor;
      }
    }

    if (lifecycleOutput.trailing.initialRiskStop != null && position.initialStopPrice == null) {
      position.initialStopPrice = lifecycleOutput.trailing.initialRiskStop;
    }

    position.lastExitEvidence = lifecycleOutput.exitEvidence;

    // Evaluate Dynamic Dual Sell Zone Intelligence
    const swingHighs = structure.swingHighs;
    const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : null;

    const sellZoneRes = DynamicSellZoneEngine.evaluate({
      positionId: position.positionId,
      symbol: position.symbol,
      strategyId: position.strategyId,
      entryPrice: position.entryPrice,
      currentPrice,
      highestPriceSinceBuy: position.highestPriceSinceBuy,
      lowestPriceSinceBuy: position.lowestPriceSinceBuy,
      previousDefenseSell: position.defenseSellPrice ?? position.trailingFloor,
      atr14: indicators.atr14,
      vwap: indicators.vwap,
      ema9: indicators.ema9,
      ema20: indicators.ema20,
      ema50: indicators.ema50,
      lastSwingLow,
      lastSwingHigh,
      rvol: indicators.rvol,
      rs5m: snapshot.relativeStrength?.rs5m,
      rs15m: snapshot.relativeStrength?.rs15m,
      rs1h: snapshot.relativeStrength?.rs1h,
      rs1d: snapshot.relativeStrength?.rs1d,
      structureTrend: structureValid ? "BULLISH" : "BEARISH",
      exitRiskScore: lifecycleOutput.exitEvidence.exitRiskScore,
      profitHoldStrength: lifecycleOutput.exitEvidence.profitHoldStrength,
      sellWatchLevel: lifecycleOutput.exitEvidence.sellWatchLevel
    });

    position.defenseSellPrice = sellZoneRes.defenseSellPrice;
    position.expectedSellLow = sellZoneRes.expectedSellLow;
    position.expectedSellMid = sellZoneRes.expectedSellMid;
    position.expectedSellHigh = sellZoneRes.expectedSellHigh;
    position.continuationScore = sellZoneRes.continuationScore;

    const previousState = position.state;
    position.state = lifecycleOutput.nextState;
    position.updatedAt = Date.now();

    let actionRequired: RuntimeEvaluationResult["actionRequired"] = "NONE";
    if (position.state === "SELL_PENDING" && previousState !== "SELL_PENDING") {
      actionRequired = "SUBMIT_SELL_ORDER";
    } else if (position.trailingFloor !== lifecycleInput.previousTrailingFloor) {
      actionRequired = "UPDATE_TRAILING";
    }

    return {
      positionId: position.positionId,
      symbol: position.symbol,
      previousState,
      nextState: position.state,
      actionRequired,
      lifecycleOutput,
      reason: `Evaluated Bar: Exit Score ${lifecycleOutput.exitEvidence.exitRiskScore}, RecAction: ${lifecycleOutput.exitEvidence.recommendedAction}`
    };
  }

  /**
   * Fast-path tick monitor for immediate emergency/trailing floor breaches.
   * Strictly requires a VerifiedExecutionTick (no raw numbers allowed).
   */
  public onVerifiedTick(
    positionId: string,
    tick: VerifiedExecutionTick
  ): RuntimeEvaluationResult {
    const position = this.activePositions.get(positionId);
    if (!position) {
      return {
        positionId,
        symbol: "UNKNOWN",
        previousState: "FLAT",
        nextState: "FLAT",
        actionRequired: "NONE",
        lifecycleOutput: null,
        reason: "POSITION_NOT_FOUND"
      };
    }

    try {
      VerifiedExecutionTickValidator.validateForExecution(tick, position.symbol);
    } catch (err: any) {
      return {
        positionId,
        symbol: position.symbol,
        previousState: position.state,
        nextState: position.state,
        actionRequired: "NONE",
        lifecycleOutput: null,
        reason: `EXECUTION_TICK_REJECTED: ${err.message || err}`
      };
    }

    const currentPrice = tick.price;

    // Compute unified execution floor: MAX(initialStopPrice, trailingFloor, defenseSellPrice)
    const executionFloor = Math.max(
      position.initialStopPrice ?? -Infinity,
      position.trailingFloor ?? -Infinity,
      position.defenseSellPrice ?? -Infinity
    );

    const isBreached = Number.isFinite(executionFloor) && currentPrice <= executionFloor;

    if (isBreached && (position.state === "HOLD" || position.state === "PROFIT_HOLD" || position.state === "SELL_WATCH")) {
      const previousState = position.state;
      position.state = "SELL_PENDING";
      position.updatedAt = Date.now();

      return {
        positionId,
        symbol: position.symbol,
        previousState,
        nextState: "SELL_PENDING",
        actionRequired: "SUBMIT_SELL_ORDER",
        lifecycleOutput: null,
        reason: `FAST_PATH_DEFENSE_BREACH: Verified Tick ${currentPrice} <= Execution Floor ${executionFloor}`
      };
    }

    return {
      positionId,
      symbol: position.symbol,
      previousState: position.state,
      nextState: position.state,
      actionRequired: "NONE",
      lifecycleOutput: null,
      reason: "TICK_NORMAL"
    };
  }

  public onBrokerExecutionNotice(
    positionId: string,
    notice: BrokerExecutionNotice
  ): PositionState {
    const position =
      this.activePositions.get(positionId);

    if (!position) {
      return "FLAT";
    }

    // CLOSED is terminal.
    if (position.state === "CLOSED") {
      return "CLOSED";
    }

    // ------------------------------------------------------------
    // Validate authoritative broker notice
    // ------------------------------------------------------------

    if (
      !notice.noticeId ||
      !String(notice.noticeId).trim()
    ) {
      console.error(
        "[EXECUTION_TRUTH] rejected empty noticeId"
      );
      return position.state;
    }

    if (
      this.normalizeSymbol(notice.symbol) !==
      this.normalizeSymbol(position.symbol)
    ) {
      console.error(
        `[EXECUTION_TRUTH] symbol mismatch: ` +
        `${notice.symbol} != ${position.symbol}`
      );

      return position.state;
    }

    if (
      !Number.isFinite(notice.execQty) ||
      notice.execQty <= 0
    ) {
      console.error(
        "[EXECUTION_TRUTH] invalid execQty",
        notice.execQty
      );

      return position.state;
    }

    if (
      !Number.isFinite(notice.execPrice) ||
      notice.execPrice <= 0
    ) {
      console.error(
        "[EXECUTION_TRUTH] invalid execPrice",
        notice.execPrice
      );

      return position.state;
    }

    if (
      !Number.isFinite(notice.timestamp) ||
      notice.timestamp <= 0
    ) {
      console.error(
        "[EXECUTION_TRUTH] invalid timestamp"
      );

      return position.state;
    }

    const dedupeKey =
      `${positionId}:${notice.noticeId}`;

    if (
      this.processedExecutionNoticeIds.has(
        dedupeKey
      )
    ) {
      // Broker/websocket retry.
      // Do NOT apply quantity twice.
      return position.state;
    }

    // ------------------------------------------------------------
    // BUY FILL
    // ------------------------------------------------------------

    if (notice.side === "BUY") {
      this.processedExecutionNoticeIds.add(
        dedupeKey
      );

      position.quantities.buyFilledQty +=
        notice.execQty;

      position.quantities.currentPositionQty +=
        notice.execQty;

      position.quantities.remainingPositionQty =
        position.quantities.currentPositionQty;

      if (
        position.quantities.buyFilledQty >=
        position.quantities.requestedBuyQty
      ) {
        position.state = "BUY_FILLED";

        position.state =
          PositionStateMachine.evaluateNextState({
            state: "BUY_FILLED",
            symbol: position.symbol,
            strategyId: position.strategyId,

            entryPrice: position.entryPrice,
            currentPrice: notice.execPrice,

            highestPriceSinceBuy:
              position.highestPriceSinceBuy,

            initialStopPrice:
              position.initialStopPrice,

            trailingFloorPrice:
              position.trailingFloor,

            quantities: position.quantities,

            exitEvidence:
              position.lastExitEvidence
          });
      } else {
        position.state = "BUY_PARTIAL";
      }

      position.updatedAt = Date.now();

      return position.state;
    }

    // ------------------------------------------------------------
    // SELL FILL
    // ------------------------------------------------------------

    if (notice.side === "SELL") {
      if (
        notice.execQty >
        position.quantities.currentPositionQty
      ) {
        console.error(
          `[EXECUTION_TRUTH] impossible sell fill: ` +
          `execQty=${notice.execQty}, ` +
          `positionQty=${position.quantities.currentPositionQty}`
        );

        // Do not mutate an inconsistent position.
        // Account reconciliation should handle this.
        return position.state;
      }

      this.processedExecutionNoticeIds.add(
        dedupeKey
      );

      position.quantities.sellFilledQty +=
        notice.execQty;

      position.quantities.currentPositionQty =
        Math.max(
          0,
          position.quantities.currentPositionQty -
            notice.execQty
        );

      position.quantities.remainingPositionQty =
        position.quantities.currentPositionQty;

      if (
        position.quantities.currentPositionQty ===
        0
      ) {
        position.state = "CLOSED";
      } else {
        position.state = "SELL_PARTIAL";
      }

      position.updatedAt = Date.now();

      return position.state;
    }

    return position.state;
  }
}

export const livePositionRuntimeService = new LivePositionRuntimeService();
