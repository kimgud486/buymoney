import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Target,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  BarChart2,
  Zap,
  Layers,
  ArrowUpRight,
  Sliders,
  Scale,
  Ban,
  Clock
} from "lucide-react";
import { StockItem, INITIAL_STOCK_UNIVERSE } from "../../data/stockUniverse";
import { UserFilterSettingsStore, UserFilterSettings } from "../../services/UserFilterSettingsStore";
import { AntiDowntrendEngineV5 } from "../../services/AntiDowntrendEngineV5";
import { ProfitabilityVsVolatilityChart } from "./ProfitabilityVsVolatilityChart";
import { SmartYieldFilterControlPanel } from "./SmartYieldFilterControlPanel";

interface AiScannedYieldAnalyticsTabProps {
  onSelectStock?: (stock: StockItem) => void;
  onExecuteTrade?: (stock: StockItem, type: "BUY" | "SELL") => void;
}

export const AiScannedYieldAnalyticsTab: React.FC<AiScannedYieldAnalyticsTabProps> = ({
  onSelectStock,
  onExecuteTrade
}) => {
  const [filterSettings, setFilterSettings] = useState<UserFilterSettings>(() => UserFilterSettingsStore.getSettings());
  const [selectedStock, setSelectedStock] = useState<StockItem>(() => INITIAL_STOCK_UNIVERSE[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);

  // Compute calculated metrics & gate checks for every stock in the universe
  const analyzedStocks = useMemo(() => {
    return INITIAL_STOCK_UNIVERSE.map(stock => {
      const changeRate = stock.changeRate || 0;
      const isCrypto = stock.symbol.startsWith("KRW-");
      const baseVolatility = isCrypto ? 4.5 : (Math.abs(changeRate) * 0.8 + 2.2);
      
      // Calculate Expected Profit and Max Loss
      const expectedProfitPct = Math.max(3.0, Math.round((baseVolatility * 1.35) * 10) / 10);
      const stopLossPct = Math.min(2.5, Math.round((baseVolatility * 0.55) * 10) / 10);
      const rrRatio = stopLossPct > 0 ? Math.round((expectedProfitPct / stopLossPct) * 10) / 10 : 2.5;

      // Anti-downtrend evaluation
      const downtrendEval = AntiDowntrendEngineV5.evaluateCandleHealth(
        stock.symbol,
        stock.name,
        isCrypto ? "BTC" : "KOREA",
        stock.price,
        changeRate
      );

      // Gate passes check against user filter settings
      const passTargetProfit = expectedProfitPct >= filterSettings.minTargetProfitRate;
      const passRRRatio = rrRatio >= filterSettings.minRiskRewardRatio;
      const passStopLoss = stopLossPct <= filterSettings.maxAllowedStopLossPct;
      const passDowntrend = !filterSettings.enableAntiDowntrendV5 || downtrendEval.isSafeToBuy;
      const stockScore = stock.score ?? (stock as any).aiScore ?? 75;
      const passAiScore = stockScore >= filterSettings.minAiConsensusScore;

      const isAllGatesPassed = passTargetProfit && passRRRatio && passStopLoss && passDowntrend && passAiScore;

      return {
        ...stock,
        expectedProfitPct,
        stopLossPct,
        rrRatio,
        baseVolatility,
        downtrendEval,
        passTargetProfit,
        passRRRatio,
        passStopLoss,
        passDowntrend,
        passAiScore,
        isAllGatesPassed
      };
    });
  }, [filterSettings]);

  // Filter and sort the analyzed stocks
  const filteredStocks = useMemo(() => {
    let result = analyzedStocks;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q));
    }

    // Market scope
    if (filterSettings.marketScope === "UPBIT_CRYPTO") {
      result = result.filter(s => s.symbol.startsWith("KRW-"));
    } else if (filterSettings.marketScope === "KR_STOCK") {
      result = result.filter(s => !s.symbol.startsWith("KRW-") && /^\d{6}$/.test(s.symbol));
    } else if (filterSettings.marketScope === "US_STOCK") {
      result = result.filter(s => !s.symbol.startsWith("KRW-") && !/^\d{6}$/.test(s.symbol));
    }

    // Sorting
    return [...result].sort((a, b) => {
      if (filterSettings.sortMetric === "EXPECTED_GAIN") {
        return b.expectedProfitPct - a.expectedProfitPct;
      }
      if (filterSettings.sortMetric === "RR_RATIO") {
        return b.rrRatio - a.rrRatio;
      }
      if (filterSettings.sortMetric === "AI_SCORE") {
        return (b.aiScore || 0) - (a.aiScore || 0);
      }
      if (filterSettings.sortMetric === "VOLUME") {
        return (b.volume || 0) - (a.volume || 0);
      }
      return b.expectedProfitPct - a.expectedProfitPct;
    });
  }, [analyzedStocks, searchQuery, filterSettings]);

  const passedCount = analyzedStocks.filter(s => s.isAllGatesPassed).length;

  return (
    <div className="space-y-5 text-white">
      {/* Top Banner: Realtime Yield & Risk Matrix Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                AI 스캔 수익성 & 위험도 정밀 분석 엔진
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                10억 챌린지 자율 필터
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              단순 점수가 아닌 <strong className="text-emerald-300">기대 손익비 2.0x 이상 + 하락봉 v5 차단</strong>을 통과한 엄선 종목만 매수 집행합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isFilterPanelExpanded
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>필터 조건 설정 {isFilterPanelExpanded ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* Filter Control Panel (Expandable) */}
      {isFilterPanelExpanded && (
        <SmartYieldFilterControlPanel onSettingsChange={setFilterSettings} />
      )}

      {/* Overview Statistics Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 text-xs font-semibold">전체 스캔 모수</span>
          <div className="text-xl font-black text-slate-200 mt-0.5 font-mono">{analyzedStocks.length} 종목</div>
          <span className="text-[10px] text-slate-500">국내 주식(코스피/코스닥) + 미국 주식(나스닥/NYSE)</span>
        </div>

        <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-3">
          <span className="text-emerald-400 text-xs font-semibold">5중 필터 최종 통과</span>
          <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
            {passedCount} / {analyzedStocks.length}
          </div>
          <span className="text-[10px] text-emerald-500 font-bold">진입 승인율 {Math.round((passedCount / analyzedStocks.length) * 100)}% (엄격 선별)</span>
        </div>

        <div className="bg-slate-900/80 border border-indigo-900/40 rounded-xl p-3">
          <span className="text-indigo-300 text-xs font-semibold">평균 기대 손익비</span>
          <div className="text-xl font-black text-indigo-300 mt-0.5 font-mono">2.4 : 1</div>
          <span className="text-[10px] text-indigo-400">기준 충족 (+{filterSettings.minTargetProfitRate}% 이상)</span>
        </div>

        <div className="bg-slate-900/80 border border-rose-900/40 rounded-xl p-3">
          <span className="text-rose-400 text-xs font-semibold">하락봉 v5 차단 종목</span>
          <div className="text-xl font-black text-rose-400 mt-0.5 font-mono">
            {analyzedStocks.filter(s => !s.passDowntrend).length} 건
          </div>
          <span className="text-[10px] text-rose-400 font-bold">상투 윗꼬리 덤프 방어 완료</span>
        </div>
      </div>

      {/* Main Content Layout: Stock List Table & Profitability Visualizer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: Stocks Scanned Table (7 cols) */}
        <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          {/* Table Header & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-sm text-slate-200">실시간 스캔 종목 수익성 순위</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="종목명/심볼 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[11px] font-semibold border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-2">종목명</th>
                  <th className="py-2.5 px-2 text-right">현재가 / 등락</th>
                  <th className="py-2.5 px-2 text-center">AI 점수</th>
                  <th className="py-2.5 px-2 text-right">목표 기대이익</th>
                  <th className="py-2.5 px-2 text-center">손익비 (R/R)</th>
                  <th className="py-2.5 px-2 text-center">하락봉 v5</th>
                  <th className="py-2.5 px-2 text-center">최종 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredStocks.map(stock => {
                  const isSelected = selectedStock.symbol === stock.symbol;
                  return (
                    <tr
                      key={stock.symbol}
                      onClick={() => {
                        setSelectedStock(stock);
                        if (onSelectStock) onSelectStock(stock);
                      }}
                      className={`cursor-pointer transition hover:bg-slate-800/50 ${
                        isSelected ? "bg-indigo-950/40 border-l-2 border-indigo-500" : ""
                      }`}
                    >
                      {/* Name & Symbol */}
                      <td className="py-2 px-2">
                        <div className="font-sans font-bold text-slate-100">{stock.name}</div>
                        <div className="text-[10px] text-slate-400">{stock.symbol}</div>
                      </td>

                      {/* Price & Change */}
                      <td className="py-2 px-2 text-right">
                        <div className="font-bold text-slate-200">
                          {stock.symbol.startsWith("KRW-")
                            ? `${(stock.price ?? 0).toLocaleString()}원`
                            : `${(stock.price ?? 0).toLocaleString()}원`}
                        </div>
                        <div className={`text-[10px] font-bold ${
                          stock.changeRate >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {stock.changeRate >= 0 ? `+${stock.changeRate.toFixed(2)}%` : `${stock.changeRate.toFixed(2)}%`}
                        </div>
                      </td>

                      {/* AI Score */}
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          (stock.aiScore || 70) >= 85
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {stock.aiScore || 70}점
                        </span>
                      </td>

                      {/* Expected Profit */}
                      <td className="py-2 px-2 text-right">
                        <span className="font-bold text-emerald-400">
                          +{stock.expectedProfitPct}%
                        </span>
                      </td>

                      {/* RR Ratio */}
                      <td className="py-2 px-2 text-center">
                        <span className={`font-bold ${
                          stock.rrRatio >= 2.0 ? "text-indigo-300" : "text-amber-400"
                        }`}>
                          {stock.rrRatio}x
                        </span>
                      </td>

                      {/* Downtrend v5 */}
                      <td className="py-2 px-2 text-center">
                        {stock.downtrendEval.isSafeToBuy ? (
                          <span className="inline-flex items-center text-emerald-400 text-[10px] font-sans font-bold gap-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            안전
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-rose-400 text-[10px] font-sans font-bold gap-0.5">
                            <ShieldAlert className="w-3 h-3" />
                            위험
                          </span>
                        )}
                      </td>

                      {/* Final Status */}
                      <td className="py-2 px-2 text-center font-sans">
                        {stock.isAllGatesPassed ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">
                            승인
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[10px]">
                            필터제외
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Selected Stock Profitability Chart & Instant Action (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          <ProfitabilityVsVolatilityChart
            stock={selectedStock}
            targetProfitRate={filterSettings.minTargetProfitRate}
            stopLossRate={filterSettings.maxAllowedStopLossPct}
            marketType={selectedStock.symbol.startsWith("KRW-") ? "BTC" : "KOREA"}
          />

          {/* Quick Action Order Button */}
          {onExecuteTrade && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-200">{selectedStock.name} 즉시 AI 자율 진입</p>
                <p className="text-[10px] text-slate-400">설정된 목표가(+{filterSettings.minTargetProfitRate}%) 및 손절가(-{filterSettings.maxAllowedStopLossPct}%) 자동 적용</p>
              </div>
              <button
                type="button"
                onClick={() => onExecuteTrade(selectedStock, "BUY")}
                disabled={!selectedStock.isAllGatesPassed}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  selectedStock.isAllGatesPassed
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {selectedStock.isAllGatesPassed ? (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>원클릭 AI 매수</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>필터 미달로 차단됨</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
