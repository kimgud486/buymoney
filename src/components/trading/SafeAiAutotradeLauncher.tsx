import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Crosshair,
  Eye,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { ExplainableTradeIdea } from "../../scanner/ExplainableOpportunityScannerEngine";
import {
  OpenSourceSignalEnsemble,
  type EnsembleEvaluationResult,
} from "../../autonomous/OpenSourceSignalEnsemble";

type ScanMarket = "ALL" | "KOREA" | "US" | "BTC";

interface ScannerResponse {
  success?: boolean;
  scannedAt?: string;
  topIdeas?: Partial<ExplainableTradeIdea>[];
  ideas?: Partial<ExplainableTradeIdea>[];
  message?: string;
}

interface ScanFreshnessResult {
  isFresh: boolean;
  reason: string;
}

const MARKET_LABEL: Record<ScanMarket, string> = {
  ALL: "전체",
  KOREA: "국내",
  US: "미국",
  BTC: "가상자산",
};

const MAX_SCAN_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 60 * 1000;

const evaluateScanFreshness = (scannedAt?: string): ScanFreshnessResult => {
  if (!scannedAt) {
    return {
      isFresh: false,
      reason: "스캐너 응답의 scannedAt 시각이 없어 실시간성을 확인할 수 없습니다.",
    };
  }

  const timestamp = Date.parse(scannedAt);
  if (!Number.isFinite(timestamp)) {
    return {
      isFresh: false,
      reason: "스캐너 응답의 scannedAt 시각 형식이 유효하지 않습니다.",
    };
  }

  const ageMs = Date.now() - timestamp;
  if (ageMs < -MAX_FUTURE_CLOCK_SKEW_MS) {
    return {
      isFresh: false,
      reason: "스캐너 응답 시각이 현재 시각보다 지나치게 미래여서 실시간성을 확인할 수 없습니다.",
    };
  }

  if (ageMs > MAX_SCAN_AGE_MS) {
    const ageMinutes = Math.max(1, Math.floor(ageMs / 60000));
    return {
      isFresh: false,
      reason: `스캔 데이터가 ${ageMinutes}분 전 데이터라 실시간 검토 대상에서 차단했습니다.`,
    };
  }

  return { isFresh: true, reason: "" };
};

const applyFreshnessGate = (
  results: EnsembleEvaluationResult[],
  freshness: ScanFreshnessResult,
): EnsembleEvaluationResult[] => {
  if (freshness.isFresh) return results;

  return results.map((result) => ({
    ...result,
    decision: "NO" as const,
    approvalRequired: true as const,
    liveAutoOrderEnabled: false as const,
    riskReasons: Array.from(new Set([...result.riskReasons, freshness.reason])).slice(0, 10),
    summaryMessage: `실시간성 차단: ${freshness.reason}`,
  }));
};

const formatPrice = (value: number, market: EnsembleEvaluationResult["market"]): string => {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (market === "US") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(value).toLocaleString()}원`;
};

export const SafeAiAutotradeLauncher: React.FC = () => {
  const { setSelectedSymbol, addToast } = useApp();
  const [market, setMarket] = useState<ScanMarket>("ALL");
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<EnsembleEvaluationResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EnsembleEvaluationResult | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanFreshnessWarning, setScanFreshnessWarning] = useState("");
  const [scannedAt, setScannedAt] = useState("");

  const reviewReadyCount = useMemo(
    () => results.filter((result) => result.decision === "REVIEW_READY").length,
    [results],
  );

  const resetScanView = () => {
    setResults([]);
    setSelectedCandidate(null);
    setScanError("");
    setScanFreshnessWarning("");
    setScannedAt("");
  };

  const changeMarket = (nextMarket: ScanMarket) => {
    if (nextMarket === market) return;
    setMarket(nextMarket);
    resetScanView();
  };

  const runScan = async (targetMarket: ScanMarket = market) => {
    setIsScanning(true);
    setScanError("");
    setScanFreshnessWarning("");

    try {
      const response = await fetch(
        `/api/explainable-scanner?market=${encodeURIComponent(targetMarket)}&aiExplain=true`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as ScannerResponse;

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `스캐너 HTTP ${response.status}`);
      }

      const candidates = Array.isArray(payload.topIdeas)
        ? payload.topIdeas
        : Array.isArray(payload.ideas)
          ? payload.ideas
          : [];

      // Truth-first: no hard-coded symbols, prices, RSI, RVOL, ATR or synthetic candles.
      // If the production scanner returns no verified candidates, show an empty result.
      const rankedBase = OpenSourceSignalEnsemble.rankCandidates(candidates, 5);
      const freshness = evaluateScanFreshness(payload.scannedAt);
      const ranked = candidates.length > 0
        ? applyFreshnessGate(rankedBase, freshness)
        : rankedBase;

      setResults(ranked);
      setSelectedCandidate(ranked[0] || null);
      setScannedAt(payload.scannedAt || "서버시각 미확인");
      setScanFreshnessWarning(candidates.length > 0 && !freshness.isFresh ? freshness.reason : "");

      addToast(
        `AI 스캔 완료: TOP ${ranked.length}, 최종 검토 가능 ${ranked.filter((item) => item.decision === "REVIEW_READY").length}개`,
        "INFO",
      );
    } catch (error: any) {
      const message = error?.message || "AI 스캔 중 오류가 발생했습니다.";
      setResults([]);
      setSelectedCandidate(null);
      setScannedAt("");
      setScanFreshnessWarning("");
      setScanError(message);
      addToast(message, "ERROR");
    } finally {
      setIsScanning(false);
    }
  };

  const selectForFinalReview = (candidate: EnsembleEvaluationResult) => {
    setSelectedSymbol(candidate.symbol);
    window.dispatchEvent(
      new CustomEvent("verified-ai-candidate-selected", {
        detail: { symbol: candidate.symbol },
      }),
    );
    addToast(
      `${candidate.name}(${candidate.symbol})을 메인 차트 검토 종목으로 선택했습니다. 실제 주문은 기존 주문 확인 게이트에서 사용자가 별도로 승인해야 합니다.`,
      "INFO",
    );
  };

  return (
    <section className="w-full border-b border-slate-200 bg-slate-950 px-4 py-4 text-slate-100 md:px-6">
      <div className="mx-auto max-w-[1600px] rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-cyan-300">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white">스캔 AI 자율매매</h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black tracking-wide text-emerald-300">
                  SIGNAL_ONLY · HUMAN APPROVAL
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Explainable Scanner → 앙상블 재점수 → R:R/RVOL/RSI/ATR 위험 게이트 → TOP 5 → 메인 차트 최종 검토
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
              {(["ALL", "KOREA", "US", "BTC"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  data-testid={`safe-ai-market-${item.toLowerCase()}`}
                  onClick={() => changeMarket(item)}
                  aria-pressed={market === item}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    market === item
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  {MARKET_LABEL[item]}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="safe-ai-autotrade-launcher"
              onClick={() => void runScan(market)}
              disabled={isScanning}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-950/40 transition hover:from-cyan-500 hover:to-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {isScanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {isScanning ? "실시간 스캔 중" : "스캔 AI 자율매매 실행"}
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs">
          <div className="flex flex-wrap gap-4 text-slate-400">
            <span>최근 스캔: <strong className="text-slate-200">{scannedAt || "-"}</strong></span>
            <span>검토 가능: <strong className="text-emerald-300">{reviewReadyCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            AI가 브로커 주문을 직접 전송하지 않습니다.
          </div>
        </div>

        {scanError && (
          <div
            data-testid="safe-ai-scan-error"
            className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {scanFreshnessWarning && (
          <div
            data-testid="safe-ai-freshness-warning"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{scanFreshnessWarning}</span>
          </div>
        )}

        {!isScanning && !scanError && scannedAt && results.length === 0 && (
          <div
            data-testid="safe-ai-empty-state"
            className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400"
          >
            현재 실데이터 스캐너에서 검증 가능한 후보가 없습니다. 임의 후보나 임의 지표값은 생성하지 않았습니다.
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-2 xl:col-span-5">
              {results.map((item, index) => {
                const selected = selectedCandidate?.symbol === item.symbol;
                return (
                  <button
                    key={`${item.symbol}-${index}`}
                    type="button"
                    data-testid={`safe-ai-candidate-${index + 1}`}
                    onClick={() => setSelectedCandidate(item)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-cyan-500/50 bg-slate-800"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-cyan-300">#{index + 1}</span>
                          <span className="font-black text-white">{item.name}</span>
                          <span className="font-mono text-[11px] text-slate-500">{item.symbol}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          R:R {item.rrRatio.toFixed(2)} · RVOL {item.rvol.toFixed(2)}x · Scanner {item.sourceScore}/100
                        </div>
                      </div>
                      <span className={`rounded-lg border px-2 py-1 text-[11px] font-black ${
                        item.decision === "REVIEW_READY"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : item.decision === "WATCH"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      }`}>
                        {item.decision} · {item.ensembleScore}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCandidate && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 xl:col-span-7">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-black text-white">
                      {selectedCandidate.name} <span className="font-mono text-xs text-slate-500">{selectedCandidate.symbol}</span>
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">{selectedCandidate.summaryMessage}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Ensemble</div>
                    <div className="text-2xl font-black text-cyan-300">{selectedCandidate.ensembleScore}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <div className="rounded-lg bg-slate-900 p-2">
                    <span className="block text-slate-500">진입구간</span>
                    <strong>{formatPrice(selectedCandidate.entryLow, selectedCandidate.market)}<br />~ {formatPrice(selectedCandidate.entryHigh, selectedCandidate.market)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2">
                    <span className="block text-slate-500">손절</span>
                    <strong className="text-rose-300">{formatPrice(selectedCandidate.stopLossPrice, selectedCandidate.market)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2">
                    <span className="block text-slate-500">목표1</span>
                    <strong className="text-emerald-300">{formatPrice(selectedCandidate.targetPrice, selectedCandidate.market)}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2">
                    <span className="block text-slate-500">RSI / ATR</span>
                    <strong>{selectedCandidate.rsi.toFixed(1)} / {selectedCandidate.atrPct.toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3">
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 상승 근거
                    </div>
                    <p className="leading-relaxed text-slate-300">
                      {selectedCandidate.bullishReasons.slice(0, 4).join(" · ") || "확인된 상승 근거 없음"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3">
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" /> 위험 / 미충족 조건
                    </div>
                    <p className="leading-relaxed text-slate-300">
                      {selectedCandidate.riskReasons.slice(0, 4).join(" · ") || "추가 하드 리스크 없음"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => selectForFinalReview(selectedCandidate)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  <Eye className="h-4 w-4" />
                  이 종목 메인 차트로 이동 · 주문 전 최종 검토
                  <Target className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
