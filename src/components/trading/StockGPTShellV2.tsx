import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  ChevronRight,
  CircleUserRound,
  Crown,
  Gift,
  History,
  LineChart,
  MessageSquarePlus,
  PieChart,
  Search,
  Send,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { searchStocksFromIndex, SearchableStockItem } from "../../lib/stockDictionary";
import { MASTER_STOCK_UNIVERSE_METADATA } from "../../data/stockUniverse";
import { LiveMarketQuote, realtimeMarketFeedService } from "../../services/realtimeMarketFeedService";
import { RealTimeTradingViewChart } from "./RealTimeTradingViewChart";
import StockGPTFeaturePanels from "./StockGPTFeaturePanels";
import StockGPTVerifiedFinancialPanel from "./StockGPTVerifiedFinancialPanel";
import StockGPTVerifiedNewsPanel from "./StockGPTVerifiedNewsPanel";

type Candle = {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type VerifiedSnapshot = {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "UPBIT";
  currentPrice: number;
  candles: Candle[];
  source: string | null;
};

type PatternFacts = {
  support: number | null;
  resistance: number | null;
  breakout: boolean;
  pullback: boolean;
  pullbackLevel: number | null;
  volumeSurge: boolean;
  volumeRatio: number | null;
  candlePattern: string | null;
};

type ReviewSide = "LONG" | "SHORT" | null;
type ScanMode = "LONG" | "SHORT";
type NavId = "new" | "history" | "watch" | "portfolio" | "scanner" | "alerts";
type StockTab = "chart" | "overview" | "analysis" | "financials" | "news" | "community";
type MarketSummary = {
  market: "KOSPI" | "KOSDAQ";
  averageChange: number | null;
  liveCount: number;
};

const NAV_ITEMS: Array<{ id: NavId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "new", label: "새 분석", icon: MessageSquarePlus },
  { id: "history", label: "이전 대화", icon: History },
  { id: "watch", label: "관심종목", icon: Star },
  { id: "portfolio", label: "보유종목", icon: PieChart },
  { id: "scanner", label: "실시간 스캐너", icon: Activity },
  { id: "alerts", label: "알림 기록", icon: Bell },
];

const STOCK_TABS: Array<{ id: StockTab; label: string }> = [
  { id: "chart", label: "차트" },
  { id: "overview", label: "기업 개요" },
  { id: "analysis", label: "AI 분석 리포트" },
  { id: "financials", label: "재무 정보" },
  { id: "news", label: "관련 뉴스" },
  { id: "community", label: "토론 커뮤니티" },
];

const QUICK_PROMPTS = [
  "🔥 오늘의 강한 종목 찾아줘",
  "AI 관련주 중에서 강한 종목은?",
  "5분봉 LONG 좋은 종목 찾아줘",
  "지금 거래량 터지는 종목 보여줘",
] as const;

const STOP_WORDS = new Set([
  "지금", "현재", "어때", "어때?", "알려줘", "보여줘", "종목", "주식", "분석", "해줘",
  "찾아줘", "수익", "가능성", "높은", "강한", "약한", "실시간", "롱", "숏", "long", "short",
]);

function isUsableQuote(quote: LiveMarketQuote | undefined | null): quote is LiveMarketQuote {
  return Boolean(
    quote &&
      quote.isVerified &&
      quote.status === "LIVE" &&
      quote.price != null &&
      Number.isFinite(quote.price) &&
      quote.price > 0,
  );
}

function formatPrice(
  value: number | null | undefined,
  market?: LiveMarketQuote["market"] | VerifiedSnapshot["market"],
): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "NO_DATA";
  if (market === "US") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}원`;
}

function formatChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return "NO_DATA";
  return Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatTimestamp(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "NO_DATA";
  return new Date(value).toLocaleString("ko-KR", { hour12: false });
}

function quoteMarketToChart(market: LiveMarketQuote["market"]): VerifiedSnapshot["market"] {
  if (market === "US") return "US";
  if (market === "UPBIT") return "UPBIT";
  return "KOREA";
}

function searchMarketToFeed(market: SearchableStockItem["market"]): "KOSPI" | "UPBIT" | "US" {
  if (market === "US") return "US";
  if (market === "BTC") return "UPBIT";
  return "KOSPI";
}

function resolveStock(question: string): SearchableStockItem | null {
  const clean = question.trim();
  if (!clean) return null;

  const direct = searchStocksFromIndex(clean, 1, "ALL");
  if (direct.length > 0) return direct[0];

  const tokens = clean
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

function analyzeRealPatterns(candles: Candle[]): PatternFacts | null {
  if (!Array.isArray(candles) || candles.length < 21) return null;

  const latest = candles[candles.length - 1];
  const previous20 = candles.slice(-21, -1);
  const resistance = Math.max(...previous20.map((c) => c.high));
  const support = Math.min(...previous20.map((c) => c.low));
  const averageVolume = previous20.reduce((sum, c) => sum + c.volume, 0) / previous20.length;
  const volumeRatio = averageVolume > 0 ? latest.volume / averageVolume : null;
  const breakout = latest.close > resistance;
  const volumeSurge = volumeRatio != null && volumeRatio >= 1.5;

  let pullback = false;
  let pullbackLevel: number | null = null;
  const searchStart = Math.max(20, candles.length - 30);
  for (let i = searchStart; i < candles.length - 1; i += 1) {
    const prior = candles.slice(i - 20, i);
    const level = Math.max(...prior.map((c) => c.high));
    if (candles[i].close <= level) continue;
    const after = candles.slice(i + 1);
    const retest = after.some(
      (c) => c.low <= level * 1.01 && c.low >= level * 0.97 && c.close >= level * 0.995,
    );
    if (retest) {
      pullback = true;
      pullbackLevel = level;
    }
  }

  const prev = candles[candles.length - 2];
  const range = latest.high - latest.low;
  const body = Math.abs(latest.close - latest.open);
  const lowerWick = Math.min(latest.open, latest.close) - latest.low;
  const upperWick = latest.high - Math.max(latest.open, latest.close);

  const bullishEngulfing =
    prev.close < prev.open && latest.close > latest.open && latest.open <= prev.close && latest.close >= prev.open;
  const bearishEngulfing =
    prev.close > prev.open && latest.close < latest.open && latest.open >= prev.close && latest.close <= prev.open;
  const hammer = range > 0 && body > 0 && lowerWick >= body * 2 && upperWick <= body;
  const doji = range > 0 && body / range <= 0.1;

  let candlePattern: string | null = null;
  if (bullishEngulfing) candlePattern = "상승 장악형";
  else if (bearishEngulfing) candlePattern = "하락 장악형";
  else if (hammer) candlePattern = "망치형";
  else if (doji) candlePattern = "도지";

  return {
    support: Number.isFinite(support) ? support : null,
    resistance: Number.isFinite(resistance) ? resistance : null,
    breakout,
    pullback,
    pullbackLevel,
    volumeSurge,
    volumeRatio: volumeRatio != null && Number.isFinite(volumeRatio) ? volumeRatio : null,
    candlePattern,
  };
}

function PatternOverlay({ facts, market }: { facts: PatternFacts | null; market: VerifiedSnapshot["market"] }) {
  if (!facts) return null;
  return (
    <div className="pointer-events-none absolute inset-x-4 top-16 z-20 flex flex-wrap gap-2">
      {facts.resistance != null && (
        <span className="rounded-md border border-rose-500/40 bg-[#08111f]/95 px-2 py-1 text-[10px] font-black text-rose-200">
          저항선 {formatPrice(facts.resistance, market)}
        </span>
      )}
      {facts.support != null && (
        <span className="rounded-md border border-sky-500/40 bg-[#08111f]/95 px-2 py-1 text-[10px] font-black text-sky-200">
          지지선 {formatPrice(facts.support, market)}
        </span>
      )}
      {facts.breakout && (
        <span className="rounded-md border border-emerald-500/40 bg-emerald-950/90 px-2 py-1 text-[10px] font-black text-emerald-200">돌파</span>
      )}
      {facts.pullback && (
        <span className="rounded-md border border-amber-500/40 bg-amber-950/90 px-2 py-1 text-[10px] font-black text-amber-200">
          눌림목 {facts.pullbackLevel != null ? formatPrice(facts.pullbackLevel, market) : ""}
        </span>
      )}
      {facts.volumeSurge && (
        <span className="rounded-md border border-violet-500/40 bg-violet-950/90 px-2 py-1 text-[10px] font-black text-violet-200">
          거래량 급증 {facts.volumeRatio != null ? `${facts.volumeRatio.toFixed(1)}x` : ""}
        </span>
      )}
      {facts.candlePattern && (
        <span className="rounded-md border border-cyan-500/40 bg-cyan-950/90 px-2 py-1 text-[10px] font-black text-cyan-200">{facts.candlePattern}</span>
      )}
    </div>
  );
}

function TruthUnavailablePanel({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center p-6" data-testid="stock-gpt-no-data-tab">
      <div className="max-w-xl rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6 text-center">
        <AlertTriangle className="mx-auto h-7 w-7 text-amber-300" />
        <div className="mt-3 text-base font-black text-white">{title}: NO_DATA</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">{reason}</p>
        <p className="mt-3 text-[11px] leading-5 text-amber-300/80">검증되지 않은 값이나 예시 데이터를 대신 넣지 않습니다.</p>
      </div>
    </div>
  );
}

export default function StockGPTShellV2() {
  const [activeNav, setActiveNav] = useState<NavId>("new");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [quotes, setQuotes] = useState<LiveMarketQuote[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>("LONG");
  const [scanResults, setScanResults] = useState<LiveMarketQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<LiveMarketQuote | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [pendingStock, setPendingStock] = useState<SearchableStockItem | null>(null);
  const [snapshot, setSnapshot] = useState<VerifiedSnapshot | null>(null);
  const [snapshotMessage, setSnapshotMessage] = useState("종목을 선택하면 실제 OHLCV를 확인합니다.");
  const [chartState, setChartState] = useState("NO_TRADE");
  const [technicalScore, setTechnicalScore] = useState<number | null>(null);
  const [reviewSide, setReviewSide] = useState<ReviewSide>(null);
  const [stockTab, setStockTab] = useState<StockTab>("chart");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return realtimeMarketFeedService.subscribe((quoteMap) => {
      const unique = new Map<string, LiveMarketQuote>();
      quoteMap.forEach((quote) => {
        const key = `${quote.market}:${quote.symbol}`;
        const old = unique.get(key);
        if (!old || quote.receivedAt >= old.receivedAt) unique.set(key, quote);
      });
      setQuotes(Array.from(unique.values()));
    });
  }, []);

  const liveQuotes = useMemo(() => quotes.filter(isUsableQuote), [quotes]);

  const strongest = useMemo(
    () =>
      [...liveQuotes]
        .filter((quote) => quote.changeRate != null && Number.isFinite(quote.changeRate))
        .sort((a, b) => {
          const byChange = Number(b.changeRate) - Number(a.changeRate);
          return byChange !== 0 ? byChange : Number(b.tradeValue ?? 0) - Number(a.tradeValue ?? 0);
        })
        .slice(0, 5),
    [liveQuotes],
  );

  const weakest = useMemo(
    () =>
      [...liveQuotes]
        .filter((quote) => quote.changeRate != null && Number.isFinite(quote.changeRate))
        .sort((a, b) => Number(a.changeRate) - Number(b.changeRate))
        .slice(0, 5),
    [liveQuotes],
  );

  const staleCount = useMemo(
    () => quotes.filter((quote) => quote.status === "STALE" || !quote.isVerified).length,
    [quotes],
  );

  const marketSummaries = useMemo<MarketSummary[]>(() => {
    return (["KOSPI", "KOSDAQ"] as const).map((market) => {
      const rows = liveQuotes.filter(
        (quote) => quote.market === market && quote.changeRate != null && Number.isFinite(quote.changeRate),
      );
      return {
        market,
        liveCount: rows.length,
        averageChange: rows.length > 0 ? rows.reduce((sum, quote) => sum + Number(quote.changeRate), 0) / rows.length : null,
      };
    });
  }, [liveQuotes]);

  const strongThemes = useMemo(() => {
    const meta = new Map(MASTER_STOCK_UNIVERSE_METADATA.map((item) => [item.symbol.replace(/^KRW-/, ""), item]));
    const groups = new Map<string, { sum: number; count: number }>();
    liveQuotes.forEach((quote) => {
      if (quote.changeRate == null || !Number.isFinite(quote.changeRate)) return;
      const item = meta.get(quote.symbol.replace(/^KRW-/, ""));
      const theme = item?.theme?.trim();
      if (!theme) return;
      const current = groups.get(theme) ?? { sum: 0, count: 0 };
      current.sum += Number(quote.changeRate);
      current.count += 1;
      groups.set(theme, current);
    });
    return Array.from(groups.entries())
      .map(([theme, row]) => ({ theme, averageChange: row.count > 0 ? row.sum / row.count : null, count: row.count }))
      .filter((row) => row.averageChange != null)
      .sort((a, b) => Number(b.averageChange) - Number(a.averageChange))
      .slice(0, 5);
  }, [liveQuotes]);

  const patternFacts = useMemo(() => analyzeRealPatterns(snapshot?.candles ?? []), [snapshot?.candles]);

  const selectedMeta = useMemo(() => {
    if (!selectedQuote) return null;
    const clean = selectedQuote.symbol.replace(/^KRW-/, "").toUpperCase();
    return MASTER_STOCK_UNIVERSE_METADATA.find((item) => item.symbol.replace(/^KRW-/, "").toUpperCase() === clean) ?? null;
  }, [selectedQuote]);

  const loadSnapshot = async (quote: LiveMarketQuote, preferredName?: string) => {
    setSelectedQuote(quote);
    setSelectedName(preferredName || quote.name || quote.symbol);
    setPendingStock(null);
    setSnapshot(null);
    setSnapshotMessage("실제 OHLCV 캔들을 확인하고 있어요.");
    setChartState("NO_TRADE");
    setTechnicalScore(null);
    setReviewSide(null);
    setStockTab("chart");

    realtimeMarketFeedService.registerSymbol(quote.symbol, quote.market);

    try {
      const response = await fetch(`/api/market/v13/snapshot/${encodeURIComponent(quote.symbol)}`, { cache: "no-store" });
      if (!response.ok) {
        setSnapshotMessage("과거 캔들은 NO_DATA예요. 가짜 캔들을 대신 넣지 않습니다.");
        return;
      }

      const payload = await response.json();
      const currentPrice = Number(payload?.currentPrice);
      const raw = Array.isArray(payload?.candles) ? payload.candles : [];
      const candles: Candle[] = raw
        .filter((c: any) => {
          const o = Number(c?.open);
          const h = Number(c?.high);
          const l = Number(c?.low);
          const close = Number(c?.close);
          const volume = Number(c?.volume);
          return (
            Number.isFinite(o) &&
            Number.isFinite(h) &&
            Number.isFinite(l) &&
            Number.isFinite(close) &&
            Number.isFinite(volume) &&
            o > 0 && h > 0 && l > 0 && close > 0 && volume >= 0 &&
            (typeof c?.time === "string" || typeof c?.time === "number" || typeof c?.timestamp === "string" || typeof c?.timestamp === "number")
          );
        })
        .map((c: any) => ({
          time: c.time ?? c.timestamp,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));

      if (payload?.dataValid !== true || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        setSnapshotMessage("스냅샷 검증에 실패했습니다. 실제 값이 아니므로 차트 초기값에 사용하지 않습니다.");
        return;
      }

      const market: VerifiedSnapshot["market"] =
        payload.market === "US"
          ? "US"
          : payload.market === "UPBIT" || payload.market === "BTC" || payload.market === "CRYPTO"
            ? "UPBIT"
            : "KOREA";

      setSnapshot({
        symbol: String(payload.symbol || quote.symbol),
        name: String(payload.name || preferredName || quote.name || quote.symbol),
        market,
        currentPrice,
        candles,
        source: typeof payload.source === "string" ? payload.source : quote.source,
      });
      setSnapshotMessage(candles.length > 0 ? `검증된 실제 캔들 ${candles.length}개` : "현재가는 확인됐지만 과거 캔들은 NO_DATA");
    } catch {
      setSnapshotMessage("실제 스냅샷 API 연결 실패. 합성 캔들은 생성하지 않습니다.");
    }
  };

  useEffect(() => {
    if (!pendingStock) return;
    const quote = realtimeMarketFeedService.getQuote(pendingStock.symbol);
    if (isUsableQuote(quote)) void loadSnapshot(quote, pendingStock.name);
  }, [quotes, pendingStock]);

  const runScan = (mode: ScanMode, question: string) => {
    setSubmittedQuery(question);
    setScanMode(mode);
    const next = mode === "LONG" ? strongest : weakest;
    setScanResults(next);
    setSelectedQuote(null);
    setPendingStock(null);
    setSnapshot(null);
    setSnapshotMessage(
      next.length > 0
        ? "검증된 LIVE 시세만 정렬했습니다. 후보를 눌러 실제 차트를 확인하세요."
        : "검증된 LIVE 후보가 없습니다. 빈칸을 가짜 종목으로 채우지 않습니다.",
    );
  };

  const submitQuestion = (text = query) => {
    const clean = text.trim();
    if (!clean) return;
    setActiveNav("new");
    setQuery(clean);
    setSubmittedQuery(clean);
    setScanResults([]);

    const stock = resolveStock(clean);
    if (stock) {
      const market = searchMarketToFeed(stock.market);
      realtimeMarketFeedService.registerSymbol(stock.symbol, market);
      const quote = realtimeMarketFeedService.getQuote(stock.symbol);
      if (isUsableQuote(quote)) {
        void loadSnapshot(quote, stock.name);
      } else {
        setSelectedQuote(null);
        setSelectedName(stock.name);
        setPendingStock(stock);
        setSnapshot(null);
        setSnapshotMessage(`${stock.name}(${stock.symbol}) 실제 시세를 요청했습니다. 확인 전에는 NO_DATA입니다.`);
      }
      return;
    }

    const lower = clean.toLowerCase();
    const shortRequest = lower.includes("숏") || lower.includes("하락") || lower.includes("약한") || lower.includes("short");
    runScan(shortRequest ? "SHORT" : "LONG", clean);
  };

  const openFromExistingFeature = (quote: LiveMarketQuote, preferredName?: string) => {
    setActiveNav("new");
    setSubmittedQuery(`${preferredName || quote.name || quote.symbol} 실제 데이터 분석`);
    void loadSnapshot(quote, preferredName);
  };

  const chartMarket = snapshot?.market ?? (selectedQuote ? quoteMarketToChart(selectedQuote.market) : "KOREA");
  const chartPrice = snapshot?.currentPrice ?? selectedQuote?.price ?? 0;
  const chartName = snapshot?.name || selectedName || selectedQuote?.name || selectedQuote?.symbol || "";
  const chartCandles = snapshot?.candles ?? [];

  const explanation = useMemo(() => {
    if (!selectedQuote) return [] as string[];
    const items = [`현재 확인된 실제 가격은 ${formatPrice(selectedQuote.price, selectedQuote.market)}이에요.`];
    if (selectedQuote.changeRate != null && Number.isFinite(selectedQuote.changeRate)) {
      items.push(
        selectedQuote.changeRate >= 0
          ? `오늘 기준 등락률이 ${formatChange(selectedQuote.changeRate)}라서 가격 힘이 위쪽이에요.`
          : `오늘 기준 등락률이 ${formatChange(selectedQuote.changeRate)}라서 가격 힘이 아래쪽이에요.`,
      );
    } else items.push("등락률은 아직 NO_DATA예요.");

    if (patternFacts?.breakout) items.push("최근 20개 봉의 높은 가격을 실제 종가가 넘어선 돌파가 확인됐어요.");
    else if (patternFacts?.pullback) items.push("예전에 뚫었던 가격 근처를 다시 확인하는 눌림목/리테스트가 보여요.");
    else items.push("지금 실제 캔들에서는 확정 돌파/눌림목 표시가 없어요.");

    if (technicalScore != null && technicalScore > 0) items.push(`기술 점수는 ${technicalScore}/100이에요. 수익 확률이 아니라 실제 차트 조건 점수예요.`);
    else items.push("실제 캔들이 부족하면 기술 점수도 NO_DATA로 둬요.");
    return items;
  }, [selectedQuote, patternFacts, technicalScore]);

  const oneLineSummary = useMemo(() => {
    if (!selectedQuote) return "종목을 선택하면 실제 데이터 기준 한 줄 요약이 표시됩니다.";
    if (technicalScore == null) return "실제 캔들·지표가 충분하지 않아 방향 판단은 NO_DATA입니다.";
    if (patternFacts?.breakout && technicalScore >= 70) return "실제 돌파와 기술 조건이 함께 확인됐지만 추격 진입 전 눌림·리스크 확인이 필요합니다.";
    if (patternFacts?.pullback && technicalScore >= 65) return "실제 눌림목 조건이 보이며 지지 유지 여부를 확인하는 구간입니다.";
    if (chartState === "SELL" || chartState === "SHORT") return "현재 실제 차트 조건은 하방 위험 신호를 우선 확인해야 합니다.";
    return "현재 실제 차트 조건은 확정 신호보다 관찰과 추가 확인이 우선입니다.";
  }, [selectedQuote, technicalScore, patternFacts, chartState]);

  const kstDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(now);
  const kstTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);

  return (
    <div className="min-h-screen bg-[#050a12] text-slate-100" data-testid="stock-gpt-approved-layout">
      <div className="grid min-h-screen grid-cols-1 2xl:grid-cols-[230px_minmax(0,1fr)_300px]">
        <aside className="hidden border-r border-slate-800/80 bg-[#08111d] 2xl:flex 2xl:flex-col">
          <div className="border-b border-slate-800/80 px-5 py-5">
            <div className="flex items-center gap-2 text-xl font-black tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20"><Bot className="h-5 w-5" /></span>
              <span>Stock GPT</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">AI가 찾는 더 나은 투자, 더 큰 기회</p>
          </div>

          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveNav(id);
                  setReviewSide(null);
                  if (id === "new") {
                    setSubmittedQuery("");
                    setQuery("");
                    setScanResults([]);
                    setSelectedQuote(null);
                    setPendingStock(null);
                    setSnapshot(null);
                    setStockTab("chart");
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${activeNav === id ? "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-3 p-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><Gift className="h-4 w-4" /> ZERO FAKE DATA</div>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">없는 가격·캔들·점수·패턴은 NO_DATA로 둡니다.</p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3">
              <div className="flex items-center gap-2 text-xs font-black text-violet-300"><Crown className="h-4 w-4" /> 실제 데이터 우선</div>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">실시간 피드와 검증된 OHLCV만 화면에 사용합니다.</p>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400"><CircleUserRound className="h-5 w-5 text-slate-300" /><div><div className="font-bold text-slate-300">사용자</div><div className="text-[10px] text-slate-600">Stock GPT</div></div></div>
          </div>
        </aside>

        <main className="min-w-0 bg-[radial-gradient(circle_at_top,#10223d_0%,#07111f_34%,#050a12_76%)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-7">
            <form onSubmit={(event) => { event.preventDefault(); submitQuestion(); }} className="sticky top-0 z-40 flex items-center gap-3 rounded-xl border border-slate-700/70 bg-[#0a1422]/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <Search className="ml-2 h-5 w-5 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="무엇을 분석할까요? 예: 현재 지금 강한 종목들이 뭐야?" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 sm:text-base" />
              <button type="submit" className="rounded-lg bg-cyan-400 p-3 text-slate-950 transition hover:bg-cyan-300" aria-label="질문 보내기"><Send className="h-4 w-4" /></button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => { setQuery(prompt); submitQuestion(prompt); }} className="rounded-full border border-slate-800 bg-[#0a1422]/80 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200">{prompt}</button>
              ))}
            </div>

            {activeNav !== "new" && (
              <StockGPTFeaturePanels activeNav={activeNav} quotes={quotes} onSelectQuote={openFromExistingFeature} />
            )}

            {activeNav === "new" && submittedQuery && (
              <div className="mt-6 flex items-start gap-3">
                <span className="mt-1 rounded-lg bg-cyan-400/10 p-2 text-cyan-300 ring-1 ring-cyan-400/20"><Bot className="h-4 w-4" /></span>
                <div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">Stock GPT</strong><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">VERIFIED DATA ONLY</span></div><p className="mt-2 text-sm leading-6 text-slate-300">“{submittedQuery}” 질문을 실제 확인 가능한 데이터만 사용해서 처리했어요.</p></div>
              </div>
            )}

            {activeNav === "new" && !submittedQuery && !selectedQuote && !pendingStock && (
              <section className="mt-10 rounded-2xl border border-slate-800 bg-[#091422]/70 p-8 text-center shadow-2xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20"><Sparkles className="h-7 w-7" /></div>
                <h1 className="mt-5 text-3xl font-black tracking-tight">주식 전용 ChatGPT</h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">질문하면 실제 시세, 실제 OHLCV, 실제 거래량을 확인한 뒤 차트와 쉬운 설명으로 보여줍니다.</p>
              </section>
            )}

            {activeNav === "new" && scanResults.length > 0 && !selectedQuote && (
              <section className="mt-5 rounded-2xl border border-slate-800 bg-[#091422]/90 p-5">
                <div className="flex items-center gap-2 font-black">{scanMode === "LONG" ? <TrendingUp className="h-5 w-5 text-emerald-300" /> : <TrendingDown className="h-5 w-5 text-rose-300" />}{scanMode === "LONG" ? "실시간 강세 후보" : "실시간 약세 후보"}</div>
                <p className="mt-1 text-xs text-slate-500">수익 보장이 아닙니다. 검증된 LIVE 시세의 등락률과 실제 거래 정보만 정렬합니다.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {scanResults.map((quote, index) => (
                    <button key={`${quote.market}-${quote.symbol}`} type="button" onClick={() => void loadSnapshot(quote)} className="group rounded-xl border border-slate-800 bg-[#07101d] p-4 text-left transition hover:border-cyan-400/40">
                      <div className="flex justify-between gap-3"><div><span className="text-[10px] font-black text-cyan-400">#{index + 1} {quote.market}</span><div className="mt-1 font-black text-white">{quote.name}</div><div className="text-xs font-mono text-slate-500">{quote.symbol}</div></div><ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-300" /></div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><div className="text-slate-500">현재가</div><strong>{formatPrice(quote.price, quote.market)}</strong></div><div><div className="text-slate-500">등락률</div><strong className={Number(quote.changeRate) >= 0 ? "text-rose-300" : "text-blue-300"}>{formatChange(quote.changeRate)}</strong></div><div><div className="text-slate-500">거래량</div><span>{formatCompact(quote.volume)}</span></div><div><div className="text-slate-500">출처</div><span className="text-emerald-300">{quote.source || "NO_DATA"}</span></div></div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {activeNav === "new" && submittedQuery && !selectedQuote && scanResults.length === 0 && snapshotMessage && (
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 text-sm text-amber-200"><div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{snapshotMessage}</span></div></div>
            )}

            {activeNav === "new" && selectedQuote && (
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-[#08111d]/96 shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
                <div className="border-b border-slate-800 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{chartName}</h2><span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-mono text-slate-400">{selectedQuote.symbol}</span><span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300">{selectedQuote.status}</span></div><div className="mt-3 flex flex-wrap items-end gap-3"><span className="text-3xl font-black tracking-tight">{formatPrice(selectedQuote.price, selectedQuote.market)}</span><span className={Number(selectedQuote.changeRate) >= 0 ? "text-sm font-black text-rose-300" : "text-sm font-black text-blue-300"}>{formatChange(selectedQuote.changeRate)}</span></div></div>
                    <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg border border-slate-800 bg-[#050b14] px-3 py-2"><div className="text-[10px] text-slate-500">차트 상태</div><strong className="text-cyan-300">{technicalScore != null ? chartState : "NO_DATA"}</strong></div><div className="rounded-lg border border-violet-500/20 bg-violet-950/10 px-3 py-2"><div className="text-[10px] text-slate-500">Technical Score</div><strong className="text-violet-300">{technicalScore != null ? `${technicalScore}/100` : "NO_DATA"}</strong></div></div>
                  </div>
                </div>

                <div className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-[#07101b] px-4 text-[11px] font-bold text-slate-500">
                  {STOCK_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStockTab(tab.id)}
                      data-testid={`stock-tab-${tab.id}`}
                      className={`whitespace-nowrap border-b-2 px-3 py-3 transition ${stockTab === tab.id ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {stockTab === "chart" && (
                  <div className="relative bg-[#050a12] p-3 sm:p-4" data-testid="stock-tab-panel-chart">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1"><div className="flex items-center gap-2 text-sm font-black"><LineChart className="h-4 w-4 text-cyan-300" />실시간 트레이딩 차트</div><span className="text-[11px] text-slate-500">{snapshotMessage}</span></div>
                    {chartPrice > 0 ? (
                      <div className="relative"><RealTimeTradingViewChart symbol={selectedQuote.symbol} name={chartName} market={chartMarket} initialPrice={chartPrice} initialCandles={chartCandles} timeframe="5m" onStateChange={(nextState, score) => { setChartState(nextState); setTechnicalScore(Number.isFinite(score) && score > 0 ? score : null); }} /><PatternOverlay facts={patternFacts} market={chartMarket} /></div>
                    ) : <div className="flex min-h-[440px] items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">실제 가격이 확인되지 않아 차트를 만들지 않습니다. NO_DATA</div>}
                  </div>
                )}

                {stockTab === "overview" && (
                  <div className="bg-[#050a12] p-4" data-testid="stock-tab-panel-overview">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ["종목", `${chartName} (${selectedQuote.symbol})`],
                        ["시장", String(selectedQuote.market)],
                        ["현재가", formatPrice(selectedQuote.price, selectedQuote.market)],
                        ["등락률", formatChange(selectedQuote.changeRate)],
                        ["거래량", formatCompact(selectedQuote.volume)],
                        ["거래대금", formatCompact(selectedQuote.tradeValue)],
                        ["LIVE 출처", selectedQuote.source || "NO_DATA"],
                        ["시세 수신시각", formatTimestamp(selectedQuote.receivedAt)],
                        ["검증 OHLCV", snapshot ? `${snapshot.candles.length}개` : "NO_DATA"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-800 bg-[#08111d] p-4"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-2 break-words text-sm font-black text-slate-200">{value}</div></div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
                      <div className="text-xs font-black text-cyan-300">분류 메타정보</div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">테마: {selectedMeta?.theme?.trim() || "NO_DATA"}</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">이 분류는 종목 카탈로그 메타정보이며 실시간 수익률이나 투자판단 값이 아닙니다.</p>
                    </div>
                  </div>
                )}

                {stockTab === "analysis" && (
                  <div className="bg-[#050a12] p-4" data-testid="stock-tab-panel-analysis">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
                        <div className="text-xs font-black text-violet-300">기술 조건</div>
                        <div className="mt-3 space-y-2 text-sm text-slate-300">
                          <div className="flex justify-between gap-3"><span className="text-slate-500">Technical Score</span><strong>{technicalScore != null ? `${technicalScore}/100` : "NO_DATA"}</strong></div>
                          <div className="flex justify-between gap-3"><span className="text-slate-500">차트 상태</span><strong>{technicalScore != null ? chartState : "NO_DATA"}</strong></div>
                          <div className="flex justify-between gap-3"><span className="text-slate-500">캔들 표본</span><strong>{snapshot ? `${snapshot.candles.length}개` : "NO_DATA"}</strong></div>
                          <div className="flex justify-between gap-3"><span className="text-slate-500">데이터 출처</span><strong className="text-emerald-300">{snapshot?.source || selectedQuote.source || "NO_DATA"}</strong></div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
                        <div className="text-xs font-black text-cyan-300">실제 캔들 패턴</div>
                        <div className="mt-3 space-y-2 text-sm text-slate-300">
                          <div>돌파: <strong>{patternFacts == null ? "NO_DATA" : patternFacts.breakout ? "확인" : "미확인"}</strong></div>
                          <div>눌림/리테스트: <strong>{patternFacts == null ? "NO_DATA" : patternFacts.pullback ? "확인" : "미확인"}</strong></div>
                          <div>거래량 급증: <strong>{patternFacts == null ? "NO_DATA" : patternFacts.volumeSurge ? "확인" : "미확인"}</strong></div>
                          <div>캔들 패턴: <strong>{patternFacts?.candlePattern || "미확인"}</strong></div>
                          <div>RVOL 유사 비율(최근 20봉 대비): <strong>{patternFacts?.volumeRatio != null ? `${patternFacts.volumeRatio.toFixed(2)}x` : "NO_DATA"}</strong></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-800 bg-[#08111d] p-4">
                      <div className="text-xs font-black text-slate-300">쉬운 해석</div>
                      <div className="mt-2 space-y-2 text-sm leading-6 text-slate-400">{explanation.map((line, index) => <p key={`${index}-${line}`}>{index + 1}️⃣ {line}</p>)}</div>
                      <p className="mt-3 text-[11px] text-amber-300">이 점수와 패턴은 수익 확률이 아닙니다. 실제 입력 데이터에서 조건이 얼마나 맞았는지 보여주는 기술 조건입니다.</p>
                    </div>
                  </div>
                )}

                {stockTab === "financials" && <StockGPTVerifiedFinancialPanel symbol={selectedQuote.symbol} market={selectedQuote.market} />}
                {stockTab === "news" && <StockGPTVerifiedNewsPanel symbol={selectedQuote.symbol} />}
                {stockTab === "community" && <TruthUnavailablePanel title="토론 커뮤니티" reason="검증 가능한 커뮤니티 원문 공급자와 출처 표시가 아직 연결되지 않았습니다." />}

                <div className="grid gap-4 border-t border-slate-800 bg-[#08111d] p-4 xl:grid-cols-[minmax(0,1fr)_330px]">
                  <div className="space-y-3"><div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-cyan-300" />초등학생도 이해하는 설명</div><div className="space-y-2 text-sm leading-6 text-slate-300">{explanation.map((line, index) => <p key={`${index}-${line}`}>{index + 1}️⃣ {line}</p>)}</div></div><div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-4"><div className="text-xs font-black text-sky-300">한 줄 요약</div><p className="mt-2 text-sm leading-6 text-slate-300">{oneLineSummary}</p></div></div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-1"><button type="button" onClick={() => setReviewSide("LONG")} className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-left transition hover:bg-emerald-500/16"><ArrowUpRight className="h-5 w-5 text-emerald-300" /><div className="mt-2 text-base font-black text-emerald-200">LONG 검토</div><div className="mt-1 text-xs text-emerald-300/70">주문 전 확인만</div></button><button type="button" onClick={() => setReviewSide("SHORT")} className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-left transition hover:bg-rose-500/16"><ArrowDownRight className="h-5 w-5 text-rose-300" /><div className="mt-2 text-base font-black text-rose-200">SHORT 검토</div><div className="mt-1 text-xs text-rose-300/70">주문 전 확인만</div></button></div>
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="hidden border-l border-slate-800/80 bg-[#08111d] 2xl:block">
          <div className="sticky top-0 space-y-3 p-4">
            <div className="rounded-xl border border-slate-800 bg-[#0a1422] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black text-slate-300">{kstDate}</div><div className="mt-1 text-lg font-black tracking-tight text-white">{kstTime}</div></div><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300">● 실시간</span></div></div>

            <div className="rounded-xl border border-slate-800 bg-[#0a1422] p-4"><div className="flex items-center gap-2 text-sm font-black"><Activity className="h-4 w-4 text-cyan-300" />시장 상태</div><div className="mt-3 space-y-2">{marketSummaries.map((row) => <div key={row.market} className="rounded-lg border border-slate-800 bg-[#07101b] p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-300">{row.market} LIVE 평균</span><span className={row.averageChange == null ? "text-xs font-black text-slate-500" : Number(row.averageChange) >= 0 ? "text-xs font-black text-rose-300" : "text-xs font-black text-blue-300"}>{formatChange(row.averageChange)}</span></div><div className="mt-2 text-[10px] text-slate-500">검증 LIVE 종목 {row.liveCount}개</div></div>)}</div><p className="mt-3 text-[10px] leading-5 text-slate-600">시장지수 자체가 아니라 현재 검증된 LIVE 종목의 평균 등락률입니다. 지수 데이터가 없으면 임의 지수를 만들지 않습니다.</p></div>

            <div className="rounded-xl border border-slate-800 bg-[#0a1422] p-4"><div className="flex items-center gap-2 text-sm font-black"><TrendingUp className="h-4 w-4 text-emerald-300" />강한 섹터/테마 TOP 5</div><div className="mt-3 space-y-1.5">{strongThemes.length > 0 ? strongThemes.map((row, index) => <div key={row.theme} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-900/70"><span className="truncate text-xs font-bold text-slate-300">{index + 1}. {row.theme}</span><span className={Number(row.averageChange) >= 0 ? "text-xs font-mono font-black text-rose-300" : "text-xs font-mono font-black text-blue-300"}>{formatChange(row.averageChange)}</span></div>) : <div className="py-4 text-center text-xs text-slate-600">NO_DATA</div>}</div></div>

            <div className="rounded-xl border border-slate-800 bg-[#0a1422] p-4"><div className="flex items-center gap-2 text-sm font-black"><TrendingUp className="h-4 w-4 text-rose-300" />실시간 급상승 종목</div><div className="mt-3 space-y-1">{strongest.length > 0 ? strongest.map((quote, index) => <button key={`side-strong-${quote.market}-${quote.symbol}`} type="button" onClick={() => openFromExistingFeature(quote)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-slate-900"><span className="truncate text-xs font-bold text-slate-300">{index + 1}. {quote.name}</span><span className="text-xs font-mono font-black text-rose-300">{formatChange(quote.changeRate)}</span></button>) : <div className="py-4 text-center text-xs text-slate-600">NO_DATA</div>}</div></div>

            <div className="rounded-xl border border-slate-800 bg-[#0a1422] p-4"><div className="flex items-center gap-2 text-sm font-black"><AlertTriangle className="h-4 w-4 text-amber-300" />위험 신호 종목</div><div className="mt-3 space-y-1">{weakest.length > 0 ? weakest.map((quote) => <button key={`side-risk-${quote.market}-${quote.symbol}`} type="button" onClick={() => openFromExistingFeature(quote)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-slate-900"><span className="truncate text-xs font-bold text-slate-300">{quote.name}</span><span className="text-xs font-mono font-black text-blue-300">{formatChange(quote.changeRate)}</span></button>) : <div className="py-4 text-center text-xs text-slate-600">NO_DATA</div>}</div><div className="mt-3 flex items-center justify-between rounded-lg bg-[#07101b] px-3 py-2 text-[11px]"><span className="text-slate-500">STALE / 미검증</span><strong className={staleCount > 0 ? "text-amber-300" : "text-emerald-300"}>{staleCount}개</strong></div></div>
          </div>
        </aside>
      </div>

      {reviewSide && selectedQuote && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#091321] p-5 shadow-2xl"><div className="flex justify-between gap-4"><div><div className={reviewSide === "LONG" ? "text-xs font-black text-emerald-300" : "text-xs font-black text-rose-300"}>{reviewSide} REVIEW</div><h3 className="mt-1 text-lg font-black">{chartName} 거래 검토</h3></div><button type="button" onClick={() => setReviewSide(null)} className="rounded-lg p-1 text-slate-500 hover:text-white"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">현재가</span><strong>{formatPrice(selectedQuote.price, selectedQuote.market)}</strong></div><div className="flex justify-between"><span className="text-slate-500">데이터</span><strong className="text-emerald-300">{selectedQuote.status} / {selectedQuote.source || "NO_DATA"}</strong></div><div className="flex justify-between"><span className="text-slate-500">차트 상태</span><strong>{technicalScore != null ? chartState : "NO_DATA"}</strong></div></div><div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 text-xs leading-5 text-amber-200">검토 단계만 열립니다. 수량·금액·손절·목표가가 실제 주문 승인 게이트에서 검증되기 전에는 주문을 전송하지 않습니다.</div><button type="button" onClick={() => setReviewSide(null)} className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-black hover:bg-slate-700">확인하고 닫기</button></div></div>
      )}
    </div>
  );
}