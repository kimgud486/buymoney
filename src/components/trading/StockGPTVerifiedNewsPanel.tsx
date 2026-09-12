import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import {
  VerifiedNewsResult,
  validateStockGptNewsResponse,
} from '../../services/stockGptNewsTruthValidator';

type Props = {
  symbol: string;
};

const EMPTY_RESULT: VerifiedNewsResult = {
  state: 'NO_DATA',
  symbol: '',
  sourceType: null,
  articles: [],
  reason: 'NOT_LOADED',
};

export default function StockGPTVerifiedNewsPanel({ symbol }: Props) {
  const cleanSymbol = String(symbol || '').trim().toUpperCase();
  const [result, setResult] = useState<VerifiedNewsResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);

  const load = async (force = false) => {
    if (!cleanSymbol) {
      setResult({ ...EMPTY_RESULT, reason: 'SYMBOL_REQUIRED' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/corporate-news/analytics/${encodeURIComponent(cleanSymbol)}?force=${force ? 'true' : 'false'}`,
        { cache: 'no-store' },
      );
      if (!response.ok) {
        setResult({ ...EMPTY_RESULT, symbol: cleanSymbol, reason: `HTTP_${response.status}` });
        return;
      }
      const payload = await response.json();
      setResult(validateStockGptNewsResponse(payload, cleanSymbol));
    } catch {
      setResult({ ...EMPTY_RESULT, symbol: cleanSymbol, reason: 'FETCH_FAILED' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanSymbol]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-[#050a12] p-6" data-testid="stock-gpt-news-loading">
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
          <RefreshCw className="h-4 w-4 animate-spin" /> 검증 가능한 뉴스 원문 확인 중
        </div>
      </div>
    );
  }

  if (result.state !== 'READY') {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-[#050a12] p-6" data-testid="stock-gpt-news-no-data">
        <div className="max-w-xl rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-amber-300" />
          <div className="mt-3 text-base font-black text-white">관련 뉴스: NO_DATA</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            실제 출처 URL과 게시시각이 확인된 검색 접지 기사만 표시합니다.
          </p>
          <p className="mt-2 text-[11px] text-amber-300/80">검증 실패: {result.reason || 'UNKNOWN'}</p>
          <button
            type="button"
            onClick={() => void load(true)}
            className="mt-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200"
          >
            다시 확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050a12] p-4" data-testid="stock-gpt-verified-news-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Newspaper className="h-4 w-4 text-cyan-300" /> 검증 원문 뉴스
          </div>
          <p className="mt-1 text-[11px] text-slate-500">출처·URL·게시시각이 확인된 기사만 표시합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200"
        >
          새로 확인
        </button>
      </div>

      <div className="space-y-3">
        {result.articles.map((article) => (
          <article key={article.id} className="rounded-xl border border-slate-800 bg-[#08111d] p-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              <span className="font-black text-cyan-300">{article.source}</span>
              <span>·</span>
              <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleString('ko-KR')}</time>
            </div>
            <h3 className="mt-2 text-sm font-black leading-6 text-slate-100">{article.title}</h3>
            {article.summary && <p className="mt-2 text-xs leading-5 text-slate-400">{article.summary}</p>}
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1 text-xs font-black text-cyan-300 hover:text-cyan-200"
            >
              원문 확인 <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
