import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  History,
  Radio,
  ShieldAlert,
  Star,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LiveMarketQuote, realtimeMarketFeedService } from "../../services/realtimeMarketFeedService";
import { RealtimeScannerTileBoard } from "../RealtimeScannerTileBoard";
import { VerifiedAiOpportunityScanner } from "../VerifiedAiOpportunityScanner";
import { VerifiedIntradaySignalPanel } from "../VerifiedIntradaySignalPanel";
import { BotStatusDashboard } from "./BotStatusDashboard";

type NavId = "new" | "history" | "watch" | "portfolio" | "scanner" | "alerts";

type Props = {
  activeNav: NavId;
  quotes: LiveMarketQuote[];
  onSelectQuote: (quote: LiveMarketQuote, preferredName?: string) => void;
};

function usable(quote: LiveMarketQuote | undefined | null): quote is LiveMarketQuote {
  return Boolean(
    quote &&
      quote.isVerified &&
      quote.status === "LIVE" &&
      quote.price != null &&
      Number.isFinite(quote.price) &&
      quote.price > 0,
  );
}

function quoteKey(symbol: string): string[] {
  const clean = String(symbol || "").toUpperCase();
  if (!clean) return [];
  if (clean.startsWith("KRW-")) return [clean, clean.replace(/^KRW-/, "")];
  return [clean, `KRW-${clean}`];
}

function marketToFeed(market: string): "KOSPI" | "KOSDAQ" | "UPBIT" | "US" {
  if (market === "US") return "US";
  if (market === "BTC" || market === "UPBIT") return "UPBIT";
  if (market === "KOSDAQ") return "KOSDAQ";
  return "KOSPI";
}

function priceText(value: number | null | undefined, market?: string): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "NO_DATA";
  if (market === "US") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}원`;
}

function changeText(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "NO_DATA";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function StockGPTFeaturePanels({ activeNav, quotes, onSelectQuote }: Props) {
  const {
    watchlist = [],
    positions = [],
    decisionLogs = [],
    blockedSymbolDetails = [],
    brokerApiStatus,
    brokerApiError,
  } = useApp() as any;

  const quoteMap = useMemo(() => {
    const map = new Map<string, LiveMarketQuote>();
    quotes.forEach((quote) => {
      quoteKey(quote.symbol).forEach((key) => {
        const old = map.get(key);
        if (!old || quote.receivedAt >= old.receivedAt) map.set(key, quote);
      });
    });
    return map;
  }, [quotes]);

  const getQuote = (symbol: string): LiveMarketQuote | null => {
    for (const key of quoteKey(symbol)) {
      const quote = quoteMap.get(key);
      if (usable(quote)) return quote;
    }
    return null;
  };

  const requestQuote = (symbol: string, market: string) => {
    realtimeMarketFeedService.registerSymbol(symbol, marketToFeed(market));
  };

  const openItem = (symbol: string, name: string, market: string) => {
    const quote = getQuote(symbol);
    if (quote) {
      onSelectQuote(quote, name);
      return;
    }
    requestQuote(symbol, market);
  };

  if (activeNav === "new") return null;

  if (activeNav === "scanner") {
    return (
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#08111d]/96 shadow-2xl" data-testid="stock-gpt-real-scanner-panel">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2 text-base font-black text-white">
            <Radio className="h-5 w-5 text-cyan-300" /> 검증 실시간 스캐너 허브
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">새 가짜 스캐너를 만들지 않고 기존 실제 엔진을 한 화면에 다시 연결했습니다. PRECHECK와 FINAL BUY는 구분됩니다.</p>
        </div>

        <div className="space-y-4 p-3">
          <div className="rounded-xl border border-slate-800 bg-[#07101b] p-3">
            <div className="mb-3 text-xs font-black text-cyan-300">1. 실시간 타일 스캐너</div>
            <RealtimeScannerTileBoard
              isWhiteTheme={false}
              onSelectStock={(symbol, market) => {
                const quote = getQuote(symbol);
                if (quote) onSelectQuote(quote, quote.name || symbol);
                else requestQuote(symbol, market);
              }}
            />
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3" data-testid="stock-gpt-v20-final-scanner">
            <div className="mb-3 text-xs font-black text-emerald-300">2. V20 서버 최종판단 스캐너</div>
            <VerifiedAiOpportunityScanner />
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3" data-testid="stock-gpt-intraday-pattern-panel">
            <div className="mb-2 text-xs font-black text-cyan-300">3. 실제 완료 5분봉 패턴 검증</div>
            <div className="mb-3 text-[11px] leading-5 text-slate-500">V20 후보를 선택하면 ORB / Opening Drive / VWAP Retest / First Pullback을 실제 완료봉으로만 검사합니다.</div>
            <VerifiedIntradaySignalPanel />
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3" data-testid="stock-gpt-bot-truth-panel">
            <div className="mb-3 text-xs font-black text-violet-300">4. AI 봇 실제 상태</div>
            <BotStatusDashboard />
          </div>
        </div>
      </section>
    );
  }

  if (activeNav === "watch") {
    return (
      <section className="mt-6 rounded-2xl border border-slate-800 bg-[#08111d]/96 p-5 shadow-2xl" data-testid="stock-gpt-watchlist-panel">
        <div className="flex items-center gap-2 text-base font-black"><Star className="h-5 w-5 text-amber-300" />관심종목</div>
        <p className="mt-1 text-xs text-slate-500">저장된 관심종목은 그대로 사용하고 현재가는 검증된 LIVE 시세만 덧붙입니다.</p>
        <div className="mt-4 space-y-2">
          {watchlist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-500">저장된 관심종목이 없습니다.</div>
          ) : (
            watchlist.map((item: any) => {
              const quote = getQuote(item.symbol);
              return (
                <button
                  key={item.id || `${item.market}-${item.symbol}`}
                  type="button"
                  onClick={() => openItem(item.symbol, item.name, item.market)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-slate-800 bg-[#07101b] px-4 py-3 text-left hover:border-cyan-400/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">{item.name}</div>
                    <div className="mt-0.5 text-[10px] font-mono text-slate-500">{item.symbol} · {item.market}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-200">{quote ? priceText(quote.price, quote.market) : "NO_DATA"}</div>
                    <div className={quote && Number(quote.changeRate) >= 0 ? "mt-1 text-[10px] font-bold text-rose-300" : "mt-1 text-[10px] font-bold text-blue-300"}>{quote ? changeText(quote.changeRate) : "실시간 요청"}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  }

  if (activeNav === "portfolio") {
    return (
      <section className="mt-6 rounded-2xl border border-slate-800 bg-[#08111d]/96 p-5 shadow-2xl" data-testid="stock-gpt-holdings-panel">
        <div className="flex items-center gap-2 text-base font-black"><BriefcaseBusiness className="h-5 w-5 text-emerald-300" />보유종목</div>
        <p className="mt-1 text-xs text-slate-500">수량·평단은 기존 계좌 상태를 사용하고 현재가와 평가손익은 검증 LIVE 시세가 있을 때만 계산합니다.</p>
        <div className="mt-4 space-y-2">
          {positions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-500">현재 저장된 보유종목이 없습니다.</div>
          ) : (
            positions.map((position: any) => {
              const quote = getQuote(position.symbol);
              const quantity = Number(position.quantity);
              const avgPrice = Number(position.avgPrice);
              const current = quote?.price ?? null;
              const pnl = quote && Number.isFinite(quantity) && Number.isFinite(avgPrice) && avgPrice > 0 && current != null
                ? (current - avgPrice) * quantity
                : null;
              const pnlRate = quote && avgPrice > 0 && current != null ? ((current - avgPrice) / avgPrice) * 100 : null;
              return (
                <button
                  key={position.id || `${position.market}-${position.symbol}`}
                  type="button"
                  onClick={() => openItem(position.symbol, position.name, position.market)}
                  className="w-full rounded-xl border border-slate-800 bg-[#07101b] p-4 text-left hover:border-cyan-400/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-white">{position.name}</div>
                      <div className="mt-0.5 text-[10px] font-mono text-slate-500">{position.symbol} · {position.market}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black">{quote ? priceText(quote.price, quote.market) : "NO_DATA"}</div>
                      <div className={pnlRate == null ? "mt-1 text-[10px] text-slate-500" : pnlRate >= 0 ? "mt-1 text-[10px] font-black text-rose-300" : "mt-1 text-[10px] font-black text-blue-300"}>{pnlRate == null ? "평가손익 NO_DATA" : `${pnlRate > 0 ? "+" : ""}${pnlRate.toFixed(2)}%`}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg bg-slate-950/70 p-2"><div className="text-slate-500">수량</div><strong>{Number.isFinite(quantity) ? quantity.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "NO_DATA"}</strong></div>
                    <div className="rounded-lg bg-slate-950/70 p-2"><div className="text-slate-500">평단</div><strong>{Number.isFinite(avgPrice) && avgPrice > 0 ? priceText(avgPrice, position.market) : "NO_DATA"}</strong></div>
                    <div className="rounded-lg bg-slate-950/70 p-2"><div className="text-slate-500">평가손익</div><strong className={pnl == null ? "text-slate-500" : pnl >= 0 ? "text-rose-300" : "text-blue-300"}>{pnl == null ? "NO_DATA" : `${pnl > 0 ? "+" : ""}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</strong></div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  }

  if (activeNav === "history") {
    return (
      <section className="mt-6 rounded-2xl border border-slate-800 bg-[#08111d]/96 p-5 shadow-2xl" data-testid="stock-gpt-history-panel">
        <div className="flex items-center gap-2 text-base font-black"><History className="h-5 w-5 text-violet-300" />이전 분석·의사결정 기록</div>
        <p className="mt-1 text-xs text-slate-500">가짜 대화기록을 만들지 않고 기존 의사결정 로그 중 실제 저장된 항목만 표시합니다.</p>
        <div className="mt-4 space-y-2">
          {decisionLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-500">저장된 실제 분석 기록이 없습니다.</div>
          ) : (
            [...decisionLogs].slice(-30).reverse().map((log: any, index: number) => (
              <div key={log.id || `${log.timestamp}-${index}`} className="rounded-xl border border-slate-800 bg-[#07101b] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-xs font-black text-slate-200">{log.name || log.symbol || "분석 기록"}</div>
                  <span className="text-[10px] font-mono text-slate-500">{log.timestamp || ""}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-400">{log.message || log.rationale || log.reason || "기록 내용 없음"}</div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-[#08111d]/96 p-5 shadow-2xl" data-testid="stock-gpt-alerts-panel">
      <div className="flex items-center gap-2 text-base font-black"><Bell className="h-5 w-5 text-amber-300" />알림 기록</div>
      <p className="mt-1 text-xs text-slate-500">브로커 연결 오류, 위험 차단, 실제 의사결정 로그만 모아서 보여줍니다.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#07101b] p-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300"><Activity className="h-4 w-4 text-cyan-300" />브로커 상태</div>
          <div className="mt-3 space-y-2 text-xs">
            {Object.entries(brokerApiStatus || {}).map(([broker, status]) => (
              <div key={broker} className="flex items-center justify-between"><span className="uppercase text-slate-500">{broker}</span><strong className={status === "CONNECTED" ? "text-emerald-300" : status === "FAILED" ? "text-rose-300" : "text-amber-300"}>{String(status)}</strong></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#07101b] p-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300"><ShieldAlert className="h-4 w-4 text-rose-300" />위험 차단</div>
          <div className="mt-3 text-2xl font-black text-rose-300">{blockedSymbolDetails.length}</div>
          <div className="mt-1 text-[10px] text-slate-500">현재 차단 상세 항목</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {Object.entries(brokerApiError || {}).map(([broker, error]: [string, any]) => error ? (
          <div key={`error-${broker}`} className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3">
            <div className="flex items-center gap-2 text-xs font-black text-rose-300"><AlertTriangle className="h-4 w-4" />{broker.toUpperCase()} 연결 오류</div>
            <div className="mt-2 text-xs text-slate-400">{error.errorMessage || error.message || "오류 상세 없음"}</div>
          </div>
        ) : null)}
        {blockedSymbolDetails.slice(0, 20).map((item: any, index: number) => (
          <div key={item.id || `${item.symbol}-${index}`} className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
            <div className="flex items-center justify-between gap-3"><strong className="text-xs text-amber-200">{item.name || item.symbol || "차단 종목"}</strong><span className="text-[10px] text-slate-500">{item.symbol || ""}</span></div>
            <div className="mt-1 text-xs text-slate-400">{item.reason || item.message || "위험 게이트에서 차단됨"}</div>
          </div>
        ))}
        {blockedSymbolDetails.length === 0 && Object.values(brokerApiError || {}).every((value) => !value) && (
          <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">현재 기록된 위험 알림이 없습니다.</div>
        )}
      </div>
    </section>
  );
}
