import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ExplainableTradeIdea } from "../../scanner/ExplainableOpportunityScannerEngine";
import {
  EnsembleEvaluationResult,
  OpenSourceSignalEnsemble,
  SignalExecutionMode,
} from "../../autonomous/OpenSourceSignalEnsemble";

interface SafeAiAutotradeLauncherProps {
  onSelectSymbolForChart?: (symbol: string) => void;
  onConfirmOrderApproval?: (result: EnsembleEvaluationResult) => void;
}

const MODE_LABEL: Record<SignalExecutionMode, string> = {
  ANALYSIS: "분석 전용",
  ASSISTED: "승인형",
  AUTO_LIVE: "실계좌 자율",
};

export const SafeAiAutotradeLauncher: React.FC<SafeAiAutotradeLauncherProps> = ({
  onSelectSymbolForChart,
  onConfirmOrderApproval,
}) => {
  const [executionMode, setExecutionMode] = useState<SignalExecutionMode>("ANALYSIS");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<EnsembleEvaluationResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EnsembleEvaluationResult | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const yesResults = useMemo(
    () => results.filter((result) => result.decision === "YES" && result.dataComplete),
    [results],
  );

  const handleRunAiScan = async () => {
    setIsScanning(true);
    setScanStep("검증된 실시간 시세로 YES ONLY 스캐너 실행 중...");
    setErrorMessage("");
    setResults([]);
    setSelectedCandidate(null);
    setUserConfirmed(false);

    try {
      const res = await fetch("/api/yes-only-scanner?aiExplain=true", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`YES_ONLY_SCANNER_HTTP_${res.status}`);
      }

      const data = await res.json();
      const candidates: Partial<ExplainableTradeIdea>[] = Array.isArray(data.topIdeas)
        ? data.topIdeas
        : Array.isArray(data.ideas)
          ? data.ideas
          : Array.isArray(data.candidates)
            ? data.candidates
            : [];

      setScanStep("실시간 지표 완전성 및 R:R/RVOL/RSI/ADX/ATR 검증 중...");

      const evaluated = candidates
        .map((candidate) =>
          OpenSourceSignalEnsemble.evaluateCandidate(candidate, {
            mode: executionMode,
            // Browser code never grants live execution authority.
            // AUTO_LIVE authorization must come from the server execution gate.
            serverExecutionAuthorized: false,
          }),
        )
        .filter((candidate) => candidate.dataComplete && candidate.decision === "YES")
        .sort((a, b) => b.ensembleScore - a.ensembleScore)
        .slice(0, 5);

      setResults(evaluated);
      setSelectedCandidate(evaluated[0] ?? null);

      if (evaluated.length === 0) {
        setErrorMessage("현재 검증 조건을 모두 통과한 YES 후보가 없습니다. 가짜/보정 데이터는 생성하지 않습니다.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_SCANNER_ERROR";
      setErrorMessage(`스캐너 실행 실패: ${message}. 주문은 차단됩니다.`);
    } finally {
      setIsScanning(false);
      setScanStep("");
    }
  };

  const handleOrderAction = () => {
    if (!selectedCandidate) return;

    if (executionMode === "ANALYSIS") {
      setErrorMessage("분석 전용 모드에서는 주문을 보낼 수 없습니다.");
      return;
    }

    if (executionMode === "AUTO_LIVE") {
      setErrorMessage(
        "AUTO_LIVE 주문은 브라우저에서 직접 보낼 수 없습니다. 서버의 계좌 동기화·Risk Gate·Broker Health·중복주문 검증을 모두 통과한 경우에만 서버 런타임이 실행합니다.",
      );
      return;
    }

    setUserConfirmed(true);
    onConfirmOrderApproval?.(selectedCandidate);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 text-slate-100">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">스캔 AI 자율매매</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                {MODE_LABEL[executionMode]}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              YES ONLY · 실제 지표 필수 · 누락 데이터 NO_TRADE · 실주문 권한은 서버 Risk Gate 소유
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1">
            {(["ANALYSIS", "ASSISTED", "AUTO_LIVE"] as SignalExecutionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setExecutionMode(mode);
                  setUserConfirmed(false);
                  setErrorMessage("");
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  executionMode === mode
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {MODE_LABEL[mode]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRunAiScan}
            disabled={isScanning}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
          >
            {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isScanning ? "스캐닝 중..." : "YES ONLY 스캔"}</span>
          </button>
        </div>
      </div>

      {executionMode === "AUTO_LIVE" && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 flex gap-2 text-xs text-amber-200">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            AUTO_LIVE는 UI 버튼이 주문 권한을 갖지 않습니다. 서버 LiveExecutionGate가 실시간 데이터, 계좌 동기화,
            리스크, 브로커 상태, 시장별 어댑터와 중복주문을 모두 검증해야 주문이 허용됩니다.
          </span>
        </div>
      )}

      {isScanning && (
        <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-sm text-cyan-200 font-medium">{scanStep}</span>
        </div>
      )}

      {errorMessage && !isScanning && (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm text-rose-200">{errorMessage}</span>
        </div>
      )}

      {yesResults.length > 0 && !isScanning && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">TOP YES 후보</h3>
              <span className="text-xs text-emerald-400">검증 통과 {yesResults.length}개</span>
            </div>

            {yesResults.map((item, idx) => {
              const isSelected = selectedCandidate?.symbol === item.symbol;
              return (
                <button
                  type="button"
                  key={item.symbol}
                  onClick={() => {
                    setSelectedCandidate(item);
                    setUserConfirmed(false);
                    setErrorMessage("");
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-800 border-cyan-500/50"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{item.name}</span>
                        <span className="text-xs font-mono text-slate-400">{item.symbol}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        R:R {item.rrRatio}:1 · RVOL {item.rvol.toFixed(2)}x · RSI {item.rsi.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    YES {item.ensembleScore}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCandidate && (
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-base font-bold text-white">
                    {selectedCandidate.name} ({selectedCandidate.symbol})
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{selectedCandidate.summaryMessage}</p>
                </div>
                {onSelectSymbolForChart && (
                  <button
                    type="button"
                    onClick={() => onSelectSymbolForChart(selectedCandidate.symbol)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    차트 보기
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Metric title="진입가" value={selectedCandidate.entryPrice} tone="text-cyan-400" />
                <Metric title="손절가" value={selectedCandidate.stopLossPrice} tone="text-rose-400" />
                <Metric title="목표가" value={selectedCandidate.targetPrice} tone="text-emerald-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg">
                  <div className="font-bold text-emerald-400 flex items-center gap-1 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 상승 근거
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    {selectedCandidate.bullishReasons.map((reason, i) => <li key={i}>• {reason}</li>)}
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <div className="font-bold text-slate-300 flex items-center gap-1 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> 실행 상태
                  </div>
                  <ul className="space-y-1 text-slate-400">
                    <li>• 모드: {MODE_LABEL[executionMode]}</li>
                    <li>• 데이터: {selectedCandidate.dataComplete ? "COMPLETE" : "BLOCKED"}</li>
                    <li>• 서버 실주문 승인: {selectedCandidate.liveAutoOrderEnabled ? "READY" : "NOT AUTHORIZED"}</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {executionMode === "ANALYSIS"
                      ? "분석 결과만 표시"
                      : executionMode === "ASSISTED"
                        ? "사용자 최종 승인 필요"
                        : "서버 Risk Gate 승인 필요"}
                  </span>
                </div>

                {executionMode !== "ANALYSIS" && (
                  <button
                    type="button"
                    onClick={handleOrderAction}
                    disabled={userConfirmed}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      userConfirmed
                        ? "bg-emerald-700 text-white"
                        : executionMode === "AUTO_LIVE"
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    }`}
                  >
                    {userConfirmed ? (
                      <><CheckCircle2 className="w-4 h-4" /> 승인 완료</>
                    ) : (
                      <>
                        <span>{executionMode === "AUTO_LIVE" ? "AUTO_LIVE 상태 확인" : "최종 주문 승인"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ title: string; value: number; tone: string }> = ({ title, value, tone }) => (
  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
    <span className="text-xs text-slate-400 block">{title}</span>
    <span className={`text-sm font-bold font-mono ${tone}`}>{value.toLocaleString()}</span>
  </div>
);
