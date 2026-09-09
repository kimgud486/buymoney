import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
const scannerPath = new URL("../src/services/GlobalRealtimeScannerV192.ts", import.meta.url);

let server = fs.readFileSync(serverPath, "utf8");
let scanner = fs.readFileSync(scannerPath, "utf8");

const oldCap = 'const requestedCount = Math.min(Math.max(parseInt(String(req.query.count || "60"), 10) || 60, 15), 120);';
const newCap = 'const requestedCount = Math.min(Math.max(parseInt(String(req.query.count || "60"), 10) || 60, 15), 240);';
if (server.includes(oldCap)) server = server.replace(oldCap, newCap);
if (!server.includes(newCap)) throw new Error("REALTIME_CANDLE_CAP_PATCH_MISSING");

const oldPatternType = 'const patternType = topBull ? topBull.patternId : "TECHNICAL_SETUP";';
const newPatternType = 'const patternType = topBull ? topBull.patternId : "NO_PATTERN";';
if (scanner.includes(oldPatternType)) scanner = scanner.replace(oldPatternType, newPatternType);
if (!scanner.includes(newPatternType)) throw new Error("PRECHECK_PATTERN_TYPE_PATCH_MISSING");

const oldPatternName = 'const patternName = topBull ? topBull.patternName : "실시간 수급 변곡 패턴";';
const newPatternName = 'const patternName = topBull ? topBull.patternName : "미검출";';
if (scanner.includes(oldPatternName)) scanner = scanner.replace(oldPatternName, newPatternName);
if (!scanner.includes(newPatternName)) throw new Error("PRECHECK_PATTERN_NAME_PATCH_MISSING");

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(scannerPath, scanner, "utf8");
console.log("V20 MTF candle cap and NO_PATTERN precheck patch applied.");
