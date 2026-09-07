from __future__ import annotations

from typing import Dict, List, Any
from .parameter_grid import parameter_distance


def detect_plateau(
    candidate_params: Dict[str, float],
    all_candidates: List[Any],
    max_distance: int = 1,
    min_expectancy_r: float = 0.0,
    min_profit_factor: float = 1.0,
    max_drawdown: float = 0.15,
) -> float:
    """
    Evaluates whether candidate parameters sit on a stable parameter plateau.
    Returns ratio of neighboring parameter sets that meet risk/return quality gates.
    """
    neighbors = [
        c for c in all_candidates
        if c.params != candidate_params and parameter_distance(candidate_params, c.params) <= max_distance
    ]

    if not neighbors:
        return 0.0

    stable_neighbors = [
        x for x in neighbors
        if x.metrics.expectancy_r > min_expectancy_r
        and x.metrics.profit_factor > min_profit_factor
        and x.metrics.max_drawdown <= max_drawdown
    ]

    return len(stable_neighbors) / len(neighbors)
