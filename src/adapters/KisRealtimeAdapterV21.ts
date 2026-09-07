// JUSIK2 V21 KIS REALTIME ADAPTER
// Normalizes raw KIS WebSocket frames into strict TickV21 objects.

import { FeedStatusV21, MarketTypeV21, TickV21 } from "../services/v21/types";

export interface RawKisTickData {
  mksc_shrn_iscd?: string; // symbol e.g., 005930
  stck_prpr?: string | number; // current price
  cntg_vol?: string | number; // trade volume
  stck_cntg_hour?: string; // time HHMMSS
  isRealtime?: boolean;
  receivedAt?: number;
}

export class KisRealtimeAdapterV21 {
  public static normalize(raw: RawKisTickData, market: MarketTypeV21 = "KOREA"): TickV21 {
    const symbol = raw.mksc_shrn_iscd || "UNKNOWN";
    const price = typeof raw.stck_prpr === "number" ? raw.stck_prpr : parseFloat(String(raw.stck_prpr || 0));
    const volume = typeof raw.cntg_vol === "number" ? raw.cntg_vol : parseFloat(String(raw.cntg_vol || 0));
    const now = raw.receivedAt || Date.now();

    const isVerified = raw.isRealtime !== false && price > 0;
    const status: FeedStatusV21 = isVerified ? "REALTIME_VERIFIED" : "STALE";

    return {
      symbol,
      market,
      price,
      volume,
      timestamp: now,
      status,
      providerTimestamp: now,
      source: "KIS_WS_V21",
    };
  }
}
