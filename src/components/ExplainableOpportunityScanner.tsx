import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Flame,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import { ExplainableTradeIdea } from "../scanner/ExplainableOpportunityScannerEngine";

type ScannerDataStatus = "REALTIME_VERIFIED" | "STALE" | "NO_DATA" | "ERROR" | "UNKNOWN";
type UiMarket = "ALL" | "KOREA" | "US" | "BTC";
type DiagnosticMarket = "KOREA" | "US" | "UPBIT";

type ScannerPayload = {
  success?: boolean;
  scannedAt?: string;
  totalScanned?: number;
  passedCount?: number;
  dataStatus?: ScannerDataStatus;
  message?: string;
  topIdeas?: ExplainableTradeIdea[];
};

type MarketDiagnostic = {
  universe: number;
  liveQuoteReady: number;
  candle15mReady: number;
  passed: number;
};

type DiagnosticPayload = {
  diagnostics?: Partial<Record<DiagnosticMarket, Partial<MarketDiagnostic>>>;
  dataStatus?: ScannerDataStatus;
  scanTimestamp?: string;
};

const EMPTY_DIAGNOSTIC: MarketDiagnostic = {
  universe: 0,
  liveQuoteReady: 0,
  candle15mReady: 0,
  passed: 0,
};

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nonNegativeInt(value: unknown): number {
  const n = finiteNumber(value);
  return n == null ? 0 : Math.max(0, Math.floor(n));
}

function formatNumber(value: unknown, maximumFractionDigits = 2): string {
  const n = finiteNumber(value);
  return n == null ? "데이터 없음" : n.toLocaleString("ko-KR", { maximumFractionDigits });
}

function statusLabel(status: ScannerDataStatus): { text: string; className: string; live: boolean } {
  if (status === "REALTIME_VERIFIED") {
    return { text: "검증된 실시간 데이터", className: "text-emerald-300 border-emerald-500/40 bg-emerald-950/40", live: true };
  }
  if (status === "STALE") {
    return { text: "데이터 지연", className: "text-amber-300 border-amber-500/40 bg-amber-950/40", live: false };
  }
  if (status === "NO_DATA") {
    return { text: "실시간 데이터 없음", className: "text-slate-300 border-slate-600 bg-slate-900", live: false };
  }
  if (status === "ERROR") {
    return { text: "스캐너 연결 오류", className: "text-rose-300 border-rose-500/40 bg-rose-950/40", live: false };
  }
  return { text: "상태 확인 중", className: "text-slate-300 border-slate-700 bg-slate-900", live: false };
}

function normalizeDiagnostic(raw: Partial<MarketDiagnostic> | undefined): MarketDiagnostic {
  return {
    universe: nonNegativeInt(raw?.universe),
    liveQuoteReady: nonNegativeInt(raw?.liveQuoteReady),
    candle15mReady: nonNegativeInt(raw?.candle15mReady),
    passed: nonNegativeInt(raw?.passed),
  };
}

function diagnosticReason(d: MarketDiagnostic): string {
  if (d.universe <= 0) return "종목 목록이 아직 준비되지 않았습니다.";
  if (d.liveQuoteReady <= 0) return "실행등급 실시간 시세가 아직 들어오지 않았습니다.";
  if (d.candle15mReady <= 0) return "실시간 시세는 있지만 15분봉 20개가 아직 준비되지 않았습니다.";
  if (d.passed <= 0) return "시세와 15분봉은 준비됐지만 현재 분석 조건 통과 종목이 없습니다.";
  return `${d.passed}개 종목이 진단 스캐너 조건을 통과했습니다.`;
}

function marketLabel(market: DiagnosticMarket): string {
  if (market === "KOREA") return "국내";
  if (market === "US") return "미국";
  return "업비트";
}

export const ExplainableOpportunityScanner: React.FC = () => {
  const [market, setMarket] = useState<UiMarket>("ALL");
  const [isYesOnlyMode, setIsYesOnlyMode] = useState(true);
  const [ideas, setIdeas] = useState<ExplainableTradeIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [scannedAt, setScannedAt] = useState("");
  const [totalScanned, setTotalScanned] = useState(0);
  const [passedCount, setPassedCount] = useState(0);
  const [dataStatus, setDataStatus] = useState<ScannerDataStatus>("UNKNOWN");
  const [errorMessage, setErrorMessage] = useState("");
  const [diagnostics, setDiagnostics] = useState<Partial<Record<DiagnosticMarket, MarketDiagnostic>> | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [aiGeneratingSymbol, setAiGeneratingSymbol] = useState<string | null>(null);

  const diagnosticMarkets = useMemo<DiagnosticMarket[]>(() => {
    if (market === "KOREA") return ["KOREA"];
    if (market === "US") return ["US"];
    if (market === "BTC") return ["UPBIT"];
    return ["KOREA", "US", "UPBIT"];
  }, [market]);

  const fetchDiagnostics = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const marketFilter = market === "BTC" ? "UPBIT" : market;
      const res = await fetch("/api/ai/hot-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketFilter }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as DiagnosticPayload;
      if (!res.ok || !data.diagnostics) {
        setDiagnostics(null);
        setDiagnosticError(`시장 준비상태 조회 실패 (HTTP ${res.status})`);
        return;
      }
      setDiagnostics({
        KOREA: normalizeDiagnostic(data.diagnostics.KOREA),
        US: normalizeDiagnostic(data.diagnostics.US),
        UPBIT: normalizeDiagnostic(data.diagnostics.UPBIT),
      });
      setDiagnosticError("");
    } catch (err) {
      setDiagnostics(null);
      setDiagnosticError(err instanceof DOMException && err.name === "AbortError"
        ? "시장 준비상태 조회가 8초를 초과했습니다."
        : "시장 준비상태를 불러오지 못했습니다.");
      console.warn("[ExplainableScanner] Diagnostic fetch error:", err);
    } finally {
      window.clearTimeout(timeout);
    }
  }, [market]);

  const fetchScannerResults = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);

    try {
      const endpoint = isYesOnlyMode
        ? `/api/yes-only-scanner?market=${market}`
        : `/api/explainable-scanner?market=${market}`;
      const res = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      const data = (await res.json().catch(() => ({}))) as ScannerPayload;

      if (!res.ok || data.success !== true || !Array.isArray(data.topIdeas)) {
        setIdeas([]);
        setTotalScanned(nonNegativeInt(data.totalScanned));
        setPassedCount(0);
        setDataStatus(res.ok ? data.dataStatus || "NO_DATA" : "ERROR");
        setErrorMessage(data.message || `스캐너 응답 오류 (HTTP ${res.status})`);
        return;
      }

      const total = nonNegativeInt(data.totalScanned);
      const passed = nonNegativeInt(data.passedCount ?? data.topIdeas.length);
      setIdeas(data.topIdeas);
      setTotalScanned(total);
      setPassedCount(passed);
      setDataStatus(data.dataStatus || (data.topIdeas.length > 0 ? "REALTIME_VERIFIED" : "NO_DATA"));
      setScannedAt(data.scannedAt || new Date().toISOString());
      setErrorMessage("");
    } catch (err) {
      setIdeas([]);
      setPassedCount(0);
      setDataStatus("ERROR");
      setErrorMessage(err instanceof DOMException && err.name === "AbortError"
        ? "스캐너 응답 시간이 8초를 초과했습니다."
        : "스캐너 서버에 연결하지 못했습니다.");
      console.warn("[ExplainableScanner] Fetch error:", err);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [market, isYesOnlyMode]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([fetchScannerResults(), fetchDiagnostics()]);
  }, [fetchDiagnostics, fetchScannerResults]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void refreshAll(), 15_000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  const requestAiDeepExplanation = async (idea: ExplainableTradeIdea) => {
    setAiGeneratingSymbol(idea.symbol);
    try {
      const prompt = `[실시간 스캐너 해설]\n종목: ${idea.name}(${idea.symbol})\n점수: ${idea.score}/100 [${idea.grade}]\n판단: ${idea.wouldBuy ? "검토 후보" : "관찰"}\n상승근거: ${(idea.bullishReasons || []).join(" / ")}\n위험요인: ${(idea.riskReasons || []).join(" / ")}\n\n검증된 데이터 범위 안에서 초등학생도 이해할 수 있게 왜 포착됐는지, 왜 지금 추격하면 안 되는지, 무효화 조건을 3줄로 설명해줘.`;
      const res = await fetch("/api/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: idea.symbol, prompt, currentPrice: finiteNumber(idea.price) }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const summaryText = data.analysis || data.text;
      if (typeof summaryText === "string" && summaryText.trim()) {
        setIdeas((prev) => prev.map((item) => item.symbol === idea.symbol ? { ...item, aiSummary: summaryText } : item));
      }
    } catch (err) {
      console.warn("[ExplainableScanner] AI explanation error:", err);
    } finally {
      setAiGeneratingSymbol(null);
    }
  };

  const status = statusLabel(dataStatus);
  const rejectedCount = Math.max(0, totalScanned - passedCount);

  return (
    <div id="explainable-scanner-container" className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400"><Brain className="w-6 h-6" /></div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">AI 실시간 종목 스캐너</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded-full">TOP 5</span>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">실제 수신된 시세와 캔들 근거가 준비된 종목만 분석합니다. 데이터가 없으면 숫자를 만들어 표시하지 않습니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsYesOnlyMode((v) => !v)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${isYesOnlyMode ? "bg-amber-950/60 text-amber-200 border-amber-500/40" : "bg-slate-950 text-slate-400 border-slate-800"}`}>
              <Flame className="w-3.5 h-3.5" /> {isYesOnlyMode ? "강한 후보만" : "전체 후보"}
            </button>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(["ALL", "KOREA", "US", "BTC"] as const).map((m) => (
                <button key={m} onClick={() => setMarket(m)} className={`px-3 py-1.5 rounded-lg ${market === m ? "bg-indigo-600 text-white" : "text-slate-400"}`}>
                  {m === "ALL" ? "전체" : m === "KOREA" ? "국내" : m === "US" ? "미국" : "업비트"}
                </button>
              ))}
            </div>
            <button onClick={() => setAutoRefresh((v) => !v)} className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 ${autoRefresh ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30" : "bg-slate-950 text-slate-400 border-slate-800"}`}>
              <Zap className="w-3.5 h-3.5" /> 15초 자동갱신 {autoRefresh ? "ON" : "OFF"}
            </button>
            <button onClick={() => void refreshAll()} disabled={loading} className="p-2 bg-slate-800 rounded-xl border border-slate-700 disabled:opacity-50" title="새로고침"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className={`col-span-2 md:col-span-1 border rounded-xl p-2.5 ${status.className}`}>
            <div className="flex items-center gap-1.5 font-semibold">{status.live ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}{status.text}</div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5"><span className="text-slate-500">전체 대상</span><strong className="block text-slate-100 text-base">{totalScanned}</strong></div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5"><span className="text-slate-500">표시 후보</span><strong className="block text-emerald-300 text-base">{passedCount}</strong></div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5"><span className="text-slate-500">조건 미통과</span><strong className="block text-slate-300 text-base">{rejectedCount}</strong></div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5"><span className="text-slate-500">최근 응답</span><strong className="block text-slate-300 truncate">{scannedAt ? new Date(scannedAt).toLocaleTimeString("ko-KR") : "없음"}</strong></div>
        </div>

        {errorMessage && <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200"><AlertTriangle className="w-4 h-4 shrink-0" />{errorMessage}</div>}
      </section>

      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100">시장 준비상태 진단</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">전체 종목 → 실행등급 실시간 시세 → 15분봉 20개 → 분석 조건 통과 순서입니다.</p>
          </div>
          <span className="text-[10px] text-slate-500">추천 숫자가 아니라 데이터 준비 진단입니다</span>
        </div>

        {diagnosticError ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />{diagnosticError}
          </div>
        ) : (
          <div className={`grid gap-3 ${diagnosticMarkets.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"}`}>
            {diagnosticMarkets.map((diagnosticMarket) => {
              const d = diagnostics?.[diagnosticMarket] ?? EMPTY_DIAGNOSTIC;
              const hasDiagnostics = diagnostics != null;
              return (
                <div key={diagnosticMarket} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-slate-100">{marketLabel(diagnosticMarket)}</strong>
                    <span className={`text-[10px] ${hasDiagnostics && d.liveQuoteReady > 0 ? "text-emerald-300" : "text-slate-500"}`}>{hasDiagnostics ? "실제 진단값" : "조회 중"}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-[9px] text-slate-500">전체</span><strong className="text-xs text-slate-200">{hasDiagnostics ? d.universe : "-"}</strong></div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-[9px] text-slate-500">실시간</span><strong className="text-xs text-cyan-300">{hasDiagnostics ? d.liveQuoteReady : "-"}</strong></div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-[9px] text-slate-500">15분봉</span><strong className="text-xs text-indigo-300">{hasDiagnostics ? d.candle15mReady : "-"}</strong></div>
                    <div className="rounded-lg bg-slate-900 p-2"><span className="block text-[9px] text-slate-500">분석통과</span><strong className="text-xs text-emerald-300">{hasDiagnostics ? d.passed : "-"}</strong></div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{hasDiagnostics ? diagnosticReason(d) : "시장 준비상태를 확인하고 있습니다."}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {loading && ideas.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" /><p className="mt-3 text-sm text-slate-300">실제 시세와 캔들 근거를 확인하고 있습니다.</p></div>
      ) : ideas.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-8 text-center space-y-3">
          <ShieldCheck className="w-9 h-9 mx-auto text-slate-400" />
          <h2 className="font-bold text-slate-100">{dataStatus === "NO_DATA" || dataStatus === "ERROR" ? "분석 가능한 실시간 데이터가 아직 없습니다" : "현재 조건을 통과한 종목이 없습니다"}</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">{dataStatus === "NO_DATA" ? "브로커 실시간 시세와 15분봉 근거가 준비되면 자동으로 후보가 나타납니다. REST 표시용 시세만으로 매수 후보를 만들지는 않습니다." : dataStatus === "ERROR" ? "서버 연결 상태를 확인한 뒤 새로고침해 주세요. 이전 결과를 정상 결과처럼 유지하지 않습니다." : "현재 받은 실제 데이터 기준으로 조건을 만족하는 후보가 없습니다."}</p>
          {isYesOnlyMode && <button onClick={() => setIsYesOnlyMode(false)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300">관찰 후보까지 보기</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ideas.map((idea, index) => {
            const price = finiteNumber(idea.price);
            const changePct = finiteNumber(idea.changePct);
            const stop = finiteNumber(idea.stop);
            const target1 = finiteNumber(idea.target1);
            const target2 = finiteNumber(idea.target2);
            const entryLow = finiteNumber(idea.entryLow);
            const entryHigh = finiteNumber(idea.entryHigh);
            const validExecutionPlan = price != null && price > 0 && entryLow != null && entryHigh != null && stop != null && target1 != null;
            return (
              <article key={idea.id || `${idea.market}-${idea.symbol}-${index}`} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2"><span className="text-indigo-300 font-bold">#{index + 1}</span><h2 className="text-lg font-bold text-white">{idea.name}</h2><span className="text-xs text-slate-500">{idea.symbol}</span></div><div className="mt-1 font-mono text-slate-200">{formatNumber(price)} {idea.market === "US" ? "$" : "원"} {changePct != null && <span className={changePct >= 0 ? "text-emerald-400" : "text-rose-400"}>({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)</span>}</div></div>
                  <div className="text-right"><div className="text-[10px] text-slate-500">SETUP SCORE</div><strong className="text-2xl text-indigo-300">{formatNumber(idea.score, 0)}</strong><span className="ml-2 px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">{idea.grade}</span></div>
                </div>

                <div className={`rounded-xl border p-3 text-xs ${idea.wouldBuy ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200" : "border-amber-500/20 bg-amber-950/10 text-amber-100"}`}><div className="flex items-center gap-1.5 font-semibold">{idea.wouldBuy ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{idea.wouldBuy ? "강한 사전 검토 후보" : "관찰 후보"}</div><p className="mt-1 text-slate-300">{idea.thesis || "검증된 설명 데이터 없음"}</p></div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono"><div className="bg-slate-950 rounded-lg p-2"><span className="block text-slate-500">RSI</span>{formatNumber(idea.rsi, 1)}</div><div className="bg-slate-950 rounded-lg p-2"><span className="block text-slate-500">RVOL</span>{formatNumber(idea.rvol, 2)}</div><div className="bg-slate-950 rounded-lg p-2"><span className="block text-slate-500">ATR%</span>{formatNumber(idea.atrPct, 2)}</div></div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"><div className="border border-emerald-900/30 bg-emerald-950/10 rounded-xl p-3"><div className="font-semibold text-emerald-400 mb-1">왜 포착됐나</div>{(idea.bullishReasons || []).length ? <ul className="space-y-1 text-slate-300">{idea.bullishReasons.slice(0, 4).map((r, i) => <li key={i}>• {r}</li>)}</ul> : <span className="text-slate-500">근거 없음</span>}</div><div className="border border-amber-900/30 bg-amber-950/10 rounded-xl p-3"><div className="font-semibold text-amber-400 mb-1">주의할 점</div>{(idea.riskReasons || []).length ? <ul className="space-y-1 text-slate-300">{idea.riskReasons.slice(0, 4).map((r, i) => <li key={i}>• {r}</li>)}</ul> : <span className="text-slate-500">추가 위험 근거 없음</span>}</div></div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2"><div className="flex items-center gap-1.5 text-indigo-300 font-semibold"><Target className="w-4 h-4" /> 가격 계획</div>{validExecutionPlan ? <><div className="grid grid-cols-2 gap-2"><span>진입: <strong>{formatNumber(entryLow)} ~ {formatNumber(entryHigh)}</strong></span><span>손절: <strong className="text-rose-300">{formatNumber(stop)}</strong></span><span>목표1: <strong className="text-emerald-300">{formatNumber(target1)}</strong></span><span>목표2: <strong className="text-indigo-300">{formatNumber(target2)}</strong></span></div><div className="text-slate-400">무효화: {idea.invalidation || "데이터 없음"}</div></> : <div className="text-amber-300">검증된 진입·손절·목표 데이터가 완성되지 않아 가격 계획을 표시하지 않습니다.</div>}</div>

                {idea.aiSummary ? <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-100 whitespace-pre-line"><div className="font-semibold text-indigo-300 mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI 쉬운 설명</div>{idea.aiSummary}</div> : <button onClick={() => void requestAiDeepExplanation(idea)} disabled={aiGeneratingSymbol === idea.symbol} className="w-full py-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-indigo-300 text-xs font-semibold disabled:opacity-50"><Sparkles className={`inline w-3.5 h-3.5 mr-1 ${aiGeneratingSymbol === idea.symbol ? "animate-spin" : ""}`} />{aiGeneratingSymbol === idea.symbol ? "설명 생성 중" : "초등학생 수준으로 쉽게 설명"}</button>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExplainableOpportunityScanner;