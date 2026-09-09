import { KISBrokerGatewayV123, KIS_REAL_REST_DOMAIN } from "../broker/KISBrokerGatewayV123";

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

function n(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function hms(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
}

function parseKisDateTime(dateText: unknown, timeText?: unknown): number {
  const date = String(dateText ?? "").replace(/\D/g, "");
  const time = String(timeText ?? "000000").replace(/\D/g, "").padStart(6, "0");
  if (date.length !== 8 || time.length !== 6) return 0;

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6)) - 1;
  const day = Number(date.slice(6, 8));
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2, 4));
  const second = Number(time.slice(4, 6));

  // The KIS domestic timestamps are Korea local time. Date.UTC minus nine hours
  // yields the matching Unix epoch without depending on the server timezone.
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

export class KISHistoricalDataProviderV204 {
  private gateway: KISBrokerGatewayV123;
  private appKey: string;
  private appSecret: string;

  constructor(gateway?: KISBrokerGatewayV123) {
    this.gateway = gateway ?? new KISBrokerGatewayV123();
    this.appKey = process.env.KIS_APPKEY ?? "";
    this.appSecret = process.env.KIS_APPSECRET ?? "";
  }

  public isConfigured(): boolean {
    return Boolean(this.appKey && this.appSecret && this.gateway.isConfigured());
  }

  private async getJson(path: string, trId: string, params: URLSearchParams): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error("KIS_HISTORY_NOT_CONFIGURED");
    }

    const token = await this.gateway.getOAuthToken(false);
    if (!token) {
      throw new Error("KIS_HISTORY_OAUTH_FAILED");
    }

    const response = await fetch(`${KIS_REAL_REST_DOMAIN}${path}?${params.toString()}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        appkey: this.appKey,
        appsecret: this.appSecret,
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
      const end = new Date(asOf);
      const start = new Date(asOf);
      start.setDate(start.getDate() - Math.max(120, requiredBars * 3));

      const params = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: symbol,
        FID_INPUT_DATE_1: ymd(start),
        FID_INPUT_DATE_2: ymd(end),
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
    let cursor = new Date(asOf);

    try {
      // KIS returns a bounded number of rows per intraday request. Walk backward
      // by the earliest returned timestamp and dedupe. No synthetic gap filling.
      for (let page = 0; page < 8 && dedupeAndSort(collected).length < requiredBars; page += 1) {
        const params = new URLSearchParams({
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: symbol,
          FID_INPUT_HOUR_1: hms(cursor),
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
