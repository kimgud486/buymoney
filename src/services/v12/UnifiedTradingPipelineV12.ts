// AISTOCK v12 Unified Trading Pipeline Master Orchestrator
// REAL MARKET DATA -> SCANNER V12 -> TOP 20 -> UNIFIED SHAPE AI -> PREDICTIVE BUY -> RISK GATE -> EXECUTION STATE MACHINE -> SAFE BROKER ADAPTER -> FILL CONFIRMATION -> POSITION MANAGER -> ADAPTIVE EXIT AI -> HOLD / PROFIT_HOLD / SELL_WATCH / SELL

import { GlobalStockDiscoveryScannerV12, ScannedStockV12, MarketDiscoveryProvider } from "../GlobalStockDiscoveryScannerV12";
import { ExecutionStateMachine, OrderSignal, PositionContext, StateMachineStatus } from "../v11/ExecutionStateMachine";
import { ExecutionRiskEngine, RiskEvaluationResult } from "../v11/ExecutionRiskEngine";
import { SafeKISBrokerAdapter, ExecutionModeV12, OrderResultV12 } from "../v11/SafeKISBrokerAdapter";
import { AdaptiveExitDecisionEngine, MarketBarSnapshot, ExitDecisionResult } from "../v11/AdaptiveExitDecisionEngine";

export interface PipelineLogV12 {
  id: string;
  timestamp: string;
  level: "INFO" | "SCAN" | "RISK_PASS" | "RISK_REJECT" | "BUY_EXEC" | "SELL_EXEC" | "EXIT_AI" | "EMERGENCY";
  title: string;
  detail: string;
}

export interface UnifiedPipelineStatusV12 {
  stateMachine: StateMachineStatus;
  mode: ExecutionModeV12;
  liveTradingEnabled: boolean;
  activePosition: PositionContext | null;
  top20Candidates: ScannedStockV12[];
  logs: PipelineLogV12[];
  isPipelineRunning: boolean;
  totalExecutionsToday: number;
  lastScanTimestamp: string;
}

export class UnifiedTradingPipelineV12 {
  private static instance: UnifiedTradingPipelineV12 | null = null;

  private scanner: GlobalStockDiscoveryScannerV12;
  private stateMachine: ExecutionStateMachine;
  private riskEngine: ExecutionRiskEngine;
  private brokerAdapter: SafeKISBrokerAdapter;
  private adaptiveExitEngine: AdaptiveExitDecisionEngine;

  private top20Candidates: ScannedStockV12[] = [];
  private logs: PipelineLogV12[] = [];
  private isPipelineRunning: boolean = false;
  private totalExecutionsToday: number = 0;
  private lastScanTimestamp: string = "미실행";
  private listeners: Array<(status: UnifiedPipelineStatusV12) => void> = [];

  constructor(initialMode: ExecutionModeV12 = "PAPER", provider?: MarketDiscoveryProvider) {
    this.scanner = new GlobalStockDiscoveryScannerV12(provider);
    this.stateMachine = new ExecutionStateMachine(initialMode === "LIVE" ? "LIVE" : "PAPER");
    this.riskEngine = new ExecutionRiskEngine();
    this.brokerAdapter = new SafeKISBrokerAdapter(initialMode, false);
    this.adaptiveExitEngine = new AdaptiveExitDecisionEngine();

    this.addLog("INFO", "v12 Unified Trading Pipeline 파이프라인 가동", `초기 실행 모드: ${initialMode} | 단일 매매 관문 활성화`);
    this.stateMachine.subscribe(() => this.notify());
  }

  public static getInstance(initialMode: ExecutionModeV12 = "PAPER"): UnifiedTradingPipelineV12 {
    if (!UnifiedTradingPipelineV12.instance) {
      UnifiedTradingPipelineV12.instance = new UnifiedTradingPipelineV12(initialMode);
    }
    return UnifiedTradingPipelineV12.instance;
  }

  public getStatus(): UnifiedPipelineStatusV12 {
    const smStatus = this.stateMachine.getStatus();
    return {
      stateMachine: smStatus,
      mode: (smStatus.mode as ExecutionModeV12) || "PAPER",
      liveTradingEnabled: smStatus.liveTradingEnabled,
      activePosition: smStatus.activePosition,
      top20Candidates: [...this.top20Candidates],
      logs: [...this.logs],
      isPipelineRunning: this.isPipelineRunning,
      totalExecutionsToday: this.totalExecutionsToday,
      lastScanTimestamp: this.lastScanTimestamp
    };
  }

  public subscribe(listener: (status: UnifiedPipelineStatusV12) => void): () => void {
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

  private addLog(level: PipelineLogV12["level"], title: string, detail: string) {
    const item: PipelineLogV12 = {
      id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      level,
      title,
      detail
    };
    this.logs.unshift(item);
    if (this.logs.length > 100) this.logs.pop();
    this.notify();
  }

  public setExecutionMode(mode: ExecutionModeV12, liveTradingEnabled: boolean = false) {
    this.stateMachine.setTradingMode(mode === "LIVE" ? "LIVE" : "PAPER", liveTradingEnabled);
    this.brokerAdapter.setMode(mode, liveTradingEnabled);
    this.addLog("INFO", "v12 실행 모드 변경", `모드: ${mode} | 실거래 이중잠금: ${liveTradingEnabled ? "ON" : "OFF"}`);
  }

  // 1. Run Global Discovery Scan
  public async runScan(): Promise<ScannedStockV12[]> {
    try {
      this.top20Candidates = await this.scanner.scanTop20Candidates();
      this.lastScanTimestamp = new Date().toLocaleTimeString("ko-KR");
      this.addLog("SCAN", "📡 v12 Global Stock Discovery 1초 퀀트 스캔 완료", `발굴 종목: TOP ${this.top20Candidates.length}개 추출 완료`);
      this.notify();
      return this.top20Candidates;
    } catch (err: any) {
      this.addLog("EMERGENCY", "🚨 스캔 오류 발생", err.message);
      return [];
    }
  }

  // 2. Unified Master Predictive BUY Gate
  public async processCandidateBuyOrder(candidate: {
    symbol: string;
    name: string;
    market: "KOREA" | "US" | "BTC";
    price: number;
    score: number;
    setupPattern: string;
    aiReason: string;
  }): Promise<{ success: boolean; message: string }> {
    let smStatus = this.stateMachine.getStatus();

    if (smStatus.currentState === "COOLDOWN") {
      this.stateMachine.resetToIdle();
      smStatus = this.stateMachine.getStatus();
    }

    if (smStatus.currentState !== "IDLE") {
      return { success: false, message: `현재 파이프라인 상태가 IDLE이 아닙니다 (${smStatus.currentState})` };
    }

    const signal: OrderSignal = {
      id: `SIG_V12_${Date.now()}`,
      symbol: candidate.symbol,
      name: candidate.name,
      market: candidate.market,
      signalType: "BUY",
      price: candidate.price,
      convictionScore: candidate.score,
      timestamp: Date.now(),
      scannerScore: candidate.score,
      unifiedShape: candidate.setupPattern,
      reason: candidate.aiReason
    };

    const isUs = candidate.market === "US";
    const qty = isUs ? 10 : 50;
    const orderAmountKRW = candidate.price * qty;

    // Pre-trade Risk Gate Check
    const riskEval: RiskEvaluationResult = this.riskEngine.evaluateBuyOrderRisk(
      orderAmountKRW,
      orderAmountKRW,
      smStatus.activePosition ? 1 : 0,
      signal.timestamp,
      candidate.market
    );

    if (!riskEval.passed) {
      this.addLog("RISK_REJECT", "🛡️ v12 Risk Gate 주문 차단", riskEval.rejectReason || "위험 한도 초과");
      return { success: false, message: riskEval.rejectReason || "Risk Gate 차단" };
    }

    this.addLog("RISK_PASS", "🟢 Risk Gate 승인", `[${candidate.name}] 포지션 수 및 잔고검사 통과. BUY_PENDING 진입`);

    const transitionRes = this.stateMachine.transitionToBuyPending(signal);
    if (!transitionRes.success) {
      this.addLog("RISK_REJECT", "상태 전이 실패", transitionRes.reason);
      return { success: false, message: transitionRes.reason };
    }

    // Safe Broker Order Dispatch
    try {
      const orderRes: OrderResultV12 = await this.brokerAdapter.placeOrder({
        symbol: candidate.symbol,
        name: candidate.name,
        market: candidate.market,
        side: "BUY",
        price: candidate.price,
        qty,
        orderType: "MARKET"
      });

      if (orderRes.success && orderRes.status === "FILLED") {
        const positionContext: PositionContext = {
          symbol: candidate.symbol,
          name: candidate.name,
          market: candidate.market,
          buyPrice: orderRes.filledAvgPrice || candidate.price,
          currentPrice: orderRes.filledAvgPrice || candidate.price,
          qty: orderRes.filledQty || qty,
          buyTimestamp: Date.now(),
          unrealizedPnLAmt: 0,
          unrealizedPnLPct: 0,
          highPriceSinceBuy: orderRes.filledAvgPrice || candidate.price,
          trailingExitPrice: Math.round((orderRes.filledAvgPrice || candidate.price) * 0.985),
          orderId: orderRes.orderId
        };

        this.stateMachine.confirmBuyFill(positionContext);
        this.totalExecutionsToday += 1;
        this.addLog("BUY_EXEC", "✅ BUY 체결 완료 (LONG 포지션 진입)", orderRes.message);
        return { success: true, message: orderRes.message };
      } else {
        this.stateMachine.rejectBuyPending(orderRes.message);
        this.addLog("RISK_REJECT", "❌ BUY 주문 거부", orderRes.message);
        return { success: false, message: orderRes.message };
      }
    } catch (err: any) {
      this.stateMachine.rejectBuyPending(err.message);
      this.addLog("EMERGENCY", "🚨 주문 예외 발생", err.message);
      return { success: false, message: err.message };
    }
  }

  // 3. Process Market Bar Update with Adaptive Exit AI
  public evaluateActivePositionWithBar(bar: MarketBarSnapshot): ExitDecisionResult | null {
    const smStatus = this.stateMachine.getStatus();
    if (smStatus.currentState !== "LONG" || !smStatus.activePosition) {
      return null;
    }

    const pos = smStatus.activePosition;
    this.stateMachine.updatePositionPrice(bar.close);

    const posV12 = {
      symbol: pos.symbol,
      name: pos.name,
      market: pos.market,
      buyPrice: pos.buyPrice,
      currentPrice: bar.close,
      qty: pos.qty,
      buyTimestamp: pos.buyTimestamp,
      highPriceSinceBuy: Math.max(pos.highPriceSinceBuy, bar.high),
      trailingExitPrice: pos.trailingExitPrice
    };

    const exitDecision = this.adaptiveExitEngine.evaluateExit(posV12, bar);

    if (exitDecision.shouldExit) {
      this.executeSellOrder(pos, exitDecision.primaryReason);
    } else {
      this.addLog("EXIT_AI", `📊 Adaptive Exit 모니터링 (${exitDecision.exitType})`, exitDecision.primaryReason);
    }

    return exitDecision;
  }

  private async executeSellOrder(pos: PositionContext, reason: string) {
    this.addLog("SELL_EXEC", `📉 SELL 주문 제출 (${pos.name})`, reason);

    const orderRes: OrderResultV12 = await this.brokerAdapter.placeOrder({
      symbol: pos.symbol,
      name: pos.name,
      market: pos.market,
      side: "SELL",
      price: pos.currentPrice,
      qty: pos.qty,
      orderType: "MARKET"
    });

    if (orderRes.success && orderRes.status === "FILLED") {
      const pnlAmt = Math.round((pos.currentPrice - pos.buyPrice) * pos.qty);
      this.stateMachine.confirmSellFill(30000);
      this.addLog("SELL_EXEC", "✅ SELL 체결 완료 (청산 완료)", `수익금: ${(pnlAmt ?? 0).toLocaleString()}원 | ${reason}`);
    } else {
      this.addLog("EMERGENCY", "❌ SELL 주문 실패", orderRes.message);
    }
  }
}
