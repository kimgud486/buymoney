// AISTOCK v13.8 Verified Trade Tick Interface & Validator

export interface VerifiedTradeTick {
  symbol: string;
  market: "KOREA" | "US" | "CRYPTO";

  price: number;
  size: number;

  exchangeTimestamp: number;
  receivedAt: number;

  source: "KIS_REALTIME_WS";
  trId: string; // e.g. H0STCNT0

  verified: true;
}

export function validateTradeTick(tick: VerifiedTradeTick): void {
  if (!tick) {
    throw new Error("EMPTY_TICK_OBJECT");
  }

  if (tick.source !== "KIS_REALTIME_WS") {
    throw new Error("INVALID_TICK_SOURCE");
  }

  if (!tick.trId || (tick.trId !== "H0STCNT0" && tick.trId !== "H0STCNI0" && !tick.trId.startsWith("H0"))) {
    throw new Error("INVALID_TR_ID");
  }

  if (!Number.isFinite(tick.price) || tick.price <= 0) {
    throw new Error("INVALID_TRADE_PRICE");
  }

  if (!Number.isFinite(tick.size) || tick.size <= 0) {
    throw new Error("INVALID_TRADE_SIZE");
  }

  const age = Date.now() - tick.exchangeTimestamp;
  if (age > 300000 || age < -60000) {
    throw new Error("STALE_OR_FUTURE_TRADE_TICK");
  }

  if (tick.verified !== true) {
    throw new Error("UNVERIFIED_TRADE_TICK");
  }
}
