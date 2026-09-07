import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";
import { safeSymbolStr } from "../lib/stockDictionary";

export type PulseDirection = "UP" | "DOWN" | "FLAT";

export interface PulseEvent {
  symbol: string;
  price?: number;
  prevPrice?: number;
  direction: PulseDirection;
  timestamp: number;
}

export interface PulseState {
  isPulsing: boolean;
  pulseDirection: PulseDirection;
  pulseKey: number;
  pulseClass: string;
  pulseBadgeClass: string;
  pulseGlowClass: string;
  latestPulse: PulseEvent | null;
}

export interface PricePulseContextType {
  activePulses: Record<string, PulseEvent>;
  triggerPulse: (symbol: string, direction?: PulseDirection, price?: number, prevPrice?: number) => void;
  getPulseState: (symbol?: string) => PulseState;
}

const PricePulseContext = createContext<PricePulseContextType | undefined>(undefined);

const PULSE_DURATION_MS = 1000; // Pulse glow active for 1 second after tick update

export const PricePulseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePulses, setActivePulses] = useState<Record<string, PulseEvent>>({});
  const timersRef = useRef<Record<string, any>>({});
  const lastKnownPricesRef = useRef<Record<string, number>>({});

  // Helper to trigger pulse
  const triggerPulse = useCallback((
    symbol: any, 
    direction: PulseDirection = "UP", 
    price?: number, 
    prevPrice?: number
  ) => {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) return;
    const now = Date.now();

    const newPulse: PulseEvent = {
      symbol: cleanSym,
      price,
      prevPrice,
      direction,
      timestamp: now
    };

    setActivePulses(prev => ({
      ...prev,
      [cleanSym]: newPulse
    }));

    // Clear per-symbol timer if already exists
    if (timersRef.current[cleanSym]) {
      clearTimeout(timersRef.current[cleanSym]);
    }

    // Schedule per-symbol expiration
    timersRef.current[cleanSym] = setTimeout(() => {
      setActivePulses(prev => {
        if (!prev[cleanSym]) return prev;
        const copy = { ...prev };
        delete copy[cleanSym];
        return copy;
      });
      delete timersRef.current[cleanSym];
    }, PULSE_DURATION_MS);
  }, []);

  // Subscribe to RealtimeMarketStreamManager & Global Ticker Events
  useEffect(() => {
    // 1) Stock Ticker Batch Updates & KIS Realtime Ticks (Only pulse on REAL price change)
    const handleTickerUpdate = (e: any) => {
      const items = Array.isArray(e.detail) ? e.detail : [e.detail];
      items.forEach((item: any) => {
        if (!item || !item.symbol) return;
        const sym = item.symbol.toUpperCase();
        if (typeof item.price !== "number" || item.price <= 0) return;

        const prevPrice = lastKnownPricesRef.current[sym];
        lastKnownPricesRef.current[sym] = item.price;

        // Only pulse if we previously knew the price and it strictly changed
        if (prevPrice !== undefined && prevPrice !== item.price) {
          const dir: PulseDirection = item.price > prevPrice ? "UP" : "DOWN";
          triggerPulse(sym, dir, item.price, prevPrice);
        } else if (prevPrice === undefined) {
          // Initialize last known price
          lastKnownPricesRef.current[sym] = item.price;
        }
      });
    };

    const handleKisTickerUpdate = (e: any) => {
      const item = e.detail;
      if (!item || !item.symbol || typeof item.price !== "number" || item.price <= 0) return;
      const sym = item.symbol.toUpperCase();
      const prevPrice = lastKnownPricesRef.current[sym];
      lastKnownPricesRef.current[sym] = item.price;

      if (prevPrice !== undefined && prevPrice !== item.price) {
        const dir: PulseDirection = item.price > prevPrice ? "UP" : "DOWN";
        triggerPulse(sym, dir, item.price, prevPrice);
      }
    };

    // 2) Price Discrepancy Alerts & Instant Updates
    const handleAlertUpdate = (e: any) => {
      const d = e.detail;
      if (!d || !d.symbol) return;
      const sym = d.symbol.toUpperCase();
      if (d.newPrice && d.oldPrice && d.newPrice !== d.oldPrice) {
        lastKnownPricesRef.current[sym] = d.newPrice;
        const dir: PulseDirection = d.newPrice > d.oldPrice ? "UP" : "DOWN";
        triggerPulse(sym, dir, d.newPrice, d.oldPrice);
      }
    };

    // 3) Upbit Public Crypto Stream Ticks (Only pulse on price tick change)
    const handleUpbitUpdate = (e: any) => {
      const p = e.detail;
      if (!p || !p.code || typeof p.trade_price !== "number" || p.trade_price <= 0) return;
      const fullCode = p.code.toUpperCase(); // e.g. KRW-BTC
      const shortCode = fullCode.replace("KRW-", "");

      const prevPrice = lastKnownPricesRef.current[fullCode];
      lastKnownPricesRef.current[fullCode] = p.trade_price;
      if (shortCode !== fullCode) {
        lastKnownPricesRef.current[shortCode] = p.trade_price;
      }

      if (prevPrice !== undefined && prevPrice !== p.trade_price) {
        const dir: PulseDirection = p.trade_price > prevPrice ? "UP" : "DOWN";
        triggerPulse(fullCode, dir, p.trade_price, prevPrice);
        if (shortCode !== fullCode) {
          triggerPulse(shortCode, dir, p.trade_price, prevPrice);
        }
      }
    };

    // 4) StockSyncService Event listener
    const unsubscribeSync = stockSyncService.subscribe((evt: StockSyncEvent) => {
      if (evt.symbol && typeof evt.price === "number" && evt.price > 0) {
        const sym = evt.symbol.toUpperCase();
        const prevPrice = lastKnownPricesRef.current[sym];
        lastKnownPricesRef.current[sym] = evt.price;
        if (prevPrice !== undefined && prevPrice !== evt.price) {
          const dir: PulseDirection = evt.price > prevPrice ? "UP" : "DOWN";
          triggerPulse(sym, dir, evt.price, prevPrice);
        }
      }
    });

    window.addEventListener("stock_ticker_update", handleTickerUpdate);
    window.addEventListener("kis_ticker_update", handleKisTickerUpdate);
    window.addEventListener("stock_price_alert_update", handleAlertUpdate);
    window.addEventListener("upbit_ticker_update", handleUpbitUpdate);

    return () => {
      window.removeEventListener("stock_ticker_update", handleTickerUpdate);
      window.removeEventListener("kis_ticker_update", handleKisTickerUpdate);
      window.removeEventListener("stock_price_alert_update", handleAlertUpdate);
      window.removeEventListener("upbit_ticker_update", handleUpbitUpdate);
      unsubscribeSync();
      Object.values(timersRef.current).forEach((t: any) => clearTimeout(t));
      timersRef.current = {};
    };
  }, [triggerPulse]);

  // Evaluates pulse state for a given symbol
  const getPulseState = useCallback((symbol?: any): PulseState => {
    const cleanSym = safeSymbolStr(symbol).toUpperCase();
    if (!cleanSym) {
      return {
        isPulsing: false,
        pulseDirection: "UP",
        pulseKey: 0,
        pulseClass: "",
        pulseBadgeClass: "",
        pulseGlowClass: "",
        latestPulse: null
      };
    }

    const pulse = activePulses[cleanSym] || activePulses[cleanSym.replace("KRW-", "")] || activePulses[`KRW-${cleanSym}`];
    
    if (!pulse) {
      return {
        isPulsing: false,
        pulseDirection: "UP",
        pulseKey: 0,
        pulseClass: "",
        pulseBadgeClass: "",
        pulseGlowClass: "",
        latestPulse: null
      };
    }

    const elapsed = Date.now() - pulse.timestamp;
    const isPulsing = elapsed >= 0 && elapsed <= PULSE_DURATION_MS;

    if (!isPulsing) {
      return {
        isPulsing: false,
        pulseDirection: pulse.direction,
        pulseKey: pulse.timestamp,
        pulseClass: "",
        pulseBadgeClass: "",
        pulseGlowClass: "",
        latestPulse: pulse
      };
    }

    // Calm, non-disruptive smooth Tailwind highlights without layout shift or harsh blinking
    let pulseClass = "";
    let pulseBadgeClass = "";
    let pulseGlowClass = "";

    if (pulse.direction === "UP") {
      pulseClass = "bg-emerald-500/15 border-emerald-400/60 text-emerald-300 transition-colors duration-500";
      pulseBadgeClass = "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/50 transition-colors duration-500";
      pulseGlowClass = "border-emerald-400/60 bg-emerald-500/10 transition-colors duration-500";
    } else if (pulse.direction === "DOWN") {
      pulseClass = "bg-rose-500/15 border-rose-400/60 text-rose-300 transition-colors duration-500";
      pulseBadgeClass = "bg-rose-500/25 text-rose-300 ring-1 ring-rose-400/50 transition-colors duration-500";
      pulseGlowClass = "border-rose-400/60 bg-rose-500/10 transition-colors duration-500";
    } else {
      pulseClass = "bg-amber-500/15 border-amber-400/60 text-amber-300 transition-colors duration-500";
      pulseBadgeClass = "bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/50 transition-colors duration-500";
      pulseGlowClass = "border-amber-400/60 bg-amber-500/10 transition-colors duration-500";
    }

    return {
      isPulsing: true,
      pulseDirection: pulse.direction,
      pulseKey: pulse.timestamp,
      pulseClass,
      pulseBadgeClass,
      pulseGlowClass,
      latestPulse: pulse
    };
  }, [activePulses]);

  return (
    <PricePulseContext.Provider value={{ activePulses, triggerPulse, getPulseState }}>
      {children}
    </PricePulseContext.Provider>
  );
};

export function usePricePulse(symbol?: string) {
  const context = useContext(PricePulseContext);
  if (!context) {
    throw new Error("usePricePulse must be used within a PricePulseProvider");
  }

  const pulseState = context.getPulseState(symbol);

  return {
    ...pulseState,
    triggerPulse: (dir?: PulseDirection, price?: number, prevPrice?: number) => {
      if (symbol) context.triggerPulse(symbol, dir, price, prevPrice);
    },
    triggerPulseForSymbol: context.triggerPulse
  };
}

/**
 * Helper React Component to wrap UI price elements and automatically trigger pulse effects
 */
export const PricePulseWrapper: React.FC<{
  symbol: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}> = ({ symbol, children, className = "", activeClassName = "" }) => {
  const { isPulsing, pulseClass, pulseGlowClass } = usePricePulse(symbol);

  return (
    <div
      className={`${className} ${isPulsing ? `${pulseClass} ${pulseGlowClass} ${activeClassName}` : "transition-all duration-300"}`}
    >
      {children}
    </div>
  );
};

/**
 * Compact Price Badge with Live Pulse Effect
 */
export const PricePulseBadge: React.FC<{
  symbol: string;
  price: number;
  market?: string;
  className?: string;
}> = ({ symbol, price, market = "KOREA", className = "" }) => {
  const { isPulsing, pulseBadgeClass, pulseDirection } = usePricePulse(symbol);

  const formatPrice = (val: number) => {
    if (market === "US" || (/^[A-Z]{1,5}$/.test(symbol) && symbol !== "BTC" && symbol !== "ETH")) {
      return `$${(val ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(val).toLocaleString()}원`;
  };

  return (
    <span
      className={`inline-flex items-center space-x-1 font-mono transition-all duration-300 ${
        isPulsing ? pulseBadgeClass : className
      }`}
    >
      <span>{formatPrice(price)}</span>
      {isPulsing && (
        <span className="flex h-2 w-2 relative ml-1">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            pulseDirection === "UP" ? "bg-emerald-400" : pulseDirection === "DOWN" ? "bg-rose-400" : "bg-amber-400"
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            pulseDirection === "UP" ? "bg-emerald-500" : pulseDirection === "DOWN" ? "bg-rose-500" : "bg-amber-500"
          }`} />
        </span>
      )}
    </span>
  );
};
