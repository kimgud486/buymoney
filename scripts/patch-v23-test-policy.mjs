import fs from "node:fs";

const path = "tests/v23_autonomous_trading_architecture.test.ts";
let source = fs.readFileSync(path, "utf8");

const oldLine = "    const orchestrator = new AutonomousTradingOrchestrator(router, orderManager, killSwitch, reconciler);";
const replacement = `    const orchestrator = new AutonomousTradingOrchestrator(
      router,
      orderManager,
      killSwitch,
      reconciler,
      { ...DEFAULT_AUTONOMOUS_RISK_POLICY, mode: "LIVE_RESTRICTED" }
    );`;

const occurrences = source.split(oldLine).length - 1;
if (occurrences !== 3) {
  throw new Error(`Expected exactly 3 V23 execution-test orchestrator anchors, found ${occurrences}. Refusing patch.`);
}

source = source.split(oldLine).join(replacement);

if (!source.includes('mode: "LIVE_RESTRICTED"')) {
  throw new Error("V23 test-only LIVE_RESTRICTED policy was not inserted.");
}

fs.writeFileSync(path, source, "utf8");
console.log("V23 execution lifecycle tests now use explicit LIVE_RESTRICTED policy only inside tests.");
