/**
 * Real-time AI Bot Error & Anomaly Logging System
 * Detects bot execution anomalies, rate limits, slippage warnings, and order failures.
 * Triggers ToastContainer notifications immediately via custom events.
 */

export interface BotErrorLogItem {
  id: string;
  timestamp: string;
  botId: string;
  botName: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  errorCode: string;
  message: string;
  details?: string;
  actionTaken: string;
  symbol?: string;
  resolved: boolean;
}

const STORAGE_KEY = "ai_quant_bot_error_logs_v1";

const INITIAL_DEMO_LOGS: BotErrorLogItem[] = [
  {
    id: "log-101",
    timestamp: "10:14:22",
    botId: "bot-scalp-01",
    botName: "고주파 Scalping 봇",
    severity: "WARNING",
    errorCode: "ERR_SLIPPAGE_WARNING",
    message: "주문 제출 시 슬리피지 허용범위(0.5%) 초과 감지 (+0.85%)",
    details: "SK하이닉스 매수 시장가 주문 중 매도 호가 갭으로 인해 체결 오차 가중",
    actionTaken: "지정가 호가 보정 후 정상 분할 체결 완료",
    symbol: "000660",
    resolved: true
  },
  {
    id: "log-102",
    timestamp: "09:58:04",
    botId: "bot-upbit-03",
    botName: "업비트 24H 가상자산 봇",
    severity: "ERROR",
    errorCode: "ERR_API_RATE_LIMIT",
    message: "업비트 REST API 초당 호출 수 제한(10회/sec) 한도 근접 경고",
    details: "멀티 코인 동시 티커 폴링 중 429 Too Many Requests 일시 예방",
    actionTaken: "API 폴링 주기 300ms -> 800ms 자동 완화 조치",
    symbol: "KRW-SOL",
    resolved: true
  },
  {
    id: "log-103",
    timestamp: "09:32:11",
    botId: "bot-smallcap-02",
    botName: "소형주 급등 알파 봇",
    severity: "CRITICAL",
    errorCode: "ERR_ANOMALOUS_SPREAD",
    message: "급등주 호가 잔량 왜곡 감지 (매수 잔량 가짜 벽 형성)",
    details: "알테오젠 5호가 매수 벽 급조 후 대량 취소 발생",
    actionTaken: "Fakeout 매수 신호 자동 기각 및 5분간 매수 정지",
    symbol: "196170",
    resolved: true
  }
];

class BotErrorLogger {
  private logs: BotErrorLogItem[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      } else {
        this.logs = INITIAL_DEMO_LOGS;
        this.saveLogs();
      }
    } catch (e) {
      this.logs = INITIAL_DEMO_LOGS;
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.warn("Failed to save bot error logs:", e);
    }
  }

  public getLogs(): BotErrorLogItem[] {
    return [...this.logs];
  }

  public logError(params: Omit<BotErrorLogItem, "id" | "timestamp" | "resolved"> & { timestamp?: string }): BotErrorLogItem {
    const newLog: BotErrorLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: params.timestamp || new Date().toLocaleTimeString("ko-KR", { hour12: false }),
      resolved: false,
      ...params
    };

    this.logs = [newLog, ...this.logs.slice(0, 99)]; // Keep last 100 logs
    this.saveLogs();

    // Trigger window event so AppContext / Toast system immediately displays ToastContainer notification
    if (typeof window !== "undefined") {
      const event = new CustomEvent("bot_error_logged", {
        detail: {
          log: newLog,
          toastTitle: `[🤖 ${newLog.botName} 오작동 감지]`,
          toastMessage: `${newLog.message} -> ${newLog.actionTaken}`,
          toastType: newLog.severity === "CRITICAL" || newLog.severity === "ERROR" ? "ERROR" : "WARNING"
        }
      });
      window.dispatchEvent(event);
    }

    return newLog;
  }

  public resolveLog(id: string) {
    this.logs = this.logs.map(log => log.id === id ? { ...log, resolved: true } : log);
    this.saveLogs();
  }

  public clearAllLogs() {
    this.logs = [];
    this.saveLogs();
  }

  /**
   * Helper to simulate an anomaly check for testing and real-time demonstration
   */
  public triggerSimulatedAnomaly(botName: string, symbol: string) {
    const errorTypes = [
      {
        severity: "WARNING" as const,
        errorCode: "ERR_SLIPPAGE_EXCEEDED",
        message: "체결 슬리피지 0.6% 허용치 초과 경고",
        actionTaken: "지정가 호가 보정 후 부분 체결 처리"
      },
      {
        severity: "ERROR" as const,
        errorCode: "ERR_ORDER_REJECTED",
        message: "증권사 API 주문 응답 지연 (Timeout 2,000ms)",
        actionTaken: "주문 재시도 후 안전 호가로 재접수"
      },
      {
        severity: "CRITICAL" as const,
        errorCode: "ERR_FAKEOUT_PATTERN",
        message: "속임수(Fakeout) 음봉 전환 감지",
        actionTaken: "긴급 손절 스탑로스(-1.5%) 가동으로 손실 최소화"
      }
    ];

    const chosen = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    return this.logError({
      botId: `bot-sim-${Math.floor(Math.random() * 10)}`,
      botName,
      symbol,
      severity: chosen.severity,
      errorCode: chosen.errorCode,
      message: chosen.message,
      actionTaken: chosen.actionTaken,
      details: `${symbol} 종목 매매 수행 중 AI 실시간 모니터링 모듈이 오작동 패턴을 포착함`
    });
  }
}

export const botErrorLogger = new BotErrorLogger();
