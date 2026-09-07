import React, { useState } from "react";
import {
  Target,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Activity,
  RefreshCw,
  Clock,
  Layers,
  BarChart2,
  SlidersHorizontal
} from "lucide-react";
import { JarvisPositionAiResult } from "../../services/DynamicPositionEngine";

interface JarvisPositionAiPanelProps {
  positionAi: JarvisPositionAiResult;
  isWhiteTheme?: boolean;
  formatPrice: (p: number) => string;
}

export const JarvisPositionAiPanel: React.FC<JarvisPositionAiPanelProps> = ({
  positionAi,
  isWhiteTheme = false,
  formatPrice,
}) => {
  const [activeTab, setActiveTab] = useState<"EXIT" | "PREDICTIVE_BUY" | "FORECAST_PATH">("EXIT");

  const {
    entryPrice,
    currentPrice,
    initialStopPrice,
    currentStopPrice,
    isTrailingActive,
    pnlPct,
    target1,
    target2,
    target3,
    target1Reached,
    target2Reached,
    target3Reached,
    buyScore,
    sellScore,
    state,
    stateLabel,
    operatingMode,
    operatingModeLabel,
    partialSellRatio,
    sellFactors,
    rValue,
    predictiveBuy,
    forecastPath,
    forecastTrend,
    forecastTrendLabel,
    reForecastLog,
  } = positionAi;

  const isProfit = pnlPct >= 0;

  // Color theme variables
  const cardBg = isWhiteTheme
    ? "bg-white border-zinc-200 text-zinc-900 shadow-sm"
    : "bg-gradient-to-b from-zinc-900/95 to-zinc-950 border-zinc-800/80 text-zinc-100 shadow-xl backdrop-blur-md";

  const subCardBg = isWhiteTheme
    ? "bg-zinc-50 border-zinc-200/80"
    : "bg-zinc-900/60 border-zinc-800/60";

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${cardBg}`}>
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/60 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-wide text-zinc-100 flex items-center gap-1.5">
                JARVIS POSITION & PREDICTIVE AI
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-emerald-400 font-bold">
                  v8.0 Adaptive
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1">
              <span>Predictive BUY + Adaptive Exit + 매 봉 AI 미래 궤적 재예측</span>
            </p>
          </div>
        </div>

        {/* Status Badges & Navigation */}
        <div className="flex items-center gap-2">
          {/* Real-time Re-forecast Ticker */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/60 text-[10px] text-zinc-300 font-mono">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            <span className="truncate max-w-[200px]">{reForecastLog}</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 font-mono ${
              operatingMode === "TREND_RUNNER"
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : operatingMode === "BALANCED"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                : "bg-amber-500/15 border-amber-500/40 text-amber-400"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{operatingModeLabel}</span>
          </div>
        </div>
      </div>

      {/* Mode Sub-Tab Bar */}
      <div className="flex items-center gap-1.5 mb-3 p-1 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs">
        <button
          onClick={() => setActiveTab("EXIT")}
          className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "EXIT"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Adaptive Exit & Trailing (손익 관리)</span>
        </button>

        <button
          onClick={() => setActiveTab("PREDICTIVE_BUY")}
          className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "PREDICTIVE_BUY"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Predictive BUY AI (진입 예측)</span>
        </button>

        <button
          onClick={() => setActiveTab("FORECAST_PATH")}
          className={`flex-1 py-1.5 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "FORECAST_PATH"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>AI 미래 예상 궤적 ({forecastPath.length}Point)</span>
        </button>
      </div>

      {/* TAB 1: ADAPTIVE EXIT & TRAILING STOP */}
      {activeTab === "EXIT" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Column 1: Entry & Dynamic Trailing Stop */}
          <div className={`p-3 rounded-lg border ${subCardBg} flex flex-col justify-between`}>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>진입 & 손절 구조 (Entry & Stop)</span>
                <span className="text-[10px] text-zinc-500 font-mono">1R = {formatPrice(rValue)}</span>
              </div>

              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-zinc-800/40">
                  <span className="text-zinc-400 font-sans">ENTRY (진입가)</span>
                  <span className="font-bold text-zinc-200">{formatPrice(entryPrice)}</span>
                </div>

                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-zinc-800/40">
                  <span className="text-zinc-400 font-sans">INITIAL STOP</span>
                  <span className="text-zinc-400 line-through text-[11px]">
                    {formatPrice(initialStopPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs p-1.5 rounded bg-rose-500/10 border border-rose-500/30">
                  <span className="text-rose-300 font-sans font-bold flex items-center gap-1">
                    CURRENT STOP
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  </span>
                  <span className="font-bold text-rose-400 text-sm">
                    {formatPrice(currentStopPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-sans">TRAILING STOP:</span>
              <span
                className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  isTrailingActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {isTrailingActive ? "ACTIVE ⚡ (고점 추적 중)" : "READY (대기 중)"}
              </span>
            </div>
          </div>

          {/* Column 2: Dynamic Targets */}
          <div className={`p-3 rounded-lg border ${subCardBg} flex flex-col justify-between`}>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>동적 목표가 (Dynamic Targets)</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  분할 {partialSellRatio.t1Ratio}% / {partialSellRatio.t2Ratio}% / {partialSellRatio.runnerRatio}%
                </span>
              </div>

              <div className="space-y-1.5 font-mono">
                <div
                  className={`flex items-center justify-between text-xs p-1.5 rounded border ${
                    target1Reached
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : "bg-zinc-800/40 border-transparent text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {target1Reached ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span className="font-sans font-medium">TARGET 1 (1.5R)</span>
                  </div>
                  <span className="font-bold">{formatPrice(target1)}</span>
                </div>

                <div
                  className={`flex items-center justify-between text-xs p-1.5 rounded border ${
                    target2Reached
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : "bg-zinc-800/40 border-transparent text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {target2Reached ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span className="font-sans font-medium">TARGET 2 (2.5R)</span>
                  </div>
                  <span className="font-bold">{formatPrice(target2)}</span>
                </div>

                <div
                  className={`flex items-center justify-between text-xs p-1.5 rounded border ${
                    target3Reached
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : "bg-zinc-800/40 border-transparent text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {target3Reached ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-purple-400" />
                    )}
                    <span className="font-sans font-medium text-purple-300">TARGET 3 (Moonshot)</span>
                  </div>
                  <span className="font-bold text-purple-400">{formatPrice(target3)}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-sans">현재가 / 손익률:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  isProfit ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatPrice(currentPrice)} ({isProfit ? "+" : ""}
                {pnlPct}%)
              </span>
            </div>
          </div>

          {/* Column 3: Scores & State Machine */}
          <div className={`p-3 rounded-lg border ${subCardBg} flex flex-col justify-between`}>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Adaptive Exit AI (SELL SCORE)</span>
                <span className="text-[10px] text-zinc-400 font-mono">실시간 매도 스코어링</span>
              </div>

              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-amber-400 font-sans font-medium">SELL PRESSURE SCORE</span>
                    <span className="font-bold text-amber-400">{sellScore} / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        sellScore >= 60 ? "bg-rose-500" : sellScore >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${sellScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-sans">ADAPTIVE STATE</span>
                <span
                  className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded border ${
                    state === "PROFIT_HOLD"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : state === "SELL_WATCH"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : state === "PARTIAL_SELL"
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  }`}
                >
                  {stateLabel}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono overflow-x-auto">
              <span className="text-zinc-500 whitespace-nowrap">경고인자:</span>
              {sellFactors.higherLowBroken && (
                <span className="px-1 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 whitespace-nowrap">
                  Low-Broken
                </span>
              )}
              {sellFactors.vwapBreakdown && (
                <span className="px-1 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 whitespace-nowrap">
                  VWAP-Drop
                </span>
              )}
              {sellFactors.forecastTurningDown && (
                <span className="px-1 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 whitespace-nowrap">
                  Forecast-Turn
                </span>
              )}
              {!sellFactors.higherLowBroken &&
                !sellFactors.vwapBreakdown &&
                !sellFactors.forecastTurningDown && (
                  <span className="text-emerald-400 font-sans">모든 기술 지표 양호 🟢</span>
                )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PREDICTIVE BUY AI */}
      {activeTab === "PREDICTIVE_BUY" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Candidate Buy Zone & Buy Pressure */}
          <div className={`p-3 rounded-lg border ${subCardBg} flex flex-col justify-between`}>
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>예상 진입 구간 (Predicted Buy Area)</span>
                <span className="text-[10px] text-blue-300 font-mono">Pre-Confirm Zone</span>
              </div>

              <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/30 mb-2">
                <div className="text-[11px] text-blue-300 font-sans mb-1">CANDIDATE BUY RANGE</div>
                <div className="font-mono text-base font-extrabold text-blue-400">
                  {formatPrice(predictiveBuy.predictedBuyAreaMin)} ~ {formatPrice(predictiveBuy.predictedBuyAreaMax)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">BUY PRESSURE</span>
                  <span className="font-bold text-blue-400">{predictiveBuy.buyPressure} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${predictiveBuy.buyPressure}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">PREDICTIVE STATUS:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                  predictiveBuy.status === "CONFIRMED_BUY"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : predictiveBuy.status === "PREDICTING"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                }`}
              >
                {predictiveBuy.statusLabel}
              </span>
            </div>
          </div>

          {/* Condition Verification Checklist */}
          <div className={`p-3 rounded-lg border ${subCardBg} col-span-1 md:col-span-2 flex flex-col justify-between`}>
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>실제 봉 조건 검증 레이어 (Real Candle Verification)</span>
                <span className="text-[10px] text-zinc-500 font-mono">실시간 검증</span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {/* 1. VWAP Reclaim */}
                <div className={`p-2 rounded border flex items-center justify-between ${
                  predictiveBuy.conditions.vwapReclaim ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-800/40 border-zinc-700/40 text-zinc-400"
                }`}>
                  <span className="font-sans font-medium">VWAP 회복 (Reclaim)</span>
                  {predictiveBuy.conditions.vwapReclaim ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                {/* 2. MACD Turn */}
                <div className={`p-2 rounded border flex items-center justify-between ${
                  predictiveBuy.conditions.macdPositiveTurn ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-800/40 border-zinc-700/40 text-zinc-400"
                }`}>
                  <span className="font-sans font-medium">MACD 양전환</span>
                  {predictiveBuy.conditions.macdPositiveTurn ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                {/* 3. RVOL Surge */}
                <div className={`p-2 rounded border flex items-center justify-between ${
                  predictiveBuy.conditions.rvolSurge ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-800/40 border-zinc-700/40 text-zinc-400"
                }`}>
                  <span className="font-sans font-medium">거래량 분출 (RVOL &gt; 1.2)</span>
                  {predictiveBuy.conditions.rvolSurge ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                {/* 4. HL Structure */}
                <div className={`p-2 rounded border flex items-center justify-between ${
                  predictiveBuy.conditions.higherLowStructure ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-800/40 border-zinc-700/40 text-zinc-400"
                }`}>
                  <span className="font-sans font-medium">Higher Low 지지 형성</span>
                  {predictiveBuy.conditions.higherLowStructure ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 font-sans flex items-center justify-between">
              <span>* AI가 미리 예측한 구간에서 실제 봉이 조건 3개 이상 검증 완료 시에만 BUY 신호가 확정됩니다.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC AI FORECAST PATH */}
      {activeTab === "FORECAST_PATH" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-xs font-extrabold text-purple-300 font-mono">
                {forecastTrendLabel}
              </span>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">
              최종 예측가: <b className="text-purple-300">{formatPrice(forecastPath[forecastPath.length - 1]?.price || currentPrice)}</b>
            </span>
          </div>

          {/* Forecast Multi-Point Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 font-mono text-xs">
            {forecastPath.map((pt) => {
              const diffPct = Number((((pt.price - currentPrice) / currentPrice) * 100).toFixed(2));
              const isUp = diffPct >= 0;
              return (
                <div
                  key={pt.step}
                  className={`p-2 rounded border flex flex-col items-center text-center ${
                    isUp
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <span className="text-[10px] text-zinc-400 font-sans">{pt.timeLabel}</span>
                  <span className="font-bold my-0.5">{formatPrice(pt.price)}</span>
                  <span className="text-[10px]">
                    {isUp ? "+" : ""}
                    {diffPct}%
                  </span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">신뢰도 {pt.confidence}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
