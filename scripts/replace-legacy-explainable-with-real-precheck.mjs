import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
let server = fs.readFileSync(serverPath, "utf8");

function findArrowRouteEnd(source, start) {
  const bodyStart = source.indexOf("=> {", start);
  if (bodyStart < 0) throw new Error("EXPLAINABLE_ROUTE_BODY_NOT_FOUND");
  let i = bodyStart + 3;
  let depth = 1;
  let state = "code";
  let escape = false;
  for (; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (state === "line") {
      if (c === "\n") state = "code";
      continue;
    }
    if (state === "block") {
      if (c === "*" && n === "/") { state = "code"; i++; }
      continue;
    }
    if (state === "single" || state === "double" || state === "template") {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if ((state === "single" && c === "'") || (state === "double" && c === '"') || (state === "template" && c === "`")) state = "code";
      continue;
    }
    if (c === "/" && n === "/") { state = "line"; i++; continue; }
    if (c === "/" && n === "*") { state = "block"; i++; continue; }
    if (c === "'") { state = "single"; continue; }
    if (c === '"') { state = "double"; continue; }
    if (c === "`") { state = "template"; continue; }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        const close = source.indexOf(");", i);
        if (close < 0) throw new Error("EXPLAINABLE_ROUTE_CLOSE_NOT_FOUND");
        return close + 2;
      }
    }
  }
  throw new Error("EXPLAINABLE_ROUTE_UNBALANCED");
}

const routeStartToken = 'app.get(["/api/explainable-scanner", "/api/yes-only-scanner"], async (req, res) => {';
const alreadyReal = server.includes("REAL_VERIFIED_PRECHECK_V192");
if (!alreadyReal) {
  const start = server.indexOf(routeStartToken);
  if (start < 0) throw new Error("EXPLAINABLE_ROUTE_START_NOT_FOUND");
  const end = findArrowRouteEnd(server, start);
  const replacement = `app.get(["/api/explainable-scanner", "/api/yes-only-scanner"], async (req, res) => {
  // REAL_VERIFIED_PRECHECK_V192: compatibility endpoint for scan-to-review UI only.
  // It never fabricates candles and never has final BUY authority.
  try {
    const rawMarket = String(req.query.market || "ALL").toUpperCase();
    const marketFilter = rawMarket === "BTC" || rawMarket === "CRYPTO" || rawMarket === "UPBIT"
      ? "UPBIT"
      : rawMarket === "US"
        ? "US"
        : rawMarket === "KOREA"
          ? "KOREA"
          : "ALL";
    const yesOnly = req.path.includes("yes-only") || req.query.yesOnly === "true";
    const scan = await scanGlobalRealtimeHotListV192({
      marketFilter,
      exchangeFilter: "ALL",
      patternFilter: "ALL",
      minObjectivePct: 0,
      minSetupScore: 0
    });

    const ideas = scan.hotItems.map((item) => {
      const price = Number(item.currentPrice);
      const atr = Number(item.metrics?.atr14);
      const rvol = Number(item.volumeIncreaseRatio);
      const rsi = Number(item.rsiIndicator);
      const stop = item.stopLoss == null ? null : Number(item.stopLoss);
      const target1 = item.targetPrice == null ? null : Number(item.targetPrice);
      const atrPct = Number.isFinite(atr) && atr > 0 && price > 0 ? (atr / price) * 100 : null;
      const target2 = Number.isFinite(atr) && atr > 0 && price > 0 ? price + atr * 4.5 : null;
      const evidenceComplete =
        item.dataStatus === "REALTIME_VERIFIED" &&
        price > 0 &&
        item.volume > 0 &&
        item.tradeValue > 0 &&
        Number.isFinite(rvol) && rvol > 0 &&
        Number.isFinite(rsi) &&
        atrPct != null &&
        stop != null && stop > 0 && stop < price &&
        target1 != null && target1 > price &&
        item.patternType !== "NO_PATTERN";
      const strongPrecheck = evidenceComplete && (item.grade === "S" || item.grade === "A");
      return {
        symbol: item.symbol,
        name: item.name,
        market: item.market === "BTC" ? "BTC" : item.market,
        score: item.setupScore,
        grade: item.grade,
        decision: strongPrecheck ? "REVIEW" : "WATCH",
        price,
        changePct: item.priceChange24hPct,
        entryLow: evidenceComplete ? price : null,
        entryHigh: evidenceComplete ? price : null,
        stop,
        target1,
        target2,
        rsi: Number.isFinite(rsi) ? rsi : null,
        rvol: Number.isFinite(rvol) ? rvol : null,
        atrPct,
        pattern: item.patternType,
        bullishReasons: Array.isArray(item.evidenceList) ? item.evidenceList : [],
        riskReasons: evidenceComplete ? [] : ["VERIFIED_PRECHECK_EVIDENCE_INCOMPLETE"],
        thesis: item.reasoning,
        invalidation: stop != null ? String(stop) : "NO_VERIFIED_STOP",
        wouldBuy: strongPrecheck,
        authority: "REAL_PRECHECK_ONLY",
        finalAuthority: "SERVER_V20_FINAL_REQUIRED"
      };
    });

    const ranked = ideas.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    const topIdeas = (yesOnly ? ranked.filter((idea) => idea.wouldBuy) : ranked).slice(0, 5);
    return res.json({
      success: true,
      authority: "REAL_PRECHECK_ONLY",
      finalAuthority: "SERVER_V20_FINAL_REQUIRED",
      scannedAt: new Date().toISOString(),
      totalScanned: scan.scannedTotal,
      passedCount: topIdeas.length,
      dataStatus: scan.dataStatus,
      topIdeas
    });
  } catch (error) {
    console.error("[REAL PRECHECK] verified scanner unavailable", error);
    return res.status(503).json({
      success: false,
      authority: "REAL_PRECHECK_ONLY",
      finalAuthority: "SERVER_V20_FINAL_REQUIRED",
      message: "검증된 실시간 데이터가 없어 PRECHECK를 생성하지 않았습니다.",
      topIdeas: []
    });
  }
});`;
  server = server.slice(0, start) + replacement + server.slice(end);
}

const indexFallback = `  } catch (err: any) {
    console.warn(\`[Yahoo Finance API] Falling back to index presets for \${symbol}:\`, err.message || err);
    return defaultVal;
  }
}`;
const indexFailClosed = `  } catch (err: any) {
    console.warn(\`[Yahoo Finance API] verified index data unavailable for \${symbol}:\`, err.message || err);
    throw err;
  }
}`;
if (server.includes(indexFallback)) server = server.replace(indexFallback, indexFailClosed);

for (const forbidden of [
  "Math.sin(i * 0.7)",
  "Math.floor(Math.random() * 8000) + 1500",
  "Falling back to index presets for ${symbol}"
]) {
  if (server.includes(forbidden)) throw new Error(`FORBIDDEN_PUBLIC_SYNTHETIC_TOKEN_REMAINS:${forbidden}`);
}
if (!server.includes("REAL_VERIFIED_PRECHECK_V192")) throw new Error("REAL_PRECHECK_ROUTE_NOT_INSTALLED");

fs.writeFileSync(serverPath, server, "utf8");
console.log("Legacy public synthetic scanner replaced with verified real-data precheck; index fallback is fail-closed.");
