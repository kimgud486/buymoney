import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Star, Activity, ShieldCheck } from "lucide-react";
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

function quoteKeys(stock: StockItem): string[] {
  const raw = String(stock.symbol || "").trim();
  const upper = raw.toUpperCase();
  const plain = upper.replace(/^KRW-/, "");
  return [raw, upper, plain, `KRW-${plain}`].filter(Boolean);
}

function usableLive(quote: LiveMarketQuote | undefined | null): quote is LiveMarketQuote {
  return Boolean(
    quote &&
      quote.isVerified &&
      quote.status === "LIVE" &&
      quote.price != null &&
      Number.isFinite(quote.price) &&
      quote.price > 0,
  );
}

function findLiveQuote(stock: StockItem, quotes: Map<string, LiveMarketQuote>): LiveMarketQuote | null {
  for (const key of quoteKeys(stock)) {
    const direct = quotes.get(key);
    if (usableLive(direct)) return direct;
  }
  for (const quote of quotes.values()) {
    if (!usableLive(quote)) continue;
    if (quoteKeys(stock).includes(String(quote.symbol).toUpperCase())) return quote;
  }
  return null;
}

function formatPrice(quote: LiveMarketQuote | null): string {
  if (!quote || quote.price == null || !Number.isFinite(quote.price) || quote.price <= 0) return "NO_DATA";
  if (quote.market === "US") return `$${quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}원`;
}

function formatRate(quote: LiveMarketQuote | null): string {
  if (!quote || quote.changeRate == null || !Number.isFinite(quote.changeRate)) return "NO_DATA";
  return `${quote.changeRate > 0 ? "+" : ""}${quote.changeRate.toFixed(2)}%`;
}

function rebuildSelectedStock(stock: StockItem): StockItem {
  return buildLiveStockItem(stock.symbol, stock.name, stock.market, {
    category: stock.category,
    categoryLabel: stock.categoryLabel,
    theme: stock.theme,
    strategy: stock.strategy,
    isCustom: stock.isCustom,
  });
}

export const StockSearchAndAddModal: React.FC<StockSearchAndAddModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  onAddToWatchlist,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | "LARGE" | "MID" | "SMALL">("ALL");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showKorea, setShowKorea] = useState(true);
  const [showUS, setShowUS] = useState(true);
  const [showUpbit, setShowUpbit] = useState(true);
  const [liveQuotes, setLiveQuotes] = useState<Map<string, LiveMarketQuote>>(new Map());
  const [regName, setRegName] = useState("");
  const [regSymbol, setRegSymbol] = useState("");
  const [regMarket, setRegMarket] = useState<"KOSPI" | "KOSDAQ" | "US" | "UPBIT">("KOSDAQ");
  const [regCategory, setRegCategory] = useState<"SMALL" | "MID" | "LARGE" | "CRYPTO">("SMALL");
  const [regTheme, setRegTheme] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    return realtimeMarketFeedService.subscribe((quotes) => setLiveQuotes(new Map(quotes)));
  }, [isOpen]);

  const allStocks = useMemo(() => getAllStocks(), [isOpen]);

  const verifiedLiveCount = useMemo(() => {
    const unique = new Set<string>();
    liveQuotes.forEach((quote) => {
      if (usableLive(quote)) unique.add(`${quote.market}:${quote.symbol}`);
    });
    return unique.size;
  }, [liveQuotes]);

  const filteredStocks = useMemo(() => allStocks.filter((stock) => {
    const isKorea = stock.market === "KOSPI" || stock.market === "KOSDAQ";
    const isUS = stock.market === "US";
    const isUpbit = stock.market === "UPBIT" || stock.category === "CRYPTO";
    if ((isKorea && !showKorea) || (isUS && !showUS) || (isUpbit && !showUpbit)) return false;
    if (!isKorea && !isUS && !isUpbit) return false;

    const term = searchTerm.trim();
    if (!term && activeCategory !== "ALL" && stock.category !== activeCategory) return false;
    if (!term) return true;

    return matchesChosungOrKeyword(stock.name, stock.symbol, term, [
      stock.theme,
      stock.strategy,
      stock.categoryLabel,
      stock.market,
    ]);
  }), [allStocks, showKorea, showUS, showUpbit, searchTerm, activeCategory]);

  if (!isOpen) return null;

  const handleRegisterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!regName.trim() || !regSymbol.trim()) {
      alert("종목명과 종목코드를 입력해주세요.");
      return;
    }

    const newStock = buildLiveStockItem(
      regSymbol.trim().toUpperCase(),
      regName.trim(),
      regMarket,
      {
        category: regCategory,
        categoryLabel: regCategory === "SMALL" ? "소형주" : regCategory === "MID" ? "중형주" : regCategory === "LARGE" ? "대형주" : "가상자산",
        theme: regTheme.trim(),
        strategy: "사용자 등록 종목",
        isCustom: true,
      },
    );

    saveCustomStock(newStock);
    realtimeMarketFeedService.registerSymbol(
      newStock.symbol,
      regMarket === "US" ? "US" : regMarket === "UPBIT" ? "UPBIT" : regMarket === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
    );
    alert(`[${newStock.name}(${newStock.symbol})] 종목 메타정보를 등록했습니다. 실제 시세가 확인되기 전까지 가격은 NO_DATA입니다.`);
    setRegName("");
    setRegSymbol("");
    setRegTheme("");
    setIsRegisterOpen(false);
    onSelectStock(newStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 p-3 text-white sm:p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-400"><Search className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black sm:text-base">종목 검색</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${verifiedLiveCount > 0 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-600 bg-slate-800 text-slate-400"}`}>
                  {verifiedLiveCount > 0 ? `VERIFIED LIVE ${verifiedLiveCount}` : "LIVE NO_DATA"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">종목 목록은 검색용 메타정보입니다. 가격과 등락률은 검증된 LIVE 시세만 표시합니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="종목명, 티커, 테마 검색" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500" autoFocus />
          </div>
          <button type="button" onClick={() => setIsRegisterOpen((value) => !value)} className="flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> 종목 직접 등록</button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold">
          {[{ label: "🇰🇷 국내", checked: showKorea, set: setShowKorea }, { label: "🇺🇸 미국", checked: showUS, set: setShowUS }, { label: "⚡ 업비트", checked: showUpbit, set: setShowUpbit }].map((item) => (
            <label key={item.label} className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1">
              <input type="checkbox" checked={item.checked} onChange={(e) => item.set(e.target.checked)} /> {item.label}
            </label>
          ))}
          <span className="ml-auto font-mono text-[10px] text-slate-500">{filteredStocks.length} / {allStocks.length}개</span>
        </div>

        {isRegisterOpen && (
          <form onSubmit={handleRegisterSubmit} className="shrink-0 space-y-2 border-b border-blue-200 bg-blue-50 p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold text-slate-700">종목명<input value={regName} onChange={(e) => setRegName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900" required /></label>
              <label className="text-[10px] font-bold text-slate-700">티커 / 코드<input value={regSymbol} onChange={(e) => setRegSymbol(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-xs text-slate-900" required /></label>
              <label className="text-[10px] font-bold text-slate-700">시장<select value={regMarket} onChange={(e) => setRegMarket(e.target.value as typeof regMarket)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900"><option value="KOSDAQ">KOSDAQ</option><option value="KOSPI">KOSPI</option><option value="US">US</option><option value="UPBIT">UPBIT</option></select></label>
              <label className="text-[10px] font-bold text-slate-700">분류<select value={regCategory} onChange={(e) => setRegCategory(e.target.value as typeof regCategory)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900"><option value="SMALL">소형</option><option value="MID">중형</option><option value="LARGE">대형</option><option value="CRYPTO">가상자산</option></select></label>
            </div>
            <label className="block text-[10px] font-bold text-slate-700">테마 메모 (선택)<input value={regTheme} onChange={(e) => setRegTheme(e.target.value)} placeholder="사용자가 직접 입력한 메모만 저장" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900" /></label>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-800">현재가는 직접 입력받지 않습니다. 등록 뒤 실제 시세 제공자가 값을 보내면 표시합니다.</div>
            <button type="submit" className="w-full rounded-xl bg-blue-600 py-1.5 text-xs font-black text-white">종목 메타정보 등록</button>
          </form>
        )}

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 text-[11px] font-bold">
          {(["ALL", "SMALL", "MID", "LARGE"] as const).map((category) => (
            <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-md px-2.5 py-1 ${activeCategory === category ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{category}</button>
          ))}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/50 p-3">
          {filteredStocks.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
          ) : filteredStocks.map((stock) => {
            const live = findLiveQuote(stock, liveQuotes);
            const status = getMarketStatus(stock.symbol, stock.market);
            const rate = live?.changeRate != null && Number.isFinite(live.changeRate) ? live.changeRate : null;
            return (
              <div key={`${stock.market}-${stock.symbol}`} className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 sm:flex-row sm:items-center sm:justify-between" onClick={() => {
                onSelectStock(rebuildSelectedStock(stock));
                onClose();
              }}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-black ${status.badgeClass}`}>{status.marketBadgeLabel}</span>
                    <span className="truncate text-sm font-black text-slate-900">{stock.name}</span>
                    <span className="font-mono text-[11px] font-bold text-slate-400">{stock.symbol}</span>
                    {live && <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700"><ShieldCheck className="h-2.5 w-2.5" /> VERIFIED LIVE</span>}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-slate-500">{stock.theme || "테마 메모 없음"}</div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                  <div className="text-right font-mono">
                    <div className={`text-sm font-black ${live ? "text-slate-900" : "text-slate-400"}`}>{formatPrice(live)}</div>
                    <div className={`text-[11px] font-bold ${rate == null ? "text-slate-400" : rate >= 0 ? "text-rose-600" : "text-blue-600"}`}>{formatRate(live)}</div>
                    <div className="mt-0.5 text-[9px] text-slate-400">{live?.source || "NO_DATA"}</div>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onAddToWatchlist?.(stock); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-500" title="관심종목 추가"><Star className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-[10px] text-slate-500"><Activity className="h-3.5 w-3.5" /> LIVE 시세가 없으면 가격·등락률·AI 점수를 만들지 않습니다.</div>
      </div>
    </div>
  );
};