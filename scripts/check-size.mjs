import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const assets = 'dist/assets';
const budgets = { js: 200 * 1024, css: 32 * 1024 };
let failed = false;

for (const file of readdirSync(assets)) {
  const path = join(assets, file);
  const gzip = gzipSync(readFileSync(path));
  if (file.endsWith('.js') && gzip.length > budgets.js) {
    console.error(`JS budget exceeded: ${file} ${(gzip.length / 1024).toFixed(1)} KB gzip`);
    failed = true;
  }
  if (file.endsWith('.css') && gzip.length > budgets.css) {
    console.error(`CSS budget exceeded: ${file} ${(gzip.length / 1024).toFixed(1)} KB gzip`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`Bundle budgets passed (JS ${budgets.js / 1024} KB, CSS ${budgets.css / 1024} KB gzip).`);
