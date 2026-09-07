// ----------------------------------------------------------------------
// DEMO & PAPER TRADING MODULE ISOLATION GUARD
// ----------------------------------------------------------------------

if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_DEMO === "true") {
  throw new Error("DEMO_MODULE_FORBIDDEN_IN_PRODUCTION");
}

export * from "./EditMockBalanceModal";
export * from "./MockInvestmentDashboard";
export * from "./MockPortfolioDetailModal";
export * from "./MockTradingInfoModal";
