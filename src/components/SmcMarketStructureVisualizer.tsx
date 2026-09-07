import React, { useCallback, useEffect, useMemo, useState } from "react";
import { realCandleStore } from "../services/RealCandleStore";
import { realtimeMarketFeedService } from "../services/realtimeMarketFeedService";
import { RealScannerCoreEngine, RealScannerResult } from "../services/RealScannerCoreEngine";
import { institutionalOrderFlowService } from "../services/InstitutionalOrderFlowService";
import type { Timeframe } from "../services/MultiTimeframeAnalysisEngine";

export interface SmcMarketStructureVisualizerProps {
  stock?: {
    symbol: string;
    name: string;
    price?: number;
    market?: "KOREA" | "US" | "BTC" | "UPBIT" | "KOSPI" | "KOSDAQ" | string;
  };
  onOpenBrokerApiModal?: () => void;
}

interface LiveSmcViewModel {
  symbol: string;
  name: string;
  timeframe: Timeframe;
  scan: RealScannerResult;
  candleCount: number;
  latestCandleTime: number | string | null;
  orderFlowStatus: "LIVE" | "UNAVAILABLE" | "STALE";
  cumulativeDelta: number | null;
  bidImbalance: number | null;
  askImbalance: number | null;
  poc: number | null;
  vah: number | null;
  val: number | null;
}

const TIMEFRAMES: Timeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "1d"];

const DEFAULT_SYMBOLS = [
  { symbol: "005930", name: "삼성전자", market: "KOSPI" },
  { symbol: "000660", name: "SK하이닉스", market: "KOSPI" },
  { symbol: "NVDA", name: "NVIDIA", market: "US" },
  { symbol: "TSLA", name: "Tesla", market: "US" },
  { symbol: "AAPL", name: "Apple", market: "US" },
  { symbol: "BTC", name: "Bitcoin", market: "UPBIT" }
] as const;

function normalizeMarket(market?: string): "KOSPI" | "KOSDAQ" | "UPBIT" | "US" {
  if (market === "US") return "US";
  if (market === "BTC" || market === "UPBIT") return "UPBIT";
  if (market === "KOSDAQ") return "KOSDAQ";
  return "KOSPI";
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatTimestamp(value: number | string | null): string {
  if (value == null) return "--";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export const SmcMarketStructureVisualizer: React.FC<SmcMarketStructureVisualizerProps> = ({ stock, onOpenBrokerApiModal }) => {
  const incomingSymbol = stock?.symbol?.toUpperCase().replace(/^KRW-/, "") || "005930";
  const [selectedSymbol, setSelectedSymbol] = useState(incomingSymbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("15m");
  const [view, setView] = useState<LiveSmcViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  const selectedMeta = useMemo(() => {
    if (stock && stock.symbol.toUpperCase().replace(/^KRW-/, "") === selectedSymbol) {
      return { symbol: selectedSymbol, name: stock.name || selectedSymbol, market: normalizeMarket(stock.market) };
    }
    const preset = DEFAULT_SYMBOLS.find((item) => item.symbol === selectedSymbol);
    return { symbol: selectedSymbol, name: preset?.name || selectedSymbol, market: normalizeMarket(preset?.market) };
  }, [selectedSymbol, stock]);

  useEffect(() => {
    if (stock?.symbol) setSelectedSymbol(stock.symbol.toUpperCase().replace(/^KRW-/, ""));
  }, [stock?.symbol]);

  const runRealAnalysis = useCallback(async () => {
    const symbol = selectedMeta.symbol;
    setIsLoading(true);
    setError(null);

    try {
      realtimeMarketFeedService.registerSymbol(symbol, selectedMeta.market);
      await Promise.all(TIMEFRAMES.map((tf) => realCandleStore.fetchRealCandles(symbol, tf, 220)));

      const candles = realCandleStore.getCachedCandles(symbol, selectedTimeframe);
      const quote = realtimeMarketFeedService.getQuote(symbol);

      if (!candles || candles.length < 10) {
        setView(null);
        setError("실제 OHLCV 캔들이 부족합니다. 합성 캔들은 생성하지 않습니다.");
        return;
      }

      const scan = RealScannerCoreEngine.analyze(symbol, candles, quote);
      const flow = institutionalOrderFlowService.getFlow(symbol);

      setView({
        symbol,
        name: quote?.name || selectedMeta.name,
        timeframe: selectedTimeframe,
        scan,
        candleCount: candles.length,
        latestCandleTime: candles[candles.length - 1]?.timestamp ?? null,
        orderFlowStatus: flow.status,
        cumulativeDelta: flow.status === "LIVE" ? flow.cumulativeDelta : null,
        bidImbalance: flow.status === "LIVE" ? flow.bidImbalance : null,
        askImbalance: flow.status === "LIVE" ? flow.askImbalance : null,
        poc: flow.status === "LIVE" ? flow.poc : null,
        vah: flow.status === "LIVE" ? flow.vah : null,
        val: flow.status === "LIVE" ? flow.val : null
      });
      setLastRefreshAt(Date.now());
    } catch (e) {
      console.error("[SMC_REAL_ANALYSIS_ERROR]", e);
      setView(null);
      setError("실데이터 SMC 분석 중 오류가 발생했습니다. 가짜 fallback은 사용하지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMeta, selectedTimeframe]);

  useEffect(() => {
    void runRealAnalysis();
    const timer = window.setInterval(() => void runRealAnalysis(), 15000);
    return () => window.clearInterval(timer);
  }, [runRealAnalysis]);

  const brain = view?.scan.brainResult ?? null;
  const latestBreak = brain?.structureBreaks?.length ? brain.structureBreaks[brain.structureBreaks.length - 1] : null;
  const activeFvg = brain?.keyLevels.activeBullishFVG ?? brain?.keyLevels.activeBearishFVG ?? null;
  const bullishOb = brain?.keyLevels.nearestBullishOB ?? null;
  const bearishOb = brain?.keyLevels.nearestBearishOB ?? null;
  const lastSweep = brain?.keyLevels.lastSweep ?? null;

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-white sm:p-6">
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">SMC REAL DATA VISUALIZER</div>
          <h2 className="mt-1 text-xl font-black">스마트머니 구조 · 수급 · 돌파 정밀 분석기</h2>
          <p className="mt-1 text-xs text-zinc-400">고정 가격, 합성 캔들, 가짜 BOS/FVG 점수, 가짜 체결 로그를 사용하지 않습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenBrokerApiModal && (
            <button type="button" onClick={onOpenBrokerApiModal} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold hover:bg-zinc-900">브로커 연결</button>
          )}
          <button type="button" onClick={() => void runRealAnalysis()} disabled={isLoading} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-black disabled:opacity-50">
            {isLoading ? "실데이터 확인 중" : "새로고침"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              {DEFAULT_SYMBOLS.map((item) => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>)}
              {!DEFAULT_SYMBOLS.some((item) => item.symbol === selectedSymbol) && <option value={selectedSymbol}>{selectedMeta.name} ({selectedSymbol})</option>}
            </select>
            <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value as Timeframe)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${view?.scan.dataStatus === "LIVE" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {view?.scan.dataStatus ?? "NO_DATA"}
            </span>
          </div>

          {error ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="현재가" value={formatNumber(realtimeMarketFeedService.getQuote(selectedSymbol)?.price ?? null)} />
              <Metric label="실제 캔들" value={view ? `${view.candleCount}개` : "--"} />
              <Metric label="Setup Score" value={view?.scan.score == null ? "--" : `${view.scan.score}점`} />
              <Metric label="Signal" value={view?.scan.signal ?? "NO_DATA"} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300">
          <div className="font-black text-zinc-100">데이터 검증 상태</div>
          <div className="mt-3 space-y-2">
            <StatusRow label="OHLCV" value={view ? `${view.candleCount} verified candles` : "NO_DATA"} />
            <StatusRow label="Latest candle" value={view ? formatTimestamp(view.latestCandleTime) : "--"} />
            <StatusRow label="MTF" value={view ? `${view.scan.mtfResult.timeframesEvaluated}/7 · ${view.scan.mtfResult.consensus}` : "NO_DATA"} />
            <StatusRow label="Order Flow" value={view?.orderFlowStatus ?? "UNAVAILABLE"} />
            <StatusRow label="마지막 갱신" value={lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString() : "--"} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Market Structure">
          <StatusRow label="Trend" value={brain?.currentStructureTrend ?? "NO_DATA"} />
          <StatusRow label="BOS/CHoCH" value={latestBreak ? `${latestBreak.type} ${latestBreak.direction}` : "NONE"} />
          <StatusRow label="Break level" value={latestBreak ? formatNumber(latestBreak.brokenSwingPrice) : "--"} />
          <StatusRow label="SMC score" value={brain?.smcStructureScore == null ? "--" : `${brain.smcStructureScore}`} />
        </Panel>

        <Panel title="Order Block / FVG">
          <StatusRow label="Bullish OB" value={bullishOb ? `${formatNumber(bullishOb.priceBottom)} ~ ${formatNumber(bullishOb.priceTop)}` : "NONE"} />
          <StatusRow label="Bearish OB" value={bearishOb ? `${formatNumber(bearishOb.priceBottom)} ~ ${formatNumber(bearishOb.priceTop)}` : "NONE"} />
          <StatusRow label="Active FVG" value={activeFvg ? `${activeFvg.type} ${formatNumber(activeFvg.bottom)} ~ ${formatNumber(activeFvg.top)}` : "NONE"} />
          <StatusRow label="FVG fill" value={activeFvg ? `${formatNumber(activeFvg.fillPercentage, 1)}%` : "--"} />
        </Panel>

        <Panel title="Liquidity / Risk">
          <StatusRow label="Last sweep" value={lastSweep ? `${lastSweep.type} @ ${formatNumber(lastSweep.sweptLevel)}` : "NONE"} />
          <StatusRow label="RVOL" value={formatNumber(view?.scan.analysis.indicator.rvol)} />
          <StatusRow label="VWAP" value={formatNumber(view?.scan.analysis.indicator.vwap)} />
          <StatusRow label="Chase risk" value={view?.scan.analysis.risk.chaseRisk == null ? "--" : `${view.scan.analysis.risk.chaseRisk}%`} />
        </Panel>

        <Panel title="Real Order Flow">
          {view?.orderFlowStatus === "LIVE" ? (
            <>
              <StatusRow label="Cumulative Delta" value={formatNumber(view.cumulativeDelta)} />
              <StatusRow label="Bid imbalance" value={formatNumber(view.bidImbalance)} />
              <StatusRow label="Ask imbalance" value={formatNumber(view.askImbalance)} />
              <StatusRow label="POC / VAH / VAL" value={`${formatNumber(view.poc)} / ${formatNumber(view.vah)} / ${formatNumber(view.val)}`} />
            </>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
              ORDER_FLOW_{view?.orderFlowStatus ?? "UNAVAILABLE"}. 실제 검증 tick/호가가 들어오기 전에는 Delta·POC·Imbalance를 만들지 않습니다.
            </div>
          )}
        </Panel>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 text-sm font-black">Multi-Timeframe 실제 분석</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {TIMEFRAMES.map((tf) => {
            const result = tf === "1m" ? view?.scan.mtfResult.m1
              : tf === "3m" ? view?.scan.mtfResult.m3
              : tf === "5m" ? view?.scan.mtfResult.m5
              : tf === "15m" ? view?.scan.mtfResult.m15
              : tf === "30m" ? view?.scan.mtfResult.m30
              : tf === "1h" ? view?.scan.mtfResult.h1
              : view?.scan.mtfResult.d1;
            return (
              <div key={tf} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center">
                <div className="text-xs font-black text-zinc-300">{tf}</div>
                <div className="mt-1 text-[11px] text-zinc-500">{result ? `${result.candleCount} candles` : "NO_DATA"}</div>
                <div className={`mt-1 text-xs font-black ${result?.isBullish ? "text-emerald-400" : result?.isBearish ? "text-rose-400" : "text-zinc-400"}`}>
                  {result?.isBullish ? "BULL" : result?.isBearish ? "BEAR" : result ? "NEUTRAL" : "--"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-100">
        이 화면은 분석 전용입니다. 실거래 체결 상태를 프런트에서 임의로 생성하지 않으며, 주문/체결은 BrokerGateway의 실제 ACK 및 Fill Verification 결과가 있을 때만 별도 주문 상태에 반영해야 합니다.
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</div>
    <div className="mt-1 break-words text-sm font-black text-zinc-100">{value}</div>
  </div>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
    <div className="mb-3 text-sm font-black text-zinc-100">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const StatusRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex min-w-0 items-start justify-between gap-3 border-b border-zinc-800/70 pb-2 last:border-b-0 last:pb-0">
    <span className="shrink-0 text-[11px] text-zinc-500">{label}</span>
    <span className="min-w-0 break-words text-right text-[11px] font-bold text-zinc-200">{value}</span>
  </div>
);
