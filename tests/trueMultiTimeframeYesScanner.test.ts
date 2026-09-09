import assert from "node:assert/strict";
import test from "node:test";

import {
  TrueMultiTimeframeYesScanner,
  type MultiTimeframeStockInput,
  type ShapeScannerLike,
} from "../src/scanner/TrueMultiTimeframeYesScanner";
import type {
  CandleData,
  ShapeResult,
} from "../src/scanner/GraphShapeScanner";

function makeCandles(count = 40, start = 100): CandleData[] {
  const candles: CandleData[] = [];
  let price = start;

  for (let i = 0; i < count; i += 1) {
    price += 0.2;
    candles.push({
      open: price - 0.12,
      high: price + 0.2,
      low: price - 0.25,
      close: price + 0.1,
      volume: 10_000 + i * 100,
      timestamp: 1_700_000_000_000 + i * 60_000,
    });
  }

  return candles;
}

function baseShape(
  symbol: string,
  candles: CandleData[],
  details: Partial<ShapeResult["details"]> = {},
): ShapeResult {
  const current = candles[candles.length - 1];

  return {
    symbol,
    score: 90,
    graphScore: 90,
    flowScore: 90,
    riskScore: 95,
    finalScore: 91,
    grade: "S",
    verdict: "YES",
    patterns: [],
    reasons: [],
    blockers: [],
    timeframeChecks: {
      tf1m: true,
      tf3m: true,
      tf5m: true,
      tfDaily: true,
      passedCount: 4,
    },
    details: {
      emaAligned: false,
      emaGoldenCross: false,
      emaRising: false,
      vwapReclaimed: false,
      rsiReclaimed: false,
      rsiRebound: false,
      macdCross: false,
      macdExpansion: false,
      bbSqueeze: false,
      breakout: false,
      breakoutRetest: false,
      higherLow: false,
      wBottom: false,
      volumeExpansion: false,
      strongClose: false,
      candlePatterns: [],
      fakeBreakout: false,
      belowVwap: false,
      rsiOverbought: false,
      rvol: 1.5,
      rsi: 62,
      vwap: current.close - 1,
      ...details,
    },
  };
}

class PassingShapeScanner implements ShapeScannerLike {
  public scan(candles: CandleData[], symbol = "STOCK"): ShapeResult {
    if (symbol.endsWith(":1m")) {
      return baseShape(symbol, candles, {
        breakout: true,
        breakoutRetest: true,
        vwapReclaimed: true,
        rvol: 2.1,
      });
    }

    if (symbol.endsWith(":3m")) {
      return baseShape(symbol, candles, {
        macdExpansion: true,
        rsiRebound: true,
        rvol: 1.6,
      });
    }

    if (symbol.endsWith(":5m")) {
      return baseShape(symbol, candles, {
        emaAligned: true,
        emaRising: true,
        higherLow: true,
      });
    }

    return baseShape(symbol, candles, {
      emaAligned: true,
      higherLow: true,
      rsi: 60,
    });
  }
}

class DailyFailShapeScanner extends PassingShapeScanner {
  public override scan(candles: CandleData[], symbol = "STOCK"): ShapeResult {
    if (symbol.endsWith(":1d")) {
      return baseShape(symbol, candles, {
        emaAligned: false,
        higherLow: false,
        wBottom: false,
        breakout: false,
        breakoutRetest: false,
      });
    }
    return super.scan(candles, symbol);
  }
}

function makeInput(
  symbol: string,
  cttr: number | null = 130,
): MultiTimeframeStockInput {
  return {
    symbol,
    name: `테스트-${symbol}`,
    frames: {
      tf1m: makeCandles(),
      tf3m: makeCandles(),
      tf5m: makeCandles(),
      tfDaily: makeCandles(),
    },
    live: {
      cttr,
      buyVolume: 620,
      sellVolume: 380,
      totalBidQty: 1_500,
      totalAskQty: 900,
    },
  };
}

test("true MTF scanner returns YES only after real 1m/3m/5m/daily gates all pass", () => {
  const scanner = new TrueMultiTimeframeYesScanner({}, new PassingShapeScanner());
  const result = scanner.analyze(makeInput("005930"));

  assert.ok(result);
  assert.equal(result.verdict, "YES");
  assert.equal(result.timeframeValidations.length, 4);
  assert.equal(result.timeframeValidations.every((frame) => frame.passed), true);
  assert.ok(result.finalScore >= 80);
});

test("daily structure failure rejects candidate instead of treating one series as four timeframes", () => {
  const scanner = new TrueMultiTimeframeYesScanner({}, new DailyFailShapeScanner());
  const result = scanner.analyze(makeInput("000660"));

  assert.equal(result, null);
  assert.equal(scanner.rejectLog.length, 1);
  assert.ok(
    scanner.rejectLog[0].reasons.some(
      (reason) => reason.includes("[1d]") && reason.includes("일봉 상승 구조"),
    ),
  );
});

test("missing live CTTR fails closed and never becomes YES", () => {
  const scanner = new TrueMultiTimeframeYesScanner({}, new PassingShapeScanner());
  const result = scanner.analyze(makeInput("035420", null));

  assert.equal(result, null);
  assert.ok(
    scanner.rejectLog[0].reasons.some((reason) => reason.includes("CTTR")),
  );
});

test("rankYesOnly never pads TOP 5 with rejected names", () => {
  const scanner = new TrueMultiTimeframeYesScanner({}, new PassingShapeScanner());
  const results = scanner.rankYesOnly(
    [
      makeInput("111111", 132),
      makeInput("222222", 128),
      makeInput("333333", 90),
    ],
    5,
  );

  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map((result) => result.symbol).sort(),
    ["111111", "222222"],
  );
  assert.equal(results.every((result) => result.verdict === "YES"), true);
});
