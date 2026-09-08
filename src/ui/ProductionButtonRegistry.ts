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
