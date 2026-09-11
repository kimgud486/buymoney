from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


component_path = Path("src/components/RealtimeStockMarketScanner.tsx")
server_path = Path("server.ts")
component = component_path.read_text(encoding="utf-8")
server = server_path.read_text(encoding="utf-8")

component = replace_once(
    component,
    'import React, { useState, useEffect, useCallback } from "react";',
    'import React, { useState, useEffect, useCallback, useRef } from "react";',
    "react useRef import",
)

component = replace_once(
    component,
    'export interface CustomCondition {',
    '''interface VerifiedScannerIdeaV192 {
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  score: number;
  grade: string;
  price: number;
  changePct: number;
  volume?: number | null;
  tradingValue?: number | null;
  rvol?: number | null;
  pattern?: string | null;
  bullishReasons?: string[];
  dataStatus?: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
}

interface VerifiedScannerResponseV192 {
  success: boolean;
  scannedAt?: string;
  totalScanned?: number;
  dataStatus?: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
  topIdeas?: VerifiedScannerIdeaV192[];
}

export interface CustomCondition {''',
    "verified scanner response types",
)

component = replace_once(
    component,
    '''  const INITIAL_US_UNIVERSE = getUsScannerUniverse();
  const ALL_INITIAL_UNIVERSE = [
    ...INITIAL_UNIVERSE,
    ...INITIAL_US_UNIVERSE.filter(''',
    '''  const INITIAL_US_UNIVERSE = getUsScannerUniverse();
  // VERIFIED_KOREA_SCANNER_V192: domestic recommendations must come from the
  // server-side verified KRX scanner. Never show hardcoded Korean seed rows as live scan results.
  const ALL_INITIAL_UNIVERSE = [
    ...INITIAL_UNIVERSE.filter((base) => base.market !== "KOREA"),
    ...INITIAL_US_UNIVERSE.filter(''',
    "remove hardcoded Korea seed rows from live result state",
)

component = replace_once(
    component,
    '''  const [stocks, setStocks] = useState<ScannerStock[]>(ALL_INITIAL_UNIVERSE);

  // Pool of potential fresh surging stocks entering scanner dynamically''',
    '''  const [stocks, setStocks] = useState<ScannerStock[]>(ALL_INITIAL_UNIVERSE);
  const [domesticScanStats, setDomesticScanStats] = useState<{
    totalScanned: number;
    dataStatus: "REALTIME_VERIFIED" | "STALE" | "NO_DATA";
    scannedAt: string;
  }>({ totalScanned: 0, dataStatus: "NO_DATA", scannedAt: "" });
  const lastDomesticScanRef = useRef(0);

  // Pool of potential fresh surging stocks entering scanner dynamically''',
    "domestic scanner status state",
)

component = replace_once(
    component,
    '''  // Real-Time Live API Fetcher for Key Scanner Stocks from KIS / Naver / Upbit / Yahoo
  const fetchLivePrices = useCallback(async () => {
    try {
      const usScannerUniverse = getUsScannerUniverse();''',
    '''  const mapVerifiedKoreaIdea = (item: VerifiedScannerIdeaV192, index: number): ScannerStock => {
    const rvol = Number.isFinite(Number(item.rvol)) ? Math.max(0, Number(item.rvol)) : 0;
    const rawTradingValue = Number(item.tradingValue);
    const tradingValueInEok = Number.isFinite(rawTradingValue) && rawTradingValue > 0 ? rawTradingValue / 100_000_000 : 0;
    const pattern = String(item.pattern || "");
    const evidence = Array.isArray(item.bullishReasons) ? item.bullishReasons : [];
    const hasVwapEvidence = evidence.some((reason) => String(reason).toUpperCase().includes("VWAP"));

    return {
      id: `verified-v192-korea-${item.symbol}`,
      rank: index + 1,
      symbol: item.symbol,
      name: item.name,
      market: "KOREA",
      capType: getCapType({ symbol: item.symbol, tradingValue: tradingValueInEok }),
      price: Number(item.price) || 0,
      changePct: Number(item.changePct) || 0,
      tradingValue: tradingValueInEok,
      volumeStatus: rvol >= 2 ? "급증" : rvol >= 1.3 ? "증가" : "보통",
      rvol,
      // V19.2 endpoint does not publish a verified execution-strength metric yet.
      // Zero means NO_DATA here, not a fabricated value.
      executionPower: 0,
      aiScore: Number(item.score) || 0,
      aiScoreChange: 0,
      hasBos: /breakout|bos|52w|orb|gap/i.test(pattern),
      hasChoch: /choch|vcp/i.test(pattern),
      hasVwapBreak: hasVwapEvidence,
      hasNews: false
    };
  };

  // Real-Time Live API Fetcher for Key Scanner Stocks from KIS / Naver / Upbit / Yahoo
  const fetchLivePrices = useCallback(async () => {
    try {
      // VERIFIED_KOREA_SCANNER_V192: run the existing exchange-master-backed scanner.
      // It scans KOSPI/KOSDAQ master symbols server-side and returns only verified ranked candidates.
      if (Date.now() - lastDomesticScanRef.current >= 10_000) {
        lastDomesticScanRef.current = Date.now();
        try {
          const koreaRes = await fetch("/api/explainable-scanner?market=KOREA");
          if (koreaRes.ok) {
            const payload = (await koreaRes.json()) as VerifiedScannerResponseV192;
            const verifiedKorea = (Array.isArray(payload.topIdeas) ? payload.topIdeas : [])
              .filter((item) => item.market === "KOREA" && item.dataStatus === "REALTIME_VERIFIED" && Number(item.price) > 0)
              .map(mapVerifiedKoreaIdea);

            setDomesticScanStats({
              totalScanned: Number(payload.totalScanned) || 0,
              dataStatus: payload.dataStatus || (verifiedKorea.length > 0 ? "REALTIME_VERIFIED" : "NO_DATA"),
              scannedAt: payload.scannedAt || new Date().toISOString()
            });

            setStocks((prev) => {
              const verifiedSymbols = new Set(verifiedKorea.map((item) => item.symbol.toUpperCase()));
              const retained = prev.filter((item) => {
                if (item.market !== "KOREA") return true;
                // Preserve an explicit user search result only when it is not already in verified recommendations.
                return item.id.startsWith("search-") && !verifiedSymbols.has(item.symbol.toUpperCase());
              });
              return [...verifiedKorea, ...retained];
            });
          } else {
            setDomesticScanStats((prev) => ({ ...prev, dataStatus: "NO_DATA" }));
          }
        } catch (koreaError) {
          console.warn("Verified Korea V19.2 scanner unavailable:", koreaError);
          setDomesticScanStats((prev) => ({ ...prev, dataStatus: "NO_DATA" }));
        }
      }

      const usScannerUniverse = getUsScannerUniverse();''',
    "wire domestic verified scanner",
)

component = replace_once(
    component,
    '''      const symbolList = [...INITIAL_UNIVERSE, ...usScannerUniverse]
        .map((item) => item.symbol)''',
    '''      const symbolList = [
        ...INITIAL_UNIVERSE.filter((item) => item.market !== "KOREA"),
        ...usScannerUniverse
      ]
        .map((item) => item.symbol)''',
    "exclude hardcoded domestic seeds from generic live refresh",
)

component = replace_once(
    component,
    '''                  price: s.price || 1000,
                  changePct: s.changePct || 0,
                  tradingValue: Math.round(s.price * 10) || 500,
                  volumeStatus: s.changePct > 5 ? "급증" : "보통",
                  rvol: s.changePct > 3 ? 3.2 : 1.8,
                  executionPower: 115 + Math.round((s.changePct || 0) * 2),
                  aiScore: 80 + Math.round((s.changePct || 0)),
                  aiScoreChange: Math.round((s.changePct || 0)),
                  hasBos: s.changePct > 2,
                  hasChoch: s.changePct > 0,
                  hasVwapBreak: s.changePct > 1,
                  hasNews: true''',
    '''                  price: Number(s.price) || 0,
                  changePct: Number(s.changePct) || 0,
                  tradingValue: 0,
                  volumeStatus: "보통",
                  rvol: 0,
                  executionPower: 0,
                  aiScore: 0,
                  aiScoreChange: 0,
                  hasBos: false,
                  hasChoch: false,
                  hasVwapBreak: false,
                  hasNews: false''',
    "remove fabricated metrics from manual search results",
)

component = replace_once(
    component,
    '''                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-black flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  국내 &amp; 해외 &amp; 코인 실시간 스캔
                </span>''',
    '''                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-black flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  국내 &amp; 해외 &amp; 코인 실시간 스캔
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    domesticScanStats.dataStatus === "REALTIME_VERIFIED"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                  title={domesticScanStats.scannedAt ? `최근 국내 스캔: ${domesticScanStats.scannedAt}` : "국내 스캔 데이터 대기"}
                >
                  🇰🇷 KRX V19.2 {domesticScanStats.totalScanned > 0 ? `${domesticScanStats.totalScanned.toLocaleString()}종목 검사` : "검증 데이터 대기"}
                </span>''',
    "show domestic verified scan count badge",
)

server = replace_once(
    server,
    '''        price,
        changePct: item.priceChange24hPct,
        entryLow: evidenceComplete ? price : null,''',
    '''        price,
        changePct: item.priceChange24hPct,
        volume: item.volume,
        tradingValue: item.tradeValue,
        quoteProvider: item.quoteProvider,
        quoteSource: item.quoteSource,
        quoteTimestamp: item.quoteTimestamp,
        dataStatus: item.dataStatus,
        entryLow: evidenceComplete ? price : null,''',
    "expose verified scanner quote fields",
)

component_path.write_text(component, encoding="utf-8")
server_path.write_text(server, encoding="utf-8")
print("Domestic scanner V19.2 patch applied successfully")
