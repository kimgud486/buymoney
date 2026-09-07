// AISTOCK v13.5 Observability Metrics Collector
import { ObservabilityMetrics } from "./typesV135";

export class MetricsCollectorV135 {
  private orderLatencies: number[] = [];
  private fillLatencies: number[] = [];
  private staleFeedCount = 0;
  private totalFeedTicks = 0;
  private brokerErrorCount = 0;
  private totalBrokerRequests = 0;
  private reconciliationMismatches = 0;
  private totalSlippageBp = 0;
  private totalFilledOrders = 0;
  private killSwitchActive = false;

  public recordOrderLatency(ms: number): void {
    if (ms >= 0) this.orderLatencies.push(ms);
  }

  public recordFillLatency(ms: number): void {
    if (ms >= 0) this.fillLatencies.push(ms);
  }

  public recordFeedTick(isStale: boolean): void {
    this.totalFeedTicks++;
    if (isStale) this.staleFeedCount++;
  }

  public recordBrokerRequest(success: boolean): void {
    this.totalBrokerRequests++;
    if (!success) this.brokerErrorCount++;
  }

  public recordReconciliationMismatch(): void {
    this.reconciliationMismatches++;
  }

  public recordSlippage(slippageBp: number): void {
    this.totalSlippageBp += slippageBp;
    this.totalFilledOrders++;
  }

  public setKillSwitch(active: boolean): void {
    this.killSwitchActive = active;
  }

  public getMetrics(): ObservabilityMetrics {
    const avgOrderLatency = this.orderLatencies.length > 0
      ? this.orderLatencies.reduce((a, b) => a + b, 0) / this.orderLatencies.length
      : 0;

    const avgFillLatency = this.fillLatencies.length > 0
      ? this.fillLatencies.reduce((a, b) => a + b, 0) / this.fillLatencies.length
      : 0;

    const staleFeedRatio = this.totalFeedTicks > 0
      ? this.staleFeedCount / this.totalFeedTicks
      : 0;

    const brokerErrorRate = this.totalBrokerRequests > 0
      ? this.brokerErrorCount / this.totalBrokerRequests
      : 0;

    const avgSlippageBp = this.totalFilledOrders > 0
      ? this.totalSlippageBp / this.totalFilledOrders
      : 0;

    return {
      orderLatencyMs: Math.round(avgOrderLatency),
      fillLatencyMs: Math.round(avgFillLatency),
      staleFeedRatio: Math.round(staleFeedRatio * 10000) / 10000,
      brokerErrorRate: Math.round(brokerErrorRate * 10000) / 10000,
      reconciliationMismatchCount: this.reconciliationMismatches,
      slippageBp: Math.round(avgSlippageBp * 10) / 10,
      killSwitchActive: this.killSwitchActive,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this.orderLatencies = [];
    this.fillLatencies = [];
    this.staleFeedCount = 0;
    this.totalFeedTicks = 0;
    this.brokerErrorCount = 0;
    this.totalBrokerRequests = 0;
    this.reconciliationMismatches = 0;
    this.totalSlippageBp = 0;
    this.totalFilledOrders = 0;
    this.killSwitchActive = false;
  }
}

export const globalMetricsCollectorV135 = new MetricsCollectorV135();
