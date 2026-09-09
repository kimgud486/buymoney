import React from "react";
import { 
  X, 
  BarChart2, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Flame, 
  Layers, 
  TrendingUp, 
  Cpu,
  Target
} from "lucide-react";
import { ShapeResult } from "../../scanner/GraphShapeScanner";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";

interface GraphShapeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockName: string;
  symbol: string;
  shapeResult?: ShapeResult;
  finalScore?: number;
}

export const GraphShapeScannerModal: React.FC<GraphShapeScannerModalProps> = ({
  isOpen,
  onClose,
  stockName,
  symbol,
  shapeResult,
  finalScore
}) => {
  useModalScrollLock(isOpen);

  if (!isOpen || !shapeResult) return null;

  const isYes = shapeResult.verdict === "YES";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{stockName}</h3>
                <span className="text-xs font-mono text-slate-400">({symbol})</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isYes 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                }`}>
                  {isYes ? `🔥 YES (${shapeResult.grade})` : "❌ EXCLUDED (NO)"}
                </span>
              </div>
              <p className="text-xs text-slate-400">GRAPH SHAPE + OHLCV MATHEMATICAL PATTERN SCANNER</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          
          {/* Score Trio Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400 mb-1">GRAPH SCORE</div>
              <div className="text-2xl font-black text-cyan-400 font-mono">{shapeResult.graphScore} <span className="text-xs text-slate-500">/ 100</span></div>
              <div className="mt-1 text-[10px] text-slate-400">캔들/차트/지표 정렬</div>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-slate-950/60 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400 mb-1">FLOW SCORE</div>
              <div className="text-2xl font-black text-blue-400 font-mono">{shapeResult.flowScore} <span className="text-xs text-slate-500">/ 100</span></div>
              <div className="mt-1 text-[10px] text-slate-400">RVOL/체결강도 수급</div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-slate-950/60 p-4 text-center">
              <div className="text-xs font-semibold text-slate-400 mb-1">RISK SCORE</div>
              <div className="text-2xl font-black text-amber-400 font-mono">{shapeResult.riskScore} <span className="text-xs text-slate-500">/ 100</span></div>
              <div className="mt-1 text-[10px] text-slate-400">Fakeout/추격 위험</div>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-center">
              <div className="text-xs font-semibold text-emerald-400 mb-1">FINAL SCORE</div>
              <div className="text-3xl font-black text-emerald-300 font-mono">{finalScore || shapeResult.finalScore} <span className="text-xs text-emerald-600">/ 100</span></div>
              <div className="mt-1 text-[10px] text-emerald-400/80 font-bold">40%G + 35%F + 25%R</div>
            </div>
          </div>

          {/* Multi-Timeframe Confirmation */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Layers className="h-4 w-4 text-cyan-400" />
                <span>Multi-Timeframe Confirmation (1분 ~ 일봉)</span>
              </div>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {shapeResult.timeframeChecks.passedCount} / 4 PASSED
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                shapeResult.timeframeChecks.tf1m ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-500"
              }`}>
                <span>1분봉 Breakout</span>
                {shapeResult.timeframeChecks.tf1m ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-600" />}
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                shapeResult.timeframeChecks.tf3m ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-500"
              }`}>
                <span>3분봉 VWAP Reclaim</span>
                {shapeResult.timeframeChecks.tf3m ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-600" />}
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                shapeResult.timeframeChecks.tf5m ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-500"
              }`}>
                <span>5분봉 EMA Trend</span>
                {shapeResult.timeframeChecks.tf5m ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-600" />}
              </div>

              <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                shapeResult.timeframeChecks.tfDaily ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-500"
              }`}>
                <span>일봉 상단 저항</span>
                {shapeResult.timeframeChecks.tfDaily ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-600" />}
              </div>
            </div>
          </div>

          {/* Detected Patterns */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>발견된 그래프/캔들/지표 모양 패턴</span>
            </h4>
            {shapeResult.patterns.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {shapeResult.patterns.map((p, idx) => (
                  <span key={idx} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                    ✓ {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">감지된 특수 매수 패턴이 없습니다.</p>
            )}
          </div>

          {/* Bullish Reasons */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>상승 예상 근거 (Why Bullish?)</span>
            </h4>
            <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
              {shapeResult.reasons.length > 0 ? (
                shapeResult.reasons.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-200">
                    <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">상승 근거가 부족합니다.</p>
              )}
            </div>
          </div>

          {/* Fake Breakout & Blockers */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Fake Breakout 및 위험 요소 검증</span>
            </h4>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fake Breakout (가짜 돌파 트랩)</span>
                {shapeResult.details.fakeBreakout ? (
                  <span className="font-bold text-rose-400 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> 위험 감지</span>
                ) : (
                  <span className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> 이상 없음 (통과)</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">VWAP 하회 여부</span>
                {shapeResult.details.belowVwap ? (
                  <span className="font-bold text-rose-400 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> VWAP 아래</span>
                ) : (
                  <span className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> VWAP 상단 (통과)</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">RSI 과열 (80 초과)</span>
                {shapeResult.details.rsiOverbought ? (
                  <span className="font-bold text-rose-400 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> 과열 상태</span>
                ) : (
                  <span className="font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> 정상 범위 (통과)</span>
                )}
              </div>

              {shapeResult.blockers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <span className="text-rose-400 font-bold block mb-1">차단 사유 (Blockers):</span>
                  <ul className="list-disc list-inside text-rose-300 space-y-0.5">
                    {shapeResult.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Fail-Closed YES ONLY Engine Protocol Enforced</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
