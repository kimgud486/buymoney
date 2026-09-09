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
  assert.match(provider, /dataStatus: derived \? "REALTIME_DERIVED" : "REALTIME_VERIFIED"/);
  assert.match(provider, /rows\.length !== 3/);
});
