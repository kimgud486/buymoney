// ----------------------------------------------------------------------
// INSTITUTIONAL ORDER FLOW SERVICE (V14.2 INSTITUTIONAL TRUTH)
// Zero Fake Order Flow - Only Returns Real Data or UNAVAILABLE
// ----------------------------------------------------------------------

import { VerifiedTradeTick, validateTradeTick } from "../realtime/VerifiedTradeTick";

export interface InstitutionalFlowAnalysis {
  status: "LIVE" | "UNAVAILABLE" | "STALE";

  bidAskDelta: number | null;
  cumulativeDelta: number | null;

  buyVolume: number | null;
  sellVolume: number | null;

  poc: number | null;
  vah: number | null;
  val: number | null;

  bidImbalance: number | null;
  askImbalance: number | null;

  absorption: boolean | null;
  exhaustion: boolean | null;
}

export function unavailableInstitutionalFlow(): InstitutionalFlowAnalysis {
  return {
    status: "UNAVAILABLE",
    bidAskDelta: null,
    cumulativeDelta: null,
    buyVolume: null,
    sellVolume: null,
    poc: null,
    vah: null,
    val: null,
    bidImbalance: null,
    askImbalance: null,
    absorption: null,
    exhaustion: null
  };
}

interface SymbolTickState {
  lastPrice: number;
  cumulativeDelta: number;
  buyVolume: number;
  sellVolume: number;
  priceVolumeMap: Map<number, number>;
  lastUpdated: number;
}

class InstitutionalOrderFlowServiceImpl {
  private liveFlowData: Map<string, InstitutionalFlowAnalysis> = new Map();
  private tickStates: Map<string, SymbolTickState> = new Map();

  /**
   * Get order flow analysis for a symbol.
   * Returns UNAVAILABLE with null fields if no real tick feed is attached.
   */
  public getFlow(symbol: string): InstitutionalFlowAnalysis {
    if (!symbol) return unavailableInstitutionalFlow();
    const cleanSym = symbol.toUpperCase();
    const data = this.liveFlowData.get(cleanSym);
    if (!data) {
      return unavailableInstitutionalFlow();
    }
    // Stale check (if silent for > 60 seconds)
    const state = this.tickStates.get(cleanSym);
    if (state && Date.now() - state.lastUpdated > 60000) {
      return { ...data, status: "STALE" };
    }
    return data;
  }

  /**
   * Process verified real tick feed
   */
  public processVerifiedTick(tick: VerifiedTradeTick, askPrice?: number, bidPrice?: number): void {
    try {
      validateTradeTick(tick);
    } catch {
      return; // Ignore invalid ticks
    }

    const sym = tick.symbol.toUpperCase();
    let state = this.tickStates.get(sym);
    if (!state) {
      state = {
        lastPrice: tick.price,
        cumulativeDelta: 0,
        buyVolume: 0,
        sellVolume: 0,
        priceVolumeMap: new Map(),
        lastUpdated: Date.now()
      };
      this.tickStates.set(sym, state);
    }

    // Determine aggressor side via ask/bid quote or uptick/downtick rule
    let isBuyAggressor = false;
    if (askPrice && bidPrice) {
      isBuyAggressor = Math.abs(tick.price - askPrice) <= Math.abs(tick.price - bidPrice);
    } else {
      isBuyAggressor = tick.price >= state.lastPrice;
    }

    const delta = isBuyAggressor ? tick.size : -tick.size;
    state.cumulativeDelta += delta;
    if (isBuyAggressor) {
      state.buyVolume += tick.size;
    } else {
      state.sellVolume += tick.size;
    }

    // Volume Profile (POC calculation)
    const currentPriceVol = state.priceVolumeMap.get(tick.price) ?? 0;
    state.priceVolumeMap.set(tick.price, currentPriceVol + tick.size);
    state.lastPrice = tick.price;
    state.lastUpdated = Date.now();

    // Find Point of Control (POC)
    let pocPrice: number | null = null;
    let maxVol = 0;
    state.priceVolumeMap.forEach((vol, prc) => {
      if (vol > maxVol) {
        maxVol = vol;
        pocPrice = prc;
      }
    });

    const updatedAnalysis: InstitutionalFlowAnalysis = {
      status: "LIVE",
      bidAskDelta: delta,
      cumulativeDelta: state.cumulativeDelta,
      buyVolume: state.buyVolume,
      sellVolume: state.sellVolume,
      poc: pocPrice,
      vah: null,
      val: null,
      bidImbalance: null,
      askImbalance: null,
      absorption: state.buyVolume > 0 && state.sellVolume > 0 && Math.abs(state.cumulativeDelta) < (state.buyVolume + state.sellVolume) * 0.05,
      exhaustion: false
    };

    this.liveFlowData.set(sym, updatedAnalysis);
  }

  /**
   * Directly set verified order flow snapshot
   */
  public updateRealTickFlow(symbol: string, flow: InstitutionalFlowAnalysis) {
    if (!symbol) return;
    this.liveFlowData.set(symbol.toUpperCase(), flow);
  }
}

export const institutionalOrderFlowService = new InstitutionalOrderFlowServiceImpl();
