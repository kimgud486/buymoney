# Scanner Architecture

## Goal

Keep exactly one production decision authority for market candidates while preserving older API imports during migration.

## Production pipeline

```text
Realtime broker / exchange data
        |
        v
Market data truth + freshness gate
        |
        v
Indicator / feature engines
        |
        v
Pattern / structure engines
        |
        v
ServerGlobalRealtimeScannerV20
        |
        +--> BUY_CANDIDATE
        +--> WATCH
        +--> REJECT
        |
        v
Explainability / UI / execution safety gate
```

## Authority rules

### 1. Production scanner authority

`server/v20/ServerGlobalRealtimeScannerV20.ts`

This is the only component that should own final production candidate grading and recommendation rules. New production scoring rules belong here, not in a new `*ScannerVxx` file.

### 2. Legacy hot-list compatibility

`src/services/GlobalRealtimeScannerV192.ts`

V19.2 is retained temporarily for existing hot-list/API compatibility. It may collect verified market data and create legacy UI output, but it must not become a second production order authority.

`src/services/GlobalRealtimeScannerV191.ts`

V19.1 is now a compatibility facade only. It delegates to V19.2. Do not add indicator, pattern, risk, scoring, or fallback logic to V19.1.

### 3. Scanner sub-engines are not standalone market scanners

Files under `src/scanner/` are supporting engines. Their names do not grant them authority to independently select executable trades.

- `GraphShapeScanner.ts`: chart/indicator shape features
- `masterPatternDetectionEngine.ts`: broad pattern detection
- `verifiedPatternEngine.ts`: verified candlestick patterns
- `verifiedStructurePatternEngine.ts`: structure-pattern validation
- `verifiedSignalEngine.ts`: signal validation
- `ScalperFeatureEngine.ts`: scalper-specific features
- `SetupQualityEngine.ts`: setup-quality helper scoring
- `ExplainableOpportunityScannerEngine.ts`: legacy explainability/opportunity analysis; not production order authority

## Python scanner files

Root Python scanners are research/test compatibility code. The Node/TypeScript application runtime is driven by `server.ts`; do not import the Python scanners into the production Node scanning path.

## Data-truth policy

- Never manufacture missing live quote, volume, trade value, ATR, RVOL, VWAP, or other evidence.
- Missing critical evidence must reduce confidence or reject a candidate.
- A derived value must be traceable to verified market data.
- `REALTIME_DERIVED` must not silently become an executable BUY.
- Risk/chase/exhaustion gates run before a candidate can be promoted.

## Migration rule

Before adding any new scanner file, first ask whether the feature belongs in one of these layers:

1. market-data truth
2. feature/indicator engine
3. pattern/structure engine
4. V20 candidate decision engine
5. explainability/UI
6. execution safety

If it fits an existing layer, extend that layer instead of creating another scanner.

## Current consolidation status

- V19.1 duplicate implementation: removed; delegates to V19.2.
- V19.1 synthetic ATR planning fallback: removed from the compatibility path.
- V19.2: retained for compatibility while endpoints migrate.
- V20: designated production decision authority.
- Pattern/feature deduplication: should be performed by moving shared math into common engines without changing signal semantics.
