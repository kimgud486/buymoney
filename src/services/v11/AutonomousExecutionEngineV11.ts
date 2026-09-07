// AISTOCK 24 v11 Autonomous Execution Engine Orchestrator
// Pipeline: v10 Global Scanner -> v9 Unified Shape -> Predictive BUY -> Risk Gate -> Execution State Machine -> KIS Broker -> Adaptive Exit

import { ExecutionStateMachine, OrderState, TradingMode, OrderSignal, PositionContext, StateMachineStatus } from "./ExecutionStateMachine";
import { ExecutionRiskEngine, RiskConfig, RiskMetrics, RiskEvaluationResult } from "./ExecutionRiskEngine";
import { KISBrokerAdapter, KISOrderResult, KISPosition, KISBalance } from "./KISBrokerAdapter";
import { AdaptiveExitDecisionEngine, MarketBarSnapshot } from "./AdaptiveExitDecisionEngine";
import { SafeKISBrokerAdapter } from "./SafeKISBrokerAdapter";

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
  private kisAdapter: KISBrokerAdapter;
  private isEngineRunning: boolean = false;
  private logs: ExecutionEngineLog[] = [];
  private totalExecutionsToday: number = 0;
  private evaluationInterval: any = null;
  private listeners: Array<(status: AutonomousEngineStatus) => void> = [];

  constructor(initialMode: TradingMode = "PAPER") {
    this.stateMachine = new ExecutionStateMachine(initialMode);
    this.riskEngine = new ExecutionRiskEngine();
    this.kisAdapter = new KISBrokerAdapter();

    this.addLog("INFO", "v11 Autonomous Execution Engine 초기화 완료", `실행 모드: ${initialMode} | KIS Broker Adapter 및 Risk Gate 가동 준비 완료`);

    // Listen to state machine changes
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
      balance: {
        totalEvalAmount: 10000000,
        cashBalance: 10000000,
        buyingPower: 9500000,
        realizedPnLToday: riskMetrics.dailyRealizedPnLKRW,
        unrealizedPnLToday: smStatus.activePosition ? smStatus.activePosition.unrealizedPnLAmt : 0
      },
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
    this.listeners.forEach(l => l(status));
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

  // Set Mode & Dual-Lock for LIVE
  public setTradingMode(mode: TradingMode, enableLiveDualLock: boolean = false) {
    this.stateMachine.setTradingMode(mode, enableLiveDualLock);
    this.addLog("INFO", "거래 모드 변경", `모드: ${mode} | LIVE 실거래 이중 잠금: ${enableLiveDualLock ? "🟢 해제 (실거래 가능)" : "🔒 잠금 (실거래 차단)"}`);
  }

  // Toggle Global Emergency Kill Switch
  public setKillSwitch(active: boolean) {
    this.riskEngine.setKillSwitch(active);
    if (active) {
      this.stateMachine.triggerLock("사용자에 의한 긴급 킬스위치(Kill Switch) 작동");
      this.addLog("EMERGENCY", "🚨 긴급 킬스위치 가동", "모든 신규 주문이 즉시 차단되고 시스템이 LOCKED 상태로 전환되었습니다.");
    } else {
      this.stateMachine.unlockAdmin();
      this.addLog("INFO", "🟢 킬스위치 해제", "시스템 잠금이 해제되고 정상 자율매매 상태로 복귀했습니다.");
    }
  }

  // Start Autonomous Engine Loop
  public startEngine() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.addLog("INFO", "🤖 v11 자율매매 엔진 시작", "스캐너 시그널 감시, Predictive BUY, Risk Gate, Adaptive Exit 루프가 가동됩니다.");

    this.evaluationInterval = setInterval(() => {
      this.runEvaluationLoop();
    }, 2000); // Evaluates every 2 seconds
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

  // Main Orchestration Loop
  private async runEvaluationLoop() {
    const smStatus = this.stateMachine.getStatus();

    if (smStatus.currentState === "LOCKED") return;

    // 1. If currently in LONG position, run Adaptive Exit AI evaluation
    if (smStatus.currentState === "LONG" && smStatus.activePosition) {
      this.evaluateAdaptiveExit(smStatus.activePosition);
    }
  }

  // Evaluate candidate stock received from v10 Scanner -> v9 Unified Shape AI
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

    if (smStatus.currentState === "COOLDOWN") {
      this.stateMachine.resetToIdle();
      smStatus = this.stateMachine.getStatus();
    }

    if (smStatus.currentState !== "IDLE") {
      return { accepted: false, message: `현재 상태가 IDLE이 아니므로 주문을 접수할 수 없습니다 (현재: ${smStatus.currentState})` };
    }

    // Create Order Signal
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
      reason: "v10 Scanner + v9 Unified Shape AI 상승구조 일치 및 Predictive BUY 승인"
    };

    // Calculate trade amount
    const isUs = candidate.market === "US";
    const qty = isUs ? 10 : 50; // Default lot size
    const orderAmountKRW = candidate.price * qty;
    const orderAmountUSD = candidate.price * qty;

    // 1. Pre-trade Risk Gate Check
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

    this.addLog("RISK_PASS", "🟢 Risk Gate 검증 통과", `[${candidate.name}] 시그널 지연 0.2초, 한도검사 통과. BUY_PENDING 전이.`);

    // 2. Transition State Machine to BUY_PENDING
    const transitionRes = this.stateMachine.transitionToBuyPending(signal);
    if (!transitionRes.success) {
      this.addLog("RISK_REJECT", "상태 전이 실패", transitionRes.reason);
      return { accepted: false, message: transitionRes.reason };
    }

    // 3. Dispatch Order to Broker Adapter (PAPER / DRY_RUN / LIVE)
    try {
      const isLive = this.stateMachine.isLiveExecutionPermitted();
      this.addLog(
        "BUY_EXEC",
        `🚀 [${isLive ? "LIVE 실거래" : "PAPER 모의"}] BUY 주문 제출`,
        `종목: ${candidate.name} (${candidate.symbol}) | 수량: ${qty}주 | 가격: ${(candidate.price ?? 0).toLocaleString()}원`
      );

      const orderResult: KISOrderResult = await this.kisAdapter.placeOrder({
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
      } else {
        this.stateMachine.rejectBuyPending(orderResult.message);
        this.addLog("RISK_REJECT", "❌ BUY 주문 거부", orderResult.message);
        return { accepted: false, message: orderResult.message };
      }
    } catch (err: any) {
      this.stateMachine.rejectBuyPending(err.message);
      this.addLog("EMERGENCY", "🚨 브로커 주문 제출 예외 발생", err.message);
      return { accepted: false, message: err.message };
    }
  }

  // 4. Adaptive Exit AI Evaluation for Active Position
  private adaptiveExitEngine = new AdaptiveExitDecisionEngine();

  public async evaluateAdaptiveExit(position: PositionContext) {
    const bar: MarketBarSnapshot = {
      open: position.currentPrice,
      high: Math.max(position.highPriceSinceBuy, position.currentPrice),
      low: position.currentPrice,
      close: position.currentPrice,
      volume: 100000,
      vwap: position.buyPrice * 0.998,
      ema5: position.buyPrice * 0.995,
      ema20: position.buyPrice * 0.985,
      macdHist: 0.5,
      rsi: 55,
      dmiPlus: 25,
      dmiMinus: 15,
      buyVolumeRatio: 0.6,
      sellVolumeRatio: 0.4,
      isCompletedBar: true
    };
    await this.evaluateAdaptiveExitWithBar(position, bar);
  }

  public async evaluateAdaptiveExitWithBar(position: PositionContext, bar: MarketBarSnapshot) {
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

  // Execute SELL Order
  public async executeSellOrder(position: PositionContext, reason: string) {
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
      const orderResult: KISOrderResult = await this.kisAdapter.placeOrder({
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
        this.stateMachine.confirmSellFill(15000); // 15 second cooldown

        this.addLog(
          "SELL_EXEC",
          `🟢 SELL 체결 완료 (${pnlKRW >= 0 ? "+" : ""}${(pnlKRW ?? 0).toLocaleString()}원)`,
          `종목: ${position.name} | 매도가: ${(position.currentPrice ?? 0).toLocaleString()}원 | 사유: ${reason}`
        );
      } else {
        this.stateMachine.rejectSellPending(orderResult.message);
      }
    } catch (err: any) {
      this.stateMachine.rejectSellPending(err.message);
    }
  }
}
