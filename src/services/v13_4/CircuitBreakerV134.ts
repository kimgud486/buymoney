import { CircuitBreakerStatusV134 } from "./typesV134";

export class CircuitBreakerV134 {
  private status: CircuitBreakerStatusV134 = {
    isTripped: false,
    consecutiveFailures: 0
  };
  private failureThreshold: number = 5;
  private cooldownMs: number = 30000; // 30s cooldown

  constructor(failureThreshold: number = 5, cooldownMs: number = 30000) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
  }

  public recordSuccess() {
    this.status.consecutiveFailures = 0;
    if (this.status.isTripped && this.status.lastTripTime) {
      if (Date.now() - this.status.lastTripTime > this.cooldownMs) {
        this.status.isTripped = false;
        this.status.tripReason = undefined;
      }
    }
  }

  public recordFailure(reason: string) {
    this.status.consecutiveFailures += 1;
    if (this.status.consecutiveFailures >= this.failureThreshold || reason.includes("CRITICAL")) {
      this.trip(reason);
    }
  }

  public trip(reason: string) {
    this.status.isTripped = true;
    this.status.tripReason = reason;
    this.status.lastTripTime = Date.now();
  }

  public reset() {
    this.status.isTripped = false;
    this.status.tripReason = undefined;
    this.status.consecutiveFailures = 0;
    this.status.lastTripTime = undefined;
  }

  public getStatus(): CircuitBreakerStatusV134 {
    return { ...this.status };
  }
}

export const circuitBreakerV134 = new CircuitBreakerV134();
