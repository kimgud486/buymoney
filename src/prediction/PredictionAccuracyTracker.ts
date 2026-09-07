// AISTOCK v13.5 Prediction Accuracy Tracker
// Tracks forecast vs actual outcomes, computing MAE, MAPE, direction accuracy, and scoreboard metrics.

export interface PredictionRecord {
  id: string;
  symbol: string;
  market: string;
  timeframe: string;
  predictionTime: number; // Timestamp when prediction was made
  targetTime: number;     // Target timestamp for resolution
  sourcePrice: number;    // Price at time of prediction
  predictedPrice: number; // Target price predicted
  predictedDirection: "UP" | "DOWN";
  rawProbability: number;
  calibratedProbability: number;
  actualPrice?: number;
  absoluteError?: number;
  percentageError?: number;
  directionCorrect?: boolean;
  resolved: boolean;
}

export interface PredictionScoreboard {
  total: number;
  resolvedCount: number;
  pendingCount: number;
  directionAccuracyPct: number;
  mae: number;
  mape: number;
  winRatePct: number;
}

export class PredictionAccuracyTracker {
  private records: Map<string, PredictionRecord> = new Map();

  /**
   * Register a new prediction record for tracking
   */
  public register(prediction: Omit<PredictionRecord, "resolved"> & { resolved?: boolean }): PredictionRecord {
    const record: PredictionRecord = {
      ...prediction,
      resolved: prediction.resolved ?? false
    };
    this.records.set(record.id, record);
    return record;
  }

  /**
   * Resolve an outstanding prediction with actual price outcome
   */
  public resolve(id: string, actualPrice: number): PredictionRecord | null {
    const record = this.records.get(id);
    if (!record) return null;

    if (record.resolved) return record; // Already resolved

    const absoluteError = Math.abs(actualPrice - record.predictedPrice);
    const percentageError = record.sourcePrice > 0 
      ? (Math.abs(actualPrice - record.predictedPrice) / record.sourcePrice) * 100 
      : 0;

    const actualDirection: "UP" | "DOWN" = actualPrice >= record.sourcePrice ? "UP" : "DOWN";
    const directionCorrect = actualDirection === record.predictedDirection;

    record.actualPrice = actualPrice;
    record.absoluteError = absoluteError;
    record.percentageError = percentageError;
    record.directionCorrect = directionCorrect;
    record.resolved = true;

    this.records.set(id, record);
    return record;
  }

  /**
   * Retrieve all resolved prediction records
   */
  public getResolved(): PredictionRecord[] {
    return Array.from(this.records.values()).filter(r => r.resolved);
  }

  /**
   * Retrieve all pending prediction records
   */
  public getPending(): PredictionRecord[] {
    return Array.from(this.records.values()).filter(r => !r.resolved);
  }

  /**
   * Get direction forecast accuracy as percentage (0 to 100)
   */
  public getDirectionAccuracy(): number {
    const resolved = this.getResolved();
    if (resolved.length === 0) return 0;
    const correctCount = resolved.filter(r => r.directionCorrect).length;
    return Math.round((correctCount / resolved.length) * 10000) / 100;
  }

  /**
   * Get Mean Absolute Error (MAE)
   */
  public getMAE(): number {
    const resolved = this.getResolved();
    if (resolved.length === 0) return 0;
    const totalAE = resolved.reduce((sum, r) => sum + (r.absoluteError || 0), 0);
    return Math.round((totalAE / resolved.length) * 100) / 100;
  }

  /**
   * Get Mean Absolute Percentage Error (MAPE)
   */
  public getMAPE(): number {
    const resolved = this.getResolved();
    if (resolved.length === 0) return 0;
    const totalPE = resolved.reduce((sum, r) => sum + (r.percentageError || 0), 0);
    return Math.round((totalPE / resolved.length) * 100) / 100;
  }

  /**
   * Get complete prediction performance scoreboard
   */
  public getScoreboard(): PredictionScoreboard {
    const all = Array.from(this.records.values());
    const resolved = all.filter(r => r.resolved);
    const pending = all.filter(r => !r.resolved);
    const directionAccuracyPct = this.getDirectionAccuracy();
    const mae = this.getMAE();
    const mape = this.getMAPE();

    return {
      total: all.length,
      resolvedCount: resolved.length,
      pendingCount: pending.length,
      directionAccuracyPct,
      mae,
      mape,
      winRatePct: directionAccuracyPct
    };
  }

  /**
   * Clear all stored records
   */
  public clear(): void {
    this.records.clear();
  }
}

export const globalPredictionAccuracyTracker = new PredictionAccuracyTracker();
