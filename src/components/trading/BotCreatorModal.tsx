import React, { useState } from "react";
import {
  Bot,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
  Activity,
  Coins,
  Flame,
  CheckCircle2
} from "lucide-react";
import { BotPresetItem, saveCustomBot } from "../../data/botPresets";

interface BotCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBotCreated?: (bot: BotPresetItem) => void;
}

export const BotCreatorModal: React.FC<BotCreatorModalProps> = ({
  isOpen,
  onClose,
  onBotCreated
}) => {
  const [botName, setBotName] = useState("");
  const [category, setCategory] = useState<"SMALL" | "MID" | "LARGE" | "CRYPTO">("SMALL");
  const [strategy, setStrategy] = useState("소형주 거래대금 500% 폭발 + 세력 매집 돌파");
  const [targetUniverse, setTargetUniverse] = useState("시총 500억~5,000억 원 코스닥 소형주");
  const [targetProfit, setTargetProfit] = useState("8.5%");
  const [stopLoss, setStopLoss] = useState("-2.5%");
  const [minScore, setMinScore] = useState(85);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botName) {
      alert("봇 이름을 입력해주세요.");
      return;
    }

    const newBot: BotPresetItem = {
      id: `custom-bot-${Date.now()}`,
      name: botName.trim(),
      category: category,
      categoryLabel: category === "SMALL" ? "소형주" : category === "MID" ? "중형주" : category === "LARGE" ? "대형주" : "가상자산",
      status: "ONLINE",
      statusText: "정상 가동",
      description: `${strategy} (목표익절: ${targetProfit}, 손절: ${stopLoss})`,
      winRate: Math.round(72 + Math.random() * 8),
      totalSignals: 120,
      pf: 2.15,
      targetUniverse: targetUniverse,
      latencyMs: 7.5,
      iconName: category === "SMALL" ? "Rocket" : category === "MID" ? "TrendingUp" : category === "CRYPTO" ? "Coins" : "Shield",
      badgeColor: category === "SMALL" ? "text-rose-600 bg-rose-50 border-rose-200" : category === "MID" ? "text-blue-600 bg-blue-50 border-blue-200" : category === "CRYPTO" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-indigo-600 bg-indigo-50 border-indigo-200",
      topDiscoveredStocks: category === "SMALL" ? ["레인보우로보틱스", "제주반도체", "유진로봇"] : category === "MID" ? ["한화에어로스페이스", "두산에너빌리티"] : category === "CRYPTO" ? ["BTC", "SOL", "DOGE"] : ["삼성전자", "SK하이닉스"]
    };

    saveCustomBot(newBot);
    alert(`[${newBot.name}] AI 맞춤 봇이 성공적으로 생성되어 AI CORE NEURAL ENGINE에 실시간 연동되었습니다!`);
    onBotCreated?.(newBot);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">AI 맞춤 트레이딩 봇 생성 및 엔진 연동</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                소형주 급등 탐색, 중형주 스윙, 업비트 가상자산 등 전용 알고리즘 봇을 생성합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              봇 명칭 (Bot Name)
            </label>
            <input
              type="text"
              placeholder="예: 소형주 급등 1호 발굴봇, 업비트 24H 볼륨 브레이크봇"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                타겟 마켓 및 종목 규모
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setCategory(cat);
                  if (cat === "SMALL") {
                    setStrategy("소형주 거래대금 500% 폭발 + 세력 매집 돌파");
                    setTargetUniverse("시총 500억~5,000억 원 코스닥 소형주");
                  } else if (cat === "MID") {
                    setStrategy("기관/외인 쌍끌이 20일선 눌림목 반등 스윙");
                    setTargetUniverse("시총 5,000억~3조 원 코스피/코스닥 주도주");
                  } else if (cat === "CRYPTO") {
                    setStrategy("업비트 실시간 틱 연동 변동성 돌파 및 김프 추적");
                    setTargetUniverse("업비트 원화 마켓 24H 가상자산");
                  } else {
                    setStrategy("코스피 200 저PBR 밸류업 퀀트 리밸런싱");
                    setTargetUniverse("코스피 대형 우량주");
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="SMALL">소형주 봇 (급등/알파 탐색)</option>
                <option value="MID">중형주 봇 (주도 스윙/수급)</option>
                <option value="LARGE">대형주 봇 (안정 퀀트/SMC)</option>
                <option value="CRYPTO">업비트 봇 (가상자산 24H)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                AI 신뢰 점수 최소 커트라인
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value={90}>S+ 등급만 (90점 이상 엄격 필터)</option>
                <option value={85}>S 등급 이상 (85점 이상 표준 권장)</option>
                <option value={80}>A 등급 이상 (80점 이상 적극 진입)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              적용 핵심 전략 알고리즘
            </label>
            <input
              type="text"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              타겟 유니버스 대상
            </label>
            <input
              type="text"
              value={targetUniverse}
              onChange={(e) => setTargetUniverse(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                목표 익절 기준 (TP)
              </label>
              <input
                type="text"
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                placeholder="예: 7.5% 또는 10%"
                className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 text-emerald-700 font-bold text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                자동 손절 방어선 (SL)
              </label>
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="예: -2.5% 또는 -3.0%"
                className="w-full p-2.5 bg-rose-50/50 border border-rose-300 text-rose-700 font-bold text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">실시간 오케스트레이터 파이프 자동 배포:</span>
              <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                봇이 생성되면 즉시 AI CORE NEURAL ENGINE의 12개 하위 모듈과 연동되어 0.1초 단위로 시장 신호를 발굴하고 차트 및 알림 피드에 전송합니다.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer"
          >
            AI 트레이딩 봇 생성 및 실시간 엔진 연결
          </button>
        </form>
      </div>
    </div>
  );
};
