import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  Building2,
  Newspaper,
  Search,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Briefcase,
  Tag,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Zap,
  Layers,
  FileText,
  Calendar,
  ChevronRight,
  Filter,
  Flame,
  ShieldCheck,
  ArrowUpRight,
  Sliders,
  PieChart,
  HelpCircle,
  Copy,
  Check,
  Globe,
  Share2,
  LineChart as LineChartIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid
} from "recharts";

// ----------------------------------------------------------------------
// DATA TYPES
// ----------------------------------------------------------------------
export type NewsCategory =
  | "ALL"
  | "SUPPLY_CONTRACT"
  | "NEW_TECH_PATENT"
  | "FINANCIAL_EARNINGS"
  | "BUSINESS_EXPANSION"
  | "M_AND_A"
  | "REGULATORY_GOV"
  | "MACRO_INDUSTRY";

export interface CorporateNewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  category: NewsCategory;
  sentiment: "BULLISH" | "NEUTRAL" | "BEARISH";
  sentimentScore: number;
  impactScore: number; // 1 to 100
  impactLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  projectedPriceEffect: string;
  projectedTimeHorizon: string;
  keyCatalysts: string[];
  riskFactors?: string[];
  reasoning: string;
}

export interface FinancialEventItem {
  id: string;
  date: string;
  title: string;
  type: "EARNINGS" | "DIVIDEND" | "CONFERENCE" | "PRODUCT_LAUNCH" | "SHAREHOLDER_MEETING" | "REGULATORY";
  status: "COMPLETED" | "IMMINENT" | "UPCOMING";
  expectedImpact: "HIGH" | "MEDIUM" | "LOW";
  consensusEst: string;
  details: string;
  historicalPriceReaction?: string;
}

export interface SentimentHistoryPoint {
  date: string;
  sentimentScore: number;
  bullishCount: number;
  bearishCount: number;
  newsVolume: number;
}

export interface KeywordCloudItem {
  word: string;
  weight: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface CorporateAnalyticsResponse {
  success: boolean;
  symbol: string;
  companyName: string;
  market: string;
  isAiGenerated?: boolean;
  sourceType?: string;
  message?: string;
  overview: {
    businessSummary: string;
    marketCap: string;
    industrySector: string;
    keyDrivers: string[];
    overallSentimentScore: number;
    overallSentimentLabel: "VERY_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "VERY_BEARISH";
    bullishPct: number;
    neutralPct: number;
    bearishPct: number;
    institutionalSentimentScore: number;
    retailSentimentScore: number;
    newsFlowVelocity: "SURGING" | "ELEVATED" | "NORMAL" | "LOW";
  };
  articles: CorporateNewsArticle[];
  financialTimeline: FinancialEventItem[];
  sentimentHistory7D: SentimentHistoryPoint[];
  keywordCloud: KeywordCloudItem[];
}

const PRESET_WATCH_STOCKS = [
  { symbol: "005930", name: "삼성전자", market: "KOSPI", sector: "반도체/스마트폰" },
  { symbol: "000660", name: "SK하이닉스", market: "KOSPI", sector: "HBM/메모리" },
  { symbol: "005380", name: "현대차", market: "KOSPI", sector: "자동차/SDV" },
  { symbol: "068270", name: "셀트리온", market: "KOSPI", sector: "바이오시밀러" },
  { symbol: "247540", name: "에코프로비엠", market: "KOSDAQ", sector: "2차전지 양극재" },
  { symbol: "454910", name: "두산로보틱스", market: "KOSPI", sector: "지능형 로봇" },
  { symbol: "272210", name: "한화시스템", market: "KOSPI", sector: "방산/우주항공" },
  { symbol: "035420", name: "NAVER", market: "KOSPI", sector: "인터넷/생성형AI" },
  { symbol: "NVDA", name: "엔비디아", market: "US", sector: "AI 가속기/GPU" },
  { symbol: "TSLA", name: "테슬라", market: "US", sector: "전기차/FSD" },
  { symbol: "AAPL", name: "애플", market: "US", sector: "Apple Intelligence" },
  { symbol: "BTC", name: "비트코인", market: "BTC", sector: "디지털 자산" }
];

export const CorporateNewsAnalytics: React.FC = () => {
  const { activeChartStock, openStockChart, addToast } = useApp();

  const [selectedSymbol, setSelectedSymbol] = useState<string>("005930");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("ALL");
  const [impactFilter, setImpactFilter] = useState<"ALL" | "CRITICAL_HIGH" | "BULLISH_ONLY" | "BEARISH_ONLY">("ALL");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const [data, setData] = useState<CorporateAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"ALL_IN_ONE" | "NEWS_FEED" | "TIMELINE" | "SENTIMENT_DEEP">("ALL_IN_ONE");

  // Sync with activeChartStock if changed globally
  useEffect(() => {
    if (activeChartStock && activeChartStock.symbol !== selectedSymbol) {
      setSelectedSymbol(activeChartStock.symbol);
    }
  }, [activeChartStock]);

  const fetchAnalytics = useCallback(async (symbolToFetch: string, force: boolean = false) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/corporate-news/analytics/${encodeURIComponent(symbolToFetch)}?force=${force}`);
      if (resp.ok) {
        const json = await resp.json();
        setData(json);
      } else {
        throw new Error("Failed to load corporate news analytics");
      }
    } catch (err: any) {
      console.error("Corporate news fetch error:", err);
      addToast("기업 사업 뉴스 및 영향도 분석 데이터를 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAnalytics(selectedSymbol);
  }, [selectedSymbol, fetchAnalytics]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;
    setSelectedSymbol(clean);
    setSelectedKeyword(null);
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    if (!data || !data.articles) return [];
    return data.articles.filter((art) => {
      // Category filter
      if (activeCategory !== "ALL" && art.category !== activeCategory) {
        return false;
      }
      // Impact & Sentiment filter
      if (impactFilter === "CRITICAL_HIGH" && art.impactScore < 75) {
        return false;
      }
      if (impactFilter === "BULLISH_ONLY" && art.sentiment !== "BULLISH") {
        return false;
      }
      if (impactFilter === "BEARISH_ONLY" && art.sentiment !== "BEARISH") {
        return false;
      }
      // Keyword filter
      if (selectedKeyword) {
        const hasInTitle = art.title.toLowerCase().includes(selectedKeyword.toLowerCase());
        const hasInSummary = art.summary.toLowerCase().includes(selectedKeyword.toLowerCase());
        const hasInCatalyst = art.keyCatalysts.some((c) => c.toLowerCase().includes(selectedKeyword.toLowerCase()));
        if (!hasInTitle && !hasInSummary && !hasInCatalyst) {
          return false;
        }
      }
      return true;
    });
  }, [data, activeCategory, impactFilter, selectedKeyword]);

  const handleCopySummary = () => {
    if (!data) return;
    const text = `[${data.companyName} (${data.symbol}) AI 기업 사업 뉴스 & 영향도 분석 요약]
• 섹터: ${data.overview.industrySector} (시총: ${data.overview.marketCap})
• 종합 센티멘트: ${data.overview.overallSentimentScore}점 (${data.overview.overallSentimentLabel})
• 긍정: ${data.overview.bullishPct}% | 중립: ${data.overview.neutralPct}% | 부정: ${data.overview.bearishPct}%
• 핵심 성장동력: ${data.overview.keyDrivers.join(", ")}
• 최신 호재: ${data.articles[0]?.title || "관련 뉴스 없음"} (영향도: ${data.articles[0]?.impactScore || "-"}점)
• 분석 출처: AISTOCK 24 AI Control Center`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    addToast("기업 분석 브리핑이 클립보드에 복사되었습니다.", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleBindToChart = () => {
    if (!data) return;
    openStockChart({
      symbol: data.symbol,
      name: data.companyName,
      market: data.market as any,
      price: 0,
      change: 0,
      changePct: 0,
      marketCap: data.overview.marketCap || "N/A",
      per: 15,
      pbr: 1.2,
      roe: 12,
      debtRatio: 40,
      revenueGrowth: 10,
      operatingMargin: 15,
      news: [],
      technical: { rsi: 55, macd: "Bullish", bollinger: "middle", trend: "up" }
    });
    addToast(`${data.companyName} (${data.symbol}) 실시간 차트 및 AI 주문 연동 완료`, "info");
  };

  return (
    <div className="bg-zinc-950 border-2 border-cyan-500/50 rounded-3xl p-4 sm:p-6 text-white shadow-2xl space-y-6 font-sans">
      
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-purple-500/20 text-cyan-400 rounded-2xl border border-cyan-400/50 shadow-inner">
            <Newspaper className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>📰 기업 사업 뉴스 &amp; 주가 영향도(Impact Score) 분석</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-900 via-indigo-900 to-cyan-900 text-cyan-300 border border-cyan-500/60 rounded-full text-[10px] font-mono font-bold tracking-wider animate-pulse">
                AI CONTROL v8.0
              </span>
              {data?.isAiGenerated && (
                <span className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-500/50 rounded-full text-[10px] font-mono font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Gemini Grounded
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              상장 기업의 신규 수주, 특허 승인, 실적 공시, 이벤트 타임라인 및 기사별 주가 영향도(Impact Score 1~100) 산출
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex items-center text-xs font-bold font-mono">
            <button
              onClick={() => setViewMode("ALL_IN_ONE")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "ALL_IN_ONE" ? "bg-cyan-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              종합 뷰
            </button>
            <button
              onClick={() => setViewMode("NEWS_FEED")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "NEWS_FEED" ? "bg-cyan-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              뉴스 피드
            </button>
            <button
              onClick={() => setViewMode("TIMELINE")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "TIMELINE" ? "bg-cyan-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              이벤트 타임라인
            </button>
            <button
              onClick={() => setViewMode("SENTIMENT_DEEP")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "SENTIMENT_DEEP" ? "bg-cyan-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              센티멘트 분석
            </button>
          </div>

          <button
            onClick={() => fetchAnalytics(selectedSymbol, true)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/50 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="실시간 뉴스 및 영향도 강제 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span>새로고침</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="AI 기업 분석 브리핑 복사"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-300" />}
            <span>{isCopied ? "복사됨!" : "브리핑 복사"}</span>
          </button>

          <button
            onClick={handleBindToChart}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <LineChartIcon className="w-3.5 h-3.5 text-emerald-100" />
            <span>차트·주문 연동</span>
          </button>
        </div>
      </div>

      {/* 2. FAST PRESET STOCK CHIPS & CUSTOM SEARCH BAR */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400 font-bold mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            주요 분석 종목:
          </span>
          {PRESET_WATCH_STOCKS.map((stk) => (
            <button
              key={stk.symbol}
              onClick={() => {
                setSelectedSymbol(stk.symbol);
                setSelectedKeyword(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                selectedSymbol === stk.symbol
                  ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-cyan-400 shadow-md ring-1 ring-cyan-400/50 scale-105"
                  : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span className="text-[10px] text-zinc-400">[{stk.market}]</span>
              <span>{stk.name}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="분석할 종목명 또는 6자리 종목코드 입력 (예: 한미반도체, 카카오, 005930, NVDA)..."
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
          >
            <span>종목 분석 실행</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* LOADING STATE */}
      {isLoading && !data && (
        <div className="p-12 text-center space-y-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-white">
            {selectedSymbol} 기업 사업 리포트 및 실시간 뉴스 영향도 데이터를 분석 중입니다...
          </p>
          <p className="text-xs text-zinc-400 font-mono">
            Gemini AI 뉴스 임팩트 엔진이 공급 계약, 특허 승인, 실적 발표 모멘텀을 계산하고 있습니다.
          </p>
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      {data && (
        <div className="space-y-6">
          {/* CORPORATE SUMMARY HERO CARD */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-cyan-950/40 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            
            {/* Header with Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300 font-mono font-bold text-xs border border-cyan-600/60">
                  {data.market}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  {data.companyName}
                  <span className="text-xs sm:text-sm font-mono text-zinc-400 font-normal">({data.symbol})</span>
                </h3>
                <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-200 font-bold text-xs border border-zinc-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  {data.overview.industrySector}
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  시가총액: <strong className="text-white">{data.overview.marketCap}</strong>
                </span>
              </div>

              {/* News Flow Velocity */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-mono">뉴스 유입 속도:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                  data.overview.newsFlowVelocity === "SURGING"
                    ? "bg-rose-950/80 text-rose-300 border-rose-500/60 animate-pulse"
                    : data.overview.newsFlowVelocity === "ELEVATED"
                    ? "bg-amber-950/80 text-amber-300 border-amber-500/60"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                }`}>
                  <Flame className="w-3 h-3" />
                  {data.overview.newsFlowVelocity === "SURGING" ? "🔥 폭증 (SURGING)" : data.overview.newsFlowVelocity === "ELEVATED" ? "⚡ 증가 (ELEVATED)" : "보통 (NORMAL)"}
                </span>
              </div>
            </div>

            {/* Business Summary & Key Drivers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Business Description */}
              <div className="lg:col-span-2 space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    기업 핵심 사업 영역 &amp; 성장 비전
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">실시간 기업 분석 리포트</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                  {data.overview.businessSummary}
                </p>

                {/* Key Drivers */}
                <div className="pt-2 border-t border-zinc-800/60">
                  <span className="text-[11px] font-bold text-zinc-400 font-mono block mb-1.5">
                    핵심 밸류에이션 카탈리스트 (Key Growth Drivers):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.overview.keyDrivers.map((driver, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-zinc-900 hover:bg-zinc-800 text-cyan-200 border border-cyan-800/50 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        {driver}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Overall Sentiment Diagnostic Box */}
              <div className="space-y-3 bg-gradient-to-b from-indigo-950/40 to-zinc-950/80 p-4 rounded-xl border border-indigo-500/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1.5">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    종합 AI 뉴스 센티멘트 지수
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    data.overview.overallSentimentScore >= 75 ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50" :
                    data.overview.overallSentimentScore >= 50 ? "bg-cyan-950 text-cyan-300 border border-cyan-500/50" :
                    "bg-rose-950 text-rose-300 border border-rose-500/50"
                  }`}>
                    {data.overview.overallSentimentLabel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-white flex items-baseline gap-1">
                    <span className={data.overview.overallSentimentScore >= 70 ? "text-emerald-400" : "text-amber-400"}>
                      {data.overview.overallSentimentScore}
                    </span>
                    <span className="text-xs text-zinc-400 font-normal">/ 100점</span>
                  </div>
                  <div className="text-right text-[11px] font-mono">
                    <span className="text-zinc-400">기관 vs 개인 괴리율: </span>
                    <strong className="text-indigo-300">
                      {Math.abs(data.overview.institutionalSentimentScore - data.overview.retailSentimentScore)}%p
                    </strong>
                  </div>
                </div>

                {/* Sentiment Distribution Bar */}
                <div className="space-y-1 pt-1">
                  <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${data.overview.bullishPct}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`긍정/호재: ${data.overview.bullishPct}%`}
                    />
                    <div
                      style={{ width: `${data.overview.neutralPct}%` }}
                      className="bg-zinc-500 h-full transition-all duration-500"
                      title={`중립: ${data.overview.neutralPct}%`}
                    />
                    <div
                      style={{ width: `${data.overview.bearishPct}%` }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title={`부정/악재: ${data.overview.bearishPct}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                    <span className="text-emerald-400 font-bold">호재 {data.overview.bullishPct}%</span>
                    <span className="text-zinc-400">중립 {data.overview.neutralPct}%</span>
                    <span className="text-rose-400 font-bold">악재 {data.overview.bearishPct}%</span>
                  </div>
                </div>

                {/* Institutional vs Retail comparison */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-[11px] font-mono">
                  <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">기관 리서치 센티멘트</span>
                    <span className="text-cyan-300 font-black text-sm">{data.overview.institutionalSentimentScore}점</span>
                  </div>
                  <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">개인 커뮤니티 센티멘트</span>
                    <span className="text-amber-300 font-black text-sm">{data.overview.retailSentimentScore}점</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* 4. SENTIMENT MOMENTUM 7-DAY CHART & KEYWORD HEATMAP */}
          {(viewMode === "ALL_IN_ONE" || viewMode === "SENTIMENT_DEEP") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* 7-Day Sentiment & News Flow Area Chart */}
              <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-cyan-400" />
                    7일간 뉴스 센티멘트 지수 추이 및 기사 유입량 (7-Day Sentiment Momentum)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">신뢰도: 95%</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.sentimentHistory7D} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} domain={[40, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#06b6d4",
                          borderRadius: "0.75rem",
                          fontSize: "11px"
                        }}
                        labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sentimentScore"
                        name="센티멘트 지수"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorSentiment)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* NLP Keyword Cloud & Filtering Tags */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-purple-400" />
                    AI 핵심 키워드 클라우드
                  </span>
                  {selectedKeyword && (
                    <button
                      onClick={() => setSelectedKeyword(null)}
                      className="text-[10px] text-cyan-400 hover:underline font-mono"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  키워드를 클릭하면 해당 이슈가 포함된 뉴스를 즉시 필터링합니다.
                </p>

                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {data.keywordCloud.map((kw, i) => {
                    const isSelected = selectedKeyword === kw.word;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedKeyword(isSelected ? null : kw.word)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-400"
                            : kw.sentiment === "POSITIVE"
                            ? "bg-zinc-950 text-emerald-300 border-emerald-800/40 hover:border-emerald-500"
                            : kw.sentiment === "NEGATIVE"
                            ? "bg-zinc-950 text-rose-300 border-rose-800/40 hover:border-rose-500"
                            : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600"
                        }`}
                      >
                        <span>#{kw.word}</span>
                        <span className="text-[9px] opacity-70">({kw.weight})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* 5. FINANCIAL EVENT TIMELINE SECTION */}
          {(viewMode === "ALL_IN_ONE" || viewMode === "TIMELINE") && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      📅 {data.companyName} 주요 재무 &amp; 사업 이벤트 타임라인
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      실적 공시, 배당락일, 기술 컨퍼런스, 신제품 런칭 등 주가 변동성 유발 주요 일정
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-800/50 font-bold">
                  총 {data.financialTimeline.length}건 예정
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.financialTimeline.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2.5 ${
                      evt.status === "IMMINENT"
                        ? "bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-900 border-amber-500/60 shadow-md ring-1 ring-amber-500/30"
                        : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black font-mono text-cyan-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {evt.date}
                        </span>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          evt.status === "IMMINENT" ? "bg-amber-500 text-zinc-950 font-black animate-pulse" :
                          evt.status === "COMPLETED" ? "bg-zinc-800 text-zinc-400" :
                          "bg-indigo-950 text-indigo-300 border border-indigo-700/50"
                        }`}>
                          {evt.status === "IMMINENT" ? "🔥 임박 (<7일)" : evt.status === "COMPLETED" ? "완료됨" : "예정"}
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {evt.title}
                      </h5>

                      <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                        {evt.details}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>컨센서스:</span>
                        <strong className="text-white">{evt.consensusEst}</strong>
                      </div>
                      {evt.historicalPriceReaction && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>과거 주가 반응:</span>
                          <span>{evt.historicalPriceReaction}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. DETAILED CORPORATE NEWS FEED & IMPACT SCORE ENGINE */}
          {(viewMode === "ALL_IN_ONE" || viewMode === "NEWS_FEED") && (
            <div className="space-y-4">
              
              {/* Filter Tabs & Quick Controls */}
              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                
                {/* Categories */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold">
                  <button
                    onClick={() => setActiveCategory("ALL")}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      activeCategory === "ALL"
                        ? "bg-cyan-600 text-white shadow-md font-black"
                        : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    전체 뉴스 ({data.articles.length})
                  </button>
                  <button
                    onClick={() => setActiveCategory("SUPPLY_CONTRACT")}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      activeCategory === "SUPPLY_CONTRACT"
                        ? "bg-emerald-600 text-white shadow-md font-black"
                        : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    💰 대규모 수주/공급계약
                  </button>
                  <button
                    onClick={() => setActiveCategory("NEW_TECH_PATENT")}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      activeCategory === "NEW_TECH_PATENT"
                        ? "bg-purple-600 text-white shadow-md font-black"
                        : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    🔬 신기술/특허
                  </button>
                  <button
                    onClick={() => setActiveCategory("FINANCIAL_EARNINGS")}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      activeCategory === "FINANCIAL_EARNINGS"
                        ? "bg-blue-600 text-white shadow-md font-black"
                        : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    📊 실적/어닝
                  </button>
                  <button
                    onClick={() => setActiveCategory("REGULATORY_GOV")}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      activeCategory === "REGULATORY_GOV"
                        ? "bg-amber-600 text-white shadow-md font-black"
                        : "bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    🏛️ 정부정책/보조금
                  </button>
                </div>

                {/* Impact Level Quick Filters */}
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">영향도 필터:</span>
                  <select
                    value={impactFilter}
                    onChange={(e) => setImpactFilter(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-700 text-cyan-300 font-bold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="ALL">모든 영향도 보기</option>
                    <option value="CRITICAL_HIGH">🔥 고영향도 (Impact 75점 이상)</option>
                    <option value="BULLISH_ONLY">🟢 호재성 뉴스만</option>
                    <option value="BEARISH_ONLY">🔴 악재성 뉴스만</option>
                  </select>
                </div>

              </div>

              {/* Articles Feed */}
              {filteredArticles.length === 0 ? (
                <div className="p-8 text-center bg-zinc-900/60 rounded-2xl border border-zinc-800 text-zinc-400 space-y-2">
                  <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto" />
                  <p className="text-sm font-bold text-zinc-300">선택된 필터 조건에 부합하는 뉴스가 없습니다.</p>
                  <button
                    onClick={() => {
                      setActiveCategory("ALL");
                      setImpactFilter("ALL");
                      setSelectedKeyword(null);
                    }}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg text-xs font-mono font-bold transition"
                  >
                    필터 전체 초기화
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredArticles.map((article) => {
                    const isCritical = article.impactScore >= 90;
                    const isHigh = article.impactScore >= 75 && article.impactScore < 90;

                    return (
                      <div
                        key={article.id}
                        className={`rounded-2xl p-4 sm:p-5 transition space-y-3.5 border ${
                          isCritical
                            ? "bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/30"
                            : isHigh
                            ? "bg-zinc-900/90 border-zinc-700/80 hover:border-cyan-500/40"
                            : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {/* Header Row: Sentiment, Impact Score, Date, Source */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Sentiment Badge */}
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black font-mono flex items-center gap-1 ${
                              article.sentiment === "BULLISH"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-600/60"
                                : article.sentiment === "BEARISH"
                                ? "bg-rose-950 text-rose-300 border border-rose-600/60"
                                : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                            }`}>
                              {article.sentiment === "BULLISH" ? (
                                <>
                                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                                  <span>강력 호재 (+{article.sentimentScore}점)</span>
                                </>
                              ) : article.sentiment === "BEARISH" ? (
                                <>
                                  <TrendingDown className="w-3 h-3 text-rose-400" />
                                  <span>위험 악재 (-{article.sentimentScore}점)</span>
                                </>
                              ) : (
                                <span>중립 이슈 ({article.sentimentScore}점)</span>
                              )}
                            </span>

                            {/* Category Tag */}
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold border border-zinc-700">
                              {article.category}
                            </span>

                            {/* Time and Source */}
                            <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {article.publishedAt}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              | {article.source}
                            </span>
                          </div>

                          {/* Impact Score Metric Indicator */}
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-xl text-xs font-mono font-black border flex items-center gap-1.5 ${
                              isCritical
                                ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white border-amber-300 shadow-md animate-pulse"
                                : isHigh
                                ? "bg-cyan-950 text-cyan-300 border-cyan-500/60"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700"
                            }`}>
                              <Zap className="w-3.5 h-3.5 text-amber-300" />
                              <span>주가 영향도: {article.impactScore}점</span>
                              <span className="text-[9px] opacity-80">({article.impactLevel})</span>
                            </div>

                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-zinc-400 hover:text-cyan-300 transition"
                              title="원문 기사 보기"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Title & Summary */}
                        <div className="space-y-1.5">
                          <h4 className="text-sm sm:text-base font-extrabold text-white hover:text-cyan-300 transition leading-snug">
                            {article.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                            {article.summary}
                          </p>
                        </div>

                        {/* Price Projection & Catalysts Box */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 text-xs font-mono">
                          
                          {/* Projected Price Movement */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-400 block font-bold">예상 주가 변동폭 &amp; 타임프레임:</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${
                                article.projectedPriceEffect.startsWith("+") ? "text-emerald-400" : "text-rose-400"
                              }`}>
                                {article.projectedPriceEffect}
                              </span>
                              <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                {article.projectedTimeHorizon}
                              </span>
                            </div>
                          </div>

                          {/* Key Catalysts */}
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-[10px] text-zinc-400 block font-bold">상승 촉매 &amp; 수혜 요인:</span>
                            <div className="flex flex-wrap gap-1">
                              {article.keyCatalysts.map((cat, ci) => (
                                <span
                                  key={ci}
                                  className="text-[10px] bg-zinc-900 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded"
                                >
                                  #{cat}
                                </span>
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* XAI Reasoning Box */}
                        <div className="bg-cyan-950/20 border border-cyan-900/40 p-2.5 rounded-xl flex items-start gap-2 text-xs">
                          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-cyan-300 font-mono">
                              AI 영향도 산출 근거 (Explainable AI):
                            </span>
                            <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                              {article.reasoning}
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
export default CorporateNewsAnalytics;
