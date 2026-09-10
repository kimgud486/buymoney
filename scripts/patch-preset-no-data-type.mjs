import fs from "node:fs";

const serverPath = new URL("../server.ts", import.meta.url);
let source = fs.readFileSync(serverPath, "utf8");

const oldType = "    bollinger: 'upper' | 'middle' | 'lower';";
const newType = "    bollinger: 'upper' | 'middle' | 'lower' | 'NO_DATA';";

if (source.includes(oldType)) {
  source = source.replace(oldType, newType);
} else if (!source.includes(newType)) {
  throw new Error("PRESET_BOLLINGER_TYPE_ANCHOR_MISSING");
}

fs.writeFileSync(serverPath, source, "utf8");
console.log("PresetStock technical.bollinger now supports explicit NO_DATA.");
