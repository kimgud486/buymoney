# AISTOCK v13.7 Apply Guide

1. Import `MarketRegimeClassifierV137`, `StrategyWeightEngineV137`, `ScannerSafetyGateV137`, and `RegimeAwareScannerRouterV137` into your scanning pipeline.
2. Pass benchmark index closes to `MarketRegimeClassifierV137.classify()`.
3. Process candidates through `RegimeAwareScannerRouterV137.processCandidates()`.
4. Ensure `BUY_READY` candidate signals still pass v13.1 Entry, v13.2 Risk, v13.3 Execution, v13.4 Supervisor, and v13.5 Live Readiness gates before placing actual broker orders.
