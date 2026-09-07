// ----------------------------------------------------------------------
// ZERO FAKE DATA PRODUCTION AUDIT SCRIPT V4 (AISTOCK V19.1 TRUTH-FIRST)
// ----------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  path.resolve("src"),
  path.resolve("server"),
  path.resolve("server.ts")
];

const forbidden = [
  /tradeValue\s*\*\s*0\.1/,
  /SAMPLE_FLOW_DATA/,
  /m1:\s*true/,
  /ORD-LIVE-\$\{/,
  /price:\s*73800\b/,
  /price:\s*233500\b/,
  /price:\s*98500000\b/,
  /cleanMarket\s*===\s*["']US["']\s*\?\s*150/,
  /curPrice\s*\*\s*1\.0\d+/,
  /fakeBreakoutRiskPct:\s*3\.8/,
  /totalRelScore\s*=\s*93/,
  /PRESET_STOCKS/,
  /stock\.rvol\s*\|\|\s*1\.2/,
  /sma5:\s*price\s*\*\s*0\.99/,
  /sma20:\s*price\s*\*\s*0\.97/,
  /sma60:\s*price\s*\*\s*0\.93/,
  /high52w:\s*price\s*\*\s*1\.08/,
  /low52w:\s*price\s*\*\s*0\.75/,
  /vwap:\s*price\s*\*\s*0\.995/,
  /krxBenchmarkReturn\s*=\s*0\.5/,
  /usBenchmarkReturn\s*=\s*0\.8/,
  /getQuote\(["']005930["']\)/,
  /getSessionInfo\(symbol\)/,
  /fakeCvd\b/,
  /syntheticCvd\b/,
  /estimatedOrderFlow\b/,
  /PRDY_SIGN\s*===.*"BUY"/,
  /fakeAggressor\b/,
  /fakeExecutionNotice\b/,
  /estimatedInstitutionalFlow\b/,
  /syntheticLiveCandle\b/,
  /syntheticOrb\b/,
  /hardcodedBenchmark\b/,
  /fakeDelta\b/,
  /fakeRvol\b/,
  /generateSynthetic\b/,
  /simulatedFill\b/,
  /mockPrice\b/,

  // V19.1 Strict Rules
  /1,250,400\s*주/,
  /currentPrice\s*\*\s*0\.015/,
  /validProjections\[0\]\s*\*\s*1\.0[12]/,
  /rvol\s*\?\?\s*1\.0/,
  /vwap\s*\?\?\s*price/,
  /breakoutConfirmed:\s*true\b/,
  /scannedTotal\s*:\s*3420/,
  /makeMeta\s*\(\s*["']BB_BANDWIDTH["']\s*,\s*3\.5\s*\)/,
  /aiMatchScore\s*:\s*\+\s*\(\s*8[56]/
];

const allowedFolders = [
  `${path.sep}demo${path.sep}`,
  `${path.sep}test${path.sep}`,
  `${path.sep}tests${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
  `GlobalRealtimeScannerV188.ts` // Ignore legacy file when auditing new V19.1 codebase
];

let failed = false;

function scanPath(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);

  if (stat.isFile()) {
    scanFile(p);
    return;
  }

  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) {
        scanPath(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        scanFile(full);
      }
    }
  }
}

function scanFile(fullPath) {
  if (allowedFolders.some((folder) => fullPath.includes(folder))) {
    return;
  }

  const text = fs.readFileSync(fullPath, "utf8");

  // Core production engine rule: trading, services, realtime, and server engines MUST NOT import from demo
  if (/(src[\\/](trading|services|realtime)|server[\\/])/.test(fullPath)) {
    if (/from\s+["'].*\/demo\b/.test(text)) {
      console.error(`❌ CORE PRODUCTION ENGINE IMPORTS DEMO CODE: ${fullPath}`);
      failed = true;
    }
  }

  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      console.error(`❌ FAKE DATA PATTERN FOUND IN PRODUCTION CODE: ${fullPath}`);
      console.error(`   Pattern: ${pattern}`);
      failed = true;
    }
  }
}

console.log("🔍 Running Production Zero Fake Data Audit V4...");
for (const rootPath of ROOTS) {
  scanPath(rootPath);
}

if (failed) {
  console.error("💥 Zero Fake Data Audit V4 FAILED!");
  process.exit(1);
} else {
  console.log("✅ Production Zero Fake Data Audit V4 PASSED cleanly.");
}
