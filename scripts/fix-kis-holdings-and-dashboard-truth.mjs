import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, value) {
  fs.writeFileSync(path, value, "utf8");
}

function replaceOnce(text, oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  return text.replace(oldValue, newValue);
}

function replaceBetween(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = text.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  return text.slice(0, start) + replacement + text.slice(end);
}

// -----------------------------------------------------------------------------
// 1) KIS overseas holdings: correct quantity field + official continuation flow
// -----------------------------------------------------------------------------
let server = read("server.ts");

const overseasBalanceFunction = `async function fetchKoreaOverseasBalance(
  domain: string,
  accessToken: string,
  key: string,
  secret: string,
  cano: string = "12345678",
  acntPrdtCd: string = "01"
): Promise<{ balance: number | null; positions: any[]; exchangeRate: number | null }> {
  const positionMap = new Map<string, any>();
  const parseNum = (v: any) => {
    if (v === undefined || v === null || v === "") return 0;
    const n = parseFloat(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  try {
    const rawDigits = String(cano || "").replace(/[^0-9]/g, "");
    let cleanCano = rawDigits;
    let cleanCd = acntPrdtCd ? String(acntPrdtCd).replace(/[^0-9]/g, "") : "01";

    if (rawDigits.length >= 10) {
      cleanCano = rawDigits.slice(0, 8);
      cleanCd = rawDigits.slice(8, 10);
    } else {
      cleanCano = rawDigits.padStart(8, "0").slice(0, 8);
    }
    cleanCd = cleanCd.padStart(2, "0").slice(0, 2);

    const trId = domain.includes("vts") ? "VTTS3012R" : "TTTS3012R";
    let fk200 = "";
    let nk200 = "";
    let trCont = "";
    const seenContinuation = new Set<string>();

    // KIS official samples use tr_cont plus ctx_area_fk200/nk200 for continuation.
    // Cap at 10 pages to fail closed if the broker ever returns a looping key.
    for (let page = 0; page < 10; page += 1) {
      const params = new URLSearchParams({
        CANO: cleanCano,
        ACNT_PRDT_CD: cleanCd,
        OVRS_EXCG_CD: "NASD",
        TR_CRCY_CD: "USD",
        CTX_AREA_FK200: fk200,
        CTX_AREA_NK200: nk200
      });

      const res = await fetch(`${domain}/uapi/overseas-stock/v1/trading/inquire-balance?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${accessToken}`,
          "appkey": key,
          "appsecret": secret,
          "tr_id": trId,
          "custtype": "P",
          ...(trCont ? { "tr_cont": trCont } : {})
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        console.warn(`[SafetyCheck] KIS overseas balance HTTP ${res.status} (page ${page + 1})`);
        break;
      }

      const data = await res.json() as any;
      if (data?.rt_cd !== undefined && String(data.rt_cd) !== "0") {
        console.warn(`[SafetyCheck] KIS overseas balance rejected: ${data?.msg_cd || "UNKNOWN"} ${data?.msg1 || ""}`);
        break;
      }

      const out1 = Array.isArray(data?.output1)
        ? data.output1
        : data?.output1
          ? [data.output1]
          : [];

      for (const item of out1) {
        // Official overseas balance field is ovrs_cblc_qty. Keep legacy aliases only
        // as compatibility fallbacks, never as the primary field.
        const qty = parseNum(item.ovrs_cblc_qty ?? item.ovrs_cqty ?? item.hldg_qty);
        if (!(qty > 0)) continue;

        const avgP = parseNum(item.pchs_avg_pric);
        const currP = parseNum(item.now_pric2 ?? item.ovrs_prpr) || avgP;
        const symbol = String(item.ovrs_pdno || item.pdno || "").trim().toUpperCase();
        if (!symbol) continue;

        positionMap.set(symbol, {
          id: "kis_ovs_" + symbol,
          userId: "live_user",
          symbol,
          name: item.ovrs_item_name || item.prdt_name || symbol,
          market: "US",
          quantity: qty,
          avgPrice: avgP,
          currentPrice: currP,
          currency: item.tr_crcy_cd || "USD",
          exchange: item.ovrs_excg_cd || "NASD",
          updatedAt: new Date().toISOString()
        });
      }

      const nextFk200 = String(data?.ctx_area_fk200 || "").trim();
      const nextNk200 = String(data?.ctx_area_nk200 || "").trim();
      const responseTrCont = String(res.headers.get("tr_cont") || "").trim().toUpperCase();
      const hasNext = responseTrCont === "F" || responseTrCont === "M";

      if (!hasNext || (!nextFk200 && !nextNk200)) break;

      const continuationKey = `${nextFk200}|${nextNk200}`;
      if (seenContinuation.has(continuationKey)) {
        console.warn("[SafetyCheck] KIS overseas balance continuation loop detected; stopping pagination.");
        break;
      }
      seenContinuation.add(continuationKey);
      fk200 = nextFk200;
      nk200 = nextNk200;
      trCont = "N";

      // KIS samples intentionally add a short delay between continuation requests.
      await new Promise(resolve => setTimeout(resolve, 120));
    }

    const positions = Array.from(positionMap.values());

    // Never convert USD to KRW with a hard-coded FX number. Ask KIS for the
    // account exchange rate and only expose a KRW valuation when that proof exists.
    let exchangeRate: number | null = null;
    try {
      const fxParams = new URLSearchParams({
        CANO: cleanCano,
        ACNT_PRDT_CD: cleanCd,
        OVRS_EXCG_CD: "NASD",
        WCRC_FRCR_DVSN_CD: "01",
        NATN_CD: "840",
        TR_MKET_CD: "01",
        INQR_DVSN_CD: "00"
      });
      const fxRes = await fetch(`${domain}/uapi/overseas-stock/v1/trading/inquire-present-balance?${fxParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${accessToken}`,
          "appkey": key,
          "appsecret": secret,
          "tr_id": "CTRP6504R",
          "custtype": "P"
        },
        signal: AbortSignal.timeout(5000)
      });
      if (fxRes.ok) {
        const fxData = await fxRes.json() as any;
        const rows = Array.isArray(fxData?.output2)
          ? fxData.output2
          : fxData?.output2
            ? [fxData.output2]
            : [];
        const verifiedRate = rows
          .map((row: any) => parseNum(row?.frst_bltn_exrt))
          .find((rate: number) => rate > 0);
        if (verifiedRate) exchangeRate = verifiedRate;
      }
    } catch (fxErr: any) {
      console.warn("[SafetyCheck] KIS overseas FX proof unavailable:", fxErr?.message || fxErr);
    }

    const usdInvested = positions.reduce(
      (sum, p) => sum + Number(p.quantity || 0) * Number(p.currentPrice || p.avgPrice || 0),
      0
    );
    const balance = exchangeRate !== null
      ? usdInvested * exchangeRate
      : positions.length === 0
        ? 0
        : null;

    return { balance, positions, exchangeRate };
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError" || String(err?.message || "").includes("timeout");
    if (isTimeout) {
      console.warn("[SafetyCheck] KIS overseas balance fetch timed out. Preserving previous cached state.");
    } else {
      console.warn("[SafetyCheck] KIS overseas balance fetch failed:", err?.message || err);
    }
  }

  return { balance: null, positions: [], exchangeRate: null };
}
`;

server = replaceBetween(
  server,
  "async function fetchKoreaOverseasBalance(",
  "\nlet cachedServerIps:",
  overseasBalanceFunction,
  "replace KIS overseas balance function"
);

// The standalone US sync must still return holdings when FX proof is temporarily
// unavailable. A missing exchange rate is not the same as a missing portfolio.
server = replaceOnce(
  server,
  `          if (ovs.balance !== null) {\n            usSuccess = true;\n            usBal = ovs.balance;\n            usPositions = Array.isArray(ovs.positions) ? ovs.positions : [];\n          } else {`,
  `          usPositions = Array.isArray(ovs.positions) ? ovs.positions : [];\n          if (ovs.balance !== null || usPositions.length > 0) {\n            usSuccess = true;\n            usBal = ovs.balance ?? 0;\n          } else {`,
  "allow US positions without fabricated FX valuation"
);

server = replaceOnce(
  server,
  `      const usInvested = usPositions.reduce((sum, p) => sum + (p.quantity * (p.currentPrice || p.avgPrice || 0)), 0);\n      const usCash = Math.max(0, usBal - usInvested);`,
  `      const usFx = usPositions.length > 0 && usBal > 0\n        ? usBal / Math.max(1, usPositions.reduce((sum, p) => sum + (p.quantity * (p.currentPrice || p.avgPrice || 0)), 0))\n        : 0;\n      const usInvested = usFx > 0\n        ? usPositions.reduce((sum, p) => sum + (p.quantity * (p.currentPrice || p.avgPrice || 0) * usFx), 0)\n        : 0;\n      const usCash = 0;`,
  "keep standalone US valuation units truthful"
);

server = replaceOnce(
  server,
  `        message: \`한국투자증권 (국외/미국주식) API 연결 검증 정상 성공! (조회 총액: \${usBal.toLocaleString()}원)\`,`,
  `        message: usBal > 0\n          ? \`한국투자증권 (국외/미국주식) API 연결 검증 정상 성공! (보유종목 \${usPositions.length}개 / 검증 환산평가액: \${usBal.toLocaleString()}원)\`\n          : \`한국투자증권 (국외/미국주식) 보유종목 \${usPositions.length}개 동기화 완료. 환율 검증값은 현재 수신 대기 중입니다.\`,`,
  "truthful standalone US sync message"
);

// Separate domestic KRW and overseas USD->KRW valuations in the all-account rollup.
server = replaceOnce(
  server,
  `    let koreaCash = 0;\n    let koreaInvested = 0;\n    let upbitCash = 0;`,
  `    let koreaCash = 0;\n    let koreaInvested = 0;\n    let usCash = 0;\n    let usInvested = 0;\n    let upbitCash = 0;`,
  "add US cash breakdown state"
);

server = replaceOnce(
  server,
  `          if (kisRes.balance !== null || ovs.balance !== null) {\n            const kBal = (kisRes.balance ?? 0) + (ovs.balance ?? 0);\n            totalVal += kBal;\n            \n            const kisPosList = Array.isArray(kisRes.positions) ? kisRes.positions : [];\n            const ovsPosList = Array.isArray(ovs.positions) ? ovs.positions : [];\n            allPositions.push(...kisPosList, ...ovsPosList);\n\n            koreaInvested = [...kisPosList, ...ovsPosList].reduce((sum, p) => sum + (p.quantity * (p.currentPrice || p.avgPrice || 0)), 0);\n            koreaCash = kisRes.cash > 0 ? kisRes.cash : Math.max(0, kBal - koreaInvested);\n\n            syncedBrokers.push(\`한국투자증권: 예수금 \${koreaCash.toLocaleString()}원 / 주식 \${koreaInvested.toLocaleString()}원 (총 \${kBal.toLocaleString()}원)\`);\n          }`,
  `          if (kisRes.balance !== null || ovs.balance !== null || (ovs.positions?.length ?? 0) > 0) {\n            const kBal = kisRes.balance ?? 0;\n            const usBal = ovs.balance ?? 0;\n            totalVal += kBal + usBal;\n\n            const kisPosList = Array.isArray(kisRes.positions) ? kisRes.positions : [];\n            const ovsPosList = Array.isArray(ovs.positions) ? ovs.positions : [];\n            allPositions.push(...kisPosList, ...ovsPosList);\n\n            koreaInvested = kisPosList.reduce((sum, p) => sum + (p.quantity * (p.currentPrice || p.avgPrice || 0)), 0);\n            koreaCash = kisRes.cash > 0 ? kisRes.cash : Math.max(0, kBal - koreaInvested);\n            usInvested = usBal > 0 ? usBal : 0;\n            usCash = 0;\n\n            syncedBrokers.push(\`한국투자증권 국내: 예수금 \${koreaCash.toLocaleString()}원 / 주식 \${koreaInvested.toLocaleString()}원 (총 \${kBal.toLocaleString()}원)\`);\n            if (ovsPosList.length > 0) {\n              syncedBrokers.push(usBal > 0\n                ? \`한국투자증권 미국: 보유 \${ovsPosList.length}종목 / 검증 환산평가액 \${usBal.toLocaleString()}원\`\n                : \`한국투자증권 미국: 보유 \${ovsPosList.length}종목 / 환율 검증값 수신 대기\`);\n            }\n          }`,
  "separate domestic and overseas valuation units"
);

server = replaceOnce(
  server,
  `    const koreaTotal = koreaCash + koreaInvested;\n    const upbitTotal = upbitCash + upbitInvested;`,
  `    const koreaTotal = koreaCash + koreaInvested;\n    const usTotal = usCash + usInvested;\n    const upbitTotal = upbitCash + upbitInvested;`,
  "calculate US total"
);

server = replaceOnce(
  server,
  `    const totalCash = koreaCash + upbitCash + tossCash;\n    const totalInvested = koreaInvested + upbitInvested + tossInvested;`,
  `    const totalCash = koreaCash + usCash + upbitCash + tossCash;\n    const totalInvested = koreaInvested + usInvested + upbitInvested + tossInvested;`,
  "include US in verified aggregate totals"
);

server = replaceOnce(
  server,
  `      koreaTotal,\n\n      upbitCash,`,
  `      koreaTotal,\n\n      usCash,\n      usInvested,\n      usTotal,\n\n      upbitCash,`,
  "expose US cash breakdown"
);

write("server.ts", server);

// -----------------------------------------------------------------------------
// 2) App account sync: real KIS sync must request domestic + overseas holdings
// -----------------------------------------------------------------------------
let appContext = read("src/context/AppContext.tsx");
appContext = replaceOnce(
  appContext,
  `    // Immediate initial balance query for Korea Investment Securities\n    syncRealAccountBalance('korea', true).catch(err => {\n      console.warn("Initial real-time balance auto-sync notice:", err?.message || err);\n    });\n\n    // 30-second periodic auto-refresh interval for Korea Investment Securities\n    const intervalId = setInterval(() => {\n      syncRealAccountBalance('korea', true).catch(err => {\n        console.warn("Periodic real-time balance auto-sync notice:", err?.message || err);\n      });\n    }, 30000);`,
  `    // Initial unified balance query. The KIS account can hold both domestic and\n    // overseas stocks, so a domestic-only sync is incomplete.\n    syncRealAccountBalance('all', true).catch(err => {\n      console.warn("Initial unified real-account balance auto-sync notice:", err?.message || err);\n    });\n\n    // 30-second periodic unified refresh keeps KRX + KIS overseas + configured\n    // crypto holdings in one reconciled position set.\n    const intervalId = setInterval(() => {\n      syncRealAccountBalance('all', true).catch(err => {\n        console.warn("Periodic unified real-account balance auto-sync notice:", err?.message || err);\n      });\n    }, 30000);`,
  "unified periodic account sync"
);
write("src/context/AppContext.tsx", appContext);

// -----------------------------------------------------------------------------
// 3) Dashboard: direct React chart expansion + truth-only display values
// -----------------------------------------------------------------------------
let dashboard = read("src/components/trading/MasterAiAutoTradingDashboard.tsx");

dashboard = replaceOnce(
  dashboard,
  `export type CandleData = ChartCandle;\n`,
  `export type CandleData = ChartCandle;\n\nfunction buildSparklinePoints(values: number[]): string {\n  const clean = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);\n  if (clean.length < 2) return \"\";\n  const min = Math.min(...clean);\n  const max = Math.max(...clean);\n  const range = max - min || 1;\n  return clean.map((value, index) => {\n    const x = (index / (clean.length - 1)) * 60;\n    const y = 14 - ((value - min) / range) * 12;\n    return \`\${x.toFixed(1)},\${y.toFixed(1)}\`;\n  }).join(\" \" );\n}\n`,
  "add real sparkline point builder"
);

dashboard = replaceOnce(
  dashboard,
  `  const [currentTimeStr, setCurrentTimeStr] = useState<string>("09:45:32 KST");`,
  `  const [currentTimeStr, setCurrentTimeStr] = useState<string>("--:--:-- KST");`,
  "remove hard-coded initial clock"
);

dashboard = replaceOnce(
  dashboard,
  `  const [mainChartDisplayMode, setMainChartDisplayMode] = useState<"TRADINGVIEW_REALTIME" | "DUAL_SPLIT" | "CANDLE_OVERLAY">("TRADINGVIEW_REALTIME");`,
  `  const [mainChartDisplayMode, setMainChartDisplayMode] = useState<"TRADINGVIEW_REALTIME" | "DUAL_SPLIT" | "CANDLE_OVERLAY">("TRADINGVIEW_REALTIME");\n  const [isMainTechnicalChartExpanded, setIsMainTechnicalChartExpanded] = useState<boolean>(false);`,
  "add React chart expansion state"
);

// Quote volume is cumulative/session volume in several feeds. It must never be
// copied into a single candle as though it were executed delta volume.
dashboard = replaceOnce(
  dashboard,
  `          updated.isUp = updated.close >= updated.open;\n          if (typeof activeQuote.volume === "number" && activeQuote.volume > 0) {\n            updated.volume = activeQuote.volume;\n          }\n\n          const copy = [...prev];`,
  `          updated.isUp = updated.close >= updated.open;\n          // Keep candle volume from verified candle data. activeQuote.volume may\n          // be session/cumulative volume, so treating it as this candle's volume\n          // would corrupt VWAP/RVOL and pattern calculations.\n\n          const copy = [...prev];`,
  "stop cumulative quote volume from corrupting active candle"
);

dashboard = replaceOnce(
  dashboard,
  `                실시간 1초`,
  `                지수 12초 동기화`,
  "truthful market-index refresh label"
);

dashboard = replaceOnce(
  dashboard,
  `                        points="0,12 10,10 20,6 30,8 40,4 50,2 60,3"`,
  `                        points={buildSparklinePoints(item.sparkline)}`,
  "use real market-index sparkline data"
);

dashboard = replaceOnce(
  dashboard,
  `        <div className="lg:col-span-6 flex flex-col gap-2">`,
  `        <div className={\`${isMainTechnicalChartExpanded ? "lg:col-span-12" : "lg:col-span-6"} flex flex-col gap-2 transition-all duration-200\`}>`,
  "expand actual center dashboard column"
);

dashboard = replaceOnce(
  dashboard,
  `                onClick={() => setMainChartDisplayMode("TRADINGVIEW_REALTIME")}`,
  `                onClick={() => {\n                  setMainChartDisplayMode("TRADINGVIEW_REALTIME");\n                  setIsMainTechnicalChartExpanded(false);\n                }}`,
  "collapse expansion when switching to realtime chart"
);

dashboard = replaceOnce(
  dashboard,
  `                onClick={() => setMainChartDisplayMode("CANDLE_OVERLAY")}`,
  `                onClick={() => {\n                  const alreadyTechnical = mainChartDisplayMode === "CANDLE_OVERLAY";\n                  setMainChartDisplayMode("CANDLE_OVERLAY");\n                  setIsMainTechnicalChartExpanded(alreadyTechnical ? !isMainTechnicalChartExpanded : true);\n                }}\n                aria-pressed={mainChartDisplayMode === "CANDLE_OVERLAY" && isMainTechnicalChartExpanded}\n                title={isMainTechnicalChartExpanded ? "메인 기술 차트 원래 크기로 축소" : "메인 기술 차트 크게 확대"}`,
  "toggle technical chart expansion in React"
);

dashboard = replaceOnce(
  dashboard,
  `                <span>📈 캔들 차트 + 기술적 지표</span>`,
  `                <span>{mainChartDisplayMode === "CANDLE_OVERLAY" && isMainTechnicalChartExpanded ? "↙ 차트 축소" : "📈 캔들 차트 + 기술적 지표"}</span>`,
  "show chart expansion state"
);

dashboard = replaceOnce(
  dashboard,
  `                onClick={() => setMainChartDisplayMode("DUAL_SPLIT")}`,
  `                onClick={() => {\n                  setMainChartDisplayMode("DUAL_SPLIT");\n                  setIsMainTechnicalChartExpanded(false);\n                }}`,
  "collapse expansion when switching to dual chart"
);

dashboard = replaceOnce(
  dashboard,
  `            <div className={\`relative w-full h-[470px] \${isWhiteTheme ? "bg-white border-slate-200" : "bg-[#050a14] border-slate-900"} rounded-xl border overflow-hidden flex flex-col\`}>`,
  `            <div className={\`relative w-full \${isMainTechnicalChartExpanded ? "h-[72vh] min-h-[620px] max-h-[900px]" : "h-[470px]"} \${isWhiteTheme ? "bg-white border-slate-200" : "bg-[#050a14] border-slate-900"} rounded-xl border overflow-hidden flex flex-col transition-[height] duration-200\`}>`,
  "expand actual technical chart height"
);

// Dynamic truth values used by the five AI insight cards and the x-axis.
const patternsMarker = `  const patterns = useMemo(() => {\n    if (detectedPatterns.length > 0) {`;
const patternsStart = dashboard.indexOf(patternsMarker);
if (patternsStart < 0) throw new Error("derived truth values: patterns marker missing");
const returnMarker = `\n\n  return (\n`;
const returnPos = dashboard.indexOf(returnMarker, patternsStart);
if (returnPos < 0) throw new Error("derived truth values: return marker missing");
const truthDerived = `\n\n  const livePatternConfidence = useMemo(() => {\n    const valid = patterns\n      .filter((p: any) => p.isValidForSignal !== false && Number.isFinite(Number(p.confidence)))\n      .map((p: any) => Number(p.confidence));\n    if (valid.length === 0) return null;\n    return Math.round(Math.max(...valid));\n  }, [patterns]);\n\n  const latestAtr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : null;\n  const liveVolatilityPct = latestAtr !== null && currentStock.price > 0\n    ? (latestAtr / currentStock.price) * 100\n    : null;\n\n  const momentumBars = liveTechnicalScore === null\n    ? 0\n    : Math.max(0, Math.min(5, Math.ceil(liveTechnicalScore / 20)));\n\n  const candleAxisLabels = useMemo(() => {\n    if (!candles.length) return [] as string[];\n    const count = Math.min(5, candles.length);\n    const indices = Array.from({ length: count }, (_, i) =>\n      Math.round((i / Math.max(1, count - 1)) * (candles.length - 1))\n    );\n    return Array.from(new Set(indices)).map((index) => {\n      const candle: any = candles[index];\n      const raw = candle?.time ?? candle?.timestamp;\n      let millis = typeof raw === \"number\" ? raw : Number(raw);\n      if (!Number.isFinite(millis)) millis = Date.parse(String(raw || \"\"));\n      if (Number.isFinite(millis) && millis > 0 && millis < 10_000_000_000) millis *= 1000;\n      const date = new Date(millis);\n      if (!Number.isFinite(date.getTime())) return \"\";\n      return new Intl.DateTimeFormat(\"ko-KR\", {\n        timeZone: \"Asia/Seoul\",\n        month: \"short\",\n        day: \"numeric\"\n      }).format(date);\n    }).filter(Boolean);\n  }, [candles]);\n\n  const dailyPerformanceBars = useMemo(() => {\n    const dayMap = new Map<string, { day: string; pnl: number; order: number }>();\n    for (const trade of Array.isArray(trades) ? trades : []) {\n      const rawTime = (trade as any)?.timestamp ?? (trade as any)?.createdAt;\n      const time = Date.parse(String(rawTime || \"\"));\n      const pnl = Number((trade as any)?.pnl ?? (trade as any)?.pnlAmount ?? (trade as any)?.profit);\n      if (!Number.isFinite(time) || !Number.isFinite(pnl)) continue;\n      const date = new Date(time);\n      const key = new Intl.DateTimeFormat(\"en-CA\", {\n        timeZone: \"Asia/Seoul\",\n        year: \"numeric\",\n        month: \"2-digit\",\n        day: \"2-digit\"\n      }).format(date);\n      const day = new Intl.DateTimeFormat(\"ko-KR\", {\n        timeZone: \"Asia/Seoul\",\n        month: \"numeric\",\n        day: \"numeric\"\n      }).format(date);\n      const current = dayMap.get(key) || { day, pnl: 0, order: time };\n      current.pnl += pnl;\n      current.order = Math.max(current.order, time);\n      dayMap.set(key, current);\n    }\n    const rows = Array.from(dayMap.values()).sort((a, b) => a.order - b.order).slice(-7);\n    const maxAbs = Math.max(1, ...rows.map(row => Math.abs(row.pnl)));\n    return rows.map(row => ({\n      day: row.day,\n      pnl: row.pnl,\n      h: Math.max(3, Math.round((Math.abs(row.pnl) / maxAbs) * 44)),\n      isUp: row.pnl >= 0\n    }));\n  }, [trades]);`;

dashboard = dashboard.slice(0, returnPos) + truthDerived + dashboard.slice(returnPos);

const oldDailyBars = `                {[\n                  { day: "7/1", h: 32, isUp: true },\n                  { day: "7/2", h: 44, isUp: true },\n                  { day: "7/3", h: 26, isUp: true },\n                  { day: "7/4", h: 38, isUp: true },\n                  { day: "7/5", h: 18, isUp: false },\n                  { day: "7/8", h: 48, isUp: true },\n                  { day: "7/9", h: 35, isUp: true },\n                ].map((bar, bidx) => (\n                  <div key={\`${bar.day}_\${bidx}\`} className="flex-1 flex flex-col items-center gap-1">\n                    <div\n                      style={{ height: \`${bar.h}px\` }}\n                      className={\`w-full rounded-t-xs transition-all \${\n                        bar.isUp ? (isWhiteTheme ? "bg-emerald-500" : "bg-emerald-400") : (isWhiteTheme ? "bg-rose-500" : "bg-rose-500")\n                      }\`}\n                    />\n                    <span className={\`text-[8px] font-mono \${isWhiteTheme ? "text-slate-500" : "text-slate-400"}\`}>{bar.day}</span>\n                  </div>\n                ))}`;
const newDailyBars = `                {dailyPerformanceBars.length > 0 ? dailyPerformanceBars.map((bar, bidx) => (\n                  <div key={\`${bar.day}_\${bidx}\`} className="flex-1 flex flex-col items-center gap-1" title={\`실현손익 \${bar.pnl.toLocaleString()}원\`}>\n                    <div\n                      style={{ height: \`${bar.h}px\` }}\n                      className={\`w-full rounded-t-xs transition-all \${\n                        bar.isUp ? (isWhiteTheme ? "bg-emerald-500" : "bg-emerald-400") : (isWhiteTheme ? "bg-rose-500" : "bg-rose-500")\n                      }\`}\n                    />\n                    <span className={\`text-[8px] font-mono \${isWhiteTheme ? "text-slate-500" : "text-slate-400"}\`}>{bar.day}</span>\n                  </div>\n                )) : (\n                  <div className={\`w-full h-full flex items-center justify-center text-[9px] font-mono \${isWhiteTheme ? "text-slate-400" : "text-slate-500"}\`}>\n                    실제 실현손익 데이터 대기\n                  </div>\n                )}`;
dashboard = replaceOnce(dashboard, oldDailyBars, newDailyBars, "replace synthetic daily performance bars");

dashboard = replaceOnce(
  dashboard,
  `                <span>Mar 14</span>\n                <span>Apr 14</span>\n                <span>May 14</span>\n                <span>Jun 14</span>\n                <span>Jul 14</span>`,
  `                {candleAxisLabels.length > 0\n                  ? candleAxisLabels.map((label, index) => <span key={\`axis_\${index}\`}>{label}</span>)\n                  : <span>캔들 데이터 대기</span>}`,
  "replace synthetic candle dates"
);

// AI insight cards must be derived from live data, never static BUY/confidence claims.
dashboard = replaceOnce(
  dashboard,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>상승 추세</div>\n                <div className={\`text-[10px] font-mono font-bold \${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"} tracking-wider\`}>\n                  STRONG BULLISH\n                </div>`,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>{candles.length > 0 ? unifiedMarketShape.overallShapeLabel : "데이터 수신 대기"}</div>\n                <div className={\`text-[10px] font-mono font-bold \${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"} tracking-wider\`}>\n                  {candles.length > 0 ? \`SHAPE SCORE \${unifiedMarketShape.overallShapeScore}\` : "WAIT"}\n                </div>`,
  "derive trend insight"
);

dashboard = replaceOnce(
  dashboard,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>강한 모멘텀</div>`,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>{liveTechnicalScore === null ? "데이터 수신 대기" : liveTechnicalScore >= 75 ? "강한 모멘텀" : liveTechnicalScore >= 55 ? "보통 모멘텀" : "약한 모멘텀"}</div>`,
  "derive momentum label"
);

dashboard = replaceOnce(
  dashboard,
  `                    {[1, 2, 3, 4, 5].map((bar) => (\n                      <div key={bar} className={\`w-2 h-2 rounded-xs \${isWhiteTheme ? "bg-emerald-500" : "bg-emerald-400"}\`} />\n                    ))}`,
  `                    {[1, 2, 3, 4, 5].map((bar) => (\n                      <div key={bar} className={\`w-2 h-2 rounded-xs \${bar <= momentumBars ? (isWhiteTheme ? "bg-emerald-500" : "bg-emerald-400") : (isWhiteTheme ? "bg-slate-200" : "bg-slate-700")}\`} />\n                    ))}`,
  "derive momentum strength bars"
);

dashboard = replaceOnce(
  dashboard,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>보통 변동성</div>\n                <div className={\`text-[10px] font-mono \${isWhiteTheme ? "text-slate-500" : "text-slate-400"}\`}>\n                  안정적인 시장\n                </div>`,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>{liveVolatilityPct === null ? "데이터 수신 대기" : liveVolatilityPct >= 3 ? "높은 변동성" : liveVolatilityPct >= 1 ? "보통 변동성" : "낮은 변동성"}</div>\n                <div className={\`text-[10px] font-mono \${isWhiteTheme ? "text-slate-500" : "text-slate-400"}\`}>\n                  {liveVolatilityPct === null ? "ATR 계산 대기" : \`ATR \${liveVolatilityPct.toFixed(2)}%\`}\n                </div>`,
  "derive volatility insight"
);

dashboard = replaceOnce(
  dashboard,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>신뢰도 높음</div>`,
  `                <div className={\`text-sm font-bold \${isWhiteTheme ? "text-slate-900" : "text-white"}\`}>{livePatternConfidence === null ? "패턴 데이터 대기" : livePatternConfidence >= 80 ? "신뢰도 높음" : livePatternConfidence >= 60 ? "신뢰도 보통" : "신뢰도 낮음"}</div>`,
  "derive pattern confidence label"
);

dashboard = replaceOnce(
  dashboard,
  `                    strokeDasharray="87, 100"`,
  `                    strokeDasharray={\`${livePatternConfidence ?? 0}, 100\`}`,
  "derive pattern confidence ring"
);

dashboard = replaceOnce(
  dashboard,
  `                  87%`,
  `                  {livePatternConfidence !== null ? \`${livePatternConfidence}%\` : "--"}`,
  "derive pattern confidence text"
);

dashboard = replaceOnce(
  dashboard,
  `                <div className={\`text-sm font-black \${isWhiteTheme ? "text-emerald-600" : "text-emerald-400"} flex items-center gap-1\`}>\n                  <span>BUY</span>\n                  <span className={\`text-[10px] font-normal \${isWhiteTheme ? "text-slate-500" : "text-slate-400"}\`}>매수 유효</span>\n                </div>`,
  `                <div className={\`text-sm font-black \${liveTradingState === "BUY" ? (isWhiteTheme ? "text-emerald-600" : "text-emerald-400") : liveTradingState === "SELL" ? "text-rose-500" : (isWhiteTheme ? "text-slate-600" : "text-slate-300")} flex items-center gap-1\`}>\n                  <span>{liveTradingState === "BUY" ? "BUY" : liveTradingState === "SELL" ? "SELL" : "WAIT"}</span>\n                  <span className={\`text-[10px] font-normal \${isWhiteTheme ? "text-slate-500" : "text-slate-400"}\`}>{liveTradingState === "BUY" ? "매수 후보" : liveTradingState === "SELL" ? "매도 후보" : "신호 대기"}</span>\n                </div>`,
  "derive next action from live state"
);

dashboard = replaceOnce(
  dashboard,
  `                : "증권사 WebSocket / REST 실시간 데이터 피드 동기화 완료"}`,
  `                : currentStock.price > 0 ? "실시간 데이터 피드 수신 중" : "실시간 데이터 피드 상태 확인 중"}`,
  "truthful default feed status"
);

write("src/components/trading/MasterAiAutoTradingDashboard.tsx", dashboard);

// -----------------------------------------------------------------------------
// 4) App shell: remove brittle document-level chart DOM manipulation
// -----------------------------------------------------------------------------
let app = read("src/App.tsx");
const domHackStart = `  useEffect(() => {\n    const styleId = "main-technical-chart-expand-style";`;
const domHackEnd = `\n\n  return (\n`;
const domStartIndex = app.indexOf(domHackStart);
if (domStartIndex < 0) throw new Error("App chart DOM workaround start not found");
const domEndIndex = app.indexOf(domHackEnd, domStartIndex);
if (domEndIndex < 0) throw new Error("App chart DOM workaround end not found");
app = app.slice(0, domStartIndex) + `  return (\n` + app.slice(domEndIndex + domHackEnd.length);
write("src/App.tsx", app);

// -----------------------------------------------------------------------------
// Final static invariants
// -----------------------------------------------------------------------------
const finalServer = read("server.ts");
const finalDashboard = read("src/components/trading/MasterAiAutoTradingDashboard.tsx");
const finalContext = read("src/context/AppContext.tsx");
const finalApp = read("src/App.tsx");

const required = [
  [finalServer.includes("ovrs_cblc_qty ?? item.ovrs_cqty"), "official overseas quantity field"],
  [finalServer.includes("ctx_area_fk200"), "overseas continuation key"],
  [finalServer.includes('res.headers.get("tr_cont")'), "overseas continuation header"],
  [finalServer.includes("frst_bltn_exrt"), "verified KIS exchange-rate lookup"],
  [finalContext.includes("syncRealAccountBalance('all', true)"), "unified automatic account sync"],
  [!finalDashboard.includes('points="0,12 10,10 20,6 30,8 40,4 50,2 60,3"'), "synthetic sparkline removed"],
  [!finalDashboard.includes("strokeDasharray=\"87, 100\""), "fixed 87 confidence removed"],
  [!finalDashboard.includes('<span>BUY</span>\n                  <span className='), "fixed BUY card removed"],
  [!finalDashboard.includes("updated.volume = activeQuote.volume"), "cumulative volume overwrite removed"],
  [finalDashboard.includes("isMainTechnicalChartExpanded"), "React chart expansion state"],
  [!finalApp.includes("main-technical-chart-expand-style"), "App DOM chart workaround removed"]
];
for (const [ok, label] of required) {
  if (!ok) throw new Error(`invariant failed: ${label}`);
}

console.log("KIS holdings, realtime candle truth, chart expansion, and dashboard truth fixes applied.");
