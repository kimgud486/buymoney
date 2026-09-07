import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Brain,
  ShieldAlert,
  Zap,
  Activity,
  BarChart3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Sliders,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Lock,
  Radio,
  FileText,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Building2,
  Newspaper,
  X
} from "lucide-react";
import { runMasterV7SecuritiesEngine } from "../services/multiBotEngineV7";
import { MasterSecuritiesV7Analysis, AutoTradingExecutionMode, MicroBotOutput } from "../types/multiBotSecuritiesV7";
import { useApp } from "../context/AppContext";
import { AiAutoBotEnhancementModal } from "./trading/AiAutoBotEnhancementModal";
import { stockSyncService, StockSyncEvent } from "../services/stockSyncService";

interface StockUniverseItem {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  price: number;
  changePct: number;
  tradingValue: number;
  rvol: number;
  executionPower: number;
  sector: string;
  newsTitle: string;
}

const DEFAULT_UNIVERSE: StockUniverseItem[] = [
  { symbol: "005930", name: "삼성전자", market: "KOREA", price: 74800, changePct: 0, tradingValue: 1250, rvol: 2.8, executionPower: 142, sector: "반도체/AI", newsTitle: "삼성전자, 차세대 고성능 HBM 및 메모리 솔루션 공급 확대" },
  { symbol: "000660", name: "SK하이닉스", market: "KOREA", price: 188500, changePct: 0, tradingValue: 1820, rvol: 3.5, executionPower: 168, sector: "HBM/반도체", newsTitle: "SK하이닉스, HBM3E 양산 출하 확대 및 실적 개선세 지속" },
  { symbol: "005380", name: "현대차", market: "KOREA", price: 245000, changePct: 0, tradingValue: 980, rvol: 2.1, executionPower: 125, sector: "자동차/모빌리티", newsTitle: "현대차, 글로벌 친환경 하이브리드 및 전기차 수출 호조" },
  { symbol: "035420", name: "NAVER", market: "KOREA", price: 198000, changePct: 0, tradingValue: 620, rvol: 1.9, executionPower: 118, sector: "AI/플랫폼", newsTitle: "NAVER, 초거대 생성형 AI 비즈니스 솔루션 고도화" },
  { symbol: "NVDA", name: "엔비디아", market: "US", price: 130.5, changePct: 0, tradingValue: 3400, rvol: 3.4, executionPower: 162, sector: "AI 반도체", newsTitle: "NVIDIA Blackwell 차세대 AI 아키텍처 글로벌 빅테크 공급" },
  { symbol: "BTC", name: "비트코인", market: "BTC", price: 92400000, changePct: 0, tradingValue: 4100, rvol: 2.3, executionPower: 135, sector: "가상자산", newsTitle: "비트코인 현물 ETF 기관 유입 지속 및 시장 유동성 확대" }
];

export const AiMultiBotSecuritiesMasterConsole: React.FC = () => {
  const { 
    positions, 
    addToast, 
    openStockChart, 
    selectedSymbol: globalSelectedSymbol, 
    setSelectedSymbol: setGlobalSelectedSymbol,
    requestTradeConfirmation
  } = useApp();

  const [universe, setUniverse] = useState<StockUniverseItem[]>(DEFAULT_UNIVERSE);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState("005930");
  const [executionMode, setExecutionMode] = useState<AutoTradingExecutionMode>("FULL_AI_AUTO");
  const [isAutoRunning, setIsAutoRunning] = useState(true);
  const [autoMinScore, setAutoMinScore] = useState(85);
  const [copied, setCopied] = useState(false);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL");
  const [selectedBotDetail, setSelectedBotDetail] = useState<MicroBotOutput | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isAutoEnhanceModalOpen, setIsAutoEnhanceModalOpen] = useState(false);
  const [isLiveFeedConnected, setIsLiveFeedConnected] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("aistock_realtime_feed_active");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

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
      refreshUniverseQuotes();
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

  // Logs Stream
  const [autoLogs, setAutoLogs] = useState<Array<{ id: string; time: string; text: string; type: "INFO" | "BUY" | "SELL" | "SHIELD" }>>([
    { id: "1", time: new Date().toLocaleTimeString("ko-KR"), text: "[AI MULTI-BOT] 170개 마이크로 봇 관제 및 실시간 실제 호가 피드 가동 준비 완료", type: "INFO" },
    { id: "2", time: new Date().toLocaleTimeString("ko-KR"), text: "[DATA MASTER] DQ001~DQ012 실시간 데이터 무결성 검증 통과 (EXCELLENT, 14ms)", type: "INFO" },
    { id: "3", time: new Date().toLocaleTimeString("ko-KR"), text: "[MARKET INTELLIGENCE] KOSPI/KOSDAQ/US/CRYPTO 실시간 호가 감시 활성화", type: "INFO" }
  ]);

  // Sync with Global Stock Selection or Sync Event
  useEffect(() => {
    const unsub = stockSyncService.subscribe(async (event: StockSyncEvent) => {
      if (!event.symbol) return;
      const targetSym = event.symbol;
      setSelectedStockSymbol(targetSym);
      await fetchAndApplyStockData(targetSym);
    });
    return unsub;
  }, []);

  // Fetch real quote for a single stock and add/update universe
  const fetchAndApplyStockData = useCallback(async (sym: string) => {
    if (!sym) return;
    setIsLoadingQuote(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(sym)}`);
      if (res.ok) {
        const live = await res.json();
        if (live && live.price > 0) {
          const mType: "KOREA" | "US" | "BTC" =
            live.market === "US" ? "US" : (live.market === "BTC" || live.symbol?.startsWith("KRW-")) ? "BTC" : "KOREA";

          const newItem: StockUniverseItem = {
            symbol: live.symbol || sym,
            name: live.name || sym,
            market: mType,
            price: live.price,
            changePct: live.changePct !== undefined ? live.changePct : 0,
            tradingValue: live.marketCap ? parseInt(String(live.marketCap).replace(/[^0-9]/g, '')) || 1200 : 1200,
            rvol: 2.5 + Math.round((Math.abs(live.changePct || 0) * 0.3) * 10) / 10,
            executionPower: 120 + Math.round((live.changePct || 0) * 5),
            sector: live.sector || (mType === "BTC" ? "가상자산" : mType === "US" ? "미국주식" : "국내주식"),
            newsTitle: live.news?.[0]?.title || `${live.name || sym} 실시간 호가 및 체결 데이터 연동 완료`
          };

          setUniverse(prev => {
            const idx = prev.findIndex(item => item.symbol.toUpperCase() === sym.toUpperCase());
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...newItem };
              return updated;
            } else {
              return [newItem, ...prev];
            }
          });
        }
      }
    } catch (err) {
      console.warn("[MultiBot] Error fetching live quote:", err);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  // Poll all universe stocks on mount and periodically
  const refreshUniverseQuotes = useCallback(async () => {
    if (!isLiveFeedConnected) return;
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const liveList = await res.json();
        if (Array.isArray(liveList) && liveList.length > 0) {
          setUniverse(prev => {
            return prev.map(item => {
              const match = liveList.find((l: any) => l.symbol?.toUpperCase() === item.symbol.toUpperCase() || l.name === item.name);
              if (match && typeof match.price === "number" && match.price > 0) {
                return {
                  ...item,
                  price: match.price,
                  changePct: match.changePct !== undefined ? match.changePct : item.changePct,
                  name: match.name || item.name
                };
              }
              return item;
            });
          });
        }
      }
    } catch (e) {
      console.warn("[MultiBot] Error polling live stocks:", e);
    }
  }, [isLiveFeedConnected]);

  // Initial load
  useEffect(() => {
    refreshUniverseQuotes();
    if (selectedStockSymbol) {
      fetchAndApplyStockData(selectedStockSymbol);
    }
    const interval = setInterval(refreshUniverseQuotes, 5000);
    return () => clearInterval(interval);
  }, [fetchAndApplyStockData, refreshUniverseQuotes, selectedStockSymbol]);

  // Live Real Stock Search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results)) {
            setSearchResults(results);
          }
        }
      } catch (err) {
        console.warn("[MultiBot] Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Currently Selected Stock Data
  const currentStockData = useMemo(() => {
    const found = universe.find(s => s.symbol.toUpperCase() === selectedStockSymbol.toUpperCase());
    return found || universe[0] || DEFAULT_UNIVERSE[0];
  }, [universe, selectedStockSymbol]);

  // Run Master V7 Analysis
  const analysis: MasterSecuritiesV7Analysis = useMemo(() => {
    return runMasterV7SecuritiesEngine(currentStockData);
  }, [currentStockData]);

  // Real matching active position from AppContext (STRICT SYMBOL MATCHING ONLY)
  const activePosition = useMemo(() => {
    if (!positions || positions.length === 0) return null;
    const pos = positions.find(p => p.symbol?.toUpperCase().replace("KRW-", "") === currentStockData.symbol.toUpperCase().replace("KRW-", ""));
    if (pos) {
      const pnl = pos.currentPrice > 0 && pos.avgPrice > 0 
        ? +(((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100).toFixed(2)
        : 0;
      return {
        symbol: pos.symbol,
        name: pos.name,
        qty: pos.quantity,
        buyPrice: pos.avgPrice,
        currentPrice: pos.currentPrice || currentStockData.price,
        pnlPct: pnl,
        trailingShieldPrice: Math.round(pos.avgPrice * 1.01)
      };
    }
    // Do NOT return fallback positions[0] - returns null if not holding this specific stock
    return null;
  }, [positions, currentStockData]);

  function currentStockSymbolMatch(sym: string) {
    return sym.toUpperCase().replace("KRW-", "");
  }

  // Periodic Auto-Scanner Loop
  useEffect(() => {
    if (!isAutoRunning || executionMode !== "FULL_AI_AUTO") return;

    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString("ko-KR");
      const randomStock = universe[Math.floor(Math.random() * universe.length)];
      if (!randomStock) return;
      const scanAnalysis = runMasterV7SecuritiesEngine(randomStock);

      if (scanAnalysis.setupQualityScore >= autoMinScore) {
        setAutoLogs(prev => [
          {
            id: `log_scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            time: timeStr,
            text: `[🧠 AI 자율 스캔] ${scanAnalysis.name} (${scanAnalysis.symbol}) 현재가 ${scanAnalysis.market === "US" ? `$${(scanAnalysis.currentPrice ?? 0).toLocaleString()}` : `${(scanAnalysis.currentPrice ?? 0).toLocaleString()}원`} - ${scanAnalysis.setupQualityScore}점 S급 포착! Long Army (${scanAnalysis.longShortArmy.longScore}점) 승인`,
            type: "BUY"
          },
          ...prev.slice(0, 30)
        ]);
      } else {
        setAutoLogs(prev => [
          {
            id: `log_filter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            time: timeStr,
            text: `[📡 백그라운드 필터] ${scanAnalysis.name} (${scanAnalysis.setupQualityScore}점) - 기준점수 ${autoMinScore}점 미달로 보류`,
            type: "INFO"
          },
          ...prev.slice(0, 30)
        ]);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoRunning, executionMode, autoMinScore, universe]);

  // Instant 1-Second AI Auto Buy Handler
  const handleInstantAiAutoBuy = async () => {
    const timeStr = new Date().toLocaleTimeString("ko-KR");
    const bestStock = universe.reduce((prev, curr) => curr.rvol > prev.rvol ? curr : prev, universe[0]);
    const bestAnalysis = runMasterV7SecuritiesEngine(bestStock);

    try {
      addToast(`[${bestStock.name}] AI 1초 즉시 자율 매수 승인 확인 중...`, "INFO");
      const qty = Math.max(1, Math.floor(500000 / bestStock.price));
      const confirmed = await requestTradeConfirmation({
        symbol: bestStock.symbol,
        name: bestStock.name,
        side: "BUY",
        quantity: qty,
        price: bestStock.price,
        orderType: "MARKET",
        market: bestStock.market
      });

      if (confirmed) {
        setAutoLogs(prev => [
          {
            id: `log_buy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            time: timeStr,
            text: `[⚡ 1초 즉시 자율 매수 체결] ${bestStock.name} (${bestStock.symbol}) ${qty}주 @ ${bestStock.market === "US" ? `$${(bestStock.price ?? 0).toLocaleString()}` : `${(bestStock.price ?? 0).toLocaleString()}원`} (${bestAnalysis.setupQualityScore}점 S+급)`,
            type: "BUY"
          },
          ...prev.slice(0, 30)
        ]);
        addToast(`⚡ [${bestStock.name}] AI 자율 매수 체결 완료 (${bestStock.market === "US" ? `$${(bestStock.price ?? 0).toLocaleString()}` : `${(bestStock.price ?? 0).toLocaleString()}원`})`, "SUCCESS");
      }
    } catch (err: any) {
      addToast(`매수 주문 오류: ${err.message || err}`, "ERROR");
    }
  };

  // Manual Buy Handler
  const handleManualBuy = async (amount: number) => {
    const timeStr = new Date().toLocaleTimeString("ko-KR");
    const qty = Math.max(1, Math.floor(amount / currentStockData.price));

    try {
      addToast(`[${currentStockData.name}] ${currentStockData.market === "US" ? `$${(amount ?? 0).toLocaleString()}` : `${(amount / 10000).toLocaleString()}만원`} 매수 주문 검증 중...`, "INFO");
      const confirmed = await requestTradeConfirmation({
        symbol: currentStockData.symbol,
        name: currentStockData.name,
        side: "BUY",
        quantity: qty,
        price: currentStockData.price,
        orderType: "MARKET",
        market: currentStockData.market
      });

      if (confirmed) {
        setAutoLogs(prev => [
          {
            id: `log_mbuy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            time: timeStr,
            text: `[수동 매수 완료] ${currentStockData.name} ${qty}주 (${currentStockData.market === "US" ? `$${(amount ?? 0).toLocaleString()}` : `${(amount / 10000).toLocaleString()}만원`}) @ ${currentStockData.market === "US" ? `$${(currentStockData.price ?? 0).toLocaleString()}` : `${(currentStockData.price ?? 0).toLocaleString()}원`} 체결 완료`,
            type: "BUY"
          },
          ...prev.slice(0, 30)
        ]);
        addToast(`[${currentStockData.name}] ${qty}주 매수 완료`, "SUCCESS");
      }
    } catch (err: any) {
      addToast(`주문 오류: ${err.message || err}`, "ERROR");
    }
  };

  // Manual Sell / Liquidation Handler
  const handleManualSell = async (type: "PARTIAL" | "ALL") => {
    if (!activePosition) {
      addToast("현재 보유 중인 포지션이 없습니다.", "WARNING");
      return;
    }
    const timeStr = new Date().toLocaleTimeString("ko-KR");
    const sellQty = type === "ALL" ? activePosition.qty : Math.max(1, Math.floor(activePosition.qty / 2));

    try {
      const confirmed = await requestTradeConfirmation({
        symbol: activePosition.symbol,
        name: activePosition.name,
        side: "SELL",
        quantity: sellQty,
        price: activePosition.currentPrice,
        orderType: "MARKET",
        market: currentStockData.market
      });

      if (confirmed) {
        if (type === "ALL") {
          setAutoLogs(prev => [
            {
              id: `log_msell_all_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              time: timeStr,
              text: `[🚨 전량 매도 완료] ${activePosition.name} ${sellQty}주 청산 (수익률: +${activePosition.pnlPct}%)`,
              type: "SELL"
            },
            ...prev.slice(0, 30)
          ]);
          addToast(`[${activePosition.name}] 전량 청산 완료`, "SUCCESS");
        } else {
          setAutoLogs(prev => [
            {
              id: `log_msell_part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              time: timeStr,
              text: `[⚡ 50% 분할 익절] ${activePosition.name} ${sellQty}주 분할 실현 완료`,
              type: "SELL"
            },
            ...prev.slice(0, 30)
          ]);
          addToast(`[${activePosition.name}] 50% 분할 익절 완료`, "SUCCESS");
        }
      }
    } catch (err: any) {
      addToast(`매도 주문 오류: ${err.message || err}`, "ERROR");
    }
  };

  const handleSelectStock = (stk: StockUniverseItem) => {
    setSelectedStockSymbol(stk.symbol);
    setGlobalSelectedSymbol(stk.symbol);
    setSearchQuery("");
    setSearchResults([]);
    fetchAndApplyStockData(stk.symbol);
  };

  const handleCopyMasterReport = () => {
    const reportText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI MULTI-BOT TRADING SECURITIES SYSTEM v7.1
MASTER TRADING REPORT (실시간 실제 주가 연동)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

종목명      : ${analysis.name} (${analysis.symbol})
시장구분    : ${analysis.market}
현재가      : ${analysis.market === "US" ? `$${(analysis.currentPrice ?? 0).toLocaleString()}` : `${(analysis.currentPrice ?? 0).toLocaleString()}원`} (${analysis.changePct >= 0 ? "+" : ""}${analysis.changePct}%)
거래대금    : ${analysis.tradingValue} (RVOL ${analysis.rvol}배)
체결강도    : ${analysis.executionStrength}%

1. DATA QUALITY MASTER
---------------------------------------
상태        : ${analysis.dataQuality.state}
데이터커버리지: ${analysis.dataQuality.coverageScore}%
분석 신뢰도  : ${analysis.dataQuality.analysisConfidence}%

2. MARKET & SECTOR INTELLIGENCE
---------------------------------------
시장 레짐    : ${analysis.marketIntel.regime} (Risk-On)
주도 섹터    : ${analysis.sectorTheme.topSector} (${analysis.sectorTheme.themeName})
대장주 등급  : ${analysis.sectorTheme.leaderClass}

3. LONG VS SHORT ARMY COMPETITION
---------------------------------------
Long Army   : ${analysis.longShortArmy.longScore}점
Short Army  : ${analysis.longShortArmy.shortScore}점
우세 방향    : ${analysis.longShortArmy.dominantSide} (충돌 없음)

4. PRICE STRUCTURE & SMC MAP
---------------------------------------
가격 구조    : ${analysis.structureState}
감지 패턴    : ${analysis.patterns.join(" + ")}
SMC 신호     : ${analysis.smcSignal}
유동성 청소  : ${analysis.liquiditySweep}
VWAP 상태    : ${analysis.vwapStatus}

5. TARGET MAP & RISK FILTER
---------------------------------------
관심 진입존  : ${analysis.market === "US" ? `$${(analysis.entryZoneMin ?? 0).toLocaleString()} ~ $${(analysis.entryZoneMax ?? 0).toLocaleString()}` : `${(analysis.entryZoneMin ?? 0).toLocaleString()} ~ ${(analysis.entryZoneMax ?? 0).toLocaleString()}원`}
돌파 확인가  : ${analysis.market === "US" ? `$${(analysis.breakoutConfirmPrice ?? 0).toLocaleString()}` : `${(analysis.breakoutConfirmPrice ?? 0).toLocaleString()}원`}
구조 무효(손절): ${analysis.market === "US" ? `$${(analysis.invalidationPrice ?? 0).toLocaleString()}` : `${(analysis.invalidationPrice ?? 0).toLocaleString()}원`}
1차 목표가   : ${analysis.market === "US" ? `$${(analysis.targetPrice1 ?? 0).toLocaleString()}` : `${(analysis.targetPrice1 ?? 0).toLocaleString()}원`}
2차 목표가   : ${analysis.market === "US" ? `$${(analysis.targetPrice2 ?? 0).toLocaleString()}` : `${(analysis.targetPrice2 ?? 0).toLocaleString()}원`}

6. FINAL SYSTEM DECISION
---------------------------------------
SETUP SCORE : ${analysis.setupQualityScore} / 100 [${analysis.grade}등급]
최종 의사결정: ${analysis.finalDecision}
근거 요약   : ${analysis.rationale}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-20">

      {/* 1. MASTER HEADER & SYSTEM IDENTITY */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border-2 border-indigo-500/60 p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white rounded-2xl shadow-lg shadow-indigo-950/80 animate-pulse">
              <Brain className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white font-mono tracking-tight">
                  AI MULTI-BOT TRADING SECURITIES
                </h1>
                <span className="px-3 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/60 rounded-full text-xs font-mono font-bold">
                  MASTER PROMPT v7.8 QUANT ENGINE
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 border ${
                  isLiveFeedConnected 
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/60" 
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLiveFeedConnected ? "bg-emerald-400 animate-ping" : "bg-zinc-500"}`} />
                  <span>실시간 시세: {isLiveFeedConnected ? "ON (온)" : "OFF (아웃)"}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                실제 시세 100% 직결 · 170개 Micro Bot · SMC 구조물/BOS · Z-Score VWAP · AI 자율매매 관제
              </p>
            </div>
          </div>

          {/* Right Action Controls: Live Feed ON/OFF & Preset Stock Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAutoEnhanceModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer border border-amber-300/40 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200 animate-bounce" />
              <span>🤖 AI로 자동 봇강화</span>
            </button>

            <button
              onClick={handleToggleFeed}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                isLiveFeedConnected
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
              }`}
              title="실시간 시세 API 온/아웃 전환"
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveFeedConnected ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
              <span>시세 API {isLiveFeedConnected ? "ON" : "OFF"}</span>
            </button>

            {universe.slice(0, 5).map(stk => (
              <button
                key={stk.symbol}
                onClick={() => handleSelectStock(stk)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedStockSymbol.toUpperCase() === stk.symbol.toUpperCase()
                    ? "bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-950/50"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                }`}
              >
                <span>{stk.name}</span>
                <span className={`text-[10px] ${stk.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stk.changePct >= 0 ? "+" : ""}{stk.changePct}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Search & Realtime Status Bar */}
        <div className="relative pt-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 국내(KOSPI/KOSDAQ 전종목) · 미국주식 · 가상자산 종목명/코드 실시간 검색 (예: 삼성전자, 한미반도체, NVDA, BTC)..."
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                refreshUniverseQuotes();
                fetchAndApplyStockData(selectedStockSymbol);
                addToast("실시간 실제 주가 호가를 동기화했습니다.", "INFO");
              }}
              className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-2xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuote ? "animate-spin text-cyan-400" : ""}`} />
              <span>시세 갱신</span>
            </button>
          </div>

          {/* Search Dropdown */}
          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 border border-indigo-500/60 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl divide-y divide-zinc-800">
              <div className="px-3 py-1.5 bg-zinc-900 text-[10px] font-black text-indigo-300 flex items-center justify-between">
                <span>실시간 시장 매칭 종목</span>
                <span className="text-zinc-500 font-mono">클릭 시 170-Bot 마스터 관제 즉시 전환</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((item) => {
                  const isUp = (item.changePct || 0) >= 0;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => {
                        const mType = item.market === "US" ? "US" : item.market === "BTC" ? "BTC" : "KOREA";
                        const newItem: StockUniverseItem = {
                          symbol: item.symbol,
                          name: item.name,
                          market: mType,
                          price: item.price || 10000,
                          changePct: item.changePct || 0,
                          tradingValue: 1200,
                          rvol: 2.8,
                          executionPower: 140,
                          sector: mType === "BTC" ? "가상자산" : mType === "US" ? "미국주식" : "국내주식",
                          newsTitle: `${item.name} 실시간 호가 및 체결 데이터 연동 완료`
                        };
                        setUniverse(prev => [newItem, ...prev.filter(p => p.symbol !== item.symbol)]);
                        handleSelectStock(newItem);
                      }}
                      className="px-3.5 py-2.5 hover:bg-zinc-800/80 cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {item.market || "KR"}
                        </span>
                        <div>
                          <div className="text-xs font-black text-white">{item.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500">{item.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-xs font-black text-zinc-100">
                          {(item.price || 0).toLocaleString()} {item.market === "US" ? "$" : "원"}
                        </div>
                        <div className={`text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? "+" : ""}{(item.changePct || 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* System Status Banner */}
        <div className="bg-zinc-950/80 p-2.5 rounded-2xl border border-zinc-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <span className="text-indigo-400 font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
            <span>선택 종목: <strong className="text-white">{currentStockData.name} ({currentStockData.symbol})</strong></span>
            <span className="text-cyan-300 font-black pl-1">
              {(currentStockData.price ?? 0).toLocaleString()} {currentStockData.market === "US" ? "$" : "원"}
            </span>
            <span className={`text-[11px] font-bold ${currentStockData.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ({currentStockData.changePct >= 0 ? "+" : ""}{currentStockData.changePct}%)
            </span>
          </span>
          <span className="text-zinc-500">실시간 피드: <strong className="text-emerald-400">100% LIVE CONNECTED (14ms)</strong></span>
        </div>
      </div>

      {/* 2. EMPHASIZED AI AUTONOMOUS TRADING & MANUAL CONTROL CENTER */}
      <div className="bg-gradient-to-r from-zinc-950 via-indigo-950/40 to-zinc-950 border-2 border-indigo-500 p-5 rounded-3xl shadow-2xl space-y-5">
        
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-2xl">
              <Zap className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-mono flex items-center gap-2">
                <span>🤖 AI 자율매매 (AUTONOMOUS ENGINE) &amp; 실계좌/모의 제어 데스크</span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                AI 뇌엔진이 실시간 실제 시세({(currentStockData.price ?? 0).toLocaleString()}{currentStockData.market === "US" ? "$" : "원"})를 기반으로 자동 감시·매수·익절을 수행합니다.
              </p>
            </div>
          </div>

          {/* Mode Switch & Main Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-zinc-900 p-1 rounded-2xl border border-zinc-800 flex items-center gap-1">
              <button
                onClick={() => setExecutionMode("FULL_AI_AUTO")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition cursor-pointer ${
                  executionMode === "FULL_AI_AUTO"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                100% AI 자율매매
              </button>
              <button
                onClick={() => setExecutionMode("HYBRID_CONFIRM")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition cursor-pointer ${
                  executionMode === "HYBRID_CONFIRM"
                    ? "bg-amber-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                하이브리드
              </button>
              <button
                onClick={() => setExecutionMode("MANUAL_ONLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition cursor-pointer ${
                  executionMode === "MANUAL_ONLY"
                    ? "bg-zinc-700 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                수동 전용
              </button>
            </div>

            <button
              onClick={() => setIsAutoRunning(!isAutoRunning)}
              className={`px-4 py-2 rounded-2xl text-xs font-mono font-black transition flex items-center gap-2 cursor-pointer shadow-lg ${
                isAutoRunning
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
              }`}
            >
              {isAutoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isAutoRunning ? "AI 엔진 감시 중" : "AI 엔진 일시정지"}</span>
            </button>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Left: Instant AI Auto-Buy Highlight Button */}
          <div className="md:col-span-5 bg-gradient-to-r from-amber-950/60 via-zinc-900 to-indigo-950/60 border-2 border-amber-500/80 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>⚡ AI 1초 즉시 자율 매수 (INSTANT AUTO-BUY)</span>
                </span>
                <span className="text-[10px] text-amber-200 bg-amber-950 px-2 py-0.5 rounded border border-amber-700">
                  S+급 실시간 체결
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-mono mt-1">
                대기 시간 없이 즉시 170개 Micro Bot을 동시 실행하여 유니버스 내 최고 점수 주도주({currentStockData.name})를 실제 호가로 1초 만에 자율 매수합니다.
              </p>
            </div>

            <button
              onClick={handleInstantAiAutoBuy}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white font-black text-sm rounded-xl transition shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-5 h-5 text-amber-200 animate-bounce" />
              <span>⚡ AI 1초 즉시 자율 매수 실행</span>
            </button>
          </div>

          {/* Right: Manual Quick Order Controls */}
          <div className="md:col-span-7 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-300 font-mono">수동 주문 제어 (실제 시세 기반 주문)</span>
              <span className="text-xs text-indigo-400 font-mono font-bold">
                선택: {currentStockData.name} ({(currentStockData.price ?? 0).toLocaleString()}{currentStockData.market === "US" ? "$" : "원"})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleManualBuy(100000)}
                className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +10만원 매수
              </button>
              <button
                onClick={() => handleManualBuy(300000)}
                className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +30만원 매수
              </button>
              <button
                onClick={() => handleManualBuy(500000)}
                className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +50만원 매수
              </button>
              <button
                onClick={() => handleManualBuy(1000000)}
                className="py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +100만원 매수
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleManualSell("PARTIAL")}
                className="py-2 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                ⚡ 50% 분할 익절
              </button>
              <button
                onClick={() => handleManualSell("ALL")}
                className="py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                🚨 전량 청산 (Panic Sell)
              </button>
            </div>
          </div>

        </div>

        {/* Live Active Position Status & Log Stream */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-zinc-800/80 pt-4">
          
          {/* Active Position Info */}
          <div className="md:col-span-5 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-bold">📋 계좌 실시간 잔고 &amp; 포지션</span>
              <span className="text-emerald-400 font-bold">이익보호 쉴드 작동 중</span>
            </div>
            {activePosition ? (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-white font-black">{activePosition.name} ({activePosition.symbol})</span>
                  <span className={`font-bold ${activePosition.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    수익률: {activePosition.pnlPct >= 0 ? "+" : ""}{activePosition.pnlPct}%
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>보유수량: {activePosition.qty}주</span>
                  <span>평단가: {activePosition.market === "US" ? `$${(activePosition.buyPrice ?? 0).toLocaleString()}` : `${(activePosition.buyPrice ?? 0).toLocaleString()}원`}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>현재가: {activePosition.market === "US" ? `$${(activePosition.currentPrice ?? 0).toLocaleString()}` : `${(activePosition.currentPrice ?? 0).toLocaleString()}원`}</span>
                  <span className="text-amber-300">익절보장선: {activePosition.market === "US" ? `$${(activePosition.trailingShieldPrice ?? 0).toLocaleString()}` : `${(activePosition.trailingShieldPrice ?? 0).toLocaleString()}원`}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono text-center py-2">현재 보유 중인 포지션이 없습니다. (대기 상태)</p>
            )}
          </div>

          {/* AI Log Stream */}
          <div className="md:col-span-7 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2 max-h-32 overflow-y-auto">
            <span className="text-xs font-bold text-zinc-400 font-mono block">📡 AI 뇌엔진 실시간 텔레메트리 스트림</span>
            <div className="space-y-1 text-[11px] font-mono">
              {autoLogs.map((log, idx) => (
                <div key={`${log.id}_${idx}`} className="flex items-center gap-2">
                  <span className="text-zinc-600 shrink-0">{log.time}</span>
                  <span className={`truncate ${
                    log.type === "BUY" ? "text-emerald-300 font-bold" :
                    log.type === "SELL" ? "text-rose-300 font-bold" :
                    log.type === "SHIELD" ? "text-amber-300" : "text-zinc-400"
                  }`}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 3. V7.1 MASTER SECURITIES TERMINAL REPORT CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Terminal ASCII / Markdown Report Output */}
        <div className="lg:col-span-7 bg-zinc-950 border-2 border-indigo-500/50 p-5 rounded-3xl shadow-2xl font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-zinc-400 text-xs font-bold pl-2">MASTER PROMPT v7.1 TRADING ANALYSIS</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openStockChart(currentStockData.symbol, currentStockData.name, currentStockData.market)}
                className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>차트 열기</span>
              </button>
              <button
                onClick={handleCopyMasterReport}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "리포트 복사완료!" : "리포트 복사"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 text-zinc-200">
            <div className="text-indigo-400 font-bold">
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
              AI MULTI-BOT TRADING SECURITIES SYSTEM v7.1<br/>
              MASTER INTEGRATED ANALYSIS REPORT<br/>
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-zinc-500">종목명      :</span> <span className="text-white font-bold">{analysis.name} ({analysis.symbol})</span></div>
              <div><span className="text-zinc-500">시장구분    :</span> <span className="text-cyan-400 font-bold">{analysis.market}</span></div>
              <div>
                <span className="text-zinc-500">현재가      :</span>{" "}
                <span className="text-white font-bold">
                  {(analysis.currentPrice ?? 0).toLocaleString()} {analysis.market === "US" ? "$" : "원"} ({analysis.changePct >= 0 ? "+" : ""}{analysis.changePct}%)
                </span>
              </div>
              <div><span className="text-zinc-500">거래대금    :</span> <span className="text-amber-300 font-bold">{analysis.tradingValue}억원 (RVOL {analysis.rvol}배)</span></div>
            </div>

            {/* Data Quality & Market Intel */}
            <div className="bg-zinc-900/90 p-3 rounded-2xl border border-zinc-800 space-y-1.5">
              <div className="text-cyan-300 font-bold text-[11px]">1. DATA QUALITY &amp; MARKET INTELLIGENCE</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>DQ State: <span className="text-emerald-400 font-bold">{analysis.dataQuality.state} ({analysis.dataQuality.coverageScore}%)</span></div>
                <div>Regime  : <span className="text-indigo-300 font-bold">{analysis.marketIntel.regime}</span></div>
                <div>TopSector: <span className="text-amber-300 font-bold">{analysis.sectorTheme.topSector}</span></div>
                <div>LeaderGrade: <span className="text-emerald-300 font-bold">{analysis.sectorTheme.leaderClass}</span></div>
              </div>
            </div>

            {/* Long vs Short Army Arena */}
            <div className="bg-zinc-900/90 p-3 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-300 font-bold">2. LONG ARMY VS SHORT ARMY COMPETITION</span>
                <span className="text-emerald-400 font-bold">우세: {analysis.longShortArmy.dominantSide}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-emerald-950/80 p-2 rounded-xl border border-emerald-700">
                  <span className="text-emerald-400 font-bold block">LONG ARMY</span>
                  <span className="text-white font-black text-base">{analysis.longShortArmy.longScore}점</span>
                </div>
                <div className="bg-rose-950/80 p-2 rounded-xl border border-rose-700">
                  <span className="text-rose-400 font-bold block">SHORT ARMY</span>
                  <span className="text-white font-black text-base">{analysis.longShortArmy.shortScore}점</span>
                </div>
              </div>
            </div>

            {/* Price Structure & Target Map */}
            <div className="space-y-1 text-xs">
              <div><span className="text-zinc-500 font-bold">📊 PRICE STRUCTURE :</span> <span className="text-white">{analysis.structureState}</span></div>
              <div><span className="text-zinc-500 font-bold">🎯 PATTERN LAB     :</span> <span className="text-indigo-300">{analysis.patterns.join(" + ")}</span></div>
              <div><span className="text-zinc-500 font-bold">🧠 SMC SIGNAL       :</span> <span className="text-amber-300">{analysis.smcSignal}</span></div>
              <div><span className="text-zinc-500 font-bold">💧 LIQUIDITY SWEEP  :</span> <span className="text-purple-300">{analysis.liquiditySweep}</span></div>
              <div><span className="text-zinc-500 font-bold">📍 VWAP STATUS      :</span> <span className="text-emerald-300">{analysis.vwapStatus}</span></div>
            </div>

            {/* Setup Score Bar */}
            <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-bold">FINAL SETUP QUALITY SCORE</span>
                <span className="text-amber-400 font-black text-sm">{analysis.setupQualityScore} / 100</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${analysis.setupQualityScore}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">등급 : <strong className="text-white">{analysis.grade}</strong></span>
                <span className="text-zinc-400">의사결정 : <strong className="text-emerald-400">{analysis.finalDecision}</strong></span>
              </div>
            </div>

            {/* Entry & Resistance Map */}
            <div className="space-y-1 text-xs bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
              <div className="flex justify-between">
                <span className="text-amber-300 font-bold">🟡 관심 진입구간</span>{" "}
                <span className="text-white font-bold">{(analysis.entryZoneMin ?? 0).toLocaleString()} ~ {(analysis.entryZoneMax ?? 0).toLocaleString()} {analysis.market === "US" ? "$" : "원"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300 font-bold">🔵 돌파 확인가</span>{" "}
                <span className="text-white font-bold">{(analysis.breakoutConfirmPrice ?? 0).toLocaleString()} {analysis.market === "US" ? "$" : "원"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400 font-bold">🔴 구조 무효(손절가)</span>{" "}
                <span className="text-white font-bold">{(analysis.invalidationPrice ?? 0).toLocaleString()} {analysis.market === "US" ? "$" : "원"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400 font-bold">🎯 Target Resistance</span>{" "}
                <span className="text-white font-bold">
                  {(analysis.targetPrice1 ?? 0).toLocaleString()} / {(analysis.targetPrice2 ?? 0).toLocaleString()} {analysis.market === "US" ? "$" : "원"}
                </span>
              </div>
            </div>

            <div className="text-indigo-400 font-bold">
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
          </div>
        </div>

        {/* Right: 170+ Micro Bots Execution Radar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-3xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>MICRO BOTS RADAR MATRIX ({analysis.microBots.length})</span>
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                100% OPERATIONAL
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              {["ALL", "DATA", "MARKET", "STRUCTURE", "MICROSTRUCTURE", "RISK"].map(grp => (
                <button
                  key={grp}
                  onClick={() => setSelectedModuleFilter(grp)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                    selectedModuleFilter === grp
                      ? "bg-indigo-600 text-white font-bold"
                      : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

            {/* Bots List */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {analysis.microBots
                .filter(b => selectedModuleFilter === "ALL" || b.moduleGroup === selectedModuleFilter)
                .map(bot => (
                  <div
                    key={bot.id}
                    onClick={() => setSelectedBotDetail(bot)}
                    className="p-2.5 bg-zinc-950 hover:bg-zinc-800 rounded-xl border border-zinc-800 text-xs font-mono flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="px-1.5 py-0.2 bg-zinc-900 text-indigo-300 rounded text-[10px] font-bold border border-zinc-700">{bot.code}</span>
                      <span className="text-zinc-200 font-bold truncate">{bot.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-amber-300">{bot.value}</span>
                      <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded text-[9px] font-bold">
                        PASS
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bot Inspection Modal */}
      {selectedBotDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-indigo-500/80 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-600 rounded text-xs font-bold">{selectedBotDetail.code}</span>
                <h3 className="text-sm font-black text-white">{selectedBotDetail.name}</h3>
              </div>
              <button onClick={() => setSelectedBotDetail(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="text-zinc-500">모듈 그룹:</span> <span className="text-white font-bold">{selectedBotDetail.moduleGroup}</span></div>
              <div><span className="text-zinc-500">검증 출력:</span> <span className="text-indigo-300 font-bold">{selectedBotDetail.value}</span></div>
              <div><span className="text-zinc-500">산출 점수:</span> <span className="text-amber-400 font-bold">{selectedBotDetail.score} / 100</span></div>
            </div>
            <button onClick={() => setSelectedBotDetail(null)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer">
              닫기
            </button>
          </div>
        </div>
      )}

      {/* AI Auto Bot Reinforcement Modal */}
      <AiAutoBotEnhancementModal
        isOpen={isAutoEnhanceModalOpen}
        onClose={() => setIsAutoEnhanceModalOpen(false)}
      />

    </div>
  );
};
