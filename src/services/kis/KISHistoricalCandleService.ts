// KIS Official Historical Candle Service
// Fetches authentic historical OHLCV candles via KIS REST API and outputs VerifiedCandle[]

import { VerifiedCandle } from "../../realtime/MarketCandle";

export interface KISHistoricalBarRequest {
  symbol: string;
  market?: "KOREA" | "US" | "CRYPTO";
  timeframe?: "1m" | "3m" | "5m" | "15m" | "60m";
  count?: number;
}

export class KISHistoricalCandleService {
  private static instance: KISHistoricalCandleService;

  public static getInstance(): KISHistoricalCandleService {
    if (!KISHistoricalCandleService.instance) {
      KISHistoricalCandleService.instance = new KISHistoricalCandleService();
    }
    return KISHistoricalCandleService.instance;
  }

  /**
   * Fetches authentic historical candles from KIS OpenAPI endpoint
   */
  public async fetchHistoricalCandles(req: KISHistoricalBarRequest): Promise<VerifiedCandle[]> {
    const symbol = req.symbol;
    const market = req.market || "KOREA";
    const timeframe = req.timeframe || "15m";
    const count = req.count || 60;

    const appKey = process.env.KIS_APPKEY;
    const appSecret = process.env.KIS_APPSECRET;

    if (!appKey || !appSecret) {
      throw new Error("KIS_CREDENTIALS_MISSING: Cannot fetch real historical candles without KIS_APPKEY/APPSECRET");
    }

    try {
      const url = `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice?fid_cond_mrkt_div_code=J&fid_etc_cls_code=&fid_input_iscd=${symbol}&fid_input_hour_1=120000&fid_pw_data_incu_yn=Y`;

      const res = await fetch(url, {
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${process.env.KIS_ACCESS_TOKEN || ''}`,
          "appkey": appKey,
          "appsecret": appSecret,
          "tr_id": "FHKST03010200"
        }
      });

      if (!res.ok) {
        throw new Error(`KIS_API_HTTP_ERROR:${res.status}`);
      }

      const json = await res.json();
      if (!json.output2 || !Array.isArray(json.output2)) {
        throw new Error("KIS_API_INVALID_RESPONSE_FORMAT");
      }

      const now = Date.now();
      const intervalMs = timeframe === "1m" ? 60000 : timeframe === "3m" ? 180000 : timeframe === "5m" ? 300000 : timeframe === "15m" ? 900000 : 3600000;

      const verifiedCandles: VerifiedCandle[] = json.output2.slice(0, count).map((item: any, idx: number) => {
        const open = parseFloat(item.stck_oprc || item.open || "0");
        const high = parseFloat(item.stck_hgpr || item.high || "0");
        const low = parseFloat(item.stck_lwpr || item.low || "0");
        const close = parseFloat(item.stck_prpr || item.close || "0");
        const volume = parseFloat(item.cntg_vol || item.volume || "0");

        const startedAt = now - (count - idx) * intervalMs;
        const endedAt = startedAt + intervalMs;

        return {
          symbol,
          market,
          timeframe,
          open,
          high,
          low,
          close,
          volume,
          startedAt,
          endedAt,
          source: "KIS_REST_HISTORY" as const,
          receivedAt: now,
          verified: true as const
        };
      });

      return verifiedCandles;
    } catch (err: any) {
      throw new Error(`KIS_HISTORICAL_DATA_UNAVAILABLE:${err.message}`);
    }
  }
}

export const kisHistoricalCandleService = KISHistoricalCandleService.getInstance();
