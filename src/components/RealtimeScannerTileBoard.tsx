import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Radio,
  RefreshCw,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { StockCandleChartModal } from "./StockCandleChartModal";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import {
  evaluateVerifiedSignal,
  ScannerDecision,
  VerifiedSignalResult,
} from "../scanner/verifiedSignalEngine";

export interface ScannedStockItem {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  changeAmount?: number;
  prevPrice?: number;
  flashState?: "UP" | "DOWN" | null;
  volumeText: string;
  tradeValueText: string;
  aiScore: number;
  rvol: number;
  decision: ScannerDecision;
  direction: VerifiedSignalResult["direction"];
  signalLabel: string;
  entryZone: string;
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
}

interface RealtimeScannerTileBoardProps {
  onSelectStock?: (symbol: string, market: string) => void;
  isWhiteTheme?: boolean;
}

type UniverseItem = {
  symbol: string;
  name: string;
  market: "KOREA" | "BTC";
  price: number;
  changePct: number;
  changeAmount?: number;
  volumeText: string;
  tradeValueText: string;
};

const MAX_VERIFY_COUNT = 30;
const BATCH_SIZE = 6;

function formatPrice(value: number, market: ScannedStockItem["market"]): string {
  if (!Number.isFinite(value)) return "-";
  if (market === "US") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(value).toLocaleString()}원`;
}

function signalLabelFrom(result: VerifiedSignalResult): string {
  if (result.pattern !== "NONE") return result.pattern;
  if (result.metrics.hhhl) return "HH/HL 상승 구조";
  if (result.metrics.macdHist > 0) return "MACD 상승 확인";
  return result.direction === "BULLISH" ? "상승 구조 검증" : "조건 검증 중";
}

async function fetchVerifiedCandidate(base: UniverseItem): Promise<ScannedStockItem | null> {
  try {
    const response = await fetch(
      `/api/market/realtime-candles?symbol=${encodeURIComponent(base.symbol)}&timeframe=D&count=70`,
      { cache: "no-store" },
    );

    if (!response.ok) return null;
    const payload = await response.json();
    const candles = Array.isArray(payload?.candles) ? payload.candles : [];
    const result = evaluateVerifiedSignal(candles);

    // Fail closed. Insufficient/invalid candle history never becomes a candidate.
    if (!result || result.decision === "NO_BUY") return null;

    const currentPrice = Number(payload?.currentPrice) > 0
      ? Number(payload.currentPrice)
      : base.price;

    return {
      id: `${base.market}_${base.symbol}`,
      symbol: base.symbol,
      name: payload?.name || base.name,
      market: base.market,
      currentPrice,
      changePct: Number.isFinite(Number(payload?.changePct))
        ? Number(payload.changePct)
        : base.changePct,
      changeAmount: base.changeAmount,
      volumeText: base.volumeText,
      tradeValueText: base.tradeValueText,
      aiScore: result.score,
      rvol: Number(result.metrics.rvol.toFixed(2)),
      decision: result.decision,
      direction: result.direction,
      signalLabel: signalLabelFrom(result),
      entryZone: `${Math.round(result.entryLow).toLocaleString()} ~ ${Math.round(result.entryHigh).toLocaleString()}`,
      bestEntry: result.entryHigh,
      stopLoss: result.stopLoss,
      targetPrice: result.target1,
      targetPrice2: result.target2,
      riskReward: `1 : ${result.riskReward.toFixed(1)}`,
      rationale: result.reasons.slice(0, 3).join(" · ") || "필수 기술 조건 검증 완료",
      reasons: result.reasons,
      failedChecks: result.failedChecks,
      scannedAt: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      isRealtimeLinked: true,
      verifiedBars: result.evaluatedBars,
    };
  } catch (error) {
    console.warn(`[VerifiedScanner] ${base.symbol} candle verification failed`, error);
    return null;
  }
}

export const RealtimeScannerTileBoard: React.FC<RealtimeScannerTileBoardProps> = ({
  onSelectStock,
  isWhiteTheme = false,
}) => {
  const { addWatchlist, addToast } = useApp();

  const [stocks, setStocks] = useState<ScannedStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<"ALL" | "KOREA" | "BTC">("ALL");
  const [selectedDecisionFilter, setSelectedDecisionFilter] = useState<"ALL" | "BUY_APPROVED" | "BUY_WATCH">("ALL");
  const [sortBy, setSortBy] = useState<"AI_SCORE" | "RVOL" | "CHANGE_PCT" | "PRICE">("AI_SCORE");
  const [isAutoScanActive, setIsAutoScanActive] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"TILES" | "LIST">("TILES");
  const [lastScanAt, setLastScanAt] = useState<string>("-");
  const [activeChartModalStock, setActiveChartModalStock] = useState<{ symbol: string; name: string } | null>(null);

  const loadUniverse = useCallback(async (): Promise<UniverseItem[]> => {
    const map = new Map<string, UniverseItem>();

    try {
      const response = await fetch("/api/realtime/small-mid-cap-universe", { cache: "no-store" });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && Array.isArray(json.data)) {
          json.data.forEach((d: any) => {
            const price = Number(d?.price);
            if (!d?.symbol || !(price > 0)) return;
            map.set(String(d.symbol), {
              symbol: String(d.symbol),
              name: d.name || d.realStockName || String(d.symbol),
              market: "KOREA",
              price,
              changePct: Number(d.changePct) || 0,
              changeAmount: Number(d.changePrice) || 0,
              volumeText: d.volumeText || `${Number(d.volume || 0).toLocaleString()}주`,
              tradeValueText: d.tradingValue ? `${d.tradingValue}억` : d.marketCapText || "실시간",
            });
          });
        }
      }
    } catch (error) {
      console.warn("[VerifiedScanner] small/mid universe failed", error);
    }

    try {
      const response = await fetch("/api/stocks", { cache: "no-store" });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows)) {
          rows.forEach((s: any) => {
            const price = Number(s?.price);
            if (!s?.symbol || !(price > 0) || s.market === "US") return;
            const symbol = String(s.symbol);
            const market: "KOREA" | "BTC" =
              s.market === "BTC" || s.market === "UPBIT" || symbol.startsWith("KRW-")
                ? "BTC"
                : "KOREA";
            map.set(symbol, {
              symbol,
              name: s.name || symbol,
              market,
              price,
              changePct: Number(s.changePct) || 0,
              changeAmount: Number(s.change) || 0,
              volumeText: String(s.volume || s.marketCap || "실시간"),
              tradeValueText: String(s.marketCap || "실시간"),
            });
          });
        }
      }
    } catch (error) {
      console.warn("[VerifiedScanner] /api/stocks failed", error);
    }

    // Verification cost is bounded. Raw percentage change is used only to decide
    // what to VERIFY first, never to manufacture a signal or score.
    return Array.from(map.values())
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, MAX_VERIFY_COUNT);
  }, []);

  const runVerifiedScan = useCallback(async () => {
    setIsLoading(true);
    setScanProgress({ done: 0, total: 0 });

    try {
      const universe = await loadUniverse();
      setScanProgress({ done: 0, total: universe.length });
      const verified: ScannedStockItem[] = [];

      for (let offset = 0; offset < universe.length; offset += BATCH_SIZE) {
        const batch = universe.slice(offset, offset + BATCH_SIZE);
        const results = await Promise.all(batch.map(fetchVerifiedCandidate));
        verified.push(...results.filter((item): item is ScannedStockItem => item !== null));
        setScanProgress({ done: Math.min(offset + batch.length, universe.length), total: universe.length });
      }

      verified.sort((a, b) => {
        if (a.decision !== b.decision) return a.decision === "BUY_APPROVED" ? -1 : 1;
        return b.aiScore - a.aiScore;
      });

      setStocks(verified);
      setLastScanAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } finally {
      setIsLoading(false);
    }
  }, [loadUniverse]);

  useEffect(() => {
    runVerifiedScan();
  }, [runVerifiedScan]);

  useEffect(() => {
    if (!isAutoScanActive) return;
    const timer = window.setInterval(runVerifiedScan, 60_000);
    return () => window.clearInterval(timer);
  }, [isAutoScanActive, runVerifiedScan]);

  // Tick data may update display price, but it never recalculates the verified score.
  // Scores are recalculated only from completed candle history during a verified scan.
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

  useEffect(() => {
    if (!stocks.some((item) => item.flashState)) return;
    const timer = window.setTimeout(() => {
      setStocks((previous) => previous.map((item) => item.flashState ? { ...item, flashState: null } : item));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks
      .filter((item) => selectedMarketFilter === "ALL" || item.market === selectedMarketFilter)
      .filter((item) => selectedDecisionFilter === "ALL" || item.decision === selectedDecisionFilter)
      .sort((a, b) => {
        if (sortBy === "RVOL") return b.rvol - a.rvol;
        if (sortBy === "CHANGE_PCT") return b.changePct - a.changePct;
        if (sortBy === "PRICE") return b.currentPrice - a.currentPrice;
        return b.aiScore - a.aiScore;
      });
  }, [stocks, selectedMarketFilter, selectedDecisionFilter, sortBy]);

  const approvedCount = stocks.filter((item) => item.decision === "BUY_APPROVED").length;
  const watchCount = stocks.filter((item) => item.decision === "BUY_WATCH").length;

  const openChart = (item: ScannedStockItem) => {
    if (onSelectStock) onSelectStock(item.symbol, item.market);
    else setActiveChartModalStock({ symbol: item.symbol, name: item.name });
  };

  return (
    <div className={`rounded-xl border transition-all ${
      isWhiteTheme
        ? "bg-white border-slate-200 text-slate-800 shadow-sm"
        : "bg-[#091424] border-[#162942] text-slate-100 shadow-sm"
    }`}>
      <div className={`px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b ${
        isWhiteTheme ? "border-slate-200 bg-slate-50/80" : "border-[#162942] bg-[#070f1c]/90"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-xs sm:text-sm font-black ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>
                검증형 AI 포착 종목
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                BUY {approvedCount}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                WATCH {watchCount}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              완료봉 기반 · NO BUY 숨김 · 마지막 검증 {lastScanAt}
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <div className={`flex items-center p-0.5 rounded-lg border ${isWhiteTheme ? "bg-slate-200/70 border-slate-300" : "bg-slate-900 border-slate-700"}`}>
            {(["TILES", "LIST"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${viewMode === mode ? "bg-cyan-600 text-white" : "text-slate-400"}`}
              >
                {mode === "TILES" ? "미니타일" : "슬림목록"}
              </button>
            ))}
          </div>

          <select value={selectedMarketFilter} onChange={(e) => setSelectedMarketFilter(e.target.value as any)} className="px-1.5 py-1 rounded-md text-[10px] border bg-transparent">
            <option value="ALL">전체시장</option>
            <option value="KOREA">국내</option>
            <option value="BTC">업비트</option>
          </select>

          <select value={selectedDecisionFilter} onChange={(e) => setSelectedDecisionFilter(e.target.value as any)} className="px-1.5 py-1 rounded-md text-[10px] border bg-transparent">
            <option value="ALL">BUY + WATCH</option>
            <option value="BUY_APPROVED">BUY APPROVED</option>
            <option value="BUY_WATCH">BUY WATCH</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-1.5 py-1 rounded-md text-[10px] border bg-transparent">
            <option value="AI_SCORE">검증점수순</option>
            <option value="RVOL">RVOL순</option>
            <option value="CHANGE_PCT">등락률순</option>
            <option value="PRICE">가격순</option>
          </select>

          <button
            type="button"
            onClick={() => setIsAutoScanActive((value) => !value)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 ${isAutoScanActive ? "text-emerald-400 border-emerald-500/40" : "text-slate-400 border-slate-600"}`}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            {isAutoScanActive ? "자동검증 ON" : "자동검증 OFF"}
          </button>

          <button type="button" onClick={runVerifiedScan} disabled={isLoading} className="px-2 py-1 rounded-md text-[10px] font-black bg-cyan-600 text-white disabled:opacity-50">
            지금 스캔
          </button>

          <button type="button" onClick={() => setIsCollapsed((value) => !value)} className="p-1 rounded-md border border-slate-600">
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-2">
          {isLoading && (
            <div className="mb-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
              <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                <span>실제 캔들 검증 중</span>
                <span>{scanProgress.done} / {scanProgress.total}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{ width: `${scanProgress.total ? (scanProgress.done / scanProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {!isLoading && filteredStocks.length === 0 ? (
            <div className="py-5 text-center text-xs text-slate-400">
              현재 완료봉 기준으로 BUY/WATCH 조건을 통과한 종목이 없습니다.
            </div>
          ) : viewMode === "TILES" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
              {filteredStocks.map((item) => {
                const isUp = item.changePct >= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openChart(item)}
                    className={`text-left p-2.5 rounded-xl border transition ${
                      item.decision === "BUY_APPROVED"
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-amber-500/40 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-xs font-black truncate ${isWhiteTheme ? "text-slate-900" : "text-white"}`}>{item.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{item.symbol} · {item.market}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${item.decision === "BUY_APPROVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                        {item.decision === "BUY_APPROVED" ? "BUY" : "WATCH"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <div className="text-[9px] text-slate-400">VERIFIED SCORE</div>
                        <div className="text-2xl leading-none font-black text-cyan-400">{item.aiScore}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-xs">{formatPrice(item.currentPrice, item.market)}</div>
                        <div className={`text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>{isUp ? "+" : ""}{item.changePct.toFixed(2)}%</div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                      <span className="rounded bg-slate-500/10 px-1.5 py-1">RVOL <b>{item.rvol}x</b></span>
                      <span className="rounded bg-slate-500/10 px-1.5 py-1">R:R <b>{item.riskReward}</b></span>
                    </div>

                    <div className="mt-2 text-[9px] text-slate-400 line-clamp-2">{item.rationale}</div>
                    <div className="mt-2 text-[9px] font-mono">
                      <span className="text-emerald-400">TP {Math.round(item.targetPrice).toLocaleString()}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-400">SL {Math.round(item.stopLoss).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-[10px]">
                <thead className={isWhiteTheme ? "bg-slate-100" : "bg-[#0c1a2d]"}>
                  <tr>
                    <th className="p-2">종목</th>
                    <th className="p-2">판정</th>
                    <th className="p-2 text-right">검증점수</th>
                    <th className="p-2 text-right">현재가</th>
                    <th className="p-2 text-right">RVOL</th>
                    <th className="p-2">근거</th>
                    <th className="p-2 text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((item) => (
                    <tr key={item.id} className="border-t border-slate-700/20 hover:bg-cyan-500/5">
                      <td className="p-2 cursor-pointer" onClick={() => openChart(item)}>
                        <div className="font-black">{item.name}</div>
                        <div className="text-slate-400 font-mono">{item.symbol}</div>
                      </td>
                      <td className="p-2">
                        <span className={item.decision === "BUY_APPROVED" ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                          {item.decision}
                        </span>
                      </td>
                      <td className="p-2 text-right text-cyan-400 font-black">{item.aiScore}</td>
                      <td className="p-2 text-right font-mono">
                        <div>{formatPrice(item.currentPrice, item.market)}</div>
                        <div className={item.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {item.changePct >= 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />} {item.changePct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="p-2 text-right text-amber-400 font-bold">{item.rvol}x</td>
                      <td className="p-2 max-w-[340px]">
                        <div className="font-bold">{item.signalLabel}</div>
                        <div className="text-slate-400 truncate">{item.rationale}</div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => openChart(item)} className="px-1.5 py-1 rounded border border-cyan-500/30 text-cyan-400" title="상세 차트">
                            <BarChart3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              addWatchlist({
                                id: `wl_${Date.now()}`,
                                symbol: item.symbol,
                                name: item.name,
                                market: item.market,
                                addedAt: new Date().toISOString(),
                              });
                              addToast({
                                type: "INFO",
                                title: "관심종목 등록",
                                message: `${item.name} (${item.symbol})이 관심종목에 추가되었습니다.`,
                              });
                            }}
                            className="px-1.5 py-1 rounded border border-amber-500/30 text-amber-400"
                            title="관심종목 추가"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                          <span className="px-1.5 py-1 rounded border border-emerald-500/20 text-emerald-400" title="자동주문 없음">
                            <ShieldCheck className="h-3 w-3" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeChartModalStock && (
        <StockCandleChartModal
          symbol={activeChartModalStock.symbol}
          name={activeChartModalStock.name}
          onClose={() => setActiveChartModalStock(null)}
        />
      )}
    </div>
  );
};
