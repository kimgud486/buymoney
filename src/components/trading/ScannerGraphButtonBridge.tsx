import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { StockCandleChartModal } from "../StockCandleChartModal";

type ChartTarget = {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
};

function normalizeSymbol(value: unknown): string {
  if (typeof value === "string") return value.trim().toUpperCase();
  if (value && typeof value === "object" && "symbol" in value) {
    return String((value as { symbol?: unknown }).symbol || "").trim().toUpperCase();
  }
  return "";
}

function inferMarket(symbol: string): ChartTarget["market"] {
  if (symbol.startsWith("KRW-")) return "BTC";
  if (/^\d{6}$/.test(symbol)) return "KOREA";
  return "US";
}

function chartModalAlreadyOpen(): boolean {
  return Array.from(document.querySelectorAll("button")).some((button) =>
    (button.textContent || "").includes("AI 예측 그래프 (실시간 대조)"),
  );
}

/**
 * Compatibility bridge for the merged scanner's `그래프 보기` button.
 *
 * Some parent integrations provide `onSelectStock`, so the legacy scanner only
 * changes the selected symbol and does not open its own chart modal. This bridge
 * waits for that real symbol selection, then opens the same StockCandleChartModal.
 * It does nothing when the scanner already opened its native modal.
 */
export default function ScannerGraphButtonBridge() {
  const app = useApp() as any;
  const selectedSymbol = normalizeSymbol(app.selectedSymbol);
  const allStocks = Array.isArray(app.allStocks) ? app.allStocks : [];
  const [target, setTarget] = useState<ChartTarget | null>(null);
  const latestSymbolRef = useRef(selectedSymbol);
  const latestStocksRef = useRef<any[]>(allStocks);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    latestSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  useEffect(() => {
    latestStocksRef.current = allStocks;
  }, [allStocks]);

  const selectedName = useMemo(() => {
    const found = allStocks.find((stock: any) => normalizeSymbol(stock?.symbol) === selectedSymbol);
    return String(found?.name || found?.companyName || found?.displayName || selectedSymbol || "선택 종목");
  }, [allStocks, selectedSymbol]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const button = element?.closest("button");
      if (!button || !(button.textContent || "").replace(/\s+/g, " ").includes("그래프 보기")) return;

      const before = latestSymbolRef.current;
      if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current);

      pendingTimerRef.current = window.setTimeout(() => {
        pendingTimerRef.current = null;
        if (chartModalAlreadyOpen()) return;

        const symbol = latestSymbolRef.current || before;
        if (!symbol) return;
        const stock = latestStocksRef.current.find((item: any) => normalizeSymbol(item?.symbol) === symbol);
        const name = String(stock?.name || stock?.companyName || stock?.displayName || symbol);
        setTarget({ symbol, name, market: inferMarket(symbol) });
      }, 180);
    };

    document.addEventListener("click", handleClick, false);
    return () => {
      document.removeEventListener("click", handleClick, false);
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, []);

  // Keep the title fresh if the app resolves the stock name after selection.
  useEffect(() => {
    if (!target || target.symbol !== selectedSymbol || selectedName === target.name) return;
    setTarget((current) => current ? { ...current, name: selectedName } : current);
  }, [selectedName, selectedSymbol, target]);

  if (!target) return null;

  return (
    <StockCandleChartModal
      symbol={target.symbol}
      name={target.name}
      market={target.market}
      onClose={() => setTarget(null)}
    />
  );
}
