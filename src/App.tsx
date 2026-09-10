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

    // Production-only policy: refresh/re-entry always returns the execution
    // console to LIVE mode. This selects LIVE but intentionally keeps the
    // independent dual-lock closed, so a page refresh never authorizes an order.
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <MainScreenKoreanText />
      <RealtimeMarketStreamManager />

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
