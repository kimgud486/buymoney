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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainScreenKoreanText } from "./components/MainScreenKoreanText";
import { ProductionTruthMonitor } from "./components/ProductionTruthMonitor";
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

    // Production-only UI policy: refresh/re-entry always returns the execution
    // console to LIVE mode. This selects LIVE but intentionally keeps the
    // independent dual-lock closed, so a page refresh never authorizes an order.
    v11ExecutionEngine.setTradingMode("LIVE", false);

    // Remove legacy DRY_RUN/test-mode controls from the rendered production UI.
    // The observer also covers dashboard sections that mount after App.
    const removeLegacyTestModeControls = () => {
      document.querySelectorAll("button").forEach((button) => {
        const label = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (label.includes("시세+테스트") || label.includes("시세 + 테스트")) {
          button.remove();
        }
      });
    };
    removeLegacyTestModeControls();
    const modeControlObserver = new MutationObserver(removeLegacyTestModeControls);
    modeControlObserver.observe(document.body, { childList: true, subtree: true });

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
      modeControlObserver.disconnect();
      window.removeEventListener("open-consensus-modal", handleOpenConsensus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <MainScreenKoreanText />
      <RealtimeMarketStreamManager />
      <ProductionTruthMonitor />

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
