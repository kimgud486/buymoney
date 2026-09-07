# AISTOCK v13.1 Apply Guide

Target baseline verified before this patch: GitHub main commit 47d31b6ef132f3a5d611aae5c0ddec1365bcf258 (v13 core intelligence).

## Files added

- src/services/v13_1/typesV131.ts
- src/services/v13_1/FreshnessAndCompletedBarGateV131.ts
- src/services/v13_1/CompletedBarBuyGateV131.ts
- src/services/v13_1/PartialFillAccountingV131.ts
- src/services/v13_1/UsExchangeRouterV131.ts
- src/services/v13_1/PendingOrderStoreV131.ts
- src/services/v13_1/PendingOrderCoordinatorV131.ts
- src/services/v13_1/ValidationSafetyEngineV131.ts
- server/v13_1/FirestorePendingOrderStoreV131.ts
- server/v13_1/KISOrderPayloadGuardV131.ts
- tests/v13_1/validation-safety.test.ts
- .github/workflows/ci-v13_1.yml
- OPEN_SOURCE_REFERENCES_V13_1.md
- AISTOCK_V13_1_MASTER_PROMPT.md

## Integration order

1. Market feed adapter must set candle.isClosed=true only when the provider confirms the bar is final.
2. Call ValidationSafetyEngineV131.evaluateBuy() before creating BUY intent.
3. For US orders, pass the exchange field from symbol master/scanner metadata. Never default unknown exchange to NASD.
4. Before order submission call PendingOrderCoordinatorV131.assertNoDuplicate().
5. After KIS returns a real ODNO with status PENDING, call registerAcceptedOrder().
6. On every fill inquiry, call applyFill() with cumulative filled qty and average price.
7. Create AISTOCK position only when stored order status becomes FILLED.
8. On server startup/reconnect, listRecoveryQueue() and re-query KIS for every PENDING/PARTIAL order.
9. In Cloud Run use FirestorePendingOrderStoreV131. Grant only the service account permissions required for the dedicated collection.
10. Keep LIVE trading disabled until CI, PAPER regression, DRY_RUN and broker mock tests pass.

## Important current-v13 issue corrected by v13.1

The existing RealMarketDataProviderV13 considers 5 candles sufficient even though TechnicalAnalysisEngineV13 needs substantially more history for stable EMA50 and other indicators. v13.1 requires 50 completed bars by default and does not count an unfinished bar.

## CI

The included workflow executes:

npm ci
npm run lint
node --import tsx --test tests/v13_1/validation-safety.test.ts
npm run build

Do not claim the system is LIVE-ready merely because CI passes. Broker sandbox/PAPER and small-value LIVE verification remain separate gates.
