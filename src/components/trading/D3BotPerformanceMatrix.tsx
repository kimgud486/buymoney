import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Activity, BarChart3, TrendingUp, Zap, RefreshCw } from "lucide-react";

interface BotMetric {
  botId: string;
  name: string;
  category: string;
  returnRate: number; // %
  sharpe: number;
  mdd: number; // %
  winRate: number; // %
  history: number[];
}

const INITIAL_METRICS: BotMetric[] = [
  {
    botId: "bot-small-alpha",
    name: "소형주 급등 알파봇",
    category: "소형주",
    returnRate: 38.4,
    sharpe: 2.45,
    mdd: -4.8,
    winRate: 74.2,
    history: [100, 104, 102, 108, 115, 112, 122, 128, 131, 138.4]
  },
  {
    botId: "bot-mid-swing",
    name: "중형주 주도 스윙봇",
    category: "중형주",
    returnRate: 29.8,
    sharpe: 2.68,
    mdd: -3.2,
    winRate: 78.5,
    history: [100, 102, 105, 107, 112, 116, 119, 124, 126, 129.8]
  },
  {
    botId: "bot-upbit-crypto",
    name: "업비트 24H 가상자산봇",
    category: "가상자산",
    returnRate: 45.2,
    sharpe: 2.12,
    mdd: -7.1,
    winRate: 69.8,
    history: [100, 98, 105, 114, 110, 125, 132, 128, 140, 145.2]
  },
  {
    botId: "bot-large-quant",
    name: "대형주 퀀트 SMC봇",
    category: "대형주",
    returnRate: 18.5,
    sharpe: 2.85,
    mdd: -2.1,
    winRate: 82.1,
    history: [100, 101, 103, 104, 108, 110, 112, 115, 116, 118.5]
  },
  {
    botId: "bot-pattern-vision",
    name: "Bull Flag 패턴봇",
    category: "코어",
    returnRate: 33.6,
    sharpe: 2.38,
    mdd: -4.1,
    winRate: 71.4,
    history: [100, 103, 106, 109, 112, 118, 121, 125, 129, 133.6]
  },
  {
    botId: "bot-bos-choch",
    name: "BOS 구조돌파 봇",
    category: "코어",
    returnRate: 36.1,
    sharpe: 2.52,
    mdd: -3.9,
    winRate: 75.8,
    history: [100, 102, 108, 111, 116, 120, 124, 129, 131, 136.1]
  }
];

export const D3BotPerformanceMatrix: React.FC = () => {
  const d3ContainerRef = useRef<SVGSVGElement | null>(null);
  const [metrics, setMetrics] = useState<BotMetric[]>(INITIAL_METRICS);
  const [selectedBotId, setSelectedBotId] = useState<string>("bot-small-alpha");

  // Real-time market tick listener
  useEffect(() => {
    const handleTicker = (e: any) => {
      if (!e || !e.detail) return;
      // Stable matrix updates without artificial drift
    };

    window.addEventListener("stock_ticker_update", handleTicker);
    return () => window.removeEventListener("stock_ticker_update", handleTicker);
  }, []);

  // D3 Rendering
  useEffect(() => {
    if (!d3ContainerRef.current) return;

    const svg = d3.select(d3ContainerRef.current);
    svg.selectAll("*").remove();

    const width = 580;
    const height = 150;
    const margin = { top: 15, right: 25, bottom: 25, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const selectedBot = metrics.find((b) => b.botId === selectedBotId) || metrics[0];

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, selectedBot.history.length - 1])
      .range([0, innerWidth]);

    const yMinNum = Math.min(...selectedBot.history);
    const yMaxNum = Math.max(...selectedBot.history);
    const yScale = d3
      .scaleLinear()
      .domain([yMinNum * 0.98, yMaxNum * 1.02])
      .range([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(4)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#F1F5F9")
      .attr("stroke-dasharray", "2,2");

    // Area Generator with gradient
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "d3-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#3B82F6").attr("stop-opacity", 0.35);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#3B82F6").attr("stop-opacity", 0.0);

    const area = d3
      .area<number>()
      .x((_, i) => xScale(i))
      .y0(innerHeight)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(selectedBot.history)
      .attr("fill", "url(#d3-area-gradient)")
      .attr("d", area);

    // Line Generator
    const line = d3
      .line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(selectedBot.history)
      .attr("fill", "none")
      .attr("stroke", "#2563EB")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Circles at points
    g.selectAll(".dot")
      .data(selectedBot.history)
      .enter()
      .append("circle")
      .attr("cx", (_, i) => xScale(i))
      .attr("cy", (d) => yScale(Number(d)))
      .attr("r", (_, i) => (i === selectedBot.history.length - 1 ? 4.5 : 2))
      .attr("fill", (_, i) => (i === selectedBot.history.length - 1 ? "#EF4444" : "#2563EB"))
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5);

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => `T-${10 - Number(d)}`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94A3B8")
      .attr("font-size", "9px")
      .attr("font-family", "monospace");

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `+${Number(d) - 100}%`);

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#94A3B8")
      .attr("font-size", "9px")
      .attr("font-family", "monospace");

  }, [metrics, selectedBotId]);

  const currentBot = metrics.find((b) => b.botId === selectedBotId) || metrics[0];

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-black text-slate-800 tracking-tight">
            AI BOT 전략 백테스팅 & 실시간 성과 매트릭스 (D3.js)
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-bold font-mono">
          <span className="text-slate-400">실시간 수익률:</span>
          <span className="text-emerald-600 font-black">+{currentBot.returnRate}%</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">샤프:</span>
          <span className="text-blue-600 font-black">{currentBot.sharpe}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">MDD:</span>
          <span className="text-rose-600 font-black">{currentBot.mdd}%</span>
        </div>
      </div>

      {/* Bot Selector Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 text-xs font-bold">
        {metrics.map((bot) => {
          const isSelected = selectedBotId === bot.botId;
          return (
            <button
              key={bot.botId}
              onClick={() => setSelectedBotId(bot.botId)}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{bot.name}</span>
              <span className={`text-[10px] font-mono ${isSelected ? "text-blue-200" : "text-emerald-600"}`}>
                +{bot.returnRate}%
              </span>
            </button>
          );
        })}
      </div>

      {/* D3 Canvas SVG */}
      <div className="w-full h-[150px] relative bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
        <svg ref={d3ContainerRef} className="w-full h-full block"></svg>
      </div>
    </div>
  );
};
