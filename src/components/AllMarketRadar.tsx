import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Globe2, Radar, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { evaluateLongShortSignal, type LongShortSignal } from "../scanner/longShortSignalEngine";

type RadarMarket = "KOREA" | "US" | "UPBIT";
type ScanStatus = "SIGNAL" | "WAIT" | "NO_PLAN" | "INSUFFICIENT_BARS" | "NO_DATA" | "API_ERROR";

type UniverseItem = {
  symbol: string;
  name: string;
  market: RadarMarket;
};

type RadarRow = {
  symbol: string;
  name: string;
  market: RadarMarket;
  status: ScanStatus;
  signal: LongShortSignal | null;
  checkedAt: number;
  reason?: string;
};

type MarketCounters = {
  universe: number;
  scanned: number;
  signal: number;
  wait: number;
  noPlan: number;
  insufficient: number;
  noData: number;
  apiError: number;
};

const EMPTY_COUNTERS: MarketCounters = {
  universe: 0,
  scanned: 0,
  signal: 0,
  wait: 0,
  noPlan: 0,
  insufficient: 0,
  noData: 0,
  apiError: 0,
};

const MARKET_ORDER: RadarMarket[] = ["KOREA", "US", "UPBIT"];
const BATCH_SIZE = 6;
const BATCH_PAUSE_MS = 220;
const REFRESH_UNIVERSE_MS = 10 * 60_000;
const MAX_SIGNAL_ROWS = 24;
const LIVE_TIMEFRAME = "5m";
const LIVE_CANDLE_COUNT = 90;

function finite(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeStockRow(row: any, fallbackMarket: RadarMarket): UniverseItem | null {
  const symbol = String(row?.symbol || row?.itemCode || row?.code || "").trim().toUpperCase();
  if (!symbol || symbol.startsWith("KRW-")) return null;
  const rawMarket = String(row?.market || fallbackMarket).toUpperCase();
  const market: RadarMarket = rawMarket === "US" ? "US" : "KOREA";
  return {
    symbol,
    name: String(row?.name || row?.stockName || row?.realStockName || symbol),
    market,
  };
}

async function loadKoreaUniverse(): Promise<UniverseItem[]> {
  const merged = new Map<string, UniverseItem>();
  const endpoints = ["/api/realtime/small-mid-cap-universe", "/api/stocks?market=KOREA"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) continue;
      const json = await response.json();
      const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      for (const row of rows) {
        const item = normalizeStockRow(row, "KOREA");
        if (item && /^\d{6}$/.test(item.symbol)) merged.set(item.symbol, item);
      }
    } catch (error) {
      console.warn(`[AllMarketRadar] Korea universe unavailable: ${endpoint}`, error);
    }
  }
  return Array.from(merged.values());
}

async function loadUsUniverse(): Promise<UniverseItem[]> {
  const merged = new Map<string, UniverseItem>();
  try {
    const response = await fetch("/api/stocks?market=US", { cache: "no-store" });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const item = normalizeStockRow(row, "US");
          if (item && item.market === "US") merged.set(item.symbol, item);
        }
      }
    }
  } catch (error) {
    console.warn("[AllMarketRadar] US universe unavailable", error);
  }
  return Array.from(merged.values());
}

async function loadUpbitUniverse(): Promise<UniverseItem[]> {
  try {
    const response = await fetch("https://api.upbit.com/v1/market/all?isDetails=false", { cache: "no-store" });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows)) {
        return rows
          .filter((row) => String(row?.market || "").startsWith("KRW-"))
          .map((row) => ({
            symbol: String(row.market),
            name: String(row.korean_name || row.english_name || row.market),
            market: "UPBIT" as const,
          }));
      }
    }
  } catch (error) {
    console.warn("[AllMarketRadar] direct Upbit market list unavailable", error);
  }

  try {
    const response = await fetch("/api/stocks?market=UPBIT", { cache: "no-store" });
    if (!response.ok) return [];
    const rows = await response.json();
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row: any) => {
        const symbol = String(row?.symbol || "").trim().toUpperCase();
        if (!symbol) return null;
        return {
          symbol: symbol.startsWith("KRW-") ? symbol : `KRW-${symbol}`,
          name: String(row?.name || symbol),
          market: "UPBIT" as const,
        };
      })
      .filter(Boolean) as UniverseItem[];
  } catch (error) {
    console.warn("[AllMarketRadar] fallback Upbit universe unavailable", error);
    return [];
  }
}

async function analyze(item: UniverseItem): Promise<RadarRow> {
  const checkedAt = Date.now();
  try {
    const response = await fetch(
      `/api/market/realtime-candles?symbol=${encodeURIComponent(item.symbol)}&market=${item.market === "UPBIT" ? "UPBIT" : item.market}&timeframe=${LIVE_TIMEFRAME}&count=${LIVE_CANDLE_COUNT}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return { ...item, status: response.status >= 500 ? "API_ERROR" : "NO_DATA", signal: null, checkedAt, reason: `HTTP ${response.status}` };
    }

    const json = await response.json();
    const candles = Array.isArray(json?.candles) ? json.candles : [];
    if (!candles.length) return { ...item, status: "NO_DATA", signal: null, checkedAt, reason: "캔들 없음" };
    if (candles.length < 56) return { ...item, status: "INSUFFICIENT_BARS", signal: null, checkedAt, reason: `${candles.length}/56봉` };

    const signal = evaluateLongShortSignal(candles);
    if (!signal) return { ...item, status: "NO_DATA", signal: null, checkedAt, reason: "검증 엔진 NO_DATA" };
    if (signal.direction === "WAIT") return { ...item, status: "WAIT", signal, checkedAt };
    if (signal.plan.source !== "ATR_VWAP_VERIFIED") return { ...item, status: "NO_PLAN", signal, checkedAt };
    return { ...item, status: "SIGNAL", signal, checkedAt };
  } catch (error) {
    return {
      ...item,
      status: "API_ERROR",
      signal: null,
      checkedAt,
      reason: error instanceof Error ? error.message : "unknown error",
    };
  }
}

function rank(row: RadarRow): number {
  if (!row.signal) return -1;
  return Math.max(row.signal.longStrength, row.signal.shortStrength) + row.signal.edge * 0.45 + row.signal.matchedPatterns * 2;
}

function counterField(status: ScanStatus): keyof MarketCounters {
  if (status === "SIGNAL") return "signal";
  if (status === "WAIT") return "wait";
  if (status === "NO_PLAN") return "noPlan";
  if (status === "INSUFFICIENT_BARS") return "insufficient";
  if (status === "NO_DATA") return "noData";
  return "apiError";
}

export const AllMarketRadar: React.FC = () => {
  const [running, setRunning] = useState(true);
  const [loadingUniverse, setLoadingUniverse] = useState(true);
  const [universe, setUniverse] = useState<Record<RadarMarket, UniverseItem[]>>({ KOREA: [], US: [], UPBIT: [] });
  const [counters, setCounters] = useState<Record<RadarMarket, MarketCounters>>({
    KOREA: { ...EMPTY_COUNTERS },
    US: { ...EMPTY_COUNTERS },
    UPBIT: { ...EMPTY_COUNTERS },
  });
  const [signals, setSignals] = useState<RadarRow[]>([]);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  const cursorRef = useRef<Record<RadarMarket, number>>({ KOREA: 0, US: 0, UPBIT: 0 });
  const runTokenRef = useRef(0);

  const refreshUniverse = useCallback(async () => {
    setLoadingUniverse(true);
    const [korea, us, upbit] = await Promise.all([loadKoreaUniverse(), loadUsUniverse(), loadUpbitUniverse()]);
    const next = { KOREA: korea, US: us, UPBIT: upbit };
    setUniverse(next);
    cursorRef.current = { KOREA: 0, US: 0, UPBIT: 0 };
    setCounters({
      KOREA: { ...EMPTY_COUNTERS, universe: korea.length },
      US: { ...EMPTY_COUNTERS, universe: us.length },
      UPBIT: { ...EMPTY_COUNTERS, universe: upbit.length },
    });
    setLoadingUniverse(false);
  }, []);

  useEffect(() => {
    void refreshUniverse();
    const timer = window.setInterval(() => void refreshUniverse(), REFRESH_UNIVERSE_MS);
    return () => window.clearInterval(timer);
  }, [refreshUniverse]);

  useEffect(() => {
    if (!running || loadingUniverse) return undefined;
    const token = ++runTokenRef.current;
    let cancelled = false;

    const work = async () => {
      while (!cancelled && token === runTokenRef.current) {
        let didWork = false;

        for (const market of MARKET_ORDER) {
          if (cancelled || token !== runTokenRef.current) return;
          const rows = universe[market];
          if (!rows.length) continue;
          didWork = true;

          let cursor = cursorRef.current[market];
          if (cursor >= rows.length) {
            cursor = 0;
            cursorRef.current[market] = 0;
            setCycle((value) => value + 1);
            setCounters((previous) => ({
              ...previous,
              [market]: { ...EMPTY_COUNTERS, universe: rows.length },
            }));
          }

          const batch = rows.slice(cursor, cursor + BATCH_SIZE);
          const results = await Promise.all(batch.map(analyze));
          cursorRef.current[market] = cursor + batch.length;

          setCounters((previous) => {
            const current = { ...previous[market] };
            for (const result of results) {
              current.scanned += 1;
              const field = counterField(result.status);
              current[field] += 1;
            }
            return { ...previous, [market]: current };
          });

          const found = results.filter((row) => row.status === "SIGNAL");
          if (found.length) {
            setSignals((previous) => {
              const merged = new Map(previous.map((row) => [`${row.market}:${row.symbol}`, row]));
              for (const row of found) merged.set(`${row.market}:${row.symbol}`, row);
              return Array.from(merged.values()).sort((a, b) => rank(b) - rank(a)).slice(0, MAX_SIGNAL_ROWS);
            });
          }

          setLastCheckedAt(Date.now());
          await sleep(BATCH_PAUSE_MS);
        }

        if (!didWork) await sleep(1500);
      }
    };

    void work();
    return () => {
      cancelled = true;
      runTokenRef.current += 1;
    };
  }, [running, loadingUniverse, universe]);

  const total = useMemo(() => MARKET_ORDER.reduce((sum, market) => sum + counters[market].universe, 0), [counters]);
  const scanned = useMemo(() => MARKET_ORDER.reduce((sum, market) => sum + counters[market].scanned, 0), [counters]);
  const signalCount = useMemo(() => MARKET_ORDER.reduce((sum, market) => sum + counters[market].signal, 0), [counters]);
  const progress = total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;

  return (
    <section className="w-full border-b border-cyan-400/20 bg-slate-950 px-3 py-4 text-white sm:px-4">
      <div className="mx-auto max-w-[1920px] rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-cyan-300" />
              <h2 className="font-black">ALL MARKET RADAR · 전종목 시장 레이더</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${running ? "bg-emerald-400 text-emerald-950" : "bg-slate-800 text-slate-400"}`}>{running ? "RUNNING" : "PAUSED"}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">KOSPI/KOSDAQ 공급자 유니버스 · 미국 공급자 유니버스 · Upbit KRW 전체 마켓을 순환 스캔합니다. 가짜 시세는 생성하지 않습니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRunning((value) => !value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-200">{running ? "레이더 일시정지" : "레이더 재개"}</button>
            <button type="button" onClick={() => void refreshUniverse()} disabled={loadingUniverse} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-200 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loadingUniverse ? "animate-spin" : ""}`} /> 유니버스 갱신</button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <TopMetric label="전체 후보" value={total} />
          <TopMetric label="현재 사이클 분석" value={scanned} />
          <TopMetric label="실제 신호" value={signalCount} />
          <TopMetric label="사이클 진행률" value={`${progress}%`} />
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {MARKET_ORDER.map((market) => <MarketCard key={market} market={market} counters={counters[market]} />)}
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-cyan-200"><Radar className="h-4 w-4" /> 실시간 상위 LONG / SHORT 후보</div>
            <div className="text-[10px] text-slate-500">사이클 {cycle} · {lastCheckedAt ? `마지막 분석 ${new Date(lastCheckedAt).toLocaleTimeString("ko-KR")}` : "분석 대기"}</div>
          </div>
          {signals.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {signals.slice(0, 12).map((row) => <SignalCard key={`${row.market}:${row.symbol}`} row={row} />)}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-4 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" /> 아직 ATR/VWAP 검증을 통과한 LONG/SHORT 신호가 없습니다. 아래 상태 카운터로 NO_DATA와 진짜 ZERO_MATCH를 구분할 수 있습니다.</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> 5분봉 90개 요청 · 56봉 이상만 분석 · 배치 {BATCH_SIZE}개 순환</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> 자동 주문 없음 · API 제한을 피하기 위해 전종목을 순환형으로 스캔</span>
        </div>
      </div>
    </section>
  );
};

const TopMetric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-xl font-black text-white">{value}</div>
  </div>
);

const MarketCard: React.FC<{ market: RadarMarket; counters: MarketCounters }> = ({ market, counters }) => {
  const label = market === "KOREA" ? "국내 KOSPI/KOSDAQ" : market === "US" ? "미국 주식" : "Upbit KRW 전체";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-black text-slate-100">{label}</div>
        <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-black text-cyan-200">{counters.scanned}/{counters.universe || "-"}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        <Count label="SIGNAL" value={counters.signal} active />
        <Count label="WAIT" value={counters.wait} />
        <Count label="NO PLAN" value={counters.noPlan} />
        <Count label="56봉 미만" value={counters.insufficient} />
        <Count label="NO DATA" value={counters.noData} />
        <Count label="API ERR" value={counters.apiError} />
        <Count label="UNIVERSE" value={counters.universe} />
        <Count label="SCANNED" value={counters.scanned} />
      </div>
    </div>
  );
};

const Count: React.FC<{ label: string; value: number; active?: boolean }> = ({ label, value, active }) => (
  <div className={`rounded-lg border px-1 py-2 ${active ? "border-cyan-400/30 bg-cyan-400/10" : "border-slate-800 bg-slate-950"}`}>
    <div className="text-[8px] font-bold text-slate-500">{label}</div>
    <div className={`mt-0.5 text-sm font-black ${active ? "text-cyan-200" : "text-slate-200"}`}>{value}</div>
  </div>
);

const SignalCard: React.FC<{ row: RadarRow }> = ({ row }) => {
  const signal = row.signal!;
  const isLong = signal.direction === "LONG";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-black text-slate-100">{row.name}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">{row.symbol} · {row.market}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${isLong ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"}`}>
          {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{signal.direction}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-center">
        <Mini label="LONG" value={`${signal.longStrength.toFixed(0)}%`} />
        <Mini label="SHORT" value={`${signal.shortStrength.toFixed(0)}%`} />
        <Mini label="PATTERN" value={signal.matchedPatterns} />
      </div>
      <div className="mt-2 text-[10px] text-slate-500">우세도 격차 {signal.edge.toFixed(1)}pt · {signal.confidenceLabel}</div>
    </div>
  );
};

const Mini: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-md bg-slate-900 px-1 py-1.5"><div className="text-[8px] text-slate-600">{label}</div><div className="text-[10px] font-black text-slate-200">{value}</div></div>
);
