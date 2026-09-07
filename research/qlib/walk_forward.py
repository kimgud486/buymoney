# AISTOCK Qlib & Robust Walk-Forward Optimization Engine
from __future__ import annotations
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from research.optimizer.robust_strategy_validator import RobustStrategyValidator, metrics_from_trades


class WalkForwardEvaluator:
    def execute(self, train_window_days=180, test_window_days=30, dataset_hash=None, trades_data=None):
        print(f"[QLIB WALK-FORWARD] Train Window: {train_window_days}d | Test Window: {test_window_days}d | Dataset Hash: {dataset_hash}")
        
        if not dataset_hash:
            return {
                "status": "NOT_EVALUATED",
                "reason": "MISSING_DATASET_HASH",
                "metrics": None
            }

        trades = trades_data if trades_data is not None else []
        
        if not trades or len(trades) < 30:
            return {
                "status": "EVALUATED_FAIL",
                "reason": "INSUFFICIENT_TRADE_SAMPLES",
                "metrics": {
                    "trades": len(trades),
                    "pass": False,
                }
            }

        def mock_backtest(params, start, end):
            return trades[start:end]

        validator = RobustStrategyValidator(mock_backtest)
        wf_res = validator.walk_forward(
            params={"rvol_min": 2.0},
            total_length=len(trades),
            train_size=max(10, int(len(trades) * 0.6)),
            test_size=max(5, int(len(trades) * 0.2)),
        )

        mc_res = validator.monte_carlo(trades, runs=500)

        is_passed = wf_res.get("pass", False) and mc_res.get("pass", False)

        return {
            "status": "EVALUATED_PASS" if is_passed else "EVALUATED_FAIL",
            "reason": "VALIDATION_SUCCESS" if is_passed else "METRICS_GATE_FAILED",
            "dataset_hash": dataset_hash,
            "walk_forward": wf_res,
            "monte_carlo": mc_res,
            "metrics": metrics_from_trades(trades).__dict__,
        }


if __name__ == "__main__":
    wf = WalkForwardEvaluator()
    res = wf.execute(dataset_hash="ds_sample_v14_1")
    print("[QLIB RESULT]", res)
