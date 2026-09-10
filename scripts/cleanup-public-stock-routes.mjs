import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
let server = fs.readFileSync(serverPath, "utf8");

function replaceAllExact(from, to, label, minCount = 1) {
  const count = server.split(from).length - 1;
  if (count === 0 && server.includes(to)) return;
  if (count < minCount) throw new Error(`PATCH_ANCHOR_MISSING:${label}:${count}`);
  server = server.split(from).join(to);
}

replaceAllExact(
  "      } catch (e) {\n        return res.json(upbitPresets);\n      }",
  "      } catch (e) {\n        console.warn(\"[Stock Search] verified Upbit quotes unavailable\", e);\n        return res.status(503).json([]);\n      }",
  "UPBIT_LIST_FAIL_CLOSED"
);
replaceAllExact(
  "    } catch (e) {\n      return res.json(DEMO_STOCKS);\n    }",
  "    } catch (e) {\n      console.warn(\"[Stock Search] verified market quotes unavailable\", e);\n      return res.status(503).json([]);\n    }",
  "DEMO_LIST_FAIL_CLOSED"
);
replaceAllExact(
  "  } catch (e) {\n    console.error(\"Live stock search failed, falling back to candidates:\", e);\n    res.json(topCandidates);\n  }",
  "  } catch (e) {\n    console.error(\"Live stock search failed; returning NO_DATA instead of seed candidates:\", e);\n    res.status(503).json([]);\n  }",
  "SEARCH_CANDIDATE_FAIL_CLOSED"
);

for (const [from, to] of [
  ["price: 1000,\n          change: 0,", "price: 0,\n          change: 0,"],
  ["price: 50000,\n          change: 0,", "price: 0,\n          change: 0,"],
  ["price: 150,\n          change: 0,", "price: 0,\n          change: 0,"],
  ["price: 10000,\n        change: 0,", "price: 0,\n        change: 0,"],
  ["price: 100,\n        change: 0,", "price: 0,\n        change: 0,"],
  ["price: marketType === \"KOREA\" ? 50000 : marketType === \"BTC\" ? 100000000 : 100,", "price: 0,"]
]) {
  if (server.includes(from)) server = server.split(from).join(to);
}
server = server.replaceAll('technical: { rsi: 50, macd: "Bullish", bollinger: "middle", trend: "up" }', 'technical: { rsi: 0, macd: "NO_DATA", bollinger: "NO_DATA", trend: "sideways" }');

const upbitSeedPrices = ["108000000", "3850000", "215000", "820", "165", "540", "34000"];
for (const value of upbitSeedPrices) {
  server = server.replaceAll(`price: ${value}, change: 0,`, `price: 0, change: 0,`);
}
server = server.replaceAll(/marketCap: "[0-9,.]+조원"/g, 'marketCap: "N/A"');
server = server.replaceAll(/technical: \{ rsi: (?:48|49|52|53|54|55|61), macd: "(?:Bullish|Neutral)", bollinger: "(?:upper|middle)", trend: "(?:up|sideways)" \}/g, 'technical: { rsi: 0, macd: "NO_DATA", bollinger: "NO_DATA", trend: "sideways" }');

replaceAllExact(
  "    } catch (err: any) {\n      // Quiet fallback to synthetic history\n    }\n  }\n  \n  if (!history || history.length === 0) {\n    history = generateHistory(tickedPreset.price, 30);\n  }",
  "    } catch (err: any) {\n      console.warn(`[Stock Detail] verified history unavailable for ${tickedPreset.symbol}:`, err?.message || err);\n    }\n  }\n  \n  if (!history || history.length === 0) {\n    history = [];\n  }",
  "DETAIL_SYNTHETIC_HISTORY"
);
replaceAllExact(
  "  res.json({\n    ...tickedPreset,\n    history\n  });",
  "  const detailDataValid = Number(tickedPreset.price) > 0 && history.length > 0;\n  res.json({\n    ...tickedPreset,\n    dataValid: detailDataValid,\n    dataStatus: detailDataValid ? \"REALTIME_VERIFIED\" : \"NO_DATA\",\n    history\n  });",
  "DETAIL_DATA_STATUS"
);

const naverTier3Start = "  // Tier 3: Internal Universe fallback to ensure 100% endpoint reliability";
const naverTier3End = "\n});\n\nlet cachedUpbitMarkets";
if (server.includes(naverTier3Start)) {
  const start = server.indexOf(naverTier3Start);
  const end = server.indexOf(naverTier3End, start);
  if (end < 0) throw new Error("NAVER_TIER3_END_NOT_FOUND");
  const replacement = `  // No synthetic Tier 3. Missing providers remain NO_DATA.\n  return res.status(503).json({ datas: [], dataStatus: \"NO_DATA\", source: \"NAVER_REAL_ONLY\" });`;
  server = server.slice(0, start) + replacement + server.slice(end);
}
server = server.replaceAll('accumulatedTradingVolume: data.accumulatedTradingVolume || "1,000"', 'accumulatedTradingVolume: data.accumulatedTradingVolume || "0"');

const fetchStartToken = "async function fetchLiveStockData(preset: PresetStock): Promise<PresetStock> {";
const fetchEndToken = "\n// Pass-through function to preserve exact real market quotes without pseudo-random corruption";
const fetchStart = server.indexOf(fetchStartToken);
const fetchEnd = server.indexOf(fetchEndToken, fetchStart);
if (fetchStart < 0 || fetchEnd < 0) throw new Error("FETCH_LIVE_STOCK_DATA_BOUNDARY_NOT_FOUND");
let fetchBlock = server.slice(fetchStart, fetchEnd);

if (!fetchBlock.includes("PUBLIC_VERIFIED_QUOTE_SANITIZER")) {
  fetchBlock = fetchBlock.replace(
    fetchStartToken,
    `${fetchStartToken}\n  // PUBLIC_VERIFIED_QUOTE_SANITIZER: public quote endpoints may expose only\n  // provider-verified price fields. Fundamentals/TA placeholders are never truth.\n  const sanitizeVerifiedQuote = (data: PresetStock): PresetStock => ({\n    ...data,\n    per: 0, pbr: 0, roe: 0, debtRatio: 0, revenueGrowth: 0, operatingMargin: 0,\n    technical: { rsi: 0, macd: \"NO_DATA\", bollinger: \"NO_DATA\", trend: \"sideways\" }\n  });`
  );
  fetchBlock = fetchBlock.replaceAll("return stockRes;", "return sanitizeVerifiedQuote(stockRes);");
  fetchBlock = fetchBlock.replace(
    "  return preset;\n}",
    "  return sanitizeVerifiedQuote({ ...preset, price: 0, change: 0, changePct: 0, marketCap: \"N/A\" });\n}"
  );
  fetchBlock = fetchBlock.replace(
    "    return fallbackCached.data;",
    "    return sanitizeVerifiedQuote(fallbackCached.data);"
  );
  fetchBlock = fetchBlock.replace(
    `        let realRsi = preset.technical.rsi;\n        if (changePct > 1.5) realRsi = Math.min(80, realRsi + 3);\n        else if (changePct < -1.5) realRsi = Math.max(20, realRsi - 3);\n        \n`,
    ""
  );
  fetchBlock = fetchBlock.replace(
    `          technical: {\n            ...preset.technical,\n            rsi: Math.round(realRsi)\n          }`,
    `          technical: { rsi: 0, macd: \"NO_DATA\", bollinger: \"NO_DATA\", trend: \"sideways\" }`
  );
}

// Idempotent second-pass hardening: even after the sanitizer already exists,
// cached entries must never bypass it and only sanitized data may enter cache.
fetchBlock = fetchBlock.replace("    return cached.data;", "    return sanitizeVerifiedQuote(cached.data);");
fetchBlock = fetchBlock.replaceAll("data: stockRes, expiresAt:", "data: sanitizeVerifiedQuote(stockRes), expiresAt:");
fetchBlock = fetchBlock.replace("    return fallbackCached.data;", "    return sanitizeVerifiedQuote(fallbackCached.data);");
fetchBlock = fetchBlock.replace(
  "        const currentPrice = meta.regularMarketPrice || preset.price;\n        const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;",
  "        const currentPrice = Number(meta.regularMarketPrice);\n        const prevClose = Number(meta.chartPreviousClose || meta.previousClose);\n        if (!(currentPrice > 0) || !(prevClose > 0)) throw new Error(\"MISSING_VERIFIED_US_QUOTE_REFERENCE\");"
);
server = server.slice(0, fetchStart) + fetchBlock + server.slice(fetchEnd);

server = server.replace(
  "    const current = meta.regularMarketPrice || defaultVal.value;\n    const prev = meta.previousClose || meta.chartPreviousClose || defaultVal.value;",
  "    const current = Number(meta.regularMarketPrice);\n    const prev = Number(meta.previousClose || meta.chartPreviousClose);\n    if (!(current > 0) || !(prev > 0)) throw new Error(\"MISSING_VERIFIED_INDEX_PRICE\");"
);

for (const token of [
  "return res.json(upbitPresets);",
  "return res.json(DEMO_STOCKS);",
  "Live stock search failed, falling back to candidates:",
  "history = generateHistory(tickedPreset.price, 30);",
  'price: marketType === "KOREA" ? 50000 : marketType === "BTC" ? 100000000 : 100,',
  "Tier 3: Internal Universe fallback to ensure 100% endpoint reliability",
  'compareToPreviousClosePrice: "500"',
  'accumulatedTradingVolume: "1,000,000"',
  "return preset;",
  "meta.regularMarketPrice || defaultVal.value",
  "Math.round(realRsi)",
  "return cached.data;",
  "data: stockRes, expiresAt:"
]) {
  if (server.includes(token)) throw new Error(`FORBIDDEN_PUBLIC_FAKE_FALLBACK_REMAINS:${token}`);
}
if (!server.includes("PUBLIC_VERIFIED_QUOTE_SANITIZER")) throw new Error("PUBLIC_QUOTE_SANITIZER_NOT_INSTALLED");

fs.writeFileSync(serverPath, server, "utf8");
console.log("Public stock/search/detail/naver/index routes now fail closed and strip unverified quote metadata, including cache paths.");
