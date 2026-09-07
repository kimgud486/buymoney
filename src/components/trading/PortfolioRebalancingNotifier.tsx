import React, { useState, useMemo } from "react";
import { 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  Sliders, 
  PieChart, 
  Bot, 
  ShieldAlert, 
  X,
  Zap,
  TrendingUp,
  Layers,
  FileText
} from "lucide-react";
import { StockPosition, CashBreakdown } from "../../types";
import { AiPortfolioRebalancingReportModal } from "./AiPortfolioRebalancingReportModal";

interface PortfolioRebalancingNotifierProps {
  positions: StockPosition[];
  cashBreakdown?: CashBreakdown;
  onExecuteRebalance?: (suggestion: RebalanceSuggestion) => void;
}

export interface RebalanceSuggestion {
  id: string;
  assetClass: "KOREA" | "US" | "BTC";
  assetLabel: string;
  currentPct: number;
  targetPct: number;
  driftPct: number;
  action: "REDUCE" | "INCREASE";
  recommendedAmount: number;
  symbol?: string;
  name?: string;
  rationale: string;
  status: "PENDING" | "APPROVED" | "EXECUTED" | "DISMISSED";
}

export const PortfolioRebalancingNotifier: React.FC<PortfolioRebalancingNotifierProps> = ({
  positions = [],
  cashBreakdown,
  onExecuteRebalance
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Calculate live portfolio weights
  const suggestions = useMemo<RebalanceSuggestion[]>(() => {
    const list: RebalanceSuggestion[] = [];

    // Total Portfolio Value
    const totalKorea = cashBreakdown?.koreaTotal || 12500000;
    const totalUs = cashBreakdown?.tossTotal || 8200000;
    const totalUpbit = cashBreakdown?.upbitTotal || 14800000;
    const grandTotal = totalKorea + totalUs + totalUpbit || 35500000;

    const koreaPct = Math.round((totalKorea / grandTotal) * 100);
    const usPct = Math.round((totalUs / grandTotal) * 100);
    const upbitPct = Math.round((totalUpbit / grandTotal) * 100);

    // Targets: Korea 40%, US 30%, Crypto 30%
    const targetKorea = 40;
    const targetUs = 30;
    const targetUpbit = 30;

    // Check Crypto Drift (Upbit)
    if (Math.abs(upbitPct - targetUpbit) >= 5) {
      const isOver = upbitPct > targetUpbit;
      const drift = upbitPct - targetUpbit;
      list.push({
        id: "reb-upbit-1",
        assetClass: "BTC",
        assetLabel: "🪙 업비트 가상자산",
        currentPct: upbitPct,
        targetPct: targetUpbit,
        driftPct: drift,
        action: isOver ? "REDUCE" : "INCREASE",
        recommendedAmount: Math.round(grandTotal * (Math.abs(drift) / 100)),
        rationale: `비트코인 및 가상자산 비중이 ${upbitPct}%로 목표비중(${targetUpbit}%) 대비 ${drift > 0 ? "+" : ""}${drift}% 리스크 편차가 발생했습니다. ${isOver ? "일부 차익실현 후 KOSPI 저평가 대형주로 리밸런싱을 권장합니다." : "가상자산 비중을 확대할 시점입니다."}`,
        status: "PENDING"
      });
    }

    // Check Korea Stock Drift
    if (Math.abs(koreaPct - targetKorea) >= 5) {
      const isOver = koreaPct > targetKorea;
      const drift = koreaPct - targetKorea;
      list.push({
        id: "reb-korea-2",
        assetClass: "KOREA",
        assetLabel: "🇰🇷 국내주식 (KOSPI/KOSDAQ)",
        currentPct: koreaPct,
        targetPct: targetKorea,
        driftPct: drift,
        action: isOver ? "REDUCE" : "INCREASE",
        recommendedAmount: Math.round(grandTotal * (Math.abs(drift) / 100)),
        rationale: `국내주식 포트폴리오 비중이 ${koreaPct}%로 목표(${targetKorea}%)보다 ${drift > 0 ? "+" : ""}${drift}% 편차를 보이고 있습니다. ${isOver ? "리스크 분산을 위해 해외주식으로 전환을 권장합니다." : "반도체 주도주 비중을 축적해 비중을 맞추세요."}`,
        status: "PENDING"
      });
    }

    // Default recommendation if no extreme drift
    if (list.length === 0) {
      list.push({
        id: "reb-default-3",
        assetClass: "US",
        assetLabel: "🇺🇸 미국주식 (빅테크)",
        currentPct: usPct,
        targetPct: targetUs,
        driftPct: 2,
        action: "INCREASE",
        recommendedAmount: 1200000,
        rationale: "현재 전 자산군 비중이 안정한 편입니다. 엔비디아/애플 등 미국 빅테크 섹터의 모멘텀 강화를 위해 120만원 분할 리밸런싱을 제안합니다.",
        status: "PENDING"
      });
    }

    return list.filter((s) => !dismissedIds.includes(s.id));
  }, [cashBreakdown, positions, dismissedIds]);

  const handleApproveRebalance = (item: RebalanceSuggestion) => {
    setExecutingId(item.id);
    setTimeout(() => {
      setExecutingId(null);
      setCompletedIds((prev) => [...prev, item.id]);
      if (onExecuteRebalance) {
        onExecuteRebalance(item);
      }
    }, 1200);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 text-slate-100 shadow-xl space-y-4 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/80 shadow-xs">
            <Sliders className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">AI 포트폴리오 비중 리밸런싱 실시간 제안</h3>
              <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full text-[10px] font-black flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                목표 비중 편차 감지
              </span>
            </div>
            <p className="text-xs text-slate-400">
              실시간 포트폴리오 수익률 분석 및 리스크 분산을 위한 AI 자율 리밸런싱 추천
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-200" />
            <span>AI 비중 진단 리포트 열기</span>
          </button>

          <span className="text-xs font-mono text-amber-300 bg-amber-950/60 px-2.5 py-1.5 rounded-xl border border-amber-800/80 font-bold">
            ⚡ 자동 감지 {suggestions.length}건
          </span>
        </div>
      </div>

      <AiPortfolioRebalancingReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        positions={positions}
        cashBreakdown={cashBreakdown}
      />

      {/* Suggestion Cards */}
      <div className="space-y-3 relative z-10">
        {suggestions.map((item) => {
          const isExecuting = executingId === item.id;
          const isCompleted = completedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition space-y-3 ${
                isCompleted
                  ? "bg-emerald-950/40 border-emerald-800/80"
                  : "bg-slate-950 border-slate-800 hover:border-amber-500/50"
              }`}
            >
              {/* Top Row: Asset Name, Target vs Current */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">{item.assetLabel}</span>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    item.action === "REDUCE" 
                      ? "bg-rose-950 text-rose-300 border-rose-800" 
                      : "bg-emerald-950 text-emerald-300 border-emerald-800"
                  }`}>
                    {item.action === "REDUCE" ? "▼ 축소 권장" : "▲ 확대 권장"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="text-slate-400 mr-1.5">현재 비중:</span>
                    <strong className="text-amber-300 font-bold">{item.currentPct}%</strong>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="text-slate-400 mr-1.5">목표 비중:</span>
                    <strong className="text-emerald-400 font-bold">{item.targetPct}%</strong>
                  </div>
                </div>
              </div>

              {/* Rationale Text */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans flex items-start gap-2">
                <Bot className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-bold mr-1">AI 비중 리포트:</strong>
                  {item.rationale}
                  <div className="mt-1 font-mono text-[11px] text-cyan-400 font-bold">
                    권장 조절 금액: 약 {(item.recommendedAmount ?? 0).toLocaleString()}원
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleDismiss(item.id)}
                  disabled={isExecuting || isCompleted}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-bold transition border border-slate-800 cursor-pointer"
                >
                  나중에
                </button>

                <button
                  onClick={() => handleApproveRebalance(item)}
                  disabled={isExecuting || isCompleted}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 hover:bg-amber-500 text-white"
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>AI 자율 리밸런싱 실행 중...</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>리밸런싱 승인 완료</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>1-Click AI 리밸런싱 실행</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
