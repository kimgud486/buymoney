import React, { useState, useEffect, useCallback } from "react";
import { 
  Newspaper, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Search, 
  Flame, 
  ShieldCheck, 
  BarChart2, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  PieChart,
  Tag
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { COMPREHENSIVE_STOCK_INDEX, resolveStockName, safeSymbolStr } from "../../lib/stockDictionary";

export interface GeminiNewsSentimentData {
  success: boolean;
  symbol: string;
  companyName: string;
  market: string;
  isAiGenerated?: boolean;
  sourceType?: string;
  overview: {
    businessSummary: string;
    marketCap: string;
    industrySector: string;
    keyDrivers: string[];
    overallSentimentScore: number; // 0 ~ 100
    overallSentimentLabel: "VERY_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "VERY_BEARISH";
    bullishPct: number;
    neutralPct: number;
    bearishPct: number;
  };
  articles: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: string;
    sentiment: "BULLISH" | "NEUTRAL" | "BEARISH";
    sentimentScore: number;
    impactScore: number;
    reasoning: string;
  }>;
  keywordCloud: Array<{ word: string; weight: number; sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" }>;
}

export const GeminiNewsSentimentLayer: React.FC<{
  initialSymbol?: string;
  className?: string;
}> = ({ initialSymbol = "005930", className = "" }) => {
  const { addToast, selectedSymbol, setSelectedSymbol, openStockChart } = useApp();

  const [symbol, setSymbol] = useState(initialSymbol);
  const [data, setData] = useState<GeminiNewsSentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== symbol) {
      setSymbol(selectedSymbol);
    }
  }, [selectedSymbol]);

  const fetchSentimentAnalysis = useCallback(async (symToFetch: string, force = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/corporate-news/analytics/${encodeURIComponent(symToFetch)}?force=${force}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error("Failed to fetch sentiment analysis");
      }
    } catch (e: any) {
      console.error(e);
      addToast({
        type: "ERROR",
        title: "감성 분석 조회 오류",
        message: "Gemini AI 실시간 감성 분석 데이터를 수신하지 못했습니다."
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSentimentAnalysis(symbol);
  }, [symbol, fetchSentimentAnalysis]);

  const handleSearchStock = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = safeSymbolStr(symbol).toUpperCase();
    if (!clean) return;
    fetchSentimentAnalysis(clean, true);
  };

  const currentStockName = resolveStockName(symbol, safeSymbolStr(symbol), "KOREA");

  const filteredArticles = data?.articles ? data.articles.filter(a => {
    if (!activeKeyword) return true;
    return a.title.includes(activeKeyword) || a.summary.includes(activeKeyword);
  }) : [];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-4 font-sans ${className}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">
                Gemini AI 실시간 뉴스 감성 분석 레이어 (Sentiment Score)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono font-bold">
                REAL-TIME SENTIMENT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              구글 검색 접지(Search Grounding) 기반 실시간 속보 데이터와 종목별 심리 지수 산출
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchSentimentAnalysis(symbol, true)}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>새로고침</span>
        </button>
      </div>

      {/* Stock Quick Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 font-bold mr-1">주요 종목:</span>
          {[
            { sym: "005930", label: "삼성전자" },
            { sym: "000660", label: "SK하이닉스" },
            { sym: "005380", label: "현대차" },
            { sym: "247540", label: "에코프로비엠" },
            { sym: "NVDA", label: "엔비디아" },
            { sym: "BTC", label: "비트코인" }
          ].map(item => (
            <button
              key={item.sym}
              onClick={() => {
                setSymbol(item.sym);
                setSelectedSymbol(item.sym);
                setActiveKeyword(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                symbol.toUpperCase() === item.sym
                  ? "bg-cyan-600 text-white border-cyan-400 font-black"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchStock} className="flex items-center gap-1 relative w-full sm:w-auto mt-1 sm:mt-0">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="종목코드/티커 (예: 005930, NVDA, BTC)..."
            className="bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-8 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
          <button type="submit" className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition cursor-pointer">
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="p-10 text-center space-y-2 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
          <p className="font-bold text-white">{currentStockName} ({symbol}) Gemini AI 뉴스 심리 분석 중...</p>
        </div>
      )}

      {/* Main Analysis Visualizer */}
      {data && (
        <div className="space-y-4">
          {/* Sentiment Gauge Card */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 p-4 rounded-xl border border-indigo-500/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            
            {/* Score Number */}
            <div className="border-b md:border-b-0 md:border-r border-indigo-500/20 pb-3 md:pb-0 pr-0 md:pr-4">
              <span className="text-[10px] text-indigo-300 font-mono font-bold block uppercase">
                {data.companyName} ({data.symbol}) 투자 심리 지수
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-4xl font-black font-mono ${
                  data.overview.overallSentimentScore >= 70 ? "text-emerald-400" :
                  data.overview.overallSentimentScore >= 50 ? "text-cyan-400" : "text-rose-400"
                }`}>
                  {data.overview.overallSentimentScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100점</span>
              </div>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded text-xs font-black font-mono bg-indigo-900 text-indigo-200 border border-indigo-700">
                  {data.overview.overallSentimentLabel}
                </span>
              </div>
            </div>

            {/* Sentiment Ratio Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">호재 {data.overview.bullishPct}%</span>
                <span className="text-slate-400">중립 {data.overview.neutralPct}%</span>
                <span className="text-rose-400 font-bold">악재 {data.overview.bearishPct}%</span>
              </div>
              <div className="h-3 bg-slate-900 rounded-full overflow-hidden flex border border-indigo-500/30">
                <div style={{ width: `${data.overview.bullishPct}%` }} className="bg-emerald-400 h-full transition-all" />
                <div style={{ width: `${data.overview.neutralPct}%` }} className="bg-slate-500 h-full transition-all" />
                <div style={{ width: `${data.overview.bearishPct}%` }} className="bg-rose-500 h-full transition-all" />
              </div>
              <p className="text-[10px] text-slate-400">
                * Gemini 3.7-flash AI 모델이 최근 실시간 속보 헤드라인의 긍부정 비율을 토대로 계산합니다.
              </p>
            </div>

            {/* Trading Action Recommendation */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 text-xs space-y-1 font-mono">
              <span className="text-cyan-300 font-bold block flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                AI 매매 알고리즘 반응
              </span>
              <p className="text-slate-200 text-[11px] leading-relaxed">
                {data.overview.overallSentimentScore >= 70 
                  ? "🟢 심리 지수 우수 (+70점 이상) — 자율 매수 알고리즘 가중치 +15% 증대 적용"
                  : data.overview.overallSentimentScore >= 50
                  ? "⚪ 심리 지수 중립 국면 — 보유 포지션 유지 및 손절선 상향 관리"
                  : "🔴 심리 지수 악화 — 신규 매수 차단 및 방어적 비중 축소 권장"}
              </p>
            </div>

          </div>

          {/* Keyword Cloud */}
          {data.keywordCloud && data.keywordCloud.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 font-mono mr-1">이슈 키워드:</span>
              {data.keywordCloud.map((kw, i) => (
                <button
                  key={i}
                  onClick={() => setActiveKeyword(activeKeyword === kw.word ? null : kw.word)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition cursor-pointer border ${
                    activeKeyword === kw.word
                      ? "bg-purple-600 text-white border-purple-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  #{kw.word}
                </button>
              ))}
            </div>
          )}

          {/* News Feed List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-tight">
              실시간 속보 피드 & AI 평가 ({filteredArticles.length}건)
            </h4>

            {filteredArticles.map(art => {
              const isBull = art.sentiment === "BULLISH";
              const isBear = art.sentiment === "BEARISH";

              return (
                <div key={art.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-mono font-black text-[10px] border ${
                      isBull ? "bg-emerald-950 text-emerald-300 border-emerald-700" :
                      isBear ? "bg-rose-950 text-rose-300 border-rose-700" :
                      "bg-slate-800 text-slate-300 border-slate-700"
                    }`}>
                      {isBull ? `🟢 호재 (+${art.sentimentScore})` : isBear ? `🔴 악재 (${art.sentimentScore})` : `⚪ 중립 (${art.sentimentScore})`}
                    </span>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {art.publishedAt} | {art.source}
                    </span>
                  </div>

                  <h5 className="font-extrabold text-white text-sm leading-snug">
                    {art.title}
                  </h5>

                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    {art.summary}
                  </p>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>주가 파급 영향력: <strong className="text-white">{art.impactScore}/100점</strong></span>
                    <button
                      onClick={() => openStockChart({
                        symbol,
                        name: data.companyName,
                        market: "KOREA"
                      })}
                      className="text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>차트 연동</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
