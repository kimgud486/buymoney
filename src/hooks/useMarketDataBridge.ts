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
    isConnected: false,
    latencyMs: 0,
    lastHeartbeatMs: 0,
    activeBroker: /^\d{6}$/.test(initialSymbol) ? "KIS" : ["BTC", "ETH", "XRP", "SOL"].includes(initialSymbol) ? "UPBIT" : "KIS",
    bufferCount: 0,
    errorCount: 0,
    fallbackActive: false,
  });

  const [isStale, setIsStale] = useState<boolean>(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatRef = useRef<number>(0);

  const detectBrokerSource = (sym: string): { market: "KOREA" | "US" | "BTC"; source: BrokerageSource } => {
    const isCrypto = sym.startsWith("KRW-") || ["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "SHIB", "AVAX"].includes(sym.toUpperCase());
    if (isCrypto) return { market: "BTC", source: "UPBIT" };
    if (/^\d{6}$/.test(sym)) return { market: "KOREA", source: "KIS" };
    return { market: "US", source: "KIS" };
  };

  const markHeartbeat = useCallback((source: BrokerageSource, latencyMs: number) => {
    const now = Date.now();
    lastHeartbeatRef.current = now;
    setStreamStatus((prev) => ({
      ...prev,
      isConnected: true,
      latencyMs,
      lastHeartbeatMs: now,
      activeBroker: source,
      fallbackActive: false,
    }));
    setIsStale(false);
  }, []);

  const fetchTickData = useCallback(async (sym: string) => {
    const startMs = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const latency = Date.now() - startMs;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) throw new Error("NON_JSON_RESPONSE");

      const data = await res.json();
      const info = detectBrokerSource(sym);
      const price = Number(data.price ?? data.currentPrice);
      if (!Number.isFinite(price) || price <= 0) throw new Error("NO_VALID_LIVE_PRICE");

      const changePctRaw = Number(data.changePct ?? data.changePercent);
      const changeAmountRaw = Number(data.changeAmount ?? data.change);
      const highRaw = Number(data.high);
      const lowRaw = Number(data.low);
      const volumePowerRaw = Number(data.volumePower);
      const rvolRaw = Number(data.rvol);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      setCurrentTick((prev) => ({
        symbol: data.symbol || sym,
        name: data.name || sym,
        market: info.market,
        source: info.source,
        price,
        prevPrice: prev?.symbol === sym && prev.price > 0 ? prev.price : 0,
        changePct: Number.isFinite(changePctRaw) ? changePctRaw : 0,
        changeAmount: Number.isFinite(changeAmountRaw) ? changeAmountRaw : 0,
        high: Number.isFinite(highRaw) && highRaw > 0 ? highRaw : 0,
        low: Number.isFinite(lowRaw) && lowRaw > 0 ? lowRaw : 0,
        volume: data.volume == null ? "" : String(data.volume),
        ...(Number.isFinite(volumePowerRaw) ? { volumePower: volumePowerRaw } : {}),
        ...(Number.isFinite(rvolRaw) ? { rvol: rvolRaw } : {}),
        timestamp: timeStr,
        timestampMs: Date.now(),
        isLive: data.isLive === true || data.dataStatus === "LIVE",
      }));

      markHeartbeat(info.source, latency);
    } catch (err) {
      console.warn(`[MarketDataBridge] Stream poll error for ${sym}:`, err);
      setStreamStatus((prev) => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        fallbackActive: false,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }, [markHeartbeat]);

  const searchAndSubscribe = useCallback(
    async (symbol: any, name?: string) => {
      const cleanSym = safeSymbolStr(symbol).toUpperCase();
      if (!cleanSym) return;
      setActiveSymbol(cleanSym);
      setCurrentTick(null);
      setIsStale(true);
      lastHeartbeatRef.current = 0;

      const info = detectBrokerSource(cleanSym);
      stockSyncService.dispatch({
        symbol: cleanSym,
        name: name || cleanSym,
        source: info.source,
        market: info.market,
        price: 0,
        changePercent: 0,
      });

      await fetchTickData(cleanSym);
    },
    [fetchTickData]
  );

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
      const execPrice = Number(signal.price ?? currentTick?.price ?? 0);
      const qty = Number(signal.qty ?? 0);
      const confidence = Number(signal.confidence ?? 0);
      const broker = currentTick?.source || detectBrokerSource(activeSymbol).source;

      const newMarker: ActionMarker = {
        id: `marker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: timeStr,
        timestampMs: Date.now(),
        type: signal.type,
        price: Number.isFinite(execPrice) && execPrice > 0 ? execPrice : 0,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 0,
        amount: Number.isFinite(execPrice) && execPrice > 0 && Number.isFinite(qty) && qty > 0 ? qty * execPrice : 0,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        reason: signal.reason || `AI ${signal.type} 시그널`,
        sourceBroker: broker,
      };

      setActionMarkers((prev) => [newMarker, ...prev].slice(0, 30));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ai_action_signal", { detail: newMarker }));
      }
      return newMarker;
    },
    [activeSymbol, currentTick]
  );

  const clearMarkers = useCallback(() => setActionMarkers([]), []);

  const forceReconnect = useCallback(() => {
    setStreamStatus((prev) => ({
      ...prev,
      errorCount: 0,
      fallbackActive: false,
    }));
    fetchTickData(activeSymbol);
  }, [activeSymbol, fetchTickData]);

  useEffect(() => {
    fetchTickData(activeSymbol);
    pollTimerRef.current = setInterval(() => fetchTickData(activeSymbol), 3000);

    realtimeMarketFeedService.registerSymbol(activeSymbol);
    const unsubFeed = realtimeMarketFeedService.subscribe((qMap) => {
      const q = qMap.get(activeSymbol.toUpperCase()) || qMap.get(activeSymbol.replace("KRW-", "").toUpperCase());
      if (!q || q.price == null || !Number.isFinite(q.price) || q.price <= 0) return;

      const info = detectBrokerSource(activeSymbol);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setCurrentTick((prev) => ({
        symbol: q.symbol,
        name: q.name || prev?.name || q.symbol,
        market: info.market,
        source: info.source,
        price: q.price as number,
        prevPrice: prev?.price && prev.price > 0 ? prev.price : 0,
        changePct: q.changeRate ?? 0,
        changeAmount: q.changeAmount ?? 0,
        high: prev?.high ?? 0,
        low: prev?.low ?? 0,
        volume: q.volume == null ? "" : String(q.volume),
        timestamp: timeStr,
        timestampMs: Date.now(),
        isLive: q.status === "LIVE",
      }));
      markHeartbeat(info.source, Math.max(0, q.ageMs ?? 0));
    });

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      unsubFeed();
    };
  }, [activeSymbol, fetchTickData, markHeartbeat]);

  useEffect(() => {
    heartbeatCheckRef.current = setInterval(() => {
      const last = lastHeartbeatRef.current;
      if (last === 0 || Date.now() - last > 5000) {
        setIsStale(true);
        setStreamStatus((prev) => ({ ...prev, isConnected: false }));
      }
    }, 1000);

    return () => {
      if (heartbeatCheckRef.current) clearInterval(heartbeatCheckRef.current);
      heartbeatCheckRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleUpbitEvent = (e: any) => {
      if (!e?.detail || Array.isArray(e.detail)) return;
      const detail = e.detail;
      const detailSymbol = safeSymbolStr(detail.symbol).toUpperCase();
      if (!detailSymbol) return;
      if (activeSymbol !== detailSymbol && activeSymbol !== `KRW-${detailSymbol}`) return;

      const price = Number(detail.price);
      if (!Number.isFinite(price) || price <= 0) return;
      const changePct = Number(detail.changePct);
      const changeAmount = Number(detail.change);
      const high = Number(detail.high);
      const low = Number(detail.low);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      setCurrentTick((prev) => ({
        symbol: activeSymbol,
        name: detail.name || activeSymbol,
        market: "BTC",
        source: "UPBIT",
        price,
        prevPrice: prev?.price && prev.price > 0 ? prev.price : 0,
        changePct: Number.isFinite(changePct) ? changePct : 0,
        changeAmount: Number.isFinite(changeAmount) ? changeAmount : 0,
        high: Number.isFinite(high) && high > 0 ? high : 0,
        low: Number.isFinite(low) && low > 0 ? low : 0,
        volume: detail.volume == null ? "" : String(detail.volume),
        timestamp: timeStr,
        timestampMs: Date.now(),
        isLive: true,
      }));
      markHeartbeat("UPBIT", 0);
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
  }, [activeSymbol, markHeartbeat]);

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
