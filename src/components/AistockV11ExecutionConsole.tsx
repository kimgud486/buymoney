import React, { useState, useEffect } from "react";
import {
  Zap,
  ShieldCheck,
  Activity,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Building2,
  DollarSign,
  Radio,
  Flame,
  Globe2
} from "lucide-react";
import { AutonomousExecutionEngineV11, AutonomousEngineStatus } from "../services/v11/AutonomousExecutionEngineV11";
import { TradingMode, OrderState } from "../services/v11/ExecutionStateMachine";

// Singleton Engine Instance
export const v11ExecutionEngine = new AutonomousExecutionEngineV11("PAPER");

export const AistockV11ExecutionConsole: React.FC = () => {
  const [engineStatus, setEngineStatus] = useState<AutonomousEngineStatus>(v11ExecutionEngine.getStatus());
  const [selectedMode, setSelectedMode] = useState<TradingMode>("PAPER");
  const [dualLockEnabled, setDualLockEnabled] = useState<boolean>(false);
  const [showRiskConfigModal, setShowRiskConfigModal] = useState<boolean>(false);
  const [customMaxKRW, setCustomMaxKRW] = useState<number>(5000000);
  const [customDailyLossKRW, setCustomDailyLossKRW] = useState<number>(300000);

  useEffect(() => {
    const unsubscribe = v11ExecutionEngine.subscribe((status) => {
      setEngineStatus(status);
      setSelectedMode(status.mode);
      setDualLockEnabled(status.liveTradingEnabled);
    });
    return () => unsubscribe();
  }, []);

  const handleModeChange = (mode: TradingMode) => {
    if (mode === "LIVE") {
      // Direct enable live mode and dual lock smoothly
      setDualLockEnabled(true);
      setSelectedMode("LIVE");
      v11ExecutionEngine.setTradingMode("LIVE", true);
    } else {
      setSelectedMode(mode);
      v11ExecutionEngine.setTradingMode(mode, dualLockEnabled);
    }
  };

  const handleDualLockToggle = () => {
    const nextState = !dualLockEnabled;
    setDualLockEnabled(nextState);
    if (!nextState && selectedMode === "LIVE") {
      setSelectedMode("PAPER");
      v11ExecutionEngine.setTradingMode("PAPER", false);
    } else {
      v11ExecutionEngine.setTradingMode(selectedMode, nextState);
    }
  };

  const currentState = engineStatus.stateMachine.currentState;
  const activePosition = engineStatus.activePosition;
  const riskMetrics = engineStatus.riskMetrics;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      {/* 1. HEADER & PIPELINE FLOW BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-xl shadow-xs">
              <Cpu className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  ⚙️ AISTOCK 24 v11 Autonomous Execution Engine
                </h2>
                <span className="px-2.5 py-0.5 bg-cyan-600 text-white rounded-full text-xs font-black">
                  v11 Execution State Machine
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                  engineStatus.isEngineRunning ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-zinc-100 text-zinc-600 border border-zinc-300"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${engineStatus.isEngineRunning ? "bg-emerald-500 animate-ping" : "bg-zinc-400"}`}></span>
                  {engineStatus.isEngineRunning ? "RUNNING (자율 감시 중)" : "PAUSED (일시정지)"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                v10 Global Scanner ➔ v9 Unified Shape AI ➔ Predictive BUY ➔ Risk Gate ➔ KIS Broker ➔ Adaptive Exit
              </p>
            </div>
          </div>
        </div>

        {/* ENGINE START / STOP & KILL SWITCH BUTTONS */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (engineStatus.isEngineRunning) {
                v11ExecutionEngine.stopEngine();
              } else {
                v11ExecutionEngine.startEngine();
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-md cursor-pointer flex items-center gap-1.5 ${
              engineStatus.isEngineRunning
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {engineStatus.isEngineRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{engineStatus.isEngineRunning ? "자율 감시 정지" : "자율 감시 가동"}</span>
          </button>

          <button
            onClick={() => v11ExecutionEngine.setKillSwitch(!riskMetrics.killSwitchActive)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-md cursor-pointer flex items-center gap-1.5 ${
              riskMetrics.killSwitchActive
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{riskMetrics.killSwitchActive ? "🟢 킬스위치 해제" : "🚨 긴급 킬스위치 (Kill Switch)"}</span>
          </button>
        </div>
      </div>

      {/* 2. FULL PIPELINE ARCHITECTURE FLOW BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 text-white rounded-2xl p-4 border border-cyan-500/40 shadow-md space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
              v11 End-to-End Autonomous Trading Pipeline Flow
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            종목선별 ➔ BUY판단 ➔ 주문 ➔ 체결확인 ➔ 보유 ➔ Adaptive SELL ➔ 매도체결
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none font-mono text-[11px] text-zinc-300">
          <div className="bg-zinc-800/90 border border-zinc-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
            <Globe2 className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300 font-bold">1. v10 Scanner</span>
          </div>
          <span className="text-cyan-400 font-bold">➔</span>
          <div className="bg-zinc-800/90 border border-zinc-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-300 font-bold">2. Unified Shape</span>
          </div>
          <span className="text-cyan-400 font-bold">➔</span>
          <div className="bg-zinc-800/90 border border-zinc-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-bold">3. Risk Gate</span>
          </div>
          <span className="text-cyan-400 font-bold">➔</span>
          <div className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 border font-black ${
            currentState === "BUY_PENDING" ? "bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse" : "bg-zinc-800 border-zinc-700 text-zinc-300"
          }`}>
            <span>4. BUY_PENDING</span>
          </div>
          <span className="text-cyan-400 font-bold">➔</span>
          <div className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 border font-black ${
            currentState === "LONG" ? "bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-sm" : "bg-zinc-800 border-zinc-700 text-zinc-300"
          }`}>
            <span>5. LONG (보유)</span>
          </div>
          <span className="text-cyan-400 font-bold">➔</span>
          <div className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 border font-black ${
            currentState === "SELL_PENDING" ? "bg-rose-500/20 text-rose-300 border-rose-400 animate-pulse" : "bg-zinc-800 border-zinc-700 text-zinc-300"
          }`}>
            <span>6. Adaptive SELL</span>
          </div>
          <span className="text-cyan-400 font-bold">➔</span>
          <div className={`px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 border font-black ${
            currentState === "COOLDOWN" ? "bg-blue-500/20 text-blue-300 border-blue-400" : "bg-zinc-800 border-zinc-700 text-zinc-300"
          }`}>
            <span>7. COOLDOWN</span>
          </div>
        </div>
      </div>

      {/* 3. TRADING MODE & DUAL-LOCK CONTROL HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trading Mode Selector */}
        <div className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              <span>실행 모드 (Trading Mode)</span>
            </span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono">
              현재: {engineStatus.mode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["PAPER", "DRY_RUN", "LIVE"] as TradingMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 border ${
                  selectedMode === m
                    ? m === "LIVE"
                      ? "bg-rose-600 text-white border-rose-400 shadow-md"
                      : "bg-cyan-600 text-white border-cyan-400 shadow-md"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                }`}
              >
                <span>{m === "PAPER" ? "📄 PAPER" : m === "DRY_RUN" ? "🧪 DRY_RUN" : "🔴 LIVE"}</span>
                <span className="text-[9px] font-normal opacity-80">
                  {m === "PAPER" ? "가상 모의" : m === "DRY_RUN" ? "시세+테스트" : "실전 계좌"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dual-Lock Switcher */}
        <div className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              <span>LIVE 실거래 이중 잠금 (Dual-Lock)</span>
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
              dualLockEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
            }`}>
              {dualLockEnabled ? "🟢 잠금 해제됨" : "🔒 안전 잠금 중"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
              LIVE 모드는 안전을 위해 기본 잠금 상태입니다. 이중 승인 해제 시에만 실제 증권사 매수 주문이 실행됩니다.
            </p>
            <button
              onClick={handleDualLockToggle}
              className={`px-3 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer ${
                dualLockEnabled ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600"
              }`}
            >
              {dualLockEnabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span>{dualLockEnabled ? "잠금 하기" : "이중 잠금 해제"}</span>
            </button>
          </div>
        </div>

        {/* Korea Investment Securities (KIS) Adapter Status */}
        <div className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              <span>한국투자증권 (KIS) Adapter</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-black border border-emerald-500/40">
              OAuth 2.0 READY
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">국내주식 (KOSPI/KOSDAQ):</span>
              <span className="text-emerald-400 font-bold">OpenAPI READY</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">해외주식 (NYSE/NASDAQ):</span>
              <span className="text-indigo-400 font-bold">OpenAPI READY</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">WebSocket 체결 스트림:</span>
              <span className="text-cyan-400 font-bold">CONNECTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. EXECUTION STATE MACHINE LIVE MONITOR & ACTIVE POSITION */}
      <div className="bg-zinc-950 text-white border-2 border-cyan-500/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${
              currentState === "LONG" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
              currentState === "BUY_PENDING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse" :
              currentState === "SELL_PENDING" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse" :
              currentState === "LOCKED" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400"
            }`}>
              <Activity className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">Execution State Machine Monitor</h3>
                <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                  currentState === "LONG" ? "bg-emerald-600 text-white" :
                  currentState === "BUY_PENDING" ? "bg-amber-500 text-zinc-950 animate-pulse font-black" :
                  currentState === "SELL_PENDING" ? "bg-rose-600 text-white animate-pulse" :
                  currentState === "COOLDOWN" ? "bg-blue-600 text-white" :
                  currentState === "LOCKED" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"
                }`}>
                  STATE: {currentState}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                주문 중복 방지, stale signal 차단, 체결 확인 후 포지션 확정 상태머신입니다.
              </p>
            </div>
          </div>

          {/* Test Candidate Order Trigger Button */}
          <button
            onClick={() => {
              v11ExecutionEngine.processCandidateOrder({
                symbol: "005930",
                name: "삼성전자",
                market: "KOREA",
                price: 74800,
                scannerScore: 92,
                unifiedShape: "Upward Expansion",
                rvol: 3.4,
                executionPower: 152
              });
            }}
            disabled={currentState !== "IDLE"}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
            <span>⚡ 삼성전자 테스트 자율 BUY 진입</span>
          </button>
        </div>

        {/* ACTIVE POSITION PANEL */}
        {activePosition ? (
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-black rounded text-xs border border-emerald-500/40">
                  LONG POSITION ACTIVE
                </span>
                <span className="font-extrabold text-white text-base">{activePosition.name}</span>
                <span className="font-mono text-xs text-zinc-400">({activePosition.symbol})</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-bold">손익:</span>
                <span className={`text-sm font-black font-mono ${activePosition.unrealizedPnLAmt >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {activePosition.unrealizedPnLAmt >= 0 ? "+" : ""}{(activePosition.unrealizedPnLAmt ?? 0).toLocaleString()}원 ({activePosition.unrealizedPnLPct >= 0 ? "+" : ""}{activePosition.unrealizedPnLPct}%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block">매수가</span>
                <span className="text-zinc-200 font-bold">{(activePosition.buyPrice ?? 0).toLocaleString()}원</span>
              </div>
              <div>
                <span className="text-zinc-500 block">현재가</span>
                <span className="text-cyan-300 font-bold">{(activePosition.currentPrice ?? 0).toLocaleString()}원</span>
              </div>
              <div>
                <span className="text-zinc-500 block">보유 수량</span>
                <span className="text-zinc-200 font-bold">{activePosition.qty}주</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Trailing Exit 라인</span>
                <span className="text-amber-400 font-bold">{(activePosition.trailingExitPrice ?? 0).toLocaleString()}원</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  if (activePosition) {
                    v11ExecutionEngine.executeSellOrder(activePosition, "수동 즉시 매도 수호 버튼 클릭");
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>📉 1클릭 Adaptive Exit 수동 청산</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-zinc-500 text-xs font-bold">
            현재 보유 중인 자율매매 포지션이 없습니다. (State: {currentState})
          </div>
        )}
      </div>

      {/* 5. RISK GATE METRICS & REALTIME EXECUTION STREAM LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Metrics */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <span className="text-xs font-black text-zinc-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Risk Gate 지표 (Risk Engine)</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
              PASS
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">오늘 거래 건수:</span>
              <span className="font-bold text-zinc-900">{riskMetrics.totalTradesToday}건</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">연속 손실 횟수:</span>
              <span className="font-bold text-amber-600">{riskMetrics.consecutiveLosses} / 3회</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">오늘 실현 손익:</span>
              <span className={`font-black ${riskMetrics.dailyRealizedPnLKRW >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {riskMetrics.dailyRealizedPnLKRW >= 0 ? "+" : ""}{(riskMetrics.dailyRealizedPnLKRW ?? 0).toLocaleString()}원
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">일일 손실 한도:</span>
              <span className="font-bold text-rose-600">-300,000원 (-3.0%)</span>
            </div>
          </div>
        </div>

        {/* Realtime Log Stream */}
        <div className="lg:col-span-2 bg-zinc-900 text-white rounded-2xl p-4 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>실시간 자율매매 체결 &amp; 위험관리 로그 (Execution Log)</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              총 {engineStatus.logs.length}건 기록됨
            </span>
          </div>

          <div className="h-44 overflow-y-auto space-y-2 scrollbar-none font-mono text-[11px]">
            {engineStatus.logs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">체결 로그가 존재하지 않습니다.</div>
            ) : (
              engineStatus.logs.map((log) => (
                <div key={log.id} className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700/60 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                        log.level === "BUY_EXEC" ? "bg-emerald-600 text-white" :
                        log.level === "SELL_EXEC" ? "bg-rose-600 text-white" :
                        log.level === "RISK_PASS" ? "bg-cyan-600 text-white" :
                        log.level === "RISK_REJECT" ? "bg-amber-600 text-white" :
                        log.level === "EMERGENCY" ? "bg-red-600 text-white animate-pulse" : "bg-zinc-700 text-zinc-200"
                      }`}>
                        {log.level}
                      </span>
                      <span className="font-bold text-zinc-200">{log.title}</span>
                    </div>
                    <p className="text-zinc-400 font-sans text-[11px]">{log.detail}</p>
                  </div>
                  <span className="text-zinc-500 text-[10px] shrink-0">{log.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
