import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Sparkles,
  Star,
  Activity,
  Globe
} from "lucide-react";
import { StockItem, getAllStocks, saveCustomStock, buildLiveStockItem } from "../../data/stockUniverse";
import { realtimeMarketFeedService, LiveMarketQuote } from "../../services/realtimeMarketFeedService";
import { matchesChosungOrKeyword } from "../../lib/stockDictionary";
import { getMarketStatus } from "../../lib/marketStatus";

interface StockSearchAndAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (stock: StockItem) => void;
  onAddToWatchlist?: (stock: StockItem) => void;
  onAddToHoldings?: (stock: StockItem) => void;
}

export const StockSearchAndAddModal: React.FC<StockSearchAndAddModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  onAddToWatchlist,
  onAddToHoldings
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | "LARGE" | "MID" | "SMALL">("ALL");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Checkboxes for Markets (Explicit checkboxes: 국내, 미국, 업비트)
  const [showKorea, setShowKorea] = useState(true);
  const [showUS, setShowUS] = useState(true);
  const [showUpbit, setShowUpbit] = useState(true);

  // Live real-time market quotes stream
  const [liveQuotes, setLiveQuotes] = useState<Map<string, LiveMarketQuote>>(new Map());

  // Custom Register Form State
  const [regName, setRegName] = useState("");
  const [regSymbol, setRegSymbol] = useState("");
  const [regMarket, setRegMarket] = useState<"KOSPI" | "KOSDAQ" | "US" | "UPBIT">("KOSDAQ");
  const [regCategory, setRegCategory] = useState<"SMALL" | "MID" | "LARGE" | "CRYPTO">("SMALL");
  const [regPrice, setRegPrice] = useState<string>("12500");
  const [regTheme, setRegTheme] = useState("AI 로봇/반도체 테마주");

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = realtimeMarketFeedService.subscribe((quotes) => {
      setLiveQuotes(new Map(quotes));
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const allStocks = getAllStocks();

  // Apply market checkboxes and category/search filters
  const filteredStocks = allStocks.filter((s) => {
    const isKorea = s.market === "KOSPI" || s.market === "KOSDAQ";
    const isUS = s.market === "US";
    const isUpbit = s.market === "UPBIT" || s.category === "CRYPTO";

    let marketMatch = false;
    if (isKorea && showKorea) marketMatch = true;
    if (isUS && showUS) marketMatch = true;
    if (isUpbit && showUpbit) marketMatch = true;

    if (!marketMatch) return false;

    const term = searchTerm.trim();

    // When a search term is entered, ignore category tab restrictions so all matching stocks are found!
    if (!term && activeCategory !== "ALL" && s.category !== activeCategory) {
      return false;
    }

    if (!term) return true;

    return matchesChosungOrKeyword(s.name, s.symbol, term, [
      s.theme,
      s.strategy,
      s.categoryLabel,
      s.market
    ]);
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regSymbol) {
      alert("종목명과 종목코드를 입력해주세요.");
      return;
    }

    const newStock: StockItem = buildLiveStockItem(
      regSymbol.trim().toUpperCase(),
      regName.trim(),
      regMarket,
      {
        category: regCategory,
        categoryLabel: regCategory === "SMALL" ? "소형주" : regCategory === "MID" ? "중형주" : regCategory === "LARGE" ? "대형주" : "가상자산",
        theme: regTheme || "신규 등록 사용자 종목",
        strategy: "신규 발굴 세력 매집 돌파",
        isCustom: true
      }
    );

    saveCustomStock(newStock);
    alert(`[${newStock.name}(${newStock.symbol})] 신규 종목이 등록되어 관제 파이프라인에 연결되었습니다.`);
    setIsRegisterOpen(false);
    onSelectStock(newStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[92vh] sm:h-auto sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Mobile Optimized) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">실시간 종목 검색</h3>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  실시간 연동중
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                국내주식 및 미국주식을 선택하여 실시간 시세로 관제합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input Bar (Mobile Optimized) */}
        <div className="p-2.5 sm:p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="종목명, 티커, 테마(반도체, NVDA, 삼성전자 등) 검색..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              autoFocus
            />
          </div>

          <button
            onClick={() => setIsRegisterOpen(!isRegisterOpen)}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 종목 직접 등록</span>
          </button>
        </div>

        {/* MARKET FILTER CHECKBOXES (Mobile Layout Optimized) */}
        <div className="p-2 px-3 sm:px-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-bold text-[10px] sm:text-[11px] shrink-0">마켓 선택:</span>

            {/* Checkbox 1: 국내 */}
            <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-slate-300 hover:border-blue-500 transition select-none text-[11px] sm:text-xs">
              <input
                type="checkbox"
                checked={showKorea}
                onChange={(e) => setShowKorea(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-800 font-bold">🇰🇷 국내</span>
            </label>

            {/* Checkbox 2: 미국 */}
            <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-slate-300 hover:border-purple-500 transition select-none text-[11px] sm:text-xs">
              <input
                type="checkbox"
                checked={showUS}
                onChange={(e) => setShowUS(e.target.checked)}
                className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-slate-800 font-bold">🇺🇸 미국</span>
            </label>

            {/* Checkbox 3: 업비트 */}
            <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-slate-300 hover:border-amber-500 transition select-none text-[11px] sm:text-xs">
              <input
                type="checkbox"
                checked={showUpbit}
                onChange={(e) => setShowUpbit(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-slate-800 font-bold">⚡ 업비트</span>
            </label>
          </div>

          <div className="text-slate-500 text-[10px] sm:text-xs font-mono font-bold shrink-0 ml-auto">
            <span className="text-blue-600 font-black">{filteredStocks.length}</span> / {allStocks.length}개
          </div>
        </div>

        {/* Custom Registration Form */}
        {isRegisterOpen && (
          <form onSubmit={handleRegisterSubmit} className="p-3 bg-blue-50/90 border-b border-blue-200 space-y-2 text-xs shrink-0 max-h-[220px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-950 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>+ 사용자 정의 종목 등록</span>
              </span>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                닫기
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">종목명</label>
                <input
                  type="text"
                  placeholder="예: 레인보우로보틱스"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">티커 / 코드</label>
                <input
                  type="text"
                  placeholder="예: 277810"
                  value={regSymbol}
                  onChange={(e) => setRegSymbol(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">시장 구분</label>
                <select
                  value={regMarket}
                  onChange={(e) => setRegMarket(e.target.value as any)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-xs"
                >
                  <option value="KOSDAQ">코스닥 (KOSDAQ)</option>
                  <option value="KOSPI">코스피 (KOSPI)</option>
                  <option value="US">미국주식 (US)</option>
                  <option value="UPBIT">업비트 가상자산 (UPBIT)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">현재가</label>
                <input
                  type="text"
                  placeholder="예: 168400"
                  value={regPrice}
                  onChange={(e) => setRegPrice(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition cursor-pointer"
            >
              종목 등록하기
            </button>
          </form>
        )}

        {/* Category Scale Filter Sub-Tabs (Mobile Horizontal Scrollable) */}
        <div className="p-2 px-3 sm:px-4 border-b border-slate-200 flex items-center gap-1 overflow-x-auto text-[11px] font-bold bg-white shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeCategory === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            전체 ({allStocks.length})
          </button>
          <button
            onClick={() => setActiveCategory("SMALL")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeCategory === "SMALL" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            소형주 ({allStocks.filter((s) => s.category === "SMALL").length})
          </button>
          <button
            onClick={() => setActiveCategory("MID")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeCategory === "MID" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            중형주 ({allStocks.filter((s) => s.category === "MID").length})
          </button>
          <button
            onClick={() => setActiveCategory("LARGE")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeCategory === "LARGE" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            대형주/미국 ({allStocks.filter((s) => s.category === "LARGE").length})
          </button>
        </div>

        {/* Stock List Body with Realtime Quotes (Mobile Responsive) */}
        <div className="p-2.5 sm:p-4 space-y-2 overflow-y-auto flex-1 bg-slate-50/50">
          {filteredStocks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs sm:text-sm font-semibold">선택한 마켓 또는 검색어와 일치하는 종목이 없습니다.</p>
              <p className="text-[11px] mt-1">상단 마켓 체크박스를 켜거나 [+ 종목 직접 등록]을 이용해보세요.</p>
            </div>
          ) : (
            filteredStocks.map((stock) => {
              const live = liveQuotes.get(stock.symbol);
              const displayPrice = live?.price || stock.price;
              const displayRate = live?.changeRate ?? stock.changeRate;
              const isCrypto = stock.market === "UPBIT";
              const isUS = stock.market === "US";
              const mStatus = getMarketStatus(stock.symbol, stock.market);

              return (
                <div
                  key={stock.symbol}
                  onClick={() => {
                    onSelectStock({
                      ...stock,
                      price: displayPrice,
                      changeRate: displayRate
                    });
                    onClose();
                  }}
                  className="p-2.5 sm:p-3 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs group"
                >
                  {/* Top Left: Stock Name, Market Tag, Category */}
                  <div className="flex items-center gap-2">
                    {/* Explicit Market Badge (국내주식 / 미국주식 / 가상자산) */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${mStatus.badgeClass}`}>
                      {mStatus.marketBadgeLabel}
                    </span>

                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      stock.category === "SMALL" ? "bg-rose-100 text-rose-700" :
                      stock.category === "MID" ? "bg-blue-100 text-blue-700" :
                      stock.category === "LARGE" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {stock.categoryLabel}
                    </span>

                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition truncate">
                        {stock.name}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                        ({stock.symbol})
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border shrink-0 ${mStatus.statusColorClass} bg-slate-50`}>
                        {mStatus.sessionStatusText}
                      </span>
                    </div>
                  </div>

                  {/* Theme info */}
                  <div className="text-[11px] text-slate-500 truncate sm:max-w-[200px]">
                    {stock.theme}
                  </div>

                  {/* Bottom Right: Price, Change Rate, AI Score, Star Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-0 border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-center shrink-0">
                        <span className="text-[10px] font-black text-emerald-600">AI {stock.score}점</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                          <span>{isUS ? "$" : ""}{(displayPrice ?? 0).toLocaleString()}{isUS ? "" : "원"}</span>
                          {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                        </div>
                        <div className={`text-[11px] font-bold ${displayRate >= 0 ? "text-rose-600" : "text-blue-600"}`}>
                          {displayRate >= 0 ? "+" : ""}{displayRate}%
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToWatchlist?.(stock);
                          alert(`[${stock.name}] 관심종목에 추가되었습니다.`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                        title="관심종목 추가"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
