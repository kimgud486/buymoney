import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Crosshair,
  Eye,
  RefreshCw,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { ExplainableTradeIdea } from "../../scanner/ExplainableOpportunityScannerEngine";
import {
  OpenSourceSignalEnsemble,
  type EnsembleEvaluationResult,
} from "../../autonomous/OpenSourceSignalEnsemble";

type ScanMarket = "ALL" | "KOREA" | "US" | "BTC";
type ExecutionState = "WAITING" | "SUBMITTING" | "EXECUTED" | "SKIPPED" | "FAILED";
type TradeMarket = "KOREA" | "US" | "BTC";

type SafeAiAutotradeLauncherProps = {
  onSelectSymbolForChart?: (symbol: string) => void;
  onConfirmOrderApproval?: (candidate: EnsembleEvaluationResult) => void;
};

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

interface CandidateExecutionUi {
  state: ExecutionState;
  message: string;
}

interface AutoOrderSizing {
  qty: number;
  availableCash: number;
  estimatedCost: number;
  riskBudget: number;
  riskPerUnit: number;
  reason?: string;
}

const MARKET_LABEL: Record<ScanMarket, string> = {
  ALL: "전체",
  KOREA: "국내",
  US: "미국",
  BTC: "가상자산",
};

const MAX_SCAN_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 60 * 1000;
const AUTO_SCAN_INTERVAL_MS = 15_000;
const SAME_SYMBOL_ORDER_COOLDOWN_MS = 60_000;
const CASH_SAFETY_BUFFER_RATIO = 0.995;
const BALANCE_SYNC_CACHE_MS = 30_000;

const evaluateScanFreshness = (scannedAt?: string): ScanFreshnessResult => {
  if (!scannedAt) return { isFresh: false, reason: "스캐너 응답 시각이 없어 실시간성을 확인할 수 없습니다." };
  const timestamp = Date.parse(scannedAt);
  if (!Number.isFinite(timestamp)) return { isFresh: false, reason: "스캐너 응답 시각 형식이 올바르지 않습니다." };
  const ageMs = Date.now() - timestamp;
  if (ageMs < -MAX_FUTURE_CLOCK_SKEW_MS) return { isFresh: false, reason: "스캐너 응답 시각이 현재보다 지나치게 미래입니다." };
  if (ageMs > MAX_SCAN_AGE_MS) {
    const ageMinutes = Math.max(1, Math.floor(ageMs / 60000));
    return { isFresh: false, reason: `스캔 데이터가 ${ageMinutes}분 전 데이터라 자동 주문에서 제외했습니다.` };
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
  if (market === "US") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${Math.round(value).toLocaleString()}원`;
};

const readMarketCash = (market: TradeMarket, breakdown: any): number | null => {
  const raw = market === "BTC"
    ? breakdown?.upbitCash
    : market === "US"
      ? breakdown?.usCash
      : breakdown?.koreaCash;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

const getAvailableCash = (
  candidate: EnsembleEvaluationResult,
  cashBreakdown: any,
  profile: any,
): number => {
  const marketCash = readMarketCash(candidate.market, cashBreakdown);
  if (marketCash !== null) return marketCash;

  const fallback = profile?.cash ?? profile?.balance ?? 0;
  return Number.isFinite(Number(fallback)) ? Math.max(0, Number(fallback)) : 0;
};

const getAutoOrderSizing = (
  candidate: EnsembleEvaluationResult,
  availableCash: number,
  configuredRiskPct: number,
): AutoOrderSizing => {
  const price = candidate.entryPrice > 0 ? candidate.entryPrice : candidate.entryHigh;
  const stop = candidate.stopLossPrice;

  if (!Number.isFinite(price) || price <= 0) {
    return { qty: 0, availableCash, estimatedCost: 0, riskBudget: 0, riskPerUnit: 0, reason: "유효한 진입가격이 없습니다." };
  }
  if (!Number.isFinite(availableCash) || availableCash <= 0) {
    return { qty: 0, availableCash: 0, estimatedCost: 0, riskBudget: 0, riskPerUnit: 0, reason: "실제 가용잔고가 없습니다." };
  }
  if (!Number.isFinite(stop) || stop <= 0 || stop >= price) {
    return { qty: 0, availableCash, estimatedCost: 0, riskBudget: 0, riskPerUnit: 0, reason: "손절가격이 유효하지 않아 위험기준 수량을 계산할 수 없습니다." };
  }

  const riskPct = Number.isFinite(configuredRiskPct) && configuredRiskPct > 0
    ? Math.min(100, configuredRiskPct)
    : 1;
  const spendableCash = availableCash * CASH_SAFETY_BUFFER_RATIO;
  const riskBudget = availableCash * (riskPct / 100);
  const riskPerUnit = price - stop;
  const riskBasedQty = riskBudget / riskPerUnit;
  const affordableQty = spendableCash / price;
  const rawQty = Math.min(riskBasedQty, affordableQty);

  let qty = 0;
  if (candidate.market === "KOREA") qty = Math.floor(rawQty);
  else if (candidate.market === "US") qty = Math.floor(rawQty * 10000) / 10000;
  else qty = Math.floor(rawQty * 100000000) / 100000000;

  const estimatedCost = qty * price;
  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      qty: 0,
      availableCash,
      estimatedCost: 0,
      riskBudget,
      riskPerUnit,
      reason: candidate.market === "KOREA"
        ? "현재 잔고로 이 종목을 1주도 살 수 없어 주문하지 않습니다."
        : "현재 잔고와 손절위험 기준으로 주문 가능한 수량이 없습니다.",
    };
  }
  if (estimatedCost > availableCash) {
    return {
      qty: 0,
      availableCash,
      estimatedCost,
      riskBudget,
      riskPerUnit,
      reason: "계산된 주문금액이 실제 가용잔고를 초과해 주문을 차단했습니다.",
    };
  }

  return { qty, availableCash, estimatedCost, riskBudget, riskPerUnit };
};

const mapMarket = (market: EnsembleEvaluationResult["market"]): TradeMarket =>
  market === "BTC" ? "BTC" : market === "US" ? "US" : "KOREA";

const mapBalanceBroker = (market: TradeMarket): "korea" | "us" | "upbit" =>
  market === "BTC" ? "upbit" : market === "US" ? "us" : "korea";

const normalizeTradingSymbol = (symbol: string): string =>
  String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/^KRW-/, "");

export const SafeAiAutotradeLauncher: React.FC<SafeAiAutotradeLauncherProps> = ({
  onSelectSymbolForChart,
  onConfirmOrderApproval,
}) => {
  const {
    setSelectedSymbol,
    addToast,
    executeTrade,
    syncRealAccountBalance,
    profile,
    cashBreakdown,
    positions = [],
    orders = [],
    isKillSwitchActive,
  } = useApp() as any;

  const [market, setMarket] = useState<ScanMarket>("ALL");
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [results, setResults] = useState<EnsembleEvaluationResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<EnsembleEvaluationResult | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanFreshnessWarning, setScanFreshnessWarning] = useState("");
  const [scannedAt, setScannedAt] = useState("");
  const [executionUi, setExecutionUi] = useState<Record<string, CandidateExecutionUi>>({});
  const scanInFlightRef = useRef(false);
  const lastOrderAttemptRef = useRef<Map<string, number>>(new Map());
  const freshCashCacheRef = useRef<Map<TradeMarket, { cash: number; syncedAt: number }>>(new Map());

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
    setExecutionUi({});
  };

  const changeMarket = (nextMarket: ScanMarket) => {
    if (nextMarket === market) return;
    setMarket(nextMarket);
    resetScanView();
  };

  const executeVerifiedCandidates = useCallback(async (
    ranked: EnsembleEvaluationResult[],
    freshness: ScanFreshnessResult,
  ) => {
    const ready = ranked.filter((item) => item.decision === "REVIEW_READY");

    if (!freshness.isFresh || ready.length === 0) return;

    if (!autoScanEnabled) {
      ready.forEach((candidate) => {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "WAITING", message: "자동감시가 OFF라 분석만 했습니다. 자동감시 ON에서만 주문 안전검사를 시작합니다." },
        }));
      });
      return;
    }

    if (profile?.autoTradingEnabled === false) {
      ready.forEach((candidate) => {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "SKIPPED", message: "프로필의 자율매매 설정이 꺼져 있어 주문하지 않았습니다." },
        }));
      });
      return;
    }

    if (isKillSwitchActive) {
      ready.forEach((candidate) => {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "SKIPPED", message: "킬스위치가 켜져 있어 신규 자동매수를 건너뜁니다." },
        }));
      });
      return;
    }

    const freshCashByMarket = new Map<TradeMarket, number>();
    const balanceFailureByMarket = new Map<TradeMarket, string>();

    for (const candidate of ready) {
      const candidateMarket = mapMarket(candidate.market);
      const normalizedCandidateSymbol = normalizeTradingSymbol(candidate.symbol);

      const hasPosition = positions.some((position: any) =>
        position?.market === candidateMarket &&
        Number(position?.quantity) > 0 &&
        normalizeTradingSymbol(position?.symbol) === normalizedCandidateSymbol,
      );
      if (hasPosition) {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "SKIPPED", message: "이미 보유 중인 종목이라 자동 추가매수를 차단했습니다." },
        }));
        continue;
      }

      const hasPendingBuy = orders.some((order: any) =>
        order?.market === candidateMarket &&
        order?.side === "BUY" &&
        order?.status === "PENDING" &&
        normalizeTradingSymbol(order?.symbol) === normalizedCandidateSymbol,
      );
      if (hasPendingBuy) {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "SKIPPED", message: "이미 매수 주문이 대기 중인 종목이라 중복주문을 차단했습니다." },
        }));
        continue;
      }

      const now = Date.now();
      const cooldownKey = `${candidateMarket}:${normalizedCandidateSymbol}`;
      const previousAttemptAt = lastOrderAttemptRef.current.get(cooldownKey) || 0;
      if (now - previousAttemptAt < SAME_SYMBOL_ORDER_COOLDOWN_MS) {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "SKIPPED", message: "같은 종목 반복매수를 막기 위해 60초 재주문 대기 중입니다." },
        }));
        continue;
      }

      let availableCash = freshCashByMarket.get(candidateMarket);
      if (availableCash === undefined) {
        const cachedCash = freshCashCacheRef.current.get(candidateMarket);
        if (cachedCash && now - cachedCash.syncedAt < BALANCE_SYNC_CACHE_MS) {
          availableCash = cachedCash.cash;
          freshCashByMarket.set(candidateMarket, cachedCash.cash);
        }
      }

      if (availableCash === undefined && !balanceFailureByMarket.has(candidateMarket)) {
        try {
          const syncResult = await syncRealAccountBalance(mapBalanceBroker(candidateMarket), true);
          if (!syncResult?.success) {
            balanceFailureByMarket.set(candidateMarket, syncResult?.message || "브로커 가용잔고 조회에 실패했습니다.");
          } else {
            const syncedBreakdown = syncResult?.cashBreakdown ?? syncResult?.rawResponse?.cashBreakdown;
            const syncedMarketCash = readMarketCash(candidateMarket, syncedBreakdown);
            if (syncedMarketCash === null) {
              balanceFailureByMarket.set(candidateMarket, "브로커 응답에서 시장별 가용잔고를 확인할 수 없습니다.");
            } else {
              availableCash = syncedMarketCash;
              freshCashByMarket.set(candidateMarket, syncedMarketCash);
              freshCashCacheRef.current.set(candidateMarket, { cash: syncedMarketCash, syncedAt: now });
            }
          }
        } catch (error: any) {
          balanceFailureByMarket.set(candidateMarket, error?.message || "브로커 가용잔고 조회 중 오류가 발생했습니다.");
        }
      }

      const balanceFailure = balanceFailureByMarket.get(candidateMarket);
      if (balanceFailure || availableCash === undefined) {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: {
            state: "SKIPPED",
            message: `실제 가용잔고를 새로 확인하지 못해 자동매수를 차단했습니다. ${balanceFailure || "잔고 미확인"}`,
          },
        }));
        continue;
      }

      const sizing = getAutoOrderSizing(candidate, availableCash, Number(profile?.riskLimitPerTrade ?? 1));
      if (sizing.qty <= 0 || candidate.entryPrice <= 0) {
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "SKIPPED", message: sizing.reason || "잔고·손절위험 기준으로 주문 가능한 수량이 없어 건너뜁니다." },
        }));
        continue;
      }

      lastOrderAttemptRef.current.set(cooldownKey, now);
      setExecutionUi((prev) => ({
        ...prev,
        [candidate.symbol]: {
          state: "SUBMITTING",
          message: `실시간 잔고 ${sizing.availableCash.toLocaleString()} 기준 · 주문예상 ${sizing.estimatedCost.toLocaleString()} · 실주문 안전검사 중`,
        },
      }));

      try {
        const tradeResult = await executeTrade({
          symbol: candidate.symbol,
          name: candidate.name,
          market: candidateMarket,
          side: "BUY",
          qty: sizing.qty,
          price: candidate.entryPrice,
          strategyName: "AI 스캔 자율매매 LIVE_RESTRICTED",
          aiRationale: `Scanner ${candidate.sourceScore}/100 · Ensemble ${candidate.ensembleScore}/100 · R:R ${candidate.rrRatio.toFixed(2)} · RVOL ${candidate.rvol.toFixed(2)}x · FreshAvailableCash ${sizing.availableCash} · RiskBudget ${sizing.riskBudget.toFixed(2)} · Qty ${sizing.qty}`,
          bypassGuard: false,
        });

        const success = tradeResult?.success === true;
        const message = success
          ? (tradeResult?.message || "실주문 경로로 주문이 접수되었습니다.")
          : (tradeResult?.error || tradeResult?.reason || "안전 조건에서 주문이 보류되었습니다.");

        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: success ? "EXECUTED" : "SKIPPED", message },
        }));

        if (success) onConfirmOrderApproval?.(candidate);

        addToast({
          type: success ? "SUCCESS" : "WARNING",
          title: success ? `⚡ AI 자율매매 주문 접수 · ${candidate.name}` : `🛡️ AI 자율매매 주문 보류 · ${candidate.name}`,
          message,
        });
      } catch (error: any) {
        const message = error?.message || "자동 주문 처리 중 오류가 발생했습니다.";
        setExecutionUi((prev) => ({
          ...prev,
          [candidate.symbol]: { state: "FAILED", message },
        }));
        addToast({ type: "ERROR", title: `AI 자율매매 실패 · ${candidate.name}`, message });
      }
    }
  }, [addToast, autoScanEnabled, executeTrade, isKillSwitchActive, onConfirmOrderApproval, orders, positions, profile, syncRealAccountBalance]);

  const runScan = useCallback(async (targetMarket: ScanMarket = market) => {
    if (scanInFlightRef.current) return;
    scanInFlightRef.current = true;
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

      const rankedBase = OpenSourceSignalEnsemble.rankCandidates(candidates, 5);
      const freshness = evaluateScanFreshness(payload.scannedAt);
      const ranked = candidates.length > 0 ? applyFreshnessGate(rankedBase, freshness) : rankedBase;

      setResults(ranked);
      setSelectedCandidate(ranked[0] || null);
      setScannedAt(payload.scannedAt || "서버시각 미확인");
      setScanFreshnessWarning(candidates.length > 0 && !freshness.isFresh ? freshness.reason : "");

      const ready = ranked.filter((item) => item.decision === "REVIEW_READY");
      if (ranked.length > 0) {
        const first = ranked[0];
        addToast({
          type: ready.length > 0 ? "SUCCESS" : "INFO",
          title: `✨ 스캔 종목 발견 · ${first.name}`,
          message: `${first.symbol} · 점수 ${first.ensembleScore}/100 · ${ready.length > 0 ? (autoScanEnabled ? "자동매매 조건 확인 중" : "자동감시 OFF · 분석만") : "관찰 후보"}`,
        });
        window.dispatchEvent(new CustomEvent("safe-ai-scan-results-ready", {
          detail: { symbol: first.symbol, name: first.name },
        }));
      }

      await executeVerifiedCandidates(ranked, freshness);
    } catch (error: any) {
      const message = error?.message || "AI 스캔 중 오류가 발생했습니다.";
      setScanError(message);
      addToast(message, "ERROR");
    } finally {
      scanInFlightRef.current = false;
      setIsScanning(false);
    }
  }, [addToast, autoScanEnabled, executeVerifiedCandidates, market]);

  useEffect(() => {
    if (!autoScanEnabled) return;

    void runScan(market);
    const timer = window.setInterval(() => {
      void runScan(market);
    }, AUTO_SCAN_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [autoScanEnabled, market, runScan]);

  const selectForDetail = (candidate: EnsembleEvaluationResult) => {
    setSelectedSymbol(candidate.symbol);
    onSelectSymbolForChart?.(candidate.symbol);
    window.dispatchEvent(new CustomEvent("verified-ai-candidate-selected", { detail: { symbol: candidate.symbol } }));
    addToast(`${candidate.name}(${candidate.symbol}) 스캔 상세를 메인 차트에서 엽니다.`, "INFO");
  };

  const executionBadge = (symbol: string) => {
    const item = executionUi[symbol];
    if (!item) return null;
    const cls = item.state === "EXECUTED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : item.state === "FAILED"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
        : item.state === "SUBMITTING"
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300";
    return <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black ${cls}`}>{item.state}</span>;
  };

  return (
    <section id="safe-ai-autotrade-section" className="w-full border-b border-slate-200 bg-slate-950 px-4 py-4 text-slate-100 md:px-6">
      <div className="mx-auto max-w-[1600px] rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-cyan-300"><Brain className="h-6 w-6" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-white">스캔 AI 자율매매</h2>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${autoScanEnabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-600 bg-slate-800 text-slate-300"}`}>
                  {autoScanEnabled ? "LIVE_RESTRICTED · AUTO 15s" : "SCAN ONLY · AUTO OFF"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">자동감시 ON → 15초마다 스캔 → 앙상블 검증 → 실시간성 확인 → 브로커 실제잔고 재조회 → 손절위험으로 수량 계산 → 기존 실주문 안전 게이트</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
              {(["ALL", "KOREA", "US", "BTC"] as const).map((item) => (
                <button key={item} type="button" data-testid={`safe-ai-market-${item.toLowerCase()}`} onClick={() => changeMarket(item)} aria-pressed={market === item} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${market === item ? "bg-cyan-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>{MARKET_LABEL[item]}</button>
              ))}
            </div>
            <button
              type="button"
              data-testid="safe-ai-auto-toggle"
              onClick={() => setAutoScanEnabled((prev) => !prev)}
              aria-pressed={autoScanEnabled}
              className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${autoScanEnabled ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/40"}`}
            >
              자동감시 {autoScanEnabled ? "ON" : "OFF"}
            </button>
            <button type="button" data-testid="safe-ai-autotrade-launcher" onClick={() => void runScan(market)} disabled={isScanning} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-950/40 transition hover:from-cyan-500 hover:to-blue-500 disabled:cursor-wait disabled:opacity-60">
              {isScanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {isScanning ? "스캔 + 안전검사 중" : "지금 한 번 스캔"}
              <Zap className="h-4 w-4 text-amber-200" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs">
          <div className="flex flex-wrap gap-4 text-slate-400">
            <span>최근 스캔: <strong className="text-slate-200">{scannedAt || "-"}</strong></span>
            <span>자동매매 후보: <strong className="text-emerald-300">{reviewReadyCount}</strong></span>
            <span>중복주문 방지: <strong className="text-cyan-300">보유·매수대기 차단 + 종목별 60초</strong></span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />실시간성 · API · 브로커 실제잔고 · 손절위험 · 보유/대기주문 · 장시간 · 킬스위치를 통과해야 주문합니다.</div>
        </div>

        {scanError && <div data-testid="safe-ai-scan-error" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{scanError}</span></div>}
        {scanFreshnessWarning && <div data-testid="safe-ai-freshness-warning" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{scanFreshnessWarning}</span></div>}
        {!isScanning && !scanError && scannedAt && results.length === 0 && <div data-testid="safe-ai-empty-state" className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-400">현재 실데이터 스캐너에서 검증 가능한 후보가 없습니다.</div>}

        {results.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-2 xl:col-span-5">
              {results.map((item, index) => {
                const selected = selectedCandidate?.symbol === item.symbol;
                return (
                  <button key={`${item.symbol}-${index}`} type="button" data-testid={`safe-ai-candidate-${index + 1}`} onClick={() => setSelectedCandidate(item)} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-500/50 bg-slate-800" : "border-slate-800 bg-slate-950/60 hover:border-slate-700"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-cyan-300">#{index + 1}</span><span className="font-black text-white">{item.name}</span><span className="font-mono text-[11px] text-slate-500">{item.symbol}</span>{executionBadge(item.symbol)}</div>
                        <div className="mt-1 text-xs text-slate-400">R:R {item.rrRatio.toFixed(2)} · RVOL {item.rvol.toFixed(2)}x · Scanner {item.sourceScore}/100</div>
                        {executionUi[item.symbol]?.message && <div className="mt-1 text-[10px] text-slate-500">{executionUi[item.symbol].message}</div>}
                      </div>
                      <span className={`rounded-lg border px-2 py-1 text-[11px] font-black ${item.decision === "REVIEW_READY" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : item.decision === "WATCH" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{item.decision} · {item.ensembleScore}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCandidate && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 xl:col-span-7">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div><h3 className="font-black text-white">{selectedCandidate.name} <span className="font-mono text-xs text-slate-500">{selectedCandidate.symbol}</span></h3><p className="mt-1 text-xs text-slate-400">{selectedCandidate.summaryMessage}</p></div>
                  <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-500">AI SCORE</div><div className="text-2xl font-black text-cyan-300">{selectedCandidate.ensembleScore}</div></div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">사려고 보는 곳</span><strong>{formatPrice(selectedCandidate.entryLow, selectedCandidate.market)}<br />~ {formatPrice(selectedCandidate.entryHigh, selectedCandidate.market)}</strong></div>
                  <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">틀리면 나오는 곳</span><strong className="text-rose-300">{formatPrice(selectedCandidate.stopLossPrice, selectedCandidate.market)}</strong></div>
                  <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">첫 목표</span><strong className="text-emerald-300">{formatPrice(selectedCandidate.targetPrice, selectedCandidate.market)}</strong></div>
                  <div className="rounded-lg bg-slate-900 p-2"><span className="block text-slate-500">힘 / 흔들림</span><strong>RSI {selectedCandidate.rsi.toFixed(1)} · ATR {selectedCandidate.atrPct.toFixed(1)}%</strong></div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3"><div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />왜 잡혔어?</div><p className="leading-relaxed text-slate-300">{selectedCandidate.bullishReasons.slice(0, 4).join(" · ") || "확인된 상승 근거 없음"}</p></div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3"><div className="mb-1 flex items-center gap-1.5 font-bold text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />뭐가 위험해?</div><p className="leading-relaxed text-slate-300">{selectedCandidate.riskReasons.slice(0, 4).join(" · ") || "추가 하드 리스크 없음"}</p></div>
                </div>

                {executionUi[selectedCandidate.symbol] && <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs"><strong className="text-white">자동매매 상태: {executionUi[selectedCandidate.symbol].state}</strong><p className="mt-1 text-slate-400">{executionUi[selectedCandidate.symbol].message}</p></div>}

                <button type="button" onClick={() => selectForDetail(selectedCandidate)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/20"><Eye className="h-4 w-4" />이 종목 차트와 스캔 정보 자세히 보기<Target className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};