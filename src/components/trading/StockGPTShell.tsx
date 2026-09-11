import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  ChevronRight,
  Clock3,
  History,
  LineChart,
  MessageSquarePlus,
  PieChart,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { searchStocksFromIndex, SearchableStockItem } from "../../lib/stockDictionary";
import {
  LiveMarketQuote,
  realtimeMarketFeedService,
} from "../../services/realtimeMarketFeedService";
import { RealTimeTradingViewChart } from "./RealTimeTradingViewChart";

interface VerifiedSnapshot {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "UPBIT" | "CRYPTO";
  currentPrice: number;
  candles: Array<{
    time: number | string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  dataValid: boolean;
  source: string | null;
}

type ScanMode = "LONG" | "SHORT";
type ReviewSide = "LONG" | "SHORT" | null;

const NAV_ITEMS = [
  { id: "new", label: "새 분석", icon: MessageSquarePlus },
  { id: "history", label: "이전 대화", icon: History },
  { id: "watch", label: "관심종목", icon: Star },
  { id: "portfolio", label: "보유종목", icon: PieChart },
  { id: "scanner", label: "실시간 스캐너", icon: Activity },
  { id: "alerts", label: "알림 기록", icon: Bell },
] as const;

const QUICK_PROMPTS = [
  "지금 강한 종목 찾아줘",
  "실시간 상승 후보 보여줘",
  "실시간 하락 후보 보여줘",
  "삼성전자 지금 어때?",
] as const;

const STOP_WORDS = new Set([
  "지금",
  "현재",
  "어때",
  "어때?",
  "알려줘",
  "보여줘",
  "종목",
  "주식",
  "분석",
  "해줘",
  "찾아줘",
  "수익",
  "가능성",
  "높은",
  "강한",
  "약한",
  "실시간",
  "롱",
  "숏",
  "long",
  "short",
]);

function mapQuoteMarket(market: LiveMarketQuote["market"]): "KOREA" | "US" | "UPBIT" {
  if (market === "US") return "US";
  if (market === "UPBIT") return "UPBIT";
  return "KOREA";
}

function mapSearchMarket(market: SearchableStockItem["market"]): "KOSPI" | "KOSDAQ" | "UPBIT" | "US" {
  if (market === "US") return "US";
  if (market === "BTC") return "UPBIT";
  return market === "KOSDAQ" ? "KOSDAQ" : "KOSPI";
}

function formatPrice(value: number | null | undefined, market?: LiveMarketQuote["market"]): string {
  if (!Number.isFinite(value) || !value || value <= 0) return "NO_DATA";
  if (market === "US") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}원`;
}

function formatChange(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "NO_DATA";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatCompactNumber(value: number | null | undefined): string {
  if (!Number.isFinite(value) || value == null || value < 0) return "NO_DATA";
  return Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function isUsableQuote(quote: LiveMarketQuote | undefined | null): quote is LiveMarketQuote {
  return Boolean(
    quote &&
      quote.isVerified &&
      quote.status === "LIVE" &&
      Number.isFinite(quote.price) &&
      quote.price != null &&
      quote.price > 0,
  );
}

function resolveStockFromQuestion(question: string): SearchableStockItem | null {
  const normalized = question.trim();
  if (!normalized) return null;

  const exact = searchStocksFromIndex(normalized, 1, "ALL");
  if (exact.length > 0) return exact[0];

  const tokens = normalized
    .replace(/[?!,.()[\]{}]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token.toLowerCase()))
    .sort((a, b) => b.length - a.length);

  for (const token of tokens) {
    const found = searchStocksFromIndex(token, 1, "ALL");
    if (found.length > 0) return found[0];
  }

  return null;
}

function ElementaryExplanation({
  quote,
  chartState,
  technicalScore,
}: {
  quote: LiveMarketQuote | null;
  chartState: string;
  technicalScore: number | null;
}) {
  if (!quote) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
        실시간 데이터가 확인되면 아주 쉬운 말로 설명해 드려요.
      </div>
    );
  }

  const change = quote.changeRate;
  const directionText =
    Number.isFinite(change) && Number(change) > 0
      ? `오늘 가격이 기준 가격보다 ${Math.abs(Number(change)).toFixed(2)}% 위에 있어요.`
      : Number.isFinite(change) && Number(change) < 0
        ? `오늘 가격이 기준 가격보다 ${Math.abs(Number(change)).toFixed(2)}% 아래에 있어요.`
        : "등락률 정보는 아직 확인되지 않았어요.";

  const stateText =
    chartState === "BUY" || chartState === "BUY_WATCH"
      ? "차트 엔진은 지금 올라갈 힘이 생기는지 관찰하고 있어요. 바로 산다는 뜻은 아니에요."
      : chartState === "SELL" || chartState === "SELL_WATCH"
        ? "차트 엔진은 지금 내려갈 위험이 커지는지 관찰하고 있어요. 바로 판다는 뜻은 아니에요."
        : "지금은 차트 엔진이 뚜렷한 매수·매도 결론을 내리지 않았어요.";

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
        <Sparkles className="h-4 w-4 text-cyan-300" />
        초등학생도 이해하는 설명
      </div>
      <div className="space-y-2 text-sm leading-6 text-slate-300">
        <p>① 현재 확인된 실제 가격은 <strong className="text-white">{formatPrice(quote.price, quote.market)}</strong>이에요.</p>
        <p>② {directionText}</p>
        <p>③ 실제 누적 거래량은 <strong className="text-white">{formatCompactNumber(quote.volume)}</strong>이에요. 값이 없으면 NO_DATA로 표시해요.</p>
        <p>④ {stateText}</p>
        {technicalScore != null && technicalScore > 0 ? (
          <p>⑤ 기술 점수는 <strong className="text-violet-300">{technicalScore}/100</strong>이에요. 이 점수는 수익 확률이 아니라 차트 조건 점수예요.</p>
        ) : (
          <p>⑤ 계산할 실제 캔들이 부족하면 기술 점수도 만들지 않아요.</p>
        )}
      </div>
    </div>
  );
}

export default function StockGPTShell() {
  const [activeNav, setActiveNav] = useState<(typeof NAV_ITEMS)[number]["id"]>("new");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [quotes, setQuotes] = useState<LiveMarketQuote[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>("LONG");
  const [scanResults, setScanResults] = useState<LiveMarketQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<LiveMarketQuote | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [snapshot, setSnapshot] = useState<VerifiedSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("종목을 선택하면 실제 캔들 데이터를 확인합니다.");
  const [chartState, setChartState] = useState<string>("NO_TRADE");
  const [technicalScore, setTechnicalScore] = useState<number | null>(null);
  const [reviewSide, setReviewSide] = useState<ReviewSide>(null);

  useEffect(() => {
    const unsubscribe = realtimeMarketFeedService.subscribe((quoteMap) => {
      const unique = new Map<string, LiveMarketQuote>();
      quoteMap.forEach((quote) => {
        const existing = unique.get(quote.symbol);
        if (!existing || quote.receivedAt >= existing.receivedAt) unique.set(quote.symbol, quote);
      });
      setQuotes(Array.from(unique.values()));
    });
    return unsubscribe;
  }, []);

  const liveQuotes = useMemo(() => quotes.filter(isUsableQuote), [quotes]);

  const strongestQuotes = useMemo(() => {
    return [...liveQuotes]
      .filter((quote) => Number.isFinite(quote.changeRate))
      .sort((a, b) => {
        const changeDiff = Number(b.changeRate) - Number(a.changeRate);
        if (changeDiff !== 0) return changeDiff;
        return Number(b.tradeValue || 0) - Number(a.tradeValue || 0);
      })
      .slice(0, 5);
  }, [liveQuotes]);

  const weakestQuotes = useMemo(() => {
    return [...liveQuotes]
      .filter((quote) => Number.isFinite(quote.changeRate))
      .sort((a, b) => Number(a.changeRate) - Number(b.changeRate))
      .slice(0, 5);
  }, [liveQuotes]);

  const staleCount = useMemo(
    () => quotes.filter((quote) => quote.status === "STALE" || !quote.isVerified).length,
    [quotes],
  );

  const selectQuote = async (quote: LiveMarketQuote, preferredName?: string) => {
    if (!isUsableQuote(quote)) return;

    setSelectedQuote(quote);
    setSelectedName(preferredName || quote.name || quote.symbol);
    setSnapshot(null);
    setSnapshotLoading(true);
    setSnapshotMessage("실제 OHLCV 캔들을 확인하고 있어요.");
    setChartState("NO_TRADE");
    setTechnicalScore(null);
    setReviewSide(null);

    realtimeMarketFeedService.registerSymbol(quote.symbol, quote.market);

    try {
      const response = await fetch(`/api/market/v13/snapshot/${encodeURIComponent(quote.symbol)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setSnapshotMessage("과거 캔들 데이터는 NO_DATA예요. 실시간 틱이 들어오면 차트가 만들어집니다.");
        return;
      }

      const payload = await response.json();
      const price = Number(payload?.currentPrice);
      const rawCandles = Array.isArray(payload?.candles) ? payload.candles : [];
      const validCandles = rawCandles.filter((candle: any) => {
        return (
          candle &&
          Number.isFinite(Number(candle.open)) &&
          Number.isFinite(Number(candle.high)) &&
          Number.isFinite(Number(candle.low)) &&
          Number.isFinite(Number(candle.close)) &&
          Number.isFinite(Number(candle.volume)) &&
          Number(candle.open) > 0 &&
          Number(candle.high) > 0 &&
          Number(candle.low) > 0 &&
          Number(candle.close) > 0 &&
          Number(candle.volume) >= 0
        );
      });

      if (payload?.dataValid === true && Number.isFinite(price) && price > 0) {
        setSnapshot({
          symbol: String(payload.symbol || quote.symbol),
          name: String(payload.name || preferredName || quote.name || quote.symbol),
          market:
            payload.market === "US"
              ? "US"
              : payload.market === "UPBIT" || payload.market === "BTC" || payload.market === "CRYPTO"
                ? "UPBIT"
                : "KOREA",
          currentPrice: price,
          candles: validCandles.map((candle: any) => ({
            time: candle.time ?? candle.timestamp,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: Number(candle.volume),
          })),
          dataValid: true,
          source: typeof payload.source === "string" ? payload.source : quote.source,
        });
        setSnapshotMessage(
          validCandles.length > 0
            ? `검증된 실제 캔들 ${validCandles.length}개를 불러왔어요.`
            : "현재가는 확인됐지만 과거 캔들은 NO_DATA예요. 실시간 틱으로 이어서 그립니다.",
        );
      } else {
        setSnapshotMessage("실제 스냅샷 검증에 실패해서 차트용 과거 데이터는 사용하지 않아요.");
      }
    } catch {
      setSnapshotMessage("실제 스냅샷 API 연결에 실패했어요. 가짜 캔들로 대신하지 않습니다.");
    } finally {
      setSnapshotLoading(false);
    }
  };

  const findLiveQuoteForStock = (stock: SearchableStockItem): LiveMarketQuote | null => {
    const market = mapSearchMarket(stock.market);
    realtimeMarketFeedService.registerSymbol(stock.symbol, market);
    const exact = realtimeMarketFeedService.getQuote(stock.symbol);
    return isUsableQuote(exact) ? exact : null;
  };

  const runVerifiedScan = (mode: ScanMode, question: string) => {
    const candidates = mode === "LONG" ? strongestQuotes : weakestQuotes;
    setScanMode(mode);
    setScanResults(candidates);
    setSelectedQuote(null);
    setSnapshot(null);
    setSnapshotMessage(
      candidates.length > 0
        ? "실제 검증 시세가 있는 종목만 보여줍니다. 후보를 눌러 차트까지 확인하세요."
        : "현재 검증된 실시간 시세 후보가 없습니다. 가짜 종목은 채우지 않습니다.",
    );
    setSubmittedQuery(question);
  };

  const submitQuestion = async (question = query) => {
    const clean = question.trim();
    if (!clean) return;
    setQuery(clean);
    setSubmittedQuery(clean);

    const stock = resolveStockFromQuestion(clean);
    if (stock) {
      const existing = findLiveQuoteForStock(stock);
      if (existing) {
        await selectQuote(existing, stock.name);
      } else {
        setSelectedQuote(null);
        setSnapshot(null);
        setScanResults([]);
        setSelectedName(stock.name);
        setSnapshotMessage(
          `${stock.name}(${stock.symbol}) 종목은 찾았지만 지금 검증된 실제 시세가 없습니다. NO_DATA로 표시합니다.`,
        );
      }
      return;
    }

    const lower = clean.toLowerCase();
    const wantsShort = lower.includes("숏") || lower.includes("하락") || lower.includes("약한") || lower.includes("short");
    runVerifiedScan(wantsShort ? "SHORT" : "LONG", clean);
  };

  const handleCandidateClick = async (quote: LiveMarketQuote) => {
    await selectQuote(quote);
  };

  const chartPrice = snapshot?.currentPrice || selectedQuote?.price || 0;
  const chartMarket = snapshot?.market || (selectedQuote ? mapQuoteMarket(selectedQuote.market) : "KOREA");
  const chartName = snapshot?.name || selectedName || selectedQuote?.name || selectedQuote?.symbol || "";
  const chartCandles = snapshot?.candles || [];
  const canRenderChart = Boolean(selectedQuote && Number.isFinite(chartPrice) && chartPrice > 0);

  return (
    <div className="min-h-screen bg-[#050b16] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-slate-800/80 bg-[#07101d] xl:flex xl:flex-col">
          <div className="border-b border-slate-800/80 px-5 py-5">
            <div className="flex items-center gap-2 text-xl font-black tracking-tight">
              <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
                <Bot className="h-5 w-5" />
              </div>
              Stock GPT
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">질문 하나로 실제 시세부터 차트까지.</p>
          </div>

          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveNav(id);
                  if (id === "new") {
                    setSubmittedQuery("");
                    setScanResults([]);
                    setSelectedQuote(null);
                    setSnapshot(null);
                    setSnapshotMessage("종목을 선택하면 실제 캔들 데이터를 확인합니다.");
                  }
                  if (id === "scanner") runVerifiedScan("LONG", "실시간 강세 종목 찾아줘");
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  activeNav === id
                    ? "bg-cyan-500/12 text-cyan-200 ring-1 ring-cyan-500/20"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> ZERO FAKE DATA
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                값이 없으면 0이나 예시 숫자로 채우지 않고 NO_DATA로 표시합니다.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-[radial-gradient(circle_at_top,#0c1a2e_0%,#050b16_42%)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="sticky top-0 z-30 -mx-2 rounded-2xl border border-slate-800/80 bg-[#07101d]/95 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitQuestion();
                }}
                className="flex items-center gap-3"
              >
                <Search className="ml-2 h-5 w-5 shrink-0 text-cyan-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="무엇을 분석할까요? 예: 현재 지금 강한 종목들이 뭐야?"
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 sm:text-base"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 p-3 text-slate-950 transition hover:bg-cyan-300"
                  aria-label="질문 보내기"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setQuery(prompt);
                    void submitQuestion(prompt);
                  }}
                  className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-200"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {!submittedQuery && !selectedQuote && (
              <section className="flex min-h-[62vh] items-center justify-center py-12 text-center">
                <div className="max-w-2xl">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">주식 전용 ChatGPT</h1>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                    종목 이름을 물어보거나, 지금 강한 종목을 찾아달라고 입력하세요. 실제 데이터가 확인된 것만 화면에 표시합니다.
                  </p>
                  <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left text-sm text-slate-400">
                    <strong className="text-white">예:</strong> “삼성전자 지금 어때?”, “실시간 상승 후보 보여줘”, “실시간 하락 후보 보여줘”
                  </div>
                </div>
              </section>
            )}

            {submittedQuery && (
              <section className="mt-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-white">Stock GPT</strong>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        VERIFIED DATA ONLY
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">“{submittedQuery}” 질문을 실제로 확인 가능한 시세만 사용해서 처리했어요.</p>
                  </div>
                </div>
              </section>
            )}

            {scanResults.length > 0 && !selectedQuote && (
              <section className="mt-5 rounded-3xl border border-slate-800 bg-[#07101d]/90 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-base font-black text-white">
                      {scanMode === "LONG" ? <TrendingUp className="h-5 w-5 text-emerald-300" /> : <TrendingDown className="h-5 w-5 text-rose-300" />}
                      {scanMode === "LONG" ? "실시간 강세 후보" : "실시간 약세 후보"}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">수익 보장이 아닙니다. 검증된 현재 시세의 등락률과 거래대금을 기준으로 정렬했습니다.</p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-mono text-slate-400">
                    LIVE {scanResults.length}개
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {scanResults.map((quote, index) => (
                    <button
                      key={`${quote.market}-${quote.symbol}`}
                      type="button"
                      onClick={() => void handleCandidateClick(quote)}
                      className="group rounded-2xl border border-slate-800 bg-slate-950/65 p-4 text-left transition hover:border-cyan-500/40 hover:bg-cyan-950/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black text-cyan-400">#{index + 1} {quote.market}</span>
                          <div className="mt-1 text-base font-black text-white">{quote.name}</div>
                          <div className="mt-0.5 text-xs font-mono text-slate-500">{quote.symbol}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-slate-500">현재가</div>
                          <div className="mt-1 font-mono font-black text-white">{formatPrice(quote.price, quote.market)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">등락률</div>
                          <div className={`mt-1 font-mono font-black ${Number(quote.changeRate) >= 0 ? "text-rose-300" : "text-blue-300"}`}>
                            {formatChange(quote.changeRate)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">거래량</div>
                          <div className="mt-1 font-mono text-slate-300">{formatCompactNumber(quote.volume)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">출처</div>
                          <div className="mt-1 truncate font-mono text-emerald-300">{quote.source || "NO_DATA"}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {submittedQuery && scanResults.length === 0 && !selectedQuote && snapshotMessage && (
              <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 text-sm text-amber-200">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{snapshotMessage}</span>
                </div>
              </div>
            )}

            {selectedQuote && (
              <section className="mt-5 space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-[#07101d]/95 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-white">{chartName}</h2>
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-mono text-cyan-300">{selectedQuote.symbol}</span>
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300">
                          {selectedQuote.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <span className="text-2xl font-black tracking-tight text-white">{formatPrice(selectedQuote.price, selectedQuote.market)}</span>
                        <span className={`font-mono text-sm font-black ${Number(selectedQuote.changeRate) >= 0 ? "text-rose-300" : "text-blue-300"}`}>
                          {formatChange(selectedQuote.changeRate)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                        <div className="text-slate-500">기술 상태</div>
                        <div className="mt-1 font-black text-cyan-300">{technicalScore && technicalScore > 0 ? chartState : "분석 대기"}</div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                        <div className="text-slate-500">Technical Score</div>
                        <div className="mt-1 font-black text-violet-300">{technicalScore && technicalScore > 0 ? `${technicalScore}/100` : "NO_DATA"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-400">SOURCE {selectedQuote.source || "NO_DATA"}</span>
                    <span className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-400">TRUST {selectedQuote.trust}</span>
                    <span className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-400">VOLUME {formatCompactNumber(selectedQuote.volume)}</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-[#07101d]/95 p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      <LineChart className="h-4 w-4 text-cyan-300" /> 실시간 트레이딩 차트
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      {snapshotLoading && <Clock3 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{snapshotMessage}</span>
                    </div>
                  </div>

                  {canRenderChart ? (
                    <RealTimeTradingViewChart
                      symbol={selectedQuote.symbol}
                      name={chartName}
                      market={chartMarket}
                      initialPrice={chartPrice}
                      initialCandles={chartCandles}
                      timeframe="5m"
                      onStateChange={(nextState, score) => {
                        setChartState(nextState);
                        setTechnicalScore(Number.isFinite(score) && score > 0 ? score : null);
                      }}
                    />
                  ) : (
                    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 text-center text-sm text-slate-500">
                      실제 가격이 확인되지 않아 차트를 만들지 않습니다. NO_DATA
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                  <ElementaryExplanation quote={selectedQuote} chartState={chartState} technicalScore={technicalScore} />
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => setReviewSide("LONG")}
                      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/12 p-4 text-left transition hover:bg-emerald-500/20"
                    >
                      <ArrowUpRight className="h-5 w-5 text-emerald-300" />
                      <div className="mt-2 font-black text-emerald-200">LONG 검토</div>
                      <div className="mt-1 text-xs text-emerald-300/70">주문 전 확인만</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewSide("SHORT")}
                      className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-left transition hover:bg-rose-500/18"
                    >
                      <ArrowDownRight className="h-5 w-5 text-rose-300" />
                      <div className="mt-2 font-black text-rose-200">SHORT 검토</div>
                      <div className="mt-1 text-xs text-rose-300/70">주문 전 확인만</div>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="hidden border-l border-slate-800/80 bg-[#07101d] xl:block">
          <div className="sticky top-0 space-y-4 p-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-white">
                  <BarChart3 className="h-4 w-4 text-cyan-300" /> 시장 데이터 상태
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-900 p-3">
                  <div className="text-[10px] text-slate-500">검증 LIVE 종목</div>
                  <div className="mt-1 text-lg font-black text-emerald-300">{liveQuotes.length}</div>
                </div>
                <div className="rounded-xl bg-slate-900 p-3">
                  <div className="text-[10px] text-slate-500">STALE/미검증</div>
                  <div className="mt-1 text-lg font-black text-amber-300">{staleCount}</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-800 bg-[#07101d] p-3 text-xs leading-5 text-slate-500">
                KOSPI/KOSDAQ 지수 값은 별도 검증 데이터가 연결되지 않으면 <strong className="text-slate-300">NO_DATA</strong>로 둡니다.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <TrendingUp className="h-4 w-4 text-emerald-300" /> 실시간 강세 종목
              </div>
              <div className="mt-3 space-y-1">
                {strongestQuotes.length > 0 ? strongestQuotes.map((quote, index) => (
                  <button
                    key={`right-${quote.market}-${quote.symbol}`}
                    type="button"
                    onClick={() => void handleCandidateClick(quote)}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left hover:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-300">{index + 1}. {quote.name}</div>
                      <div className="text-[10px] font-mono text-slate-600">{quote.symbol}</div>
                    </div>
                    <span className="ml-2 text-xs font-mono font-black text-rose-300">{formatChange(quote.changeRate)}</span>
                  </button>
                )) : (
                  <div className="py-4 text-center text-xs text-slate-600">NO_DATA</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <AlertTriangle className="h-4 w-4 text-amber-300" /> 위험 신호
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2">
                  <span className="text-slate-400">STALE/미검증 데이터</span>
                  <strong className={staleCount > 0 ? "text-amber-300" : "text-emerald-300"}>{staleCount}개</strong>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#07101d] px-3 py-2 leading-5 text-slate-500">
                  확인할 실제 값이 없을 때 위험 신호도 만들어내지 않습니다.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {reviewSide && selectedQuote && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#091321] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-xs font-black ${reviewSide === "LONG" ? "text-emerald-300" : "text-rose-300"}`}>{reviewSide} REVIEW</div>
                <h3 className="mt-1 text-lg font-black text-white">{chartName} 거래 검토</h3>
              </div>
              <button type="button" onClick={() => setReviewSide(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">종목</span><strong>{chartName} ({selectedQuote.symbol})</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">현재가</span><strong>{formatPrice(selectedQuote.price, selectedQuote.market)}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">데이터</span><strong className="text-emerald-300">{selectedQuote.status} / {selectedQuote.source || "NO_DATA"}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">차트 상태</span><strong>{technicalScore && technicalScore > 0 ? chartState : "NO_DATA"}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">기술 점수</span><strong>{technicalScore && technicalScore > 0 ? `${technicalScore}/100` : "NO_DATA"}</strong></div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3 text-xs leading-5 text-amber-200">
              이 창은 검토 단계입니다. 수량·금액·손절·목표가가 실제 데이터로 검증된 주문 승인 게이트에 연결되기 전에는 주문을 전송하지 않습니다.
            </div>

            <button
              type="button"
              onClick={() => setReviewSide(null)}
              className="mt-4 w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-white hover:bg-slate-700"
            >
              확인하고 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
