import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
let source = fs.readFileSync(serverPath, "utf8");

const oldImport = 'import { analyzeStockIdea, CandleRecord, ExplainableTradeIdea, filterYesOnlyCandidates } from "./src/scanner/ExplainableOpportunityScannerEngine.js";';
const newImport = 'import { analyzeStockIdea, ExplainableTradeIdea, filterYesOnlyCandidates } from "./src/scanner/ExplainableOpportunityScannerEngine.js";\nimport { fetchRealScannerCandles } from "./src/scanner/RealScannerCandleProvider.js";';

if (!source.includes('fetchRealScannerCandles } from "./src/scanner/RealScannerCandleProvider.js"')) {
  if (!source.includes(oldImport)) {
    throw new Error("Scanner import anchor not found. Refusing to patch server.ts.");
  }
  source = source.replace(oldImport, newImport);
}

const randomCandleBlock = /        const records: CandleRecord\[\] = \[\];\n        let curr = currPrice \* 0\.95;\n        const now = Date\.now\(\);\n        for \(let i = 30; i >= 0; i--\) \{[\s\S]*?        const idea = analyzeStockIdea\(item\.symbol, item\.name, item\.market, records, currPrice, liveData\.changePct\);/;

const realCandleBlock = `        // Fail-closed: use provider-backed OHLCV only. Never synthesize scanner candles.\n        const candleResult = await fetchRealScannerCandles(item.symbol, item.market);\n        const records = candleResult.candles;\n\n        const idea = analyzeStockIdea(\n          item.symbol,\n          item.name,\n          item.market,\n          records,\n          currPrice,\n          liveData.changePct\n        );\n        idea.bullishReasons.unshift(\n          \`Verified candle source: \${candleResult.source} / \${candleResult.timeframe}\`\n        );`;

if (randomCandleBlock.test(source)) {
  source = source.replace(randomCandleBlock, realCandleBlock);
} else if (!source.includes("const candleResult = await fetchRealScannerCandles(item.symbol, item.market);")) {
  throw new Error("Random scanner candle block not found. Refusing partial migration.");
}

const quietCatch = `      } catch (err) {\n        // quiet skip\n      }\n    }\n\n    let topIdeas: ExplainableTradeIdea[] = [];`;
const explicitCatch = `      } catch (err: any) {\n        rejectedLog.push({\n          symbol: item.symbol,\n          name: item.name,\n          reasons: [\`REAL_CANDLE_REQUIRED: \${err?.message || String(err)}\`]\n        });\n      }\n    }\n\n    let topIdeas: ExplainableTradeIdea[] = [];`;

if (source.includes(quietCatch)) {
  source = source.replace(quietCatch, explicitCatch);
} else if (!source.includes("REAL_CANDLE_REQUIRED:")) {
  throw new Error("Scanner catch anchor not found. Refusing partial migration.");
}

if (source.includes("Math.random() * 8000") && source.includes("/api/yes-only-scanner")) {
  throw new Error("Random scanner candle generator still present after patch.");
}

if (!source.includes("fetchRealScannerCandles(item.symbol, item.market)")) {
  throw new Error("Real scanner candle provider was not wired.");
}

fs.writeFileSync(serverPath, source, "utf8");
console.log("server.ts scanner migration applied: provider-backed candles, fail-closed fallback");
