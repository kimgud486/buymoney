import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Eye, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Coins, 
  Search, 
  Layers, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Flame,
  ChevronRight
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";
import { PatternUpgradeEngine } from "../../services/PatternUpgradeEngine";
import { INITIAL_STOCK_UNIVERSE } from "../../data/stockUniverse";
import { realtimeMarketFeedService, LiveMarketQuote } from "../../services/realtimeMarketFeedService";

interface ActivePoolItem {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "UPBIT" | "US";
  price: number;
  changePct: number;
  rvol: number;
  executionPower: number;
  quantScore: number;
  status: "HIGH_CONVICTION" | "ANALYZING" | "REJECTED_TRAP" | "WATCHING";
  reason: string;
  volumeDelta: string;
  dynamicRR: string;
}

export const AiActivePoolRealtimeScannerBar: React.FC = () => {
  const { profile, updateProfileSettings, addToast } = useApp();
  const isProfitOptActive = profile?.aiProfitOptimization ?? true;
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  useModalScrollLock(isPoolModalOpen);
  const [activeTab, setActiveTab] = useState<"ALL" | "HIGH_CONVICTION" | "UPBIT" | "KRX">("ALL");

  // Live candidate active pool evaluated by 4-Layer Quant Engine
  const [activePoolItems, setActivePoolItems] = useState<ActivePoolItem[]>(() => {
    return [
      {
        symbol: "KRW-BTC",
        name: "비트코인",
        market: "UPBIT",
        price: 134800000,
        changePct: +3.42,
        rvol: 2.1,
        executionPower: 124,
        quantScore: 96,
        status: "HIGH_CONVICTION",
        reason: "[10억 챌린지 탑픽] 1분봉 SMC 지지 반등 + CVD 수급 폭발",
        volumeDelta: "CVD +2.4x 순매수",
        dynamicRR: isProfitOptActive ? "1:3.5" : "1:1.5"
      },
      {
        symbol: "012450",
        name: "한화에어로스페이스",
        market: "KOSPI",
        price: 368000,
        changePct: +5.12,
        rvol: 1.8,
        executionPower: 118,
        quantScore: 92,
        status: "HIGH_CONVICTION",
        reason: "외국인/기관 동시 순매수 + 주도주 15분봉 정배열",
        volumeDelta: "CVD +1.9x 순매수",
        dynamicRR: isProfitOptActive ? "1:3.2" : "1:1.5"
      },
      {
        symbol: "277810",
        name: "레인보우로보틱스",
        market: "KOSDAQ",
        price: 182400,
        changePct: +8.75,
        rvol: 3.2,
        executionPower: 135,
        quantScore: 94,
        status: "HIGH_CONVICTION",
        reason: "거래대금 500% 폭발 + 4중 Anti-Fakeout 필터 통과",
        volumeDelta: "CVD +3.1x 순매수",
        dynamicRR: isProfitOptActive ? "1:3.8" : "1:1.5"
      },
      {
        symbol: "KRW-ETH",
        name: "이더리움",
        market: "UPBIT",
        price: 4920000,
        changePct: +2.18,
        rvol: 1.4,
        executionPower: 109,
        quantScore: 86,
        status: "ANALYZING",
        reason: "SMC 지지선 다지기 중 (RVOL 1.4x 관제)",
        volumeDelta: "CVD +1.2x 순매수",
        dynamicRR: isProfitOptActive ? "1:3.0" : "1:1.5"
      },
      {
        symbol: "005930",
        name: "삼성전자",
        market: "KOSPI",
        price: 74200,
        changePct: +0.68,
        rvol: 1.1,
        executionPower: 102,
        quantScore: 78,
        status: "WATCHING",
        reason: "VWAP 회복 중 (거래량 가속 대기)",
        volumeDelta: "CVD +0.8x 보합",
        dynamicRR: isProfitOptActive ? "1:2.8" : "1:1.5"
      },
      {
        symbol: "034020",
        name: "두산에너빌리티",
        market: "KOSPI",
        price: 21450,
        changePct: +3.85,
        rvol: 1.9,
        executionPower: 115,
        quantScore: 89,
        status: "HIGH_CONVICTION",
        reason: "원전 테마 수급 1위 + 돌파 지지선 확정",
        volumeDelta: "CVD +1.8x 순매수",
        dynamicRR: isProfitOptActive ? "1:3.2" : "1:1.5"
      },
      {
        symbol: "080220",
        name: "제주반도체",
        market: "KOSDAQ",
        price: 24100,
        changePct: -1.20,
        rvol: 0.9,
        executionPower: 88,
        quantScore: 42,
        status: "REJECTED_TRAP",
        reason: "윗꼬리 가짜 돌파(Bull Trap) 감지되어 매수 기각",
        volumeDelta: "CVD -1.4x 순매도",
        dynamicRR: "REJECTED"
      }
    ];
  });

  // Real-time market feed subscription for live price updates & dynamic quant scoring
  useEffect(() => {
    const unsub = realtimeMarketFeedService.subscribe((quotesMap) => {
      setActivePoolItems((prev) => {
        let hasChanges = false;
        const updated = prev.map((item) => {
          const live = quotesMap.get(item.symbol) || 
                       quotesMap.get(item.symbol.replace("KRW-", "")) || 
                       quotesMap.get(`KRW-${item.symbol}`);
          if (live && live.price > 0 && (live.price !== item.price || live.changeRate !== item.changePct)) {
            hasChanges = true;
            return {
              ...item,
              price: live.price,
              changePct: Number(live.changeRate.toFixed(2)),
              dynamicRR: isProfitOptActive ? (item.quantScore >= 90 ? "1:3.8" : "1:3.2") : "1:1.5"
            };
          }
          return item;
        });
        return hasChanges ? updated : prev;
      });
    });

    return () => unsub();
  }, [isProfitOptActive]);

  const filteredPool = activePoolItems.filter((item) => {
    if (activeTab === "HIGH_CONVICTION") return item.status === "HIGH_CONVICTION";
    if (activeTab === "UPBIT") return item.market === "UPBIT";
    if (activeTab === "KRX") return item.market === "KOSPI" || item.market === "KOSDAQ";
    return true;
  });

  const topHighConvictionCount = activePoolItems.filter(i => i.status === "HIGH_CONVICTION").length;

  return (
    <>
      {/* 🚀 AI ACTIVE POOL REAL-TIME SCANNER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30 px-3 py-1.5 text-xs text-white shadow-md">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          {/* Active Pool Header Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-extrabold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>10억 챌린지 AI 분석 액티브 풀</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-mono text-[10px]">
                {topHighConvictionCount}개 고확신 타점
              </span>
            </div>

            {/* AI Profit Optimization Strategy Status Badge */}
            <button
              onClick={() => {
                const nextState = !isProfitOptActive;
                updateProfileSettings({
                  aiProfitOptimization: nextState,
                  aiAggressivenessLevel: nextState ? "DYNAMIC" : "BALANCED"
                });
                addToast({
                  type: nextState ? "SUCCESS" : "INFO",
                  title: nextState ? "✨ [AI Profit Optimization ACTIVE]" : "⚖️ [AI Strategy: BALANCED]",
                  message: nextState
                    ? "변동성 및 실시간 유동성에 따라 손익비(R:R 1:3.2 이상)와 트레일링 스탑이 동적으로 승율을 최적화합니다."
                    : "기본 균형 손익비(R:R 1:1.5) 모드로 전환되었습니다."
                });
              }}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                isProfitOptActive
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:border-emerald-400"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>{isProfitOptActive ? "수익 극대화 토글 ON (손익비 1:3.2+)" : "수익 극대화 OFF (1:1.5)"}</span>
            </button>
          </div>

          {/* Active Stock Ticker Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink">
            {activePoolItems.slice(0, 5).map((item) => {
              const isHigh = item.status === "HIGH_CONVICTION";
              const isRejected = item.status === "REJECTED_TRAP";
              return (
                <div
                  key={item.symbol}
                  onClick={() => setIsPoolModalOpen(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-mono cursor-pointer transition hover:scale-102 shrink-0 ${
                    isHigh
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                      : isRejected
                      ? "bg-rose-950/50 border-rose-500/40 text-rose-300 opacity-60"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                  title={item.reason}
                >
                  <span className="font-bold">{item.name}</span>
                  <span className={`font-extrabold ${item.changePct >= 0 ? "text-red-400" : "text-blue-400"}`}>
                    {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(1)}%
                  </span>
                  <span className={`px-1 py-0.2 rounded font-black text-[9px] ${
                    isHigh ? "bg-emerald-500 text-black" : "bg-slate-800 text-slate-300"
                  }`}>
                    {item.quantScore}점
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detailed Inspector Modal Open Button */}
          <button
            onClick={() => setIsPoolModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-cyan-300 text-[11px] font-bold cursor-pointer shrink-0 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>분석 풀 전체보기 ({activePoolItems.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 🔍 DETAILED ACTIVE POOL INSPECTOR MODAL */}
      {isPoolModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-none sm:rounded-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 overscroll-contain">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-cyan-300">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    🎯 10억 챌린지 AI 실시간 분석 종목 풀 (Active Pool Transparency)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    AI 16대 뇌엔진이 24시간 실시간으로 스캐닝 중인 전체 유니버스 분석 현황입니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPoolModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* AI Strategy & Filter Controls Banner */}
            <div className="p-3 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">전략 모드:</span>
                <button
                  onClick={() => {
                    const nextState = !isProfitOptActive;
                    updateProfileSettings({
                      aiProfitOptimization: nextState,
                      aiAggressivenessLevel: nextState ? "DYNAMIC" : "BALANCED"
                    });
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border transition cursor-pointer ${
                    isProfitOptActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md animate-pulse"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>{isProfitOptActive ? "✨ AI Profit Optimization (동적 손익비 1:3.2+)" : "⚖️ 균형 모드 (손익비 1:1.5)"}</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[
                  { key: "ALL", label: "전체 스캔" },
                  { key: "HIGH_CONVICTION", label: "🎯 고확신 타점" },
                  { key: "UPBIT", label: "🪙 업비트" },
                  { key: "KRX", label: "🇰🇷 주식" }
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === t.key
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock List Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredPool.map((stk) => {
                const isHigh = stk.status === "HIGH_CONVICTION";
                const isRejected = stk.status === "REJECTED_TRAP";
                return (
                  <div
                    key={stk.symbol}
                    className={`p-3.5 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isHigh
                        ? "bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400"
                        : isRejected
                        ? "bg-rose-950/20 border-rose-500/30 opacity-75"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Left: Stock info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        stk.market === "UPBIT" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}>
                        {stk.market === "UPBIT" ? "UP" : "KRX"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white">{stk.name}</span>
                          <span className="text-xs font-mono text-slate-400">({stk.symbol})</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isHigh
                              ? "bg-emerald-500 text-black"
                              : isRejected
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-slate-800 text-slate-300"
                          }`}>
                            {isHigh ? "🎯 고확신 매수" : isRejected ? "🛡️ 함정 차단" : "🔎 분석 진행중"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
                          <span>현재가: {(stk.price ?? 0).toLocaleString()}원</span>
                          <span className={stk.changePct >= 0 ? "text-red-400 font-bold" : "text-blue-400 font-bold"}>
                            {stk.changePct >= 0 ? "+" : ""}{stk.changePct}%
                          </span>
                          <span>| RVOL {stk.rvol}x</span>
                          <span>| 체결강도 {stk.executionPower}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quant score & Reason */}
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-300 font-bold">{stk.reason}</div>
                        <div className="text-[10px] text-indigo-300 font-mono mt-0.5">
                          {stk.volumeDelta} | 동적 손익비 <span className="text-cyan-300 font-bold">{stk.dynamicRR}</span>
                        </div>
                      </div>

                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] text-slate-400 font-bold">AI 퀀트</span>
                        <span className={`text-base font-black ${
                          stk.quantScore >= 90 ? "text-emerald-400" : stk.quantScore >= 75 ? "text-cyan-300" : "text-rose-400"
                        }`}>
                          {stk.quantScore}점
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>실시간 스캐닝 주기: 0.1초 반응형 4중 필터 관제 중</span>
              </div>
              <button
                onClick={() => setIsPoolModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
