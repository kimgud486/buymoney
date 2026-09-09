import React from "react";
import { AlertTriangle, CheckCircle2, Gauge, Layers3 } from "lucide-react";
import { PatternRecognitionVisualGuide } from "./PatternRecognitionVisualGuide";
import { PATTERN_EXECUTION_AUDIT } from "../scanner/patternExecutionAudit";
import type { VerifiedSignalResult } from "../scanner/verifiedSignalEngine";

type PatternRegistry = VerifiedSignalResult["patternRegistry"];

export interface VerifiedPatternGuideBridgeProps {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  currentPrice: number;
  changePct: number;
  detectedPatternCodes: string[];
  patternRegistry?: PatternRegistry;
  verified: boolean;
  error?: string;
}

const Stat: React.FC<{
  label: string;
  value: number | string;
  note?: string;
}> = ({ label, value, note }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500">{label}</div>
    <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
    {note && <div className="mt-1 text-[10px] leading-snug text-slate-500">{note}</div>}
  </div>
);

export const VerifiedPatternGuideBridge: React.FC<VerifiedPatternGuideBridgeProps> = ({
  symbol,
  name,
  market,
  currentPrice,
  changePct,
  detectedPatternCodes,
  patternRegistry,
  verified,
  error,
}) => {
  const renderedDetected = detectedPatternCodes.length;
  const coverageComplete = PATTERN_EXECUTION_AUDIT.notImplemented === 0
    && PATTERN_EXECUTION_AUDIT.directionMismatches.length === 0;

  return (
    <div className="w-full border-b border-slate-200 bg-slate-50 px-4 py-5 md:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-slate-500 uppercase">
              <Layers3 size={15} /> Verified Pattern Bridge
            </div>
            <div className="mt-1 text-sm font-bold text-slate-800">
              {symbol} · 실제 완료봉 재검증 → 다중 패턴 탐지 → 패턴 가이드
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
              verified
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {verified ? `검증 완료 · 탐지 ${renderedDetected}개` : "검증 중/실패"}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="CATALOG"
            value={PATTERN_EXECUTION_AUDIT.catalog}
            note="마스터 카탈로그 고유 패턴"
          />
          <Stat
            label="EXECUTABLE"
            value={PATTERN_EXECUTION_AUDIT.executable}
            note="동일 방향 실제 판정 규칙 보유"
          />
          <Stat
            label="COVERAGE"
            value={`${PATTERN_EXECUTION_AUDIT.coveragePct}%`}
            note={`미구현 ${PATTERN_EXECUTION_AUDIT.notImplemented}개`}
          />
          <Stat
            label="EVALUATED"
            value={patternRegistry?.evaluated ?? 0}
            note="현재 완료봉 수로 실제 평가 가능"
          />
          <Stat
            label="MATCHED"
            value={patternRegistry?.matched ?? renderedDetected}
            note="중복 제거 후 실제 탐지"
          />
          <Stat
            label="RENDERED"
            value={renderedDetected}
            note="가이드에 전달된 탐지 코드"
          />
        </div>

        {!coverageComplete && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-900">
            <Gauge className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              등록 수와 실행 수를 같은 숫자로 표시하지 않습니다. 현재 카탈로그 {PATTERN_EXECUTION_AUDIT.catalog}개 중 같은 방향의 실제 판정 규칙이 연결된 것은 {PATTERN_EXECUTION_AUDIT.executable}개입니다.
              {PATTERN_EXECUTION_AUDIT.directionMismatches.length > 0
                ? ` 방향 불일치 ${PATTERN_EXECUTION_AUDIT.directionMismatches.length}개도 실행 커버리지에서 제외됩니다.`
                : ""}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            {error}
          </div>
        )}

        <PatternRecognitionVisualGuide
          selectedStockSymbol={symbol}
          selectedStockName={name}
          changePct={changePct}
          currentPrice={currentPrice}
          market={market}
          detectedPatternCodes={detectedPatternCodes}
        />
      </div>
    </div>
  );
};
