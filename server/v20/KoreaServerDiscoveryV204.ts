import { KRX_AND_GLOBAL_MASTER_UNIVERSE } from "../../src/data/krxMasterUniverse";
import type { HotListItemV192 } from "../../src/services/GlobalRealtimeScannerV192";

interface NaverDiscoveryRowV204 {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  price: number;
  changePct: number;
  volume: number;
  tradeValue: number;
}

export interface KoreaDiscoveryResultV204 {
  candidates: HotListItemV192[];
  scannedTotal: number;
  receivedQuotes: number;
  source: "NAVER_DISPLAY_ONLY_DISCOVERY";
}

function numeric(value: unknown): number {
  const n = Number(String(value ?? "").replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function percentile(values: number[], value: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let lessOrEqual = 0;
  for (const v of sorted) {
    if (v <= value) lessOrEqual += 1;
  }
  return Math.round((lessOrEqual / sorted.length) * 100);
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function parseMarket(item: any, fallback: "KOSPI" | "KOSDAQ"): "KOSPI" | "KOSDAQ" {
  const label = String(
    item?.stockExchangeType?.nameKor ??
    item?.stockExchangeType?.name ??
    item?.market ??
    ""
  ).toUpperCase();
  if (label.includes("KOSDAQ") || label.includes("코스닥")) return "KOSDAQ";
  if (label.includes("KOSPI") || label.includes("코스피")) return "KOSPI";
  return fallback;
}

/**
 * Server-side Korean-stock discovery prefilter.
 *
 * Naver data is intentionally DISPLAY_ONLY here. It is NEVER allowed to
 * become a final BUY/YES signal. The result is only a short list of liquid,
 * active symbols that the KIS-backed V20.4 runtime will verify from scratch.
 */
export class KoreaServerDiscoveryV204 {
  public constructor(
    private maxCandidates = 30,
    private batchSize = 30,
    private concurrency = 4,
  ) {}

  private async fetchBatch(
    records: Array<{ symbol: string; name: string; market: "KOSPI" | "KOSDAQ" }>,
  ): Promise<NaverDiscoveryRowV204[]> {
    if (!records.length) return [];
    const bySymbol = new Map(records.map((record) => [record.symbol, record]));
    const codes = records.map((record) => record.symbol).join(",");

    try {
      const response = await fetch(
        `https://polling.finance.naver.com/api/realtime/domestic/stock/${codes}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://finance.naver.com/",
            "Accept": "application/json, text/plain, */*",
          },
          signal: AbortSignal.timeout(3500),
        },
      );

      if (!response.ok) return [];
      const body = await response.json() as any;
      const rows = Array.isArray(body?.datas) ? body.datas : [];

      return rows.flatMap((item: any): NaverDiscoveryRowV204[] => {
        const symbol = String(item?.itemCode ?? item?.code ?? "").trim();
        const fallback = bySymbol.get(symbol);
        if (!fallback || !/^\d{6}$/.test(symbol)) return [];

        const price = numeric(item?.closePriceRaw ?? item?.closePrice);
        const rawChangePct = numeric(item?.fluctuationsRatioRaw ?? item?.fluctuationsRatio);
        const direction = String(item?.compareToPreviousPrice?.name ?? "").toUpperCase();
        const directionCode = String(item?.compareToPreviousPrice?.code ?? "");
        const isDown = direction === "FALLING" || directionCode === "4" || directionCode === "5";
        const changePct = isDown ? -Math.abs(rawChangePct) : Math.abs(rawChangePct);
        const volume = numeric(item?.accumulatedTradingVolumeRaw ?? item?.accumulatedTradingVolume);
        const tradeValue = numeric(item?.accumulatedTradingValueRaw ?? item?.accumulatedTradingValue);

        if (!(price > 0) || !(volume > 0)) return [];

        return [{
          symbol,
          name: String(item?.stockName ?? fallback.name).trim() || fallback.name,
          market: parseMarket(item, fallback.market),
          price,
          changePct,
          volume,
          tradeValue: tradeValue > 0 ? tradeValue : price * volume,
        }];
      });
    } catch {
      return [];
    }
  }

  public async discover(): Promise<KoreaDiscoveryResultV204> {
    const universeMap = new Map<string, { symbol: string; name: string; market: "KOSPI" | "KOSDAQ" }>();

    for (const record of KRX_AND_GLOBAL_MASTER_UNIVERSE) {
      if (record.market !== "KOSPI" && record.market !== "KOSDAQ") continue;
      if (!/^\d{6}$/.test(record.symbol)) continue;
      if (!universeMap.has(record.symbol)) {
        universeMap.set(record.symbol, {
          symbol: record.symbol,
          name: record.name,
          market: record.market,
        });
      }
    }

    const universe = [...universeMap.values()];
    const batches = chunks(universe, this.batchSize);
    const rows: NaverDiscoveryRowV204[] = [];

    for (let i = 0; i < batches.length; i += this.concurrency) {
      const group = batches.slice(i, i + this.concurrency);
      const groupRows = await Promise.all(group.map((batch) => this.fetchBatch(batch)));
      for (const result of groupRows) rows.push(...result);
    }

    // Discovery favors liquid positive-momentum names, while avoiding obvious
    // late-stage spikes. These numbers are ranking heuristics only, never a
    // claimed win probability or a BUY threshold.
    const eligible = rows.filter((row) => row.changePct > 0 && row.changePct <= 20);
    const tradeValues = eligible.map((row) => row.tradeValue);
    const volumes = eligible.map((row) => row.volume);
    const changes = eligible.map((row) => row.changePct);

    const scored = eligible.map((row) => {
      const turnoverP = percentile(tradeValues, row.tradeValue);
      const volumeP = percentile(volumes, row.volume);
      const momentumP = percentile(changes, row.changePct);
      const discoveryScore = Math.round(turnoverP * 0.55 + momentumP * 0.30 + volumeP * 0.15);

      const item: HotListItemV192 = {
        symbol: row.symbol,
        name: row.name,
        market: "KOREA",
        exchange: row.market,
        currentPrice: row.price,
        priceChange24hPct: row.changePct,
        volatilityScore: Math.min(99, Math.round(Math.abs(row.changePct) * 4 + 35)),
        aiMatchScore: discoveryScore,
        expectedReturnPct: null,
        planningObjectiveNote: "Discovery only. Final target/stop is recomputed from verified KIS candles.",
        patternType: "DISCOVERY_ONLY",
        patternName: "KIS 심층검증 대기",
        targetPrice: null,
        stopLoss: null,
        holdingPeriod: "미확정",
        riskRewardRatio: "N/A",
        volumeIncreaseRatio: null,
        rsiIndicator: null,
        reasoning: "Naver DISPLAY_ONLY 유동성/모멘텀 발견 후보. 이 정보만으로 YES 판정 금지.",
        grade: discoveryScore >= 85 ? "S" : discoveryScore >= 70 ? "A" : "B",
        setupScore: discoveryScore,
        dataStatus: "NO_DATA",
        evidenceCount: 0,
        evidenceList: [
          `DISCOVERY_TURNOVER_PERCENTILE:${turnoverP}`,
          `DISCOVERY_MOMENTUM_PERCENTILE:${momentumP}`,
          "DISPLAY_ONLY_NOT_FINAL_EVIDENCE",
        ],
        metrics: {
          rvol: null,
          vwap: null,
          ema9: null,
          ema20: null,
          ema50: null,
          rsi14: null,
          atr14: null,
          rs15m: null,
          breakoutConfirmed: null,
          chaseRisk: null,
          exhaustionRisk: null,
          evidenceCoveragePct: 0,
        },
      };

      return item;
    });

    scored.sort((a, b) => {
      if (b.setupScore !== a.setupScore) return b.setupScore - a.setupScore;
      return b.currentPrice - a.currentPrice;
    });

    return {
      candidates: scored.slice(0, this.maxCandidates),
      scannedTotal: universe.length,
      receivedQuotes: rows.length,
      source: "NAVER_DISPLAY_ONLY_DISCOVERY",
    };
  }
}

export const koreaServerDiscoveryV204 = new KoreaServerDiscoveryV204();
