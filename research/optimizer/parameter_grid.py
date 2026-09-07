from __future__ import annotations

from itertools import product
from typing import Dict, Iterable, List


def parameter_grid(grid: Dict[str, Iterable[float]]):
    """
    Generates dictionary parameter combinations from a parameter grid specification.
    """
    keys = list(grid.keys())
    for values in product(*(grid[k] for k in keys)):
        yield dict(zip(keys, values))


def parameter_distance(a: Dict[str, float], b: Dict[str, float]) -> int:
    """
    Calculates Manhattan Hamming parameter distance between two parameter dictionaries.
    Distance 1 means they differ in exactly one parameter key.
    """
    return sum(1 for k in a if k in b and a[k] != b[k])
