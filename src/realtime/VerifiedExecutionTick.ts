// ----------------------------------------------------------------------
// VERIFIED EXECUTION TICK V19.0 (AISTOCK DATA TRUTH CANONICAL TICK)
// ----------------------------------------------------------------------

export type DataTruthStatus =
  | "REALTIME_VERIFIED"
  | "REALTIME_DERIVED"
  | "STALE"
  | "NO_DATA"
  | "INVALID"
  | "CLOSED";

export interface VerifiedExecutionTick {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO" | "KR";
  price: number;
  sourceTimestamp: number;
  receivedAt: number;
  ageMs: number;
  sequence: number;
  dataStatus: DataTruthStatus;
  sessionStatus?: string;
  brokerHealth?: "HEALTHY" | "DEGRADED" | "DISCONNECTED";
}

export class VerifiedExecutionTickValidator {
  public static validate(tick: VerifiedExecutionTick, expectedSymbol?: string): void {
    if (!tick) {
      throw new Error("EMPTY_EXECUTION_TICK");
    }

    if (expectedSymbol && tick.symbol && tick.symbol.toUpperCase() !== expectedSymbol.toUpperCase()) {
      throw new Error(`SYMBOL_MISMATCH: expected ${expectedSymbol}, got ${tick.symbol}`);
    }

    if (tick.dataStatus !== "REALTIME_VERIFIED" && tick.dataStatus !== "REALTIME_DERIVED") {
      throw new Error(`UNVERIFIED_DATA_STATUS: ${tick.dataStatus}`);
    }

    if (!Number.isFinite(tick.price) || tick.price <= 0) {
      throw new Error(`INVALID_EXECUTION_PRICE: ${tick.price}`);
    }

    const calculatedAge = Date.now() - (tick.sourceTimestamp || tick.receivedAt || Date.now());
    const effectiveAge = tick.ageMs ?? calculatedAge;

    if (effectiveAge > 300000 || effectiveAge < -60000) {
      throw new Error(`STALE_EXECUTION_TICK: ageMs=${effectiveAge}`);
    }

    if (tick.brokerHealth === "DISCONNECTED") {
      throw new Error("BROKER_DISCONNECTED_TICK_REJECTED");
    }
  }

  /**
   * Strict validation for order execution decisions.
   * Requires REALTIME_VERIFIED status and tight age bounds (KR/US <= 5s, CRYPTO <= 3s).
   */
  public static validateForExecution(
    tick: VerifiedExecutionTick,
    expectedSymbol?: string,
    maxAgeMsOverride?: number
  ): void {
    if (!tick) {
      throw new Error("EMPTY_EXECUTION_TICK");
    }

    if (expectedSymbol && tick.symbol && tick.symbol.toUpperCase() !== expectedSymbol.toUpperCase()) {
      throw new Error(`SYMBOL_MISMATCH: expected ${expectedSymbol}, got ${tick.symbol}`);
    }

    if (tick.dataStatus !== "REALTIME_VERIFIED") {
      throw new Error(`EXECUTION_REQUIRES_REALTIME_VERIFIED: got ${tick.dataStatus}`);
    }

    if (!Number.isFinite(tick.price) || tick.price <= 0) {
      throw new Error(`INVALID_EXECUTION_PRICE: ${tick.price}`);
    }

    const calculatedAge = Date.now() - (tick.sourceTimestamp || tick.receivedAt || Date.now());
    const effectiveAge = tick.ageMs ?? calculatedAge;

    const maxAllowedAge = maxAgeMsOverride ?? (
      tick.market === "CRYPTO" ? 3000 : 5000
    );

    if (effectiveAge > maxAllowedAge || effectiveAge < -60000) {
      throw new Error(`STALE_EXECUTION_TICK: ageMs=${effectiveAge} exceeds maxAllowedAge=${maxAllowedAge}ms`);
    }

    if (tick.sessionStatus === "CLOSED") {
      throw new Error("MARKET_SESSION_CLOSED_TICK_REJECTED");
    }

    if (tick.brokerHealth === "DISCONNECTED" || tick.brokerHealth === "DEGRADED") {
      throw new Error(`BROKER_HEALTH_INVALID_FOR_EXECUTION: ${tick.brokerHealth}`);
    }
  }

  public static isValid(tick: VerifiedExecutionTick, expectedSymbol?: string): boolean {
    try {
      this.validate(tick, expectedSymbol);
      return true;
    } catch {
      return false;
    }
  }

  public static isValidForExecution(tick: VerifiedExecutionTick, expectedSymbol?: string, maxAgeMsOverride?: number): boolean {
    try {
      this.validateForExecution(tick, expectedSymbol, maxAgeMsOverride);
      return true;
    } catch {
      return false;
    }
  }
}
