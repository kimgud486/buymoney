import unittest
from scanner import analyze_stock, scan_market, TradeIdea, SignalValidationGate, detect_pattern
from scanner_history import (
    INSUFFICIENT_DATA_MESSAGE,
    calculate_dynamic_prices,
    calculate_pattern_history,
    enrich_scan_result,
)


class TestExplainableScanner(unittest.TestCase):
    def setUp(self):
        self.candles = []
        base = 10000.0
        for i in range(60):
            self.candles.append({
                "open": base + i * 15,
                "high": base + i * 15 + 30,
                "low": base + i * 15 - 10,
                "close": base + i * 15 + 20,
                "volume": 2000 + i * 200
            })

    def test_analyze_stock_valid(self):
        idea = analyze_stock("005930", self.candles, stock_name="삼성전자")
        self.assertIsInstance(idea, TradeIdea)
        self.assertEqual(idea.symbol, "005930")
        self.assertEqual(idea.name, "삼성전자")
        self.assertGreaterEqual(idea.score, 0.0)
        self.assertLessEqual(idea.score, 100.0)
        self.assertIn(idea.grade, ["S", "A+", "A", "B", "NO_SETUP"])
        self.assertIn(idea.decision, ["STRONG_BUY_CANDIDATE", "BUY_CANDIDATE", "WATCH_FOR_ENTRY", "WATCH", "AVOID"])
        self.assertIsInstance(idea.would_buy, bool)
        self.assertIsInstance(idea.bullish_reasons, list)
        self.assertIsInstance(idea.risk_reasons, list)

    def test_scan_market_top5(self):
        universe = {
            "005930": self.candles,
            "000660": self.candles
        }
        names = {"005930": "삼성전자", "000660": "SK하이닉스"}
        top5 = scan_market(universe, top_n=5, symbol_names=names)
        self.assertLessEqual(len(top5), 5)
        if top5:
            self.assertEqual(top5[0].name, "삼성전자")

    def test_signal_validation_gate(self):
        passed, rejections = SignalValidationGate.validate(
            score=85.0,
            vwap_distance=2.0,
            rvol=1.8,
            macd_hist=10.5,
            pattern="BULLISH_ENGULFING",
            bearish_patterns={"SHOOTING_STAR"},
            atr_pct=2.5
        )
        self.assertTrue(passed)
        self.assertEqual(len(rejections), 0)

    def test_dynamic_prices_come_from_ohlcv(self):
        levels = calculate_dynamic_prices(self.candles)
        self.assertGreater(levels["buy_price"], 0)
        self.assertGreaterEqual(levels["buy_price"], levels["wait_price"])
        self.assertLessEqual(levels["buy_price"], self.candles[-1]["close"])

    def test_insufficient_history_never_fabricates_rates(self):
        stats = calculate_pattern_history(
            self.candles[:12],
            pattern="BULLISH_ENGULFING",
            forward_bars=5,
            min_samples=5,
        )
        self.assertFalse(stats.sample_sufficient)
        self.assertIsNone(stats.hit_rate)
        self.assertIsNone(stats.average_rise_pct)
        self.assertIsNone(stats.average_fall_pct)
        self.assertIsNone(stats.recent_hit_rate)
        self.assertEqual(stats.message, INSUFFICIENT_DATA_MESSAGE)

    def test_pattern_history_uses_completed_forward_bars_only(self):
        candles = []
        price = 100.0
        for i in range(80):
            open_price = price
            close_price = price * 1.01
            candles.append({
                "open": open_price,
                "high": close_price * 1.001,
                "low": open_price * 0.999,
                "close": close_price,
                "volume": 1000 + i,
            })
            price = close_price

        stats = calculate_pattern_history(
            candles,
            pattern="THREE_WHITE_SOLDIERS",
            forward_bars=5,
            min_samples=5,
        )
        self.assertTrue(stats.sample_sufficient)
        self.assertGreater(stats.occurrences, 0)
        self.assertEqual(stats.successes + stats.failures, stats.occurrences)
        self.assertIsNotNone(stats.hit_rate)
        self.assertIsNotNone(stats.recent_hit_rate)

    def test_enrichment_has_child_friendly_explanation(self):
        enrichment = enrich_scan_result(self.candles)
        self.assertGreater(enrichment.buy_price, 0)
        self.assertGreaterEqual(enrichment.buy_price, enrichment.wait_price)
        self.assertIsInstance(enrichment.simple_explanation, str)
        self.assertTrue(len(enrichment.simple_explanation) > 10)


if __name__ == "__main__":
    unittest.main()
