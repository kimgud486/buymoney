import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  Cpu,
  Globe2,
  Lock,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Unlock,
  Zap,
} from "lucide-react";
import {
  AutonomousExecutionEngineV11,
  AutonomousEngineStatus,
} from "../services/v11/AutonomousExecutionEngineV11";

// Production console is LIVE-only. Order submission still requires the
// independent dual-lock to be explicitly unlocked by the user.
export const v11ExecutionEngine = new AutonomousExecutionEngineV11("LIVE");

export const AistockV11ExecutionConsole: React.FC = () => {
  const [engineStatus, setEngineStatus] = useState<AutonomousEngineStatus>(
    v11ExecutionEngine.getStatus(),
  );
  const [dualLockEnabled, setDualLockEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Refresh/re-entry remains LIVE, but never silently authorizes an order.
    v11ExecutionEngine.setTradingMode("LIVE", false);

    const unsubscribe = v11ExecutionEngine.subscribe((status) => {
      setEngineStatus(status);
      setDualLockEnabled(status.liveTradingEnabled);
    });
    return () => unsubscribe();
  }, []);

  const handleDualLockToggle = () => {
    const nextState = !dualLockEnabled;
    setDualLockEnabled(nextState);
    v11ExecutionEngine.setTradingMode("LIVE", nextState);
  };

  const currentState = engineStatus.stateMachine.currentState;
  const activePosition = engineStatus.activePosition;
  const riskMetrics = engineStatus.riskMetrics;
  const realizedPnL = riskMetrics.dailyRealizedPnLKRW || 0;
  const unrealizedPnL = activePosition?.unrealizedPnLAmt || 0;
  const todayPnL = realizedPnL + unrealizedPnL;
  const completedTrades = riskMetrics.totalTradesToday || 0;
  const winRate = completedTrades > 0
    ? (riskMetrics.winTradesToday / completedTrades) * 100
    : null;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-xl shadow-xs">
            <Cpu className="h-6 w-6 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                ⚙️ AISTOCK 24 v11 Autonomous Execution Engine
              </h2>
              <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-full text-xs font-black">
                LIVE ONLY
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                  engineStatus.isEngineRunning
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    engineStatus.isEngineRunning
                      ? "bg-emerald-500 animate-ping"
                      : "bg-zinc-400"
                  }`}
                />
                {engineStatus.isEngineRunning
                  ? "RUNNING (자율 감시 중)"
                  : "PAUSED (일시정지)"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Global Scanner ➔ Unified Shape AI ➔ Risk Gate ➔ KIS Broker ➔ Adaptive Exit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (engineStatus.isEngineRunning) v11ExecutionEngine.stopEngine();
              else v11ExecutionEngine.startEngine();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-md cursor-pointer flex items-center gap-1.5 ${
              engineStatus.isEngineRunning
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {engineStatus.isEngineRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {engineStatus.isEngineRunning ? "자율 감시 정지" : "자율 감시 가동"}
          </button>

          <button
            onClick={() =>
              v11ExecutionEngine.setKillSwitch(!riskMetrics.killSwitchActive)
            }
            className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-md cursor-pointer flex items-center gap-1.5 ${
              riskMetrics.killSwitchActive
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {riskMetrics.killSwitchActive
              ? "🟢 킬스위치 해제"
              : "🚨 긴급 킬스위치"}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 text-white rounded-2xl p-4 border border-cyan-500/40 shadow-md space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
              LIVE Autonomous Trading Pipeline
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            종목선별 ➔ 판단 ➔ 위험검사 ➔ 주문 ➔ 체결 ➔ 보유 ➔ 청산
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-[11px] font-mono">
          {[
            ["1. Scanner", Globe2],
            ["2. Unified Shape", Zap],
            ["3. Risk Gate", ShieldCheck],
            ["4. Broker Order", Building2],
            ["5. Position / Exit", Activity],
          ].map(([label, Icon], index) => {
            const C = Icon as React.ComponentType<{ className?: string }>;
            return (
              <React.Fragment key={label as string}>
                {index > 0 && <span className="text-cyan-400 font-bold">➔</span>}
                <div className="bg-zinc-800/90 border border-zinc-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                  <C className="w-3 h-3 text-cyan-400" />
                  <span className="text-zinc-200 font-bold">{label as string}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              실거래 모드
            </span>
            <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-black">
              LIVE
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
            테스트/모의 실행 모드는 제공하지 않습니다. 실제 주문은 별도의 이중 잠금이 해제된 경우에만 전송됩니다.
          </p>
        </div>

        <div className="bg-zinc-900 text-white p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              LIVE 실거래 이중 잠금
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-black ${
                dualLockEnabled
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              {dualLockEnabled ? "🟢 주문 승인 가능" : "🔒 주문 차단"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
              새로고침 후에도 LIVE 모드는 유지되지만 주문 승인은 자동으로 풀리지 않습니다.
            </p>
            <button
              onClick={handleDualLockToggle}
              className={`px-3 py-2 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer ${
                dualLockEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600"
              }`}
            >
              {dualLockEnabled ? (
                <Unlock className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {dualLockEnabled ? "잠금 하기" : "이중 잠금 해제"}
            </button>
          </div>
        </div>
      </div>

      <section className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4" aria-label="오늘 수익 모니터">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-black text-zinc-900">💰 오늘 수익 모니터</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              실계좌 체결 기준 실현손익과 보유 포지션 평가손익을 표시합니다.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black ${
              todayPnL >= 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            오늘 {todayPnL >= 0 ? "수익" : "손실"}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            ["오늘 총손익", todayPnL, true],
            ["확정 손익", realizedPnL, true],
            ["평가손익", unrealizedPnL, true],
            ["오늘 매매", completedTrades, false],
            ["승 / 패", `${riskMetrics.winTradesToday}승 / ${riskMetrics.lossTradesToday}패`, false],
            ["승률", winRate === null ? "거래 후 표시" : `${winRate.toFixed(1)}%`, false],
          ].map(([label, value, money]) => (
            <div key={label as string} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <span className="block text-[10px] font-bold text-zinc-500">{label as string}</span>
              <span className="block mt-1 text-sm font-black font-mono text-zinc-900">
                {money
                  ? `${Number(value) >= 0 ? "+" : ""}${Number(value).toLocaleString()}원`
                  : typeof value === "number"
                    ? `${value}건`
                    : (value as string)}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-zinc-500">
          데이터 기준: <strong className="text-zinc-700">LIVE 실계좌 API 체결</strong>
        </div>
      </section>

      <details className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <summary className="cursor-pointer text-sm font-black text-cyan-300">
          상세 엔진 진단 보기 · 주문상태 / Risk Gate ({currentState})
        </summary>
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-cyan-400" />
              <div>
                <h3 className="text-base font-black text-white">Execution State Machine Monitor</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  주문 중복 방지, stale signal 차단, 체결 확인 후 포지션 확정 상태머신입니다.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded text-xs font-black bg-zinc-800 text-zinc-200">
              STATE: {currentState}
            </span>
          </div>

          {activePosition ? (
            <div className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-4 space-y-2">
              <div className="font-extrabold text-white">
                {activePosition.name} ({activePosition.symbol})
              </div>
              <div className="text-xs text-zinc-300 font-mono">
                매수가 {(activePosition.buyPrice ?? 0).toLocaleString()}원 · 현재가 {(activePosition.currentPrice ?? 0).toLocaleString()}원 · 보유 {activePosition.qty}주
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-zinc-500 text-xs font-bold">
              현재 보유 중인 자율매매 포지션이 없습니다.
            </div>
          )}
        </div>
      </details>

      <div className="bg-zinc-900 text-white rounded-2xl p-4 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            실시간 자율매매 체결 &amp; 위험관리 로그
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            총 {engineStatus.logs.length}건
          </span>
        </div>
        <div className="h-44 overflow-y-auto space-y-2 scrollbar-none font-mono text-[11px]">
          {engineStatus.logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">체결 로그가 존재하지 않습니다.</div>
          ) : (
            engineStatus.logs.map((log) => (
              <div key={log.id} className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700/60 flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-zinc-200">{log.level} · {log.title}</div>
                  <p className="text-zinc-400 font-sans text-[11px]">{log.detail}</p>
                </div>
                <span className="text-zinc-500 text-[10px] shrink-0">{log.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
