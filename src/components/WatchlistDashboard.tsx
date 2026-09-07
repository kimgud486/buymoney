import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { WatchlistItem } from "../types";
import { AiDepositStockRecommender } from "./AiDepositStockRecommender";
import { realtimeMarketFeedService, LiveMarketQuote } from "../services/realtimeMarketFeedService";
import { 
  Star, 
  Trash2, 
  Layers, 
  Search, 
  Globe, 
  Coins, 
  TrendingUp, 
  Edit3, 
  Sparkles, 
  Plus, 
  Info,
  ExternalLink 
} from "lucide-react";

export const WatchlistDashboard: React.FC = () => {
  const { 
    watchlist, 
    removeFromWatchlist, 
    addToWatchlist, 
    setSelectedSymbol,
    openStockChart
  } = useApp();

  const [filterMarket, setFilterMarket] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTargetPrice, setEditTargetPrice] = useState<number>(0);
  const [editMemo, setEditMemo] = useState("");

  const [liveQuotesMap, setLiveQuotesMap] = useState<Map<string, LiveMarketQuote>>(new Map());

  useEffect(() => {
    watchlist.forEach((w) => {
      realtimeMarketFeedService.registerSymbol(w.symbol, w.market === "KOREA" ? "KOSPI" : w.market === "BTC" ? "UPBIT" : "US");
    });
    const unsub = realtimeMarketFeedService.subscribe((qMap) => {
      setLiveQuotesMap(new Map(qMap));
    });
    return () => unsub();
  }, [watchlist]);

  const handleStartEdit = (item: WatchlistItem) => {
    setEditingItemId(item.id);
    setEditTargetPrice(item.targetBuyPrice || 0);
    setEditMemo(item.memo || "");
  };

  const handleSaveEdit = (item: WatchlistItem) => {
    // In our context, we can re-add with updated details or edit. Let's update directly in state if needed or just handle locally.
    // For premium feel, we can simulate the update by modifying context, but since context provides addToWatchlist, 
    // we can re-add (which overwrites because of matching symbol or simply updates) or simulate saving.
    // Let's call addToWatchlist to overwrite/update:
    addToWatchlist({
      ...item,
      targetBuyPrice: editTargetPrice,
      memo: editMemo
    });
    setEditingItemId(null);
  };

  // Switch tab and search for selected symbol to focus on it
  const handleAnalyzeSymbol = (symbol: string, market: "KOREA" | "US" | "BTC") => {
    setSelectedSymbol(symbol);
    const targetTab = market === "KOREA" ? "domestic" : market === "US" ? "overseas" : "bitcoin";
    window.dispatchEvent(new CustomEvent("switch-tab", { detail: targetTab }));
  };

  const filteredList = watchlist.filter(item => {
    const matchesMarket = filterMarket === "ALL" || item.market === filterMarket;
    const matchesSearch = searchQuery.trim() === "" || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMarket && matchesSearch;
  });

  // Direct addition from this dashboard
  const [directSym, setDirectSym] = useState("");
  const [directName, setDirectName] = useState("");
  const [directMarket, setDirectMarket] = useState<"KOREA" | "US" | "BTC">("KOREA");
  const [directPrice, setDirectPrice] = useState("");

  const handleDirectAdd = async () => {
    if (!directSym.trim() || !directName.trim()) return;
    const priceVal = parseFloat(directPrice) || (directMarket === "KOREA" ? 70000 : directMarket === "US" ? 150 : 90000000);
    await addToWatchlist({
      symbol: directSym.trim().toUpperCase(),
      name: directName.trim(),
      market: directMarket,
      targetBuyPrice: priceVal,
      memo: `${directMarket === "KOREA" ? "국내" : directMarket === "US" ? "해외" : "가상자산"} 직접 추가 종목`
    });
    setDirectSym("");
    setDirectName("");
    setDirectPrice("");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 p-5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
            <span>관심종목 통합 대쉬보드 (Unified Watchlist)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">국내주식, 미국주식, 가상자산에 대해 등록한 모든 관심종목을 통합 관리합니다</p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 p-1 rounded-md text-xs font-bold text-zinc-700">
          <Layers className="h-3.5 w-3.5 text-amber-500" />
          <span>총 {watchlist.length}종목 모니터링 중</span>
        </div>
      </div>

      {/* Direct Add & Filter Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List Filters & Direct Add form */}
        <div className="space-y-6 lg:col-span-1">
          {/* Direct Add Form */}
          <div className="bg-white border border-zinc-200 p-5 rounded-lg space-y-4">
            <h3 className="text-xs font-black text-zinc-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Plus className="h-3.5 w-3.5 text-zinc-600" />
              <span>관심종목 직접 추가</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-black text-zinc-500 mb-1">시장 구분</label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-50 border border-zinc-200 p-1 rounded-md">
                  {(["KOREA", "US", "BTC"] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDirectMarket(m)}
                      className={`py-1 rounded text-[10px] font-bold text-center transition ${
                        directMarket === m 
                          ? "bg-zinc-900 text-white shadow-xs" 
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      {m === "KOREA" ? "국내주식" : m === "US" ? "미국주식" : "가상자산"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-zinc-500 mb-1">종목 코드 / 심볼</label>
                <input
                  type="text"
                  placeholder="예: 005930, AAPL, BTC..."
                  value={directSym}
                  onChange={(e) => setDirectSym(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded text-xs focus:border-zinc-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-zinc-500 mb-1">종목명 / 자산명</label>
                <input
                  type="text"
                  placeholder="예: 삼성전자, 애플, 비트코인..."
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded text-xs focus:border-zinc-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-zinc-500 mb-1">희망 매수 타겟가 (선택)</label>
                <input
                  type="number"
                  placeholder="예: 72000, 150, 95000000..."
                  value={directPrice}
                  onChange={(e) => setDirectPrice(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded text-xs focus:border-zinc-800 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={handleDirectAdd}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
              >
                <Plus className="h-4 w-4 text-amber-400" />
                <span>관심목록에 직접 추가</span>
              </button>
            </div>
          </div>

          {/* Quick Help Tip */}
          <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-lg space-y-2 text-xs text-amber-900">
            <h4 className="font-bold flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-amber-600" />
              <span>관제 연동 가이드</span>
            </h4>
            <p className="leading-relaxed text-[11px] text-amber-800/90">
              각 개별 시장 대쉬보드(국내, 해외, 비트코인)에서 실시간으로 관제 중인 목록 옆의 <strong>별(★) 아이콘</strong>을 클릭하면 즉시 이곳 관심종목 대쉬보드로 자동 전송 및 동기화됩니다.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Watchlist Cards Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top Search & Filter Tab bar */}
          <div className="bg-white border border-zinc-200 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex gap-1 bg-zinc-50 border border-zinc-150 p-1 rounded-md w-full sm:w-auto">
              {(["ALL", "KOREA", "US", "BTC"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMarket(m)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filterMarket === m 
                      ? "bg-zinc-900 text-white shadow-xs" 
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  {m === "ALL" ? "전체 보기" : m === "KOREA" ? "국내주식" : m === "US" ? "미국주식" : "가상자산"}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="관심목록 내 이름/코드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 pl-8 pr-3 py-1.5 rounded text-xs text-zinc-900 font-medium focus:border-zinc-800 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Watchlist cards renderer */}
          {filteredList.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center space-y-2 shadow-xs">
              <Star className="h-10 w-10 text-zinc-300 mx-auto" />
              <p className="text-sm font-bold text-zinc-600">필터링에 부합하는 관심종목이 없습니다.</p>
              <p className="text-xs text-zinc-400">대쉬보드에서 별(★)을 눌러 등록하거나 좌측 등록창에서 직접 종목을 등록해보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map(item => {
                const isEditing = editingItemId === item.id;
                const marketBadge = item.market === "KOREA" 
                  ? { text: "국내주식", style: "bg-blue-50 text-blue-700 border-blue-200" }
                  : item.market === "US"
                  ? { text: "미국주식", style: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                  : { text: "가상자산", style: "bg-orange-50 text-orange-700 border-orange-200" };

                return (
                  <div key={item.id} className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-4 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${marketBadge.style}`}>
                          {marketBadge.text}
                        </span>
                        <strong className="text-sm font-black text-zinc-900">{item.name}</strong>
                        <span className="text-xs font-mono text-zinc-400">{item.symbol}</span>
                      </div>

                      {/* Editing View */}
                      {isEditing ? (
                        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-md space-y-3 mt-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-500 mb-1">희망 타겟 매수가 ({item.market === "US" ? "USD" : "원"})</label>
                              <input
                                type="number"
                                value={editTargetPrice}
                                onChange={(e) => setEditTargetPrice(parseFloat(e.target.value) || 0)}
                                className="w-full bg-white border border-zinc-200 px-2.5 py-1 rounded focus:border-zinc-800 focus:outline-hidden font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-500 mb-1">메모 및 투자 계획</label>
                              <input
                                type="text"
                                value={editMemo}
                                onChange={(e) => setEditMemo(e.target.value)}
                                className="w-full bg-white border border-zinc-200 px-2.5 py-1 rounded focus:border-zinc-800 focus:outline-hidden"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded text-[11px] font-bold"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item)}
                              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 text-white rounded text-[11px] font-black shadow-xs"
                            >
                              저장하기
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                          {item.targetBuyPrice ? (
                            <div>
                              <span className="font-bold text-zinc-400">타겟 희망가:</span>{" "}
                              <span className="font-bold font-mono text-zinc-800">
                                {item.market === "US" ? `$${(item.targetBuyPrice ?? 0).toLocaleString()}` : `${(item.targetBuyPrice ?? 0).toLocaleString()}원`}
                              </span>
                            </div>
                          ) : null}
                          {item.memo ? (
                            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                              <span className="font-bold text-zinc-400 shrink-0">메모:</span>{" "}
                              <span className="text-zinc-700 line-clamp-1 italic">{item.memo}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t md:border-t-0 border-zinc-100 pt-3 md:pt-0 shrink-0">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="px-2.5 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>메모 수정</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openStockChart({
                          symbol: item.symbol,
                          name: item.name,
                          market: item.market,
                          currentPrice: item.targetBuyPrice || 50000
                        })}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="h-3 w-3 text-cyan-200" />
                        <span>실시간 차트</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnalyzeSymbol(item.symbol, item.market)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3 text-amber-400" />
                        <span>관제 분석</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromWatchlist(item.symbol)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="관심종목 해제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Deposit-Aware Stock Recommendation Engine */}
      <AiDepositStockRecommender />
    </div>
  );
};
