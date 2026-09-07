export interface BuyReadyContext {
  realtimeFeedValid: boolean;
  indicatorsReady: boolean;
  closedCandle: boolean;

  marketStrong: boolean;
  sectorStrong: boolean;
  relativeStrengthStrong: boolean;

  vwapValid: boolean;
  structureValid: boolean;

  rvol: number;
  todRvol?: number;

  breakoutConfirmed: boolean;

  chaseRisk: boolean;
  falseBreakoutRisk: boolean;

  expectedNetEdgePct: number;

  spreadPct: number;
}

export function evaluateBuyReady(c: BuyReadyContext): "BUY_READY" | "BUY_WATCH" | "NO_TRADE" {
  if (!c.realtimeFeedValid) return "NO_TRADE";
  if (!c.indicatorsReady) return "NO_TRADE";
  if (!c.closedCandle) return "BUY_WATCH";

  if (!c.marketStrong) return "BUY_WATCH";
  if (!c.sectorStrong) return "BUY_WATCH";
  if (!c.relativeStrengthStrong) return "BUY_WATCH";

  if (!c.vwapValid) return "BUY_WATCH";
  if (!c.structureValid) return "BUY_WATCH";

  if (c.rvol < 1.5) return "BUY_WATCH";
  if (typeof c.todRvol === "number" && Number.isFinite(c.todRvol) && c.todRvol < 1.3) {
    return "BUY_WATCH";
  }

  if (!c.breakoutConfirmed) return "BUY_WATCH";

  if (c.chaseRisk) return "NO_TRADE";
  if (c.falseBreakoutRisk) return "NO_TRADE";
  if (c.spreadPct > 0.5) return "NO_TRADE";
  if (c.expectedNetEdgePct <= 0) return "NO_TRADE";

  return "BUY_READY";
}
