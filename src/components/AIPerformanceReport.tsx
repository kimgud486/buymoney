import React, { useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";

const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const pct = (value: number | null) => value === null ? "NO DATA" : `${value.toFixed(1)}%`;
const num = (value: number | null, digits = 2) => value === null ? "NO DATA" : value.toFixed(digits);
const money = (value: number | null) => value === null ? "NO DATA" : `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("ko-KR")}원`;

export const AIPerformanceReport: React.FC = () => {
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "US" | "BTC">("ALL");
  const [timeframe, setTimeframe] = useState<"30D" | "90D" | "1Y">("90D");
  const { trades = [] } = useApp() as any;

  const metrics = useMemo(() => {
    const days = timeframe === "30D" ? 30 : timeframe === "90D" ? 90 : 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const verified = (Array.isArray(trades) ? trades : []).filter((trade: any) => {
      const ts = new Date(trade?.timestamp ?? "").getTime();
      if (!Number.isFinite(ts) || ts < cutoff) return false;
      if (marketFilter !== "ALL" && trade?.market !== marketFilter) return false;
      return (
        trade?.isRealTrade === true &&
        trade?.executionType === "REAL_BROKER" &&
        trade?.verificationStatus === "VERIFIED_BROKER"
      );
    });

    const closed = verified
      .map((trade: any) => ({
        pnl: finite(trade?.netProfit) ?? finite(trade?.pnl),
        pnlRate: finite(trade?.pnlRate),
      }))
      .filter((trade: { pnl: number | null; pnlRate: number | null }) => trade.pnl !== null || trade.pnlRate !== null);

    if (closed.length === 0) {
      return {
        tradeCount: verified.length,
        closedCount: 0,
        winRate: null,
        profitFactor: null,
        averageReturn: null,
        totalPnl: null,
      };
    }

    const pnlValues = closed.map((x: any) => x.pnl).filter((v: number | null): v is number => v !== null);
    const winners = closed.filter((x: any) => (x.pnl ?? x.pnlRate ?? 0) > 0).length;
    const grossProfit = pnlValues.filter(v => v > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(pnlValues.filter(v => v < 0).reduce((a, b) => a + b, 0));
    const rates = closed.map((x: any) => x.pnlRate).filter((v: number | null): v is number => v !== null);

    return {
      tradeCount: verified.length,
      closedCount: closed.length,
      winRate: (winners / closed.length) * 100,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
      averageReturn: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
      totalPnl: pnlValues.length > 0 ? pnlValues.reduce((a, b) => a + b, 0) : null,
    };
  }, [trades, marketFilter, timeframe]);

  return (
    <div id="ai-performance-report" className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              <h2 className="font-black">실거래 성과 리포트</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              검증된 실제 브로커 체결만 계산합니다. 값이 없으면 추정하지 않고 NO DATA로 표시합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              {(["ALL", "KOREA", "US", "BTC"] as const).map(m => (
                <button key={m} onClick={() => setMarketFilter(m)} className={`rounded px-2 py-1 ${marketFilter === m ? "bg-cyan-600 text-white" : "text-slate-400"}`}>
                  {m === "ALL" ? "전체" : m}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              {(["30D", "90D", "1Y"] as const).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)} className={`rounded px-2 py-1 ${timeframe === tf ? "bg-slate-700 text-white" : "text-slate-400"}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Metric label="검증 실거래" value={`${metrics.tradeCount}건`} />
          <Metric label="승률" value={pct(metrics.winRate)} />
          <Metric label="손익비" value={num(metrics.profitFactor)} />
          <Metric label="평균 수익률" value={pct(metrics.averageReturn)} />
          <Metric label="누적 실현손익" value={money(metrics.totalPnl)} />
        </div>

        {metrics.closedCount === 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>선택 기간에 손익이 확인된 검증 실거래가 없습니다. 예시 승률이나 가짜 수익률을 대신 표시하지 않습니다.</span>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-3 text-xs text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            브로커 검증 체결 {metrics.tradeCount}건 중 손익 확인 완료 {metrics.closedCount}건을 기준으로 계산했습니다.
          </div>
        )}
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
      <Activity className="h-3 w-3" /> {label}
    </div>
    <div className="mt-1 font-mono text-lg font-black text-slate-100">{value}</div>
  </div>
);

export default AIPerformanceReport;
