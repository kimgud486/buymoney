import { buildLiveStockItem, getAllStocks, LiveStockItem } from "../data/stockUniverse";

export type ExchangeUniverseMarket = "KOSPI" | "KOSDAQ" | "US" | "UPBIT";

export interface ExchangeUniverseSymbolV20 {
  symbol: string;
  name: string;
  market: ExchangeUniverseMarket;
  source: "KIS_MASTER" | "NASDAQ_TRADER" | "UPBIT" | "STATIC_FALLBACK";
  /**
   * Verified KIS overseas WebSocket subscription key.
   * Example from the official KIS sample: AAPL on Nasdaq -> DNASAAPL.
   * Leave undefined when the exchange-to-KIS prefix has not been verified.
   */
  kisRealtimeKey?: string;
}

export interface ExchangeUniverseSnapshotV20 {
  symbols: ExchangeUniverseSymbolV20[];
  liveStocks: LiveStockItem[];
  counts: { KOSPI: number; KOSDAQ: number; US: number; UPBIT: number; total: number };
  providerStatus: { KRX: "OK" | "FALLBACK"; US: "OK" | "FALLBACK"; UPBIT: "OK" | "FALLBACK" };
  refreshedAt: string;
}

const REFRESH_TTL_MS = 6 * 60 * 60 * 1000;
const KIS_MASTER_URLS = {
  KOSPI: "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
  KOSDAQ: "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
} as const;
const NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";
const OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";
const UPBIT_MARKETS_URL = "https://api.upbit.com/v1/market/all?is_details=true";

let cachedSnapshot: ExchangeUniverseSnapshotV20 | null = null;
let cachedAt = 0;
let inFlight: Promise<ExchangeUniverseSnapshotV20> | null = null;

function readU16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}
function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractFirstZipEntry(zip: Uint8Array): Promise<Uint8Array> {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (readU32(zip, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP_EOCD_NOT_FOUND");

  const centralOffset = readU32(zip, eocd + 16);
  if (readU32(zip, centralOffset) !== 0x02014b50) throw new Error("ZIP_CENTRAL_HEADER_NOT_FOUND");
  const method = readU16(zip, centralOffset + 10);
  const compressedSize = readU32(zip, centralOffset + 20);
  const uncompressedSize = readU32(zip, centralOffset + 24);
  const localOffset = readU32(zip, centralOffset + 42);
  if (readU32(zip, localOffset) !== 0x04034b50) throw new Error("ZIP_LOCAL_HEADER_NOT_FOUND");

  const nameLength = readU16(zip, localOffset + 26);
  const extraLength = readU16(zip, localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = zip.slice(dataStart, dataStart + compressedSize);

  const output = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
  if (!output) throw new Error(`ZIP_UNSUPPORTED_METHOD:${method}`);
  if (uncompressedSize && output.length !== uncompressedSize) throw new Error("ZIP_SIZE_MISMATCH");
  return output;
}

function unique(items: ExchangeUniverseSymbolV20[]): ExchangeUniverseSymbolV20[] {
  const map = new Map<string, ExchangeUniverseSymbolV20>();
  for (const item of items) {
    const symbol = String(item.symbol || "").trim().toUpperCase();
    const name = String(item.name || "").trim();
    if (!symbol || !name) continue;
    map.set(`${item.market}:${symbol}`, { ...item, symbol, name });
  }
  return Array.from(map.values());
}

function staticFallbackMetadata(): ExchangeUniverseSymbolV20[] {
  return getAllStocks().map((stock) => ({ symbol: stock.symbol, name: stock.name, market: stock.market, source: "STATIC_FALLBACK" as const }));
}

function parseKisMaster(content: Uint8Array, market: "KOSPI" | "KOSDAQ"): ExchangeUniverseSymbolV20[] {
  const decoder = new TextDecoder("euc-kr");
  const rows: ExchangeUniverseSymbolV20[] = [];
  let start = 0;
  for (let i = 0; i <= content.length; i++) {
    if (i !== content.length && content[i] !== 10) continue;
    const line = content.slice(start, i);
    start = i + 1;
    if (line.length < 61) continue;
    let code = new TextDecoder("ascii").decode(line.slice(0, 9)).trim();
    if (code.length > 6) code = code.slice(-6);
    if (!/^\d{6}$/.test(code)) continue;
    const name = decoder.decode(line.slice(21, 61)).trim();
    if (!name) continue;
    rows.push({ symbol: code, name, market, source: "KIS_MASTER" });
  }
  return rows;
}

async function fetchKrxMaster(): Promise<ExchangeUniverseSymbolV20[]> {
  const results: ExchangeUniverseSymbolV20[] = [];
  for (const market of ["KOSPI", "KOSDAQ"] as const) {
    const response = await fetch(KIS_MASTER_URLS[market], { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`KIS_MASTER_${market}_HTTP_${response.status}`);
    const extracted = await extractFirstZipEntry(new Uint8Array(await response.arrayBuffer()));
    results.push(...parseKisMaster(extracted, market));
  }
  if (results.length < 1000) throw new Error(`KIS_MASTER_TOO_SMALL:${results.length}`);
  return results;
}

function pipeRows(text: string): string[][] {
  return text.split(/\r?\n/).filter(Boolean).map((line) => line.split("|"));
}

function verifiedNasdaqKisRealtimeKey(symbol: string): string | undefined {
  const clean = String(symbol || "").trim().toUpperCase();
  // KIS official overseas WebSocket examples use DNASAAPL for Nasdaq AAPL.
  // Keep the transform deliberately narrow. Symbols requiring special exchange
  // handling are not guessed and therefore do not receive an execution-grade key.
  if (!/^[A-Z0-9]{1,5}$/.test(clean)) return undefined;
  return `DNAS${clean}`;
}

async function fetchUsMaster(): Promise<ExchangeUniverseSymbolV20[]> {
  const [nasdaqResponse, otherResponse] = await Promise.all([
    fetch(NASDAQ_LISTED_URL, { signal: AbortSignal.timeout(10000) }),
    fetch(OTHER_LISTED_URL, { signal: AbortSignal.timeout(10000) }),
  ]);
  if (!nasdaqResponse.ok || !otherResponse.ok) throw new Error("NASDAQ_TRADER_MASTER_HTTP_ERROR");

  const rows: ExchangeUniverseSymbolV20[] = [];
  for (const parts of pipeRows(await nasdaqResponse.text()).slice(1)) {
    const [symbol, name, , testIssue] = parts;
    if (!symbol || !name || symbol === "File Creation Time" || testIssue === "Y") continue;
    rows.push({
      symbol,
      name,
      market: "US",
      source: "NASDAQ_TRADER",
      kisRealtimeKey: verifiedNasdaqKisRealtimeKey(symbol),
    });
  }
  for (const parts of pipeRows(await otherResponse.text()).slice(1)) {
    const [symbol, name, exchange, , , , testIssue] = parts;
    if (!symbol || !name || symbol === "File Creation Time" || testIssue === "Y") continue;
    if (!["A", "N", "P", "Z", "V"].includes(exchange)) continue;
    // Do not fabricate a KIS tr_key for NYSE/AMEX/ARCA/BATS/etc. until the
    // exchange-prefix mapping is verified against an official KIS source.
    rows.push({ symbol, name, market: "US", source: "NASDAQ_TRADER" });
  }
  if (rows.length < 3000) throw new Error(`NASDAQ_TRADER_MASTER_TOO_SMALL:${rows.length}`);
  return rows;
}

async function fetchUpbitMaster(): Promise<ExchangeUniverseSymbolV20[]> {
  const response = await fetch(UPBIT_MARKETS_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`UPBIT_MASTER_HTTP_${response.status}`);
  const data = await response.json() as any[];
  const rows = Array.isArray(data) ? data.filter((item) => String(item?.market || "").startsWith("KRW-")).map((item) => ({
    symbol: String(item.market),
    name: String(item.korean_name || item.english_name || item.market),
    market: "UPBIT" as const,
    source: "UPBIT" as const,
  })) : [];
  if (rows.length < 50) throw new Error(`UPBIT_MASTER_TOO_SMALL:${rows.length}`);
  return rows;
}

function toLiveStocks(symbols: ExchangeUniverseSymbolV20[]): LiveStockItem[] {
  return symbols.map((item) => buildLiveStockItem(item.symbol, item.name, item.market, {
    category: item.market === "UPBIT" ? "CRYPTO" : "LARGE",
    categoryLabel: item.market === "UPBIT" ? "업비트 원화마켓" : item.market === "US" ? "미국 상장종목" : item.market === "KOSDAQ" ? "코스닥 상장종목" : "코스피 상장종목",
    theme: "거래소 마스터 자동동기화",
    strategy: "실시간 스캔 후보",
  }));
}

async function refresh(): Promise<ExchangeUniverseSnapshotV20> {
  const fallback = staticFallbackMetadata();
  const fallbackKrx = fallback.filter((x) => x.market === "KOSPI" || x.market === "KOSDAQ");
  const fallbackUs = fallback.filter((x) => x.market === "US");
  const fallbackUpbit = fallback.filter((x) => x.market === "UPBIT");
  const [krxResult, usResult, upbitResult] = await Promise.allSettled([fetchKrxMaster(), fetchUsMaster(), fetchUpbitMaster()]);
  const symbols = unique([
    ...(krxResult.status === "fulfilled" ? krxResult.value : fallbackKrx),
    ...(usResult.status === "fulfilled" ? usResult.value : fallbackUs),
    ...(upbitResult.status === "fulfilled" ? upbitResult.value : fallbackUpbit),
  ]);
  const counts = {
    KOSPI: symbols.filter((x) => x.market === "KOSPI").length,
    KOSDAQ: symbols.filter((x) => x.market === "KOSDAQ").length,
    US: symbols.filter((x) => x.market === "US").length,
    UPBIT: symbols.filter((x) => x.market === "UPBIT").length,
    total: symbols.length,
  };
  return {
    symbols,
    liveStocks: toLiveStocks(symbols),
    counts,
    providerStatus: {
      KRX: krxResult.status === "fulfilled" ? "OK" : "FALLBACK",
      US: usResult.status === "fulfilled" ? "OK" : "FALLBACK",
      UPBIT: upbitResult.status === "fulfilled" ? "OK" : "FALLBACK",
    },
    refreshedAt: new Date().toISOString(),
  };
}

export async function getExchangeMasterUniverseV20(force = false): Promise<ExchangeUniverseSnapshotV20> {
  if (!force && cachedSnapshot && Date.now() - cachedAt < REFRESH_TTL_MS) return cachedSnapshot;
  if (inFlight) return inFlight;
  inFlight = refresh().then((snapshot) => {
    cachedSnapshot = snapshot;
    cachedAt = Date.now();
    return snapshot;
  }).finally(() => { inFlight = null; });
  return inFlight;
}
