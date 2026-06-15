#!/usr/bin/env node
/**
 * Copies the built Business Manager React bundle into the bm_airwallex
 * cartridge static folder. Pure Node (fs/path) so it works identically on
 * macOS, Linux, and Windows - replaces the previous Unix-only `cp`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'packages', 'bm-web', 'dist', 'index.js');
const DEST_DIR = path.join(ROOT, 'cartridges', 'bm_airwallex', 'cartridge', 'static', 'default');
const DEST = path.join(DEST_DIR, 'index.js');

if (!fs.existsSync(SRC)) {
  console.error(
    `[fetch-bm-web] Source bundle not found: ${path.relative(ROOT, SRC)}\nRun the bm-web build first (npm run build).`,
  );
  process.exit(1);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
fs.copyFileSync(SRC, DEST);

console.log(`[fetch-bm-web] ${path.relative(ROOT, SRC)} -> ${path.relative(ROOT, DEST)}`);
