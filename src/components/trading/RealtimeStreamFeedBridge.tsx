import React, { useEffect } from "react";
import { realtimeMarketFeedService } from "../../services/realtimeMarketFeedService";
import { realtimeMarketStreamManager } from "../../services/RealtimeMarketStreamManager";

/**
 * Connects the existing WebSocket stream manager to the unified quote service.
 * This keeps charts, indicators and watchlists on one source of truth.
 */
export const RealtimeStreamFeedBridge: React.FC = () => {
  useEffect(() => {
    const onTickerUpdate = (event: Event) => {
      const custom = event as CustomEvent<any[]>;
      const rows = Array.isArray(custom.detail) ? custom.detail : [];

      rows.forEach((row) => {
        const source = String(row?.feedSource || row?.source || "");
        if (!["KIS_REALTIME_WS", "UPBIT_WS", "US_BROKER_WS", "SERVER_STREAM"].includes(source)) return;

        realtimeMarketFeedService.ingestStreamTick({
          symbol: String(row.symbol || row.code || row.market || ""),
          name: row.name,
          market: row.market,
          price: Number(row.price),
          change: Number(row.change),
          changePct: Number(row.changePct),
          volume: Number(row.volume),
          accumulatedVolume: Number(row.accumulatedVolume),
          accumulatedAmount: Number(row.accumulatedAmount),
          timestamp: Number(row.timestamp) || Date.now(),
          receivedAt: Date.now(),
          feedSource: source,
        });
      });
    };

    const onSymbolRegistered = (event: Event) => {
      const custom = event as CustomEvent<{ symbol?: string; market?: string }>;
      const symbol = String(custom.detail?.symbol || "").toUpperCase();
      if (!symbol) return;
      realtimeMarketStreamManager.subscribeSymbol(symbol);
    };

    window.addEventListener("stock_ticker_update", onTickerUpdate as EventListener);
    window.addEventListener("realtime_symbol_registered", onSymbolRegistered as EventListener);

    return () => {
      window.removeEventListener("stock_ticker_update", onTickerUpdate as EventListener);
      window.removeEventListener("realtime_symbol_registered", onSymbolRegistered as EventListener);
    };
  }, []);

  return null;
};

export default RealtimeStreamFeedBridge;
