// AISTOCK v13.6 Setup Quality Engine
// Scores trading setup quality (0 to 100) and assigns grade (S, A+, A, B, WATCH, NO_SETUP)

export interface SetupQualityInput {
  relativeStrength: number;     // e.g. 0.0 to 1.0 (relative to benchmark)
  rvol: number;                 // Relative volume (e.g. 1.0 = normal, 3.0 = 3x)
  aboveVWAP: boolean;
  breakoutValid: boolean;
  retestValid: boolean;
  firstPullback: boolean;
  orbValid: boolean;
  sectorLeader: boolean;
  themeLeader: boolean;
  volumeExpansion: boolean;
  falseBreakoutRisk: number;    // 0.0 to 1.0
  chaseRisk: number;            // 0.0 to 1.0
  exhaustionRisk: number;       // 0.0 to 1.0
}

export interface SetupQualityResult {
  score: number;
  grade: "S" | "A+" | "A" | "B" | "WATCH" | "NO_SETUP";
  details: {
    positiveBonus: number;
    negativeDeductions: number;
  };
}

export function calculateSetupQuality(input: SetupQualityInput): SetupQualityResult {
  let score = 0;
  let positiveBonus = 0;
  let negativeDeductions = 0;

  // Positive Drivers
  const rsBonus = Math.min(20, Math.max(0, input.relativeStrength) * 20);
  score += rsBonus;
  positiveBonus += rsBonus;

  const rvolBonus = Math.min(15, (Math.max(0, input.rvol) / 3.0) * 15);
  score += rvolBonus;
  positiveBonus += rvolBonus;

  if (input.aboveVWAP) { score += 10; positiveBonus += 10; }
  if (input.breakoutValid) { score += 10; positiveBonus += 10; }
  if (input.retestValid) { score += 10; positiveBonus += 10; }
  if (input.firstPullback) { score += 10; positiveBonus += 10; }
  if (input.orbValid) { score += 5; positiveBonus += 5; }
  if (input.sectorLeader) { score += 7; positiveBonus += 7; }
  if (input.themeLeader) { score += 5; positiveBonus += 5; }
  if (input.volumeExpansion) { score += 8; positiveBonus += 8; }

  // Negative Deductions
  const falseBreakDeduction = Math.max(0, input.falseBreakoutRisk) * 15;
  score -= falseBreakDeduction;
  negativeDeductions += falseBreakDeduction;

  const chaseDeduction = Math.max(0, input.chaseRisk) * 15;
  score -= chaseDeduction;
  negativeDeductions += chaseDeduction;

  const exhaustionDeduction = Math.max(0, input.exhaustionRisk) * 10;
  score -= exhaustionDeduction;
  negativeDeductions += exhaustionDeduction;

  score = Math.round(Math.max(0, Math.min(100, score)));

  let grade: SetupQualityResult["grade"] = "NO_SETUP";
  if (score >= 90) grade = "S";
  else if (score >= 80) grade = "A+";
  else if (score >= 70) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 50) grade = "WATCH";

  return {
    score,
    grade,
    details: {
      positiveBonus: Math.round(positiveBonus),
      negativeDeductions: Math.round(negativeDeductions)
    }
  };
}
