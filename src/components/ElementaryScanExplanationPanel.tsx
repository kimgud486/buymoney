import React, { useCallback, useEffect, useState } from "react";
import {
  buildElementaryScanExplanation,
  type ElementaryScanExplanation,
} from "../scanner/elementaryScanExplanation";

type Market = "KOREA" | "US" | "BTC";

type ScanIdea = {
  symbol: string;
  name: string;
  market: Market;
  price: number;
  score: number;
  pattern?: string;
  changePct?: number;
};

type DetailState = {
  loading: boolean;
  error: string;
  explanation: ElementaryScanExplanation | null;
};

function normalizeMarket(symbol: string, raw: unknown): Market {
  const market = String(raw || "").toUpperCase();
  if (symbol.startsWith("KRW-") || market === "BTC" || market === "UPBIT" || market === "CRYPTO") return "BTC";
  if (["US", "NASDAQ", "NYSE", "AMEX"].includes(market)) return "US";
  return "KOREA";
}

function formatPrice(value: number, market: Market): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (market === "US") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: value < 100 ? 4 : 0 })}원`;
}

function riskClass(status: ElementaryScanExplanation["status"]): string {
  if (status === "BUY_CHANCE") return "border-emerald-300 bg-emerald-50";
  if (status === "RISK") return "border-rose-300 bg-rose-50";
  return "border-amber-300 bg-amber-50";
}

/**
 * Production scanner companion panel.
 * It never fabricates candidates or prices. Candidates come from the server
 * REAL_PRECHECK authority and details are calculated only after real candles
 * arrive from /api/market/realtime-candles.
 */
export const ElementaryScanExplanationPanel: React.FC = () => {
  const [ideas, setIdeas] = useState<ScanIdea[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scannedAt, setScannedAt] = useState("");

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/explainable-scanner?market=ALL&aiExplain=true", { cache: "no-store" });
      if (!response.ok) throw new Error(`스캔 서버 연결 실패 (${response.status})`);
      const payload = await response.json();
      if (!payload?.success || payload?.authority !== "REAL_PRECHECK_ONLY" || payload?.finalAuthority !== "SERVER_V20_FINAL_REQUIRED") {
        throw new Error("실제 데이터 검증 표시가 확인되지 않아 결과를 숨겼어요.");
      }
      const rows = Array.isArray(payload.topIdeas) ? payload.topIdeas : [];
      const nextIdeas: ScanIdea[] = rows.flatMap((raw: any): ScanIdea[] => {
        const symbol = String(raw?.symbol || "").trim();
        const price = Number(raw?.price);
        if (!symbol || !(price > 0)) return [];
        return [{
          symbol,
          name: String(raw?.name || symbol),
          market: normalizeMarket(symbol, raw?.market),
          price,
          score: Math.max(0, Math.min(100, Math.round(Number(raw?.score) || 0))),
          pattern: String(raw?.pattern || "NONE"),
          changePct: Number(raw?.changePct) || 0,
        }];
      });
      setIdeas(nextIdeas.slice(0, 12));
      setScannedAt(String(payload.scannedAt || ""));
    } catch (e) {
      setIdeas([]);
      setError(e instanceof Error ? e.message : "스캔 결과를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
    const timer = window.setInterval(fetchIdeas, 30000);
    return () => window.clearInterval(timer);
  }, [fetchIdeas]);

  const openDetail = async (idea: ScanIdea) => {
    if (selected === idea.symbol) {
      setSelected(null);
      return;
    }
    setSelected(idea.symbol);
    const existing = details[idea.symbol];
    if (existing?.explanation && !existing.error) return;

    setDetails((prev) => ({
      ...prev,
      [idea.symbol]: { loading: true, error: "", explanation: null },
    }));

    try {
      // 15분봉을 넉넉히 받아 같은 패턴의 과거 발생도 실제 캔들로 비교합니다.
      const response = await fetch(
        `/api/market/realtime-candles?symbol=${encodeURIComponent(idea.symbol)}&timeframe=15m&count=220`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(`차트 데이터 연결 실패 (${response.status})`);
      const payload = await response.json();
      const candles = Array.isArray(payload?.candles) ? payload.candles : [];
      const explanation = buildElementaryScanExplanation(candles, idea.market);
      if (!explanation) throw new Error("완료된 실제 캔들이 아직 부족해요. 조금 뒤 다시 눌러 주세요.");
      setDetails((prev) => ({
        ...prev,
        [idea.symbol]: { loading: false, error: "", explanation },
      }));
    } catch (e) {
      setDetails((prev) => ({
        ...prev,
        [idea.symbol]: {
          loading: false,
          error: e instanceof Error ? e.message : "상세 분석을 만들 수 없어요.",
          explanation: null,
        },
      }));
    }
  };

  return (
    <section className="w-full px-3 sm:px-5 py-3" data-testid="elementary-scan-explanation-panel">
      <div className="rounded-2xl border border-slate-300 bg-white text-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black">🧩 스캔 종목 쉬운 설명</h2>
              <span className="text-[11px] font-bold rounded-full px-2 py-1 bg-cyan-50 border border-cyan-200 text-cyan-800">국내 · 해외 · 업비트</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">종목을 누르면 “왜 찾았는지 → 언제 볼지 → 어디가 위험한지 → 예전에 몇 번 맞았는지”를 쉬운 말로 보여줘요.</p>
          </div>
          <button
            type="button"
            onClick={fetchIdeas}
            disabled={loading}
            className="self-start sm:self-auto rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "찾는 중..." : "↻ 다시 스캔"}
          </button>
        </div>

        {error ? (
          <div className="p-5 text-sm font-bold text-rose-700 bg-rose-50">⚠️ {error}</div>
        ) : loading && ideas.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">실제 스캔 결과를 확인하고 있어요...</div>
        ) : ideas.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">지금 조건을 통과한 실제 스캔 종목이 없어요.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {ideas.map((idea) => {
              const isOpen = selected === idea.symbol;
              const detail = details[idea.symbol];
              const exp = detail?.explanation;
              return (
                <div key={`${idea.market}:${idea.symbol}`}>
                  <button
                    type="button"
                    onClick={() => openDetail(idea)}
                    className="w-full p-3 sm:p-4 text-left hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm sm:text-base truncate">{idea.name}</strong>
                        <span className="text-[11px] font-mono text-slate-500">{idea.symbol}</span>
                        <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-slate-100 border border-slate-200">{idea.market === "BTC" ? "UPBIT" : idea.market}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 flex gap-3 flex-wrap">
                        <span>현재 {formatPrice(idea.price, idea.market)}</span>
                        <span>AI {idea.score}점</span>
                        <span>{idea.pattern && idea.pattern !== "NONE" ? `패턴 ${idea.pattern.replaceAll("_", " ")}` : "패턴 확인 중"}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-black text-cyan-700">{isOpen ? "접기 ▲" : "쉽게 보기 ▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="px-3 sm:px-4 pb-4">
                      {detail?.loading ? (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">15분봉 실제 차트를 읽고 있어요...</div>
                      ) : detail?.error ? (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm font-semibold text-amber-800">⚠️ {detail.error}</div>
                      ) : exp ? (
                        <div className={`rounded-2xl border p-4 space-y-4 ${riskClass(exp.status)}`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-lg font-black">{exp.statusLabel}</div>
                              <p className="text-sm mt-1 text-slate-700">{exp.buyNowText}</p>
                            </div>
                            <div className="text-right text-xs">
                              <div className="font-black">AI 점수 {exp.aiScore}/100</div>
                              <div className="text-slate-600">거래량 RVOL {exp.rvol}배</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="rounded-xl bg-white/80 border border-slate-200 p-2"><span className="block text-slate-500">눌림 확인 구간</span><strong>{formatPrice(exp.pullbackLow, idea.market)} ~ {formatPrice(exp.pullbackHigh, idea.market)}</strong></div>
                            <div className="rounded-xl bg-white/80 border border-slate-200 p-2"><span className="block text-slate-500">돌파 확인 가격</span><strong>{formatPrice(exp.breakoutPrice, idea.market)}</strong></div>
                            <div className="rounded-xl bg-white/80 border border-slate-200 p-2"><span className="block text-slate-500">위에서 조심할 곳</span><strong>{formatPrice(exp.resistance, idea.market)}</strong></div>
                            <div className="rounded-xl bg-white/80 border border-slate-200 p-2"><span className="block text-slate-500">생각을 취소할 위험선</span><strong>{formatPrice(exp.invalidation, idea.market)}</strong></div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-white/80 border border-slate-200 p-3">
                              <strong>🔎 왜 이 종목을 찾았어요?</strong>
                              <ul className="mt-2 space-y-1 text-xs text-slate-700 list-disc pl-4">
                                {exp.whyFound.map((reason, idx) => <li key={`${idea.symbol}-reason-${idx}`}>{reason}</li>)}
                              </ul>
                            </div>
                            <div className="rounded-xl bg-white/80 border border-slate-200 p-3 space-y-2">
                              <div><strong>🟢 언제 살 기회를 봐요?</strong><p className="text-xs text-slate-700 mt-1">{exp.whenToWatchText}</p></div>
                              <div><strong>🔴 언제 사면 안 돼요?</strong><p className="text-xs text-slate-700 mt-1">{exp.avoidText}</p></div>
                              <div><strong>⚠️ 추격 위험</strong><p className="text-xs text-slate-700 mt-1">{exp.chaseRiskLabel}</p></div>
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-900 text-white p-3">
                            <strong className="text-sm">📐 이 패턴, 예전에도 맞았나요?</strong>
                            <div className="mt-2 text-xs text-slate-200">
                              {exp.patternHistory.sufficient ? (
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  <span>같은 패턴 <b className="text-white">{exp.patternHistory.sampleCount}번</b></span>
                                  <span>성공 <b className="text-emerald-300">{exp.patternHistory.successCount}번</b></span>
                                  <span>실패 <b className="text-rose-300">{exp.patternHistory.failureCount}번</b></span>
                                  <span>적중률 <b className="text-cyan-300">{exp.patternHistory.hitRate}%</b></span>
                                  <span>최근 적중률 <b className="text-cyan-300">{exp.patternHistory.recentHitRate}%</b></span>
                                  <span>성공 때 평균 {exp.patternHistory.averageGainPct == null ? "-" : `${exp.patternHistory.averageGainPct}%`}</span>
                                  <span>실패 때 평균 {exp.patternHistory.averageLossPct == null ? "-" : `${exp.patternHistory.averageLossPct}%`}</span>
                                </div>
                              ) : (
                                <span>📚 {exp.patternHistory.message}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">완료된 과거 캔들만 사용하며, 같은 봉에서 목표와 위험선이 함께 닿으면 성공으로 세지 않아요.</p>
                          </div>

                          <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-3 text-sm font-black text-cyan-950">
                            한마디로: {exp.oneLineSummary}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between gap-2 flex-wrap">
          <span>고정 가격표가 아니라 실제 캔들에서 지지·저항·ATR·VWAP을 다시 계산해요.</span>
          {scannedAt && <span>마지막 스캔: {scannedAt}</span>}
        </div>
      </div>
    </section>
  );
};

export default ElementaryScanExplanationPanel;
