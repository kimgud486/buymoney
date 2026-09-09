import { getKisMarketDataCredentialsV204 } from "./KISMarketDataCredentialRegistryV204";

export type HistoricalTimeframeV204 = "1m" | "D";

export interface VerifiedHistoricalCandleV204 {
  timestamp: number;
  lastTradeTimestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "KIS_REST";
  timeframe: HistoricalTimeframeV204;
}

export interface HistoricalSeedResultV204 {
  symbol: string;
  timeframe: HistoricalTimeframeV204;
  status: "HISTORY_VERIFIED" | "HISTORY_UNVERIFIED";
  requiredBars: number;
  candles: VerifiedHistoricalCandleV204[];
  reason: string;
}

type KisRow = Record<string, unknown>;

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

const KIS_REAL_REST_DOMAIN = process.env.KIS_REAL_DOMAIN ?? "https://openapi.koreainvestment.com:9443";

function n(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function kstParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const out: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
}

export function ymdKst(date: Date): string {
  const p = kstParts(date);
  return `${p.year || ""}${p.month || ""}${p.day || ""}`;
}

export function hmsKst(date: Date): string {
  const p = kstParts(date);
  return `${p.hour || "00"}${p.minute || "00"}${p.second || "00"}`;
}

export function parseKisDateTime(dateText: unknown, timeText?: unknown): number {
  const date = String(dateText ?? "").replace(/\D/g, "");
  const time = String(timeText ?? "000000").replace(/\D/g, "").padStart(6, "0");
  if (date.length !== 8 || time.length !== 6) return 0;

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6)) - 1;
  const day = Number(date.slice(6, 8));
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2, 4));
  const second = Number(time.slice(4, 6));

  if (
    !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) ||
    hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59
  ) {
    return 0;
  }

  // KIS domestic date/time is Asia/Seoul. Convert explicitly to UTC epoch.
  return Date.UTC(year, month, day, hour - 9, minute, second);
}

function dedupeAndSort(candles: VerifiedHistoricalCandleV204[]): VerifiedHistoricalCandleV204[] {
  const byTimestamp = new Map<number, VerifiedHistoricalCandleV204>();
  for (const candle of candles) {
    if (!candle.timestamp || candle.close <= 0) continue;
    byTimestamp.set(candle.timestamp, candle);
  }
  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Read-only KIS domestic market history provider.
 *
 * Deliberately does not require CANO/account credentials. Historical quote
 * endpoints only need appKey/appSecret + OAuth, and must not be coupled to the
 * order gateway or to whether live trading is enabled.
 */
export class KISHistoricalDataProviderV204 {
  private tokenCache: TokenCache | null = null;

  public isConfigured(): boolean {
    return getKisMarketDataCredentialsV204() !== null;
  }

  private async getAccessToken(): Promise<string> {
    const credentials = getKisMarketDataCredentialsV204();
    if (!credentials) throw new Error("KIS_HISTORY_NOT_CONFIGURED");

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.accessToken;
    }

    const response = await fetch(`${KIS_REAL_REST_DOMAIN}/oauth2/tokenP`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: credentials.appKey,
        appsecret: credentials.appSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`KIS_HISTORY_OAUTH_HTTP_${response.status}`);
    }

    const body = await response.json() as any;
    const accessToken = String(body?.access_token || "").trim();
    if (!accessToken) throw new Error("KIS_HISTORY_OAUTH_MISSING_TOKEN");

    const expiresIn = Number(body?.expires_in ?? 86_400);
    this.tokenCache = {
      accessToken,
      expiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 86_400) * 1000,
    };
    return accessToken;
  }

  private async getJson(path: string, trId: string, params: URLSearchParams): Promise<any> {
    const credentials = getKisMarketDataCredentialsV204();
    if (!credentials) throw new Error("KIS_HISTORY_NOT_CONFIGURED");

    const token = await this.getAccessToken();
    const response = await fetch(`${KIS_REAL_REST_DOMAIN}${path}?${params.toString()}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        appkey: credentials.appKey,
        appsecret: credentials.appSecret,
        tr_id: trId,
        "content-type": "application/json; charset=utf-8"
      }
    });

    if (!response.ok) {
      throw new Error(`KIS_HISTORY_HTTP_${response.status}`);
    }

    const body = await response.json();
    if (String(body?.rt_cd ?? "0") !== "0") {
      throw new Error(`KIS_HISTORY_REJECTED:${body?.msg_cd ?? "UNKNOWN"}:${body?.msg1 ?? ""}`);
    }
    return body;
  }

  public async fetchDaily(symbol: string, requiredBars = 50, asOf = new Date()): Promise<HistoricalSeedResultV204> {
    try {
      const end = new Date(asOf.getTime());
      const start = new Date(asOf.getTime() - Math.max(120, requiredBars * 3) * 86_400_000);

      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: symbol,
        FID_INPUT_DATE_1: ymdKst(start),
        FID_INPUT_DATE_2: ymdKst(end),
        FID_PERIOD_DIV_CODE: "D",
        FID_ORG_ADJ_PRC: "0"
      });

      const body = await this.getJson(
        "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
        "FHKST03010100",
        params
      );

      const rows: KisRow[] = Array.isArray(body?.output2) ? body.output2 : [];
      const candles = dedupeAndSort(rows.map((row) => {
        const timestamp = parseKisDateTime(row.stck_bsop_date, "153000");
        return {
          timestamp,
          lastTradeTimestamp: timestamp,
          open: n(row.stck_oprc),
          high: n(row.stck_hgpr),
          low: n(row.stck_lwpr),
          close: n(row.stck_clpr),
          volume: n(row.acml_vol),
          source: "KIS_REST" as const,
          timeframe: "D" as const
        };
      }));

      const status = candles.length >= requiredBars ? "HISTORY_VERIFIED" : "HISTORY_UNVERIFIED";
      return {
        symbol,
        timeframe: "D",
        status,
        requiredBars,
        candles,
        reason: status === "HISTORY_VERIFIED" ? "KIS_DAILY_HISTORY_OK" : `KIS_DAILY_BARS_${candles.length}_LT_${requiredBars}`
      };
    } catch (error: any) {
      return {
        symbol,
        timeframe: "D",
        status: "HISTORY_UNVERIFIED",
        requiredBars,
        candles: [],
        reason: error?.message || "KIS_DAILY_HISTORY_FAILED"
      };
    }
  }

  public async fetchIntraday1m(symbol: string, requiredBars = 50, asOf = new Date()): Promise<HistoricalSeedResultV204> {
    const collected: VerifiedHistoricalCandleV204[] = [];
    let cursor = new Date(asOf.getTime());

    try {
      // KIS returns a bounded number of rows per intraday request. Walk backward
      // by the earliest returned timestamp and dedupe. No synthetic gap filling.
      for (let page = 0; page < 8 && dedupeAndSort(collected).length < requiredBars; page += 1) {
        const params = new URLSearchParams({
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: symbol,
          FID_INPUT_HOUR_1: hmsKst(cursor),
          FID_PW_DATA_INCU_YN: "Y",
          FID_ETC_CLS_CODE: ""
        });

        const body = await this.getJson(
          "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
          "FHKST03010200",
          params
        );

        const rows: KisRow[] = Array.isArray(body?.output2) ? body.output2 : [];
        if (!rows.length) break;

        const pageCandles = rows.map((row) => {
          const timestamp = parseKisDateTime(row.stck_bsop_date, row.stck_cntg_hour);
          return {
            timestamp,
            lastTradeTimestamp: timestamp,
            open: n(row.stck_oprc),
            high: n(row.stck_hgpr),
            low: n(row.stck_lwpr),
            close: n(row.stck_prpr),
            volume: n(row.cntg_vol),
            source: "KIS_REST" as const,
            timeframe: "1m" as const
          };
        }).filter((candle) => candle.timestamp > 0 && candle.close > 0);

        collected.push(...pageCandles);
        const earliest = pageCandles.reduce((min, candle) => Math.min(min, candle.timestamp), Number.POSITIVE_INFINITY);
        if (!Number.isFinite(earliest)) break;
        cursor = new Date(earliest - 1000);
      }

      const candles = dedupeAndSort(collected);
      const status = candles.length >= requiredBars ? "HISTORY_VERIFIED" : "HISTORY_UNVERIFIED";
      return {
        symbol,
        timeframe: "1m",
        status,
        requiredBars,
        candles,
        reason: status === "HISTORY_VERIFIED" ? "KIS_1M_HISTORY_OK" : `KIS_1M_BARS_${candles.length}_LT_${requiredBars}`
      };
    } catch (error: any) {
      return {
        symbol,
        timeframe: "1m",
        status: "HISTORY_UNVERIFIED",
        requiredBars,
        candles: dedupeAndSort(collected),
        reason: error?.message || "KIS_1M_HISTORY_FAILED"
      };
    }
  }

  public async verifySeed(symbol: string, requiredBars = 50): Promise<{
    status: "HISTORY_VERIFIED" | "HISTORY_UNVERIFIED";
    intraday: HistoricalSeedResultV204;
    daily: HistoricalSeedResultV204;
  }> {
    const [intraday, daily] = await Promise.all([
      this.fetchIntraday1m(symbol, requiredBars),
      this.fetchDaily(symbol, requiredBars)
    ]);

    return {
      status: intraday.status === "HISTORY_VERIFIED" && daily.status === "HISTORY_VERIFIED"
        ? "HISTORY_VERIFIED"
        : "HISTORY_UNVERIFIED",
      intraday,
      daily
    };
  }
}
