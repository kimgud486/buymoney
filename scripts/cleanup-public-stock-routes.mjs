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

for (const token of [
  "return res.json(upbitPresets);",
  "return res.json(DEMO_STOCKS);",
  "Live stock search failed, falling back to candidates:",
  "history = generateHistory(tickedPreset.price, 30);",
  'price: marketType === "KOREA" ? 50000 : marketType === "BTC" ? 100000000 : 100,',
  "Tier 3: Internal Universe fallback to ensure 100% endpoint reliability",
  'compareToPreviousClosePrice: "500"',
  'accumulatedTradingVolume: "1,000,000"'
]) {
  if (server.includes(token)) throw new Error(`FORBIDDEN_PUBLIC_FAKE_FALLBACK_REMAINS:${token}`);
}

fs.writeFileSync(serverPath, server, "utf8");
console.log("Public stock/search/detail/naver routes now fail closed without synthetic quote/history fallbacks.");
