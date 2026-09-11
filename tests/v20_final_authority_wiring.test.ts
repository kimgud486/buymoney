import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("production candle route allows enough 1m depth for a derived 3m EMA50", () => {
  const server = read("server.ts");
  assert.match(server, /requestedCount[^\n]+240/);
  assert.doesNotMatch(server, /requestedCount[^\n]+\), 120\)/);
});

test("precheck scanner does not fabricate a generic bullish pattern when none executes", () => {
  const scanner = read("src/services/GlobalRealtimeScannerV192.ts");
  assert.match(scanner, /patternType = topBull \? topBull\.patternId : "NO_PATTERN"/);
  assert.match(scanner, /patternName = topBull \? topBull\.patternName : "미검출"/);
  assert.doesNotMatch(scanner, /patternType = topBull \? topBull\.patternId : "TECHNICAL_SETUP"/);
});

test("final HTTP decision rebuilds True MTF on the server and never trusts client MTF", () => {
  const handler = read("server/v20/FinalBuyHoldHttpHandlerV20.ts");
  const provider = read("server/v20/ServerTrueMTFEvidenceProviderV20.ts");
  assert.match(handler, /ServerTrueMTFEvidenceProviderV20\.build/);
  assert.match(handler, /trueMtf: serverTrueMtf/);
  assert.match(handler, /mtfAuthority: "SERVER_OWNED"/);
  assert.match(provider, /aggregateOneMinuteToThreeMinuteV20/);
  assert.match(provider, /payload\.dataStatus !== "REALTIME_VERIFIED"/);
  assert.match(provider, /payload\.dataStatus !== "REALTIME_DERIVED"/);
  assert.match(provider, /buildSnapshot\("3m", derived3,[^\n]+"REALTIME_DERIVED"\)/);
  assert.doesNotMatch(provider, /derived \? "REALTIME_DERIVED" : "REALTIME_VERIFIED"/);
  assert.match(provider, /rows\.length !== 3/);
});

test("AppContext never weakens configured risk limits after a Holdings Limit rejection", () => {
  const appContext = read("src/context/AppContext.tsx");

  assert.doesNotMatch(appContext, /\[SafetyCheck Auto-Bypass\]/);
  assert.doesNotMatch(appContext, /dailyLossLimit:\s*100[\s\S]{0,160}maxPositionWeight:\s*100/);
  assert.match(appContext, /dailyLossLimit:\s*Math\.max\(0\.1, Number\(profile\?\.dailyLossLimit \?\? 2\)\)/);
  assert.match(appContext, /maxPositionWeight:\s*Math\.min\(100, Math\.max\(1, Number\(profile\?\.maxPositionWeight \?\? 20\)\)\)/);
  assert.match(appContext, /Holdings\/risk safety failures are final\. Never weaken limits and retry automatically\./);
});

test("legacy 4-second scanner cannot submit new BUY entries", () => {
  const appContext = read("src/context/AppContext.tsx");

  assert.match(appContext, /SafeAiAutotradeLauncher is the sole new-entry execution authority/);
  assert.match(appContext, /const allowLegacyNewEntryExecution = false;/);
  assert.match(appContext, /if \(allowLegacyNewEntryExecution && isFullConsensusApproved/);
});

test("trade safety middleware fails closed when callers omit risk limits", () => {
  const server = read("server.ts");

  assert.match(server, /dailyLossLimit\s*=\s*2,\s*currentLossPct\s*=\s*0,\s*marketRiskLevel\s*=\s*"NORMAL",\s*maxPositionWeight\s*=\s*20,/);
  assert.doesNotMatch(server, /dailyLossLimit\s*=\s*100,\s*currentLossPct\s*=\s*0,\s*marketRiskLevel\s*=\s*"NORMAL",\s*maxPositionWeight\s*=\s*100,/);
});
