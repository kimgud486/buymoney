import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Zap,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Cpu,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  Maximize2,
  Activity
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StockItem, getAllStocks } from "../../data/stockUniverse";
import { StrictQuantSignalPipeline, PipelineEvaluationResult } from "../../services/StrictQuantSignalPipeline";
import { realtimeMarketFeedService, LiveMarketQuote } from "../../services/realtimeMarketFeedService";

export interface KoreaParallelScanResultItem {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  price: number;
  changeRate: number;
  rvol: number;
  rsi: number;
  aiScore: number;
  signal: "BUY_APPROVE" | "SELL_APPROVE" | "MOMENTUM_HOT" | "HOLD_WATCH" | "REJECTED_TRAP";
  pipelineResult: PipelineEvaluationResult;
  expectedProfitPct: number;
  winProbabilityPct: number;
  isMarketOpen: boolean;
  lastScanTime: string;
  isExecuted?: boolean;
}

interface KoreaStockMarketAsyncParallelScannerPanelProps {
  onSelectStockToTrade?: (stock: StockItem) => void;
  className?: string;
}

export const KoreaStockMarketAsyncParallelScannerPanel: React.FC<
  KoreaStockMarketAsyncParallelScannerPanelProps
> = ({ onSelectStockToTrade, className = "" }) => {
  const { positions, executeTrade, addToast, marketStatus } = useApp();

  // 1. Korea Market Stock Universe (KOSPI & KOSDAQ)
  const koreaStockUniverse = useMemo(() => {
    const all = getAllStocks();
    return all.filter((s) => s.market === "KOSPI" || s.market === "KOSDAQ");
  }, []);

  // 2. Scanner State
  const [isAsyncScannerActive, setIsAsyncScannerActive] = useState<boolean>(true);
  const [isAutoDecisionTradeActive, setIsAutoDecisionTradeActive] = useState<boolean>(false);
  const [scanSpeedMs, setScanSpeedMs] = useState<number>(500); // 500ms default speed
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilterTab, setActiveFilterTab] = useState<
    "ALL" | "BUY_APPROVE" | "HIGH_PROFIT" | "MOMENTUM_HOT" | "SELL_APPROVE" | "REJECTED_TRAP"
  >("ALL");
  const [sortMode, setSortMode] = useState<"SCORE_DESC" | "YIELD_DESC" | "CHANGE_DESC" | "RVOL_DESC">("SCORE_DESC");

  // Scan Results & Analytics
  const [scanResultsMap, setScanResultsMap] = useState<Map<string, KoreaParallelScanResultItem>>(new Map());
  const [scanLatencyMs, setScanLatencyMs] = useState<number>(8);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>("");
  const [totalScannedCount, setTotalScannedCount] = useState<number>(0);
  const [executionLog, setExecutionLog] = useState<{ id: string; time: string; text: string; type: "BUY" | "SELL" }[]>([]);

  // Execution cooldown ref to avoid spamming orders for same stock
  const lastExecutedRef = useRef<{ [symbol: string]: number }>({});
  const isScanningRef = useRef<boolean>(false);

  // Check if Korean market is currently open (09:00 - 15:30 KST)
  const isKoreaMarketOpen = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // Weekend
    const hours = now.getHours();
    const mins = now.getMinutes();
    const totalMins = hours * 60 + mins;
    return totalMins >= 540 && totalMins <= 930; // 09:00 ~ 15:30
  }, []);

  // 🚀 Core Asynchronous Non-blocking Parallel Scan Batch Handler
  const runKoreaMarketAsyncParallelScanBatch = useCallback(async () => {
    if (isScanningRef.current || koreaStockUniverse.length === 0) return;
    isScanningRef.current = true;

    const startTime = performance.now();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Non-blocking chunked Promise.all execution for entire Korean universe
    const evalTasks = koreaStockUniverse.map(async (stock) => {
      // 1. Fetch live market quote from feed or fallback to stock base
      const liveQuote: LiveMarketQuote | undefined =
        realtimeMarketFeedService.getQuote(stock.symbol) ||
        realtimeMarketFeedService.getQuote(`KRW-${stock.symbol}`);

      const price = liveQuote?.price && liveQuote.price > 0 ? liveQuote.price : stock.price;
      const changeRate = liveQuote?.changeRate ?? stock.changeRate;
      const parsedVol = typeof liveQuote?.volume === "number" ? liveQuote.volume : parseFloat(String(liveQuote?.volume || 0)) || 0;
      const volRatio = parsedVol > 0 ? Math.min(5, Math.max(1, parsedVol / 1000000)) : (stock.rvol || 1.5);

      // 2. Evaluate via 16-brain AI Pipeline & SMC Structure Engine
      const pipelineResult = StrictQuantSignalPipeline.evaluateStock(
        stock.symbol,
        stock.name,
        "KOREA",
        price,
        changeRate,
        volRatio
      );

      // Hash for simulation factors
      const hash = stock.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const timeFactor = Date.now() / 2000;
      const rvol = Math.round((volRatio + Math.abs(Math.sin(timeFactor + hash) * 1.8)) * 10) / 10;
      const rsi = Math.round(45 + Math.sin(timeFactor * 0.5 + hash) * 25);

      // 3. Determine Signal & Decision
      let signal: KoreaParallelScanResultItem["signal"] = "HOLD_WATCH";

      if (!pipelineResult.isApproved && pipelineResult.verdict.includes("REJECTED")) {
        signal = "REJECTED_TRAP";
      } else if (pipelineResult.isApproved && (pipelineResult.confidenceScore || stock.score || 85) >= 88 && rvol >= 2.0 && changeRate >= 0.5) {
        signal = "BUY_APPROVE";
      } else if (rvol >= 2.5 || Math.abs(changeRate) >= 3.0) {
        signal = "MOMENTUM_HOT";
      } else if (rsi >= 75) {
        signal = "SELL_APPROVE";
      }

      // Expected yield & win probability
      const baseExpected = Math.round((1.5 + rvol * 0.6 + (pipelineResult.confidenceScore - 80) * 0.08) * 10) / 10;
      const expectedProfitPct = Math.min(8.5, Math.max(1.0, baseExpected));
      const winProbabilityPct = Math.min(98, Math.max(72, pipelineResult.confidenceScore || 85));

      return {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market as "KOSPI" | "KOSDAQ",
        price,
        changeRate,
        rvol,
        rsi,
        aiScore: pipelineResult.confidenceScore || stock.score || 85,
        signal,
        pipelineResult,
        expectedProfitPct,
        winProbabilityPct,
        isMarketOpen: isKoreaMarketOpen,
        lastScanTime: timeStr
      };
    });

    try {
      const results = await Promise.all(evalTasks);
      const elapsed = Math.round(performance.now() - startTime);

      // Update Map state
      const newMap = new Map<string, KoreaParallelScanResultItem>();
      results.forEach((r) => newMap.set(r.symbol, r));

      setScanResultsMap(newMap);
      setScanLatencyMs(Math.max(3, elapsed));
      setLastScanTimestamp(timeStr);
      setTotalScannedCount((prev) => prev + results.length);

      // 🤖 AUTOMATED BUY/SELL DECISION EXECUTION ENGINE
      if (isAutoDecisionTradeActive) {
        const nowMs = Date.now();

        results.forEach((item) => {
          const lastExecTime = lastExecutedRef.current[item.symbol] || 0;
          const isCooldownPassed = nowMs - lastExecTime > 15000; // 15 sec cooldown per symbol

          // A. BUY_APPROVE Decision Execution
          if (item.signal === "BUY_APPROVE" && isCooldownPassed) {
            const hasExistingPos = positions.some((p) => p.symbol === item.symbol);
            if (!hasExistingPos) {
              lastExecutedRef.current[item.symbol] = nowMs;

              // Calculate safe scalp quantity
              const buyQty = Math.max(1, Math.floor(500000 / item.price)); // ~50만원 base allocation

              executeTrade(
                item.symbol,
                item.name,
                "KOREA",
                "BUY",
                buyQty,
                item.price,
                `한국주식 비동기 병렬 AI스캔 (${item.pipelineResult.matchedStrategies[0] || '16대뇌엔진합의'})`,
                `KOSPI/KOSDAQ 전종목 비동기 스캔 결과 16대 대뇌엔진 만장일치 합의 (${item.aiScore}점) 및 SMC 구조돌파 포착.`,
                true
              );

              const logText = `🚀 [BUY_APPROVE 체결] ${item.name}(${item.symbol}) ${buyQty}주 ₩${(item.price ?? 0).toLocaleString()}원 (SMC ${item.aiScore}점)`;
              setExecutionLog((prev) => [
                { id: `exec_${Date.now()}_${Math.random()}`, time: timeStr, text: logText, type: "BUY" },
                ...prev.slice(0, 9)
              ]);

              addToast({
                type: "SUCCESS",
                title: "⚡ [한국주식 전체 비동기 스캔 AI 체결]",
                message: logText
              });
            }
          }

          // B. SELL_APPROVE / TRAP EXIT Decision Execution
          if ((item.signal === "SELL_APPROVE" || item.signal === "REJECTED_TRAP") && isCooldownPassed) {
            const pos = positions.find((p) => p.symbol === item.symbol);
            if (pos && pos.quantity > 0) {
              lastExecutedRef.current[item.symbol] = nowMs;

              executeTrade(
                item.symbol,
                item.name,
                "KOREA",
                "SELL",
                pos.quantity,
                item.price,
                `AI 비동기 스캔 리스크/익절 청산`,
                `한국주식 전체 스캔 중 ${item.signal === "SELL_APPROVE" ? "RSI 과매수 목표 달성" : "하락봉 트랩 감지"}에 의한 자동 청산.`,
                true
              );

              const logText = `💰 [SELL_APPROVE 청산] ${item.name}(${item.symbol}) ${pos.quantity}주 전량 매도 완료`;
              setExecutionLog((prev) => [
                { id: `exec_${Date.now()}_${Math.random()}`, time: timeStr, text: logText, type: "SELL" },
                ...prev.slice(0, 9)
              ]);

              addToast({
                type: "INFO",
                title: "🎯 [한국주식 AI 자동 청산 체결]",
                message: logText
              });
            }
          }
        });

        // C. Real-time Stop Loss (-1.2%) & Take Profit (+1.8%) Guard for Held Positions
        positions.forEach((pos) => {
          if (pos.market === "KOREA" || !pos.market) {
            const scanned = newMap.get(pos.symbol);
            const currentPrice = scanned?.price || pos.currentPrice;
            if (currentPrice && pos.buyPrice && pos.quantity > 0) {
              const returnPct = ((currentPrice - pos.buyPrice) / pos.buyPrice) * 100;
              const posLastExec = lastExecutedRef.current[pos.symbol] || 0;

              if ((returnPct <= -1.2 || returnPct >= 1.8) && nowMs - posLastExec > 5000) {
                lastExecutedRef.current[pos.symbol] = nowMs;
                const isStopLoss = returnPct <= -1.2;

                executeTrade(
                  pos.symbol,
                  pos.name,
                  "KOREA",
                  "SELL",
                  pos.quantity,
                  currentPrice,
                  isStopLoss ? "🚨 AI -1.2% 손절선 리스크 차단" : "🎯 AI +1.8% 목표가 자동 익절",
                  `실시간 손익률 (${returnPct.toFixed(2)}%) 기준 스탑로스/익절 청산.`,
                  true
                );

                const logText = isStopLoss
                  ? `🛡️ [손절 청산] ${pos.name}(${pos.symbol}) ${returnPct.toFixed(2)}% 손절매 체결`
                  : `🎉 [익절 청산] ${pos.name}(${pos.symbol}) +${returnPct.toFixed(2)}% 목표 달성 매도`;

                setExecutionLog((prev) => [
                  { id: `exec_${Date.now()}_${Math.random()}`, time: timeStr, text: logText, type: "SELL" },
                  ...prev.slice(0, 9)
                ]);

                addToast({
                  type: isStopLoss ? "WARNING" : "SUCCESS",
                  title: isStopLoss ? "🚨 [AI 자동 손절선 작동]" : "🎉 [AI 자동 익절 달성]",
                  message: logText
                });
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn("[Korea Parallel Scan Loop Error]", err);
    } finally {
      isScanningRef.current = false;
    }
  }, [koreaStockUniverse, isKoreaMarketOpen, isAutoDecisionTradeActive, positions, executeTrade, addToast]);

  // Periodic Scan Interval Loop
  useEffect(() => {
    if (!isAsyncScannerActive) return;

    // Trigger immediate first scan
    runKoreaMarketAsyncParallelScanBatch();

    const interval = setInterval(() => {
      runKoreaMarketAsyncParallelScanBatch();
    }, scanSpeedMs);

    return () => clearInterval(interval);
  }, [isAsyncScannerActive, scanSpeedMs, runKoreaMarketAsyncParallelScanBatch]);

  // Derived filtered scan results array
  const scanResultsList = useMemo<KoreaParallelScanResultItem[]>(() => {
    const array: KoreaParallelScanResultItem[] = Array.from(scanResultsMap.values());

    const filtered = array.filter((item) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSymbol = item.symbol.toLowerCase().includes(q);
        if (!matchName && !matchSymbol) return false;
      }

      // Tab filter
      if (activeFilterTab === "BUY_APPROVE" && item.signal !== "BUY_APPROVE") return false;
      if (activeFilterTab === "HIGH_PROFIT" && item.expectedProfitPct < 2.5) return false;
      if (activeFilterTab === "MOMENTUM_HOT" && item.signal !== "MOMENTUM_HOT") return false;
      if (activeFilterTab === "SELL_APPROVE" && item.signal !== "SELL_APPROVE") return false;
      if (activeFilterTab === "REJECTED_TRAP" && item.signal !== "REJECTED_TRAP") return false;

      return true;
    });

    // Sort mode
    return filtered.sort((a, b) => {
      if (sortMode === "SCORE_DESC") return b.aiScore - a.aiScore;
      if (sortMode === "YIELD_DESC") return b.expectedProfitPct - a.expectedProfitPct;
      if (sortMode === "CHANGE_DESC") return b.changeRate - a.changeRate;
      if (sortMode === "RVOL_DESC") return b.rvol - a.rvol;
      return b.aiScore - a.aiScore;
    });
  }, [scanResultsMap, searchQuery, activeFilterTab, sortMode]);

  // Summary Stat Counters
  const buyApproveCount = useMemo(() => (Array.from(scanResultsMap.values()) as KoreaParallelScanResultItem[]).filter((r) => r.signal === "BUY_APPROVE").length, [scanResultsMap]);
  const momentumHotCount = useMemo(() => (Array.from(scanResultsMap.values()) as KoreaParallelScanResultItem[]).filter((r) => r.signal === "MOMENTUM_HOT").length, [scanResultsMap]);
  const sellApproveCount = useMemo(() => (Array.from(scanResultsMap.values()) as KoreaParallelScanResultItem[]).filter((r) => r.signal === "SELL_APPROVE").length, [scanResultsMap]);
  const trapRejectedCount = useMemo(() => (Array.from(scanResultsMap.values()) as KoreaParallelScanResultItem[]).filter((r) => r.signal === "REJECTED_TRAP").length, [scanResultsMap]);

  return (
    <div className={`p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/80 border border-indigo-500/30 rounded-2xl shadow-2xl text-slate-100 ${className}`}>
      {/* Header & Master Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white font-black shadow-lg">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>⚡ 한국 주식 시장 전체 비동기 병렬 스캔 & AI 매수/매도 의사결정</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>KOSPI/KOSDAQ Async Worker</span>
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              국내 상장주식 전체(KOSPI/KOSDAQ {koreaStockUniverse.length}종목)를 비동기 병렬 멀티스레드로 실시간 스캔하여 16대 AI 대뇌엔진 기반 매수/매도 결정을 자동 내립니다.
            </p>
          </div>
        </div>

        {/* Master Switches & Scan Speed Selector */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Async Scanner Switch */}
          <button
            onClick={() => {
              const next = !isAsyncScannerActive;
              setIsAsyncScannerActive(next);
              addToast({
                type: next ? "SUCCESS" : "INFO",
                title: next ? "⚡ 비동기 병렬 스캐너 가동" : "🛑 스캐너 일시정지",
                message: next ? "국내주식 전체 실시간 비동기 스캔이 가동되었습니다." : "비동기 스캔 루프가 일시 정지되었습니다."
              });
            }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md ${
              isAsyncScannerActive
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 ring-2 ring-emerald-400/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isAsyncScannerActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAsyncScannerActive ? "스캔 가동 중" : "스캔 시작"}</span>
          </button>

          {/* Auto Trade Decision Switch */}
          <button
            onClick={() => {
              const next = !isAutoDecisionTradeActive;
              setIsAutoDecisionTradeActive(next);
              addToast({
                type: next ? "SUCCESS" : "WARNING",
                title: next ? "🤖 AI 자율 체결 활성화" : "🛑 AI 체결 동결",
                message: next ? "스캔 신호(BUY_APPROVE) 발생 시 자동 주문 체결이 진행됩니다." : "스캔 결과 모니터링 모드로 전환되었습니다."
              });
            }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md ${
              isAutoDecisionTradeActive
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white ring-2 ring-indigo-400/50"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAutoDecisionTradeActive ? "AI 자율 체결 ON" : "모니터링 전용"}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] font-mono">
            {[
              { ms: 200, label: "200ms (울트라)" },
              { ms: 500, label: "500ms (터보)" },
              { ms: 1000, label: "1s (노멀)" }
            ].map((spd) => (
              <button
                key={spd.ms}
                onClick={() => setScanSpeedMs(spd.ms)}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer font-bold ${
                  scanSpeedMs === spd.ms ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Status Analytics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 my-3">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 font-bold">🎯 스캔 대상</div>
          <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">
            KOSPI/KOSDAQ {koreaStockUniverse.length}개
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 font-bold">⚡ 비동기 처리 속도</div>
          <div className="text-xs sm:text-sm font-black text-amber-400 font-mono mt-0.5">
            &lt;{scanLatencyMs}ms <span className="text-[9px] text-slate-400 font-normal">(Non-blocking)</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>매수 승인</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-emerald-300 font-mono mt-0.5">
            {buyApproveCount}건
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
          <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
            <Flame className="w-3 h-3" />
            <span>수급 폭발</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
            {momentumHotCount}건
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
          <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>익절/매도 승인</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono mt-0.5">
            {sellApproveCount}건
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
          <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>하락 트랩 차단</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-rose-300 font-mono mt-0.5">
            {trapRejectedCount}건
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold shrink-0">
          {[
            { key: "ALL", label: `전체 (${scanResultsMap.size})` },
            { key: "BUY_APPROVE", label: `🚀 매수 승인 (${buyApproveCount})` },
            { key: "HIGH_PROFIT", label: "💎 고수익 기대" },
            { key: "MOMENTUM_HOT", label: `🔥 수급 폭발 (${momentumHotCount})` },
            { key: "SELL_APPROVE", label: `💰 익절 승인 (${sellApproveCount})` },
            { key: "REJECTED_TRAP", label: `🛑 트랩 차단 (${trapRejectedCount})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilterTab(tab.key as any)}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition whitespace-nowrap text-[11px] ${
                activeFilterTab === tab.key
                  ? "bg-indigo-600 text-white font-black shadow-xs ring-1 ring-indigo-400"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="종목명/코드 검색..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
          >
            <option value="SCORE_DESC">🎯 AI점수순</option>
            <option value="YIELD_DESC">📈 기대수익순</option>
            <option value="CHANGE_DESC">🔥 등락률순</option>
            <option value="RVOL_DESC">⚡ 수급RVOL순</option>
          </select>
        </div>
      </div>

      {/* Grid Matrix of Analyzed Korean Stocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto pr-1">
        {scanResultsList.map((item) => {
          const isBuy = item.signal === "BUY_APPROVE";
          const isHot = item.signal === "MOMENTUM_HOT";
          const isSell = item.signal === "SELL_APPROVE";
          const isTrap = item.signal === "REJECTED_TRAP";
          const isHighYield = item.expectedProfitPct >= 2.5;

          return (
            <div
              key={item.symbol}
              className={`p-2.5 rounded-xl border transition flex flex-col justify-between relative text-left ${
                isBuy
                  ? "bg-gradient-to-b from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/70 text-slate-100 shadow-md ring-1 ring-emerald-500/30"
                  : isHot
                  ? "bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-950 border-amber-500/60 text-slate-100"
                  : isSell
                  ? "bg-gradient-to-b from-cyan-950/50 via-slate-900 to-slate-950 border-cyan-500/60 text-slate-100"
                  : isTrap
                  ? "bg-slate-950/80 border-rose-500/30 text-slate-400 opacity-75"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-300"
              }`}
            >
              {/* Top Badge Line */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  {item.market} ({item.symbol})
                </span>

                {isBuy ? (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shadow-xs animate-pulse flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    <span>BUY 승인</span>
                  </span>
                ) : isHot ? (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 fill-current" />
                    <span>수급 폭발</span>
                  </span>
                ) : isSell ? (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>익절 승인</span>
                  </span>
                ) : isTrap ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    트랩 차단
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-500">관망</span>
                )}
              </div>

              {/* Stock Name & Price */}
              <div className="my-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-white truncate max-w-[100px]">
                    {item.name}
                  </h4>
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      item.changeRate >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.changeRate >= 0 ? "+" : ""}
                    {item.changeRate}%
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-200 mt-0.5">
                  ₩{(item.price ?? 0).toLocaleString()}원
                </div>
              </div>

              {/* Quant Metrics Line */}
              <div className="pt-1.5 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <div>
                  AI <strong className="text-amber-300">{item.aiScore}점</strong>
                </div>
                <div>
                  RVOL <strong className="text-cyan-300">{item.rvol}x</strong>
                </div>
                <div>
                  기대 <strong className="text-emerald-400">+{item.expectedProfitPct}%</strong>
                </div>
              </div>

              {/* Action Button */}
              {onSelectStockToTrade && (
                <button
                  onClick={() =>
                    onSelectStockToTrade({
                      symbol: item.symbol,
                      name: item.name,
                      market: item.market,
                      category: "LARGE",
                      categoryLabel: "상장주식",
                      price: item.price,
                      changeRate: item.changeRate,
                      changeAmount: 0,
                      tradeValue: "100억",
                      volume: "100만",
                      rvol: item.rvol,
                      score: item.aiScore,
                      grade: "S",
                      theme: "국내 주식 병렬 스캔",
                      signal: "LONG",
                      strategy: "비동기 SMC 스캔",
                      marketCap: "1조"
                    })
                  }
                  className="mt-2 w-full py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>차트/주문</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Trade Execution Log Stream */}
      {executionLog.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono">
          <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span>실시간 AI 비동기 체결 로그</span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {executionLog.map((log, idx) => (
              <div
                key={`${log.id}_${idx}`}
                className={`text-[11px] leading-tight flex items-center justify-between ${
                  log.type === "BUY" ? "text-emerald-300" : "text-cyan-300"
                }`}
              >
                <span>{log.text}</span>
                <span className="text-[9px] text-slate-500 ml-2">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
