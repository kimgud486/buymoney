# Microsoft Qlib Research & Walk-Forward Validation Bridge (AISTOCK)

This directory contains offline research modules powered by Microsoft Qlib (https://github.com/microsoft/qlib).

## Architectural Isolation Notice
Qlib models run **offline** for walk-forward feature engineering, factor selection, and historical model candidate training.
**Live order placement is strictly governed by the TypeScript RiskGate engine.** Qlib outputs (confidence, prediction, feature metrics) serve as advisory inputs into the Online Ensemble Engine and Meta-Labeling system.

## Modules Overview
- `dataset_builder.py`: Extracts KIS/KRX/US stock datasets into Qlib format.
- `feature_pipeline.py`: Calculates alpha factors (RVOL, VWAP distance, momentum, volatility).
- `walk_forward.py`: Executes rolling walk-forward backtests with strict out-of-sample splits.
- `model_registry.py`: Registers trained LightGBM / Neural model checkpoints for export.
