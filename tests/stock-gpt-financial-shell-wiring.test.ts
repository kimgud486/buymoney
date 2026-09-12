import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const shell = readFileSync('src/components/trading/StockGPTShellV2.tsx', 'utf8');
const panel = readFileSync('src/components/trading/StockGPTVerifiedFinancialPanel.tsx', 'utf8');

 test('Stock GPT financial tab uses the verified KIS financial panel', () => {
  assert.match(shell, /import StockGPTVerifiedFinancialPanel from ["']\.\/StockGPTVerifiedFinancialPanel["']/);
  assert.match(
    shell,
    /stockTab === ["']financials["']\s*&&\s*<StockGPTVerifiedFinancialPanel symbol=\{selectedQuote\.symbol\} market=\{selectedQuote\.market\}/,
  );
  assert.doesNotMatch(
    shell,
    /stockTab === ["']financials["']\s*&&\s*<TruthUnavailablePanel title=["']재무 정보["']/,
  );
});

test('financial panel validates KIS runtime payload and never inserts default fundamentals', () => {
  assert.match(panel, /\/api\/broker\/v21\/runtime\?symbol=/);
  assert.match(panel, /validateStockGptFinancialResponse\(payload, cleanSymbol\)/);
  assert.match(panel, /result\.state !== ["']READY["']/);
  assert.match(panel, /data-testid=["']stock-gpt-financial-no-data["']/);
  assert.doesNotMatch(panel, /per\s*:\s*15\b/i);
  assert.doesNotMatch(panel, /pbr\s*:\s*1\.2\b/i);
  assert.doesNotMatch(panel, /roe\s*:\s*10\b/i);
});

test('verified news wiring remains connected beside the financial tab', () => {
  assert.match(shell, /stockTab === ["']news["']\s*&&\s*<StockGPTVerifiedNewsPanel symbol=\{selectedQuote\.symbol\}/);
});
