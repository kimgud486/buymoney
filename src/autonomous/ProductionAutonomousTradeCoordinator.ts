import { OpenSourceSignalEnsemble, EnsembleEvaluationResult } from "./OpenSourceSignalEnsemble";
import { ProductionAutonomyGate, ProductionAutonomyGateInput, TradingMode } from "./ProductionAutonomyGate";
import { ExplainableTradeIdea } from "../scanner/ExplainableOpportunityScannerEngine";

export interface AutonomousCandidateSource {
  scanYesOnly(limit: number): Promise<Array<Partial<ExplainableTradeIdea>>>;
}

export interface AccountRiskSnapshot {
  verifiedCash: number;
  verifiedEquity: number;
  currentPositionValue: number;
  dailyPnl: number;
  drawdownPct: number;
  existingOpenOrderKeys: string[];
}

export interface AutonomousRiskAdapter {
  getSnapshot(symbol: string): Promise<AccountRiskSnapshot>;
  validateOrder(input: {
    symbol: string;
    market: string;
    side: "BUY" | "SELL";
    qty: number;
    price: number;
    snapshot: AccountRiskSnapshot;
  }): Promise<{ allowed: boolean; reasons: string[] }>;
}

export interface AutonomousBrokerAdapter {
  submitOrder(input: {
    symbol: string;
    market: string;
    side: "BUY" | "SELL";
    qty: number;
    price: number;
    clientOrderKey: string;
  }): Promise<{ accepted: boolean; brokerOrderId?: string; reason?: string }>;
}

export interface CoordinatorConfig {
  mode: TradingMode;
  maxCandidates: number;
  maxPositionWeight: number;
  minEnsembleScore: number;
  gate: ProductionAutonomyGateInput;
}

export interface CoordinatorDecision {
  symbol: string;
  status: "SKIP" | "RECOMMEND" | "BLOCKED" | "ORDER_SUBMITTED";
  evaluation: EnsembleEvaluationResult;
  reasons: string[];
  brokerOrderId?: string;
  clientOrderKey?: string;
}

const roundQty = (cash: number, price: number, maxWeight: number): number => {
  if (!Number.isFinite(cash) || !Number.isFinite(price) || cash <= 0 || price <= 0) return 0;
  const budget = Math.max(0, cash * Math.min(Math.max(maxWeight, 0), 1));
  return Math.floor(budget / price);
};

/**
 * Single authoritative coordinator for:
 * YES scanner -> ensemble verification -> activation gate -> account risk -> broker.
 *
 * The coordinator is dependency-injected so production can wire only real server-side
 * broker/risk adapters, while tests can use harmless fakes. It never fabricates market data.
 */
export class ProductionAutonomousTradeCoordinator {
  constructor(
    private readonly source: AutonomousCandidateSource,
    private readonly risk: AutonomousRiskAdapter,
    private readonly broker: AutonomousBrokerAdapter,
  ) {}

  async run(config: CoordinatorConfig): Promise<CoordinatorDecision[]> {
    const candidates = await this.source.scanYesOnly(config.maxCandidates);
    const gateResult = ProductionAutonomyGate.evaluate({ ...config.gate, mode: config.mode });
    const decisions: CoordinatorDecision[] = [];

    for (const candidate of candidates) {
      const evaluation = OpenSourceSignalEnsemble.evaluateCandidate(candidate);
      const symbol = evaluation.symbol;

      if (
        evaluation.decision !== "YES" &&
        evaluation.decision !== "REVIEW_READY"
      ) {
        decisions.push({
          symbol,
          status: "SKIP",
          evaluation,
          reasons: evaluation.riskReasons.length ? evaluation.riskReasons : ["ENSEMBLE_NOT_YES"],
        });
        continue;
      }

      if (evaluation.ensembleScore < config.minEnsembleScore) {
        decisions.push({
          symbol,
          status: "SKIP",
          evaluation,
          reasons: [`ENSEMBLE_SCORE_BELOW_${config.minEnsembleScore}`],
        });
        continue;
      }

      if (config.mode !== "AUTO_LIVE") {
        decisions.push({
          symbol,
          status: "RECOMMEND",
          evaluation,
          reasons: [config.mode === "ANALYSIS" ? "ANALYSIS_ONLY" : "HUMAN_APPROVAL_REQUIRED"],
        });
        continue;
      }

      if (!gateResult.canSubmitLiveOrder) {
        decisions.push({
          symbol,
          status: "BLOCKED",
          evaluation,
          reasons: gateResult.blockers,
        });
        continue;
      }

      const snapshot = await this.risk.getSnapshot(symbol);
      const qty = roundQty(snapshot.verifiedCash, evaluation.entryPrice, config.maxPositionWeight);
      if (qty <= 0) {
        decisions.push({
          symbol,
          status: "BLOCKED",
          evaluation,
          reasons: ["INSUFFICIENT_VERIFIED_CASH"],
        });
        continue;
      }

      const clientOrderKey = [
        "AUTO",
        symbol,
        evaluation.evaluatedAt.slice(0, 16),
        evaluation.entryPrice,
      ].join(":");

      if (snapshot.existingOpenOrderKeys.includes(clientOrderKey)) {
        decisions.push({
          symbol,
          status: "BLOCKED",
          evaluation,
          reasons: ["DUPLICATE_OPEN_ORDER"],
          clientOrderKey,
        });
        continue;
      }

      const riskResult = await this.risk.validateOrder({
        symbol,
        market: evaluation.market,
        side: "BUY",
        qty,
        price: evaluation.entryPrice,
        snapshot,
      });

      if (!riskResult.allowed) {
        decisions.push({
          symbol,
          status: "BLOCKED",
          evaluation,
          reasons: riskResult.reasons,
          clientOrderKey,
        });
        continue;
      }

      const order = await this.broker.submitOrder({
        symbol,
        market: evaluation.market,
        side: "BUY",
        qty,
        price: evaluation.entryPrice,
        clientOrderKey,
      });

      decisions.push({
        symbol,
        status: order.accepted ? "ORDER_SUBMITTED" : "BLOCKED",
        evaluation,
        reasons: order.accepted ? [] : [order.reason || "BROKER_REJECTED"],
        brokerOrderId: order.brokerOrderId,
        clientOrderKey,
      });
    }

    return decisions;
  }
}
