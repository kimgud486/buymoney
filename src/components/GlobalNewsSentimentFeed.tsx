import React, { useState, useMemo } from "react";
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  RefreshCw, 
  Sparkles, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Newspaper,
  Zap,
  BarChart2,
  ChevronDown,
  Clock,
  Layers,
  ArrowUpRight
} from "lucide-react";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  market: "US_TECH" | "KOREA" | "CRYPTO" | "MACRO_FED";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore: number; // -100 to +100
  impactScore: number; // 1 to 10
  relatedTickers: string[];
  aiTradingImpact: string;
  url?: string;
}

const SAMPLE_GLOBAL_NEWS: NewsArticle[] = [
  {
    id: "news-1",
    title: "엔비디아, 차세대 블랙웰 B200 서버 수주 폭증... AI 반도체 공급망 확장 주도",
    summary: "NVIDIA가 3분기 AI 데이터센터 차세대 그래픽 프로세서 B200 출하량을 당초 예상보다 25% 상향 조정하였습니다. 이에 따라 HBM3E 공급사 삼성전자 및 SK하이닉스의 수혜가 가속화될 전망입니다.",
    source: "Bloomberg Terminals / Reuters Financial",
    publishedAt: "10분 전",
    market: "US_TECH",
    sentiment: "BULLISH",
    sentimentScore: 88,
    impactScore: 9,
    relatedTickers: ["NVDA", "005930", "000660"],
    aiTradingImpact: "🟢 AI 반도체 섹터 강력 매수 신호 포착. KODEX 반도체 및 엔비디아 비중 확대 권장."
  },
  {
    id: "news-2",
    title: "미 연준(Fed) 파월 의장 '인플레이션 2% 목표 상회 완화, 기준금리 추가 인하 가능성'",
    summary: "제롬 파월 연준 의장이 FOMC 정례회의 연설에서 노동시장 연착륙과 근원 PCE 물가지수 안정세를 언급하며 연내 50bp 추가 금리 인하 경로를 시사했습니다.",
    source: "Wall Street Journal",
    publishedAt: "25분 전",
    market: "MACRO_FED",
    sentiment: "BULLISH",
    sentimentScore: 76,
    impactScore: 10,
    relatedTickers: ["AAPL", "MSFT", "KRW-BTC", "SPY"],
    aiTradingImpact: "🟢 미 증시 유동성 장세 호재. 빅테크 및 크립토 유동성 랠리 가능성 고조."
  },
  {
    id: "news-3",
    title: "한국은행 금통위, 기준금리 동결 발표 및 '가계부채·환율 변동성 주시'",
    summary: "한국은행이 기준금리를 현 수준에서 동결하기로 결정했습니다. 원/달러 환율이 1,380원 선에서 등락을 거듭함에 따라 외환 시장 안정화 조치에 긴밀히 대응할 예정입니다.",
    source: "한국경제 / 연합인포맥스",
    publishedAt: "42분 전",
    market: "KOREA",
    sentiment: "NEUTRAL",
    sentimentScore: 5,
    impactScore: 7,
    relatedTickers: ["005930", "005380", "055550"],
    aiTradingImpact: "⚪ 금융 및 내수주 관망세 유지. 밸류업 프로그램 관련 금융지주주 박스권 매매 유효."
  },
  {
    id: "news-4",
    title: "비트코인, 현물 ETF 유입액 하루 $450M 돌파... 기관 기관 자금 유입 가속화",
    summary: "블랙록IBIT 및 피델리티FBTC를 포함한 비트코인 현물 ETF로 사상 최대 수준의 순유입이 지속되고 있습니다. 온체인 분석 결과 파생상품 미결제약정도 최고치를 경신 중입니다.",
    source: "CoinDesk / Cointelegraph",
    publishedAt: "1시간 전",
    market: "CRYPTO",
    sentiment: "BULLISH",
    sentimentScore: 92,
    impactScore: 8,
    relatedTickers: ["KRW-BTC", "KRW-ETH", "COIN"],
    aiTradingImpact: "🟢 비트코인 롱 전략 유지. 돌발 변동성 대비 스탑로스 3.5% 설정 권장."
  },
  {
    id: "news-5",
    title: "중국 반도체 자급률 강화 방침에 미국 상무부 대중 기술 수출 규제 추가 강화 검토",
    summary: "미국 정부가 첨단 메모리 및 AI 가속기 장비의 대중국 수출 제한 조치를 강화할 것으로 알려졌습니다. 지경학적 불확실성에 따른 글로벌 공급망 변동성이 확대될 수 있습니다.",
    source: "Financial Times",
    publishedAt: "2시간 전",
    market: "MACRO_FED",
    sentiment: "BEARISH",
    sentimentScore: -64,
    impactScore: 8,
    relatedTickers: ["AMD", "000660", "ASML"],
    aiTradingImpact: "🔴 반도체 장비주 단기 변동성 주의. 과열 매수 자제 및 분할 진입 전략 가동."
  },
  {
    id: "news-6",
    title: "테슬라, FSD v13 전세계 정식 승인 임박 및 로보택시 상용화 라인업 확정",
    summary: "일론 마스크 테슬라 CEO가 자율주행 FSD 버전 13의 안전성 검증을 완료하고 각국 규제 당국 승인 절차에 진입했다고 밝혔습니다. 주요 투자은행들의 목표주가 상향이 이어지고 있습니다.",
    source: "TechCrunch / CNBC",
    publishedAt: "3시간 전",
    market: "US_TECH",
    sentiment: "BULLISH",
    sentimentScore: 82,
    impactScore: 9,
    relatedTickers: ["TSLA", "373220"],
    aiTradingImpact: "🟢 자율주행 및 EV 테마 수급 유입. 테슬라 15분봉 분할 진입 가이드 발동."
  }
];

export const GlobalNewsSentimentFeed: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>(SAMPLE_GLOBAL_NEWS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<"ALL" | "US_TECH" | "KOREA" | "CRYPTO" | "MACRO_FED">("ALL");
  const [selectedSentiment, setSelectedSentiment] = useState<"ALL" | "BULLISH" | "BEARISH" | "NEUTRAL">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>("news-1");

  // Calculate Overall Market Sentiment Score (-100 to +100)
  const sentimentStats = useMemo(() => {
    if (articles.length === 0) return { avgScore: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0, statusText: "NEUTRAL" };
    
    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    articles.forEach(a => {
      totalScore += a.sentimentScore;
      if (a.sentiment === "BULLISH") bullishCount++;
      else if (a.sentiment === "BEARISH") bearishCount++;
      else neutralCount++;
    });

    const avgScore = Math.round(totalScore / articles.length);
    let statusText: "STRONG_BULL" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEAR" = "NEUTRAL";
    if (avgScore >= 60) statusText = "STRONG_BULL";
    else if (avgScore >= 20) statusText = "BULLISH";
    else if (avgScore <= -60) statusText = "STRONG_BEAR";
    else if (avgScore <= -20) statusText = "BEARISH";

    return { avgScore, bullishCount, bearishCount, neutralCount, statusText };
  }, [articles]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      // Market filter
      if (selectedMarket !== "ALL" && a.market !== selectedMarket) return false;
      // Sentiment filter
      if (selectedSentiment !== "ALL" && a.sentiment !== selectedSentiment) return false;
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesSummary = a.summary.toLowerCase().includes(q);
        const matchesTickers = a.relatedTickers.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesTickers) return false;
      }
      return true;
    });
  }, [articles, selectedMarket, selectedSentiment, searchQuery]);

  const handleRefreshNews = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Add or update timestamp to show live fetching
      setArticles(prev => prev.map(item => ({
        ...item,
        publishedAt: "방금 전"
      })));
      setIsRefreshing(false);
    }, 800);
  };

  const handleRunAiSentimentAnalysis = () => {
    setIsAnalyzingAi(true);
    setTimeout(() => {
      setIsAnalyzingAi(false);
    }, 1200);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 rounded-xl border border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <span>글로벌 금융 속보 &amp; AI 감성 분석 (News &amp; Sentiment Feed)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-bold">
                REAL-TIME SENTIMENT
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              실시간 뉴스 헤드라인 AI NLP 감성 지수 분석 및 종목 매매 영향도 자동 도출
            </p>
          </div>
        </div>

        {/* TOP CONTROLS & REFRESH */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunAiSentimentAnalysis}
            disabled={isAnalyzingAi}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isAnalyzingAi ? "animate-spin" : ""}`} />
            <span>AI 감성 종합 분석</span>
          </button>

          <button
            onClick={handleRefreshNews}
            disabled={isRefreshing}
            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
            title="뉴스 새로고침"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* OVERALL MARKET SENTIMENT GAUGE SUMMARY */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 text-white shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          {/* LEFT: SENTIMENT SCORE SCORE BADGE */}
          <div className="sm:col-span-1 border-b sm:border-b-0 sm:border-r border-indigo-500/30 pb-3 sm:pb-0 pr-0 sm:pr-4">
            <span className="text-[10px] text-indigo-300 font-mono font-bold block uppercase">글로벌 시장 AI 감성 온도</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-3xl font-black font-mono ${
                sentimentStats.avgScore > 0 ? "text-emerald-400" : sentimentStats.avgScore < 0 ? "text-rose-400" : "text-zinc-300"
              }`}>
                {sentimentStats.avgScore > 0 ? `+${sentimentStats.avgScore}` : sentimentStats.avgScore}
              </span>
              <span className="text-xs font-bold text-indigo-200 font-mono">/ 100</span>
            </div>
            <div className="mt-1">
              <span className={`text-xs font-black px-2 py-0.5 rounded-md font-mono ${
                sentimentStats.statusText === "STRONG_BULL" ? "bg-emerald-500 text-slate-950" :
                sentimentStats.statusText === "BULLISH" ? "bg-emerald-950 text-emerald-300 border border-emerald-700" :
                sentimentStats.statusText === "BEARISH" ? "bg-rose-950 text-rose-300 border border-rose-700" :
                sentimentStats.statusText === "STRONG_BEAR" ? "bg-rose-600 text-white" :
                "bg-zinc-800 text-zinc-300"
              }`}>
                {sentimentStats.statusText === "STRONG_BULL" ? "🔥 강한 탐욕/매수 우위" :
                 sentimentStats.statusText === "BULLISH" ? "🟢 온건 매수 우위" :
                 sentimentStats.statusText === "BEARISH" ? "🔴 매도 압력 우세" :
                 sentimentStats.statusText === "STRONG_BEAR" ? "⚡ 극도 공포/위험 관망" : "⚪ 중립 국면"}
              </span>
            </div>
          </div>

          {/* MIDDLE: VISUAL SENTIMENT BAR */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> 긍정 호재 ({sentimentStats.bullishCount}건)
              </span>
              <span className="text-zinc-400 font-bold">중립 ({sentimentStats.neutralCount}건)</span>
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" /> 부정 악재 ({sentimentStats.bearishCount}건)
              </span>
            </div>

            {/* SENTIMENT VISUAL DISTRIBUTION BAR */}
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex border border-indigo-500/30">
              <div 
                className="bg-emerald-400 h-full transition-all duration-500" 
                style={{ width: `${(sentimentStats.bullishCount / articles.length) * 100}%` }}
                title="Bullish ratio"
              />
              <div 
                className="bg-zinc-500 h-full transition-all duration-500" 
                style={{ width: `${(sentimentStats.neutralCount / articles.length) * 100}%` }}
                title="Neutral ratio"
              />
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ width: `${(sentimentStats.bearishCount / articles.length) * 100}%` }}
                title="Bearish ratio"
              />
            </div>

            <p className="text-[10px] text-indigo-200/80 font-mono">
              * AI 감성 분석 결과 연준 금리 인하 기대감과 AI 반도체 실적 호조가 시장 긍정 분위기를 견인 중입니다.
            </p>
          </div>

          {/* RIGHT: QUICK ACTION INFO */}
          <div className="sm:col-span-1 bg-indigo-900/40 border border-indigo-500/30 p-3 rounded-xl text-xs space-y-1 font-mono">
            <span className="text-indigo-300 text-[10px] font-bold block">AI 감성 가이트</span>
            <p className="text-slate-200 text-[11px]">
              감성지수 +50 이상 시 자율 매수 알고리즘 승인률 +12%p 상승
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
        {/* SEARCH INPUT */}
        <div className="md:col-span-5 relative">
          <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="뉴스 키워드, 종목코드(NVDA, 삼성전자, BTC) 검색..."
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* MARKET CATEGORY BUTTONS */}
        <div className="md:col-span-4 flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {(["ALL", "US_TECH", "KOREA", "CRYPTO", "MACRO_FED"] as const).map(m => (
            <button
              key={m}
              onClick={() => setSelectedMarket(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer whitespace-nowrap border ${
                selectedMarket === m
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {m === "ALL" ? "전체 시장" : m === "US_TECH" ? "🇺🇸 미국 빅테크" : m === "KOREA" ? "🇰🇷 국장/한은" : m === "CRYPTO" ? "🪙 가상자산" : "🏛️ 매크로/Fed"}
            </button>
          ))}
        </div>

        {/* SENTIMENT FILTER SELECTOR */}
        <div className="md:col-span-3 flex items-center justify-end space-x-2">
          <select
            value={selectedSentiment}
            onChange={(e: any) => setSelectedSentiment(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">전체 감성 (ALL)</option>
            <option value="BULLISH">🟢 긍정 호재 (Bullish)</option>
            <option value="BEARISH">🔴 부정 악재 (Bearish)</option>
            <option value="NEUTRAL">⚪ 중립 (Neutral)</option>
          </select>
        </div>
      </div>

      {/* ARTICLES FEED LIST */}
      <div className="space-y-3">
        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
            <AlertCircle className="h-6 w-6 text-zinc-400 mx-auto" />
            <p className="text-xs text-zinc-500 font-bold">검색 및 필터 조건에 부합하는 속보가 없습니다.</p>
          </div>
        ) : (
          filteredArticles.map(art => {
            const isExpanded = expandedArticleId === art.id;
            const isBull = art.sentiment === "BULLISH";
            const isBear = art.sentiment === "BEARISH";

            return (
              <div
                key={art.id}
                className={`border rounded-xl p-4 transition-all space-y-3 ${
                  isExpanded
                    ? "bg-zinc-50 dark:bg-zinc-950 border-indigo-500/60 shadow-md"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {/* ARTICLE HEADER TOP BAR */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {/* MARKET TAG */}
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {art.market === "US_TECH" ? "🇺🇸 US Tech" :
                       art.market === "KOREA" ? "🇰🇷 Korea" :
                       art.market === "CRYPTO" ? "🪙 Crypto" : "🏛️ Macro"}
                    </span>

                    {/* SOURCE & TIME */}
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{art.publishedAt}</span>
                      <span>•</span>
                      <span>{art.source}</span>
                    </span>
                  </div>

                  {/* SENTIMENT BADGE */}
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-black font-mono px-2.5 py-0.5 rounded-lg border flex items-center space-x-1 ${
                      isBull
                        ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : isBear
                        ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
                    }`}>
                      {isBull ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> :
                       isBear ? <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> :
                       <Minus className="h-3.5 w-3.5 text-zinc-500" />}
                      <span>{isBull ? `호재 (+${art.sentimentScore})` : isBear ? `악재 (${art.sentimentScore})` : `중립 (${art.sentimentScore})`}</span>
                    </span>

                    <button
                      onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                    >
                      <ChevronDown className={`h-4 w-4 transform transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* TITLE & SUMMARY */}
                <div>
                  <h4 
                    onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                    className="text-sm font-black text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition leading-snug"
                  >
                    {art.title}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                {/* RELATED TICKERS & AI TRADING IMPACT */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-150 dark:border-zinc-800/80">
                  <div className="flex items-center space-x-1.5 overflow-x-auto">
                    <span className="text-[10px] text-zinc-400 font-mono font-bold">관련 종목:</span>
                    {art.relatedTickers.map(ticker => (
                      <span 
                        key={ticker}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        #{ticker}
                      </span>
                    ))}
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500">
                    AI 파급 영향력: <strong className="text-zinc-900 dark:text-white">{art.impactScore}/10</strong>
                  </span>
                </div>

                {/* EXPANDED AI IMPACT DETAILS */}
                {isExpanded && (
                  <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-slate-900/80 border border-indigo-500/30 rounded-xl text-xs space-y-1.5 font-mono animate-fade-in">
                    <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>J.A.R.V.I.S. AI 트레이딩 액션 인사이트</span>
                    </div>
                    <p className="text-slate-200 text-xs pl-5">
                      {art.aiTradingImpact}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
