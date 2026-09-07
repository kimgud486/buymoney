// AISTOCK v13.5 Safe Event Logger
import { SystemEventLog } from "./typesV135";

export class SafeEventLoggerV135 {
  private logs: SystemEventLog[] = [];
  private maxLogs = 500;

  public log(
    type: SystemEventLog["type"],
    severity: SystemEventLog["severity"],
    message: string,
    data?: Record<string, any>
  ): SystemEventLog {
    const entry: SystemEventLog = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      severity,
      message,
      data: data ? this.sanitize(data) : undefined,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (severity === "ERROR" || severity === "CRITICAL") {
      console.error(`[AISTOCK LOG][${severity}] ${message}`, entry.data || "");
    }

    return entry;
  }

  private sanitize(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    const sensitiveKeys = ["appKey", "appSecret", "token", "password", "apiKey", "secret"];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = "[REDACTED_SECRET]";
      }
    }
    return sanitized;
  }

  public getLogs(limit = 100): SystemEventLog[] {
    return this.logs.slice(0, limit);
  }

  public clear(): void {
    this.logs = [];
  }
}

export const globalSafeEventLoggerV135 = new SafeEventLoggerV135();
