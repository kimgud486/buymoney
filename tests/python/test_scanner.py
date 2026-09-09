import unittest
from scanner import analyze_stock, scan_market, TradeIdea, SignalValidationGate, detect_pattern


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
        self.setIsInstance = isinstance(idea, TradeIdea)
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


if __name__ == "__main__":
    unittest.main()
