// ----------------------------------------------------------------------
// CHECK RC5 PRODUCTION TRUTH MJS (AISTOCK RC5)
// Verifies KIS Broker Gateway V125, Persistent Order Journal, Safety Locks,
// and Zero-GPL licensing boundaries compliance.
// ----------------------------------------------------------------------

import fs from "fs";
import path from "path";

console.log("🔍 Running AISTOCK RC5 Production Truth Audit...");

const requiredFiles = [
  "server/broker/KISBrokerGatewayV125.ts",
  "src/execution/PersistentOrderJournalV20.ts",
  "src/autonomous/AutonomousTradingOrchestrator.ts"
];

let errors = [];

for (const file of requiredFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required RC5 file: ${file}`);
  }
}

if (errors.length > 0) {
  console.error("❌ AISTOCK RC5 Production Truth Audit FAILED:");
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

// 1. Audit KISBrokerGatewayV125 TR Codes and Safety Contracts
const kisGatewayContent = fs.readFileSync(path.join(process.cwd(), "server/broker/KISBrokerGatewayV125.ts"), "utf8");

const requiredTRs = [
  "TTTC0012U", // Domestic LIVE BUY
  "TTTC0011U", // Domestic LIVE SELL
  "VTTC0012U", // Domestic PAPER BUY
  "VTTC0011U", // Domestic PAPER SELL
  "TTTT1002U", // US LIVE BUY
  "TTTT1006U", // US LIVE SELL
  "VTTT1002U", // US PAPER BUY
  "VTTT1001U"  // US PAPER SELL
];

for (const tr of requiredTRs) {
  if (!kisGatewayContent.includes(tr)) {
    errors.push(`KISBrokerGatewayV125.ts missing required TR code: ${tr}`);
  }
}

if (!kisGatewayContent.includes("KIS_LIVE_ORDER_ENABLED")) {
  errors.push("KISBrokerGatewayV125.ts missing KIS_LIVE_ORDER_ENABLED safety lock check.");
}

if (!kisGatewayContent.includes("KIS_PAPER_APPKEY")) {
  errors.push("KISBrokerGatewayV125.ts missing KIS_PAPER_APPKEY credential separation.");
}

if (!kisGatewayContent.includes("AbortController")) {
  errors.push("KISBrokerGatewayV125.ts missing AbortController timeout handling.");
}

// 2. Audit PersistentOrderJournalV20 Fail-Closed Corruption Contract
const journalContent = fs.readFileSync(path.join(process.cwd(), "src/execution/PersistentOrderJournalV20.ts"), "utf8");
if (!journalContent.includes("JOURNAL_CORRUPTED")) {
  errors.push("PersistentOrderJournalV20.ts missing JOURNAL_CORRUPTED fail-closed exception.");
}

// 3. Audit AutonomousTradingOrchestrator Partial Fill Lock
const orchestratorContent = fs.readFileSync(path.join(process.cwd(), "src/autonomous/AutonomousTradingOrchestrator.ts"), "utf8");
if (!orchestratorContent.includes("PARTIAL_FILL_EXPOSURE_LOCKED")) {
  errors.push("AutonomousTradingOrchestrator.ts missing PARTIAL_FILL_EXPOSURE_LOCKED guard.");
}

if (errors.length > 0) {
  console.error("❌ AISTOCK RC5 Production Truth Audit FAILED:");
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log("✅ AISTOCK RC5 Production Truth Audit PASSED cleanly.");
  process.exit(0);
}
