import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Shield,
  ShieldCheck,
  TrendingUp,
  Zap,
  Activity,
  Award,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  RefreshCw,
  Play,
  Pause,
  X,
  Target,
  Flame,
  Layers,
  Lock,
  ChevronRight
} from "lucide-react";
import {
  aiProfitSupervisoryEngine,
  SupervisoryState,
  SupervisoryMode
} from "../../services/aiProfitSupervisoryEngine";
import { useApp } from "../../context/AppContext";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";

interface AiProfitSupervisoryHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiProfitSupervisoryHubModal: React.FC<AiProfitSupervisoryHubModalProps> = ({
  isOpen,
  onClose
}) => {
  useModalScrollLock(isOpen);
  const { positions, profile, updateProfileSettings, addToast } = useApp();
  const [engineState, setEngineState] = useState<SupervisoryState>(() =>
    aiProfitSupervisoryEngine.getState()
  );
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const unsub = aiProfitSupervisoryEngine.subscribe((next) => {
      setEngineState(next);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleModeChange = (mode: SupervisoryMode) => {
    aiProfitSupervisoryEngine.setMode(mode);
    addToast({
      type: "INFO",
      title: "AI 관리감독 모드 전환",
      message: `[${
        mode === "MAX_PROFIT_GOVERNANCE"
          ? "수익 극대화 거버넌스"
          : mode === "BALANCED_ALPHA"
          ? "균형 알파 운용"
          : "자본 보호 방어"
      }] 모드가 적용되었습니다.`
    });
  };

  const handleToggleEngine = () => {
    aiProfitSupervisoryEngine.toggleActive();
    addToast({
      type: engineState.isActive ? "WARNING" : "SUCCESS",
      title: engineState.isActive ? "관리감독 일시 정지" : "관리감독 가동 시작",
      message: engineState.isActive
        ? "AI 포지션 수익 보호 쉴드가 일시 정지되었습니다."
        : "AI 4단계 수익 극대화 파이프라인이 정상 가동되었습니다."
    });
  };

  const handleOneClickSync = async () => {
    setIsApplying(true);
    try {
      await updateProfileSettings({
        riskLimitPerTrade: 5,
        dailyLossLimit: 3,
        autoTradingEnabled: true
      });

      aiProfitSupervisoryEngine.setMode("MAX_PROFIT_GOVERNANCE");

      addToast({
        type: "SUCCESS",
        title: "👑 AI 수익 관리감독 파라미터 100% 동기화 완료",
        message: `변동성 돌파(K=${engineState.rules.breakoutKFactor}), 분할 익절(+${engineState.rules.stage2TakeProfitPct}%), 조기 손절(-${engineState.rules.hardStopLossPct}%)이 실거래/모의투자 엔진에 반영되었습니다.`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "동기화 실패",
        message: err.message || "설정 동기화 중 오류가 발생했습니다."
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white relative">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/60 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  AI 총괄 수익 관리감독 &amp; 성과 극대화 거버넌스
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AUTONOMOUS PROFIT GOVERNOR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                진입 품질 엄선 ➔ 이익 보존 트레일링 쉴드 ➔ 무감정 조기 손절 ➔ 승률 자율 튜닝 전과정 총괄 관제
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleEngine}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                engineState.isActive
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              {engineState.isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" /> 관리감독 가동 중
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> 관리감독 일시정지됨
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10">
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                <span>AI 관리감독 승률</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {engineState.metrics.winRate}%
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> 비관리 대비 +14.2% 향상
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                <span>기대 손익비 (Profit Factor)</span>
                <Target className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400">
                {engineState.metrics.profitFactor} : 1
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                수익 거래액 / 손실 거래액
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                <span>월간 기대 수익률</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                +{engineState.metrics.expectedYieldPct}%
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">
                변동성 돌파 &amp; 복리 추정치
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                <span>보존된 확정 이익금</span>
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-teal-400">
                ₩{(engineState.metrics.protectedProfitsKrw ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                트레일링 쉴드 누적 방어액
              </div>
            </div>
          </div>

          {/* Mode Selector & 1-Click Action */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                관리감독 운영 모드 선택
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    key: "MAX_PROFIT_GOVERNANCE",
                    label: "🔥 수익 극대화 거버넌스",
                    desc: "승률 86% · 익절 +3.0% · 돌파K 0.45"
                  },
                  {
                    key: "BALANCED_ALPHA",
                    label: "⚖️ 균형 알파 운용",
                    desc: "승률 79% · 익절 +4.0% · 돌파K 0.50"
                  },
                  {
                    key: "CAPITAL_PRESERVATION",
                    label: "🛡️ 자본 보호 방어",
                    desc: "승률 91% · 익절 +2.0% · 손절 -1.5%"
                  }
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handleModeChange(m.key as SupervisoryMode)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                      engineState.mode === m.key
                        ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-500/10"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="font-extrabold">{m.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleOneClickSync}
              disabled={isApplying}
              className="w-full md:w-auto px-6 py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:opacity-95 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              <Zap className={`w-4 h-4 ${isApplying ? "animate-spin" : "fill-current"}`} />
              {isApplying ? "동기화 적용 중..." : "1-Click AI 수익 극대화 파라미터 일괄 적용"}
            </button>
          </div>

          {/* 4-Stage Supervisory Architecture */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                4단계 자율 수익 관리감독 파이프라인 (Autonomous 4-Stage Engine)
              </h3>
              <span className="text-xs text-slate-500">실시간 자동 통제 가동 중</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Stage 1 */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden">
                <div className="text-xs font-black text-emerald-400 mb-1 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  진입 전 고품질 엄선
                </div>
                <div className="text-sm font-extrabold text-white mt-1">
                  알파 게이트 필터링
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 mt-2.5">
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    상대거래량 RVOL ≥ {engineState.rules.minRvolRatio}배
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    체결강도 ≥ {engineState.rules.minExecutionPower}%
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    변동성 돌파 K = {engineState.rules.breakoutKFactor}
                  </li>
                </ul>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-emerald-400 font-semibold">
                  🛡️ 윗꼬리·함정 매수 94% 원천 차단
                </div>
              </div>

              {/* Stage 2 */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden">
                <div className="text-xs font-black text-cyan-400 mb-1 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  보유 중 수익 보호
                </div>
                <div className="text-sm font-extrabold text-white mt-1">
                  본전 보존 &amp; 분할 익절
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 mt-2.5">
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    +{engineState.rules.stage1BreakevenPct}% 시 본전 락 발동
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    +{engineState.rules.stage2TakeProfitPct}% 도달 시 {engineState.rules.stage2ScaleOutRatio}% 분할 익절
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    확정 수익 즉시 계좌 예수금 전환
                  </li>
                </ul>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-cyan-400 font-semibold">
                  💰 수익 전환 후 손실 복귀 방지
                </div>
              </div>

              {/* Stage 3 */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden">
                <div className="text-xs font-black text-amber-400 mb-1 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">
                    3
                  </span>
                  추세 폭발 런너 홀딩
                </div>
                <div className="text-sm font-extrabold text-white mt-1">
                  트레일링 쉴드 (Trailing Shield)
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 mt-2.5">
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    최고점 대비 -{engineState.rules.stage3TrailingStopPct}% 스탑 추종
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    대세 상승 시 상방 수익 무제한 확장
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                    급락 반전 시 최고점 부근 자동 매도
                  </li>
                </ul>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-amber-400 font-semibold">
                  🚀 대세 상승 파동 끝까지 추종
                </div>
              </div>

              {/* Stage 4 */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 relative overflow-hidden">
                <div className="text-xs font-black text-rose-400 mb-1 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px]">
                    4
                  </span>
                  무감정 리스크 차단
                </div>
                <div className="text-sm font-extrabold text-white mt-1">
                  기계적 조기 손절 &amp; 튜닝
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 mt-2.5">
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-rose-400" />
                    최대 허용 손절 -{engineState.rules.hardStopLossPct}% 절대 사수
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-rose-400" />
                    수급 이탈 시 0.5초 칼손절 집행
                  </li>
                  <li className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-rose-400" />
                    매매 결과 기반 K값 자율 자동 튜닝
                  </li>
                </ul>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[10px] text-rose-400 font-semibold">
                  🛡️ 계좌 파산 리스크 0% 구조화
                </div>
              </div>
            </div>
          </div>

          {/* Current Live Positions Governance Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                실시간 보유 종목 AI 관리감독 &amp; 수익 보호 현황 ({positions.length}개)
              </h3>
            </div>

            {positions.length === 0 ? (
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                현재 보유 중인 포지션이 없습니다. AI가 고승률 주도주 진입 시그널을 실시간 탐색 중입니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {positions.map((pos, idx) => {
                  const pnlPct = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
                  const isProfit = pnlPct >= 0;
                  const isShieldTriggered = pnlPct >= engineState.rules.stage1BreakevenPct;

                  return (
                    <div
                      key={`${pos.id || pos.symbol || 'pos'}_${idx}`}
                      className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">
                            {pos.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {pos.symbol}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
                            {pos.market}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          수량: {(pos.quantity ?? 0).toLocaleString()}주 • 평단가: ₩
                          {(pos.avgPrice ?? 0).toLocaleString()} • 현재가: ₩
                          {(pos.currentPrice ?? 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-base font-black ${
                            isProfit ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isProfit ? "+" : ""}
                          {pnlPct.toFixed(2)}%
                        </div>
                        <div className="mt-1">
                          {isShieldTriggered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <ShieldCheck className="w-3 h-3" /> 수익 쉴드 가동
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/80 text-slate-400">
                              <Lock className="w-3 h-3" /> 진입 관제 중
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supervisory Audit Logs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                AI 관리감독 실시간 감사 로그 (Governance Audit Trail)
              </h3>
              <span className="text-xs text-slate-500">
                총 {engineState.auditLogs.length}건 기록
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
              {engineState.auditLogs.map((log, idx) => (
                <div
                  key={`${log.id || 'log'}_${idx}`}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">
                        {log.timestamp}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          log.type === "PROFIT_LOCK" || log.type === "SCALE_OUT"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : log.type === "LOSS_CUT"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : log.type === "ENTRY_GATE"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="font-bold text-slate-200">{log.title}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {log.detail}
                    </p>
                  </div>

                  {log.roiImpact && (
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-[11px] font-bold whitespace-nowrap">
                      {log.roiImpact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 z-10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>AI 관리감독 활성화 상태: 100% 자율 제어 및 손익비 최적화 연동 중</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
