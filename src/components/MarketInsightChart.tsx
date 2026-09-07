import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { TrendingUp, BarChart2, ShieldCheck, Zap } from "lucide-react";

export interface DemandChartPoint {
  month: string;
  demand: number;
  supply: number;
  inflow: number;
}

interface MarketInsightChartProps {
  themeTitle: string;
  score: number;
  data?: DemandChartPoint[];
}

export const MarketInsightChart: React.FC<MarketInsightChartProps> = ({
  themeTitle,
  score = 85,
  data = [
    { month: "3월", demand: 42, supply: 30, inflow: 50 },
    { month: "4월", demand: 55, supply: 32, inflow: 62 },
    { month: "5월", demand: 68, supply: 38, inflow: 74 },
    { month: "6월", demand: 75, supply: 45, inflow: 80 },
    { month: "7월", demand: 86, supply: 50, inflow: 88 },
    { month: "8월", demand: 94, supply: 58, inflow: 92 }
  ]
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 600;
    const height = 220;
    const margin = { top: 20, right: 30, bottom: 35, left: 40 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale
    const xScale = d3
      .scalePoint()
      .domain(data.map((d) => d.month))
      .range([0, innerWidth])
      .padding(0.2);

    // Y Scale
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      );

    // Area generator for Demand
    const demandArea = d3
      .area<DemandChartPoint>()
      .x((d) => xScale(d.month) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.demand))
      .curve(d3.curveMonotoneX);

    // Gradient definitions
    const defs = svg.append("defs");
    const gradientDemand = defs
      .append("linearGradient")
      .attr("id", "demandGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradientDemand
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#06b6d4")
      .attr("stop-opacity", 0.4);

    gradientDemand
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#06b6d4")
      .attr("stop-opacity", 0.0);

    // Draw Gradient Area
    g.append("path")
      .datum(data)
      .attr("fill", "url(#demandGradient)")
      .attr("d", demandArea);

    // Line Generators
    const demandLine = d3
      .line<DemandChartPoint>()
      .x((d) => xScale(d.month) || 0)
      .y((d) => yScale(d.demand))
      .curve(d3.curveMonotoneX);

    const inflowLine = d3
      .line<DemandChartPoint>()
      .x((d) => xScale(d.month) || 0)
      .y((d) => yScale(d.inflow))
      .curve(d3.curveMonotoneX);

    const supplyLine = d3
      .line<DemandChartPoint>()
      .x((d) => xScale(d.month) || 0)
      .y((d) => yScale(d.supply))
      .curve(d3.curveMonotoneX);

    // Draw Lines
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#06b6d4")
      .attr("stroke-width", 3)
      .attr("d", demandLine);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4")
      .attr("d", inflowLine);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2)
      .attr("d", supplyLine);

    // Draw Circles for Demand Points
    g.selectAll(".dot-demand")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.month) || 0)
      .attr("cy", (d) => yScale(d.demand))
      .attr("r", 4)
      .attr("fill", "#06b6d4")
      .attr("stroke", "#09090b")
      .attr("stroke-width", 2);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "#a1a1aa")
      .style("font-size", "11px")
      .style("font-weight", "600");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll("text")
      .style("fill", "#71717a")
      .style("font-size", "10px");

    // Remove axis domain lines for modern aesthetic
    g.selectAll(".domain").attr("stroke", "#27272a");
    g.selectAll(".tick line").attr("stroke", "#27272a");
  }, [data]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400 border border-cyan-500/30">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>{themeTitle || "실시간 테마/산업 수급 인사이트"}</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                D3 MarketInsight
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              전방 산업 수요(Demand), 기관/외인 수급(Inflow), 공급망(Supply) 6개월 모멘텀 추이
            </p>
          </div>
        </div>

        {/* Dynamic Score Badge */}
        <div className="flex items-center space-x-3 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-800">
          <div className="text-right font-mono">
            <span className="text-[10px] font-bold text-zinc-400 block">AI 수급 가속도</span>
            <span className="text-sm font-black text-cyan-400">{score} / 100</span>
          </div>
          <Zap className="h-5 w-5 text-amber-400 animate-pulse" />
        </div>
      </div>

      {/* D3 SVG Canvas */}
      <div className="w-full relative overflow-hidden pt-1">
        <svg ref={svgRef} className="w-full h-[220px]" />
      </div>

      {/* Legend & Metric Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" /> 전방 수요(Demand)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block" /> 메이저 수급(Inflow)
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" /> 공급량(Supply)
          </span>
        </div>

        <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> D3.js 실시간 수급 엔진 연동 완료
        </div>
      </div>
    </div>
  );
};
