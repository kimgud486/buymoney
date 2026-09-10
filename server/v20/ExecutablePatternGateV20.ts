import { PATTERN_EXECUTION_AUDIT } from "../../src/scanner/patternExecutionAudit";

export interface ExecutablePatternGateResultV20 {
  passed: boolean;
  catalogCount: number;
  executableCount: number;
  coveragePct: number;
  suppliedPatterns: string[];
  executableMatches: string[];
  nonExecutableOrUnknown: string[];
  blockers: string[];
}

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

const executableCodes = new Set(
  PATTERN_EXECUTION_AUDIT.executableRows.map((row) => normalize(row.code))
);

/**
 * Truth gate between the pattern catalog and final V20 BUY authority.
 * A displayed/registered pattern is not evidence unless at least one real
 * executable rule exists for that code in the audited engines.
 */
export class ExecutablePatternGateV20 {
  public static evaluate(patterns?: string[]): ExecutablePatternGateResultV20 {
    const suppliedPatterns = Array.from(
      new Set((patterns || []).map((x) => normalize(String(x))).filter(Boolean))
    );

    const executableMatches = suppliedPatterns.filter((code) => executableCodes.has(code));
    const nonExecutableOrUnknown = suppliedPatterns.filter((code) => !executableCodes.has(code));
    const blockers: string[] = [];

    if (suppliedPatterns.length === 0) blockers.push("NO_PATTERN_EVIDENCE");
    if (executableMatches.length === 0) blockers.push("NO_EXECUTABLE_PATTERN_MATCH");
    if (nonExecutableOrUnknown.length > 0) {
      blockers.push(`NON_EXECUTABLE_PATTERN:${nonExecutableOrUnknown.join(",")}`);
    }

    return {
      passed: executableMatches.length > 0,
      catalogCount: PATTERN_EXECUTION_AUDIT.catalog,
      executableCount: PATTERN_EXECUTION_AUDIT.executable,
      coveragePct: PATTERN_EXECUTION_AUDIT.coveragePct,
      suppliedPatterns,
      executableMatches,
      nonExecutableOrUnknown,
      blockers
    };
  }
}
