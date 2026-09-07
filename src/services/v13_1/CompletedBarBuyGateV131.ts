// AISTOCK v13.1 Completed Bar Mandatory BUY Safety Gate
// Enforces individual indicator checks so that high overall scores CANNOT override a failed technical indicator!

import {
  BuyGateInputV131,
  BuyGateEvaluationResultV131,
  IndividualCheckStatusV131,
  BuyGateDecisionStateV131
} from "./typesV131";

export class CompletedBarBuyGateV131 {
  public static readonly MIN_SCANNER_SCORE = 72;
  public static readonly MIN_SHAPE_SCORE = 72;
  public static readonly MIN_CONFIRMATION_SCORE = 68;

  /**
   * Evaluates Buy Signal with bulletproof individual confirmation gates.
   */
  public static evaluate(input: BuyGateInputV131): BuyGateEvaluationResultV131 {
    const {
      symbol,
      market,
      scannerScore,
      unifiedShapeScore,
      confirmationScore,
      direction,
      indicators,
      freshness,
      exchangeRoute,
      riskApproved,
      discoveryMode = "SCANNER"
    } = input;

    // 1. Total Scores Check
    const scannerPass = discoveryMode === "MANUAL" ? true : scannerScore >= this.MIN_SCANNER_SCORE;
    const shapePass = unifiedShapeScore >= this.MIN_SHAPE_SCORE;
    const confirmPass = confirmationScore >= this.MIN_CONFIRMATION_SCORE;
    const directionPass = direction === "BULLISH";

    const totalScoresPass = scannerPass && shapePass && confirmPass && directionPass;

    // 2. Individual Indicator Checks (No single failure can be masked by high overall score)
    const checks: IndividualCheckStatusV131 = {
      vwapOk: indicators?.isVwapAbove ?? false,
      emaOk: indicators?.isEmaBullishTrend ?? false,
      macdOk: indicators?.isMacdBullishCross ?? false,
      rsiOk: typeof indicators?.rsi14 === "number" && indicators.rsi14 >= 40 && indicators.rsi14 <= 75,
      rvolOk: typeof indicators?.rvol === "number" && indicators.rvol >= 1.0,
      hhHlOk: indicators?.structure === "HH_HL",
      completedBarOk: freshness?.completedBarCount >= 50,
      freshDataOk: freshness?.allowTrading === true && freshness?.staleSeconds <= 15,
      riskApproved: riskApproved === true,
      exchangeOk: exchangeRoute?.allowKisRouting === true
    };

    const failedChecks: string[] = [];

    if (!scannerPass) failedChecks.push(`ScannerScore(${scannerScore} < ${this.MIN_SCANNER_SCORE})`);
    if (!shapePass) failedChecks.push(`ShapeScore(${unifiedShapeScore} < ${this.MIN_SHAPE_SCORE})`);
    if (!confirmPass) failedChecks.push(`ConfirmationScore(${confirmationScore} < ${this.MIN_CONFIRMATION_SCORE})`);
    if (!directionPass) failedChecks.push(`DirectionNotBullish(${direction})`);

    if (!checks.vwapOk) failedChecks.push("VWAP_BELOW");
    if (!checks.emaOk) failedChecks.push("EMA_BEARISH_ALIGNMENT");
    if (!checks.macdOk) failedChecks.push("MACD_NO_BULL_CROSS");
    if (!checks.rsiOk) failedChecks.push(`RSI_OUT_OF_RANGE(${indicators?.rsi14 ?? "N/A"})`);
    if (!checks.rvolOk) failedChecks.push(`RVOL_INSUFFICIENT(${indicators?.rvol ?? "N/A"})`);
    if (!checks.hhHlOk) failedChecks.push(`STRUCTURE_NOT_HH_HL(${indicators?.structure ?? "N/A"})`);
    if (!checks.completedBarOk) failedChecks.push(`COMPLETED_BARS_LESS_THAN_50(${freshness?.completedBarCount ?? 0})`);
    if (!checks.freshDataOk) failedChecks.push(`STALE_OR_INVALID_DATA(${freshness?.staleSeconds ?? "N/A"}s)`);
    if (!checks.riskApproved) failedChecks.push("RISK_GATE_REJECTED");
    if (!checks.exchangeOk) failedChecks.push(`EXCHANGE_ROUTE_REJECTED(${exchangeRoute?.rejectionReason || "INVALID_EXCHANGE"})`);

    const allIndividualChecksPass =
      checks.vwapOk &&
      checks.emaOk &&
      checks.macdOk &&
      checks.rsiOk &&
      checks.rvolOk &&
      checks.hhHlOk &&
      checks.completedBarOk &&
      checks.freshDataOk &&
      checks.riskApproved &&
      checks.exchangeOk;

    let decision: BuyGateDecisionStateV131 = "NO BUY";
    let approved = false;

    if (totalScoresPass && allIndividualChecksPass) {
      decision = "BUY APPROVED";
      approved = true;
    } else if (
      totalScoresPass &&
      !allIndividualChecksPass &&
      checks.freshDataOk &&
      checks.completedBarOk &&
      checks.exchangeOk
    ) {
      // High score but failed 1 or more technical indicator checks -> BUY WATCH (NO ORDER ALLOWED)
      decision = "BUY WATCH";
      approved = false;
    } else if (!checks.freshDataOk || !checks.exchangeOk) {
      decision = "LOCKED";
      approved = false;
    } else {
      decision = "NO BUY";
      approved = false;
    }

    const aiSummary = approved
      ? `✅ [BUY APPROVED] 모든 총점 및 ${Object.keys(checks).length}개 개별 지표 안전 관문 100% 통과.`
      : `⛔ [${decision}] 매수 승인 거부. 미충족 결함: ${failedChecks.join(", ")}`;

    return {
      symbol,
      market,
      decision,
      approved,
      totalScoresPass,
      checks,
      failedChecks,
      aiSummary,
      timestamp: new Date().toLocaleTimeString("ko-KR")
    };
  }
}
