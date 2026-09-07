import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Bot, Terminal, Sparkles, TrendingUp, X, Check, Play, Pause, Zap, ArrowRight, CornerDownLeft } from "lucide-react";
import { searchStocksFromIndex, SearchableStockItem } from "../../lib/stockDictionary";
import { StockItem } from "../../data/stockUniverse";

export interface UnifiedSearchAndCommandBarProps {
  onSelectStock?: (symbol: string) => void;
  onExecuteCommand?: (command: string, args?: any) => void;
  className?: string;
}

export const UnifiedSearchAndCommandBar: React.FC<UnifiedSearchAndCommandBarProps> = ({
  onSelectStock,
  onExecuteCommand,
  className = "",
}) => {
  const [query, setQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick Command Presets
  const COMMAND_PRESETS = [
    { cmd: "/buy 삼성전자 10주", label: "삼성전자 10주 매수 주문", type: "ORDER" },
    { cmd: "/sell BTC 50%", label: "비트코인 보유량 50% 매도", type: "ORDER" },
    { cmd: "/bot start", label: "AI 오토파일럿 자율매매 가동", type: "BOT" },
    { cmd: "/bot stop", label: "AI 자율매매 일시정지", type: "BOT" },
    { cmd: "/predict 카카오", label: "카카오 AI 주가 예측 실행", type: "PREDICT" },
    { cmd: "/risk 3%", label: "손절 한도 -3.0% 설정", type: "SETTINGS" },
  ];

  // Filter Command Suggestions based on query
  const matchingCommands = useMemo(() => {
    if (!query.trim()) return COMMAND_PRESETS;
    const lower = query.toLowerCase();
    return COMMAND_PRESETS.filter(
      (c) => c.cmd.toLowerCase().includes(lower) || c.label.toLowerCase().includes(lower)
    );
  }, [query]);

  // Filter Stock Results based on query
  const stockResults = useMemo(() => {
    if (!query.trim()) {
      return searchStocksFromIndex("", 10, "ALL");
    }
    return searchStocksFromIndex(query.trim(), 15, "ALL");
  }, [query]);

  const isCommandQuery = query.startsWith("/") || query.includes("매수") || query.includes("매도") || query.toLowerCase().includes("bot");

  const handleSelectStockItem = (item: SearchableStockItem) => {
    if (onSelectStock) {
      onSelectStock(item.symbol);
    } else {
      window.dispatchEvent(new CustomEvent("open-stock-search-modal", { detail: item.symbol }));
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleRunCommand = (cmdStr: string) => {
    if (onExecuteCommand) {
      onExecuteCommand(cmdStr);
    } else {
      if (cmdStr.includes("start")) {
        window.dispatchEvent(new CustomEvent("ai-bot-toggle-autotrading", { detail: true }));
      } else if (cmdStr.includes("stop")) {
        window.dispatchEvent(new CustomEvent("ai-bot-toggle-autotrading", { detail: false }));
      } else if (cmdStr.includes("predict")) {
        window.dispatchEvent(new CustomEvent("open-stock-search-modal"));
      } else {
        alert(`AI 봇 명령 실행 완료: [${cmdStr}]`);
      }
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isCommandQuery && matchingCommands.length > 0) {
        handleRunCommand(matchingCommands[0].cmd);
      } else if (stockResults.length > 0) {
        handleSelectStockItem(stockResults[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none flex items-center gap-1.5 text-cyan-500">
          {isCommandQuery ? (
            <Terminal className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Search className="w-4 h-4 text-cyan-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="🔍 종목 / 초성 / AI 봇 커맨드 통합 검색 (예: 삼성전자, ㅅㅅㅈㅈ, NVDA, BTC, /bot start)"
          className="w-full bg-slate-950/90 text-white text-xs sm:text-sm font-bold pl-10 pr-12 py-2.5 rounded-xl border border-cyan-500/50 hover:border-cyan-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/40 focus:outline-none transition shadow-inner placeholder:text-slate-500 font-sans"
        />

        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="absolute right-3 text-[10px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 font-mono rounded font-bold">
            ⌘K
          </span>
        )}
      </div>

      {/* Unified Autocomplete Overlay */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-[94vw] max-w-4xl sm:w-full sm:left-0 sm:right-0 sm:translate-x-0 mt-1.5 bg-slate-950 border-2 border-cyan-500/60 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-slate-100">
          {/* Quick Filter Header */}
          <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-bold">
            <span className="text-[11px] text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>통합 종목 검색 & AI 오토 커맨드 게이트웨이</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              [Enter] 실행 / [Esc] 닫기
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 font-sans">
            {/* 1. Bot Command Section (if user typed command or slash) */}
            {matchingCommands.length > 0 && (
              <div className="p-2 space-y-1">
                <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 block flex items-center gap-1 font-mono uppercase">
                  <Terminal className="w-3 h-3" /> AI 봇 직접 명령어 (Bot Actions)
                </span>
                {matchingCommands.slice(0, 4).map((c) => (
                  <button
                    key={c.cmd}
                    type="button"
                    onClick={() => handleRunCommand(c.cmd)}
                    className="w-full px-3 py-2 bg-slate-900/60 hover:bg-amber-950/40 text-left rounded-xl border border-slate-800 hover:border-amber-500/50 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-amber-300 group-hover:text-amber-200">
                        {c.cmd}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        {c.label}
                      </span>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* 2. Stock & Crypto Results Section */}
            <div className="p-2 space-y-1">
              <span className="text-[10px] text-cyan-400 font-bold px-2 py-0.5 block flex items-center gap-1 font-mono uppercase">
                <TrendingUp className="w-3 h-3" /> 실시간 종목 및 가상자산 시세 검색
              </span>

              {stockResults.length > 0 ? (
                stockResults.map((item) => {
                  const isCrypto = item.market === "BTC";
                  const isUs = item.market === "US";
                  const cur = isUs ? "$" : "₩";

                  return (
                    <button
                      key={`${item.market}-${item.symbol}`}
                      type="button"
                      onClick={() => handleSelectStockItem(item)}
                      className="w-full px-3 py-2 hover:bg-cyan-950/40 text-left rounded-xl transition cursor-pointer flex items-center justify-between group border border-transparent hover:border-cyan-500/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black shrink-0 ${
                            isCrypto
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : isUs
                              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {isCrypto ? "UPBIT" : item.market}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-xs text-white group-hover:text-cyan-200">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono ml-1.5">
                            ({item.symbol})
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <span className="text-xs font-black text-slate-100">
                          {cur}{(item.price || 0).toLocaleString()}
                        </span>
                        <span
                          className={`text-[10px] font-bold ml-2 ${
                            (item.changePct || 0) >= 0 ? "text-rose-400" : "text-blue-400"
                          }`}
                        >
                          {(item.changePct || 0) >= 0 ? "+" : ""}{item.changePct || 0}%
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  '{query}'에 대한 종목이나 명령어를 찾을 수 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
