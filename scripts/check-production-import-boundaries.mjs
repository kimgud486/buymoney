import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  path.resolve("src"),
  path.resolve("server"),
  path.resolve("server.ts")
];

const PRODUCTION_EXTENSIONS =
  /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const SAFE_NON_PROD_SEGMENTS = [
  `${path.sep}demo${path.sep}`,
  `${path.sep}tests${path.sep}`,
  `${path.sep}test${path.sep}`,
  `${path.sep}fixtures${path.sep}`
];

const forbiddenImports = [
  /from\s+["'][^"']*\/demo(?:\/|["'])/i,
  /from\s+["'][^"']*\/mock(?:s)?(?:\/|["'])/i,
  /from\s+["'][^"']*\/fixtures(?:\/|["'])/i,

  /import\s*\(\s*["'][^"']*\/demo/i,
  /import\s*\(\s*["'][^"']*\/mock/i,
  /import\s*\(\s*["'][^"']*\/fixtures/i
];

const highRiskProductionTokens = [
  /\bmockPrice\b/i,
  /\bsimulatedFill\b/i,
  /\bsyntheticLiveCandle\b/i,
  /\bfakeCvd\b/i,
  /\bfakeRvol\b/i,
  /\bfakeDelta\b/i,
  /\bgenerateSynthetic\b/i
];

let failed = false;

function isNonProductionFile(file) {
  return SAFE_NON_PROD_SEGMENTS.some(
    (segment) => file.includes(segment)
  );
}

function scanFile(file) {
  if (isNonProductionFile(file)) return;

  const source =
    fs.readFileSync(file, "utf8");

  for (const pattern of forbiddenImports) {
    if (pattern.test(source)) {
      console.error(
        `❌ Forbidden non-production import: ${file}`
      );
      console.error(`   ${pattern}`);
      failed = true;
    }
  }

  for (
    const pattern of highRiskProductionTokens
  ) {
    if (pattern.test(source)) {
      console.error(
        `❌ Synthetic/mock trading token: ${file}`
      );
      console.error(`   ${pattern}`);
      failed = true;
    }
  }
}

function walk(target) {
  if (!fs.existsSync(target)) return;

  const stat = fs.statSync(target);

  if (stat.isFile()) {
    if (PRODUCTION_EXTENSIONS.test(target)) {
      scanFile(target);
    }

    return;
  }

  for (
    const entry of fs.readdirSync(
      target,
      { withFileTypes: true }
    )
  ) {
    const full = path.join(
      target,
      entry.name
    );

    if (entry.isDirectory()) {
      walk(full);
    } else if (
      PRODUCTION_EXTENSIONS.test(
        entry.name
      )
    ) {
      scanFile(full);
    }
  }
}

console.log(
  "🔍 Checking production import boundaries..."
);

for (const root of ROOTS) {
  walk(root);
}

if (failed) {
  console.error(
    "💥 Production boundary audit FAILED"
  );

  process.exit(1);
}

console.log(
  "✅ Production boundary audit PASSED"
);
