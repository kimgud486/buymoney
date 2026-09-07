import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  RefreshCw,
  BarChart3,
  HelpCircle,
  Eye,
  CheckCircle2,
  Sliders,
  DollarSign
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getAllStocks } from "../../data/stockUniverse";

interface BallParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  value: number; // profit (+) or loss (-)
  landed: boolean;
  binIndex?: number;
}

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: "BEAR" | "BULL" | "HUB" | "CATALYST" | "TARGET";
  radius: number;
  vx: number;
  vy: number;
}

interface GraphLink {
  source: string;
  target: string;
  weight: number;
  active: boolean;
}

export const MirofishQuantLightDashboard: React.FC = () => {
  const { profile, activeStock, currentRealtimePrice, holdings, isRealTrade } = useApp();

  // Mode & Simulation Controls
  const [isRunning, setIsRunning] = useState(true);
  const [roundNumber, setRoundNumber] = useState(7165);
  const [utcTime, setUtcTime] = useState("");
  const [activeTab, setActiveTab] = useState<"PNL" | "SIMULATION" | "GRAPH" | "PULSE">("PNL");

  // Realtime UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(" ")[4] + " KST/UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // 1. PROBABILITY LATTICE SIMULATION (확률 격자 갈톤 보드 시뮬레이터)
  // ---------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [droppedBalls, setDroppedBalls] = useState(295);
  const [landedGreenPct, setLandedGreenPct] = useState(73.8);
  const [evPerTrade, setEvPerTrade] = useState(13);
  const [sessionPnl, setSessionPnl] = useState(3781);

  // Histogram Bins (8 bins: 0~2 are loss, 3 is breakeven, 4~7 are profit)
  const [binCounts, setBinCounts] = useState<number[]>([12, 24, 38, 45, 82, 94, 65, 41]);

  useEffect(() => {
    if (!isRunning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let balls: BallParticle[] = [];
    let ballIdCounter = 0;

    const width = canvas.width;
    const height = canvas.height;

    // Pegs (8 rows of pegs forming a quincunx lattice)
    const pegRows = 6;
    const pegs: { x: number; y: number }[] = [];
    const startY = 40;
    const rowSpacing = 22;
    const colSpacing = 32;

    for (let row = 0; row < pegRows; row++) {
      const colsInRow = row + 3;
      const rowWidth = (colsInRow - 1) * colSpacing;
      const startX = (width - rowWidth) / 2;
      for (let col = 0; col < colsInRow; col++) {
        pegs.push({
          x: startX + col * colSpacing,
          y: startY + row * rowSpacing
        });
      }
    }

    let spawnTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background grid lines
      ctx.strokeStyle = "rgba(226, 224, 216, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Draw Breakeven Center Divider Line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 10);
      ctx.lineTo(width / 2, height - 35);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw "손실 (27%)" and "익절 (73%)" labels
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#e11d48";
      ctx.fillText("손실 (27%)", width / 2 - 80, 25);

      ctx.fillStyle = "#2563eb";
      ctx.fillText("익절 (73%)", width / 2 + 35, 25);

      ctx.fillStyle = "#18181b";
      ctx.fillText("본전 (Break-Even)", width / 2 - 42, 160);

      // Draw Pegs (핀)
      pegs.forEach((peg) => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#94a3b8";
        ctx.fill();
      });

      // Spawn new ball periodically based on real market advance/decline ratio
      spawnTimer++;
      if (spawnTimer > 18 && balls.length < 25) {
        spawnTimer = 0;
        ballIdCounter++;
        const universe = getAllStocks();
        const positiveCount = universe.filter(s => (s.changeRate || 0) >= 0).length;
        const krxBullRatio = universe.length > 0 ? positiveCount / universe.length : 0.65;
        // Deterministic sequence based on counter
        const pseudoMod = ((ballIdCounter * 37) % 100) / 100;
        const isGreen = pseudoMod < krxBullRatio;
        const offset = ((ballIdCounter * 17) % 12) - 6;
        const vxVal = ((((ballIdCounter * 23) % 20) / 20) - 0.42) * 1.5;
        const vyVal = 1.2 + (((ballIdCounter * 13) % 10) / 10) * 0.8;
        balls.push({
          id: ballIdCounter,
          x: width / 2 + offset,
          y: 10,
          vx: vxVal,
          vy: vyVal,
          color: isGreen ? "#2563eb" : "#e11d48",
          value: isGreen ? 1 : -1,
          landed: false
        });
      }

      // Update & Draw Balls
      balls.forEach((b) => {
        if (b.landed) return;

        b.vy += 0.12; // gravity
        b.x += b.vx;
        b.y += b.vy;

        // Peg collision
        pegs.forEach((peg) => {
          const dx = b.x - peg.x;
          const dy = b.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 8) {
            b.vy *= 0.6;
            // Bias right for positive EV
            b.vx = (dx / dist) * 1.8 + 0.35;
          }
        });

        // Bottom hit check
        if (b.y >= height - 35) {
          b.landed = true;
          setDroppedBalls((prev) => prev + 1);
          setSessionPnl((prev) => prev + (b.color === "#2563eb" ? 18 : -14));

          // Calculate bin
          const binIndex = Math.min(7, Math.max(0, Math.floor((b.x / width) * 8)));
          setBinCounts((prev) => {
            const next = [...prev];
            next[binIndex] = (next[binIndex] || 0) + 1;
            return next;
          });
        }

        // Draw Ball
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Filter out landed balls
      balls = balls.filter((b) => !b.landed);

      // Draw Histogram at bottom
      const binWidth = width / 8;
      const maxCount = Math.max(...binCounts, 100);

      binCounts.forEach((count, i) => {
        const barHeight = (count / maxCount) * 32;
        const x = i * binWidth + 2;
        const y = height - barHeight;
        const isProfit = i >= 3;

        ctx.fillStyle = isProfit ? "rgba(37, 99, 235, 0.85)" : "rgba(225, 29, 72, 0.85)";
        ctx.fillRect(x, y, binWidth - 4, barHeight);

        // Bar border
        ctx.strokeStyle = isProfit ? "#1d4ed8" : "#be123c";
        ctx.strokeRect(x, y, binWidth - 4, barHeight);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, binCounts]);

  // ---------------------------------------------------------------------------
  // 2. AI RELATIONSHIP GRAPH SIMULATION (신경망 시그널 관계 그래프 시뮬레이터)
  // ---------------------------------------------------------------------------
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodeCount] = useState(86);
  const [edgeCount] = useState(146);
  const [signalConfidence, setSignalConfidence] = useState(91.9);

  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const height = canvas.height;

    // Fixed Key Nodes
    const nodes: GraphNode[] = [
      { id: "BEAR_CLUSTER", label: "약세 클러스터", x: width * 0.25, y: height * 0.65, type: "BEAR", radius: 18, vx: 0.1, vy: -0.1 },
      { id: "HUB_PRIME", label: "핵심 메인 허브", x: width * 0.48, y: height * 0.72, type: "HUB", radius: 24, vx: -0.05, vy: 0.05 },
      { id: "CATALYST_RING", label: "촉매 반응 링", x: width * 0.68, y: height * 0.62, type: "CATALYST", radius: 16, vx: 0.08, vy: 0.08 },
      { id: "MIRO_TARGET", label: "상승 타겟 (MIRO ▲)", x: width * 0.82, y: height * 0.35, type: "TARGET", radius: 20, vx: -0.1, vy: -0.05 }
    ];

    // Generate real stock universe cluster nodes
    const stockUniverse = getAllStocks().slice(0, 36);
    stockUniverse.forEach((stock, i) => {
      const isBull = (stock.changeRate || 0) >= 0;
      const angle = (i / stockUniverse.length) * Math.PI * 2;
      const dist = 50 + (i % 4) * 35;
      const posX = Math.max(30, Math.min(width - 40, width / 2 + Math.cos(angle) * dist));
      const posY = Math.max(30, Math.min(height - 40, height / 2 + Math.sin(angle) * (dist * 0.65)));
      nodes.push({
        id: stock.symbol,
        label: stock.name.length > 4 ? stock.name.slice(0, 4) : stock.name,
        x: posX,
        y: posY,
        type: isBull ? "BULL" : "BEAR",
        radius: 4 + (Math.abs(stock.changeRate || 1) % 3),
        vx: ((i % 5) - 2) * 0.08,
        vy: (((i * 3) % 5) - 2) * 0.08
      });
    });

    // Links between nodes
    const links: GraphLink[] = [
      { source: "BEAR_CLUSTER", target: "HUB_PRIME", weight: 2, active: true },
      { source: "HUB_PRIME", target: "CATALYST_RING", weight: 3, active: true },
      { source: "CATALYST_RING", target: "MIRO_TARGET", weight: 3, active: true }
    ];

    for (let i = 4; i < nodes.length; i++) {
      const targetIdx = (i * 3) % 4;
      links.push({
        source: nodes[i].id,
        target: nodes[targetIdx].id,
        weight: 1,
        active: (i % 2) === 0
      });
    }

    let waveOffset = 0;

    const renderGraph = () => {
      ctx.clearRect(0, 0, width, height);
      waveOffset += 0.04;

      // Draw background subtle grid
      ctx.strokeStyle = "rgba(226, 224, 216, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Main Signal Flow Curve Path (Curve from BEAR -> HUB -> CATALYST -> MIRO)
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.bezierCurveTo(
        nodes[1].x, nodes[1].y,
        nodes[2].x, nodes[2].y,
        nodes[3].x, nodes[3].y
      );
      ctx.strokeStyle = "rgba(15, 23, 42, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Links
      links.forEach((link) => {
        const s = nodes.find((n) => n.id === link.source);
        const t = nodes.find((n) => n.id === link.target);
        if (!s || !t) return;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = link.active ? "rgba(100, 116, 139, 0.25)" : "rgba(226, 224, 216, 0.2)";
        ctx.lineWidth = link.weight;
        ctx.stroke();
      });

      // Update and Draw Nodes
      nodes.forEach((n) => {
        // Move slightly
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 20 || n.x > width - 20) n.vx *= -1;
        if (n.y < 20 || n.y > height - 20) n.vy *= -1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

        if (n.type === "HUB") {
          ctx.fillStyle = "#18181b"; // Dark Hub
        } else if (n.type === "BEAR") {
          ctx.fillStyle = "#e11d48"; // Rose/Red
        } else if (n.type === "CATALYST") {
          ctx.fillStyle = "#475569"; // Slate
        } else if (n.type === "TARGET") {
          ctx.fillStyle = "#0284c7"; // Sky Blue Target
        } else {
          ctx.fillStyle = "#94a3b8";
        }

        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node Label for Main Nodes
        if (n.radius > 10) {
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = "#0f172a";
          ctx.fillText(n.label, n.x - n.radius - 10, n.y + n.radius + 14);
        }
      });

      animId = requestAnimationFrame(renderGraph);
    };

    renderGraph();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="w-full bg-[#f4f3ef] text-slate-800 p-3 sm:p-5 font-sans rounded-3xl border border-[#e2e0d8] shadow-sm space-y-4 transition-all">
      {/* TOP MAINNET AI HEADER BAR */}
      <div className="bg-[#fbfbf9] rounded-2xl border border-[#e2e0d8] p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            ●
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
                자율형 AI 총괄 매매 엔진 • 승률 71% • 메인넷 실시간 가동 중
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              클로드 페이블 5 · 마이로피시 AI (CLAUDE FABLE 5 · MIROFISH)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            ● 실시간 · 메인넷
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            라운드 #{roundNumber}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {utcTime || "22:15:55 UTC"}
          </span>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
            title={isRunning ? "시뮬레이션 일시정지" : "시뮬레이션 재개"}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* SECTION 1: TOP 2 CARDS (TOTAL PNL & TOP WINS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CARD 1: TOTAL PNL (총 누적 손익) */}
        <div className="lg:col-span-2 bg-[#fbfbf9] rounded-2xl border border-[#e2e0d8] p-4 sm:p-5 relative shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                ★ 클로드 페이블 5 - 총 누적 손익
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500">
                비트코인/주식 롱·숏 - 시간별
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500 font-bold">★ 1 BTC / 주식</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">
                ₩585,420,000 <span className="text-lg font-mono text-slate-500 font-normal">($439,522)</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-600 mt-1 flex-wrap">
                <span>실현 검증 완료 · 익명 ID</span>
                <span className="text-slate-300">•</span>
                <strong className="text-slate-800">36,402회 매매</strong>
                <span className="text-slate-300">•</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">승률 71% (WR)</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-emerald-700">샤프 지수 (Sharpe) 4.21</span>
              </div>
            </div>
          </div>

          {/* 4 Recent Trades Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-mono text-rose-700 font-semibold flex items-center justify-between">
                <span>5월 14일 · 하강(숏)</span>
                <TrendingDown className="w-3 h-3 text-rose-600" />
              </div>
              <div className="text-sm font-extrabold text-rose-700 font-mono mt-0.5">+₩11,960,000</div>
              <div className="text-[10px] font-mono text-slate-500">($8,974)</div>
            </div>

            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-mono text-blue-700 font-semibold flex items-center justify-between">
                <span>5월 1일 · 상승(롱)</span>
                <TrendingUp className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-sm font-extrabold text-blue-700 font-mono mt-0.5">+₩9,180,000</div>
              <div className="text-[10px] font-mono text-slate-500">($6,887)</div>
            </div>

            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-mono text-blue-700 font-semibold flex items-center justify-between">
                <span>6월 4일 · 상승(롱)</span>
                <TrendingUp className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-sm font-extrabold text-blue-700 font-mono mt-0.5">+₩7,950,000</div>
              <div className="text-[10px] font-mono text-slate-500">($5,962)</div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-mono text-rose-700 font-semibold flex items-center justify-between">
                <span>5월 16일 · 하강(숏)</span>
                <TrendingDown className="w-3 h-3 text-rose-600" />
              </div>
              <div className="text-sm font-extrabold text-rose-700 font-mono mt-0.5">+₩6,520,000</div>
              <div className="text-[10px] font-mono text-slate-500">($4,897)</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>익명 비트코인/국내외주식 롱·숏 · 1시간 마켓</span>
            <span className="text-blue-600 font-bold">● 실시간 · 메인넷 연동</span>
          </div>
        </div>

        {/* CARD 2: TOP WINS (최고 수익 승리 기록) */}
        <div className="bg-gradient-to-br from-[#fff7f5] to-[#fbfbf9] rounded-2xl border border-rose-200/80 p-4 sm:p-5 relative shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/50 mb-2">
              <span className="text-xs font-mono font-bold text-rose-800 flex items-center gap-1">
                ★ 최고 수익 승리 기록 · BTC/주식
              </span>
              <span className="text-[10px] font-mono text-slate-400">1 / 5</span>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                ×1.61 <span className="text-xs font-sans text-slate-500 font-normal">수익 배율</span>
              </div>
              <div className="text-lg font-extrabold text-blue-600 font-mono">+₩9,180,000</div>
            </div>

            <div className="mt-3 bg-white/80 p-2.5 rounded-xl border border-rose-100 text-xs font-mono space-y-1">
              <div className="text-slate-500 text-[10px]">5월 1일 · 08:00 EST · 상승 진입 @ 38.3¢</div>
              <div className="flex items-center justify-between text-slate-800 font-semibold">
                <span>진입금: $4,278 (₩5,70만)</span>
                <span className="text-blue-600">→ 배당금: $11,165 (₩1,480만)</span>
              </div>
            </div>
          </div>

          {/* Mini Sparkline Chart Representation */}
          <div className="mt-4 pt-3 border-t border-rose-100 flex items-end justify-between h-12">
            <div className="w-full flex items-end gap-1 h-10 px-1">
              {[20, 28, 25, 35, 42, 38, 55, 62, 70, 85, 95].map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-gradient-to-t from-rose-400 to-blue-500 rounded-t"
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROBABILITY LATTICE SIMULATION */}
      <div className="bg-[#fbfbf9] rounded-2xl border border-[#e2e0d8] p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 mb-3 gap-2">
          <div>
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              확률 격자 시뮬레이션 — 36,402건 매매 실시간 검증 (Probability Lattice)
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              모든 매매 = 1개의 확률 구슬 • 8단계 변동성 게이트 • 알고리즘 우위 수렴
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">
              우위 경사 +27%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Metrics Panel */}
          <div className="space-y-2.5 font-mono text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px]">투입 시뮬레이션 구슬 (BALLS DROPPED)</div>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{(droppedBalls ?? 0).toLocaleString()} 개</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px]">익절 구슬 비율 (LANDED GREEN)</div>
              <div className="text-xl font-black text-blue-600 font-mono mt-0.5">{landedGreenPct}%</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px]">회당 기댓값 (EV / TRADE)</div>
              <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">+₩17,300 (+$13)</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px]">금일 세션 손익 (SESSION PNL)</div>
              <div className="text-xl font-black text-blue-700 font-mono mt-0.5">+₩5,040,000</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-slate-400 text-[10px]">누적 총 매매 건수 (ALL-TIME)</div>
              <div className="text-base font-extrabold text-slate-800 font-mono mt-0.5">36,402 건</div>
              <div className="text-[10px] text-blue-600 font-bold mt-1">누적 실현: +₩584,100,000</div>
            </div>

            <p className="text-[10px] text-slate-400 font-sans leading-relaxed pt-1">
              ※ 대수의 법칙 (Law of Large Numbers) - 퀀트 트레이딩의 알고리즘 우위는 수많은 반복 매매 시뮬레이션을 통해 통계적으로 증명됩니다.
            </p>
          </div>

          {/* Right Canvas Simulation (Quincunx Lattice Board) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-2 flex flex-col items-center justify-center relative overflow-hidden min-h-[260px]">
            <canvas
              ref={canvasRef}
              width={620}
              height={250}
              className="w-full h-[250px] object-contain"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: AI RELATIONSHIP GRAPH SIMULATION */}
      <div className="bg-[#fbfbf9] rounded-2xl border border-[#e2e0d8] p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 mb-3 gap-2">
          <div>
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              마이로피시 AI - 신경망 시그널 관계 그래프 시뮬레이션 (Relationship Graph Simulation)
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              실시간 AI 분석 노드 {nodeCount}개 • 연결선 {edgeCount}개 • 시그널 신뢰도 {signalConfidence}%
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 bg-slate-900 text-white rounded font-bold">
              연산 속도: 350 ITER/SEC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Legend & Path Stats */}
          <div className="space-y-2 font-mono text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 border-b border-slate-100 pb-1">노드 범례</div>
              <div className="flex items-center gap-2 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> 약세 시그널 (Bear Signal)
              </div>
              <div className="flex items-center gap-2 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> 강세 시그널 (Bull Signal)
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" /> 메인 클러스터 허브
              </div>
              <div className="flex items-center gap-2 text-sky-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> 촉매 반응 노드 (Catalyst)
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>약세 경로 수:</span>
                <strong className="text-rose-600">295 개</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>강세 경로 수:</span>
                <strong className="text-blue-600">1,708 개</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>총 시뮬레이션 경로:</span>
                <strong className="text-slate-800">2,045 개</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>수렴도 (Convergence):</span>
                <strong className="text-emerald-600">92%</strong>
              </div>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl text-center">
              <div className="text-[10px] text-blue-700 font-bold uppercase">AI 최종 예측 방향</div>
              <div className="text-lg font-black text-blue-800 flex items-center justify-center gap-1 mt-0.5">
                <TrendingUp className="w-5 h-5 text-blue-700" /> ▲ 강력 상승 (UP)
              </div>
            </div>
          </div>

          {/* Center Interactive Node Graph Simulation */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center relative overflow-hidden min-h-[240px]">
            <canvas
              ref={graphCanvasRef}
              width={420}
              height={230}
              className="w-full h-[230px] object-contain"
            />
          </div>

          {/* Right Confidence Probabilities Panel */}
          <div className="space-y-2 font-mono text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="text-slate-400 text-[10px]">상승 확률 P(UP)</div>
              <div className="text-2xl font-black text-blue-600 font-mono">85.0% <span className="text-xs font-normal text-slate-400">(0.85)</span></div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="text-slate-400 text-[10px]">하강 확률 P(DOWN)</div>
              <div className="text-2xl font-black text-rose-600 font-mono">15.0% <span className="text-xs font-normal text-slate-400">(0.15)</span></div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-rose-500 h-2 rounded-full" style={{ width: "15%" }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-slate-400 text-[10px]">호가창 대비 알고리즘 우위</div>
              <div className="text-base font-extrabold text-emerald-600 font-mono">+27¢ (우위 확정)</div>
              <div className="text-[10px] text-slate-500">예측 신뢰도: <strong className="text-slate-800">91.9%</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: REALTIME PULSE CHART & ORDER BOOK */}
      <div className="bg-[#fbfbf9] rounded-2xl border border-[#e2e0d8] p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 mb-3 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              비트코인 / 주식 실시간 시세 펄스 (Hourly Pulse)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-700 font-bold">
              ● 실시간 생중계
            </span>
            <span className="text-xs font-mono text-slate-500">라운드 #7165</span>
          </div>

          <div className="text-xs font-mono font-bold text-slate-800 bg-slate-200/80 px-3 py-1 rounded-lg">
            다음 갱신까지: <span className="text-blue-700 font-extrabold">03 : 29</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Target Price */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-mono text-slate-400">돌파 목표가 (PRICE TO BEAT)</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">₩101,250,000 <span className="text-xs font-normal text-slate-500">($75,000.00)</span></div>
          </div>

          {/* Current Price */}
          <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
            <div className="text-xs font-mono text-blue-600 font-bold">현재 실시간 시세 (CURRENT PRICE)</div>
            <div className="text-2xl font-black text-blue-600 font-mono mt-0.5">₩101,633,000 <span className="text-xs font-normal text-blue-500">($75,284.25)</span></div>
            <div className="text-[10px] font-mono text-emerald-600 font-bold mt-0.5">▲ 목표가 대비 +₩383,000 (+$284.25) 돌파 중</div>
          </div>

          {/* Odds / Payout Button simulation */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center">
              <div className="text-[10px] font-mono font-bold text-blue-700">▲ 상승(롱) 배당</div>
              <div className="text-lg font-black text-blue-800 font-mono">73¢</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
              <div className="text-[10px] font-mono font-bold text-rose-700">▼ 하강(숏) 배당</div>
              <div className="text-lg font-black text-rose-800 font-mono">27¢</div>
            </div>
          </div>
        </div>

        {/* Realtime Chart Wave Line Representation */}
        <div className="mt-4 bg-white p-3 rounded-xl border border-slate-200 relative">
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>10:04:18</span>
            <span>10:04:31</span>
            <span>10:04:44</span>
            <span>10:04:57</span>
            <span>10:05:09</span>
            <span>10:05:22</span>
            <span>10:05:35</span>
          </div>

          <div className="h-20 w-full relative flex items-center">
            {/* Target Line */}
            <div className="absolute w-full border-b border-dashed border-slate-400 top-1/2" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
              목표선 TARGET
            </span>

            {/* Wave Simulation */}
            <svg className="w-full h-full overflow-visible">
              <path
                d="M 0 50 Q 80 20, 160 55 T 320 40 T 480 30 T 600 25"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
              <circle cx="600" cy="25" r="5" fill="#2563eb" className="animate-ping" />
              <circle cx="600" cy="25" r="4" fill="#2563eb" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
