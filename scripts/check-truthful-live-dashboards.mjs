import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const requireText = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};
const forbidText = (source, text, message) => {
  if (source.includes(text)) failures.push(message);
};

const executionConsole = read("src/components/AistockV11ExecutionConsole.tsx");
const performance = read("src/components/trading/AiPerformanceAnalysisDashboard.tsx");
const tradingFloor = read("src/components/trading/StockAiTradingFloorMasterScreen.tsx");
const consensus = read("src/components/MultiModelSecuritiesConsensusModal.tsx");
const heatmap = read("src/components/SecuritiesPatternHeatmapWidget.tsx");
const server = read("server.ts");

requireText(executionConsole, '(["DRY_RUN", "LIVE"] as TradingMode[])', "Execution selector must expose only DRY_RUN and LIVE.");
forbidText(executionConsole, 'new AutonomousExecutionEngineV11("PAPER")', "Execution console must not boot in PAPER mode.");
requireText(performance, "const tradeRecords = realFormattedTrades;", "Performance totals must use recorded trades only.");
forbidText(tradingFloor, "Math.random() < 0.15", "Bot status must not change randomly.");
forbidText(consensus, "Math.random() - 0.45", "Consensus chart must not synthesize random OHLCV.");
forbidText(heatmap, "livePrice * 1.22", "Heatmap must not invent broker targets from price multipliers.");
requireText(server, 'dataStatus: "NO_DATA"', "Market API failure must identify NO_DATA.");
requireText(server, 'riskLevel: "UNKNOWN"', "Market API failure must not claim a normal risk level.");

if (failures.length) {
  console.error("Truthful live dashboard audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Truthful live dashboard audit passed.");
