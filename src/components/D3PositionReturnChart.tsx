import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useApp } from "../context/AppContext";
import { StockPosition } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  PieChart, 
  Sparkles, 
  Info, 
  Layers, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";

interface ChartDataItem {
  symbol: string;
  name: string;
  market: string;
  avgPrice: number;
  currentPrice: number;
  quantity: number;
  returnPct: number;
  pnl: number;
}

interface HoveredPositionInfo {
  symbol: string;
  name: string;
  market: string;
  avgPrice: number;
  currentPrice: number;
  quantity: number;
  returnPct: number;
  pnl: number;
  x: number;
  y: number;
}

export const D3PositionReturnChart: React.FC = () => {
  const { positions } = useApp();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<HoveredPositionInfo | null>(null);

  // Filter positions with valid numbers
  const validPositions = positions.filter(p => (Number(p.avgPrice) || 0) > 0 && (Number(p.quantity) || 0) > 0);

  // Compute portfolio summary stats
  const totalInvested = validPositions.reduce((acc, p) => acc + ((Number(p.quantity) || 0) * (Number(p.avgPrice) || 0)), 0);
  const totalCurrentValue = validPositions.reduce((acc, p) => acc + ((Number(p.quantity) || 0) * (Number(p.currentPrice || p.avgPrice) || 0)), 0);
  const totalPnl = totalCurrentValue - totalInvested;
  const avgReturnPct = totalInvested > 0 && !isNaN(totalInvested) ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

  // Find top and bottom performing position
  let topPosition: { position: StockPosition; pct: number } | null = null;
  let bottomPosition: { position: StockPosition; pct: number } | null = null;

  validPositions.forEach(p => {
    const curP = Number(p.currentPrice || p.avgPrice) || 0;
    const avgP = Number(p.avgPrice) || 0;
    const pct = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
    if (!isNaN(pct)) {
      if (!topPosition || pct > topPosition.pct) {
        topPosition = { position: p, pct };
      }
      if (!bottomPosition || pct < bottomPosition.pct) {
        bottomPosition = { position: p, pct };
      }
    }
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || validPositions.length === 0) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove(); // Clear previous drawings

    const width = containerRef.current.clientWidth || 600;
    const height = 280;
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = svgElement
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare chart data
    const chartData: ChartDataItem[] = validPositions.map(p => {
      const curP = Number(p.currentPrice || p.avgPrice) || 0;
      const avgP = Number(p.avgPrice) || 0;
      const qty = Number(p.quantity) || 0;
      const returnPct = avgP > 0 ? ((curP - avgP) / avgP) * 100 : 0;
      const pnl = (curP - avgP) * qty;
      return {
        symbol: p.symbol,
        name: p.name,
        market: p.market,
        avgPrice: avgP,
        currentPrice: curP,
        quantity: qty,
        returnPct: isNaN(returnPct) ? 0 : returnPct,
        pnl: isNaN(pnl) ? 0 : pnl
      };
    });

    // Scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.35);

    const minPct = d3.min(chartData, (d: ChartDataItem) => d.returnPct) ?? 0;
    const maxPct = d3.max(chartData, (d: ChartDataItem) => d.returnPct) ?? 0;
    
    // Extend domain boundaries symmetrically for breathing room
    const absMax = Math.max(Math.abs(Number(minPct)), Math.abs(Number(maxPct)), 5);
    const yScale = d3.scaleLinear()
      .domain([-absMax * 1.2, absMax * 1.2])
      .range([innerHeight, 0]);

    const zeroY = yScale(0);

    // Draw background grid lines
    const yAxisGrid = d3.axisLeft(yScale)
      .ticks(6)
      .tickSize(-innerWidth)
      .tickFormat(() => "");

    svg.append("g")
      .attr("class", "grid")
      .call(yAxisGrid)
      .selectAll("line")
      .attr("stroke", "#e4e4e7")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-opacity", 0.7);

    // Zero baseline
    svg.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", zeroY)
      .attr("y2", zeroY)
      .attr("stroke", "#27272a")
      .attr("stroke-width", 1.5);

    // Render Bars with D3 Transitions
    const bars = svg.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("g")
      .attr("class", "bar-group");

    bars.append("rect")
      .attr("x", (d: ChartDataItem) => xScale(d.name) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", zeroY) // Start from zero baseline for animation
      .attr("height", 0)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", (d: ChartDataItem) => d.returnPct >= 0 ? "#e11d48" : "#2563eb") // Red/Rose for positive, Blue for negative (Korean style)
      .attr("opacity", 0.9)
      .attr("cursor", "pointer")
      .on("mouseover", (event: any, d: ChartDataItem) => {
        d3.select(event.currentTarget)
          .attr("opacity", 1)
          .attr("stroke", "#000")
          .attr("stroke-width", 1.5);

        const rect = event.currentTarget.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          setHoveredInfo({
            symbol: d.symbol,
            name: d.name,
            market: d.market,
            avgPrice: d.avgPrice,
            currentPrice: d.currentPrice,
            quantity: d.quantity,
            returnPct: d.returnPct,
            pnl: d.pnl,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top
          });
        }
      })
      .on("mouseout", (event: any) => {
        d3.select(event.currentTarget)
          .attr("opacity", 0.9)
          .attr("stroke", "none");
        setHoveredInfo(null);
      })
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr("y", (d: ChartDataItem) => d.returnPct >= 0 ? yScale(d.returnPct) : zeroY)
      .attr("height", (d: ChartDataItem) => Math.abs(yScale(d.returnPct) - zeroY));

    // Render percentage labels above/below bars
    bars.append("text")
      .attr("x", (d: ChartDataItem) => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr("y", zeroY)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-family", "monospace")
      .attr("fill", (d: ChartDataItem) => d.returnPct >= 0 ? "#e11d48" : "#2563eb")
      .text((d: ChartDataItem) => `${d.returnPct >= 0 ? "+" : ""}${d.returnPct.toFixed(2)}%`)
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr("y", (d: ChartDataItem) => d.returnPct >= 0 ? yScale(d.returnPct) - 6 : yScale(d.returnPct) + 14);

    // X-Axis (Stock Names)
    const xAxis = d3.axisBottom(xScale);
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#27272a")
      .attr("dy", "1em");

    // Y-Axis (Percentage %)
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => `${d}%`);

    svg.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("fill", "#71717a");

  }, [validPositions]);

  // ResizeObserver for dynamic responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Re-trigger render on width change
      if (validPositions.length > 0) {
        setHoveredInfo(null);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [validPositions]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-xs" id="d3-position-return-chart">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
            <BarChart2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <span>보유 종목별 실시간 수익률 (D3.js Return Rate Chart)</span>
              <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded font-mono">D3 v7 Engine</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              매수 단가 대비 현재가의 변동폭(수익률 %)과 평가손익을 D3.js 가상화 엔진으로 시각화합니다.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-bold font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-rose-600 inline-block"></span>
            <span className="text-zinc-700">수익 (Plus)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-blue-600 inline-block"></span>
            <span className="text-zinc-700">손실 (Minus)</span>
          </div>
        </div>
      </div>

      {/* Metrics Banner Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg space-y-0.5">
          <span className="text-[10px] text-zinc-400 block font-sans">평균 보유 수익률</span>
          <div className={`text-base font-black flex items-center gap-1 ${
            avgReturnPct >= 0 ? "text-rose-600" : "text-blue-600"
          }`}>
            {avgReturnPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{avgReturnPct >= 0 ? "+" : ""}{avgReturnPct.toFixed(2)}%</span>
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg space-y-0.5">
          <span className="text-[10px] text-zinc-400 block font-sans">총 평가손익 합계</span>
          <div className={`text-base font-black ${
            totalPnl >= 0 ? "text-rose-600" : "text-blue-600"
          }`}>
            {totalPnl >= 0 ? "+" : ""}{Math.round(totalPnl).toLocaleString()}원
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg space-y-0.5">
          <span className="text-[10px] text-zinc-400 block font-sans">최고 수익 종목</span>
          {topPosition ? (
            <div className="text-xs font-bold text-zinc-900 truncate flex items-center justify-between">
              <span className="truncate">{topPosition.position.name}</span>
              <span className="text-rose-600 ml-1">+{topPosition.pct.toFixed(1)}%</span>
            </div>
          ) : (
            <span className="text-zinc-400 text-xs">-</span>
          )}
        </div>

        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg space-y-0.5">
          <span className="text-[10px] text-zinc-400 block font-sans">최저 수익 종목</span>
          {bottomPosition ? (
            <div className="text-xs font-bold text-zinc-900 truncate flex items-center justify-between">
              <span className="truncate">{bottomPosition.position.name}</span>
              <span className={bottomPosition.pct >= 0 ? "text-rose-600 ml-1" : "text-blue-600 ml-1"}>
                {bottomPosition.pct >= 0 ? "+" : ""}{bottomPosition.pct.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="text-zinc-400 text-xs">-</span>
          )}
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="relative w-full min-h-[280px]" ref={containerRef}>
        {validPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[260px] bg-zinc-50 border border-dashed border-zinc-200 rounded-lg space-y-2 p-6 text-center">
            <Layers className="h-8 w-8 text-zinc-300" />
            <p className="text-xs font-bold text-zinc-600">현재 보유 중인 포트폴리오 종목이 없습니다.</p>
            <p className="text-[11px] text-zinc-400 max-w-sm">
              상단 종목 주문 콘솔에서 매수 주문을 실행하시면 실시간 매수 단가 대비 D3.js 수익률 변동 차트가 활성화됩니다.
            </p>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full block overflow-visible"></svg>
        )}

        {/* Hover Floating Tooltip Card */}
        {hoveredInfo && (
          <div
            className="absolute z-20 bg-zinc-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 pointer-events-none border border-zinc-700 -translate-x-1/2 -translate-y-full font-sans"
            style={{ left: `${hoveredInfo.x}px`, top: `${hoveredInfo.y - 10}px` }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-1 font-mono">
              <span className="font-bold text-white text-xs">{hoveredInfo.name}</span>
              <span className="text-[10px] text-zinc-400">{hoveredInfo.symbol} ({hoveredInfo.market})</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
              <span className="text-zinc-400">보유 수량:</span>
              <span className="font-bold text-right text-zinc-100">{(hoveredInfo.quantity ?? 0).toLocaleString()}주</span>

              <span className="text-zinc-400">평균 매수가:</span>
              <span className="font-bold text-right text-zinc-100">
                {hoveredInfo.market === "US" ? `$${(hoveredInfo.avgPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(hoveredInfo.avgPrice ?? 0).toLocaleString()}원`}
              </span>

              <span className="text-zinc-400">현재가:</span>
              <span className="font-bold text-right text-emerald-400">
                {hoveredInfo.market === "US" ? `$${(hoveredInfo.currentPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(hoveredInfo.currentPrice ?? 0).toLocaleString()}원`}
              </span>

              <span className="text-zinc-400">평가손익:</span>
              <span className={`font-bold text-right ${hoveredInfo.pnl >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                {hoveredInfo.pnl >= 0 ? "+" : ""}{hoveredInfo.market === "US" ? `$${(hoveredInfo.pnl ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${Math.round(hoveredInfo.pnl).toLocaleString()}원`}
              </span>

              <span className="text-zinc-400">수익률:</span>
              <span className={`font-bold text-right ${hoveredInfo.returnPct >= 0 ? "text-rose-400" : "text-blue-400"}`}>
                {hoveredInfo.returnPct >= 0 ? "+" : ""}{hoveredInfo.returnPct.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
