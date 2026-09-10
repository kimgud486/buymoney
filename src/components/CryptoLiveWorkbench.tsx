import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bitcoin, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";
import { realtimeMarketStreamManager, type NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

type TradePlan = {
  verdict: "매수 관심" | "관망" | "매도 주의";
  reason: string;
  buyLow: number;
  buyHigh: number;
  stop: number;
  target1: number;
  target2: number;
};

const COINS: Array<{ symbol: Coin; label: string }> = [
  { symbol: "BTC", label: "비트코인" },
  { symbol: "ETH", label: "이더리움" },
  { symbol: "SOL", label: "솔라나" },
  { symbol: "XRP", label: "리플" },
];

const finite = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function normalizeCandles(payload: any): ScannerCandle[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.candles) ? payload.candles : [];
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
    .filter((c: ScannerCandle) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.high >= c.low)
    .reverse();
}

function formatPrice(value?: number | null): string {
  if (!value || !Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function makePlan(result: VerifiedSignalResult | null, currentPrice: number): TradePlan | null {
  if (!result || !currentPrice) return null;
  const atr = Math.max(1, result.metrics.atr || currentPrice * 0.005);
  const bullish = result.direction === "BULLISH" || result.decision === "BUY_APPROVED";
  const bearish = result.direction === "BEARISH";
  const buyLow = Math.max(1, currentPrice - atr * 0.45);
  const buyHigh = currentPrice + atr * 0.15;
  const stop = Math.max(1, buyLow - atr * 0.8);
  const target1 = currentPrice + atr * 1.2;
  const target2 = currentPrice + atr * 2;
  if (bullish && result.score >= 70) {
    return { verdict: "매수 관심", reason: "상승 방향과 점수가 함께 확인됐습니다. 현재가 추격보다 표시된 매수 구간에서 지지 확인이 우선입니다.", buyLow, buyHigh, stop, target1, target2 };
  }
  if (bearish) {
    return { verdict: "매도 주의", reason: "하락 방향 신호가 우세합니다. 신규 매수보다 보유 물량 위험관리와 손절 기준 확인이 우선입니다.", buyLow, buyHigh, stop, target1, target2 };
  }
  return { verdict: "관망", reason: "방향이 아직 확실하지 않습니다. 점수와 거래강도가 좋아질 때까지 기다리는 구간입니다.", buyLow, buyHigh, stop, target1, target2 };
}

export const CryptoLiveWorkbench: React.FC = () => {
  const [coin, setCoin] = useState<Coin>("BTC");
  const [candles, setCandles] = useState<ScannerCandle[]>([]);
  const [result, setResult] = useState<VerifiedSignalResult | null>(null);
  const [lastTick, setLastTick] = useState<NormalizedMarketTick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState("100000");
  const [sellPercent, setSellPercent] = useState(50);

  const loadSeed = async (target: Coin = coin) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/upbit/public/candles?market=KRW-${target}&timeframe=minutes&unit=1&count=120`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = normalizeCandles(await response.json());
      if (next.length < 56) throw new Error("분석에 필요한 실제 1분봉 데이터가 부족합니다.");
      setCandles(next);
      setResult(evaluateVerifiedSignal(next));
      setError(null);
    } catch (e) {
      setCandles([]);
      setResult(null);
      setError(e instanceof Error ? e.message : "코인 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLastTick(null);
    void loadSeed(coin);
  }, [coin]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadSeed(coin), 30_000);
    return () => window.clearInterval(timer);
  }, [coin]);

  useEffect(() => realtimeMarketStreamManager.subscribeTick((tick) => {
    if (tick.market === "UPBIT" && tick.symbol === coin && tick.price > 0) setLastTick(tick);
  }), [coin]);

  const currentPrice = lastTick?.price ?? result?.metrics.close ?? 0;
  const plan = useMemo(() => makePlan(result, currentPrice), [result, currentPrice]);
  const buyValue = Math.max(0, Number(buyAmount) || 0);
  const estimatedQty = currentPrice > 0 ? buyValue / currentPrice : 0;

  const scenario = useMemo(() => {
    if (!plan || !currentPrice) return [];
    const midBuy = (plan.buyLow + plan.buyHigh) / 2;
    return [currentPrice, midBuy, plan.buyHigh, plan.target1, (plan.target1 + plan.target2) / 2, plan.target2];
  }, [plan, currentPrice]);
  const minScenario = scenario.length ? Math.min(...scenario, plan?.stop ?? Infinity) : 0;
  const maxScenario = scenario.length ? Math.max(...scenario) : 1;
  const scenarioPoints = scenario.map((price, index) => `${10 + index * 56},${86 - ((price - minScenario) / Math.max(1, maxScenario - minScenario)) * 64}`).join(" ");

  const emitOrderIntent = (side: "BUY" | "SELL") => {
    if (!plan || !currentPrice) return;
    window.dispatchEvent(new CustomEvent("crypto_manual_order_intent_confirmed", {
      detail: {
        side,
        coin,
        currentPrice,
        buyAmountKrw: side === "BUY" ? buyValue : undefined,
        sellPercent: side === "SELL" ? sellPercent : undefined,
        buyZoneLow: plan.buyLow,
        buyZoneHigh: plan.buyHigh,
        stop: plan.stop,
        target1: plan.target1,
        target2: plan.target2,
        timestamp: Date.now(),
      },
    }));
  };

  return (
    <section className="w-full border-b border-slate-200 bg-slate-50 px-2 py-2 sm:px-3">
      <div className="mx-auto max-w-[1180px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-amber-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900">코인 매수·매도 도우미</h2>
              <p className="text-[10px] text-slate-500">어려운 영어 대신 지금 할 일을 한글로 표시합니다.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {COINS.map((item) => (
              <button key={item.symbol} onClick={() => setCoin(item.symbol)} className={`rounded-md px-2 py-1 text-[10px] font-black ${coin === item.symbol ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item.label}</button>
            ))}
            <button onClick={() => void loadSeed()} disabled={loading} className="rounded-md border border-slate-200 px-2 py-1 text-slate-600"><RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {error ? (
          <div className="mt-2 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-2 text-xs font-bold text-rose-700"><AlertTriangle className="h-4 w-4" /> {error}</div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div className={`rounded-xl border p-3 ${plan?.verdict === "매수 관심" ? "border-rose-200 bg-rose-50" : plan?.verdict === "매도 주의" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">지금 판단</div>
                    <div className="mt-0.5 text-xl font-black text-slate-900">{plan?.verdict ?? "분석 중"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500">현재가</div>
                    <div className="text-lg font-black text-slate-900">{formatPrice(currentPrice)}</div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-700">{plan?.reason ?? "실시간 데이터를 확인하고 있습니다."}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Box label="분석 점수" value={result ? `${Math.round(result.score)}점` : "-"} help="높을수록 현재 조건이 전략 규칙에 더 잘 맞습니다." />
                <Box label="RSI" value={result ? result.metrics.rsi.toFixed(0) : "-"} help="70 이상은 과열 가능성, 30 이하는 과매도 가능성을 봅니다." />
                <Box label="거래강도" value={result ? result.metrics.rvol.toFixed(1) : "-"} help="평소보다 거래량이 얼마나 강한지 보는 값입니다." />
                <Box label="추세" value={result?.direction === "BULLISH" ? "상승" : result?.direction === "BEARISH" ? "하락" : "중립"} help="현재 지표가 가리키는 방향입니다." />
              </div>

              {plan && <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-black text-slate-900">매수·매도 위치</div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Box label="매수 관심 구간" value={`${formatPrice(plan.buyLow)} ~ ${formatPrice(plan.buyHigh)}`} help="이 구간에서 지지 확인 후 접근하는 기준입니다." />
                  <Box label="손절 기준" value={formatPrice(plan.stop)} help="이 가격 아래로 내려가면 시나리오가 틀렸다고 보는 기준입니다." />
                  <Box label="1차 매도 목표" value={formatPrice(plan.target1)} help="일부 이익실현을 고려할 첫 목표입니다." />
                  <Box label="2차 매도 목표" value={formatPrice(plan.target2)} help="추세가 이어질 때 남은 물량을 보는 두 번째 목표입니다." />
                </div>
              </div>}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-black text-slate-900">얼마를 매수할까요?</div>
                <p className="mt-1 text-[10px] text-slate-500">롱은 가격 상승을 예상하고 코인을 매수해 보유하는 방식입니다.</p>
                <div className="mt-2 flex gap-2">
                  <input value={buyAmount} onChange={(e) => setBuyAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-black" placeholder="매수 금액" />
                  <span className="self-center text-xs font-bold text-slate-500">원</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">예상 수량: {estimatedQty > 0 ? estimatedQty.toFixed(8) : "-"} {coin}</div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[50000, 100000, 300000].map((amount) => <button key={amount} onClick={() => setBuyAmount(String(amount))} className="rounded-md bg-slate-100 py-1.5 text-[10px] font-bold">{amount.toLocaleString("ko-KR")}원</button>)}
                </div>
                <button onClick={() => emitOrderIntent("BUY")} disabled={!plan || buyValue < 5000} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600 py-2 text-sm font-black text-white disabled:opacity-40"><TrendingUp className="h-4 w-4" /> 매수 내용 확인</button>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-black text-slate-900">얼마나 매도할까요?</div>
                <p className="mt-1 text-[10px] text-slate-500">매도는 내가 보유한 코인을 파는 것입니다. 하락이 예상될 때 위험을 줄이는 데 사용합니다.</p>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[25, 50, 75, 100].map((pct) => <button key={pct} onClick={() => setSellPercent(pct)} className={`rounded-md py-1.5 text-[10px] font-black ${sellPercent === pct ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>{pct}%</button>)}
                </div>
                <button onClick={() => emitOrderIntent("SELL")} disabled={!plan} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-sm font-black text-white disabled:opacity-40"><TrendingDown className="h-4 w-4" /> 매도 내용 확인</button>
              </div>
            </div>
          </div>
        )}

        {plan && scenario.length > 1 && <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-slate-900">단기 예상 시나리오</div>
              <div className="text-[9px] text-slate-500">확정 예측이 아니라 현재 지표와 변동성으로 만든 참고 경로입니다.</div>
            </div>
            <div className="text-[9px] font-bold text-slate-500">매수 구간 → 1차 목표 → 2차 목표</div>
          </div>
          <svg viewBox="0 0 300 96" className="mt-2 h-[105px] w-full" preserveAspectRatio="none" aria-label="단기 예상 시나리오 그래프">
            <line x1="0" x2="300" y1="78" y2="78" stroke="#e2e8f0" strokeWidth="1" />
            <polyline points={scenarioPoints} fill="none" stroke="#0f172a" strokeWidth="2.5" />
            {scenario.map((price, i) => <circle key={i} cx={10 + i * 56} cy={86 - ((price - minScenario) / Math.max(1, maxScenario - minScenario)) * 64} r="3" fill="#0f172a" />)}
          </svg>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div><b>매수 타이밍</b><br />{formatPrice(plan.buyLow)} ~ {formatPrice(plan.buyHigh)}</div>
            <div><b>1차 매도</b><br />{formatPrice(plan.target1)}</div>
            <div><b>2차 매도</b><br />{formatPrice(plan.target2)}</div>
          </div>
        </div>}

        <div className="mt-3 flex items-start gap-1 rounded-lg bg-slate-50 px-2 py-2 text-[9px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> 업비트 현물 화면 기준으로 롱은 ‘매수’, 하락 대응은 ‘보유 물량 매도’로 표시합니다. 이 화면은 주문 내용을 준비하고 확인하는 단계이며 자동 체결은 실행하지 않습니다.</div>
      </div>
    </section>
  );
};

const Box: React.FC<{ label: string; value: string; help: string }> = ({ label, value, help }) => (
  <div className="rounded-lg bg-slate-50 p-2">
    <div className="text-[9px] font-bold text-slate-500">{label}</div>
    <div className="mt-0.5 text-[11px] font-black text-slate-900">{value}</div>
    <div className="mt-1 text-[8px] leading-3 text-slate-400">{help}</div>
  </div>
);
