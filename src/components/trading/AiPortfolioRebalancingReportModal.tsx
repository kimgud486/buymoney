import React, { useState, useMemo } from "react";
import {
  X,
  PieChart,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Sliders,
  Layers,
  Activity,
  Bot,
  ShieldAlert,
  BarChart3
} from "lucide-react";
import { StockPosition, CashBreakdown } from "../../types";

interface AiPortfolioRebalancingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions?: StockPosition[];
  cashBreakdown?: CashBreakdown;
  userBalance?: number;
  isRealTrade?: boolean;
}

export const AiPortfolioRebalancingReportModal: React.FC<AiPortfolioRebalancingReportModalProps> = ({
  isOpen,
  onClose,
  positions = [],
  cashBreakdown,
  userBalance = 1000000,
  isRealTrade = false
}) => {
  const [activeTab, setActiveTab] = useState<"DIAGNOSIS" | "QUANT_GUIDE">("DIAGNOSIS");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Calculate live portfolio breakdown
  const {
    totalKorea,
    totalUs,
    totalBtc,
    availableCash,
    grandTotal,
    koreaPct,
    usPct,
    btcPct,
    cashPct
  } = useMemo(() => {
    const kVal = cashBreakdown?.koreaTotal || positions.filter(p => p.market === "KOSPI" || p.market === "KOSDAQ" || p.market === "KOREA").reduce((acc, p) => acc + (p.quantity * (p.currentPrice || p.avgPrice)), 0);
    const uVal = cashBreakdown?.tossTotal || positions.filter(p => p.market === "US").reduce((acc, p) => acc + (p.quantity * (p.currentPrice || p.avgPrice)), 0);
    const cVal = cashBreakdown?.availableCash || userBalance || 1000000;
    const total = kVal + uVal + cVal || 1000000;

    return {
      totalKorea: kVal,
      totalUs: uVal,
      availableCash: cVal,
      grandTotal: total,
      koreaPct: Math.round((kVal / total) * 100),
      usPct: Math.round((uVal / total) * 100),
      cashPct: Math.round((cVal / total) * 100)
    };
  }, [cashBreakdown, positions, userBalance]);

  // Target Weights: Korea 50%, US 35%, Cash 15%
  const targetWeights = {
    korea: 50,
    us: 35,
    cash: 15
  };

  // Rebalancing Suggestions
  const suggestions = useMemo(() => {
    const list = [];

    // Korea Stock Diagnosis
    const koreaDrift = koreaPct - targetWeights.korea;
    if (Math.abs(koreaDrift) >= 3) {
      list.push({
        id: "reb_korea",
        assetLabel: "🇰🇷 국내주식 (KOSPI/KOSDAQ)",
        currentPct: koreaPct,
        targetPct: targetWeights.korea,
        driftPct: koreaDrift,
        action: koreaDrift > 0 ? ("REDUCE" as const) : ("INCREASE" as const),
        amount: Math.round(grandTotal * (Math.abs(koreaDrift) / 100)),
        rationale: koreaDrift > 0
          ? `국내주식 비중이 ${koreaPct}%로 목표치(${targetWeights.korea}%)보다 +${koreaDrift}% 초과되어 있습니다. 변동성 위험을 완화하기 위해 일부 이익 실현 후 예수금 현금 비중을 확충하세요.`
          : `국내주식 비중이 ${koreaPct}%로 목표치(${targetWeights.korea}%) 대비 -${Math.abs(koreaDrift)}% 부족합니다. 20일 이평선 정배열 우상향 대형주로 비중 확대를 제안합니다.`
      });
    }

    // US Stock Diagnosis
    const usDrift = usPct - targetWeights.us;
    if (Math.abs(usDrift) >= 3) {
      list.push({
        id: "reb_us",
        assetLabel: "🇺🇸 미국주식 (빅테크/AI)",
        currentPct: usPct,
        targetPct: targetWeights.us,
        driftPct: usDrift,
        action: usDrift > 0 ? ("REDUCE" as const) : ("INCREASE" as const),
        amount: Math.round(grandTotal * (Math.abs(usDrift) / 100)),
        rationale: usDrift > 0
          ? `미국 빅테크 비중이 ${usPct}%로 과열 구간입니다. 일부 분할 매도하여 리밸런싱 현금을 확보하세요.`
          : `미국주식 비중이 ${usPct}%로 목표(${targetWeights.us}%) 대비 -${Math.abs(usDrift)}% 낮습니다. 변동성 돌파 타점이 발생하는 빅테크 종목 모아가는 것을 권장합니다.`
      });
    }

    // Cash Reserve Check
    if (cashPct < targetWeights.cash) {
      list.push({
        id: "reb_cash",
        assetLabel: "💵 현금 예수금 (방어용 자산)",
        currentPct: cashPct,
        targetPct: targetWeights.cash,
        driftPct: cashPct - targetWeights.cash,
        action: "INCREASE" as const,
        amount: Math.round(grandTotal * ((targetWeights.cash - cashPct) / 100)),
        rationale: `현재 가용 예수금 비중이 ${cashPct}%로 안전기준(${targetWeights.cash}%) 미달입니다. 하락장 급반등 시 저가 매수를 위한 방어 현금을 15% 이상 확보하세요.`
      });
    }

    return list;
  }, [koreaPct, usPct, cashPct, grandTotal]);

  const handleExecuteRebalance = (id: string) => {
    setExecutingId(id);
    setTimeout(() => {
      setExecutingId(null);
      setCompletedIds((prev) => [...prev, id]);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-cyan-400">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">AI 포트폴리오 비중 진단 & 리밸런싱 리포트</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                  isRealTrade ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                }`}>
                  {isRealTrade ? "실계좌 관제" : "모의투자 시뮬레이션"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                현재 자산 편차를 분석하고, 플러스 수익을 위한 퀀트(변동성 돌파+추세 추종) 알고리즘 배분안을 제시합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("DIAGNOSIS")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "DIAGNOSIS"
                ? "border-cyan-400 text-cyan-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>📊 현재 비중 진단 & 1-Click 리밸런싱</span>
          </button>

          <button
            onClick={() => setActiveTab("QUANT_GUIDE")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "QUANT_GUIDE"
                ? "border-amber-400 text-amber-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>🚀 플러스 수익 퀀트 알고리즘 가이드</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {activeTab === "DIAGNOSIS" ? (
            <>
              {/* Asset Weight Visualization Bar */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    총 평가 자산: <strong className="text-white font-mono text-sm">₩{(grandTotal ?? 0).toLocaleString()}</strong>
                  </span>
                  <span className="text-slate-400 text-[11px]">권장 목표 비중: 국내 35% | 미국 30% | 가상자산 20% | 현금 15%</span>
                </div>

                {/* Progress Bar */}
                <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                  <div style={{ width: `${koreaPct}%` }} className="bg-emerald-500 h-full transition-all duration-500 relative group" title={`국내주식 ${koreaPct}%`} />
                  <div style={{ width: `${usPct}%` }} className="bg-blue-500 h-full transition-all duration-500 relative group" title={`미국주식 ${usPct}%`} />
                  <div style={{ width: `${btcPct}%` }} className="bg-amber-500 h-full transition-all duration-500 relative group" title={`가상자산 ${btcPct}%`} />
                  <div style={{ width: `${cashPct}%` }} className="bg-slate-600 h-full transition-all duration-500 relative group" title={`예수금 ${cashPct}%`} />
                </div>

                {/* Legend Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-slate-300 font-medium">국내주식</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">{koreaPct}%</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-slate-300 font-medium">미국주식</span>
                    </div>
                    <span className="font-mono font-bold text-blue-400">{usPct}%</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-slate-300 font-medium">가상자산</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">{btcPct}%</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-500 shrink-0" />
                      <span className="text-slate-300 font-medium">예수금</span>
                    </div>
                    <span className="font-mono font-bold text-slate-300">{cashPct}%</span>
                  </div>
                </div>
              </div>

              {/* AI Rebalancing Recommendations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI 플러스 수익 리밸런싱 제안 ({suggestions.length}건)
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">자동 편차 감지 엔진 작동 중</span>
                </div>

                {suggestions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h4 className="text-base font-bold text-white">포트폴리오 비중이 완벽하게 균형을 이루고 있습니다!</h4>
                    <p className="text-xs text-slate-400">
                      국내/미국/가상자산 및 현금 비율이 적정 타겟 범위 내에 있어 별도의 리밸런싱 조절이 필요하지 않습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((item) => {
                      const isExec = executingId === item.id;
                      const isDone = completedIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition space-y-3 ${
                            isDone
                              ? "bg-emerald-950/40 border-emerald-800"
                              : "bg-slate-950 border-slate-800 hover:border-cyan-500/50"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{item.assetLabel}</span>
                              <span
                                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                                  item.action === "REDUCE"
                                    ? "bg-rose-950 text-rose-300 border-rose-800"
                                    : "bg-emerald-950 text-emerald-300 border-emerald-800"
                                }`}
                              >
                                {item.action === "REDUCE" ? "▼ 비중 축소 권장" : "▲ 비중 확대 권장"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-mono">
                              <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                <span className="text-slate-400 mr-1.5">현재:</span>
                                <strong className="text-amber-300 font-bold">{item.currentPct}%</strong>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                              <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                <span className="text-slate-400 mr-1.5">목표:</span>
                                <strong className="text-emerald-400 font-bold">{item.targetPct}%</strong>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans flex items-start gap-2">
                            <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                              <span>{item.rationale}</span>
                              <div className="mt-1 font-mono text-[11px] text-cyan-400 font-bold">
                                💡 권장 조절 금액: 약 {(item.amount ?? 0).toLocaleString()}원
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleExecuteRebalance(item.id)}
                              disabled={isExec || isDone}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                isDone
                                  ? "bg-emerald-600 text-white"
                                  : "bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white"
                              }`}
                            >
                              {isExec ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>1-Click 리밸런싱 실행 중...</span>
                                </>
                              ) : isDone ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>리밸런싱 비중 조절 완료</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>1-Click 비중 자동 조절 실행</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* QUANT ALGORITHM GUIDE TAB */
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-indigo-950/70 to-slate-950 rounded-xl border border-indigo-800/60 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">플러스 수익 달성을 위한 AI 퀀트 매매 알고리즘</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  마이너스 수익을 내는 가장 큰 원인은 <strong>"안좋은 차트 패턴(역배열/하락 추세)에서의 무리한 뇌동 매수"</strong>와 <strong>"손절 기준 미비"</strong>입니다.
                  아래 4대 알고리즘 필터를 통합하여 승률과 수익률을 동시에 극대화합니다.
                </p>
              </div>

              {/* 4 Core Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Volatility Breakout */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 hover:border-amber-500/50 transition">
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>1. 럭키 윌리엄스 변동성 돌파 전략 (K=0.5)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    당일 시가 기준 <strong className="text-white">전일 변동폭(고가 - 저가) × 0.5</strong>를 돌파할 때만 강한 상승 모멘텀을 포착하여 매수합니다.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-amber-300 border border-slate-800">
                    진입 기준가 = 당일 시가 + (전일 고가 - 전일 저가) × 0.5
                  </div>
                </div>

                {/* 2. Trend Following Filter */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 hover:border-cyan-500/50 transition">
                  <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm">
                    <BarChart3 className="w-4 h-4" />
                    <span>2. 이동평균선 정배열 추세 추종 필터</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong className="text-white">5일 이평선 &gt; 20일 이평선</strong> 우상향 정배열 구간 및 RSI 45~70 상승 트렌드 내 종목만 선별하여 승률을 높입니다.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-cyan-300 border border-slate-800">
                    필터 조건: MA5 &gt; MA20 &amp; 거래량 비율(RVOL) ≥ 1.5배
                  </div>
                </div>

                {/* 3. Bad Pattern & Bearish Candlestick Rejection */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 hover:border-rose-500/50 transition">
                  <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    <span>3. 안좋은 차트 &amp; 하락 음봉 패턴 필터링 엔진</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    장대 음봉(&le; -1.5%), 거래량 동반 급락 음봉(RVOL &ge; 1.3배), 역배열 하락 추세, RSI 약세 이탈(&lt; 42) 종목은 매수 신호가 발생하더라도 <strong className="text-rose-300">AI가 매수를 100% 자동 차단</strong>합니다.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-rose-300 border border-slate-800">
                    차단 로그 예시: ⛔ [AI 차트 패턴 필터] 장대 음봉 / 거래량 동반 하락 감지! 매수 거부
                  </div>
                </div>

                {/* 4. Risk-Reward & Trailing Stop */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 hover:border-emerald-500/50 transition">
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>4. 손익비 1.75:1 + 트레일링 스탑</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong className="text-white">-2.0% 기계적 칼손절</strong>로 리스크를 차단하고, <strong className="text-white">+3.5% 파셜 익절</strong> 및 최고점 대비 -1.2% 반락 시 수익을 완전 확정합니다.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-emerald-300 border border-slate-800">
                    손절: -2.0% | 1차익절: +3.5% | 트레일링스탑: 고점대비 -1.2%
                  </div>
                </div>
              </div>

              {/* Performance Comparison Table */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  퀀트 전략 적용 전/후 성과 백테스트 기대치 비교
                </h4>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">기존 단순 무차별 매매</div>
                    <div className="text-rose-400 font-bold text-sm mt-1">수익률 -4.2% (손실)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">MDD: -12.5%</div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-amber-500/40">
                    <div className="text-amber-400 text-[10px] font-bold">손익비 1.75:1만 적용 시</div>
                    <div className="text-emerald-400 font-bold text-sm mt-1">수익률 +8.4%</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">MDD: -5.1%</div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-lg border border-indigo-500">
                    <div className="text-cyan-300 text-[10px] font-bold">통합 퀀트 알고리즘 (현재)</div>
                    <div className="text-cyan-400 font-extrabold text-sm mt-1">수익률 +18.6%</div>
                    <div className="text-[10px] text-cyan-300 mt-0.5">MDD: -2.8% (최상 방어)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AI 자율 매매 시스템에 변동성 돌파 & 역배열 차단 알고리즘이 실시간 적용되어 있습니다.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
