# Autonomous Trading V26 - Open Source Architecture References

This branch uses open-source projects as architecture references while keeping the production implementation in this repository original and fail-closed.

## References

### FinRL
- Repository: `AI4Finance-Foundation/FinRL`
- License: MIT
- Used as an architectural reference for separating data processing, strategy/agent decisions, risk controls, and execution/environment boundaries.
- No FinRL source file is copied into this repository by this V26 patch.

### Microsoft Qlib
- Repository: `microsoft/qlib`
- License: MIT
- Used as an architectural reference for separating research signals, model/strategy evaluation, portfolio/risk logic, and execution workflow.
- No Qlib source file is copied into this repository by this V26 patch.

## V26 production principles

1. **No synthetic market-data fallback**
   - Missing candles or indicators are `NO_TRADE`.
   - Numeric completeness is not sufficient. The candidate must carry server-owned market-data and indicator provenance.

2. **Signal is not authorization**
   - `YES` is a trading signal only.
   - Live execution additionally requires broker health, account synchronization, verified fresh market data, account risk approval, adapter readiness, and duplicate-order protection.

3. **Fail closed**
   - `ANALYSIS` never orders.
   - `ASSISTED` requires an explicit approval path.
   - `AUTO_LIVE` is server-authorized only.
   - US and Upbit remain locked until their dedicated production risk/execution adapters are ready.

4. **Korea-first execution scope**
   - V26 KIS autonomous dispatcher supports KOREA + MARKET only.
   - The existing KIS domestic gateway uses market-order semantics (`ORD_DVSN=01`, `ORD_UNPR=0`), so V26 does not pretend LIMIT is supported.

5. **Idempotency and reconciliation**
   - A process-local idempotency guard prevents rapid duplicate dispatch for the same account/symbol/side/strategy/decision.
   - Unknown broker transport outcomes retain the claim and require broker reconciliation before retry.
   - Persistent restart recovery must reconcile real broker holdings, open orders and fills before AUTO_LIVE is re-enabled.

## New V26 modules

- `server/live/AutonomousLiveExecutionGateV26.ts`
- `server/live/AutonomousOrderIdempotencyGuardV26.ts`
- `server/live/AutonomousTradeExecutionCoordinatorV26.ts`
- `server/live/KisAutonomousBrokerDispatcherV26.ts`
- `server/scanner/VerifiedIndicatorEngineV26.ts`
- `server/scanner/VerifiedYesOnlyScannerServiceV26.ts`
- `src/autonomous/OpenSourceSignalEnsemble.ts`
- `src/components/trading/SafeAiAutotradeLauncher.tsx`

## Remaining integration work after this branch

The legacy scanner route in `server.ts` currently contains a synthetic-candle fallback. The V26 ensemble refuses those results because they do not carry verified provenance. The next server-route integration must replace that legacy generator with a concrete `VerifiedMarketDataAdapterV26` connected to provider-originated candles. Until that happens, production YES candidates must remain empty rather than fabricated.

Likewise, this V26 branch does not claim profitability. Strategy performance still requires out-of-sample tests and live execution measurements including fees, slippage, fills, latency, and drawdown.
