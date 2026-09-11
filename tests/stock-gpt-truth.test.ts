import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appEntry = readFileSync("src/App.tsx", "utf8");
const stockSearch = readFileSync("src/components/trading/StockSearchAndAddModal.tsx", "utf8");
const stockShell = readFileSync("src/components/trading/StockGPTShellV2.tsx", "utf8");
const featurePanels = readFileSync("src/components/trading/StockGPTFeaturePanels.tsx", "utf8");
const operationalTruth = readFileSync("src/components/trading/OperationalTruthMonitorV20.tsx", "utf8");
const realtimeFeed = readFileSync("src/services/realtimeMarketFeedService.ts", "utf8");
const integrityGate = readFileSync("src/services/MarketDataIntegrityGate.ts", "utf8");
const realBrokerView = readFileSync("src/components/trading/RealBrokerDetailedBalanceAndHoldings.tsx", "utf8");

test("Stock GPT startup clears legacy selected ticker before passive market effects", () => {
  assert.match(appEntry, /useLayoutEffect\(\(\)\s*=>\s*\{\s*setSelectedSymbol\(["']["']\)/s);
  assert.match(appEntry, /consensusSelectedSymbol,\s*setConsensusSelectedSymbol\]\s*=\s*useState<string>\(["']["']\)/);
  assert.doesNotMatch(appEntry, /consensusSelectedSymbol,\s*setConsensusSelectedSymbol\]\s*=\s*useState<string>\(["']005930["']\)/);
  assert.match(appEntry, /if\s*\(!explicitSymbol\)\s*return/);
});

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

test("realtime feed preserves missing numeric fields instead of inventing zero", () => {
  assert.match(realtimeFeed, /parseOptionalMarketNumber/);
  assert.doesNotMatch(realtimeFeed, /fluctuationsRatioRaw\s*\|\|\s*item\.fluctuationsRatio\s*\|\|\s*["']0["']/);
  assert.doesNotMatch(realtimeFeed, /accumulatedTradingVolume\s*\|\|\s*["']0["']/);
  assert.doesNotMatch(realtimeFeed, /accumulatedTradingValue\s*\|\|\s*["']0["']/);
  assert.doesNotMatch(realtimeFeed, /marketValue(?:Full)?\s*\|\|\s*["']0["']/);
  assert.match(realtimeFeed, /providerTimestamp\s*==\s*null\s*\?\s*["']UNAVAILABLE["']/);
});

test("realtime feed never stamps missing provider time as now", () => {
  assert.doesNotMatch(realtimeFeed, /Number\(item\.trade_timestamp\)\s*\|\|\s*Date\.now\(\)/);
  assert.match(realtimeFeed, /parseOptionalTimestamp\(item\.trade_timestamp\)/);
  assert.match(realtimeFeed, /ageMs\s*=\s*providerTimestamp\s*==\s*null\s*\?\s*null/);
});

test("realtime feed never injects a hidden default KRX ticker universe", () => {
  assert.doesNotMatch(realtimeFeed, /const\s+defaults\s*=\s*\[/);
  assert.doesNotMatch(realtimeFeed, /\.\.\.registered,\s*\.\.\.defaults/);
  assert.match(realtimeFeed, /const\s+codes\s*=\s*Array\.from\(new\s+Set\(registered\)\)/);
});

test("market integrity gate fails closed on missing timestamps and candle volume", () => {
  assert.doesNotMatch(integrityGate, /quote\.providerTimestamp\s*\|\|\s*quote\.timestamp\s*\|\|\s*now/);
  assert.doesNotMatch(integrityGate, /quote\.volume\s*\|\|\s*0/);
  assert.doesNotMatch(integrityGate, /c\.volume\s*\?\?\s*0/);
  assert.doesNotMatch(integrityGate, /c\.timestamp\s*\|\|\s*c\.time\s*\|\|\s*0/);
  assert.doesNotMatch(integrityGate, /c\.tradeValue\s*\|\|\s*0/);
  assert.match(integrityGate, /MISSING_OR_INVALID_PROVIDER_TIMESTAMP/);
  assert.match(integrityGate, /MISSING_OR_INVALID_VOLUME_AT_INDEX/);
});

test("real broker account view has no hardcoded market/account truth fallbacks", () => {
  assert.doesNotMatch(realBrokerView, /exchangeRateKRW\s*=\s*1520/);
  assert.doesNotMatch(realBrokerView, /5012\*\*\*\*-01/);
  assert.doesNotMatch(realBrokerView, /price\s*:\s*135000000/);
  assert.doesNotMatch(realBrokerView, /price\s*:\s*248000/);
  assert.doesNotMatch(realBrokerView, /price\s*:\s*128\b/);
  assert.doesNotMatch(realBrokerView, /splitRatio/);
  assert.doesNotMatch(realBrokerView, /연결 정상/);
  assert.doesNotMatch(realBrokerView, /하나은행 매매기준율 연동 LIVE/);
  assert.match(realBrokerView, /accountDataReady/);
  assert.match(realBrokerView, /검증 공급자 미연결/);
});

test("real broker account view is review-only and never sends direct orders", () => {
  assert.doesNotMatch(realBrokerView, /executeTrade\s*\(/);
  assert.doesNotMatch(realBrokerView, /uiActionExecutor/);
  assert.doesNotMatch(realBrokerView, /onQuickTrade\s*\(/);
  assert.doesNotMatch(realBrokerView, /전종목 일괄 매도/);
  assert.doesNotMatch(realBrokerView, /전량 즉시 익절\/매도/);
  assert.match(realBrokerView, /DIRECT ORDER DISABLED/);
  assert.match(realBrokerView, /이 화면에서는 주문을 전송하지 않습니다/);
});

test("real broker valuation never substitutes average price for a missing current price", () => {
  assert.doesNotMatch(realBrokerView, /currentPrice[^\n]*avgPrice/);
  assert.match(realBrokerView, /const currentPrice = positiveNumber\(position\.currentPrice\)/);
  assert.match(realBrokerView, /const avgPrice = positiveNumber\(position\.avgPrice\)/);
  assert.match(realBrokerView, /valuationKrw = hasValuationInputs/);
});
