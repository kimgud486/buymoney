export interface ProductionButtonContract {
  id: string;
  category:
    | "NAVIGATION"
    | "MARKET_DATA"
    | "TRADING"
    | "BROKER"
    | "SETTINGS"
    | "CHART"
    | "RISK";
  description: string;
  requiresHandler: boolean;
  requiresApi: boolean;
  requiresE2E: boolean;
  destructive?: boolean;
}

export const PRODUCTION_BUTTONS: ProductionButtonContract[] = [
  // Navigation & Modals
  {
    id: "open-stock-search",
    category: "NAVIGATION",
    description: "Opens stock search and add modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-broker-api",
    category: "BROKER",
    description: "Opens broker API credentials modal",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true
  },
  {
    id: "open-holdings",
    category: "NAVIGATION",
    description: "Opens portfolio holdings modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-consensus-modal",
    category: "NAVIGATION",
    description: "Opens multi-model AI consensus modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-manual-entry",
    category: "TRADING",
    description: "Opens manual order entry gate modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-fractional-order",
    category: "TRADING",
    description: "Opens fractional stock order modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-strategy-reader",
    category: "SETTINGS",
    description: "Opens uploaded strategy file reader modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-us-brain",
    category: "TRADING",
    description: "Opens US Scalper Super Brain modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-bot-fleet",
    category: "NAVIGATION",
    description: "Opens 30 AI bots fleet status dashboard",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-history",
    category: "NAVIGATION",
    description: "Opens trade transaction history and alerts modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-smc",
    category: "NAVIGATION",
    description: "Opens SMC market structure orderblock visualizer modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "theme-toggle",
    category: "SETTINGS",
    description: "Toggles UI light/dark theme",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-filter-settings",
    category: "SETTINGS",
    description: "Opens auto-trading stock selection filter modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-performance-report",
    category: "NAVIGATION",
    description: "Opens AI performance report modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "open-loss-analysis",
    category: "NAVIGATION",
    description: "Opens loss cause analysis modal",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "modal-close-button",
    category: "NAVIGATION",
    description: "Closes open modal dialog",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },

  // Safe AI Scan-to-Review
  {
    id: "safe-ai-autotrade-launcher",
    category: "TRADING",
    description: "Runs verified explainable scanner and opens human-review candidates without broker auto-order",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true
  },

  // Auto-Trading Switches
  {
    id: "auto-trading-start",
    category: "TRADING",
    description: "Resumes master AI auto-trading across all bots",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true,
    destructive: true
  },
  {
    id: "auto-trading-pause",
    category: "TRADING",
    description: "Pauses master AI auto-trading across all bots",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true
  },

  // Trade Execution
  {
    id: "manual-buy",
    category: "TRADING",
    description: "Executes manual buy order through execution gate",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true,
    destructive: true
  },
  {
    id: "manual-sell",
    category: "TRADING",
    description: "Executes manual 100% position exit through execution gate",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true,
    destructive: true
  },
  {
    id: "partial-sell",
    category: "TRADING",
    description: "Executes 50% partial position exit through execution gate",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true,
    destructive: true
  },

  // Modal Actions
  {
    id: "broker-api-save",
    category: "BROKER",
    description: "Saves updated broker API keys",
    requiresHandler: true,
    requiresApi: true,
    requiresE2E: true
  },
  {
    id: "stock-search-select",
    category: "MARKET_DATA",
    description: "Selects searched stock symbol",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },

  // Chart Controls
  {
    id: "chart-timeframe-1m",
    category: "CHART",
    description: "Switches chart timeframe to 1-minute",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "chart-timeframe-5m",
    category: "CHART",
    description: "Switches chart timeframe to 5-minute",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "chart-indicator-vwap",
    category: "CHART",
    description: "Toggles VWAP indicator overlay on chart",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  },
  {
    id: "chart-indicator-ema",
    category: "CHART",
    description: "Toggles EMA lines overlay on chart",
    requiresHandler: true,
    requiresApi: false,
    requiresE2E: true
  }
];
