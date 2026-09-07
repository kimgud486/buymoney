// AISTOCK v13.8 Position Trailing State Store
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export interface PersistedTrailingState {
  positionId: string;
  symbol: string;
  market: "KOREA" | "US";

  entryPrice: number;
  qty: number;

  highestPriceSinceBuy: number;
  trailingFloor: number;

  lastState: "HOLD" | "PROFIT_HOLD" | "TRAIL_UP" | "SELL_WATCH" | "SELL" | "EMERGENCY_EXIT";

  updatedAt: number;
}

export class PositionTrailingStateStoreV138 {
  private static memoryCache = new Map<string, PersistedTrailingState>();

  /**
   * Generates position document key
   */
  private static getDocKey(symbol: string, positionId?: string): string {
    return positionId ? `${symbol}_${positionId}` : symbol;
  }

  /**
   * Saves or updates position trailing state to Firestore + local memory
   */
  public static async saveState(state: PersistedTrailingState): Promise<void> {
    const key = this.getDocKey(state.symbol, state.positionId);
    this.memoryCache.set(key, { ...state });

    try {
      const docRef = doc(db, "positions_trailing_v138", key);
      await setDoc(docRef, {
        ...state,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn("Failed to persist position trailing state to Firestore, falling back to memory:", err);
    }
  }

  /**
   * Loads position trailing state from Firestore (or local memory)
   */
  public static async getState(symbol: string, positionId?: string): Promise<PersistedTrailingState | null> {
    const key = this.getDocKey(symbol, positionId);

    try {
      const docRef = doc(db, "positions_trailing_v138", key);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data() as PersistedTrailingState;
        this.memoryCache.set(key, data);
        return data;
      }
    } catch (err) {
      console.warn("Firestore fetch error, falling back to memory cache:", err);
    }

    return this.memoryCache.get(key) || null;
  }

  /**
   * Removes position state when position is closed (after fill confirmation)
   */
  public static async clearState(symbol: string, positionId?: string): Promise<void> {
    const key = this.getDocKey(symbol, positionId);
    this.memoryCache.delete(key);

    try {
      const docRef = doc(db, "positions_trailing_v138", key);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn("Failed to clear position trailing state from Firestore:", err);
    }
  }

  /**
   * Synchronous memory cache getter for fast UI loop access
   */
  public static getMemoryState(symbol: string, positionId?: string): PersistedTrailingState | null {
    const key = this.getDocKey(symbol, positionId);
    return this.memoryCache.get(key) || null;
  }
}
