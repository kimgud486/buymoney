#!/usr/bin/env node
import fs from "node:fs";
const path = "src/components/AllMarketRadar.tsx";
let s = fs.readFileSync(path, "utf8");
const before = '              const merged = new Map(previous.map((row) => [`${row.market}:${row.symbol}`, row]));';
const after = '              const merged = new Map<string, RadarRow>(previous.map((row) => [`${row.market}:${row.symbol}`, row] as [string, RadarRow]));';
if (!s.includes(before)) throw new Error("AllMarketRadar merge marker not found");
s = s.replace(before, after);
fs.writeFileSync(path, s);
console.log("✅ AllMarketRadar Map type fixed");
