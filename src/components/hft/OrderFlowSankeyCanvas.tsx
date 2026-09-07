import React, { useEffect, useRef } from "react";

export const OrderFlowSankeyCanvas: React.FC<{
  width?: number;
  height?: number;
}> = ({ width = 480, height = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      offset += 0.04;

      const padding = { top: 20, bottom: 25, left: 15, right: 15 };
      const w = width - padding.left - padding.right;
      const h = height - padding.top - padding.bottom;

      // 4 Flow stages: [1] 30 Bots Inflow -> [2] AI Consensus -> [3] Smart Routing -> [4] Fill Execution
      const stages = [
        { label: "INPUT SIGNALS", x: padding.left, count: "1,480/s", color: "#00F2FE" },
        { label: "CONSENSUS SCORE", x: padding.left + w * 0.33, count: "Score > 85", color: "#FF9900" },
        { label: "DYNAMIC SIZING", x: padding.left + w * 0.66, count: "Kelly 2.4%", color: "#A855F7" },
        { label: "EXECUTED ORDERS", x: padding.left + w, count: "₩220M (12ms)", color: "#00F5A0" }
      ];

      // Draw multi-layered ribbon bezier flows
      const ribbonCount = 5;
      for (let r = 0; r < ribbonCount; r++) {
        const yOffset1 = padding.top + (h / ribbonCount) * r + Math.sin(offset + r) * 6;
        const yOffset2 = padding.top + (h / ribbonCount) * (r + 0.5) + Math.cos(offset + r * 0.5) * 8;
        const yOffset3 = padding.top + (h / ribbonCount) * (r + 0.2) + Math.sin(offset * 0.8 + r) * 5;
        const yOffset4 = padding.top + (h / ribbonCount) * r + Math.cos(offset + r) * 4;

        const grad = ctx.createLinearGradient(padding.left, 0, padding.left + w, 0);
        grad.addColorStop(0, "rgba(0, 242, 254, 0.45)");
        grad.addColorStop(0.35, "rgba(255, 153, 0, 0.4)");
        grad.addColorStop(0.7, "rgba(168, 85, 247, 0.45)");
        grad.addColorStop(1, "rgba(0, 245, 160, 0.6)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(padding.left, yOffset1);
        ctx.bezierCurveTo(
          padding.left + w * 0.2, yOffset1,
          padding.left + w * 0.25, yOffset2,
          padding.left + w * 0.33, yOffset2
        );
        ctx.bezierCurveTo(
          padding.left + w * 0.5, yOffset2,
          padding.left + w * 0.55, yOffset3,
          padding.left + w * 0.66, yOffset3
        );
        ctx.bezierCurveTo(
          padding.left + w * 0.85, yOffset3,
          padding.left + w * 0.9, yOffset4,
          padding.left + w, yOffset4
        );
        ctx.stroke();
      }

      // Draw stage milestone pillars
      stages.forEach((st) => {
        ctx.fillStyle = st.color;
        ctx.fillRect(st.x - 2, padding.top + 5, 4, h - 10);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(st.label, st.x, padding.top - 4);

        ctx.fillStyle = st.color;
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.fillText(st.count, st.x, padding.top + h + 14);
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [width, height]);

  return (
    <div className="w-full bg-[#08111D] border border-[#17283A] rounded-xl p-2.5 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black text-white tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ORDER FLOW &bull; WAVE EXECUTION BAND
        </span>
        <span className="text-[9px] font-mono text-cyan-400 font-bold">12ms ULTRA-LOW LATENCY</span>
      </div>
      <div className="relative w-full h-[150px]">
        <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain" />
      </div>
    </div>
  );
};
