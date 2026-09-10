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
  detectedAt: number;
}

const INITIAL_CONCURRENCY = 6;
const TICK_RECHECK_COOLDOWN_MS = 45_000;
const MIN_TICK_ACTIVITY_PCT = 0.25;
const MAX_VISIBLE_HISTORY = 12;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
        if (!symbol || num(row?.price) <= 0) continue;
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
          if (!symbol || num(row?.price) <= 0 || symbol.startsWith("KRW-") || marketRaw === "BTC") continue;
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

async function analyzeSymbol(item: UniverseItem): Promise<RadarSignal | null> {
  const response = await fetch(
    `/api/market/realtime-candles?symbol=${encodeURIComponent(item.symbol)}&timeframe=D&count=90`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const json = await response.json();
  if (!Array.isArray(json?.candles)) return null;

  const signal = evaluateLongShortSignal(json.candles);
  if (!signal || signal.direction === "WAIT") return null;

  return {
    ...signal,
    symbol: item.symbol,
    name: String(json?.name || item.name || item.symbol),
    market: item.market,
    detectedAt: Date.now(),
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
    const alertKey = `${signal.direction}:${Math.round(Math.max(signal.longStrength, signal.shortStrength))}:${signal.matchedPatterns}`;
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

  const inspect = useCallback(async (item: UniverseItem) => {
    if (!running || inFlightRef.current.has(item.symbol)) return;
    inFlightRef.current.add(item.symbol);
    try {
      const signal = await analyzeSymbol(item);
      if (signal) publish(signal);
    } catch (error) {
      console.warn(`[LongShortRadar] analysis failed ${item.symbol}`, error);
    } finally {
      inFlightRef.current.delete(item.symbol);
    }
  }, [publish, running]);

  // Initial full-universe sweep. It is intentionally batched, not truncated to a small shortlist.
  useEffect(() => {
    if (!running) return;
    let cancelled = false;

    const run = async () => {
      const universe = await fetchFullStockUniverse();
      if (cancelled) return;
      setUniverseSize(universe.length);
      universeRef.current = new Map(universe.map((item) => [item.symbol, item]));
      setScanned(0);

      for (let i = 0; i < universe.length && !cancelled; i += INITIAL_CONCURRENCY) {
        const batch = universe.slice(i, i + INITIAL_CONCURRENCY);
        await Promise.allSettled(batch.map((item) => inspect(item)));
        if (!cancelled) setScanned(Math.min(i + batch.length, universe.length));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [inspect, running]);

  // After the sweep, KIS/market ticks become the trigger. Each symbol is rate-limited.
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
      void inspect(item);
    });
  }, [inspect, running]);

  useEffect(() => () => {
    void audioRef.current?.close().catch(() => undefined);
  }, []);

  const progress = universeSize > 0 ? Math.round((scanned / universeSize) * 100) : 0;
  const strongest = useMemo(() => history.slice(0, 5), [history]);

  return (
    <>
      <div className="w-full border-b border-indigo-400/20 bg-slate-950 px-4 py-2 text-white">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-black text-indigo-300">
            <Radar size={14} className={running ? "animate-pulse" : ""} />
            LONG / SHORT AI RADAR
          </span>
          <span className="text-slate-400">
            전체 종목 {universeSize || "-"} · 초기대조 {scanned}/{universeSize || "-"} ({progress}%)
          </span>
          <span className="text-slate-500">등록 패턴은 종목별 실제 캔들에서 평가 · 강신호 이후 실시간 틱으로 재검증</span>
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

        {expanded && strongest.length > 0 && (
          <div className="mx-auto mt-2 grid max-w-[1920px] grid-cols-1 gap-2 pb-2 md:grid-cols-5">
            {strongest.map((signal) => (
              <SignalMiniCard key={`${signal.symbol}:${signal.direction}`} signal={signal} />
            ))}
          </div>
        )}
      </div>

      {latest && (
        <div className="fixed right-3 top-20 z-[120] w-[min(94vw,430px)] rounded-3xl border border-slate-700 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            aria-label="신호 닫기"
            onClick={() => setLatest(null)}
            className="absolute right-3 top-3 rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-indigo-300">
            <BellRing size={15} /> AI SIGNAL DETECTED
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
            LONG/SHORT %는 과거·현재 기술 신호의 상대 우세도이며 실제 수익 확률을 보장하지 않습니다. 주문은 자동 전송하지 않습니다.
          </div>
        </div>
      )}
    </>
  );
};

const Strength: React.FC<{ label: string; value: number; active: boolean }> = ({ label, value, active }) => (
  <div className={`rounded-2xl border p-3 ${active ? "border-indigo-400/50 bg-indigo-400/10" : "border-slate-800 bg-slate-900"}`}>
    <div className="text-[10px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-3xl font-black">{value.toFixed(1)}%</div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div className="h-full bg-indigo-400" style={{ width: `${value}%` }} />
    </div>
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
    <div className="mt-1 text-[10px] text-slate-500">{signal.symbol}</div>
    <div className="mt-1 text-[11px] text-slate-300">
      L {signal.longStrength.toFixed(0)}% / S {signal.shortStrength.toFixed(0)}% · 패턴 {signal.matchedPatterns}
    </div>
  </div>
);
