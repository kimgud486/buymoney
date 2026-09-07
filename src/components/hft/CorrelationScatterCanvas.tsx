import React, { useEffect, useRef } from "react";

export const CorrelationScatterCanvas: React.FC<{
  width?: number;
  height?: number;
}> = ({ width = 360, height = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    // Generate 45 scatter points (Multi-bot conviction vs price return)
    const points = Array.from({ length: 45 }, (_, i) => ({
      baseX: 20 + Math.random() * 60,
      baseY: 20 + Math.random() * 60,
      speed: 0.02 + Math.random() * 0.03,
      size: 2 + Math.random() * 3,
      color: i % 3 === 0 ? "#00F5A0" : i % 3 === 1 ? "#00F2FE" : "#FF9900"
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 0.03;

      const padding = { top: 20, bottom: 25, left: 30, right: 15 };
      const w = width - padding.left - padding.right;
      const h = height - padding.top - padding.bottom;

      // Draw Grid & Axes
      ctx.strokeStyle = "rgba(23, 40, 58, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      for (let i = 0; i <= 3; i++) {
        const y = padding.top + (h / 3) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Regression Trendline
      ctx.strokeStyle = "#00F2FE";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + h * 0.85);
      ctx.lineTo(padding.left + w, padding.top + h * 0.15 + Math.sin(tick) * 5);
      ctx.stroke();

      // Draw Confidence Scatter Points with floating movement
      points.forEach((p, idx) => {
        const dynamicX = p.baseX + Math.sin(tick * p.speed + idx) * 8;
        const dynamicY = p.baseY + Math.cos(tick * p.speed + idx) * 8;

        const cx = padding.left + (dynamicX / 100) * w;
        const cy = padding.top + h - (dynamicY / 100) * h;

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Axis Labels
      ctx.fillStyle = "#8E9EB5";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("AI CONVICTION (X) vs REALIZED PNL (Y)", padding.left, 12);
      ctx.fillText("R² = 0.894 (HIGH CONFIDENCE)", padding.left + w - 120, 12);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [width, height]);

  return (
    <div className="w-full bg-[#08111D] border border-[#17283A] rounded-xl p-2.5 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black text-white tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> PROBABILITY REGRESSION SCATTER
        </span>
        <span className="text-[9px] font-mono text-emerald-400 font-bold">● ALPHA +4.8%</span>
      </div>
      <div className="relative w-full h-[150px]">
        <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain" />
      </div>
    </div>
  );
};
