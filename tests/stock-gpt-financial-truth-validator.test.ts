import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateStockGptFinancialResponse } from '../src/services/stockGptFinancialTruthValidator';

const NOW = Date.parse('2026-09-12T03:30:00.000Z');

function validPayload() {
  return {
    provider: 'KIS',
    fundamentals: {
      dataStatus: 'REALTIME_VERIFIED',
      source: 'KIS_INQUIRE_PRICE',
      symbol: '005930',
      asOf: '2026-09-12T03:29:45.000Z',
      per: 14.37,
      pbr: 1.28,
      eps: 5276,
      bps: 59218,
    },
  };
}

describe('Stock GPT financial truth validator', () => {
  it('accepts fresh KIS fundamentals and preserves exact values', () => {
    const result = validateStockGptFinancialResponse(validPayload(), '005930', NOW);
    assert.equal(result.state, 'READY');
    assert.equal(result.source, 'KIS_INQUIRE_PRICE');
    assert.equal(result.per, 14.37);
    assert.equal(result.pbr, 1.28);
    assert.equal(result.eps, 5276);
    assert.equal(result.bps, 59218);
  });

  it('accepts partial verified metrics without inventing the missing ones', () => {
    const payload = validPayload();
    payload.fundamentals.per = null as unknown as number;
    payload.fundamentals.pbr = null as unknown as number;
    const result = validateStockGptFinancialResponse(payload, '005930', NOW);
    assert.equal(result.state, 'READY');
    assert.equal(result.per, null);
    assert.equal(result.pbr, null);
    assert.equal(result.eps, 5276);
    assert.equal(result.bps, 59218);
  });

  it('rejects preset-like zero or missing metrics instead of showing defaults', () => {
    const payload = validPayload();
    payload.fundamentals.per = 0;
    payload.fundamentals.pbr = 0;
    payload.fundamentals.eps = 0;
    payload.fundamentals.bps = 0;
    const result = validateStockGptFinancialResponse(payload, '005930', NOW);
    assert.equal(result.state, 'NO_DATA');
    assert.equal(result.reason, 'NO_VERIFIED_METRICS');
  });

  it('rejects wrong provider source symbol and stale timestamps', () => {
    assert.equal(
      validateStockGptFinancialResponse({ ...validPayload(), provider: 'DEMO' }, '005930', NOW).state,
      'NO_DATA',
    );

    const wrongSource = validPayload();
    wrongSource.fundamentals.source = 'DOMAIN_DATABASE';
    assert.equal(validateStockGptFinancialResponse(wrongSource, '005930', NOW).state, 'NO_DATA');

    const wrongSymbol = validPayload();
    wrongSymbol.fundamentals.symbol = '000660';
    assert.equal(validateStockGptFinancialResponse(wrongSymbol, '005930', NOW).state, 'NO_DATA');

    const stale = validPayload();
    stale.fundamentals.asOf = '2026-09-12T03:27:00.000Z';
    const staleResult = validateStockGptFinancialResponse(stale, '005930', NOW);
    assert.equal(staleResult.state, 'NO_DATA');
    assert.equal(staleResult.reason, 'STALE_FUNDAMENTALS');
  });

  it('rejects non-Korean symbols for the KIS domestic fundamentals path', () => {
    const result = validateStockGptFinancialResponse(validPayload(), 'AAPL', NOW);
    assert.equal(result.state, 'NO_DATA');
    assert.equal(result.reason, 'KOREA_SYMBOL_REQUIRED');
  });
});
