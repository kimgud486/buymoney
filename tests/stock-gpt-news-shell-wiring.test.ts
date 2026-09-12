import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const shell = readFileSync('src/components/trading/StockGPTShellV2.tsx', 'utf8');
const panel = readFileSync('src/components/trading/StockGPTVerifiedNewsPanel.tsx', 'utf8');

test('Stock GPT related-news tab uses the verified-only news panel', () => {
  assert.match(shell, /import StockGPTVerifiedNewsPanel from ["']\.\/StockGPTVerifiedNewsPanel["']/);
  assert.match(shell, /stockTab === ["']news["']\s*&&\s*<StockGPTVerifiedNewsPanel symbol=\{selectedQuote\.symbol\}/);
  assert.doesNotMatch(
    shell,
    /stockTab === ["']news["']\s*&&\s*<TruthUnavailablePanel title=["']관련 뉴스["']/,
  );
});

test('verified news panel validates server payload before rendering articles', () => {
  assert.match(panel, /validateStockGptNewsResponse\(payload, cleanSymbol\)/);
  assert.match(panel, /result\.state !== ["']READY["']/);
  assert.match(panel, /data-testid=["']stock-gpt-news-no-data["']/);
  assert.match(panel, /href=\{article\.url\}/);
  assert.match(panel, /rel=["']noreferrer noopener["']/);
});
