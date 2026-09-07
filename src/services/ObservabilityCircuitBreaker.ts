// AISTOCK v13.8 OBSERVABILITY METRICS & CIRCUIT BREAKER SERVICE
// Monitors operational health metrics (latency, error rates, quote age, fill conflicts).
// Triggers CIRCUIT_BREAKER_OPEN and halts automated trading when thresholds are breached.

export interface ObservabilityMetrics {
  quoteAgeMs: number;
  wsReconnectCount: number;
  staleQuoteRatio: number;      // 0.0 to 1.0
  orderLatencyMs: number;
  fillLatencyMs: number;
  brokerErrorRate: number;      // 0.0 to 1.0
  slippageBps: number;
  rejectedOrderCount: number;
  fillConflictCount: number;
}

export interface CircuitBreakerStatus {
  isOpen: boolean;
  state: "CIRCUIT_BREAKER_CLOSED" | "CIRCUIT_BREAKER_OPEN";
  trippedReasons: string[];
  lastEvaluatedAt: number;
  metrics: ObservabilityMetrics;
}

export class ObservabilityCircuitBreaker {
  private metrics: ObservabilityMetrics = {
    quoteAgeMs: 0,
    wsReconnectCount: 0,
    staleQuoteRatio: 0,
    orderLatencyMs: 0,
    fillLatencyMs: 0,
    brokerErrorRate: 0,
    slippageBps: 0,
    rejectedOrderCount: 0,
    fillConflictCount: 0,
  };

  private isOpen = false;
  private trippedReasons: string[] = [];

  public updateMetrics(partial: Partial<ObservabilityMetrics>): CircuitBreakerStatus {
    this.metrics = { ...this.metrics, ...partial };
    return this.evaluateHealth();
  }

  public incrementFillConflict(): void {
    this.metrics.fillConflictCount += 1;
    this.evaluateHealth();
  }

  public incrementRejectedOrder(): void {
    this.metrics.rejectedOrderCount += 1;
    this.evaluateHealth();
  }

  public recordBrokerError(hasError: boolean): void {
    // Moving average approximation for broker error rate
    const currentRate = this.metrics.brokerErrorRate;
    const sample = hasError ? 1.0 : 0.0;
    this.metrics.brokerErrorRate = +(currentRate * 0.8 + sample * 0.2).toFixed(3);
    this.evaluateHealth();
  }

  public evaluateHealth(): CircuitBreakerStatus {
    const reasons: string[] = [];

    // 1. Fill Conflict Check (ZERO TOLERANCE)
    if (this.metrics.fillConflictCount > 0) {
      reasons.push(`FILL_CONFLICT_DETECTED:${this.metrics.fillConflictCount}`);
    }

    // 2. Quote Age Threshold (e.g. > 10,000 ms)
    if (this.metrics.quoteAgeMs > 10_000) {
      reasons.push(`STALE_QUOTE_AGE:${this.metrics.quoteAgeMs}ms > 10000ms`);
    }

    // 3. Stale Quote Ratio (e.g. > 20%)
    if (this.metrics.staleQuoteRatio > 0.20) {
      reasons.push(`HIGH_STALE_QUOTE_RATIO:${(this.metrics.staleQuoteRatio * 100).toFixed(1)}% > 20%`);
    }

    // 4. Broker Error Rate (e.g. > 15%)
    if (this.metrics.brokerErrorRate > 0.15) {
      reasons.push(`HIGH_BROKER_ERROR_RATE:${(this.metrics.brokerErrorRate * 100).toFixed(1)}% > 15%`);
    }

    // 5. Excessive Order Latency (e.g. > 5,000 ms)
    if (this.metrics.orderLatencyMs > 5_000) {
      reasons.push(`EXCESSIVE_ORDER_LATENCY:${this.metrics.orderLatencyMs}ms > 5000ms`);
    }

    this.isOpen = reasons.length > 0;
    this.trippedReasons = reasons;

    return {
      isOpen: this.isOpen,
      state: this.isOpen ? "CIRCUIT_BREAKER_OPEN" : "CIRCUIT_BREAKER_CLOSED",
      trippedReasons: this.trippedReasons,
      lastEvaluatedAt: Date.now(),
      metrics: { ...this.metrics },
    };
  }

  public isTradingAllowed(): boolean {
    return !this.isOpen;
  }

  public getStatus(): CircuitBreakerStatus {
    return {
      isOpen: this.isOpen,
      state: this.isOpen ? "CIRCUIT_BREAKER_OPEN" : "CIRCUIT_BREAKER_CLOSED",
      trippedReasons: [...this.trippedReasons],
      lastEvaluatedAt: Date.now(),
      metrics: { ...this.metrics },
    };
  }

  public manualReset(): void {
    this.isOpen = false;
    this.trippedReasons = [];
    this.metrics.fillConflictCount = 0;
    this.metrics.rejectedOrderCount = 0;
    this.metrics.brokerErrorRate = 0;
  }
}

export const globalObservabilityCircuitBreaker = new ObservabilityCircuitBreaker();
