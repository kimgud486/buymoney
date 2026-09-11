import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const sourcePath = path.resolve("src/components/trading/AiSignalsResponsiveLayoutFix.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

test("AI SIGNALS shows the five truthful manual order lifecycle stages", () => {
  for (const label of [
    "1. 신호 확인",
    "2. 사용자 확인",
    "3. 주문 접수",
    "4. 부분 체결",
    "5. 체결 완료",
  ]) {
    assert.equal(source.includes(label), true, `missing lifecycle label: ${label}`);
  }

  assert.equal(source.includes("매수 확인"), true);
  assert.equal(source.includes("매도 확인"), true);
  assert.equal(source.includes("주문 접수와 체결은 다릅니다"), true);
  assert.equal(source.includes("증권사 주문번호 + 실제 체결수량 + 실제 체결가격"), true);
});

test("AI SIGNALS lifecycle listens to executor truth events", () => {
  assert.equal(source.includes("MANUAL_ORDER_LIFECYCLE_EVENT"), true);
  assert.equal(source.includes("handleManualLifecycle"), true);
  assert.equal(source.includes("BROKER_PARTIAL_PROOF_REQUIRED"), false);
});
