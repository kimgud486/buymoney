import React, { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  VerifiedFinancialResult,
  validateStockGptFinancialResponse,
} from '../../services/stockGptFinancialTruthValidator';

type Props = {
  symbol: string;
  market?: string;
};

const EMPTY_RESULT: VerifiedFinancialResult = {
  state: 'NO_DATA',
  symbol: '',
  source: null,
  asOf: null,
  per: null,
  pbr: null,
  eps: null,
  bps: null,
  reason: 'NOT_LOADED',
};

function formatMultiple(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'NO_DATA';
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}배`;
}

function formatWon(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'NO_DATA';
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;
}

export default function StockGPTVerifiedFinancialPanel({ symbol, market }: Props) {
  const cleanSymbol = String(symbol || '').trim().toUpperCase();
  const isKoreaStock = /^\d{6}$/.test(cleanSymbol) && (market === 'KOSPI' || market === 'KOSDAQ' || market === 'KOREA');
  const [result, setResult] = useState<VerifiedFinancialResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!isKoreaStock) {
      setResult({ ...EMPTY_RESULT, symbol: cleanSymbol, reason: 'KIS_DOMESTIC_ONLY' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/broker/v21/runtime?symbol=${encodeURIComponent(cleanSymbol)}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        setResult({ ...EMPTY_RESULT, symbol: cleanSymbol, reason: `HTTP_${response.status}` });
        return;
      }
      const payload = await response.json();
      setResult(validateStockGptFinancialResponse(payload, cleanSymbol));
    } catch {
      setResult({ ...EMPTY_RESULT, symbol: cleanSymbol, reason: 'FETCH_FAILED' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanSymbol, market]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-[#050a12] p-6" data-testid="stock-gpt-financial-loading">
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
          <RefreshCw className="h-4 w-4 animate-spin" /> KIS 실제 재무 지표 확인 중
        </div>
      </div>
    );
  }

  if (result.state !== 'READY') {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-[#050a12] p-6" data-testid="stock-gpt-financial-no-data">
        <div className="max-w-xl rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-amber-300" />
          <div className="mt-3 text-base font-black text-white">재무 정보: NO_DATA</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            KIS 국내주식 실시간 조회에서 직접 확인된 재무 지표만 표시합니다.
          </p>
          <p className="mt-2 text-[11px] text-amber-300/80">검증 실패: {result.reason || 'UNKNOWN'}</p>
          {isKoreaStock && (
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200"
            >
              다시 확인
            </button>
          )}
        </div>
      </div>
    );
  }

  const metrics = [
    ['PER', formatMultiple(result.per), '주가 ÷ 주당순이익'],
    ['PBR', formatMultiple(result.pbr), '주가 ÷ 주당순자산'],
    ['EPS', formatWon(result.eps), '주당순이익'],
    ['BPS', formatWon(result.bps), '주당순자산'],
  ] as const;

  return (
    <div className="bg-[#050a12] p-4" data-testid="stock-gpt-verified-financial-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <BarChart3 className="h-4 w-4 text-cyan-300" /> 검증 재무 지표
          </div>
          <p className="mt-1 text-[11px] text-slate-500">KIS 실시간 종목 조회 응답에 실제 포함된 값만 표시합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200"
        >
          새로 확인
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value, description]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-[#08111d] p-4">
            <div className="text-[10px] font-black text-slate-500">{label}</div>
            <div className={`mt-2 text-lg font-black ${value === 'NO_DATA' ? 'text-slate-600' : 'text-slate-100'}`}>{value}</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-600">{description}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-xs">
        <div className="flex items-center gap-2 font-black text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> 출처 {result.source}
        </div>
        <div className="text-slate-500">
          확인시각 {result.asOf ? new Date(result.asOf).toLocaleString('ko-KR') : 'NO_DATA'}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        현재는 KIS에서 직접 확인되는 PER·PBR·EPS·BPS만 제공합니다. 매출·영업이익·부채비율 등 별도 재무제표 공급자가 검증되기 전에는 임의 숫자를 만들지 않습니다.
      </p>
    </div>
  );
}
