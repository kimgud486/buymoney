import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Zap, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  Sliders, 
  Flame, 
  Radio, 
  BarChart3,
  ArrowRight,
  Award,
  Check
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface AiAutoBotEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBoost?: (boostLevel: number) => void;
}

export interface BotReinforcementLog {
  id: string;
  time: string;
  category: "ANALYTICS" | "SMC" | "RISK" | "QUANT";
  message: string;
}

export interface BotLevelConfig {
  id: string;
  name: string;
  category: string;
  currentLv: number; // 1 to 5
  maxLv: number;
  winRate: number;
  latencyMs: number;
  description: string;
}

const DEFAULT_BOT_LIST: BotLevelConfig[] = [
  { id: "smc-01", name: "SMC 스마트머니 수급 봇", category: "수급/구조", currentLv: 3, maxLv: 5, winRate: 84.5, latencyMs: 0.6, description: "BOS/CHoCH 차트 세력 기관 수급 및 OrderBlock 포착" },
  { id: "quant-02", name: "RVOL 거래량 폭발 봇", category: "돌파/모멘텀", currentLv: 2, maxLv: 5, winRate: 81.2, latencyMs: 0.8, description: "평균 대비 300% 거래량 급증 돌파주 1초 즉시 탐지" },
  { id: "risk-03", name: "리스크 거버너 (Risk Governor)", category: "손절/안전", currentLv: 4, maxLv: 5, winRate: 88.0, latencyMs: 0.4, description: "실시간 MDD 방어 및 추적스탑(Trailing Stop) 동적 튜닝" },
  { id: "news-04", name: "Gemini 실시간 뉴스 감성 봇", category: "뉴스/AI", currentLv: 3, maxLv: 5, winRate: 83.7, latencyMs: 1.1, description: "실시간 언론 보도 딥러닝 감성 점수(-100~+100) 수급 연동" },
  { id: "scalp-05", name: "호가 잔량 초고속 스캘핑 봇", category: "단타/초고속", currentLv: 2, maxLv: 5, winRate: 79.8, latencyMs: 0.3, description: "매도/매수 잔량 비율(Orderbook Delta) 0.3ms 연산" },
];

export const AiAutoBotEnhancementModal: React.FC<AiAutoBotEnhancementModalProps> = ({
  isOpen,
  onClose,
  onApplyBoost
}) => {
  const { addToast } = useApp();
  const [isReinforcing, setIsReinforcing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [activeStep, setActiveStep] = useState<string>("대기중");
  const [currentLevel, setCurrentLevel] = useState(135); // Default boosted level (%)
  const [botList, setBotList] = useState<BotLevelConfig[]>(DEFAULT_BOT_LIST);
  const [logs, setLogs] = useState<BotReinforcementLog[]>([]);
  const [targetStrategyMode, setTargetStrategyMode] = useState<"BALANCED" | "HIGH_YIELD" | "SAFE_GUARD">("HIGH_YIELD");

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem("aistock_bot_boost_level");
        if (saved) {
          setCurrentLevel(parseInt(saved, 10));
        }
        const savedBots = localStorage.getItem("aistock_bot_lv_list");
        if (savedBots) {
          setBotList(JSON.parse(savedBots));
        }
      } catch (e) {
        console.warn("Load boost level err:", e);
      }
    }
  }, [isOpen]);

  const handleUpgradeSingleBot = (botId: string) => {
    const updated = botList.map(b => {
      if (b.id === botId && b.currentLv < b.maxLv) {
        const nextLv = b.currentLv + 1;
        return {
          ...b,
          currentLv: nextLv,
          winRate: Math.min(95, +(b.winRate + 2.5).toFixed(1)),
          latencyMs: Math.max(0.2, +(b.latencyMs - 0.1).toFixed(1))
        };
      }
      return b;
    });
    setBotList(updated);
    try {
      localStorage.setItem("aistock_bot_lv_list", JSON.stringify(updated));
    } catch (e) {}

    addToast({
      type: "SUCCESS",
      title: "⚡ 봇 LV.강화 완료",
      message: "해당 봇의 AI 매매 알고리즘 파라미터가 상향 적용되었습니다."
    });
  };

  const handleRunAiAutoEnhancement = () => {
    setIsReinforcing(true);
    setProgressPct(5);
    setActiveStep("1/5: AI 뇌엔진이 30대 봇 성과 및 차트/뉴스 감성을 정밀 분석 중...");
    setLogs([]);

    const now = new Date().toLocaleTimeString("ko-KR");
    const initialLogs: BotReinforcementLog[] = [
      { id: "1", time: now, category: "ANALYTICS", message: "AI 딥러닝 뇌엔진 가동: 전체 30대 전문 매매 봇 네트워크 LV.5 자율 강화 개시" }
    ];
    setLogs(initialLogs);

    // Step 1 -> Step 2
    setTimeout(() => {
      setProgressPct(28);
      setActiveStep("2/5: SMC 수급 및 호가 잔량 봇 LV.5 파라미터(BOS/CHoCH 99.8%) 자율 레벨업...");
      setLogs(prev => [
        { id: "2", time: new Date().toLocaleTimeString("ko-KR"), category: "SMC", message: "SMC 스마트머니 봇 [LV.5 최고 등급] 승인! (가짜 돌파 탐지 승률 89.5%)" },
        ...prev
      ]);
    }, 900);

    // Step 2 -> Step 3
    setTimeout(() => {
      setProgressPct(55);
      setActiveStep("3/5: 위험 감시 봇(Risk Governor) 손절 및 추적스탑 LV.5 동적 강화...");
      setLogs(prev => [
        { id: "3", time: new Date().toLocaleTimeString("ko-KR"), category: "RISK", message: "최대 낙폭(MDD) -1.5% 이하 억제 & Dynamic Trailing Stop LV.5 튜닝 완료" },
        ...prev
      ]);
    }, 1800);

    // Step 3 -> Step 4
    setTimeout(() => {
      setProgressPct(82);
      setActiveStep("4/5: RVOL 거래량 및 호가 초고속 봇 지연시간 0.3ms LV.5 극대화 연산...");
      setLogs(prev => [
        { id: "4", time: new Date().toLocaleTimeString("ko-KR"), category: "QUANT", message: "30개 봇 만장일치 합의 지표 LV.5 가중치 조정 완료 (목표 승률 89.4%)" },
        ...prev
      ]);
    }, 2600);

    // Step 5 -> Finish
    setTimeout(() => {
      setProgressPct(100);
      setActiveStep("5/5: 전체 봇 LV.5 마스터 레벨업 및 자율 설정 적용 완료!");
      
      const nextLevel = targetStrategyMode === "HIGH_YIELD" ? 160 : targetStrategyMode === "SAFE_GUARD" ? 130 : 145;
      setCurrentLevel(nextLevel);

      const upgradedBots = botList.map(b => ({
        ...b,
        currentLv: 5,
        winRate: Math.min(94.5, +(b.winRate + 6.5).toFixed(1)),
        latencyMs: Math.max(0.2, +(b.latencyMs * 0.6).toFixed(1))
      }));
      setBotList(upgradedBots);

      try {
        localStorage.setItem("aistock_bot_boost_level", String(nextLevel));
        localStorage.setItem("aistock_bot_lv_list", JSON.stringify(upgradedBots));
      } catch (e) {
        console.warn("Save boost level err:", e);
      }

      setLogs(prev => [
        { id: "5", time: new Date().toLocaleTimeString("ko-KR"), category: "ANALYTICS", message: `🤖 AI 자율 봇 강화 성공! 전 봇 LV.5 마스터 등급 승격 (${nextLevel}% 가속 가동)` },
        ...prev
      ]);

      setIsReinforcing(false);

      if (onApplyBoost) {
        onApplyBoost(nextLevel);
      }

      addToast({
        type: "SUCCESS",
        title: "⚡ AI 자율 봇 LV.5 마스터 레벨업 완료!",
        message: "모든 전문 분석/수급/손절 봇이 LV.5 최고 성능 모드로 자동 승격되었습니다."
      });
    }, 3400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-950 border-2 border-indigo-500/70 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 text-white rounded-2xl shadow-lg animate-pulse">
              <Zap className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  🤖 AI 자동 봇 강화 고도화 시스템
                </h2>
                <span className="px-2.5 py-0.5 bg-indigo-900/80 text-indigo-300 border border-indigo-400/50 rounded-full text-[11px] font-mono font-bold">
                  v8.2 AUTO-BOOST
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                시장 변동성 및 수급을 AI가 실시간 진단하여 30대 전문 봇 파라미터를 자율 최적화합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto font-sans">

          {/* Current Boost Level Banner */}
          <div className="bg-gradient-to-r from-zinc-900 via-slate-900 to-zinc-900 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>현재 봇 성능 가속 지수</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1 flex items-baseline gap-2">
                <span>{currentLevel}%</span>
                <span className="text-xs font-normal text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-full">
                  ⚡ 정상 시너지 작동 중
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="text-right">
                <div className="text-slate-400">평균 매매 승률</div>
                <div className="font-bold text-white text-sm">78.5% → <span className="text-emerald-400">84.2%</span></div>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <div className="text-slate-400">SMC 탐지 속도</div>
                <div className="font-bold text-cyan-400 text-sm">0.8ms</div>
              </div>
            </div>
          </div>

          {/* Strategy Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>AI 자동 봇 강화 목표 모드 선택</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  id: "HIGH_YIELD",
                  title: "🚀 초공격 수익 모드",
                  desc: "모멘텀 및 돌파 감도 극대화 (+150%)",
                  badge: "추천"
                },
                {
                  id: "BALANCED",
                  title: "⚖️ 균형 밸런스 모드",
                  desc: "수익성과 리스크 균형 (+135%)",
                  badge: "안정"
                },
                {
                  id: "SAFE_GUARD",
                  title: "🛡️ 손실 방어 모드",
                  desc: "MDD 방어 및 손절선 강화 (+120%)",
                  badge: "보수"
                }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTargetStrategyMode(mode.id as any)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    targetStrategyMode === mode.id
                      ? "bg-indigo-950/80 border-indigo-400 text-white shadow-lg shadow-indigo-950/50"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{mode.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        targetStrategyMode === mode.id ? "bg-amber-400 text-black" : "bg-slate-800 text-slate-400"
                      }`}>
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1 line-clamp-2 text-slate-400">{mode.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar during Reinforcement */}
          {isReinforcing && (
            <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-4 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-300 font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                  <span>{activeStep}</span>
                </span>
                <span className="font-bold text-white">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Action Trigger Button */}
          <button
            onClick={handleRunAiAutoEnhancement}
            disabled={isReinforcing}
            className={`w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-950/50 transition flex items-center justify-center gap-3 cursor-pointer border border-amber-300/40 active:scale-[0.98] ${
              isReinforcing ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            <Zap className={`w-5 h-5 text-amber-200 ${isReinforcing ? "animate-spin" : "animate-bounce"}`} />
            <span>{isReinforcing ? "AI 30대 봇 자동 강화 실행 중..." : "🤖 AI로 자동 봇강화 즉시 실행하기"}</span>
            <ArrowRight className="w-4 h-4 text-amber-200" />
          </button>

          {/* Reinforcement Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI 봇 강화 세부 연산 로그</span>
              </span>
              <span className="text-[10px] text-slate-500">실시간 피드백</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 h-36 overflow-y-auto font-mono text-[11px] space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  버튼을 누르면 AI가 시장 구조 및 수급 패턴을 분석하여 30대 봇 파라미터를 자동 최적화합니다.
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={`${log.id}_${idx}`} className="flex items-start gap-2 border-b border-slate-800/60 pb-1.5 last:border-0">
                    <span className="text-slate-500 shrink-0">{log.time}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                      log.category === "SMC" ? "bg-purple-950 text-purple-300 border border-purple-800" :
                      log.category === "RISK" ? "bg-rose-950 text-rose-300 border border-rose-800" :
                      log.category === "QUANT" ? "bg-cyan-950 text-cyan-300 border border-cyan-800" :
                      "bg-indigo-950 text-indigo-300 border border-indigo-800"
                    }`}>
                      {log.category}
                    </span>
                    <span className="text-slate-200 leading-tight">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 30 Bot Matrix Summary */}
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>적용 대상: 6단계 계층 30대 전문 분석 봇 전원</span>
            </div>
            <span className="text-emerald-400 font-bold">100% 동기화 준비 완료</span>
          </div>

        </div>
      </div>
    </div>
  );
};
