import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
let server = fs.readFileSync(serverPath, "utf8");

const replacements = [
  [
    'detectedCandlePattern = liveChangePct >= 0 ? "Bullish Engulfing (상승 장악형)" : "Tweezer Bottom (집게형 바닥)";',
    'detectedCandlePattern = "NO_PATTERN";'
  ],
  [
    'detectedChartPattern = "Inverse Head & Shoulders (역H&S 반전)";',
    'detectedChartPattern = "NO_PATTERN";'
  ]
];

for (const [from, to] of replacements) {
  server = server.replaceAll(from, to);
}

for (const forbidden of [
  'detectedCandlePattern = liveChangePct >= 0 ? "Bullish Engulfing',
  'detectedChartPattern = "Inverse Head & Shoulders (역H&S 반전)"'
]) {
  if (server.includes(forbidden)) {
    throw new Error(`FORCED_PATTERN_FALLBACK_REMAINS:${forbidden}`);
  }
}

fs.writeFileSync(serverPath, server, "utf8");
console.log("Legacy forced pattern fallbacks normalized to NO_PATTERN.");
