/**
 * Threshold Alert Engine
 * Monitors real-time bot performance, daily drawdown, and profit targets
 * Sends Desktop Notifications (Web Notification API) & Web Audio alert chimes
 */

export interface BotThresholdRule {
  botId: string;
  botName: string;
  enabled: boolean;
  profitTargetPercent: number; // e.g. 5.0 (%)
  drawdownLimitPercent: number; // e.g. -3.0 (%)
}

export interface ThresholdConfig {
  desktopAlertEnabled: boolean;
  soundAlertEnabled: boolean;
  globalProfitTargetPercent: number; // e.g. +5.0%
  globalDrawdownLimitPercent: number; // e.g. -3.0%
  emergencyStopOnDrawdown: boolean;
  cooldownMinutes: number; // Minutes between repeated alerts for the same bot
  botRules: Record<string, BotThresholdRule>;
}

export interface ThresholdAlertEvent {
  id: string;
  timestamp: string;
  botId: string;
  botName: string;
  type: 'PROFIT_TARGET_HIT' | 'DRAWDOWN_LIMIT_BREACHED';
  currentValuePercent: number;
  thresholdPercent: number;
  message: string;
  acknowledged: boolean;
}

const STORAGE_KEY_CONFIG = "ai_trading_threshold_config_v1";
const STORAGE_KEY_HISTORY = "ai_trading_threshold_history_v1";

const DEFAULT_CONFIG: ThresholdConfig = {
  desktopAlertEnabled: true,
  soundAlertEnabled: false,
  globalProfitTargetPercent: 5.0,
  globalDrawdownLimitPercent: -3.0,
  emergencyStopOnDrawdown: false,
  cooldownMinutes: 10,
  botRules: {
    "bot_01": { botId: "bot_01", botName: "AI 딥러닝 모멘텀 봇 #1", enabled: true, profitTargetPercent: 5.0, drawdownLimitPercent: -3.0 },
    "bot_02": { botId: "bot_02", botName: "초단타 HFT 스캘퍼 봇 #2", enabled: true, profitTargetPercent: 4.0, drawdownLimitPercent: -2.0 },
    "bot_03": { botId: "bot_03", botName: "외인·기관 수급 추종 봇 #3", enabled: true, profitTargetPercent: 6.0, drawdownLimitPercent: -3.5 },
    "bot_04": { botId: "bot_04", botName: "돌파매매 브레이크아웃 봇 #4", enabled: true, profitTargetPercent: 7.0, drawdownLimitPercent: -4.0 },
    "bot_05": { botId: "bot_05", botName: "업비트 24H 볼린저 밴드 봇 #5", enabled: true, profitTargetPercent: 8.0, drawdownLimitPercent: -4.5 },
    "bot_06": { botId: "bot_06", botName: "소액 전용 알파 리스크 봇 #6", enabled: true, profitTargetPercent: 4.5, drawdownLimitPercent: -2.5 }
  }
};

// In-memory alert cooldown tracker (botId_type -> timestamp)
const lastAlertTimestamps: Record<string, number> = {};

class ThresholdAlertEngine {
  private config: ThresholdConfig = DEFAULT_CONFIG;
  private history: ThresholdAlertEvent[] = [];
  private audioCtx: AudioContext | null = null;
  private listeners: Array<(event: ThresholdAlertEvent) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      }
      const savedHist = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHist) {
        this.history = JSON.parse(savedHist);
      }
    } catch (e) {
      console.warn("ThresholdAlertEngine storage load error:", e);
    }
  }

  private saveConfigToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.warn("ThresholdAlertEngine save config error:", e);
    }
  }

  private saveHistoryToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.history.slice(0, 100)));
    } catch (e) {
      console.warn("ThresholdAlertEngine save history error:", e);
    }
  }

  public getConfig(): ThresholdConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ThresholdConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfigToStorage();
  }

  public getHistory(): ThresholdAlertEvent[] {
    return [...this.history];
  }

  public clearHistory() {
    this.history = [];
    this.saveHistoryToStorage();
  }

  public subscribe(cb: (event: ThresholdAlertEvent) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /**
   * Request Desktop Notification permission
   */
  public async requestDesktopPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      alert("현재 브라우저는 데스크톱 알림을 지원하지 않습니다.");
      return "denied";
    }
    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Play audio chime using Web Audio API
   */
  public playAlertSound(type: 'PROFIT' | 'DRAWDOWN' | 'TEST') {
    if (!this.config.soundAlertEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'PROFIT') {
        // Double pleasant upward chime (C5 -> E5 -> G5)
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc1.frequency.setValueAtTime(783.99, now + 0.24); // G5
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);
      } else if (type === 'DRAWDOWN') {
        // Urgent warning tone (A4 -> F4 -> D4)
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(440, now); // A4
        osc1.frequency.setValueAtTime(349.23, now + 0.15); // F4
        osc1.frequency.setValueAtTime(293.66, now + 0.3); // D4
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);
      } else {
        // Simple test chime
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  }

  /**
   * Send OS Desktop Notification
   */
  private sendDesktopNotification(title: string, body: string) {
    if (!this.config.desktopAlertEnabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        const n = new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "ai-trading-threshold-alert"
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (e) {
        console.warn("Desktop notification trigger failed:", e);
      }
    }
  }

  /**
   * Evaluate a single bot's current daily return / drawdown
   */
  public evaluateBot(botId: string, botName: string, currentDailyReturnPercent: number): ThresholdAlertEvent | null {
    const rule = this.config.botRules[botId] || {
      botId,
      botName,
      enabled: true,
      profitTargetPercent: this.config.globalProfitTargetPercent,
      drawdownLimitPercent: this.config.globalDrawdownLimitPercent
    };

    if (!rule.enabled) return null;

    const profitTarget = rule.profitTargetPercent || this.config.globalProfitTargetPercent;
    const drawdownLimit = rule.drawdownLimitPercent || this.config.globalDrawdownLimitPercent; // negative number e.g. -3.0

    const now = Date.now();
    const cooldownMs = (this.config.cooldownMinutes || 10) * 60 * 1000;

    // 1. Check Profit Target Hit
    if (currentDailyReturnPercent >= profitTarget) {
      const alertKey = `${botId}_PROFIT`;
      const lastAlert = lastAlertTimestamps[alertKey] || 0;
      if (now - lastAlert > cooldownMs) {
        lastAlertTimestamps[alertKey] = now;
        const event: ThresholdAlertEvent = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          botId,
          botName,
          type: 'PROFIT_TARGET_HIT',
          currentValuePercent: currentDailyReturnPercent,
          thresholdPercent: profitTarget,
          message: `🎯 [수익 목표 도달] ${botName} 일일 수익률 +${currentDailyReturnPercent.toFixed(2)}% (설정 목표 +${profitTarget}%) 돌파!`,
          acknowledged: false
        };

        this.history.unshift(event);
        this.saveHistoryToStorage();
        this.playAlertSound('PROFIT');
        this.sendDesktopNotification("🎯 [AI 봇 수익 목표 달성]", event.message);
        this.listeners.forEach(l => l(event));
        return event;
      }
    }

    // 2. Check Drawdown Limit Breach
    if (currentDailyReturnPercent <= drawdownLimit) {
      const alertKey = `${botId}_DRAWDOWN`;
      const lastAlert = lastAlertTimestamps[alertKey] || 0;
      if (now - lastAlert > cooldownMs) {
        lastAlertTimestamps[alertKey] = now;
        const event: ThresholdAlertEvent = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          botId,
          botName,
          type: 'DRAWDOWN_LIMIT_BREACHED',
          currentValuePercent: currentDailyReturnPercent,
          thresholdPercent: drawdownLimit,
          message: `⚠️ [일일 낙폭 한도 경고] ${botName} 일일 손익 ${currentDailyReturnPercent.toFixed(2)}% (최대 허용 한도 ${drawdownLimit}%) 초과 하락!`,
          acknowledged: false
        };

        this.history.unshift(event);
        this.saveHistoryToStorage();
        this.playAlertSound('DRAWDOWN');
        this.sendDesktopNotification("🚨 [AI 봇 손실 한도 초과 경보]", event.message);
        this.listeners.forEach(l => l(event));
        return event;
      }
    }

    return null;
  }

  /**
   * Send a test alert
   */
  public triggerTestAlert(): ThresholdAlertEvent {
    const event: ThresholdAlertEvent = {
      id: `alert_test_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      botId: "bot_01",
      botName: "AI 딥러닝 모멘텀 봇 #1",
      type: 'PROFIT_TARGET_HIT',
      currentValuePercent: 5.42,
      thresholdPercent: 5.0,
      message: `🔔 [테스트 알림] 데스크톱 알림 및 사운드 시스템이 정상 작동 중입니다 (목표 수익률 +5.0% 초과).`,
      acknowledged: true
    };

    this.history.unshift(event);
    this.saveHistoryToStorage();
    this.playAlertSound('TEST');
    this.sendDesktopNotification("🔔 [AI 트레이딩 알림 테스트]", event.message);
    this.listeners.forEach(l => l(event));
    return event;
  }
}

export const thresholdAlertEngine = new ThresholdAlertEngine();
