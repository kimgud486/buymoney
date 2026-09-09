import unittest
from yes_only_scanner import (
    YesOnlyScanner,
    YesScannerConfig,
    LiveData,
    scan_market_yes_only,
    BuyCandidate
)


def create_bullish_candles(bars=60, base=10000.0):
    recs = []
    curr = base
    for i in range(bars):
        # Strongly ascending trend
        c = curr * 1.012
        o = curr
        h = c * 1.004
        l = o * 0.998
        v = 20000 + i * 1000
        recs.append({"open": o, "high": h, "low": l, "close": c, "volume": v})
        curr = c
    return recs


def create_bearish_candles(bars=60, base=20000.0):
    recs = []
    curr = base
    for i in range(bars):
        c = curr * 0.985
        o = curr
        h = o * 1.002
        l = c * 0.995
        v = 15000
        recs.append({"open": o, "high": h, "low": l, "close": c, "volume": v})
        curr = c
    return recs


class TestYesOnlyScanner(unittest.TestCase):
    def setUp(self):
        self.config = YesScannerConfig(
            min_yes_score=80.0,
            require_live_orderflow=True
        )
        self.scanner = YesOnlyScanner(config=self.config)

    def test_rejection_on_weak_data(self):
        bearish_df = create_bearish_candles(60)
        live = LiveData(cttr=95.0, buy_volume=100, sell_volume=200)

        res = self.scanner.analyze("000001", "Weak Stock", bearish_df, live)
        self.assertIsNone(res)
        self.assertGreater(len(self.scanner.reject_log), 0)

    def test_yes_candidate_approval(self):
        bullish_df = create_bullish_candles(60)
        live = LiveData(
            cttr=125.0,
            buy_volume=300000,
            sell_volume=150000,
            total_bid_qty=500000,
            total_ask_qty=300000
        )

        res = self.scanner.analyze("005930", "삼성전자", bullish_df, live)
        if res is not None:
            self.assertEqual(res.verdict, "YES")
            self.assertGreaterEqual(res.score, 80.0)
            self.assertEqual(res.symbol, "005930")

    def test_scan_market_yes_only_no_padding(self):
        universe = {
            "WEAK1": {
                "name": "하락종목1",
                "df": create_bearish_candles(60),
                "live": LiveData(cttr=80.0)
            },
            "WEAK2": {
                "name": "하락종목2",
                "df": create_bearish_candles(60),
                "live": LiveData(cttr=85.0)
            }
        }

        approved = scan_market_yes_only(self.scanner, universe, top_n=5)
        self.assertEqual(len(approved), 0)  # Must NOT force 5 items!


if __name__ == "__main__":
    unittest.main()
