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

async function fetchFullStockUniverse(): Promise<UniverseItem[]> {
  const merged = new Map<string, UniverseItem>();

  try {
    const response = await fetch("/api/realtime/small-mid-cap-universe", { cache: "no-store" });
    if (response.ok) {
      const json = await response.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      for (const row of rows) {
        const symbol = String(row?.symbol || "").trim();
        // Universe membership must not depend on whether a quote has arrived yet.
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
  const zeroMatchReason = useMemo(() => {
    if (universeSize === 0) return "NO_UNIVERSE";
    if (scanned < universeSize) return "SCANNING";
    if (diagnostics.SIGNAL > 0) return "SIGNAL_FOUND";
    if (diagnostics.API_ERROR > 0 && diagnostics.API_ERROR === scanned) return "API_ERROR";
    if (diagnostics.INSUFFICIENT_BARS > 0 && diagnostics.INSUFFICIENT_BARS === scanned) return "INSUFFICIENT_BARS";
    return "ZERO_MATCH";
  }, [diagnostics, scanned, universeSize]);

  return (
    <>
      <div className="w-full border-b border-indigo-400/20 bg-slate-950 px-4 py-2 text-white">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-black text-indigo-300">
            <Radar size={14} className={running ? "animate-pulse" : ""} />
            LONG / SHORT AI RADAR
          </span>
          <span className="text-slate-400">
            전체 {universeSize || 0} · 분석 {scanned}/{universeSize || 0} ({progress}%)
          </span>
          <span className="rounded-md bg-indigo-400/10 px-2 py-0.5 font-black text-indigo-300">LIVE {LIVE_TIMEFRAME}</span>
          <span className="text-slate-500">전체 유니버스 → 5분봉 → 패턴 → ATR/VWAP 검증</span>
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            className={`ml-auto rounded-lg px-2.5 py-1 font-black ${running ? "bg-emerald-400 text-emerald-950" : "bg-slate-800 text-slate-300"}`}
          >
            {running ? "RADAR ON" : "RADAR OFF"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-bold text-slate-300"
          >
            신호 {history.length}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        <div className="mx-auto mt-2 flex max-w-[1920px] flex-wrap gap-1.5 text-[10px] font-bold">
          <Diag label="SIGNAL" value={diagnostics.SIGNAL} />
          <Diag label="WAIT" value={diagnostics.WAIT} />
          <Diag label="NO PLAN" value={diagnostics.NO_PLAN} />
          <Diag label="56봉 미만" value={diagnostics.INSUFFICIENT_BARS} />
          <Diag label="NO DATA" value={diagnostics.NO_DATA} />
          <Diag label="API ERROR" value={diagnostics.API_ERROR} />
          <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-slate-400">상태 {zeroMatchReason}</span>
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
            aria-label="신호 닫기"
            onClick={() => setLatest(null)}
            className="absolute right-3 top-3 rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-indigo-300">
            <BellRing size={15} /> V21 LIVE SIGNAL · {latest.timeframe}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-xl font-black">{latest.name}</div>
              <div className="text-xs text-slate-400">{latest.symbol} · {latest.market}</div>
            </div>
            <div className={`rounded-2xl px-4 py-2 text-xl font-black ${latest.direction === "LONG" ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"}`}>
              {latest.direction}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Strength label="LONG 우세도" value={latest.longStrength} active={latest.direction === "LONG"} />
            <Strength label="SHORT 우세도" value={latest.shortStrength} active={latest.direction === "SHORT"} />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300"><Activity size={13} /> 우세도 격차 {latest.edge.toFixed(1)}pt</span>
            <span className="font-black text-indigo-300">{latest.confidenceLabel}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <PlanLevel label="ENTRY" value={latest.plan.entry} />
            <PlanLevel label="STOP" value={latest.plan.stop} />
            <PlanLevel label="TP1" value={latest.plan.tp1} />
            <PlanLevel label="TP2" value={latest.plan.tp2} />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px]">
            <span className="font-bold text-emerald-300">TP3 {formatPrice(latest.plan.tp3)}</span>
            <span className="text-slate-400">R:R TP1 {latest.plan.riskRewardTp1?.toFixed(1) || "-"}:1 · ATR/VWAP VERIFIED</span>
          </div>

          <div className="mt-3 text-[11px] text-slate-400">
            패턴 등록 {latest.registeredPatterns} · 평가 {latest.evaluatedPatterns} · 현재 일치 {latest.matchedPatterns}
            <span className="ml-2">상승 {latest.bullishPatterns} / 하락 {latest.bearishPatterns}</span>
          </div>

          <div className="mt-4 space-y-1.5">
            {latest.reasons.slice(0, 4).map((reason) => (
              <div key={reason} className="text-xs text-slate-200">• {reason}</div>
            ))}
          </div>

          <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            LONG/SHORT는 5분봉 기술 신호의 상대 우세도입니다. SHORT는 기술적 하락 신호이며 실제 공매도 가능 여부를 뜻하지 않습니다. 주문은 자동 전송하지 않습니다.
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
        {signal.direction}
      </span>
    </div>
    <div className="mt-1 text-[10px] text-slate-500">{signal.symbol} · {signal.timeframe}</div>
    <div className="mt-1 text-[11px] text-slate-300">
      L {signal.longStrength.toFixed(0)}% / S {signal.shortStrength.toFixed(0)}% · 패턴 {signal.matchedPatterns}
    </div>
    <div className="mt-1 text-[10px] text-slate-500">진입 {formatPrice(signal.plan.entry)} · 손절 {formatPrice(signal.plan.stop)}</div>
  </div>
);
