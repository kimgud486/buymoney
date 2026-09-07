import React, { useState, useEffect } from "react";
import {
  Brain,
  Zap,
  ShieldAlert,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Radio,
  SlidersHorizontal,
  FileText
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  orchestratorEngine,
  OrchestratedState,
  TradingMode,
  LogSeverity
} from "../services/aiTradingOrchestratorEngine";
import { BotOutput } from "../types/multiAgentTypes";

export const UnifiedTradingControl: React.FC = () => {
  const { positions, profile, selectedSymbol, pricePulse, openStockChart } = useApp();
  const [orchestratorState, setOrchestratorState] = useState<OrchestratedState>(
    orchestratorEngine.getState()
  );
  const [selectedBotDetail, setSelectedBotDetail] = useState<BotOutput | null>(null);
  const [logFilter, setLogFilter] = useState<string>("ALL");

  useEffect(() => {
    const unsubscribe = orchestratorEngine.subscribe((newState) => {
      setOrchestratorState(newState);
    });
    return unsubscribe;
  }, []);

  const {
    mode,
    isEngineActive,
    minConvictionScore,
    circuitBreakerTriggered,
    activePosition,
    logs,
    currentAnalysis
  } = orchestratorState;

  const realDisplayPosition = positions && positions.length > 0
    ? {
        symbol: positions[0].symbol,
        name: positions[0].name,
        qty: positions[0].qty,
        buyPrice: positions[0].avgPrice,
        currentPrice: positions[0].currentPrice || positions[0].avgPrice,
        pnlAmount: Math.round(((positions[0].currentPrice || positions[0].avgPrice) - positions[0].avgPrice) * positions[0].qty),
        pnlPct: +((( (positions[0].currentPrice || positions[0].avgPrice) - positions[0].avgPrice) / positions[0].avgPrice) * 100).toFixed(2),
        trailingShieldPrice: Math.round((positions[0].currentPrice || positions[0].avgPrice) * 0.985),
        isShieldActive: true
      }
    : activePosition;

  const handleModeChange = (newMode: TradingMode) => {
    orchestratorEngine.setMode(newMode);
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === "ALL") return true;
    if (logFilter === "AI") return log.type === "AI_BUY";
    if (logFilter === "MANUAL") return log.type === "MANUAL_BUY";
    if (logFilter === "SELL") return log.type === "SELL";
    if (logFilter === "SHIELD") return log.type === "SHIELD";
    return true;
  });

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-16">
      
      {/* 1. TOP UNIFIED CONTROL HEADER */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border-2 border-indigo-500/60 p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white rounded-2xl shadow-lg shadow-indigo-950/80 animate-pulse">
              <Brain className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white font-mono tracking-tight">
                  UNIFIED TRADING CONTROL CENTER
                </h1>
                <span className="px-3 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/60 rounded-full text-xs font-mono font-bold">
                  통합 매매 관제 v8.5
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                수동 매매 제어와 AI 자율매매 상태를 한곳에서 실시간 관제 및 직접 제어합니다.
              </p>
            </div>
          </div>

          {/* Master Mode Badge & Status */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="bg-zinc-900 p-2 rounded-2xl border border-zinc-800 flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${isEngineActive ? "text-emerald-400 animate-ping" : "text-rose-400"}`} />
              <span className="text-zinc-400">엔진 상태:</span>
              <strong className={isEngineActive ? "text-emerald-400" : "text-rose-400"}>
                {isEngineActive ? "가동 중 (RUNNING)" : "정지됨 (STOPPED)"}
              </strong>
            </div>

            <div className="bg-zinc-900 p-2 rounded-2xl border border-zinc-800 flex items-center gap-2">
              <span className="text-zinc-400">현재 모드:</span>
              <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-600 rounded font-bold">
                {mode === "AUTONOMOUS" ? "🤖 100% AI 자율매매" : mode === "HYBRID" ? "🎛️ 하이브리드" : "👆 수동 전용"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. UNIFIED MODE SWITCHING & CONVICTION THRESHOLD SELECTOR */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-800/80">
          
          {/* Mode Switcher Buttons */}
          <div className="md:col-span-8 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 flex items-center gap-1.5">
            <button
              onClick={() => handleModeChange("AUTONOMOUS")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === "AUTONOMOUS"
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg ring-1 ring-indigo-400"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Brain className="w-4 h-4 text-amber-300" />
              <span>🤖 100% AI 자율매매</span>
            </button>

            <button
              onClick={() => handleModeChange("HYBRID")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === "HYBRID"
                  ? "bg-amber-600 text-white shadow-lg ring-1 ring-amber-400"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-200" />
              <span>🎛️ 하이브리드 (AI포착+수동승인)</span>
            </button>

            <button
              onClick={() => handleModeChange("MANUAL")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === "MANUAL"
                  ? "bg-zinc-700 text-white shadow-lg ring-1 ring-zinc-500"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>👆 수동 전용</span>
            </button>
          </div>

          {/* AI Conviction Threshold Selector */}
          <div className="md:col-span-4 bg-zinc-950 p-2 rounded-2xl border border-zinc-800 flex items-center justify-between px-3 text-xs font-mono">
            <span className="text-zinc-400 font-bold">AI 확신 기준:</span>
            <div className="flex items-center gap-1">
              {[70, 75, 85, 90].map((score) => (
                <button
                  key={score}
                  onClick={() => orchestratorEngine.setMinConvictionScore(score)}
                  className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                    minConvictionScore === score
                      ? "bg-amber-500 text-black font-black"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {score}점
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 3. COMBINED ACTION BUTTONS & MANUAL QUICK CONTROL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: AI Autonomous Instant Controls */}
        <div className="lg:col-span-6 bg-gradient-to-br from-zinc-950 via-indigo-950/40 to-zinc-950 border-2 border-indigo-500 p-5 rounded-3xl shadow-2xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-sm font-black text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI 자율 제어 센터 (AUTONOMOUS COMMAND)</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                30-Bot Orchestration Active
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-mono mt-3 leading-relaxed">
              AI 뇌엔진이 유니버스 전체 종목을 지속 스캔하며, 확신점수가 설정값({minConvictionScore}점) 이상 포착 시 자율 매수/익절을 수행합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => orchestratorEngine.executeInstantAiAutoBuy()}
              className="py-3.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white font-black text-xs rounded-2xl transition shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-200 animate-bounce" />
              <span>⚡ AI 1초 즉시 자율 매수</span>
            </button>

            <button
              onClick={() => orchestratorEngine.triggerEmergencyStop()}
              className="py-3.5 bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-600 font-black text-xs rounded-2xl transition shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>🛑 AI 비상 정지 (Circuit Breaker)</span>
            </button>
          </div>
        </div>

        {/* Right: Manual Direct Order Controls */}
        <div className="lg:col-span-6 bg-zinc-950 border-2 border-zinc-800 p-5 rounded-3xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-sm font-black text-white font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>수동 매매 제어 패널 (MANUAL TRADING CONTROL)</span>
            </span>
            <span className="text-xs text-indigo-400 font-mono font-bold">
              선택종목: {currentAnalysis.name} ({(currentAnalysis.currentPrice ?? 0).toLocaleString()}원)
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => orchestratorEngine.executeManualBuy(100000)}
                className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +10만원 매수
              </button>
              <button
                onClick={() => orchestratorEngine.executeManualBuy(300000)}
                className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +30만원 매수
              </button>
              <button
                onClick={() => orchestratorEngine.executeManualBuy(500000)}
                className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                +50만원 매수
              </button>
              <button
                onClick={() => orchestratorEngine.executeManualBuy(1000000)}
                className="py-2.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                100만원 매수
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => orchestratorEngine.executeSell("PARTIAL")}
                className="py-3 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700 rounded-xl text-xs font-mono font-black transition cursor-pointer"
              >
                ⚡ 50% 분할 익절
              </button>
              <button
                onClick={() => orchestratorEngine.executeSell("ALL")}
                className="py-3 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700 rounded-xl text-xs font-mono font-black transition cursor-pointer"
              >
                🚨 전량 시장가 매도 (Panic Exit)
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. LIVE POSITION STATUS & REALTIME UNIFIED LOG STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Active Position State */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 p-5 rounded-3xl space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>실시간 보유 포지션 잔고</span>
            </span>
            <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              이익보호 쉴드 작동 중
            </span>
          </div>

          {realDisplayPosition ? (
            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-white font-black text-sm">{realDisplayPosition.name} ({realDisplayPosition.symbol})</span>
                <span className={`${realDisplayPosition.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"} font-black text-sm`}>
                  {realDisplayPosition.pnlPct >= 0 ? `+${realDisplayPosition.pnlPct}%` : `${realDisplayPosition.pnlPct}%`} ({realDisplayPosition.pnlAmount >= 0 ? `+${(realDisplayPosition.pnlAmount ?? 0).toLocaleString()}원` : `${(realDisplayPosition.pnlAmount ?? 0).toLocaleString()}원`})
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px] border-t border-zinc-800/80 pt-2">
                <span>보유 수량: {realDisplayPosition.qty}주</span>
                <span>매수 평단가: {(realDisplayPosition.buyPrice ?? 0).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>현재가: {(realDisplayPosition.currentPrice ?? 0).toLocaleString()}원</span>
                <span className="text-amber-300 font-bold">익절보장선: {(realDisplayPosition.trailingShieldPrice ?? 0).toLocaleString()}원</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-zinc-500 text-xs">
              현재 보유 중인 포지션이 없습니다. (AI 매수 타점 포착 대기 중)
            </div>
          )}
        </div>

        {/* Right: Realtime Filterable Execution Log Stream */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 p-5 rounded-3xl space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>통합 체결 및 의사결정 실시간 로그</span>
            </span>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[10px]">
              {["ALL", "AI", "MANUAL", "SELL", "SHIELD"].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    logFilter === f ? "bg-indigo-600 text-white font-bold" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px]">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    log.type === "AI_BUY" ? "bg-emerald-950 text-emerald-300 border border-emerald-700" :
                    log.type === "MANUAL_BUY" ? "bg-cyan-950 text-cyan-300 border border-cyan-700" :
                    log.type === "SELL" ? "bg-rose-950 text-rose-300 border border-rose-700" :
                    log.type === "SHIELD" ? "bg-amber-950 text-amber-300 border border-amber-700" :
                    "bg-zinc-800 text-zinc-400"
                  }`}>
                    {log.type}
                  </span>
                </div>
                <div className="text-white font-bold text-xs">{log.title}</div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">{log.detail}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. CENTRALIZED 30-BOT ORCHESTRATION SUMMARY MATRIX */}
      <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white">CENTRALIZED 30-BOT ORCHESTRATION MATRIX</h3>
          </div>
          <span className="text-xs text-amber-400 font-bold">
            합산 Setup Score: {currentAnalysis.decisionMaster.setupQualityScore}점 [{currentAnalysis.decisionMaster.grade}]
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {currentAnalysis.all30Bots.slice(0, 18).map((bot) => (
            <div
              key={bot.id}
              onClick={() => setSelectedBotDetail(bot)}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border border-zinc-800 space-y-1 cursor-pointer transition text-xs"
            >
              <div className="flex items-center justify-between">
                <span>{bot.icon}</span>
                <span className="text-[10px] text-emerald-400 font-bold">{bot.score}점</span>
              </div>
              <div className="text-white font-bold truncate text-[11px]">{bot.name}</div>
              <div className="text-zinc-400 text-[10px] truncate">{bot.summary}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bot Detail Inspection Modal */}
      {selectedBotDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-indigo-500/80 max-w-md w-full p-6 rounded-3xl shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedBotDetail.icon}</span>
                <h3 className="text-sm font-black text-white">{selectedBotDetail.name}</h3>
              </div>
              <button onClick={() => setSelectedBotDetail(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div><span className="text-zinc-500">카테고리:</span> <span className="text-white font-bold">{selectedBotDetail.category}</span></div>
              <div><span className="text-zinc-500">요약:</span> <span className="text-indigo-300 font-bold">{selectedBotDetail.summary}</span></div>
              <div><span className="text-zinc-500">메커니즘:</span> <p className="text-zinc-300 mt-1 leading-relaxed">{selectedBotDetail.detail}</p></div>
            </div>
            <button onClick={() => setSelectedBotDetail(null)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs">
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
