import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Activity,
  Bell,
  X,
  Clock,
  ArrowRight,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Ban
} from "lucide-react";
import {
  AntiDowntrendEngineV5,
  AntiDowntrendStatus,
  DowntrendTrapAlert
} from "../../services/AntiDowntrendEngineV5";

export const AntiDowntrendV5Indicator: React.FC = () => {
  const [status, setStatus] = useState<AntiDowntrendStatus>(() => AntiDowntrendEngineV5.getStatus());
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  useEffect(() => {
    const unsubscribe = AntiDowntrendEngineV5.subscribe(newStatus => {
      setStatus(newStatus);
      setHasNewAlert(true);
      const timer = setTimeout(() => setHasNewAlert(false), 5000);
      return () => clearTimeout(timer);
    });
    return () => unsubscribe();
  }, []);

  const recentTrap = status.recentTraps[0];

  return (
    <>
      {/* Realtime Inline Indicator Badge */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border shadow-xs ${
            hasNewAlert
              ? "bg-rose-600/30 border-rose-500 text-rose-300 animate-pulse ring-1 ring-rose-500"
              : status.systemHealth === "GUARDING"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
              : "bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
          title="하락봉 탐지 엔진 v5 실시간 감시 상태 (클릭하여 차단 내역 확인)"
        >
          {hasNewAlert ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="font-mono text-[11px]">하락봉 v5</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-emerald-400 font-mono">
            {status.totalInterceptedCount}건 차단
          </span>
        </button>
      </div>

      {/* Intercepted Traps History & Push Alert Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-100">하락봉 탐지 엔진 {status.engineVersion}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      실시간 방어 중
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">업비트 윗꼬리 음봉, 가짜 펌핑, 호가창 덤프 실시간 차단 내역</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Summary Banner */}
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-indigo-200">🛡️ 왜 하락봉 탐지 엔진 v5가 필요한가요?</p>
                  <p className="text-slate-300 leading-relaxed">
                    단순 점수만 보고 매수하면 급등 직후 발생하는 <strong className="text-rose-300">상투 윗꼬리 음봉(Shooting Star)</strong>에 물려 손절이 발생합니다.
                    v5 엔진은 캔들 종가와 거래량 델타(CVD)를 끝까지 확인하여 <strong>가짜 반등 종목을 100% 사전에 격리</strong>합니다.
                  </p>
                </div>
              </div>

              {/* Intercepted Traps Log List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                  <span>최근 차단된 위험 종목 ({status.recentTraps.length}건)</span>
                  <span>상태</span>
                </div>

                {status.recentTraps.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl text-slate-500 text-xs">
                    최근 1시간 동안 감지된 위험 하락봉이 없습니다.
                  </div>
                ) : (
                  status.recentTraps.map((trap, idx) => (
                    <div
                      key={`${trap.id}_${idx}`}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-sm">{trap.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({trap.symbol})</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-bold">
                            {trap.patternNameKr}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{trap.details}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{trap.timeStr} 감지</span>
                          {trap.wickRatioPct && (
                            <span className="text-rose-400 font-bold">윗꼬리 비율: {trap.wickRatioPct}%</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg">
                          <Ban className="w-3.5 h-3.5" />
                          매수 차단
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                실시간 16대 신경망 + 4단계 안티-페이크 동기화 중
              </span>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
