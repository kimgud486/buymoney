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
import FeedResiliencePolicyBridge from "./components/trading/FeedResiliencePolicyBridge";
import RealtimeStreamFeedBridge from "./components/trading/RealtimeStreamFeedBridge";
import OperationalTruthMonitorV20 from "./components/trading/OperationalTruthMonitorV20";
import VerifiedTimeframeFetchBridge from "./components/trading/VerifiedTimeframeFetchBridge";
import { ErrorBoundary } from "./components/ErrorBoundary";
import StockGPTShell from "./components/trading/StockGPTShell";
import { v11ExecutionEngine } from "./components/AistockV11ExecutionConsole";

function MainLayout() {
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState<boolean>(false);
  const [consensusSelectedSymbol, setConsensusSelectedSymbol] = useState<string>("005930");

  useEffect(() => {
    try {
      localStorage.removeItem("AISTOCK_SECURITY_PIN");
      localStorage.removeItem("AISTOCK_SECURITY_PHONE");
      sessionStorage.removeItem("AISTOCK_SESSION_UNLOCKED");
    } catch {
      // Browser storage can be unavailable in restricted environments.
    }

    // Preserve the existing execution engine state, but do not auto-approve orders.
    v11ExecutionEngine.setTradingMode("LIVE", false);

    document.body.style.overflow = "";
    document.body.style.position = "";
    document.documentElement.style.overflow = "";

    const handleOpenConsensus = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) setConsensusSelectedSymbol(customEvent.detail);
      setIsConsensusModalOpen(true);
    };

    window.addEventListener("open-consensus-modal", handleOpenConsensus);
    return () => {
      window.removeEventListener("open-consensus-modal", handleOpenConsensus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      {/* Existing live-data bridges stay mounted behind the redesigned UI. */}
      <VerifiedTimeframeFetchBridge />
      <RealtimeMarketStreamManager />
      <RealtimeStreamFeedBridge />
      <FeedResiliencePolicyBridge />

      {/* Keep operational truth checks alive without exposing the legacy dashboard chrome. */}
      <div className="hidden" aria-hidden="true">
        <ErrorBoundary>
          <OperationalTruthMonitorV20 />
        </ErrorBoundary>
      </div>

      <ErrorBoundary>
        <StockGPTShell />
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
