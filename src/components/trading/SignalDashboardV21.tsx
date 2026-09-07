// JUSIK2 V21 SIGNAL DASHBOARD UI COMPONENT
// Complete V21 signal intelligence dashboard component.

import React from "react";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  Award,
  BarChart2
} from "lucide-react";
import { formatPriceV21 } from "../../services/v21/priceRules";
import {
  MarketTypeV21,
  PerformanceStatsV21,
  SetupScoreV21,
  SignalLifecycleV21
} from "../../services/v21/types";

export interface SignalDashboardV21Props {
  symbol: string;
  name?: string;
  market?: MarketTypeV21;
  currentPrice: number;
  activeSignal: SignalLifecycleV21 | null;
  setupScore: SetupScoreV21 | null;
  stats: PerformanceStatsV21;
  isWhiteTheme?: boolean;
}

export const SignalDashboardV21: React.FC<SignalDashboardV21Props> = ({
  symbol,
  name = symbol,
  market = "KOREA",
  currentPrice,
  activeSignal,
  setupScore,
  stats,
  isWhiteTheme = false,
}) => {
  const bgCard = isWhiteTheme ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900/90 border-slate-800 text-slate-100";
  const bgSub = isWhiteTheme ? "bg-slate-50 border-slate-200" : "bg-slate-800/60 border-slate-700/50";
  const textMuted = isWhiteTheme ? "text-slate-500" : "text-slate-400";

  const plan = activeSignal?.plan;
  const pnlPct = plan ? ((currentPrice - plan.entryPrice) / plan.entryPrice) * 100 : 0;
  const isProfitable = pnlPct >= 0;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl ${bgCard} w-full max-w-md`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-sm tracking-wide">{name} ({symbol})</span>
        </div>
        <span className="font-mono text-sm font-bold text-emerald-400">
          {formatPriceV21(currentPrice, market)}
        </span>
      </div>

      {/* AI Signal Card */}
      {activeSignal && plan ? (
        <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${bgSub}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3" /> V21 BUY SIGNAL
              </span>
              {setupScore?.grade && (
                <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                  <Award className="w-3 h-3" /> GRADE {setupScore.grade}
                </span>
              )}
            </div>
            <span className={`font-mono text-xs font-bold ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfitable ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="p-2 rounded bg-slate-950/40 flex flex-col">
              <span className={`text-[10px] ${textMuted}`}>Entry Price</span>
              <span className="font-bold text-slate-200">{formatPriceV21(plan.entryPrice, market)}</span>
            </div>
            <div className="p-2 rounded bg-slate-950/40 flex flex-col">
              <span className={`text-[10px] ${textMuted}`}>Trailing Stop (SL)</span>
              <span className="font-bold text-rose-400">{formatPriceV21(activeSignal.currentTrailingFloor, market)}</span>
            </div>
          </div>

          {/* Targets TP1, TP2, TP3 */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-950/30">
              <span className="flex items-center gap-1.5 text-slate-300">
                {activeSignal.tp1Hit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-slate-500" />}
                TP1 ({plan.rMultipliers.tp1}R)
              </span>
              <span className={`font-mono ${activeSignal.tp1Hit ? "text-emerald-400 font-bold" : "text-slate-200"}`}>
                {formatPriceV21(plan.tp1, market)}
              </span>
            </div>

            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-950/30">
              <span className="flex items-center gap-1.5 text-slate-300">
                {activeSignal.tp2Hit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-slate-500" />}
                TP2 ({plan.rMultipliers.tp2}R)
              </span>
              <span className={`font-mono ${activeSignal.tp2Hit ? "text-emerald-400 font-bold" : "text-slate-200"}`}>
                {formatPriceV21(plan.tp2, market)}
              </span>
            </div>

            <div className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-950/30">
              <span className="flex items-center gap-1.5 text-slate-300">
                {activeSignal.tp3Hit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-slate-500" />}
                TP3 ({plan.rMultipliers.tp3}R)
              </span>
              <span className={`font-mono ${activeSignal.tp3Hit ? "text-emerald-400 font-bold" : "text-slate-200"}`}>
                {formatPriceV21(plan.tp3, market)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-4 rounded-xl border text-center text-xs ${textMuted} ${bgSub}`}>
          <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-slate-500" />
          Awaiting Qualified V21 Setup Signal (Grade S / A / B)
        </div>
      )}

      {/* Setup Score Panel */}
      {setupScore && (
        <div className={`p-3 rounded-lg border flex flex-col gap-2 ${bgSub}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1 text-slate-200">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> V21 Setup Score
            </span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${setupScore.score >= 70 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
              {setupScore.score} / 100 ({setupScore.grade})
            </span>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-slate-300">
            {setupScore.reasons.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span> {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Realtime Performance Panel */}
      <div className={`p-3 rounded-lg border flex flex-col gap-2 ${bgSub}`}>
        <div className="flex items-center justify-between text-xs border-b border-slate-700/30 pb-1">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" /> Audited Signal Stats
          </span>
          <span className="text-[10px] font-mono text-slate-400">Total: {stats.totalSignals}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>TP1 First Touch:</span>
            <span className="text-emerald-400 font-bold">{stats.tp1FirstTouchRatePct}%</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>TP2 Hit Rate:</span>
            <span className="text-emerald-400 font-bold">{stats.tp2HitRatePct}%</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>Expectancy R:</span>
            <span className="text-indigo-400 font-bold">+{stats.expectancyR}R</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>Profit Factor:</span>
            <span className="text-amber-400 font-bold">{stats.profitFactor}</span>
          </div>
        </div>

        {stats.ambiguousCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{stats.ambiguousCount} ambiguous same-bar hits recorded</span>
          </div>
        )}
      </div>
    </div>
  );
};
