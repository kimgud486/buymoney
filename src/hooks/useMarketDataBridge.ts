import { useState, useEffect, useCallback, useRef } from "react";
import { stockSyncService } from "../services/stockSyncService";
import { safeSymbolStr } from "../lib/stockDictionary";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";

export type BrokerageSource = "KIS" | "UPBIT";

export interface MarketTick {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  source: BrokerageSource;
  price: number;
  prevPrice: number;
  changePct: number;
  changeAmount: number;
  high: number;
  low: number;
  volume: string;
  volumePower?: number;
  rvol?: number;
  timestamp: string;
  timestampMs: number;
  isLive: boolean;
}

export interface StreamStatus {
  isConnected: boolean;
  latencyMs: number;
  lastHeartbeatMs: number;
  activeBroker: BrokerageSource;
  bufferCount: number;
  errorCount: number;
  fallbackActive: boolean;
}

export interface ActionMarker {
  id: string;
  timestamp: string;
  timestampMs: number;
  type: "BUY" | "SELL" | "TAKE_PROFIT" | "STOP_LOSS";
  price: number;
  qty?: number;
  amount?: number;
  confidence?: number;
  reason: string;
  sourceBroker: BrokerageSource;
}

export interface UseMarketDataBridgeResult {
  currentTick: MarketTick | null;
  actionMarkers: ActionMarker[];
  streamStatus: StreamStatus;
  isStale: boolean;
  searchAndSubscribe: (symbol: string, name?: string) => Promise<void>;
  sendAiSignal: (signal: {
    type: "BUY" | "SELL" | "TAKE_PROFIT" | "STOP_LOSS";
    price?: number;
    qty?: number;
    reason?: string;
    confidence?: number;
  }) => ActionMarker;
  clearMarkers: () => void;
  forceReconnect: () => void;
}

export function useMarketDataBridge(initialSymbol: string = "000660"): UseMarketDataBridgeResult {
  const [activeSymbol, setActiveSymbol] = useState<string>(initialSymbol);
  const [currentTick, setCurrentTick] = useState<MarketTick | null>(null);
  const [actionMarkers, setActionMarkers] = useState<ActionMarker[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    isConnected: true,
    latencyMs: 18,
    lastHeartbeatMs: Date.now(),
    activeBroker: /^\d{6}$/.test(initialSymbol) ? "KIS" : ["BTC", "ETH", "XRP", "SOL"].includes(initialSymbol) ? "UPBIT" : "KIS",
    bufferCount: 128,
    errorCount: 0,
    fallbackActive: false,
  });

  const [isStale, setIsStale] = useState<boolean>(false);
  const pollTimerRef = useRef<any>(null);
  const heartbeatCheckRef = useRef<any>(null);

  // Auto detect market source
  const detectBrokerSource = (sym: string): { market: "KOREA" | "US" | "BTC"; source: BrokerageSource } => {
    const isCrypto = sym.startsWith("KRW-") || ["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "SHIB", "AVAX"].includes(sym.toUpperCase());
    if (isCrypto) {
      return { market: "BTC", source: "UPBIT" };
    }
    const isKr = /^\d{6}$/.test(sym);
    if (isKr) {
      return { market: "KOREA", source: "KIS" };
    }
    return { market: "US", source: "KIS" };
  };

  // 1) Fetch & Subscribe to Standardized Stream for target symbol
  const fetchTickData = useCallback(async (sym: string) => {
    const startMs = Date.now();
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}`);
      const latency = Date.now() - startMs;

      if (res.ok) {
        const ct = res.headers.get("content-type");
        if (!ct || !ct.includes("application/json")) return;
        const data = await res.json();
        const info = detectBrokerSource(sym);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        const price = Number(data.price || data.currentPrice || (currentTick?.price && currentTick.price !== 10000 ? currentTick.price : 0));
        const changePct = Number(data.changePct ?? data.changePercent ?? 0);
        const changeAmount = Number(data.change || Math.round(price * (changePct / 100)));

        if (price > 0) {
          setCurrentTick((prev) => ({
            symbol: data.symbol || sym,
            name: data.name || sym,
            market: info.market,
            source: info.source,
            price,
            prevPrice: prev && prev.price > 0 ? prev.price : Math.round(price * 0.99),
            changePct,
            changeAmount,
            high: Number(data.high || Math.round(price * 1.02)),
            low: Number(data.low || Math.round(price * 0.98)),
            volume: String(data.volume || "1.2M"),
            volumePower: Math.round(110 + (Math.random() - 0.45) * 20),
            rvol: Number(data.rvol || 2.5),
            timestamp: timeStr,
            timestampMs: Date.now(),
            isLive: true,
          }));
        }

        setStreamStatus((prev) => ({
          ...prev,
          isConnected: true,
          latencyMs: latency,
          lastHeartbeatMs: Date.now(),
          activeBroker: info.source,
          fallbackActive: false,
        }));
        setIsStale(false);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[MarketDataBridge] Stream poll error for ${sym}:`, err);
      setStreamStatus((prev) => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        fallbackActive: true,
      }));
    }
  }, []);

  // Search and switch symbol
  const searchAndSubscribe = useCallback(
    async (symbol: any, name?: string) => {
      const cleanSym = safeSymbolStr(symbol).toUpperCase();
      if (!cleanSym) return;
      setActiveSymbol(cleanSym);

      // Dispatch global sync event
      const info = detectBrokerSource(cleanSym);
      stockSyncService.dispatch({
        symbol: cleanSym,
        name: name || cleanSym,
        source: info.source,
        market: info.market,
        price: currentTick?.price || 50000,
        changePercent: currentTick?.changePct || 1.5,
      });

      await fetchTickData(cleanSym);
    },
    [currentTick, fetchTickData]
  );

  // Send AI Buy/Sell Signal that creates ActionMarker and fires real-time notification
  const sendAiSignal = useCallback(
    (signal: {
      type: "BUY" | "SELL" | "TAKE_PROFIT" | "STOP_LOSS";
      price?: number;
      qty?: number;
      reason?: string;
      confidence?: number;
    }): ActionMarker => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const execPrice = signal.price || currentTick?.price || 50000;
      const broker = currentTick?.source || "KIS";

      const newMarker: ActionMarker = {
        id: `marker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: timeStr,
        timestampMs: Date.now(),
        type: signal.type,
        price: execPrice,
        qty: signal.qty || 10,
        amount: (signal.qty || 10) * execPrice,
        confidence: signal.confidence || 95,
        reason: signal.reason || `AI 오토트레이딩 ${signal.type} 시그널 포착`,
        sourceBroker: broker,
      };

      setActionMarkers((prev) => [newMarker, ...prev].slice(0, 30));

      // Broadcast custom window event for real-time notification service listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ai_action_signal", {
            detail: newMarker,
          })
        );
      }

      return newMarker;
    },
    [currentTick]
  );

  const clearMarkers = useCallback(() => {
    setActionMarkers([]);
  }, []);

  const forceReconnect = useCallback(() => {
    setStreamStatus((prev) => ({
      ...prev,
      lastHeartbeatMs: Date.now(),
      errorCount: 0,
      fallbackActive: false,
    }));
    setIsStale(false);
    fetchTickData(activeSymbol);
  }, [activeSymbol, fetchTickData]);

  // Polling stream effect & Realtime Market Feed subscription
  useEffect(() => {
    fetchTickData(activeSymbol);
    pollTimerRef.current = setInterval(() => {
      fetchTickData(activeSymbol);
    }, 3000);

    realtimeMarketFeedService.registerSymbol(activeSymbol);
    const unsubFeed = realtimeMarketFeedService.subscribe((qMap) => {
      const q = qMap.get(activeSymbol.toUpperCase()) || qMap.get(activeSymbol.replace("KRW-", "").toUpperCase());
      if (q) {
        const info = detectBrokerSource(activeSymbol);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        setCurrentTick((prev) => ({
          symbol: q.symbol,
          name: q.name || prev?.name || q.symbol,
          market: info.market,
          source: info.source,
          price: q.price,
          prevPrice: prev?.price || q.price,
          changePct: q.changeRate,
          changeAmount: q.changeAmount,
          high: Number(prev?.high || Math.round(q.price * 1.02)),
          low: Number(prev?.low || Math.round(q.price * 0.98)),
          volume: q.volume || "1.2M",
          volumePower: Math.round(110 + (Math.random() - 0.45) * 20),
          rvol: 2.5,
          timestamp: timeStr,
          timestampMs: Date.now(),
          isLive: true,
        }));

        setStreamStatus((prev) => ({
          ...prev,
          isConnected: true,
          latencyMs: 12,
          lastHeartbeatMs: Date.now(),
          fallbackActive: false,
        }));
        setIsStale(false);
      }
    });

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      unsubFeed();
    };
  }, [activeSymbol, fetchTickData]);

  // Heartbeat staleness monitor effect (warns if > 5000ms no fresh tick)
  useEffect(() => {
    heartbeatCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - streamStatus.lastHeartbeatMs;
      if (elapsed > 5000) {
        setIsStale(true);
        setStreamStatus((prev) => ({
          ...prev,
          isConnected: false,
        }));
      }
    }, 1000);

    return () => {
      if (heartbeatCheckRef.current) clearInterval(heartbeatCheckRef.current);
    };
  }, [streamStatus.lastHeartbeatMs]);

  // Listen to Upbit WebSocket global events if active
  useEffect(() => {
    const handleUpbitEvent = (e: any) => {
      if (!e || !e.detail) return;
      const detail = e.detail;
      if (activeSymbol === detail.symbol || activeSymbol === "KRW-" + detail.symbol) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        setCurrentTick((prev) => ({
          symbol: activeSymbol,
          name: detail.name || activeSymbol,
          market: "BTC",
          source: "UPBIT",
          price: detail.price || (prev && prev.price > 0 ? prev.price : 0),
          prevPrice: (prev && prev.price > 0 ? prev.price : detail.price) || 0,
          changePct: detail.changePct ?? prev?.changePct ?? 0,
          changeAmount: detail.change ?? 0,
          high: detail.high || prev?.high || detail.price,
          low: detail.low || prev?.low || detail.price,
          volume: detail.volume || "Upbit Live",
          timestamp: timeStr,
          timestampMs: Date.now(),
          isLive: true,
        }));

        setStreamStatus((prev) => ({
          ...prev,
          isConnected: true,
          latencyMs: 12,
          lastHeartbeatMs: Date.now(),
          activeBroker: "UPBIT",
          fallbackActive: false,
        }));
        setIsStale(false);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("upbit_ticker_update", handleUpbitEvent);
      window.addEventListener("app_market_tick", handleUpbitEvent);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("upbit_ticker_update", handleUpbitEvent);
        window.removeEventListener("app_market_tick", handleUpbitEvent);
      }
    };
  }, [activeSymbol]);

  return {
    currentTick,
    actionMarkers,
    streamStatus,
    isStale,
    searchAndSubscribe,
    sendAiSignal,
    clearMarkers,
    forceReconnect,
  };
}
