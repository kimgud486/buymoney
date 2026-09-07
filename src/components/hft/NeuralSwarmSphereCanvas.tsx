import React, { useEffect, useRef } from "react";

interface NodePoint {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  orbitRadius: number;
  theta: number;
  phi: number;
  speed: number;
  color: string;
  size: number;
}

export const NeuralSwarmSphereCanvas: React.FC<{
  width?: number;
  height?: number;
  winRate?: number;
}> = ({ width = 360, height = 320, winRate = 68.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let rotationAngle = 0;

    // Generate 120+ swarm particles on concentric 3D spheres
    const particles: NodePoint[] = [];
    const colors = ["#00F2FE", "#4FACFE", "#FF9900", "#FF5E62", "#00F5A0", "#FEE140", "#A855F7"];

    for (let i = 0; i < 140; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const orbitRadius = 60 + (i % 4) * 20 + Math.random() * 15;

      particles.push({
        x: 0,
        y: 0,
        z: 0,
        baseRadius: orbitRadius,
        orbitRadius,
        theta,
        phi,
        speed: 0.004 + (i % 5) * 0.002,
        color: colors[i % colors.length],
        size: 1.5 + Math.random() * 2.5
      });
    }

    // Concentric orbital rings
    const rings = [45, 75, 105, 130];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      rotationAngle += 0.008;

      // Draw background glow
      const bgGlow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 140);
      bgGlow.addColorStop(0, "rgba(0, 242, 254, 0.12)");
      bgGlow.addColorStop(0.5, "rgba(255, 153, 0, 0.06)");
      bgGlow.addColorStop(1, "rgba(5, 10, 18, 0)");
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Draw orbital dashed rings
      rings.forEach((r, idx) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = idx % 2 === 0 ? "rgba(0, 242, 254, 0.15)" : "rgba(255, 153, 0, 0.15)";
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.ellipse(centerX, centerY, r, r * 0.45, rotationAngle * (idx % 2 === 0 ? 0.5 : -0.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Update 3D points
      particles.forEach((p, idx) => {
        p.theta += p.speed;

        // 3D Spherical coordinates to Cartesian
        const rx = p.orbitRadius * Math.sin(p.phi) * Math.cos(p.theta + rotationAngle);
        const ry = p.orbitRadius * Math.sin(p.phi) * Math.sin(p.theta + rotationAngle);
        const rz = p.orbitRadius * Math.cos(p.phi);

        // 3D Rotation along Y and X axis for depth perspective
        const rotY = rx * Math.cos(rotationAngle * 0.7) - rz * Math.sin(rotationAngle * 0.7);
        const rotZ = rx * Math.sin(rotationAngle * 0.7) + rz * Math.cos(rotationAngle * 0.7);
        const rotX = rotY;

        // Projection
        const fov = 200;
        const scale = fov / (fov + rotZ);
        p.x = centerX + rotX * scale;
        p.y = centerY + ry * scale * 0.85;
        p.z = rotZ;
      });

      // Sort by Z for proper depth rendering
      particles.sort((a, b) => a.z - b.z);

      // Draw connecting synapse lines between close particles
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i += 2) {
        for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 38) {
            const alpha = (1 - dist / 38) * 0.35 * ((particles[i].z + 100) / 200);
            ctx.strokeStyle = `rgba(0, 242, 254, ${Math.max(0.05, alpha)})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        const alpha = Math.min(1, Math.max(0.2, (p.z + 120) / 240));
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.8, p.size * (alpha + 0.3)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Central Core Pulsing Hub
      const corePulse = Math.sin(Date.now() * 0.005) * 4;
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 24 + corePulse);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGrad.addColorStop(0.3, "rgba(0, 242, 254, 0.8)");
      coreGrad.addColorStop(0.7, "rgba(255, 153, 0, 0.4)");
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24 + corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Central Hub icon / text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AI SWARM", centerX, centerY - 3);
      ctx.fillStyle = "#00F2FE";
      ctx.font = "bold 7px 'JetBrains Mono', monospace";
      ctx.fillText("140 NODES", centerX, centerY + 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full object-contain"
      />
      {/* Overlay Circular Win Rate Gauge (top right of sphere like video) */}
      <div className="absolute top-2 right-2 bg-[#08111D]/85 border border-[#17283A] p-2 rounded-xl backdrop-blur-md text-right font-mono">
        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">SWARM CONSENSUS</div>
        <div className="text-sm font-black text-[#00F5A0] flex items-center justify-end gap-1">
          <span>{winRate}%</span>
          <span className="text-[10px] text-zinc-400 font-normal">WIN PROB</span>
        </div>
        <div className="w-20 h-1.5 bg-[#0E1927] rounded-full overflow-hidden mt-1 border border-[#17283A]">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 rounded-full animate-pulse"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};
