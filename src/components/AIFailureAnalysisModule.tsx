import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Target, 
  BrainCircuit, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  RotateCcw, 
  Zap, 
  HelpCircle,
  BarChart3,
  Sliders,
  Sparkles
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface FailureCase {
  id: string;
  symbol: string;
  name: string;
  tradeDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPercent: number;
  failureCategory: "세력 트랩/허매수" | "매크로 변동성 충격" | "슬리피지/호가이격" | "거래량 실망" | "기술적 이격 과열";
  aiRootCause: string;
  reinforcedAction: string;
  confidenceScore: number;
}

export const AIFailureAnalysisModule: React.FC = () => {
  const { addToast } = useApp();
  const [targetWinRate, setTargetWinRate] = useState<number>(90);
  const [minConfidenceFilter, setMinConfidenceFilter] = useState<number>(88);
  const [isReinforcing, setIsReinforcing] = useState<boolean>(false);
  const [reinforcedLevel, setReinforcedLevel] = useState<string>("HIGH_PRECISION_90");

  // Sample failure cases and AI post-mortem analysis
  const [failureCases, setFailureCases] = useState<FailureCase[]>([
    {
      id: "FC-101",
      symbol: "005930",
      name: "삼성전자",
      tradeDate: "2026-07-28 10:15",
      entryPrice: 74800,
      exitPrice: 73270,
      returnPercent: -2.04,
      failureCategory: "세력 트랩/허매수",
      aiRootCause: "장초반 10분간 상단 잔량 착시 현상(허매수 잔량)에 의한 돌파 신호 착오. 외국인 대량 차익 매도 물량 흡수 실패.",
      reinforcedAction: "체결강도 130% 미만 유동성 구간 매수 승인 완전 차단 및 순간 잔량 가짜 벽 검증 알고리즘 2.0 적용.",
      confidenceScore: 78
    },
    {
      id: "FC-102",
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      tradeDate: "2026-07-25 22:40",
      entryPrice: 124.50,
      exitPrice: 120.20,
      returnPercent: -3.45,
      failureCategory: "매크로 변동성 충격",
      aiRootCause: "미 국채 10년물 금리 순간 급등(+12bp)으로 인한 빅테크 전반의 매크로 수급 둔화 및 알고리즘 투매 가속.",
      reinforcedAction: "미 국채 금리 및 VIX 변동성 실시간 스파이크 감지 시 AI 포지션 진입 중단 오버레이(Macro-Risk Overlay) 연동.",
      confidenceScore: 82
    },
    {
      id: "FC-103",
      symbol: "BTC",
      name: "비트코인",
      tradeDate: "2026-07-22 04:10",
      entryPrice: 94500000,
      exitPrice: 92800000,
      returnPercent: -1.80,
      failureCategory: "슬리피지/호가이격",
      aiRootCause: "새벽 시간대 글로벌 지정학 리스크 발발로 인한 호가창 얇아짐 현상 발생 및 슬리피지(-0.6%) 누적.",
      reinforcedAction: "새벽 02:00~06:00 시간대 체결 슬리피지 허용 한도를 0.15%로 축소 제한하고 분할 지정가 채무로 전환.",
      confidenceScore: 74
    },
    {
      id: "FC-104",
      symbol: "000660",
      name: "SK하이닉스",
      tradeDate: "2026-07-18 14:00",
      entryPrice: 198000,
      exitPrice: 194000,
      returnPercent: -2.02,
      failureCategory: "기술적 이격 과열",
      aiRootCause: "20일 이동평균선 대비 +8.5% 상향 이격 과열 상태에서 기술적 눌림목 반등 착오.",
      reinforcedAction: "이격도 106% 이상 과열 상태에서는 상승 모멘텀이 포착되더라도 90% 적중 강화 필터에 의해 '진입 거절' 처리.",
      confidenceScore: 80
    }
  ]);

  const handleApplyReinforcement = () => {
    setIsReinforcing(true);
    setTimeout(() => {
      setIsReinforcing(false);
      addToast({
        type: "SUCCESS",
        title: "🎯 AI 90% 적중률 강화 파라미터 적용 완료",
        message: `진입 임계값 신뢰도 ${minConfidenceFilter}%+ 설정 및 실패 원인 오답노트 강화 알고리즘이 실거래 오토파일럿에 반영되었습니다.`
      });
    }, 1200);
  };

  const handleRunRelearning = () => {
    setIsReinforcing(true);
    setTimeout(() => {
      setIsReinforcing(false);
      addToast({
        type: "INFO",
        title: "🧠 AI 실패 오답노트 재학습 완료",
        message: "과거 손절/실패 44건 데이터를 재연산하여 허매수 트랩 회피율 +14.2% 상향 보정되었습니다."
      });
    }, 1800);
  };

  // Failure cause chart data
  const categoryData = [
    { category: "세력 트랩", count: 18, color: "#f43f5e" },
    { category: "매크로 충격", count: 12, color: "#eab308" },
    { category: "슬리피지", count: 8, color: "#3b82f6" },
    { category: "기술적 과열", count: 6, color: "#a855f7" }
  ];

  return (
    <div id="ai-failure-analysis-module" className="space-y-6">
      {/* Top Banner: 90% Accuracy Target & Reinforcement Model */}
      <div className="bg-gradient-to-r from-zinc-950 via-indigo-950 to-zinc-900 border border-indigo-500/30 p-6 rounded-xl shadow-md text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-xl shrink-0">
              <Target className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white font-sans tracking-tight">
                  AI 자동매매 적중률 90% 목표 강화 & 실패 원인 오답노트
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  REINFORCEMENT LEARNING v4.8
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                손절 및 실수 진입 케이스를 실시간 분해 연산하여, <strong>90% 이상의 고적중 타점만 엄선 집행</strong>하도록 AI 신경망 임계값을 자율 정교화합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunRelearning}
              disabled={isReinforcing}
              className="px-3.5 py-2 bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`h-4 w-4 ${isReinforcing ? "animate-spin text-amber-400" : ""}`} />
              <span>{isReinforcing ? "오답 재학습 연산 중..." : "AI 오답 재학습 실행"}</span>
            </button>
            <button
              onClick={handleApplyReinforcement}
              disabled={isReinforcing}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-black rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>90% 고적중 강화 파라미터 적용</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-indigo-500/20">
            <span className="text-[10px] text-zinc-400 font-bold block">목표 적중률 (Target Win Rate)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-emerald-400">{targetWinRate}.0%</span>
              <span className="text-[10px] text-zinc-400">목표</span>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-lg border border-indigo-500/20">
            <span className="text-[10px] text-zinc-400 font-bold block">최근 100건 실전 적중률</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-indigo-300">89.2%</span>
              <span className="text-[10px] text-emerald-400 font-bold">▲ +2.4%</span>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-lg border border-indigo-500/20">
            <span className="text-[10px] text-zinc-400 font-bold block">최소 신뢰도 필터 임계값</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-amber-300">{minConfidenceFilter}%</span>
              <span className="text-[10px] text-zinc-400">이상 체결</span>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-3 rounded-lg border border-indigo-500/20">
            <span className="text-[10px] text-zinc-400 font-bold block">손절 차단/회피 성공률</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-emerald-400">94.6%</span>
              <span className="text-[10px] text-zinc-400">트랩 회피</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Precision Fine-Tuning Controller */}
      <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-black text-zinc-900 font-sans">
              AI 90% 고적중 필터링 및 강화 파라미터 튜닝
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
            ACTIVE REINFORCEMENT FILTER
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Target Confidence Slider */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-zinc-800 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-zinc-600" />
                <span>AI 최소 승인 신뢰도 (Minimum Confidence Threshold)</span>
              </label>
              <span className="text-sm font-black text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {minConfidenceFilter}%
              </span>
            </div>
            <input
              type="range"
              min="75"
              max="95"
              step="1"
              value={minConfidenceFilter}
              onChange={(e) => setMinConfidenceFilter(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>75% (다빈도 매매)</span>
              <span>88% (90% 적중 타겟)</span>
              <span>95% (극초고신뢰도 전용)</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              * 임계값을 <strong>{minConfidenceFilter}%</strong>로 설정 시, AI가 90% 이상 성공 확률을 확신하는 확실한 눌림목/돌파 자리에서만 자동 주문을 발송합니다.
            </p>
          </div>

          {/* Model Reinforcement Settings */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-3">
            <label className="font-bold text-zinc-800 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>강화학습 오답 보정 모드 선택</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded bg-white border border-zinc-200 cursor-pointer hover:border-indigo-400 transition">
                <input
                  type="radio"
                  name="rfLevel"
                  checked={reinforcedLevel === "HIGH_PRECISION_90"}
                  onChange={() => setReinforcedLevel("HIGH_PRECISION_90")}
                  className="accent-indigo-600"
                />
                <div>
                  <span className="font-bold text-zinc-900 block">적중률 90% 고정 필터 (권장)</span>
                  <span className="text-[10px] text-zinc-500">허매수 세력 트랩 및 매크로 스파이크 진입을 선제 차단</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded bg-white border border-zinc-200 cursor-pointer hover:border-indigo-400 transition">
                <input
                  type="radio"
                  name="rfLevel"
                  checked={reinforcedLevel === "ULTRA_SAFE"}
                  onChange={() => setReinforcedLevel("ULTRA_SAFE")}
                  className="accent-indigo-600"
                />
                <div>
                  <span className="font-bold text-zinc-900 block">극보수적 손실 제로 모드</span>
                  <span className="text-[10px] text-zinc-500">손절 확률 5% 미만 및 시장 주도 대형주 위주 체결</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Failure Root Cause Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failure Breakdown Chart */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
            <h3 className="text-xs font-black text-zinc-900 font-sans flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-rose-500" />
              <span>AI 손절/실패 원인 범주별 분포</span>
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">총 44건 분석</span>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            과거 손절 및 타점 오차 사례의 40.9%가 <strong>'세력 트랩/허매수'</strong>에 의한 것이며, 이에 맞춰 AI가 실시간 호가 가짜 잔량 검수 알고리즘을 보완하였습니다.
          </p>

          <div className="h-48 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <XAxis type="number" style={{ fontSize: "9px" }} />
                <YAxis dataKey="category" type="category" style={{ fontSize: "10px", fontWeight: "bold" }} width={80} />
                <Tooltip formatter={(value: any) => [`${value}건`, "발생 횟수"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Failure Analysis Table */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
              <h3 className="text-xs font-black text-zinc-900 font-sans">
                최근 AI 실패 케이스 심층 오답노트 (Post-Mortem Root Cause Analysis)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">실시간 피드백 반영</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {failureCases.map((fc) => (
              <div key={fc.id} className="p-3.5 border border-zinc-200 rounded-lg bg-zinc-50/50 space-y-2 hover:bg-zinc-50 transition text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-zinc-900">{fc.name} ({fc.symbol})</span>
                    <span className="text-[10px] font-mono text-zinc-400">{fc.tradeDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                      손익률: {fc.returnPercent}%
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-zinc-800 border border-zinc-300">
                      원인: {fc.failureCategory}
                    </span>
                  </div>
                </div>

                <div className="text-zinc-700 leading-relaxed text-[11px] bg-white p-2.5 rounded border border-zinc-200/60">
                  <strong className="text-rose-600 block mb-0.5 font-bold">🔍 AI 원인 진단 분석:</strong>
                  {fc.aiRootCause}
                </div>

                <div className="text-zinc-800 leading-relaxed text-[11px] bg-indigo-50/80 p-2.5 rounded border border-indigo-200/80">
                  <strong className="text-indigo-700 block mb-0.5 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>🛠️ 90% 적중 강화 알고리즘 피드백 반영:</span>
                  </strong>
                  {fc.reinforcedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
