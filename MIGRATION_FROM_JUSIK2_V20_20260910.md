# V20 migration from `kimgud486/jusik2` to `kimgud486/buymoney`

This file records the V20 changes that were mistakenly committed to `jusik2` on 2026-09-10 and their destination in `buymoney`.

## Source commits migrated

- `c81955dae2721d3b5e35d982cf2fb6e15973d8f3` — domestic KIS tick parser
  - Migrated as compatibility adapter `server/v20/KISDomesticParserV20.ts`.
  - `buymoney` keeps its stronger canonical `KISDomesticTradeParserV20.ts` implementation.
- `9550d8a1903bd4d97ac3a5f6865924893c66e686` — validated KIS ticks into realtime market hub
  - Merged into `server/v20/ServerKISRealtimeClientV20.ts`.
  - Reconnect and automatic resubscription are included.
- `9090dd8cf75e0ed5955e17c3cf94a74507d77ebb` — candles use executed tick volume only
  - Merged into `server/v20/ServerRealtimeMarketHubV20.ts`.
  - Cumulative/session volume is never reused as per-tick candle volume.
- `923e08c89f7fb6e4096f445e18456a979dcfcdc8` — realtime-hub indicator candidate builder
  - Migrated into `server/v20/RealtimeHubCandidateBuilderV20.ts`.
  - Existing stronger `ServerGlobalRealtimeScannerV20` remains the scoring/truth gate.
- `6732c79af6c95938ff79b51e2e838f86a7ff33d5` — realtime hub truth tests
  - Adapted into `tests/v20_migrated_realtime_truth.test.ts`.
- `55d6673b4a22862906a1752f38fab9fd4c4bdc95` — final buy/hold compatibility engine
  - Migrated into `server/v20/FinalBuyHoldEngineV20.ts` as a compatibility bulk-scan layer.
  - It does not replace the stronger production authority.
- `021929ad8ba8b4769fb95da728d2ee90263b2ffd` — final buy/hold truth-gate tests
  - Covered by `tests/v20_migrated_realtime_truth.test.ts` together with the existing V20 final-authority tests.

## Production authority in buymoney

The production endpoint remains:

`POST /api/v20/final-buy-hold`

and is wired through `FinalBuyHoldHttpHandlerV20` and `FinalBuyHoldDecisionServiceV20`.

The migrated compatibility code is intentionally prevented from weakening the existing True-MTF, executable-pattern, data-coverage, performance, and human-approval gates.

## Safety rule

No migrated component fabricates realtime quotes, candles, indicators, BUY candidates, or fallback market data. Missing or stale data remains NO_DATA/STALE/WATCH/NO_SIGNAL according to the active truth gates.
