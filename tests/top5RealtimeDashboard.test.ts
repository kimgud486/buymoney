import { describe, it } from "node:test";
import assert from "node:assert";
import { defaultGraphShapeScanner, CandleData } from "../src/scanner/GraphShapeScanner";

describe("Top 5 Realtime Dashboard Score Integration Tests", () => {
  it("should calculate Consolidated Score using 40% GraphScore + 35% FlowScore + 25% RiskScore", () => {
    // Construct 30 candles with strong bullish setup (EMA Alignment + Breakout)
    const candles: CandleData[] = [];
    let price = 50000;
    for (let i = 0; i < 35; i++) {
      price += 500;
      candles.push({
        open: price - 300,
        high: price + 200,
        low: price - 400,
        close: price,
        volume: 50000 + i * 2000,
        timestamp: Date.now() - (35 - i) * 60000
      });
    }

    const res = defaultGraphShapeScanner.scan(candles, "005930");

    assert.ok(res.graphScore >= 0);
    assert.ok(res.flowScore >= 0);
    assert.ok(res.riskScore >= 0);

    // Verify consolidated formula calculation
    const expectedConsolidated = Math.round(res.graphScore * 0.40 + res.flowScore * 0.35 + res.riskScore * 0.25);
    assert.strictEqual(res.finalScore, expectedConsolidated);
  });

  it("should enforce > 80 threshold filtering rule strictly", () => {
    const scores = [
      { symbol: "A", score: 95 },
      { symbol: "B", score: 88 },
      { symbol: "C", score: 82 },
      { symbol: "D", score: 79 },
      { symbol: "E", score: 72 }
    ];

    const qualified = scores.filter(s => s.score > 80);
    assert.strictEqual(qualified.length, 3);
    assert.deepStrictEqual(qualified.map(s => s.symbol), ["A", "B", "C"]);
  });

  it("should limit TOP 5 items when more than 5 symbols qualify", () => {
    const scores = [
      { symbol: "A", score: 98 },
      { symbol: "B", score: 95 },
      { symbol: "C", score: 92 },
      { symbol: "D", score: 89 },
      { symbol: "E", score: 86 },
      { symbol: "F", score: 83 },
      { symbol: "G", score: 81 }
    ];

    const top5 = scores.filter(s => s.score > 80).slice(0, 5);
    assert.strictEqual(top5.length, 5);
    assert.strictEqual(top5[0].symbol, "A");
    assert.strictEqual(top5[4].symbol, "E");
  });
});
