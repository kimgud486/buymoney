import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Zap,
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  BarChart2,
  ArrowRight,
  Sliders,
  Layers,
  Eye,
  RefreshCcw,
  Activity,
  Check,
  X,
  Upload,
  Camera,
  Cpu,
  Search,
  Maximize2,
  Lock,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Award,
  Flame,
  Globe,
  Bell,
  Crosshair,
  Compass,
  FileText,
  Play,
  RotateCcw,
  Share2,
  Copy,
  Info,
  Star,
  DollarSign,
  ExternalLink,
  ShieldCheck as ShieldCheckIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area,
  Cell
} from "recharts";
import { useApp } from "../context/AppContext";
import { ExpectedProfitabilityPanel } from "./ExpectedProfitabilityPanel";
import { SecuritiesPatternHeatmapWidget } from "./SecuritiesPatternHeatmapWidget";
import { AiCumulativePnLPerformanceChart } from "./trading/AiCumulativePnLPerformanceChart";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";

// ----------------------------------------------------------------------
// TYPES & INTERFACES FOR MASTER SYSTEM v7.7
// ----------------------------------------------------------------------
export type TradeSignalState =
  | "BUY"
  | "PRE_BUY_L1"
  | "PRE_BUY_L2"
  | "HOLD_STRONG"
  | "SELL_WATCH_L1"
  | "SELL_WATCH_L2"
  | "SELL"
  | "WAIT";

export type ChartViewMode = "CLEAN" | "AI" | "PRO";

export interface StockCandidate {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  categoryTags: string[];
  currentPrice: number;
  changePct: number;
  state: TradeSignalState;
  stateLabel: string;
  rankSurge: string; // e.g. "#27 → #1"
  aiRankScore: number;
  preMoveScore: number;
  preMoveSparkline: number[];
  rsScore: number;
  moneyFlowScore: number;
  riskScore: number;
  triggerPrice: number;
  distancePct: number;
  entryRange: string;
  invalidationPrice: number;
  tp1: number;
  tp2: number;
  protectedLevel: number;
  setupGrade: string; // e.g. "A+"
  primaryPath: string; // e.g. "BREAKOUT CONTINUATION"
  momentumScore: number;
  buyScore: number;
  sellScore: number;
  volumeRvol: number;
  vwapPrice: number;
  reasons: string[];
  risks: string[];
  nextRequirement: string;
}

export interface ScenarioPath {
  id: "A" | "B" | "C" | "D";
  name: string;
  title: string;
  evidenceScore: number;
  color: string;
  description: string;
}

export interface TimelineLog {
  time: string;
  state: TradeSignalState;
  label: string;
  price: number;
  buyScore: number;
  sellScore: number;
  riskScore: number;
  reason: string;
}

// Mock Stock Candidates Database for Korean Market
const MASTER_STOCK_CANDIDATES: StockCandidate[] = [
  {
    id: "005930",
    rank: 1,
    symbol: "005930",
    name: "삼성전자",
    market: "KOREA",
    categoryTags: ["반도체", "HBM", "코스피", "대형주"],
    currentPrice: 52880,
    changePct: 1.85,
    state: "PRE_BUY_L2",
    stateLabel: "🟠 돌파 임박 (매수 준비)",
    rankSurge: "+26 (#27 → #1)",
    aiRankScore: 94,
    preMoveScore: 92,
    preMoveSparkline: [64, 72, 83, 92],
    rsScore: 93,
    moneyFlowScore: 95,
    riskScore: 23,
    triggerPrice: 53020,
    distancePct: 0.26,
    entryRange: "53,020 ~ 53,100",
    invalidationPrice: 52340,
    tp1: 53850,
    tp2: 54600,
    protectedLevel: 52500,
    setupGrade: "A+",
    primaryPath: "상승 돌파 지속형 (Breakout)",
    momentumScore: 88,
    buyScore: 79,
    sellScore: 18,
    volumeRvol: 2.84,
    vwapPrice: 52650,
    reasons: [
      "주도 섹터 리더 (반도체/HBM 핵심 대장주)",
      "상대강도(RS) 93점 (시장 대비 초과 강세)",
      "수급 유입 가속도(Money Flow) 95점 급증",
      "저점을 높이는 상승 파동(Higher Low) 지속",
      "VWAP(거래량가중평균가) 상단 지지선 형성",
      "매도 호가 매물 소진율 91% 돌파"
    ],
    risks: [
      "일봉 상단 주요 저항선 54,600원 부근",
      "장중 단기 5분봉 과열 가능성 주의",
      "시초가 변동성 확대 대비 분할 진입"
    ],
    nextRequirement: "53,020원 돌파 + 거래량(RVOL) 급증 + VWAP 상단 안착 확인"
  },
  {
    id: "086520",
    rank: 2,
    symbol: "086520",
    name: "한미반도체",
    market: "KOREA",
    categoryTags: ["HBM", "반도체장비", "방열", "TC본더"],
    currentPrice: 132400,
    changePct: 4.12,
    state: "BUY",
    stateLabel: "🟢 강력 매수 확정",
    rankSurge: "+12 (#14 → #2)",
    aiRankScore: 96,
    preMoveScore: 95,
    preMoveSparkline: [70, 81, 89, 95],
    rsScore: 97,
    moneyFlowScore: 96,
    riskScore: 21,
    triggerPrice: 131000,
    distancePct: -1.06, // already broke out
    entryRange: "131,000 ~ 132,500",
    invalidationPrice: 128500,
    tp1: 136500,
    tp2: 141000,
    protectedLevel: 130800,
    setupGrade: "A+",
    primaryPath: "상승 돌파 지속형 (Breakout)",
    momentumScore: 94,
    buyScore: 91,
    sellScore: 15,
    volumeRvol: 3.45,
    vwapPrice: 130200,
    reasons: [
      "HBM 핵심 수혜주 강력 기관/외인 수급 유입",
      "전일 고점 강력 거래량 동반 상향 돌파",
      "외인/기관 동반 순매수 120억원 집계",
      "VWAP 상단 가격 지지 안착 완료"
    ],
    risks: ["140,000원 라운드피겨 심리적 저항대"],
    nextRequirement: "트레일링 보호선 130,800원 지지 지속 여부 관찰"
  },
  {
    id: "000660",
    rank: 3,
    symbol: "000660",
    name: "SK하이닉스",
    market: "KOREA",
    categoryTags: ["반도체", "HBM3E", "코스피"],
    currentPrice: 187600,
    changePct: 2.34,
    state: "PRE_BUY_L1",
    stateLabel: "🟠 수급 포착 (관심 등록)",
    rankSurge: "+5 (#8 → #3)",
    aiRankScore: 91,
    preMoveScore: 87,
    preMoveSparkline: [58, 68, 77, 87],
    rsScore: 91,
    moneyFlowScore: 89,
    riskScore: 25,
    triggerPrice: 188000,
    distancePct: 0.21,
    entryRange: "188,000 ~ 188,500",
    invalidationPrice: 184500,
    tp1: 192000,
    tp2: 196500,
    protectedLevel: 185000,
    setupGrade: "A",
    primaryPath: "상승 돌파 지속형 (Breakout)",
    momentumScore: 86,
    buyScore: 76,
    sellScore: 22,
    volumeRvol: 2.15,
    vwapPrice: 186200,
    reasons: [
      "HBM 시장 글로벌 독점력 및 실적 호조",
      "이동평균선 정배열 눌림목 매수세 유입",
      "외국인 연속 순매수세 지속"
    ],
    risks: ["미국 글로벌 반도체 지수 야간 변동성"],
    nextRequirement: "188,000원 주봉 저항선 상향 돌파 시 진입"
  },
  {
    id: "454910",
    rank: 4,
    symbol: "454910",
    name: "두산로보틱스",
    market: "KOREA",
    categoryTags: ["로봇", "협동로봇", "코스피"],
    currentPrice: 78500,
    changePct: 6.80,
    state: "BUY",
    stateLabel: "🟢 강력 매수 확정",
    rankSurge: "+18 (#22 → #4)",
    aiRankScore: 93,
    preMoveScore: 91,
    preMoveSparkline: [52, 69, 82, 91],
    rsScore: 94,
    moneyFlowScore: 93,
    riskScore: 24,
    triggerPrice: 76000,
    distancePct: -3.28,
    entryRange: "76,000 ~ 78,000",
    invalidationPrice: 74200,
    tp1: 82000,
    tp2: 86000,
    protectedLevel: 76800,
    setupGrade: "A+",
    primaryPath: "상승 돌파 지속형 (Breakout)",
    momentumScore: 92,
    buyScore: 89,
    sellScore: 19,
    volumeRvol: 4.12,
    vwapPrice: 76200,
    reasons: [
      "로봇 테마 주도 섹터 1위 등극",
      "거래대금 2,000억원 폭발적 유출입",
      "박스권 상단 상향 갭돌파 성공"
    ],
    risks: ["단기 5분봉 RSI 78 이상 과열 주의"],
    nextRequirement: "1차 목표가 82,000원 달성 여부 추적"
  },
  {
    id: "196170",
    rank: 5,
    symbol: "196170",
    name: "알테오젠",
    market: "KOREA",
    categoryTags: ["바이오", "코스닥", "ALT-B4", "신약"],
    currentPrice: 382000,
    changePct: 3.10,
    state: "PRE_BUY_L2",
    stateLabel: "🟠 돌파 임박 (매수 준비)",
    rankSurge: "+3 (#8 → #5)",
    aiRankScore: 90,
    preMoveScore: 88,
    preMoveSparkline: [60, 71, 80, 88],
    rsScore: 92,
    moneyFlowScore: 87,
    riskScore: 26,
    triggerPrice: 385000,
    distancePct: 0.78,
    entryRange: "385,000 ~ 387,000",
    invalidationPrice: 374000,
    tp1: 398000,
    tp2: 412000,
    protectedLevel: 376000,
    setupGrade: "A",
    primaryPath: "눌림목 재반등형 (Pullback)",
    momentumScore: 85,
    buyScore: 81,
    sellScore: 20,
    volumeRvol: 2.30,
    vwapPrice: 379500,
    reasons: [
      "코스닥 시가총액 1위 바이오 대장주",
      "글로벌 빅파마 기술수출 가치 재평가",
      "5분봉 VWAP 돌파 후 눌림목 완성"
    ],
    risks: ["385,000원 고점 매물대 소화 부담"],
    nextRequirement: "385,000원 호가창 대량 매도 잔량 소진"
  },
  {
    id: "247540",
    rank: 6,
    symbol: "247540",
    name: "에코프로비엠",
    market: "KOREA",
    categoryTags: ["2차전지", "양극재", "코스닥"],
    currentPrice: 168200,
    changePct: -1.45,
    state: "SELL_WATCH_L2",
    stateLabel: "⚠ 매도/리스크 주의",
    rankSurge: "-15 (#11 → #26)",
    aiRankScore: 42,
    preMoveScore: 38,
    preMoveSparkline: [62, 51, 44, 38],
    rsScore: 45,
    moneyFlowScore: 39,
    riskScore: 74,
    triggerPrice: 172000,
    distancePct: 2.25,
    entryRange: "진입 금지 (관망 권장)",
    invalidationPrice: 165000,
    tp1: 174000,
    tp2: 178000,
    protectedLevel: 167000,
    setupGrade: "D",
    primaryPath: "하락 이탈형 (Breakdown)",
    momentumScore: 32,
    buyScore: 22,
    sellScore: 78,
    volumeRvol: 0.85,
    vwapPrice: 170100,
    reasons: [
      "2차전지 업종 약세 및 매도세 우위",
      "VWAP 하향 이탈 지속",
      "기관/외인 동반 매도세 지속"
    ],
    risks: ["추가 하락 파동 리스크 급증"],
    nextRequirement: "172,000원 지지선 재탈환 전까지 관망"
  }
];

// 5-minute candle history generator for selected stock
function generateCandleData(stock: StockCandidate) {
  const base = stock.currentPrice;
  const data = [];
  let current = base * 0.985;
  const now = new Date();

  for (let i = 25; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 5 * 60 * 1000);
    const timeStr = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;

    const change = (Math.random() - 0.44) * (base * 0.005);
    const open = Math.round(current);
    const close = Math.round(open + change);
    const high = Math.round(Math.max(open, close) + Math.random() * (base * 0.003));
    const low = Math.round(Math.min(open, close) - Math.random() * (base * 0.003));
    const volume = Math.round(15000 + Math.random() * 80000);
    const vwap = Math.round(stock.vwapPrice + (25 - i) * 10);

    current = close;
    data.push({
      time: timeStr,
      open,
      high,
      low,
      close,
      volume,
      vwap,
      ema20: Math.round(vwap * 0.998),
      upperBand: Math.round(vwap * 1.012),
      lowerBand: Math.round(vwap * 0.988)
    });
  }

  // Ensure last candle matches stock current price
  if (data.length > 0) {
    data[data.length - 1].close = stock.currentPrice;
  }
  return data;
}

export function AiLiveTradingTotalMasterSystem() {
  const { 
    profile, 
    setSelectedSymbol, 
    openStockChart, 
    requestTradeConfirmation, 
    executeTrade, 
    addToWatchlist, 
    removeFromWatchlist, 
    isInWatchlist, 
    addToast, 
    triggerLiveSignalLog, 
    brokerApiStatus, 
    cashBreakdown 
  } = useApp();

  // Active Stock Candidates List with Live Feed
  const [candidates, setCandidates] = useState<StockCandidate[]>(MASTER_STOCK_CANDIDATES);
  const [selectedStock, setSelectedStock] = useState<StockCandidate>(MASTER_STOCK_CANDIDATES[0]);
  const [filterTag, setFilterTag] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [liveSearchResults, setLiveSearchResults] = useState<any[]>([]);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [isLiveFeedConnected, setIsLiveFeedConnected] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("aistock_realtime_feed_active");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  // Global Realtime Feed ON / OFF toggle handler
  const handleToggleFeed = () => {
    const nextState = !isLiveFeedConnected;
    setIsLiveFeedConnected(nextState);
    try {
      localStorage.setItem("aistock_realtime_feed_active", String(nextState));
    } catch (e) {
      console.warn("Save feed state err:", e);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("realtime_feed_status_change", {
        detail: { isFeedActive: nextState }
      }));
    }
    addToast(
      nextState ? "실시간 시세 API 연동 활성화 (ON)" : "실시간 시세 API 연동 중지 (OFF)",
      nextState ? "SUCCESS" : "INFO"
    );
    if (nextState) {
      fetchLiveQuotes();
    }
  };

  useEffect(() => {
    const handleFeedStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isFeedActive: boolean }>;
      if (customEvent.detail && customEvent.detail.isFeedActive !== undefined) {
        setIsLiveFeedConnected(customEvent.detail.isFeedActive);
      }
    };
    window.addEventListener("realtime_feed_status_change", handleFeedStatusChange);
    return () => window.removeEventListener("realtime_feed_status_change", handleFeedStatusChange);
  }, []);

  // Position Mode Toggle (Analysis vs Position Active Trading)
  const [isPositionMode, setIsPositionMode] = useState<boolean>(false);
  const [positionStats, setPositionStats] = useState({
    entryPrice: 53060,
    currentPrice: 54200,
    plPct: 2.15,
    rMultiple: 1.58,
    mfe: 1.72,
    mae: -0.18,
    protectedLevel: 53520
  });

  // 1. Real-time Live Price Polling from Backend APIs (Naver, Yahoo, Upbit)
  const fetchLiveQuotes = async () => {
    try {
      setIsLiveSyncing(true);
      
      // Fetch default preset updates
      const res = await fetch(`/api/stocks/search?q=`);
      let liveList: any[] = [];
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          liveList = await res.json();
        }
      }

      // If selectedStock exists and is not in liveList, fetch its live quote directly
      if (selectedStock && selectedStock.symbol) {
        const inList = liveList.find(
          (item: any) => item.symbol?.toUpperCase() === selectedStock.symbol.toUpperCase()
        );
        if (!inList) {
          try {
            const symRes = await fetch(`/api/stocks/${encodeURIComponent(selectedStock.symbol)}`);
            if (symRes.ok) {
              const symData = await symRes.json();
              if (symData && symData.price) {
                liveList.push(symData);
              }
            }
          } catch (e) {}
        }
      }

      if (Array.isArray(liveList) && liveList.length > 0) {
        setCandidates((prev) =>
          prev.map((c) => {
            const matched = liveList.find(
              (item: any) => item.symbol?.toUpperCase() === c.symbol?.toUpperCase() || item.name === c.name
            );
            if (matched && matched.price) {
              const newPrice = matched.price;
              const changePct = matched.changePct ?? matched.changePercent ?? c.changePct;
              const trig = c.triggerPrice || newPrice;
              const dist = trig > 0 ? +(((trig - newPrice) / newPrice) * 100).toFixed(2) : 0;
              
              // Determine live state
              let newState = c.state;
              let newStateLabel = c.stateLabel;
              if (dist <= 0) {
                newState = "BUY";
                newStateLabel = "🟢 강력 매수 확정";
              } else if (dist <= 0.8) {
                newState = "PRE_BUY_L2";
                newStateLabel = "🟠 돌파 임박 (매수 준비)";
              } else if (dist <= 2.0) {
                newState = "PRE_BUY_L1";
                newStateLabel = "🟠 수급 포착 (관심 등록)";
              }

              return {
                ...c,
                currentPrice: newPrice,
                changePct,
                distancePct: dist,
                state: newState,
                stateLabel: newStateLabel
              };
            }
            return c;
          })
        );

        // Also update active selectedStock
        setSelectedStock((prev) => {
          const matched = liveList.find(
            (item: any) => item.symbol?.toUpperCase() === prev.symbol?.toUpperCase() || item.name === prev.name
          );
          if (matched && matched.price) {
            const newPrice = matched.price;
            const changePct = matched.changePct ?? matched.changePercent ?? prev.changePct;
            return {
              ...prev,
              currentPrice: newPrice,
              changePct
            };
          }
          return prev;
        });

        setLastSyncTime(new Date().toLocaleTimeString());
        setIsLiveFeedConnected(true);
      }
    } catch (e) {
      console.warn("[Live Master System] Poll error:", e);
    } finally {
      setIsLiveSyncing(false);
    }
  };

  // Run live quote polling on mount and interval (every 2.5s for ultra-fast ticking)
  useEffect(() => {
    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 2500);
    return () => clearInterval(interval);
  }, [selectedStock.symbol]);

  // 2. Real-Time Candle & Quant Factor Sync from `/api/quant/matrix/:symbol`
  useEffect(() => {
    let isCancelled = false;
    const fetchQuantMatrix = async () => {
      try {
        const res = await fetch(`/api/quant/matrix/${selectedStock.symbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data && !isCancelled) {
            // If real candles are returned, format and apply them to chartData
            if (Array.isArray(data.candles) && data.candles.length > 0) {
              const formattedCandles = data.candles.map((c: any) => ({
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
                vwap: data.realVwap || data.vwap || c.close,
                ema20: Math.round((data.realVwap || c.close) * 0.998),
                upperBand: Math.round((data.realVwap || c.close) * 1.012),
                lowerBand: Math.round((data.realVwap || c.close) * 0.988)
              }));
              setChartData(formattedCandles);
            }

            // Sync dynamic real-time factor indicators
            setSelectedStock((prev) => {
              if (prev.symbol !== selectedStock.symbol) return prev;
              const livePrice = data.price || prev.currentPrice;
              const trig = data.targetPrice1 ? Math.round(data.necklinePrice || livePrice * 1.002) : prev.triggerPrice;
              const dist = trig > 0 ? +(((trig - livePrice) / livePrice) * 100).toFixed(2) : prev.distancePct;
              
              return {
                ...prev,
                currentPrice: livePrice,
                changePct: data.changePct !== undefined ? data.changePct : prev.changePct,
                volumeRvol: data.rvol || prev.volumeRvol,
                vwapPrice: data.realVwap || data.vwap || prev.vwapPrice,
                rsScore: data.rsScore || prev.rsScore,
                aiRankScore: data.score || data.setupScore || prev.aiRankScore,
                buyScore: Math.min(99, Math.max(10, Math.round((data.score || 80) * 0.95))),
                momentumScore: Math.min(99, Math.max(10, Math.round(data.rsScore || 85))),
                riskScore: data.sslSwept ? 18 : 28,
                triggerPrice: trig,
                distancePct: dist,
                tp1: data.targetPrice1 || prev.tp1,
                tp2: data.targetPrice2 || prev.tp2,
                invalidationPrice: data.stopLossPrice || prev.invalidationPrice,
                protectedLevel: data.realVwap ? Math.round(data.realVwap * 0.995) : prev.protectedLevel,
                reasons: [
                  `${data.detectedCandlePattern || "상승 장악형 캔들 형성"}`,
                  `${data.detectedChartPattern || "박스 돌파 패턴"}`,
                  `RVOL ${data.rvol || prev.volumeRvol}x (실거래량 실시간 연동)`,
                  `RS Score ${data.rsScore || prev.rsScore}점 (시장 대비 초과 강세)`,
                  `VWAP ${(data.realVwap || prev.vwapPrice).toLocaleString()}원 상단 지지`
                ]
              };
            });
          }
        }
      } catch (err) {
        console.warn("[Live Master System] Quant matrix sync error:", err);
      }
    };

    fetchQuantMatrix();
  }, [selectedStock.symbol]);

  // 3. Dynamic Real Stock Search across Korean Market, US, and Upbit Crypto
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 1) {
      setLiveSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results) && results.length > 0) {
            setLiveSearchResults(results);
            setCandidates((prev) => {
              const updated = [...prev];
              results.forEach((s: any) => {
                const exists = updated.some((item) => item.symbol.toUpperCase() === s.symbol.toUpperCase());
                if (!exists) {
                  const mType = s.market === "US" ? "US" : s.market === "BTC" || s.market === "UPBIT" ? "BTC" : "KOREA";
                  const p = s.price || 10000;
                  const trig = Math.round(p * 1.005);
                  const newCand: StockCandidate = {
                    id: s.symbol,
                    rank: updated.length + 1,
                    symbol: s.symbol,
                    name: s.name,
                    market: mType,
                    categoryTags: [mType, "실시간 연동"],
                    currentPrice: p,
                    changePct: s.changePct || 0,
                    state: "PRE_BUY_L1",
                    stateLabel: "🟠 수급 포착 (관심 등록)",
                    rankSurge: "+신규",
                    aiRankScore: 85,
                    preMoveScore: 82,
                    preMoveSparkline: [60, 70, 78, 82],
                    rsScore: 84,
                    moneyFlowScore: 86,
                    riskScore: 26,
                    triggerPrice: trig,
                    distancePct: 0.5,
                    entryRange: `${(p ?? 0).toLocaleString()} ~ ${(trig ?? 0).toLocaleString()}`,
                    invalidationPrice: Math.round(p * 0.975),
                    tp1: Math.round(p * 1.03),
                    tp2: Math.round(p * 1.06),
                    protectedLevel: Math.round(p * 0.99),
                    setupGrade: "A",
                    primaryPath: "상승 돌파 지속형 (Breakout)",
                    momentumScore: 85,
                    buyScore: 80,
                    sellScore: 20,
                    volumeRvol: 2.1,
                    vwapPrice: Math.round(p * 0.995),
                    reasons: ["실시간 호가/체결 데이터 연동", "AI 실시간 모멘텀 감지"],
                    risks: ["변동성 확대 주의"],
                    nextRequirement: "실시간 거래량 및 VWAP 지지 확인"
                  };
                  updated.unshift(newCand);
                }
              });
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn("[Live Search Error]:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Listen to Global Stock Sync (from 4대 증권사 컨센서스 & 실시간 히트맵 or Keyword engine)
  useEffect(() => {
    const unsub = stockSyncService.subscribe(async (event: StockSyncEvent) => {
      if (!event.symbol) return;
      const targetSym = event.symbol;
      
      const existing = candidates.find(c => c.symbol.toUpperCase() === targetSym.toUpperCase());
      if (existing) {
        handleSelectStock(existing);
      } else {
        const evAny = event as any;
        const mType: "KOREA" | "US" | "BTC" = event.market === "US" ? "US" : (event.market === "BTC" || evAny.market === "UPBIT") ? "BTC" : "KOREA";
        const p = event.price || 10000;
        const newCand: StockCandidate = {
          id: targetSym,
          rank: candidates.length + 1,
          symbol: targetSym,
          name: event.name || targetSym,
          market: mType,
          categoryTags: [mType, "히트맵 연동"],
          currentPrice: p,
          changePct: evAny.changePct || 0,
          state: "PRE_BUY_L1",
          stateLabel: "🟠 수급 포착 (관심 등록)",
          rankSurge: "+신규",
          aiRankScore: 88,
          preMoveScore: 85,
          preMoveSparkline: [65, 72, 80, 85],
          rsScore: 86,
          moneyFlowScore: 89,
          riskScore: 24,
          triggerPrice: Math.round(p * 1.005),
          distancePct: 0.5,
          entryRange: `${(p ?? 0).toLocaleString()} ~ ${(Math.round(p * 1.005)).toLocaleString()}`,
          invalidationPrice: Math.round(p * 0.975),
          tp1: Math.round(p * 1.03),
          tp2: Math.round(p * 1.06),
          protectedLevel: Math.round(p * 0.99),
          setupGrade: "A+",
          primaryPath: "상승 돌파 지속형 (Breakout)",
          momentumScore: 88,
          buyScore: 85,
          sellScore: 15,
          volumeRvol: 2.5,
          vwapPrice: Math.round(p * 0.995),
          reasons: ["4대 증권사 컨센서스 연동", "실시간 호가/체결 데이터 연동"],
          risks: ["변동성 확대 주의"],
          nextRequirement: "실시간 거래량 및 VWAP 지지 확인"
        };
        setCandidates(prev => [newCand, ...prev]);
        handleSelectStock(newCand);
      }
    });
    return unsub;
  }, [candidates]);

  // 5. WebSocket & Global Ticker Event Listeners for Instant Price Flashes
  useEffect(() => {
    const handleStockTicker = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent.detail;
      if (!detail) return;

      setCandidates((prev) =>
        prev.map((s) => {
          if (Array.isArray(detail)) {
            const matched = detail.find((t: any) => t.symbol === s.symbol);
            if (matched && matched.currentPrice) {
              return {
                ...s,
                currentPrice: matched.currentPrice,
                changePct: matched.changePct || s.changePct
              };
            }
          }
          return s;
        })
      );
    };

    window.addEventListener("stock_ticker_update", handleStockTicker);
    return () => window.removeEventListener("stock_ticker_update", handleStockTicker);
  }, []);

  // Handler for selecting stock and syncing global state with instant live quote fetch
  const handleSelectStock = async (stock: StockCandidate) => {
    setSelectedStock(stock);
    setSelectedSymbol(stock.symbol);
    setSearchQuery("");
    setLiveSearchResults([]);

    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(stock.symbol)}`);
      if (res.ok) {
        const live = await res.json();
        if (live && live.price > 0) {
          const updatedStock: StockCandidate = {
            ...stock,
            currentPrice: live.price,
            changePct: live.changePct !== undefined ? live.changePct : stock.changePct,
            triggerPrice: live.price > 0 ? Math.round(live.price * 1.002) : stock.triggerPrice,
            invalidationPrice: live.price > 0 ? Math.round(live.price * 0.975) : stock.invalidationPrice,
            tp1: live.price > 0 ? Math.round(live.price * 1.03) : stock.tp1,
            tp2: live.price > 0 ? Math.round(live.price * 1.06) : stock.tp2,
            vwapPrice: live.price > 0 ? Math.round(live.price * 0.995) : stock.vwapPrice
          };
          setSelectedStock(updatedStock);
          setCandidates((prev) =>
            prev.map((c) => (c.symbol === stock.symbol ? updatedStock : c))
          );
        }
      }
    } catch (e) {
      console.warn("Live stock select sync error:", e);
    }
  };

  // Handler for executing Buy Order via Global Trade Guard
  const handleExecuteBuyOrder = async () => {
    try {
      addToast(`[${selectedStock.name}] AI 매수 타점 주문 검증 중...`, "INFO");
      const confirmed = await requestTradeConfirmation({
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        market: selectedStock.market,
        side: "BUY",
        qty: 10,
        price: selectedStock.triggerPrice || selectedStock.currentPrice,
        strategyName: "AI Setup Breakout v7.7",
        aiRationale: selectedStock.reasons.join(", ")
      });

      if (confirmed) {
        setIsPositionMode(true);
        triggerLiveSignalLog({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          market: selectedStock.market,
          action: "BUY",
          message: `[v7.7 Master Terminal] ${selectedStock.name} (${selectedStock.symbol}) 10주 매수 체결 완료 (진입가: ${(selectedStock.triggerPrice || selectedStock.currentPrice).toLocaleString()}원)`
        });
        addToast(`${selectedStock.name} 10주 매수 주문 체결 완료!`, "SUCCESS");
      }
    } catch (e: any) {
      addToast(`주문 실행 실패: ${e?.message || e}`, "ERROR");
    }
  };

  // Handler for executing Sell / Exit Order via Global Trade Guard
  const handleExecuteSellOrder = async () => {
    try {
      addToast(`[${selectedStock.name}] AI 매도 청산 검증 중...`, "WARNING");
      const confirmed = await requestTradeConfirmation({
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        market: selectedStock.market,
        side: "SELL",
        qty: 10,
        price: selectedStock.currentPrice,
        strategyName: "AI Exit Signal v7.7",
        aiRationale: "Protected Level 이탈 또는 AI 매도 전환"
      });

      if (confirmed) {
        setIsPositionMode(false);
        triggerLiveSignalLog({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          market: selectedStock.market,
          action: "SELL",
          message: `[v7.7 Master Terminal] ${selectedStock.name} (${selectedStock.symbol}) 10주 매도 체결 완료 (현재가: ${(selectedStock.currentPrice ?? 0).toLocaleString()}원)`
        });
        addToast(`${selectedStock.name} 매도 청산 완료!`, "SUCCESS");
      }
    } catch (e: any) {
      addToast(`청산 실패: ${e?.message || e}`, "ERROR");
    }
  };

  // Handler for opening full interactive candlestick modal
  const handleOpenChartModal = () => {
    openStockChart({
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      market: selectedStock.market,
      currentPrice: selectedStock.currentPrice,
      changeRate: selectedStock.changePct
    });
  };

  // Chart View Mode
  const [chartMode, setChartMode] = useState<ChartViewMode>("AI");
  const [timeframe, setTimeframe] = useState<string>("5m");

  // Image Screenshot Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<"IDLE" | "ANALYZING" | "DONE">("IDLE");
  const [uploadProgress, setUploadProgress] = useState({
    marketRegime: 0,
    sectorRS: 0,
    priceStructure: 0,
    moneyFlow: 0,
    entryRisk: 0
  });

  // Candle Chart Data
  const [chartData, setChartData] = useState(() => generateCandleData(selectedStock));

  useEffect(() => {
    setChartData(generateCandleData(selectedStock));
  }, [selectedStock]);

  // Timeline Logs for selected stock
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([
    {
      time: "09:51",
      state: "WAIT",
      label: "⚪ 관망 대기",
      price: 52400,
      buyScore: 45,
      sellScore: 30,
      riskScore: 28,
      reason: "52,340원 지지대 형성 후 거래량 관망"
    },
    {
      time: "09:54",
      state: "PRE_BUY_L1",
      label: "🟠 수급 포착 (관심 등록)",
      price: 52620,
      buyScore: 68,
      sellScore: 22,
      riskScore: 26,
      reason: "VWAP 52,650원 상향 시도 + 수급 증가 감지"
    },
    {
      time: "09:56",
      state: "PRE_BUY_L2",
      label: "🟠 돌파 임박 (매수 준비)",
      price: 52880,
      buyScore: 79,
      sellScore: 18,
      riskScore: 23,
      reason: "53,020원 돌파 임박 (괴리율 0.26%) + 거래량(RVOL) 폭발"
    },
    {
      time: "09:59",
      state: "BUY",
      label: "🟢 강력 매수 확정",
      price: 53060,
      buyScore: 91,
      sellScore: 15,
      riskScore: 21,
      reason: "53,020원 강한 수급과 함께 상향 돌파 안착"
    },
    {
      time: "10:06",
      state: "HOLD_STRONG",
      label: "🚀 강력 보유 지속",
      price: 53800,
      buyScore: 93,
      sellScore: 12,
      riskScore: 18,
      reason: "트레일링 보호선 53,520원 자동 상향 적용"
    }
  ]);

  // Filtered Stock Candidates from Live Universe
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.includes(searchQuery) ||
      c.symbol.includes(searchQuery) ||
      c.categoryTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterTag === "ALL") return matchesSearch;
    if (filterTag === "AI_TOP") return matchesSearch && c.rank <= 3;
    if (filterTag === "PRE_MOVE") return matchesSearch && c.preMoveScore >= 85;
    if (filterTag === "BREAKOUT") return matchesSearch && (c.state === "BUY" || c.state === "PRE_BUY_L2");
    if (filterTag === "MONEY_FLOW") return matchesSearch && c.moneyFlowScore >= 90;
    if (filterTag === "RS_LEADER") return matchesSearch && c.rsScore >= 90;
    if (filterTag === "SELL_RISK") return matchesSearch && (c.state === "SELL" || c.state === "SELL_WATCH_L2");

    return matchesSearch;
  });

  // Handle Image Upload Simulation
  const handleStartImageAnalysis = () => {
    setUploadStep("ANALYZING");
    setUploadProgress({ marketRegime: 0, sectorRS: 0, priceStructure: 0, moneyFlow: 0, entryRisk: 0 });

    let p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0;
    const timer = setInterval(() => {
      p1 = Math.min(100, p1 + 25);
      p2 = Math.min(100, p2 + 20);
      p3 = Math.min(100, p3 + 18);
      p4 = Math.min(100, p4 + 15);
      p5 = Math.min(100, p5 + 12);

      setUploadProgress({
        marketRegime: p1,
        sectorRS: p2,
        priceStructure: p3,
        moneyFlow: p4,
        entryRisk: p5
      });

      if (p1 >= 100 && p2 >= 100 && p3 >= 100 && p4 >= 100 && p5 >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setUploadStep("DONE");
        }, 400);
      }
    }, 120);
  };

  // Scenario Paths
  const scenarioPaths: ScenarioPath[] = [
    {
      id: "A",
      name: "상승 돌파 시나리오 (Breakout)",
      title: "BREAKOUT CONTINUATION",
      evidenceScore: 88,
      color: "emerald",
      description: "53,020원 돌파 후 53,850원(1차) 및 54,600원(2차) 직행 파동"
    },
    {
      id: "B",
      name: "눌림목 재반등 시나리오 (Pullback)",
      title: "PULLBACK RETEST & RALLY",
      evidenceScore: 76,
      color: "cyan",
      description: "52,880원 지지 재확인 후 수급 재차 유입으로 상승"
    },
    {
      id: "C",
      name: "박스권 횡보 소모전 (Range)",
      title: "INTRADAY RANGE BOUND",
      evidenceScore: 34,
      color: "amber",
      description: "52,500원 ~ 53,100원 박스권 횡보 소모전"
    },
    {
      id: "D",
      name: "지지선 이탈 하락 (Breakdown)",
      title: "INVALIDATION BREAKDOWN",
      evidenceScore: 19,
      color: "rose",
      description: "52,340원 무효화 지지선 이탈 시 손절 및 매도 전환"
    }
  ];

  return (
    <div className="space-y-3 font-sans text-zinc-900 bg-zinc-950 p-2 sm:p-4 rounded-3xl border border-zinc-800 shadow-2xl animate-fadeIn">
      
      {/* ==================================================================== */}
      {/* 0. TOP MARKET HEADER & REGIME BANNER */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Market Indices & Regime Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-400">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>AI 실시간 트레이딩 마스터 터미널 v7.7</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className="text-zinc-500">코스피:</span>
            <span className="text-emerald-400">+0.82%</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">코스닥:</span>
            <span className="text-emerald-400">+1.31%</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">KIS 증권사 API:</span>
            <span className={brokerApiStatus?.korea === "CONNECTED" ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
              {brokerApiStatus?.korea === "CONNECTED" ? "🟢 연동완료" : "🟠 대기"}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-cyan-300 font-black">
              {(cashBreakdown?.totalAvailableCash ?? profile?.balance ?? 0).toLocaleString()}원
            </span>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-950 to-zinc-900 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-black text-amber-300">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>시장 국면: 강력 상승장 (82점)</span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>시장 리스크 지수: 32 (안전)</span>
          </div>
        </div>

        {/* Right Sector Rotation Ticker */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-xl">
          <span className="text-amber-400 font-black flex items-center gap-1">
            <Zap className="w-3 h-3" /> 주도 업종 모멘텀:
          </span>
          <span className="text-emerald-400">1 로봇 (93↑↑)</span>
          <span className="text-zinc-700">•</span>
          <span className="text-emerald-300">2 반도체 (89↑)</span>
          <span className="text-zinc-700">•</span>
          <span className="text-emerald-300">3 전력인프라 (86↑)</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-400">4 바이오 (68→)</span>
          <span className="text-zinc-700">•</span>
          <span className="text-rose-400">5 2차전지 (52↓)</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 0.1. AI 100% AUTONOMOUS TRADING EXECUTIVE SUMMARY & MECHANISM BANNER */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-cyan-950/90 via-zinc-900 to-indigo-950/90 border border-cyan-500/50 rounded-2xl p-3.5 text-white space-y-2.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-black animate-pulse flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-emerald-400" />
              <span>🤖 100% AI 자율 자동 매매 가동 중 (FULL-AUTO)</span>
            </span>
            <span className="text-xs text-zinc-300 font-bold hidden md:inline">
              30인 AI 집단 지성 알고리즘이 24시간 실시간 시세를 탐색하여 자율 주문을 집행합니다.
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 font-bold">
            한국투자증권(KIS) OpenAPI 0.1초 자동 체결 연동
          </span>
        </div>

        {(() => {
          const isUsd = selectedStock.symbol?.match(/^[A-Z]+$/) || selectedStock.name?.includes("엔비디아") || selectedStock.name?.includes("테슬라");
          const currSign = isUsd ? "$" : "₩";
          const basePrice = selectedStock.triggerPrice || 78000;
          const tp1Pct = selectedStock.tp1 ? (((selectedStock.tp1 - basePrice) / basePrice) * 100).toFixed(1) : "3.0";
          const tp2Pct = selectedStock.tp2 ? (((selectedStock.tp2 - basePrice) / basePrice) * 100).toFixed(1) : "6.0";

          const capital = isUsd ? 5000 : 5000000;
          const profit1 = Math.round(capital * (parseFloat(tp1Pct) / 100));
          const profit2 = Math.round(capital * (parseFloat(tp2Pct) / 100));

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-cyan-500/30 space-y-0.5">
                <div className="text-cyan-400 font-black text-[11px] flex items-center justify-between">
                  <span>1. 어디서 사고 (AI 자율 매수)</span>
                  <span className="text-[10px] text-cyan-300 font-mono font-bold">[{selectedStock.name}]</span>
                </div>
                <div className="text-white font-extrabold font-mono text-sm">
                  {selectedStock.entryRange || `${currSign}${(selectedStock.triggerPrice ?? 0).toLocaleString()} 돌파 시`}
                </div>
                <p className="text-[10px] text-zinc-400">
                  거래량(RVOL 2.5배+) 폭발 및 돌파 타점 포착 시 KIS API로 자동 매수 발주
                </p>
              </div>

              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-emerald-500/30 space-y-0.5">
                <div className="text-emerald-400 font-black text-[11px]">2. 어디서 팔고 (AI 자율 매도)</div>
                <div className="text-white font-extrabold font-mono text-sm">
                  1차 {currSign}{(selectedStock.tp1 ?? 0).toLocaleString()} (+{tp1Pct}%) / 2차 {currSign}{(selectedStock.tp2 ?? 0).toLocaleString()} (+{tp2Pct}%)
                </div>
                <p className="text-[10px] text-zinc-400">
                  목표 도달 시 AI 분할 익절 매도 및 손절선({currSign}{(selectedStock.invalidationPrice ?? 0).toLocaleString()}) 이탈 시 자동 청산
                </p>
              </div>

              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-amber-500/30 space-y-0.5">
                <div className="text-amber-300 font-black text-[11px]">3. 얼마의 이익을 보는지 (선택종목 수익 목표)</div>
                <div className="text-amber-300 font-extrabold font-mono text-sm">
                  {isUsd 
                    ? `+${tp1Pct}% ~ +${tp2Pct}% (+$${(profit1 ?? 0).toLocaleString()} ~ +$${(profit2 ?? 0).toLocaleString()} / $5천불 기준)`
                    : `+${tp1Pct}% ~ +${tp2Pct}% (+${Math.round(profit1/10000)}만 ~ +${Math.round(profit2/10000)}만원 / 500만 투자 시)`
                  }
                </div>
                <p className="text-[10px] text-zinc-400">
                  [{selectedStock.name}] 시세 연동 AI가 Risk/Reward 비율 1:2.5 이상 구간만 자동 선택 체결
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ==================================================================== */}
      {/* 0.5. REAL-TIME LIVE DATA FEED STATUS BANNER WITH ON / OFF TOGGLE */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-cyan-950/70 border border-emerald-500/30 rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex h-2.5 w-2.5 relative">
            {isLiveFeedConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-500"></span>
            )}
          </span>
          <span className={`font-black ${isLiveFeedConnected ? "text-emerald-300" : "text-zinc-400"}`}>
            {isLiveFeedConnected
              ? "실시간 실제 시세 API 연동 가동 중 (KRX · 나스닥 · 업비트 실체결가)"
              : "실시간 시세 API 연동 일시정지 (OFF/아웃 상태)"}
          </span>
          <span className="hidden sm:inline text-zinc-400 text-[11px]">
            {isLiveFeedConnected ? "• 3초 주기 자동 동기화" : "• 시세 업데이트 일시 중지"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {/* Real-time API ON / OFF Toggle Button */}
          <button
            onClick={handleToggleFeed}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer border shadow-xs ${
              isLiveFeedConnected
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
            }`}
            title="실시간 시세 API 온/아웃 (ON / OFF) 전환"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveFeedConnected ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
            <span>실시간 시세 API: {isLiveFeedConnected ? "ON (온)" : "OFF (아웃)"}</span>
          </button>

          <span className="text-zinc-400 font-medium hidden md:inline">
            수신 시각: <strong className="text-cyan-300 font-mono">{lastSyncTime}</strong>
          </span>

          <button
            onClick={fetchLiveQuotes}
            disabled={isLiveSyncing || !isLiveFeedConnected}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="실시간 시세 즉시 갱신"
          >
            <RefreshCcw className={`w-3 h-3 text-cyan-400 ${isLiveSyncing ? "animate-spin" : ""}`} />
            <span>{isLiveSyncing ? "수신 중..." : "새로고침"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEARCH BAR & MODE CONTROLS */}
      {/* ==================================================================== */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search Input supporting Stock Name / Code / Theme Keywords */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && liveSearchResults.length > 0) {
                const s = liveSearchResults[0];
                const mType = s.market === "US" ? "US" : s.market === "BTC" || s.market === "UPBIT" ? "BTC" : "KOREA";
                const p = s.price || 10000;
                const cand: StockCandidate = {
                  id: s.symbol,
                  rank: 1,
                  symbol: s.symbol,
                  name: s.name || s.symbol,
                  market: mType,
                  categoryTags: [mType, "실시간 연동"],
                  currentPrice: p,
                  changePct: s.changePct ?? s.changePercent ?? 0,
                  state: "PRE_BUY_L1",
                  stateLabel: "🟠 수급 포착 (관심 등록)",
                  rankSurge: "+신규",
                  aiRankScore: 88,
                  preMoveScore: 85,
                  preMoveSparkline: [65, 75, 82, 88],
                  rsScore: 86,
                  moneyFlowScore: 88,
                  riskScore: 24,
                  triggerPrice: Math.round(p * 1.005),
                  distancePct: 0.5,
                  entryRange: `${(p ?? 0).toLocaleString()} ~ ${(Math.round(p * 1.005)).toLocaleString()}`,
                  invalidationPrice: Math.round(p * 0.975),
                  tp1: Math.round(p * 1.03),
                  tp2: Math.round(p * 1.06),
                  protectedLevel: Math.round(p * 0.99),
                  setupGrade: "A+",
                  primaryPath: "상승 돌파 지속형 (Breakout)",
                  momentumScore: 88,
                  buyScore: 85,
                  sellScore: 15,
                  volumeRvol: 2.5,
                  vwapPrice: Math.round(p * 0.995),
                  reasons: ["실시간 호가/체결 데이터 100% 실시간 연동", "AI 실시간 퀀트 모멘텀 감지"],
                  risks: ["변동성 확대 주의"],
                  nextRequirement: "실시간 거래량 및 VWAP 지지 확인"
                };
                setCandidates((prev) => [cand, ...prev.filter(c => c.symbol !== cand.symbol)]);
                handleSelectStock(cand);
              }
            }}
            placeholder="🔍 종목명 / 종목코드 / 테마 검색 (예: 삼성전자, SK하이닉스, 알테오젠, BTC)..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setLiveSearchResults([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Real-Time Live Search Dropdown */}
          {searchQuery.trim().length > 0 && liveSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl divide-y divide-zinc-800">
              <div className="px-3 py-1.5 bg-zinc-900/90 text-[10px] font-black text-cyan-300 flex items-center justify-between">
                <span>실시간 실제 시세 매칭 종목</span>
                <span className="text-zinc-500 font-mono">클릭 시 즉시 터미널 갱신</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {liveSearchResults.map((item) => {
                  const isUp = (item.changePct ?? item.changePercent ?? 0) >= 0;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => {
                        const mType = item.market === "US" ? "US" : item.market === "BTC" || item.market === "UPBIT" ? "BTC" : "KOREA";
                        const p = item.price || 10000;
                        const cand: StockCandidate = {
                          id: item.symbol,
                          rank: 1,
                          symbol: item.symbol,
                          name: item.name || item.symbol,
                          market: mType,
                          categoryTags: [mType, "검색 연동"],
                          currentPrice: p,
                          changePct: item.changePct ?? item.changePercent ?? 0,
                          state: "PRE_BUY_L1",
                          stateLabel: "🟠 수급 포착 (관심 등록)",
                          rankSurge: "+신규",
                          aiRankScore: 88,
                          preMoveScore: 85,
                          preMoveSparkline: [65, 75, 82, 88],
                          rsScore: 86,
                          moneyFlowScore: 88,
                          riskScore: 24,
                          triggerPrice: Math.round(p * 1.005),
                          distancePct: 0.5,
                          entryRange: `${(p ?? 0).toLocaleString()} ~ ${(Math.round(p * 1.005)).toLocaleString()}`,
                          invalidationPrice: Math.round(p * 0.975),
                          tp1: Math.round(p * 1.03),
                          tp2: Math.round(p * 1.06),
                          protectedLevel: Math.round(p * 0.99),
                          setupGrade: "A+",
                          primaryPath: "상승 돌파 지속형 (Breakout)",
                          momentumScore: 88,
                          buyScore: 85,
                          sellScore: 15,
                          volumeRvol: 2.5,
                          vwapPrice: Math.round(p * 0.995),
                          reasons: ["실시간 호가/체결 데이터 100% 실시간 연동", "AI 실시간 모멘텀 감지"],
                          risks: ["변동성 확대 주의"],
                          nextRequirement: "실시간 거래량 및 VWAP 지지 확인"
                        };
                        setCandidates((prev) => [cand, ...prev.filter(c => c.symbol !== cand.symbol)]);
                        handleSelectStock(cand);
                      }}
                      className="px-3.5 py-2.5 hover:bg-zinc-800/90 transition flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-black text-white group-hover:text-cyan-400 transition">
                          {item.name}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          {item.symbol}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-white">
                          {item.price ? `${Number(item.price).toLocaleString()}원` : "-"}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? "+" : ""}{(item.changePct ?? item.changePercent ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Switchers */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Position Mode Toggle Button */}
          <button
            onClick={() => setIsPositionMode(!isPositionMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border ${
              isPositionMode
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400/50"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
            <span>{isPositionMode ? "🚀 포지션 보유 모드 (체결 운용)" : "⏸️ 실시간 분석 모드 (타점 대기)"}</span>
          </button>

          {/* New Screenshot AI Chart Analysis Modal Trigger */}
          <button
            onClick={() => {
              setIsUploadModalOpen(true);
              setUploadStep("IDLE");
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/50 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Camera className="w-3.5 h-3.5 text-purple-200" />
            <span>+ AI 차트 스크린샷 정밀 분석</span>
          </button>

          {/* Chart View Mode Selector */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {(["CLEAN", "AI", "PRO"] as ChartViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  chartMode === mode
                    ? "bg-cyan-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {mode === "CLEAN" ? "💡 기본 클린" : mode === "AI" ? "🤖 AI 타점 분석" : "🔥 PRO 구조 분석"}
              </button>
            ))}
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {["1m", "3m", "5m", "15m", "60m", "D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  timeframe === tf
                    ? "bg-zinc-800 text-cyan-400 border border-cyan-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tf === "1m" ? "1분" : tf === "3m" ? "3분" : tf === "5m" ? "5분" : tf === "15m" ? "15분" : tf === "60m" ? "60분" : "일봉"}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* REAL-TIME PROFIT-LOSS RATIO MONITOR WITH LIVE ORDER BOOK DEPTH */}
      <ExpectedProfitabilityPanel 
        symbol={selectedStock.symbol}
        name={selectedStock.name}
        market={selectedStock.market}
        currentPrice={selectedStock.currentPrice}
        entryPrice={selectedStock.triggerPrice || selectedStock.currentPrice}
        targetPrice1={selectedStock.tp1}
        targetPrice2={selectedStock.tp2}
        stopLossPrice={selectedStock.invalidationPrice}
      />

      {/* 4 MAJOR SECURITIES RESEARCH CONSENSUS & CHART PATTERN HEATMAP */}
      <SecuritiesPatternHeatmapWidget />

      {/* ==================================================================== */}
      {/* MAIN 3-COLUMN TERMINAL LAYOUT (Desktop: 28% Scanner | 44% Chart | 28% Decision) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* ------------------------------------------------------------------ */}
        {/* LEFT COLUMN: AI SCANNER & WATCHLIST HUB (3 Columns on lg) */}
        {/* ------------------------------------------------------------------ */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-3 h-full flex flex-col justify-between">
            
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>AI 실시간 종목 발굴 스캐너</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-bold">감시 종목 ({filteredCandidates.length}개)</span>
              </div>

              {/* Quick Category Filter Chips */}
              <div className="flex flex-wrap gap-1 py-2">
                {[
                  { id: "ALL", label: "전체" },
                  { id: "AI_TOP", label: "🔥 AI TOP" },
                  { id: "PRE_MOVE", label: "⚡ 급등임박" },
                  { id: "BREAKOUT", label: "🚀 돌파타점" },
                  { id: "MONEY_FLOW", label: "💰 수급집중" },
                  { id: "RS_LEADER", label: "🏆 주도주" },
                  { id: "SELL_RISK", label: "⚠ 리스크주의" }
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setFilterTag(chip.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer border ${
                      filterTag === chip.id
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-400"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Stock List Cards */}
              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {filteredCandidates.map((stock) => {
                  const isSelected = selectedStock.id === stock.id;
                  const isBuy = stock.state === "BUY";
                  const isPreBuy = stock.state.startsWith("PRE_BUY");
                  const isRisk = stock.state.startsWith("SELL");

                  return (
                    <div
                      key={stock.id}
                      onClick={() => handleSelectStock(stock)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-zinc-800/90 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md"
                          : "bg-zinc-950/70 hover:bg-zinc-850 border-zinc-800/80 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isInWatchlist(stock.symbol)) {
                                removeFromWatchlist(stock.symbol);
                                addToast(`${stock.name} 관심종목 해제`, "INFO");
                              } else {
                                addToWatchlist({
                                  symbol: stock.symbol,
                                  name: stock.name,
                                  market: stock.market,
                                  targetBuyPrice: stock.triggerPrice
                                });
                                addToast(`${stock.name} 관심종목 등록 완료!`, "SUCCESS");
                              }
                            }}
                            className={`p-1 rounded hover:bg-zinc-800 transition ${
                              isInWatchlist(stock.symbol) ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300"
                            }`}
                            title="관심종목 토글"
                          >
                            <Star className={`w-3.5 h-3.5 ${isInWatchlist(stock.symbol) ? "fill-amber-400" : ""}`} />
                          </button>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            #{stock.rank}
                          </span>
                          <span className="text-xs font-black text-white">{stock.name}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">({stock.symbol})</span>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            isBuy
                              ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/50"
                              : isPreBuy
                              ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
                              : isRisk
                              ? "bg-rose-950/80 text-rose-400 border-rose-500/50"
                              : "bg-zinc-800 text-zinc-300 border-zinc-700"
                          }`}
                        >
                          {stock.stateLabel}
                        </span>
                      </div>

                      {/* Rank Surge & Sparkline */}
                      <div className="flex items-center justify-between text-[11px] mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{(stock.currentPrice ?? 0).toLocaleString()}원</span>
                          <span className={`font-extrabold ${stock.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {stock.changePct >= 0 ? "+" : ""}{stock.changePct}%
                          </span>
                        </div>

                        <span className="text-[10px] font-black text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
                          ⚡ {stock.rankSurge}
                        </span>
                      </div>

                      {/* Score Metrics Grid */}
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-bold bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800/60 mb-2">
                        <div className="text-center">
                          <div className="text-zinc-500 text-[9px]">급등임박</div>
                          <div className="text-amber-300">{stock.preMoveScore}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-500 text-[9px]">상대강도</div>
                          <div className="text-cyan-300">{stock.rsScore}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-500 text-[9px]">수급강도</div>
                          <div className="text-emerald-300">{stock.moneyFlowScore}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-500 text-[9px]">리스크</div>
                          <div className={stock.riskScore > 50 ? "text-rose-400" : "text-emerald-400"}>
                            {stock.riskScore}
                          </div>
                        </div>
                      </div>

                      {/* Trigger Target Distance */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium pt-1 border-t border-zinc-800/60">
                        <span>돌파기준가: <strong className="text-zinc-200">{(stock.triggerPrice ?? 0).toLocaleString()}원</strong></span>
                        <span className="text-cyan-400 font-bold">
                          {stock.distancePct > 0 ? `돌파까지 ${stock.distancePct}%` : "돌파 성공"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Natural Language Scanner Prompt Helper */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 space-y-1">
              <div className="font-bold text-cyan-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI 자연어 스캐너 필터 가동 중
              </div>
              <p className="text-zinc-400">
                &quot;코스닥 거래대금 상위, 상대강도(RS) 80점 이상, VWAP 상단 돌파 임박 종목 실시간 자동 탐색 중...&quot;
              </p>
            </div>

          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CENTER COLUMN: LIVE CHART & FUTURE SCENARIO CANVAS (5 Columns on lg) */}
        {/* ------------------------------------------------------------------ */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-3">
            
            {/* Chart Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{selectedStock.name}</span>
                <span className="text-xs text-zinc-400 font-medium">({selectedStock.symbol})</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {(selectedStock.currentPrice ?? 0).toLocaleString()}원 ({selectedStock.changePct >= 0 ? "+" : ""}{selectedStock.changePct}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 border-r border-zinc-800 pr-2">
                  <span>상대거래량(RVOL): <strong className="text-amber-300">{selectedStock.volumeRvol}배</strong></span>
                  <span>•</span>
                  <span>VWAP: <strong className="text-cyan-300">{(selectedStock.vwapPrice ?? 0).toLocaleString()}원</strong></span>
                </div>

                <button
                  onClick={() => {
                    if (isInWatchlist(selectedStock.symbol)) {
                      removeFromWatchlist(selectedStock.symbol);
                      addToast(`${selectedStock.name} 관심종목 해제`, "INFO");
                    } else {
                      addToWatchlist({
                        symbol: selectedStock.symbol,
                        name: selectedStock.name,
                        market: selectedStock.market,
                        targetBuyPrice: selectedStock.triggerPrice
                      });
                      addToast(`${selectedStock.name} 관심종목 등록 완료!`, "SUCCESS");
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                    isInWatchlist(selectedStock.symbol)
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/80"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isInWatchlist(selectedStock.symbol) ? "fill-amber-300" : ""}`} />
                  <span className="hidden sm:inline">{isInWatchlist(selectedStock.symbol) ? "관심종목" : "+ 관심"}</span>
                </button>

                <button
                  onClick={handleOpenChartModal}
                  className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="차트 확대 (모달)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>차트 확대</span>
                </button>
              </div>
            </div>

            {/* Live Chart Container with Recharts */}
            <div className="h-[360px] w-full bg-zinc-950 rounded-xl p-2 relative border border-zinc-800/80 overflow-hidden">
              
              {/* Overlay Labels for PRO / AI Mode */}
              {chartMode !== "CLEAN" && (
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 text-[10px] font-bold">
                  <div className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded shadow">
                    🎯 2차 목표가 (TP2): {(selectedStock.tp2 ?? 0).toLocaleString()}원
                  </div>
                  <div className="bg-emerald-950/90 text-emerald-400 border border-emerald-600/50 px-2 py-0.5 rounded shadow">
                    🎯 1차 목표가 (TP1): {(selectedStock.tp1 ?? 0).toLocaleString()}원
                  </div>
                  <div className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded shadow">
                    🟢 진입 기준가: {(selectedStock.triggerPrice ?? 0).toLocaleString()}원
                  </div>
                  <div className="bg-amber-950/90 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded shadow">
                    🛡️ 트레일링 보호선: {(selectedStock.protectedLevel ?? 0).toLocaleString()}원
                  </div>
                  <div className="bg-rose-950/90 text-rose-400 border border-rose-500/50 px-2 py-0.5 rounded shadow">
                    🛑 무효화 손절선 (SL): {(selectedStock.invalidationPrice ?? 0).toLocaleString()}원
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} stroke="#71717a" tick={{ fontSize: 10 }} orientation="right" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", color: "#ffffff", fontSize: "11px" }}
                  />

                  {/* Volume Bars */}
                  <Bar dataKey="volume" yAxisId="vol" fill="#3f3f46" opacity={0.3} />

                  {/* Price Line & VWAP */}
                  <Line type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="vwap" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />

                  {/* Target & Stop Reference Lines */}
                  <ReferenceLine y={selectedStock.tp1} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'TP1', fill: '#10b981', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={selectedStock.tp2} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'TP2', fill: '#10b981', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={selectedStock.triggerPrice} stroke="#06b6d4" label={{ value: 'ENTRY', fill: '#06b6d4', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={selectedStock.invalidationPrice} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'SL', fill: '#f43f5e', fontSize: 10, position: 'right' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* AI FUTURE SCENARIO PATHS PANEL */}
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-purple-400">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <span>AI 미래 시나리오 경로 예측</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400">
                  주요 시나리오: <strong className="text-emerald-400">{selectedStock.primaryPath}</strong> | 경로 신뢰도: <strong className="text-cyan-300">83점</strong>
                </span>
              </div>

              {/* Scenario Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {scenarioPaths.map((path) => (
                  <div key={path.id} className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="font-extrabold text-white flex items-center gap-1">
                        <span className="text-purple-400 font-mono">[{path.id}]</span> {path.name}
                      </span>
                      <span className="font-black text-cyan-300">{path.evidenceScore}점</span>
                    </div>

                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800 mb-1">
                      <div
                        className={`h-full rounded-full ${
                          path.id === "A"
                            ? "bg-emerald-500"
                            : path.id === "B"
                            ? "bg-cyan-500"
                            : path.id === "C"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${path.evidenceScore}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-zinc-400">{path.description}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT COLUMN: AI SETUP DECISION CARD & MICROSTRUCTURE (4 Columns on lg) */}
        {/* ------------------------------------------------------------------ */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-3">
            
            {/* Position Mode Active Status Banner (If enabled) */}
            {isPositionMode ? (
              <div className="bg-gradient-to-r from-emerald-950 via-zinc-900 to-teal-950 border-2 border-emerald-500/80 rounded-2xl p-3 text-white space-y-2 shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                      <Crosshair className="w-4 h-4 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-emerald-300">🚀 실시간 포지션 관리 모드 가동 중</h3>
                      <p className="text-[10px] text-zinc-300">실시간 손익률(P/L), R배수 및 트레일링 보호선 자동 추적</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-600">
                    +{positionStats.plPct}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px] text-center bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                  <div>
                    <div className="text-zinc-500">진입가</div>
                    <div className="font-bold text-white">{(positionStats.entryPrice ?? 0).toLocaleString()}원</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">R배수</div>
                    <div className="font-bold text-emerald-400">+{positionStats.rMultiple}R</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">최대유리(MFE)</div>
                    <div className="font-bold text-cyan-300">+{positionStats.mfe}R</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">보호선</div>
                    <div className="font-bold text-amber-300">{(positionStats.protectedLevel ?? 0).toLocaleString()}원</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Primary Setup Result Card */
              <div
                className={`p-4 rounded-2xl border-2 text-white space-y-3 transition shadow-xl ${
                  selectedStock.state === "BUY"
                    ? "bg-gradient-to-br from-emerald-950 via-zinc-900 to-emerald-950 border-emerald-500 ring-2 ring-emerald-500/40"
                    : selectedStock.state.startsWith("PRE_BUY")
                    ? "bg-gradient-to-br from-amber-950 via-zinc-900 to-amber-950 border-amber-500 ring-2 ring-amber-500/40"
                    : "bg-gradient-to-br from-rose-950 via-zinc-900 to-rose-950 border-rose-500 ring-2 ring-rose-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${
                        selectedStock.state === "BUY"
                          ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                          : selectedStock.state.startsWith("PRE_BUY")
                          ? "bg-amber-400 text-zinc-950 border-amber-300"
                          : "bg-rose-500 text-zinc-950 border-rose-400"
                      }`}
                    >
                      {selectedStock.stateLabel}
                    </span>
                    <span className="text-xs font-extrabold text-zinc-300 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-700">
                      등급 {selectedStock.setupGrade}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-zinc-400">
                    예측 경로: <strong className="text-cyan-300">{selectedStock.primaryPath}</strong>
                  </span>
                </div>

                {/* Entry Target & Invalidation Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80">
                  <div>
                    <span className="text-zinc-500 text-[10px]">진입 유효 구간:</span>
                    <div className="font-extrabold text-cyan-300">{selectedStock.entryRange}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px]">손절 기준가 (SL):</span>
                    <div className="font-extrabold text-rose-400">{(selectedStock.invalidationPrice ?? 0).toLocaleString()}원</div>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px]">1차 목표가 (TP1):</span>
                    <div className="font-extrabold text-emerald-400">{(selectedStock.tp1 ?? 0).toLocaleString()}원</div>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px]">2차 목표가 (TP2):</span>
                    <div className="font-extrabold text-emerald-300">{(selectedStock.tp2 ?? 0).toLocaleString()}원</div>
                  </div>
                </div>

                {/* 6 Core AI Scores Badges */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[10px] text-center">
                  <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                    <div className="text-zinc-500">셋업</div>
                    <div className="font-black text-amber-300">91 ↑</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                    <div className="text-zinc-500">매수강도</div>
                    <div className="font-black text-emerald-400">{selectedStock.buyScore} ↑↑</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                    <div className="text-zinc-500">모멘텀</div>
                    <div className="font-black text-cyan-300">{selectedStock.momentumScore} ↑</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                    <div className="text-zinc-500">진입타점</div>
                    <div className="font-black text-white">86 →</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                    <div className="text-zinc-500">리스크</div>
                    <div className="font-black text-emerald-400">{selectedStock.riskScore} ↓</div>
                  </div>
                  <div className="bg-zinc-900/90 p-1.5 rounded-lg border border-zinc-800">
                    <div className="text-zinc-500">매도압력</div>
                    <div className="font-black text-zinc-400">{selectedStock.sellScore} →</div>
                  </div>
                </div>

                {/* Real Trade Execution Interlink Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    onClick={handleExecuteBuyOrder}
                    className="py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-400 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-200 fill-current" />
                    <span>🚀 매수 주문 실행</span>
                  </button>

                  <button
                    onClick={handleExecuteSellOrder}
                    className="py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-400 active:scale-95"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-200" />
                    <span>🔴 매도 / 청산 주문</span>
                  </button>
                </div>
              </div>
            )}

            {/* WHY AI (PROS) & RISKS (CONS) */}
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-1">
                <div className="font-black text-emerald-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 매수 근거 (WHY BUY)
                </div>
                <ul className="space-y-0.5 text-[11px] text-zinc-300">
                  {selectedStock.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span> {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-1">
                <div className="font-black text-amber-400 flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> 리스크 및 주의사항 (RISKS)
                </div>
                <ul className="space-y-0.5 text-[11px] text-zinc-400">
                  {selectedStock.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">⚠</span> {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* NEXT REQUIREMENT CARD */}
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-950 to-amber-950/40 p-2.5 rounded-xl border border-amber-500/40 text-xs space-y-1">
              <div className="font-black text-amber-300 text-[11px]">
                📌 진입 전 필수 충족 조건 (NEXT REQUIREMENT)
              </div>
              <p className="text-[11px] text-zinc-200 font-medium">
                {selectedStock.nextRequirement}
              </p>
            </div>

            {/* ORDER FLOW & MICROSTRUCTURE PANEL */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                <span className="font-black text-cyan-300 flex items-center gap-1 text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> 호가 체결강도 &amp; 미세구조 분석 (ORDER FLOW)
                </span>
                <span className="text-[10px] text-zinc-400 font-bold">매도호가 소진율: 91%</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                  <div className="text-zinc-500 text-[10px]">시장가 매수 / 매도 비율</div>
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>74% 매수</span> <span className="text-zinc-600">|</span> <span className="text-rose-400">26% 매도</span>
                  </div>
                </div>
                <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                  <div className="text-zinc-500 text-[10px]">호가 델타 &amp; 체결 속도</div>
                  <div className="font-bold text-amber-300">+8,420 (급증 ↑)</div>
                </div>
              </div>

              {/* Ask Depth Consumption Visualizer */}
              <div className="space-y-1 text-[10px]">
                <div className="text-zinc-400 font-bold">53,100원 호가 매물대 소진율</div>
                <div className="flex items-center gap-1">
                  <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                    <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full w-[91%]"></div>
                  </div>
                  <span className="text-emerald-400 font-black">91%</span>
                </div>
              </div>
            </div>

            {/* AI DECISION TIMELINE LOG */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                <span className="font-black text-purple-300 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-purple-400" /> AI 실시간 의사결정 타임라인
                </span>
                <span className="text-[10px] text-zinc-500">실시간 로그 추적</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {timelineLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start justify-between text-[10px] bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800/80">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-zinc-500 font-mono">{log.time}</span>
                        <span className="text-emerald-400">{log.label}</span>
                        <span className="text-zinc-300">({(log.price ?? 0).toLocaleString()}원)</span>
                      </div>
                      <div className="text-zinc-400">{log.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* AI PERFORMANCE ANALYTICS PANEL (RECHARTS CUMULATIVE PNL MORNING/EVENING) */}
      {/* ==================================================================== */}
      <div className="pt-2">
        <AiCumulativePnLPerformanceChart />
      </div>

      {/* ==================================================================== */}
      {/* SCREENSHOT AI CHART ANALYSIS MODAL */}
      {/* ==================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border-2 border-purple-500/80 rounded-3xl p-6 max-w-2xl w-full space-y-4 text-white shadow-2xl relative">
            
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-400">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">AI 차트 스크린샷 비전 정밀 분석</h2>
                <p className="text-xs text-zinc-400">차트 이미지/스크린샷 업로드 즉시 AI가 진입가 / 손절가 / 목표가 셋업 자동 도출</p>
              </div>
            </div>

            {uploadStep === "IDLE" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-zinc-700 hover:border-purple-500 rounded-2xl p-8 text-center space-y-3 cursor-pointer bg-zinc-950/60 transition">
                  <Upload className="w-10 h-10 text-purple-400 mx-auto animate-bounce" />
                  <div>
                    <p className="text-sm font-bold text-white">차트 이미지 파일을 여기에 드래그하거나 클릭하여 업로드</p>
                    <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP 이미지 스크린샷 지원</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">종목명 / 코드 (선택)</label>
                    <input
                      type="text"
                      placeholder="예: 삼성전자 (005930)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">시간봉 (선택)</label>
                    <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                      <option>5분봉 (5m)</option>
                      <option>15분봉 (15m)</option>
                      <option>60분봉 (60m)</option>
                      <option>일봉 (D)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleStartImageAnalysis}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white font-black text-sm rounded-xl shadow-lg transition hover:brightness-110 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>AI 차트 비전 분석 시작</span>
                </button>
              </div>
            )}

            {uploadStep === "ANALYZING" && (
              <div className="space-y-3 py-4">
                <div className="text-center space-y-1">
                  <Cpu className="w-8 h-8 text-purple-400 animate-pulse mx-auto" />
                  <h3 className="text-sm font-black text-white">AI 마켓 비전 엔진 실시간 분석 중...</h3>
                  <p className="text-xs text-zinc-400">차트 가격 구조 및 수급 강도 정밀 다층 파싱 중</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300 font-bold">1. 시장 상태 및 국면 파싱</span>
                      <span className="text-purple-300 font-bold">{uploadProgress.marketRegime}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress.marketRegime}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300 font-bold">2. 업종 상대강도(RS) 계산</span>
                      <span className="text-purple-300 font-bold">{uploadProgress.sectorRS}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress.sectorRS}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300 font-bold">3. 가격 지지/저항 구조 및 VWAP 분석</span>
                      <span className="text-purple-300 font-bold">{uploadProgress.priceStructure}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress.priceStructure}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300 font-bold">4. Money Flow &amp; RVOL 가속도 분석</span>
                      <span className="text-purple-300 font-bold">{uploadProgress.moneyFlow}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress.moneyFlow}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300 font-bold">5. 진입/손절/목표가(SL/TP) 오차 산출</span>
                      <span className="text-purple-300 font-bold">{uploadProgress.entryRisk}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress.entryRisk}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {uploadStep === "DONE" && (
              <div className="space-y-4">
                <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-2xl text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h3 className="text-sm font-black text-emerald-300">AI 차트 분석 완료!</h3>
                  <p className="text-xs text-zinc-300">업로드된 스크린샷 기반 고승률 돌파 타점 산출 성공</p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-300">🟢 AI 추천 매매 셋업</span>
                    <span className="text-emerald-400 font-bold">등급 A+</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>진입구간: <strong className="text-cyan-300">53,020 ~ 53,100원</strong></div>
                    <div>손절가(SL): <strong className="text-rose-400">52,340원</strong></div>
                    <div>1차목표(TP1): <strong className="text-emerald-400">53,850원</strong></div>
                    <div>2차목표(TP2): <strong className="text-emerald-300">54,600원</strong></div>
                  </div>
                </div>

                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black text-xs rounded-xl shadow cursor-pointer"
                >
                  실시간 차트에 분석 결과 적용하기
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
