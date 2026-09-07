from __future__ import annotations

from dataclasses import asdict
from typing import Callable, Dict, List


class WalkForwardOptimizer:
    """
    Performs out-of-sample rolling walk-forward evaluation across time windows.
    """

    def __init__(self, backtest_fn: Callable):
        self.backtest_fn = backtest_fn

    def run(
        self,
        params: Dict[str, float],
        total_length: int,
        train_size: int,
        test_size: int,
        metrics_calculator_fn: Callable,
        required_pass_ratio: float = 0.70,
    ) -> Dict:
        windows = []
        cursor = 0

        while cursor + train_size + test_size <= total_length:
            train_end = cursor + train_size
            test_start = train_end
            test_end = test_start + test_size

            # Evaluate fixed parameter on Out-Of-Sample (OOS) window
            test_trades = self.backtest_fn(params, test_start, test_end)
            window_metrics = metrics_calculator_fn(test_trades)
            windows.append(window_metrics)

            cursor += test_size

        if not windows:
            return {
                "pass": False,
                "reason": "NO_WALK_FORWARD_WINDOWS",
                "positive_window_ratio": 0.0,
                "windows": [],
            }

        positive = sum(
            1 for x in windows
            if x.expectancy_r > 0 and x.profit_factor > 1
        )

        pass_ratio = positive / len(windows)

        return {
            "pass": pass_ratio >= required_pass_ratio,
            "positive_window_ratio": pass_ratio,
            "windows": [asdict(x) for x in windows],
        }
