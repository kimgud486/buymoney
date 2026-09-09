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
import { SafeAiAutotradeLauncher } from "./components/trading/SafeAiAutotradeLauncher";
import { AiBotCommandCenterUi } from "./components/AiBotCommandCenterUi";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { VerifiedAiOpportunityScanner } from "./components/VerifiedAiOpportunityScanner";
import { VerifiedDecisionDetailPanel } from "./components/VerifiedDecisionDetailPanel";
import { VerifiedPatternStatusPanel } from "./components/VerifiedPatternStatusPanel";
import { VerifiedPatternGuideBridge } from "./components/VerifiedPatternGuideBridge";
import { BuyHoldSystemStatusPanel } from "./components/BuyHoldSystemStatusPanel";
import { evaluateVerifiedSignal, type VerifiedSignalResult } from "./scanner/verifiedSignalEngine";

type VerifiedPatternSelection = {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  detectedPatternCodes: string[];
  patternRegistry?: VerifiedSignalResult["patternRegistry"];
  verified: boolean;
  error?: string;
};

function normalizePatternMarket(raw: unknown): "KOREA" | "US" | "BTC" {
  const value = String(raw || "").toUpperCase();
  if (value === "US") return "US";
  if (value === "BTC" || value === "CRYPTO" || value === "UPBIT") return "BTC";
  return "KOREA";
}

function MainLayout() {
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState<boolean>(false);
  const [consensusSelectedSymbol, setConsensusSelectedSymbol] = useState<string>("005930");
  const [viewMode] = useState<"MASTER_IMAGE_EXACT" | "ADVANCED_CLUSTER">("MASTER_IMAGE_EXACT");
  const [patternSelection, setPatternSelection] = useState<VerifiedPatternSelection | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem("AISTOCK_SECURITY_PIN");
      localStorage.removeItem("AISTOCK_SECURITY_PHONE");
      sessionStorage.removeItem("AISTOCK_SESSION_UNLOCKED");
    } catch (e) {
      // ignore
    }

    document.body.style.overflow = "";
    document.body.style.position = "";
    document.documentElement.style.overflow = "";

    const handleOpenConsensus = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) setConsensusSelectedSymbol(customEvent.detail);
      setIsConsensusModalOpen(true);
    };

    const handleVerifiedCandidateSelected = async (e: Event) => {
      const customEvent = e as CustomEvent<{ symbol?: string }>;
      const symbol = String(customEvent.detail?.symbol || "").trim();
      if (!symbol) return;

      setPatternSelection({
        symbol,
        name: symbol,
        market: "KOREA",
        currentPrice: 0,
        changePct: 0,
        detectedPatternCodes: [],
        verified: false,
      });

      try {
        const response = await fetch(
          `/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=D&count=70`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(`candle endpoint ${response.status}`);

        const payload = await response.json();
        const candles = Array.isArray(payload?.candles) ? payload.candles : [];
        const result = evaluateVerifiedSignal(candles);
        if (!result) throw new Error("verified signal engine returned no result");

        const detectedPatternCodes = Array.from(
          new Set(
            result.patternHits
              .filter((hit) => hit.direction !== "NEUTRAL")
              .map((hit) => String(hit.id)),
          ),
        );

        setPatternSelection({
          symbol,
          name: String(payload?.name || symbol),
          market: normalizePatternMarket(payload?.market),
          currentPrice: Number(payload?.currentPrice || result.metrics?.close || 0),
          changePct: Number(payload?.changePct || 0),
          detectedPatternCodes,
          patternRegistry: result.patternRegistry,
          verified: true,
        });
      } catch (error) {
        console.warn("[PatternGuideBridge] verified pattern lookup failed", error);
        setPatternSelection({
          symbol,
          name: symbol,
          market: "KOREA",
          currentPrice: 0,
          changePct: 0,
          detectedPatternCodes: [],
          verified: false,
          error: "실제 캔들 검증에 실패하여 패턴을 임의 생성하지 않았습니다.",
        });
      }
    };

    window.addEventListener("open-consensus-modal", handleOpenConsensus);
    window.addEventListener("verified-ai-candidate-selected", handleVerifiedCandidateSelected);

    return () => {
      window.removeEventListener("open-consensus-modal", handleOpenConsensus);
      window.removeEventListener("verified-ai-candidate-selected", handleVerifiedCandidateSelected);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans relative">
      <RealtimeMarketStreamManager />

      <ErrorBoundary>
        <BuyHoldSystemStatusPanel />
      </ErrorBoundary>

      <ErrorBoundary>
        <SafeAiAutotradeLauncher />
      </ErrorBoundary>

      <ErrorBoundary>
        <VerifiedAiOpportunityScanner />
      </ErrorBoundary>

      <ErrorBoundary>
        <VerifiedDecisionDetailPanel />
      </ErrorBoundary>

      {/* Transparent registry/evaluation/match counts for the executable pattern engine. */}
      <ErrorBoundary>
        <VerifiedPatternStatusPanel />
      </ErrorBoundary>

      {patternSelection && (
        <ErrorBoundary>
          <VerifiedPatternGuideBridge
            symbol={patternSelection.symbol}
            name={patternSelection.name}
            market={patternSelection.market}
            currentPrice={patternSelection.currentPrice}
            changePct={patternSelection.changePct}
            detectedPatternCodes={patternSelection.detectedPatternCodes}
            patternRegistry={patternSelection.patternRegistry}
            verified={patternSelection.verified}
            error={patternSelection.error}
          />
        </ErrorBoundary>
      )}

      <ErrorBoundary>
        {viewMode === "MASTER_IMAGE_EXACT" ? (
          <MasterAiAutoTradingDashboard
            onOpenConsensusModal={(sym) => {
              setConsensusSelectedSymbol(sym);
              setIsConsensusModalOpen(true);
            }}
          />
        ) : (
          <AiBotCommandCenterUi
            onOpenConsensusModal={(sym) => {
              setConsensusSelectedSymbol(sym);
              setIsConsensusModalOpen(true);
            }}
          />
        )}
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
