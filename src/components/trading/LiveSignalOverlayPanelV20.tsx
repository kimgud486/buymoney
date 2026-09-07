// AISTOCK V20 LIVE SIGNAL OVERLAY PANEL
// Real-time right-hand side trading signal intelligence overlay panel.

import React from "react";
import {
  TrendingUp,
  ShieldCheck,
  Target,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Activity,
  Layers
} from "lucide-react";
import { FrozenTradeSignal, SignalOverlayStats } from "../../services/v20/LiveTradeSignalTrackerV20";
import { V20SetupScoreResult } from "../../services/v20/V20SetupScorer";

export interface LiveSignalOverlayPanelV20Props {
  symbol: string;
  currentPrice: number;
  activeSignal: FrozenTradeSignal | null;
  setupScoreResult: V20SetupScoreResult | null;
  stats: SignalOverlayStats;
  isWhiteTheme?: boolean;
}

export const LiveSignalOverlayPanelV20: React.FC<LiveSignalOverlayPanelV20Props> = ({
  symbol,
  currentPrice,
  activeSignal,
  setupScoreResult,
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
    <div className={`flex flex-col gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg ${bgCard} w-full max-w-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide uppercase">V20 Signal Intel</span>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          REALTIME VERIFIED
        </span>
      </div>

      {/* Active Signal Plan Card */}
      {activeSignal && plan ? (
        <div className={`p-3 rounded-lg border flex flex-col gap-2 ${bgSub}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" /> ACTIVE LONG SIGNAL
            </span>
            <span className={`font-mono font-bold ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfitable ? "+" : ""}{pnlPct.toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono my-1">
            <div className="flex flex-col p-1.5 rounded bg-slate-950/40">
              <span className={`text-[10px] ${textMuted}`}>Entry Price</span>
              <span className="font-bold text-slate-200">{plan.entryPrice.toLocaleString()}</span>
            </div>
            <div className="flex flex-col p-1.5 rounded bg-slate-950/40">
              <span className={`text-[10px] ${textMuted}`}>Defense Stop (SL)</span>
              <span className="font-bold text-rose-400">{activeSignal.currentTrailingFloor.toLocaleString()}</span>
            </div>
          </div>

          {/* Targets TP1, TP2, TP3 */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950/30">
              <span className="flex items-center gap-1.5 text-slate-300">
                {activeSignal.tp1Hit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-slate-500" />}
                TP1 ({plan.rMultipliers.tp1}R)
              </span>
              <span className={`font-mono ${activeSignal.tp1Hit ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                {plan.tp1.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950/30">
              <span className="flex items-center gap-1.5 text-slate-300">
                {activeSignal.tp2Hit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-slate-500" />}
                TP2 ({plan.rMultipliers.tp2}R)
              </span>
              <span className={`font-mono ${activeSignal.tp2Hit ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                {plan.tp2.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-950/30">
              <span className="flex items-center gap-1.5 text-slate-300">
                {activeSignal.tp3Hit ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Target className="w-3.5 h-3.5 text-slate-500" />}
                TP3 ({plan.rMultipliers.tp3}R)
              </span>
              <span className={`font-mono ${activeSignal.tp3Hit ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                {plan.tp3.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-3 rounded-lg border text-center text-xs ${textMuted} ${bgSub}`}>
          <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-slate-500" />
          Awaiting Qualified Setup Signal (Score ≥ 70)
        </div>
      )}

      {/* Setup Score Panel */}
      {setupScoreResult && (
        <div className={`p-3 rounded-lg border flex flex-col gap-2 ${bgSub}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-200">
              <Activity className="w-3.5 h-3.5 text-indigo-400" /> V20 Setup Score
            </span>
            <span
              className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                setupScoreResult.score >= 70
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {setupScoreResult.score} / 100
            </span>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-slate-300">
            {setupScoreResult.reasons.slice(0, 4).map((reason, idx) => (
              <div key={idx} className="flex items-center gap-1 text-slate-300">
                <span className="text-emerald-400">✓</span> {reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hit Rate Statistics */}
      <div className={`p-3 rounded-lg border flex flex-col gap-2 ${bgSub}`}>
        <div className="flex items-center justify-between text-xs border-b border-slate-700/30 pb-1">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> Signal Performance
          </span>
          <span className="text-[10px] font-mono text-slate-400">Total: {stats.totalSignals}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>TP1 Hit Rate:</span>
            <span className="text-emerald-400 font-bold">{stats.tp1HitRate}%</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>TP2 Hit Rate:</span>
            <span className="text-emerald-400 font-bold">{stats.tp2HitRate}%</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>TP3 Hit Rate:</span>
            <span className="text-emerald-400 font-bold">{stats.tp3HitRate}%</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-slate-950/40">
            <span className={textMuted}>SL First Rate:</span>
            <span className="text-rose-400 font-bold">{stats.slHitRate}%</span>
          </div>
        </div>

        {stats.ambiguousCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{stats.ambiguousCount} ambiguous bar hits recorded</span>
          </div>
        )}
      </div>
    </div>
  );
};
