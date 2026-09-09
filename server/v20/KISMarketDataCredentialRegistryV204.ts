export interface KISMarketDataCredentialsV204 {
  appKey: string;
  appSecret: string;
}

let credentials: KISMarketDataCredentialsV204 | null = null;

/**
 * In-memory only credential handoff for market-data services.
 * Secrets are never serialized, logged, or returned by an HTTP endpoint.
 */
export function registerKisMarketDataCredentialsV204(
  next: Partial<KISMarketDataCredentialsV204>,
): void {
  const appKey = String(next.appKey || "").trim();
  const appSecret = String(next.appSecret || "").trim();
  if (!appKey || !appSecret) return;
  credentials = { appKey, appSecret };
}

export function getKisMarketDataCredentialsV204(): KISMarketDataCredentialsV204 | null {
  if (credentials) return { ...credentials };

  const appKey = String(
    process.env.KIS_APPKEY ||
    process.env.KIS_APP_KEY ||
    "",
  ).trim();
  const appSecret = String(
    process.env.KIS_APPSECRET ||
    process.env.KIS_APP_SECRET ||
    "",
  ).trim();

  if (!appKey || !appSecret) return null;
  return { appKey, appSecret };
}

/** Test-only reset. Does not mutate process.env. */
export function clearKisMarketDataCredentialsV204(): void {
  credentials = null;
}
