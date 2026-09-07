import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  PieChart,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Award,
  Layers,
  Percent,
  Compass,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  ChevronRight,
  BarChart3,
  Sliders,
  DollarSign
} from "lucide-react";

export interface HoldingItem {
  symbol: string;
  name: string;
  qty?: number;
  buyPrice?: number;
  avgPrice?: number;
  currentPrice?: number;
  market?: string;
  capType?: string;
  pnl?: number;
  pnlPct?: number;
}

export interface PortfolioHealthData {
  overallHealthScore: number;
  healthGrade: string;
  summaryHeadline: string;
  riskExposure: {
    score: number;
    level: string;
    maxDrawdownRiskPct: number;
    betaScore: number;
    concentrationRisk: string;
    volatilityAssessment: string;
    riskFactors: string[];
  };
  diversification: {
    score: number;
    assetAllocation: Array<{
      category: string;
      weightPct: number;
      amount: number;
      color: string;
    }>;
    sectorDistribution: Array<{
      sector: string;
      pct: number;
    }>;
    diversificationAnalysis: string;
  };
  growthPotential: {
    score: number;
    weeklyExpectedReturnPct: number;
    momentumStatus: string;
    growthDrivers: string[];
    growthAssessment: string;
  };
  weeklyActionPlan: Array<{
    step: number;
    title: string;
    description: string;
    urgency: "HIGH" | "MEDIUM" | "LOW";
  }>;
  holdingHealthItems: Array<{
    symbol: string;
    name: string;
    healthGrade: string;
    healthScore: number;
    riskStatus: string;
    growthPotential: string;
    recommendation: string;
    targetPrice: number;
    stopLoss: number;
    aiOpinion: string;
  }>;
  generatedAt: string;
}

interface PortfolioHealthReportProps {
  holdings?: HoldingItem[];
  cashBalance?: number;
  capital?: number;
  onClose?: () => void;
  onSelectStock?: (symbol: string) => void;
}

export const PortfolioHealthReport: React.FC<PortfolioHealthReportProps> = ({
  holdings = [],
  cashBalance = 300000,
  capital = 300000,
  onClose,
  onSelectStock
}) => {
  const [report, setReport] = useState<PortfolioHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "risk" | "diversification" | "growth" | "holdings">("overview");
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);

  const fetchHealthReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio/health-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings,
          cashBalance,
          capital
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error("Failed to fetch health report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, [holdings.length, cashBalance]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 80) return "text-teal-400 border-teal-500/30 bg-teal-500/10";
    if (score >= 70) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "S+":
      case "S Tier":
      case "A+":
        return "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40";
      case "A":
      case "A+ Tier":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "B":
      case "B Tier":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    }
  };

  const totalHoldingValue = holdings.reduce((sum, h) => {
    const p = h.currentPrice || h.buyPrice || 0;
    const q = h.qty || 1;
    return sum + (p * q);
  }, 0);
  const totalAssets = totalHoldingValue + cashBalance;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-zinc-100 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              AI 포트폴리오 헬스 리포트 & 주간 진단
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Weekly AI Audit
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            현재 보유 주식·현금 비중을 실시간 반영하여 리스크 노출도, 자산 분산도, 주간 성장 잠재력을 종합 판정합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealthReport}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition disabled:opacity-50 text-zinc-200 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            {loading ? "AI 진단 연산 중..." : "리포트 새로고침"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl transition"
            >
              닫기
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !report && (
        <div className="py-16 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-pulse">
            <Activity className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200">Gemini 퀀트 뇌관 헬스 체크 실행 중...</p>
            <p className="text-xs text-zinc-400">보유 종목 수급, 섹터 집중도, 최대 낙폭(MDD) 리스크 모델링을 계산하고 있습니다.</p>
          </div>
        </div>
      )}

      {/* Main Report Body */}
      {report && (
        <div className="space-y-6">
          {/* Top Overall Score Card & Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Primary Score */}
            <div className="md:col-span-1 bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">포트폴리오 건강 점수</span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${getGradeBadge(report.healthGrade)}`}>
                  {report.healthGrade} 등급
                </span>
              </div>

              <div className="my-4 text-center">
                <div className="text-5xl font-black tracking-tight text-white flex items-baseline justify-center gap-1">
                  <span>{report.overallHealthScore}</span>
                  <span className="text-sm font-medium text-zinc-500">/ 100</span>
                </div>
                <div className="mt-2 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(10, report.overallHealthScore))}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                {report.summaryHeadline}
              </p>
            </div>

            {/* 3 Pillar Summary Cards */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Risk Exposure */}
              <div
                onClick={() => setActiveTab("risk")}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  activeTab === "risk"
                    ? "bg-rose-500/10 border-rose-500/40"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-semibold text-zinc-200">리스크 노출도</span>
                    </div>
                    <span className="text-xs font-bold text-rose-400">{report.riskExposure.score}점</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>위험도 수준</span>
                      <span className="text-zinc-200 font-medium">{report.riskExposure.level}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>예상 MDD 위험</span>
                      <span className="text-rose-400 font-medium">{report.riskExposure.maxDrawdownRiskPct}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 line-clamp-2">
                  {report.riskExposure.concentrationRisk}
                </div>
              </div>

              {/* 2. Diversification */}
              <div
                onClick={() => setActiveTab("diversification")}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  activeTab === "diversification"
                    ? "bg-indigo-500/10 border-indigo-500/40"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-zinc-200">자산 분산도</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-400">{report.diversification.score}점</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>보유 종목 수</span>
                      <span className="text-zinc-200 font-medium">{holdings.length}종목</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>현금 보유 비중</span>
                      <span className="text-indigo-300 font-medium">
                        {totalAssets > 0 ? ((cashBalance / totalAssets) * 100).toFixed(1) : 100}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 line-clamp-2">
                  소형/중형주 및 현금 완충 구조
                </div>
              </div>

              {/* 3. Growth Potential */}
              <div
                onClick={() => setActiveTab("growth")}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  activeTab === "growth"
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-zinc-200">주간 성장 잠재력</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{report.growthPotential.score}점</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>주간 기대 수익률</span>
                      <span className="text-emerald-400 font-semibold">+{report.growthPotential.weeklyExpectedReturnPct}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>모멘텀 판정</span>
                      <span className="text-emerald-300 font-medium">{report.growthPotential.momentumStatus}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 line-clamp-2">
                  {report.growthPotential.growthDrivers[0] || "우상향 추세 수렴"}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
                activeTab === "overview"
                  ? "bg-zinc-800 text-zinc-100 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              종합 주간 액션 플랜
            </button>
            <button
              onClick={() => setActiveTab("risk")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
                activeTab === "risk"
                  ? "bg-zinc-800 text-rose-400 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              리스크 노출도 (Risk Exposure)
            </button>
            <button
              onClick={() => setActiveTab("diversification")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
                activeTab === "diversification"
                  ? "bg-zinc-800 text-indigo-400 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              자산 & 섹터 분산도 (Diversification)
            </button>
            <button
              onClick={() => setActiveTab("growth")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
                activeTab === "growth"
                  ? "bg-zinc-800 text-emerald-400 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              성장 잠재력 (Growth Potential)
            </button>
            <button
              onClick={() => setActiveTab("holdings")}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
                activeTab === "holdings"
                  ? "bg-zinc-800 text-amber-400 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              종목별 개별 AI 진단 ({holdings.length})
            </button>
          </div>

          {/* Tab 1: Overview & Weekly Action Plan */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Strategic Action Plan */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-zinc-100">AI 권고 주간 포트폴리오 관리 3단계 액션 플랜</h3>
                  </div>
                  <button
                    onClick={() => {
                      const text = report.weeklyActionPlan
                        .map((p) => `${p.step}. [${p.urgency}] ${p.title}\n   ${p.description}`)
                        .join("\n");
                      navigator.clipboard.writeText(text);
                      setCopiedPlan(true);
                      setTimeout(() => setCopiedPlan(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1 bg-zinc-800 rounded-lg transition"
                  >
                    {copiedPlan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5" />}
                    {copiedPlan ? "복사 완료" : "플랜 텍스트 복사"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {report.weeklyActionPlan.map((plan) => (
                    <div
                      key={plan.step}
                      className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                          {plan.step}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            plan.urgency === "HIGH"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {plan.urgency} 우선순위
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200">{plan.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{plan.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Balance Summary Bar */}
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/70 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">총 운용 자산:</span>
                  <span className="text-sm font-bold text-white">{(totalAssets ?? 0).toLocaleString()}원</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">주식 평가액:</span>
                  <span className="text-sm font-semibold text-emerald-400">{(totalHoldingValue ?? 0).toLocaleString()}원</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">가용 현금:</span>
                  <span className="text-sm font-semibold text-indigo-300">{(cashBalance ?? 0).toLocaleString()}원</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>진단 일시: {report.generatedAt}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Risk Exposure */}
          {activeTab === "risk" && (
            <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-zinc-100">리스크 노출도 정밀 진단 (Risk Exposure Audit)</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                  안전성 지수: {report.riskExposure.score} / 100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
                  <span className="text-xs font-semibold text-zinc-300">핵심 리스크 파라미터</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">위험 레벨 분류</span>
                      <span className="font-semibold text-rose-300">{report.riskExposure.level}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">포트폴리오 베타(Beta) 지수</span>
                      <span className="font-semibold text-zinc-200">{report.riskExposure.betaScore} (시장 대비 변동성)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">최대 낙폭(MDD) 허용선</span>
                      <span className="font-semibold text-rose-400">{report.riskExposure.maxDrawdownRiskPct}%</span>
                    </div>
                  </div>
                  <div className="pt-2 text-xs text-zinc-400 leading-relaxed">
                    <p className="font-medium text-zinc-300 mb-1">집중도 진단:</p>
                    {report.riskExposure.concentrationRisk}
                  </div>
                </div>

                <div className="space-y-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4">
                  <span className="text-xs font-semibold text-zinc-300">주요 모니터링 위험 요인</span>
                  <div className="space-y-2">
                    {report.riskExposure.riskFactors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60">
                    <p className="font-medium text-zinc-300 mb-1">변동성 평가:</p>
                    {report.riskExposure.volatilityAssessment}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Diversification */}
          {activeTab === "diversification" && (
            <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-zinc-100">자산군 및 섹터 분산도 분석 (Diversification)</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                  분산 지수: {report.diversification.score} / 100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Asset Allocation Bar */}
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-semibold text-zinc-300">자산군 구성 비중 (Asset Allocation)</span>
                  <div className="h-3 w-full bg-zinc-800 rounded-full flex overflow-hidden">
                    {report.diversification.assetAllocation.map((item, idx) => (
                      <div
                        key={idx}
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${item.weightPct}%`,
                          backgroundColor: item.color || "#10b981"
                        }}
                        title={`${item.category}: ${item.weightPct}%`}
                      />
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {report.diversification.assetAllocation.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color || "#10b981" }}
                          />
                          <span className="text-zinc-300">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400">{item.amount?.toLocaleString()}원</span>
                          <span className="font-semibold text-zinc-200 w-12 text-right">{item.weightPct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sector Distribution */}
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-semibold text-zinc-300">섹터별 노출도 (Sector Distribution)</span>
                  <div className="space-y-2">
                    {report.diversification.sectorDistribution.map((sec, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-300">{sec.sector}</span>
                          <span className="font-semibold text-indigo-300">{sec.pct}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, sec.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-800/60 leading-relaxed">
                    {report.diversification.diversificationAnalysis}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Growth Potential */}
          {activeTab === "growth" && (
            <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-100">주간 계좌 성장 잠재력 진단 (Growth Potential)</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  모멘텀 지수: {report.growthPotential.score} / 100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
                  <span className="text-xs text-zinc-400">주간 기대 수익률</span>
                  <div className="text-2xl font-black text-emerald-400">
                    +{report.growthPotential.weeklyExpectedReturnPct}%
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    상위 수급 종목의 5일 이평선 지지력 기반 기대치
                  </p>
                </div>

                <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
                  <span className="text-xs text-zinc-400">추세 모멘텀 상태</span>
                  <div className="text-2xl font-black text-teal-300">
                    {report.growthPotential.momentumStatus}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    기관/외인 순매수 지속 유입 구간
                  </p>
                </div>

                <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-2">
                  <span className="text-xs text-zinc-400">주요 상승 동력 (Growth Drivers)</span>
                  <div className="space-y-1">
                    {report.growthPotential.growthDrivers.slice(0, 2).map((driver, i) => (
                      <div key={i} className="text-xs text-zinc-300 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{driver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 leading-relaxed">
                <p className="font-semibold text-emerald-400 mb-1">AI 퀀트 총평:</p>
                {report.growthPotential.growthAssessment}
              </div>
            </div>
          )}

          {/* Tab 5: Individual Holding Items Health */}
          {activeTab === "holdings" && (
            <div className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-zinc-100">보유 종목별 정밀 건강 점수 & 대응 가이드</h3>
                </div>
                <span className="text-xs text-zinc-400">총 {report.holdingHealthItems.length}종목 분석</span>
              </div>

              {report.holdingHealthItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  현재 보유 중인 종목이 없습니다. 현금 100% 상태입니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.holdingHealthItems.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => onSelectStock && onSelectStock(item.symbol)}
                      className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2.5 hover:border-emerald-500/40 transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono">[{item.symbol}]</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getGradeBadge(item.healthGrade)}`}>
                          {item.healthGrade} ({item.healthScore}점)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-zinc-900/70 rounded-lg text-[11px]">
                        <div>
                          <span className="text-zinc-500 block">AI 판정</span>
                          <span className="font-semibold text-emerald-400">{item.recommendation}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">1차 목표가</span>
                          <span className="font-semibold text-zinc-200">{(item.targetPrice ?? 0).toLocaleString()}원</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">손절 기준가</span>
                          <span className="font-semibold text-rose-400">{(item.stopLoss ?? 0).toLocaleString()}원</span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {item.aiOpinion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default PortfolioHealthReport;
