export type VerifiedNewsArticle = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string | null;
};

export type VerifiedNewsResult = {
  state: 'READY' | 'NO_DATA';
  symbol: string;
  sourceType: string | null;
  articles: VerifiedNewsArticle[];
  reason: string | null;
};

const TRUSTED_SOURCE_TYPE = 'GEMINI_GOOGLE_SEARCH_GROUNDED';
const BLOCKED_SOURCE_MARKERS = ['PRESET', 'FALLBACK', 'DOMAIN_FINANCIAL_DATABASE', 'MOCK', 'DEMO', 'SYNTHETIC'];

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

function validHttpUrl(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function validPublishedAt(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toISOString();
}

export function validateStockGptNewsResponse(payload: unknown, requestedSymbol: string): VerifiedNewsResult {
  const symbol = String(requestedSymbol || '').trim().toUpperCase();
  const noData = (reason: string): VerifiedNewsResult => ({
    state: 'NO_DATA',
    symbol,
    sourceType: null,
    articles: [],
    reason,
  });

  if (!symbol) return noData('SYMBOL_REQUIRED');
  if (!payload || typeof payload !== 'object') return noData('INVALID_RESPONSE');

  const data = payload as Record<string, unknown>;
  if (data.success !== true) return noData('API_NOT_SUCCESSFUL');

  const responseSymbol = nonEmptyString(data.symbol)?.toUpperCase() ?? null;
  if (responseSymbol && responseSymbol !== symbol) return noData('SYMBOL_MISMATCH');

  const sourceType = nonEmptyString(data.sourceType);
  if (!sourceType) return noData('SOURCE_TYPE_MISSING');
  const upperSourceType = sourceType.toUpperCase();
  if (BLOCKED_SOURCE_MARKERS.some((marker) => upperSourceType.includes(marker))) {
    return noData('FALLBACK_SOURCE_BLOCKED');
  }
  if (sourceType !== TRUSTED_SOURCE_TYPE || data.isAiGenerated !== true) {
    return noData('VERIFIED_GROUNDED_SOURCE_REQUIRED');
  }

  if (!Array.isArray(data.articles)) return noData('ARTICLES_MISSING');

  const articles: VerifiedNewsArticle[] = [];
  for (const rawArticle of data.articles) {
    if (!rawArticle || typeof rawArticle !== 'object') continue;
    const article = rawArticle as Record<string, unknown>;
    const title = nonEmptyString(article.title);
    const source = nonEmptyString(article.source);
    const url = validHttpUrl(article.url);
    const publishedAt = validPublishedAt(article.publishedAt);
    if (!title || !source || !url || !publishedAt) continue;

    articles.push({
      id: nonEmptyString(article.id) ?? `${symbol}:${articles.length}:${publishedAt}`,
      title,
      source,
      url,
      publishedAt,
      summary: nonEmptyString(article.summary),
    });
  }

  if (articles.length === 0) return noData('NO_VERIFIABLE_ARTICLES');

  return {
    state: 'READY',
    symbol,
    sourceType,
    articles,
    reason: null,
  };
}
