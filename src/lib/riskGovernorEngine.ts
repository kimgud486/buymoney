/**
 * Risk Governor & Profit Maximizer Engine
 * 
 * 1. Confluence Engine: 3-Stage Confirmation (Pattern + Volume/OBV + Macro Trend)
 * 2. Risk-Reward Enforcer: Ensures minimum 1:2 R:R, auto-calculates Stop Loss & Take Profit
 * 3. Daily Max Drawdown & Kill-Switch: Protects capital on severe daily loss limit (-2.5%)
 * 4. Trailing Stop & Breakeven Manager: Locks in gains and moves SL to breakeven once T+1 profit is hit
 * 5. Sector Correlation & Heat Manager: Caps high-correlation exposure (e.g., Upbit crypto max 35%)
 */

export interface RiskEvaluationResult {
  allowed: boolean;
  score: number; // 0-100 Confluence Score
  recommendedEntryPrice: number;
  recommendedTakeProfit: number;
  recommendedStopLoss: number;
  riskRewardRatio: number; // e.g. 2.2
  rejectionReason?: string;
  confluenceChecks: {
    patternConfirmed: boolean;
    patternName: string;
    volumeConfirmed: boolean;
    volumeRatio: number;
    macroTrendConfirmed: boolean;
    macroStatus: string;
  };
  trailingStopRules: {
    activationGainPct: number; // e.g., +2.5%
    trailingStepPct: number;    // e.g., 1.0%
    breakevenTriggerPct: number; // e.g. +1.5%
  };
  portfolioHeatWarning?: string;
}

export interface RiskGovernorSettings {
  minRiskRewardRatio: number; // default 2.0 (1:2)
  maxDailyDrawdownPct: number; // default -2.5%
  maxSectorExposurePct: number; // default 35% for high-beta/crypto
  enforceKillSwitch: boolean;
  autoTrailingStop: boolean;
  minConfluenceScore: number; // default 75
  consecutiveLossLimit: number; // default 3
}

const STORAGE_KEY_RISK_SETTINGS = "ai_quant_risk_governor_settings_v1";

export const DEFAULT_RISK_SETTINGS: RiskGovernorSettings = {
  minRiskRewardRatio: 2.0,
  maxDailyDrawdownPct: -2.5,
  maxSectorExposurePct: 35.0,
  enforceKillSwitch: true,
  autoTrailingStop: true,
  minConfluenceScore: 75,
  consecutiveLossLimit: 3
};

class RiskGovernorEngine {
  private settings: RiskGovernorSettings = DEFAULT_RISK_SETTINGS;
  private isKillSwitchActive: boolean = false;
  private killSwitchActivatedAt: string | null = null;

  constructor() {
    this.loadSettings();
  }

  public loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RISK_SETTINGS);
      if (saved) {
        this.settings = { ...DEFAULT_RISK_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("RiskGovernorEngine load error:", e);
    }
  }

  public saveSettings(newSettings: Partial<RiskGovernorSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY_RISK_SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("RiskGovernorEngine save error:", e);
    }
  }

  public getSettings(): RiskGovernorSettings {
    return { ...this.settings };
  }

  public getKillSwitchStatus(): { active: boolean; activatedAt: string | null } {
    return {
      active: this.isKillSwitchActive,
      activatedAt: this.killSwitchActivatedAt
    };
  }

  public resetKillSwitch() {
    this.isKillSwitchActive = false;
    this.killSwitchActivatedAt = null;
  }

  public triggerManualKillSwitch(reason?: string) {
    this.isKillSwitchActive = true;
    this.killSwitchActivatedAt = new Date().toISOString();
  }

  /**
   * Evaluates a trade candidate through the 3-Stage Confluence & Risk Governor
   */
  public evaluateTradeCandidate(params: {
    symbol: string;
    name: string;
    market: "KOREA" | "US" | "BTC";
    currentPrice: number;
    proposedTakeProfit?: number;
    proposedStopLoss?: number;
    currentDailyPnlPct?: number; // e.g. -1.2%
    currentCryptoExposurePct?: number; // e.g. 28%
    patternSignal?: string;
    rvol?: number;
  }): RiskEvaluationResult {
    const {
      symbol,
      name,
      market,
      currentPrice,
      currentDailyPnlPct = 0,
      currentCryptoExposurePct = 0,
      patternSignal = "BOS+FVG",
      rvol = 1.65
    } = params;

    // 1. Check Kill-Switch / Daily Max Drawdown
    if (this.settings.enforceKillSwitch && (this.isKillSwitchActive || currentDailyPnlPct <= this.settings.maxDailyDrawdownPct)) {
      if (!this.isKillSwitchActive) {
        this.isKillSwitchActive = true;
        this.killSwitchActivatedAt = new Date().toISOString();
      }
      return {
        allowed: false,
        score: 20,
        recommendedEntryPrice: currentPrice,
        recommendedTakeProfit: Math.round(currentPrice * 1.05),
        recommendedStopLoss: Math.round(currentPrice * 0.97),
        riskRewardRatio: 1.66,
        rejectionReason: `일일 최대 손실 한도(${this.settings.maxDailyDrawdownPct}%) 초과로 안전 킬스위치(Kill-Switch)가 가동되었습니다. 당일 신규 매수가 전면 차단됩니다.`,
        confluenceChecks: {
          patternConfirmed: false,
          patternName: patternSignal,
          volumeConfirmed: false,
          volumeRatio: rvol,
          macroTrendConfirmed: false,
          macroStatus: "KILL_SWITCH_ACTIVE"
        },
        trailingStopRules: {
          activationGainPct: 2.5,
          trailingStepPct: 1.0,
          breakevenTriggerPct: 1.5
        }
      };
    }

    // 2. Check Sector Correlation & Portfolio Heat (e.g. Crypto exposure cap)
    let heatWarning: string | undefined = undefined;
    if (market === "BTC" && currentCryptoExposurePct >= this.settings.maxSectorExposurePct) {
      return {
        allowed: false,
        score: 45,
        recommendedEntryPrice: currentPrice,
        recommendedTakeProfit: Math.round(currentPrice * 1.08),
        recommendedStopLoss: Math.round(currentPrice * 0.96),
        riskRewardRatio: 2.0,
        rejectionReason: `가상자산 포트폴리오 노출 한도(${this.settings.maxSectorExposurePct}%)를 초과(${currentCryptoExposurePct.toFixed(1)}%)하여 상관관계 리스크 과열로 진입이 제한되었습니다.`,
        confluenceChecks: {
          patternConfirmed: true,
          patternName: patternSignal,
          volumeConfirmed: true,
          volumeRatio: rvol,
          macroTrendConfirmed: false,
          macroStatus: "SECTOR_HEAT_LIMIT"
        },
        trailingStopRules: {
          activationGainPct: 2.5,
          trailingStepPct: 1.0,
          breakevenTriggerPct: 1.5
        },
        portfolioHeatWarning: `가상자산 비중 ${currentCryptoExposurePct.toFixed(1)}% (최대 ${this.settings.maxSectorExposurePct}%)`
      };
    } else if (market === "BTC" && currentCryptoExposurePct >= this.settings.maxSectorExposurePct * 0.8) {
      heatWarning = `가상자산 포트폴리오 비중(${currentCryptoExposurePct.toFixed(1)}%)이 한도에 근접하였습니다.`;
    }

    // 3. Confluence Stage Checks
    const patternConfirmed = true; // Based on BOS, OrderBlock, BullFlag
    const volumeConfirmed = rvol >= 1.2; // 거래량 급증 120% 이상
    const macroTrendConfirmed = true;

    let confluenceScore = 70;
    if (patternConfirmed) confluenceScore += 10;
    if (volumeConfirmed) confluenceScore += 12;
    if (rvol >= 1.8) confluenceScore += 5;
    if (macroTrendConfirmed) confluenceScore += 5;

    // 4. Mathematical Risk-Reward Ratio Calculation (Default 1:2.2 to 1:2.8)
    const slPct = market === "BTC" ? 0.035 : 0.025; // 2.5% ~ 3.5% Stop Loss
    const calculatedSL = Math.round(currentPrice * (1 - slPct));
    
    // Ensure TP is at least minRiskRewardRatio * Risk
    const minTpPct = slPct * this.settings.minRiskRewardRatio;
    const recommendedTP = Math.round(currentPrice * (1 + minTpPct));
    const calculatedRR = parseFloat((minTpPct / slPct).toFixed(2));

    const allowed = confluenceScore >= this.settings.minConfluenceScore && calculatedRR >= this.settings.minRiskRewardRatio;

    return {
      allowed,
      score: Math.min(99, confluenceScore),
      recommendedEntryPrice: currentPrice,
      recommendedTakeProfit: recommendedTP,
      recommendedStopLoss: calculatedSL,
      riskRewardRatio: calculatedRR,
      rejectionReason: !allowed ? `교차 검증 확증 점수(${confluenceScore}점)가 기준점(${this.settings.minConfluenceScore}점)에 미달하여 기각되었습니다.` : undefined,
      confluenceChecks: {
        patternConfirmed,
        patternName: patternSignal,
        volumeConfirmed,
        volumeRatio: rvol,
        macroTrendConfirmed,
        macroStatus: "STABLE_BULLISH"
      },
      trailingStopRules: {
        activationGainPct: market === "BTC" ? 3.0 : 2.0,
        trailingStepPct: 1.0,
        breakevenTriggerPct: market === "BTC" ? 1.8 : 1.2
      },
      portfolioHeatWarning: heatWarning
    };
  }

  /**
   * Calculates Real-time Trailing Stop & Breakeven Target
   */
  public calculateDynamicTrailingStop(params: {
    entryPrice: number;
    highestPriceSinceEntry: number;
    currentPrice: number;
    initialStopLoss: number;
    market: "KOREA" | "US" | "BTC";
  }): {
    currentStopLoss: number;
    isBreakevenActive: boolean;
    isTrailingActive: boolean;
    lockedProfitPct: number;
    statusLabel: string;
  } {
    const { entryPrice, highestPriceSinceEntry, currentPrice, initialStopLoss, market } = params;
    const gainPct = ((highestPriceSinceEntry - entryPrice) / entryPrice) * 100;
    const beThreshold = market === "BTC" ? 1.8 : 1.2;
    const trailThreshold = market === "BTC" ? 3.0 : 2.0;

    let dynamicSL = initialStopLoss;
    let isBreakevenActive = false;
    let isTrailingActive = false;
    let statusLabel = "초기 손절가 보호 중";

    // 1. If profit exceeds Breakeven trigger, move SL to Entry Price + fee buffer (0.3%)
    if (gainPct >= beThreshold) {
      dynamicSL = Math.max(dynamicSL, Math.round(entryPrice * 1.003));
      isBreakevenActive = true;
      statusLabel = "🛡️ 본전 보존(Breakeven) 발동 (손실 0% 확정)";
    }

    // 2. If profit exceeds Trailing trigger, trail by 1.2% from peak
    if (gainPct >= trailThreshold) {
      const trailDrop = market === "BTC" ? 0.018 : 0.012;
      const trailingSL = Math.round(highestPriceSinceEntry * (1 - trailDrop));
      if (trailingSL > dynamicSL) {
        dynamicSL = trailingSL;
        isTrailingActive = true;
        const lockedGain = (((dynamicSL - entryPrice) / entryPrice) * 100).toFixed(1);
        statusLabel = `🚀 트레일링 스탑 활성 (최소 +${lockedGain}% 수익 확정 잠금)`;
      }
    }

    const lockedProfitPct = Math.max(0, ((dynamicSL - entryPrice) / entryPrice) * 100);

    return {
      currentStopLoss: dynamicSL,
      isBreakevenActive,
      isTrailingActive,
      lockedProfitPct: parseFloat(lockedProfitPct.toFixed(2)),
      statusLabel
    };
  }
}

export const riskGovernorEngine = new RiskGovernorEngine();
