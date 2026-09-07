// AISTOCK v13.6 Online Ensemble Weight Engine
// Dynamically adjusts model ensemble weights per market and timeframe based on rolling performance.

export type EnsembleModelName =
  | "LIGHTGBM"
  | "TREND"
  | "MOMENTUM"
  | "PATTERN"
  | "VOLUME"
  | "STRUCTURE";

export interface ModelPerformanceState {
  weight: number;
  correct: number;
  total: number;
}

export class OnlineEnsembleWeightEngine {
  // Nested map: market -> timeframe -> model -> ModelPerformanceState
  private performanceMap: Map<string, Map<string, Record<EnsembleModelName, ModelPerformanceState>>> = new Map();

  private defaultModels(): Record<EnsembleModelName, ModelPerformanceState> {
    return {
      LIGHTGBM: { weight: 0.30, correct: 0, total: 0 },
      TREND: { weight: 0.18, correct: 0, total: 0 },
      MOMENTUM: { weight: 0.15, correct: 0, total: 0 },
      PATTERN: { weight: 0.12, correct: 0, total: 0 },
      VOLUME: { weight: 0.12, correct: 0, total: 0 },
      STRUCTURE: { weight: 0.13, correct: 0, total: 0 }
    };
  }

  private getModels(market = "KOREA", timeframe = "15m"): Record<EnsembleModelName, ModelPerformanceState> {
    const m = market.toUpperCase();
    const tf = timeframe.toLowerCase();

    if (!this.performanceMap.has(m)) {
      this.performanceMap.set(m, new Map());
    }
    const tfMap = this.performanceMap.get(m)!;

    if (!tfMap.has(tf)) {
      tfMap.set(tf, this.defaultModels());
    }

    return tfMap.get(tf)!;
  }

  /**
   * Record outcome for a specific model prediction
   */
  public update(
    model: EnsembleModelName,
    correct: boolean,
    market = "KOREA",
    timeframe = "15m"
  ): void {
    const models = this.getModels(market, timeframe);
    const item = models[model];
    if (!item) return;

    item.total++;
    if (correct) item.correct++;

    const accuracy = item.correct / item.total;
    const targetWeight = 0.05 + accuracy * 0.30;

    // Smooth adjustment with bounds [0.05, 0.35]
    item.weight = Math.max(0.05, Math.min(0.35, item.weight * 0.9 + targetWeight * 0.1));

    this.normalize(models);
  }

  private normalize(models: Record<EnsembleModelName, ModelPerformanceState>): void {
    const entries = Object.values(models);
    const totalSum = entries.reduce((sum, p) => sum + p.weight, 0);

    if (totalSum <= 0) return;

    for (const p of entries) {
      p.weight = p.weight / totalSum;
    }
  }

  /**
   * Score an ensemble input across models to produce unified probability (0.0 to 1.0)
   */
  public score(
    inputs: Partial<Record<EnsembleModelName, number>>,
    market = "KOREA",
    timeframe = "15m"
  ): number {
    const models = this.getModels(market, timeframe);
    let weightedTotal = 0;
    let activeWeightSum = 0;

    for (const [modelName, modelScore] of Object.entries(inputs)) {
      if (typeof modelScore !== "number" || !Number.isFinite(modelScore)) continue;

      const mName = modelName as EnsembleModelName;
      const mState = models[mName];
      if (mState) {
        weightedTotal += modelScore * mState.weight;
        activeWeightSum += mState.weight;
      }
    }

    if (activeWeightSum <= 0) return 0.5;

    const finalScore = weightedTotal / activeWeightSum;
    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * Retrieve weights for a given market & timeframe
   */
  public getWeights(market = "KOREA", timeframe = "15m"): Record<EnsembleModelName, ModelPerformanceState> {
    const models = this.getModels(market, timeframe);
    return JSON.parse(JSON.stringify(models));
  }
}

export const globalOnlineEnsembleWeightEngine = new OnlineEnsembleWeightEngine();
