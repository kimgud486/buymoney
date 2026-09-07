import { ComponentHeartbeatV134 } from "./typesV134";

export class HeartbeatMonitorV134 {
  private heartbeats: Map<string, ComponentHeartbeatV134> = new Map();
  private maxStaleMs: number = 15000; // 15s max stale limit

  constructor(maxStaleMs: number = 15000) {
    this.maxStaleMs = maxStaleMs;
    // Register default core components
    this.recordHeartbeat("MARKET_DATA", true);
    this.recordHeartbeat("KIS_REST", true);
    this.recordHeartbeat("KIS_WS", true);
    this.recordHeartbeat("PERSISTENCE", true);
  }

  public recordHeartbeat(name: string, isAlive: boolean, latencyMs?: number, message?: string) {
    const existing = this.heartbeats.get(name);
    const errorCount = isAlive ? 0 : (existing ? existing.errorCount + 1 : 1);

    this.heartbeats.set(name, {
      name,
      isAlive,
      lastHeartbeatTime: Date.now(),
      latencyMs,
      errorCount,
      message
    });
  }

  public getHeartbeat(name: string): ComponentHeartbeatV134 | undefined {
    return this.heartbeats.get(name);
  }

  public checkHealth(): { isAllHealthy: boolean; staleOrDead: string[] } {
    const now = Date.now();
    const staleOrDead: string[] = [];

    this.heartbeats.forEach((hb, name) => {
      const isStale = (now - hb.lastHeartbeatTime) > this.maxStaleMs;
      if (!hb.isAlive || isStale || hb.errorCount > 3) {
        staleOrDead.push(name);
      }
    });

    return {
      isAllHealthy: staleOrDead.length === 0,
      staleOrDead
    };
  }

  public getAllHeartbeats(): Record<string, ComponentHeartbeatV134> {
    const result: Record<string, ComponentHeartbeatV134> = {};
    this.heartbeats.forEach((hb, key) => {
      result[key] = { ...hb };
    });
    return result;
  }
}

export const heartbeatMonitorV134 = new HeartbeatMonitorV134();
