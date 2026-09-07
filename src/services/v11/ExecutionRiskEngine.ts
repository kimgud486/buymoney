// AISTOCK 24 v11 Execution Risk Engine
// Real-time risk gate checks for pre-trade verification and emergency kill switch

export interface RiskConfig {
  maxPositionValueKRW: number; // Max KRW per single order (e.g. 5,000,000 KRW)
  maxPositionValueUSD: number; // Max USD per single order (e.g. $4,000 USD)
  maxOpenPositions: number; // Max open concurrent positions (e.g. 5)
  dailyLossLimitPct: number; // Daily loss limit % (e.g. -3.0%)
  dailyLossLimitAmtKRW: number; // Daily loss limit amount (e.g. -300,000 KRW)
  consecutiveLossLimit: number; // Consecutive loss limit before cooldown (e.g. 3)
  signalMaxAgeSeconds: number; // Stale signal age limit (e.g. 10s)
  killSwitchActive: boolean; // Manual global emergency kill switch
}

export interface RiskEvaluationResult {
  passed: boolean;
  rejectReason: string | null;
  ruleViolated: string | null;
  timestamp: string;
}

export interface RiskMetrics {
  totalTradesToday: number;
  winTradesToday: number;
  lossTradesToday: number;
  consecutiveLosses: number;
  dailyRealizedPnLKRW: number;
  dailyRealizedPnLPct: number;
  killSwitchActive: boolean;
  isDailyLossBreached: boolean;
}

export class ExecutionRiskEngine {
  private config: RiskConfig;
  private metrics: RiskMetrics;

  constructor(customConfig?: Partial<RiskConfig>) {
    this.config = {
      maxPositionValueKRW: 5000000,
      maxPositionValueUSD: 4000,
      maxOpenPositions: 5,
      dailyLossLimitPct: -3.0,
      dailyLossLimitAmtKRW: -300000,
      consecutiveLossLimit: 3,
      signalMaxAgeSeconds: 10,
      killSwitchActive: false,
      ...customConfig
    };

    this.metrics = {
      totalTradesToday: 0,
      winTradesToday: 0,
      lossTradesToday: 0,
      consecutiveLosses: 0,
      dailyRealizedPnLKRW: 0,
      dailyRealizedPnLPct: 0.0,
      killSwitchActive: false,
      isDailyLossBreached: false
    };
  }

  public getConfig(): RiskConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<RiskConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getMetrics(): RiskMetrics {
    return { ...this.metrics, killSwitchActive: this.config.killSwitchActive };
  }

  public setKillSwitch(active: boolean) {
    this.config.killSwitchActive = active;
    this.metrics.killSwitchActive = active;
  }

  // Record completed trade result to update risk metrics
  public recordTradeResult(realizedPnLKRW: number) {
    this.metrics.totalTradesToday += 1;
    this.metrics.dailyRealizedPnLKRW += realizedPnLKRW;

    if (realizedPnLKRW > 0) {
      this.metrics.winTradesToday += 1;
      this.metrics.consecutiveLosses = 0; // Reset on win
    } else if (realizedPnLKRW < 0) {
      this.metrics.lossTradesToday += 1;
      this.metrics.consecutiveLosses += 1;
    }

    if (this.metrics.dailyRealizedPnLKRW <= this.config.dailyLossLimitAmtKRW) {
      this.metrics.isDailyLossBreached = true;
      this.config.killSwitchActive = true; // Auto engage kill switch on daily loss breach
    }
  }

  // Pre-Trade Risk Gate Verification
  public evaluateBuyOrderRisk(
    orderAmountKRW: number,
    orderAmountUSD: number,
    currentOpenPositionsCount: number,
    signalTimestampMs: number,
    market: "KOREA" | "US" | "BTC"
  ): RiskEvaluationResult {
    const timestampStr = new Date().toLocaleTimeString("ko-KR");

    // 1. Kill Switch Check
    if (this.config.killSwitchActive) {
      return {
        passed: false,
        rejectReason: "🚨 긴급 킬스위치(Kill Switch)가 활성화되어 있어 신규 주문이 차단되었습니다.",
        ruleViolated: "KILL_SWITCH_ACTIVE",
        timestamp: timestampStr
      };
    }

    // 2. Daily Loss Limit Breach Check
    if (this.metrics.isDailyLossBreached || this.metrics.dailyRealizedPnLKRW <= this.config.dailyLossLimitAmtKRW) {
      return {
        passed: false,
        rejectReason: `⚠️ 일일 최대 손실한도 초과 (현재 손실: ${(this.metrics.dailyRealizedPnLKRW ?? 0).toLocaleString()}원 <= 한도: ${(this.config.dailyLossLimitAmtKRW ?? 0).toLocaleString()}원)`,
        ruleViolated: "DAILY_LOSS_LIMIT_EXCEEDED",
        timestamp: timestampStr
      };
    }

    // 3. Consecutive Loss Limit Check
    if (this.metrics.consecutiveLosses >= this.config.consecutiveLossLimit) {
      return {
        passed: false,
        rejectReason: `⚠️ 연속 손실 한도 초과 (${this.metrics.consecutiveLosses}회 연속 손실 >= 제한 ${this.config.consecutiveLossLimit}회). 쿨다운이 필요합니다.`,
        ruleViolated: "CONSECUTIVE_LOSS_LIMIT_EXCEEDED",
        timestamp: timestampStr
      };
    }

    // 4. Stale Signal Age Check
    const signalAgeSeconds = (Date.now() - signalTimestampMs) / 1000;
    if (signalAgeSeconds > this.config.signalMaxAgeSeconds) {
      return {
        passed: false,
        rejectReason: `⏱️ 지연된 시그널 차단 (시그널 경과시간: ${signalAgeSeconds.toFixed(1)}초 > 허용: ${this.config.signalMaxAgeSeconds}초)`,
        ruleViolated: "STALE_SIGNAL_AGE",
        timestamp: timestampStr
      };
    }

    // 5. Max Open Positions Limit Check
    if (currentOpenPositionsCount >= this.config.maxOpenPositions) {
      return {
        passed: false,
        rejectReason: `📊 최대 동시 포지션 개수 초과 (현재: ${currentOpenPositionsCount}개 >= 제한: ${this.config.maxOpenPositions}개)`,
        ruleViolated: "MAX_OPEN_POSITIONS_EXCEEDED",
        timestamp: timestampStr
      };
    }

    // 6. Max Position Value Limit Check
    if (market === "US") {
      if (orderAmountUSD > this.config.maxPositionValueUSD) {
        return {
          passed: false,
          rejectReason: `💵 미국주식 단일 주문 한도 초과 ($${(orderAmountUSD ?? 0).toLocaleString()} > 한도: $${(this.config.maxPositionValueUSD ?? 0).toLocaleString()})`,
          ruleViolated: "MAX_POSITION_VALUE_USD_EXCEEDED",
          timestamp: timestampStr
        };
      }
    } else {
      if (orderAmountKRW > this.config.maxPositionValueKRW) {
        return {
          passed: false,
          rejectReason: `💰 국내주식 단일 주문 한도 초과 (${(orderAmountKRW ?? 0).toLocaleString()}원 > 한도: ${(this.config.maxPositionValueKRW ?? 0).toLocaleString()}원)`,
          ruleViolated: "MAX_POSITION_VALUE_KRW_EXCEEDED",
          timestamp: timestampStr
        };
      }
    }

    return {
      passed: true,
      rejectReason: null,
      ruleViolated: null,
      timestamp: timestampStr
    };
  }
}
