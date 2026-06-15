#!/usr/bin/env node
/**
 * Uploads one or more cartridges to the configured SFCC sandbox.
 *
 * Replaces the Unix-only `source .env && sgmf-scripts --uploadCartridge $VAR`
 * pattern: loads .env via dotenv and resolves cartridge names in Node, so it
 * works identically on macOS, Linux, and Windows (no `source`/`$VAR`).
 *
 * Usage:
 *   node scripts/upload-cartridge.js            # all three cartridges
 *   node scripts/upload-cartridge.js bm         # just bm_airwallex
 *   node scripts/upload-cartridge.js bm int app # explicit subset/order
 *
 * Pass --env to use the cartridge names from .env (env-var overrides);
 * otherwise the default cartridge names are used.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const useEnv = argv.includes('--env');
const selectors = argv.filter((arg) => arg !== '--env');

if (useEnv) {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
}

const CARTRIDGES = {
  bm: process.env.BM_AIRWALLEX_CARTRIDGE_NAME || 'bm_airwallex',
  int: process.env.INT_AIRWALLEX_CARTRIDGE_NAME || 'int_airwallex',
  app: process.env.APP_AIRWALLEX_CARTRIDGE_NAME || 'app_airwallex',
};

const ORDER = ['bm', 'int', 'app'];
const targets = selectors.length ? selectors : ORDER;

for (const key of targets) {
  if (!(key in CARTRIDGES)) {
    console.error(`[upload-cartridge] Unknown cartridge "${key}". Valid: ${ORDER.join(', ')}.`);
    process.exit(1);
  }
}

for (const key of targets) {
  const name = CARTRIDGES[key];
  console.log(`[upload-cartridge] Uploading ${name}...`);
  // shell: true lets Windows resolve the sgmf-scripts.cmd shim on PATH.
  const result = spawnSync('sgmf-scripts', ['--uploadCartridge', name], { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}
