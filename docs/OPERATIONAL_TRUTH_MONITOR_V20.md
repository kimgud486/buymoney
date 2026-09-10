# Operational Truth Monitor V20

The main screen mounts a compact operational monitor above the trading dashboard.

It intentionally separates data sources instead of blending them silently:

- Execution State / daily realized PnL: autonomous execution engine state.
- KIS connection, OAuth/account/quote freshness, live-environment proof and blockers: `/api/broker/v21/runtime` read-only broker truth endpoint.
- Current unrealized PnL for Korean holdings: broker holdings current price versus broker average price.
- Combined PnL: clearly labeled reference sum of engine realized PnL and broker unrealized PnL.

Safety rules:

- DRY_RUN is displayed as TEST_ONLY, never as live READY.
- LIVE can show READY only when the engine is running, the dual live lock is enabled, kill switch is off, KIS is connected, broker data is REALTIME_VERIFIED, and live-environment proof is ESTABLISHED.
- Missing or stale broker truth is visible as NO_DATA/BLOCKED rather than converted to a fake value.
- Overseas/Upbit selections do not reuse KIS domestic proof; KIS-only fields show N/A.
- The monitor has no order-submission call.
