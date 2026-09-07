import React, { useState, useEffect } from "react";
import { 
  Search, 
  Sparkles, 
  Cpu, 
  Zap, 
  Flame, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Layers, 
  Newspaper, 
  GitBranch, 
  ShieldAlert, 
  Check, 
  Star, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  Activity, 
  Filter, 
  SlidersHorizontal, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Clock,
  PieChart,
  X,
  AlertTriangle,
  Info,
  Plus,
  BookmarkPlus,
  CheckCircle2,
  ListPlus,
  RotateCcw,
  Building2,
  Scale,
  Copy,
  CheckCheck,
  Compass,
  Gauge,
  Share2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { TickerQuoteModal } from "./TickerQuoteModal";
import { AiStockDetailModal, StockDetailData } from "./AiStockDetailModal";
import { AiStockCompareModal } from "./AiStockCompareModal";
import { 
  KeywordIntelligenceEngineResult, 
  StockIntelligenceItem, 
  NewsClusterItem, 
  ExpandedKeywordItem,
  SupplyChainStage,
  EventImpactItem,
  TrendingKeywordItem
} from "./SmartThemeSearchModal";

interface AiKeywordScannerProps {
  initialQuery?: string;
  className?: string;
}

export interface AutocompleteSuggestion {
  keyword: string;
  icon: string;
  category: string;
  momentum: string;
  stocks: string;
}

const PREDICTIVE_TREND_KEYWORDS: AutocompleteSuggestion[] = [
  { keyword: "엔비디아", icon: "🟢", category: "미국 빅테크/AI", momentum: "+340% AI가속기독점", stocks: "NVDA, TSM, AVGO, SMCI" },
  { keyword: "테슬라", icon: "🚗", category: "미국 자율주행/EV", momentum: "+280% 로보택시모멘텀", stocks: "TSLA, RIVN, LCID" },
  { keyword: "애플", icon: "🍏", category: "미국 IT온디바이스", momentum: "+210% Apple Intelligence", stocks: "AAPL, QCOM, ARM" },
  { keyword: "빅테크", icon: "🇺🇸", category: "미국 나스닥 대장", momentum: "+310% 실적호조", stocks: "MSFT, GOOGL, AMZN, META" },
  { keyword: "반도체", icon: "💻", category: "K-반도체/HBM", momentum: "+420% 수급집중", stocks: "삼성전자, SK하이닉스, 한미반도체" },
  { keyword: "바이오", icon: "🧬", category: "신약/GLP-1", momentum: "+310% 기술수출", stocks: "알테오젠, HLB, 펩트론" },
  { keyword: "방열", icon: "🌡️", category: "소재/액체냉각", momentum: "+240% 수급폭발", stocks: "GST, 케이엔솔, 유니셈, 3S, 워트" },
  { keyword: "액체냉각", icon: "❄️", category: "AI데이터센터", momentum: "+310% 기관집중", stocks: "GST, 케이엔솔, 서원, 파트론" },
  { keyword: "전고체배터리", icon: "🔋", category: "차세대배터리", momentum: "+185% 테마지수", stocks: "이수스페셜티케미컬, 한농화성, 레이크머티리얼즈" },
  { keyword: "로봇", icon: "🦾", category: "휴머노이드/AI", momentum: "+210% 수급유입", stocks: "두산로보틱스, 레인보우로보틱스, 뉴로메카, 엔젤로보틱스" },
  { keyword: "SMR", icon: "⚡", category: "소형원전/에너지", momentum: "+195% 수주호재", stocks: "두산에너빌리티, 우진엔텍, 비에이치아이, 서전기전" },
  { keyword: "AI반도체", icon: "💻", category: "HBM/초정밀", momentum: "+320% 거래량폭발", stocks: "한미반도체, SK하이닉스, 리노공업, 가온칩스" },
  { keyword: "트럼프", icon: "🏛️", category: "재건/K방산", momentum: "+160% 테마강세", stocks: "현대로템, SG, 다스코, 삼부토건" },
  { keyword: "방산", icon: "🛡️", category: "국방/수출", momentum: "+270% 외국인순매수", stocks: "한화에어로스페이스, LIG넥스원, 현대로템, 한국항공우주" },
  { keyword: "양자컴퓨터", icon: "⚛️", category: "차세대퀀트", momentum: "+140% 테마유입", stocks: "우리로, 엑스게이트, 케이씨에스, 피피아이" },
  { keyword: "비만치료제", icon: "🧬", category: "GLP-1/바이오", momentum: "+230% 신고가", stocks: "펩트론, 유한양행, 인벤티지랩, 올릭스" },
  { keyword: "자율주행", icon: "🚗", category: "FSD/스마트모빌리티", momentum: "+155% 수급유지", stocks: "퓨런티어, 스마트레이더시스템, 모트렉스, 넥스트칩" },
  { keyword: "CXL", icon: "🧠", category: "차세대메모리", momentum: "+215% 기술호재", stocks: "네오셈, 엑시콘, 퀄리타스반도체, 오파스넷" },
  { keyword: "조선", icon: "🚢", category: "LNG/기자재", momentum: "+190% 흑자전환", stocks: "HD한국조선해양, 삼성중공업, 한화오션, HD현대미포" },
  { keyword: "바이오", icon: "💊", category: "ADC/항암제", momentum: "+250% 기술수출", stocks: "알테오젠, HLB, 리가켐바이오, 에이비엘바이오" },
  { keyword: "유리기판", icon: "💎", category: "패키징/반도체", momentum: "+200% 신소재", stocks: "SKC, 필옵틱스, 와이씨켐, 제이앤티씨" },
  { keyword: "우주항공", icon: "🚀", category: "위성/누리호", momentum: "+175% 정책수혜", stocks: "한화에어로스페이스, AP위성, 켄코아아에어로스페이스" },
  { keyword: "2차전지", icon: "⚡", category: "양극재/음극재", momentum: "+130% 반등세", stocks: "에코프로, 에코프로비엠, POSCO홀딩스, LG에너지솔루션" },
  { keyword: "STO", icon: "🪙", category: "토큰증권/핀테크", momentum: "+145% 법안수혜", stocks: "갤러리아에스엠, 핑거, 서울옥션, KEC" },
  { keyword: "K-푸드", icon: "🍜", category: "음식료/수출", momentum: "+220% 실적호조", stocks: "삼양식품, 농심, 빙그레, 우양" },
  { keyword: "체코원전", icon: "🏗️", category: "원자력수출", momentum: "+280% 메이저집중", stocks: "두산에너빌리티, 대우건설, 한전기술, 한전KPS" }
];

const POPULAR_ONE_WORD_PROMPTS = [
  { keyword: "엔비디아", icon: "🟢", category: "미국주식" },
  { keyword: "테슬라", icon: "🚗", category: "미국주식" },
  { keyword: "삼성전자", icon: "🔷", category: "국내주식" },
  { keyword: "SK하이닉스", icon: "💻", category: "국내주식" },
  { keyword: "방열", icon: "🌡️", category: "소재/부품" },
  { keyword: "전고체배터리", icon: "🔋", category: "배터리/소재" },
  { keyword: "로봇", icon: "🦾", category: "자동화/AI" },
  { keyword: "SMR", icon: "⚡", category: "원전/에너지" },
  { keyword: "AI반도체", icon: "💻", category: "반도체" },
  { keyword: "트럼프", icon: "🏛️", category: "정치/정책" },
  { keyword: "방산", icon: "🛡️", category: "방위산업" },
  { keyword: "양자컴퓨터", icon: "⚛️", category: "차세대IT" }
];

export const AiKeywordScanner: React.FC<AiKeywordScannerProps> = ({
  initialQuery = "",
  className = ""
}) => {
  const { addToWatchlist, isInWatchlist, setSelectedSymbol, addToast, openStockChart } = useApp();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeQueryName, setActiveQueryName] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<KeywordIntelligenceEngineResult | null>(null);
  const [expandedStockSymbol, setExpandedStockSymbol] = useState<string | null>(null);

  // User Custom Saved Keywords State
  const [customSavedKeywords, setCustomSavedKeywords] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("aistock_user_saved_keywords");
      return saved ? JSON.parse(saved) : ["우주", "초전도체", "양자", "바이오"];
    } catch (e) {
      return ["우주", "초전도체", "양자", "바이오"];
    }
  });

  // Predictive Autocomplete State
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);

  // Stock Detail Modal State
  const [selectedDetailStock, setSelectedDetailStock] = useState<StockDetailData | null>(null);

  // Filters & Sorting
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [capFilter, setCapFilter] = useState<"ALL" | "LARGE" | "MID" | "SMALL" | "MID_SMALL">("ALL");
  const [volatilityFilter, setVolatilityFilter] = useState<"ALL" | "HIGH_VOL" | "STABLE">("ALL");
  const [signalFilter, setSignalFilter] = useState<"ALL" | "BUY_SIGNAL" | "STRONG_BUY">("ALL");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "LEADER" | "SURGE">("ALL");
  const [stockSearchQuery, setStockSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"AI_SCORE" | "RELATED_SCORE" | "GAIN" | "VOLUME_RATIO" | "FLOW">("AI_SCORE");
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);

  // Calculate active filter count for badge
  const activeFilterCount = (marketFilter !== "ALL" ? 1 : 0) + 
                            (capFilter !== "ALL" ? 1 : 0) + 
                            (volatilityFilter !== "ALL" ? 1 : 0) + 
                            (signalFilter !== "ALL" ? 1 : 0) + 
                            (roleFilter !== "ALL" ? 1 : 0) + 
                            (stockSearchQuery.trim() !== "" ? 1 : 0);

  const handleResetFilters = () => {
    setMarketFilter("ALL");
    setCapFilter("ALL");
    setVolatilityFilter("ALL");
    setSignalFilter("ALL");
    setRoleFilter("ALL");
    setStockSearchQuery("");
  };

  // Chart Modal
  const [quoteModalSymbol, setQuoteModalSymbol] = useState<string | null>(null);
  const [selectedStockForChart, setSelectedStockForChart] = useState<any>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Multi-Stock Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isBriefingCopied, setIsBriefingCopied] = useState(false);

  // Pipeline Step State for Loading Visualizer
  const [pipelineStep, setPipelineStep] = useState<number>(1);

  const runAnalysisPipeline = async (queryToSearch: string) => {
    let trimmed = queryToSearch.trim();
    if (!trimmed) return;

    // Gracefully handle common typos like "업빋트", "업빝", "upbit"
    const lower = trimmed.toLowerCase();
    if (lower === "업빋트" || lower === "업빝" || lower === "upbit") {
      trimmed = "업비트";
      setSearchQuery("업비트");
      addToast({
        type: "INFO",
        title: "🪙 업비트(Upbit) 가상자산 검색",
        message: "업비트 원화마켓 실시간 가상자산 시세 및 AI 퀀트 리포트를 분석합니다."
      });
    }

    setIsLoading(true);
    setActiveQueryName(trimmed);
    setPipelineStep(1);

    // Simulate pipeline steps animation for user experience
    const interval = setInterval(() => {
      setPipelineStep(prev => (prev < 5 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch(`/api/search/theme?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await res.json();
          if (json && typeof json === "object") {
            setAnalysisData(json);
          }
        } else {
          console.warn("Theme search response is not JSON");
        }
      } else {
        console.error("Theme search HTTP error:", res.status);
      }
    } catch (err) {
      console.error("AI Keyword Scanner pipeline failed", err);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      runAnalysisPipeline(initialQuery);
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAutocomplete(false);
    if (searchQuery.trim()) {
      runAnalysisPipeline(searchQuery);
    }
  };

  // Add current query to user's custom saved keywords
  const handleSaveCustomKeyword = (kw: string) => {
    const clean = kw.trim();
    if (!clean) return;
    if (customSavedKeywords.includes(clean)) {
      addToast({
        type: "INFO",
        title: "알림",
        message: `'${clean}' 키워드는 이미 맞춤 키워드로 등록되어 있습니다.`
      });
      return;
    }
    const updated = [clean, ...customSavedKeywords.slice(0, 9)];
    setCustomSavedKeywords(updated);
    localStorage.setItem("aistock_user_saved_keywords", JSON.stringify(updated));
    addToast({
      type: "SUCCESS",
      title: "✨ 맞춤 키워드 등록 완료",
      message: `'${clean}' 키워드가 나의 전용 스캔 키워드로 추가되었습니다.`
    });
  };

  const handleRemoveCustomKeyword = (kw: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customSavedKeywords.filter(k => k !== kw);
    setCustomSavedKeywords(updated);
    localStorage.setItem("aistock_user_saved_keywords", JSON.stringify(updated));
  };

  // Compute predictive autocomplete recommendations
  const filteredSuggestions = searchQuery.trim()
    ? PREDICTIVE_TREND_KEYWORDS.filter(item =>
        item.keyword.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.stocks.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : PREDICTIVE_TREND_KEYWORDS.slice(0, 8);

  const handleSelectAutocomplete = (keyword: string) => {
    setSearchQuery(keyword);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    runAnalysisPipeline(keyword);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete) return;

    const totalItems = filteredSuggestions.length + 1; // +1 for top custom search option

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAutocompleteIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAutocompleteIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      if (autocompleteIndex === 0 && searchQuery.trim()) {
        e.preventDefault();
        handleSelectAutocomplete(searchQuery.trim());
      } else if (autocompleteIndex > 0 && autocompleteIndex <= filteredSuggestions.length) {
        e.preventDefault();
        handleSelectAutocomplete(filteredSuggestions[autocompleteIndex - 1].keyword);
      }
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
    }
  };

  const handlePromptClick = (keyword: string) => {
    setSearchQuery(keyword);
    runAnalysisPipeline(keyword);
  };

  const handleStockCardClick = (stock: any) => {
    setSelectedDetailStock(stock);
  };

  // Single Stock Watchlist/Target Add
  const handleRegisterSingleStock = async (stock: StockIntelligenceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const marketType = stock.market === "UPBIT" || stock.market === "BTC" ? "BTC" : stock.market === "NASDAQ" || stock.market === "NYSE" ? "US" : "KOREA";
    
    await addToWatchlist({
      symbol: stock.symbol,
      name: stock.name,
      market: marketType,
      targetBuyPrice: stock.price || 1000,
      memo: `'${activeQueryName}' AI 키워드 스캐너 등록`
    });

    if (setSelectedSymbol) {
      setSelectedSymbol(stock.symbol);
    }

    addToast({
      type: "SUCCESS",
      title: "🎯 분석/관측 타깃 등록 완료",
      message: `${stock.name}(${stock.symbol}) 종목이 관심 대시보드 및 AI 분석 타깃으로 성공적으로 등록되었습니다.`
    });
  };

  // Register ALL discovered stocks in filtered list to Watchlist/Target
  const handleRegisterAllResults = async () => {
    if (!filteredStocks || filteredStocks.length === 0) return;
    let addedCount = 0;

    for (const stock of filteredStocks) {
      if (!isInWatchlist(stock.symbol)) {
        const marketType = stock.market === "UPBIT" || stock.market === "BTC" ? "BTC" : stock.market === "NASDAQ" || stock.market === "NYSE" ? "US" : "KOREA";
        await addToWatchlist({
          symbol: stock.symbol,
          name: stock.name,
          market: marketType,
          targetBuyPrice: stock.price || 1000,
          memo: `'${activeQueryName}' AI 키워드 스캐너 일괄 등록`
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      addToast({
        type: "SUCCESS",
        title: "🚀 분석 대상 종목 일괄 등록 완료",
        message: `'${activeQueryName}' 키워드 스캔 결과 ${addedCount}개 종목이 관측/분석 타깃으로 성공적으로 추가되었습니다.`
      });
    } else {
      addToast({
        type: "INFO",
        title: "등록 확인",
        message: "검색 결과의 모든 종목이 이미 관측/분석 타깃에 등록되어 있습니다."
      });
    }
  };

  const toggleSelectForCompare = (stock: StockIntelligenceItem, e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    if (selectedForCompare.includes(stock.symbol)) {
      setSelectedForCompare(prev => prev.filter(s => s !== stock.symbol));
      addToast({
        type: "INFO",
        title: "비교 목록 해제",
        message: `${stock.name}(${stock.symbol}) 종목이 비교 목록에서 제외되었습니다.`
      });
    } else {
      if (selectedForCompare.length >= 4) {
        addToast({
          type: "WARNING",
          title: "비교 종목 제한",
          message: "최대 4개 종목까지 동시에 다차원 퀀트 비교가 가능합니다."
        });
        return;
      }
      setSelectedForCompare(prev => [...prev, stock.symbol]);
      addToast({
        type: "SUCCESS",
        title: "⚖️ 비교 목록 추가",
        message: `${stock.name}(${stock.symbol}) 종목이 다차원 비교 목록에 추가되었습니다. (현재 ${selectedForCompare.length + 1}개)`
      });
    }
  };

  const handleRemoveFromCompare = (symbol: string) => {
    setSelectedForCompare(prev => prev.filter(s => s !== symbol));
  };

  const handleCopyAiBriefing = () => {
    if (!analysisData) return;

    const top5 = (filteredStocks || []).slice(0, 5);
    const briefingText = `[AI Keyword Stock Intelligence Briefing]
══════════════════════════════════════════
🔍 분석 키워드: ${activeQueryName}
🏷️ 대표 테마: ${analysisData.themeTitle || activeQueryName}
⚡ 테마 파워: ${analysisData.theme?.score || 88}/100 (${analysisData.theme?.power_label || "매우 강함"})
🌱 생명주기: ${analysisData.theme?.stage_label_ko || "확산 단계"} (${analysisData.theme?.stage || "EXPANSION"})
📝 테마 요약: ${analysisData.themeDescription || ""}

🏆 AI 종합 랭킹 TOP ${top5.length}
${top5.map((s, i) => `${i + 1}. ${s.name} (${s.symbol} | ${s.market})
   • AI Score: ${s.ai_score}점 (${s.ai_grade}등급) | 관련도: ${s.related_score}점 (${s.related_grade})
   • 현재가: ${s.price?.toLocaleString()}원 (${(s.changePct || 0) >= 0 ? "+" : ""}${s.changePct?.toFixed(2)}%)
   • 거래량: ${s.volume_ratio}X 폭발 | 수급: ${s.investor_flow?.foreigner || "순매수"}
   • 타깃: 1차 ${s.trading_targets?.target1 || "신고가 돌파"} / 손절 ${s.trading_targets?.stopLoss || "지지선 이탈시"}
   • 핵심 사유: ${s.ai_summary || s.reasons?.[0] || ""}`).join("\n\n")}

💡 AI 매매 전략 권고:
${analysisData.marketDemandReport?.aiStrategyTip || "선도 대장주 눌림목 분할 매수 및 2차 수혜주 순환매 대응"}
══════════════════════════════════════════
발행: Unified OmniBrain AI Stock Scanner`;

    navigator.clipboard.writeText(briefingText);
    setIsBriefingCopied(true);
    setTimeout(() => setIsBriefingCopied(false), 3000);

    addToast({
      type: "SUCCESS",
      title: "📋 AI 브리핑 복사 완료",
      message: `'${activeQueryName}' AI 인텔리전스 브리핑 리포트가 클립보드에 복사되었습니다.`
    });
  };

  const handleOpenChart = (stockOrSymbol: any, e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();

    let stockItem: any = null;

    if (typeof stockOrSymbol === "object" && stockOrSymbol !== null) {
      stockItem = stockOrSymbol;
    } else if (typeof stockOrSymbol === "string") {
      stockItem = rawStocks.find(s => s.symbol === stockOrSymbol || s.name === stockOrSymbol);
      if (!stockItem && selectedDetailStock && (selectedDetailStock.symbol === stockOrSymbol || selectedDetailStock.name === stockOrSymbol)) {
        stockItem = {
          symbol: selectedDetailStock.symbol,
          name: selectedDetailStock.name,
          market: selectedDetailStock.market,
          price: selectedDetailStock.price,
          changePct: selectedDetailStock.changePct
        };
      }
    }

    const sym = stockItem?.symbol || (typeof stockOrSymbol === "string" ? stockOrSymbol : "005930");
    const nameVal = stockItem?.name || sym;
    const marketVal = stockItem?.market === "UPBIT" ? "BTC" : stockItem?.market === "NASDAQ" || stockItem?.market === "NYSE" ? "US" : "KOREA";
    const priceVal = stockItem?.price || 50000;
    const changeVal = stockItem?.changePct || 0;

    setSelectedStockForChart({
      symbol: sym,
      name: nameVal,
      market: marketVal,
      price: priceVal,
      changePct: changeVal
    });

    if (openStockChart) {
      openStockChart({
        symbol: sym,
        name: nameVal,
        market: marketVal,
        currentPrice: priceVal,
        changeRate: changeVal,
        volumePower: 108.5
      });
    } else {
      setQuoteModalSymbol(sym);
      setIsQuoteModalOpen(true);
    }
  };

  // Stock list formatting and sorting
  const rawStocks: StockIntelligenceItem[] = analysisData?.stocks || (analysisData?.relatedStocks || []).map((s: any) => ({
    symbol: s.symbol,
    name: s.name,
    market: s.market,
    price: s.price || 50000,
    changePct: s.changePct || 0,
    related_score: 85,
    related_grade: s.tag || "관련주",
    level: "Level 1",
    reasons: [s.relevanceReason],
    volume_ratio: 2.5,
    ai_score: 82,
    ai_grade: "A",
    ai_summary: s.relevanceReason
  }));

  const getCapCategory = (st: StockIntelligenceItem): "LARGE" | "MID" | "SMALL" => {
    // 1. Direct field from API
    const cg = (st as any).capGroup || (st as any).cap_group;
    if (cg) {
      const upper = String(cg).toUpperCase();
      if (upper === "LARGE" || upper === "MID" || upper === "SMALL") return upper as any;
    }
    const cgKo = (st as any).capGroupKo || (st as any).cap_group_ko;
    if (cgKo) {
      if (String(cgKo).includes("대형")) return "LARGE";
      if (String(cgKo).includes("중형")) return "MID";
      if (String(cgKo).includes("소형")) return "SMALL";
    }

    // 2. Known Large Cap Masters
    const largeNames = [
      '삼성전자', 'SK하이닉스', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META',
      'POSCO홀딩스', 'LG에너지솔루션', '현대차', 'NAVER', '카카오', '두산에너빌리티',
      '한화에어로스페이스', 'HD한국조선해양', '삼성바이오로직스', '셀트리온', '기아', 'KB금융',
      '신한지주', 'LG화학', '삼성SDI', '포스코퓨처엠', '크래프톤', 'HD현대일렉트릭',
      'BTC', 'ETH', 'SOL', 'XRP', '비트코인', '이더리움', '솔라나', '리플'
    ];
    if (largeNames.includes(st.name) || largeNames.includes(st.symbol)) return "LARGE";

    // 3. Known Mid Cap Masters
    const midNames = [
      '한미반도체', '가온칩스', '리노공업', '테크윙', '에코프로비엠', '에코프로', '엘앤에프',
      '이수스페셜티케미컬', '알테오젠', '유한양행', '펩트론', '리가켐바이오', 'HLB', 'HL만도',
      '현대로템', 'LIG넥스원', '한국항공우주', '엔씨소프트', 'HMM', '풍산', '하이브', '실리콘투',
      '삼양식품', '농심', '효성중공업', 'LS일렉트릭', '레인보우로보틱스', '두산로보틱스', 'GST', 'PLTR', 'COIN',
      'DOGE', 'SUI', 'ADA', 'AVAX', 'LINK', 'SHIB', 'NEAR', 'APT', 'BCH', 'ETC',
      '도지코인', '수이', '에이다', '아발란체', '체인링크', '시바이누', '니어프로토콜', '앱토스'
    ];
    if (midNames.includes(st.name) || midNames.includes(st.symbol)) return "MID";

    // 4. Known Small Cap Masters
    const smallNames = [
      '서원', '케이엔솔', '3S', '유니셈', '워트', '우진엔텍', '비에이치아이', '뉴로메카', '엔젤로보틱스',
      '신화콘텍', '아모텍', '파트론', '오픈엣지테크놀로지', '필옵틱스',
      'STX', 'SAND', 'PEPE', 'SEI', 'XLM', '스택스', '샌드박스', '페페', '세이', '스텔라루멘'
    ];
    if (smallNames.includes(st.name) || smallNames.includes(st.symbol)) return "SMALL";

    // 5. Fallback Heuristics based on Price & Market
    if (st.market === "KOSPI" || st.market === "NASDAQ" || st.market === "NYSE") {
      if (st.price >= 100000 || st.level === "대장주" || st.related_grade === "대장주") {
        return "LARGE";
      }
      return "MID";
    }

    if (st.market === "KOSDAQ") {
      if (st.ai_score >= 88 || st.price >= 40000) {
        return "MID";
      }
      return "SMALL";
    }

    return "MID";
  };

  const isLargeCapStock = (st: StockIntelligenceItem) => {
    return getCapCategory(st) === "LARGE";
  };

  const filteredStocks = rawStocks.filter(st => {
    // 1. Market Filter
    if (marketFilter === "KOREA" && !(st.market === "KOSPI" || st.market === "KOSDAQ")) return false;
    if (marketFilter === "US" && !(st.market === "NASDAQ" || st.market === "NYSE")) return false;
    if (marketFilter === "BTC" && !(st.market === "UPBIT" || st.market === "BTC")) return false;

    // 2. Cap Filter (대형주 / 중형주 / 소형주 / 중소형주)
    const capCat = getCapCategory(st);
    if (capFilter === "LARGE" && capCat !== "LARGE") return false;
    if (capFilter === "MID" && capCat !== "MID") return false;
    if (capFilter === "SMALL" && capCat !== "SMALL") return false;
    if (capFilter === "MID_SMALL" && capCat === "LARGE") return false;

    // 3. Volatility Filter (변동성 높은 종목)
    const volVal = Math.abs(st.changePct || 0);
    const volRatio = st.volume_ratio || 0;
    if (volatilityFilter === "HIGH_VOL" && !(volVal >= 3.0 || volRatio >= 2.5)) return false;
    if (volatilityFilter === "STABLE" && (volVal >= 3.0 || volRatio >= 2.5)) return false;

    // 4. AI Signal Filter (AI 매수 신호 발생 종목)
    const isBuySignal = st.ai_score >= 80 || st.ai_grade === "A" || st.ai_grade === "S" || st.investor_flow?.foreigner === "순매수";
    const isStrongBuy = st.ai_score >= 88 || st.ai_grade === "S";
    if (signalFilter === "BUY_SIGNAL" && !isBuySignal) return false;
    if (signalFilter === "STRONG_BUY" && !isStrongBuy) return false;

    // 5. Role Filter (대장주 / 거래량 급증)
    if (roleFilter === "LEADER" && !(st.level === "대장주" || st.related_grade === "대장주" || st.related_score >= 88)) return false;
    if (roleFilter === "SURGE" && !(st.volume_ratio >= 2.0)) return false;

    // 6. In-result Stock Search Filter
    if (stockSearchQuery.trim()) {
      const q = stockSearchQuery.trim().toLowerCase();
      const matchName = st.name.toLowerCase().includes(q);
      const matchSymbol = st.symbol.toLowerCase().includes(q);
      const matchMarket = st.market.toLowerCase().includes(q);
      const matchReason = st.reasons?.some(r => r.toLowerCase().includes(q));
      if (!matchName && !matchSymbol && !matchMarket && !matchReason) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === "AI_SCORE") return b.ai_score - a.ai_score;
    if (sortBy === "RELATED_SCORE") return b.related_score - a.related_score;
    if (sortBy === "GAIN") return (b.changePct || 0) - (a.changePct || 0);
    if (sortBy === "VOLUME_RATIO") return b.volume_ratio - a.volume_ratio;
    if (sortBy === "FLOW") return (b.investor_flow?.flow_score || 0) - (a.investor_flow?.flow_score || 0);
    return 0;
  });

  const newsList: NewsClusterItem[] = analysisData?.news || (analysisData?.latestNews || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    published_at: n.time || "방금 전",
    source: n.source || "증권뉴스",
    url: "#",
    summary: n.snippet,
    sentiment: n.sentiment === "positive" ? "긍정" : n.sentiment === "negative" ? "부정" : "중립",
    sentiment_val: n.sentiment === "positive" ? 1 : n.sentiment === "negative" ? -1 : 0,
    reliability_type: "FACT",
    source_reliability_score: 90,
    impact_stock: n.impactStock || ""
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* SECTION HEADER & LARGE CENTERED SEARCH HERO CARD */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          {/* Top Engine Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-wider shadow-lg">
            <Cpu className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>AI FREE-WORD STOCK INTELLIGENCE SCANNER</span>
            <span className="px-1.5 py-0.2 bg-cyan-500/30 text-[10px] font-mono rounded text-cyan-200">v50.0</span>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              한 단어로 시작하는 <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">AI 주식 인텔리전스 스캐너</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              정해진 키워드에 제한되지 않고 원하는 <strong className="text-cyan-300">모든 한 단어/자유 키워드</strong>를 입력하세요. 50단계 AI 리서치 파이프라인이 수급, 팩트 뉴스, 관련 상장사 랭킹을 탐색하여 전체 분석 대상 종목으로 일괄 등록할 수 있습니다.
            </p>
          </div>

          {/* LARGE CENTERED INPUT FORM WITH PREDICTIVE AUTOCOMPLETE */}
          <form 
            onSubmit={handleFormSubmit} 
            className="relative max-w-2xl mx-auto z-30"
          >
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden border border-zinc-700/80 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/30 transition bg-zinc-950">
              <Search className="absolute left-4 h-5 w-5 text-cyan-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAutocomplete(true);
                  setAutocompleteIndex(-1);
                }}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => {
                  setTimeout(() => setShowAutocomplete(false), 200);
                }}
                onKeyDown={handleKeyDown}
                placeholder="원하는 모든 자유 단어 입력 (예: 업비트, 비트코인, 솔라나, 방열, HBM, 로봇, 삼성전자)..."
                className="w-full bg-transparent pl-12 pr-36 py-4 text-sm sm:text-base font-extrabold text-white placeholder-zinc-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowAutocomplete(false);
                  }}
                  className="absolute right-32 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-300" />
                )}
                <span>50단계 AI 분석</span>
              </button>
            </div>

            {/* PREDICTIVE AUTOCOMPLETE DROPDOWN */}
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl divide-y divide-zinc-800/80 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                {/* Always visible top custom query option */}
                {searchQuery.trim() !== "" && (
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectAutocomplete(searchQuery.trim());
                    }}
                    className={`p-3 sm:px-4 flex items-center justify-between transition cursor-pointer border-b border-cyan-900/60 ${
                      autocompleteIndex === 0
                        ? "bg-cyan-900/90 text-white font-black"
                        : "bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                      <div>
                        <div className="font-extrabold text-sm flex items-center gap-1.5">
                          <span>'{searchQuery.trim()}'</span>
                          <span className="text-[10px] px-2 py-0.5 bg-cyan-900 text-cyan-200 rounded font-mono">
                            신규 자유 AI 스캔
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">정해진 목록에 없는 모든 단어를 AI 리서치 엔진으로 즉시 스캔합니다.</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-1 rounded border border-cyan-800">
                      Enter 스캔 ↵
                    </span>
                  </div>
                )}

                <div className="p-2 bg-zinc-900/90 px-3 flex items-center justify-between text-[11px] font-bold text-cyan-400 border-b border-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    AI 시장 트렌드 키워드 가이드
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px]">↑↓ 이동 · Enter 선택</span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-900/80 no-scrollbar">
                  {filteredSuggestions.map((item, index) => {
                    const isSelected = (autocompleteIndex - (searchQuery.trim() ? 1 : 0)) === index;
                    return (
                      <div
                        key={item.keyword}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectAutocomplete(item.keyword);
                        }}
                        className={`p-3 sm:px-4 flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? "bg-cyan-950/90 border-l-4 border-cyan-400 text-white"
                            : "hover:bg-zinc-900/90 text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl shrink-0 p-1 bg-zinc-900 rounded-lg border border-zinc-800">{item.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-white hover:text-cyan-300 transition">
                                {item.keyword}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-cyan-300 border border-zinc-800">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                              <span className="text-zinc-500 font-medium">연동 대장주:</span>
                              <strong className="text-zinc-300 font-bold">{item.stocks}</strong>
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-mono">
                          <span className="text-xs font-black text-rose-400 bg-rose-950/50 px-2.5 py-1 rounded-lg border border-rose-800/40 inline-flex items-center gap-1 shadow-xs">
                            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                            {item.momentum}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>

          {/* QUICK PROMPT SUGGESTION CHIPS & USER SAVED KEYWORDS */}
          <div className="space-y-3">
            {/* User Custom Saved Scan Keywords */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-xs font-black text-cyan-400 flex items-center gap-1 mr-1">
                <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" /> 나의 맞춤 스캔 키워드:
              </span>
              {customSavedKeywords.map((kw) => (
                <div
                  key={kw}
                  onClick={() => handlePromptClick(kw)}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm group ${
                    activeQueryName.trim() === kw
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-black"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900"
                  }`}
                >
                  <span>✨ {kw}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCustomKeyword(kw, e)}
                    className="text-zinc-500 hover:text-rose-400 p-0.5 transition rounded-full hover:bg-zinc-800"
                    title="맞춤 키워드 삭제"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {searchQuery.trim() && !customSavedKeywords.includes(searchQuery.trim()) && (
                <button
                  onClick={() => handleSaveCustomKeyword(searchQuery.trim())}
                  className="px-3 py-1 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>'{searchQuery.trim()}' 키워드로 저장</span>
                </button>
              )}
            </div>

            {/* AI Preset Prompt Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1 mr-1">
                <Zap className="h-3.5 w-3.5 fill-amber-400" /> 추천 대표 키워드:
              </span>
              {POPULAR_ONE_WORD_PROMPTS.map((item) => (
                <button
                  key={item.keyword}
                  onClick={() => handlePromptClick(item.keyword)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm ${
                    activeQueryName.trim() === item.keyword
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-black shadow-cyan-500/10"
                      : "bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.keyword}</span>
                </button>
              ))}
            </div>

            {/* AI SECTOR THEME CATEGORY QUICK SELECTOR */}
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
              <span className="text-[11px] font-bold text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> 섹터 테마:
              </span>
              {[
                { name: "전체", kw: "AI반도체" },
                { name: "⚡ AI·반도체", kw: "HBM" },
                { name: "🔋 2차전지", kw: "전고체" },
                { name: "🤖 로봇·자동화", kw: "휴머노이드" },
                { name: "🧬 바이오·헬스", kw: "비만치료제" },
                { name: "🛡️ K-방산·우주", kw: "방산" },
                { name: "⚛️ SMR·원전", kw: "원전" },
                { name: "💎 유리기판·소재", kw: "유리기판" },
                { name: "🍜 K-푸드·소비재", kw: "K푸드" },
                { name: "🇺🇸 미국 테크·빅테크", kw: "빅테크" }
              ].map((sec) => (
                <button
                  key={sec.name}
                  onClick={() => handlePromptClick(sec.kw)}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    activeQueryName.trim() === sec.kw
                      ? "bg-cyan-500 text-black border-cyan-400 font-black shadow-md shadow-cyan-500/20"
                      : "bg-zinc-950/80 text-zinc-300 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          </div>

          {/* REALTIME AI TRENDING TICKER BANNER */}
          {analysisData?.trending_keywords && analysisData.trending_keywords.length > 0 && (
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-center gap-3 overflow-x-auto text-xs no-scrollbar">
              <span className="text-rose-400 font-black shrink-0 flex items-center gap-1">
                <Flame className="h-4 w-4 text-rose-500 animate-bounce" /> AI 실시간 급상승 키워드:
              </span>
              <div className="flex items-center space-x-4 shrink-0 font-mono">
                {analysisData.trending_keywords.map((tk, idx) => (
                  <button
                    key={tk.keyword}
                    onClick={() => handlePromptClick(tk.keyword)}
                    className="hover:text-cyan-300 transition flex items-center space-x-1 shrink-0 group cursor-pointer"
                  >
                    <span className="text-zinc-500 font-bold">{idx + 1}.</span>
                    <span className="text-zinc-200 group-hover:underline font-sans font-bold">{tk.keyword}</span>
                    <span className="text-rose-400 font-bold">+{tk.increase_pct}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PIPELINE LOADING STATE */}
      {isLoading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-6 shadow-xl animate-fade-in">
          <div className="relative w-16 h-16 mx-auto">
            <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin" />
            <Sparkles className="w-8 h-8 text-amber-400 absolute top-0 right-0 animate-ping" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-white">
              '{activeQueryName}' 50단계 AI 인텔리전스 분석 파이프라인 가동 중...
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              의미 구조 분석 → 다계층 키워드 확장 → 뉴스 감성 클러스터링 → 수급/차트 패턴 → AI Score 종합 랭킹
            </p>
          </div>

          {/* PIPELINE STEP INDICATOR */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-3xl mx-auto pt-2">
            {[
              { step: 1, title: "1. 의미 분류", desc: "주제 및 산업 분류" },
              { step: 2, title: "2. 키워드 확장", desc: "연관/공급망 가중치" },
              { step: 3, title: "3. 뉴스 검증", desc: "팩트/감성 클러스터" },
              { step: 4, title: "4. 수급/차트", desc: "거래량 폭발 스캔" },
              { step: 5, title: "5. AI Score", desc: "종목 랭킹 산출" }
            ].map((s) => (
              <div
                key={s.step}
                className={`p-2.5 rounded-xl border text-left transition ${
                  pipelineStep >= s.step
                    ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/50 shadow-md"
                    : "bg-zinc-950/50 text-zinc-600 border-zinc-800"
                }`}
              >
                <span className="text-[10px] font-mono font-black block">{s.title}</span>
                <span className="text-[9px] block text-zinc-400">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : analysisData ? (
        <div className="space-y-6 animate-fade-in">
          {/* CARD 1: AI QUERY UNDERSTANDING & THEME POWER OVERVIEW */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950/70 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                    <Target className="h-3 w-3" /> AI Query Intelligence
                  </span>
                  {analysisData.query_understanding?.classification && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {analysisData.query_understanding.classification}
                    </span>
                  )}
                  {/* Executive Briefing Copy Action */}
                  <button
                    onClick={handleCopyAiBriefing}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 flex items-center gap-1 transition cursor-pointer"
                    title="전체 리서치 요약 리포트 클립보드 복사"
                  >
                    {isBriefingCopied ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-cyan-400" />
                        <span>AI 브리핑 복사</span>
                      </>
                    )}
                  </button>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{analysisData.themeTitle}</h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">{analysisData.themeDescription}</p>
              </div>

              {/* Theme Power Gauge & Lifecycle Badge */}
              <div className="bg-zinc-950/90 p-4 rounded-xl border border-cyan-500/40 shrink-0 grid grid-cols-2 gap-4">
                <div className="border-r border-zinc-800 pr-4">
                  <span className="text-[10px] font-bold text-zinc-400 block">테마 파워 (Power)</span>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className="text-2xl font-mono font-black text-cyan-400">{analysisData.theme?.score || 88}</span>
                    <span className="text-xs text-zinc-500">/100</span>
                  </div>
                  <span className="text-xs font-black text-amber-400 block mt-0.5">{analysisData.theme?.power_label || "🔥 매우강함"}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block">테마 생명주기 (Lifecycle)</span>
                  <span className="text-sm font-black text-rose-400 block mt-1">{analysisData.theme?.stage || "EXPANSION"}</span>
                  <span className="text-[10px] text-zinc-300 block">{analysisData.theme?.stage_label_ko || "확산 단계"}</span>
                </div>
              </div>
            </div>

            {/* AI 5-FACTOR QUANT RADAR & LIFECYCLE PROGRESS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
              {/* Radar Factors */}
              <div className="lg:col-span-2 bg-zinc-950/85 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Gauge className="w-4 h-4" /> AI 5대 퀀트 팩터 진단 (Multi-Factor Radar)
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">실시간 데이터 융합</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                  {(() => {
                    const radar = analysisData.radar_metrics || {
                      relevance_score: analysisData.stocks?.[0]?.related_score || 92,
                      institutional_flow: analysisData.marketDemandReport?.institutionalInflowScore || 88,
                      news_momentum: 86,
                      chart_breakout: 84,
                      valuation_safety: 78
                    };

                    const factors = [
                      { label: "키워드 연관도", val: radar.relevance_score, icon: "🎯", color: "text-cyan-400" },
                      { label: "메이저 수급", val: radar.institutional_flow, icon: "🐋", color: "text-emerald-400" },
                      { label: "뉴스 파급력", val: radar.news_momentum, icon: "📰", color: "text-amber-400" },
                      { label: "차트 돌파강도", val: radar.chart_breakout, icon: "📈", color: "text-rose-400" },
                      { label: "안전마진 지수", val: radar.valuation_safety, icon: "🛡️", color: "text-purple-400" }
                    ];

                    return factors.map((f, i) => (
                      <div key={i} className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-sans block truncate">{f.icon} {f.label}</span>
                        <span className={`text-base font-black ${f.color} block`}>{f.val}점</span>
                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full rounded-full"
                            style={{ width: `${Math.min(100, f.val)}%` }}
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Lifecycle Stage Visual Stepper */}
              <div className="bg-zinc-950/85 p-4 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" /> 테마 확산 사이클
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">STAGE</span>
                </div>

                {/* Stepper Stages */}
                <div className="space-y-1.5 text-[11px]">
                  {[
                    { id: "DISCOVERY", name: "1. 태동기 (Discovery)", desc: "소수 선도주 급등" },
                    { id: "ACCELERATION", name: "2. 가속기 (Acceleration)", desc: "기관 수급 집중 유입" },
                    { id: "EXPANSION", name: "3. 확산기 (Expansion)", desc: "중소형 밸류체인 확산" },
                    { id: "MATURITY", name: "4. 성숙기 (Maturity)", desc: "실적 차별화 장세" }
                  ].map((stg) => {
                    const currentStg = analysisData.theme?.stage || "EXPANSION";
                    const isCurrent = currentStg === stg.id || (currentStg === "EXPANSION" && stg.id === "EXPANSION");

                    return (
                      <div
                        key={stg.id}
                        className={`p-1.5 px-2.5 rounded-lg border flex items-center justify-between transition ${
                          isCurrent
                            ? "bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold"
                            : "bg-zinc-900/40 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        <span>{stg.name}</span>
                        <span className="text-[9px] opacity-80">{stg.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* EXPANDED KEYWORDS MATRIX */}
            {analysisData.query_understanding && (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4" /> AI 연관 키워드 다계층 확장 메트릭스 (Keyword Expansion)
                  </h3>
                  <span className="text-[10px] text-zinc-400">태그 클릭 시 즉시 스캔</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block">카테고리 & 핵심 주제:</span>
                    <p className="font-extrabold text-white text-sm">{analysisData.query_understanding.category}</p>
                    <p className="text-zinc-300 text-xs mt-0.5">📌 {analysisData.query_understanding.core_topic}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {analysisData.query_understanding.market_impact.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => handlePromptClick(tag)}
                          className="px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded text-[10px] border border-cyan-800 transition cursor-pointer"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expanded Keywords Chips */}
                  <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 space-y-2">
                    <span className="text-[10px] font-bold text-zinc-400 block">연관 키워드 가중치:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysisData.expanded_keywords || []).map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePromptClick(item.keyword)}
                          className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1.5 transition cursor-pointer hover:scale-105 active:scale-95 ${
                            item.type === "CORE"
                              ? "bg-rose-950/60 text-rose-300 border-rose-800 font-bold hover:bg-rose-900"
                              : item.type === "DIRECT"
                              ? "bg-amber-950/60 text-amber-300 border-amber-800 font-bold hover:bg-amber-900"
                              : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-900"
                          }`}
                          title={item.reason}
                        >
                          <span>{item.keyword}</span>
                          <span className="font-mono text-[9px] px-1 rounded bg-black/60 text-zinc-300">
                            {item.score}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: TOP STOCK INTELLIGENCE RANKING CARDS & ADVANCED FILTER CONSOLE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
            {/* Header & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-cyan-400" />
                  <span>'{activeQueryName}' AI 분석 종목 랭킹 ({filteredStocks.length} / {rawStocks.length}개)</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  사업 연관도, 뉴스 강도, 거래량 폭발 지표, 수급점수를 종합 계산한 AI Score순 랭킹입니다.
                </p>
              </div>

              {/* BATCH REGISTER ALL RESULTS BUTTON */}
              <button
                onClick={handleRegisterAllResults}
                disabled={filteredStocks.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition transform active:scale-95 cursor-pointer shrink-0"
              >
                <ListPlus className="w-4 h-4 text-emerald-200" />
                <span>선택된 {filteredStocks.length}개 종목 관측/분석 일괄 등록</span>
              </button>
            </div>

            {/* AI ADVANCED SEARCH FILTER CONSOLE */}
            <div className="space-y-3 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black text-white">AI 검색 정밀 필터링 (Search Precision Filters)</span>
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                      {activeFilterCount}개 필터 적용 중
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-rose-900/50 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>필터 초기화</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className="p-1 text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <span>{isFilterExpanded ? "접기" : "필터 펼치기"}</span>
                    {isFilterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* EXPANDED MULTI-CATEGORY FILTER GRID */}
              {isFilterExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-zinc-800/80 text-xs">
                  
                  {/* 1. 시가총액 규모 (대형주 / 중소형주) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-cyan-400" />
                      시가총액 규모:
                    </label>
                    <div className="flex flex-wrap items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      {[
                        { id: "ALL", label: "전체" },
                        { id: "LARGE", label: "🏙️ 대형주" },
                        { id: "MID", label: "🏢 중형주" },
                        { id: "SMALL", label: "🚀 소형주" },
                        { id: "MID_SMALL", label: "⚡ 중소형" }
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCapFilter(c.id as any)}
                          className={`flex-1 py-1 px-1.5 rounded font-bold transition text-center cursor-pointer text-[10px] ${
                            capFilter === c.id
                              ? "bg-cyan-500 text-black shadow-sm font-black"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. 변동성 / 수급 (변동성 높은 종목) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-rose-400" />
                      변동성 / 거래량:
                    </label>
                    <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      {[
                        { id: "ALL", label: "전체" },
                        { id: "HIGH_VOL", label: "🔥 변동성 높은 종목" },
                        { id: "STABLE", label: "🛡️ 저변동/안정주" }
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVolatilityFilter(v.id as any)}
                          className={`flex-1 py-1 px-1.5 rounded font-bold transition text-center cursor-pointer text-[10px] sm:text-xs ${
                            volatilityFilter === v.id
                              ? "bg-rose-500 text-white shadow-sm font-black"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. AI 매수 시그널 (AI 매수 신호 발생 종목) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-300" />
                      AI 매수 신호:
                    </label>
                    <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      {[
                        { id: "ALL", label: "전체 신호" },
                        { id: "BUY_SIGNAL", label: "🎯 AI 매수신호" },
                        { id: "STRONG_BUY", label: "🚀 강력매수" }
                      ].map((sig) => (
                        <button
                          key={sig.id}
                          onClick={() => setSignalFilter(sig.id as any)}
                          className={`flex-1 py-1 px-1.5 rounded font-bold transition text-center cursor-pointer text-[10px] sm:text-xs ${
                            signalFilter === sig.id
                              ? "bg-amber-400 text-black shadow-sm font-black"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {sig.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. 테마 역할 & 거래량 급증 */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Award className="w-3 h-3 text-emerald-400" />
                      테마 위상:
                    </label>
                    <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      {[
                        { id: "ALL", label: "전체" },
                        { id: "LEADER", label: "👑 대장주/핵심주" },
                        { id: "SURGE", label: "⚡ 거래량2X폭발" }
                      ].map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setRoleFilter(r.id as any)}
                          className={`flex-1 py-1 px-1.5 rounded font-bold transition text-center cursor-pointer text-[10px] sm:text-xs ${
                            roleFilter === r.id
                              ? "bg-emerald-500 text-black shadow-sm font-black"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. 거래 시장 구분 */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-cyan-400" />
                      상장 시장:
                    </label>
                    <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      {[
                        { id: "ALL", label: "전체" },
                        { id: "KOREA", label: "🇰🇷 국내" },
                        { id: "US", label: "🇺🇸 미국" },
                        { id: "BTC", label: "🪙 크립토" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMarketFilter(m.id as any)}
                          className={`flex-1 py-1 px-1.5 rounded font-bold transition text-center cursor-pointer text-[10px] sm:text-xs ${
                            marketFilter === m.id
                              ? "bg-cyan-600 text-white shadow-sm font-black"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. 결과 내 키워드 검색 & 정렬 */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <Search className="w-3 h-3 text-cyan-400" />
                      결과 내 검색 & 정렬:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={stockSearchQuery}
                          onChange={(e) => setStockSearchQuery(e.target.value)}
                          placeholder="종목명/코드/이유 검색..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-6 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                        />
                        <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-2" />
                        {stockSearchQuery && (
                          <button
                            onClick={() => setStockSearchQuery("")}
                            className="absolute right-2 top-1.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-zinc-900 border border-zinc-800 text-cyan-300 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="AI_SCORE">AI Score순</option>
                        <option value="RELATED_SCORE">관련도순</option>
                        <option value="GAIN">상승률순</option>
                        <option value="VOLUME_RATIO">거래량폭발순</option>
                        <option value="FLOW">수급점수순</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* STOCKS GRID CARDS OR EMPTY FILTER STATE */}
            {filteredStocks.length === 0 ? (
              <div className="bg-zinc-950/80 border border-dashed border-zinc-800 rounded-2xl p-10 text-center space-y-4">
                <Filter className="w-10 h-10 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">조건에 부합하는 종목이 없습니다.</h3>
                  <p className="text-xs text-zinc-400">
                    현재 선택하신 필터 조건('{capFilter !== "ALL" ? " 시가총액" : ""}{volatilityFilter !== "ALL" ? " 변동성" : ""}{signalFilter !== "ALL" ? " 매수신호" : ""}{roleFilter !== "ALL" ? " 테마위상" : ""}')을 만족하는 종목이 없습니다.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>필터 조건 초기화</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 3-TIER MARKET CAP QUICK FILTER BAR */}
                {(() => {
                  const largeCount = rawStocks.filter(s => getCapCategory(s) === "LARGE").length;
                  const midCount = rawStocks.filter(s => getCapCategory(s) === "MID").length;
                  const smallCount = rawStocks.filter(s => getCapCategory(s) === "SMALL").length;

                  return (
                    <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 shadow-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <Building2 className="w-4 h-4 text-cyan-400" />
                          <span>시가총액 3-TIER (대형주 / 중형주 / 소형주) 스캔 현황</span>
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          총 <strong className="text-white font-mono">{rawStocks.length}</strong>개 분석 종목
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Tier 1: Large Cap */}
                        <button
                          onClick={() => setCapFilter(capFilter === "LARGE" ? "ALL" : "LARGE")}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            capFilter === "LARGE"
                              ? "bg-cyan-950/80 border-cyan-500 text-white ring-2 ring-cyan-500/30"
                              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-black">
                              <span>🏙️ 대형주</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                                5조원+
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                              {rawStocks.filter(s => getCapCategory(s) === "LARGE").map(s => s.name).slice(0, 2).join(", ") || "대표 대장주"}
                            </p>
                          </div>
                          <span className="text-sm font-mono font-black text-cyan-400 bg-cyan-950 px-2 py-1 rounded-lg border border-cyan-800/80">
                            {largeCount}개
                          </span>
                        </button>

                        {/* Tier 2: Mid Cap */}
                        <button
                          onClick={() => setCapFilter(capFilter === "MID" ? "ALL" : "MID")}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            capFilter === "MID"
                              ? "bg-blue-950/80 border-blue-500 text-white ring-2 ring-blue-500/30"
                              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-black">
                              <span>🏢 중형주</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                                5천억~5조
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                              {rawStocks.filter(s => getCapCategory(s) === "MID").map(s => s.name).slice(0, 2).join(", ") || "핵심 수혜주"}
                            </p>
                          </div>
                          <span className="text-sm font-mono font-black text-blue-400 bg-blue-950 px-2 py-1 rounded-lg border border-blue-800/80">
                            {midCount}개
                          </span>
                        </button>

                        {/* Tier 3: Small Cap */}
                        <button
                          onClick={() => setCapFilter(capFilter === "SMALL" ? "ALL" : "SMALL")}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            capFilter === "SMALL"
                              ? "bg-purple-950/80 border-purple-500 text-white ring-2 ring-purple-500/30"
                              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-black">
                              <span>🚀 소형주</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                                5천억 미만
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                              {rawStocks.filter(s => getCapCategory(s) === "SMALL").map(s => s.name).slice(0, 2).join(", ") || "테마 스몰캡"}
                            </p>
                          </div>
                          <span className="text-sm font-mono font-black text-purple-400 bg-purple-950 px-2 py-1 rounded-lg border border-purple-800/80">
                            {smallCount}개
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStocks.map((stock, idx) => {
                  const isUp = (stock.changePct || 0) >= 0;
                  const isExpanded = expandedStockSymbol === stock.symbol;
                  const isRegistered = isInWatchlist(stock.symbol);
                  const isLarge = isLargeCapStock(stock);
                  const isHighVol = Math.abs(stock.changePct || 0) >= 3.0 || stock.volume_ratio >= 2.5;
                  const isBuySig = stock.ai_score >= 80 || stock.ai_grade === "A" || stock.ai_grade === "S";
                  const isSelectedForCompare = selectedForCompare.includes(stock.symbol);

                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => handleStockCardClick(stock)}
                      className={`bg-zinc-950/80 border p-5 rounded-2xl transition space-y-4 shadow-md group relative overflow-hidden cursor-pointer hover:shadow-cyan-500/10 hover:shadow-lg ${
                        isSelectedForCompare
                          ? "border-cyan-400 ring-2 ring-cyan-500/40 bg-zinc-950/95"
                          : isRegistered
                          ? "border-emerald-700/80 bg-zinc-950/90"
                          : "border-zinc-800 hover:border-cyan-400"
                      }`}
                    >
                      {/* Top Click-to-Detail & Compare Selection Bar */}
                      <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold bg-cyan-950/40 px-2.5 py-1.5 rounded-lg border border-cyan-800/40" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => toggleSelectForCompare(stock, e)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer border ${
                              isSelectedForCompare
                                ? "bg-cyan-500 text-black border-cyan-400 shadow"
                                : "bg-zinc-900 text-zinc-300 hover:text-white border-zinc-700 hover:border-zinc-500"
                            }`}
                            title="다차원 퀀트 비교 목록에 추가"
                          >
                            <Scale className="w-3 h-3" />
                            <span>{isSelectedForCompare ? "비교 선택됨 ✓" : "비교 담기 +"}</span>
                          </button>

                          <span className="flex items-center gap-1 text-zinc-400">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            AI 퀀트 점수
                          </span>
                        </div>

                        <span
                          onClick={() => handleStockCardClick(stock)}
                          className="text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                        >
                          상세 리포트 <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>

                    {/* Stock Card Top Info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="h-10 w-10 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center font-mono font-black text-cyan-400 text-base shrink-0 shadow-inner">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-white text-base group-hover:text-cyan-300 transition">
                              {stock.name}
                            </span>
                            <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">
                              {stock.symbol}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              {stock.market}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              관련도 {stock.related_score}점 ({stock.related_grade})
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              AI Score {stock.ai_score} ({stock.ai_grade}등급)
                            </span>
                            {/* Filter Feature Indicator Tags */}
                            {(() => {
                              const capCategory = getCapCategory(stock);
                              const capLabel = capCategory === "LARGE" ? "🏙️ 대형주" : capCategory === "MID" ? "🏢 중형주" : "🚀 소형주";
                              const capBadgeStyle = capCategory === "LARGE" 
                                ? "bg-cyan-950/80 text-cyan-300 border-cyan-700/80" 
                                : capCategory === "MID" 
                                ? "bg-blue-950/80 text-blue-300 border-blue-700/80" 
                                : "bg-purple-950/80 text-purple-300 border-purple-700/80";
                              const mCapStr = (stock as any).marketCap || (capCategory === "LARGE" ? "5조원+" : capCategory === "MID" ? "5천억~5조" : "5천억미만");
                              return (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${capBadgeStyle}`}>
                                  {capLabel} <span className="opacity-80">[{mCapStr}]</span>
                                </span>
                              );
                            })()}
                            {isHighVol && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                                🔥 고변동/수급급증
                              </span>
                            )}
                            {isBuySig && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                🎯 AI 매수신호
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price & Change */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-black text-white">
                          {stock.price ? (stock.price ?? 0).toLocaleString() : "-"}
                        </p>
                        <p className={`text-xs font-mono font-bold flex items-center justify-end ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                          {isUp ? "+" : ""}{stock.changePct?.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Volume Ratio & Investor Flow Bar */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">거래량 폭발비율</span>
                        <span className="text-cyan-400 font-black">{stock.volume_ratio}X 폭발</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">외국인/기관 수급</span>
                        <span className="text-emerald-400 font-bold">{stock.investor_flow?.foreigner || "순매수"}</span>
                      </div>
                    </div>

                    {/* AI TRADING TARGETS STRATEGY (1차/2차/손절선) */}
                    {(() => {
                      const targets = stock.trading_targets || {
                        entryZone: stock.price ? `${Math.round(stock.price * 0.98).toLocaleString()} ~ ${(stock.price ?? 0).toLocaleString()}원` : "눌림목 분할매수",
                        target1: stock.price ? `${Math.round(stock.price * 1.08).toLocaleString()}원 (+8%)` : "1차 전고점 돌파",
                        target2: stock.price ? `${Math.round(stock.price * 1.18).toLocaleString()}원 (+18%)` : "2차 신고가 랠리",
                        stopLoss: stock.price ? `${Math.round(stock.price * 0.94).toLocaleString()}원 (-6%)` : "주요 지지선 이탈시",
                        timeHorizon: "단기 1~2주 스윙"
                      };

                      return (
                        <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                            <span className="text-cyan-400 flex items-center gap-1 font-mono">
                              <Target className="w-3 h-3 text-cyan-400" />
                              AI 추천 진입 및 목표 전략
                            </span>
                            <span className="font-mono text-zinc-500">{targets.timeHorizon || "단기 1~2주 스윙"}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                            <div className="bg-zinc-950/80 p-1.5 rounded-lg border border-zinc-800">
                              <span className="text-[9px] text-zinc-400 block font-sans">1차 목표</span>
                              <span className="text-emerald-400 font-bold truncate block">{targets.target1}</span>
                            </div>
                            <div className="bg-zinc-950/80 p-1.5 rounded-lg border border-zinc-800">
                              <span className="text-[9px] text-zinc-400 block font-sans">2차 목표</span>
                              <span className="text-cyan-300 font-bold truncate block">{targets.target2}</span>
                            </div>
                            <div className="bg-zinc-950/80 p-1.5 rounded-lg border border-zinc-800">
                              <span className="text-[9px] text-zinc-400 block font-sans">손절 기준</span>
                              <span className="text-rose-400 font-bold truncate block">{targets.stopLoss}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* AI Grounding Summary */}
                    <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
                      💡 {stock.ai_summary}
                    </p>

                    {/* Expandable Technical & Risk Section */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2 border-t border-zinc-800 animate-fade-in text-xs">
                        {/* Grounding Reasons */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-cyan-400 block">📌 관련 근거:</span>
                          <ul className="space-y-1 pl-1 text-zinc-300">
                            {(stock.reasons || []).map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-cyan-500 mt-0.5">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Event Timeline if available */}
                        {stock.event_timeline && stock.event_timeline.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-amber-400 block">⏱️ 수급/차트 타임라인:</span>
                            <div className="space-y-1 pl-1 text-zinc-300">
                              {stock.event_timeline.map((ev, i) => (
                                <div key={i} className="flex items-center space-x-2 text-[11px]">
                                  <span className="text-zinc-500 font-mono">{ev.time}</span>
                                  <span className="text-zinc-200">{ev.event}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARD ACTIONS TOOLBAR */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedStockSymbol(isExpanded ? null : stock.symbol);
                        }}
                        className="text-xs font-bold text-zinc-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "접기" : "간략근거"}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex items-center space-x-2">
                        {/* REGISTER TO ANALYSIS TARGET BUTTON */}
                        <button
                          onClick={(e) => handleRegisterSingleStock(stock, e)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
                            isRegistered
                              ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                              : "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-md"
                          }`}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              <span>관측 등록됨</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>분석 타깃 등록</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => handleOpenChart(stock, e)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
                          <span>차트/시세</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

          {/* CARD 3: NEWS CLUSTERS & FACT VERIFICATION */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-cyan-400" />
                <span>'{activeQueryName}' 최신 뉴스 클러스터 &amp; 팩트 검증</span>
              </h2>
              <span className="text-xs text-zinc-400 font-mono">Fact Verified</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsList.map((news) => (
                <div
                  key={news.id}
                  className="bg-zinc-950 border border-zinc-800/90 p-4 rounded-xl space-y-3 hover:border-zinc-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          news.reliability_type === "FACT"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                            : "bg-amber-950 text-amber-300 border-amber-800"
                        }`}>
                          {news.reliability_type} (신뢰도 {news.source_reliability_score}점)
                        </span>
                        <span className="text-xs font-bold text-cyan-400">{news.source}</span>
                        <span className="text-xs text-zinc-500">{news.published_at}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white leading-snug">
                        {news.title}
                      </h4>
                    </div>

                    <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
                      news.sentiment_val > 0
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : news.sentiment_val < 0
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-zinc-800 text-zinc-300"
                    }`}>
                      {news.sentiment}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                    {news.summary}
                  </p>

                  {news.ai_summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-cyan-950/30 p-2.5 rounded-lg border border-cyan-800/40">
                      <div>
                        <span className="font-bold text-cyan-300 block">📌 핵심 원인:</span>
                        <p className="text-zinc-300">{news.ai_summary.what_happened}</p>
                      </div>
                      <div>
                        <span className="font-bold text-amber-300 block">💡 중요성 및 영향:</span>
                        <p className="text-zinc-300">{news.ai_summary.why_important}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CARD 4: SUPPLY CHAIN & EVENT IMPACT MATRIX */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Supply Chain Flow */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <GitBranch className="h-5 w-5 text-cyan-400" />
                <span>산업 공급망 (Supply Chain) 모듈</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(analysisData.supply_chain || []).map((sc, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-800 block w-fit">
                      {sc.stage}
                    </span>
                    <p className="text-xs text-zinc-300 font-medium">{sc.description}</p>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {sc.stocks.map((stName, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded text-xs font-bold border border-zinc-700">
                          {stName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Trading Strategy Tip Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-black text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Sparkles className="h-5 w-5" />
                  <span>AI 매매 전략 리포트</span>
                </h2>

                <div className="space-y-3 pt-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block">전방 수요 전망:</span>
                    <p className="text-zinc-200 leading-relaxed">{analysisData.marketDemandReport?.demandOutlook || "수요 확대 지속 중입니다."}</p>
                  </div>

                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block">AI 매매 전략 팁:</span>
                    <p className="text-cyan-300 font-bold leading-relaxed">{analysisData.marketDemandReport?.aiStrategyTip || "눌림목 형성 시 분할 매수 전략을 권장합니다."}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-center text-[11px] text-cyan-200 mt-4">
                기관 수급 점수: <strong className="text-amber-300 text-sm">{analysisData.marketDemandReport?.institutionalInflowScore || 88}점</strong> / 100점
              </div>
            </div>
          </div>
        </div>
      ) : !analysisData && !isLoading ? (
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl animate-fade-in max-w-4xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              실시간 AI 키워드 종목 발굴엔진
            </h3>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              검색창에 원하는 키워드(예: <strong className="text-cyan-300">HBM, SMR, 원전, 구리, 로봇, 바이오, 방열</strong> 등)를 자유롭게 입력하거나 상단 추천 태그를 클릭하면, 50단계 AI 리서치 분석 파이프라인이 실시간 실제 시세와 함께 즉시 종목을 발굴합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-black text-cyan-400 block mb-1">01. 전시장 실시간 연동</span>
              <p className="text-xs text-zinc-400">국내 주식(KOSPI, KOSDAQ) 및 미국 주식(NYSE, NASDAQ) 실제 호가 및 실거래량 실시간 100% 매칭</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-black text-amber-400 block mb-1">02. 3-TIER 시총 분류</span>
              <p className="text-xs text-zinc-400">대형 대장주부터 중형 수혜주, 소형 급등 탄력주까지 규모별 완벽 자동 분류</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs font-black text-emerald-400 block mb-1">03. 퀀트 타점 & 손익비</span>
              <p className="text-xs text-zinc-400">AI 50단계 스코어링, 실시간 타점 존, 목표가(TP1/TP2) 및 손절선 자동 계산</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* FLOATING MULTI-STOCK COMPARE BAR (when stocks are selected) */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 border border-cyan-500/80 rounded-2xl shadow-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl animate-fade-in ring-4 ring-cyan-500/20 max-w-2xl w-[92%]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/80 flex items-center justify-center text-cyan-400 font-bold shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">다차원 퀀트 비교</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-black">
                  {selectedForCompare.length} / 4 선택
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 overflow-x-auto max-w-[280px] sm:max-w-md">
                {selectedForCompare.map((sym) => {
                  const st = rawStocks.find(s => s.symbol === sym);
                  return (
                    <span
                      key={sym}
                      className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-cyan-300 flex items-center gap-1 shrink-0"
                    >
                      <span>{st?.name || sym}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromCompare(sym);
                        }}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedForCompare([])}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
            >
              선택 비우기
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>비교 매트릭스 열기 ({selectedForCompare.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* AI MULTI-STOCK COMPARE MODAL */}
      <AiStockCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedStocks={rawStocks.filter(s => selectedForCompare.includes(s.symbol))}
        themeKeyword={activeQueryName}
        onOpenChart={(sym, name, st) => {
          setIsCompareModalOpen(false);
          handleOpenChart(st || sym);
        }}
        onRegisterStock={async (st) => {
          await addToWatchlist({
            symbol: st.symbol,
            name: st.name,
            market: st.market === "UPBIT" || st.market === "BTC" ? "BTC" : st.market === "NASDAQ" || st.market === "NYSE" ? "US" : "KOREA",
            targetBuyPrice: st.price || 1000,
            memo: `'${activeQueryName}' AI 비교 모달 등록`
          });
          addToast({
            type: "SUCCESS",
            title: "🎯 관측 등록 완료",
            message: `${st.name}(${st.symbol}) 종목이 등록되었습니다.`
          });
        }}
        isInWatchlist={isInWatchlist}
      />

      {/* AI STOCK DETAIL DRILL-DOWN MODAL */}
      {selectedDetailStock && (
        <AiStockDetailModal
          stock={selectedDetailStock}
          keyword={activeQueryName}
          onClose={() => setSelectedDetailStock(null)}
          onOpenLiveChart={(sym, name, st) => {
            setSelectedDetailStock(null);
            handleOpenChart(st || {
              symbol: sym,
              name: name || sym,
              market: selectedDetailStock.market,
              price: selectedDetailStock.price,
              changePct: selectedDetailStock.changePct
            });
          }}
        />
      )}

      {/* TICKER QUOTE MODAL */}
      {isQuoteModalOpen && quoteModalSymbol && (
        <TickerQuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          symbol={quoteModalSymbol}
          name={selectedStockForChart?.name}
          market={selectedStockForChart?.market}
          price={selectedStockForChart?.price}
          changePct={selectedStockForChart?.changePct}
        />
      )}
    </div>
  );
};
