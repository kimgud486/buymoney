/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import { PricePulseProvider } from "./context/PricePulseContext";
import { ToastContainer } from "./components/ToastContainer";
import { RealtimeMarketStreamManager } from "./components/RealtimeMarketStreamManager";
import { MultiModelSecuritiesConsensusModal } from "./components/MultiModelSecuritiesConsensusModal";
import { MasterAiAutoTradingDashboard } from "./components/trading/MasterAiAutoTradingDashboard";
import RealtimeHubStatusStrip from "./components/trading/RealtimeHubStatusStrip";
import FeedResiliencePolicyBridge from "./components/trading/FeedResiliencePolicyBridge";
import RealtimeStreamFeedBridge from "./components/trading/RealtimeStreamFeedBridge";
import OperationalTruthMonitorV20 from "./components/trading/OperationalTruthMonitorV20";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainScreenKoreanText } from "./components/MainScreenKoreanText";
import ElementaryScanExplanationPanel from "./components/ElementaryScanExplanationPanel";
import { v11ExecutionEngine } from "./components/AistockV11ExecutionConsole";

function MainLayout() {
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState<boolean>(false);
  const [consensusSelectedSymbol, setConsensusSelectedSymbol] = useState<string>("005930");

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

  useEffect(() => {
    const handleChartExpandClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button) return;

      const label = (button.textContent || "").replace(/\s+/g, " ").trim();
      const isTechnicalChartButton =
        label.includes("캔들 차트 + 기술적 지표") ||
        label.includes("그래프 지표");
      if (!isTechnicalChartButton) return;

      const centerColumn = button.closest('[class*="lg:col-span-6"]') as HTMLElement | null;
      if (!centerColumn) return;

      const expanded = centerColumn.dataset.mainChartExpanded === "true";
      const nextExpanded = !expanded;
      centerColumn.dataset.mainChartExpanded = nextExpanded ? "true" : "false";

      if (nextExpanded) {
        centerColumn.dataset.prevGridColumn = centerColumn.style.gridColumn || "";
        centerColumn.dataset.prevZIndex = centerColumn.style.zIndex || "";
        centerColumn.style.gridColumn = "1 / -1";
        centerColumn.style.zIndex = "25";
        centerColumn.style.position = "relative";

        const fixedSvgCanvas = centerColumn.querySelector('[class*="h-[470px]"]') as HTMLElement | null;
        if (fixedSvgCanvas) {
          fixedSvgCanvas.dataset.prevHeight = fixedSvgCanvas.style.height || "";
          fixedSvgCanvas.style.height = "72vh";
          fixedSvgCanvas.style.minHeight = "620px";
        }

        const modeSwitcher = button.parentElement?.parentElement as HTMLElement | null;
        const activeChartRoot = modeSwitcher?.nextElementSibling as HTMLElement | null;
        if (activeChartRoot) {
          activeChartRoot.dataset.prevMinHeight = activeChartRoot.style.minHeight || "";
          activeChartRoot.style.minHeight = "68vh";
        }

        button.setAttribute("aria-pressed", "true");
        button.title = "다시 누르면 메인 차트가 원래 크기로 줄어듭니다";
        requestAnimationFrame(() => {
          centerColumn.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        centerColumn.style.gridColumn = centerColumn.dataset.prevGridColumn || "";
        centerColumn.style.zIndex = centerColumn.dataset.prevZIndex || "";
        centerColumn.style.position = "";

        const fixedSvgCanvas = centerColumn.querySelector('[class*="h-[470px]"]') as HTMLElement | null;
        if (fixedSvgCanvas) {
          fixedSvgCanvas.style.height = fixedSvgCanvas.dataset.prevHeight || "";
          fixedSvgCanvas.style.minHeight = "";
        }

        const modeSwitcher = button.parentElement?.parentElement as HTMLElement | null;
        const activeChartRoot = modeSwitcher?.nextElementSibling as HTMLElement | null;
        if (activeChartRoot) {
          activeChartRoot.style.minHeight = activeChartRoot.dataset.prevMinHeight || "";
        }

        button.setAttribute("aria-pressed", "false");
        button.title = "누르면 메인 차트가 크게 확대됩니다";
      }
    };

    document.addEventListener("click", handleChartExpandClick);
    return () => document.removeEventListener("click", handleChartExpandClick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <MainScreenKoreanText />
      <RealtimeMarketStreamManager />
      <RealtimeStreamFeedBridge />
      <FeedResiliencePolicyBridge />

      <ErrorBoundary>
        <RealtimeHubStatusStrip />
      </ErrorBoundary>

      <ErrorBoundary>
        <OperationalTruthMonitorV20 />
      </ErrorBoundary>

      <ErrorBoundary>
        <ElementaryScanExplanationPanel />
      </ErrorBoundary>

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
