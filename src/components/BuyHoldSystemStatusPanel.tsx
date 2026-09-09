import React from "react";

const pipeline = [
  { label: "REAL DATA", state: "INPUT" },
  { label: "FULL MARKET SCAN", state: "PRECHECK" },
  { label: "150+ PATTERNS", state: "EVIDENCE" },
  { label: "TRUE MTF", state: "HARD GATE" },
  { label: "RS / RVOL / VWAP / FLOW", state: "EVIDENCE" },
  { label: "V20 AUTHORITY", state: "FINAL" },
  { label: "VERIFIED PERFORMANCE", state: "TRUTH" },
  { label: "BUY", state: "ACTION" },
  { label: "HOLD", state: "ACTION" },
  { label: "REDUCE / EXIT", state: "ACTION" },
  { label: "P&L JOURNAL", state: "LEARNING" }
];

export function BuyHoldSystemStatusPanel() {
  return (
    <section className="w-full border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-emerald-300">BUYMONEY FINAL SYSTEM</div>
            <div className="mt-1 text-lg font-black">AI BUY & HOLD · Truth First</div>
            <div className="mt-1 max-w-4xl text-xs leading-5 text-slate-300">
              화면의 일봉 스캐너는 후보 압축 PRECHECK입니다. 최종 BUY 권한은 서버 V20의 True MTF + 실데이터 + 성과DB 게이트에만 있습니다.
              80%+는 충분한 종료거래 표본, Profit Factor, 양의 기대값을 모두 통과한 경우에만 VERIFIED로 표시합니다.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200">
              PRECHECK ≠ FINAL BUY
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-200">
              FINAL: BUY → KEEP HOLD → REDUCE → EXIT
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-11">
          {pipeline.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-lg border px-2 py-2 text-center ${
                step.state === "FINAL"
                  ? "border-emerald-400/60 bg-emerald-500/15"
                  : "border-slate-700 bg-slate-900"
              }`}
            >
              <div className="text-[9px] font-bold text-slate-500">{String(index + 1).padStart(2, "0")} · {step.state}</div>
              <div className="mt-0.5 text-[10px] font-black leading-tight text-slate-100">{step.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
