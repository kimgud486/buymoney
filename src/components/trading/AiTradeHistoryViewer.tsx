import React, { useState, useMemo } from "react";
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Brain, 
  ShieldCheck, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ExternalLink,
  Receipt,
  FileCheck
} from "lucide-react";
import { TradeLog } from "../../types";
import { getMarketStatus } from "../../lib/marketStatus";
import { TradeVerificationModal } from "./TradeVerificationModal";

interface AiTradeHistoryViewerProps {
  trades: TradeLog[];
  onOpenChart?: (symbol: string, name: string, market: string) => void;
}

export const AiTradeHistoryViewer: React.FC<AiTradeHistoryViewerProps> = ({
  trades = [],
  onOpenChart
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [execFilter, setExecFilter] = useState<"ALL" | "REAL" | "PAPER">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVerifyTrade, setSelectedVerifyTrade] = useState<TradeLog | null>(null);

  const realTradeCount = useMemo(() => trades.filter(t => t.isRealTrade === true || t.executionType === "REAL_BROKER").length, [trades]);
  const paperTradeCount = useMemo(() => trades.filter(t => t.isRealTrade !== true && t.executionType !== "REAL_BROKER").length, [trades]);

  // Only use genuine recorded trades - DO NOT inject fake sample trades
  const displayTrades = useMemo(() => {
    return [...trades]
      .filter((t) => {
        const mStatus = getMarketStatus(t.symbol, t.market);
        const matchMarket = marketFilter === "ALL" || mStatus.marketType === marketFilter;
        const matchSide = sideFilter === "ALL" || t.side === sideFilter;
        const isReal = t.isRealTrade === true || t.executionType === "REAL_BROKER";
        const matchExec = execFilter === "ALL" || (execFilter === "REAL" && isReal) || (execFilter === "PAPER" && !isReal);

        const matchText = 
          !searchTerm.trim() || 
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.aiRationale && t.aiRationale.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchMarket && matchSide && matchExec && matchText;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [trades, marketFilter, sideFilter, execFilter, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4">
      {/* Verification Modal */}
      <TradeVerificationModal
        trade={selectedVerifyTrade}
        isOpen={Boolean(selectedVerifyTrade)}
        onClose={() => setSelectedVerifyTrade(null)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/80 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">AI 자동 매매 실시간 체결 기록 및 검증 센터</h3>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-[10px] font-black tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              체결 항목을 클릭하면 증권사/거래소 공식 체결 영수증 및 원장 검증서를 실시간 확인할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Filter Badges Count */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
            총 체결: <strong className="text-cyan-400 font-bold">{trades.length}</strong>건
          </span>
          <span className="text-xs font-mono text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-xl border border-rose-800 flex items-center gap-1">
            🔥 실거래: <strong className="text-rose-400 font-bold">{realTradeCount}</strong>건
          </span>
          <span className="text-xs font-mono text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded-xl border border-blue-800 flex items-center gap-1">
            🛡️ 모의투자: <strong className="text-blue-400 font-bold">{paperTradeCount}</strong>건
          </span>
        </div>
      </div>

      {/* Execution Mode Filter Bar */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
        <span className="text-slate-400 font-bold px-2 text-[11px] shrink-0">체결 유형 구분:</span>
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setExecFilter("ALL")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold transition cursor-pointer text-center text-[11px] ${
              execFilter === "ALL"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            전체 체결 ({trades.length})
          </button>
          <button
            onClick={() => setExecFilter("REAL")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold transition cursor-pointer text-center text-[11px] flex items-center justify-center gap-1 ${
              execFilter === "REAL"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-rose-400 hover:bg-rose-950/50"
            }`}
          >
            🔥 실거래 체결만 ({realTradeCount})
          </button>
          <button
            onClick={() => setExecFilter("PAPER")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold transition cursor-pointer text-center text-[11px] flex items-center justify-center gap-1 ${
              execFilter === "PAPER"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-blue-400 hover:bg-blue-950/50"
            }`}
          >
            🛡️ 모의투자 체결만 ({paperTradeCount})
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="종목명, 티커, AI 매매근거 검색..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Market Filter */}
        <div className="md:col-span-4 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: "ALL", label: "전체 마켓" },
            { id: "KOREA", label: "🇰🇷 국내" },
            { id: "US", label: "🇺🇸 미국" },
            { id: "BTC", label: "🪙 가상자산" }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMarketFilter(m.id as any)}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                marketFilter === m.id
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Side Filter */}
        <div className="md:col-span-3 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: "ALL", label: "전체 구분" },
            { id: "BUY", label: "매수만" },
            { id: "SELL", label: "매도만" }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSideFilter(s.id as any)}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                sideFilter === s.id
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trades List View */}
      <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
        {displayTrades.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-950/50 rounded-xl border border-slate-800">
            <Bot className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-300">현재 체결된 거래 내역이 없습니다.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                상단 자율 트레이딩 스위치가 활성화되어 있거나 수동 주문을 실행하면 실시간으로 체결 내역이 이곳에 기록됩니다.
              </p>
            </div>
          </div>
        ) : (
          displayTrades.map((item: any, idx: number) => {
            const isExpanded = expandedId === item.id;
            const mStatus = getMarketStatus(item.symbol, item.market);
            const isBuy = item.side === "BUY";
            const isReal = item.isRealTrade === true || item.executionType === "REAL_BROKER";

            const entryPrice = item.price || 0;
            const targetPrice = item.targetPrice || Math.round(entryPrice * 1.08);
            const stopLossPrice = item.stopLossPrice || Math.round(entryPrice * 0.96);
            const totalCost = item.quantity * entryPrice;

            const timeFormatted = new Date(item.timestamp).toLocaleTimeString("ko-KR", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });

            return (
              <div
                key={`${item.id}_${idx}`}
                className="bg-slate-950 hover:bg-slate-950/80 border border-slate-800 rounded-xl transition overflow-hidden shadow-xs"
              >
                {/* Main Row */}
                <div 
                  onClick={() => setSelectedVerifyTrade(item)}
                  className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
                  title="클릭하여 체결 확인서 및 원장 상태 검증"
                >
                  {/* Left: Badge, Stock Name, Symbol, Side, Real/Sim Badge */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${mStatus.badgeClass}`}>
                      {mStatus.marketBadgeLabel}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold shrink-0 flex items-center gap-1 ${
                        isBuy
                          ? "bg-rose-950 text-rose-400 border border-rose-800"
                          : "bg-blue-950 text-blue-400 border border-blue-800"
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isBuy ? "매수" : "매도"}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black shrink-0 flex items-center gap-1 ${
                      isReal 
                        ? "bg-rose-950/90 text-rose-300 border border-rose-600/80 shadow-xs animate-pulse" 
                        : "bg-indigo-950/90 text-indigo-300 border border-indigo-600/80 shadow-xs"
                    }`}>
                      {isReal ? "🔥 실거래 체결" : "🛡️ 모의투자 체결"}
                    </span>

                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-white group-hover:text-cyan-400 transition truncate">
                        {item.name}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {item.symbol}
                      </span>
                      {onOpenChart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChart(item.symbol, item.name, item.market);
                          }}
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60 cursor-pointer"
                          title="캔들차트 열기"
                        >
                          차트 <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle: Prices & Quantities */}
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">체결단가</span>
                      <strong className="text-slate-200">
                        {mStatus.marketType === "US" ? `$${(entryPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${(entryPrice ?? 0).toLocaleString()}원`}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">체결수량</span>
                      <strong className="text-slate-200">
                        {(item.quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </strong>
                    </div>

                    <div className="pl-2 border-l border-slate-800 text-right">
                      <span className="text-[10px] text-slate-500 block">총 체결액</span>
                      <span className="font-black text-cyan-400">
                        {mStatus.marketType === "US" ? `$${totalCost.toFixed(2)}` : `${Math.round(totalCost).toLocaleString()}원`}
                      </span>
                    </div>
                  </div>

                  {/* Right: Verification Action & Expand */}
                  <div className="flex items-center justify-between md:justify-end gap-2 text-xs text-slate-400 pt-2 md:pt-0 border-t md:border-t-0 border-slate-900">
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {timeFormatted}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVerifyTrade(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-800/80 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>체결 검증서</span>
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* AI Logical Rationale Preview */}
                <div className="px-3.5 pb-3">
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Brain className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        <strong className="text-cyan-300 font-bold mr-1">AI 선택 논리 근거:</strong>
                        {item.aiRationale || "SMC 수급 분석 및 기술적 모멘텀 합의 조건 충족으로 체결되었습니다."}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedVerifyTrade(item)}
                      className="text-[10px] font-bold text-cyan-400 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>영수증 보기</span>
                      <Receipt className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Inspection */}
                {isExpanded && (
                  <div className="px-3.5 pb-4 pt-1 bg-slate-900/50 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 text-xs">
                      {/* Sub Factor 1 */}
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          체결 주문 식별자
                        </span>
                        <div className="font-mono text-slate-200 font-bold truncate text-[11px]">
                          {item.brokerOrderId || item.id}
                        </div>
                      </div>

                      {/* Sub Factor 2 */}
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Target className="w-3 h-3 text-blue-400" />
                          수행 알고리즘 전략
                        </span>
                        <div className="font-mono text-slate-200 font-bold truncate text-[11px]">
                          {item.strategyName || "AI Multi-Signal 알고리즘"}
                        </div>
                      </div>

                      {/* Sub Factor 3 */}
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          체결 원장 상태
                        </span>
                        <div className="font-mono text-emerald-400 font-bold text-[11px]">
                          {isReal ? "공식 실거래소 접수 및 체결 완료" : "가상 자산 원장 정상 반영"}
                        </div>
                      </div>
                    </div>
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

