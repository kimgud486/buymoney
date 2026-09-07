import React, { useState, useEffect } from "react";
import { Brain, Sparkles, Filter, TrendingUp, ShieldAlert, ArrowUpRight, CheckCircle2, Sliders, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { StockItem } from "../../data/stockUniverse";
import { riskGovernorEngine } from "../../lib/riskGovernorEngine";

interface DecisionItem {
  symbol: string;
  name: string;
  category: "소형주" | "중형주" | "대형주" | "가상자산";
  signal: "STRONG BUY" | "BUY" | "ACCUMULATE";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  expectedRoi: number; // %
  stopLoss: number;
  timeframe: string;
  rationale: string;
  screenerSource: string;
  confluenceScore?: number;
  riskRewardRatio?: number;
}

const INITIAL_DECISIONS: DecisionItem[] = [
  {
    symbol: "277810",
    name: "레인보우로보틱스",
    category: "소형주",
    signal: "STRONG BUY",
    confidence: 96,
    entryPrice: 168400,
    targetPrice: 192000,
    expectedRoi: 14.0,
    stopLoss: 163000,
    timeframe: "단기 1~3일 스윙",
    rationale: "소형주 거래대금 500% 폭발 및 직전 3개월 박스권 상단 대량 거래량 양봉 돌파 (RVOL 2.4)",
    screenerSource: "소형주 급등 알파 발굴 봇 (공격형)",
    confluenceScore: 94,
    riskRewardRatio: 2.8
  },
  {
    symbol: "012450",
    name: "한화에어로스페이스",
    category: "중형주",
    signal: "STRONG BUY",
    confidence: 94,
    entryPrice: 301000,
    targetPrice: 335000,
    expectedRoi: 11.3,
    stopLoss: 292000,
    timeframe: "스윙 3~7일",
    rationale: "기관/외인 동시 순매수 4일 연속 유입 및 Bull Flag 깃발형 패턴 완성 상방 발산",
    screenerSource: "중형주 주도 스윙 봇 (중립형)",
    confluenceScore: 91,
    riskRewardRatio: 2.5
  },
  {
    symbol: "034020",
    name: "두산에너빌리티",
    category: "중형주",
    signal: "BUY",
    confidence: 91,
    entryPrice: 32450,
    targetPrice: 36800,
    expectedRoi: 13.4,
    stopLoss: 31200,
    timeframe: "스윙 2~5일",
    rationale: "체코 및 SMR 원전 모멘텀과 함께 거래대금 5,000억 상회 전고점 돌파",
    screenerSource: "BOS/CHoCH 구조 돌파 봇",
    confluenceScore: 89,
    riskRewardRatio: 2.4
  },
  {
    symbol: "080220",
    name: "제주반도체",
    category: "소형주",
    signal: "BUY",
    confidence: 93,
    entryPrice: 24350,
    targetPrice: 27500,
    expectedRoi: 12.9,
    stopLoss: 23500,
    timeframe: "단기 1~2일",
    rationale: "온디바이스 AI 테마 대장주 수급 유입 및 상대강도(RS 92) 최상위 유지",
    screenerSource: "소형주 급등 알파 발굴 봇",
    confluenceScore: 88,
    riskRewardRatio: 2.2
  },
  {
    symbol: "KRW-SOL",
    name: "솔라나 (SOL)",
    category: "가상자산",
    signal: "STRONG BUY",
    confidence: 95,
    entryPrice: 278500,
    targetPrice: 315000,
    expectedRoi: 13.1,
    stopLoss: 268000,
    timeframe: "24H 실시간",
    rationale: "업비트 24H 거래량 상위 및 온체인 유동성 급증 마켓 모멘텀 (R:R 2.4)",
    screenerSource: "업비트 24H 가상자산 봇",
    confluenceScore: 92,
    riskRewardRatio: 2.4
  }
];

export const AiDecisionBoard: React.FC<{
  onSelectStock?: (symbol: string) => void;
}> = ({ onSelectStock }) => {
  const [riskTolerance, setRiskTolerance] = useState<"ALL" | "AGGRESSIVE" | "BALANCED" | "CONSERVATIVE">("ALL");
  const [decisions, setDecisions] = useState<DecisionItem[]>(INITIAL_DECISIONS);
  const [isScanning, setIsScanning] = useState(false);

  // Sync actual prices from live ticker event stream
  useEffect(() => {
    const handleStockTicker = (e: any) => {
      if (!e || !e.detail || !Array.isArray(e.detail)) return;
      const stocks = e.detail;
      setDecisions((prev) =>
        prev.map((d) => {
          const match = stocks.find((s: any) => s.symbol === d.symbol || s.name === d.name);
          if (match && match.price) {
            const curP = match.price;
            const targetP = Math.round(curP * (1 + d.expectedRoi / 100));
            const stopP = Math.round(curP * 0.96);
            return {
              ...d,
              entryPrice: curP,
              targetPrice: targetP,
              stopLoss: stopP
            };
          }
          return d;
        })
      );
    };

    const handleUpbitTicker = (e: any) => {
      if (!e || !e.detail) return;
      const data = e.detail;
      if (data.code === "KRW-SOL" || data.market === "KRW-SOL") {
        const curP = data.trade_price;
        if (curP) {
          setDecisions((prev) =>
            prev.map((d) => {
              if (d.symbol === "KRW-SOL" || d.name.includes("솔라나")) {
                return {
                  ...d,
                  entryPrice: curP,
                  targetPrice: Math.round(curP * 1.131),
                  stopLoss: Math.round(curP * 0.96)
                };
              }
              return d;
            })
          );
        }
      }
    };

    window.addEventListener("stock_ticker_update", handleStockTicker);
    window.addEventListener("upbit_ticker_update", handleUpbitTicker);

    return () => {
      window.removeEventListener("stock_ticker_update", handleStockTicker);
      window.removeEventListener("upbit_ticker_update", handleUpbitTicker);
    };
  }, []);

  const filteredDecisions = decisions.filter((d) => {
    if (riskTolerance === "AGGRESSIVE") return d.category === "소형주" || d.category === "가상자산";
    if (riskTolerance === "BALANCED") return d.category === "중형주";
    if (riskTolerance === "CONSERVATIVE") return d.category === "대형주";
    return true;
  });

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>AI 의사결정 보드 & 실시간 종목 추천 엔진</span>
              {isScanning && (
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-mono animate-pulse">
                  스캐닝 중...
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400">소형주·중형주·가상자산 봇의 실시간 조건 검색 및 최적 진입 시그널</p>
          </div>
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
          <button
            onClick={() => setRiskTolerance("ALL")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              riskTolerance === "ALL" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            전체 추천
          </button>
          <button
            onClick={() => setRiskTolerance("AGGRESSIVE")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              riskTolerance === "AGGRESSIVE" ? "bg-rose-500 text-white shadow-2xs" : "text-slate-500 hover:text-rose-600"
            }`}
          >
            공격형 (소형/코인)
          </button>
          <button
            onClick={() => setRiskTolerance("BALANCED")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              riskTolerance === "BALANCED" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:text-blue-600"
            }`}
          >
            중립형 (중형 스윙)
          </button>
          <button
            onClick={() => setRiskTolerance("CONSERVATIVE")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              riskTolerance === "CONSERVATIVE" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-500 hover:text-indigo-600"
            }`}
          >
            안정형 (대형 퀀트)
          </button>
        </div>
      </div>

      {/* Decision Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredDecisions.map((item, idx) => (
          <div
            key={`${item.symbol}_${idx}`}
            onClick={() => onSelectStock?.(item.symbol)}
            className="p-3.5 bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl transition cursor-pointer shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-xs">{item.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">({item.symbol})</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-white border border-slate-200 rounded font-semibold text-slate-600">
                    {item.category}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {item.signal}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 py-1.5 bg-white rounded-lg border border-slate-100 font-mono text-center mb-2">
                <div>
                  <div className="text-[9px] text-slate-400 font-sans">진입가</div>
                  <div className="text-xs font-black text-slate-900">{(item.entryPrice ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-sans">목표가 (TP)</div>
                  <div className="text-xs font-black text-rose-600">+{item.expectedRoi}%</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-sans">손절가 (SL)</div>
                  <div className="text-xs font-bold text-slate-500">{(item.stopLoss ?? 0).toLocaleString()}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                {item.rationale}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-1 text-[10px]">
              <span className="text-blue-600 font-bold truncate max-w-[140px]">{item.screenerSource}</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-black border border-emerald-200">
                  R:R 1:{item.riskRewardRatio || 2.4}
                </span>
                <span className="font-mono font-bold text-emerald-600">확증 {item.confluenceScore || item.confidence}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
