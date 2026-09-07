from __future__ import annotations

from statistics import median
from typing import Dict, List, Any
from .parameter_grid import parameter_distance


def calculate_neighborhood_sharpe(
    candidate_params: Dict[str, float],
    candidate_sharpe: float,
    all_candidates: List[Any],
    max_distance: int = 1,
) -> float:
    """
    Computes the median Sharpe ratio of immediate parameter neighbors (distance <= max_distance).
    If no neighbors exist, returns the candidate's own Sharpe ratio.
    """
    neighbors = [
        c for c in all_candidates
        if c.params != candidate_params and parameter_distance(candidate_params, c.params) <= max_distance
    ]

    if not neighbors:
        return candidate_sharpe

    return float(median([c.metrics.sharpe for c in neighbors]))
