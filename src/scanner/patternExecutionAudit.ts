import { BULLISH_PATTERN_CATALOG } from "../lib/bullishMasterEngine";
import { BEARISH_PATTERN_CATALOG } from "../lib/bearishMasterEngine";
import { VERIFIED_PATTERN_REGISTRY } from "./verifiedPatternEngine";
import { VERIFIED_STRUCTURE_PATTERN_REGISTRY } from "./verifiedStructurePatternEngine";
import { MASTER_EXECUTABLE_PATTERN_RULES } from "./masterPatternDetectionEngine";
import { MASTER_PATTERN_EXPANSION_RULES } from "./masterPatternExpansionEngine";

export type PatternAuditDirection = "BULLISH" | "BEARISH";

export type PatternExecutionAuditRow = {
  code: string;
  nameKr: string;
  nameEn: string;
  direction: PatternAuditDirection;
  category: string;
  executable: boolean;
  engines: string[];
};

export type PatternDirectionMismatch = {
  code: string;
  catalogDirection: PatternAuditDirection;
  executableDirections: PatternAuditDirection[];
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function executionKey(code: string, direction: PatternAuditDirection): string {
  return `${direction}:${normalizeCode(code)}`;
}

function addEngine(
  map: Map<string, Set<string>>,
  code: string,
  direction: string,
  engine: string,
) {
  if (direction !== "BULLISH" && direction !== "BEARISH") return;
  const normalized = normalizeCode(code);
  if (!normalized) return;
  const key = executionKey(normalized, direction);
  const engines = map.get(key) ?? new Set<string>();
  engines.add(engine);
  map.set(key, engines);
}

export function buildPatternExecutionAudit() {
  const engineMap = new Map<string, Set<string>>();

  for (const pattern of VERIFIED_PATTERN_REGISTRY) {
    addEngine(engineMap, pattern.id, pattern.direction, "CANDLE");
  }
  for (const pattern of VERIFIED_STRUCTURE_PATTERN_REGISTRY) {
    addEngine(engineMap, pattern.id, pattern.direction, "STRUCTURE");
  }
  for (const pattern of MASTER_EXECUTABLE_PATTERN_RULES) {
    addEngine(engineMap, pattern.id, pattern.direction, "MASTER");
  }
  for (const pattern of MASTER_PATTERN_EXPANSION_RULES) {
    addEngine(engineMap, pattern.id, pattern.direction, "EXPANSION");
  }

  const catalogRows: PatternExecutionAuditRow[] = [
    ...BULLISH_PATTERN_CATALOG.map((pattern) => {
      const key = executionKey(pattern.code, "BULLISH");
      return {
        code: pattern.code,
        nameKr: pattern.nameKr,
        nameEn: pattern.nameEn,
        direction: "BULLISH" as const,
        category: pattern.category,
        executable: engineMap.has(key),
        engines: Array.from(engineMap.get(key) ?? []),
      };
    }),
    ...BEARISH_PATTERN_CATALOG.map((pattern) => {
      const key = executionKey(pattern.code, "BEARISH");
      return {
        code: pattern.code,
        nameKr: pattern.nameKr,
        nameEn: pattern.nameEn,
        direction: "BEARISH" as const,
        category: pattern.category,
        executable: engineMap.has(key),
        engines: Array.from(engineMap.get(key) ?? []),
      };
    }),
  ];

  const deduped = Array.from(
    new Map(catalogRows.map((row) => [executionKey(row.code, row.direction), row])).values(),
  );

  const catalogKeys = new Set(deduped.map((row) => executionKey(row.code, row.direction)));
  const orphanExecutableRules = Array.from(engineMap.keys()).filter((key) => !catalogKeys.has(key));

  const executableDirectionsByCode = new Map<string, Set<PatternAuditDirection>>();
  for (const key of engineMap.keys()) {
    const separator = key.indexOf(":");
    const direction = key.slice(0, separator) as PatternAuditDirection;
    const code = key.slice(separator + 1);
    const directions = executableDirectionsByCode.get(code) ?? new Set<PatternAuditDirection>();
    directions.add(direction);
    executableDirectionsByCode.set(code, directions);
  }

  const directionMismatches: PatternDirectionMismatch[] = deduped
    .filter((row) => !row.executable)
    .map((row) => {
      const executableDirections = Array.from(executableDirectionsByCode.get(normalizeCode(row.code)) ?? []);
      return {
        code: row.code,
        catalogDirection: row.direction,
        executableDirections,
      };
    })
    .filter((row) => row.executableDirections.length > 0);

  const notImplemented = deduped.filter((row) => !row.executable);
  const executable = deduped.filter((row) => row.executable);

  return {
    catalog: deduped.length,
    executable: executable.length,
    notImplemented: notImplemented.length,
    coveragePct: deduped.length > 0 ? Math.round((executable.length / deduped.length) * 1000) / 10 : 0,
    bullishCatalog: deduped.filter((row) => row.direction === "BULLISH").length,
    bearishCatalog: deduped.filter((row) => row.direction === "BEARISH").length,
    executableRows: executable,
    notImplementedRows: notImplemented,
    orphanExecutableRules,
    orphanExecutableCodes: orphanExecutableRules,
    directionMismatches,
    rows: deduped,
  };
}

export const PATTERN_EXECUTION_AUDIT = buildPatternExecutionAudit();
