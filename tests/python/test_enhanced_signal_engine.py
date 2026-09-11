import unittest
from types import SimpleNamespace

from enhanced_signal_engine import (
    EnhancedSignalConfig,
    _atr_adx,
    _rvol_and_zscore,
    _vwap,
    analyze_signal_quality,
)


def make_rows(length=80, drift=0.001, volume=100000.0):
    rows = []
    price = 100.0
    for _ in range(length):
        open_ = price
        close = price * (1.0 + drift)
        high = max(open_, close) * 1.002
        low = min(open_, close) * 0.998
        rows.append({"open": open_, "high": high, "low": low, "close": close, "volume": volume})
        price = close
    return rows


class EnhancedSignalEngineTests(unittest.TestCase):
    def test_rvol_baseline_excludes_current_bar(self):
        rvol, _ = _rvol_and_zscore([100.0] * 20 + [300.0], 20)
        self.assertAlmostEqual(rvol, 3.0, places=8)

    def test_session_vwap_resets_to_latest_session(self):
        rows = [
            {"open": 100, "high": 101, "low": 99, "close": 100, "volume": 1000, "timestamp": "2026-09-10T15:29:00"},
            {"open": 200, "high": 201, "low": 199, "close": 200, "volume": 10, "timestamp": "2026-09-11T09:00:00"},
            {"open": 202, "high": 203, "low": 201, "close": 202, "volume": 10, "timestamp": "2026-09-11T09:01:00"},
        ]
        value = _vwap(rows, 120)
        self.assertGreater(value, 199.0)
        self.assertLess(value, 203.0)

    def test_wilder_adx_detects_directional_uptrend(self):
        rows = make_rows(100, drift=0.004)
        highs = [x["high"] for x in rows]
        lows = [x["low"] for x in rows]
        closes = [x["close"] for x in rows]
        _, plus_di, minus_di, adx = _atr_adx(highs, lows, closes, 14)
        self.assertGreater(plus_di[-1], minus_di[-1])
        self.assertGreater(adx[-1], 25.0)

    def test_costs_are_subtracted_from_pattern_ev(self):
        rows = make_rows(80, drift=0.0002)
        pattern = SimpleNamespace(available=True, success_rate=55.0, matched_count=25, profit_score=55.0, similarity=60.0, success_similarity=62.0, failure_similarity=58.0, avg_forward_return=0.15)
        cfg = EnhancedSignalConfig(round_trip_fee_bps=10.0, slippage_bps=10.0, max_vwap_extension_pct=100.0, max_atr_extension=100.0)
        result = analyze_signal_quality(rows, pattern, cfg)
        self.assertAlmostEqual(result.gross_expected_value_pct, 0.15, places=6)
        self.assertAlmostEqual(result.net_expected_value_pct, -0.05, places=6)

    def test_small_pattern_sample_is_shrunk_toward_fifty(self):
        rows = make_rows(80, drift=0.0002)
        pattern = SimpleNamespace(available=True, success_rate=90.0, matched_count=2, profit_score=70.0, similarity=75.0, success_similarity=80.0, failure_similarity=50.0, avg_forward_return=0.8)
        cfg = EnhancedSignalConfig(probability_prior_strength=25.0, max_vwap_extension_pct=100.0, max_atr_extension=100.0)
        result = analyze_signal_quality(rows, pattern, cfg)
        self.assertLess(result.rise_probability, 65.0)
        self.assertGreater(result.rise_probability, 50.0)


if __name__ == "__main__":
    unittest.main()
