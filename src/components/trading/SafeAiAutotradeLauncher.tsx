import React, { useState } from "react";
import { Play, ShieldCheck, Cpu, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Eye } from "lucide-react";
import { ExplainableTradeIdea } from "../../scanner/ExplainableOpportunityScannerEngine";
import { OpenSourceSignalEnsemble, EnsembleEvaluationResult } from "../../autonomous/OpenSourceSignalEnsemble";

interface SafeAiAutotradeLauncherProps {
  onSelectSymbolForChart?: (symbol: string) => void;
  onConfirmOrderApproval?: (result: EnsembleEvaluationResult) => void;
}

export const SafeAiAutotradeLauncher: React.FC<SafeAiAutotradeLauncherProps> = ({
  onSelectSymbolForChart,
  onConfirmOrderApproval,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [scanError, setScanError] = useState("");
  const [results, setResults] = useState<EnsembleEvaluationResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EnsembleEvaluationResult | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const handleRunAiScan = async () => {
    setIsScanning(true);
    setScanStep("전체시장 YES ONLY 검증 스캐너 실행 중...");
    setScanError("");
    setResults([]);
    setSelectedCandidate(null);
    setUserConfirmed(false);

    try {
      const res = await fetch("/api/yes-only-scanner?aiExplain=true");
      if (!res.ok) {
        throw new Error(`YES_ONLY_SCANNER_HTTP_${res.status}`);
      }

      const data = await res.json();
      const scannedCandidates: Partial<ExplainableTradeIdea>[] = Array.isArray(data.topIdeas)
        ? data.topIdeas
        : Array.isArray(data.ideas)
          ? data.ideas
          : Array.isArray(data.candidates)
            ? data.candidates
            : [];

      if (scannedCandidates.length === 0) {
        setScanError("검증된 YES 후보가 없습니다. 임의 후보나 가짜 지표는 생성하지 않습니다.");
        return;
      }

      setScanStep("R:R / RVOL / RSI / ADX / ATR / 패턴 재검증 중...");

      const evaluated = scannedCandidates
        .map((candidate) => OpenSourceSignalEnsemble.evaluateCandidate(candidate))
        .filter((item) => item.decision === "YES" || item.decision === "REVIEW_READY")
        .sort((a, b) => b.ensembleScore - a.ensembleScore)
        .slice(0, 5);

      if (evaluated.length === 0) {
        setScanError("YES 스캐너 후보가 앙상블 하드 게이트를 통과하지 못했습니다. NO_TRADE로 종료합니다.");
        return;
      }

      setResults(evaluated);
      setSelectedCandidate(evaluated[0]);
    } catch (error) {
      console.warn("[SafeAiAutotradeLauncher] verified YES-only scan failed", error);
      setScanError("실시간 검증 스캐너를 사용할 수 없습니다. 안전 규칙에 따라 NO_TRADE로 종료합니다.");
    } finally {
      setIsScanning(false);
      setScanStep("");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">스캔 AI 자율매매 Safety Signal Hub</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                YES_ONLY
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                VERIFIED_DATA_ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              실시간 검증 후보만 사용합니다. 데이터 누락 시 NO_DATA / NO_TRADE로 종료합니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAiScan}
          disabled={isScanning}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-cyan-950"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>스캐닝 중...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>전체시장 YES AI 스캔</span>
            </>
          )}
        </button>
      </div>

      {isScanning && (
        <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-4 flex items-center space-x-3">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-sm text-cyan-200 font-medium">{scanStep}</span>
        </div>
      )}

      {scanError && !isScanning && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-300">NO_TRADE</div>
            <div className="text-xs text-amber-100/80 mt-1">{scanError}</div>
          </div>
        </div>
      )}

      {results.length > 0 && !isScanning && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              TOP 5 VERIFIED YES
            </h3>
            {results.map((item, idx) => {
              const isSelected = selectedCandidate?.symbol === item.symbol;
              return (
                <button
                  type="button"
                  key={item.symbol}
                  onClick={() => {
                    setSelectedCandidate(item);
                    setUserConfirmed(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-800 border-cyan-500/50 shadow-md shadow-cyan-950/50"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-xs font-bold text-slate-500 w-4">#{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white truncate">{item.name}</span>
                        <span className="text-xs font-mono text-slate-400">{item.symbol}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        진입 {item.entryPrice.toLocaleString()} · R:R {item.rrRatio}:1
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {item.decision} {item.ensembleScore}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCandidate && (
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-base font-bold text-white">
                    {selectedCandidate.name} ({selectedCandidate.symbol})
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{selectedCandidate.summaryMessage}</p>
                </div>
                {onSelectSymbolForChart && (
                  <button
                    onClick={() => onSelectSymbolForChart(selectedCandidate.symbol)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>차트 보기</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">Entry</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">{selectedCandidate.entryPrice.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">Stop</span>
                  <span className="text-sm font-bold font-mono text-rose-400">{selectedCandidate.stopLossPrice.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block">Target</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{selectedCandidate.targetPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">Score <b>{selectedCandidate.ensembleScore}</b></div>
                <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">RVOL <b>{selectedCandidate.rvol.toFixed(2)}x</b></div>
                <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">RSI <b>{selectedCandidate.rsi.toFixed(1)}</b></div>
                <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">ATR <b>{selectedCandidate.atrPct.toFixed(1)}%</b></div>
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
                <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg">
                  <div className="font-bold text-rose-400 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> 위험 요소
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    {selectedCandidate.riskReasons.length
                      ? selectedCandidate.riskReasons.map((reason, i) => <li key={i}>• {reason}</li>)
                      : <li className="text-emerald-400">• 하드 리스크 없음</li>}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>실주문은 중앙 ProductionAutonomyGate와 계좌 Risk Gate 통과 후에만 허용</span>
                </div>
                {onConfirmOrderApproval && (
                  <button
                    onClick={() => {
                      setUserConfirmed(true);
                      onConfirmOrderApproval(selectedCandidate);
                    }}
                    disabled={userConfirmed}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 ${
                      userConfirmed ? "bg-emerald-600 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    }`}
                  >
                    {userConfirmed ? (
                      <><CheckCircle2 className="w-4 h-4" /><span>승인 전달됨</span></>
                    ) : (
                      <><span>ASSISTED 주문 승인</span><ArrowRight className="w-4 h-4" /></>
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
