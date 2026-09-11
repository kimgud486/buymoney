/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { PricePulseProvider } from "./context/PricePulseContext";
import { ToastContainer } from "./components/ToastContainer";
import { RealtimeMarketStreamManager } from "./components/RealtimeMarketStreamManager";
import { MultiModelSecuritiesConsensusModal } from "./components/MultiModelSecuritiesConsensusModal";
import { MasterAiAutoTradingDashboard } from "./components/trading/MasterAiAutoTradingDashboard";
import { RealTimeTradingViewChart } from "./components/trading/RealTimeTradingViewChart";
import RealtimeHubStatusStrip from "./components/trading/RealtimeHubStatusStrip";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainScreenKoreanText } from "./components/MainScreenKoreanText";
import ElementaryScanExplanationPanel from "./components/ElementaryScanExplanationPanel";
import { v11ExecutionEngine } from "./components/AistockV11ExecutionConsole";
import { Maximize2, Minimize2, MousePointer2, X } from "lucide-react";

type ExpandedChartMarket = "KOREA" | "US" | "UPBIT" | "CRYPTO";

type ExpandedChartState = {
  symbol: string;
  name: string;
  market: ExpandedChartMarket;
  price: number;
  candles: Array<{
    time: number | string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  dataStatus: string;
};

function normalizeExpandedMarket(value: unknown, symbol: string): ExpandedChartMarket {
  const market = String(value || "").toUpperCase();
  if (market === "US") return "US";
  if (market === "UPBIT" || market === "BTC" || market === "CRYPTO") return "UPBIT";
  if (market === "KOREA" || market === "KR" || market === "KOSPI" || market === "KOSDAQ") return "KOREA";
  if (symbol.toUpperCase().startsWith("KRW-")) return "UPBIT";
  if (/^\d{6}$/.test(symbol)) return "KOREA";
  return "US";
}

function MainLayout() {
  const { selectedSymbol, watchlist = [], positions = [] } = useApp() as any;
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState<boolean>(false);
  const [consensusSelectedSymbol, setConsensusSelectedSymbol] = useState<string>("005930");
  const [isMainChartExpanded, setIsMainChartExpanded] = useState(false);
  const [isExpandedChartLoading, setIsExpandedChartLoading] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const expandedChartShellRef = useRef<HTMLDivElement>(null);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartState>({
    symbol: "005930",
    name: "선택 종목",
    market: "KOREA",
    price: 0,
    candles: [],
    dataStatus: "NO_DATA",
  });

  const normalizedSelectedSymbol = useMemo(() => {
    if (typeof selectedSymbol === "string" && selectedSymbol.trim()) return selectedSymbol.trim().toUpperCase();
    if (selectedSymbol && typeof selectedSymbol === "object" && selectedSymbol.symbol) {
      return String(selectedSymbol.symbol).trim().toUpperCase();
    }
    return "005930";
  }, [selectedSymbol]);

  const selectedStockMeta = useMemo(() => {
    const rows = [...(Array.isArray(watchlist) ? watchlist : []), ...(Array.isArray(positions) ? positions : [])];
    const found = rows.find((row: any) => String(row?.symbol || "").trim().toUpperCase() === normalizedSelectedSymbol);
    return {
      symbol: normalizedSelectedSymbol,
      name: found?.name || normalizedSelectedSymbol,
      market: normalizeExpandedMarket(found?.market, normalizedSelectedSymbol),
    };
  }, [normalizedSelectedSymbol, watchlist, positions]);

  useEffect(() => {
    try {
      localStorage.removeItem("AISTOCK_SECURITY_PIN");
      localStorage.removeItem("AISTOCK_SECURITY_PHONE");
      sessionStorage.removeItem("AISTOCK_SESSION_UNLOCKED");
    } catch (e) {
      // ignore
    }

    v11ExecutionEngine.setTradingMode("LIVE", false);

    document.body.style.overflow = "";
    document.body.style.position = "";
    document.documentElement.style.overflow = "";

    const handleOpenConsensus = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) setConsensusSelectedSymbol(customEvent.detail);
      setIsConsensusModalOpen(true);
    };

    window.addEventListener("open-consensus-modal", handleOpenConsensus);
    return () => {
      window.removeEventListener("open-consensus-modal", handleOpenConsensus);
    };
  }, []);

  // The existing technical-chart button now expands the chart INSIDE the main screen.
  // "지표 설정" remains a dropdown only.
  useEffect(() => {
    const handleMainChartIndicatorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;
      const label = (button.textContent || "").replace(/\s+/g, " ").trim();
      if (label.includes("캔들 차트 + 기술적 지표") || label.includes("그래프 지표")) {
        setIsMainChartExpanded(true);
        requestAnimationFrame(() => {
          expandedChartShellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };

    document.addEventListener("click", handleMainChartIndicatorClick);
    return () => document.removeEventListener("click", handleMainChartIndicatorClick);
  }, []);

  useEffect(() => {
    if (!isMainChartExpanded) return;
    const controller = new AbortController();

    const loadExpandedChart = async () => {
      setIsExpandedChartLoading(true);
      try {
        const response = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(selectedStockMeta.symbol)}&timeframe=1m&count=240`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`EXPANDED_CHART_HTTP_${response.status}`);
        const data = await response.json();
        const candles = Array.isArray(data?.candles)
          ? data.candles
              .map((candle: any) => ({
                time: candle.timestamp ?? candle.time,
                open: Number(candle.open),
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
                volume: Number(candle.volume),
              }))
              .filter((candle: any) =>
                candle.time != null &&
                Number.isFinite(candle.open) && candle.open > 0 &&
                Number.isFinite(candle.high) && candle.high > 0 &&
                Number.isFinite(candle.low) && candle.low > 0 &&
                Number.isFinite(candle.close) && candle.close > 0 &&
                Number.isFinite(candle.volume) && candle.volume >= 0,
              )
          : [];
        const latest = candles[candles.length - 1];
        const currentPrice = Number(data?.currentPrice);

        setExpandedChart({
          symbol: String(data?.symbol || selectedStockMeta.symbol),
          name: String(data?.name || selectedStockMeta.name),
          market: normalizeExpandedMarket(data?.market || selectedStockMeta.market, selectedStockMeta.symbol),
          price: Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : latest?.close || 0,
          candles,
          dataStatus: String(data?.dataStatus || (candles.length > 0 ? "REALTIME_VERIFIED" : "NO_DATA")),
        });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setExpandedChart({
            ...selectedStockMeta,
            price: 0,
            candles: [],
            dataStatus: "NO_DATA",
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsExpandedChartLoading(false);
      }
    };

    loadExpandedChart();
    return () => controller.abort();
  }, [isMainChartExpanded, selectedStockMeta]);

  useEffect(() => {
    const onFullscreenChange = () => setIsNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await expandedChartShellRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("[Main Chart] browser fullscreen request failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <MainScreenKoreanText />
      <RealtimeMarketStreamManager />

      <ErrorBoundary>
        <RealtimeHubStatusStrip />
      </ErrorBoundary>

      <ErrorBoundary>
        <ElementaryScanExplanationPanel />
      </ErrorBoundary>

      {isMainChartExpanded && (
        <section className="relative z-20 mx-2 mb-4 mt-2 sm:mx-4 lg:mx-6">
          <div
            ref={expandedChartShellRef}
            className="h-[78vh] min-h-[560px] w-full overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950 shadow-2xl flex flex-col"
          >
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/95 px-3 py-2.5 sm:px-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm sm:text-base text-white">📈 메인 그래프 지표 확대뷰</strong>
                  <span className="rounded-md border border-cyan-700/60 bg-cyan-950/40 px-2 py-0.5 text-xs font-bold text-cyan-300">
                    {expandedChart.symbol}
                  </span>
                  <span className="rounded-md border border-emerald-800/60 bg-emerald-950/50 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    1분봉 · {expandedChart.dataStatus}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                  <MousePointer2 className="h-3 w-3" />
                  휠/두 손가락 확대·축소 · 드래그 이동 · 메인 화면에서 바로 확인
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleNativeFullscreen}
                  className="flex items-center gap-1 rounded-lg border border-cyan-800 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60"
                  title={isNativeFullscreen ? "전체화면 해제" : "브라우저 전체화면"}
                >
                  {isNativeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isNativeFullscreen ? "축소" : "전체화면"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMainChartExpanded(false)}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title="메인 확대 차트 접기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-1.5 sm:p-2">
              {isExpandedChartLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-cyan-300">
                  실시간 차트를 불러오는 중입니다...
                </div>
              ) : expandedChart.candles.length === 0 || expandedChart.price <= 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <strong className="text-white">실시간 차트 데이터가 아직 없습니다.</strong>
                  <span className="text-xs">가짜 그래프는 표시하지 않고 검증된 캔들이 들어오면 메인 확대 차트를 표시합니다.</span>
                </div>
              ) : (
                <ErrorBoundary>
                  <RealTimeTradingViewChart
                    key={`main-expanded-${expandedChart.symbol}`}
                    symbol={expandedChart.symbol}
                    name={expandedChart.name}
                    market={expandedChart.market}
                    initialPrice={expandedChart.price}
                    initialCandles={expandedChart.candles}
                    timeframe="1m"
                    isWhiteTheme={false}
                    className="h-full min-h-0 w-full border-0 shadow-none"
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </section>
      )}

      <ErrorBoundary>
        <MasterAiAutoTradingDashboard
          onOpenConsensusModal={(sym) => {
            setConsensusSelectedSymbol(sym);
            setIsConsensusModalOpen(true);
          }}
        />
      </ErrorBoundary>

      <ToastContainer />

      <ErrorBoundary>
        <MultiModelSecuritiesConsensusModal
          isOpen={isConsensusModalOpen}
          onClose={() => setIsConsensusModalOpen(false)}
          initialSymbol={consensusSelectedSymbol}
          onSelectStockForTerminal={() => {
            setIsConsensusModalOpen(false);
          }}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <PricePulseProvider>
          <MainLayout />
        </PricePulseProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
