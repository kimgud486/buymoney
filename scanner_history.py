from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

from scanner import detect_pattern


INSUFFICIENT_DATA_MESSAGE = "아직 자료가 적어요"


@dataclass
class PatternHistoryStats:
    pattern: str
    occurrences: int
    successes: int
    failures: int
    hit_rate: Optional[float]
    average_rise_pct: Optional[float]
    average_fall_pct: Optional[float]
    recent_hit_rate: Optional[float]
    sample_sufficient: bool
    message: str


@dataclass
class ScannerEnrichment:
    buy_price: float
    wait_price: float
    simple_explanation: str
    history: PatternHistoryStats

    def to_dict(self) -> Dict[str, Any]:
        return {
            "buy_price": self.buy_price,
            "wait_price": self.wait_price,
            "simple_explanation": self.simple_explanation,
            "history": asdict(self.history),
        }


def _records(raw_data: Any) -> List[Dict[str, float]]:
    if isinstance(raw_data, list):
        source = raw_data
    elif hasattr(raw_data, "to_dict"):
        source = raw_data.to_dict(orient="records")
    else:
        raise TypeError("OHLCV 데이터는 list 또는 DataFrame 형식이어야 합니다.")

    result: List[Dict[str, float]] = []
    for row in source:
        result.append({
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
        })
    return result


def _true_range(records: List[Dict[str, float]], index: int) -> float:
    row = records[index]
    if index == 0:
        return max(row["high"] - row["low"], 0.0)
    prev_close = records[index - 1]["close"]
    return max(
        row["high"] - row["low"],
        abs(row["high"] - prev_close),
        abs(row["low"] - prev_close),
    )


def _atr(records: List[Dict[str, float]], period: int = 14) -> float:
    if not records:
        return 0.0
    start = max(0, len(records) - period)
    values = [_true_range(records, i) for i in range(start, len(records))]
    return sum(values) / max(len(values), 1)


def calculate_dynamic_prices(raw_data: Any) -> Dict[str, float]:
    """Calculate non-fabricated entry reference levels only from supplied OHLCV."""
    records = _records(raw_data)
    if len(records) < 2:
        raise ValueError("동적 가격 계산에는 최소 2개 캔들이 필요합니다.")

    price = records[-1]["close"]
    atr = _atr(records)
    recent = records[-20:]
    total_volume = sum(max(row["volume"], 0.0) for row in recent)
    if total_volume > 0:
        vwap_proxy = sum(
            ((row["high"] + row["low"] + row["close"]) / 3.0) * max(row["volume"], 0.0)
            for row in recent
        ) / total_volume
    else:
        vwap_proxy = price

    buy_price = max(vwap_proxy, price - atr * 0.35)
    wait_price = max(0.0, min(vwap_proxy, price - atr * 0.70))
    return {
        "buy_price": round(buy_price, 2),
        "wait_price": round(wait_price, 2),
    }


def calculate_pattern_history(
    raw_data: Any,
    pattern: Optional[str] = None,
    forward_bars: int = 5,
    success_threshold_pct: float = 2.0,
    min_samples: int = 5,
    recent_samples: int = 10,
) -> PatternHistoryStats:
    """
    Evaluate only historical occurrences that have enough future bars.

    Success means the close after ``forward_bars`` is at least
    ``success_threshold_pct`` above the pattern bar close. The current bar and
    unfinished outcomes are never counted, preventing look-ahead/fake stats.
    """
    records = _records(raw_data)
    if len(records) < forward_bars + 3:
        return PatternHistoryStats(
            pattern=pattern or "NONE",
            occurrences=0,
            successes=0,
            failures=0,
            hit_rate=None,
            average_rise_pct=None,
            average_fall_pct=None,
            recent_hit_rate=None,
            sample_sufficient=False,
            message=INSUFFICIENT_DATA_MESSAGE,
        )

    target_pattern = pattern or detect_pattern(records)[0]
    if not target_pattern or target_pattern == "NONE":
        return PatternHistoryStats(
            pattern="NONE",
            occurrences=0,
            successes=0,
            failures=0,
            hit_rate=None,
            average_rise_pct=None,
            average_fall_pct=None,
            recent_hit_rate=None,
            sample_sufficient=False,
            message=INSUFFICIENT_DATA_MESSAGE,
        )

    outcomes: List[float] = []
    # Exclude the live/current bar and require complete forward data.
    last_pattern_index = len(records) - forward_bars - 1
    for index in range(2, last_pattern_index + 1):
        historical_slice = records[: index + 1]
        detected, _ = detect_pattern(historical_slice)
        if detected != target_pattern:
            continue
        start_price = records[index]["close"]
        end_price = records[index + forward_bars]["close"]
        if start_price <= 0:
            continue
        outcomes.append(((end_price - start_price) / start_price) * 100.0)

    successes = sum(1 for value in outcomes if value >= success_threshold_pct)
    failures = len(outcomes) - successes
    positives = [value for value in outcomes if value > 0]
    negatives = [value for value in outcomes if value < 0]
    sample_sufficient = len(outcomes) >= min_samples

    if not sample_sufficient:
        return PatternHistoryStats(
            pattern=target_pattern,
            occurrences=len(outcomes),
            successes=successes,
            failures=failures,
            hit_rate=None,
            average_rise_pct=None,
            average_fall_pct=None,
            recent_hit_rate=None,
            sample_sufficient=False,
            message=INSUFFICIENT_DATA_MESSAGE,
        )

    hit_rate = successes / len(outcomes) * 100.0
    recent = outcomes[-max(recent_samples, 1):]
    recent_successes = sum(1 for value in recent if value >= success_threshold_pct)
    recent_hit_rate = recent_successes / len(recent) * 100.0

    return PatternHistoryStats(
        pattern=target_pattern,
        occurrences=len(outcomes),
        successes=successes,
        failures=failures,
        hit_rate=round(hit_rate, 1),
        average_rise_pct=round(sum(positives) / len(positives), 2) if positives else 0.0,
        average_fall_pct=round(sum(negatives) / len(negatives), 2) if negatives else 0.0,
        recent_hit_rate=round(recent_hit_rate, 1),
        sample_sufficient=True,
        message="실제 OHLCV 과거 패턴으로 계산했어요",
    )


def build_simple_explanation(pattern: str, buy_price: float, wait_price: float, history: PatternHistoryStats) -> str:
    pattern_text = "뚜렷한 캔들 패턴이 없어요" if pattern == "NONE" else f"지금은 {pattern} 패턴이 보여요"
    price_text = f"{buy_price:,.0f}원 근처는 살지 살펴보는 가격이고, {wait_price:,.0f}원 근처는 더 기다려 보는 가격이에요."
    if not history.sample_sufficient:
        history_text = INSUFFICIENT_DATA_MESSAGE
    else:
        history_text = (
            f"예전에는 같은 패턴이 {history.occurrences}번 있었고, "
            f"{history.successes}번 성공해서 적중률은 {history.hit_rate:.1f}%였어요."
        )
    return f"{pattern_text}. {price_text} {history_text}"


def enrich_scan_result(raw_data: Any, pattern: Optional[str] = None) -> ScannerEnrichment:
    records = _records(raw_data)
    detected_pattern = pattern or detect_pattern(records)[0]
    prices = calculate_dynamic_prices(records)
    history = calculate_pattern_history(records, pattern=detected_pattern)
    explanation = build_simple_explanation(
        detected_pattern,
        prices["buy_price"],
        prices["wait_price"],
        history,
    )
    return ScannerEnrichment(
        buy_price=prices["buy_price"],
        wait_price=prices["wait_price"],
        simple_explanation=explanation,
        history=history,
    )
