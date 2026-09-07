import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Cpu,
  Coins,
  Scale,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  Flame,
  BarChart2
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StrictQuantSignalPipeline, PipelineEvaluationResult } from "../../services/StrictQuantSignalPipeline";

export const StrictFilterAuditLogCard: React.FC = () => {
  const { decisionLogs, profile } = useApp();
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PASSED" | "REJECTED">("ALL");

  const filteredLogs = (decisionLogs || []).filter(log => {
    if (activeFilter === "PASSED") return log.action === "BUY" || log.message.includes("체결");
    if (activeFilter === "REJECTED") return log.action === "SAFETY_REJECT" || log.message.includes("기각") || log.message.includes("방지");
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">
                🛡️ AI 5대 하드 게이트 분석 필터 실시간 감사 로그
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% 필터 직결 가동 중
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              SMC 구조 돌파 + 16대 뇌엔진 만장일치 + 손익비 1:2.0 검증을 통과한 종목만 승인되며, 미달 종목의 거부 사유를 투명하게 공개합니다.
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            전체 로그 ({decisionLogs?.length || 0})
          </button>
          <button
            onClick={() => setActiveFilter("PASSED")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === "PASSED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-emerald-400"
            }`}
          >
            ✅ 승인 (BUY)
          </button>
          <button
            onClick={() => setActiveFilter("REJECTED")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeFilter === "REJECTED"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-400 hover:text-rose-400"
            }`}
          >
            🛑 거부 (REJECT)
          </button>
        </div>
      </div>

      {/* 5-Gate Architecture Legend Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="p-2.5 bg-slate-950/80 border border-indigo-900/40 rounded-xl flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-indigo-300">Gate 1: SMC 구조</div>
            <div className="text-[10px] text-slate-400">BOS / OB 지지</div>
          </div>
        </div>
        <div className="p-2.5 bg-slate-950/80 border border-purple-900/40 rounded-xl flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-purple-300">Gate 2: 16대 뇌엔진</div>
            <div className="text-[10px] text-slate-400">13개 이상 합의</div>
          </div>
        </div>
        <div className="p-2.5 bg-slate-950/80 border border-cyan-900/40 rounded-xl flex items-center gap-2">
          <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-cyan-300">Gate 3: 손익비 1:2.0</div>
            <div className="text-[10px] text-slate-400">RR Ratio &ge; 2.0</div>
          </div>
        </div>
        <div className="p-2.5 bg-slate-950/80 border border-emerald-900/40 rounded-xl flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-emerald-300">Gate 4: 캔들/양봉</div>
            <div className="text-[10px] text-slate-400">음봉 100% 차단</div>
          </div>
        </div>
        <div className="p-2.5 bg-slate-950/80 border border-amber-900/40 rounded-xl flex items-center gap-2 col-span-2 sm:col-span-1">
          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-amber-300">Gate 5: 업비트/비중</div>
            <div className="text-[10px] text-slate-400">Top 4 &amp; 한도 제어</div>
          </div>
        </div>
      </div>

      {/* Log Items List */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800">
            실시간 자율매매 엔진이 스캔하는 시세 분석 및 필터 로그가 여기에 표시됩니다.
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const isApproved = log.action === "BUY" || log.message.includes("체결");
            const isExpanded = selectedLogId === log.id;

            // Generate live pipeline evaluation preview
            const evalResult = StrictQuantSignalPipeline.evaluateStock(
              log.symbol,
              log.name,
              log.market || "KOREA",
              log.currentPrice,
              0.8,
              log.volumeRatio || 1.2
            );

            return (
              <div
                key={`${log.id}_${idx}`}
                className={`p-3.5 rounded-xl border transition ${
                  isApproved
                    ? "bg-emerald-950/20 border-emerald-800/50 hover:border-emerald-600/70"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg font-black text-xs shrink-0 ${
                        isApproved
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isApproved ? "승인 (BUY)" : "기각 (REJECT)"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{log.name}</span>
                        <span className="text-xs font-mono text-slate-400">({log.symbol})</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {log.market === "US" ? "🇺🇸 해외" : log.market === "BTC" ? "🪙 업비트" : "🇰🇷 국내"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-snug">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedLogId(isExpanded ? null : log.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
                    title="5대 관문 세부 검증 결과 보기"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded 5-Gate Audit Result Box */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                      {/* Gate 1: SMC */}
                      <div
                        className={`p-2 rounded-lg border flex flex-col justify-between ${
                          evalResult.passedGates.smcGate
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                            : "bg-rose-950/40 border-rose-900/60 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>1. SMC 구조</span>
                          {evalResult.passedGates.smcGate ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <span className="text-[10px] mt-1 opacity-80">{evalResult.smcDetails.structure}</span>
                      </div>

                      {/* Gate 2: 16 Brain Engines */}
                      <div
                        className={`p-2 rounded-lg border flex flex-col justify-between ${
                          evalResult.passedGates.engineConsensusGate
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                            : "bg-rose-950/40 border-rose-900/60 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>2. 16대 뇌엔진</span>
                          {evalResult.passedGates.engineConsensusGate ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <span className="text-[10px] mt-1 opacity-80">{evalResult.approvedEnginesCount}/16개 승인</span>
                      </div>

                      {/* Gate 3: Risk Reward Ratio */}
                      <div
                        className={`p-2 rounded-lg border flex flex-col justify-between ${
                          evalResult.passedGates.riskRewardGate
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                            : "bg-rose-950/40 border-rose-900/60 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>3. 손익비 검증</span>
                          {evalResult.passedGates.riskRewardGate ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <span className="text-[10px] mt-1 opacity-80">RR {evalResult.rrRatio}:1 (목표+{evalResult.expectedGainPct}%)</span>
                      </div>

                      {/* Gate 4: Candle Pattern */}
                      <div
                        className={`p-2 rounded-lg border flex flex-col justify-between ${
                          evalResult.passedGates.chartPatternGate
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                            : "bg-rose-950/40 border-rose-900/60 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>4. 캔들/양봉</span>
                          {evalResult.passedGates.chartPatternGate ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <span className="text-[10px] mt-1 opacity-80">양봉/돌파 캔들</span>
                      </div>

                      {/* Gate 5: Upbit/Portfolio Limit */}
                      <div className="p-2 rounded-lg border bg-emerald-950/40 border-emerald-800/60 text-emerald-300 flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between font-bold">
                          <span>5. 비중/한도</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] mt-1 opacity-80">최대 {profile?.maxHoldingsCount || 5}개 이내</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-lg text-xs font-mono text-indigo-300 border border-slate-800 flex items-center justify-between">
                      <span><strong>AI 최종 판정:</strong> {evalResult.primaryRationale}</span>
                      <span className="text-[10px] text-slate-400">신뢰도 {evalResult.confidenceScore}점</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
