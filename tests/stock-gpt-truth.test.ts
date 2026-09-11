import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stockSearch = readFileSync("src/components/trading/StockSearchAndAddModal.tsx", "utf8");
const stockShell = readFileSync("src/components/trading/StockGPTShellV2.tsx", "utf8");
const featurePanels = readFileSync("src/components/trading/StockGPTFeaturePanels.tsx", "utf8");
const operationalTruth = readFileSync("src/components/trading/OperationalTruthMonitorV20.tsx", "utf8");

test("Stock GPT search never converts missing market data into zero prices", () => {
  assert.doesNotMatch(stockSearch, /price\s*:\s*0\b/);
  assert.doesNotMatch(stockSearch, /changeRate\s*:\s*0\b/);
  assert.match(stockSearch, /buildLiveStockItem/);
  assert.match(stockSearch, /NO_DATA/);
});

test("Stock GPT main shell accepts only verified LIVE quotes", () => {
  assert.match(stockShell, /quote\.isVerified/);
  assert.match(stockShell, /quote\.status\s*===\s*["']LIVE["']/);
  assert.match(stockShell, /VERIFIED DATA ONLY/);
});

test("Stock GPT reconnected feature panels preserve verified quote gating", () => {
  assert.match(featurePanels, /quote\.isVerified/);
  assert.match(featurePanels, /quote\.status\s*===\s*["']LIVE["']/);
  assert.match(featurePanels, /VerifiedAiOpportunityScanner/);
  assert.match(featurePanels, /VerifiedIntradaySignalPanel/);
  assert.match(featurePanels, /BotStatusDashboard/);
  assert.match(featurePanels, /TransactionHistory/);
  assert.match(featurePanels, /AiHighVolatilityAlertSystem/);
});

test("broker truth monitor never silently substitutes Samsung when no symbol is selected", () => {
  assert.doesNotMatch(operationalTruth, /normalizeSymbol\(selectedSymbol\)\s*\|\|\s*["']005930["']/);
  assert.match(operationalTruth, /symbol\s*\|\|\s*["']종목 미선택["']/);
  assert.match(operationalTruth, /if\s*\(!isKoreaSymbol\)/);
});
