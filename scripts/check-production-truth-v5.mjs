#!/usr/bin/env node
/**
 * BUYMONEY Production Truth Audit v5
 *
 * Prevent synthetic/demo/fallback market data from entering production paths,
 * prevent silent symbol substitution, and prevent unsafe provenance promotion.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const SERVER = path.join(ROOT, "server.ts");

const IGNORE_SEGMENTS = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}dist${path.sep}`,
  `${path.sep}build${path.sep}`,
  `${path.sep}coverage${path.sep}`,
  `${path.sep}test${path.sep}`,
  `${path.sep}tests${path.sep}`,
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}demo${path.sep}`,
  `${path.sep}fixtures${path.sep}`,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (IGNORE_SEGMENTS.some((x) => p.includes(x))) continue;
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = [...walk(SRC)];
if (fs.existsSync(SERVER)) files.push(SERVER);

const rules = [
  {
    id: "DEMO_STOCKS_IN_PRODUCTION",
    severity: "CRITICAL",
    re: /\bDEMO_STOCKS\b/,
    message: "Production code references DEMO_STOCKS.",
  },
  {
    id: "SYNTHETIC_HISTORY",
    severity: "CRITICAL",
    re: /\bgenerateHistory\s*\(/,
    message: "Synthetic history generation is present in a production path.",
  },
  {
    id: "HIDDEN_SAMSUNG_DEFAULT",
    severity: "CRITICAL",
    re: /(?:query|body)\.symbol\s*\|\|\s*["']005930["']/,
    message: "Missing symbol silently defaults to 005930.",
  },
  {
    id: "PRESET_LIVE_FALLBACK",
    severity: "CRITICAL",
    re: /\breturn\s+preset\s*;/,
    message: "Live-data failure can fall back to preset data.",
  },
  {
    id: "FAKE_INITIAL_UNIVERSE",
    severity: "CRITICAL",
    re: /\b(?:INITIAL_UNIVERSE|FRESH_SURGING_POOL)\b/,
    message: "Hardcoded scanner universe/pool data exists in production UI.",
    fileMatch: /RealtimeStockMarketScanner\.tsx$/,
  },
  {
    id: "RANDOM_MARKET_ANALYSIS",
    severity: "CRITICAL",
    re: /\bMath\.random\s*\(/,
    message: "Random values are used inside a production real-time scanner/analyzer.",
    fileMatch: /(RealtimeStockMarketScanner|RealtimeStockDetailAnalyzer)\.tsx$/,
  },
  {
    id: "SINE_SYNTHETIC_CHART",
    severity: "CRITICAL",
    re: /\bMath\.sin\s*\(/,
    message: "Synthetic mathematical chart/trend generation exists in production UI.",
    fileMatch: /(RealtimeStockMarketScanner|RealtimeStockDetailAnalyzer)\.tsx$/,
  },
  {
    id: "KIS_PROVENANCE_PROMOTION",
    severity: "HIGH",
    re: /data\.provider\s*\|\|\s*["']KIS["']/,
    message: "Missing provider is promoted to KIS.",
  },
  {
    id: "EXECUTION_GRADE_PROMOTION",
    severity: "HIGH",
    re: /data\.trust\s*\|\|[\s\S]{0,160}EXECUTION_GRADE/,
    message: "Missing trust can be promoted to EXECUTION_GRADE.",
  },
  {
    id: "REALTIME_SOURCE_PROMOTION",
    severity: "HIGH",
    re: /data\.source\s*\|\|\s*["']API_REALTIME["']/,
    message: "Missing source is promoted to API_REALTIME.",
  },
  {
    id: "TIMESTAMP_PROMOTED_TO_NOW",
    severity: "HIGH",
    re: /providerTimestamp\s*\|\|\s*quote\.timestamp\s*\|\|\s*now/,
    message: "Missing provider timestamp is promoted to current local time.",
  },
  {
    id: "SYMBOL_OR_NAME_JOIN",
    severity: "HIGH",
    re: /symbol[\s\S]{0,240}\|\|[\s\S]{0,160}\.name\s*===/,
    message: "Market data can be joined by symbol OR name. Require exact symbol identity.",
    fileMatch: /RealtimeStockMarketScanner\.tsx$/,
  },
  {
    id: "HARDCODED_TRADE_PRICE_FALLBACK",
    severity: "CRITICAL",
    re: /tradePrice[\s\S]{0,220}\|\|[\s\S]{0,220}(?:50000|90000000|132\.5)/,
    message: "Order price can fall back to a hardcoded value.",
    fileMatch: /RealtimeStockMarketScanner\.tsx$/,
  },
  {
    id: "STATIC_PERFORMANCE_CLAIM",
    severity: "HIGH",
    re: /(?:승률\s*[:：]\s*92\.4%|오늘\s*수익률\s*[:：]\s*\+4\.82%)/,
    message: "Hardcoded performance statistics appear in production UI.",
  },
  {
    id: "STATIC_REAL_ORDER_LOG",
    severity: "HIGH",
    re: /(?:실전\s*자동\s*주문\s*전송|실전\s*매수\s*체결|Live Broker Execution Stream)/i,
    message: "Static text/log may masquerade as a real broker event.",
    fileMatch: /RealtimeStockMarketScanner\.tsx$/,
  },
  {
    id: "ABSOLUTE_REALTIME_MARKETING",
    severity: "HIGH",
    re: /100%\s*진짜\s*시세/,
    message: "Absolute real-time truth claim must be backed by runtime provenance.",
  },
];

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const findings = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");

  for (const rule of rules) {
    if (rule.fileMatch && !rule.fileMatch.test(file)) continue;
    const flags = rule.re.flags.includes("g") ? rule.re.flags : rule.re.flags + "g";
    const re = new RegExp(rule.re.source, flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      findings.push({
        severity: rule.severity,
        id: rule.id,
        file: rel,
        line: lineOf(text, match.index),
        message: rule.message,
      });
      if (match[0].length === 0) re.lastIndex++;
    }
  }
}

function checkFile(rel, checks) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    findings.push({
      severity: "HIGH",
      id: "MISSING_TRUTH_COMPONENT",
      file: rel,
      line: 1,
      message: "Expected production truth component is missing.",
    });
    return;
  }

  const text = fs.readFileSync(abs, "utf8");
  for (const check of checks) {
    if (!check.must.test(text)) {
      findings.push({
        severity: check.severity || "HIGH",
        id: check.id,
        file: rel,
        line: 1,
        message: check.message,
      });
    }
  }
}

checkFile("src/services/RealScannerCoreEngine.ts", [
  {
    id: "MISSING_QUOTE_SYMBOL_IDENTITY_GATE",
    must: /SYMBOL_MISMATCH[\s\S]{0,500}normalizedQuoteSymbol/,
    message: "RealScannerCoreEngine must reject quote.symbol != requested symbol.",
    severity: "CRITICAL",
  },
]);

checkFile("src/services/MultiTimeframeAnalysisEngine.ts", [
  {
    id: "MTF_MISSING_SNAPSHOT_GATE",
    must: /getSnapshot\s*\(/,
    message: "Multi-timeframe analysis must verify snapshot freshness and trust.",
  },
]);

checkFile("src/services/GlobalRealtimeScannerV192.ts", [
  {
    id: "V192_MISSING_CANDLE_SNAPSHOT_GATE",
    must: /getSnapshot\s*\(/,
    message: "V19.2 scanner must verify candle snapshot freshness/trust before REALTIME_VERIFIED.",
  },
]);

const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
findings.sort((a, b) =>
  (order[a.severity] ?? 9) - (order[b.severity] ?? 9) ||
  a.file.localeCompare(b.file) ||
  a.line - b.line
);

console.log("\nBUYMONEY PRODUCTION TRUTH AUDIT v5\n");

if (findings.length === 0) {
  console.log("PASS: No known production truth violations found.");
  process.exit(0);
}

for (const finding of findings) {
  console.log(`[${finding.severity}] ${finding.id}`);
  console.log(`  ${finding.file}:${finding.line}`);
  console.log(`  ${finding.message}\n`);
}

const critical = findings.filter((x) => x.severity === "CRITICAL").length;
const high = findings.filter((x) => x.severity === "HIGH").length;
console.log(`Summary: ${findings.length} finding(s), ${critical} critical, ${high} high.`);
console.log("FAIL: Production truth audit did not pass.");
process.exit(1);
