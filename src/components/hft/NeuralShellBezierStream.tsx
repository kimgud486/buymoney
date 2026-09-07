import React, { useEffect, useState } from "react";

export interface BotStreamItem {
  id: string;
  code: string;
  name: string;
  category: "MACRO" | "STRUCTURE" | "FLOW" | "RISK";
  score: number;
  status: string;
  color: string;
  sparkline: number[];
}

export const SWARM_BOTS_30: BotStreamItem[] = [
  // MACRO / REGIME (6 Bots)
  { id: "b1", code: "PR", name: "Macro Regime Bot", category: "MACRO", score: 94, status: "Bullish Trend", color: "#00F2FE", sparkline: [40, 50, 48, 62, 70, 75, 82, 94] },
  { id: "b2", code: "EV", name: "Event Predictor Bot", category: "MACRO", score: 88, status: "Catalyst Detect", color: "#4FACFE", sparkline: [30, 45, 60, 55, 68, 72, 85, 88] },
  { id: "b3", code: "SENT", name: "News NLP Sentiment Bot", category: "MACRO", score: 91, status: "Positive 8.4", color: "#38EF7D", sparkline: [55, 58, 65, 62, 78, 85, 89, 91] },
  { id: "b4", code: "FED", name: "Liquidity Rate Bot", category: "MACRO", score: 82, status: "Neutral Inflow", color: "#00F5A0", sparkline: [60, 62, 65, 70, 75, 78, 80, 82] },
  { id: "b5", code: "VOL", name: "Implied Volatility Bot", category: "MACRO", score: 79, status: "Compression", color: "#A855F7", sparkline: [70, 65, 60, 68, 72, 74, 76, 79] },
  { id: "b6", code: "CORR", name: "Sector Correlation Bot", category: "MACRO", score: 86, status: "Leader Follow", color: "#EC4899", sparkline: [50, 55, 62, 70, 75, 80, 84, 86] },

  // STRUCTURE / PRICE ACTION (8 Bots)
  { id: "b7", code: "BOS", name: "Break of Structure Bot", category: "STRUCTURE", score: 96, status: "Bullish Breakout", color: "#00F2FE", sparkline: [45, 50, 55, 70, 80, 88, 92, 96] },
  { id: "b8", code: "CHoCH", name: "Change of Character Bot", category: "STRUCTURE", score: 90, status: "Shift Confirmed", color: "#4FACFE", sparkline: [35, 40, 52, 65, 74, 82, 88, 90] },
  { id: "b9", code: "OB", name: "Order Block Detector", category: "STRUCTURE", score: 93, status: "Demand Zone", color: "#FF9900", sparkline: [60, 65, 68, 75, 82, 88, 91, 93] },
  { id: "b10", code: "FVG", name: "Fair Value Gap Bot", category: "STRUCTURE", score: 87, status: "Imbalance Fill", color: "#FEE140", sparkline: [40, 48, 55, 62, 70, 78, 82, 87] },
  { id: "b11", code: "VWAP", name: "VWAP Bands & Anchors", category: "STRUCTURE", score: 92, status: "Top Band Support", color: "#00F5A0", sparkline: [55, 60, 68, 74, 80, 86, 89, 92] },
  { id: "b12", code: "LIQ", name: "Liquidity Sweep Bot", category: "STRUCTURE", score: 89, status: "Stop Run Trap", color: "#FF5E62", sparkline: [45, 52, 60, 70, 78, 82, 85, 89] },
  { id: "b13", code: "PATT", name: "Chart Pattern & Flag Bot", category: "STRUCTURE", score: 91, status: "Bull Flag 15m", color: "#A855F7", sparkline: [50, 55, 65, 72, 80, 85, 88, 91] },
  { id: "b14", code: "SUPP", name: "Multi-TF Confluence Bot", category: "STRUCTURE", score: 88, status: "1m/5m/15m Align", color: "#38EF7D", sparkline: [42, 50, 60, 68, 75, 80, 84, 88] },

  // QUANT / FLOW / HFT (10 Bots)
  { id: "b15", code: "RVOL", name: "Relative Volume Spike Bot", category: "FLOW", score: 95, status: "2.85x Surge", color: "#FF9900", sparkline: [30, 45, 60, 75, 85, 90, 93, 95] },
  { id: "b16", code: "HFT", name: "Micro Orderbook Imbalance", category: "FLOW", score: 92, status: "Bid Dom 78%", color: "#00F2FE", sparkline: [60, 65, 70, 78, 84, 88, 90, 92] },
  { id: "b17", code: "CVD", name: "Cumulative Volume Delta", category: "FLOW", score: 94, status: "Aggressive Buy", color: "#00F5A0", sparkline: [50, 58, 66, 75, 82, 88, 91, 94] },
  { id: "b18", code: "TAPE", name: "Time & Sales Tape Bot", category: "FLOW", score: 89, status: "Large Prints", color: "#4FACFE", sparkline: [40, 50, 62, 70, 78, 82, 86, 89] },
  { id: "b19", code: "MM", name: "Market Maker Flow Bot", category: "FLOW", score: 87, status: "Spread Capture", color: "#FEE140", sparkline: [45, 52, 60, 68, 75, 80, 84, 87] },
  { id: "b20", code: "DARK", name: "Darkpool / Block Trades", category: "FLOW", score: 91, status: "+4,200억 Inflow", color: "#A855F7", sparkline: [55, 60, 68, 74, 82, 86, 89, 91] },
  { id: "b21", code: "ARB", name: "Cross-Venue Arbitrage", category: "FLOW", score: 86, status: "+0.42% Spread", color: "#38EF7D", sparkline: [48, 55, 62, 70, 76, 80, 83, 86] },
  { id: "b22", code: "DEPTH", name: "10-Depth Heatmap Bot", category: "FLOW", score: 90, status: "Thick Bid Wall", color: "#00F2FE", sparkline: [50, 58, 65, 72, 80, 85, 88, 90] },
  { id: "b23", code: "ACCUM", name: "Institutional Accumulation", category: "FLOW", score: 93, status: "Foreign Net Buy", color: "#FF5E62", sparkline: [52, 60, 68, 76, 84, 88, 91, 93] },
  { id: "b24", code: "SPEED", name: "Tick Acceleration Bot", category: "FLOW", score: 88, status: "0.018s Velocity", color: "#EC4899", sparkline: [40, 48, 58, 68, 75, 80, 84, 88] },

  // EXECUTION & RISK (6 Bots)
  { id: "b25", code: "KELLY", name: "Optimal Sizing Kelly Bot", category: "RISK", score: 92, status: "2.4% Max Risk", color: "#00F5A0", sparkline: [60, 65, 72, 78, 84, 88, 90, 92] },
  { id: "b26", code: "SHIELD", name: "Dynamic Trailing Shield", category: "RISK", score: 98, status: "Lock +1.8% Profit", color: "#38EF7D", sparkline: [70, 75, 82, 88, 92, 95, 97, 98] },
  { id: "b27", code: "DD", name: "Max Drawdown Guard Bot", category: "RISK", score: 95, status: "Safe (<1.2%)", color: "#00F2FE", sparkline: [65, 70, 78, 85, 90, 92, 94, 95] },
  { id: "b28", code: "SLIP", name: "Slippage Minimizer Bot", category: "RISK", score: 91, status: "0.02% TWAP", color: "#FEE140", sparkline: [50, 58, 66, 75, 82, 86, 89, 91] },
  { id: "b29", code: "FEE", name: "Order Routing Cost Bot", category: "RISK", score: 89, status: "Maker Rebate", color: "#4FACFE", sparkline: [45, 52, 62, 70, 78, 83, 86, 89] },
  { id: "b30", code: "MASTER", name: "AI Central Consensus Core", category: "RISK", score: 96, status: "Consensus 94/100", color: "#FF9900", sparkline: [60, 68, 76, 84, 90, 93, 95, 96] }
];

export const NeuralShellBezierStream: React.FC<{
  selectedBotId?: string;
  onSelectBot?: (bot: BotStreamItem) => void;
}> = ({ selectedBotId = "b1", onSelectBot }) => {
  const [ticks, setTicks] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "MACRO" | "STRUCTURE" | "FLOW" | "RISK">("ALL");

  useEffect(() => {
    const timer = setInterval(() => {
      setTicks((t) => (t + 1) % 1000);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  const filteredBots = activeCategory === "ALL" 
    ? SWARM_BOTS_30 
    : SWARM_BOTS_30.filter(b => b.category === activeCategory);

  return (
    <div className="w-full flex flex-col h-full bg-[#08111D] border border-[#17283A] rounded-xl p-3 relative overflow-hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#17283A] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
          <span className="text-xs font-black text-white tracking-wider">NEURAL SHELL (30 SWARM AGENTS)</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[9px] border border-cyan-500/40">
            30/30 ONLINE
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {(["ALL", "MACRO", "STRUCTURE", "FLOW", "RISK"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                activeCategory === cat
                  ? "bg-cyan-600 text-white font-bold shadow"
                  : "bg-[#0E1927] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Bezier Stream Graph with Live Flow Ribbons */}
      <div className="relative flex-1 min-h-[220px] max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        
        {/* SVG Flow Wave Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <defs>
            <linearGradient id="flowGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FF9900" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#00F5A0" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {filteredBots.slice(0, 10).map((b, idx) => {
            const yStart = 20 + idx * 24;
            const yEnd = 120 + Math.sin(ticks * 0.1 + idx) * 40;
            return (
              <path
                key={idx}
                d={`M 140 ${yStart} C 220 ${yStart}, 260 ${yEnd}, 340 ${yEnd}`}
                fill="none"
                stroke="url(#flowGrad1)"
                strokeWidth={1 + Math.sin(ticks * 0.2 + idx) * 0.5}
                strokeDasharray="4, 3"
                className="animate-pulse"
              />
            );
          })}
        </svg>

        {/* 30-Bot Dynamic List Grid with Live Sparklines */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 relative z-10">
          {filteredBots.map((bot) => {
            const isSelected = selectedBotId === bot.id;
            const liveScore = Math.min(99, Math.max(70, bot.score + Math.sin(ticks * 0.3 + parseInt(bot.id.replace("b", ""))) * 2));
            return (
              <div
                key={bot.id}
                onClick={() => onSelectBot?.(bot)}
                className={`p-1.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#0E1927] border-cyan-400 shadow-md ring-1 ring-cyan-400/40"
                    : "bg-[#0B1420]/90 border-[#17283A] hover:border-cyan-500/40 hover:bg-[#0E1927]/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center font-mono font-black text-[9px] text-white shadow"
                      style={{ backgroundColor: bot.color }}
                    >
                      {bot.code}
                    </span>
                    <div className="leading-tight">
                      <div className="text-[10px] font-bold text-white truncate max-w-[85px]">{bot.name}</div>
                      <div className="text-[8px] font-mono text-zinc-400">{bot.status}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-[11px] font-black text-cyan-300">
                      {liveScore.toFixed(0)}
                    </div>
                    <div className="text-[7px] text-emerald-400 font-bold">LIVE</div>
                  </div>
                </div>

                {/* Mini Realtime Sparkline */}
                <div className="h-4 w-full flex items-end gap-0.5 mt-1 pt-1 border-t border-[#17283A]/60">
                  {bot.sparkline.map((val, sIdx) => {
                    const dynamicH = Math.min(100, Math.max(15, val + Math.sin(ticks * 0.4 + sIdx) * 10));
                    return (
                      <div
                        key={sIdx}
                        style={{
                          height: `${dynamicH}%`,
                          backgroundColor: sIdx === bot.sparkline.length - 1 ? bot.color : "rgba(0, 242, 254, 0.35)"
                        }}
                        className="flex-1 rounded-t-xs"
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Bottom Telemetry Status Bar */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-2 border-t border-[#17283A] mt-2">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          STREAM LATENCY: 8.4ms
        </span>
        <span className="text-cyan-400">THROUGHPUT: 4,820 TICKS/SEC</span>
        <span className="text-zinc-300 font-bold">TOTAL SIGNALS: 1,482</span>
      </div>

    </div>
  );
};
