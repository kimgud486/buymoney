from __future__ import annotations

from dataclasses import dataclass, asdict
from itertools import product
from statistics import median
from typing import Callable, Dict, Iterable, List
import math
import random

from .parameter_grid import parameter_grid, parameter_distance
from .plateau_detector import detect_plateau
from .neighborhood_sharpe import calculate_neighborhood_sharpe
from .walk_forward import WalkForwardOptimizer
from .monte_carlo import MonteCarloResampler


@dataclass(frozen=True)
class Metrics:
    trades: int
    net_return: float
    sharpe: float
    profit_factor: float
    expectancy_r: float
    max_drawdown: float


@dataclass(frozen=True)
class Candidate:
    params: Dict[str, float]
    metrics: Metrics
    neighborhood_sharpe: float = 0.0
    plateau_score: float = 0.0
    robust_score: float = float("-inf")


def max_drawdown(returns: List[float]) -> float:
    equity = 1.0
    peak = 1.0
    worst = 0.0

    for r in returns:
        equity *= 1.0 + r
        peak = max(peak, equity)
        dd = (peak - equity) / peak
        worst = max(worst, dd)

    return worst


def metrics_from_trades(trades: List[Dict]) -> Metrics:
    if not trades:
        return Metrics(0, 0.0, 0.0, 0.0, 0.0, 1.0)

    net = [float(t["net_return"]) for t in trades]
    r_values = [float(t.get("realized_r", 0)) for t in trades]

    mean = sum(net) / len(net)
    variance = sum((x - mean) ** 2 for x in net) / max(1, len(net) - 1)
    std = math.sqrt(variance)

    # Intraday strategy comparison metric.
    sharpe = (mean / std * math.sqrt(len(net))) if std > 0 else 0.0

    gross_win = sum(x for x in net if x > 0)
    gross_loss = abs(sum(x for x in net if x < 0))

    pf = gross_win / gross_loss if gross_loss > 0 else (
        99.0 if gross_win > 0 else 0.0
    )

    expectancy = sum(r_values) / len(r_values) if r_values else 0.0

    compounded = 1.0
    for r in net:
        compounded *= 1.0 + r

    return Metrics(
        trades=len(trades),
        net_return=compounded - 1.0,
        sharpe=sharpe,
        profit_factor=pf,
        expectancy_r=expectancy,
        max_drawdown=max_drawdown(net),
    )


def add_robustness(candidates: List[Candidate]) -> List[Candidate]:
    output = []

    for c in candidates:
        neighbors = [
            x for x in candidates
            if x is not c and parameter_distance(c.params, x.params) <= 1
        ]

        neighborhood = (
            median([x.metrics.sharpe for x in neighbors])
            if neighbors else c.metrics.sharpe
        )

        stable_neighbors = [
            x for x in neighbors
            if x.metrics.expectancy_r > 0
            and x.metrics.profit_factor > 1
            and x.metrics.max_drawdown <= 0.15
        ]

        plateau = (
            len(stable_neighbors) / len(neighbors)
            if neighbors else 0.0
        )

        m = c.metrics

        # Fail closed on weak sample / negative edge.
        if (
            m.trades < 30
            or m.expectancy_r <= 0
            or m.profit_factor <= 1
            or m.max_drawdown > 0.20
        ):
            robust = float("-inf")
        else:
            robust = (
                0.30 * m.sharpe
                + 0.25 * neighborhood
                + 0.20 * min(m.profit_factor, 3.0)
                + 0.15 * m.expectancy_r
                + 0.10 * plateau
                - 1.50 * m.max_drawdown
            )

        output.append(
            Candidate(
                params=c.params,
                metrics=m,
                neighborhood_sharpe=neighborhood,
                plateau_score=plateau,
                robust_score=robust,
            )
        )

    return sorted(
        output,
        key=lambda x: x.robust_score,
        reverse=True
    )


class RobustStrategyValidator:
    """
    backtest_fn(params, start_index, end_index) must return trade records.

    Every trade MUST contain:
      net_return: return AFTER commission/tax/spread/slippage
      realized_r: realized reward/risk
    """

    def __init__(self, backtest_fn: Callable):
        self.backtest_fn = backtest_fn

    def grid_search(
        self,
        grid: Dict[str, Iterable[float]],
        start: int,
        end: int,
    ) -> List[Candidate]:
        candidates = []

        for params in parameter_grid(grid):
            trades = self.backtest_fn(params, start, end)
            candidates.append(
                Candidate(
                    params=params,
                    metrics=metrics_from_trades(trades)
                )
            )

        return add_robustness(candidates)

    def walk_forward(
        self,
        params: Dict[str, float],
        total_length: int,
        train_size: int,
        test_size: int,
    ):
        optimizer = WalkForwardOptimizer(self.backtest_fn)
        return optimizer.run(params, total_length, train_size, test_size, metrics_from_trades)

    @staticmethod
    def monte_carlo(
        trades: List[Dict],
        runs: int = 2000,
    ):
        return MonteCarloResampler.evaluate(trades, metrics_from_trades, runs=runs)
