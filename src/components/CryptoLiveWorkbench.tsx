import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bitcoin, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { evaluateVerifiedSignal, type ScannerCandle, type VerifiedSignalResult } from "../scanner/verifiedSignalEngine";
import { realtimeMarketStreamManager, type NormalizedMarketTick } from "../services/RealtimeMarketStreamManager";

type Coin = "BTC" | "ETH" | "SOL" | "XRP";

type TradePlan = {
  verdict: "사도 괜찮은지 살펴보세요" | "조금 더 기다리세요" | "지금 사는 것은 조심하세요";
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
    return {
      verdict: "사도 괜찮은지 살펴보세요",
      reason: "가격 흐름이 위쪽을 보고 있어요. 지금 바로 따라 사기보다 아래의 '사기 좋은 가격' 근처에서 버티는지 먼저 보세요.",
      buyLow,
      buyHigh,
      stop,
      target1,
      target2,
    };
  }

  if (bearish) {
    return {
      verdict: "지금 사는 것은 조심하세요",
      reason: "가격 흐름이 아래쪽을 보고 있어요. 새로 사기보다 이미 가지고 있다면 어디에서 팔지 먼저 확인하세요.",
      buyLow,
      buyHigh,
      stop,
      target1,
      target2,
    };
  }

  return {
    verdict: "조금 더 기다리세요",
    reason: "오를지 내릴지 아직 뚜렷하지 않아요. 좋은 신호가 더 모일 때까지 기다리는 편이 안전해요.",
    buyLow,
    buyHigh,
    stop,
    target1,
    target2,
  };
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
      if (next.length < 56) throw new Error("아직 살펴볼 가격 자료가 충분하지 않아요.");
      setCandles(next);
      setResult(evaluateVerifiedSignal(next));
      setError(null);
    } catch (e) {
      setCandles([]);
      setResult(null);
      setError(e instanceof Error ? e.message : "가격 자료를 불러오지 못했어요.");
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

  const heatText = result
    ? result.metrics.rsi >= 70
      ? "많이 올라서 조금 뜨거워요"
      : result.metrics.rsi <= 30
        ? "많이 내려와 있어요"
        : "너무 뜨겁지도 차갑지도 않아요"
    : "-";

  const volumeText = result
    ? result.metrics.rvol >= 2
      ? "평소보다 거래가 아주 많아요"
      : result.metrics.rvol >= 1
        ? "평소와 비슷하거나 조금 많아요"
        : "평소보다 거래가 적어요"
    : "-";

  const trendText = result?.direction === "BULLISH" ? "가격이 위로 가려는 힘이 있어요" : result?.direction === "BEARISH" ? "가격이 아래로 가려는 힘이 있어요" : "방향이 아직 뚜렷하지 않아요";

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
              <h2 className="text-sm font-black text-slate-900">코인 사고팔기 도우미</h2>
              <p className="text-[10px] text-slate-500">어려운 말 없이 지금 무엇을 보면 되는지 쉽게 알려줘요.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {COINS.map((item) => (
              <button key={item.symbol} onClick={() => setCoin(item.symbol)} className={`rounded-md px-2 py-1 text-[10px] font-black ${coin === item.symbol ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item.label}</button>
            ))}
            <button aria-label="가격 다시 불러오기" onClick={() => void loadSeed()} disabled={loading} className="rounded-md border border-slate-200 px-2 py-1 text-slate-600"><RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {error ? (
          <div className="mt-2 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-2 text-xs font-bold text-rose-700"><AlertTriangle className="h-4 w-4" /> {error}</div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div className={`rounded-xl border p-3 ${plan?.verdict === "사도 괜찮은지 살펴보세요" ? "border-rose-200 bg-rose-50" : plan?.verdict === "지금 사는 것은 조심하세요" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">지금 어떻게 할까요?</div>
                    <div className="mt-0.5 text-xl font-black text-slate-900">{plan?.verdict ?? "살펴보는 중이에요"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500">지금 가격</div>
                    <div className="text-lg font-black text-slate-900">{formatPrice(currentPrice)}</div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-700">{plan?.reason ?? "가격을 확인하고 있어요."}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Box label="좋은 신호 점수" value={result ? `${Math.round(result.score)}점` : "-"} help="점수가 높을수록 좋은 조건이 더 많이 모였다는 뜻이에요." />
                <Box label="가격이 너무 올랐나요?" value={heatText} help="많이 오른 뒤에는 바로 사는 것을 조심해야 해요." />
                <Box label="거래가 활발한가요?" value={volumeText} help="사고파는 사람이 많을수록 움직임이 커질 수 있어요." />
                <Box label="가격 방향" value={trendText} help="지금 가격이 위로 가려는지 아래로 가려는지 보여줘요." />
              </div>

              {plan && <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-black text-slate-900">사고팔 가격을 쉽게 보기</div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Box label="사기 좋은 가격" value={`${formatPrice(plan.buyLow)} ~ ${formatPrice(plan.buyHigh)}`} help="이 가격 근처에서 더 떨어지지 않고 버티는지 먼저 봐요." />
                  <Box label="이 아래면 그만 보기" value={formatPrice(plan.stop)} help="여기보다 더 내려가면 생각한 흐름이 틀렸을 수 있어요." />
                  <Box label="첫 번째로 팔 가격" value={formatPrice(plan.target1)} help="여기까지 오르면 일부를 팔아 수익을 챙길 수 있어요." />
                  <Box label="두 번째로 팔 가격" value={formatPrice(plan.target2)} help="더 오르면 남은 물량을 팔지 생각해볼 가격이에요." />
                </div>
              </div>}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-black text-slate-900">얼마어치 살까요?</div>
                <p className="mt-1 text-[10px] text-slate-500">가격이 오를 것 같아 코인을 사는 것을 '매수'라고 해요.</p>
                <div className="mt-2 flex gap-2">
                  <input value={buyAmount} onChange={(e) => setBuyAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-black" placeholder="살 금액을 적어주세요" />
                  <span className="self-center text-xs font-bold text-slate-500">원</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">이 돈으로 약 {estimatedQty > 0 ? estimatedQty.toFixed(8) : "-"} {coin} 살 수 있어요.</div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[50000, 100000, 300000].map((amount) => <button key={amount} onClick={() => setBuyAmount(String(amount))} className="rounded-md bg-slate-100 py-1.5 text-[10px] font-bold">{amount.toLocaleString("ko-KR")}원</button>)}
                </div>
                <button onClick={() => emitOrderIntent("BUY")} disabled={!plan || buyValue < 5000} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600 py-2 text-sm font-black text-white disabled:opacity-40"><TrendingUp className="h-4 w-4" /> 이 금액으로 사는 내용 보기</button>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-black text-slate-900">가지고 있는 코인을 얼마나 팔까요?</div>
                <p className="mt-1 text-[10px] text-slate-500">가지고 있는 코인을 파는 것을 '매도'라고 해요.</p>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[25, 50, 75, 100].map((pct) => <button key={pct} onClick={() => setSellPercent(pct)} className={`rounded-md py-1.5 text-[10px] font-black ${sellPercent === pct ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>{pct}% 팔기</button>)}
                </div>
                <button onClick={() => emitOrderIntent("SELL")} disabled={!plan} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-sm font-black text-white disabled:opacity-40"><TrendingDown className="h-4 w-4" /> 파는 내용 보기</button>
              </div>
            </div>
          </div>
        )}

        {plan && scenario.length > 1 && <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-slate-900">가격이 이렇게 움직일 수도 있어요</div>
              <div className="text-[9px] text-slate-500">미래를 맞히는 그래프가 아니에요. 지금 가격과 움직임을 보고 만든 참고 그림이에요.</div>
            </div>
            <div className="text-[9px] font-bold text-slate-500">사기 좋은 곳 → 첫 번째 팔 곳 → 두 번째 팔 곳</div>
          </div>
          <svg viewBox="0 0 300 96" className="mt-2 h-[105px] w-full" preserveAspectRatio="none" aria-label="쉬운 가격 예상 그림">
            <line x1="0" x2="300" y1="78" y2="78" stroke="#e2e8f0" strokeWidth="1" />
            <polyline points={scenarioPoints} fill="none" stroke="#0f172a" strokeWidth="2.5" />
            {scenario.map((price, i) => <circle key={i} cx={10 + i * 56} cy={86 - ((price - minScenario) / Math.max(1, maxScenario - minScenario)) * 64} r="3" fill="#0f172a" />)}
          </svg>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div><b>사기 좋은 가격</b><br />{formatPrice(plan.buyLow)} ~ {formatPrice(plan.buyHigh)}</div>
            <div><b>첫 번째로 팔 가격</b><br />{formatPrice(plan.target1)}</div>
            <div><b>두 번째로 팔 가격</b><br />{formatPrice(plan.target2)}</div>
          </div>
        </div>}

        <div className="mt-3 flex items-start gap-1 rounded-lg bg-slate-50 px-2 py-2 text-[9px] leading-4 text-slate-500"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> 이 화면은 어디에서 사고팔지 쉽게 보여주는 도우미예요. 버튼을 눌러도 바로 자동으로 주문되지는 않아요.</div>
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
