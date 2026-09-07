# AISTOCK v13.7 Regime-Aware Scanner Weight Engine - Master Prompt

## Objective
Establish a market-regime aware strategy weighting engine that adjusts scanner priorities dynamically while strictly enforcing fail-closed safety gates (Chase Risk, Liquidity, RVOL, Relative Strength, VWAP Alignment).

## Regime Types
- TREND_UP
- TREND_DOWN
- RANGE
- HIGH_VOL
- LOW_VOL
- UNKNOWN (Stale data -> caps weight at <= 1.0)

## Core Strategy Weight Rules
- PROMOTE: Scanner weight +20% (does NOT bypass entry/risk gates)
- KEEP: Baseline weight
- WATCH: Weight reduced (-30%)
- DEMOTE: Weight heavily reduced (-70%)
- DISABLE: Weight 0.0

## Hard Block Filters
- chaseRisk === true -> finalScore = 0
- liquidityPass === false -> finalScore = 0
- RVOL < 1.2 -> BUY blocked
- Relative Strength < 55 -> BUY blocked
- VWAP alignment failure -> BUY blocked
