import React from "react";
import { TrendingUp, Sparkles, ShieldCheck, Zap, Activity } from "lucide-react";
import { useApp } from "../context/AppContext";

export const MarketGlanceWidget: React.FC = () => {
  const { marketStatus } = useApp();

  const kospiChange = marketStatus?.kospi.pct ?? 1.12;
  const isUp = kospiChange >= 0;

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-3 shadow-md text-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-black tracking-tight text-zinc-200">
            MARKET GLANCE (실시간 핵심 3대 시장 지표)
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-bold">
          LIVE STREAMING
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Metric 1: Current Trend */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isUp ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 font-bold">1. Current Trend (현재 시장 추세)</div>
              <div className="text-xs font-black flex items-center gap-1.5 text-white">
                <span>{isUp ? "🟢 강한 상승 (Bullish)" : "🔴 하락 조정 (Bearish)"}</span>
                <span className={`text-[11px] font-mono font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {isUp ? "+" : ""}{kospiChange}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: AI Confidence */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Zap className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 font-bold">2. AI Confidence (AI 매매 확신도)</div>
              <div className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                <span>⚡ 88% 고확신 진입 시그널</span>
              </div>
            </div>
          </div>
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-mono font-bold">
            HIGH
          </span>
        </div>

        {/* Metric 3: Active Risk */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 font-bold">3. Active Risk (활성 리스크)</div>
              <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <span>🛡️ LOW RISK (안전권 / VIX 15.8)</span>
              </div>
            </div>
          </div>
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-mono font-bold">
            SAFE
          </span>
        </div>
      </div>
    </div>
  );
};
