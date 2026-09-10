import { describe, it } from "node:test";
import assert from "node:assert";
import {
  trueMtfYesScannerV2,
  filterTrueMtfYesOnlyCandidates,
  TrueMtfScanInput,
  TrueMtfScanResult,
} from "../src/scanner/TrueMtfYesScannerV2";
import { CandleData } from "../src/scanner/GraphShapeScanner";

describe("True MTF YES Scanner V2 Engine Unit Tests", () => {
  function generateCandles(count: number, trend: "UP" | "DOWN" | "SQUEEZE" = "UP", startPrice = 10000): CandleData[] {
    const candles: CandleData[] = [];
    let price = startPrice;

    for (let i = 0; i < count; i++) {
      if (trend === "UP") {
        // Steady realistic uptrend with healthy RSI (<75) and VWAP distance (<5%)
        const delta = (i % 3 === 0) ? -8 : 10;
        price += delta;
      } else if (trend === "DOWN") {
        price -= 30;
      } else {
        price += Math.sin(i) * 5;
      }

      const open = price - 5;
      const low = price - 10;
      const close = price + 5;
      const high = price + 8;
      const volume = trend === "UP" && i >= count - 5 ? 50000 : 10000;

      candles.push({ open, high, low, close, volume, timestamp: Date.now() - (count - i) * 60000 });
    }
    return candles;
  }

  it("1. Passes valid candidate across true 1m, 3m, 5m, Daily timeframes with high CTTR", () => {
    const tf1m = generateCandles(30, "UP", 10000);
    const tf3m = generateCandles(30, "UP", 10000);
    const tf5m = generateCandles(30, "UP", 10000);
    const tfDaily = generateCandles(20, "UP", 8000); // Daily structure strong bullish

    const input: TrueMtfScanInput = {
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      candles: { tf1m, tf3m, tf5m, tfDaily },
      flow: { cttr: 140, rvol: 2.2, buyVolume: 10000, sellVolume: 5000 }
    };

    const result = trueMtfYesScannerV2.evaluateMtfCandidate(input);

    assert.strictEqual(result.verdict, "YES");
    assert.strictEqual(result.wouldBuy, true);
    assert.ok(result.score >= 80);
    assert.strictEqual(result.timeframeChecks.passedCount, 4);
    assert.strictEqual(result.timeframeChecks.tfDailyPassed, true);
    assert.strictEqual(result.blockers.length, 0);
  });

  it("2. Eliminates candidate if Daily structure is broken (BEARISH daily)", () => {
    const tf1m = generateCandles(30, "UP", 10000);
    const tf3m = generateCandles(30, "UP", 10000);
    const tf5m = generateCandles(30, "UP", 10000);
    const tfDaily = generateCandles(20, "DOWN", 15000); // Daily structure broken down

    const input: TrueMtfScanInput = {
      symbol: "000660",
      name: "SK하이닉스",
      market: "KOREA",
      candles: { tf1m, tf3m, tf5m, tfDaily },
      flow: { cttr: 130, rvol: 1.8 }
    };

    const result = trueMtfYesScannerV2.evaluateMtfCandidate(input);

    assert.strictEqual(result.verdict, "NO");
    assert.strictEqual(result.wouldBuy, false);
    assert.strictEqual(result.timeframeChecks.tfDailyPassed, false);
    assert.ok(result.blockers.some(b => b.includes("DAILY_STRUCTURE_BROKEN")));
  });

  it("3. Eliminates candidate if CTTR (체결강도) is deficient (< 100%)", () => {
    const tf1m = generateCandles(30, "UP", 10000);
    const tf3m = generateCandles(30, "UP", 10000);
    const tf5m = generateCandles(30, "UP", 10000);
    const tfDaily = generateCandles(20, "UP", 8000);

    const input: TrueMtfScanInput = {
      symbol: "035420",
      name: "NAVER",
      market: "KOREA",
      candles: { tf1m, tf3m, tf5m, tfDaily },
      flow: { cttr: 82, rvol: 0.9 } // CTTR < 100%
    };

    const result = trueMtfYesScannerV2.evaluateMtfCandidate(input);

    assert.strictEqual(result.verdict, "NO");
    assert.strictEqual(result.wouldBuy, false);
    assert.ok(result.blockers.some(b => b.includes("CTTR_DEFICIENCY")));
  });

  it("4. Eliminates candidate if Fake Breakout or VWAP Over-extension (> 5%) occurs", () => {
    const tf1m = generateCandles(30, "UP", 10000);
    const tf3m = generateCandles(30, "UP", 10000);
    const tf5m = generateCandles(30, "UP", 10000);
    const tfDaily = generateCandles(20, "UP", 8000);

    // Override 5m close to be +8% above 5m VWAP to simulate over-extension
    const vwapApprox = tf5m[tf5m.length - 1].close;
    const overExtendedPrice = vwapApprox * 1.08;

    const input: TrueMtfScanInput = {
      symbol: "035720",
      name: "카카오",
      market: "KOREA",
      candles: { tf1m, tf3m, tf5m, tfDaily },
      priceOverride: overExtendedPrice,
      flow: { cttr: 150, rvol: 2.5 }
    };

    const result = trueMtfYesScannerV2.evaluateMtfCandidate(input);

    assert.strictEqual(result.verdict, "NO");
    assert.strictEqual(result.wouldBuy, false);
    assert.ok(result.blockers.some(b => b.includes("VWAP_CHASE_OVEREXTENDED")));
  });

  it("5. Filter function returns ONLY YES candidates with exact count (2 if 2 pass, 0 if 0 pass)", () => {
    const tf1mPass = generateCandles(30, "UP", 10000);
    const tf3mPass = generateCandles(30, "UP", 10000);
    const tf5mPass = generateCandles(30, "UP", 10000);
    const tfDailyPass = generateCandles(20, "UP", 8000);

    const tfDailyFail = generateCandles(20, "DOWN", 15000);

    const pool: TrueMtfScanInput[] = [
      {
        symbol: "PASS1",
        name: "통과종목1",
        market: "KOREA",
        candles: { tf1m: tf1mPass, tf3m: tf3mPass, tf5m: tf5mPass, tfDaily: tfDailyPass },
        flow: { cttr: 140, rvol: 2.0 }
      },
      {
        symbol: "PASS2",
        name: "통과종목2",
        market: "KOREA",
        candles: { tf1m: tf1mPass, tf3m: tf3mPass, tf5m: tf5mPass, tfDaily: tfDailyPass },
        flow: { cttr: 150, rvol: 2.5 }
      },
      {
        symbol: "FAIL1",
        name: "탈락종목1 (일봉 깨짐)",
        market: "KOREA",
        candles: { tf1m: tf1mPass, tf3m: tf3mPass, tf5m: tf5mPass, tfDaily: tfDailyFail },
        flow: { cttr: 140, rvol: 2.0 }
      },
      {
        symbol: "FAIL2",
        name: "탈락종목2 (체결강도 약함)",
        market: "KOREA",
        candles: { tf1m: tf1mPass, tf3m: tf3mPass, tf5m: tf5mPass, tfDaily: tfDailyPass },
        flow: { cttr: 75, rvol: 0.8 }
      },
    ];

    const results = pool.map(item => trueMtfYesScannerV2.evaluateMtfCandidate(item));
    const yesOnly = filterTrueMtfYesOnlyCandidates(results, 5);

    // Exactly 2 candidates should pass!
    assert.strictEqual(yesOnly.length, 2);
    assert.strictEqual(yesOnly[0].symbol, "PASS2"); // higher score
    assert.strictEqual(yesOnly[1].symbol, "PASS1");
    assert.ok(yesOnly.every(item => item.verdict === "YES" && item.wouldBuy));
  });

  it("6. Returns 0 candidates if 0 pass without forced TOP 5 padding", () => {
    const tf1mPass = generateCandles(30, "UP", 10000);
    const tf3mPass = generateCandles(30, "UP", 10000);
    const tf5mPass = generateCandles(30, "UP", 10000);
    const tfDailyFail = generateCandles(20, "DOWN", 15000);

    const pool: TrueMtfScanInput[] = [
      {
        symbol: "FAIL1",
        name: "탈락종목1",
        market: "KOREA",
        candles: { tf1m: tf1mPass, tf3m: tf3mPass, tf5m: tf5mPass, tfDaily: tfDailyFail },
        flow: { cttr: 70, rvol: 0.8 }
      },
      {
        symbol: "FAIL2",
        name: "탈락종목2",
        market: "KOREA",
        candles: { tf1m: tf1mPass, tf3m: tf3mPass, tf5m: tf5mPass, tfDaily: tfDailyFail },
        flow: { cttr: 80, rvol: 0.9 }
      },
    ];

    const results = pool.map(item => trueMtfYesScannerV2.evaluateMtfCandidate(item));
    const yesOnly = filterTrueMtfYesOnlyCandidates(results, 5);

    assert.strictEqual(yesOnly.length, 0);
  });
});
