// AI TRADING ORCHESTRATOR ENGINE - CENTRALIZED BOT AGGREGATION & STATE MANAGEMENT

import { analyzeStockWith30Agents } from "./multiAgentOrchestrator";
import { MultiAgentStockAnalysis, BotOutput } from "../types/multiAgentTypes";

export type TradingMode = "AUTONOMOUS" | "HYBRID" | "MANUAL";
export type LogSeverity = "INFO" | "AI_BUY" | "MANUAL_BUY" | "SELL" | "SHIELD" | "EMERGENCY";

export interface ExecutionLogItem {
  id: string;
  timestamp: string;
  type: LogSeverity;
  title: string;
  detail: string;
}

import { UpbitFeeAndNetProfitGuard } from "./UpbitFeeAndNetProfitGuard";
import { aiProfitSupervisoryEngine } from "./aiProfitSupervisoryEngine";

export interface ActivePositionState {
  symbol: string;
  name: string;
  qty: number;
  buyPrice: number;
  currentPrice: number;
  pnlAmount: number;
  pnlPct: number;
  trailingShieldPrice: number;
  isShieldActive: boolean;
}

export interface OrchestratedState {
  mode: TradingMode;
  isEngineActive: boolean;
  minConvictionScore: number; // e.g., 70, 75, 85, 90
  dailyPnLGoalPct: number; // e.g., +1.5%
  currentDailyPnLAmount: number;
  circuitBreakerTriggered: boolean;
  activePosition: ActivePositionState | null;
  logs: ExecutionLogItem[];
  selectedSymbol: string;
  currentAnalysis: MultiAgentStockAnalysis;
}

// Initial Preset Stock
const DEFAULT_STOCK = {
  symbol: "005930",
  name: "삼성전자",
  market: "KOREA" as const,
  price: 74800,
  changePct: 2.8,
  tradingValue: 1250,
  rvol: 2.7,
  executionPower: 145,
  sector: "반도체/AI"
};

class AiTradingOrchestratorEngine {
  private state: OrchestratedState;
  private listeners: Array<(state: OrchestratedState) => void> = [];

  constructor() {
    const initialAnalysis = analyzeStockWith30Agents(DEFAULT_STOCK);

    this.state = {
      mode: "AUTONOMOUS",
      isEngineActive: true,
      minConvictionScore: 85,
      dailyPnLGoalPct: 1.5,
      currentDailyPnLAmount: 0,
      circuitBreakerTriggered: false,
      activePosition: null,
      logs: [
        {
          id: "1",
          timestamp: new Date().toLocaleTimeString("ko-KR"),
          type: "INFO",
          title: "AI Trading Orchestrator 엔진 가동",
          detail: "실시간 시장 호가 데이터 연동 및 30개 전문 분석 봇 중앙 관제 상태 준비 완료"
        }
      ],
      selectedSymbol: "005930",
      currentAnalysis: initialAnalysis
    };
  }

  public getState(): OrchestratedState {
    return { ...this.state };
  }

  public subscribe(listener: (state: OrchestratedState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  public setMode(mode: TradingMode) {
    this.state.mode = mode;
    this.addLog(
      "INFO",
      `매매 모드 전환: ${mode === "AUTONOMOUS" ? "100% AI 자율매매" : mode === "HYBRID" ? "하이브리드 모드" : "수동 전용 모드"}`,
      `중앙 제어 엔진 매매 모드가 [${mode}]로 즉시 변경되었습니다.`
    );
    this.notify();
  }

  public toggleEngineActive() {
    this.state.isEngineActive = !this.state.isEngineActive;
    this.addLog(
      "INFO",
      `AI 뇌엔진 상태 변경: ${this.state.isEngineActive ? "가동 시작" : "일시 정지"}`,
      `실시간 30개 봇 수급 스캔 모듈이 ${this.state.isEngineActive ? "활성화" : "정지"}되었습니다.`
    );
    this.notify();
  }

  public setMinConvictionScore(score: number) {
    this.state.minConvictionScore = score;
    this.addLog(
      "INFO",
      `AI 확신 기준 점수 변경: ${score}점 이상`,
      `AI 자율 매수 집행 최소 기준이 [${score}점]으로 재설정되었습니다.`
    );
    this.notify();
  }

  public executeInstantAiAutoBuy() {
    const stock = DEFAULT_STOCK;

    // 1. AI Profit Supervisory Quality Gate Evaluation
    const qualityGate = aiProfitSupervisoryEngine.evaluateEntryQuality({
      symbol: stock.symbol,
      name: stock.name,
      rvol: stock.rvol,
      executionPower: stock.executionPower,
      changePct: stock.changePct
    });

    if (!qualityGate.approved) {
      this.addLog(
        "SHIELD",
        `🛡️ AI 총괄 관리감독 거버넌스: 매수 차단`,
        `[${stock.name}] ${qualityGate.rejectionDetails || qualityGate.reason} (저승률 리스크 방어)`
      );
      this.notify();
      return;
    }

    // 2. Delegate to v12 Unified Trading Pipeline (Single Gate Master)
    import("./v12/UnifiedTradingPipelineV12").then(({ UnifiedTradingPipelineV12 }) => {
      const pipeline = UnifiedTradingPipelineV12.getInstance();
      pipeline.processCandidateBuyOrder({
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price: stock.price,
        score: 92,
        setupPattern: "SMC_LIQUIDITY",
        aiReason: "Unified Master Decision AI 시그널"
      }).then(res => {
        if (res.success) {
          this.addLog("AI_BUY", `⚡ v12 Unified Trading Pipeline 체결 승인`, res.message);
        } else {
          this.addLog("SHIELD", `🛡️ v12 Pipeline 차단`, res.message);
        }
      });
    });
  }

  public checkPositionGovernance() {
    if (!this.state.activePosition) return;
    const pos = this.state.activePosition;
    const govResult = aiProfitSupervisoryEngine.evaluatePositionGovernance({
      symbol: pos.symbol,
      name: pos.name,
      buyPrice: pos.buyPrice,
      currentPrice: pos.currentPrice
    });

    if (govResult.action === "HARD_STOP_LOSS") {
      this.addLog("EMERGENCY", `🚨 AI 관리감독 손절 집행: ${pos.name}`, govResult.reason);
      this.executeSell("ALL");
    } else if (govResult.action === "SCALE_OUT_50") {
      this.addLog("SHIELD", `💰 AI 관리감독 50% 분할 익절: ${pos.name}`, govResult.reason);
      this.executeSell("PARTIAL");
    } else if (govResult.action === "TRAILING_STOP") {
      this.addLog("SHIELD", `🛡️ AI 트레일링 스탑 청산: ${pos.name}`, govResult.reason);
      this.executeSell("ALL");
    }
  }

  public executeManualBuy(amount: number) {
    const stock = DEFAULT_STOCK;
    const qty = Math.max(1, Math.floor(amount / stock.price));

    const existingQty = this.state.activePosition?.qty || 0;
    const newQty = existingQty + qty;

    this.state.activePosition = {
      symbol: stock.symbol,
      name: stock.name,
      qty: newQty,
      buyPrice: stock.price,
      currentPrice: stock.price,
      pnlAmount: 0,
      pnlPct: 0.0,
      trailingShieldPrice: Math.round(stock.price * 0.99),
      isShieldActive: true
    };

    this.addLog(
      "MANUAL_BUY",
      `수동 매수 체결: ${stock.name} ${qty}주`,
      `사용자 직접 주문으로 ${(amount / 10000).toLocaleString()}만원 (${qty}주) 매수 집행 완료.`
    );
    this.notify();
  }

  public evaluateFeeAwareSell(type: "PARTIAL" | "ALL", bypassGuard: boolean = false) {
    if (!this.state.activePosition) return { success: false, reason: "포지션 없음" };

    const pos = this.state.activePosition;
    if (!bypassGuard) {
      const evalResult = UpbitFeeAndNetProfitGuard.evaluateSellPermission(
        pos.buyPrice,
        pos.currentPrice,
        pos.qty,
        -2.0, // stopLoss
        0.5   // minTargetProfit
      );

      if (!evalResult.canExecuteSell) {
        this.addLog(
          "INFO",
          `🛡️ 수수료 차감 순수익 미달로 매도 차단`,
          evalResult.rationale
        );
        this.notify();
        return { success: false, reason: evalResult.rationale };
      }
    }

    this.executeSell(type);
    return { success: true };
  }

  public executeSell(type: "PARTIAL" | "ALL") {
    if (!this.state.activePosition) return;

    const pos = this.state.activePosition;
    if (type === "ALL") {
      this.addLog(
        "SELL",
        `🚨 전량 매도 완료 (Panic Liquidate)`,
        `${pos.name} ${pos.qty}주 전량 시장가 청산 완료 (수익률: +${pos.pnlPct}%)`
      );
      this.state.activePosition = null;
    } else {
      const sellQty = Math.ceil(pos.qty / 2);
      const remainQty = pos.qty - sellQty;

      this.addLog(
        "SELL",
        `⚡ 50% 분할 익절 체결`,
        `${pos.name} ${sellQty}주 분할 이익 실현 (남은 수량: ${remainQty}주)`
      );

      if (remainQty <= 0) {
        this.state.activePosition = null;
      } else {
        this.state.activePosition = {
          ...pos,
          qty: remainQty
        };
      }
    }
    this.notify();
  }

  public triggerEmergencyStop() {
    this.state.isEngineActive = false;
    this.state.circuitBreakerTriggered = true;
    this.addLog(
      "EMERGENCY",
      `🛑 AI 비상 차단기 (CIRCUIT BREAKER) 작동`,
      `전체 AI 자율 스캔 및 신규 주문이 긴급 차단되었습니다.`
    );
    this.notify();
  }

  private addLog(type: LogSeverity, title: string, detail: string) {
    const item: ExecutionLogItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toLocaleTimeString("ko-KR"),
      type,
      title,
      detail
    };
    this.state.logs = [item, ...this.state.logs.slice(0, 40)];
  }
}

export const orchestratorEngine = new AiTradingOrchestratorEngine();
