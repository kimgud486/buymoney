import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock3,
  Radio,
  RefreshCw,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { StockCandleChartModal } from "./StockCandleChartModal";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import {
  evaluateVerifiedSignal,
  ScannerDecision,
  VerifiedSignalResult,
} from "../scanner/verifiedSignalEngine";
import {
  buildElementaryScanExplanation,
  type ElementaryScanExplanation,
} from "../scanner/elementaryScanExplanation";

/**
 * BuyMoney merged scanner, server-first discovery edition.
 *
 * Stage 1: the server scans the registered KR/US/UPBIT universe with verified
 * live data and returns only the strongest PRECHECK candidates.
 * Stage 2: the browser performs the expensive seven-timeframe verification
 * only for that shortlist, then exposes the existing LONG/SHORT review flow.
 *
 * The capture list also reuses the verified 5-minute candles to show an
 * elementary-school-level explanation and real pattern-history statistics.
 * No synthetic fallback candidate or fabricated hit-rate is created.
 */

export type ScanMarket = "KOREA" | "US" | "BTC";
export type TradeDirection = "LONG" | "SHORT" | "WAIT";

type TimeframeKey = "1m" | "3m" | "5m" | "15m" | "30m" | "60m" | "D";

type TimeframeScan = {
  timeframe: TimeframeKey;
  label: string;
  role: string;
  score: number;
  direction: VerifiedSignalResult["direction"];
  pattern: string;
  reasons: string[];
  metrics: VerifiedSignalResult["metrics"];
};

export interface ScannedStockItem {
  id: string;
  symbol: string;
  name: string;
  market: ScanMarket;
  currentPrice: number;
  changePct: number;
  changeAmount?: number;
  prevPrice?: number;
  flashState?: "UP" | "DOWN" | null;
  volumeText: string;
  tradeValueText: string;
  aiScore: number;
  longScore: number;
  shortScore: number;
  rvol: number;
  decision: ScannerDecision;
  direction: TradeDirection;
  signalLabel: string;
  entryZone: string;
  entryLow: number;
  bestEntry: number;
  stopLoss: number;
  targetPrice: number;
  targetPrice2: number;
  riskReward: string;
  rationale: string;
  reasons: string[];
  failedChecks: string[];
  scannedAt: string;
  isRealtimeLinked: boolean;
  verifiedBars: number;
  timeframes: TimeframeScan[];
  easyExplanation: ElementaryScanExplanation | null;
}

interface RealtimeScannerTileBoardProps {
  onSelectStock?: (symbol: string, market: string) => void;
  isWhiteTheme?: boolean;
}

type UniverseItem = {
  symbol: string;
  name: string;
  market: ScanMarket;
  price: number;
  changePct: number;
  changeAmount?: number;
  volumeText: string;
  tradeValueText: string;
};

type ServerDiscovery = {
  candidates: UniverseItem[];
  totalScanned: number;
  dataStatus: string;
  scannedAt: string;
};

type EntryStep = "WHY" | "CONFIRM" | "RECHECKING" | "WAIT" | "READY";

type EntryDialogState = {
  item: ScannedStockItem;
  direction: "LONG" | "SHORT";
  step: EntryStep;
  amount: string;
  message?: string;
};

const BATCH_SIZE = 2;

const TIMEFRAMES: Array<{ key: TimeframeKey; api: string; role: string }> = [
  { key: "1m", api: "1m", role: "진입 직전 움직임" },
  { key: "3m", api: "3m", role: "빠른 방향 확인" },
  { key: "5m", api: "5m", role: "매수·매도 타이밍" },
  { key: "15m", api: "15m", role: "패턴 모양 확인" },
  { key: "30m", api: "30m", role: "패턴 모양 확인" },
  { key: "60m", api: "1H", role: "큰 방향 확인" },
  { key: "D", api: "D", role: "하루 큰 추세" },
];

function formatPrice(value: number, market: ScanMarket): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (market === "US") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${Math.round(value).toLocaleString()}원`;
}

function formatPlainPrice(value: number, market: ScanMarket): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (market === "US") return `$${value.toFixed(2)}`;
  return `${Math.round(value).toLocaleString()}원`;
}

function marketFromRaw(symbol: string, rawMarket: unknown): ScanMarket {
  const market = String(rawMarket || "").toUpperCase();
  if (symbol.startsWith("KRW-") || market === "BTC" || market === "UPBIT" || market === "CRYPTO") return "BTC";
  if (market === "US" || market === "NASDAQ" || market === "NYSE" || market === "AMEX") return "US";
  return "KOREA";
}

function patternLabel(pattern: string): string {
  if (!pattern || pattern === "NONE") return "지표 모양 확인";
  return pattern.replaceAll("_", " ");
}

function easyReason(reason: string): string {
  const text = reason.toUpperCase();
  if (text.includes("EMA")) return "짧은 평균선과 긴 평균선의 방향을 같이 확인했어요.";
  if (text.includes("VWAP")) return "가격이 중요한 평균 가격선에서 힘을 받는지 확인했어요.";
  if (text.includes("MACD")) return "가격의 움직이는 힘이 어느 쪽으로 커지는지 확인했어요.";
  if (text.includes("RSI")) return "가격 힘이 너무 뜨겁거나 너무 약하지 않은지 확인했어요.";
  if (text.includes("RVOL") || text.includes("거래량")) return "평소보다 거래가 많이 들어오는지 확인했어요.";
  if (text.includes("HH/HL") || text.includes("시장구조")) return "고점과 저점이 어느 방향으로 움직이는지 확인했어요.";
  if (text.includes("패턴")) return "그래프에서 반복되는 가격 모양을 찾았어요.";
  return reason;
}

function shortScoreFrom(result: VerifiedSignalResult): number {
  const m = result.metrics;
  let score = 0;
  if (m.close < m.ema9 && m.ema9 < m.ema20 && m.ema20 < m.ema50) score += 22;
  else if (m.close < m.ema20 && m.ema20 < m.ema50) score += 15;
  if (m.close < m.vwap) score += 15;
  if (m.macdHist < 0 && m.macd < m.macdSignal) score += 15;
  if (m.rsi >= 26 && m.rsi <= 48) score += 10;
  else if (m.rsi < 55) score += 5;
  if (m.rvol >= 2) score += 15;
  else if (m.rvol >= 1.5) score += 11;
  else if (m.rvol >= 1.2) score += 6;
  if (!m.hhhl) score += 8;
  const bearishHits = result.patternHits.filter((hit) => hit.direction === "BEARISH");
  score += Math.min(15, bearishHits.reduce((sum, hit) => sum + Math.max(2, hit.weight), 0));
  return Math.min(100, Math.round(score));
}

function longScoreFrom(result: VerifiedSignalResult): number {
  return Math.max(0, Math.min(100, Math.round(result.score)));
}

function chooseDirection(frames: TimeframeScan[]): { direction: TradeDirection; longScore: number; shortScore: number } {
  if (!frames.length) return { direction: "WAIT", longScore: 0, shortScore: 0 };
  const weights: Record<TimeframeKey, number> = {
    "1m": 0.6, "3m": 0.8, "5m": 1.2, "15m": 1.4, "30m": 1.4, "60m": 1.7, D: 1.9,
  };
  let bullish = 0;
  let bearish = 0;
  let total = 0;
  frames.forEach((frame) => {
    const weight = weights[frame.timeframe];
    total += weight;
    if (frame.direction === "BULLISH") bullish += weight;
    if (frame.direction === "BEARISH") bearish += weight;
  });
  const longFrameScore = total > 0 ? (bullish / total) * 100 : 0;
  const shortFrameScore = total > 0 ? (bearish / total) * 100 : 0;
  const avgSignalScore = frames.reduce((sum, frame) => sum + frame.score, 0) / frames.length;
  const longScore = Math.round(longFrameScore * 0.6 + avgSignalScore * 0.4);
  const shortSignalAvg = frames.reduce((sum, frame) => {
    const proxy: VerifiedSignalResult = {
      decision: "NO_BUY",
      score: frame.score,
      direction: frame.direction,
      pattern: frame.pattern,
      patternHits: [],
      patternRegistry: {
        registered: 0, evaluated: 0, matched: 0, bullishMatched: 0, bearishMatched: 0,
        candleRegistered: 0, structureRegistered: 0, masterExecutableRegistered: 0, expansionRegistered: 0,
        candleMatched: 0, structureMatched: 0, masterExecutableMatched: 0, expansionMatched: 0,
      },
      reasons: frame.reasons,
      failedChecks: [],
      metrics: frame.metrics,
      entryLow: 0,
      entryHigh: 0,
      stopLoss: 0,
      target1: 0,
      target2: 0,
      riskReward: 0,
      evaluatedBars: 0,
    };
    return sum + shortScoreFrom(proxy);
  }, 0) / frames.length;
  const shortScore = Math.round(shortFrameScore * 0.6 + shortSignalAvg * 0.4);
  const bigFrames = frames.filter((f) => f.timeframe === "D" || f.timeframe === "60m" || f.timeframe === "30m");
  const bigBull = bigFrames.filter((f) => f.direction === "BULLISH").length;
  const bigBear = bigFrames.filter((f) => f.direction === "BEARISH").length;
  if (longScore >= 67 && longScore >= shortScore + 8 && bigBull >= Math.min(2, bigFrames.length)) return { direction: "LONG", longScore, shortScore };
  if (shortScore >= 67 && shortScore >= longScore + 8 && bigBear >= Math.min(2, bigFrames.length)) return { direction: "SHORT", longScore, shortScore };
  return { direction: "WAIT", longScore, shortScore };
}

async function fetchServerDiscovery(): Promise<ServerDiscovery> {
  const response = await fetch("/api/explainable-scanner?market=ALL&aiExplain=true", { cache: "no-store" });
  if (!response.ok) throw new Error(`SERVER_DISCOVERY_HTTP_${response.status}`);
  const payload = await response.json();
  if (!payload?.success || payload?.authority !== "REAL_PRECHECK_ONLY" || payload?.finalAuthority !== "SERVER_V20_FINAL_REQUIRED") {
    throw new Error("SERVER_DISCOVERY_AUTHORITY_INVALID");
  }
  const rows = Array.isArray(payload.topIdeas) ? payload.topIdeas : [];
  const candidates = rows.flatMap((idea: any): UniverseItem[] => {
    const symbol = String(idea?.symbol || "").trim();
    const price = Number(idea?.price);
    if (!symbol || !(price > 0)) return [];
    return [{
      symbol,
      name: String(idea?.name || symbol),
      market: marketFromRaw(symbol, idea?.market),
      price,
      changePct: Number(idea?.changePct) || 0,
      volumeText: Number(idea?.rvol) > 0 ? `RVOL ${Number(idea.rvol).toFixed(2)}x` : "실시간 검증",
      tradeValueText: `서버 PRECHECK ${Math.round(Number(idea?.score) || 0)}점`,
    }];
  });
  return {
    candidates,
    totalScanned: Math.max(0, Number(payload.totalScanned) || 0),
    dataStatus: String(payload.dataStatus || "NO_DATA"),
    scannedAt: String(payload.scannedAt || ""),
  };
}

async function fetchOneFrame(symbol: string, tf: typeof TIMEFRAMES[number]): Promise<{ payload: any; result: VerifiedSignalResult } | null> {
  try {
    // 5분봉은 과거 패턴 적중 통계를 계산할 수 있도록 더 긴 실제 이력을 받습니다.
    // 다른 시간봉은 기존 70개를 유지해 스캐너 요청량이 과도하게 커지지 않게 합니다.
    const count = tf.key === "5m" ? 220 : 70;
    const response = await fetch(
      `/api/market/realtime-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(tf.api)}&count=${count}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const candles = Array.isArray(payload?.candles) ? payload.candles : [];
    const result = evaluateVerifiedSignal(candles);
    return result ? { payload, result } : null;
  } catch {
    return null;
  }
}

async function fetchVerifiedCandidate(base: UniverseItem): Promise<ScannedStockItem | null> {
  const results = await Promise.all(TIMEFRAMES.map(async (tf) => {
    const verified = await fetchOneFrame(base.symbol, tf);
    if (!verified) return null;
    const { result } = verified;
    const shortScore = shortScoreFrom(result);
    const frameScore = result.direction === "BEARISH" ? shortScore : longScoreFrom(result);
    return {
      timeframe: tf.key,
      label: tf.key === "D" ? "일봉" : `${tf.key}봉`,
      role: tf.role,
      score: frameScore,
      direction: result.direction,
      pattern: result.pattern,
      reasons: result.reasons,
      metrics: result.metrics,
      payload: verified.payload,
      result,
    };
  }));
  const valid = results.filter((item): item is NonNullable<typeof item> => item !== null);
  if (!valid.length) return null;
  const timeframes: TimeframeScan[] = valid.map(({ payload: _payload, result: _result, ...frame }) => frame);
  const directionScores = chooseDirection(timeframes);
  if (directionScores.direction === "WAIT" && Math.max(directionScores.longScore, directionScores.shortScore) < 62) return null;
  const anchor = valid.find((v) => v.timeframe === "5m") || valid.find((v) => v.timeframe === "15m") || valid.find((v) => v.timeframe === "D") || valid[0];
  const anchorResult = anchor.result;
  const payload = anchor.payload;
  const currentPrice = Number(payload?.currentPrice) > 0 ? Number(payload.currentPrice) : base.price;
  if (!(currentPrice > 0)) return null;
  const atr = Math.max(anchorResult.metrics.atr, currentPrice * 0.008);
  const direction = directionScores.direction;
  const isShort = direction === "SHORT";
  const entryLow = isShort ? currentPrice : Math.min(anchorResult.entryLow, currentPrice);
  const entryHigh = isShort ? currentPrice + atr * 0.25 : Math.max(anchorResult.entryHigh, currentPrice);
  const stopLoss = isShort ? currentPrice + atr * 1.2 : anchorResult.stopLoss;
  const target1 = isShort ? Math.max(0, currentPrice - atr * 2) : anchorResult.target1;
  const target2 = isShort ? Math.max(0, currentPrice - atr * 3) : anchorResult.target2;
  const aiScore = direction === "SHORT" ? directionScores.shortScore : directionScores.longScore;
  const mainPattern = timeframes.filter((f) => f.pattern !== "NONE").sort((a, b) => b.score - a.score)[0];
  const alignedFrames = timeframes.filter((f) => direction === "LONG" ? f.direction === "BULLISH" : direction === "SHORT" ? f.direction === "BEARISH" : false);
  const directionText = direction === "LONG" ? "위로 가는 힘" : direction === "SHORT" ? "아래로 가는 힘" : "방향 대기";
  const reasons = [
    `${alignedFrames.length}개 시간봉에서 ${directionText}을 확인했어요.`,
    ...(anchorResult.reasons || []).slice(0, 3).map(easyReason),
  ];

  const easySource = valid.find((v) => v.timeframe === "5m") || anchor;
  const easyCandles = Array.isArray(easySource.payload?.candles) ? easySource.payload.candles : [];
  const easyExplanation = buildElementaryScanExplanation(easyCandles, base.market);

  return {
    id: `${base.market}_${base.symbol}`,
    symbol: base.symbol,
    name: payload?.name || base.name,
    market: base.market,
    currentPrice,
    changePct: Number.isFinite(Number(payload?.changePct)) ? Number(payload.changePct) : base.changePct,
    changeAmount: base.changeAmount,
    volumeText: base.volumeText,
    tradeValueText: base.tradeValueText,
    aiScore,
    longScore: directionScores.longScore,
    shortScore: directionScores.shortScore,
    rvol: Number(anchorResult.metrics.rvol.toFixed(2)),
    decision: direction === "LONG" && aiScore >= 82 ? "BUY_APPROVED" : "BUY_WATCH",
    direction,
    signalLabel: mainPattern ? `${mainPattern.label} ${patternLabel(mainPattern.pattern)}` : "여러 시간봉 지표 확인",
    entryZone: `${formatPlainPrice(entryLow, base.market)} ~ ${formatPlainPrice(entryHigh, base.market)}`,
    entryLow,
    bestEntry: entryHigh,
    stopLoss,
    targetPrice: target1,
    targetPrice2: target2,
    riskReward: "1 : 2 이상 확인",
    rationale: reasons.slice(0, 2).join(" · "),
    reasons,
    failedChecks: anchorResult.failedChecks,
    scannedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    isRealtimeLinked: true,
    verifiedBars: anchorResult.evaluatedBars,
    timeframes,
    easyExplanation,
  };
}

function canPlaceShort(item: ScannedStockItem): boolean {
  return item.market !== "BTC";
}

export const RealtimeScannerTileBoard: React.FC<RealtimeScannerTileBoardProps> = ({ onSelectStock, isWhiteTheme = false }) => {
  const app = useApp() as any;
  const { addToast, requestTradeConfirmation } = app;
  const [stocks, setStocks] = useState<ScannedStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [serverScannedTotal, setServerScannedTotal] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<"ALL" | ScanMarket>("ALL");
  const [isAutoScanActive, setIsAutoScanActive] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastScanAt, setLastScanAt] = useState("-");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeChartModalStock, setActiveChartModalStock] = useState<{ symbol: string; name: string } | null>(null);
  const [entryDialog, setEntryDialog] = useState<EntryDialogState | null>(null);

  const runVerifiedScan = useCallback(async () => {
    setIsLoading(true);
    setScanError(null);
    setScanProgress({ done: 0, total: 0 });
    try {
      const discovery = await fetchServerDiscovery();
      setServerScannedTotal(discovery.totalScanned);
      const universe = discovery.candidates;
      setScanProgress({ done: 0, total: universe.length });
      const verified: ScannedStockItem[] = [];
      for (let offset = 0; offset < universe.length; offset += BATCH_SIZE) {
        const batch = universe.slice(offset, offset + BATCH_SIZE);
        const results = await Promise.all(batch.map(fetchVerifiedCandidate));
        verified.push(...results.filter((item): item is ScannedStockItem => item !== null));
        setScanProgress({ done: Math.min(offset + batch.length, universe.length), total: universe.length });
      }
      verified.sort((a, b) => b.aiScore - a.aiScore);
      setStocks(verified);
      setLastScanAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (error) {
      console.warn("[MergedScanner] server-wide discovery failed", error);
      setStocks([]);
      setServerScannedTotal(0);
      setScanError("서버 전체 스캔 결과를 확인하지 못했어요. 가짜 후보는 만들지 않고 기다립니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { runVerifiedScan(); }, [runVerifiedScan]);
  useEffect(() => {
    if (!isAutoScanActive) return;
    const timer = window.setInterval(runVerifiedScan, 60_000);
    return () => window.clearInterval(timer);
  }, [isAutoScanActive, runVerifiedScan]);
  useEffect(() => {
    const unsubscribe = realtimeMarketFeedService.subscribe((quotesMap) => {
      if (!isAutoScanActive) return;
      setStocks((previous) => previous.map((item) => {
        const key = item.symbol.replace("KRW-", "");
        const quote = quotesMap.get(item.symbol) || quotesMap.get(key) || quotesMap.get(`KRW-${key}`);
        if (!quote || !(Number(quote.price) > 0) || Number(quote.price) === item.currentPrice) return item;
        const nextPrice = Number(quote.price);
        return {
          ...item,
          prevPrice: item.currentPrice,
          currentPrice: nextPrice,
          changePct: Number.isFinite(Number(quote.changeRate)) ? Number(quote.changeRate) : item.changePct,
          flashState: nextPrice > item.currentPrice ? "UP" : "DOWN",
        };
      }));
    });
    return unsubscribe;
  }, [isAutoScanActive]);

  const filteredStocks = useMemo(
    () => stocks.filter((item) => selectedMarketFilter === "ALL" || item.market === selectedMarketFilter),
    [stocks, selectedMarketFilter],
  );
  const longCount = stocks.filter((s) => s.direction === "LONG").length;
  const shortCount = stocks.filter((s) => s.direction === "SHORT").length;

  const openChart = (item: ScannedStockItem) => {
    if (onSelectStock) onSelectStock(item.symbol, item.market);
    else setActiveChartModalStock({ symbol: item.symbol, name: item.name });
  };
  const addFavorite = async (item: ScannedStockItem) => {
    const fn = app.addToWatchlist || app.addWatchlist;
    if (typeof fn === "function") {
      await fn({ symbol: item.symbol, name: item.name, market: item.market });
      addToast?.({ type: "INFO", title: "관심종목 등록", message: `${item.name}을 관심종목에 넣었어요.` });
    }
  };
  const startDirectionReview = (item: ScannedStockItem, direction: "LONG" | "SHORT") => {
    setEntryDialog({ item, direction, step: "WHY", amount: "1000000" });
  };
  const recheckAndRequestOrder = async () => {
    if (!entryDialog) return;
    const { item, direction } = entryDialog;
    const amount = Number(entryDialog.amount.replaceAll(",", ""));
    if (!(amount > 0)) {
      setEntryDialog({ ...entryDialog, step: "WAIT", message: "살 금액을 먼저 입력해 주세요." });
      return;
    }
    if (direction === "SHORT" && !canPlaceShort(item)) {
      setEntryDialog({ ...entryDialog, step: "WAIT", message: "업비트 현물은 SHORT 실제 주문을 바로 할 수 없어요. SHORT 분석만 보여드려요." });
      return;
    }
    setEntryDialog({ ...entryDialog, step: "RECHECKING" });
    const fresh = await fetchOneFrame(item.symbol, TIMEFRAMES.find((tf) => tf.key === "5m")!);
    if (!fresh) {
      setEntryDialog({ ...entryDialog, step: "WAIT", message: "지금 가격을 다시 확인하지 못했어요. 주문하지 않고 기다립니다." });
      return;
    }
    const freshPrice = Number(fresh.payload?.currentPrice) || fresh.result.metrics.close;
    const freshDirection = fresh.result.direction;
    const longOk = direction === "LONG" && freshDirection === "BULLISH" && freshPrice >= item.entryLow && freshPrice <= item.bestEntry * 1.003;
    const shortOk = direction === "SHORT" && freshDirection === "BEARISH" && freshPrice >= item.entryLow * 0.997 && freshPrice <= item.bestEntry;
    if (!longOk && !shortOk) {
      setEntryDialog({ ...entryDialog, item: { ...item, currentPrice: freshPrice }, step: "WAIT", message: "좋은 가격 자리에서 벗어났거나 방향이 달라졌어요. 쫓아가지 않고 기다립니다." });
      return;
    }
    const qty = item.market === "BTC" ? Number((amount / freshPrice).toFixed(8)) : Math.max(1, Math.floor(amount / freshPrice));
    setEntryDialog({ ...entryDialog, item: { ...item, currentPrice: freshPrice }, step: "READY" });
    if (typeof requestTradeConfirmation === "function") {
      await requestTradeConfirmation({
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        side: direction === "LONG" ? "BUY" : "SELL",
        qty,
        price: freshPrice,
        strategyName: `Merged Scan ${direction}`,
        aiRationale: `${item.signalLabel} · 멀티시간봉 ${item.aiScore}점 · 사용자가 ${direction} 진입 확인`,
      });
    }
  };

  return (
    <div className={`rounded-xl border transition-all ${isWhiteTheme ? "bg-white border-slate-200 text-slate-800" : "bg-[#091424] border-[#162942] text-slate-100"}`}>
      <div className={`px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b ${isWhiteTheme ? "border-slate-200 bg-slate-50" : "border-[#162942] bg-[#070f1c]"}`}>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black">AI 스캔 포착 리스트</h3>
              <span className="text-[10px] font-bold text-emerald-400">LONG {longCount}</span>
              <span className="text-[10px] font-bold text-rose-400">SHORT {shortCount}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              서버 전체 {serverScannedTotal.toLocaleString()}종목 → 상위후보 7시간봉 정밀검사 / 국내 · 미국 · 업비트 / 마지막 {lastScanAt}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(["ALL", "KOREA", "US", "BTC"] as const).map((market) => (
            <button key={market} type="button" onClick={() => setSelectedMarketFilter(market)} className={`px-2 py-1 rounded text-[10px] font-bold ${selectedMarketFilter === market ? "bg-cyan-600 text-white" : "bg-slate-500/10 text-slate-400"}`}>
              {market === "BTC" ? "UPBIT" : market}
            </button>
          ))}
          <button type="button" onClick={() => setIsAutoScanActive((v) => !v)} className={`px-2 py-1 rounded text-[10px] font-bold ${isAutoScanActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
            {isAutoScanActive ? "자동스캔 ON" : "자동스캔 OFF"}
          </button>
          <button type="button" onClick={runVerifiedScan} disabled={isLoading} className="p-1.5 rounded bg-cyan-500/10 text-cyan-400" title="지금 다시 스캔">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={() => setIsCollapsed((v) => !v)} className="p-1.5 text-slate-400">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-2.5">
          {isLoading && (
            <div className="mb-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-400">
              서버가 전체 시장을 먼저 훑고, 좋은 후보만 깊게 보고 있어요. {scanProgress.total ? `${scanProgress.done}/${scanProgress.total}` : "서버 PRECHECK 중"}
            </div>
          )}
          {scanError && !isLoading && <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-400">{scanError}</div>}
          {!isLoading && filteredStocks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">지금 조건에 맞는 종목이 없어요. 억지로 추천하지 않습니다.</div>
          ) : (
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto">
              {filteredStocks.map((item) => {
                const expanded = expandedId === item.id;
                const directionClass = item.direction === "LONG" ? "text-emerald-400" : item.direction === "SHORT" ? "text-rose-400" : "text-amber-400";
                const easy = item.easyExplanation;
                const easyStatusClass = easy?.status === "BUY_CHANCE" ? "text-emerald-400" : easy?.status === "RISK" ? "text-rose-400" : "text-amber-400";
                return (
                  <div key={item.id} className={`rounded-xl border ${expanded ? "border-cyan-500/40" : isWhiteTheme ? "border-slate-200" : "border-slate-700/50"}`}>
                    <button type="button" onClick={() => setExpandedId(expanded ? null : item.id)} className="w-full p-2.5 text-left flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-xs truncate">{item.name}</span>
                          <span className={`text-[10px] font-black ${directionClass}`}>{item.direction}</span>
                          <span className="text-[10px] font-black text-cyan-400">AI {item.aiScore}</span>
                          {easy && <span className={`text-[10px] font-black ${easyStatusClass}`}>{easy.statusLabel}</span>}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400 truncate">📈 {item.signalLabel}</div>
                        {easy && <div className="mt-1 text-[10px] font-semibold text-slate-400 truncate">👦 {easy.oneLineSummary}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-black">{formatPrice(item.currentPrice, item.market)}</div>
                        <div className={`text-[10px] font-bold ${item.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%</div>
                      </div>
                      {expanded ? <ChevronUp className="h-4 w-4 text-cyan-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {expanded && (
                      <div className={`border-t p-3 ${isWhiteTheme ? "border-slate-200 bg-slate-50/70" : "border-slate-700/40 bg-black/10"}`}>
                        {easy && (
                          <div className="mb-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs font-black">👦 아주 쉽게 설명하면</div>
                              <div className={`text-xs font-black ${easyStatusClass}`}>{easy.statusLabel}</div>
                            </div>
                            {item.direction === "SHORT" && (
                              <div className="mt-1 text-[10px] text-slate-400">※ 아래 쉬운 설명은 현물 매수 기준이에요. SHORT 방향은 위의 SHORT 점수와 시간봉을 함께 봐요.</div>
                            )}
                            <div className="mt-2 grid gap-2 md:grid-cols-2 text-[11px]">
                              <div className="rounded-lg bg-slate-500/10 p-2.5">
                                <div className="font-black">🤔 지금 사도 돼요?</div>
                                <div className="mt-1 text-slate-400">{easy.buyNowText}</div>
                              </div>
                              <div className="rounded-lg bg-slate-500/10 p-2.5">
                                <div className="font-black">🟢 언제 살 기회를 봐요?</div>
                                <div className="mt-1 text-slate-400">{easy.whenToWatchText}</div>
                              </div>
                              <div className="rounded-lg bg-slate-500/10 p-2.5">
                                <div className="font-black">🔴 언제 사면 안 돼요?</div>
                                <div className="mt-1 text-slate-400">{easy.avoidText}</div>
                              </div>
                              <div className="rounded-lg bg-slate-500/10 p-2.5">
                                <div className="font-black">⚠️ 추격 위험</div>
                                <div className="mt-1 text-slate-400">{easy.chaseRiskLabel}</div>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                              <div className="rounded-lg bg-slate-500/10 p-2"><span className="text-slate-400 block">지지선</span><b>{formatPlainPrice(easy.support, item.market)}</b></div>
                              <div className="rounded-lg bg-slate-500/10 p-2"><span className="text-slate-400 block">돌파 확인</span><b>{formatPlainPrice(easy.breakoutPrice, item.market)}</b></div>
                              <div className="rounded-lg bg-slate-500/10 p-2"><span className="text-slate-400 block">위 저항</span><b>{formatPlainPrice(easy.resistance, item.market)}</b></div>
                              <div className="rounded-lg bg-slate-500/10 p-2"><span className="text-slate-400 block">생각 취소선</span><b className="text-rose-400">{formatPlainPrice(easy.invalidation, item.market)}</b></div>
                            </div>
                            <div className="mt-2 rounded-lg border border-slate-500/20 p-2.5 text-[11px]">
                              <div className="font-black">🧩 이 패턴, 예전에는 어땠어요?</div>
                              <div className="mt-1 text-slate-400">패턴: {patternLabel(easy.pattern)}</div>
                              {easy.patternHistory.sufficient ? (
                                <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
                                  <span>발견 <b>{easy.patternHistory.sampleCount}번</b></span>
                                  <span>성공 <b className="text-emerald-400">{easy.patternHistory.successCount}번</b></span>
                                  <span>실패 <b className="text-rose-400">{easy.patternHistory.failureCount}번</b></span>
                                  <span>적중률 <b>{easy.patternHistory.hitRate?.toFixed(1)}%</b></span>
                                  <span>최근 적중률 <b>{easy.patternHistory.recentHitRate?.toFixed(1)}%</b></span>
                                  <span>성공 평균 <b>{easy.patternHistory.averageGainPct?.toFixed(2)}%</b></span>
                                  <span>실패 평균 <b>{easy.patternHistory.averageLossPct?.toFixed(2)}%</b></span>
                                  <span>확인기간 <b>{easy.patternHistory.horizonBars}봉</b></span>
                                </div>
                              ) : (
                                <div className="mt-1 text-amber-400">{easy.patternHistory.message}</div>
                              )}
                            </div>
                            <div className="mt-2 rounded-lg bg-slate-500/10 px-2.5 py-2 text-[11px] font-black">한마디로: {easy.oneLineSummary}</div>
                          </div>
                        )}

                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="rounded-lg bg-slate-500/10 p-2.5">
                            <div className="text-xs font-black">🤖 왜 포착했나요?</div>
                            <div className="mt-2 space-y-1 text-[11px]">{(easy?.whyFound?.length ? easy.whyFound : item.reasons).slice(0, 4).map((reason, index) => <div key={index}>✓ {reason}</div>)}</div>
                          </div>
                          <div className="rounded-lg bg-slate-500/10 p-2.5">
                            <div className="text-xs font-black">🎯 AI가 보고 있는 가격</div>
                            <div className="mt-2 grid grid-cols-2 gap-y-1 text-[11px]">
                              <span className="text-slate-400">좋은 진입 자리</span><b>{item.entryZone}</b>
                              <span className="text-slate-400">위험 기준</span><b className="text-rose-400">{formatPlainPrice(item.stopLoss, item.market)}</b>
                              <span className="text-slate-400">1차 목표</span><b>{formatPlainPrice(item.targetPrice, item.market)}</b>
                              <span className="text-slate-400">2차 목표</span><b>{formatPlainPrice(item.targetPrice2, item.market)}</b>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 rounded-lg border border-slate-500/20 overflow-hidden">
                          <div className="px-2 py-1.5 text-[11px] font-black">📊 시간별 그래프 모양</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
                            {TIMEFRAMES.map((tf) => {
                              const frame = item.timeframes.find((f) => f.timeframe === tf.key);
                              return (
                                <div key={tf.key} className="border-t border-r border-slate-500/10 p-2 text-[10px]">
                                  <div className="font-black">{tf.key === "D" ? "일봉" : tf.key}</div>
                                  <div className={frame?.direction === "BULLISH" ? "text-emerald-400" : frame?.direction === "BEARISH" ? "text-rose-400" : "text-slate-400"}>
                                    {frame?.direction === "BULLISH" ? "↗ 위쪽" : frame?.direction === "BEARISH" ? "↘ 아래쪽" : "- 대기"}
                                  </div>
                                  <div className="mt-0.5 truncate text-slate-400" title={frame ? patternLabel(frame.pattern) : "데이터 없음"}>{frame ? patternLabel(frame.pattern) : "데이터 없음"}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => startDirectionReview(item, "LONG")} className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">🟢 LONG 분석</button>
                          <button type="button" onClick={() => startDirectionReview(item, "SHORT")} className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black">🔴 SHORT 분석</button>
                          <button type="button" onClick={() => openChart(item)} className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black"><BarChart3 className="inline h-3.5 w-3.5 mr-1" />그래프 보기</button>
                          <button type="button" onClick={() => addFavorite(item)} className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black"><Star className="inline h-3.5 w-3.5 mr-1" />관심종목</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {entryDialog && (
        <div className="fixed inset-0 z-[120] bg-black/65 flex items-center justify-center p-4" onMouseDown={() => setEntryDialog(null)}>
          <div className={`w-full max-w-md rounded-2xl border p-4 shadow-2xl ${isWhiteTheme ? "bg-white border-slate-200 text-slate-900" : "bg-[#081525] border-slate-700 text-white"}`} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black">{entryDialog.direction === "LONG" ? "🟢 LONG" : "🔴 SHORT"} · {entryDialog.item.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">현재가 {formatPrice(entryDialog.item.currentPrice, entryDialog.item.market)}</div>
              </div>
              <button type="button" onClick={() => setEntryDialog(null)} className="p-1 text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            {entryDialog.step === "WHY" && (
              <>
                <div className="mt-4 rounded-xl bg-slate-500/10 p-3">
                  <div className="font-black text-sm">왜 {entryDialog.direction}을 살펴보나요?</div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    {entryDialog.item.reasons.slice(0, 4).map((reason, index) => <div key={index}>✓ {reason}</div>)}
                    <div>✓ 그래프 한 개만 보지 않고 여러 시간봉을 함께 봤어요.</div>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400">이 버튼은 아직 주문하지 않습니다. 설명을 읽고 다음 버튼을 눌러야 진입 확인 단계로 갑니다.</div>
                <button type="button" onClick={() => setEntryDialog({ ...entryDialog, step: "CONFIRM" })} className={`mt-4 w-full py-3 rounded-xl font-black text-sm ${entryDialog.direction === "LONG" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>{entryDialog.direction} 진입 살펴보기</button>
              </>
            )}
            {entryDialog.step === "CONFIRM" && (
              <>
                <div className="mt-4 text-center text-lg font-black">{entryDialog.direction} 진입하시겠습니까?</div>
                <div className="mt-3 rounded-xl bg-slate-500/10 p-3 grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-slate-400">AI 진입구간</span><b>{entryDialog.item.entryZone}</b>
                  <span className="text-slate-400">위험 기준</span><b className="text-rose-400">{formatPlainPrice(entryDialog.item.stopLoss, entryDialog.item.market)}</b>
                  <span className="text-slate-400">1차 목표</span><b>{formatPlainPrice(entryDialog.item.targetPrice, entryDialog.item.market)}</b>
                  <span className="text-slate-400">2차 목표</span><b>{formatPlainPrice(entryDialog.item.targetPrice2, entryDialog.item.market)}</b>
                </div>
                <label className="block mt-3 text-xs font-bold">거래할 금액</label>
                <input value={entryDialog.amount} onChange={(e) => setEntryDialog({ ...entryDialog, amount: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono ${isWhiteTheme ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700"}`} />
                <div className="mt-2 text-[11px] text-slate-400">확인을 눌러도 옛 가격으로 바로 주문하지 않아요. 5분봉과 현재가격을 다시 확인하고 좋은 자리일 때만 기존 주문 확인창으로 넘깁니다.</div>
                {entryDialog.direction === "SHORT" && entryDialog.item.market === "BTC" && <div className="mt-2 text-[11px] text-amber-400">업비트 현물은 SHORT 분석은 가능하지만 실제 SHORT 주문은 지원 상품이 따로 필요해요.</div>}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEntryDialog(null)} className="py-2.5 rounded-xl bg-slate-500/10 font-bold">취소</button>
                  <button type="button" onClick={recheckAndRequestOrder} className={`py-2.5 rounded-xl font-black text-white ${entryDialog.direction === "LONG" ? "bg-emerald-600" : "bg-rose-600"}`}>✅ 확인</button>
                </div>
              </>
            )}
            {entryDialog.step === "RECHECKING" && (
              <div className="py-10 text-center">
                <RefreshCw className="h-7 w-7 mx-auto animate-spin text-cyan-400" />
                <div className="mt-3 font-black">지금 가격을 다시 보고 있어요</div>
                <div className="mt-1 text-xs text-slate-400">가격을 쫓아가서 사지 않도록 마지막으로 확인합니다.</div>
              </div>
            )}
            {(entryDialog.step === "WAIT" || entryDialog.step === "READY") && (
              <div className="py-6 text-center">
                {entryDialog.step === "WAIT" ? <Clock3 className="h-8 w-8 mx-auto text-amber-400" /> : <ShieldCheck className="h-8 w-8 mx-auto text-emerald-400" />}
                <div className="mt-3 font-black">{entryDialog.step === "WAIT" ? "🟡 지금은 기다려요" : "🟢 조건 확인 완료"}</div>
                <div className="mt-2 text-xs text-slate-400">{entryDialog.message || "기존 BuyMoney 주문 안전 확인 단계로 넘겼어요."}</div>
                <button type="button" onClick={() => setEntryDialog(null)} className="mt-4 px-5 py-2 rounded-lg bg-slate-500/10 text-xs font-bold">닫기</button>
              </div>
            )}
          </div>
        </div>
      )}
      {activeChartModalStock && <StockCandleChartModal symbol={activeChartModalStock.symbol} name={activeChartModalStock.name} onClose={() => setActiveChartModalStock(null)} />}
    </div>
  );
};
