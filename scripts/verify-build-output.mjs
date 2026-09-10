import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const build = path.join(root, 'build');

function fail(message) {
  console.error(`[build-output] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  fail('dist directory was not produced');
}

const requiredFiles = [
  path.join(dist, 'index.html'),
  path.join(dist, 'server.cjs'),
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
    fail(`required artifact missing or empty: ${path.relative(root, file)}`);
  }
}

const assetsDir = path.join(dist, 'assets');
if (!fs.existsSync(assetsDir) || !fs.statSync(assetsDir).isDirectory()) {
  fail('dist/assets directory is missing');
}

const assetFiles = fs.readdirSync(assetsDir).filter((name) => fs.statSync(path.join(assetsDir, name)).isFile());
if (assetFiles.length === 0) {
  fail('dist/assets contains no build assets');
}

fs.rmSync(build, { recursive: true, force: true });
fs.cpSync(dist, build, { recursive: true });

const mirroredIndex = path.join(build, 'index.html');
const mirroredServer = path.join(build, 'server.cjs');
if (!fs.existsSync(mirroredIndex) || !fs.existsSync(mirroredServer)) {
  fail('build mirror was not created correctly');
}

console.log(`[build-output] OK: dist + build ready (${assetFiles.length} asset files)`);
