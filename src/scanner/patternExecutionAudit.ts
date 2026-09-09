import { BULLISH_PATTERN_CATALOG } from "../lib/bullishMasterEngine";
import { BEARISH_PATTERN_CATALOG } from "../lib/bearishMasterEngine";
import { VERIFIED_PATTERN_REGISTRY } from "./verifiedPatternEngine";
import { VERIFIED_STRUCTURE_PATTERN_REGISTRY } from "./verifiedStructurePatternEngine";
import { MASTER_EXECUTABLE_PATTERN_RULES } from "./masterPatternDetectionEngine";

export type PatternExecutionAuditRow = {
  code: string;
  nameKr: string;
  nameEn: string;
  direction: "BULLISH" | "BEARISH";
  category: string;
  executable: boolean;
  engines: string[];
};

function addEngine(map: Map<string, Set<string>>, code: string, engine: string) {
  const key = code.trim().toUpperCase();
  if (!key) return;
  const engines = map.get(key) ?? new Set<string>();
  engines.add(engine);
  map.set(key, engines);
}

export function buildPatternExecutionAudit() {
  const engineMap = new Map<string, Set<string>>();

  for (const pattern of VERIFIED_PATTERN_REGISTRY) {
    addEngine(engineMap, pattern.id, "CANDLE");
  }
  for (const pattern of VERIFIED_STRUCTURE_PATTERN_REGISTRY) {
    addEngine(engineMap, pattern.id, "STRUCTURE");
  }
  for (const pattern of MASTER_EXECUTABLE_PATTERN_RULES) {
    addEngine(engineMap, pattern.id, "MASTER");
  }

  const catalogRows: PatternExecutionAuditRow[] = [
    ...BULLISH_PATTERN_CATALOG.map((pattern) => ({
      code: pattern.code,
      nameKr: pattern.nameKr,
      nameEn: pattern.nameEn,
      direction: "BULLISH" as const,
      category: pattern.category,
      executable: engineMap.has(pattern.code.toUpperCase()),
      engines: Array.from(engineMap.get(pattern.code.toUpperCase()) ?? []),
    })),
    ...BEARISH_PATTERN_CATALOG.map((pattern) => ({
      code: pattern.code,
      nameKr: pattern.nameKr,
      nameEn: pattern.nameEn,
      direction: "BEARISH" as const,
      category: pattern.category,
      executable: engineMap.has(pattern.code.toUpperCase()),
      engines: Array.from(engineMap.get(pattern.code.toUpperCase()) ?? []),
    })),
  ];

  const deduped = Array.from(
    new Map(catalogRows.map((row) => [`${row.direction}:${row.code}`, row])).values(),
  );

  const executableCodes = new Set(engineMap.keys());
  const catalogCodes = new Set(deduped.map((row) => row.code.toUpperCase()));
  const orphanExecutableCodes = Array.from(executableCodes).filter((code) => !catalogCodes.has(code));
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
    orphanExecutableCodes,
    rows: deduped,
  };
}

export const PATTERN_EXECUTION_AUDIT = buildPatternExecutionAudit();
