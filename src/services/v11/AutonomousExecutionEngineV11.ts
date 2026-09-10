// AISTOCK 24 v11 Autonomous Execution Engine Orchestrator
// Pipeline: v10 Global Scanner -> v9 Unified Shape -> Predictive BUY -> Risk Gate -> Execution State Machine -> KIS Broker -> Adaptive Exit

import { ExecutionStateMachine, TradingMode, OrderSignal, PositionContext, StateMachineStatus } from "./ExecutionStateMachine";
import { ExecutionRiskEngine, RiskMetrics, RiskEvaluationResult } from "./ExecutionRiskEngine";
import { KISBalance } from "./KISBrokerAdapter";
import { AdaptiveExitDecisionEngine, MarketBarSnapshot } from "./AdaptiveExitDecisionEngine";
import { SafeKISBrokerAdapter, OrderResultV12 } from "./SafeKISBrokerAdapter";

export interface ExecutionEngineLog {
  id: string;
  timestamp: string;
  level: "INFO" | "RISK_PASS" | "RISK_REJECT" | "BUY_EXEC" | "SELL_EXEC" | "EXIT_AI" | "EMERGENCY";
  title: string;
  detail: string;
}

export interface AutonomousEngineStatus {
  stateMachine: StateMachineStatus;
  riskMetrics: RiskMetrics;
  mode: TradingMode;
  liveTradingEnabled: boolean;
  activePosition: PositionContext | null;
  balance: KISBalance | null;
  logs: ExecutionEngineLog[];
  isEngineRunning: boolean;
  totalExecutionsToday: number;
}

export class AutonomousExecutionEngineV11 {
  private stateMachine: ExecutionStateMachine;
  private riskEngine: ExecutionRiskEngine;
  private kisAdapter: SafeKISBrokerAdapter;
  private isEngineRunning = false;
  private logs: ExecutionEngineLog[] = [];
  private totalExecutionsToday = 0;
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(status: AutonomousEngineStatus) => void> = [];
  private adaptiveExitEngine = new AdaptiveExitDecisionEngine();

  constructor(initialMode: TradingMode = "LIVE") {
    this.stateMachine = new ExecutionStateMachine(initialMode);
    this.riskEngine = new ExecutionRiskEngine();
    this.kisAdapter = new SafeKISBrokerAdapter(initialMode, false);

    this.addLog(
      "INFO",
      "v11 Autonomous Execution Engine 초기화 완료",
      `실행 모드: ${initialMode} | 주문 승인은 잠금 상태에서 시작합니다.`
    );

    this.stateMachine.subscribe(() => this.notify());
  }

  public getStatus(): AutonomousEngineStatus {
    const smStatus = this.stateMachine.getStatus();
    const riskMetrics = this.riskEngine.getMetrics();

    return {
      stateMachine: smStatus,
      riskMetrics,
      mode: smStatus.mode,
      liveTradingEnabled: smStatus.liveTradingEnabled,
      activePosition: smStatus.activePosition,
      // Never fabricate account balances. Real account data must come from the broker/account sync path.
      balance: null,
      logs: [...this.logs],
      isEngineRunning: this.isEngineRunning,
      totalExecutionsToday: this.totalExecutionsToday
    };
  }

  public subscribe(listener: (status: AutonomousEngineStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  private addLog(level: ExecutionEngineLog["level"], title: string, detail: string) {
    const logItem: ExecutionEngineLog = {
      id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      level,
      title,
      detail
    };
    this.logs.unshift(logItem);
    if (this.logs.length > 80) this.logs.pop();
    this.notify();
  }

  public setTradingMode(mode: TradingMode, enableLiveDualLock = false) {
    this.stateMachine.setTradingMode(mode, enableLiveDualLock);
    this.kisAdapter.setMode(mode, enableLiveDualLock);
    this.addLog(
      "INFO",
      "LIVE 주문 승인 상태 변경",
      `모드: ${mode} | 주문 승인: ${enableLiveDualLock ? "🟢 허용" : "🔒 차단"}`
    );
  }

  public setKillSwitch(active: boolean) {
    this.riskEngine.setKillSwitch(active);
    if (active) {
      this.stateMachine.triggerLock("사용자에 의한 긴급 킬스위치(Kill Switch) 작동");
      this.addLog("EMERGENCY", "🚨 긴급 킬스위치 가동", "모든 신규 주문이 즉시 차단되고 시스템이 LOCKED 상태로 전환되었습니다.");
    } else {
      this.stateMachine.unlockAdmin();
      this.addLog("INFO", "🟢 킬스위치 해제", "시스템 잠금이 해제되고 정상 감시 상태로 복귀했습니다.");
    }
  }

  public startEngine() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.addLog("INFO", "🤖 v11 자율매매 엔진 시작", "스캐너 시그널 감시와 실제 데이터 기반 주문/청산 경로가 가동됩니다.");

    this.evaluationInterval = setInterval(() => {
      this.runEvaluationLoop();
    }, 2000);
    this.notify();
  }

  public stopEngine() {
    this.isEngineRunning = false;
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    this.addLog("INFO", "⏸️ v11 자율매매 엔진 정지", "자율매매 감시 루프가 정지되었습니다.");
    this.notify();
  }

  private runEvaluationLoop() {
    const smStatus = this.stateMachine.getStatus();
    if (smStatus.currentState === "LOCKED") return;

    // Do not create synthetic candles/bars in LIVE mode.
    // Adaptive exit is evaluated only when a real completed bar is supplied to evaluateAdaptiveExitWithBar().
  }

  public async processCandidateOrder(candidate: {
    symbol: string;
    name: string;
    market: "KOREA" | "US" | "BTC";
    price: number;
    scannerScore: number;
    unifiedShape: string;
    rvol: number;
    executionPower: number;
  }): Promise<{ accepted: boolean; message: string }> {
    let smStatus = this.stateMachine.getStatus();

    if (!this.stateMachine.isLiveExecutionPermitted()) {
      return { accepted: false, message: "LIVE 주문 승인이 잠겨 있어 주문을 전송할 수 없습니다." };
    }

    if (smStatus.currentState === "COOLDOWN") {
      this.stateMachine.resetToIdle();
      smStatus = this.stateMachine.getStatus();
    }

    if (smStatus.currentState !== "IDLE") {
      return { accepted: false, message: `현재 상태가 IDLE이 아니므로 주문을 접수할 수 없습니다 (현재: ${smStatus.currentState})` };
    }

    if (!Number.isFinite(candidate.price) || candidate.price <= 0) {
      return { accepted: false, message: "유효한 실시간 가격이 없어 주문을 차단했습니다." };
    }

    const signal: OrderSignal = {
      id: `SIG_${Date.now()}`,
      symbol: candidate.symbol,
      name: candidate.name,
      market: candidate.market,
      signalType: "BUY",
      price: candidate.price,
      convictionScore: candidate.scannerScore,
      timestamp: Date.now(),
      scannerScore: candidate.scannerScore,
      unifiedShape: candidate.unifiedShape,
      reason: "Global Scanner + Unified Shape AI 상승구조 일치 및 BUY 승인"
    };

    const isUs = candidate.market === "US";
    const qty = isUs ? 10 : 50;
    const orderAmountKRW = candidate.price * qty;
    const orderAmountUSD = candidate.price * qty;

    const riskEval: RiskEvaluationResult = this.riskEngine.evaluateBuyOrderRisk(
      orderAmountKRW,
      orderAmountUSD,
      smStatus.activePosition ? 1 : 0,
      signal.timestamp,
      candidate.market
    );

    if (!riskEval.passed) {
      this.addLog("RISK_REJECT", "🛡️ Risk Gate 주문 차단", riskEval.rejectReason || "위험 관리 규칙 위반");
      return { accepted: false, message: riskEval.rejectReason || "Risk Gate 차단" };
    }

    this.addLog("RISK_PASS", "🟢 Risk Gate 검증 통과", `[${candidate.name}] 한도검사 통과. BUY_PENDING 전이.`);

    const transitionRes = this.stateMachine.transitionToBuyPending(signal);
    if (!transitionRes.success) {
      this.addLog("RISK_REJECT", "상태 전이 실패", transitionRes.reason);
      return { accepted: false, message: transitionRes.reason };
    }

    try {
      this.addLog(
        "BUY_EXEC",
        "🚀 [LIVE 실거래] BUY 주문 제출",
        `종목: ${candidate.name} (${candidate.symbol}) | 수량: ${qty}주 | 기준가격: ${candidate.price.toLocaleString()}`
      );

      const orderResult: OrderResultV12 = await this.kisAdapter.placeOrder({
        symbol: candidate.symbol,
        name: candidate.name,
        market: candidate.market,
        side: "BUY",
        price: candidate.price,
        qty,
        orderType: "MARKET"
      });

      if (orderResult.success && orderResult.status === "FILLED") {
        const positionContext: PositionContext = {
          symbol: candidate.symbol,
          name: candidate.name,
          market: candidate.market,
          buyPrice: orderResult.filledAvgPrice || candidate.price,
          currentPrice: orderResult.filledAvgPrice || candidate.price,
          qty: orderResult.filledQty || qty,
          buyTimestamp: Date.now(),
          unrealizedPnLAmt: 0,
          unrealizedPnLPct: 0,
          highPriceSinceBuy: orderResult.filledAvgPrice || candidate.price,
          trailingExitPrice: Math.round((orderResult.filledAvgPrice || candidate.price) * 0.985),
          orderId: orderResult.orderId
        };

        this.stateMachine.confirmBuyFill(positionContext);
        this.totalExecutionsToday += 1;
        this.addLog("BUY_EXEC", "✅ BUY 체결 완료 (LONG 진입)", orderResult.message);
        return { accepted: true, message: orderResult.message };
      }

      this.stateMachine.rejectBuyPending(orderResult.message);
      this.addLog("RISK_REJECT", "❌ BUY 주문 거부/미확정", orderResult.message);
      return { accepted: false, message: orderResult.message };
    } catch (err: any) {
      const message = String(err?.message || "브로커 주문 제출 예외");
      this.stateMachine.rejectBuyPending(message);
      this.addLog("EMERGENCY", "🚨 브로커 주문 제출 예외 발생", message);
      return { accepted: false, message };
    }
  }

  public async evaluateAdaptiveExit(position: PositionContext) {
    this.addLog(
      "INFO",
      "Adaptive Exit 대기",
      `${position.symbol}: 실제 완료 bar 입력 전에는 청산 판단을 실행하지 않습니다.`
    );
  }

  public async evaluateAdaptiveExitWithBar(position: PositionContext, bar: MarketBarSnapshot) {
    if (!bar?.isCompletedBar || !Number.isFinite(bar.close) || bar.close <= 0) {
      this.addLog("RISK_REJECT", "Adaptive Exit 입력 차단", "완료된 실제 bar가 아니거나 유효한 종가가 없습니다.");
      return;
    }

    this.stateMachine.updatePositionPrice(bar.close);

    const posV12 = {
      symbol: position.symbol,
      name: position.name,
      market: position.market,
      buyPrice: position.buyPrice,
      currentPrice: bar.close,
      qty: position.qty,
      buyTimestamp: position.buyTimestamp,
      highPriceSinceBuy: Math.max(position.highPriceSinceBuy, bar.high),
      trailingExitPrice: position.trailingExitPrice
    };

    const result = this.adaptiveExitEngine.evaluateExit(posV12, bar);
    if (result.shouldExit) {
      await this.executeSellOrder(position, result.primaryReason);
    }
  }

  public async executeSellOrder(position: PositionContext, reason: string) {
    if (!this.stateMachine.isLiveExecutionPermitted()) {
      this.addLog("RISK_REJECT", "SELL 주문 차단", "LIVE 주문 승인이 잠겨 있습니다.");
      return;
    }

    const sellSignal: OrderSignal = {
      id: `SELL_SIG_${Date.now()}`,
      symbol: position.symbol,
      name: position.name,
      market: position.market,
      signalType: "SELL",
      price: position.currentPrice,
      convictionScore: 90,
      timestamp: Date.now(),
      scannerScore: 90,
      unifiedShape: "Adaptive Exit Breakdown",
      reason
    };

    const sellRes = this.stateMachine.transitionToSellPending(sellSignal);
    if (!sellRes.success) return;

    this.addLog("EXIT_AI", "📉 Adaptive Exit AI SELL 시그널 포착", reason);

    try {
      const orderResult: OrderResultV12 = await this.kisAdapter.placeOrder({
        symbol: position.symbol,
        name: position.name,
        market: position.market,
        side: "SELL",
        price: position.currentPrice,
        qty: position.qty,
        orderType: "MARKET"
      });

      if (orderResult.success && orderResult.status === "FILLED") {
        const pnlKRW = Math.round(position.unrealizedPnLAmt);
        this.riskEngine.recordTradeResult(pnlKRW);
        this.stateMachine.confirmSellFill(15000);

        this.addLog(
          "SELL_EXEC",
          `🟢 SELL 체결 완료 (${pnlKRW >= 0 ? "+" : ""}${pnlKRW.toLocaleString()}원)`,
          `종목: ${position.name} | 매도가: ${position.currentPrice.toLocaleString()}원 | 사유: ${reason}`
        );
      } else {
        this.stateMachine.rejectSellPending(orderResult.message);
      }
    } catch (err: any) {
      this.stateMachine.rejectSellPending(String(err?.message || "SELL 주문 제출 예외"));
    }
  }
}
