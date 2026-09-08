import fs from "fs";
import path from "path";

console.log("🔍 Running Production Button Contract & Test-ID Audit...");

const REGISTRY_FILE = path.join(process.cwd(), "src", "ui", "ProductionButtonRegistry.ts");

if (!fs.existsSync(REGISTRY_FILE)) {
  console.error("❌ ProductionButtonRegistry.ts missing!");
  process.exit(1);
}

const registryContent = fs.readFileSync(REGISTRY_FILE, "utf-8");

// Extract button IDs from registry
const idRegex = /id:\s*"([^"]+)"/g;
const registeredIds = new Set();
let match;

while ((match = idRegex.exec(registryContent)) !== null) {
  registeredIds.add(match[1]);
}

if (registeredIds.size === 0) {
  console.error("❌ No buttons registered in ProductionButtonRegistry.ts");
  process.exit(1);
}

console.log(`📋 Found ${registeredIds.size} registered button contracts.`);

// Search for TSX files in src
function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith(".tsx")) {
      files.push(name);
    }
  }
  return files;
}

const tsxFiles = getFiles(path.join(process.cwd(), "src"));
const foundTestIdsInCode = new Set();
let hasEmptyHandlers = false;

for (const filePath of tsxFiles) {
  const content = fs.readFileSync(filePath, "utf-8");
  const testIdMatches = content.matchAll(/data-testid=["']([^"']+)["']/g);
  for (const m of testIdMatches) {
    foundTestIdsInCode.add(m[1]);
  }

  // Check for empty onClick handlers: onClick={() => {}} or onClick={() => console.log()}
  const emptyHandlerRegex = /onClick=\{\s*\(\)\s*=>\s*(?:\{\s*\}|console\.log\([^)]*\)\s*)\}/g;
  if (emptyHandlerRegex.test(content)) {
    console.error(`❌ Empty or console.log onClick handler found in: ${filePath}`);
    hasEmptyHandlers = true;
  }
}

let missingInCode = [];
for (const id of registeredIds) {
  if (!foundTestIdsInCode.has(id)) {
    missingInCode.push(id);
  }
}

if (missingInCode.length > 0) {
  console.error(`❌ Registered button IDs missing in JSX:`, missingInCode);
  process.exit(1);
}

if (hasEmptyHandlers) {
  console.error("❌ Audit failed due to empty onClick handlers in JSX.");
  process.exit(1);
}

console.log("✅ Production Button Contract Audit PASSED cleanly.");
process.exit(0);
