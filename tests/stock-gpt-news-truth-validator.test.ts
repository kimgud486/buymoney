import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStockGptNewsResponse } from '../src/services/stockGptNewsTruthValidator';

test('rejects preset and fallback corporate news sources', () => {
  for (const sourceType of ['DOMAIN_FINANCIAL_DATABASE', 'PRESET_FALLBACK', 'MOCK_NEWS']) {
    const result = validateStockGptNewsResponse({
      success: true,
      symbol: '005930',
      sourceType,
      isAiGenerated: false,
      articles: [{
        id: '1',
        title: '기사',
        source: '출처',
        url: 'https://example.com/a',
        publishedAt: '2026-09-12T00:00:00Z',
      }],
    }, '005930');
    assert.equal(result.state, 'NO_DATA');
    assert.equal(result.reason, 'FALLBACK_SOURCE_BLOCKED');
  }
});

test('rejects success=true without grounded source evidence', () => {
  const result = validateStockGptNewsResponse({
    success: true,
    symbol: '005930',
    sourceType: 'UNKNOWN',
    isAiGenerated: true,
    articles: [],
  }, '005930');

  assert.equal(result.state, 'NO_DATA');
  assert.equal(result.reason, 'VERIFIED_GROUNDED_SOURCE_REQUIRED');
});

test('rejects articles without source url or published time', () => {
  const result = validateStockGptNewsResponse({
    success: true,
    symbol: '005930',
    sourceType: 'GEMINI_GOOGLE_SEARCH_GROUNDED',
    isAiGenerated: true,
    articles: [
      { title: 'URL 없음', source: '신문', publishedAt: '2026-09-12T00:00:00Z' },
      { title: '시간 없음', source: '신문', url: 'https://example.com/b' },
      { title: '출처 없음', url: 'https://example.com/c', publishedAt: '2026-09-12T00:00:00Z' },
    ],
  }, '005930');

  assert.equal(result.state, 'NO_DATA');
  assert.equal(result.reason, 'NO_VERIFIABLE_ARTICLES');
});

test('accepts only verifiable grounded articles and normalizes time', () => {
  const result = validateStockGptNewsResponse({
    success: true,
    symbol: '005930',
    sourceType: 'GEMINI_GOOGLE_SEARCH_GROUNDED',
    isAiGenerated: true,
    articles: [
      {
        id: 'verified-1',
        title: '검증 기사',
        summary: '원문 출처가 있는 기사',
        source: 'Example News',
        url: 'https://example.com/news/1',
        publishedAt: '2026-09-12T01:30:00+09:00',
      },
      {
        id: 'bad-1',
        title: '가짜 링크',
        source: 'Example News',
        url: 'javascript:alert(1)',
        publishedAt: '2026-09-12T01:30:00+09:00',
      },
    ],
  }, '005930');

  assert.equal(result.state, 'READY');
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].id, 'verified-1');
  assert.match(result.articles[0].url, /^https:\/\//);
  assert.equal(result.articles[0].publishedAt, '2026-09-11T16:30:00.000Z');
});

test('rejects symbol mismatch', () => {
  const result = validateStockGptNewsResponse({
    success: true,
    symbol: '000660',
    sourceType: 'GEMINI_GOOGLE_SEARCH_GROUNDED',
    isAiGenerated: true,
    articles: [],
  }, '005930');

  assert.equal(result.state, 'NO_DATA');
  assert.equal(result.reason, 'SYMBOL_MISMATCH');
});
