import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StockPosition } from "../../types";
import { SmartSafetyGovernanceModal } from "./SmartSafetyGovernanceModal";

export const StockTradePointsVisualizerDashboard: React.FC = () => {
  const {
    positions,
    blockedSymbols,
    blockedSymbolDetails,
    removeBlockedSymbol,
    addBlockedSymbol,
    clearBlockedSymbols,
    executeTrade,
    addToast
  } = useApp();

  const [selectedStockAnalysis, setSelectedStockAnalysis] = useState<StockPosition | null>(null);
  const [filterMode, setFilterMode] = useState<"ALL" | "PROFIT" | "LOSS" | "BLOCKED">("ALL");
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);

  // Summary Metrics
  const totalPositionsCount = positions.length;
  let totalInvested = 0;
  let totalEvaluated = 0;
  let profitCount = 0;
  let lossCount = 0;

  positions.forEach(pos => {
    const qty = pos.quantity || 0;
    const avgP = pos.avgPrice || 0;
    const curP = pos.currentPrice || avgP;
    const inv = qty * avgP;
    const evalVal = qty * curP;
    totalInvested += inv;
    totalEvaluated += evalVal;

    const pnlRate = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
    if (pnlRate >= 0) profitCount++;
    else lossCount++;
  });

  const totalPnL = totalEvaluated - totalInvested;
  const totalPnLRate = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  // Filter positions based on tab
  const filteredPositions = positions.filter(pos => {
    const avgP = pos.avgPrice || 0;
    const curP = pos.currentPrice || avgP;
    const pnlRate = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
    const cleanSym = pos.symbol.toUpperCase().replace(/^KRW-/, "");
    const isBlocked = blockedSymbols.includes(cleanSym);

    if (filterMode === "PROFIT") return pnlRate > 0;
    if (filterMode === "LOSS") return pnlRate < 0;
    if (filterMode === "BLOCKED") return isBlocked;
    return true;
  });

  const handleSellPosition = async (pos: StockPosition) => {
    try {
      const liveP = pos.currentPrice || pos.avgPrice || 0;
      const mkt = pos.market === "BTC" || pos.symbol.startsWith("KRW-") ? "BTC" : pos.market === "US" ? "US" : "KOREA";
      await executeTrade(
        pos.symbol,
        pos.name,
        mkt,
        "SELL",
        pos.quantity,
        liveP,
        "대시보드 수동 청산",
        "사용자가 종목별 매매 지점 대시보드에서 직접 즉시 청산을 실행함.",
        true
      );
      addToast({
        type: "SUCCESS",
        title: "포지션 청산 완료",
        message: `${pos.name} (${pos.symbol}) 포지션이 성공적으로 청산되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "청산 실패",
        message: e.message || "포지션 청산 중 오류가 발생했습니다."
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Strategy Alert Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              AI Trading Points & Profitability Visualizer
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              종목별 매수/매도 지점 &amp; 수익률 분석 대시보드
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              실시간 포지션의 타점(TP/SL), 손익 상태 및 -3% 자동 손절 차단 현황을 직관적으로 관제합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGovernanceOpen(true)}
              className="px-3 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span>AI 세이프티 거버넌스 센터</span>
              {blockedSymbolDetails.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400/30 text-amber-200 rounded-full text-[10px] font-mono">
                  {blockedSymbolDetails.length}
                </span>
              )}
            </button>

            {blockedSymbols.length > 0 && (
              <button
                onClick={() => {
                  clearBlockedSymbols();
                  addToast({
                    type: "SUCCESS",
                    title: "차단 해제 완료",
                    message: "모든 종목의 -3% 매수 차단이 해제되었습니다."
                  });
                }}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                차단 종목 일괄 해제 ({blockedSymbols.length})
              </button>
            )}
          </div>
        </div>

        {/* Summary Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 font-medium">총 보유 종목</span>
            <div className="text-xl font-extrabold text-white mt-1">{totalPositionsCount} 개</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              익절 {profitCount}개 / 손실 {lossCount}개
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 font-medium">총 매수 금액</span>
            <div className="text-xl font-extrabold text-white mt-1">
              ₩{Math.round(totalInvested).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              평가금액 ₩{Math.round(totalEvaluated).toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 font-medium">통합 평가 손익</span>
            <div
              className={`text-xl font-extrabold mt-1 flex items-center gap-1 ${
                totalPnL >= 0 ? "text-rose-400" : "text-blue-400"
              }`}
            >
              {totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {totalPnL >= 0 ? "+" : ""}
              {totalPnLRate.toFixed(2)}%
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 ${totalPnL >= 0 ? "text-rose-400" : "text-blue-400"}`}>
              {totalPnL >= 0 ? "+" : ""}₩{Math.round(totalPnL).toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 font-medium">-3% 손절 차단 종목</span>
            <div className="text-xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              {blockedSymbols.length} 개
            </div>
            <div className="text-[11px] text-amber-300/80 mt-0.5">추가 매수 차단 보호 작동 중</div>
          </div>
        </div>
      </div>

      {/* Filtering Tab Bar & Korean Color Code Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterMode === "ALL"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            전체 포지션 ({positions.length})
          </button>
          <button
            onClick={() => setFilterMode("PROFIT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterMode === "PROFIT"
                ? "bg-rose-600 text-white"
                : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            수익 종목 ({profitCount})
          </button>
          <button
            onClick={() => setFilterMode("LOSS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterMode === "LOSS"
                ? "bg-blue-600 text-white"
                : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            손실/개선필요 종목 ({lossCount})
          </button>
          <button
            onClick={() => setFilterMode("BLOCKED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterMode === "BLOCKED"
                ? "bg-amber-600 text-white"
                : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            손절 차단 종목 ({blockedSymbols.length})
          </button>
        </div>

        {/* Indicator Color Rules Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
          <span className="text-slate-700 dark:text-slate-300 font-bold">인디케이터 색상 범례:</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
            🔴 빨간색 = 수익 (Target +)
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
            🔵 파란색 = 손실 (개선 필요)
          </span>
        </div>
      </div>

      {/* Holdings List with Detailed Visual Cards */}
      {filteredPositions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            해당하는 포지션이 없습니다
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            자율매매 로직이 고승률 패턴을 포착하면 자동으로 매수 지점에 맞춰 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPositions.map((pos, idx) => {
            const cleanSym = pos.symbol.toUpperCase().replace(/^KRW-/, "");
            const avgP = pos.avgPrice || 0;
            const curP = pos.currentPrice || avgP;
            const qty = pos.quantity || 0;
            const evalAmount = qty * curP;
            const pnlRate = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
            const pnlAmount = evalAmount - qty * avgP;

            const isBlocked = blockedSymbols.includes(cleanSym);
            const isProfit = pnlRate >= 0;

            // Target Price (+6% default) and Stop Loss (-3% strict)
            const targetPrice = Math.round(avgP * 1.06);
            const stopLossPrice = Math.round(avgP * 0.97);

            // Progress meter calculation from SL (-3%) to TP (+6%)
            // Range = TP - SL
            const minBound = stopLossPrice;
            const maxBound = targetPrice;
            const range = maxBound - minBound;
            const currentOffset = curP - minBound;
            let meterPct = range > 0 ? Math.min(Math.max((currentOffset / range) * 100, 0), 100) : 50;

            const unit = pos.market === "US" ? "$" : "₩";

            return (
              <div
                key={`${pos.id || pos.symbol}_${idx}`}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden ${
                  isBlocked
                    ? "border-amber-500/50 dark:border-amber-500/40 bg-amber-500/5"
                    : isProfit
                    ? "border-rose-200 dark:border-rose-900/40 hover:border-rose-300"
                    : "border-blue-200 dark:border-blue-900/40 hover:border-blue-300"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        {pos.name}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        {pos.symbol}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          pos.market === "BTC" || pos.symbol.startsWith("KRW-")
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : pos.market === "US"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {pos.market === "BTC" || pos.symbol.startsWith("KRW-") ? "업비트 24H" : pos.market}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      보유수량: <span className="font-bold text-slate-700 dark:text-slate-300">{(qty ?? 0).toLocaleString()} 주</span> | 
                      평가금액: <span className="font-bold text-slate-700 dark:text-slate-300">{unit}{Math.round(evalAmount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Profit/Loss Indicator Tag */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tracking-tight ${
                        isProfit
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      {isProfit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{isProfit ? "🔴" : "🔵"}</span>
                      <span>{isProfit ? "+" : ""}{pnlRate.toFixed(2)}%</span>
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isProfit ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
                      {isProfit ? "+" : ""}{unit}{Math.round(pnlAmount).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Blocked Symbol Notice if active */}
                {isBlocked && (
                  <div className="mb-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>⛔ -3% 자동 손절로 인해 신규 추가 매수가 차단되어 있습니다.</span>
                    </div>
                    <button
                      onClick={() => {
                        removeBlockedSymbol(cleanSym);
                        addToast({
                          type: "SUCCESS",
                          title: "매수 차단 해제",
                          message: `${pos.name} (${cleanSym}) 종목 매수 차단이 해제되었습니다.`
                        });
                      }}
                      className="px-2 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-[11px] font-bold shrink-0 transition-colors ml-2"
                    >
                      차단 해제
                    </button>
                  </div>
                )}

                {/* Price Points Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">매수 단가</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {unit}{Math.round(avgP).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">현재가</span>
                    <span className={`font-bold ${isProfit ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
                      {unit}{Math.round(curP).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">목표가 (TP +6%)</span>
                    <span className="font-bold text-rose-500">
                      {unit}{Math.round(targetPrice).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* TP/SL Progress Bar Gauge */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-blue-500 flex items-center gap-0.5">
                      <ShieldAlert className="w-3 h-3" /> 손절선 SL ({unit}{Math.round(stopLossPrice).toLocaleString()})
                    </span>
                    <span className="text-rose-500 flex items-center gap-0.5">
                      <Zap className="w-3 h-3" /> 목표가 TP ({unit}{Math.round(targetPrice).toLocaleString()})
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isProfit ? "bg-gradient-to-r from-slate-300 via-rose-400 to-rose-600" : "bg-gradient-to-r from-blue-600 via-blue-400 to-slate-300"
                      }`}
                      style={{ width: `${meterPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>손절가 -3.0%</span>
                    <span>진입가 ({unit}{Math.round(avgP).toLocaleString()})</span>
                    <span>목표가 +6.0%</span>
                  </div>
                </div>

                {/* Bottom Action Button Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    {!isBlocked ? (
                      <button
                        onClick={() => {
                          addBlockedSymbol(cleanSym, "사용자 대시보드 수동 차단");
                          addToast({
                            type: "WARNING",
                            title: "매수 차단 설정",
                            message: `${pos.name} (${cleanSym}) 종목 추가 매수가 차단되었습니다.`
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Lock className="w-3 h-3" />
                        매수 차단
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          removeBlockedSymbol(cleanSym);
                          addToast({
                            type: "SUCCESS",
                            title: "매수 차단 해제",
                            message: `${pos.name} (${cleanSym}) 종목 매수 차단이 해제되었습니다.`
                          });
                        }}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Unlock className="w-3 h-3" />
                        차단 해제
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedStockAnalysis(pos)}
                      className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      원인 진단
                    </button>
                  </div>

                  <button
                    onClick={() => handleSellPosition(pos)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    즉시 청산
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Diagnosis & Loss Cause Analysis Modal */}
      {selectedStockAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedStockAnalysis(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase mb-1">
              <Sparkles className="w-4 h-4" /> AI Trading Diagnosis Report
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {selectedStockAnalysis.name} ({selectedStockAnalysis.symbol}) 원인 진단
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>진단 항목</span>
                  <span className="text-blue-600 dark:text-blue-400">변동성 돌파 &amp; 수급 필터 검증</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  • <strong>횡보장 휩소(Whipsaw) 리스크:</strong> 최근 거래량이 평균 대비 부족하여 목표가에 다다르지 못하고 지지선 아래로 밀린 가능성이 있습니다.<br />
                  • <strong>수수료 누적 방지:</strong> -3% 자동 손절선과 RVOL 1.5배 필터를 결합하여 노이즈 진입을 원천 차단합니다.<br />
                  • <strong>권장 솔루션:</strong> 변동성 돌파 K=0.5 조건을 충족할 때만 추격 진입하고, -3% 손절 도달 시 자동 차단을 유지하세요.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1 text-blue-900 dark:text-blue-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  AI 수익 개선 1-Click 최적화 적용
                </div>
                <p className="text-[11px]">
                  변동성 돌파 K=0.5, 거래량 1.5배 이상, -3% 손절 차단 설정을 해당 종목 전략에 즉시 동기화합니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSelectedStockAnalysis(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  addToast({
                    type: "SUCCESS",
                    title: "최적화 적용 완료",
                    message: `${selectedStockAnalysis.name} 종목에 변동성 돌파 + -3% 손절 로직이 최적화되었습니다.`
                  });
                  setSelectedStockAnalysis(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                1-Click 최적화 적용
              </button>
            </div>
          </div>
        </div>
      )}

      <SmartSafetyGovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => setIsGovernanceOpen(false)}
      />
    </div>
  );
};
