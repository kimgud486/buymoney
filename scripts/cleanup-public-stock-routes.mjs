import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
let server = fs.readFileSync(serverPath, "utf8");

function replaceAllExact(from, to, label, minCount = 1) {
  const count = server.split(from).length - 1;
  if (count === 0 && server.includes(to)) return;
  if (count < minCount) throw new Error(`PATCH_ANCHOR_MISSING:${label}:${count}`);
  server = server.split(from).join(to);
}

// Search/list endpoints may use metadata seeds to discover symbols, but provider
// failure must never leak those seeds as if they were live quotes.
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

// Metadata-only seeds must not contain plausible market values. They may still
// identify a symbol/name for the provider fetch, but every quote/indicator seed
// is explicitly zero/NO_DATA so a provider failure cannot masquerade as truth.
for (const [from, to, label] of [
  ["price: 1000,\n          change: 0,", "price: 0,\n          change: 0,", "UPBIT_SEED_PRICE"],
  ["price: 50000,\n          change: 0,", "price: 0,\n          change: 0,", "KR_SEED_PRICE"],
  ["price: 150,\n          change: 0,", "price: 0,\n          change: 0,", "US_SEED_PRICE"],
  ["price: 10000,\n        change: 0,", "price: 0,\n        change: 0,", "KR_DYNAMIC_SEED_PRICE"],
  ["price: 100,\n        change: 0,", "price: 0,\n        change: 0,", "US_DYNAMIC_SEED_PRICE"],
  ["price: marketType === \"KOREA\" ? 50000 : marketType === \"BTC\" ? 100000000 : 100,", "price: 0,", "DETAIL_SEED_PRICE"]
]) {
  if (server.includes(from)) server = server.split(from).join(to);
}

// Remove optimistic indicator/fundamental placeholders from metadata-only seed
// objects. Zero values are explicit unknowns; no positive score can be inferred.
server = server.replaceAll('technical: { rsi: 50, macd: "Bullish", bollinger: "middle", trend: "up" }', 'technical: { rsi: 0, macd: "NO_DATA", bollinger: "NO_DATA", trend: "sideways" }');
server = server.replaceAll('technical: { rsi: 50, macd: "Bullish", bollinger: "middle", trend: "up" }', 'technical: { rsi: 0, macd: "NO_DATA", bollinger: "NO_DATA", trend: "sideways" }');

// Single-stock details: never create synthetic price history. Provider failure
// is represented by an empty series and explicit NO_DATA flag.
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

for (const token of [
  "return res.json(upbitPresets);",
  "return res.json(DEMO_STOCKS);",
  "Live stock search failed, falling back to candidates:",
  "history = generateHistory(tickedPreset.price, 30);",
  'price: marketType === "KOREA" ? 50000 : marketType === "BTC" ? 100000000 : 100,'
]) {
  if (server.includes(token)) throw new Error(`FORBIDDEN_PUBLIC_FAKE_FALLBACK_REMAINS:${token}`);
}

fs.writeFileSync(serverPath, server, "utf8");
console.log("Public stock search/detail routes now fail closed without synthetic quote/history fallbacks.");
