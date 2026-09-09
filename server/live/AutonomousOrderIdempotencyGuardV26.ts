import { createHash } from "node:crypto";

export interface AutonomousOrderIdentity {
  accountKey: string;
  symbol: string;
  side: "BUY" | "SELL";
  strategyId: string;
  decisionId: string;
}

interface ClaimRecord {
  claimedAt: number;
  expiresAt: number;
}

/**
 * Process-local duplicate submission guard.
 *
 * This is a secondary safety belt, not the restart-recovery source of truth.
 * Production restart recovery must still reconcile broker open orders/fills
 * before AUTO_LIVE is re-enabled.
 */
export class AutonomousOrderIdempotencyGuardV26 {
  private readonly claims = new Map<string, ClaimRecord>();

  constructor(private readonly ttlMs = 5 * 60_000) {}

  static makeKey(identity: AutonomousOrderIdentity): string {
    const raw = [
      identity.accountKey.trim(),
      identity.symbol.trim().toUpperCase(),
      identity.side,
      identity.strategyId.trim(),
      identity.decisionId.trim(),
    ].join("|");
    return createHash("sha256").update(raw).digest("hex");
  }

  claim(key: string, now = Date.now()): boolean {
    this.prune(now);
    const existing = this.claims.get(key);
    if (existing && existing.expiresAt > now) return false;

    this.claims.set(key, {
      claimedAt: now,
      expiresAt: now + Math.max(1_000, this.ttlMs),
    });
    return true;
  }

  release(key: string): void {
    this.claims.delete(key);
  }

  hasActiveClaim(key: string, now = Date.now()): boolean {
    this.prune(now);
    return this.claims.has(key);
  }

  private prune(now: number): void {
    for (const [key, record] of this.claims.entries()) {
      if (record.expiresAt <= now) this.claims.delete(key);
    }
  }
}
