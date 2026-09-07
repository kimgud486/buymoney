import React, { useState } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Brain,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  BarChart2,
  PieChart as PieChartIcon,
  Zap,
  Target,
  ArrowRight,
  Sliders,
  RefreshCw,
  Lightbulb,
  Award,
  Layers
} from "lucide-react";
import { useApp } from "../../context/AppContext";

export interface YieldImprovementGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YieldImprovementGuideModal: React.FC<YieldImprovementGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addToast } = useApp();
  const [isApplying, setIsApplying] = useState(false);
  const [appliedStrategies, setAppliedStrategies] = useState<Record<string, boolean>>({
    s1: true,
    s2: true,
    s3: false,
    s4: false
  });

  if (!isOpen) return null;

  const lossFactorStats = [
    { title: "고점 추격 매수 (위꼬리 휩소)", pct: 42, color: "bg-rose-500", textColor: "text-rose-500", desc: "급등 직후 저항선(Supply Zone) 근처 감정 진입" },
    { title: "손절 반응 시차 (뉴스 악재 지연)", pct: 33, color: "bg-amber-500", textColor: "text-amber-500", desc: "뉴스 감성 -50점 감지 시 손절선 -3.5% 지연 반응" },
    { title: "손익비(Risk/Reward) 불균형", pct: 25, color: "bg-indigo-500", textColor: "text-indigo-500", desc: "익절 +2.5% 대비 손절 -3.5% 설정으로 누적 손실" }
  ];

  const actionGuides = [
    {
      id: "s1",
      title: "1. 저항선 음봉 강도 > 75% 진입 쿨다운 필터",
      category: "진입 패턴 보완",
      status: appliedStrategies["s1"] ? "적용 완료" : "미적용",
      impact: "추격 손실 89% 방어",
      description: "5분봉 상단 위꼬리 음봉 강도 75% 이상 발생 시 20분간 롱 매수 자율 동결."
    },
    {
      id: "s2",
      title: "2. 손익비 1:2.5 구조화 (손절 -1.8% / 익절 +4.5%)",
      category: "손익비 최적화",
      status: appliedStrategies["s2"] ? "적용 완료" : "미적용",
      impact: "기대 수익률 +45% 상승",
      description: "손절선을 -1.8%로 타이트화하고, 익절선 +4.5% 달성 시 추적스탑(Trailing Stop) 활성화."
    },
    {
      id: "s3",
      title: "3. Gemini 뉴스 감성 -50점 이하 자율 킬스위치",
      category: "뉴스 감성 차단",
      status: appliedStrategies["s3"] ? "적용 완료" : "미적용",
      impact: "악재 연쇄 투매 95% 방어",
      description: "실시간 뉴스 감성 지수 악화 감지 시 0.1초 만에 해당 종목 신규 매수 동결."
    },
    {
      id: "s4",
      title: "4. SMC 스마트머니 체결 잔량(OrderBook Delta) 연동",
      category: "수급 체결 강화",
      status: appliedStrategies["s4"] ? "적용 완료" : "미적용",
      impact: "매수 가짜 승률 92% 필터",
      description: "매도 잔량 대비 매수 잔량 2.2배 이상 우위 확인 후 기관급 자율 체결 승인."
    }
  ];

  const handleToggleStrategy = (id: string) => {
    setAppliedStrategies(prev => {
      const nextState = !prev[id];
      addToast({
        type: nextState ? "SUCCESS" : "INFO",
        title: nextState ? "⚡ 전략 보완 완료" : "⏸️ 전략 일시 해제",
        message: `행동 가이드 [${id.toUpperCase()}] 알고리즘 반영 상태가 변경되었습니다.`
      });
      return { ...prev, [id]: nextState };
    });
  };

  const handleApplyAllGuides = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setAppliedStrategies({
        s1: true,
        s2: true,
        s3: true,
        s4: true
      });
      addToast({
        type: "SUCCESS",
        title: "🧠 AI 수익률 향상 전략 일괄 보완 완료!",
        message: "수익 방해 요소 3대 항목이 차단되고 4대 가이드 파라미터가 최적화되었습니다."
      });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100 font-sans">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-rose-950 p-5 text-white flex items-center justify-between border-b border-indigo-500/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-purple-500 to-rose-600 text-white rounded-2xl shadow-md border border-indigo-400/40">
              <TrendingUp className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  수익률 향상 가이드 (Yield Improvement Guide)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/90 text-indigo-200 border border-indigo-700 font-mono font-bold">
                  AI PATTERN DIAGNOSIS
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                현재 매매 패턴의 수익 저하 요인을 시각 분석하고 최적의 행동 가이드를 제시합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-indigo-200/60 hover:text-white rounded-xl hover:bg-indigo-900/40 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Section 1: 수익 방해 요소 시각화 차트 카드 */}
          <div className="bg-slate-50 dark:bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  1. 현재 매매 패턴의 수익 훼손 원인 비중 시각화
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                AI DIAGNOSED LOSS DRIVERS
              </span>
            </div>

            {/* Visual Stacked Percentage Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-slate-600 dark:text-zinc-400">손실 원인 구성 비율</span>
                <span className="text-rose-500">합산 100% 훼손 압력</span>
              </div>
              <div className="h-5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden flex p-0.5">
                {lossFactorStats.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${item.color} h-full transition-all duration-500 text-[10px] text-white font-mono font-black flex items-center justify-center px-1`}
                    style={{ width: `${item.pct}%` }}
                    title={`${item.title}: ${item.pct}%`}
                  >
                    {item.pct}%
                  </div>
                ))}
              </div>
            </div>

            {/* Loss Factor Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {lossFactorStats.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${item.textColor}`}>
                      {item.title}
                    </span>
                    <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 ${item.textColor}`}>
                      {item.pct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: AI 매매 전략 제안 & 행동 가이드 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  2. 수익률 보완을 위한 4단계 AI 행동 가이드
                </h3>
              </div>
              <button
                onClick={handleApplyAllGuides}
                disabled={isApplying}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>전체 가이드 100% 자율 적용</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionGuides.map((guide) => {
                const isApplied = appliedStrategies[guide.id];
                return (
                  <div
                    key={guide.id}
                    className={`p-4 rounded-2xl border transition space-y-3 flex flex-col justify-between ${
                      isApplied
                        ? "bg-emerald-950/15 border-emerald-800/60 dark:bg-emerald-950/20"
                        : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-bold">
                          [{guide.category}]
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${isApplied ? "text-emerald-400" : "text-amber-500"}`}>
                          {isApplied ? "✅ 알고리즘 활성" : "⏸️ 미적용"}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                        {guide.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
                        {guide.description}
                      </p>

                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        예상 성과: {guide.impact}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStrategy(guide.id)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        isApplied
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200"
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>가이드 적용 중 (클릭 시 해제)</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>이 가이드 AI 알고리즘에 반영</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-indigo-950/30 border border-indigo-800/50 rounded-2xl text-xs space-y-1.5 text-indigo-200">
            <div className="font-black text-white flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>AI 트레이딩 최적화 핵심 요약</span>
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-200/90">
              고점 추격 매수 억제와 뉴스 악재 시차 최소화를 결합하면 승률이 기존 68%에서 <strong>84.5%</strong>로 상승하며, 손익비를 -1.8% / +4.5%로 상향 유지할 때 포트폴리오 월 누적 수익률이 평균 +28.4% 이상 향상됩니다.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-zinc-800/80 border-t border-slate-200 dark:border-zinc-700 flex items-center justify-between shrink-0">
          <button
            onClick={handleApplyAllGuides}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>수익률 향상 전략 100% 반영</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-800 dark:text-zinc-200 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
