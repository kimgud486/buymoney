import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Activity, Crosshair, RefreshCw, Radar, ShieldCheck, TrendingUp } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";
type TfKey = "1m" | "5m" | "15m" | "1h";

type Snapshot = {
  coin: Coin;
  tf: TfKey;
  unit: number;
  candles: ScannerCandle[];
  result: VerifiedSignalResult | null;
  support: number | null;
  resistance: number | null;
  breakoutRetest: boolean;
  vwapReclaim: boolean;
  liquiditySweep: boolean;
  error?: string;
};

type CoinScan = {
  coin: Coin;
  snapshots: Snapshot[];
  score: number;
  state: "BUY" | "WATCH" | "SELL_RISK" | "NO_DATA";
  bull: number;
  bear: number;
  setupLabels: string[];
  support: number | null;
  resistance: number | null;
  scoreDelta: number;
};

const COINS: Coin[] = ["BTC", "ETH", "SOL", "XRP"];
const TFS: Array<{ key: TfKey; unit: number }> = [
  { key: "1m", unit: 1 },
  { key: "5m", unit: 5 },
  { key: "15m", unit: 15 },
  { key: "1h", unit: 60 },
];

const finite = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeCandles(payload: any): ScannerCandle[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.candles) ? payload.candles : Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((raw: any) => ({
      time: raw?.candle_date_time_kst ?? raw?.timestamp,
      timestamp: raw?.timestamp ?? raw?.candle_date_time_kst,
      open: finite(raw?.opening_price ?? raw?.open),
      high: finite(raw?.high_price ?? raw?.high),
      low: finite(raw?.low_price ?? raw?.low),
      close: finite(raw?.trade_price ?? raw?.close),
      volume: finite(raw?.candle_acc_trade_volume ?? raw?.volume),
    }))
    .filter((c: ScannerCandle) => c.open > 0 && c.high >= c.low && c.low > 0 && c.close > 0)
    .reverse();
}

function deriveStructure(candles: ScannerCandle[], result: VerifiedSignalResult | null) {
  if (candles.length < 25 || !result) return { support: null, resistance: null, breakoutRetest: false, vwapReclaim: false, liquiditySweep: false };
  const completed = candles.slice(0, -1);
  const recent = completed.slice(-20);
  const last = completed.at(-1)!;
  const prev = completed.at(-2)!;
  const prior = completed.slice(-21, -1);
  const support = Math.min(...recent.map((c) => c.low));
  const resistance = Math.max(...recent.map((c) => c.high));
  const priorResistance = Math.max(...prior.map((c) => c.high));
  const priorSupport = Math.min(...prior.map((c) => c.low));
  const atr = Math.max(1, result.metrics.atr || 0);

  const breakoutRetest = prev.close > priorResistance && last.low <= priorResistance + atr * 0.35 && last.close > priorResistance;
  const vwapReclaim = prev.close < result.metrics.vwap && last.close > result.metrics.vwap && last.close >= last.open;
  const liquiditySweep = (last.low < priorSupport && last.close > priorSupport) || (last.high > priorResistance && last.close < priorResistance);

  return { support, resistance, breakoutRetest, vwapReclaim, liquiditySweep };
}

function formatKrw(v: number | null) {
  if (!v || !Number.isFinite(v)) return "-";
  return `${Math.round(v).toLocaleString("ko-KR")}원`;
}

export const CryptoMultiTimeframeSetupScanner: React.FC = () => {
  const [scans, setScans] = useState<CoinScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const previousScores = useRef<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const snapshots = await Promise.all(
      COINS.flatMap((coin) => TFS.map(async ({ key, unit }): Promise<Snapshot> => {
        try {
          const response = await fetch(`/api/upbit/public/candles?market=KRW-${coin}&timeframe=minutes&unit=${unit}&count=120`, { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const candles = normalizeCandles(await response.json());
          if (candles.length < 56) return { coin, tf: key, unit, candles, result: null, support: null, resistance: null, breakoutRetest: false, vwapReclaim: false, liquiditySweep: false, error: "56봉 미만" };
          const result = evaluateVerifiedSignal(candles);
          const structure = deriveStructure(candles, result);
          return { coin, tf: key, unit, candles, result, ...structure };
        } catch (error) {
          return { coin, tf: key, unit, candles: [], result: null, support: null, resistance: null, breakoutRetest: false, vwapReclaim: false, liquiditySweep: false, error: error instanceof Error ? error.message : "조회 실패" };
        }
      })),
    );

    const next: CoinScan[] = COINS.map((coin) => {
      const own = snapshots.filter((s) => s.coin === coin);
      const valid = own.filter((s) => s.result);
      if (!valid.length) return { coin, snapshots: own, score: 0, state: "NO_DATA", bull: 0, bear: 0, setupLabels: [], support: null, resistance: null, scoreDelta: 0 };
      const bull = valid.filter((s) => s.result?.direction === "BULLISH").length;
      const bear = valid.filter((s) => s.result?.direction === "BEARISH").length;
      const score = valid.reduce((sum, s) => sum + (s.result?.score ?? 0), 0) / valid.length;
      const setupLabels = Array.from(new Set(valid.flatMap((s) => [
        ...(s.breakoutRetest ? [`${s.tf} Breakout+Retest`] : []),
        ...(s.vwapReclaim ? [`${s.tf} VWAP Reclaim`] : []),
        ...(s.liquiditySweep ? [`${s.tf} Liquidity Sweep`] : []),
      ]))).slice(0, 5);
      const state = bear >= 3 ? "SELL_RISK" : bull >= 3 && score >= 70 ? "BUY" : "WATCH";
      const primary = own.find((s) => s.tf === "5m") ?? valid[0];
      const previous = previousScores.current[coin];
      const scoreDelta = Number.isFinite(previous) ? score - previous : 0;
      previousScores.current[coin] = score;
      if (scoreDelta >= 10) {
        window.dispatchEvent(new CustomEvent("crypto_setup_score_surge", { detail: { coin, score, scoreDelta, state, setups: setupLabels } }));
      }
      return { coin, snapshots: own, score, state, bull, bear, setupLabels, support: primary.support, resistance: primary.resistance, scoreDelta };
    });

    setScans(next.sort((a, b) => b.score - a.score));
    setUpdatedAt(Date.now());
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const leaders = useMemo(() => scans.slice(0, 4), [scans]);

  return (
    <section className="w-full border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="mx-auto max-w-[1920px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Radar className="h-5 w-5 text-violet-600" /><h2 className="font-black text-slate-900">Crypto MTF Setup Scanner</h2></div>
            <p className="mt-1 text-[11px] text-slate-500">BTC · ETH · SOL · XRP × 1m/5m/15m/1h · 실제 Upbit 캔들 · Breakout+Retest · VWAP Reclaim · 유동성 스윕</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 스캔 갱신</button>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-4">
          {leaders.map((scan) => (
            <div key={scan.coin} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Crosshair className="h-4 w-4 text-slate-500" /><span className="font-black text-slate-900">{scan.coin}</span></div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${scan.state === "BUY" ? "bg-rose-100 text-rose-700" : scan.state === "SELL_RISK" ? "bg-blue-100 text-blue-700" : scan.state === "WATCH" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"}`}>{scan.state}</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-2xl font-black text-slate-950">{Math.round(scan.score)}<span className="text-xs text-slate-400"> /100</span></div>
                <div className={`text-xs font-black ${scan.scoreDelta >= 10 ? "text-rose-600" : scan.scoreDelta > 0 ? "text-emerald-600" : "text-slate-400"}`}>{scan.scoreDelta >= 0 ? "+" : ""}{scan.scoreDelta.toFixed(1)}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <Metric label="Bull / Bear" value={`${scan.bull} / ${scan.bear}`} />
                <Metric label="Score Surge" value={scan.scoreDelta >= 10 ? "급상승" : "정상"} />
                <Metric label="5m Support" value={formatKrw(scan.support)} />
                <Metric label="5m Resistance" value={formatKrw(scan.resistance)} />
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-slate-600">
                {scan.setupLabels.length ? scan.setupLabels.map((label) => <div key={label} className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {label}</div>) : <div className="flex items-center gap-1 text-slate-400"><ShieldCheck className="h-3 w-3" /> 확정 셋업 없음</div>}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1">
                {scan.snapshots.map((s) => <div key={s.tf} className="rounded-md bg-white px-1 py-1 text-center"><div className="text-[8px] font-bold text-slate-400">{s.tf}</div><div className="text-[10px] font-black text-slate-700">{s.result ? Math.round(s.result.score) : "-"}</div></div>)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> {updatedAt ? `최근 스캔 ${new Date(updatedAt).toLocaleTimeString("ko-KR")}` : "데이터 대기"}</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Setup Score +10 이상 변화 시 이벤트 발생 · 자동 주문 없음</span>
        </div>
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white p-2"><div className="text-[8px] font-bold uppercase text-slate-400">{label}</div><div className="mt-0.5 truncate font-black text-slate-700">{value}</div></div>
);
