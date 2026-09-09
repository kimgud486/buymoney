# Autonomous Production Hardening

This branch hardens the AI trading flow around a single fail-closed pipeline:

`Verified market data -> YES-only scanner -> ensemble validation -> autonomy gate -> account risk -> broker -> fill/reconciliation -> position lifecycle`

## Open-source architectural references

The separation between signal generation, portfolio/risk controls, and execution follows broad architectural ideas used by public quantitative research projects including:

- Microsoft Qlib (`microsoft/qlib`)
- AI4Finance FinRL (`AI4Finance-Foundation/FinRL`)

No third-party source file is copied into this repository by this change. The TypeScript implementation here is original and uses those projects only as architectural references.

## Production invariants

1. Missing RSI/RVOL/ADX/ATR/pattern inputs produce `NO_DATA / NO_TRADE`.
2. `AUTO_LIVE` is impossible unless every broker/account/data/risk gate passes.
3. A kill switch blocks new autonomous orders.
4. Client order keys provide deterministic duplicate-order protection.
5. A server-side persistent journal survives process restarts.
6. Unresolved orders must reconcile against broker truth before autonomous execution resumes.
7. UI scanners use `/api/yes-only-scanner`; no synthetic fallback candidates are generated.

## Remaining server wiring

The existing `/api/broker/v12/order` endpoint must call the central production gate/account risk layer before `kisBrokerGateway.executeOrder`. The KIS-not-configured reconciliation branch must also fail closed in LIVE/AUTO_LIVE mode rather than reporting a simulated match.

Domestic KIS should be treated as the first production target. US and crypto autonomous execution should stay locked until their native cash/risk and real broker adapters are fully implemented and tested.
