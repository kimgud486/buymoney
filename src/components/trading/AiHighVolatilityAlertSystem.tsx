import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Sliders,
  DatabaseZap,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LiveMarketQuote, realtimeMarketFeedService } from "../../services/realtimeMarketFeedService";

export interface VolatilityAlertItem {
  id: string;
  symbol: string;
  name: string;
  market: LiveMarketQuote["market"];
  price: number;
  changeRate: number;
  volatilityIndex: number | null;
  rvol: number | null;
  breachedThresholdReason: string;
  alertLevel: "HIGH" | "CRITICAL" | "EXTREME";
  timestamp: string;
  source: string | null;
}

interface AiHighVolatilityAlertSystemProps {
  onSelectStock?: (symbol: string) => void;
  onOpenThresholdModal?: () => void;
}

function isVerifiedLive(quote: LiveMarketQuote): boolean {
  return Boolean(
    quote.isVerified &&
      quote.status === "LIVE" &&
      quote.price != null &&
      Number.isFinite(quote.price) &&
      quote.price > 0 &&
      quote.changeRate != null &&
      Number.isFinite(quote.changeRate),
  );
}

function formatPrice(price: number, market: LiveMarketQuote["market"]): string {
  if (!Number.isFinite(price) || price <= 0) return "NO_DATA";
  if (market === "US") return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}원`;
}

function formatNullableMultiple(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "NO_DATA" : `${value.toFixed(2)}x`;
}

export const AiHighVolatilityAlertSystem: React.FC<AiHighVolatilityAlertSystemProps> = ({
  onSelectStock,
  onOpenThresholdModal,
}) => {
  const { addToast } = useApp();
  const [quotes, setQuotes] = useState<LiveMarketQuote[]>([]);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState(() => Date.now());

  useEffect(() => realtimeMarketFeedService.subscribe((quoteMap) => {
    const unique = new Map<string, LiveMarketQuote>();
    quoteMap.forEach((quote) => {
      const key = `${quote.market}:${quote.symbol}`;
      const current = unique.get(key);
      if (!current || quote.receivedAt >= current.receivedAt) unique.set(key, quote);
    });
    setQuotes(Array.from(unique.values()));
    setLastEvaluatedAt(Date.now());
  }), []);

  const alerts = useMemo<VolatilityAlertItem[]>(() => {
    return quotes
      .filter(isVerifiedLive)
      .filter((quote) => Math.abs(Number(quote.changeRate)) >= 2.5)
      .sort((a, b) => Math.abs(Number(b.changeRate)) - Math.abs(Number(a.changeRate)))
      .slice(0, 8)
      .map((quote) => {
        const changeRate = Number(quote.changeRate);
        const magnitude = Math.abs(changeRate);
        const alertLevel: VolatilityAlertItem["alertLevel"] = magnitude >= 8 ? "EXTREME" : magnitude >= 5 ? "CRITICAL" : "HIGH";
        return {
          id: `vol-alert-${quote.market}-${quote.symbol}-${quote.receivedAt}`,
          symbol: quote.symbol,
          name: quote.name || quote.symbol,
          market: quote.market,
          price: Number(quote.price),
          changeRate,
          volatilityIndex: null,
          rvol: null,
          breachedThresholdReason: `검증된 LIVE 등락률 절대값이 ${magnitude.toFixed(2)}%로 2.50% 경보 기준을 넘었습니다.`,
          alertLevel,
          timestamp: new Date(quote.receivedAt || Date.now()).toLocaleTimeString("ko-KR", { hour12: false }),
          source: quote.source || null,
        };
      });
  }, [quotes]);

  const handleDeepScanClick = (item: VolatilityAlertItem) => {
    onSelectStock?.(item.symbol);
    window.dispatchEvent(new CustomEvent("open-stock-deepscan", { detail: { symbol: item.symbol, name: item.name } }));
    addToast?.({
      type: "INFO",
      title: `[${item.name}] 차트 딥스캔 요청`,
      message: "선택 종목의 실제 차트 데이터가 있는 경우에만 분석을 진행합니다.",
    });
  };

  const handleRiskCorrection = (item: VolatilityAlertItem) => {
    addToast?.({
      type: "INFO",
      title: `[${item.name}] 자동 보정 보류`,
      message: "검증된 ATR/RVOL 값이 없어 임의 리스크 보정을 적용하지 않았습니다.",
    });
  };

  return (
    <div className="my-4 rounded-2xl border-2 border-rose-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/5 p-4 shadow-sm dark:border-rose-500/40 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-slate-900">
      <div className="mb-3 flex flex-col justify-between gap-2 border-b border-rose-200 pb-3 dark:border-rose-900/50 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">검증 LIVE 고변동성 경보</h3>
              <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">LIVE ALERT {alerts.length}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">검증된 LIVE 시세의 실제 등락률만 사용합니다. ATR/RVOL은 실제 계산값이 없으면 NO_DATA입니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLastEvaluatedAt(Date.now())} className="flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-rose-800 dark:bg-slate-800 dark:text-slate-200">
            <RefreshCw className="h-3.5 w-3.5 text-rose-500" /> 현재 LIVE 다시 평가
          </button>
          {onOpenThresholdModal && (
            <button type="button" onClick={onOpenThresholdModal} className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
              <Sliders className="h-3.5 w-3.5" /> 임계치 설정
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
        마지막 화면 평가: {new Date(lastEvaluatedAt).toLocaleTimeString("ko-KR", { hour12: false })} · 이 시각은 시세 출처 시각이 아니라 화면 재평가 시각입니다.
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30">
          검증된 LIVE 시세 중 현재 2.50% 경보 기준을 넘긴 종목이 없습니다. 빈칸을 가짜 종목으로 채우지 않습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {alerts.map((item) => {
            const isUp = item.changeRate >= 0;
            return (
              <div key={item.id} className={`relative overflow-hidden rounded-xl border bg-white p-3.5 dark:bg-slate-900 ${item.alertLevel === "EXTREME" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-amber-400 dark:border-amber-600"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">{item.name}</span>
                      <span className="font-mono text-[11px] font-bold text-slate-500">{item.symbol}</span>
                      <span className="rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">{item.alertLevel}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">{formatPrice(item.price, item.market)}</span>
                      <span className={`flex items-center font-mono text-xs font-black ${isUp ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {isUp ? <TrendingUp className="mr-0.5 h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 h-3.5 w-3.5" />}
                        {isUp ? "+" : ""}{item.changeRate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400">{item.timestamp}</span>
                </div>

                <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2 dark:border-rose-900/60 dark:bg-rose-950/40">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300"><ShieldAlert className="h-3.5 w-3.5 shrink-0" />{item.breachedThresholdReason}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    <span>ATR 변동성: <strong>{formatNullableMultiple(item.volatilityIndex)}</strong></span>
                    <span>RVOL: <strong>{formatNullableMultiple(item.rvol)}</strong></span>
                    <span>출처: <strong>{item.source || "NO_DATA"}</strong></span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <button type="button" onClick={() => handleDeepScanClick(item)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-bold text-white"><Eye className="h-3.5 w-3.5" /> 차트/딥스캔</button>
                  <button type="button" onClick={() => handleRiskCorrection(item)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><DatabaseZap className="h-3.5 w-3.5" /> ATR/RVOL 필요</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
