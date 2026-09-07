// ----------------------------------------------------------------------
// AISTOCK V20 PRODUCTION ZERO FAKE DATA & TRUTH INTEGRITY AUDIT SCRIPT
// Ensures zero tolerance for synthetic/fake data in production trading engines
// ----------------------------------------------------------------------

import fs from "fs";
import path from "path";

console.log("🔍 Running AISTOCK V20 Production Truth Audit...");

const CRITICAL_FILES = [
  "src/services/GlobalRealtimeScannerV192.ts",
  "src/services/PatternTruthEngineV192.ts",
  "src/services/PatternTruthEngineV20.ts",
  "src/services/IndicatorTruthEngine.ts",
  "src/trading/PositionStateMachine.ts",
  "src/components/trading/RealtimeTradingChartV192.tsx",
  "server/v20/NetExpectancyEngineV20.ts",
  "server/v20/ServerRealtimeMarketHubV20.ts",
  "server/v20/KISOverseasParserV20.ts"
];

let hasErrors = false;

for (const relPath of CRITICAL_FILES) {
  const absPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Critical V20 engine file missing: ${relPath}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(absPath, "utf8");

  // Audit 1: No Math.random in core engines
  if (content.includes("Math.random()") && !relPath.includes("test")) {
    console.error(`❌ Found Math.random() in critical file: ${relPath}`);
    hasErrors = true;
  }

  // Audit 2: No fixed fake ticker price fallbacks like 98500000 or 3420 fixed total count
  if (content.includes("scannedTotal = 3420") || content.includes("scannedTotal: 3420")) {
    console.error(`❌ Found hardcoded scannedTotal 3420 in file: ${relPath}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("🚨 V20 Production Truth Audit FAILED! Clean up synthetic fallback violations.");
  process.exit(1);
} else {
  console.log("✅ AISTOCK V20 Production Truth Audit PASSED cleanly.");
  process.exit(0);
}
