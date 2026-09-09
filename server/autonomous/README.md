# Server autonomous execution layer

Server-only components in this directory must never be imported by browser bundles.

- `AutonomousOrderJournal.ts`: durable client-order-key journal for idempotency.
- `AutonomousRecoveryReconciler.ts`: restart recovery against authoritative broker order status.

AUTO_LIVE must remain locked when unresolved orders cannot be reconciled to broker truth.
