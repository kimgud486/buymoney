import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const scannerPath = path.resolve("src/components/RealtimeScannerTileBoard.tsx");
const scannerSource = fs.readFileSync(scannerPath, "utf8");

test("scanner market buttons change the actual server discovery market", () => {
  assert.match(scannerSource, /type MarketFilter = "ALL" \| ScanMarket/);
  assert.match(scannerSource, /function serverMarket\(filter: MarketFilter\)/);
  assert.match(scannerSource, /filter === "BTC" \? "UPBIT" : filter/);
  assert.match(scannerSource, /\/api\/explainable-scanner\?market=\$\{encodeURIComponent\(serverMarket\(filter\)\)\}&aiExplain=true/);
});

test("selected market drives immediate and 60-second rescans", () => {
  assert.match(scannerSource, /const \[selectedMarketFilter, setSelectedMarketFilter\] = useState<MarketFilter>\("ALL"\)/);
  assert.match(scannerSource, /const activeFilter = selectedMarketFilter/);
  assert.match(scannerSource, /fetchServerDiscovery\(activeFilter\)/);
  assert.match(scannerSource, /setInterval\(\(\) => \{ void runVerifiedScan\(\); \}, 60_000\)/);
  assert.match(scannerSource, /\[isAutoScanActive, runVerifiedScan\]/);
});

test("market-specific results never backfill with another market", () => {
  assert.match(scannerSource, /if \(filter !== "ALL" && market !== filter\) return \[\]/);
  assert.match(scannerSource, /다른 시장 종목으로 채우지 않습니다/);
  assert.match(scannerSource, /\(\["ALL", "KOREA", "US", "BTC"\] as const\)\.map/);
});
