import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  X
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useModalScrollLock } from "../hooks/useModalScrollLock";

export interface ModelSecuritiesAnalysis {
  modelId: string;
  name: string;
  badgeName: string;
  deskTitle: string;
  icon: any;
  colorScheme: {
    badge: string;
    border: string;
    bg: string;
    text: string;
    glow: string;
    stroke: string;
  };
  specialty: string;
  opinion: "강력 매수" | "분할 매수" | "관망" | "비중 축소" | "데이터 없음";
  confidenceScore: number | null;
  targetPrice: number | null;
  stopLossPrice: number | null;
  entryZone: [number | null, number | null];
  keyBullishReasons: string[];
  keyRiskFactor: string;
  weightRatio: number;
  metrics: {
    volatilityDefense: number | null;
    orderFlowPower: number | null;
    aiPredictionScore: number | null;
    riskRewardRatio: number | null;
    momentumScore: number | null;
    patternCompletion: number | null;
  };
  provenance?: string[];
  methodology?: "RULE_BASED" | "MODEL" | "UNAVAILABLE";
}

interface MultiModelSecuritiesConsensusProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  onSelectStockForTerminal?: (stock: any) => void;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
const opinionFromScore = (score: number | null): ModelSecuritiesAnalysis["opinion"] => {
  if (score == null) return "데이터 없음";
  if (score >= 85) return "강력 매수";
  if (score >= 70) return "분할 매수";
  if (score >= 55) return "관망";
  return "비중 축소";
};

const formatPrice = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value) || value <= 0) return "--";
  return Math.round(value).toLocaleString();
};

export const MultiModelSecuritiesConsensusModal: React.FC<MultiModelSecuritiesConsensusProps> = ({
  isOpen,
  onClose,
  initialSymbol = "005930",
  onSelectStockForTerminal
}) => {
  useModalScrollLock(isOpen);
  const [query, setQuery] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const load = async (target: string) => {
    const clean = target.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      let resolved = clean;
      if (!/^\d{6}$/.test(clean) && !/^[A-Z.-]{1,10}$/i.test(clean) && !/^KRW-/i.test(clean)) {
        const searchRes = await fetch(`/api/stocks/search?q=${encodeURIComponent(clean)}`);
        if (searchRes.ok) {
          const found = await searchRes.json();
          if (Array.isArray(found) && found[0]?.symbol) resolved = found[0].symbol;
        }
      }
      const res = await fetch(`/api/quant/matrix/${encodeURIComponent(resolved)}`);
      if (!res.ok) throw new Error(`quant matrix HTTP ${res.status}`);
      const q = await res.json();
      const candles = Array.isArray(q?.candles)
        ? q.candles
        : Array.isArray(q?.chartSeries)
          ? q.chartSeries.filter((bar: any) => !bar?.isForecast)
          : [];
      if (!q?.symbol || q?.dataValid === false || !(Number(q?.price) > 0) || candles.length < 20) {
        throw new Error(q?.reason || "검증 가능한 현재가와 20개 이상 OHLCV가 필요합니다.");
      }
      setSymbol(q.symbol);
      setQuery(q.symbol);
      setData({ ...q, candles });
      setLoadedAt(Date.now());
    } catch (e: any) {
      setError(e?.message || "검증 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load(initialSymbol || "005930");
  }, [isOpen, initialSymbol]);

  const desks = useMemo<ModelSecuritiesAnalysis[]>(() => {
    if (!data) return [];
    const price = Number(data.price || 0);
    const baseScore = clamp(Number(data.score || 0));
    const rvol = Number(data.rvol || 0);
    const rs = clamp(Number(data.rsScore || 0));
    const chartPattern = String(data.detectedChartPattern || "NO_PATTERN");
    const candlePattern = String(data.detectedCandlePattern || "NO_PATTERN");
    const hasPattern = chartPattern !== "NO_PATTERN" || candlePattern !== "NO_PATTERN";

    const orderFlowScore = clamp(rvol * 20 * 0.6 + rs * 0.4);
    const chartScore = clamp((hasPattern ? 65 : 30) + rs * 0.35);
    const target1 = Number(data.targetPrice1 || 0) || null;
    const target2 = Number(data.targetPrice2 || 0) || null;
    const stop = Number(data.stopLossPrice || 0) || null;

    const themeScoreRaw = data.themeScore ?? data.sentimentScore ?? data.newsSentimentScore;
    const themeScore = typeof themeScoreRaw === "number" && Number.isFinite(themeScoreRaw) ? clamp(themeScoreRaw) : null;

    return [
      {
        modelId: "orderflow",
        name: "1번 분석 데스크 · 오더플로우/수급",
        badgeName: "RULE-BASED",
        deskTitle: "RVOL · 상대강도 · VWAP 기반",
        icon: Activity,
        colorScheme: { badge: "", border: "", bg: "", text: "", glow: "", stroke: "#10b981" },
        specialty: "실제 Quant Matrix의 RVOL/RS/VWAP 값을 규칙식으로 조합합니다.",
        opinion: opinionFromScore(orderFlowScore),
        confidenceScore: orderFlowScore,
        targetPrice: target1,
        stopLossPrice: stop,
        entryZone: [Number(data.necklinePrice || 0) || null, price || null],
        keyBullishReasons: [
          `RVOL ${rvol > 0 ? rvol.toFixed(2) + "배" : "--"}`,
          `상대강도 ${rs.toFixed(0)}점`,
          `VWAP ${data.vwapStatus || "NO_DATA"}`
        ],
        keyRiskFactor: "호가·체결 델타 원천 데이터가 없으면 실제 오더플로우 모델로 간주하지 않습니다.",
        weightRatio: 0.30,
        metrics: { volatilityDefense: baseScore, orderFlowPower: orderFlowScore, aiPredictionScore: null, riskRewardRatio: baseScore, momentumScore: rs, patternCompletion: null },
        provenance: ["/api/quant/matrix", "rvol", "rsScore", "vwapStatus"],
        methodology: "RULE_BASED"
      },
      {
        modelId: "theme",
        name: "2번 분석 데스크 · 뉴스/테마/수급",
        badgeName: themeScore == null ? "NO DATA" : "RULE-BASED",
        deskTitle: "뉴스 · 테마 · 기관/외국인",
        icon: Brain,
        colorScheme: { badge: "", border: "", bg: "", text: "", glow: "", stroke: "#818cf8" },
        specialty: "원천 데이터가 실제로 있을 때만 점수를 냅니다.",
        opinion: opinionFromScore(themeScore),
        confidenceScore: themeScore,
        targetPrice: null,
        stopLossPrice: null,
        entryZone: [null, null],
        keyBullishReasons: themeScore == null ? ["뉴스/테마/기관·외국인 검증 점수 없음", "임의 센티먼트 점수 생성 안 함"] : [`검증 센티먼트 ${themeScore.toFixed(0)}점`],
        keyRiskFactor: themeScore == null ? "원천 데이터 미연결" : "센티먼트는 가격/체결 데이터보다 지연될 수 있습니다.",
        weightRatio: themeScore == null ? 0 : 0.20,
        metrics: { volatilityDefense: null, orderFlowPower: null, aiPredictionScore: themeScore, riskRewardRatio: null, momentumScore: themeScore, patternCompletion: null },
        provenance: themeScore == null ? [] : ["themeScore/sentimentScore/newsSentimentScore"],
        methodology: themeScore == null ? "UNAVAILABLE" : "RULE_BASED"
      },
      {
        modelId: "quant",
        name: "3번 분석 데스크 · 퀀트 매트릭스",
        badgeName: "QUANT MATRIX",
        deskTitle: "종합 점수 · 목표/손절 · 위험",
        icon: Sliders,
        colorScheme: { badge: "", border: "", bg: "", text: "", glow: "", stroke: "#06b6d4" },
        specialty: "서버 Quant Matrix의 산출값을 그대로 표시합니다.",
        opinion: opinionFromScore(baseScore),
        confidenceScore: baseScore,
        targetPrice: target1,
        stopLossPrice: stop,
        entryZone: [null, null],
        keyBullishReasons: [`Quant ${baseScore.toFixed(0)}점`, `목표가 ${formatPrice(target1)}`, `손절가 ${formatPrice(stop)}`],
        keyRiskFactor: "서버 Quant Matrix 계산식의 품질에 직접 의존합니다.",
        weightRatio: 0.35,
        metrics: { volatilityDefense: baseScore, orderFlowPower: orderFlowScore, aiPredictionScore: baseScore, riskRewardRatio: baseScore, momentumScore: rs, patternCompletion: hasPattern ? baseScore : 0 },
        provenance: ["/api/quant/matrix", "score", "targetPrice1", "stopLossPrice"],
        methodology: "RULE_BASED"
      },
      {
        modelId: "chart",
        name: "4번 분석 데스크 · 차트 패턴",
        badgeName: "PATTERN ENGINE",
        deskTitle: "차트/캔들 패턴 · 상대강도",
        icon: Eye,
        colorScheme: { badge: "", border: "", bg: "", text: "", glow: "", stroke: "#f59e0b" },
        specialty: "검출된 실제 패턴 문자열과 상대강도만 사용합니다.",
        opinion: opinionFromScore(chartScore),
        confidenceScore: chartScore,
        targetPrice: target2,
        stopLossPrice: stop,
        entryZone: [null, null],
        keyBullishReasons: [`차트 ${chartPattern}`, `캔들 ${candlePattern}`, `상대강도 ${rs.toFixed(0)}점`],
        keyRiskFactor: "패턴 검출은 확률적 신호이며 체결을 보장하지 않습니다.",
        weightRatio: 0.35,
        metrics: { volatilityDefense: baseScore, orderFlowPower: null, aiPredictionScore: null, riskRewardRatio: baseScore, momentumScore: rs, patternCompletion: hasPattern ? chartScore : 0 },
        provenance: ["detectedChartPattern", "detectedCandlePattern", "rsScore"],
        methodology: "RULE_BASED"
      }
    ];
  }, [data]);

  const availableDesks = desks.filter(d => d.confidenceScore != null && d.weightRatio > 0);
  const weightTotal = availableDesks.reduce((sum, d) => sum + d.weightRatio, 0);
  const consensusScore = weightTotal > 0
    ? Math.round(availableDesks.reduce((sum, d) => sum + Number(d.confidenceScore) * d.weightRatio, 0) / weightTotal)
    : null;

  const chartData = desks.map(d => ({
    name: d.modelId,
    score: d.confidenceScore ?? 0
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-black">4개 분석 데스크 통합 리서치 엔진 · TRUTH MODE</h2>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">독립 AI 모델 4개라고 과장하지 않습니다. 현재는 검증된 Quant Matrix 데이터를 서로 다른 분석 관점으로 재해석합니다.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-4">
          <form onSubmit={(e) => { e.preventDefault(); load(query); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-500" placeholder="종목명 또는 코드" />
            </div>
            <button disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 분석
            </button>
          </form>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><strong>분석 중단:</strong> {error} 임의 점수나 가짜 목표가는 표시하지 않습니다.</div>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Kpi label="종목" value={`${data.name || symbol} (${symbol})`} />
                <Kpi label="현재가" value={`${formatPrice(Number(data.price))}원`} />
                <Kpi label="Quant Score" value={`${clamp(Number(data.score || 0)).toFixed(0)}점`} />
                <Kpi label="통합 점수" value={consensusScore == null ? "--" : `${consensusScore}점`} />
                <Kpi label="데이터" value={loadedAt ? `검증 완료 ${new Date(loadedAt).toLocaleTimeString("ko-KR")}` : "--"} />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-black"><BarChart3 className="h-4 w-4 text-cyan-400" /> 분석 데스크 점수 비교</div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis domain={[0, 100]} fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {desks.map(desk => {
                  const Icon = desk.icon;
                  const unavailable = desk.confidenceScore == null;
                  return (
                    <div key={desk.modelId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-cyan-300"><Icon className="h-4 w-4" /></div>
                          <div>
                            <div className="text-sm font-black">{desk.name}</div>
                            <div className="text-[10px] text-slate-500">{desk.deskTitle}</div>
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${unavailable ? "border-slate-700 text-slate-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>{desk.badgeName}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <Mini label="판정" value={desk.opinion} />
                        <Mini label="점수" value={desk.confidenceScore == null ? "--" : `${desk.confidenceScore.toFixed(0)}`} />
                        <Mini label="방법" value={desk.methodology || "--"} />
                      </div>

                      <div className="mt-3 text-[11px] text-slate-300">{desk.specialty}</div>
                      <div className="mt-3 space-y-1 text-[10px] text-slate-400">
                        {desk.keyBullishReasons.map((r, i) => <div key={i} className="flex items-start gap-1"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" /> {r}</div>)}
                      </div>
                      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-200">위험: {desk.keyRiskFactor}</div>
                      <div className="mt-2 text-[9px] text-slate-600">출처: {desk.provenance?.length ? desk.provenance.join(" · ") : "검증 원천 없음"}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3">
                <div className="text-xs text-slate-300">
                  <strong className="text-cyan-300">통합 판정:</strong> {opinionFromScore(consensusScore)} · 점수 {consensusScore ?? "--"}
                  <div className="mt-1 text-[10px] text-slate-500">가중치는 실제 데이터가 있는 데스크만 정규화합니다. 2차 목표가를 임의 +3.5%로 만들지 않습니다.</div>
                </div>
                {onSelectStockForTerminal && (
                  <button onClick={() => onSelectStockForTerminal({ symbol, name: data.name || symbol, price: data.price, market: data.market })} className="rounded-xl border border-cyan-500/40 bg-cyan-600 px-3 py-1.5 text-xs font-black text-white">터미널에서 보기</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
    <div className="text-[10px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 truncate text-sm font-black text-white">{value}</div>
  </div>
);

const Mini: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
    <div className="text-[9px] text-slate-600">{label}</div>
    <div className="mt-0.5 text-[10px] font-black text-slate-200">{value}</div>
  </div>
);
