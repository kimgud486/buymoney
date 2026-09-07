import unittest
from research.optimizer.robust_strategy_validator import (
    RobustStrategyValidator,
    metrics_from_trades,
    parameter_grid,
    parameter_distance,
)


class TestRobustStrategyValidator(unittest.TestCase):
    def setUp(self):
        # Generate sample trade records with edge
        self.sample_trades = [
            {"net_return": 0.02, "realized_r": 1.5},
            {"net_return": -0.01, "realized_r": -1.0},
            {"net_return": 0.03, "realized_r": 2.0},
            {"net_return": 0.015, "realized_r": 1.2},
            {"net_return": -0.008, "realized_r": -0.8},
        ] * 10  # 50 trades

    def test_parameter_grid_generation(self):
        grid = {"rvol_min": [1.5, 2.0], "rsi_min": [50, 55]}
        combos = list(parameter_grid(grid))
        self.assertEqual(len(combos), 4)

    def test_parameter_distance(self):
        p1 = {"rvol_min": 1.5, "rsi_min": 50}
        p2 = {"rvol_min": 2.0, "rsi_min": 50}
        p3 = {"rvol_min": 2.0, "rsi_min": 55}
        self.assertEqual(parameter_distance(p1, p2), 1)
        self.assertEqual(parameter_distance(p1, p3), 2)

    def test_metrics_from_trades(self):
        m = metrics_from_trades(self.sample_trades)
        self.assertEqual(m.trades, 50)
        self.assertGreater(m.sharpe, 0)
        self.assertGreater(m.profit_factor, 1.0)
        self.assertGreater(m.expectancy_r, 0.0)

    def test_robust_grid_search(self):
        def dummy_backtest(params, start, end):
            # Introduce parameter plateau around rvol_min=2.0
            if params["rvol_min"] >= 1.8 and params["rvol_min"] <= 2.2:
                return self.sample_trades[start:end]
            return [{"net_return": -0.02, "realized_r": -1.0}] * (end - start)

        validator = RobustStrategyValidator(dummy_backtest)
        grid = {"rvol_min": [1.5, 1.8, 2.0, 2.2, 2.5]}
        ranked = validator.grid_search(grid, start=0, end=50)

        self.assertGreater(len(ranked), 0)
        best = ranked[0]
        # Robust candidate should be on plateau (rvol_min in 1.8, 2.0, 2.2)
        self.assertIn(best.params["rvol_min"], [1.8, 2.0, 2.2])

    def test_walk_forward_and_monte_carlo(self):
        def dummy_backtest(params, start, end):
            return self.sample_trades[start:end]

        validator = RobustStrategyValidator(dummy_backtest)
        wf_res = validator.walk_forward(
            params={"rvol_min": 2.0},
            total_length=50,
            train_size=30,
            test_size=10,
        )
        self.assertTrue(wf_res["pass"])

        mc_res = validator.monte_carlo(self.sample_trades, runs=100)
        self.assertTrue(mc_res["pass"])


if __name__ == "__main__":
    unittest.main()
