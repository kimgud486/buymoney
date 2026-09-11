import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { TradeLog } from "../types";
import { AiTradeHistoryViewer } from "./trading/AiTradeHistoryViewer";
import { TradeVerificationModal } from "./trading/TradeVerificationModal";
import {
  ClipboardList,
  Search,
  X,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type LedgerAnalysis = {
  winRatePercent: number | null;
  evaluatedTradeCount: number;
  realizedPnl: number | null;
  totalCapitalTraded: number;
  aiComplianceScore: number | null;
  buyVsSellCount: { buy: number; sell: number };
  insightText: string;
  riskRecommendation: string;
  analyzedAt: string;
};

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function verifiedTradePnl(trade: TradeLog): number | null {
  const net = finiteNumber(trade.netProfit);
  if (net != null) return net;
  return finiteNumber(trade.pnl);
}

function displayMoney(value: number | null): string {
  if (value == null) return "NO_DATA";
  return `${value >= 0 ? "+" : "-"}₩${Math.abs(Math.round(value)).toLocaleString("ko-KR")}`;
}

export const TransactionHistory: React.FC = () => {
  const {
    profile,
    orders,
    trades,
    cancelOrder,
    syncRealAccountBalance,
    purgeAllMockData,
    addToast,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"AI_RATIONALE" | "TRADES" | "ORDERS">("AI_RATIONALE");
  const [marketFilter, setMarketFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerifyTrade, setSelectedVerifyTrade] = useState<TradeLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<LedgerAnalysis | null>(null);
  const [isSyncingBalance, setIsSyncingBalance] = useState(false);

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);

    const buyCount = trades.filter((t) => t.side === "BUY").length;
    const sellCount = trades.filter((t) => t.side === "SELL").length;
    const totalCapitalTraded = trades.reduce((sum, trade) => {
      const quantity = finiteNumber(trade.quantity);
      const price = finiteNumber(trade.price);
      if (quantity == null || price == null || quantity < 0 || price < 0) return sum;
      return sum + quantity * price;
    }, 0);

    const evaluated = trades
      .map((trade) => ({ trade, pnl: verifiedTradePnl(trade) }))
      .filter((row): row is { trade: TradeLog; pnl: number } => row.pnl != null);

    const wins = evaluated.filter((row) => row.pnl > 0).length;
    const winRatePercent = evaluated.length > 0 ? (wins / evaluated.length) * 100 : null;
    const realizedPnl = evaluated.length > 0 ? evaluated.reduce((sum, row) => sum + row.pnl, 0) : null;

    const insightText = evaluated.length > 0
      ? `총 ${trades.length}건의 체결 중 손익 값이 실제로 기록된 ${evaluated.length}건만 평가했습니다. 기록이 없는 체결은 승률 계산에서 제외했습니다.`
      : trades.length > 0
        ? `체결 ${trades.length}건은 확인됐지만 검증 가능한 pnl/netProfit 값이 없어 승률과 실현손익은 NO_DATA입니다.`
        : "체결 내역이 비어 있어 승률과 실현손익은 NO_DATA입니다.";

    setAiAnalysisResult({
      winRatePercent,
      evaluatedTradeCount: evaluated.length,
      realizedPnl,
      totalCapitalTraded,
      aiComplianceScore: null,
      buyVsSellCount: { buy: buyCount, sell: sellCount },
      insightText,
      riskRecommendation: "AI 알고리즘 준수율과 일일 손실한도 PASS 여부는 현재 원장 필드만으로 검증할 수 없어 NO_DATA로 표시합니다.",
      analyzedAt: new Date().toLocaleTimeString("ko-KR"),
    });

    setIsAnalyzing(false);
    addToast({
      type: "SUCCESS",
      title: "거래 원장 검증 분석 완료",
      message: evaluated.length > 0
        ? `손익이 기록된 ${evaluated.length}건만 승률 계산에 사용했습니다.`
        : "승률 계산에 사용할 검증 손익 데이터가 없어 NO_DATA로 유지합니다.",
    });
  };

  const handleSyncRealBalance = async () => {
    setIsSyncingBalance(true);
    try {
      const res = await syncRealAccountBalance("korea");
      const balance = finiteNumber(res?.balance);
      addToast({
        type: "SUCCESS",
        title: "KIS 잔고 동기화 응답 수신",
        message: balance != null
          ? `응답 잔고: ${balance.toLocaleString("ko-KR")} KRW`
          : "잔고 숫자가 검증되지 않아 NO_DATA입니다.",
      });
    } catch (e: any) {
      console.error(e);
      addToast({
        type: "ERROR",
        title: "잔고 동기화 실패",
        message: e?.message || "KIS 잔고 응답을 확인하지 못했습니다.",
      });
    } finally {
      setIsSyncingBalance(false);
    }
  };

  const handlePurgeMockTrades = async () => {
    try {
      await purgeAllMockData();
    } catch (e: any) {
      console.error(e);
      addToast({
        type: "ERROR",
        title: "초기화 실패",
        message: e?.message || "모의자산 및 거래내역 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  const handleExportCSV = () => {
    const dataToExport = activeSubTab === "TRADES" ? trades : orders;
    if (dataToExport.length === 0) {
      addToast({ type: "INFO", title: "내보내기 불가", message: "내보낼 데이터가 없습니다." });
      return;
    }

    const headers = activeSubTab === "TRADES"
      ? ["ID", "종목코드", "종목명", "시장", "구분", "수량", "단가", "수행전략", "매칭시간"]
      : ["ID", "종목코드", "종목명", "시장", "구분", "수량", "단가", "상태", "접수시간"];

    const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = dataToExport.map((item: any) => activeSubTab === "TRADES"
      ? [item.id, item.symbol, item.name, item.market, item.side, item.quantity, item.price, item.strategyName, item.timestamp]
      : [item.id, item.symbol, item.name, item.market, item.side, item.quantity, item.price, item.status, item.timestamp]);

    const csvContent = "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aistock_export_${activeSubTab.toLowerCase()}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filledCount = orders.filter((o) => o.status === "FILLED").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const canceledCount = orders.filter((o) => o.status === "CANCELED").length;

  const filteredTrades = useMemo(() => trades.filter((t) => {
    const matchesMarket = marketFilter === "ALL" || t.market === marketFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    return matchesMarket && matchesSearch;
  }), [trades, marketFilter, searchQuery]);

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const matchesMarket = marketFilter === "ALL" || o.market === marketFilter;
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || o.symbol.toLowerCase().includes(q) || o.name.toLowerCase().includes(q);
    return matchesMarket && matchesStatus && matchesSearch;
  }), [orders, marketFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5" id="transaction-history-terminal">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-black text-zinc-900">
            <ClipboardList className="h-5 w-5" /> 원장 및 체결 거래내역 관제
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            원장에 실제 기록된 주문·체결만 표시합니다. 현재 앱 잔고: {finiteNumber(profile?.balance) != null ? `₩${Number(profile?.balance).toLocaleString("ko-KR")}` : "NO_DATA"}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" /> 브로커 연결 상태를 확인하지 않고 LIVE라고 표시하지 않습니다.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSyncRealBalance} disabled={isSyncingBalance} className="flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingBalance ? "animate-spin" : ""}`} />
            {isSyncingBalance ? "잔고 확인 중" : "KIS 잔고 확인"}
          </button>
          <button type="button" onClick={handleRunAiAnalysis} disabled={isAnalyzing} className="flex items-center gap-1.5 rounded bg-indigo-700 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
            <Sparkles className="h-3.5 w-3.5" /> 원장 검증 분석
          </button>
          <button type="button" onClick={handleExportCSV} className="flex items-center gap-1 rounded border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button type="button" onClick={handlePurgeMockTrades} className="flex items-center gap-1 rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
            <XCircle className="h-3.5 w-3.5" /> 모의 데이터 삭제
          </button>
        </div>
      </div>

      {aiAnalysisResult && (
        <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-zinc-950 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-200">
              <Sparkles className="h-4 w-4" /> 거래 원장 검증 보고서
              <span className="font-mono text-[10px] text-zinc-500">{aiAnalysisResult.analyzedAt}</span>
            </div>
            <button type="button" onClick={() => setAiAnalysisResult(null)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
            <Metric label="승률" value={aiAnalysisResult.winRatePercent == null ? "NO_DATA" : `${aiAnalysisResult.winRatePercent.toFixed(1)}%`} />
            <Metric label="승률 평가 표본" value={`${aiAnalysisResult.evaluatedTradeCount}건`} />
            <Metric label="실현손익" value={displayMoney(aiAnalysisResult.realizedPnl)} />
            <Metric label="누적 거래대금" value={`₩${Math.round(aiAnalysisResult.totalCapitalTraded).toLocaleString("ko-KR")}`} />
            <Metric label="AI 준수율" value="NO_DATA" />
          </div>

          <p className="rounded border border-zinc-800 bg-zinc-900 p-3 text-xs leading-5 text-zinc-300">{aiAnalysisResult.insightText}</p>
          <p className="text-[11px] leading-5 text-amber-300">{aiAnalysisResult.riskRecommendation}</p>
          <div className="text-[10px] text-zinc-500">매수 {aiAnalysisResult.buyVsSellCount.buy}건 · 매도 {aiAnalysisResult.buyVsSellCount.sell}건</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <SummaryCard label="누적 체결 건수" value={`${trades.length}건`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <SummaryCard label="미체결 대기" value={`${pendingCount}건`} icon={<Clock className="h-4 w-4" />} />
        <SummaryCard label="체결완료 주문" value={`${filledCount}건`} />
        <SummaryCard label="취소 주문" value={`${canceledCount}건`} icon={<XCircle className="h-4 w-4" />} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs lg:flex-row">
        <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {[
            ["AI_RATIONALE", "AI 근거 뷰어"],
            ["TRADES", `체결 원장 (${trades.length})`],
            ["ORDERS", `주문 관리 (${orders.length})`],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActiveSubTab(id as typeof activeSubTab)} className={`rounded px-3 py-1.5 font-bold ${activeSubTab === id ? "bg-zinc-950 text-white" : "text-zinc-600"}`}>{label}</button>
          ))}
        </div>

        {activeSubTab === "ORDERS" && (
          <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
            {["ALL", "PENDING", "FILLED", "CANCELED"].map((id) => (
              <button key={id} type="button" onClick={() => setStatusFilter(id)} className={`rounded px-2.5 py-1 font-bold ${statusFilter === id ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>{id}</button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          <span className="flex items-center px-1.5 text-zinc-400"><Filter className="mr-1 h-3 w-3" />자산</span>
          {["ALL", "KOREA", "US", "BTC"].map((id) => (
            <button key={id} type="button" onClick={() => setMarketFilter(id)} className={`rounded px-2.5 py-1 font-bold ${marketFilter === id ? "bg-zinc-900 text-white" : "text-zinc-600"}`}>{id}</button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="종목명 또는 심볼 검색" className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 outline-none" />
        </div>
      </div>

      <TradeVerificationModal trade={selectedVerifyTrade} isOpen={Boolean(selectedVerifyTrade)} onClose={() => setSelectedVerifyTrade(null)} />

      {activeSubTab === "AI_RATIONALE" ? (
        <AiTradeHistoryViewer trades={trades} />
      ) : activeSubTab === "TRADES" ? (
        <TradesTable trades={filteredTrades} onVerify={setSelectedVerifyTrade} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="border-b border-zinc-200 bg-zinc-100 text-[10px] font-bold uppercase text-zinc-500">
              <tr><th className="p-3">접수시간</th><th className="p-3">구분</th><th className="p-3">종목</th><th className="p-3">주문단가</th><th className="p-3">수량</th><th className="p-3">상태</th><th className="p-3">전략</th><th className="p-3 text-right">제어</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-zinc-400">접수된 주문이 없습니다.</td></tr> : filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 font-mono text-zinc-400">{new Date(o.timestamp).toLocaleString("ko-KR")}</td>
                  <td className="p-3 font-bold">{o.side === "BUY" ? "매수" : "매도"}</td>
                  <td className="p-3"><div className="font-bold text-zinc-900">{o.name}</div><div className="font-mono text-[10px] text-zinc-400">{o.symbol} · {o.market}</div></td>
                  <td className="p-3 font-mono font-bold">{finiteNumber(o.price) == null ? "NO_DATA" : Number(o.price).toLocaleString("ko-KR")}</td>
                  <td className="p-3 font-mono">{finiteNumber(o.quantity) == null ? "NO_DATA" : Number(o.quantity).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                  <td className="p-3 font-bold">{o.status}</td>
                  <td className="p-3 text-[10px]">{o.strategyName || "NO_DATA"}</td>
                  <td className="p-3 text-right">
                    {o.status === "PENDING" ? (
                      <button type="button" onClick={() => cancelOrder(o.id)} className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">주문 취소</button>
                    ) : <span className="text-zinc-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">내부 `fillOrder` 즉시체결 버튼은 제거했습니다. 실제 체결은 브로커 승인 흐름에서만 확인해야 합니다.</div>
        </div>
      )}
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-zinc-800 bg-zinc-900 p-2.5"><span className="block text-[10px] text-zinc-500">{label}</span><strong className="mt-1 block text-sm text-white">{value}</strong></div>;
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"><span className="block text-[10px] text-zinc-400">{label}</span><div className="mt-1 flex items-center gap-1.5 text-base font-black text-zinc-900">{icon}{value}</div></div>;
}

function TradesTable({ trades, onVerify }: { trades: TradeLog[]; onVerify: (trade: TradeLog) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full text-left text-xs text-zinc-600">
        <thead className="border-b border-zinc-200 bg-zinc-100 text-[10px] font-bold uppercase text-zinc-500">
          <tr><th className="p-3">체결시간</th><th className="p-3">구분</th><th className="p-3">종목</th><th className="p-3">체결단가</th><th className="p-3">수량</th><th className="p-3">손익</th><th className="p-3">원장 상태</th><th className="p-3 text-right">검증</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {trades.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-zinc-400">일치하는 체결 내역이 없습니다.</td></tr> : trades.map((t) => {
            const pnl = verifiedTradePnl(t);
            const isReal = t.isRealTrade === true || t.executionType === "REAL_BROKER";
            return (
              <tr key={t.id} className="cursor-pointer hover:bg-zinc-50" onClick={() => onVerify(t)}>
                <td className="p-3 font-mono text-zinc-400">{new Date(t.timestamp).toLocaleString("ko-KR")}</td>
                <td className="p-3 font-bold">{t.side === "BUY" ? "매수" : "매도"}</td>
                <td className="p-3"><div className="font-bold text-zinc-900">{t.name}</div><div className="font-mono text-[10px] text-zinc-400">{t.symbol} · {t.market}</div></td>
                <td className="p-3 font-mono font-bold">{finiteNumber(t.price) == null ? "NO_DATA" : Number(t.price).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                <td className="p-3 font-mono">{finiteNumber(t.quantity) == null ? "NO_DATA" : Number(t.quantity).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}</td>
                <td className={`p-3 font-mono font-black ${pnl == null ? "text-zinc-400" : pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{displayMoney(pnl)}</td>
                <td className="p-3"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${isReal ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{isReal ? "REAL_BROKER" : t.executionType || "NO_DATA"}</span></td>
                <td className="p-3 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); onVerify(t); }} className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-white"><ShieldCheck className="h-3 w-3 text-emerald-400" />검증 확인서</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
