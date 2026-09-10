from __future__ import annotations

from dataclasses import dataclass
from math import exp, inf, isfinite, log
from statistics import mean, median
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


EPS = 1e-12


@dataclass(frozen=True)
class PatternSimilarityConfig:
    """Configuration for leak-safe historical pattern matching."""

    lookback: int = 40
    horizon: int = 10
    stride: int = 2
    top_k: int = 25
    dtw_band_ratio: float = 0.20
    success_return: float = 0.03
    failure_return: float = 0.00
    min_reference_windows: int = 20
    price_weight: float = 0.72
    volume_weight: float = 0.18
    candle_weight: float = 0.10


@dataclass(frozen=True)
class HistoricalPattern:
    end_index: int
    forward_return: float
    mfe: float
    mae: float
    label: str
    close_shape: Tuple[float, ...]
    volume_shape: Tuple[float, ...]
    candle_shape: Tuple[float, ...]


@dataclass(frozen=True)
class PatternMatch:
    end_index: int
    similarity: float
    forward_return: float
    mfe: float
    mae: float
    label: str


@dataclass(frozen=True)
class PatternSimilarityResult:
    available: bool
    reason: str
    sample_count: int = 0
    matched_count: int = 0
    similarity: float = 0.0
    success_similarity: float = 0.0
    failure_similarity: float = 0.0
    success_rate: float = 0.0
    avg_forward_return: float = 0.0
    median_forward_return: float = 0.0
    avg_mfe: float = 0.0
    avg_mae: float = 0.0
    profit_score: float = 50.0
    matches: Tuple[PatternMatch, ...] = ()


def _records(data: Any) -> List[Dict[str, float]]:
    """Convert DataFrame-like input or iterable records to normalized OHLCV dicts."""
    if hasattr(data, "to_dict"):
        rows = data.to_dict(orient="records")
    else:
        rows = list(data)

    out: List[Dict[str, float]] = []
    for row in rows:
        out.append(
            {
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row.get("volume", 0.0)),
            }
        )
    return out


def _zscore(values: Sequence[float]) -> Tuple[float, ...]:
    if not values:
        return ()
    m = sum(values) / len(values)
    var = sum((x - m) ** 2 for x in values) / len(values)
    sd = var ** 0.5
    if sd <= EPS:
        return tuple(0.0 for _ in values)
    return tuple((x - m) / sd for x in values)


def _log_return_shape(values: Sequence[float]) -> Tuple[float, ...]:
    if len(values) < 2:
        return tuple(0.0 for _ in values)
    returns = [0.0]
    for prev, curr in zip(values[:-1], values[1:]):
        returns.append(log(max(curr, EPS) / max(prev, EPS)))
    return _zscore(returns)


def _volume_shape(values: Sequence[float]) -> Tuple[float, ...]:
    transformed = [log(max(v, 0.0) + 1.0) for v in values]
    return _zscore(transformed)


def _candle_shape(rows: Sequence[Dict[str, float]]) -> Tuple[float, ...]:
    values: List[float] = []
    for r in rows:
        rng = max(r["high"] - r["low"], EPS)
        body = (r["close"] - r["open"]) / rng
        close_location = ((r["close"] - r["low"]) / rng) * 2.0 - 1.0
        values.append(body * 0.60 + close_location * 0.40)
    return tuple(values)


def dtw_distance(a: Sequence[float], b: Sequence[float], band: Optional[int] = None) -> float:
    """Dynamic Time Warping distance using O(n * band) memory/time where possible."""
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return inf

    width = max(abs(n - m), band if band is not None else max(n, m))
    previous = [inf] * (m + 1)
    previous[0] = 0.0

    for i in range(1, n + 1):
        current = [inf] * (m + 1)
        start = max(1, i - width)
        end = min(m, i + width)
        for j in range(start, end + 1):
            cost = abs(a[i - 1] - b[j - 1])
            current[j] = cost + min(previous[j], current[j - 1], previous[j - 1])
        previous = current

    distance = previous[m]
    if not isfinite(distance):
        return inf
    return distance / max(n + m, 1)


def _distance_to_similarity(distance: float) -> float:
    if not isfinite(distance):
        return 0.0
    return max(0.0, min(100.0, 100.0 * exp(-distance)))


def _feature_distance(
    current: Tuple[Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]],
    historical: HistoricalPattern,
    cfg: PatternSimilarityConfig,
) -> float:
    band = max(1, int(cfg.lookback * cfg.dtw_band_ratio))
    close_d = dtw_distance(current[0], historical.close_shape, band)
    volume_d = dtw_distance(current[1], historical.volume_shape, band)
    candle_d = dtw_distance(current[2], historical.candle_shape, band)
    return (
        close_d * cfg.price_weight
        + volume_d * cfg.volume_weight
        + candle_d * cfg.candle_weight
    )


def _window_features(rows: Sequence[Dict[str, float]]) -> Tuple[Tuple[float, ...], Tuple[float, ...], Tuple[float, ...]]:
    closes = [r["close"] for r in rows]
    volumes = [r["volume"] for r in rows]
    return _log_return_shape(closes), _volume_shape(volumes), _candle_shape(rows)


def _forward_stats(rows: Sequence[Dict[str, float]], end: int, horizon: int) -> Tuple[float, float, float]:
    entry = rows[end]["close"]
    future = rows[end + 1 : end + horizon + 1]
    terminal = future[-1]["close"]
    forward_return = terminal / max(entry, EPS) - 1.0
    mfe = max(r["high"] for r in future) / max(entry, EPS) - 1.0
    mae = min(r["low"] for r in future) / max(entry, EPS) - 1.0
    return forward_return, mfe, mae


def build_pattern_library(
    data: Any,
    config: PatternSimilarityConfig | None = None,
    *,
    reference_end: Optional[int] = None,
) -> List[HistoricalPattern]:
    """
    Build historical reference windows.

    The label is calculated only from candles AFTER each historical window.
    `reference_end` can freeze the library at a past index for walk-forward tests.
    """
    cfg = config or PatternSimilarityConfig()
    rows = _records(data)
    if not rows:
        return []

    last_allowed = len(rows) - cfg.horizon - 1
    if reference_end is not None:
        last_allowed = min(last_allowed, int(reference_end))

    first_end = cfg.lookback - 1
    if last_allowed < first_end:
        return []

    library: List[HistoricalPattern] = []
    for end in range(first_end, last_allowed + 1, max(cfg.stride, 1)):
        window = rows[end - cfg.lookback + 1 : end + 1]
        close_shape, volume_shape, candle_shape = _window_features(window)
        fwd, mfe, mae = _forward_stats(rows, end, cfg.horizon)
        if fwd >= cfg.success_return:
            label = "SUCCESS"
        elif fwd <= cfg.failure_return:
            label = "FAILURE"
        else:
            label = "NEUTRAL"
        library.append(
            HistoricalPattern(
                end_index=end,
                forward_return=fwd,
                mfe=mfe,
                mae=mae,
                label=label,
                close_shape=close_shape,
                volume_shape=volume_shape,
                candle_shape=candle_shape,
            )
        )
    return library


def match_current_pattern(
    data: Any,
    config: PatternSimilarityConfig | None = None,
    *,
    library: Optional[Sequence[HistoricalPattern]] = None,
) -> PatternSimilarityResult:
    """
    Compare the latest completed lookback window with historical, outcome-labelled windows.

    Windows whose outcome horizon overlaps the current query are excluded automatically,
    preventing future-data leakage in live scanning/backtests.
    """
    cfg = config or PatternSimilarityConfig()
    rows = _records(data)
    if len(rows) < cfg.lookback:
        return PatternSimilarityResult(False, "insufficient_current_window")

    query_end = len(rows) - 1
    query_start = query_end - cfg.lookback + 1
    query = _window_features(rows[query_start : query_end + 1])

    refs = list(library) if library is not None else build_pattern_library(rows, cfg)
    # For a live query, a historical sample is valid only if its future outcome is fully
    # known before the query window starts. This is stricter than simply excluding the query.
    safe_refs = [p for p in refs if p.end_index + cfg.horizon < query_start]

    if len(safe_refs) < cfg.min_reference_windows:
        return PatternSimilarityResult(
            False,
            "insufficient_historical_reference_windows",
            sample_count=len(safe_refs),
        )

    ranked: List[PatternMatch] = []
    for p in safe_refs:
        distance = _feature_distance(query, p, cfg)
        ranked.append(
            PatternMatch(
                end_index=p.end_index,
                similarity=_distance_to_similarity(distance),
                forward_return=p.forward_return,
                mfe=p.mfe,
                mae=p.mae,
                label=p.label,
            )
        )

    ranked.sort(key=lambda x: x.similarity, reverse=True)
    top = ranked[: max(1, cfg.top_k)]

    weights = [max(x.similarity, 1.0) for x in top]
    weight_sum = sum(weights)
    success_weight = sum(w for x, w in zip(top, weights) if x.label == "SUCCESS")
    failure_weight = sum(w for x, w in zip(top, weights) if x.label == "FAILURE")
    success_rate = success_weight / max(weight_sum, EPS)

    success_sims = [x.similarity for x in top if x.label == "SUCCESS"]
    failure_sims = [x.similarity for x in top if x.label == "FAILURE"]
    fwd = [x.forward_return for x in top]
    mfes = [x.mfe for x in top]
    maes = [x.mae for x in top]

    avg_similarity = sum(x.similarity * w for x, w in zip(top, weights)) / max(weight_sum, EPS)
    avg_fwd = sum(x.forward_return * w for x, w in zip(top, weights)) / max(weight_sum, EPS)

    # The score is deliberately bounded and evidence-based. It is not a promised win rate.
    return_component = max(-1.0, min(1.0, avg_fwd / max(cfg.success_return, EPS)))
    similarity_edge = (
        (mean(success_sims) if success_sims else 0.0)
        - (mean(failure_sims) if failure_sims else 0.0)
    ) / 100.0
    profit_score = 50.0 + 30.0 * (success_rate - 0.5) * 2.0 + 12.0 * return_component + 8.0 * similarity_edge
    profit_score = max(0.0, min(100.0, profit_score))

    return PatternSimilarityResult(
        available=True,
        reason="ok",
        sample_count=len(safe_refs),
        matched_count=len(top),
        similarity=round(avg_similarity, 2),
        success_similarity=round(mean(success_sims), 2) if success_sims else 0.0,
        failure_similarity=round(mean(failure_sims), 2) if failure_sims else 0.0,
        success_rate=round(success_rate * 100.0, 2),
        avg_forward_return=round(avg_fwd * 100.0, 3),
        median_forward_return=round(median(fwd) * 100.0, 3),
        avg_mfe=round(mean(mfes) * 100.0, 3),
        avg_mae=round(mean(maes) * 100.0, 3),
        profit_score=round(profit_score, 2),
        matches=tuple(top),
    )
