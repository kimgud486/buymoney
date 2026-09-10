import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("operational truth monitor is mounted and uses read-only broker runtime endpoint", () => {
  const app = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
  const monitor = fs.readFileSync(path.resolve("src/components/trading/OperationalTruthMonitorV20.tsx"), "utf8");

  assert.match(app, /<OperationalTruthMonitorV20\s*\/>/);
  assert.match(monitor, /\/api\/broker\/v21\/runtime\?symbol=/);
  assert.match(monitor, /operational-truth-monitor-v20/);
  assert.doesNotMatch(monitor, /executeOrder\s*\(/);
  assert.doesNotMatch(monitor, /submit\s*\(/);
});
