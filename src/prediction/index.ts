// J.A.R.V.I.S. V4.0 Stage 2 Prediction Engine Index

import { TechnicalIndicatorCalculator, PatternDetector, TripleBarrierLabeler } from "../data";
import { TechnicalScoringEngine } from "./lightgbmEngine";
import { ProbabilityCalibrator } from "./calibration";
import { MetaLabelingFilter, MetaLabelingOutput } from "./metaLabeling";
import { globalLiveCandleIntegrityGate } from "../realtime/LiveCandleIntegrityGate";
import { VerifiedCandle } from "../realtime/MarketCandle";

export * from "./lightgbmEngine";
export * from "./calibration";
export * from "./metaLabeling";
export * from "./PredictionAccuracyTracker";

export interface PipelineExecutionResult {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";
  rawModelOutput: ReturnType<typeof TechnicalScoringEngine.calculate>;
  calibratedOutput: ReturnType<typeof ProbabilityCalibrator.calibrate>;
  tripleBarrierLabel: ReturnType<typeof TripleBarrierLabeler.generateLabel>;
  metaDecision: MetaLabelingOutput;
  executionTimestamp: string;
}

export interface PredictionPipelineInput {
  symbol: string;
  market?: "KOREA" | "US" | "CRYPTO";
  candles?: any[];
  indicators?: any;
  patterns?: any;
  sectorName?: string;
  currentSectorExposurePct?: number;
  requireRealData?: boolean;
}

/**
 * Modern Prediction Pipeline enforcing real candle provenance verification via LiveCandleIntegrityGate.
 */
export function runPredictionPipeline(input: PredictionPipelineInput): PipelineExecutionResult {
  const symbol = input.symbol || "005930";
  const market = input.market || "KOREA";
  const sectorName = input.sectorName || "IT / 반도체";
  const currentSectorExposurePct = input.currentSectorExposurePct ?? 35.0;

  const candles = input.candles;

  // Strict Real Market Data & Provenance Enforcement
  if (!candles || !Array.isArray(candles) || candles.length < 30) {
    throw new Error(
      `REAL_MARKET_DATA_REQUIRED: Minimum 30 verified real candles required for prediction pipeline. Provided: ${
        candles ? candles.length : 0
      }`
    );
  }

  // Validate candle provenance
  globalLiveCandleIntegrityGate.assertCandles(
    candles as VerifiedCandle[],
    symbol,
    market as any
  );

  const indicators = input.indicators || TechnicalIndicatorCalculator.calculateAll(candles);
  const patterns = input.patterns || PatternDetector.detect(candles);
  const tripleBarrier = TripleBarrierLabeler.generateLabel(candles);

  const rawModel = TechnicalScoringEngine.calculate(candles, indicators, patterns);
  const calibrated = ProbabilityCalibrator.calibrate(rawModel.score, "LIGHTGBM", rawModel.probabilityVerified);

  const metaDecision = MetaLabelingFilter.evaluate({
    symbol,
    market,
    calibratedResult: calibrated,
    riskRewardRatio: 2.35,
    sectorName,
    currentSectorExposurePct,
    volatilityAnomalous: false,
    modelAgreementPct: rawModel.modelAgreement,
    probabilityVerified: rawModel.probabilityVerified
  });

  return {
    symbol,
    market,
    rawModelOutput: rawModel,
    calibratedOutput: calibrated,
    tripleBarrierLabel: tripleBarrier,
    metaDecision,
    executionTimestamp: new Date().toISOString()
  };
}

/**
 * Executes full End-to-End J.A.R.V.I.S. V4.0 Stage 1 + Stage 2 Data & Prediction Pipeline
 */
export function runJarvisV4Pipeline(
  symbol: string,
  market: "KOREA" | "US" | "CRYPTO" = "KOREA",
  sectorName: string = "IT / 반도체",
  currentSectorExposurePct: number = 35.0,
  providedCandles?: any[]
): PipelineExecutionResult {
  return runPredictionPipeline({
    symbol,
    market,
    sectorName,
    currentSectorExposurePct,
    candles: providedCandles
  });
}
