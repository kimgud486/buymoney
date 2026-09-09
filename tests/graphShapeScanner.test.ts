import { describe, it, expect } from "vitest";
import { GraphShapeScanner, CandleData } from "../src/scanner/GraphShapeScanner";

describe("GraphShapeScanner Unit Tests", () => {
  const scanner = new GraphShapeScanner();

  function generateSampleCandles(count = 50, trend: "UP" | "DOWN" | "SQUEEZE" = "UP"): CandleData[] {
    const result: CandleData[] = [];
    let price = 10000;

    for (let i = 0; i < count; i++) {
      if (trend === "UP") {
        price += 100 + Math.sin(i) * 20;
      } else if (trend === "DOWN") {
        price -= 100 - Math.sin(i) * 20;
      } else {
        price += Math.sin(i) * 10;
      }

      const open = price - 50;
      const low = price - 60;
      const close = price + 30; // Strong close near top
      const high = price + 40;
      // High volume breakout on recent candles
      const volume = i >= count - 5 ? 100000 : 20000;

      result.push({ open, high, low, close, volume, timestamp: Date.now() - (count - i) * 60000 });
    }
    return result;
  }

  it("scans uptrend candles and assigns high Graph Score with patterns", () => {
    const candles = generateSampleCandles(60, "UP");
    const result = scanner.scan(candles, "005930");

    expect(result.graphScore).toBeGreaterThan(60);
    expect(result.details.emaAligned).toBe(true);
    expect(result.timeframeChecks.passedCount).toBeGreaterThanOrEqual(2);
  });

  it("detects Fake Breakout and penalizes score with blocker", () => {
    const candles = generateSampleCandles(50, "UP");
    // Simulate fake breakout: current High exceeds prev 20-high, but Close drops back low with low RVOL
    const maxPrevHigh = Math.max(...candles.slice(29, 49).map((c) => c.high));
    candles[49] = {
      open: maxPrevHigh - 100,
      high: maxPrevHigh + 500, // spikes above resistance
      close: maxPrevHigh - 200, // closes back below resistance
      low: maxPrevHigh - 300,
      volume: 100, // low volume
    };

    const result = scanner.scan(candles, "005930");
    expect(result.details.fakeBreakout).toBe(true);
    expect(result.blockers.some((b) => b.includes("FAKE_BREAKOUT"))).toBe(true);
    expect(result.verdict).toBe("NO");
  });

  it("evaluates W-Bottom pattern correctly", () => {
    const candles: CandleData[] = [];
    let base = 50000;
    for (let i = 0; i < 40; i++) {
      if (i < 10) base -= 500; // First dip
      else if (i < 20) base += 400; // Neckline rally
      else if (i < 30) base -= 400; // Second dip
      else base += 600; // Breakout above neckline

      candles.push({
        open: base - 100,
        high: base + 200,
        low: base - 200,
        close: base + 100,
        volume: 20000 + i * 1000,
      });
    }

    const result = scanner.scan(candles, "005930");
    expect(result.details.wBottom).toBe(true);
    expect(result.patterns.includes("W_BOTTOM_BREAKOUT")).toBe(true);
  });
});
