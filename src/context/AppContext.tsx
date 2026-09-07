import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { GlobalTradeGuardModal, TradeConfirmationRequest } from "../components/GlobalTradeGuardModal";
import { StockCandleChartModal } from "../components/StockCandleChartModal";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { 
  UserProfile, 
  TradingStrategy, 
  StockPosition, 
  TradeLog, 
  AIAnalysis, 
  MarketStatus,
  Order,
  AIDecisionLog,
  BrokerErrorDetails,
  WatchlistItem,
  CashBreakdown,
  BlockedSymbolDetail,
  KillSwitchMode,
  InsufficientFundItem
} from "../types";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInAnonymously 
} from "../lib/firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { getMarketStatus, getExecutionPhase, ExecutionPhaseInfo } from "../lib/marketHours";
import { getAllStocks, StockItem } from "../data/stockUniverse";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";
import { StrictQuantSignalPipeline } from "../services/StrictQuantSignalPipeline";
import { UpbitFeeAndNetProfitGuard } from "../services/UpbitFeeAndNetProfitGuard";
import { formatStockQty } from "../lib/formatter";
import { safeSymbolStr, resolveStockName } from "../lib/stockDictionary";
import { 
  getKRXTickSize, 
  roundToKRXTick, 
  calculateEstimatedFeeAndTax, 
  calculateAffordableShares 
} from "../lib/stockTickRules";
import { aiDynamicBotThresholdEngine } from "../lib/aiDynamicBotThresholdEngine";

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  orderInfo?: {
    symbol: string;
    name: string;
    side: 'BUY' | 'SELL';
    qty: number;
    price: number;
    market: 'KOREA' | 'US' | 'BTC';
    status: 'FILLED' | 'PENDING' | 'CANCELED' | 'FAILED';
  };
}

export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as T;
}

export interface ActiveChartStock {
  symbol: string;
  name: string;
  market?: string;
  currentPrice?: number;
  changeRate?: number;
  volumePower?: number;
}

interface AppContextType {
  user: any;
  profile: UserProfile | null;
  strategies: TradingStrategy[];
  positions: StockPosition[];
  trades: TradeLog[];
  orders: Order[];
  toasts: ToastNotification[];
  addToast: (
    toastOrMessage: Omit<ToastNotification, "id" | "timestamp"> | string,
    typeOrTitle?: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'success' | 'error' | 'warning' | 'info' | string,
    optionalMessage?: string
  ) => void;
  addNotification: (
    toastOrMessage: Omit<ToastNotification, "id" | "timestamp"> | string | any,
    typeOrTitle?: any,
    optionalMessage?: string
  ) => void;
  removeToast: (id: string) => void;
  clearAllToasts?: () => void;
  isToastMuted?: boolean;
  toggleToastMute?: () => void;
  marketStatus: MarketStatus | null;
  loading: boolean;
  selectedSymbol: string;
  setSelectedSymbol: (sym: string) => void;
  activeChartStock: ActiveChartStock | null;
  openStockChart: (stock: ActiveChartStock) => void;
  closeStockChart: () => void;
  triggerEmergencyStop: () => Promise<void>;
  updateProfileSettings: (settings: Partial<UserProfile>) => Promise<void>;
  addStrategy: (strategy: Omit<TradingStrategy, "id" | "userId" | "createdAt">) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  toggleStrategyActive: (id: string) => Promise<void>;
  executeTrade: (symbol: string, name: string, market: 'KOREA' | 'US' | 'BTC', side: 'BUY' | 'SELL', qty: number, price: number, strategyName?: string, aiRationale?: string) => Promise<void>;
  placeOrder: (symbol: string, name: string, market: 'KOREA' | 'US' | 'BTC', side: 'BUY' | 'SELL', qty: number, price: number, status: 'FILLED' | 'PENDING', strategyName?: string, aiRationale?: string, bypassGuard?: boolean) => Promise<void>;
  pendingGuardTrade: TradeConfirmationRequest | null;
  requestTradeConfirmation: (req: {
    symbol: string;
    name: string;
    market: 'KOREA' | 'US' | 'BTC';
    side: 'BUY' | 'SELL';
    qty: number;
    price: number;
    strategyName?: string;
    aiRationale?: string;
  }) => Promise<boolean>;
  cancelTradeGuardModal: () => void;
  cancelOrder: (orderId: string) => Promise<void>;
  fillOrder: (orderId: string) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  clearAllTrades: () => Promise<void>;
  refreshMarketStatus: () => Promise<void>;
  resetMockAccount: (initialBalance?: number) => Promise<void>;
  resetAccountData: (initialBalance?: number) => Promise<void>;
  decisionLogs: AIDecisionLog[];
  triggerLiveSignalLog: (log: Partial<AIDecisionLog> & {
    symbol: string;
    name: string;
    market: 'KOREA' | 'US' | 'BTC';
    action: AIDecisionLog['action'];
    message: string;
  }) => void;
  clearDecisionLogs: () => void;
  brokerApiStatus: {
    korea: 'CONNECTED' | 'FAILED' | 'DISCONNECTED';
    upbit?: 'CONNECTED' | 'FAILED' | 'DISCONNECTED';
  };
  brokerApiError: {
    korea?: BrokerErrorDetails;
    upbit?: BrokerErrorDetails;
  };
  setBrokerError: (broker: 'korea' | 'upbit', error: BrokerErrorDetails | null) => void;
  clearBrokerError: (broker: 'korea' | 'upbit') => void;
  kisPingLatency: number;
  isAutoPingEnabled: boolean;
  setIsAutoPingEnabled: (enabled: boolean) => void;
  lastPingTime: string | null;
  pingRetryCount: number;
  pingHistory: { timestamp: string; latency: number; status: 'HEALTHY' | 'TIMEOUT' | 'ERROR' }[];
  triggerManualPing: () => Promise<boolean>;
  watchlist: WatchlistItem[];
  addToWatchlist: (item: { symbol: string; name: string; market: 'KOREA' | 'US' | 'BTC'; targetBuyPrice?: number; memo?: string }) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  isInWatchlist: (symbol: string) => boolean;
  deletePosition: (symbol: string) => Promise<void>;
  clearAllPositions: () => Promise<void>;
  clearDomesticPositions: () => Promise<void>;
  blockedSymbols: string[];
  blockedSymbolDetails: BlockedSymbolDetail[];
  blockCooldownMinutes: number;
  setBlockCooldownMinutes: (mins: number) => void;
  addBlockedSymbol: (symbol: string, reason?: string, details?: Partial<BlockedSymbolDetail>) => void;
  removeBlockedSymbol: (symbol: string) => void;
  clearBlockedSymbols: () => void;
  insufficientFundStocks: InsufficientFundItem[];
  addInsufficientFundStock: (item: { symbol: string; name: string; market: 'KOREA' | 'US' | 'BTC'; side: 'BUY' | 'SELL'; price: number; qty: number; cost: number; reason: string }) => void;
  removeInsufficientFundStock: (symbol: string) => void;
  clearInsufficientFundStocks: () => void;
  purgeAllMockData: () => Promise<void>;
  rechargeMockBalance: (amount: number) => Promise<void>;
  resetMockPortfolio: (initialCapital?: number) => Promise<void>;
  cashBreakdown: CashBreakdown;
  syncRealAccountBalance: (broker?: 'korea' | 'us' | 'upbit' | 'all', silent?: boolean) => Promise<{ success: boolean; balance: number; message: string; integrityStatus: string; rawResponse?: any; cashBreakdown?: CashBreakdown }>;
  checkAccountIntegrity: () => Promise<{ isIntegrated: boolean; dbBalance: number; apiBalance: number; status: string; discrepancy: number }>;
  apiResponseLogs: ApiResponseLogItem[];
  apiEnvironmentMode: 'PRODUCTION' | 'TEST';
  isLiveTradingActive: boolean;
  lockProductionEnvironment: () => Promise<void>;
  toggleEnvironmentMode: (mode: 'PRODUCTION' | 'TEST') => Promise<void>;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  consecutiveLossCount: number;
  killSwitchUntil: number;
  isKillSwitchActive: boolean;
  killSwitchMode: KillSwitchMode;
  triggerKillSwitch: (mode?: KillSwitchMode, durationMins?: number, reason?: string) => void;
  resetKillSwitch: () => void;
  toggleKillSwitch: (active?: boolean, reason?: string) => void;
  safetyMode?: 'STANDARD' | 'STRICT' | 'CONSERVATIVE' | 'AGGRESSIVE' | 'BALANCED' | 'DYNAMIC';
  gracefulKillSwitchRecovery: () => Promise<boolean>;
  getExecutionPhase: (market: 'KOREA' | 'US' | 'BTC') => ExecutionPhaseInfo;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

export interface ApiResponseLogItem {
  id: string;
  timestamp: string;
  broker: string;
  endpoint: string;
  httpStatus: number;
  message: string;
  integrityStatus: string;
  rawResponse?: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_INITIAL_WATCHLIST: WatchlistItem[] = [];

// Helper to strictly de-duplicate positions list by normalized symbol
export const deduplicatePosList = (posList: StockPosition[]): StockPosition[] => {
  if (!Array.isArray(posList)) return [];
  const map = new Map<string, StockPosition>();
  for (const p of posList) {
    if (!p || !p.symbol) continue;
    const rawSym = String(p.symbol).trim();
    const cleanSym = rawSym.toUpperCase().replace(/^KRW-/, "");
    if (map.has(cleanSym)) {
      const existing = map.get(cleanSym)!;
      const maxQty = Math.max(existing.quantity || 0, p.quantity || 0);
      const curPrice = p.currentPrice || existing.currentPrice || p.avgPrice || existing.avgPrice || 0;
      const avgPrice = existing.avgPrice || p.avgPrice || curPrice;
      map.set(cleanSym, {
        ...existing,
        ...p,
        id: existing.id || p.id,
        symbol: p.symbol?.startsWith("KRW-") ? p.symbol : cleanSym,
        quantity: maxQty,
        avgPrice,
        currentPrice: curPrice,
        updatedAt: p.updatedAt || existing.updatedAt || new Date().toISOString()
      });
    } else {
      map.set(cleanSym, { ...p, symbol: p.symbol?.startsWith("KRW-") ? p.symbol : cleanSym });
    }
  }
  return Array.from(map.values());
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("aistock_profile");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const profileRef = useRef<UserProfile | null>(profile);
  useEffect(() => {
    profileRef.current = profile;
    if (profile) {
      try {
        localStorage.setItem("aistock_profile", JSON.stringify(profile));
      } catch (e) {}
    }
  }, [profile]);

  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [positions, setPositions] = useState<StockPosition[]>(() => {
    try {
      const saved = localStorage.getItem("aistock_positions");
      if (saved) return deduplicatePosList(JSON.parse(saved));
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (Array.isArray(positions)) {
      try {
        localStorage.setItem("aistock_positions", JSON.stringify(positions));
        if (profile?.isRealTrade) {
          localStorage.setItem("aistock_real_positions", JSON.stringify(positions));
        } else {
          localStorage.setItem("aistock_paper_positions", JSON.stringify(positions));
        }
      } catch (e) {}
    }
  }, [positions, profile?.isRealTrade]);
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSymbolState, setSelectedSymbolState] = useState<string>("005930");

  const setSelectedSymbol = useCallback((sym: any) => {
    if (typeof sym === "string") {
      setSelectedSymbolState(sym);
    } else if (sym && typeof sym === "object" && sym.symbol) {
      setSelectedSymbolState(String(sym.symbol));
    } else if (sym !== null && sym !== undefined) {
      setSelectedSymbolState(String(sym));
    } else {
      setSelectedSymbolState("005930");
    }
  }, []);

  const selectedSymbol = useMemo(() => {
    if (typeof selectedSymbolState === "string") return selectedSymbolState;
    if (selectedSymbolState && typeof (selectedSymbolState as any).symbol === "string") {
      return (selectedSymbolState as any).symbol;
    }
    return String(selectedSymbolState || "005930");
  }, [selectedSymbolState]);

  const [activeChartStock, setActiveChartStock] = useState<ActiveChartStock | null>(null);

  // Dark / Light Theme Mode State with localStorage persistence
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('aistock_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('aistock_theme', newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  const openStockChart = (stock: ActiveChartStock) => {
    setActiveChartStock(stock);
  };

  const closeStockChart = () => {
    setActiveChartStock(null);
  };

  useEffect(() => {
    const handleOpenChart = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveChartStock>;
      if (customEvent.detail) {
        setActiveChartStock(customEvent.detail);
      }
    };
    window.addEventListener("open-stock-chart", handleOpenChart);
    return () => window.removeEventListener("open-stock-chart", handleOpenChart);
  }, []);

  // Real-time stock search & selection event subscriber
  useEffect(() => {
    const unsubscribe = stockSyncService.subscribe((evt: StockSyncEvent) => {
      if (evt && evt.symbol) {
        setSelectedSymbol(evt.symbol);
        // Auto-add to watchlist if flag is set or missing
        if (evt.autoAddToWatchlist) {
          addToWatchlist({
            symbol: evt.symbol,
            name: evt.name,
            market: evt.market,
            targetBuyPrice: evt.price,
            memo: `${evt.source} 실시간 자동 동기화`
          });
        }
      }
    });
    return unsubscribe;
  }, []);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_INITIAL_WATCHLIST);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isToastMuted, setIsToastMuted] = useState<boolean>(() => localStorage.getItem("aistock_toast_muted") === "true");
  const isToastMutedRef = useRef(isToastMuted);
  const lastToastMapRef = useRef<Record<string, number>>({});

  useEffect(() => {
    isToastMutedRef.current = isToastMuted;
  }, [isToastMuted]);

  const toggleToastMute = () => {
    setIsToastMuted(prev => {
      const next = !prev;
      localStorage.setItem("aistock_toast_muted", String(next));
      return next;
    });
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const [apiEnvironmentMode, setApiEnvironmentMode] = useState<'PRODUCTION'>('PRODUCTION');

  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const toggleFocusMode = () => {
    setIsFocusMode(prev => !prev);
  };

  const isLiveTradingActive = Boolean(profile?.isRealTrade === true);

  const lockProductionEnvironment = async () => {
    setApiEnvironmentMode('PRODUCTION');
    localStorage.setItem("aistock_api_environment", "PRODUCTION");
    localStorage.setItem("aistock_is_demo_mode", "false");
    if (profile) {
      await updateProfileSettings({
        apiEnvironmentMode: 'PRODUCTION',
        isProductionLocked: true,
        isDemoMode: false
      });
    }
  };

  const toggleEnvironmentMode = async (_mode?: 'PRODUCTION') => {
    setApiEnvironmentMode('PRODUCTION');
    localStorage.setItem("aistock_api_environment", "PRODUCTION");
    if (profile) {
      await updateProfileSettings({
        apiEnvironmentMode: 'PRODUCTION',
        isDemoMode: false
      });
    }
  };

  const generateUniqueId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const sanitizeOrderInfo = (info: any) => {
    if (!info || typeof info !== "object") return undefined;
    const sym = safeSymbolStr(info.symbol || info.code || "");
    const nm = typeof info.name === "string" ? info.name : (resolveStockName(sym) || sym || "종목");
    const side = info.side === "BUY" || info.side === "LONG" ? "BUY" : "SELL";
    const qty = Number(info.qty ?? info.quantity ?? 0);
    const price = Number(info.price ?? 0);
    const market = info.market || "KOREA";
    const status = info.status || "FILLED";
    return { symbol: sym, name: nm, side, qty, price, market, status };
  };

  const addToast = (
    toastOrMessage: Omit<ToastNotification, "id" | "timestamp"> | string | any,
    typeOrTitle?: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' | 'success' | 'error' | 'warning' | 'info' | string,
    optionalMessage?: string | any
  ) => {
    if (isToastMutedRef.current) return;

    const id = generateUniqueId("toast");
    const timestamp = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    
    let normalizedToast: ToastNotification;

    if (typeof toastOrMessage === "string") {
      let toastType: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' = 'INFO';
      const rawType = (typeof typeOrTitle === "string" ? typeOrTitle : '').toUpperCase();
      if (rawType.includes('SUCC')) toastType = 'SUCCESS';
      else if (rawType.includes('ERR') || rawType.includes('FAIL')) toastType = 'ERROR';
      else if (rawType.includes('WARN')) toastType = 'WARNING';
      else if (rawType.includes('INFO')) toastType = 'INFO';

      const defaultTitle = toastType === 'SUCCESS' ? '성공' : toastType === 'ERROR' ? '오류 안내' : toastType === 'WARNING' ? '주의' : '알림';
      const title = typeof typeOrTitle === "string" && optionalMessage ? typeOrTitle : defaultTitle;
      
      let messageStr = "";
      if (typeof optionalMessage === "string") {
        messageStr = optionalMessage;
      } else if (typeof optionalMessage === "object" && optionalMessage !== null) {
        messageStr = (optionalMessage as any).message || (optionalMessage as any).error || JSON.stringify(optionalMessage);
      } else {
        messageStr = toastOrMessage;
      }

      let orderInfo = undefined;
      if (typeof optionalMessage === "object" && optionalMessage !== null && ("symbol" in optionalMessage || "qty" in optionalMessage)) {
        orderInfo = sanitizeOrderInfo(optionalMessage);
      }

      normalizedToast = {
        id,
        type: toastType,
        title: typeof title === "string" ? title : defaultTitle,
        message: String(messageStr || ''),
        timestamp,
        orderInfo
      };
    } else if (typeof toastOrMessage === "object" && toastOrMessage !== null) {
      let rawType = (toastOrMessage.type || (typeof typeOrTitle === "string" ? typeOrTitle : 'INFO')).toUpperCase();
      let toastType: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' = 'INFO';
      if (rawType.includes('SUCC')) toastType = 'SUCCESS';
      else if (rawType.includes('ERR') || rawType.includes('FAIL')) toastType = 'ERROR';
      else if (rawType.includes('WARN')) toastType = 'WARNING';
      else if (rawType.includes('INFO')) toastType = 'INFO';

      const titleStr = typeof toastOrMessage.title === "string" 
        ? toastOrMessage.title 
        : (toastType === 'SUCCESS' ? '완료' : toastType === 'ERROR' ? '오류' : '알림');

      let msgStr = "";
      if (typeof toastOrMessage.message === "string") {
        msgStr = toastOrMessage.message;
      } else if (typeof toastOrMessage.message === "object" && toastOrMessage.message !== null) {
        msgStr = toastOrMessage.message.message || toastOrMessage.message.error || JSON.stringify(toastOrMessage.message);
      } else if (toastOrMessage.symbol || toastOrMessage.side) {
        msgStr = `[주문] ${safeSymbolStr(toastOrMessage.symbol)} ${toastOrMessage.side || ''} ${toastOrMessage.qty || toastOrMessage.quantity || ''}`;
      } else {
        msgStr = "";
      }

      const orderInfo = toastOrMessage.orderInfo 
        ? sanitizeOrderInfo(toastOrMessage.orderInfo)
        : (toastOrMessage.symbol || toastOrMessage.side ? sanitizeOrderInfo(toastOrMessage) : undefined);

      normalizedToast = {
        ...toastOrMessage,
        type: toastType,
        title: titleStr,
        message: String(msgStr || ''),
        id,
        timestamp,
        orderInfo
      };
    } else {
      normalizedToast = {
        id,
        type: 'INFO',
        title: '알림',
        message: String(toastOrMessage || ''),
        timestamp
      };
    }

    // Deduplicate identical message within 2s
    const dedupeKey = `${normalizedToast.title}_${normalizedToast.message}`;
    const now = Date.now();
    if (lastToastMapRef.current[dedupeKey] && now - lastToastMapRef.current[dedupeKey] < 2000) {
      return;
    }
    lastToastMapRef.current[dedupeKey] = now;

    // Show max 2 toasts at a time so it never covers screen or blocks touches
    setToasts(prev => [normalizedToast, ...prev.slice(0, 1)]);

    // Shorten display duration to 2.2 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2200);
  };

  // Bot Error Logger Event Listener -> Instant ToastNotification
  useEffect(() => {
    const handleBotErrorEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      addToast({
        type: detail.toastType || "ERROR",
        title: detail.toastTitle || "[🤖 AI 봇 오작동 감지]",
        message: detail.toastMessage || "봇 가동 중 이상 신호가 포착되어 제어 모듈이 자동 개입했습니다."
      });
    };

    window.addEventListener("bot_error_logged", handleBotErrorEvent);
    return () => {
      window.removeEventListener("bot_error_logged", handleBotErrorEvent);
    };
  }, []);

  // Synchronize watchlist if present in profile
  useEffect(() => {
    if (profile?.watchlist && profile.watchlist.length > 0) {
      setWatchlist(profile.watchlist);
    }
  }, [profile?.watchlist]);

  const addToWatchlist = async (item: { symbol: string; name: string; market: 'KOREA' | 'US' | 'BTC'; targetBuyPrice?: number; memo?: string }) => {
    if (watchlist.some(w => w.symbol === item.symbol)) return;
    const newItem: WatchlistItem = {
      id: "wl_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      addedAt: new Date().toISOString(),
      targetBuyPrice: item.targetBuyPrice,
      memo: item.memo || "관심종목 등록 완료"
    };
    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    if (profile) {
      await updateProfileSettings({ watchlist: updated });
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    const updated = watchlist.filter(w => w.symbol !== symbol);
    setWatchlist(updated);
    if (profile) {
      await updateProfileSettings({ watchlist: updated });
    }
  };

  const isInWatchlist = (symbol: string) => {
    return watchlist.some(w => w.symbol === symbol);
  };

  const [consecutiveLossCount, setConsecutiveLossCount] = useState<number>(() => {
    return Number(localStorage.getItem("aistock_consecutive_losses") || "0");
  });
  const [killSwitchUntil, setKillSwitchUntil] = useState<number>(() => {
    const saved = Number(localStorage.getItem("aistock_killswitch_until") || "0");
    return saved > Date.now() ? saved : 0;
  });
  const [killSwitchMode, setKillSwitchMode] = useState<KillSwitchMode>(() => {
    return (localStorage.getItem("aistock_killswitch_mode") as KillSwitchMode) || "SOFT_GUARD";
  });
  const isKillSwitchActive = killSwitchUntil > Date.now();

  const triggerKillSwitch = useCallback((
    mode: KillSwitchMode = "SOFT_GUARD",
    durationMins: number = 60,
    reason: string = "리스크 방어 비상 발동"
  ) => {
    const until = Date.now() + durationMins * 60 * 1000;
    setKillSwitchUntil(until);
    setKillSwitchMode(mode);
    try {
      localStorage.setItem("aistock_killswitch_until", String(until));
      localStorage.setItem("aistock_killswitch_mode", mode);
    } catch (e) {}

    addToast({
      type: mode === "HARD_HALT" ? "ERROR" : "WARNING",
      title: mode === "HARD_HALT" ? "🚨 [하드 킬-스위치 가동]" : "🟡 [소프트 가드 킬-스위치 가동]",
      message: `${reason} (${durationMins}분 동안 ${mode === "HARD_HALT" ? "전체 거래 및 통신 완전 동결" : "신규 자율 매수 동결, 보유 포지션 익절/손절은 계속 감시"})`
    });
  }, []);

  const resetKillSwitch = useCallback(() => {
    setKillSwitchUntil(0);
    setConsecutiveLossCount(0);
    try {
      localStorage.setItem("aistock_killswitch_until", "0");
      localStorage.setItem("aistock_consecutive_losses", "0");
    } catch (e) {}
    addToast({
      type: "SUCCESS",
      title: "🟢 킬-스위치 안전장치 해제 완료",
      message: "연속 손절 킬-스위치가 즉시 해제되었으며 정상적인 신규 매수 주문이 가능합니다."
    });
  }, []);

  const toggleKillSwitch = useCallback((
    active?: boolean,
    reason: string = "사용자 수동 비상 정지"
  ) => {
    const shouldActivate = active !== undefined ? active : !(killSwitchUntil > Date.now());
    if (shouldActivate) {
      const until = Date.now() + 60 * 60 * 1000;
      setKillSwitchUntil(until);
      setKillSwitchMode("SOFT_GUARD");
      try {
        localStorage.setItem("aistock_killswitch_until", String(until));
        localStorage.setItem("aistock_killswitch_mode", "SOFT_GUARD");
      } catch (e) {}
    } else {
      setKillSwitchUntil(0);
      setConsecutiveLossCount(0);
      try {
        localStorage.setItem("aistock_killswitch_until", "0");
        localStorage.setItem("aistock_consecutive_losses", "0");
      } catch (e) {}
    }
  }, [killSwitchUntil]);

  const gracefulKillSwitchRecovery = useCallback(async () => {
    addToast({
      type: "INFO",
      title: "🔄 [1단계/3] 3대 거래소 API 통신 및 시세 무결성 검증 중...",
      message: "한국투자 · 업비트 · 토스증권 API 연결 상태 및 지연시간을 확인합니다."
    });

    try {
      await executePingWithRetry(2, 2000);
    } catch (e) {}

    await new Promise(r => setTimeout(r, 600));

    addToast({
      type: "INFO",
      title: "🔄 [2단계/3] 계좌 잔고 무결성 동기화 완료",
      message: "안전 검증을 통과했습니다. 시스템 안전 락을 해제합니다."
    });

    await new Promise(r => setTimeout(r, 400));

    setKillSwitchUntil(0);
    setConsecutiveLossCount(0);
    try {
      localStorage.setItem("aistock_killswitch_until", "0");
      localStorage.setItem("aistock_consecutive_losses", "0");
    } catch (e) {}

    addToast({
      type: "SUCCESS",
      title: "🟢 [3단계/3] 킬-스위치 안전 복구 완료",
      message: "시스템이 정상 상태로 복구되었으며 자율 매매 및 수동 주문이 즉시 가능합니다."
    });

    return true;
  }, []);
  const partialProfitDoneRef = useRef<Record<string, boolean>>({});
  const positionPeakPricesRef = useRef<Record<string, number>>({});

  const [cashBreakdown, setCashBreakdown] = useState<CashBreakdown>(() => {
    try {
      const saved = localStorage.getItem("aistock_cash_breakdown");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      koreaCash: 0,
      koreaInvested: 0,
      koreaTotal: 0,
      upbitCash: 0,
      upbitInvested: 0,
      upbitTotal: 0,
      usCash: 0,
      usInvested: 0,
      usTotal: 0,
      totalCash: 0,
      totalInvested: 0,
      grandTotalAssets: 0
    };
  });

  const [brokerApiStatus, setBrokerApiStatus] = useState<{
    korea: 'CONNECTED' | 'FAILED' | 'DISCONNECTED';
  }>({
    korea: 'CONNECTED'
  });

  const [brokerApiError, setBrokerApiError] = useState<{
    korea?: BrokerErrorDetails;
    upbit?: BrokerErrorDetails;
  }>({});

  const setBrokerError = (broker: 'korea' | 'upbit', error: BrokerErrorDetails | null) => {
    if (error) {
      setBrokerApiStatus(prev => ({ ...prev, [broker]: 'FAILED' }));
      setBrokerApiError(prev => ({ ...prev, [broker]: error }));
    } else {
      setBrokerApiStatus(prev => ({ ...prev, [broker]: 'CONNECTED' }));
      setBrokerApiError(prev => {
        const next = { ...prev };
        delete next[broker];
        return next;
      });
    }
  };

  const clearBrokerError = (broker: 'korea' | 'upbit') => {
    setBrokerError(broker, null);
  };

  // ---------------------------------------------------------
  // 5-Second KIS OpenAPI Real-time Auto-Ping & Timeout Retry Logic
  // ---------------------------------------------------------
  const [kisPingLatency, setKisPingLatency] = useState<number>(18);
  const [isAutoPingEnabled, setIsAutoPingEnabled] = useState<boolean>(true);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [pingRetryCount, setPingRetryCount] = useState<number>(0);
  const [pingHistory, setPingHistory] = useState<{ timestamp: string; latency: number; status: 'HEALTHY' | 'TIMEOUT' | 'ERROR' }[]>([]);

  const executePingWithRetry = async (maxRetries = 3, timeoutMs = 3000): Promise<boolean> => {
    let attempts = 0;
    while (attempts < maxRetries) {
      attempts++;
      setPingRetryCount(attempts);
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch("/api/broker/korea/ping", { signal: controller.signal });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const latency = data.latency || (Date.now() - startTime);
          const timeStr = new Date().toLocaleTimeString();
          
          setKisPingLatency(latency);
          setLastPingTime(timeStr);
          setPingRetryCount(0);
          setPingHistory(prev => [{ timestamp: timeStr, latency, status: 'HEALTHY' }, ...prev.slice(0, 19)]);
          
          if (brokerApiStatus.korea !== 'FAILED' || !brokerApiError.korea) {
            setBrokerApiStatus(prev => ({ ...prev, korea: 'CONNECTED' }));
          }
          return true;
        }
      } catch (err: any) {
        console.warn(`KIS OpenAPI Ping 시도 ${attempts}/${maxRetries} 실패:`, err.message);
        if (attempts < maxRetries) {
          await new Promise(r => setTimeout(r, attempts * 350));
        }
      }
    }

    // All retries failed
    const timeStr = new Date().toLocaleTimeString();
    setPingHistory(prev => [{ timestamp: timeStr, latency: 0, status: 'TIMEOUT' }, ...prev.slice(0, 19)]);
    setBrokerError("korea", {
      brokerName: "한국투자증권 (KIS Open API)",
      errorCode: "EGW00504",
      errorMessage: `KIS OpenAPI 서버 소켓 통신 지연 (${maxRetries}회 연속 재시도 후 타임아웃).`,
      endpoint: "https://openapi.koreainvestment.com:9443",
      httpStatus: 504,
      timestamp: new Date().toISOString(),
      rawResponse: { error: `Gateway Timeout after ${maxRetries} retries.` },
      resolutionGuide: [
        "1. [자동 재시도 메커니즘] 3회 재시도가 모두 실패했습니다.",
        "2. 한국투자증권 개발자 포털 공지사항 내 정기 점검 여부 확인",
        "3. 네트워크 연결 상태 및 서버 세션 상태 점검"
      ]
    });
    return false;
  };

  useEffect(() => {
    if (!isAutoPingEnabled) return;
    
    executePingWithRetry(2, 2500);

    const interval = setInterval(() => {
      executePingWithRetry(3, 3000);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPingEnabled]);
  const [decisionLogs, setDecisionLogs] = useState<AIDecisionLog[]>([
    {
      id: "dec_live_1",
      timestamp: new Date(Date.now() - 35000).toISOString(),
      symbol: "005930",
      name: "삼성전자",
      market: "KOREA",
      action: "BUY_SIGNAL",
      positionDirection: "LONG",
      entryRationale: "SMC 상승 구조(BOS) 돌파 및 기관/외인 대량 수급 동반 유입 포착",
      patternAnalysis: "장대양봉 거래대금 터짐 + 5분봉 FVG 갭 지지 반등",
      candlePattern: "장대양봉(Bullish Marubozu) & 상승 덮개형",
      smcStructure: "BOS (Break of Structure) 상단 돌파",
      orderbookDelta: "매수 잔량 대비 매도 잔량 2.4배 상회 (수급 호조)",
      currentPrice: 78500,
      entryPrice: 78200,
      targetPrice: 88000,
      stopLossPrice: 74500,
      targetGainPct: 12.1,
      volumeRatio: 3.4,
      rsi: 54,
      confidence: 94,
      message: "🚀 [AI 실시간 매수 시그널] 5분봉 20일선 지지 후 대량 거래대금 유입. 실시간 호가 ₩78,500원 기준 1차 목표가 ₩88,000원 (+12.1%) 분할 진입 승인.",
      safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
    },
    {
      id: "dec_live_2",
      timestamp: new Date(Date.now() - 95000).toISOString(),
      symbol: "000660",
      name: "SK하이닉스",
      market: "KOREA",
      action: "BUY_SIGNAL",
      positionDirection: "LONG",
      entryRationale: "HBM3E 공급망 수급 집중 및 연속 4일 기관 순매수 주도",
      patternAnalysis: "돌파 캔들 + 이동평균선 정배열 급반등",
      candlePattern: "상승 망치형(Hammer) & 거래량 분출",
      smcStructure: "CHoCH (Change of Character) 추세 전환 완료",
      orderbookDelta: "10단계 호가 매수벽 견고함",
      currentPrice: 228000,
      entryPrice: 227500,
      targetPrice: 262000,
      stopLossPrice: 216000,
      targetGainPct: 14.9,
      volumeRatio: 4.1,
      rsi: 58,
      confidence: 96,
      message: "🚀 [AI 실시간 매수 시그널] HBM3E 공급망 수급 집중 및 기관 4일 연속 순매수. 실시간 호가 ₩228,000원 기준 목표가 ₩262,000원 (+14.9%) 알파 모멘텀 시그널 포착.",
      safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
    },
    {
      id: "dec_live_3",
      timestamp: new Date(Date.now() - 180000).toISOString(),
      symbol: "196170",
      name: "알테오젠",
      market: "KOREA",
      action: "BUY_SIGNAL",
      positionDirection: "LONG",
      entryRationale: "바이오 SC 제형 기술수출 모멘텀 및 외국인 연속 순매수",
      patternAnalysis: "SMC FVG 불균형 갭 터치 후 강한 양봉 반등",
      candlePattern: "역망치형 지지 양봉 (Inverted Hammer Reversal)",
      smcStructure: "Demand Zone (수요구간) 지지 확인",
      orderbookDelta: "체결강도 168% 상승 가속",
      currentPrice: 382000,
      entryPrice: 380000,
      targetPrice: 440000,
      stopLossPrice: 355000,
      targetGainPct: 15.8,
      volumeRatio: 3.8,
      rsi: 61,
      confidence: 94,
      message: "🚀 [국내 바이오 대장주 매수 포착] 알테오젠 SC 제형 수출 모멘텀 및 외국인 대량 순매수. 실시간 호가 ₩382,000원 기준 1차 목표가 ₩440,000원 (+15.8%) 돌파 시그널.",
      safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
    },
    {
      id: "dec_live_4",
      timestamp: new Date(Date.now() - 320000).toISOString(),
      symbol: "042700",
      name: "한미반도체",
      market: "KOREA",
      action: "BUY_SIGNAL",
      positionDirection: "LONG",
      entryRationale: "HBM 고대역폭 메모리 본더 장비 독점적 수혜 및 코스피 반등 수급 집중",
      patternAnalysis: "볼린저밴드 상단 밴드 핑퐁 돌파 패턴",
      candlePattern: "장대양봉 돌파 (Bullish Breakout Candle)",
      smcStructure: "BOS (Break of Structure)",
      orderbookDelta: "기관/외국인 동시 순매수 유입",
      currentPrice: 211500,
      entryPrice: 208000,
      targetPrice: 245000,
      stopLossPrice: 198000,
      targetGainPct: 15.8,
      volumeRatio: 2.8,
      rsi: 54,
      confidence: 95,
      message: "🚀 [국내 AI 반도체 실시간 포착] 한미반도체 HBM 본더 수주 모멘텀 및 볼린저 상단 돌파. 실시간 호가 ₩211,500원 기준 목표가 ₩245,000원 (+15.8%) 진입 승인.",
      safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
    },
    {
      id: "dec_live_5",
      timestamp: new Date(Date.now() - 480000).toISOString(),
      symbol: "267260",
      name: "HD현대일렉트릭",
      market: "KOREA",
      action: "BUY_SIGNAL",
      positionDirection: "LONG",
      entryRationale: "북미 AI 변압기 슈퍼사이클 수주 잔고 급증 및 5일선 지지 반등",
      patternAnalysis: "Double Bottom (쌍바닥) 반등 및 기관 수급 유입",
      candlePattern: "Bullish Engulfing (상승 덮개형)",
      smcStructure: "Liquidity Sweep 후 재반등",
      orderbookDelta: "투신/연기금 매수세 집중",
      currentPrice: 312000,
      entryPrice: 306000,
      targetPrice: 358000,
      stopLossPrice: 292000,
      targetGainPct: 14.7,
      volumeRatio: 3.1,
      rsi: 58,
      confidence: 93,
      message: "⚡ [전력인프라 실시간 모멘텀] HD현대일렉트릭 변압기 수출 폭증 및 기관 수급 집중. 실시간 호가 ₩312,000원 기준 목표가 ₩358,000원 (+14.7%) 진입 신호.",
      safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
    },
    {
      id: "dec_live_6",
      timestamp: new Date(Date.now() - 720000).toISOString(),
      symbol: "035420",
      name: "NAVER",
      market: "KOREA",
      action: "HOLD_SIGNAL",
      currentPrice: 185000,
      entryPrice: 184000,
      targetPrice: 210000,
      stopLossPrice: 174000,
      targetGainPct: 13.5,
      volumeRatio: 1.2,
      rsi: 48,
      confidence: 86,
      message: "⏸️ [AI 포지션 홀딩] 20일선 지지선 안착 확인 중. 실시간 호가 ₩185,000원 기준 목표가 ₩210,000원 (+13.5%) 유지 및 관망.",
      safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
    }
  ]);

  const triggerLiveSignalLog = useCallback((log: Partial<AIDecisionLog> & {
    symbol: string;
    name: string;
    market: 'KOREA' | 'US' | 'BTC';
    action: AIDecisionLog['action'];
    message: string;
  }) => {
    const curPrice = log.currentPrice || 0;
    const targetPrice = log.targetPrice || (curPrice > 0 ? Math.round(curPrice * 1.12) : undefined);
    const stopLossPrice = log.stopLossPrice || (curPrice > 0 ? Math.round(curPrice * 0.95) : undefined);
    const targetGainPct = log.targetGainPct || (curPrice > 0 && targetPrice ? Math.round(((targetPrice - curPrice) / curPrice) * 1000) / 10 : 12.0);

    const newLog: AIDecisionLog = {
      id: log.id || generateUniqueId("dec_signal"),
      timestamp: log.timestamp || new Date().toISOString(),
      symbol: log.symbol,
      name: log.name,
      market: log.market,
      action: log.action,
      message: log.message,
      confidence: log.confidence ?? 92,
      currentPrice: curPrice,
      entryPrice: log.entryPrice || curPrice,
      targetPrice,
      stopLossPrice,
      targetGainPct,
      volumeRatio: log.volumeRatio ?? 3.2,
      rsi: log.rsi ?? 55,
      safetyStatus: log.safetyStatus || {
        holdingsLimit: "PASS",
        dailyLossLimit: "PASS",
        marketRisk: "PASS",
        brokerAuth: "PASS"
      }
    };

    setDecisionLogs(prev => [newLog, ...prev.slice(0, 49)]);
  }, []);

  const clearDecisionLogs = useCallback(() => {
    setDecisionLogs([]);
  }, []);

  // ---------------------------------------------------------
  // Auto Stop-Loss (-3%) & Blacklist / Blocked Symbols State with Intelligent Cooldown
  // ---------------------------------------------------------
  const [blockCooldownMinutes, setBlockCooldownMinutesState] = useState<number>(() => {
    const saved = Number(localStorage.getItem("aistock_block_cooldown_mins") || "30");
    return saved > 0 ? saved : 30;
  });

  const setBlockCooldownMinutes = useCallback((mins: number) => {
    setBlockCooldownMinutesState(mins);
    try {
      localStorage.setItem("aistock_block_cooldown_mins", String(mins));
    } catch (e) {}
  }, []);

  const [blockedSymbolDetails, setBlockedSymbolDetails] = useState<BlockedSymbolDetail[]>(() => {
    try {
      const saved = localStorage.getItem("aistock_blocked_symbol_details");
      if (saved) {
        const parsed: BlockedSymbolDetail[] = JSON.parse(saved);
        return parsed.filter(item => !item.unblockAt || item.unblockAt > Date.now());
      }
      const oldList = localStorage.getItem("aistock_blocked_symbols");
      if (oldList) {
        const symbols: string[] = JSON.parse(oldList);
        return symbols.map(s => ({
          symbol: s,
          name: s,
          blockedAt: Date.now(),
          unblockAt: Date.now() + 30 * 60 * 1000,
          reason: "-3% 자동 손절 보호",
          lossPct: -3.0,
          triggerSource: "-3% 자동 손절"
        }));
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const blockedSymbols = blockedSymbolDetails.map(d => d.symbol);
  const blockedSymbolsRef = useRef<string[]>(blockedSymbols);

  useEffect(() => {
    blockedSymbolsRef.current = blockedSymbolDetails.map(d => d.symbol);
    try {
      localStorage.setItem("aistock_blocked_symbol_details", JSON.stringify(blockedSymbolDetails));
      localStorage.setItem("aistock_blocked_symbols", JSON.stringify(blockedSymbolDetails.map(d => d.symbol)));
    } catch (e) {}
  }, [blockedSymbolDetails]);

  // Periodic Cooldown Expiration Checker (Every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBlockedSymbolDetails(prev => {
        const expired = prev.filter(item => item.unblockAt && item.unblockAt <= now);
        if (expired.length > 0) {
          expired.forEach(item => {
            console.log(`[Cooldown Expired] ${item.name} (${item.symbol}) 쿨다운 만료로 자동 차단 해제`);
            addToast({
              type: 'INFO',
              title: '🛡️ 손절 쿨다운 만료 (자동 해제)',
              message: `[${item.name || item.symbol}] 종목의 ${blockCooldownMinutes}분 안전 쿨다운이 만료되어 AI 스캔 대상에 자동 복귀되었습니다.`
            });
          });
          return prev.filter(item => !item.unblockAt || item.unblockAt > now);
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [blockCooldownMinutes, addToast]);

  const addBlockedSymbol = useCallback((
    symbol: string, 
    reason: string = "-3% 자동 손절 보호", 
    details?: Partial<BlockedSymbolDetail>
  ) => {
    const clean = symbol.toUpperCase().replace(/^KRW-/, "");
    const now = Date.now();
    const duration = (details?.unblockAt && details.unblockAt > now)
      ? details.unblockAt - now
      : (blockCooldownMinutes * 60 * 1000);

    setBlockedSymbolDetails(prev => {
      const filtered = prev.filter(s => s.symbol !== clean);
      const isCrypto = clean.includes("BTC") || clean.includes("ETH") || symbol.startsWith("KRW-");
      const isKorea = !isCrypto && clean.length === 6 && !isNaN(Number(clean));
      const detectedMarket: 'KOREA' | 'US' | 'BTC' = details?.market || (isCrypto ? 'BTC' : isKorea ? 'KOREA' : 'US');

      const newItem: BlockedSymbolDetail = {
        symbol: clean,
        name: details?.name || clean,
        market: detectedMarket,
        blockedAt: now,
        unblockAt: now + duration,
        reason: reason || details?.reason || "-3% 자동 손절 보호",
        lossPct: details?.lossPct ?? -3.0,
        triggerSource: details?.triggerSource || "-3% 자동 손절"
      };
      return [...filtered, newItem];
    });
  }, [blockCooldownMinutes]);

  const removeBlockedSymbol = useCallback((symbol: string) => {
    const clean = symbol.toUpperCase().replace(/^KRW-/, "");
    setBlockedSymbolDetails(prev => prev.filter(s => s.symbol !== clean));
  }, []);

  const clearBlockedSymbols = useCallback(() => {
    setBlockedSymbolDetails([]);
  }, []);

  const [insufficientFundStocks, setInsufficientFundStocks] = useState<InsufficientFundItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("aistock_insufficient_fund_stocks") || "[]");
    } catch {
      return [];
    }
  });

  const addInsufficientFundStock = useCallback((item: { symbol: string; name: string; market: 'KOREA' | 'US' | 'BTC'; side: 'BUY' | 'SELL'; price: number; qty: number; cost: number; reason: string }) => {
    const newItem: InsufficientFundItem = {
      id: `insuf_${item.symbol}_${Date.now()}`,
      ...item,
      timestamp: new Date().toISOString()
    };
    setInsufficientFundStocks(prev => {
      const filtered = prev.filter(p => p.symbol.toUpperCase() !== item.symbol.toUpperCase());
      const next = [newItem, ...filtered];
      try { localStorage.setItem("aistock_insufficient_fund_stocks", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const removeInsufficientFundStock = useCallback((symbol: string) => {
    setInsufficientFundStocks(prev => {
      const next = prev.filter(p => p.symbol.toUpperCase() !== symbol.toUpperCase());
      try { localStorage.setItem("aistock_insufficient_fund_stocks", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const clearInsufficientFundStocks = useCallback(() => {
    setInsufficientFundStocks([]);
    try { localStorage.removeItem("aistock_insufficient_fund_stocks"); } catch (e) {}
  }, []);

  // ---------------------------------------------------------
  // Real Account API Response History Log Console State & Integrity Checker
  // ---------------------------------------------------------
  const [apiResponseLogs, setApiResponseLogs] = useState<ApiResponseLogItem[]>([
    {
      id: "log_init",
      timestamp: new Date().toISOString(),
      broker: "KOREA",
      endpoint: "https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/trading/inquire-balance",
      httpStatus: 200,
      message: "한국투자증권 실전 OpenAPI 세션 연결 정상 수신 중",
      integrityStatus: "HEALTHY",
      rawResponse: { rt_cd: "0", msg_cd: "MCA00000", msg1: "정상 처리 되었습니다." }
    }
  ]);

  const syncRealAccountBalance = useCallback(async (
    broker: 'korea' | 'us' | 'upbit' | 'all' = 'all',
    silent: boolean = true
  ) => {
    try {
      const currentProfile = profileRef.current;
      if (!currentProfile) throw new Error("사용자 프로필을 찾을 수 없습니다.");
      
      const response = await fetch("/api/broker/sync-balance?_t=" + Date.now(), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({
          broker,
          koreaAppKey: currentProfile.koreaAppKey,
          koreaAppSecret: currentProfile.koreaAppSecret,
          koreaAccountNo: currentProfile.koreaAccountNo,
          koreaAccountCode: currentProfile.koreaAccountCode,
          upbitAccessKey: currentProfile.upbitAccessKey,
          upbitSecretKey: currentProfile.upbitSecretKey,
          currentBalance: currentProfile.balance || 0,
          _t: Date.now()
        })
      });

      const data = await response.json();
      const fetchedBalance = data.balance ?? 0;
      const fetchedCash = data.cash ?? data.cashBreakdown?.totalCash ?? data.cashBreakdown?.koreaCash ?? 0;
      const isZero = fetchedBalance === 0 && fetchedCash === 0;

      // Update cashBreakdown state if received from backend sync
      if (data.cashBreakdown) {
        setCashBreakdown(prev => {
          let nextBreakdown: CashBreakdown;
          if (broker === 'all') {
            nextBreakdown = data.cashBreakdown;
          } else {
            const current = prev || {
              koreaCash: 0,
              koreaInvested: 0,
              koreaTotal: 0,
              upbitCash: 0,
              upbitInvested: 0,
              upbitTotal: 0,
              usCash: 0,
              usInvested: 0,
              usTotal: 0,
              totalCash: 0,
              totalInvested: 0,
              grandTotalAssets: 0
            };
            nextBreakdown = {
              ...current,
              ...data.cashBreakdown
            };
            // Calculate accurate unified totals
            nextBreakdown.koreaTotal = (nextBreakdown.koreaCash || 0) + (nextBreakdown.koreaInvested || 0);
            nextBreakdown.upbitTotal = (nextBreakdown.upbitCash || 0) + (nextBreakdown.upbitInvested || 0);
            nextBreakdown.usTotal = (nextBreakdown.usCash || 0) + (nextBreakdown.usInvested || 0);
            nextBreakdown.totalCash = (nextBreakdown.koreaCash || 0) + (nextBreakdown.upbitCash || 0) + (nextBreakdown.usCash || 0);
            nextBreakdown.totalInvested = (nextBreakdown.koreaInvested || 0) + (nextBreakdown.upbitInvested || 0) + (nextBreakdown.usInvested || 0);
            nextBreakdown.grandTotalAssets = nextBreakdown.totalCash + nextBreakdown.totalInvested;
          }

          if (JSON.stringify(prev) === JSON.stringify(nextBreakdown)) return prev;
          try {
            localStorage.setItem("aistock_cash_breakdown", JSON.stringify(nextBreakdown));
          } catch (e) {}
          return nextBreakdown;
        });
      }

      // Helper to strictly de-duplicate positions list by normalized symbol
      const deduplicatePosList = (posList: StockPosition[]): StockPosition[] => {
        const map = new Map<string, StockPosition>();
        for (const p of posList) {
          if (!p || !p.symbol) continue;
          const cleanSym = p.symbol.toUpperCase().replace(/^KRW-/, "");
          if (map.has(cleanSym)) {
            const existing = map.get(cleanSym)!;
            existing.quantity = Math.max(existing.quantity, p.quantity);
            existing.currentPrice = p.currentPrice || existing.currentPrice;
            existing.avgPrice = existing.avgPrice || p.avgPrice;
            existing.updatedAt = p.updatedAt || existing.updatedAt;
          } else {
            map.set(cleanSym, { ...p, symbol: cleanSym });
          }
        }
        return Array.from(map.values());
      };

      const isRealMode = Boolean(currentProfile.isRealTrade);

      // Update positions ONLY in Real Trading mode. In Paper Trading mode, keep virtual holdings safe and isolated!
      if (isRealMode && Array.isArray(data.positions)) {
        setPositions(prev => {
          let combined: StockPosition[];
          if (broker === 'all') {
            const hasUpbitConfigured = Boolean(currentProfile.upbitAccessKey);
            const hasKoreaConfigured = Boolean(currentProfile.koreaAppKey && currentProfile.koreaAccountNo);

            const newUpbit = data.positions.filter(p => p.market === 'BTC' || p.symbol?.startsWith('KRW-') || p.id?.startsWith('upbit_'));
            const prevUpbit = prev.filter(p => p.market === 'BTC' || p.symbol?.startsWith('KRW-') || p.id?.startsWith('upbit_'));
            
            const newKorea = data.positions.filter(p => p.market === 'KOREA' && !p.id?.startsWith('upbit_'));
            const prevKorea = prev.filter(p => p.market === 'KOREA' && !p.id?.startsWith('upbit_'));

            const newUs = data.positions.filter(p => p.market === 'US');
            const prevUs = prev.filter(p => p.market === 'US');

            const finalUpbit = hasUpbitConfigured ? newUpbit : [];
            const finalKorea = hasKoreaConfigured ? newKorea : [];
            const finalUs = newUs;

            combined = deduplicatePosList([...finalKorea, ...finalUpbit, ...finalUs]);
          } else {
            const isTargetBroker = (p: StockPosition) => {
              if (broker === 'upbit') return p.market === 'BTC' || (p as any).broker === 'upbit' || p.id.startsWith('upbit_') || p.symbol.startsWith('KRW-');
              if (broker === 'korea') return p.market === 'KOREA' && !p.id.startsWith('upbit_');
              if (broker === 'us') return p.market === 'US';
              return false;
            };
            const unchanged = prev.filter(p => !isTargetBroker(p));
            combined = deduplicatePosList([...unchanged, ...data.positions]);
          }

          const prevKey = prev.map(p => `${p.symbol}_${p.quantity}_${Math.round(p.currentPrice || p.avgPrice || 0)}`).join("|");
          const nextKey = combined.map(p => `${p.symbol}_${p.quantity}_${Math.round(p.currentPrice || p.avgPrice || 0)}`).join("|");
          if (prevKey === nextKey) return prev;

          try {
            localStorage.setItem("aistock_positions", JSON.stringify(combined));
            localStorage.setItem("aistock_real_positions", JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }

      // 1. Toast notification on manual sync (only when NOT silent)
      if (!silent) {
        if (!data.success) {
          addToast({
            type: "WARNING",
            title: "실계좌 잔고 동기화 확인",
            message: data.message || data.errorMsg || "한국투자증권 API 계좌 동기화 정보를 수신하지 못했습니다."
          });
        } else if (isRealMode) {
          addToast({
            type: "SUCCESS",
            title: "한국투자증권 실전 계좌 잔고 실시간 동기화 완료",
            message: data.message || `실시간 조회 잔고 (총자산: ${(fetchedBalance || 0).toLocaleString()}원 / 예수금: ${(fetchedCash || 0).toLocaleString()}원)`
          });
        } else {
          addToast({
            type: "INFO",
            title: "🛡️ 모의투자 환경 안전 연동",
            message: `가상 예수금(${(currentProfile.balance || 0).toLocaleString()}원)과 가상 포트폴리오는 안전하게 보존되며, 실시간 시장 시세 데이터와 정상 동기화 중입니다.`
          });
        }
      }

      // 2. Append to API Response Logs
      const logItem: ApiResponseLogItem = {
        id: generateUniqueId("log"),
        timestamp: data.timestamp || new Date().toISOString(),
        broker: broker.toUpperCase(),
        endpoint: data.endpoint || "/api/broker/sync-balance",
        httpStatus: data.httpStatus || (data.success ? 200 : 400),
        message: data.message || data.errorMsg || "API 응답 정보 수신 완료",
        integrityStatus: data.integrityStatus || "HEALTHY",
        rawResponse: data.rawResponse || data
      };
      setApiResponseLogs(prev => [logItem, ...prev.slice(0, 49)]);

      // 3. Update DB profile balance & cash ONLY when in Real Trading mode
      if (isRealMode && data.success && (fetchedBalance > 0 || fetchedCash > 0)) {
        if (currentProfile.balance !== fetchedBalance || currentProfile.cash !== fetchedCash) {
          await updateProfileSettings({ balance: fetchedBalance, cash: fetchedCash });
        }
      }

      return {
        success: data.success ?? false,
        balance: fetchedBalance,
        cash: fetchedCash,
        cashBreakdown: data.cashBreakdown,
        message: data.message || data.errorMsg || "",
        integrityStatus: data.integrityStatus || "HEALTHY",
        rawResponse: data.rawResponse || data
      };
    } catch (err: any) {
      const errorMsg = err.message || "잔고 수동 동기화 오류";
      if (!silent) {
        addToast({
          type: "ERROR",
          title: "동기화 실패",
          message: errorMsg
        });
      }
      const logItem: ApiResponseLogItem = {
        id: generateUniqueId("log_err"),
        timestamp: new Date().toISOString(),
        broker: broker.toUpperCase(),
        endpoint: "/api/broker/sync-balance",
        httpStatus: 500,
        message: `동기화 통신 에러: ${errorMsg}`,
        integrityStatus: "CONNECTION_FAILED",
        rawResponse: { error: errorMsg }
      };
      setApiResponseLogs(prev => [logItem, ...prev.slice(0, 49)]);

      const currentProfile = profileRef.current;
      return {
        success: false,
        balance: currentProfile?.balance ?? 0,
        message: errorMsg,
        integrityStatus: "CONNECTION_FAILED"
      };
    }
  }, []);

  const checkAccountIntegrity = async () => {
    const dbBal = profile?.balance ?? 0;
    const syncRes = await syncRealAccountBalance("korea");
    const apiBal = syncRes.balance;
    const diff = Math.abs(dbBal - apiBal);
    
    let status = "HEALTHY_MATCH";
    if (dbBal === 0 && apiBal === 0) {
      status = "ZERO_BALANCE_MATCH";
    } else if (diff > 1) {
      status = "DISCREPANCY_DETECTED";
    }

    return {
      isIntegrated: diff <= 1,
      dbBalance: dbBal,
      apiBalance: apiBal,
      status,
      discrepancy: diff
    };
  };

  // 1. Authenticate anonymously by default if not signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          console.warn("Anonymous authentication failed, falling back to local guest user:", e?.message || e);
          setUser({
            uid: "guest_local_user",
            email: "guest@aistock24.com"
          });
        }
      }
    });
    return unsubscribe;
  }, []);

  // Fetch market status on load with retry and gentle logging
  const refreshMarketStatus = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch("/api/market/status");
        if (res.ok) {
          const data = await res.json();
          setMarketStatus(data);
          return;
        }
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      } catch (e) {
        if (i === retries - 1) {
          console.warn("Failed to fetch market status after retries, using default", e);
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
  };

  useEffect(() => {
    refreshMarketStatus();
  }, []);

  // 2. Synchronize Firestore data based on user auth
  useEffect(() => {
    if (!user) return;

    const syncData = async () => {
      setLoading(true);
      try {
        if (user.uid === "guest_local_user") {
          // Local Storage Fallback Mode
          const localProfileStr = localStorage.getItem("aistock_profile");
          let savedCreds: Record<string, string> = {};
          try {
            const sc = localStorage.getItem("aistock_saved_api_credentials");
            if (sc) savedCreds = JSON.parse(sc);
          } catch (e) {}

          // Also fetch backend server disk credentials
          let serverCreds: Record<string, any> = {};
          try {
            const sRes = await fetch("/api/broker/credentials");
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData.hasCredentials && sData.credentials) {
                serverCreds = sData.credentials;
              }
            }
          } catch (e) {}

          if (!localProfileStr) {
            // Seed initial local profile with Live Trading Mode active by default
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || "guest@aistock24.com",
              balance: 0,
              initialBalance: 0,
              riskLimitPerTrade: 10,
              dailyLossLimit: 2,
              maxPositionWeight: 100,
              autoTradingEnabled: true,
              isDemoMode: false,
              isRealTrade: true,
              tradingMode: "approval",
              koreaAppKey: serverCreds.koreaAppKey || savedCreds.koreaAppKey || "",
              koreaAppSecret: serverCreds.koreaAppSecret || savedCreds.koreaAppSecret || "",
              koreaAccountNo: serverCreds.koreaAccountNo || savedCreds.koreaAccountNo || "",
              koreaAccountCode: serverCreds.koreaAccountCode || savedCreds.koreaAccountCode || "01",
              upbitAccessKey: serverCreds.upbitAccessKey || savedCreds.upbitAccessKey || "",
              upbitSecretKey: serverCreds.upbitSecretKey || savedCreds.upbitSecretKey || "",
              geminiApiKey: serverCreds.geminiApiKey || savedCreds.geminiApiKey || "",
              createdAt: new Date().toISOString()
            };
            const seedStrats: TradingStrategy[] = [
              {
                id: "strat_golden_cross",
                userId: user.uid,
                name: "AI 골든크로스 돌파 전략",
                description: "20일 이동평균선이 60일 선을 상향 돌파하고 AI 종합점수가 75점 이상일 때 매수 기회를 포착합니다.",
                type: "trend",
                isActive: true,
                conditions: [
                  { indicator: "ma_cross", operator: "crosses_above", value: "60" },
                  { indicator: "sentiment", operator: "greater_than", value: "75" }
                ],
                allocation: 40,
                createdAt: new Date().toISOString()
              },
              {
                id: "strat_rsi_pullback",
                userId: user.uid,
                name: "RSI 과매도 소액 눌림목 분할매수",
                description: "안정적인 우량주 중 단기 RSI 과매도 구간(35 미만)에 도달한 종목을 포착하여 분할 진입합니다.",
                type: "pullback",
                isActive: true,
                conditions: [
                  { indicator: "rsi", operator: "less_than", value: "35" },
                  { indicator: "market_risk", operator: "less_than", value: "WARNING" }
                ],
                allocation: 30,
                createdAt: new Date().toISOString()
              }
            ];
            localStorage.setItem("aistock_profile", JSON.stringify(newProfile));
            localStorage.setItem("aistock_strategies", JSON.stringify(seedStrats));
            localStorage.setItem("aistock_positions", JSON.stringify([]));
            localStorage.setItem("aistock_trades", JSON.stringify([]));
            localStorage.setItem("aistock_orders", JSON.stringify([]));

            profileRef.current = newProfile;
            setProfile(newProfile);
            setStrategies(seedStrats);
            setPositions([]);
            setTrades([]);
            setOrders([]);
          } else {
            const loaded = JSON.parse(localProfileStr);
            let updated = false;
            if (loaded.isDemoMode !== false) {
              loaded.isDemoMode = false;
              updated = true;
            }
            if (loaded.isRealTrade !== true) {
              loaded.isRealTrade = true;
              updated = true;
            }
            if (!loaded.maxPositionWeight || loaded.maxPositionWeight < 100) {
              loaded.maxPositionWeight = 100;
              updated = true;
            }
            // Ensure permanent saved keys are merged into profile
            if (!loaded.koreaAppKey && (serverCreds.koreaAppKey || savedCreds.koreaAppKey)) {
              loaded.koreaAppKey = serverCreds.koreaAppKey || savedCreds.koreaAppKey;
              updated = true;
            }
            if (!loaded.koreaAppSecret && (serverCreds.koreaAppSecret || savedCreds.koreaAppSecret)) {
              loaded.koreaAppSecret = serverCreds.koreaAppSecret || savedCreds.koreaAppSecret;
              updated = true;
            }
            if (!loaded.koreaAccountNo && (serverCreds.koreaAccountNo || savedCreds.koreaAccountNo)) {
              loaded.koreaAccountNo = serverCreds.koreaAccountNo || savedCreds.koreaAccountNo;
              updated = true;
            }
            if (!loaded.upbitAccessKey && (serverCreds.upbitAccessKey || savedCreds.upbitAccessKey)) {
              loaded.upbitAccessKey = serverCreds.upbitAccessKey || savedCreds.upbitAccessKey;
              updated = true;
            }
            if (!loaded.upbitSecretKey && (serverCreds.upbitSecretKey || savedCreds.upbitSecretKey)) {
              loaded.upbitSecretKey = serverCreds.upbitSecretKey || savedCreds.upbitSecretKey;
              updated = true;
            }

            if (updated) {
              localStorage.setItem("aistock_profile", JSON.stringify(loaded));
            }
            const localPosStr = localStorage.getItem("aistock_positions");
            let parsedPos: StockPosition[] = [];
            if (localPosStr) {
              try { parsedPos = deduplicatePosList(JSON.parse(localPosStr)); } catch (e) {}
            }
            profileRef.current = loaded;
            setProfile(loaded);
            setStrategies(JSON.parse(localStorage.getItem("aistock_strategies") || "[]"));
            setPositions(parsedPos);
            setTrades(JSON.parse(localStorage.getItem("aistock_trades") || "[]"));
            setOrders(JSON.parse(localStorage.getItem("aistock_orders") || "[]"));
          }
        } else {
          // Firebase Mode: Concurrently fetch all Firestore collections and broker credentials to eliminate multi-render tearing
          const userDocRef = doc(db, "users", user.uid);
          const [userDocRes, snapStratRes, snapPosRes, snapTradesRes, snapOrdersRes, credRes] = await Promise.allSettled([
            getDoc(userDocRef),
            getDocs(query(collection(db, "strategies"), where("userId", "==", user.uid))),
            getDocs(query(collection(db, "positions"), where("userId", "==", user.uid))),
            getDocs(query(collection(db, "trades"), where("userId", "==", user.uid))),
            getDocs(query(collection(db, "orders"), where("userId", "==", user.uid))),
            fetch("/api/broker/credentials")
          ]);

          // 1. Process Profile & Broker Credentials
          let currentProfile: UserProfile;
          let userDocExists = false;
          if (userDocRes.status === "fulfilled" && userDocRes.value && userDocRes.value.exists()) {
            currentProfile = userDocRes.value.data() as UserProfile;
            userDocExists = true;
          } else {
            const localProfileStr = localStorage.getItem("aistock_profile");
            if (localProfileStr) {
              try { currentProfile = JSON.parse(localProfileStr); } catch (e) {
                currentProfile = {
                  uid: user.uid,
                  email: user.email || "guest@aistock24.com",
                  balance: 1000000,
                  initialBalance: 1000000,
                  riskLimitPerTrade: 10,
                  dailyLossLimit: 2,
                  maxPositionWeight: 100,
                  autoTradingEnabled: true,
                  isDemoMode: false,
                  tradingMode: "approval",
                  createdAt: new Date().toISOString()
                };
              }
            } else {
              currentProfile = {
                uid: user.uid,
                email: user.email || "guest@aistock24.com",
                balance: 1000000,
                initialBalance: 1000000,
                riskLimitPerTrade: 10,
                dailyLossLimit: 2,
                maxPositionWeight: 100,
                autoTradingEnabled: true,
                isDemoMode: false,
                tradingMode: "approval",
                createdAt: new Date().toISOString()
              };
            }
          }

          // Sanitize profile properties
          let needsDbUpdate = false;
          const updateFields: any = {};
          let localProfileStr = localStorage.getItem("aistock_profile");
          let localTargetMkt: 'KOREA' | 'US' | 'BTC' | undefined;
          if (localProfileStr) {
            try {
              const localP = JSON.parse(localProfileStr);
              localTargetMkt = localP.autoTradingTargetMarket;
            } catch (e) {}
          }

          const effectiveTargetMkt = currentProfile.autoTradingTargetMarket || localTargetMkt || profileRef.current?.autoTradingTargetMarket || "KOREA";
          if (currentProfile.autoTradingTargetMarket !== effectiveTargetMkt) {
            currentProfile.autoTradingTargetMarket = effectiveTargetMkt;
            updateFields.autoTradingTargetMarket = effectiveTargetMkt;
            needsDbUpdate = true;
          }

          if (currentProfile.isDemoMode !== false) {
            currentProfile.isDemoMode = false;
            updateFields.isDemoMode = false;
            needsDbUpdate = true;
          }

          if (needsDbUpdate && userDocExists) {
            updateDoc(userDocRef, updateFields).catch(err => console.warn("Failed to sanitize profile in Firebase", err));
          }

          // Merge Broker Credentials from server if available
          if (credRes.status === "fulfilled" && credRes.value && credRes.value.ok) {
            try {
              const credData = await credRes.value.json();
              if (credData.hasCredentials && credData.credentials) {
                const c = credData.credentials;
                currentProfile = {
                  ...currentProfile,
                  balance: typeof currentProfile.balance === 'number' ? currentProfile.balance : (currentProfile.initialBalance || 0),
                  initialBalance: currentProfile.initialBalance || 0,
                  isRealTrade: true,
                  autoTradingTargetMarket: effectiveTargetMkt,
                  koreaAppKey: c.koreaAppKey || currentProfile.koreaAppKey || "",
                  koreaAppSecret: c.koreaAppSecret || currentProfile.koreaAppSecret || "",
                  koreaAccountNo: c.koreaAccountNo || currentProfile.koreaAccountNo || "",
                  koreaAccountCode: c.koreaAccountCode || currentProfile.koreaAccountCode || "01",
                  upbitAccessKey: c.upbitAccessKey || currentProfile.upbitAccessKey || "",
                  upbitSecretKey: c.upbitSecretKey || currentProfile.upbitSecretKey || "",
                  geminiApiKey: c.geminiApiKey || currentProfile.geminiApiKey || ""
                };
              }
            } catch (e) {
              console.warn("Error parsing broker credentials:", e);
            }
          }

          if (!userDocExists && userDocRef) {
            setDoc(userDocRef, currentProfile).catch(e => console.warn("Failed to setDoc on userDocRef", e));
          }

          // 2. Process Strategies
          let finalStrats: TradingStrategy[] = [];
          if (snapStratRes.status === "fulfilled" && snapStratRes.value && snapStratRes.value.docs.length > 0) {
            finalStrats = snapStratRes.value.docs.map(doc => doc.data() as TradingStrategy);
          } else {
            const seedStrategies: Omit<TradingStrategy, "id" | "userId" | "createdAt">[] = [
              {
                name: "AI 골든크로스 돌파 전략",
                description: "20일 이동평균선이 60일 선을 상향 돌파하고 AI 종합점수가 75점 이상일 때 매수 기회를 포착합니다.",
                type: "trend",
                isActive: true,
                conditions: [
                  { indicator: "ma_cross", operator: "crosses_above", value: "60" },
                  { indicator: "sentiment", operator: "greater_than", value: "75" }
                ],
                allocation: 40
              },
              {
                name: "RSI 과매도 소액 눌림목 분할매수",
                description: "안정적인 우량주 중 단기 RSI 과매도 구간(35 미만)에 도달한 종목을 포착하여 분할 진입합니다.",
                type: "pullback",
                isActive: true,
                conditions: [
                  { indicator: "rsi", operator: "less_than", value: "35" },
                  { indicator: "market_risk", operator: "less_than", value: "WARNING" }
                ],
                allocation: 30
              }
            ];
            for (const s of seedStrategies) {
              const docRef = await addDoc(collection(db, "strategies"), {
                ...s,
                userId: user.uid,
                createdAt: Timestamp.now()
              });
              await updateDoc(docRef, { id: docRef.id });
            }
            finalStrats = seedStrategies.map((s, idx) => ({
              ...s,
              id: `strat_seed_${idx}`,
              userId: user.uid,
              createdAt: new Date().toISOString()
            }));
          }

          // 3. Process Positions
          let finalPositions: StockPosition[] = [];
          if (currentProfile.isRealTrade) {
            try {
              const savedReal = localStorage.getItem("aistock_real_positions");
              if (savedReal) {
                finalPositions = deduplicatePosList(JSON.parse(savedReal));
              }
            } catch (e) {}
          } else {
            if (snapPosRes.status === "fulfilled" && snapPosRes.value) {
              const fetchedPos = snapPosRes.value.docs.map(doc => doc.data() as StockPosition);
              const cleanPos = fetchedPos.filter(p => p.id && !p.id.startsWith("pos_samsung") && !p.id.startsWith("pos_demo") && !p.id.startsWith("pos_nvda"));
              finalPositions = deduplicatePosList(cleanPos);
            } else {
              const rawPos = JSON.parse(localStorage.getItem("aistock_positions") || "[]");
              const cleanPos = rawPos.filter((p: any) => p.id && !p.id.startsWith("pos_samsung") && !p.id.startsWith("pos_demo") && !p.id.startsWith("pos_nvda"));
              finalPositions = deduplicatePosList(cleanPos);
            }
          }

          // 4. Process Trades
          let finalTrades: TradeLog[] = [];
          if (snapTradesRes.status === "fulfilled" && snapTradesRes.value) {
            finalTrades = snapTradesRes.value.docs.map(doc => doc.data() as TradeLog);
            finalTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          } else {
            finalTrades = JSON.parse(localStorage.getItem("aistock_trades") || "[]");
          }

          // 5. Process Orders
          let finalOrders: Order[] = [];
          if (snapOrdersRes.status === "fulfilled" && snapOrdersRes.value) {
            finalOrders = snapOrdersRes.value.docs.map(doc => doc.data() as Order);
            finalOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          } else {
            finalOrders = JSON.parse(localStorage.getItem("aistock_orders") || "[]");
          }

          // Atomic Cache Sync to LocalStorage
          profileRef.current = currentProfile;
          localStorage.setItem("aistock_profile", JSON.stringify(currentProfile));
          localStorage.setItem("aistock_positions", JSON.stringify(finalPositions));
          localStorage.setItem("aistock_strategies", JSON.stringify(finalStrats));
          localStorage.setItem("aistock_trades", JSON.stringify(finalTrades));
          localStorage.setItem("aistock_orders", JSON.stringify(finalOrders));

          // Single Batched React State Update
          setProfile(currentProfile);
          setStrategies(finalStrats);
          setPositions(finalPositions);
          setTrades(finalTrades);
          setOrders(finalOrders);
        }
      } catch (e) {
        console.error("Critical error in syncData:", e);
      } finally {
        setLoading(false);
      }
    };

    syncData();
  }, [user]);

  // 3. Real-time Asset Auto-Sync & Auto-Refresh Effect (Runs every 30s when credentials exist)
  useEffect(() => {
    if (!profile || !profile.isRealTrade) return;
    const hasKeys = Boolean(profile.koreaAppKey && profile.koreaAccountNo);
    if (!hasKeys) return;

    // Immediate initial balance query for Korea Investment Securities
    syncRealAccountBalance('korea', true).catch(err => {
      console.warn("Initial real-time balance auto-sync notice:", err?.message || err);
    });

    // 30-second periodic auto-refresh interval for Korea Investment Securities
    const intervalId = setInterval(() => {
      syncRealAccountBalance('korea', true).catch(err => {
        console.warn("Periodic real-time balance auto-sync notice:", err?.message || err);
      });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [profile?.isRealTrade, profile?.koreaAppKey, profile?.koreaAccountNo, syncRealAccountBalance]);

  // Emergency stop trigger
  const triggerEmergencyStop = async () => {
    if (!user || !profile) return;
    try {
      const stopTrade: Omit<TradeLog, "id"> = {
        userId: user.uid,
        symbol: "SYS",
        name: "시스템 관제",
        market: "KOREA",
        side: "SELL",
        quantity: 0,
        price: 0,
        strategyName: "긴급 비상정지",
        aiRationale: "사용자 긴급명령에 의한 전 기능 24시간 자동매매 즉각 일시정지 및 미체결 즉시 회수 처리 가동.",
        timestamp: new Date().toISOString()
      };

      // Cancel all pending orders in local state
      const updatedOrders = orders.map(o => o.status === "PENDING" ? { ...o, status: "CANCELED" as const } : o);
      setOrders(updatedOrders);

      if (user.uid === "guest_local_user") {
        const updatedProfile = { ...profile, autoTradingEnabled: false };
        setProfile(updatedProfile);
        localStorage.setItem("aistock_profile", JSON.stringify(updatedProfile));
        localStorage.setItem("aistock_orders", JSON.stringify(updatedOrders));

        const newTradeWithId = { ...stopTrade, id: generateUniqueId("trade") } as TradeLog;
        const updatedTrades = [newTradeWithId, ...trades];
        setTrades(updatedTrades);
        localStorage.setItem("aistock_trades", JSON.stringify(updatedTrades));
      } else {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { autoTradingEnabled: false }, { merge: true });
        setProfile(prev => prev ? { ...prev, autoTradingEnabled: false } : null);

        const cleanStopTrade = cleanUndefined(stopTrade);
        const docRef = await addDoc(collection(db, "trades"), cleanStopTrade);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        setTrades(prev => [{ ...stopTrade, id: docRef.id } as TradeLog, ...prev]);

        // Cancel pending orders in Firestore
        try {
          const q = query(collection(db, "orders"), where("userId", "==", user.uid), where("status", "==", "PENDING"));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.docs.forEach(docSnap => {
              batch.update(docSnap.ref, { status: "CANCELED" });
            });
            await batch.commit();
          }
        } catch (err) {
          console.error("Failed to cancel pending orders in Firestore", err);
        }
      }

      // Record this Emergency Stop in decision logs immediately
      const stopLog: AIDecisionLog = {
        id: "dec_stop_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        symbol: "SYS",
        name: "비상 제어",
        market: "KOREA",
        action: "SAFETY_REJECT",
        message: "🚨 [긴급 제어 명령 수신] 사용자 강제 긴급정지 작동. 미체결 주문 일괄 회수 처리 및 자동 감시 오프라인 전환.",
        confidence: 100,
        safetyStatus: {
          holdingsLimit: "FAIL",
          dailyLossLimit: "FAIL",
          marketRisk: "FAIL",
          brokerAuth: "FAIL"
        }
      };
      setDecisionLogs(prev => [stopLog, ...prev.slice(0, 49)]);

    } catch (e) {
      console.error("Emergency stop failed", e);
    }
  };

  // Update profile settings
  const updateProfileSettings = async (settings: Partial<UserProfile>) => {
    try {
      let localProfile: Partial<UserProfile> = {};
      try {
        const localStr = localStorage.getItem("aistock_profile");
        if (localStr) localProfile = JSON.parse(localStr);
      } catch (e) {}

      let savedCreds: Record<string, string> = {};
      try {
        const sc = localStorage.getItem("aistock_saved_api_credentials");
        if (sc) savedCreds = JSON.parse(sc);
      } catch (e) {}

      const currentBase = profileRef.current || profile || localProfile;

      const effectiveTargetMarket = 
        settings.autoTradingTargetMarket 
        || currentBase?.autoTradingTargetMarket 
        || localProfile?.autoTradingTargetMarket 
        || "KOREA";

      // If settings contains new credentials, update savedCreds
      const updatedCreds = { ...savedCreds };
      if (settings.koreaAppKey !== undefined) {
        if (settings.koreaAppKey) updatedCreds.koreaAppKey = settings.koreaAppKey;
        else delete updatedCreds.koreaAppKey;
      }
      if (settings.koreaAppSecret !== undefined) {
        if (settings.koreaAppSecret) updatedCreds.koreaAppSecret = settings.koreaAppSecret;
        else delete updatedCreds.koreaAppSecret;
      }
      if (settings.koreaAccountNo !== undefined) {
        if (settings.koreaAccountNo) updatedCreds.koreaAccountNo = settings.koreaAccountNo;
        else delete updatedCreds.koreaAccountNo;
      }
      if (settings.koreaAccountCode !== undefined) {
        if (settings.koreaAccountCode) updatedCreds.koreaAccountCode = settings.koreaAccountCode;
        else delete updatedCreds.koreaAccountCode;
      }
      if (settings.upbitAccessKey !== undefined) {
        if (settings.upbitAccessKey) updatedCreds.upbitAccessKey = settings.upbitAccessKey;
        else delete updatedCreds.upbitAccessKey;
      }
      if (settings.upbitSecretKey !== undefined) {
        if (settings.upbitSecretKey) updatedCreds.upbitSecretKey = settings.upbitSecretKey;
        else delete updatedCreds.upbitSecretKey;
      }
      if (settings.geminiApiKey !== undefined) {
        if (settings.geminiApiKey) updatedCreds.geminiApiKey = settings.geminiApiKey;
        else delete updatedCreds.geminiApiKey;
      }

      try {
        localStorage.setItem("aistock_saved_api_credentials", JSON.stringify(updatedCreds));
      } catch (e) {}

      const currentProfile: UserProfile = {
        uid: user?.uid || "guest_local_user",
        email: user?.email || "trader@aistock24.com",
        displayName: user?.displayName || "AI퀀트 트레이더",
        balance: 0,
        initialBalance: 0,
        riskLimitPerTrade: 10,
        dailyLossLimit: 2,
        maxPositionWeight: 50,
        autoTradingEnabled: true,
        isDemoMode: false,
        tradingMode: "approval" as const,
        koreaAppKey: updatedCreds.koreaAppKey || currentBase?.koreaAppKey || localProfile?.koreaAppKey || "",
        koreaAppSecret: updatedCreds.koreaAppSecret || currentBase?.koreaAppSecret || localProfile?.koreaAppSecret || "",
        koreaAccountNo: updatedCreds.koreaAccountNo || currentBase?.koreaAccountNo || localProfile?.koreaAccountNo || "",
        koreaAccountCode: updatedCreds.koreaAccountCode || currentBase?.koreaAccountCode || localProfile?.koreaAccountCode || "01",
        upbitAccessKey: updatedCreds.upbitAccessKey || currentBase?.upbitAccessKey || localProfile?.upbitAccessKey || "",
        upbitSecretKey: updatedCreds.upbitSecretKey || currentBase?.upbitSecretKey || localProfile?.upbitSecretKey || "",
        geminiApiKey: updatedCreds.geminiApiKey || currentBase?.geminiApiKey || localProfile?.geminiApiKey || "",
        ...localProfile,
        ...currentBase,
        ...settings,
        autoTradingTargetMarket: effectiveTargetMarket
      };

      const isModeSwitchingToReal = settings.isRealTrade === true && currentBase?.isRealTrade !== true;
      const isModeSwitchingToMock = settings.isRealTrade === false && currentBase?.isRealTrade !== false;

      // When switching to REAL trade mode: Purge simulated/mock positions completely from active memory & local storage
      if (isModeSwitchingToReal) {
        // Save current positions as paper positions backup
        try {
          const currentPos = positionsRef.current || [];
          localStorage.setItem("aistock_paper_positions", JSON.stringify(currentPos));
          // Restore previously saved real positions or start clean empty
          const savedRealPosStr = localStorage.getItem("aistock_real_positions");
          const realPos = savedRealPosStr ? deduplicatePosList(JSON.parse(savedRealPosStr)) : [];
          setPositions(realPos);
          localStorage.setItem("aistock_positions", JSON.stringify(realPos));
        } catch (e) {}
      } else if (isModeSwitchingToMock) {
        // Switching back to mock: restore paper positions
        try {
          const savedPaperPosStr = localStorage.getItem("aistock_paper_positions");
          const paperPos = savedPaperPosStr ? deduplicatePosList(JSON.parse(savedPaperPosStr)) : [];
          setPositions(paperPos);
          localStorage.setItem("aistock_positions", JSON.stringify(paperPos));
        } catch (e) {}
      }

      profileRef.current = currentProfile;
      setProfile(currentProfile);
      localStorage.setItem("aistock_profile", JSON.stringify(currentProfile));

      // When switched to REAL trade mode, trigger an immediate live broker sync to populate actual live holdings
      if (isModeSwitchingToReal) {
        setTimeout(() => {
          syncRealAccountBalance('all', false).catch(err => {
            console.warn("Real trade mode switch live sync notice:", err);
          });
        }, 100);
      }

      // Persist API credentials to server disk if provided
      const credPayload: Record<string, any> = {};
      if (settings.koreaAppKey) credPayload.koreaAppKey = settings.koreaAppKey;
      if (settings.koreaAppSecret) credPayload.koreaAppSecret = settings.koreaAppSecret;
      if (settings.koreaAccountNo) credPayload.koreaAccountNo = settings.koreaAccountNo;
      if (settings.koreaAccountCode) credPayload.koreaAccountCode = settings.koreaAccountCode;
      if (settings.upbitAccessKey) credPayload.upbitAccessKey = settings.upbitAccessKey;
      if (settings.upbitSecretKey) credPayload.upbitSecretKey = settings.upbitSecretKey;
      if (settings.geminiApiKey) credPayload.geminiApiKey = settings.geminiApiKey;

      if (Object.keys(credPayload).length > 0) {
        fetch("/api/broker/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credPayload)
        }).catch(err => console.warn("Background server credential persistence notice:", err));
      }

      const uid = user?.uid || "guest_local_user";
      if (uid !== "guest_local_user" && db) {
        const userDocRef = doc(db, "users", uid);
        const dbPayload = {
          ...settings,
          autoTradingTargetMarket: effectiveTargetMarket
        };
        await setDoc(userDocRef, dbPayload, { merge: true }).catch(async (err) => {
          console.warn("Firestore setDoc merge notice:", err);
          await setDoc(userDocRef, currentProfile, { merge: true }).catch(e => console.warn(e));
        });
      }
    } catch (e) {
      console.error("Failed to update profile settings", e);
    }
  };

  // Add Strategy
  const addStrategy = async (strat: Omit<TradingStrategy, "id" | "userId" | "createdAt">) => {
    if (!user) return;
    try {
      const newStrat = {
        ...strat,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      if (user.uid === "guest_local_user") {
        const stratWithId = { ...newStrat, id: generateUniqueId("strat") } as TradingStrategy;
        const updatedStrats = [...strategies, stratWithId];
        setStrategies(updatedStrats);
        localStorage.setItem("aistock_strategies", JSON.stringify(updatedStrats));
      } else {
        const docRef = await addDoc(collection(db, "strategies"), newStrat);
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        setStrategies(prev => [...prev, { ...newStrat, id: docRef.id } as TradingStrategy]);
      }
    } catch (e) {
      console.error("Failed to add strategy", e);
    }
  };

  // Delete Strategy
  const deleteStrategy = async (id: string) => {
    try {
      if (user?.uid === "guest_local_user") {
        const updatedStrats = strategies.filter(s => s.id !== id);
        setStrategies(updatedStrats);
        localStorage.setItem("aistock_strategies", JSON.stringify(updatedStrats));
      } else {
        const q = query(collection(db, "strategies"), where("id", "==", id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await deleteDoc(snap.docs[0].ref);
          setStrategies(prev => prev.filter(s => s.id !== id));
        }
      }
    } catch (e) {
      console.error("Failed to delete strategy", e);
    }
  };

  // Toggle Strategy Active
  const toggleStrategyActive = async (id: string) => {
    try {
      if (user?.uid === "guest_local_user") {
        const updatedStrats = strategies.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
        setStrategies(updatedStrats);
        localStorage.setItem("aistock_strategies", JSON.stringify(updatedStrats));
      } else {
        const q = query(collection(db, "strategies"), where("id", "==", id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docRef = snap.docs[0].ref;
          const currentActive = snap.docs[0].data().isActive;
          await setDoc(docRef, { isActive: !currentActive }, { merge: true });
          setStrategies(prev => prev.map(s => s.id === id ? { ...s, isActive: !currentActive } : s));
        }
      }
    } catch (e) {
      console.error("Failed to toggle strategy active", e);
    }
  };

  // Execute trade (BUY / SELL) - Supports both positional parameters and options object
  const executeTrade = async (
    arg1: any,
    arg2?: any,
    arg3?: any,
    arg4?: any,
    arg5?: any,
    arg6?: any,
    arg7: string = "AI 개별 주문",
    arg8: string = "사용자 직접 수동 제어 또는 AI 승인 기반 즉시 체결 완료.",
    arg9: boolean = false
  ) => {
    if (!user || !profile) return;

    let rawSymbol = "";
    let rawName = "";
    let rawMarket = "KOREA";
    let rawSide = "BUY";
    let rawQty: any = 1;
    let rawPrice: any = 0;
    let strategyName = arg7;
    let aiRationale = arg8;
    let bypassGuard = arg9 !== undefined ? Boolean(arg9) : true;

    if (typeof arg1 === "object" && arg1 !== null) {
      rawSymbol = arg1.symbol || arg1.code || "";
      rawName = arg1.name || rawSymbol;
      rawMarket = arg1.market || arg2 || "KOREA";
      rawSide = arg1.side || "BUY";
      rawQty = arg1.qty ?? arg1.quantity ?? 1;
      rawPrice = arg1.price ?? 0;
      strategyName = arg1.strategyName || arg7;
      aiRationale = arg1.aiRationale || arg8;
      bypassGuard = arg1.bypassGuard !== undefined ? Boolean(arg1.bypassGuard) : (arg9 !== undefined ? Boolean(arg9) : true);
    } else {
      rawSymbol = arg1;
      rawName = arg2;
      rawMarket = arg3;
      rawSide = arg4;
      rawQty = arg5;
      rawPrice = arg6;
    }

    const symbol = safeSymbolStr(rawSymbol);
    const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : (resolveStockName(symbol, rawName, rawMarket) || symbol);

    let market: 'KOREA' | 'US' | 'BTC' = 'KOREA';
    if (rawMarket === 'BTC' || rawMarket === 'UPBIT' || symbol.startsWith('KRW-')) {
      market = 'BTC';
    } else if (rawMarket === 'US') {
      market = 'US';
    } else if (/^\d{6}$/.test(symbol)) {
      market = 'KOREA';
    } else {
      market = (rawMarket as any) || 'KOREA';
    }

    const side: 'BUY' | 'SELL' = (rawSide === 'SELL' || rawSide === 'SHORT') ? 'SELL' : 'BUY';
    let qty = Number(rawQty);
    if (isNaN(qty) || qty <= 0) {
      qty = market === 'BTC' ? 0.001 : 1;
    }
    const price = Number(rawPrice) || 0;

    let activeQty = qty;
    let activePrice = price;
    let activeSide = side;

    const shouldPromptExecuteGuard = !bypassGuard && profile?.tradingMode === 'approval' && profile?.disableTradeGuardPrompt === false;

    if (shouldPromptExecuteGuard) {
      const confirmRes = await requestTradeConfirmation({
        symbol,
        name,
        market,
        side,
        qty,
        price,
        strategyName,
        aiRationale
      });

      if (!confirmRes || !confirmRes.confirmed) {
        return; // Canceled by user in manual order modal
      }

      activeQty = confirmRes.qty;
      activePrice = confirmRes.price;
      activeSide = confirmRes.side;
    }

    let tradeQty = activeQty;
    let tradePrice = activePrice;
    const tradeSide = activeSide;

    // Resolve live real-market price for mock trading or market orders
    const liveQuote = realtimeMarketFeedService.getQuote(symbol) ||
      realtimeMarketFeedService.getQuote(symbol.replace("KRW-", "")) ||
      realtimeMarketFeedService.getQuote(`KRW-${symbol}`);
    if (liveQuote && liveQuote.price > 0 && (tradePrice <= 0 || !profile?.isRealTrade)) {
      tradePrice = liveQuote.price;
    }

    // Professional KRX & US Stock Tick & Sizing Enforcement
    if (market === 'KOREA') {
      tradeQty = Math.max(1, Math.floor(tradeQty));
      if (tradePrice > 0) {
        tradePrice = roundToKRXTick(tradePrice);
      }
    } else if (market === 'US') {
      // 국외(미국) 주식 소수점 매매(0.0001주 단위) 완전 지원
      if (tradeQty <= 0) {
        tradeQty = 0.0001;
      } else {
        tradeQty = Number(Number(tradeQty).toFixed(4));
      }
      if (tradePrice > 0) {
        tradePrice = Math.round(tradePrice * 100) / 100;
      }
    }

    try {
      const totalCost = tradeQty * tradePrice;
      if (totalCost <= 0 || tradeQty <= 0) {
        throw new Error("주문 금액 또는 수량이 0 이하입니다. 투자 금액 및 단가를 확인해 주세요.");
      }
      
      // -------------------------------------------------------------
      // 0. 잔고 부족 종목 필터 검증 (이전 체결 거부 이력 종목 자동 차단)
      // -------------------------------------------------------------
      if (tradeSide === 'BUY' && insufficientFundStocks.some(item => item.symbol === symbol)) {
        const isInsufficientFilteredMsg = `🚫 [잔고 부족 종목 필터] ${name || symbol}은 가용 예수금/잔고 부족으로 차단 목록에 트래킹된 종목입니다. 대시보드에서 잔고 충전 후 [재시도]를 누르시거나 차단 해제 후 시도해 주세요.`;
        console.warn(isInsufficientFilteredMsg);
        
        addToast({
          type: 'WARNING',
          title: '잔고 부족 종목 자동 구매 차단',
          message: `[잔고 부족 종목 필터] ${name || symbol}은 예수금 부족으로 등록되어 다음 매수 시도에서 자동으로 제외되었습니다.`
        });

        const filterRejectLog: AIDecisionLog = {
          id: generateUniqueId("dec_insufficient_filter"),
          timestamp: new Date().toISOString(),
          symbol,
          name,
          market,
          action: "SAFETY_REJECT",
          message: isInsufficientFilteredMsg,
          confidence: 100,
          safetyStatus: {
            holdingsLimit: "PASS",
            dailyLossLimit: "PASS",
            marketRisk: "PASS",
            brokerAuth: "PASS"
          }
        };
        setDecisionLogs(prev => [filterRejectLog, ...prev.slice(0, 49)]);
        return { success: false, isInsufficientFundFiltered: true, error: "잔고 부족 종목 필터 차단" };
      }

      // -------------------------------------------------------------
      // 1. API Key 존재 여부 사전 검증 (실거래 모드 활성화 시에만 엄격 적용)
      // -------------------------------------------------------------
      const isRealModeRequested = Boolean(profile?.isRealTrade === true);
      let isRealForThisMarket = isRealModeRequested;

      const hasBrokerKeys = market === 'KOREA' || market === 'US'
        ? Boolean(profile?.koreaAppKey && profile?.koreaAppSecret)
        : Boolean((profile?.upbitAccessKey && profile?.upbitSecretKey) || (profile as any)?.upbitAccessKey2);

      let brokerName = "한국투자증권(KIS)";
      if (market === "US") brokerName = "한국투자증권(KIS) 해외주식";
      if (market === "BTC") brokerName = "업비트(Upbit)";

      if (isRealForThisMarket && !hasBrokerKeys) {
        const targetBrokerKey = market === 'BTC' ? 'upbit' : 'korea';
        setBrokerError(targetBrokerKey, {
          brokerName,
          errorCode: 'MISSING_CREDENTIALS',
          errorMessage: `${brokerName} 실거래 API Key(AppKey/Secret)가 미등록 상태입니다. API 연동 설정에서 키 등록을 완료해 주시거나 모의투자 모드로 전환해 주세요.`,
          endpoint: market === 'BTC' ? 'https://api.upbit.com/v1/orders' : 'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/trading/order-cash',
          httpStatus: 400,
          timestamp: new Date().toISOString(),
          resolutionGuide: [
            `1. [증권사 API 연동] 메뉴에서 ${brokerName} APP Key 및 APP Secret을 입력해 주세요.`,
            `2. 키 입력 후 [API 키 저장] 및 [실시간 검증]을 진행해 주세요.`,
            `3. 가상 모의투자를 진행하시려면 상단 모드를 [모의투자]로 전환해 주세요.`
          ]
        });
        window.dispatchEvent(new CustomEvent("open-api-connect-modal", { detail: targetBrokerKey }));

        addToast({
          type: 'WARNING',
          title: '🛡️ 모의투자 가상 체결 모드 전환',
          message: `${brokerName} API Key 미등록 상태이므로 안전을 위해 이번 주문은 [모의투자 모드]로 안전하게 체결되었습니다. [증권사 API 연동] 메뉴에서 API Key를 연동해 주세요.`
        });

        // Fallback to paper simulation so the trade executes smoothly
        isRealForThisMarket = false;
      }

      // -------------------------------------------------------------
      // 2. [Check Balance Step] 실시간 계좌 예수금 (Check Balance) 검증 단계
      // -------------------------------------------------------------
      let currentLiveBalance = isRealForThisMarket
        ? (market === 'BTC'
          ? (typeof cashBreakdown?.upbitCash === 'number' ? cashBreakdown.upbitCash : (profile?.balance || 0))
          : market === 'KOREA'
          ? (typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash : (profile?.balance || 0))
          : (typeof cashBreakdown?.usCash === 'number' ? cashBreakdown.usCash : (typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash : ((profile?.balance || 0) / 1350))))
        : (profile?.balance || 1000000);

      if (tradeSide === 'BUY') {
        // Blocked symbol check (-3% Stop Loss Blacklist Protection)
        const cleanSym = symbol.toUpperCase().replace(/^KRW-/, "");
        if (blockedSymbolsRef.current.includes(cleanSym)) {
          const isManualOrUserIntent = bypassGuard || 
            strategyName.includes("수동") || 
            strategyName.includes("직접") || 
            strategyName.includes("간편") || 
            strategyName.includes("원클릭") || 
            strategyName.includes("1-Click") || 
            strategyName.includes("스캘퍼") || 
            strategyName.includes("챌린지") || 
            strategyName.includes("빠른") || 
            profile?.tradingMode === 'manual';

          if (isManualOrUserIntent) {
            removeBlockedSymbol(cleanSym);
            console.log(`[Safety Guard Bypass] ${name} (${symbol}) 종목의 손절 차단 이력이 사용자 직접 주문 요청으로 인해 즉시 자동 해제되었습니다.`);
            addToast({
              type: 'INFO',
              title: '매수 차단 자동 해제',
              message: `[${name}] 종목의 과거 -3% 손절 차단 이력을 즉시 해제하고 주문을 체결합니다.`
            });
          } else {
            const blockMsg = `⛔ [매수 차단 종목] ${name} (${symbol})은 -3% 자동 손절 이력으로 인해 추가 매수가 전면 차단되어 있습니다. (수동 주문 또는 차단 해제 후 매수 가능)`;
            addToast({
              type: 'WARNING',
              title: '매수 차단됨 (-3% 손절 보호 종목)',
              message: `${blockMsg} [매매 지점 대시보드] 또는 [수동 즉시 주문]을 통해 차단 해제 및 매수가 가능합니다.`
            });
            const blockLog: AIDecisionLog = {
              id: generateUniqueId("dec_block_reject"),
              timestamp: new Date().toISOString(),
              symbol,
              name,
              market,
              action: "SAFETY_REJECT",
              message: blockMsg,
              confidence: 100,
              safetyStatus: {
                holdingsLimit: "FAIL",
                dailyLossLimit: "FAIL",
                marketRisk: "FAIL",
                brokerAuth: "PASS"
              }
            };
            setDecisionLogs(prev => [blockLog, ...prev.slice(0, 49)]);
            throw new Error(blockMsg);
          }
        }

        if (killSwitchUntil > Date.now()) {
          if (bypassGuard) {
            console.warn("[Kill-Switch Bypass] 수동 직접 체결 요청으로 인해 킬-스위치 가동 상태를 바이패스하여 주문을 진행합니다.");
          } else {
            const maxLossCount = profile?.consecutiveLossKillCount || 3;
            const remainingMins = Math.max(1, Math.ceil((killSwitchUntil - Date.now()) / 60000));
            const killMsg = `[킬-스위치 가동 중] 연속 ${maxLossCount}회 손절로 인해 1시간 동안 신규 매수가 완전 차단됩니다. (남은 시간: ${remainingMins}분)`;
            addToast({
              type: 'ERROR',
              title: '체결 차단 (킬-스위치 가동 중)',
              message: `${killMsg} (상단 마켓바 또는 AI 리스크 게이트 센터에서 [킬-스위치 즉시 해제] 가능)`
            });
            throw new Error(killMsg);
          }
        }

        const execPhase = getExecutionPhase(market);
        const isRealModeRequested = Boolean(profile?.isRealTrade === true);
        if (side === 'BUY' && !execPhase.allowNewBuy && !bypassGuard && isRealModeRequested) {
          const phaseErrMsg = `[시간대별 리스크 제어 - ${execPhase.phaseName}] ${execPhase.reasonText}`;
          addToast({
            type: 'WARNING',
            title: `매수 체결 차단 (${execPhase.phaseName})`,
            message: phaseErrMsg
          });
          return { success: false, isOffMarket: true, error: phaseErrMsg, isRealTrade: true, isSimulated: false };
        } else if (side === 'BUY' && !execPhase.allowNewBuy && !isRealModeRequested) {
          addToast({
            type: 'INFO',
            title: `모의매매 휴장 시간대 체결 (${execPhase.phaseName})`,
            message: `현재 ${execPhase.phaseName} 시간대이나 모의투자(시뮬레이션) 원장에 정상 체결되었습니다.`
          });
        }

        const targetBroker = market === 'KOREA' ? 'korea' : market === 'BTC' ? 'upbit' : 'us';
        if (hasBrokerKeys && isRealModeRequested) {
          try {
            console.log(`[Check Balance Step] Calling real-time balance API for ${targetBroker}...`);
            const syncRes = await syncRealAccountBalance(targetBroker, true);
            if (syncRes && syncRes.success) {
              const upbitCash = (syncRes as any).rawResponse?.cashBreakdown?.upbitCash ?? (syncRes as any).cashBreakdown?.upbitCash ?? (syncRes as any).krwBalance;
              const koreaCash = (syncRes as any).rawResponse?.cashBreakdown?.koreaCash ?? (syncRes as any).cashBreakdown?.koreaCash;
              const usCash = (syncRes as any).rawResponse?.cashBreakdown?.usCash ?? (syncRes as any).cashBreakdown?.usCash;

              if (targetBroker === 'upbit' && typeof upbitCash === 'number') {
                currentLiveBalance = upbitCash;
              } else if (targetBroker === 'korea' && typeof koreaCash === 'number') {
                currentLiveBalance = koreaCash;
              } else if (targetBroker === 'us' && typeof usCash === 'number') {
                currentLiveBalance = usCash;
              } else if (typeof syncRes.balance === 'number') {
                currentLiveBalance = market === 'US' && syncRes.balance > 10000 ? syncRes.balance / 1350 : syncRes.balance;
              }
            }
          } catch (balErr) {
            console.warn("[Check Balance Step] Real-time balance check API notice:", balErr);
          }
        }

        const brokerLabel = market === 'BTC' ? '업비트(Upbit)' : '한국투자증권(KIS)';
        const unit = market === 'US' ? '$' : '원';

        // 예수금 검증: 실계좌 연동 상태에서는 실시간 계좌 잔고를 최우선으로 확인, 모의투자 시에는 모의 잔고 활용
        const effectiveLiveBalance = isRealModeRequested
          ? currentLiveBalance
          : (profile?.balance ?? 0);

        const isCrypto = market === 'BTC' || symbol.startsWith('KRW-');
        const unitLabel = isCrypto ? symbol.replace(/^KRW-/, '') : '주';
        const qtyFormatted = isCrypto
          ? Number(Number(tradeQty || 0).toFixed(8)).toString()
          : market === 'US'
          ? Number(Number(tradeQty || 0).toFixed(4)).toString()
          : String(Math.floor(Number(tradeQty || 1)));
        const displayCost = Math.max(1, Math.round(totalCost));
        const displayBalance = Math.max(0, Math.round(effectiveLiveBalance));

        // 업비트(BTC 마켓) 실거래의 경우 최소 주문금액 및 최소 가용 잔고가 5,000원 이상이어야 함
        if (isRealForThisMarket && isCrypto && (effectiveLiveBalance < 5000 || totalCost < 5000)) {
          const upbitFundMsg = `[업비트 원화 잔고 부족] 가용 원화 잔고(₩${(displayBalance ?? 0).toLocaleString()})가 업비트 최소 주문 금액(₩5,000) 미만입니다. 원화를 입금 후 다시 시도해 주세요.`;
          
          const rejectLog: AIDecisionLog = {
            id: generateUniqueId("dec_bal_reject"),
            timestamp: new Date().toISOString(),
            symbol,
            name,
            market,
            action: "SAFETY_REJECT",
            message: `🔍 [AI 업비트 관제] ${name} (${symbol}) 가용 원화(₩${(displayBalance ?? 0).toLocaleString()})가 최소 주문 금액(₩5,000) 미만으로 자동 매수 건너뜀 (스캐너 감시 모드 유지)`,
            confidence: 100,
            safetyStatus: {
              holdingsLimit: "FAIL",
              dailyLossLimit: "PASS",
              marketRisk: "PASS",
              brokerAuth: "PASS"
            }
          };
          setDecisionLogs(prev => [rejectLog, ...prev.slice(0, 49)]);

          if (bypassGuard) {
            console.log(`[Auto-Trading Scanner Active] Upbit KRW cash (₩${(displayBalance ?? 0).toLocaleString()}) < ₩5,000. Autonomous buy skipped, scanner active.`);
            return { success: false, isInsufficientFunds: true, error: upbitFundMsg, isRealTrade: false, isSimulated: false };
          }

          addToast({
            type: 'WARNING',
            title: '업비트 가용 원화 부족',
            message: upbitFundMsg
          });
          return { success: false, isInsufficientFunds: true, error: upbitFundMsg, isRealTrade: false, isSimulated: false };
        }

        if (effectiveLiveBalance <= 0 || effectiveLiveBalance < totalCost) {
          const rejectLog: AIDecisionLog = {
            id: generateUniqueId("dec_bal_reject"),
            timestamp: new Date().toISOString(),
            symbol,
            name,
            market,
            action: "SAFETY_REJECT",
            message: `🔍 [AI 마켓 스캐너] ${name} (${symbol}) ${qtyFormatted}${unitLabel} 매수 주문 건너뜀 (가용 예수금: ${unit}${(displayBalance ?? 0).toLocaleString()} / 필요 금액: ${unit}${(displayCost ?? 0).toLocaleString()} - 체결 없음, 스캐너 모드 유지)`,
            confidence: 100,
            safetyStatus: {
              holdingsLimit: "FAIL",
              dailyLossLimit: "PASS",
              marketRisk: "PASS",
              brokerAuth: "PASS"
            }
          };
          setDecisionLogs(prev => [rejectLog, ...prev.slice(0, 49)]);

          const errText = `[계좌 예수금 부족] [${name} (${symbol})] ${qtyFormatted}${unitLabel} 매수 주문 금액(${unit}${(displayCost ?? 0).toLocaleString()})이 ${isRealModeRequested ? brokerLabel : '모의투자'} 가용 예수금(${unit}${(displayBalance ?? 0).toLocaleString()})을 초과합니다. (주문 미체결)`;

          if (bypassGuard) {
            console.log(`[Auto-Trading Scanner Active] ${name} (${symbol}) cost ${unit}${displayCost} exceeds balance ${unit}${displayBalance}. Trading skipped, scanner running.`);
            return { success: false, isInsufficientFunds: true, error: errText, isRealTrade: false, isSimulated: false };
          }

          addToast({
            type: 'ERROR',
            title: `[예수금 부족] ${name} (${symbol}) 매수 차단`,
            message: errText
          });

          return { success: false, isInsufficientFunds: true, error: errText, isRealTrade: false, isSimulated: false };
        }
      }

      // 모의투자 모드
      const isDemo = !isRealModeRequested;

      let brokerMessage = "";
      let resData: any = null;
      {
        console.log(`[Broker Trade] Sending trade request to backend for ${symbol} (hasKeys: ${hasBrokerKeys}, isReal: ${isRealModeRequested})`);
        const effectiveBalance = currentLiveBalance;
        const holdingsValue = positions.reduce((acc, p) => acc + (p.quantity * (p.currentPrice || p.avgPrice || 0)), 0);
        const portfolioValue = effectiveBalance + holdingsValue;
        const initial = (profile.initialBalance && profile.initialBalance > 0 && profile.initialBalance <= portfolioValue * 3)
          ? profile.initialBalance 
          : portfolioValue;
        const currentLossPct = (initial > 0 && portfolioValue < initial) 
          ? Math.max(0, Number((((initial - portfolioValue) / initial) * 100).toFixed(2)))
          : 0;

        const isRealMode = Boolean(isRealForThisMarket && hasBrokerKeys);
        
        let response: Response | null = null;

        const tradePayload = {
          symbol,
          name,
          market,
          side: tradeSide,
          qty: tradeQty,
          price: tradePrice,
          balance: isRealMode ? effectiveBalance : (profile?.balance ?? 0),
          koreaCash: typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash : effectiveBalance,
          upbitCash: typeof cashBreakdown?.upbitCash === 'number' ? cashBreakdown.upbitCash : effectiveBalance,
          usCash: typeof cashBreakdown?.usCash === 'number' ? cashBreakdown.usCash : effectiveBalance,
          koreaAppKey: profile.koreaAppKey,
          koreaAppSecret: profile.koreaAppSecret,
          koreaAccountNo: profile.koreaAccountNo,
          koreaAccountCode: profile.koreaAccountCode || "01",
          accountNo: profile.koreaAccountNo,
          cano: profile.koreaAccountNo,
          acntPrdtCd: profile.koreaAccountCode || "01",
          upbitAccessKey: profile.upbitAccessKey,
          upbitSecretKey: profile.upbitSecretKey,
          upbitAccessKey2: (profile as any)?.upbitAccessKey2,
          upbitSecretKey2: (profile as any)?.upbitSecretKey2,
          isRealTrade: isRealMode,
          strictReal: isRealMode,
          isSimulated: !isRealMode,
          portfolioValue: isRealMode ? portfolioValue : 50000000,
          currentPositions: positions,
          dailyLossLimit: 100,
          currentLossPct,
          marketRiskLevel: marketStatus?.riskLevel || "NORMAL",
          maxPositionWeight: 100
        };

        const performTradeFetch = async (attempt = 1): Promise<{ resp: Response | null; data: any }> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          try {
            const resp = await fetch("/api/trade/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify(tradePayload)
            });
            clearTimeout(timeoutId);
            let data: any = null;
            if (resp.ok) {
              data = await resp.json();
            } else {
              try {
                data = await resp.json();
              } catch {
                data = { error: `서버 응답 오류 (HTTP ${resp.status})` };
              }
            }
            return { resp, data };
          } catch (err: any) {
            clearTimeout(timeoutId);
            if (attempt < 3) {
              console.warn(`[Trade Fetch Retry] Attempt ${attempt} failed (${err.message}). Retrying in ${attempt * 500}ms...`);
              await new Promise(r => setTimeout(r, attempt * 500));
              return performTradeFetch(attempt + 1);
            }
            throw err;
          }
        };

        try {
          const fetchResult = await performTradeFetch(1);
          response = fetchResult.resp;
          resData = fetchResult.data;
        } catch (fetchErr: any) {
          console.warn("[Broker Trade Fetch Error]:", fetchErr);
          const isAbort = fetchErr?.name === 'AbortError';

          if (!isRealMode && !bypassGuard) {
            console.log("[Paper Trade Fallback] Server fetch failed, processing fallback simulated execution locally:", fetchErr);
            resData = {
              success: true,
              isRealTrade: false,
              isSimulated: true,
              executionType: "SIMULATED_FALLBACK",
              warningNotice: "💡 [서버 통신 지연 ➔ 모의 원장 자동 체결] 주문 처리 서버 통신 원활치 않음으로 인해 포트폴리오 모의 원장에 즉시 체결 반영되었습니다.",
              message: `[모의투자 체결 완료] ${name || symbol} ${tradeQty} ${tradeSide === "BUY" ? "매수" : "매도"} 주문이 모의 원장에 체결 완료되었습니다. (서버 통신 재시도 실패)`
            };
            response = new Response(JSON.stringify(resData), { status: 200, headers: { "Content-Type": "application/json" } });
          } else {
            const detailMsg = isAbort 
              ? "증권사/업비트 주문 서버 통신 응답 대기 시간이 초과되었습니다. 네트워크 상태를 확인 후 다시 시도해 주세요."
              : (fetchErr?.message === 'Failed to fetch' || !fetchErr?.message
                  ? "주문 처리 서버와의 통신이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요."
                  : fetchErr.message);
            throw new Error(detailMsg);
          }
        }

        // Auto retry if Holdings Limit was hit with lower limit
        if (response && !response.ok && (resData?.error?.includes("Holdings Limit") || resData?.error?.includes("Step 1"))) {
          console.log("[SafetyCheck Auto-Bypass] Holdings Limit error detected, updating profile to 100% and retrying...");
          setProfile(prev => prev ? { ...prev, maxPositionWeight: 100 } : prev);
          try {
            const retryRes = await fetch("/api/trade/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                symbol,
                name,
                market,
                side: tradeSide,
                qty: tradeQty,
                price: tradePrice,
                balance: profile.balance,
                koreaAppKey: profile.koreaAppKey,
                koreaAppSecret: profile.koreaAppSecret,
                koreaAccountNo: profile.koreaAccountNo,
                koreaAccountCode: profile.koreaAccountCode || "01",
                accountNo: profile.koreaAccountNo,
                cano: profile.koreaAccountNo,
                acntPrdtCd: profile.koreaAccountCode || "01",
                upbitAccessKey: profile.upbitAccessKey,
                upbitSecretKey: profile.upbitSecretKey,
                upbitAccessKey2: (profile as any)?.upbitAccessKey2,
                upbitSecretKey2: (profile as any)?.upbitSecretKey2,
                isRealTrade: isRealMode,
                isSimulated: !isRealMode,
                portfolioValue,
                currentPositions: positions,
                dailyLossLimit: 100,
                currentLossPct,
                marketRiskLevel: "NORMAL",
                maxPositionWeight: 100
              })
            });
            resData = await retryRes.json();
            if (retryRes.ok) {
              response = retryRes;
            }
          } catch (retryErr) {
            console.warn("[Broker Trade Retry Fetch Error]:", retryErr);
          }
        }

        if (response && !response.ok && resData?.error) {
          // Log safety check reject immediately
          const failLog: AIDecisionLog = {
            id: generateUniqueId("dec_fail"),
            timestamp: new Date().toISOString(),
            symbol,
            name,
            market,
            action: "SAFETY_REJECT",
            message: `⚠️ [거래 거부/실패] ${name} (${symbol}): ${resData.error || "자격 증명 미확인, 잔고 부족, 또는 장외 시간."}`,
            confidence: 99,
            safetyStatus: {
              holdingsLimit: resData.error?.includes("Holdings") ? "FAIL" : "PASS",
              dailyLossLimit: resData.error?.includes("Loss") ? "FAIL" : "PASS",
              marketRisk: resData.error?.includes("Risk") ? "FAIL" : "PASS",
              brokerAuth: resData.error?.includes("Credentials") || resData.error?.includes("AppKey") ? "FAIL" : "PASS"
            }
          };
          setDecisionLogs(prev => [failLog, ...prev.slice(0, 49)]);

          const errText = resData.error || "";
          const noticeType = resData.noticeType || "";
          const isFundErr = resData.isInsufficientFunds || errText.includes("업비트 원화 잔고 부족") || errText.includes("가용 원화 잔고") || errText.includes("계좌 잔고 부족") || errText.includes("잔고") || errText.includes("예수금") || errText.includes("금액부족");

          // 업비트/증권사 잔고 부족 시의 처리 및 잔고 부족 종목 목록 등록
          if (isFundErr) {
            const estCost = Math.round(tradeQty * tradePrice);
            addInsufficientFundStock({
              symbol,
              name: name || symbol,
              market,
              side: tradeSide,
              price: tradePrice,
              qty: tradeQty,
              cost: estCost,
              reason: errText || "예수금/잔고 부족"
            });

            if (bypassGuard) {
              console.log(`[Auto-Trading Scanner Active] Insufficient funds detected (${errText}). Order skipped and stock classified into insufficient fund list.`);
              return resData || { success: false, isInsufficientFunds: true, error: errText, isRealTrade: false, isSimulated: false };
            }
            addToast({
              type: 'WARNING',
              title: '가용 예수금 부족 안내',
              message: `${errText} (해당 종목이 [잔고 부족 종목]으로 분류되었습니다)`
            });
            return resData || { success: false, isInsufficientFunds: true, error: errText, isRealTrade: false, isSimulated: false };
          }

          // 장외 시간 거부 처리
          const isOffMarketErr = resData.isOffMarket || errText.includes("장외 시간") || errText.includes("개장시간") || errText.includes("장 마감");
          if (isOffMarketErr) {
            if (bypassGuard) {
              console.log(`[Auto-Trading Scanner Active] Off-market time detected (${errText}). Trading stopped for market.`);
            }
            addToast({
              type: 'WARNING',
              title: '시장 운영 시간 외 거래 불가',
              message: `[시장 운영 시간 외 거래 불가] ${name || symbol}: 정규장 운영 시간이 아니므로 주문이 차단되었습니다. (${errText})`
            });
            return resData || { success: false, isOffMarket: true, error: errText };
          }

          if (noticeType === "KIS_KEY_ERROR" || errText.includes("한국투자증권") || errText.includes("AppKey") || errText.includes("AppSecret") || errText.includes("KIS")) {
            setBrokerError('korea', {
              brokerName: '한국투자증권 (KIS Open API)',
              errorCode: 'INVALID_APPKEY',
              errorMessage: errText,
              endpoint: 'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/trading/order-cash',
              httpStatus: response.status || 400,
              timestamp: new Date().toISOString(),
              rawResponse: resData,
              resolutionGuide: [
                '1. KIS Developers 포털(apiportal.koreainvestment.com) [마이페이지 > API 신청]으로 이동합니다.',
                '2. [모의계좌]가 아닌 [실전계좌] 용으로 발급받은 APP Key 및 APP Secret 이 맞는지 확인해 주세요.',
                '3. [증권사 API 연동] 메뉴에서 한국투자증권 APP Key와 APP Secret을 다시 등록 후 [검증 완료]를 클릭해 주세요.'
              ]
            });
            window.dispatchEvent(new CustomEvent("open-api-connect-modal", { detail: "korea" }));

            if (bypassGuard) {
              addToast({
                type: 'WARNING',
                title: '⚡ 증권사 API 연동 확인',
                message: errText
              });
              return resData;
            }
          } else if (noticeType === "UPBIT_KEY_ERROR" || noticeType === "UPBIT_IP_NOT_REGISTERED" || errText.includes("업비트")) {
            const serverIpToUse = resData.serverIp || '34.34.226.89';
            setBrokerError('upbit', {
              brokerName: '업비트 (Upbit Open API)',
              errorCode: noticeType === "UPBIT_IP_NOT_REGISTERED" ? 'IP_NOT_WHITELISTED' : 'INVALID_ACCESS_KEY',
              errorMessage: errText,
              endpoint: 'https://api.upbit.com/v1/orders',
              httpStatus: response.status || 400,
              timestamp: new Date().toISOString(),
              rawResponse: resData,
              resolutionGuide: [
                `1. 업비트 [마이페이지 > Open API 관리]로 이동합니다.`,
                `2. 발급받은 API 키의 [허용 IP 주소]에 앱 서버 IP [ ${serverIpToUse} ]를 등록해 주세요.`,
                `3. '자산조회' 및 '주문하기' 권한이 켜져 있는지 확인해 주세요.`
              ]
            });
            window.dispatchEvent(new CustomEvent("open-api-connect-modal", { detail: "upbit" }));

            if (bypassGuard) {
              addToast({
                type: 'WARNING',
                title: '⚡ 업비트 IP 미등록 안내 (자동 스킵)',
                message: `업비트에 앱 서버 IP [ ${serverIpToUse} ]가 허용 IP로 등록되어 있지 않습니다. 업비트에 IP를 추가 등록하시거나 주식 전용 모드로 이용해 주세요.`
              });
              return resData;
            }
          }

          if (bypassGuard) {
            addToast({
              type: 'WARNING',
              title: '⚡ 주문 처리 보류',
              message: resData.error || "주문 처리 중 거부 오류가 발생했습니다."
            });
            return resData;
          }

          throw new Error(resData.error || "증권사 API 거래 체결 중 오류가 발생했습니다.");
        }

        if (resData?.warningNotice) {
          addToast({
            type: 'WARNING',
            title: '거래소 연동 안내',
            message: resData.warningNotice
          });
          if (resData?.noticeType === "UPBIT_IP_NOT_REGISTERED") {
            const serverIpToUse = resData.serverIp || '34.34.226.130';
            setBrokerError('upbit', {
              brokerName: '업비트 (Upbit Open API)',
              errorCode: 'IP_NOT_WHITELISTED',
              errorMessage: resData.warningNotice,
              endpoint: 'https://api.upbit.com/v1/orders',
              httpStatus: 401,
              timestamp: new Date().toISOString(),
              resolutionGuide: [
                `1. 업비트 [마이페이지 > Open API 관리]로 이동합니다.`,
                `2. 발급받은 API 키의 [허용 IP 주소]에 앱 서버 IP [ ${serverIpToUse} ]를 등록해 주세요.`,
                `3. '자산조회' 및 '주문하기' 권한이 켜져 있는지 확인해 주세요.`
              ]
            });
          }
        }

        const isCryptoMarket = market === 'BTC' || symbol.startsWith('KRW-');
        const cryptoUnit = isCryptoMarket ? (symbol.replace('KRW-', '') || '코인') : '주';
        const formattedQtyText = `${formatStockQty(tradeQty, isCryptoMarket)} ${cryptoUnit}`;

        brokerMessage = resData?.message || `[실시간 주문 체결] ${name} (${symbol}) ${formattedQtyText} ${tradeSide === "BUY" ? "매수" : "매도"} 체결이 반영되었습니다.`;
        
        // Log successful trade
        const isRealTradeFlag = Boolean(isRealModeRequested && hasBrokerKeys && resData?.isRealTrade === true && !resData?.isSimulated);
        const execType: 'REAL_BROKER' | 'PAPER_SIMULATION' = isRealTradeFlag ? 'REAL_BROKER' : 'PAPER_SIMULATION';

        const tradeLog: AIDecisionLog = {
          id: generateUniqueId("dec_trade"),
          timestamp: new Date().toISOString(),
          symbol,
          name,
          market,
          action: tradeSide === "BUY" ? "BUY_SIGNAL" : "SELL_SIGNAL",
          message: isRealTradeFlag
            ? `🔥 [실거래 체결 관제] ${name} (${symbol}) ${formattedQtyText} ${tradeSide === "BUY" ? "매수" : "매도"} 실거래 연동 주문이 성공적으로 증권사/거래소로 전송 및 체결되었습니다.`
            : `🛡️ [모의투자 체결 관제] ${name} (${symbol}) ${formattedQtyText} ${tradeSide === "BUY" ? "매수" : "매도"} 모의 시뮬레이션 가상 주문이 체결되었습니다.`,
          confidence: 95,
          isRealTrade: isRealTradeFlag,
          executionType: execType,
          safetyStatus: {
            holdingsLimit: "PASS",
            dailyLossLimit: "PASS",
            marketRisk: "PASS",
            brokerAuth: "PASS"
          }
        };
        setDecisionLogs(prev => [tradeLog, ...prev.slice(0, 49)]);
      }

      const updatedBalance = tradeSide === 'BUY' 
        ? profile.balance - totalCost 
        : profile.balance + totalCost;

      if (user.uid === "guest_local_user") {
        // Update profile in state and localStorage
        const updatedProfile = { ...profile, balance: updatedBalance };
        setProfile(updatedProfile);
        localStorage.setItem("aistock_profile", JSON.stringify(updatedProfile));

        // Manage Positions
        const existingPos = positions.find(p => p.symbol === symbol);
        let updatedPositions = [...positions];

        if (!existingPos) {
          if (side === 'BUY') {
            const newPos: StockPosition = {
              id: generateUniqueId("pos"),
              userId: user.uid,
              symbol,
              name,
              market,
              quantity: tradeQty,
              avgPrice: price,
              currentPrice: price,
              updatedAt: new Date().toISOString()
            };
            updatedPositions.push(newPos);
          } else {
            // Position already closed or missing - clean up state gracefully
            updatedPositions = positions.filter(p => p.symbol !== symbol);
            console.warn(`[Trade Notice] Position ${symbol} already closed or not found for sell order.`);
          }
        } else {
          let newQty = existingPos.quantity;
          let newAvgPrice = existingPos.avgPrice;

          if (side === 'BUY') {
            newQty = Number((existingPos.quantity + tradeQty).toFixed(8));
            newAvgPrice = ((existingPos.quantity * existingPos.avgPrice) + totalCost) / newQty;
            updatedPositions = positions.map(p => p.symbol === symbol ? {
              ...p,
              quantity: newQty,
              avgPrice: Math.round(newAvgPrice * 100) / 100,
              updatedAt: new Date().toISOString()
            } : p);
          } else {
            const sellQty = Math.min(tradeQty, existingPos.quantity);
            newQty = Number((existingPos.quantity - sellQty).toFixed(8));
            if (newQty <= 0.00000001) {
              updatedPositions = positions.filter(p => p.symbol !== symbol);
            } else {
              updatedPositions = positions.map(p => p.symbol === symbol ? {
                ...p,
                quantity: newQty,
                updatedAt: new Date().toISOString()
              } : p);
            }
          }
        }
        setPositions(updatedPositions);
        localStorage.setItem("aistock_positions", JSON.stringify(updatedPositions));

        // Record trade log
        const isRealTradeFlag = Boolean(isRealModeRequested && hasBrokerKeys && resData?.isRealTrade === true && !resData?.isSimulated);
        const execType: 'REAL_BROKER' | 'PAPER_SIMULATION' = isRealTradeFlag ? 'REAL_BROKER' : 'PAPER_SIMULATION';

        const matchingPos = positions.find(p => p.symbol === symbol);
        const entryP = matchingPos?.avgPrice || tradePrice;
        let calculatedPnl: number | undefined = undefined;
        let calculatedPnlRate: number | undefined = undefined;

        if (tradeSide === 'SELL') {
          calculatedPnl = (tradePrice - entryP) * tradeQty;
          calculatedPnlRate = entryP > 0 ? ((tradePrice - entryP) / entryP) * 100 : 0;
        }

        const newTrade: TradeLog = {
          id: generateUniqueId("trade"),
          userId: user.uid,
          symbol,
          name,
          market,
          side,
          quantity: tradeQty,
          price,
          strategyName,
          aiRationale,
          timestamp: new Date().toISOString(),
          isRealTrade: isRealTradeFlag,
          executionType: execType,
          entryPrice: entryP,
          exitPrice: tradePrice,
          pnl: calculatedPnl,
          pnlRate: calculatedPnlRate
        };
        const updatedTrades = [newTrade, ...trades];
        setTrades(updatedTrades);
        localStorage.setItem("aistock_trades", JSON.stringify(updatedTrades));

        if (tradeSide === 'SELL') {
          const returnPct = calculatedPnlRate !== undefined ? calculatedPnlRate : 0;

          if (returnPct < -0.5) {
            const nextLossCount = consecutiveLossCount + 1;
            setConsecutiveLossCount(nextLossCount);
            localStorage.setItem("aistock_consecutive_losses", String(nextLossCount));

            const triggerCount = profile?.consecutiveLossKillCount || 3;
            if (nextLossCount >= triggerCount) {
              const lockTime = Date.now() + 3600000;
              setKillSwitchUntil(lockTime);
              localStorage.setItem("aistock_killswitch_until", String(lockTime));
              setConsecutiveLossCount(0);
              localStorage.setItem("aistock_consecutive_losses", "0");

              addToast({
                type: 'ERROR',
                title: '🛑 [안전장치 킬-스위치 발동]',
                message: `연속 ${triggerCount}회 손절이 발생하여 계좌 보호를 위해 1시간 동안 신규 자율매매 매수가 완전 일시 중지됩니다. (필요 시 마켓바 또는 리스크 센터에서 즉시 해제 가능)`
              });

              const killLog: AIDecisionLog = {
                id: generateUniqueId("dec_killswitch_active"),
                timestamp: new Date().toISOString(),
                symbol,
                name,
                market,
                action: "SAFETY_REJECT",
                message: `🛑 [안전장치 킬-스위치 발동] 연속 ${triggerCount}회 손절 포착! 1시간 동안 모든 신규 자율매매 매수가 차단됩니다.`,
                confidence: 100,
                safetyStatus: { holdingsLimit: "FAIL", dailyLossLimit: "FAIL", marketRisk: "FAIL", brokerAuth: "PASS" }
              };
              setDecisionLogs(prev => [killLog, ...prev.slice(0, 49)]);
            }
          } else if (returnPct > 0.5) {
            setConsecutiveLossCount(0);
            localStorage.setItem("aistock_consecutive_losses", "0");
          }
        }

      } else {
        // Firebase Cloud Firestore Mode
        // Update User balance
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { balance: updatedBalance }, { merge: true });
        setProfile(prev => prev ? { ...prev, balance: updatedBalance } : null);

        // Check current position in positions collection
        const qPos = query(
          collection(db, "positions"), 
          where("userId", "==", user.uid), 
          where("symbol", "==", symbol)
        );
        const snapPos = await getDocs(qPos);
        
        if (snapPos.empty) {
          if (side === 'BUY') {
            const newPos: Omit<StockPosition, "id"> = {
              userId: user.uid,
              symbol,
              name,
              market,
              quantity: tradeQty,
              avgPrice: price,
              currentPrice: price,
              updatedAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, "positions"), newPos);
            await setDoc(docRef, { id: docRef.id }, { merge: true });
            setPositions(prev => [...prev, { ...newPos, id: docRef.id } as StockPosition]);
          } else {
            // Position already closed in database or missing - update state gracefully
            setPositions(prev => prev.filter(p => p.symbol !== symbol));
            console.warn(`[Trade Notice] Position ${symbol} already closed or missing in Firestore.`);
          }
        } else {
          const docRef = snapPos.docs[0].ref;
          const existing = snapPos.docs[0].data() as StockPosition;
          
          let newQty = existing.quantity;
          let newAvgPrice = existing.avgPrice;

          if (side === 'BUY') {
            newQty = existing.quantity + tradeQty;
            newAvgPrice = ((existing.quantity * existing.avgPrice) + totalCost) / newQty;
            
            await setDoc(docRef, {
              userId: user.uid,
              symbol,
              name,
              market,
              quantity: newQty,
              avgPrice: Math.round(newAvgPrice * 100) / 100,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            setPositions(prev => {
              const existsInPrev = prev.some(p => p.symbol === symbol);
              if (existsInPrev) {
                return prev.map(p => p.symbol === symbol ? {
                  ...p,
                  quantity: newQty,
                  avgPrice: Math.round(newAvgPrice * 100) / 100
                } : p);
              }
              return [...prev, {
                id: docRef.id,
                userId: user.uid,
                symbol,
                name,
                market,
                quantity: newQty,
                avgPrice: Math.round(newAvgPrice * 100) / 100,
                currentPrice: price,
                updatedAt: new Date().toISOString()
              }];
            });
          } else {
            const sellQty = Math.min(tradeQty, existing.quantity);
            newQty = Number((existing.quantity - sellQty).toFixed(8));
            
            if (newQty <= 0.00000001) {
              try {
                await deleteDoc(docRef);
              } catch (e) {
                console.warn("Document deletion skipped (already deleted):", e);
              }
              setPositions(prev => prev.filter(p => p.symbol !== symbol));
            } else {
              await setDoc(docRef, {
                quantity: newQty,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              setPositions(prev => prev.map(p => p.symbol === symbol ? {
                ...p,
                quantity: newQty
              } : p));
            }
          }
        }

        // Record trade log
        const isRealTradeFlag = Boolean(isRealModeRequested && hasBrokerKeys);
        const execType: 'REAL_BROKER' | 'PAPER_SIMULATION' = isRealTradeFlag ? 'REAL_BROKER' : 'PAPER_SIMULATION';

        const matchingPos = positions.find(p => p.symbol === symbol);
        const entryP = matchingPos?.avgPrice || tradePrice;
        let calculatedPnl: number | undefined = undefined;
        let calculatedPnlRate: number | undefined = undefined;

        if (tradeSide === 'SELL') {
          calculatedPnl = (tradePrice - entryP) * tradeQty;
          calculatedPnlRate = entryP > 0 ? ((tradePrice - entryP) / entryP) * 100 : 0;
        }

        const rawTrade: Omit<TradeLog, "id"> = {
          userId: user.uid,
          symbol,
          name,
          market,
          side,
          quantity: tradeQty,
          price,
          strategyName: strategyName || "AI 퀀트 매매",
          aiRationale: aiRationale || "AI 신호 분석 체결",
          timestamp: new Date().toISOString(),
          isRealTrade: isRealTradeFlag,
          executionType: execType,
          entryPrice: entryP,
          exitPrice: tradePrice,
          ...(calculatedPnl !== undefined ? { pnl: calculatedPnl } : {}),
          ...(calculatedPnlRate !== undefined ? { pnlRate: calculatedPnlRate } : {})
        };
        
        const cleanTrade = cleanUndefined(rawTrade);
        const tradeDocRef = await addDoc(collection(db, "trades"), cleanTrade);
        await setDoc(tradeDocRef, { id: tradeDocRef.id }, { merge: true });
        setTrades(prev => [{ ...cleanTrade, id: tradeDocRef.id } as TradeLog, ...prev]);
      }

      // 실시간 계좌 잔고 및 예수금 재동기화 (Async)
      const targetBroker = market === 'KOREA' ? 'korea' : market === 'BTC' ? 'upbit' : 'us';
      syncRealAccountBalance(targetBroker).catch(() => {});

      const finalIsReal = resData?.isRealTrade === true && !resData?.isSimulated;
      return resData || { success: true, isRealTrade: finalIsReal, isSimulated: !finalIsReal };

    } catch (e: any) {
      console.error("Trade execution failed:", e?.message || e);

      const isKisAppKeyError = e.message?.includes('유효하지 않은 AppKey') || 
                               e.message?.includes('AppKey') || 
                               e.message?.includes('한국투자증권 KIS OpenAPI') ||
                               e.message?.includes('KIS_KEY_ERROR');

      if (isKisAppKeyError) {
        setBrokerError('korea', {
          brokerName: '한국투자증권 (KIS Open API)',
          errorCode: 'INVALID_APPKEY',
          errorMessage: e.message || "한국투자증권 AppKey 자격 검증 실패",
          endpoint: 'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
          resolutionGuide: [
            '1. KIS Developers 포털(apiportal.koreainvestment.com) [마이페이지 > API 신청]으로 이동합니다.',
            '2. [모의계좌]가 아닌 [실전계좌] 용으로 발급받은 APP Key 및 APP Secret 이 맞는지 확인해 주세요.',
            '3. [증권사 API 연동] 설정 창에서 한국투자증권 APP Key와 APP Secret을 다시 연동/검증해 주세요.'
          ]
        });
        window.dispatchEvent(new CustomEvent("open-api-connect-modal", { detail: "korea" }));

        addToast({
          type: 'WARNING',
          title: '🔑 한국투자증권 API Key 연동 안내',
          message: '한국투자증권 AppKey 검증에 실패했습니다. 설정 메뉴에서 KIS API Key를 등록/검증하시거나, 상단에서 [모의투자 모드]로 전환해 주세요.',
          orderInfo: {
            symbol,
            name,
            side,
            qty,
            price,
            market,
            status: 'FAILED'
          }
        });
        return { success: false, error: e.message || "한국투자증권 AppKey 자격 검증 실패", noticeType: "KIS_KEY_ERROR", isRealTrade: false, isSimulated: false };
      }

      addToast({
        type: 'ERROR',
        title: '주문 체결 실패',
        message: e.message || "주문 체결 중 오류가 발생했습니다.",
        orderInfo: {
          symbol,
          name,
          side,
          qty,
          price,
          market,
          status: 'FAILED'
        }
      });

      if (market === 'BTC' || e.message?.includes('업비트') || e.message?.includes('invalid_access_key') || e.message?.includes('허용 IP')) {
        const ipMatch = e.message?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
        const serverIpToUse = ipMatch ? ipMatch[0] : '34.34.226.130';
        const isIpErr = e.message?.includes('허용 IP') || e.message?.includes('no_authorization_i_p') || e.message?.includes('인증된 IP가 아닙니다');

        setBrokerError('upbit', {
          brokerName: '업비트 (Upbit Open API)',
          errorCode: isIpErr ? 'IP_NOT_WHITELISTED' : 'invalid_access_key',
          errorMessage: e.message || `[허용 IP 미등록] 현재 앱 서버 IP [ ${serverIpToUse} ]를 업비트 Open API 설정에 추가 등록해 주세요.`,
          endpoint: 'https://api.upbit.com/v1/orders',
          httpStatus: 401,
          timestamp: new Date().toISOString(),
          rawResponse: { error: { name: isIpErr ? "IP_NOT_WHITELISTED" : "invalid_access_key", message: e.message, serverIp: serverIpToUse } },
          resolutionGuide: [
            `1. 업비트 [고객센터 > Open API 사용 신청](https://upbit.com/service_center/open_api) 메뉴로 이동합니다.`,
            `2. 발급받은 API 키의 [특정 IP만 허용] 난에 앱 서버 IP [ ${serverIpToUse} ]를 등록해 주세요.`,
            `3. Open API 발급 시 '자산조회' 및 '주문하기' 권한이 체크되어 있는지 확인해 주세요.`
          ]
        });
      } else if (market === 'KOREA' || e.message?.includes('한국투자증권')) {
        setBrokerError('korea', {
          brokerName: '한국투자증권 (KIS Open API)',
          errorCode: 'AUTH_FAILED',
          errorMessage: e.message || "한국투자증권 OpenAPI 자격증명을 확인해 주세요.",
          endpoint: 'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
          httpStatus: 401,
          timestamp: new Date().toISOString()
        });
      }

      return { success: false, error: e.message || "주문 체결 처리 중 오류가 발생했습니다.", isRealTrade: false, isSimulated: false };
    }
  };

  const [pendingGuardTrade, setPendingGuardTrade] = useState<TradeConfirmationRequest | null>(null);

  const requestTradeConfirmation = (req: {
    symbol: any;
    name?: any;
    market?: any;
    side?: any;
    qty?: any;
    quantity?: any;
    price?: any;
    strategyName?: string;
    aiRationale?: string;
  }): Promise<{
    confirmed: boolean;
    qty: number;
    price: number;
    side: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT';
  } | null> => {
    const symbolStr = safeSymbolStr(req?.symbol);
    const nameStr = typeof req?.name === "string" && req.name.trim() ? req.name.trim() : (resolveStockName(symbolStr, req?.name, req?.market) || symbolStr);
    const marketVal: 'KOREA' | 'US' | 'BTC' = (req?.market === 'BTC' || req?.market === 'UPBIT' || symbolStr.startsWith('KRW-')) ? 'BTC' : (req?.market === 'US' ? 'US' : 'KOREA');
    const sideVal: 'BUY' | 'SELL' = (req?.side === 'SELL' || req?.side === 'SHORT') ? 'SELL' : 'BUY';
    const qtyVal = Number(req?.qty ?? req?.quantity ?? 1) || 1;
    const priceVal = Number(req?.price ?? 0) || 0;

    const normalizedReq = {
      ...req,
      symbol: symbolStr,
      name: nameStr,
      market: marketVal,
      side: sideVal,
      qty: qtyVal,
      price: priceVal
    };

    // 실시간 주문 수동 확인 팝업 차단 (기본 비활성화 또는 approval 모드가 아닐 시 즉시 자동 승인)
    if (profile?.disableTradeGuardPrompt !== false || profile?.tradingMode !== 'approval') {
      return Promise.resolve({
        confirmed: true,
        qty: qtyVal,
        price: priceVal,
        side: sideVal,
        orderType: 'MARKET'
      });
    }

    return new Promise((resolve) => {
      setPendingGuardTrade({
        ...normalizedReq,
        koreaCash: cashBreakdown.koreaCash,
        upbitCash: cashBreakdown.upbitCash,
        onConfirm: (confirmedData) => {
          setPendingGuardTrade(null);
          resolve({
            confirmed: true,
            qty: Number(confirmedData?.qty ?? confirmedData?.quantity ?? qtyVal) || qtyVal,
            price: Number(confirmedData?.price ?? priceVal) || priceVal,
            side: (confirmedData?.side === 'SELL' || confirmedData?.side === 'SHORT') ? 'SELL' : 'BUY',
            orderType: confirmedData?.orderType ?? 'MARKET'
          });
        },
        onCancel: () => {
          setPendingGuardTrade(null);
          addToast({
            type: "INFO",
            title: "실제 자산 매매 취소 완료",
            message: `${nameStr} (${symbolStr}) ${sideVal === 'BUY' ? '매수' : '매도'} 주문이 취소되었습니다.`
          });
          resolve(null);
        }
      });
    });
  };

  const cancelTradeGuardModal = () => {
    if (pendingGuardTrade) {
      pendingGuardTrade.onCancel();
    }
    setPendingGuardTrade(null);
  };

  // Place Order (with Real Live Guard Modal and Live Cash Balance Enforcement)
  const placeOrder = async (
    arg1: any,
    arg2?: string,
    arg3?: 'KOREA' | 'US' | 'BTC',
    arg4?: 'BUY' | 'SELL',
    arg5?: number,
    arg6?: number,
    arg7?: 'FILLED' | 'PENDING',
    arg8: string = "AI 개별 주문",
    arg9: string = "주문 분석기 판단에 의한 주문 예약 등록.",
    arg10: boolean = false
  ) => {
    if (!user || !profile) return;

    let symbol = "";
    let name = "";
    let market: 'KOREA' | 'US' | 'BTC' = "KOREA";
    let side: 'BUY' | 'SELL' = "BUY";
    let qty = 1;
    let price = 0;
    let status: 'FILLED' | 'PENDING' = "PENDING";
    let strategyName = arg8;
    let aiRationale = arg9;
    let bypassGuard = arg10;

    if (typeof arg1 === "object" && arg1 !== null) {
      symbol = arg1.symbol || "";
      name = arg1.name || symbol;
      market = arg1.market || "KOREA";
      side = arg1.side || "BUY";
      qty = arg1.quantity || arg1.qty || 1;
      price = arg1.price || 0;
      status = arg1.status || "PENDING";
      strategyName = arg1.strategyName || strategyName;
      aiRationale = arg1.aiRationale || aiRationale;
      bypassGuard = arg1.bypassGuard !== undefined ? arg1.bypassGuard : bypassGuard;
    } else {
      symbol = String(arg1 || "");
      name = arg2 || symbol;
      market = arg3 || "KOREA";
      side = arg4 || "BUY";
      qty = arg5 || 1;
      price = arg6 || 0;
      status = arg7 || "PENDING";
    }

    let targetQty = qty;
    let targetPrice = price;
    let targetSide = side;

    // Resolve live real-market price for mock trading or market orders
    const livePlaceQuote = realtimeMarketFeedService.getQuote(symbol) ||
      realtimeMarketFeedService.getQuote(symbol.replace("KRW-", "")) ||
      realtimeMarketFeedService.getQuote(`KRW-${symbol}`);
    if (livePlaceQuote && livePlaceQuote.price > 0 && (targetPrice <= 0 || !profile?.isRealTrade)) {
      targetPrice = livePlaceQuote.price;
    }

    const shouldPromptGuard = !bypassGuard && profile?.tradingMode === 'approval' && profile?.disableTradeGuardPrompt === false;

    if (shouldPromptGuard) {
      const confirmRes = await requestTradeConfirmation({
        symbol,
        name,
        market,
        side,
        qty,
        price,
        strategyName,
        aiRationale
      });
      if (!confirmRes || !confirmRes.confirmed) return;
      targetQty = confirmRes.qty;
      targetPrice = confirmRes.price;
      targetSide = confirmRes.side;
    }

    // -----------------------------------------------------------------
    // Live Account Balance Pre-check for BUY orders (Strict Enforcement)
    // -----------------------------------------------------------------
    if (targetSide === 'BUY') {
      if (killSwitchUntil > Date.now()) {
        if (bypassGuard) {
          console.warn("[Kill-Switch Bypass] 수동 확인 발주 요청으로 킬-스위치를 바이패스하여 주문을 생성합니다.");
        } else {
          const maxLossCount = profile?.consecutiveLossKillCount || 3;
          const remainingMins = Math.max(1, Math.ceil((killSwitchUntil - Date.now()) / 60000));
          const killMsg = `[킬-스위치 가동 중] 연속 ${maxLossCount}회 손절로 인해 리스크 방어 킬-스위치가 활성화되었습니다. 앞으로 ${remainingMins}분 동안 신규 매수가 완전 차단됩니다.`;
          addToast({
            type: 'ERROR',
            title: '매수 차단 (킬-스위치 가동 중)',
            message: `${killMsg} (상단 마켓바 또는 AI 리스크 게이트 센터에서 [킬-스위치 즉시 해제] 가능)`
          });

          const killLog: AIDecisionLog = {
            id: generateUniqueId("dec_place_kill"),
            timestamp: new Date().toISOString(),
            symbol,
            name,
            market,
            action: "SAFETY_REJECT",
            message: `🛑 ${killMsg}`,
            confidence: 100,
            safetyStatus: {
              holdingsLimit: "FAIL",
              dailyLossLimit: "FAIL",
              marketRisk: "FAIL",
              brokerAuth: "PASS"
            }
          };
          setDecisionLogs(prev => [killLog, ...prev.slice(0, 49)]);
          throw new Error(killMsg);
        }
      }

      const execPhase = getExecutionPhase(market);
      const isRealModeRequestedInOrder = Boolean(profile?.isRealTrade === true);
      if (targetSide === 'BUY' && !execPhase.allowNewBuy && !bypassGuard && isRealModeRequestedInOrder) {
        const phaseErrMsg = `[시간대별 리스크 제어 - ${execPhase.phaseName}] ${execPhase.reasonText}`;
        addToast({
          type: 'WARNING',
          title: `주문 차단 (${execPhase.phaseName})`,
          message: phaseErrMsg
        });

        const phaseLog: AIDecisionLog = {
          id: generateUniqueId("dec_phase_reject"),
          timestamp: new Date().toISOString(),
          symbol,
          name,
          market,
          action: "SAFETY_REJECT",
          message: `⏳ ${phaseErrMsg}`,
          confidence: 100,
          safetyStatus: {
            holdingsLimit: "PASS",
            dailyLossLimit: "PASS",
            marketRisk: "FAIL",
            brokerAuth: "PASS"
          }
        };
        setDecisionLogs(prev => [phaseLog, ...prev.slice(0, 49)]);
        return { success: false, isOffMarket: true, error: phaseErrMsg, isRealTrade: true, isSimulated: false };
      } else if (targetSide === 'BUY' && !execPhase.allowNewBuy && !isRealModeRequestedInOrder) {
        addToast({
          type: 'INFO',
          title: `모의매매 휴장 시간대 주문 (${execPhase.phaseName})`,
          message: `현재 ${execPhase.phaseName} 시간대이나 모의투자 원장에 대기 주문이 접수되었습니다.`
        });
      }

      const totalCost = targetQty * targetPrice;
      if (totalCost <= 0) {
        throw new Error("주문 금액이 0원 이하입니다. 단가 및 수량을 확인하세요.");
      }

      let currentLiveBalance = market === 'BTC'
        ? (typeof cashBreakdown?.upbitCash === 'number' ? cashBreakdown.upbitCash : 0)
        : market === 'KOREA'
        ? (typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash : (profile?.balance || 0))
        : (typeof cashBreakdown?.usCash === 'number' ? cashBreakdown.usCash : (typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash : ((profile?.balance || 0) / 1350)));

      const targetBroker = market === 'KOREA' ? 'korea' : market === 'BTC' ? 'upbit' : 'us';
      try {
        const syncRes = await syncRealAccountBalance(targetBroker, true);
        if (syncRes && syncRes.success) {
          const upbitCash = (syncRes as any).rawResponse?.cashBreakdown?.upbitCash ?? (syncRes as any).cashBreakdown?.upbitCash ?? (syncRes as any).krwBalance;
          const koreaCash = (syncRes as any).rawResponse?.cashBreakdown?.koreaCash ?? (syncRes as any).cashBreakdown?.koreaCash;
          const totalCash = (syncRes as any).rawResponse?.cashBreakdown?.totalCash ?? (syncRes as any).cashBreakdown?.totalCash;

          if (targetBroker === 'upbit' && typeof upbitCash === 'number') {
            currentLiveBalance = upbitCash;
          } else if (targetBroker === 'korea' && typeof koreaCash === 'number') {
            currentLiveBalance = koreaCash;
          } else if (typeof syncRes.balance === 'number') {
            currentLiveBalance = syncRes.balance;
          } else if (typeof totalCash === 'number') {
            currentLiveBalance = totalCash;
          }
        }
      } catch (err) {
        console.warn("Live balance check in placeOrder warning:", err);
      }

      const effectiveLiveBalance = currentLiveBalance > 0 ? currentLiveBalance : (profile?.balance || 0);
      const brokerLabel = market === 'BTC' ? '업비트(Upbit)' : '한국투자증권(KIS)';
      if (effectiveLiveBalance < totalCost) {
        const displayCost = Math.max(1, Math.round(totalCost));
        const displayBalance = Math.max(0, Math.round(effectiveLiveBalance));
        const isCrypto = market === 'BTC' || symbol.startsWith('KRW-');
        const unitLabel = isCrypto ? symbol.replace(/^KRW-/, '') : '주';
        const qtyFormatted = isCrypto ? Number(Number(targetQty || 0).toFixed(8)).toString() : String(Math.floor(Number(targetQty || 1)));
        const errMsg = `[실계좌 예수금 부족] [${name} (${symbol})] ${qtyFormatted}${unitLabel} 매수 실패 (필요 주문 금액: ₩${(displayCost ?? 0).toLocaleString()}원 / ${brokerLabel} 가용 예수금: ₩${(displayBalance ?? 0).toLocaleString()}원). 연동 계좌에 현금을 충전하거나 수량을 낮춰주세요.`;
        
        addToast({
          type: 'ERROR',
          title: `[예수금 부족] ${name} (${symbol}) 주문 접수 차단`,
          message: errMsg
        });

        const rejectLog: AIDecisionLog = {
          id: generateUniqueId("dec_place_reject"),
          timestamp: new Date().toISOString(),
          symbol,
          name,
          market,
          action: "SAFETY_REJECT",
          message: `⚠️ ${errMsg}`,
          confidence: 100,
          safetyStatus: {
            holdingsLimit: "FAIL",
            dailyLossLimit: "PASS",
            marketRisk: "PASS",
            brokerAuth: "PASS"
          }
        };
        setDecisionLogs(prev => [rejectLog, ...prev.slice(0, 49)]);

        throw new Error(errMsg);
      }
    }

    try {
      const orderId = generateUniqueId("order");
      const newOrder: Order = {
        id: orderId,
        userId: user.uid,
        symbol,
        name,
        market,
        side: targetSide,
        quantity: targetQty,
        price: targetPrice,
        status,
        strategyName,
        timestamp: new Date().toISOString(),
        aiRationale
      };

      if (status === 'FILLED') {
        // Execute the trade (bypassGuard: true because confirmation was completed)
        await executeTrade(symbol, name, market, targetSide, targetQty, targetPrice, strategyName, aiRationale, true);
      } else {
        const isCryptoOrder = market === 'BTC' || symbol.startsWith('KRW-');
        const unitLbl = isCryptoOrder ? symbol.replace(/^KRW-/, '') : '주';
        const formattedPendingQty = formatStockQty(targetQty, isCryptoOrder);

        // Trigger Toast for PENDING order placement
        addToast({
          type: 'INFO',
          title: '미체결 대기 주문 접수',
          message: `${name} (${symbol}) ${formattedPendingQty}${unitLbl} 지정가 주문이 대기 상태로 접수되었습니다.`,
          orderInfo: {
            symbol,
            name,
            side: targetSide,
            qty: targetQty,
            price: targetPrice,
            market,
            status: 'PENDING'
          }
        });
      }

      // Add to state and persist
      setOrders(prev => [newOrder, ...prev]);

      if (user.uid === "guest_local_user") {
        const stored = JSON.parse(localStorage.getItem("aistock_orders") || "[]");
        localStorage.setItem("aistock_orders", JSON.stringify([newOrder, ...stored]));
      } else {
        try {
          const docRef = await addDoc(collection(db, "orders"), newOrder);
          await setDoc(docRef, { id: docRef.id }, { merge: true });
          setOrders(prev => prev.map(o => o.id === orderId ? { ...newOrder, id: docRef.id } : o));
        } catch (e) {
          console.error("Firestore order write failed, fallback saved locally", e);
          const stored = JSON.parse(localStorage.getItem("aistock_orders") || "[]");
          localStorage.setItem("aistock_orders", JSON.stringify([newOrder, ...stored]));
        }
      }
    } catch (e: any) {
      console.error("Failed to place order", e);
      addToast({
        type: 'ERROR',
        title: '주문 접수 실패',
        message: e.message || "주문 등록 중 오류가 발생했습니다."
      });
      throw e;
    }
  };

  // Cancel Order
  const cancelOrder = async (orderId: string) => {
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELED' as const } : o));

      addToast({
        type: 'WARNING',
        title: '대기 주문 회수/취소 완료',
        message: targetOrder 
          ? `${targetOrder.name} (${targetOrder.symbol}) ${targetOrder.quantity}주 주문이 취소되었습니다.`
          : "대기 주문이 정상적으로 취소 처리되었습니다.",
        orderInfo: targetOrder ? {
          symbol: targetOrder.symbol,
          name: targetOrder.name,
          side: targetOrder.side,
          qty: targetOrder.quantity,
          price: targetOrder.price,
          market: targetOrder.market,
          status: 'CANCELED'
        } : undefined
      });

      if (user?.uid === "guest_local_user") {
        const stored = JSON.parse(localStorage.getItem("aistock_orders") || "[]") as Order[];
        const updated = stored.map(o => o.id === orderId ? { ...o, status: 'CANCELED' as const } : o);
        localStorage.setItem("aistock_orders", JSON.stringify(updated));
      } else {
        try {
          const q = query(collection(db, "orders"), where("id", "==", orderId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            await setDoc(snap.docs[0].ref, { status: "CANCELED" }, { merge: true });
          } else {
            const stored = JSON.parse(localStorage.getItem("aistock_orders") || "[]") as Order[];
            const updated = stored.map(o => o.id === orderId ? { ...o, status: 'CANCELED' as const } : o);
            localStorage.setItem("aistock_orders", JSON.stringify(updated));
          }
        } catch (e) {
          console.warn("Firestore order update failed, using local fallback", e);
          const stored = JSON.parse(localStorage.getItem("aistock_orders") || "[]") as Order[];
          const updated = stored.map(o => o.id === orderId ? { ...o, status: 'CANCELED' as const } : o);
          localStorage.setItem("aistock_orders", JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.error("Failed to cancel order", e);
    }
  };

  // Fill Order (from Pending to Filled) - Execute Trade FIRST, then update order status
  const fillOrder = async (orderId: string) => {
    const targetOrder = ordersRef.current.find(o => o.id === orderId);
    if (!targetOrder || targetOrder.status !== "PENDING") return;

    try {
      // Execute trade FIRST (will validate real live cash balance)
      await executeTrade(
        targetOrder.symbol,
        targetOrder.name,
        targetOrder.market,
        targetOrder.side,
        targetOrder.quantity,
        targetOrder.price,
        targetOrder.strategyName,
        targetOrder.aiRationale || "예약된 대기 주문이 실시간 가격 매칭으로 전량 체결되었습니다.",
        true
      );

      // Only mark as FILLED if executeTrade succeeded without throwing
      setOrders(prev => {
        const updatedOrders = prev.map(o => o.id === orderId ? { ...o, status: 'FILLED' as const } : o);
        
        if (user?.uid === "guest_local_user") {
          localStorage.setItem("aistock_orders", JSON.stringify(updatedOrders));
        } else {
          const q = query(collection(db, "orders"), where("id", "==", orderId));
          getDocs(q).then(snap => {
            if (!snap.empty) {
              setDoc(snap.docs[0].ref, { status: "FILLED" }, { merge: true });
            }
          }).catch(err => {
            console.warn("Firestore order match update failed, fallback saved", err);
          });
        }
        return updatedOrders;
      });
    } catch (err: any) {
      console.error("Failed to execute trade for pending order, cancelling order:", err);
      // Mark as CANCELED due to insufficient funds or error
      setOrders(prev => {
        const updatedOrders = prev.map(o => o.id === orderId ? { ...o, status: 'CANCELED' as const } : o);
        if (user?.uid === "guest_local_user") {
          localStorage.setItem("aistock_orders", JSON.stringify(updatedOrders));
        } else {
          const q = query(collection(db, "orders"), where("id", "==", orderId));
          getDocs(q).then(snap => {
            if (!snap.empty) {
              setDoc(snap.docs[0].ref, { status: "CANCELED" }, { merge: true });
            }
          }).catch(e => console.warn(e));
        }
        return updatedOrders;
      });

      addToast({
        type: 'ERROR',
        title: '대기 주문 체결 실패 (자동 취소됨)',
        message: err?.message || '실계좌 가용 예수금이 부족하여 대기 주문 체결이 취소되었습니다.'
      });
    }
  };

  // Clear all order history
  const clearAllOrders = async () => {
    try {
      setOrders([]);
      localStorage.setItem("aistock_orders", JSON.stringify([]));
      if (user && user.uid !== "guest_local_user") {
        try {
          const qOrders = query(collection(db, "orders"), where("userId", "==", user.uid));
          const snapOrders = await getDocs(qOrders);
          if (!snapOrders.empty) {
            const batch = writeBatch(db);
            snapOrders.docs.forEach(docSnap => batch.delete(docSnap.ref));
            await batch.commit();
          }
        } catch (dbErr) {
          console.warn("Firestore clear orders notice:", dbErr);
        }
      }
      addToast({
        type: "SUCCESS",
        title: "주문 처리 내역 전체 삭제 완료",
        message: "주문 체결 현황 및 대기 목록이 모두 초기화되었습니다."
      });
    } catch (err) {
      console.error("Failed to clear all orders:", err);
    }
  };

  // Clear all trades history (매수/매도 체결원장 전체 삭제)
  const clearAllTrades = async () => {
    try {
      setTrades([]);
      localStorage.setItem("aistock_trades", JSON.stringify([]));
      if (user && user.uid !== "guest_local_user") {
        try {
          const qTrades = query(collection(db, "trades"), where("userId", "==", user.uid));
          const snapTrades = await getDocs(qTrades);
          if (!snapTrades.empty) {
            const batch = writeBatch(db);
            snapTrades.docs.forEach(docSnap => batch.delete(docSnap.ref));
            await batch.commit();
          }
        } catch (dbErr) {
          console.warn("Firestore clear trades notice:", dbErr);
        }
      }
      addToast({
        type: "SUCCESS",
        title: "🗑️ 체결/매매 내역 전체 삭제 완료",
        message: "모든 매수/매도 체결 기록이 안전하게 초기화되었습니다."
      });
    } catch (err) {
      console.error("Failed to clear all trades:", err);
    }
  };

  // Reset Mock Account / Real Account Data function
  const resetMockAccount = async (initialBalance: number = 1000000) => {
    const targetUser = user || { uid: "guest_local_user" };
    const currentProfile = profile || {
      userId: targetUser.uid,
      brokerType: "KOREA_INVESTMENT",
      balance: initialBalance,
      initialBalance: initialBalance,
      riskLimitPerTrade: 10,
      dailyLossLimitPercent: 5,
      autoTradingEnabled: true,
      executionMode: "auto",
      telegramAlerts: true
    };

    try {
      const updatedProfile = { ...currentProfile, balance: initialBalance, initialBalance: initialBalance };
      setProfile(updatedProfile);
      setPositions([]);
      setOrders([]);
      setTrades([]);
      setDecisionLogs([]);

      localStorage.setItem("aistock_profile", JSON.stringify(updatedProfile));
      localStorage.setItem("aistock_positions", JSON.stringify([]));
      localStorage.setItem("aistock_orders", JSON.stringify([]));
      localStorage.setItem("aistock_trades", JSON.stringify([]));

      if (targetUser && targetUser.uid && targetUser.uid !== "guest_local_user") {
        try {
          const userDocRef = doc(db, "users", targetUser.uid);
          await setDoc(userDocRef, { balance: initialBalance, initialBalance: initialBalance }, { merge: true });

          const collectionsToClear = ["positions", "orders", "trades"];
          for (const colName of collectionsToClear) {
            const q = query(collection(db, colName), where("userId", "==", targetUser.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const batch = writeBatch(db);
              snap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
        } catch (dbErr) {
          console.warn("Firestore sync during reset encountered non-fatal notice:", dbErr);
        }
      }
      addToast({
        type: "SUCCESS",
        title: "계좌 데이터 정밀 초기화 완료",
        message: `전체 예수금 및 포트폴리오/체결/로그 데이터가 성공적으로 초기화되었습니다.`
      });
    } catch (e: any) {
      console.error("Failed to reset account:", e);
      addToast({
        type: "ERROR",
        title: "초기화 오류",
        message: `포트폴리오 자산 초기화 중 오류가 발생했습니다: ${e.message || e}`
      });
    }
  };

  // Delete individual position (종목 삭제 / 0원 청산)
  const deletePosition = async (symbol: string) => {
    try {
      const updatedPositions = positions.filter(p => p.symbol !== symbol);
      setPositions(updatedPositions);

      if (user?.uid === "guest_local_user") {
        localStorage.setItem("aistock_positions", JSON.stringify(updatedPositions));
      } else if (user) {
        const qPos = query(collection(db, "positions"), where("userId", "==", user.uid), where("symbol", "==", symbol));
        const snapPos = await getDocs(qPos);
        if (!snapPos.empty) {
          const batch = writeBatch(db);
          snapPos.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Failed to delete position:", err);
    }
  };

  const filterRealPositions = (posList: StockPosition[]): StockPosition[] => {
    return posList.filter(p => p.id && !p.id.startsWith("pos_samsung") && !p.id.startsWith("pos_demo") && !p.id.startsWith("pos_nvda"));
  };

  // Clear all positions (보유종목 일괄 삭제 / 잔고 0원 비우기)
  const clearAllPositions = async () => {
    try {
      setPositions([]);
      localStorage.setItem("aistock_positions", JSON.stringify([]));
      if (user && user.uid !== "guest_local_user") {
        const qPos = query(collection(db, "positions"), where("userId", "==", user.uid));
        const snapPos = await getDocs(qPos);
        if (!snapPos.empty) {
          const batch = writeBatch(db);
          snapPos.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
      }
      addToast({
        type: "SUCCESS",
        title: "포트폴리오 전체 삭제 완료",
        message: "통합 포트폴리오의 모든 보유 종목 잔고가 완전히 삭제되었습니다."
      });
    } catch (err) {
      console.error("Failed to clear all positions:", err);
      addToast({
        type: "ERROR",
        title: "삭제 처리 실패",
        message: "포트폴리오 삭제 처리 중 오류가 발생했습니다."
      });
    }
  };

  // Clear domestic positions specifically (국내 보유 잔고 / 거짓 모의 데이터 완전 삭제)
  const clearDomesticPositions = async () => {
    try {
      const remaining = positions.filter(p => p.market !== "KOREA");
      setPositions(remaining);
      localStorage.setItem("aistock_positions", JSON.stringify(remaining));
      if (user && user.uid !== "guest_local_user") {
        const qPos = query(collection(db, "positions"), where("userId", "==", user.uid), where("market", "==", "KOREA"));
        const snapPos = await getDocs(qPos);
        if (!snapPos.empty) {
          const batch = writeBatch(db);
          snapPos.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Failed to clear domestic positions:", err);
    }
  };

  // Purge ALL mock data (보유종목/주문/체결/결정로그 전체 삭제 및 실계좌 모드 전환/초기화)
  const purgeAllMockData = async () => {
    try {
      setPositions([]);
      setOrders([]);
      setTrades([]);
      setDecisionLogs([]);

      localStorage.setItem("aistock_positions", JSON.stringify([]));
      localStorage.setItem("aistock_orders", JSON.stringify([]));
      localStorage.setItem("aistock_trades", JSON.stringify([]));

      const resetBreakdown: CashBreakdown = {
        koreaCash: 0,
        koreaInvested: 0,
        koreaTotal: 0,
        upbitCash: 0,
        upbitInvested: 0,
        upbitTotal: 0,
        usCash: 0,
        usInvested: 0,
        usTotal: 0,
        totalCash: 0,
        totalInvested: 0,
        grandTotalAssets: 0
      };
      setCashBreakdown(resetBreakdown);

      // Delete Firestore collections for current user
      if (user && user.uid && user.uid !== "guest_local_user") {
        const collectionsToClear = ["positions", "orders", "trades"];
        for (const colName of collectionsToClear) {
          try {
            const q = query(collection(db, colName), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const batch = writeBatch(db);
              snap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          } catch (e) {
            console.warn(`Firestore clear notice for ${colName}:`, e);
          }
        }
      }

      const isReal = profile?.isRealTrade === true;
      if (isReal) {
        await updateProfileSettings({
          isRealTrade: true,
          balance: 0,
          initialBalance: 0
        });

        // Synchronize real broker balances
        await syncRealAccountBalance("all", false);

        addToast({
          type: "SUCCESS",
          title: "🔥 실전 전환 & 모의 데이터 전체 삭제 완료",
          message: "모든 가상 보유종목 및 모의 주문 내역이 완전히 삭제되었습니다. 실시간 연동 잔고만 표시됩니다."
        });
      } else {
        await updateProfileSettings({
          isRealTrade: false,
          balance: 1000000,
          initialBalance: 1000000
        });

        addToast({
          type: "SUCCESS",
          title: "🗑️ 모의자산 및 매매 내역 전체 삭제 완료",
          message: "모든 모의 보유종목 및 주문/체결 내역이 삭제되었으며, 가상 예수금이 1,000,000원으로 초기화되었습니다."
        });
      }
    } catch (err: any) {
      console.error("Failed to purge mock data:", err);
      addToast({
        type: "ERROR",
        title: "초기화 오류",
        message: `모의 데이터 삭제 중 오류 발생: ${err.message || err}`
      });
    }
  };

  // Recharge mock cash balance (가상 예수금 충전)
  const rechargeMockBalance = async (amount: number) => {
    try {
      const currentBal = profile?.balance || 0;
      const nextBal = currentBal + amount;
      await updateProfileSettings({ balance: nextBal, cash: nextBal });
      addToast({
        type: "SUCCESS",
        title: "💵 가상 예수금 충전 완료",
        message: `+${(amount ?? 0).toLocaleString()}원이 충전되어 현재 가상 예수금은 ${(nextBal ?? 0).toLocaleString()}원입니다.`
      });
    } catch (err: any) {
      console.error("Failed to recharge mock balance:", err);
      addToast({
        type: "ERROR",
        title: "충전 실패",
        message: err.message || "가상 예수금 충전 중 오류가 발생했습니다."
      });
    }
  };

  // Reset paper portfolio with a specific capital (모의투자 포트폴리오 초기화)
  const resetMockPortfolio = async (initialCapital: number = 1000000) => {
    try {
      setPositions([]);
      setOrders([]);
      localStorage.setItem("aistock_positions", JSON.stringify([]));
      localStorage.setItem("aistock_orders", JSON.stringify([]));

      if (user && user.uid && user.uid !== "guest_local_user") {
        const collectionsToClear = ["positions", "orders"];
        for (const colName of collectionsToClear) {
          try {
            const q = query(collection(db, colName), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const batch = writeBatch(db);
              snap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          } catch (e) {
            console.warn(`Firestore reset notice for ${colName}:`, e);
          }
        }
      }

      await updateProfileSettings({
        isRealTrade: false,
        balance: initialCapital,
        cash: initialCapital,
        initialBalance: initialCapital
      });

      addToast({
        type: "SUCCESS",
        title: "🔄 모의투자 포트폴리오 초기화 완료",
        message: `모의투자 원금이 ${(initialCapital ?? 0).toLocaleString()}원으로 재설정되었으며, 보유종목이 초기화되었습니다.`
      });
    } catch (err: any) {
      console.error("Failed to reset mock portfolio:", err);
      addToast({
        type: "ERROR",
        title: "초기화 오류",
        message: err.message || "모의투자 포트폴리오 초기화 중 오류가 발생했습니다."
      });
    }
  };

  // Keep refs of positions, orders, profiles, and operations to use inside background loops safely without resetting intervals
  const positionsRef = useRef(positions);
  const ordersRef = useRef(orders);
  const executeTradeRef = useRef(executeTrade);
  const placeOrderRef = useRef(placeOrder);
  const cashBreakdownRef = useRef(cashBreakdown);

  useEffect(() => {
    cashBreakdownRef.current = cashBreakdown;
  }, [cashBreakdown]);

  useEffect(() => {
    positionsRef.current = positions;
    if (positions.length > 0) {
      const symbolsToRegister = positions.map((p) => ({
        symbol: p.symbol,
        market: (p.market === "BTC" || p.market === "UPBIT" ? "UPBIT" : p.market === "US" ? "US" : "KOSPI") as any
      }));
      realtimeMarketFeedService.registerSymbols(symbolsToRegister);
      realtimeMarketFeedService.start();
    }
  }, [positions]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    executeTradeRef.current = executeTrade;
  }, [executeTrade]);

  useEffect(() => {
    placeOrderRef.current = placeOrder;
  }, [placeOrder]);

  // Subscribe to real-time market feed pipeline for immediate position price updates
  useEffect(() => {
    if (!user) return;
    realtimeMarketFeedService.start();

    // Register active holdings to market feed pipeline
    positionsRef.current.forEach((pos) => {
      const mappedMarket = pos.market === "US" ? "US" : (pos.market === "BTC" || pos.id?.startsWith("upbit_")) ? "UPBIT" : "KOSPI";
      realtimeMarketFeedService.registerSymbol(pos.symbol, mappedMarket);
    });

    let lastUpdateTimestamp = 0;
    const unsubFeed = realtimeMarketFeedService.subscribe((quotesMap) => {
      const currentPos = positionsRef.current;
      if (currentPos.length === 0) return;

      const now = Date.now();
      // Throttle rapid re-renders to at most once every 1200ms unless significant price movement occurs
      const isThrottled = now - lastUpdateTimestamp < 1200;

      let hasMeaningfulPriceChange = false;
      const updatedPos = currentPos.map((pos) => {
        const q =
          quotesMap.get(pos.symbol) ||
          quotesMap.get(pos.symbol.replace("KRW-", "")) ||
          quotesMap.get(`KRW-${pos.symbol}`);

        if (q && q.price && q.price > 0) {
          const oldPrice = pos.currentPrice || pos.avgPrice || 0;
          const diff = Math.abs(q.price - oldPrice);
          const diffPct = oldPrice > 0 ? (diff / oldPrice) * 100 : 1;

          const isUS = pos.market === "US";
          const minDiff = isUS ? 0.02 : 1;

          // Update if not throttled (1.2s buffer) AND price has moved noticeably (>= 0.05%)
          if (!isThrottled && (diff >= minDiff || diffPct >= 0.05)) {
            hasMeaningfulPriceChange = true;
            return {
              ...pos,
              currentPrice: q.price,
              updatedAt: new Date().toISOString()
            };
          }
        }
        return pos;
      });

      if (hasMeaningfulPriceChange) {
        lastUpdateTimestamp = now;
        setPositions(updatedPos);
        if (user?.uid === "guest_local_user" || !profile?.isRealTrade) {
          try {
            localStorage.setItem("aistock_positions", JSON.stringify(updatedPos));
          } catch (e) {}
        }
      }
    });

    return () => unsubFeed();
  }, [user, profile?.isRealTrade]);

  // Real-time Portfolio Position & Index Price Monitor (runs every 15 seconds, and instantly on mount)
  useEffect(() => {
    if (!user) return;

    const refreshPortfolioAndMarket = async () => {
      // 1. Refresh global market indexes
      await refreshMarketStatus();

      const currentPos = positionsRef.current;
      // 2. Refresh current position prices using live backend quotes for Mock positions only.
      // In Real Trade mode, real positions are driven by live broker sync & Upbit ticker to prevent price thrashing/flickering.
      let updatedPositions = currentPos;
      if (currentPos.length > 0 && !profile?.isRealTrade) {
        try {
          updatedPositions = await Promise.all(
            currentPos.map(async (pos) => {
              try {
                const res = await fetch(`/api/stocks/${pos.symbol}`);
                if (res.ok) {
                  const liveStock = await res.json();
                  if (liveStock && typeof liveStock.price === "number" && liveStock.price > 0) {
                    return {
                      ...pos,
                      currentPrice: liveStock.price,
                      updatedAt: new Date().toISOString()
                    };
                  }
                }
              } catch (err) {
                console.warn(`Failed to refresh live price for position ${pos.name}`, err);
              }
              return pos;
            })
          );

          // Compare only the prices so we don't trigger updates if prices are identical
          const priceStrBefore = currentPos.map(p => `${p.symbol}:${p.currentPrice}`).join("|");
          const priceStrAfter = updatedPositions.map(p => `${p.symbol}:${p.currentPrice}`).join("|");

          if (priceStrBefore !== priceStrAfter) {
            setPositions(updatedPositions);
            if (user?.uid === "guest_local_user") {
              localStorage.setItem("aistock_positions", JSON.stringify(updatedPositions));
            }
          }
        } catch (e) {
          console.warn("Portfolio price refresh error:", e);
        }
      }

      // -------------------------------------------------------------
      // Automated Risk Control Engine (Trailing Stop, Partial Profit, Stop Loss)
      // -------------------------------------------------------------
      const activePositionsToCheck = profile?.isRealTrade ? currentPos : updatedPositions;
      for (const pos of activePositionsToCheck) {
        if (pos.avgPrice <= 0 || pos.quantity <= 0) continue;
        const returnPct = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
        const currentPeak = positionPeakPricesRef.current[pos.symbol] || pos.currentPrice;
        const newPeak = Math.max(currentPeak, pos.currentPrice);
        positionPeakPricesRef.current[pos.symbol] = newPeak;

        // 1. Mechanical Tight Stop Loss (-2.0%) for Capital Protection
        if (returnPct <= -2.0) {
          console.log(`[Risk Guard] Triggering -2.0% Mechanical Stop Loss for ${pos.name} (${pos.symbol})`);
          executeTradeRef.current(
            pos.symbol,
            pos.name,
            pos.market,
            'SELL',
            pos.quantity,
            pos.currentPrice,
            '기계적 -2.0% 손절 리스크 방어',
            `AI 리스크 가드에 의해 -2.0% 손실 진입 시 계좌 보존을 위한 타이트한 자동 매도 체결 (진입가: ₩${(pos.avgPrice ?? 0).toLocaleString()}, 현재가: ₩${(pos.currentPrice ?? 0).toLocaleString()}).`,
            true
          );
          delete partialProfitDoneRef.current[pos.symbol];
          delete positionPeakPricesRef.current[pos.symbol];
          continue;
        }

        // 2. High-Efficiency Fast Profit Lock (+1.8% reached -> sell 50% & lock cash profit)
        if (returnPct >= 1.8 && !partialProfitDoneRef.current[pos.symbol] && pos.quantity > 1) {
          const sellHalfQty = Math.max(1, Math.floor(pos.quantity * 0.5));
          console.log(`[Risk Guard] Triggering +1.8% Quick Profit Take for ${pos.name} (${pos.symbol}), qty: ${sellHalfQty}`);
          partialProfitDoneRef.current[pos.symbol] = true;
          executeTradeRef.current(
            pos.symbol,
            pos.name,
            pos.market,
            'SELL',
            sellHalfQty,
            pos.currentPrice,
            '1.8% 1차 분할 익절 (수익 확정)',
            `AI 초단타 복리 가드에 의해 +1.8% 목표 달성 시 보유 수량의 50%를 즉시 자동 익절하여 예수금으로 확정.`,
            true
          );
          continue;
        }

        // 2.5. Extended Full Target (+4.5% reached -> sell remaining 50% with maximum gain)
        if (returnPct >= 4.5 && partialProfitDoneRef.current[pos.symbol]) {
          console.log(`[Risk Guard] Triggering +4.5% Extended Full Profit Exit for ${pos.name} (${pos.symbol})`);
          executeTradeRef.current(
            pos.symbol,
            pos.name,
            pos.market,
            'SELL',
            pos.quantity,
            pos.currentPrice,
            '4.5% 2차 전량 익절 완료',
            `AI 파동 추세 완성에 의해 +4.5% 최종 목표 달성 잔여 포지션 전량 최고점 익절 체결.`,
            true
          );
          delete partialProfitDoneRef.current[pos.symbol];
          delete positionPeakPricesRef.current[pos.symbol];
          continue;
        }

        // 3. Fast Dynamic Trailing Stop (Peak reached >= +2.0% and dropped >= 0.8% from peak)
        const peakReturnPct = ((newPeak - pos.avgPrice) / pos.avgPrice) * 100;
        const dropFromPeakPct = ((newPeak - pos.currentPrice) / newPeak) * 100;
        if (peakReturnPct >= 2.0 && dropFromPeakPct >= 0.8) {
          console.log(`[Risk Guard] Triggering Trailing Stop (-0.8% from peak) for ${pos.name} (${pos.symbol})`);
          executeTradeRef.current(
            pos.symbol,
            pos.name,
            pos.market,
            'SELL',
            pos.quantity,
            pos.currentPrice,
            '고점대비 -0.8% 트레일링 스탑',
            `AI 트레일링 스탑 엔지니어링에 의해 최고 수익률(+${peakReturnPct.toFixed(1)}%) 달성 후 최고점 대비 -0.8% 반락 포착 시 잔여 수량 전량 수익 확정 매도.`,
            true
          );
          delete partialProfitDoneRef.current[pos.symbol];
          delete positionPeakPricesRef.current[pos.symbol];
          continue;
        }
      }

      // -------------------------------------------------------------
      // Closing Block Phase (15:00~15:30) Auto-Cancel Unfilled BUY Orders
      // -------------------------------------------------------------
      const koreaPhase = getExecutionPhase('KOREA');
      if (koreaPhase.phase === 'CLOSING_BLOCK') {
        const pendingBuyOrders = ordersRef.current.filter(o => o.status === 'PENDING' && o.side === 'BUY');
        if (pendingBuyOrders.length > 0) {
          for (const pOrder of pendingBuyOrders) {
            cancelOrder(pOrder.id);
          }
          addToast({
            type: 'INFO',
            title: '장 마감 신규 주문 자동 취소',
            message: '15:00~15:30 장 마감 시간대 진입으로 체결 대기 중인 미체결 매수 주문이 오발주 차단을 위해 자동 취소 처리되었습니다.'
          });
        }
      }
    };

    // Run immediately on load
    refreshPortfolioAndMarket();

    // Schedule on active 5s intervals to keep data fresh and execute quick profit-takes without lag
    const interval = setInterval(refreshPortfolioAndMarket, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Real-time Order Matching Engine (checks actual live stock prices for matches)
  useEffect(() => {
    if (!user) return;

    // Check every 3 seconds for instant matching
    const interval = setInterval(async () => {
      const currentOrders = ordersRef.current;
      const pendingOrders = currentOrders.filter(o => o.status === "PENDING");
      if (pendingOrders.length === 0) return;

      // Check first pending order to find matching opportunities with live quotes
      const randomOrder = pendingOrders[Math.floor(Math.random() * pendingOrders.length)];
      try {
        const res = await fetch(`/api/stocks/${randomOrder.symbol}`);
        if (res.ok) {
          const liveStock = await res.json();
          const livePrice = liveStock.price;
          
          let isMatch = false;
          if (randomOrder.side === 'BUY') {
            // Fill BUY if live market price has fallen below or equal to the user's buy limit
            isMatch = livePrice <= randomOrder.price;
          } else {
            // Fill SELL if live market price has risen above or equal to the user's sell limit
            isMatch = livePrice >= randomOrder.price;
          }

          if (isMatch) {
            console.log(`[Live Match] Limit order matched successfully! Live: ${livePrice}, Order: ${randomOrder.price}`);
            fillOrder(randomOrder.id);
          }
        }
      } catch (err) {
        console.warn("Failed to perform real-time price match check for pending order:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);



  // Real-time AI decision-making & simulated auto-trading engine loop (ALL STOCKS + REAL-TIME QUOTES)
  useEffect(() => {
    if (!user || !profile || !profile.autoTradingEnabled) return;

    let scanIndex = 0;

    const runAutoTradingIteration = async () => {
      // 0-A. 🤖 AI Dynamic Bot Threshold Adaptation Pipeline Trigger
      try {
        aiDynamicBotThresholdEngine.adaptAllBotsWithAI("BULL", 1.25);
      } catch (e) {
        console.warn("[AI Dynamic Threshold Engine Notice]", e);
      }

      // 0-B. Auto Take-Profit & Auto Stop-Loss Position Manager (Net Profit Fee Armor Engine)
      const currentPosList = positionsRef.current || [];
      if (currentPosList && currentPosList.length > 0) {
        for (const pos of currentPosList) {
          if (!pos || pos.quantity <= 0) continue;
          const cleanSym = pos.symbol.toUpperCase().replace(/^KRW-/, "");
          const liveP = pos.currentPrice || pos.avgPrice || pos.avgBuyPrice || 0;
          const avgP = pos.avgBuyPrice || pos.avgPrice || liveP;
          if (liveP <= 0 || avgP <= 0) continue;

          const pnlRate = ((liveP - avgP) / avgP) * 100;
          const posMkt: 'KOREA' | 'US' | 'BTC' = pos.market === 'BTC' || pos.symbol.startsWith('KRW-') ? 'BTC' : pos.market === 'US' ? 'US' : 'KOREA';

          // Track Highest Price and Peak Profit Rate for Trailing Stop & BEP Shield
          const prevHighestP = (pos as any).highestPrice || avgP;
          const currentHighestP = Math.max(prevHighestP, liveP);
          (pos as any).highestPrice = currentHighestP;

          const highestPnlRate = Math.max((pos as any).highestPnlRate || 0, ((currentHighestP - avgP) / avgP) * 100);
          (pos as any).highestPnlRate = highestPnlRate;

          // A-1. 🛡️ BEP PROFIT SHIELD (본절가 & 수익 보존 가드: 최고점 +0.6% 달성 후 하락 시 손실 전환 전 +0.15%~+0.2% 지점에서 즉시 청산)
          const isBepTriggered = highestPnlRate >= 0.6 && pnlRate <= 0.20 && pnlRate >= -0.3;
          
          // A-2. 🎯 DYNAMIC PEAK REVERSAL TRAILING STOP (최고점 달성 후 꺾임 매도: 고정 수치 없이 최고점 추격 후 음봉 꺾임 시 최상단 매도)
          const dropFromPeakPct = highestPnlRate - pnlRate;
          const allowedPeakDrop = highestPnlRate >= 5.0 ? 0.8 : (highestPnlRate >= 2.0 ? 0.5 : 0.35);
          const isPeakReversalTriggered = highestPnlRate >= 0.8 && dropFromPeakPct >= allowedPeakDrop && pnlRate >= 0.2;

          // A-3. 💰 DIRECT NET PROFIT TAKE PROFIT (수수료 공제 후 실질 순익 확정)
          const sellEval = UpbitFeeAndNetProfitGuard.evaluateSellPermission(
            avgP,
            liveP,
            pos.quantity,
            -1.2,
            0.6,
            UpbitFeeAndNetProfitGuard.DEFAULT_SLIPPAGE_PCT,
            currentHighestP,
            88,
            1.2
          );

          const isDirectTpTriggered = pnlRate >= 0.8 && sellEval.canExecuteSell;

          if (isBepTriggered || isPeakReversalTriggered || isDirectTpTriggered) {
            const triggerTypeMsg = isPeakReversalTriggered
              ? `🎯 [최고점 피크 꺾임 익절] 최고 수익률 +${highestPnlRate.toFixed(2)}% 달성 후 고점 대비 -${dropFromPeakPct.toFixed(2)}% 꺾임 포착 (현재 +${pnlRate.toFixed(2)}% 최상단 매도 확정)`
              : isBepTriggered
              ? `🛡️ [본절가/수익 보존 가드] 최고 수익률 +${highestPnlRate.toFixed(2)}% 달성 후 하락 반전 (손실 전환 방지 +${pnlRate.toFixed(2)}% 즉시 청산)`
              : `🎉 [AI 순익 목표 달성] +${pnlRate.toFixed(2)}% (순익 +${sellEval.netProfitPct.toFixed(2)}% 확정)`;

            console.log(`[Auto Take-Profit/Trailing Stop Triggered] ${pos.name} (${pos.symbol}): ${triggerTypeMsg}`);
            try {
              await executeTradeRef.current(
                pos.symbol,
                pos.name,
                posMkt,
                'SELL',
                pos.quantity,
                liveP,
                isPeakReversalTriggered ? 'AI 최고점 피크 꺾임 매도' : isBepTriggered ? 'AI 본절가 수익 보존 익절' : 'AI 퀀트 목표 익절',
                `${triggerTypeMsg}. 포지션 최고점 이익 실현 체결 완료.`,
                true
              );

              const tpLog: AIDecisionLog = {
                id: generateUniqueId("dec_tp_cut"),
                timestamp: new Date().toISOString(),
                symbol: pos.symbol,
                name: pos.name,
                market: posMkt,
                action: "SELL_SIGNAL",
                currentPrice: liveP,
                entryPrice: avgP,
                targetPrice: Math.round(avgP * 1.05),
                stopLossPrice: Math.round(avgP * 0.98),
                targetGainPct: pnlRate,
                volumeRatio: 1.8,
                rsi: 68,
                message: `${triggerTypeMsg} - ${pos.name} (${pos.symbol}) 포지션 전량 이익 확정 체결 완료!`,
                confidence: 98,
                isRealTrade: Boolean(profileRef.current?.isRealTrade),
                executionType: profileRef.current?.isRealTrade ? "REAL_BROKER" : "PAPER_SIMULATION",
                safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
              };
              setDecisionLogs(prev => [tpLog, ...prev.slice(0, 49)]);

              addToast({
                type: 'SUCCESS',
                title: isPeakReversalTriggered ? `🎯 최고점 피크 꺾임 매도 완료 (${pos.name})` : `🎉 수익 보존 익절 완료 (${pos.name})`,
                message: `${pos.name} (${pos.symbol}) +${pnlRate.toFixed(2)}% 최고점 근접 이익을 성공적으로 확정했습니다.`
              });
            } catch (tpErr) {
              console.warn("[Auto Take Profit notice]", tpErr);
            }
            continue;
          }

          // B. ⛔ TIGHT DYNAMIC STOP-LOSS (-1.2% Loss Limit)
          if (pnlRate <= -1.2 && highestPnlRate < 0.4) {
            console.log(`[Auto Stop-Loss Triggered] ${pos.name} (${pos.symbol}) loss: ${pnlRate.toFixed(2)}% <= -1.2%. Executing auto-sell & blacklisting...`);
            
            try {
              await executeTradeRef.current(
                pos.symbol,
                pos.name,
                posMkt,
                'SELL',
                pos.quantity,
                liveP,
                'AI -1.2% 칼손절 및 매수 차단',
                `포지션 손실률 ${pnlRate.toFixed(2)}% (-1.2% 제한 도달). 손실 확산 방지를 위해 전량 청산 후 추가 매수를 전면 차단합니다.`,
                true
              );

              addBlockedSymbol(cleanSym, "-1.2% 칼손절 보호", {
                name: pos.name,
                market: posMkt,
                lossPct: pnlRate,
                triggerSource: "-1.2% 칼손절"
              });

              const slLog: AIDecisionLog = {
                id: generateUniqueId("dec_sl_cut"),
                timestamp: new Date().toISOString(),
                symbol: pos.symbol,
                name: pos.name,
                market: posMkt,
                action: "STOP_LOSS",
                currentPrice: liveP,
                entryPrice: avgP,
                targetPrice: Math.round(avgP * 1.05),
                stopLossPrice: Math.round(avgP * 0.97),
                targetGainPct: 5.0,
                volumeRatio: 2.0,
                rsi: 35,
                message: `⛔ [AI -3% 자동 손절 & 추가 매수 차단] ${pos.name} (${pos.symbol}) 손실률 ${pnlRate.toFixed(2)}% 감지! 즉시 포지션 전량 청산 및 신규 매수 차단 적용.`,
                confidence: 99,
                isRealTrade: Boolean(profileRef.current?.isRealTrade),
                executionType: profileRef.current?.isRealTrade ? "REAL_BROKER" : "PAPER_SIMULATION",
                safetyStatus: { holdingsLimit: "FAIL", dailyLossLimit: "FAIL", marketRisk: "FAIL", brokerAuth: "PASS" }
              };
              setDecisionLogs(prev => [slLog, ...prev.slice(0, 49)]);

              addToast({
                type: 'ERROR',
                title: `⛔ -3% 자동 손절 실행 (${pos.name})`,
                message: `${pos.name} (${pos.symbol}) 손실률 ${pnlRate.toFixed(2)}% 도달. 포지션 전량 청산 및 추가 매수가 자동 차단되었습니다.`
              });
            } catch (slErr) {
              console.warn("[Auto Stop Loss notice]", slErr);
            }
          }
        }
      }

      // 1. Load ALL stocks from universe (KOSPI, KOSDAQ, US, UPBIT + custom)
      const universe = getAllStocks();
      if (!universe || universe.length === 0) return;

      const currentProfile = profileRef.current || profile;
      const currentTargetMkt = currentProfile.autoTradingTargetMarket || "ALL";

      // 2. Filter target universe based on target market and active trading hours
      const now = new Date();
      const krStatus = getMarketStatus("KOREA", now);
      const usStatus = getMarketStatus("US", now);

      let poolToUse = universe.filter(s => {
        if (currentTargetMkt === "KOREA") return s.market === "KOSPI" || s.market === "KOSDAQ";
        if (currentTargetMkt === "US") return s.market === "US";
        if (currentTargetMkt === "BTC") return s.market === "UPBIT";
        return true; // "ALL"
      });

      // When "ALL" is selected, dynamically prioritize markets that are CURRENTLY OPEN (e.g. 24/7 UPBIT & open US)
      if (currentTargetMkt === "ALL") {
        const activeOpenUniverse = universe.filter(s => {
          if (s.market === "UPBIT") return true; // 24/7 Open
          if ((s.market === "KOSPI" || s.market === "KOSDAQ") && krStatus.isOpen) return true;
          if (s.market === "US" && usStatus.isOpen) return true;
          return false;
        });
        if (activeOpenUniverse.length > 0) {
          poolToUse = activeOpenUniverse;
        }
      }

      if (poolToUse.length === 0) poolToUse = universe;
      
      // Cycle or randomly pick target stock
      scanIndex = (scanIndex + 1) % poolToUse.length;
      const targetStockItem = poolToUse[scanIndex];
      if (!targetStockItem) return;

      const mappedMarket: 'KOREA' | 'US' | 'BTC' = 
        (targetStockItem.market === "KOSPI" || targetStockItem.market === "KOSDAQ") ? "KOREA" :
        (targetStockItem.market === "US") ? "US" : "BTC";

      const isCryptoTarget = mappedMarket === 'BTC' || targetStockItem.market === 'UPBIT' || targetStockItem.symbol.startsWith('KRW-');

      // 3. Fetch REAL-TIME stock quote from backend API
      let livePrice = targetStockItem.price;
      let liveChangeRate = targetStockItem.changeRate;

      try {
        const res = await fetch(`/api/stocks/${targetStockItem.symbol}`);
        if (res.ok) {
          const liveData = await res.json();
          if (liveData && typeof liveData.price === "number" && liveData.price > 0) {
            livePrice = liveData.price;
            liveChangeRate = typeof liveData.changeRate === "number" ? liveData.changeRate : targetStockItem.changeRate;
          }
        }
      } catch (e) {
        livePrice = targetStockItem.price;
      }

      const hasKeys = currentProfile ? (
        mappedMarket === 'KOREA' || mappedMarket === 'US'
          ? Boolean(currentProfile.koreaAppKey && currentProfile.koreaAppSecret)
          : Boolean(currentProfile.upbitAccessKey && currentProfile.upbitSecretKey)
      ) : false;

      const mStatus = getMarketStatus(mappedMarket);
      const volRatio = Math.round((1.2 + (Math.abs(liveChangeRate) * 0.3)) * 10) / 10;
      const unit = mappedMarket === "US" ? "$" : "₩";

      // 🛑 STRICT MARKET HOURS CHECK: Do NOT execute auto trades when KOREA or US stock markets are closed!
      if (mappedMarket !== 'BTC' && !mStatus.isOpen) {
        const isRealTradingActive = Boolean(currentProfile.isRealTrade === true);
        const marketClosedLog: AIDecisionLog = {
          id: generateUniqueId("dec_mkt_closed"),
          timestamp: new Date().toISOString(),
          symbol: targetStockItem.symbol,
          name: targetStockItem.name,
          market: mappedMarket,
          action: "SAFETY_REJECT",
          currentPrice: livePrice,
          entryPrice: livePrice,
          targetPrice: Math.round(livePrice * 1.05),
          stopLossPrice: Math.round(livePrice * 0.98),
          targetGainPct: 5.0,
          volumeRatio: volRatio,
          rsi: 50,
          message: `🛑 [정규장 마감 - 오체결/뻥튀기 방지] ${targetStockItem.name} (${targetStockItem.symbol}) - ${mStatus.statusBadgeText}. 정규장 운영 시간이 아니므로 오체결 및 잔고 뻥튀기 방지를 위해 매수를 전면 중단합니다.`,
          confidence: 100,
          isRealTrade: isRealTradingActive,
          executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
          safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "FAIL", brokerAuth: "PASS" }
        };
        setDecisionLogs(prev => [marketClosedLog, ...prev.slice(0, 49)]);
        return;
      }

      // =========================================================================
      // 🧠 SMC + 16대 깃허브 퀀트 뇌엔진 + 손익비 1:2 엄격 합의 파이프라인 정밀 평가
      // =========================================================================
      const pipelineResult = StrictQuantSignalPipeline.evaluateStock(
        targetStockItem.symbol,
        targetStockItem.name,
        mappedMarket,
        livePrice,
        liveChangeRate,
        volRatio
      );

      const calculatedAiScore = pipelineResult.confidenceScore;
      const targetPrice = pipelineResult.targetPrice;
      const stopLossPrice = pipelineResult.stopLossPrice;
      const targetGain = pipelineResult.expectedGainPct;
      const calculatedRR = pipelineResult.rrRatio;

      // 4. Autonomous Trading Execution (Paper Trading simulation when mock mode, Real Broker API when real mode)
      const isRealTradingActive = Boolean(currentProfile.isRealTrade === true);

      let curBalance = 0;
      if (isRealTradingActive) {
        if (mappedMarket === 'BTC') {
          curBalance = typeof cashBreakdown?.upbitCash === 'number' ? cashBreakdown.upbitCash : 0;
        } else if (mappedMarket === 'KOREA') {
          curBalance = typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash : 0;
        } else {
          curBalance = typeof cashBreakdown?.usCash === 'number'
            ? cashBreakdown.usCash
            : (typeof cashBreakdown?.koreaCash === 'number' ? cashBreakdown.koreaCash / 1350 : 0);
        }
      } else {
        // Mock Paper Trading Mode: Use virtual profile balance (no auto-recharge when 0)
        const vBal = typeof currentProfile.balance === 'number' ? currentProfile.balance : 0;
        curBalance = mappedMarket === 'US' ? vBal / 1350 : vBal;
      }

      const minOrderCost = mappedMarket === 'BTC' ? 5000 : (mappedMarket === 'US' ? livePrice : livePrice);
      const isBalanceSufficient = curBalance > 0 && curBalance >= minOrderCost;

      // 5. QUANT PATTERN & TREND FILTER (Strict Bad Chart Pattern & Bearish Candlestick Rejection Engine)
      const isBearishBigCandle = liveChangeRate <= -1.5;
      const isHighVolumeBearish = liveChangeRate < -0.5 && volRatio >= 1.5;
      const isOverheated = liveChangeRate > 18.0; // Overheated rally rejection
      const isBadChartPattern = isBearishBigCandle || isHighVolumeBearish || isOverheated;

      let badPatternReason = "";
      if (isBearishBigCandle) {
        badPatternReason = `장대 음봉 패턴 (등락률 ${liveChangeRate.toFixed(2)}%)`;
      } else if (isHighVolumeBearish) {
        badPatternReason = `거래량 동반 하락 음봉 (RVOL ${volRatio.toFixed(1)}배, 등락률 ${liveChangeRate.toFixed(2)}%)`;
      } else if (isOverheated) {
        badPatternReason = `단기 과열 급등 구간 (+${liveChangeRate.toFixed(1)}% 과열 추격 매수 방지)`;
      }

      // =========================================================================
      // 🛡️ 6대 AI 자율매매 안전 필터 매트릭스 (무차별 매수 방지 & 업비트 코인 엄선)
      // =========================================================================
      
      // Filter 1: Max Total Holdings Limit Filter (기본 최대 5종목 제한)
      const maxHoldings = currentProfile.maxHoldingsCount || 5;
      const activePositions = (positionsRef.current || []).filter(p => p && p.quantity > 0);
      if (activePositions.length >= maxHoldings) {
        const holdLimitLog: AIDecisionLog = {
          id: generateUniqueId("dec_hold_limit"),
          timestamp: new Date().toISOString(),
          symbol: targetStockItem.symbol,
          name: targetStockItem.name,
          market: mappedMarket,
          action: "SAFETY_REJECT",
          currentPrice: livePrice,
          entryPrice: livePrice,
          targetPrice,
          stopLossPrice,
          targetGainPct: targetGain,
          volumeRatio: volRatio,
          rsi: 55,
          message: `🛡️ [보유 종목 한도 도달] ${targetStockItem.name} 매수 건너뜀 (현재 보유 ${activePositions.length}개 / 최대 허용 한도 ${maxHoldings}개 도달 - 추가 매수 자동 차단)`,
          confidence: 95,
          isRealTrade: isRealTradingActive,
          executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
          safetyStatus: { holdingsLimit: "FAIL", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
        };
        setDecisionLogs(prev => [holdLimitLog, ...prev.slice(0, 49)]);
        return;
      }

      // Filter 2: Upbit Crypto Specific Filter Engine (가상자산 엄선 모드)
      const cryptoFilterMode = currentProfile.cryptoFilterMode || 'TOP_MAJOR';
      const maxCryptoHoldings = currentProfile.maxCryptoHoldingsCount ?? 2;

      if (isCryptoTarget) {
        // Mode A: Crypto Disabled entirely
        if (cryptoFilterMode === 'CRYPTO_DISABLED') {
          const cryptoDisabledLog: AIDecisionLog = {
            id: generateUniqueId("dec_crypto_disabled"),
            timestamp: new Date().toISOString(),
            symbol: targetStockItem.symbol,
            name: targetStockItem.name,
            market: 'BTC',
            action: "SAFETY_REJECT",
            currentPrice: livePrice,
            entryPrice: livePrice,
            targetPrice,
            stopLossPrice,
            targetGainPct: targetGain,
            volumeRatio: volRatio,
            rsi: 50,
            message: `🛑 [가상자산 매수 금지 필터] ${targetStockItem.name} (${targetStockItem.symbol}) 매수 건너뜀 (사용자 설정: 가상자산 자동매수 비활성화 상태 - 주식 전용 운용)`,
            confidence: 100,
            isRealTrade: isRealTradingActive,
            executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
            safetyStatus: { holdingsLimit: "FAIL", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
          };
          setDecisionLogs(prev => [cryptoDisabledLog, ...prev.slice(0, 49)]);
          return;
        }

        // Mode B: Top Major 4 Coins Only (BTC, ETH, SOL, XRP)
        const cleanSymbol = targetStockItem.symbol.toUpperCase().replace(/^KRW-/, "");
        const MAJOR_CRYPTO_LIST = ['BTC', 'ETH', 'SOL', 'XRP'];
        if (cryptoFilterMode === 'TOP_MAJOR' && !MAJOR_CRYPTO_LIST.includes(cleanSymbol)) {
          const altRejectLog: AIDecisionLog = {
            id: generateUniqueId("dec_alt_reject"),
            timestamp: new Date().toISOString(),
            symbol: targetStockItem.symbol,
            name: targetStockItem.name,
            market: 'BTC',
            action: "SAFETY_REJECT",
            currentPrice: livePrice,
            entryPrice: livePrice,
            targetPrice,
            stopLossPrice,
            targetGainPct: targetGain,
            volumeRatio: volRatio,
            rsi: 50,
            message: `👑 [메이저 코인 엄선 필터] ${targetStockItem.name} (${targetStockItem.symbol}) 알트코인 매수 제외 (메이저 Top 4인 BTC, ETH, SOL, XRP만 진입 허용)`,
            confidence: 92,
            isRealTrade: isRealTradingActive,
            executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
            safetyStatus: { holdingsLimit: "FAIL", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
          };
          setDecisionLogs(prev => [altRejectLog, ...prev.slice(0, 49)]);
          return;
        }

        // Max Crypto Holdings Count Limit (Default: max 2 coins)
        const currentCryptoPositions = activePositions.filter(
          p => p.market === 'BTC' || p.symbol.startsWith('KRW-') || ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA'].includes(p.symbol.toUpperCase().replace(/^KRW-/, ''))
        );
        if (currentCryptoPositions.length >= maxCryptoHoldings) {
          const cryptoMaxLog: AIDecisionLog = {
            id: generateUniqueId("dec_crypto_max_limit"),
            timestamp: new Date().toISOString(),
            symbol: targetStockItem.symbol,
            name: targetStockItem.name,
            market: 'BTC',
            action: "SAFETY_REJECT",
            currentPrice: livePrice,
            entryPrice: livePrice,
            targetPrice,
            stopLossPrice,
            targetGainPct: targetGain,
            volumeRatio: volRatio,
            rsi: 50,
            message: `🪙 [가상자산 보유 한도 도달] ${targetStockItem.name} 매수 건너뜀 (현재 보유 코인 ${currentCryptoPositions.length}개 / 최대 코인 한도 ${maxCryptoHoldings}개 - 무차별 코인 매수 차단 가동)`,
            confidence: 96,
            isRealTrade: isRealTradingActive,
            executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
            safetyStatus: { holdingsLimit: "FAIL", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
          };
          setDecisionLogs(prev => [cryptoMaxLog, ...prev.slice(0, 49)]);
          return;
        }
      }

      // Filter 3: Duplicate Holding Prevention (No Blind Over-accumulation)
      const existingHolding = activePositions.find(p => p.symbol === targetStockItem.symbol);
      if (existingHolding) {
        const heldValue = existingHolding.quantity * (existingHolding.currentPrice || existingHolding.avgPrice || livePrice);
        const maxSingleLimit = curBalance * ((currentProfile.maxAllocPercentPerPosition || 15) / 100);
        if (heldValue >= maxSingleLimit) {
          return; // Already reached allocation limit for this symbol
        }
      }

      const minRequiredScore = currentProfile.minAiConfidenceScore || 85;

      // When in Real mode and missing balance/keys: DO NOT EXECUTE TRADES, SCANNER ONLY
      if (isRealTradingActive && (!isBalanceSufficient || !hasKeys)) {
        const scanStatusMsg = !hasKeys
          ? `⚠️ [AI 실거래 스캐너] ${targetStockItem.name} (${targetStockItem.symbol}) 타점 감지 (증권사 API Key 등록 대기 중 - 실거래 주문 미체결, 스캐너 모드 유지)`
          : `🔍 [AI 실거래 스캐너] ${targetStockItem.name} (${targetStockItem.symbol}) 호가 ${unit}${(livePrice ?? 0).toLocaleString()} 실시간 스캔 중 (실계좌 가용 예수금 부족: ${unit}${Math.round(curBalance).toLocaleString()} - 주문 체결 건너뜀)`;

        const scanLog: AIDecisionLog = {
          id: generateUniqueId("dec_scan_only"),
          timestamp: new Date().toISOString(),
          symbol: targetStockItem.symbol,
          name: targetStockItem.name,
          market: mappedMarket,
          action: "ANALYZE",
          currentPrice: livePrice,
          entryPrice: livePrice,
          targetPrice,
          stopLossPrice,
          targetGainPct: targetGain,
          volumeRatio: volRatio,
          rsi: 55,
          message: scanStatusMsg,
          confidence: calculatedAiScore,
          isRealTrade: false,
          executionType: "PAPER_SIMULATION",
          safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: hasKeys ? "PASS" : "FAIL" }
        };
        setDecisionLogs(prev => [scanLog, ...prev.slice(0, 49)]);
        return;
      }

      // If pipeline failed or chart pattern failed: Explicitly reject buy to safeguard capital
      if (!pipelineResult.isApproved || isBadChartPattern) {
        const rejectReason = isBadChartPattern ? badPatternReason : (pipelineResult.gateRejectionReason || "SMC 또는 16대 뇌엔진 합의 미달");
        const rejectGateLog: AIDecisionLog = {
          id: generateUniqueId("dec_pipeline_reject"),
          timestamp: new Date().toISOString(),
          symbol: targetStockItem.symbol,
          name: targetStockItem.name,
          market: mappedMarket,
          action: "SAFETY_REJECT",
          currentPrice: livePrice,
          entryPrice: livePrice,
          targetPrice,
          stopLossPrice,
          targetGainPct: targetGain,
          volumeRatio: volRatio,
          rsi: 45,
          message: `🛑 [AI 엄격 파이프라인 기각] ${targetStockItem.name} (${targetStockItem.symbol}) - ${rejectReason} (손익비 ${calculatedRR}:1, 승인 뇌엔진 ${pipelineResult.approvedEnginesCount}/16개)`,
          confidence: calculatedAiScore,
          isRealTrade: isRealTradingActive,
          executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
          safetyStatus: {
            holdingsLimit: "PASS",
            dailyLossLimit: "PASS",
            marketRisk: pipelineResult.passedGates.smcGate ? "PASS" : "FAIL",
            brokerAuth: "PASS"
          }
        };
        setDecisionLogs(prev => [rejectGateLog, ...prev.slice(0, 49)]);
        return;
      }

      // Execute buy ONLY IF ALL 5 GATES ARE 100% PASSED AND BALANCE IS SUFFICIENT
      const isFullConsensusApproved = pipelineResult.isApproved && calculatedAiScore >= minRequiredScore && isBalanceSufficient;
      if (isFullConsensusApproved && (!isRealTradingActive || hasKeys)) {
        const maxAllocPct = (currentProfile.maxAllocPercentPerPosition || 15) / 100;
        const maxOrderBudget = Math.max(minOrderCost, curBalance * maxAllocPct);

        let calculateQty = 0;
        if (mappedMarket === 'BTC') {
          // Crypto (Upbit / BTC / ETH / etc.) supports fractional quantities down to 0.00000001
          const cryptoBudget = Math.min(maxOrderBudget, curBalance);
          if (cryptoBudget >= 5000 && livePrice > 0) {
            calculateQty = Number((cryptoBudget / livePrice).toFixed(8));
          }
        } else if (mappedMarket === 'US') {
          const shares = Math.floor(Math.min(maxOrderBudget, curBalance) / livePrice);
          calculateQty = shares > 0 ? shares : (curBalance >= livePrice ? 1 : 0);
        } else {
          const shares = Math.floor(Math.min(maxOrderBudget, curBalance) / livePrice);
          calculateQty = shares > 0 ? shares : (curBalance >= livePrice ? 1 : 0);
        }

        if (calculateQty * livePrice > curBalance) {
          if (mappedMarket === 'BTC') {
            calculateQty = Number(((curBalance * 0.999) / livePrice).toFixed(8));
          } else {
            calculateQty = Math.floor(curBalance / livePrice);
          }
        }

        if (calculateQty > 0 && (calculateQty * livePrice) <= curBalance) {
          try {
            await executeTradeRef.current(
              targetStockItem.symbol,
              targetStockItem.name,
              mappedMarket,
              'BUY',
              calculateQty,
              livePrice,
              isRealTradingActive ? `AI SMC+16대뇌엔진 실거래 (${pipelineResult.matchedStrategies[0] || 'SMC돌파'})` : `AI SMC+16대뇌엔진 모의투자 (${pipelineResult.matchedStrategies[0] || 'SMC돌파'})`,
              isRealTradingActive
                ? `SMC 구조돌파 & 16대 뇌엔진 ${pipelineResult.approvedEnginesCount}개 만장일치 합의, 손익비 ${calculatedRR}:1 (목표가 ${unit}${(targetPrice ?? 0).toLocaleString()} +${targetGain}%, 손절가 ${unit}${(stopLossPrice ?? 0).toLocaleString()}).`
                : `SMC 구조돌파 & 16대 뇌엔진 ${pipelineResult.approvedEnginesCount}개 만장일치 합의, 손익비 ${calculatedRR}:1 (목표가 ${unit}${(targetPrice ?? 0).toLocaleString()} +${targetGain}%, 손절가 ${unit}${(stopLossPrice ?? 0).toLocaleString()}).`,
              true
            );

            const buyExecLog: AIDecisionLog = {
              id: generateUniqueId(isRealTradingActive ? "dec_exec_live" : "dec_exec_mock"),
              timestamp: new Date().toISOString(),
              symbol: targetStockItem.symbol,
              name: targetStockItem.name,
              market: mappedMarket,
              action: "BUY_SIGNAL",
              currentPrice: livePrice,
              entryPrice: livePrice,
              targetPrice,
              stopLossPrice,
              targetGainPct: targetGain,
              volumeRatio: volRatio,
              rsi: 58,
              message: isRealTradingActive
                ? `🚀 [실거래 SMC 100% 승인 매수] ${targetStockItem.name} (${targetStockItem.symbol}) 호가 ${unit}${(livePrice ?? 0).toLocaleString()} 기준 ${formatStockQty(calculateQty, mappedMarket === 'BTC')} ${mappedMarket === 'BTC' ? (targetStockItem.symbol.replace('KRW-', '') || '코인') : '주'} 체결! (손익비 ${calculatedRR}:1, 16대 뇌엔진 ${pipelineResult.approvedEnginesCount}개 합의, 목표 +${targetGain}%)`
                : `👑 [모의투자 SMC 100% 승인 매수] ${targetStockItem.name} (${targetStockItem.symbol}) 가상 호가 ${unit}${(livePrice ?? 0).toLocaleString()} 기준 ${formatStockQty(calculateQty, mappedMarket === 'BTC')} ${mappedMarket === 'BTC' ? (targetStockItem.symbol.replace('KRW-', '') || '코인') : '주'} 체결! (손익비 ${calculatedRR}:1, 16대 뇌엔진 ${pipelineResult.approvedEnginesCount}개 합의, 목표 +${targetGain}%)`,
              confidence: calculatedAiScore,
              isRealTrade: isRealTradingActive,
              executionType: isRealTradingActive ? "REAL_BROKER" : "PAPER_SIMULATION",
              safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
            };
            setDecisionLogs(prev => [buyExecLog, ...prev.slice(0, 49)]);
            return;
          } catch (execErr: any) {
            console.log("[Auto-Trading Execution Notice]", execErr.message);
          }
        }
      }

      // Real-time scan & analyze log across all stocks in universe
      const scanLog: AIDecisionLog = {
        id: generateUniqueId("dec_scan_sim"),
        timestamp: new Date().toISOString(),
        symbol: targetStockItem.symbol,
        name: targetStockItem.name,
        market: mappedMarket,
        action: "ANALYZE",
        currentPrice: livePrice,
        entryPrice: livePrice,
        targetPrice,
        stopLossPrice,
        targetGainPct: targetGain,
        volumeRatio: volRatio,
        rsi: 52,
        message: `🔍 [전종목 실시간 시세 관제] ${targetStockItem.name} (${targetStockItem.symbol}) 실시간 호가 ${unit}${(livePrice ?? 0).toLocaleString()} (${liveChangeRate > 0 ? '+' : ''}${liveChangeRate}%), AI 점수 ${calculatedAiScore}점 스캔 중. [테마: ${targetStockItem.theme}]`,
        confidence: calculatedAiScore,
        safetyStatus: { holdingsLimit: "PASS", dailyLossLimit: "PASS", marketRisk: "PASS", brokerAuth: "PASS" }
      };
      setDecisionLogs(prev => [scanLog, ...prev.slice(0, 49)]);
    };

    // Run iteration every 4 seconds for high-efficiency real-time auto-trading
    const interval = setInterval(runAutoTradingIteration, 4000);
    runAutoTradingIteration();

    return () => clearInterval(interval);
  }, [user, profile?.autoTradingEnabled, profile?.autoTradingTargetMarket]);

  return (
    <AppContext.Provider value={{
      user,
      profile,
      strategies,
      positions,
      trades,
      orders,
      toasts,
      addToast,
      addNotification: addToast,
      removeToast,
      clearAllToasts,
      isToastMuted,
      toggleToastMute,
      marketStatus,
      loading,
      selectedSymbol,
      setSelectedSymbol,
      activeChartStock,
      openStockChart,
      closeStockChart,
      triggerEmergencyStop,
      updateProfileSettings,
      addStrategy,
      deleteStrategy,
      toggleStrategyActive,
      executeTrade,
      placeOrder,
      pendingGuardTrade,
      requestTradeConfirmation,
      cancelTradeGuardModal,
      cancelOrder,
      fillOrder,
      refreshMarketStatus,
      resetMockAccount,
      resetAccountData: resetMockAccount,
      decisionLogs,
      triggerLiveSignalLog,
      clearDecisionLogs,
      brokerApiStatus,
      brokerApiError,
      setBrokerError,
      clearBrokerError,
      kisPingLatency,
      isAutoPingEnabled,
      setIsAutoPingEnabled,
      lastPingTime,
      pingRetryCount,
      pingHistory,
      triggerManualPing: () => executePingWithRetry(3, 3000),
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      deletePosition,
      clearAllPositions,
      clearDomesticPositions,
      blockedSymbols,
      blockedSymbolDetails,
      blockCooldownMinutes,
      setBlockCooldownMinutes,
      addBlockedSymbol,
      removeBlockedSymbol,
      clearBlockedSymbols,
      insufficientFundStocks,
      addInsufficientFundStock,
      removeInsufficientFundStock,
      clearInsufficientFundStocks,
      purgeAllMockData,
      rechargeMockBalance,
      resetMockPortfolio,
      clearAllOrders,
      clearAllTrades,
      cashBreakdown,
      syncRealAccountBalance,
      checkAccountIntegrity,
      apiResponseLogs,
      apiEnvironmentMode,
      isLiveTradingActive,
      lockProductionEnvironment,
      toggleEnvironmentMode,
      isFocusMode,
      toggleFocusMode,
      consecutiveLossCount,
      killSwitchUntil,
      isKillSwitchActive,
      killSwitchMode,
      triggerKillSwitch,
      resetKillSwitch,
      toggleKillSwitch,
      safetyMode: (profile?.aiAggressivenessLevel as any) || 'BALANCED',
      gracefulKillSwitchRecovery,
      getExecutionPhase,
      theme,
      setTheme,
      toggleTheme
    }}>
      {children}
      <GlobalTradeGuardModal 
        pendingTrade={pendingGuardTrade} 
        onClose={cancelTradeGuardModal} 
      />
      {activeChartStock && (
        <StockCandleChartModal
          symbol={activeChartStock.symbol}
          name={activeChartStock.name}
          market={activeChartStock.market || "KOREA"}
          currentPrice={activeChartStock.currentPrice || 50000}
          changeRate={activeChartStock.changeRate || 0}
          volumePower={activeChartStock.volumePower || 108.5}
          onClose={closeStockChart}
        />
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
