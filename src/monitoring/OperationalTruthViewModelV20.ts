export type OperationalGateStateV20 = "READY" | "BLOCKED" | "TEST_ONLY" | "NO_DATA";

export interface OperationalTruthInputV20 {
  engineRunning: boolean;
  mode: "DRY_RUN" | "LIVE" | string;
  liveTradingEnabled: boolean;
  killSwitchActive: boolean;
  executionState: string;
  dailyRealizedPnLKRW: number;
  activeUnrealizedPnLKRW: number;
  brokerConnected: boolean;
  brokerDataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA" | string;
  brokerProofStatus: "ESTABLISHED" | "PROOF_NOT_ESTABLISHED" | string;
  brokerBlockers: string[];
  brokerHoldingsUnrealizedPnLKRW: number;
}

export interface OperationalTruthViewModelV20 {
  gateState: OperationalGateStateV20;
  gateLabel: string;
  executionState: string;
  executionLabel: string;
  riskGateLabel: string;
  brokerLabel: string;
  dataLabel: string;
  todayRealizedPnLKRW: number;
  brokerUnrealizedPnLKRW: number;
  todayCombinedPnLKRW: number;
  blockers: string[];
  sourceLabel: string;
}

const finite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function buildOperationalTruthViewModelV20(input: OperationalTruthInputV20): OperationalTruthViewModelV20 {
  const blockers = Array.from(new Set([
    ...(input.killSwitchActive ? ["KILL_SWITCH_ACTIVE"] : []),
    ...(!input.engineRunning ? ["ENGINE_PAUSED"] : []),
    ...(input.mode === "LIVE" && !input.liveTradingEnabled ? ["LIVE_DUAL_LOCKED"] : []),
    ...(input.mode === "LIVE" && !input.brokerConnected ? ["BROKER_NOT_CONNECTED"] : []),
    ...(input.mode === "LIVE" && input.brokerDataStatus !== "REALTIME_VERIFIED" ? ["BROKER_DATA_NOT_REALTIME"] : []),
    ...(input.mode === "LIVE" && input.brokerProofStatus !== "ESTABLISHED" ? ["LIVE_ENVIRONMENT_NOT_PROVEN"] : []),
    ...(input.brokerBlockers || [])
  ]));

  let gateState: OperationalGateStateV20;
  if (input.mode !== "LIVE") {
    gateState = input.engineRunning && !input.killSwitchActive ? "TEST_ONLY" : "BLOCKED";
  } else if (!input.brokerConnected && input.brokerDataStatus === "NO_DATA") {
    gateState = "NO_DATA";
  } else {
    gateState = blockers.length === 0 ? "READY" : "BLOCKED";
  }

  const gateLabel = gateState === "READY"
    ? "실거래 준비 PASS"
    : gateState === "TEST_ONLY"
      ? "시세+테스트 모드"
      : gateState === "NO_DATA"
        ? "브로커 데이터 없음"
        : "Risk Gate 차단";

  const executionState = String(input.executionState || "NO_TRADE");
  const executionLabel = executionState === "LONG"
    ? "보유 중"
    : executionState === "BUY_PENDING"
      ? "매수 주문 대기"
      : executionState === "SELL_PENDING"
        ? "매도 주문 대기"
        : executionState === "COOLDOWN"
          ? "재진입 대기"
          : executionState;

  const realized = finite(input.dailyRealizedPnLKRW);
  const brokerUnrealized = finite(input.brokerHoldingsUnrealizedPnLKRW);

  return {
    gateState,
    gateLabel,
    executionState,
    executionLabel,
    riskGateLabel: input.killSwitchActive ? "KILL SWITCH" : blockers.length === 0 ? "PASS" : "BLOCKED",
    brokerLabel: input.brokerConnected ? "KIS 연결됨" : "KIS 연결 안 됨",
    dataLabel: input.brokerDataStatus === "REALTIME_VERIFIED" ? "실시간 검증" : input.brokerDataStatus,
    todayRealizedPnLKRW: realized,
    brokerUnrealizedPnLKRW: brokerUnrealized,
    todayCombinedPnLKRW: realized + brokerUnrealized,
    blockers,
    sourceLabel: "실현손익: ENGINE · 평가손익: BROKER"
  };
}
