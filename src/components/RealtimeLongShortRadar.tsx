import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BellRing,
  ChevronDown,
  ChevronUp,
  Radar,
  ShieldAlert,
  X,
} from "lucide-react";
import { realtimeMarketStreamManager, type NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";
import {
  evaluateLongShortSignal,
  type LongShortSignal,
} from "../scanner/longShortSignalEngine";

interface UniverseItem {
  symbol: string;
  name: string;
  market: "KOREA" | "US";
}

interface RadarSignal extends LongShortSignal {
  symbol: string;
  name: string;
  market: "KOREA" | "US";
  timeframe: "5m";
  detectedAt: number;
}

type AnalysisStatus = "SIGNAL" | "WAIT" | "INSUFFICIENT_BARS" | "NO_DATA" | "API_ERROR" | "NO_PLAN";

type AnalysisResult = {
  status: AnalysisStatus;
  signal: RadarSignal | null;
};

type Diagnostics = Record<AnalysisStatus, number>;

const INITIAL_CONCURRENCY = 6;
const TICK_RECHECK_COOLDOWN_MS = 45_000;
const MIN_TICK_ACTIVITY_PCT = 0.25;
const MAX_VISIBLE_HISTORY = 12;
const LIVE_TIMEFRAME = "5m" as const;
const LIVE_CANDLE_COUNT = 90;

const EMPTY_DIAGNOSTICS: Diagnostics = {
  SIGNAL: 0,
  WAIT: 0,
  INSUFFICIENT_BARS: 0,
  NO_DATA: 0,
  API_ERROR: 0,
  NO_PLAN: 0,
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: value < 1000 ? 2 : 0 }).format(value);
}

function marketText(value: "KOREA" | "US"): string {
  return value === "US" ? "미국 주식" : "국내 주식";
}

function confidenceText(value: unknown): string {
  const raw = String(value || "").toUpperCase();
  if (raw.includes("HIGH") || raw.includes("STRONG")) return "신호가 비교적 강해요";
  if (raw.includes("LOW") || raw.includes("WEAK")) return "신호가 약해요";
  return "조금 더 확인해요";
}

async function fetchFullStockUniverse(): Promise<UniverseItem[]> {
  const merged = new Map<string, UniverseItem>();

  try {
    const response = await fetch("/api/realtime/small-mid-cap-universe", { cache: "no-store" });
    if (response.ok) {
      const json = await response.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      for (const row of rows) {
        const symbol = String(row?.symbol || "").trim();
        if (!symbol) continue;
        merged.set(symbol, {
          symbol,
          name: String(row?.name || row?.realStockName || symbol),
          market: "KOREA",
        });
      }
    }
  } catch (error) {
    console.warn("[LongShortRadar] small/mid universe unavailable", error);
  }

  try {
    const response = await fetch("/api/stocks", { cache: "no-store" });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const symbol = String(row?.symbol || "").trim();
          const marketRaw = String(row?.market || "KOREA").toUpperCase();
          if (!symbol || symbol.startsWith("KRW-") || marketRaw === "BTC") continue;
          merged.set(symbol, {
            symbol,
            name: String(row?.name || symbol),
            market: marketRaw === "US" ? "US" : "KOREA",
          });
        }
      }
    }
  } catch (error) {
    console.warn("[LongShortRadar] /api/stocks unavailable", error);
  }

  return Array.from(merged.values());
}

async function analyzeSymbol(item: UniverseItem): Promise<AnalysisResult> {
  let response: Response;
  try {
    response = await fetch(
      `/api/market/realtime-candles?symbol=${encodeURIComponent(item.symbol)}&timeframe=${LIVE_TIMEFRAME}&count=${LIVE_CANDLE_COUNT}`,
      { cache: "no-store" },
    );
  } catch {
    return { status: "API_ERROR", signal: null };
  }

  if (!response.ok) return { status: "API_ERROR", signal: null };

  let json: any;
  try {
    json = await response.json();
  } catch {
    return { status: "NO_DATA", signal: null };
  }

  if (!Array.isArray(json?.candles)) return { status: "NO_DATA", signal: null };
  if (json.candles.length < 56) return { status: "INSUFFICIENT_BARS", signal: null };

  const signal = evaluateLongShortSignal(json.candles);
  if (!signal) return { status: "NO_DATA", signal: null };
  if (signal.direction === "WAIT") return { status: "WAIT", signal: null };
  if (signal.plan.source !== "ATR_VWAP_VERIFIED") return { status: "NO_PLAN", signal: null };

  return {
    status: "SIGNAL",
    signal: {
      ...signal,
      symbol: item.symbol,
      name: String(json?.name || item.name || item.symbol),
      market: item.market,
      timeframe: LIVE_TIMEFRAME,
      detectedAt: Date.now(),
    },
  };
}

function signalRank(signal: RadarSignal): number {
  const patternEvidence = Math.min(20, signal.matchedPatterns * 2);
  return Math.max(signal.longStrength, signal.shortStrength) + signal.edge * 0.4 + patternEvidence;
}

export const RealtimeLongShortRadar: React.FC = () => {
  const [latest, setLatest] = useState<RadarSignal | null>(null);
  const [history, setHistory] = useState<RadarSignal[]>([]);
  const [scanned, setScanned] = useState(0);
  const [universeSize, setUniverseSize] = useState(0);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(EMPTY_DIAGNOSTICS);
  const [running, setRunning] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const lastCheckRef = useRef(new Map<string, number>());
  const lastAlertRef = useRef(new Map<string, string>());
  const universeRef = useRef(new Map<string, UniverseItem>());
  const inFlightRef = useRef(new Set<string>());

  const playDing = useCallback((direction: "LONG" | "SHORT") => {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== "running") return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = direction === "LONG" ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.30);
  }, []);

  useEffect(() => {
    const armAudio = async () => {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioRef.current) audioRef.current = new AudioCtor();
      if (audioRef.current.state === "suspended") await audioRef.current.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", armAudio, { once: true });
    return () => window.removeEventListener("pointerdown", armAudio);
  }, []);

  const publish = useCallback((signal: RadarSignal) => {
    const alertKey = `${signal.direction}:${Math.round(Math.max(signal.longStrength, signal.shortStrength))}:${signal.matchedPatterns}:${Math.round(signal.plan.entry || 0)}`;
    if (lastAlertRef.current.get(signal.symbol) === alertKey) return;
    lastAlertRef.current.set(signal.symbol, alertKey);

    setLatest(signal);
    setHistory((previous) => {
      const withoutSame = previous.filter((item) => item.symbol !== signal.symbol);
      return [signal, ...withoutSame]
        .sort((a, b) => signalRank(b) - signalRank(a))
        .slice(0, MAX_VISIBLE_HISTORY);
    });
    playDing(signal.direction);
    window.dispatchEvent(new CustomEvent("ai-long-short-signal", { detail: signal }));
  }, [playDing]);

  const inspect = useCallback(async (item: UniverseItem, countDiagnostic = true) => {
    if (!running || inFlightRef.current.has(item.symbol)) return;
    inFlightRef.current.add(item.symbol);
    try {
      const result = await analyzeSymbol(item);
      if (countDiagnostic) {
        setDiagnostics((previous) => ({ ...previous, [result.status]: previous[result.status] + 1 }));
      }
      if (result.signal) publish(result.signal);
    } catch (error) {
      if (countDiagnostic) setDiagnostics((previous) => ({ ...previous, API_ERROR: previous.API_ERROR + 1 }));
      console.warn(`[LongShortRadar] analysis failed ${item.symbol}`, error);
    } finally {
      inFlightRef.current.delete(item.symbol);
    }
  }, [publish, running]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;

    const run = async () => {
      const universe = await fetchFullStockUniverse();
      if (cancelled) return;
      setUniverseSize(universe.length);
      universeRef.current = new Map(universe.map((item) => [item.symbol, item]));
      setScanned(0);
      setDiagnostics({ ...EMPTY_DIAGNOSTICS });

      for (let i = 0; i < universe.length && !cancelled; i += INITIAL_CONCURRENCY) {
        const batch = universe.slice(i, i + INITIAL_CONCURRENCY);
        await Promise.allSettled(batch.map((item) => inspect(item, true)));
        if (!cancelled) setScanned(Math.min(i + batch.length, universe.length));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [inspect, running]);

  useEffect(() => {
    if (!running) return undefined;
    return realtimeMarketStreamManager.subscribeTick((tick: NormalizedMarketTick) => {
      if (Math.abs(num(tick.changePct)) < MIN_TICK_ACTIVITY_PCT) return;
      const now = Date.now();
      const previous = lastCheckRef.current.get(tick.symbol) || 0;
      if (now - previous < TICK_RECHECK_COOLDOWN_MS) return;
      lastCheckRef.current.set(tick.symbol, now);

      const known = universeRef.current.get(tick.symbol);
      const item: UniverseItem = known || {
        symbol: tick.symbol,
        name: tick.name || tick.symbol,
        market: String(tick.market).toUpperCase() === "US" ? "US" : "KOREA",
      };
      void inspect(item, false);
    });
  }, [inspect, running]);

  useEffect(() => () => {
    void audioRef.current?.close().catch(() => undefined);
  }, []);

  const progress = universeSize > 0 ? Math.round((scanned / universeSize) * 100) : 0;
  const strongest = useMemo(() => history.slice(0, 5), [history]);
  const statusText = useMemo(() => {
    if (universeSize === 0) return "종목 목록을 아직 못 받았어요";
    if (scanned < universeSize) return "종목을 하나씩 확인하고 있어요";
    if (diagnostics.SIGNAL > 0) return "조건에 맞는 종목을 찾았어요";
    if (diagnostics.API_ERROR > 0 && diagnostics.API_ERROR === scanned) return "가격 자료 연결에 문제가 있어요";
    if (diagnostics.INSUFFICIENT_BARS > 0 && diagnostics.INSUFFICIENT_BARS === scanned) return "가격 자료가 아직 부족해요";
    return "지금은 조건에 맞는 종목이 없어요";
  }, [diagnostics, scanned, universeSize]);

  return (
    <>
      <div className="w-full border-b border-indigo-400/20 bg-slate-950 px-4 py-2 text-white">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-black text-indigo-300">
            <Radar size={14} className={running ? "animate-pulse" : ""} />
            오를 힘과 내릴 힘 찾기
          </span>
          <span className="text-slate-400">
            전체 {universeSize || 0}개 · 확인 {scanned}/{universeSize || 0} ({progress}%)
          </span>
          <span className="rounded-md bg-indigo-400/10 px-2 py-0.5 font-black text-indigo-300">5분 가격으로 확인 중</span>
          <span className="text-slate-500">전체 종목 → 최근 가격 → 가격 모양 → 위험 확인</span>
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            className={`ml-auto rounded-lg px-2.5 py-1 font-black ${running ? "bg-emerald-400 text-emerald-950" : "bg-slate-800 text-slate-300"}`}
          >
            {running ? "찾기 켜짐" : "찾기 꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-bold text-slate-300"
          >
            찾은 종목 {history.length}개
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        <div className="mx-auto mt-2 flex max-w-[1920px] flex-wrap gap-1.5 text-[10px] font-bold">
          <Diag label="조건 맞음" value={diagnostics.SIGNAL} />
          <Diag label="더 기다림" value={diagnostics.WAIT} />
          <Diag label="가격 계획 없음" value={diagnostics.NO_PLAN} />
          <Diag label="자료 부족" value={diagnostics.INSUFFICIENT_BARS} />
          <Diag label="자료 없음" value={diagnostics.NO_DATA} />
          <Diag label="연결 문제" value={diagnostics.API_ERROR} />
          <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-slate-400">{statusText}</span>
        </div>

        {expanded && strongest.length > 0 && (
          <div className="mx-auto mt-2 grid max-w-[1920px] grid-cols-1 gap-2 pb-2 md:grid-cols-5">
            {strongest.map((signal) => (
              <SignalMiniCard key={`${signal.symbol}:${signal.direction}`} signal={signal} />
            ))}
          </div>
        )}
      </div>

      {latest && (
        <div className="fixed right-3 top-20 z-[120] w-[min(94vw,470px)] rounded-3xl border border-slate-700 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            aria-label="알림 닫기"
            onClick={() => setLatest(null)}
            className="absolute right-3 top-3 rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2 text-xs font-black text-indigo-300">
            <BellRing size={15} /> 새로 찾은 종목 · 5분 가격 기준
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-xl font-black">{latest.name}</div>
              <div className="text-xs text-slate-400">{latest.symbol} · {marketText(latest.market)}</div>
            </div>
            <div className={`rounded-2xl px-4 py-2 text-sm font-black ${latest.direction === "LONG" ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"}`}>
              {latest.direction === "LONG" ? "오를 힘이 더 커요" : "내릴 힘이 더 커요"}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Strength label="오를 힘" value={latest.longStrength} active={latest.direction === "LONG"} />
            <Strength label="내릴 힘" value={latest.shortStrength} active={latest.direction === "SHORT"} />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300"><Activity size={13} /> 두 힘의 차이 {latest.edge.toFixed(1)}점</span>
            <span className="font-black text-indigo-300">{confidenceText(latest.confidenceLabel)}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <PlanLevel label="살펴볼 가격" value={latest.plan.entry} />
            <PlanLevel label="이 아래면 그만 보기" value={latest.plan.stop} />
            <PlanLevel label="첫 번째로 팔 가격" value={latest.plan.tp1} />
            <PlanLevel label="두 번째로 팔 가격" value={latest.plan.tp2} />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px]">
            <span className="font-bold text-emerald-300">세 번째로 팔 가격 {formatPrice(latest.plan.tp3)}</span>
            <span className="text-slate-400">첫 목표 기대값 {latest.plan.riskRewardTp1?.toFixed(1) || "-"}배</span>
          </div>

          <div className="mt-3 text-[11px] text-slate-400">
            살펴본 가격 모양 {latest.evaluatedPatterns}개 · 지금 맞는 모양 {latest.matchedPatterns}개
            <span className="ml-2">상승 모양 {latest.bullishPatterns} / 하락 모양 {latest.bearishPatterns}</span>
          </div>

          <div className="mt-4 rounded-xl bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-300">
            여러 가격 모양과 거래 흐름을 함께 보고 만든 참고 신호입니다. 한 가지 숫자만 보고 결정하지 마세요.
          </div>

          <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            “오를 힘”은 가격이 위로 갈 가능성을 보는 신호이고, “내릴 힘”은 가격이 아래로 갈 가능성을 보는 신호입니다. 이 화면이 자동으로 주식을 사고팔지는 않습니다.
          </div>
        </div>
      )}
    </>
  );
};

const Diag: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-slate-300">{label} {value}</span>
);

const Strength: React.FC<{ label: string; value: number; active: boolean }> = ({ label, value, active }) => (
  <div className={`rounded-2xl border p-3 ${active ? "border-indigo-400/50 bg-indigo-400/10" : "border-slate-800 bg-slate-900"}`}>
    <div className="text-[10px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-3xl font-black">{value.toFixed(1)}%</div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div className="h-full bg-indigo-400" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const PlanLevel: React.FC<{ label: string; value: number | null }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-2">
    <div className="text-[9px] font-black text-slate-500">{label}</div>
    <div className="mt-0.5 truncate font-black text-slate-100">{formatPrice(value)}</div>
  </div>
);

const SignalMiniCard: React.FC<{ signal: RadarSignal }> = ({ signal }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-black">{signal.name}</span>
      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${signal.direction === "LONG" ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"}`}>
        {signal.direction === "LONG" ? "오를 힘" : "내릴 힘"}
      </span>
    </div>
    <div className="mt-1 text-[10px] text-slate-500">{signal.symbol} · 5분 가격</div>
    <div className="mt-1 text-[11px] text-slate-300">
      오를 힘 {signal.longStrength.toFixed(0)}% / 내릴 힘 {signal.shortStrength.toFixed(0)}% · 맞는 모양 {signal.matchedPatterns}개
    </div>
    <div className="mt-1 text-[10px] text-slate-500">살펴볼 가격 {formatPrice(signal.plan.entry)} · 그만 볼 가격 {formatPrice(signal.plan.stop)}</div>
  </div>
);
