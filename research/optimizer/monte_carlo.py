from __future__ import annotations

import random
from typing import Callable, Dict, List


class MonteCarloResampler:
    """
    Resamples trade sequences to test drawdown probability and loss risk under order variance.
    """

    @staticmethod
    def evaluate(
        trades: List[Dict],
        metrics_calculator_fn: Callable,
        runs: int = 2000,
        min_trades: int = 30,
        max_p95_drawdown: float = 0.20,
        max_loss_probability: float = 0.20,
    ) -> Dict:
        if len(trades) < min_trades:
            return {
                "pass": False,
                "reason": "INSUFFICIENT_TRADES",
                "drawdown_p95": 1.0,
                "loss_probability": 1.0,
            }

        drawdowns = []
        returns = []

        for _ in range(runs):
            shuffled = trades[:]
            random.shuffle(shuffled)

            m = metrics_calculator_fn(shuffled)
            drawdowns.append(m.max_drawdown)
            returns.append(m.net_return)

        drawdowns_sorted = sorted(drawdowns)
        p95_idx = int(runs * 0.95)
        dd95 = drawdowns_sorted[min(p95_idx, len(drawdowns_sorted) - 1)]

        loss_probability = sum(1 for x in returns if x <= 0) / runs

        is_passed = dd95 <= max_p95_drawdown and loss_probability <= max_loss_probability

        return {
            "pass": is_passed,
            "drawdown_p95": dd95,
            "loss_probability": loss_probability,
        }
