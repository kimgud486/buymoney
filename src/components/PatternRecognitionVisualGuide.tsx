import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Layers, Search, Sparkles } from "lucide-react";
import { BULLISH_PATTERN_CATALOG } from "../lib/bullishMasterEngine";
import { BEARISH_PATTERN_CATALOG } from "../lib/bearishMasterEngine";

type PatternSide = "BUY" | "SELL";

type MasterPattern = {
  id: string;
  code: string;
  nameKr: string;
  nameEn: string;
  category: string;
  importance: number;
  coreMeaning: string;
  triggerCondition: string;
  weightScore: number;
  side: PatternSide;
};

export interface PatternRecognitionVisualGuideProps {
  selectedStockSymbol?: string;
  selectedStockName?: string;
  changePct?: number;
  currentPrice?: number;
  market?: "KOREA" | "US" | "BTC";
  /**
   * 실제 탐지 엔진이 반환한 pattern code 목록.
   * 이 값이 없으면 변화율만으로 패턴을 "탐지"했다고 표시하지 않는다.
   */
  detectedPatternCodes?: string[];
}

const normalizeCatalog = (): MasterPattern[] => {
  const bullish = BULLISH_PATTERN_CATALOG.map((pattern) => ({
    ...pattern,
    side: "BUY" as const,
  }));
  const bearish = BEARISH_PATTERN_CATALOG.map((pattern) => ({
    ...pattern,
    side: "SELL" as const,
  }));

  const seen = new Set<string>();
  return [...bullish, ...bearish].filter((pattern) => {
    const key = `${pattern.side}:${pattern.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ALL_MASTER_PATTERNS = normalizeCatalog();

function hashCode(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pointsFromCode(code: string, side: PatternSide): string {
  const seed = hashCode(code);
  const points: string[] = [];
  const count = 9;
  for (let index = 0; index < count; index += 1) {
    const x = 8 + index * 10.5;
    const noise = ((seed >> (index % 16)) & 7) - 3;
    const trend = side === "BUY" ? -index * 1.9 : index * 1.9;
    const wave = Math.sin((index + (seed % 5)) * 1.1) * 9;
    const y = Math.max(8, Math.min(52, 37 + trend + wave + noise));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

const MiniPatternDiagram: React.FC<{ pattern: MasterPattern }> = ({ pattern }) => {
  const bullish = pattern.side === "BUY";
  const stroke = bullish ? "#059669" : "#e11d48";
  const soft = bullish ? "#d1fae5" : "#ffe4e6";
  const code = pattern.code.toUpperCase();
  const category = pattern.category.toUpperCase();

  const frame = (children: React.ReactNode) => (
    <svg viewBox="0 0 100 60" className="h-20 w-full" role="img" aria-label={`${pattern.nameKr} 패턴 구조도`}>
      <rect x="1" y="1" width="98" height="58" rx="8" fill="#ffffff" stroke="#e4e4e7" />
      {children}
    </svg>
  );

  if (code.includes("DOUBLE_BOTTOM")) {
    return frame(<path d="M8 18 C18 48,28 50,38 28 C47 12,54 12,62 30 C70 48,80 46,92 14" fill="none" stroke={stroke} strokeWidth="3" />);
  }
  if (code.includes("TRIPLE_BOTTOM")) {
    return frame(<path d="M7 18 C14 45,23 45,30 26 C36 44,46 45,52 26 C59 44,69 45,76 27 C83 18,88 15,94 12" fill="none" stroke={stroke} strokeWidth="3" />);
  }
  if (code.includes("DOUBLE_TOP")) {
    return frame(<path d="M8 44 C18 12,29 12,38 32 C47 48,55 47,63 29 C72 11,82 12,93 47" fill="none" stroke={stroke} strokeWidth="3" />);
  }
  if (code.includes("HEAD") && code.includes("SHOULDER")) {
    const inverse = code.includes("INVERSE");
    const d = inverse
      ? "M7 24 C15 44,24 42,31 29 C39 55,50 55,58 29 C66 42,75 43,83 25 C87 18,91 16,95 15"
      : "M7 36 C15 16,24 18,31 31 C39 5,50 5,58 31 C66 18,75 17,83 35 C87 42,91 44,95 45";
    return frame(<path d={d} fill="none" stroke={stroke} strokeWidth="3" />);
  }
  if (code.includes("TRIANGLE") || code.includes("PENNANT")) {
    return frame(<><line x1="8" y1="17" x2="90" y2="17" stroke={stroke} strokeWidth="2.5" /><line x1="8" y1="50" x2="90" y2="17" stroke={stroke} strokeWidth="2.5" /><circle cx="91" cy="17" r="3" fill={stroke} /></>);
  }
  if (code.includes("WEDGE")) {
    return frame(<><line x1="8" y1="15" x2="88" y2="35" stroke={stroke} strokeWidth="2.5" /><line x1="8" y1="50" x2="88" y2="38" stroke={stroke} strokeWidth="2.5" /><path d="M75 38 L93 18" fill="none" stroke={stroke} strokeWidth="3" /></>);
  }
  if (code.includes("FLAG")) {
    return frame(<><line x1="14" y1="48" x2="35" y2="10" stroke={stroke} strokeWidth="4" /><path d="M35 10 L78 20 L70 41 L36 31 Z" fill={soft} stroke={stroke} strokeWidth="2" /><path d="M70 41 L93 16" fill="none" stroke={stroke} strokeWidth="3" /></>);
  }
  if (code.includes("CUP") || code.includes("ROUNDING")) {
    return frame(<><path d="M8 18 C18 51,57 53,72 18" fill="none" stroke={stroke} strokeWidth="3" /><path d="M72 18 C78 35,85 34,91 22" fill="none" stroke={stroke} strokeWidth="3" /></>);
  }
  if (category.includes("SINGLE_CANDLE")) {
    const up = bullish;
    return frame(<><line x1="50" y1="8" x2="50" y2="52" stroke={stroke} strokeWidth="2" /><rect x="38" y={up ? 24 : 15} width="24" height="22" rx="2" fill={soft} stroke={stroke} strokeWidth="2.5" /></>);
  }
  if (category.includes("TWO_CANDLES") || category.includes("THREE_CANDLES") || category.includes("MULTI_CANDLE")) {
    const count = category.includes("TWO") ? 2 : 3;
    return frame(<>{Array.from({ length: count }).map((_, index) => {
      const x = 28 + index * 22;
      const y = bullish ? 35 - index * 8 : 14 + index * 8;
      return <g key={x}><line x1={x} y1={Math.max(7, y - 10)} x2={x} y2={Math.min(54, y + 23)} stroke={stroke} strokeWidth="1.8" /><rect x={x - 6} y={y} width="12" height="16" rx="1.5" fill={soft} stroke={stroke} strokeWidth="2" /></g>;
    })}</>);
  }
  if (category.includes("VWAP")) {
    return frame(<><line x1="7" y1="31" x2="93" y2="31" stroke="#71717a" strokeDasharray="4 3" strokeWidth="2" /><path d={bullish ? "M8 48 C30 45,40 35,50 30 C63 24,76 17,93 12" : "M8 12 C30 15,40 25,50 31 C63 38,76 44,93 49"} fill="none" stroke={stroke} strokeWidth="3" /></>);
  }
  if (category.includes("VOLUME")) {
    return frame(<><polyline points={pointsFromCode(pattern.code, pattern.side)} fill="none" stroke={stroke} strokeWidth="2.5" /><g opacity="0.6">{[12, 26, 40, 54, 68, 82].map((x, index) => <rect key={x} x={x} y={48 - index * 3} width="6" height={8 + index * 3} fill={soft} stroke={stroke} />)}</g></>);
  }
  if (category.includes("MOMENTUM")) {
    return frame(<><path d={bullish ? "M8 18 L30 26 L52 34 L75 39 L93 43" : "M8 43 L30 36 L52 29 L75 22 L93 17"} fill="none" stroke="#71717a" strokeWidth="2" /><path d={bullish ? "M8 46 L30 42 L52 35 L75 25 L93 15" : "M8 14 L30 18 L52 27 L75 37 L93 46"} fill="none" stroke={stroke} strokeWidth="2.5" /></>);
  }
  if (category.includes("GAP")) {
    return frame(<><rect x="18" y={bullish ? 35 : 10} width="20" height="13" fill={soft} stroke={stroke} strokeWidth="2" /><rect x="62" y={bullish ? 12 : 37} width="20" height="13" fill={soft} stroke={stroke} strokeWidth="2" /><line x1="39" y1="30" x2="61" y2="30" stroke="#a1a1aa" strokeDasharray="3 3" /></>);
  }

  return frame(<polyline points={pointsFromCode(pattern.code, pattern.side)} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />);
};

export const PatternRecognitionVisualGuide: React.FC<PatternRecognitionVisualGuideProps> = ({
  selectedStockSymbol = "",
  selectedStockName = "",
  changePct = 0,
  currentPrice = 0,
  market = "KOREA",
  detectedPatternCodes = [],
}) => {
  const [activeSide, setActiveSide] = useState<"ALL" | PatternSide>("ALL");
  const [query, setQuery] = useState("");
  const [showDetectedOnly, setShowDetectedOnly] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>("");

  const detectedSet = useMemo(
    () => new Set(detectedPatternCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)),
    [detectedPatternCodes],
  );

  const filteredPatterns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return ALL_MASTER_PATTERNS.filter((pattern) => {
      if (activeSide !== "ALL" && pattern.side !== activeSide) return false;
      if (showDetectedOnly && !detectedSet.has(pattern.code.toUpperCase())) return false;
      if (!normalizedQuery) return true;
      return [pattern.code, pattern.nameKr, pattern.nameEn, pattern.category]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeSide, detectedSet, query, showDetectedOnly]);

  const selectedPattern = useMemo(
    () => ALL_MASTER_PATTERNS.find((pattern) => pattern.code === selectedCode) ?? filteredPatterns[0] ?? ALL_MASTER_PATTERNS[0],
    [filteredPatterns, selectedCode],
  );

  useEffect(() => {
    if (!selectedPattern) return;
    if (!filteredPatterns.some((pattern) => pattern.code === selectedPattern.code)) {
      setSelectedCode(filteredPatterns[0]?.code ?? "");
    }
  }, [filteredPatterns, selectedPattern]);

  useEffect(() => {
    console.info("[PatternGuide:catalog-diagnostics]", {
      registered: ALL_MASTER_PATTERNS.length,
      bullishRegistered: BULLISH_PATTERN_CATALOG.length,
      bearishRegistered: BEARISH_PATTERN_CATALOG.length,
      detectedInput: detectedSet.size,
      rendered: filteredPatterns.length,
      symbol: selectedStockSymbol,
    });
  }, [detectedSet.size, filteredPatterns.length, selectedStockSymbol]);

  const detectedCount = ALL_MASTER_PATTERNS.filter((pattern) => detectedSet.has(pattern.code.toUpperCase())).length;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            <h3 className="text-base font-black text-zinc-900">AI PATTERN CATALOG + VISUAL ENGINE</h3>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {selectedStockName || selectedStockSymbol || "선택 종목"} · {market} · 현재가 {currentPrice > 0 ? currentPrice.toLocaleString() : "-"} · 등락 {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-[10px] font-mono">
          <div className="rounded-lg bg-zinc-100 px-3 py-2"><b className="block text-sm text-zinc-900">{ALL_MASTER_PATTERNS.length}</b>REGISTERED</div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800"><b className="block text-sm">{BULLISH_PATTERN_CATALOG.length}</b>BULLISH</div>
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800"><b className="block text-sm">{BEARISH_PATTERN_CATALOG.length}</b>BEARISH</div>
          <div className="rounded-lg bg-cyan-50 px-3 py-2 text-cyan-800"><b className="block text-sm">{detectedCount}</b>DETECTED INPUT</div>
        </div>
      </div>

      {detectedPatternCodes.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>탐지 결과 입력 미연결:</b> 과거처럼 등락률만 보고 W패턴/헤드앤숄더를 임의 선택하지 않습니다. 이 화면은 등록된 마스터 카탈로그 전체를 표시하며, 실제 탐지 엔진이 <code>detectedPatternCodes</code>를 전달할 때만 “탐지됨”으로 표시합니다.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "BUY", "SELL"] as const).map((side) => (
          <button key={side} type="button" onClick={() => setActiveSide(side)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${activeSide === side ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600"}`}>
            {side === "ALL" ? "전체" : side === "BUY" ? "상승" : "하락"}
          </button>
        ))}
        <button type="button" onClick={() => setShowDetectedOnly((value) => !value)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${showDetectedOnly ? "border-cyan-600 bg-cyan-50 text-cyan-700" : "border-zinc-200 text-zinc-600"}`}>
          탐지 결과만 ({detectedCount})
        </button>
        <label className="ml-auto flex min-w-[220px] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5">
          <Search className="h-4 w-4 text-zinc-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="패턴 이름/코드 검색" className="w-full bg-transparent text-xs outline-none" />
        </label>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1"><Layers className="h-4 w-4" /> 현재 렌더링 {filteredPatterns.length}개</span>
        <span>하드코딩된 3개 그림 제한 제거</span>
      </div>

      <div className="grid max-h-[680px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPatterns.map((pattern) => {
          const detected = detectedSet.has(pattern.code.toUpperCase());
          const selected = selectedPattern?.code === pattern.code;
          const bullish = pattern.side === "BUY";
          return (
            <button key={`${pattern.side}:${pattern.code}`} type="button" onClick={() => setSelectedCode(pattern.code)} className={`rounded-xl border p-3 text-left transition ${selected ? "border-cyan-500 ring-2 ring-cyan-100" : "border-zinc-200 hover:border-zinc-300"}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${bullish ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{bullish ? "BULLISH" : "BEARISH"}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-mono text-zinc-600">{pattern.category}</span>
                    {detected && <span className="flex items-center gap-1 rounded bg-cyan-100 px-1.5 py-0.5 text-[9px] font-black text-cyan-700"><CheckCircle2 className="h-3 w-3" /> DETECTED</span>}
                  </div>
                  <h4 className="mt-1 text-sm font-black text-zinc-900">{pattern.nameKr}</h4>
                  <p className="text-[10px] font-mono text-zinc-500">{pattern.code}</p>
                </div>
                <span className="text-[10px] font-bold text-amber-600">{"★".repeat(Math.max(1, Math.min(5, pattern.importance)))}</span>
              </div>
              <MiniPatternDiagram pattern={pattern} />
              <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-zinc-600">{pattern.coreMeaning}</p>
            </button>
          );
        })}
      </div>

      {filteredPatterns.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-xs text-zinc-500">조건에 맞는 패턴이 없습니다.</div>
      )}

      {selectedPattern && (
        <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[220px_1fr]">
          <div><MiniPatternDiagram pattern={selectedPattern} /></div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-600" /><b className="text-zinc-900">{selectedPattern.nameKr} <span className="font-normal text-zinc-500">({selectedPattern.nameEn})</span></b></div>
            <p><b>핵심 의미:</b> {selectedPattern.coreMeaning}</p>
            <p><b>트리거:</b> {selectedPattern.triggerCondition}</p>
            <p><b>가중치:</b> {selectedPattern.weightScore} · <b>중요도:</b> {selectedPattern.importance}/5</p>
            <p className="flex items-start gap-1.5 text-[11px] text-zinc-500"><Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />미니 그래프는 패턴 코드/카테고리에 맞춘 구조도입니다. 실제 종목의 봉 데이터 자체는 종목 캔들 차트에서 확인합니다.</p>
          </div>
        </div>
      )}
    </section>
  );
};
