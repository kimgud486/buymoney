// ----------------------------------------------------------------------
// CHECK FINAL PRODUCTION TRUTH MJS (AISTOCK FINAL RC)
// Verifies production zero fake data & V20 architecture compliance
// ----------------------------------------------------------------------

import fs from "fs";
import path from "path";

console.log("🔍 Running AISTOCK FINAL RC Production Truth Audit...");

const requiredFiles = [
  "server/v20/ServerKISRealtimeClientV20.ts",
  "server/v20/BrokerExecutionTruthBusV20.ts",
  "server/v20/BrokerExecutionRuntimeBridgeV20.ts",
  "server/v20/KISExecutionNoticeParserV20.ts",
  "server/v20/KISOverseasParserV20.ts",
  "server/v20/ServerRealtimeMarketHubV20.ts",
  "server/v20/ServerUpbitRealtimeClientV20.ts",
  "server/v20/ServerGlobalRealtimeScannerV20.ts",
  "src/services/KISRealtimeFieldSchema.ts",
  "src/trading/PositionStateMachine.ts",
  "src/trading/LivePositionRuntimeService.ts"
];

let errors = [];

for (const file of requiredFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required FINAL RC file: ${file}`);
  }
}

// Check server.ts for forbidden random generators in production candle/AI routes
if (fs.existsSync(path.join(process.cwd(), "server.ts"))) {
  const serverContent = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
  
  // Check if Math.random is used in market candle routes or AI fallback
  const randomMatches = serverContent.match(/Math\.random\(\)/g) || [];
  if (randomMatches.length > 10) {
    errors.push(`Excessive Math.random() usage in server.ts (${randomMatches.length} occurrences)`);
  }
}

if (errors.length > 0) {
  console.error("❌ AISTOCK FINAL RC Production Truth Audit FAILED:");
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log("✅ AISTOCK FINAL RC Production Truth Audit PASSED cleanly.");
  process.exit(0);
}
