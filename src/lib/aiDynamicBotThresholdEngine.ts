/**
 * AI Dynamic Bot Threshold Engine
 * 봇별 커스텀 임계값(익절, 손절, AI 최소 신뢰점수, 최대 운용 한도, 리스크 수준)을
 * 시장 상황(Market Regime, 변동성 ATR, RVOL 수급)에 따라 AI가 상황별로 자동 변경하고
 * 전체 트레이딩 파이프라인(AppContext, BotConfigModal, ThresholdAlertEngine, MasterEngine)에 즉시 연동합니다.
 */

import { BotPresetItem, getAllBots } from "../data/botPresets";
import { thresholdAlertEngine } from "./thresholdAlertEngine";

export interface BotCustomThreshold {
  botId: string;
  botName: string;
  autoAiAdaptation: boolean; // AI 자동변경 켜짐/꺼짐
  riskLevel: "AGGRESSIVE" | "BALANCED" | "CONSERVATIVE";
  operationalState: "ACTIVE" | "PAUSED" | "BUYING" | "SELLING";
  targetProfitPercent: number; // Take Profit % (e.g., 8.5)
  stopLossPercent: number; // Stop Loss % (e.g., -2.5)
  minConfidence: number; // AI 최소 신뢰점수 (80, 85, 90)
  maxAllocationKRW: number; // 최대 운용 한도 (원화/달러)
  lastAiAdaptationNotice?: string;
  lastAdaptedAt?: string;
  adaptationReason?: string;
}

const STORAGE_KEY_BOT_THRESHOLDS = "ai_bot_custom_thresholds_v2";

// Default preset baseline thresholds per bot category
export function getDefaultThresholdForCategory(
  category: string,
  botId: string,
  botName: string
): BotCustomThreshold {
  switch (category) {
    case "SMALL":
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "AGGRESSIVE",
        operationalState: "ACTIVE",
        targetProfitPercent: 12.0,
        stopLossPercent: -3.5,
        minConfidence: 85,
        maxAllocationKRW: 15000000,
        lastAiAdaptationNotice: "소형주 변동성 알파 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
    case "MID":
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "BALANCED",
        operationalState: "ACTIVE",
        targetProfitPercent: 8.5,
        stopLossPercent: -2.5,
        minConfidence: 85,
        maxAllocationKRW: 30000000,
        lastAiAdaptationNotice: "중형주 주도 스윙 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
    case "LARGE":
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "CONSERVATIVE",
        operationalState: "ACTIVE",
        targetProfitPercent: 5.5,
        stopLossPercent: -1.8,
        minConfidence: 80,
        maxAllocationKRW: 50000000,
        lastAiAdaptationNotice: "대형주 저변동성 퀀트 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
    case "CRYPTO":
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "AGGRESSIVE",
        operationalState: "ACTIVE",
        targetProfitPercent: 10.0,
        stopLossPercent: -3.0,
        minConfidence: 85,
        maxAllocationKRW: 20000000,
        lastAiAdaptationNotice: "가상자산 24시간 실시간 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
    case "US_TECH":
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "BALANCED",
        operationalState: "ACTIVE",
        targetProfitPercent: 9.0,
        stopLossPercent: -2.5,
        minConfidence: 85,
        maxAllocationKRW: 40000000,
        lastAiAdaptationNotice: "미국 빅테크 M7 모멘텀 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
    case "HFT_QUANT":
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "AGGRESSIVE",
        operationalState: "ACTIVE",
        targetProfitPercent: 3.5,
        stopLossPercent: -1.2,
        minConfidence: 90,
        maxAllocationKRW: 50000000,
        lastAiAdaptationNotice: "HFT 초고속 틱 스캘핑 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
    default:
      return {
        botId,
        botName,
        autoAiAdaptation: true,
        riskLevel: "BALANCED",
        operationalState: "ACTIVE",
        targetProfitPercent: 7.5,
        stopLossPercent: -2.2,
        minConfidence: 85,
        maxAllocationKRW: 25000000,
        lastAiAdaptationNotice: "표준 코어 알고리즘 기본 임계값 적용 중",
        lastAdaptedAt: new Date().toISOString()
      };
  }
}

class AiDynamicBotThresholdEngine {
  private thresholds: Record<string, BotCustomThreshold> = {};
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOT_THRESHOLDS);
      if (saved) {
        this.thresholds = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("[AiDynamicBotThresholdEngine] Storage load error:", e);
    }

    // Ensure all registered bots have an entry
    const allBots = getAllBots();
    let updated = false;
    for (const b of allBots) {
      if (!this.thresholds[b.id]) {
        this.thresholds[b.id] = getDefaultThresholdForCategory(b.category || "CORE", b.id, b.name);
        updated = true;
      }
    }
    if (updated) {
      this.saveToStorage();
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_BOT_THRESHOLDS, JSON.stringify(this.thresholds));
    } catch (e) {
      console.warn("[AiDynamicBotThresholdEngine] Storage save error:", e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getBotThreshold(botId: string, category: string = "CORE", botName: string = "AI Bot"): BotCustomThreshold {
    if (!this.thresholds[botId]) {
      this.thresholds[botId] = getDefaultThresholdForCategory(category, botId, botName);
      this.saveToStorage();
    }
    return { ...this.thresholds[botId] };
  }

  public getAllThresholds(): Record<string, BotCustomThreshold> {
    return { ...this.thresholds };
  }

  public updateBotThreshold(botId: string, updated: Partial<BotCustomThreshold>): BotCustomThreshold {
    const existing = this.thresholds[botId] || getDefaultThresholdForCategory("CORE", botId, "AI Bot");
    const next: BotCustomThreshold = {
      ...existing,
      ...updated,
      lastAdaptedAt: new Date().toISOString()
    };
    this.thresholds[botId] = next;
    this.saveToStorage();

    // Sync with thresholdAlertEngine rules
    thresholdAlertEngine.updateConfig({
      botRules: {
        ...thresholdAlertEngine.getConfig().botRules,
        [botId]: {
          botId,
          botName: next.botName,
          enabled: next.operationalState !== "PAUSED",
          profitTargetPercent: next.targetProfitPercent,
          drawdownLimitPercent: next.stopLossPercent
        }
      }
    });

    return next;
  }

  /**
   * AI Dynamic Auto-Adaptation Engine
   * Dynamically recalculates all bot thresholds based on current Market Regime & Volatility
   */
  public calculateAiAdaptedThreshold(
    current: BotCustomThreshold,
    category: string,
    regime: string,
    volatilityIndex: number = 1.0 // 1.0 is normal, >1.5 is high volatility
  ): BotCustomThreshold {
    let tp = current.targetProfitPercent;
    let sl = Math.abs(current.stopLossPercent); // work with positive number
    let minScore = current.minConfidence;
    let risk = current.riskLevel;
    let notice = "";

    // 1. Regime-based global shifts
    switch (regime) {
      case "STRONG_BULL":
        // In strong bull, widen TP, relax entry score slightly, increase risk appetite
        tp = category === "SMALL" ? 15.0 : category === "CRYPTO" ? 14.0 : category === "US_TECH" ? 12.0 : 9.5;
        sl = category === "SMALL" ? 3.0 : 2.5;
        minScore = 80;
        risk = "AGGRESSIVE";
        notice = "🚀 강한 상승장: 목표익절 확대(+12%~15%), 진입 신뢰점수 80점으로 완화해 수급 추종 극대화";
        break;

      case "BULL":
        tp = category === "SMALL" ? 12.5 : category === "MID" ? 9.0 : 7.5;
        sl = 2.5;
        minScore = 82;
        risk = "BALANCED";
        notice = "📈 상승장: 표준 알파 타겟 적용 및 20일선 눌림목 모멘텀 가중치 부여";
        break;

      case "RANGE":
        tp = category === "HFT_QUANT" ? 2.8 : 5.5;
        sl = 1.8;
        minScore = 86;
        risk = "BALANCED";
        notice = "↔️ 박스권/횡보장: 돌파 속임수 방지를 위해 최소 신뢰점수 86점 강화 및 타이트한 단기 익절";
        break;

      case "HIGH_VOLATILITY":
        tp = category === "CRYPTO" ? 12.0 : 8.0;
        sl = 3.5; // Wider SL to avoid noise shakeouts
        minScore = 88;
        risk = "CONSERVATIVE";
        notice = "⚠️ 고변동성장: 슬리피지/노이즈 방지용 손절 폭 확대(-3.5%) 및 엄격한 88점 승인 체계 적용";
        break;

      case "BEAR":
      case "STRONG_BEAR":
        tp = 4.0;
        sl = 1.5; // Very tight SL in bear market
        minScore = 90;
        risk = "CONSERVATIVE";
        notice = "🛡️ 약세장: 극도의 자본 방어(90점 이상 S+급만 진입), 손절선 -1.5% 타이트하게 보정";
        break;

      default:
        notice = "⚖️ 정상 시장: 표준 카테고리별 AI 커스텀 임계값 가동 중";
        break;
    }

    // 2. Volatility multiplier adjustment
    if (volatilityIndex > 1.4) {
      sl = Number((sl * 1.15).toFixed(1));
      minScore = Math.min(92, minScore + 2);
    }

    return {
      ...current,
      targetProfitPercent: Number(tp.toFixed(1)),
      stopLossPercent: Number((-Math.abs(sl)).toFixed(1)),
      minConfidence: minScore,
      riskLevel: risk,
      lastAiAdaptationNotice: notice,
      lastAdaptedAt: new Date().toISOString(),
      adaptationReason: `Market Regime: ${regime}, Volatility: ${volatilityIndex.toFixed(2)}x`
    };
  }

  /**
   * Run global adaptation on all bots with AI
   */
  public adaptAllBotsWithAI(
    regime: string,
    volatilityIndex: number = 1.0,
    allBots: BotPresetItem[] = getAllBots()
  ): { adaptedCount: number; notices: string[] } {
    const notices: string[] = [];
    let adaptedCount = 0;

    for (const b of allBots) {
      const current = this.getBotThreshold(b.id, b.category || "CORE", b.name);
      if (!current.autoAiAdaptation) continue; // Skip if user turned off AI auto-adaptation for this bot

      const adapted = this.calculateAiAdaptedThreshold(current, b.category || "CORE", regime, volatilityIndex);
      this.thresholds[b.id] = adapted;
      adaptedCount++;

      // Sync with thresholdAlertEngine
      thresholdAlertEngine.updateConfig({
        botRules: {
          ...thresholdAlertEngine.getConfig().botRules,
          [b.id]: {
            botId: b.id,
            botName: b.name,
            enabled: adapted.operationalState !== "PAUSED",
            profitTargetPercent: adapted.targetProfitPercent,
            drawdownLimitPercent: adapted.stopLossPercent
          }
        }
      });

      notices.push(`🤖 [AI 봇 임계값 변경] '${b.name}': 익절 +${adapted.targetProfitPercent}%, 손절 ${adapted.stopLossPercent}%, 신뢰점수 ${adapted.minConfidence}점 (이유: ${adapted.lastAiAdaptationNotice})`);
    }

    if (adaptedCount > 0) {
      this.saveToStorage();
    }

    return { adaptedCount, notices };
  }
}

export const aiDynamicBotThresholdEngine = new AiDynamicBotThresholdEngine();
