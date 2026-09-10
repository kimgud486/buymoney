import math
import unittest

from pattern_similarity import (
    PatternSimilarityConfig,
    build_pattern_library,
    dtw_distance,
    match_current_pattern,
)


def make_series(length=180, pattern="up"):
    rows = []
    price = 100.0
    for i in range(length):
        phase = i % 30
        if pattern == "up":
            drift = 0.004 + 0.002 * math.sin(phase / 4.0)
        elif pattern == "down":
            drift = -0.004 + 0.002 * math.sin(phase / 4.0)
        else:
            drift = 0.0015 * math.sin(phase / 3.0)
        open_ = price
        close = max(1.0, price * (1.0 + drift))
        high = max(open_, close) * 1.002
        low = min(open_, close) * 0.998
        volume = 100000.0 * (1.0 + 0.20 * math.sin(phase / 5.0))
        rows.append({"open": open_, "high": high, "low": low, "close": close, "volume": volume})
        price = close
    return rows


class PatternSimilarityTests(unittest.TestCase):
    def test_dtw_identical_is_zero(self):
        seq = [0.0, 1.0, 0.5, 2.0, 1.5]
        self.assertAlmostEqual(dtw_distance(seq, seq, band=2), 0.0, places=8)

    def test_dtw_separates_different_shapes(self):
        target = [0, 1, 2, 3, 4, 5]
        close = [0, 1, 2, 3, 4, 5]
        opposite = [5, 4, 3, 2, 1, 0]
        self.assertLess(dtw_distance(target, close), dtw_distance(target, opposite))

    def test_library_uses_future_after_reference_window(self):
        rows = make_series(120, "up")
        cfg = PatternSimilarityConfig(lookback=20, horizon=5, stride=1, min_reference_windows=5)
        library = build_pattern_library(rows, cfg)
        self.assertTrue(library)
        first = library[0]
        end_price = rows[first.end_index]["close"]
        future_price = rows[first.end_index + cfg.horizon]["close"]
        expected = future_price / end_price - 1.0
        self.assertAlmostEqual(first.forward_return, expected, places=10)

    def test_live_match_excludes_overlapping_future(self):
        rows = make_series(170, "up")
        cfg = PatternSimilarityConfig(
            lookback=20,
            horizon=5,
            stride=1,
            top_k=10,
            success_return=0.01,
            min_reference_windows=10,
        )
        result = match_current_pattern(rows, cfg)
        self.assertTrue(result.available)
        query_start = len(rows) - cfg.lookback
        for match in result.matches:
            self.assertLess(match.end_index + cfg.horizon, query_start)

    def test_rising_history_produces_positive_success_evidence(self):
        rows = make_series(190, "up")
        cfg = PatternSimilarityConfig(
            lookback=20,
            horizon=5,
            stride=2,
            top_k=15,
            success_return=0.01,
            failure_return=-0.005,
            min_reference_windows=15,
        )
        result = match_current_pattern(rows, cfg)
        self.assertTrue(result.available)
        self.assertGreater(result.success_rate, 50.0)
        self.assertGreater(result.profit_score, 50.0)

    def test_insufficient_data_is_neutral_not_exception(self):
        rows = make_series(10, "up")
        cfg = PatternSimilarityConfig(lookback=20)
        result = match_current_pattern(rows, cfg)
        self.assertFalse(result.available)
        self.assertEqual(result.reason, "insufficient_current_window")
        self.assertEqual(result.profit_score, 50.0)


if __name__ == "__main__":
    unittest.main()
