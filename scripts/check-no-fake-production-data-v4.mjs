// ----------------------------------------------------------------------
// ZERO FAKE DATA PRODUCTION AUDIT SCRIPT V10 (STOCK GPT TRUTH-FIRST)
// Protects realtime truth, scanner counts, market-readiness diagnostics,
// and the Stock GPT UI from silent synthetic fallbacks.
// ----------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

const ROOTS = [path.resolve("src"), path.resolve("server"), path.resolve("server.ts")];

const forbidden = [
  /tradeValue\s*\*\s*0\.1/, /SAMPLE_FLOW_DATA/, /m1:\s*true/, /ORD-LIVE-\$\{/,
  /price:\s*73800\b/, /price:\s*233500\b/, /price:\s*98500000\b/,
  /cleanMarket\s*===\s*["']US["']\s*\?\s*150/, /curPrice\s*\*\s*1\.0\d+/,
  /fakeBreakoutRiskPct:\s*3\.8/, /totalRelScore\s*=\s*93/, /PRESET_STOCKS/,
  /stock\.rvol\s*\|\|\s*1\.2/, /sma5:\s*price\s*\*\s*0\.99/,
  /sma20:\s*price\s*\*\s*0\.97/, /sma60:\s*price\s*\*\s*0\.93/,
  /high52w:\s*price\s*\*\s*1\.08/, /low52w:\s*price\s*\*\s*0\.75/,
  /vwap:\s*price\s*\*\s*0\.995/, /krxBenchmarkReturn\s*=\s*0\.5/,
  /usBenchmarkReturn\s*=\s*0\.8/, /getQuote\(["']005930["']\)/,
  /getSessionInfo\(symbol\)/, /fakeCvd\b/, /syntheticCvd\b/, /estimatedOrderFlow\b/,
  /PRDY_SIGN\s*===.*"BUY"/, /fakeAggressor\b/, /fakeExecutionNotice\b/,
  /estimatedInstitutionalFlow\b/, /syntheticLiveCandle\b/, /syntheticOrb\b/,
  /hardcodedBenchmark\b/, /fakeDelta\b/, /fakeRvol\b/, /generateSynthetic\b/,
  /simulatedFill\b/, /mockPrice\b/, /1,250,400\s*주/, /currentPrice\s*\*\s*0\.015/,
  /validProjections\[0\]\s*\*\s*1\.0[12]/, /rvol\s*\?\?\s*1\.0/,
  /vwap\s*\?\?\s*price/, /breakoutConfirmed:\s*true\b/, /scannedTotal\s*:\s*3420/,
  /makeMeta\s*\(\s*["']BB_BANDWIDTH["']\s*,\s*3\.5\s*\)/,
  /aiMatchScore\s*:\s*\+\s*\(\s*8[56]/
];

const allowedFolders = [
  `${path.sep}demo${path.sep}`,
  `${path.sep}test${path.sep}`,
  `${path.sep}tests${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
  `GlobalRealtimeScannerV188.ts`
];

let failed = false;
function fail(message) { console.error(`❌ ${message}`); failed = true; }

function auditPresetFixture() {
  const presetPath = path.resolve("src/data/presetStocks.ts");
  if (!fs.existsSync(presetPath)) return;
  const text = fs.readFileSync(presetPath, "utf8");
  const requiredEmptyExports = [
    /export const PRESET_CATALOG_STOCKS:\s*PresetStock\[\]\s*=\s*\[\s*\];/,
    /export const DEMO_FIXTURE_STOCKS:\s*PresetStock\[\]\s*=\s*\[\s*\];/
  ];
  if (requiredEmptyExports.some((rule) => !rule.test(text))) {
    fail("src/data/presetStocks.ts must keep production preset/demo stock arrays empty");
  }
}

function auditRealtimeMarketBridge() {
  const bridgePath = path.resolve("src/hooks/useMarketDataBridge.ts");
  if (!fs.existsSync(bridgePath)) return;
  const text = fs.readFileSync(bridgePath, "utf8");
  const forbiddenBridgeShapes = [
    "isConnected: true,\n    latencyMs: 18",
    "bufferCount: 128",
    "currentTick?.price || 50000",
    "currentTick?.changePct || 1.5",
    "data.volume || \"1.2M\"",
    "q.volume || \"1.2M\"",
    "rvol: Number(data.rvol || 2.5)",
    "rvol: 2.5",
    "Math.round(110 + (Math.random() - 0.45) * 20)",
    "Math.round(price * 1.02)",
    "Math.round(price * 0.98)",
    "AI 오토트레이딩 ${signal.type} 시그널 포착"
  ];
  for (const shape of forbiddenBridgeShapes) {
    if (text.includes(shape)) fail(`REALTIME MARKET BRIDGE SYNTHETIC FALLBACK FOUND: ${shape}`);
  }
}

function auditScannerUiTruth() {
  const scannerPath = path.resolve("src/components/ExplainableOpportunityScanner.tsx");
  if (!fs.existsSync(scannerPath)) return;
  const text = fs.readFileSync(scannerPath, "utf8");
  const forbiddenScannerShapes = [
    "data.totalScanned || 29",
    "data.totalScanned ?? 29",
    "15개 하드조건",
    "YES 승인 조건: Profit Opportunity Score 82점",
    "ON (🔥 82점+)"
  ];
  for (const shape of forbiddenScannerShapes) {
    if (text.includes(shape)) fail(`SCANNER UI TRUTH VIOLATION FOUND: ${shape}`);
  }

  const requiredDiagnosticShapes = [
    "/api/ai/hot-list",
    "liveQuoteReady",
    "candle15mReady",
    "시장 준비상태 진단",
    "실행등급 실시간 시세가 아직 들어오지 않았습니다.",
    "15분봉 20개가 아직 준비되지 않았습니다."
  ];
  for (const shape of requiredDiagnosticShapes) {
    if (!text.includes(shape)) fail(`SCANNER READINESS DIAGNOSTIC MISSING: ${shape}`);
  }
}

function auditStockGptTruthCleanup() {
  const guardedFiles = [
    {
      file: "src/components/TransactionHistory.tsx",
      forbidden: [
        /randomWinRate\b/,
        /randomCompliance\b/,
        /Math\.random\s*\(/,
        /평균 손익비는\s*2\.4:1/,
        /fillOrder\s*\(/,
        /체결 승인 신뢰도:/,
      ],
    },
    {
      file: "src/components/trading/AiHighVolatilityAlertSystem.tsx",
      forbidden: [
        /getAllStocks\s*\(/,
        /Math\.random\s*\(/,
        /5\.8\s*:\s*-4\.2/,
        /2\.5\s*\+\s*idx\s*\*\s*0\.8/,
        /1\.8\s*\+\s*idx\s*\*\s*0\.45/,
      ],
    },
    {
      file: "src/components/trading/StockSearchAndAddModal.tsx",
      forbidden: [
        /regPrice\b/,
        /["']12500["']/,
        /live\?\.price\s*\|\|\s*stock\.price/,
        /AI\s*\{stock\.score\}점/,
        /실시간 연동중/,
      ],
    },
  ];

  for (const guard of guardedFiles) {
    const full = path.resolve(guard.file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const pattern of guard.forbidden) {
      if (pattern.test(text)) fail(`STOCK GPT TRUTH REGRESSION: ${guard.file} (${pattern})`);
    }
  }
}

function auditServerTruthRoutes() {
  const serverPath = path.resolve("server.ts");
  if (!fs.existsSync(serverPath)) return;
  const text = fs.readFileSync(serverPath, "utf8");

  const requiredMarkers = [
    "SYNTHETIC_BACKTEST_REMOVED",
    "SIMULATED_AUTOTRADE_REMOVED",
    "VERIFIED_THEME_DATA_REQUIRED",
    "VERIFIED_ARBITRAGE_DATA_REQUIRED",
    "VERIFIED_SYNC_OVERLAY_DATA_REQUIRED",
    "VERIFIED_ALGORITHM_INPUTS_REQUIRED"
  ];
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) fail(`server.ts missing fail-closed production marker: ${marker}`);
  }

  const forbiddenServerShapes = [
    "const ALL_REAL_STOCKS_MASTER = [",
    "baseUsd: 65400",
    "baseKrw: 92500000",
    "const vixIndex = 18.2 + (Math.sin(Date.now() / 10000) * 4)",
    "const wave = Math.sin((dataPointsCount - i) / 3.5) * 1.8",
    "const history = generateHistory(stock.price, daysCount)",
    "price: st.price || 45000",
    "changePct: st.changePct || 2.5"
  ];
  for (const shape of forbiddenServerShapes) {
    if (text.includes(shape)) fail(`server.ts still contains synthetic production shape: ${shape}`);
  }
}

function scanPath(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isFile()) return scanFile(p);
  if (!stat.isDirectory()) return;
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, entry.name);
    if (entry.isDirectory()) scanPath(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) scanFile(full);
  }
}

function scanFile(fullPath) {
  if (allowedFolders.some((folder) => fullPath.includes(folder))) return;
  const text = fs.readFileSync(fullPath, "utf8");
  if (/(src[\\/](trading|services|realtime)|server[\\/])/.test(fullPath)
      && /from\s+["'].*\/demo\b/.test(text)) {
    fail(`CORE PRODUCTION ENGINE IMPORTS DEMO CODE: ${fullPath}`);
  }
  for (const pattern of forbidden) {
    if (pattern.test(text)) fail(`FAKE DATA PATTERN FOUND IN PRODUCTION CODE: ${fullPath} (${pattern})`);
  }
}

console.log("🔍 Running Production Zero Fake Data Audit V10...");
auditPresetFixture();
auditRealtimeMarketBridge();
auditScannerUiTruth();
auditStockGptTruthCleanup();
auditServerTruthRoutes();
for (const rootPath of ROOTS) scanPath(rootPath);
if (failed) {
  console.error("💥 Zero Fake Data Audit V10 FAILED!");
  process.exit(1);
}
console.log("✅ Production Zero Fake Data Audit V10 PASSED cleanly.");
