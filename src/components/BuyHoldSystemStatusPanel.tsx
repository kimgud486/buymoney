import React from "react";

const pipeline = [
  "REAL DATA",
  "FULL MARKET SCAN",
  "150+ PATTERNS",
  "TRUE MTF",
  "RS / RVOL / VWAP / FLOW",
  "V20 AUTHORITY",
  "VERIFIED PERFORMANCE",
  "BUY",
  "HOLD",
  "REDUCE / EXIT",
  "P&L JOURNAL"
];

export function BuyHoldSystemStatusPanel() {
  return (
    <section className="w-full border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-emerald-300">BUYMONEY FINAL SYSTEM</div>
            <div className="mt-1 text-lg font-black">AI BUY & HOLD · Truth First</div>
            <div className="mt-1 text-xs text-slate-300">80%+는 충분한 종료거래 표본, Profit Factor, 양의 기대값을 모두 통과한 경우에만 VERIFIED로 표시합니다.</div>
          </div>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-200">
            BUY → KEEP HOLD → REDUCE → EXIT
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-11">
          {pipeline.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center">
              <div className="text-[9px] font-bold text-slate-500">{String(index + 1).padStart(2, "0")}</div>
              <div className="mt-0.5 text-[10px] font-black leading-tight text-slate-100">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
