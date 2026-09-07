import React, { useEffect, useState } from "react";

export interface MarketLifecycleItem {
  id: string;
  marketName: string;
  category: "CRYPTO" | "KOREA_STOCK" | "MACRO" | "AI";
  resolutionTimeLeft: number; // in seconds
  yesProb: number;
  volume24h: string;
  status: "ACTIVE" | "RESOLVING" | "HOT";
  trend: "UP" | "DOWN";
}

const INITIAL_MARKETS: MarketLifecycleItem[] = [
  { id: "m1", marketName: "BTC ATH $100K in Q2?", category: "CRYPTO", resolutionTimeLeft: 43 * 60 + 12, yesProb: 78, volume24h: "$1.8M", status: "HOT", trend: "UP" },
  { id: "m2", marketName: "ETH Break $3,600 Today?", category: "CRYPTO", resolutionTimeLeft: 15 * 60 + 30, yesProb: 64, volume24h: "$840K", status: "ACTIVE", trend: "UP" },
  { id: "m3", marketName: "KOSPI 2,700 Break Today?", category: "KOREA_STOCK", resolutionTimeLeft: 64 * 60 + 5, yesProb: 82, volume24h: "₩42.5억", status: "HOT", trend: "UP" },
  { id: "m4", marketName: "삼성전자 75,000원 돌파?", category: "KOREA_STOCK", resolutionTimeLeft: 35, yesProb: 92, volume24h: "₩120억", status: "RESOLVING", trend: "UP" },
  { id: "m5", marketName: "한화에어로스페이스 신고가?", category: "KOREA_STOCK", resolutionTimeLeft: 14 * 60 + 40, yesProb: 88, volume24h: "₩34억", status: "HOT", trend: "UP" },
  { id: "m6", marketName: "SK하이닉스 외국인 순매수 1위?", category: "KOREA_STOCK", resolutionTimeLeft: 52 * 60 + 18, yesProb: 74, volume24h: "₩88억", status: "ACTIVE", trend: "UP" },
  { id: "m7", marketName: "Fed 25bp Rate Cut Confirmed?", category: "MACRO", resolutionTimeLeft: 75 * 60 + 10, yesProb: 91, volume24h: "$3.4M", status: "HOT", trend: "UP" },
  { id: "m8", marketName: "NVDA Earnings Beat 15%+?", category: "AI", resolutionTimeLeft: 88 * 60 + 20, yesProb: 85, volume24h: "$5.2M", status: "HOT", trend: "UP" },
  { id: "m9", marketName: "SOL > $200 Resolution", category: "CRYPTO", resolutionTimeLeft: 23, yesProb: 48, volume24h: "$620K", status: "RESOLVING", trend: "DOWN" },
  { id: "m10", marketName: "금투세 폐지 법안 통과?", category: "KOREA_STOCK", resolutionTimeLeft: 42 * 60 + 50, yesProb: 95, volume24h: "₩65억", status: "HOT", trend: "UP" }
];

export const MarketLifecycleResolutionGrid: React.FC = () => {
  const [markets, setMarkets] = useState<MarketLifecycleItem[]>(INITIAL_MARKETS);

  // Ticking countdown clock every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setMarkets((prev) =>
        prev.map((m) => {
          const newTime = Math.max(1, m.resolutionTimeLeft - 1);
          // slight random probability drift for realism
          const probDelta = (Math.random() - 0.49) * 0.4;
          const newProb = Math.min(99, Math.max(10, Math.round((m.yesProb + probDelta) * 10) / 10));
          return {
            ...m,
            resolutionTimeLeft: newTime,
            yesProb: newProb
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins < 60) return `${mins}m ${s < 10 ? "0" : ""}${s}s`;
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hours}h ${m < 10 ? "0" : ""}${m}m`;
  };

  return (
    <div className="w-full bg-[#08111D] border border-[#17283A] rounded-xl p-3 flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#17283A] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="text-xs font-black text-white tracking-wider">
            MARKET LIFECYCLE &bull; REAL-TIME RESOLUTION
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] border border-emerald-500/40 font-bold">
            10 ACTIVE MARKETS
          </span>
        </div>

        <div className="text-[10px] font-mono text-zinc-400">
          RESOLUTION LATENCY: <strong className="text-cyan-400">12ms</strong>
        </div>
      </div>

      {/* Grid of countdown market resolution cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {markets.map((m) => {
          const isUrgent = m.resolutionTimeLeft <= 60;
          return (
            <div
              key={m.id}
              className={`p-2 rounded-lg border flex flex-col justify-between transition relative overflow-hidden ${
                isUrgent
                  ? "bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/40 animate-pulse"
                  : m.yesProb >= 80
                  ? "bg-[#0B1420] border-emerald-500/40 hover:border-emerald-400"
                  : "bg-[#0B1420] border-[#17283A] hover:border-cyan-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 mb-1">
                  <span className="px-1 rounded bg-[#0E1927] border border-[#17283A] text-zinc-300 font-bold">
                    {m.category}
                  </span>
                  <span
                    className={`font-black font-mono flex items-center gap-0.5 ${
                      isUrgent ? "text-rose-400" : "text-amber-400"
                    }`}
                  >
                    ⏱ {formatCountdown(m.resolutionTimeLeft)}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-white leading-tight truncate" title={m.marketName}>
                  {m.marketName}
                </div>
              </div>

              {/* Progress Bar & Probability */}
              <div className="mt-2">
                <div className="flex justify-between items-center text-[10px] font-mono mb-0.5">
                  <span className="text-zinc-400 text-[9px]">YES PROB</span>
                  <span className={`font-black ${m.yesProb >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                    {m.yesProb}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#0E1927] rounded-full overflow-hidden border border-[#17283A]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isUrgent
                        ? "bg-rose-500"
                        : m.yesProb >= 70
                        ? "bg-gradient-to-r from-cyan-400 to-emerald-400"
                        : "bg-gradient-to-r from-amber-500 to-orange-400"
                    }`}
                    style={{ width: `${m.yesProb}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 mt-1">
                  <span>VOL {m.volume24h}</span>
                  <span className="text-emerald-400 font-bold">● {m.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
