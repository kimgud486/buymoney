import React, { useState, useEffect } from "react";
import {
  Activity,
  Search,
  Flame,
  BarChart2,
  Layers,
  TrendingUp,
  Radio,
  Users,
  Newspaper,
  Zap,
  ShieldCheck,
  FileCheck,
  Plus,
  Sliders,
  Cpu,
  Sparkles,
  Bot,
  Pause,
  Play
} from "lucide-react";
import { BotPresetItem, getAllBots } from "../../data/botPresets";

interface AiCoreNeuralNetworkProps {
  onSelectBot?: (bot: BotPresetItem) => void;
  onOpenCreateBot?: () => void;
  activeCategory?: "ALL" | "SMALL" | "MID" | "LARGE" | "CRYPTO" | "US_TECH" | "HFT_QUANT";
  onCategoryChange?: (cat: "ALL" | "SMALL" | "MID" | "LARGE" | "CRYPTO" | "US_TECH" | "HFT_QUANT") => void;
  isAutoTradingActive?: boolean;
}

export const AiCoreNeuralNetwork: React.FC<AiCoreNeuralNetworkProps> = ({
  onSelectBot,
  onOpenCreateBot,
  activeCategory = "ALL",
  onCategoryChange,
  isAutoTradingActive = true
}) => {
  const [pulseTick, setPulseTick] = useState(0);
  const [selectedBotId, setSelectedBotId] = useState<string>("bot-stock-discovery");

  useEffect(() => {
    if (!isAutoTradingActive) return; // freeze pulse when stopped
    const timer = setInterval(() => {
      setPulseTick((prev) => (prev + 1) % 100);
    }, 120);
    return () => clearInterval(timer);
  }, [isAutoTradingActive]);

  const allBots = getAllBots();

  const filteredBots = allBots.filter((b) => {
    if (activeCategory === "ALL") return true;
    return b.category === activeCategory;
  });

  const leftBots = filteredBots.slice(0, Math.ceil(filteredBots.length / 2));
  const rightBots = filteredBots.slice(Math.ceil(filteredBots.length / 2));

  const handleBotClick = (botId: string) => {
    setSelectedBotId(botId);
    const found = allBots.find((b) => b.id === botId);
    if (found && onSelectBot) {
      onSelectBot(found);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
      {/* Header with Title & Bot Category Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs font-black text-slate-900 tracking-tight">
              AI 자율매매 뉴럴 네트워크 (12 AI BOTS)
            </h3>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
            isAutoTradingActive 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
              : "bg-amber-50 text-amber-800 border border-amber-300"
          }`}>
            {isAutoTradingActive ? "● 12 BOTS LIVE" : "🛑 자율매매 정지됨"}
          </span>
        </div>

        {/* Filter Category & Bot Creator Button */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold overflow-x-auto">
            {(["ALL", "SMALL", "MID", "LARGE", "CRYPTO", "US_TECH", "HFT_QUANT"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange && onCategoryChange(cat)}
                className={`px-2 py-0.5 rounded transition cursor-pointer whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-white text-blue-600 font-black shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {cat === "ALL" ? "전체" : cat === "SMALL" ? "소형주" : cat === "MID" ? "중형주" : cat === "LARGE" ? "대형주" : cat === "CRYPTO" ? "업비트" : cat === "US_TECH" ? "미국주식" : "HFT/퀀트"}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-stock-search-modal"));
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-slate-100 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs border border-slate-700 hover:border-cyan-500"
            title="실시간 종목 검색 (소형주/중형주/대형주/업비트/미국주식)"
          >
            <Search className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">실시간 종목검색</span>
            <span className="sm:hidden">검색</span>
          </button>

          {onOpenCreateBot && (
            <button
              onClick={onOpenCreateBot}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>새 봇 생성</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Diagram Stage */}
      <div className="relative flex items-center justify-between py-2 px-1">
        {/* Left Bots Column */}
        <div className="w-48 space-y-1.5 z-10">
          {leftBots.map((b) => {
            const isSelected = selectedBotId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleBotClick(b.id)}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/90 border-blue-400 shadow-xs"
                    : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`p-1 rounded-lg ${isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                    <Cpu className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[11px] text-slate-800 truncate">{b.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      LV.{b.level || 1} | 승률 {b.winRate}%
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  b.reinforced 
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : isAutoTradingActive 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {b.reinforced ? `LV.${b.level || 2}강화` : isAutoTradingActive ? b.statusText || "ONLINE" : "OFF"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Center Neural Brain Core Hub */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-2 z-10">
          {/* Circular Node Pulse Effect */}
          <div className="relative flex items-center justify-center">
            {isAutoTradingActive ? (
              <>
                <div className="absolute w-28 h-28 rounded-full border border-cyan-400/40 animate-ping"></div>
                <div className="absolute w-24 h-24 rounded-full border border-blue-500/30"></div>
              </>
            ) : null}

            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg transition-all ${
              isAutoTradingActive
                ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500"
                : "bg-gradient-to-tr from-slate-600 via-slate-700 to-slate-800"
            }`}>
              {isAutoTradingActive ? (
                <Sparkles className="w-6 h-6 animate-pulse text-amber-300 mb-0.5" />
              ) : (
                <Pause className="w-6 h-6 text-amber-400 mb-0.5 fill-amber-400" />
              )}
              <span className="text-[10px] font-black tracking-tight">AI CORE</span>
              <span className="text-[8px] font-mono opacity-80">{isAutoTradingActive ? "DECISION" : "FROZEN"}</span>
            </div>
          </div>

          {/* Real-time Status Badge */}
          <div className="mt-3 text-center">
            <div className="text-[11px] font-black text-slate-900 flex items-center justify-center gap-1">
              <span>{isAutoTradingActive ? "멀티 오케스트레이터 실시간 합의 중" : "자율 매매가 정지되었습니다"}</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
              {isAutoTradingActive ? `응답속도: 12ms | 활성 노드: 12/12` : `모든 봇 신호 동결됨`}
            </div>
          </div>
        </div>

        {/* Right Bots Column */}
        <div className="w-48 space-y-1.5 z-10">
          {rightBots.map((b) => {
            const isSelected = selectedBotId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleBotClick(b.id)}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition cursor-pointer ${
                  isSelected
                    ? "bg-blue-50/90 border-blue-400 shadow-xs"
                    : "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`p-1 rounded-lg ${isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                    <Cpu className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[11px] text-slate-800 truncate">{b.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      LV.{b.level || 1} | 승률 {b.winRate}%
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  b.reinforced 
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : isAutoTradingActive 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {b.reinforced ? `LV.${b.level || 2}강화` : isAutoTradingActive ? b.statusText || "ONLINE" : "OFF"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
