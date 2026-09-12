import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const featurePanels = readFileSync(
  "src/components/trading/StockGPTFeaturePanels.tsx",
  "utf8",
);

test("Stock GPT portfolio reuses the raw-evidence broker account truth view", () => {
  assert.match(featurePanels, /RealBrokerDetailedBalanceAndHoldings/);
  assert.match(featurePanels, /activeNav === ["']portfolio["']/);
  assert.match(featurePanels, /<RealBrokerDetailedBalanceAndHoldings/);
  assert.doesNotMatch(featurePanels, /positions\s*=\s*\[\]/);
  assert.doesNotMatch(featurePanels, /positions\.map\s*\(/);
  assert.doesNotMatch(featurePanels, /const\s+pnl\s*=\s*quote/);
});

test("Stock GPT alerts never present transport CONNECTED as account verification", () => {
  assert.match(featurePanels, /API 통신 상태 · 계좌 검증 아님/);
  assert.match(featurePanels, /CONNECTED는 계좌 잔고 검증 완료를 뜻하지 않습니다/);
  assert.match(featurePanels, /ACCOUNT VERIFIED 판정은 보유종목 화면의 브로커 원본증거 게이트에서만 표시합니다/);
  assert.match(featurePanels, /TRANSPORT/);
});
