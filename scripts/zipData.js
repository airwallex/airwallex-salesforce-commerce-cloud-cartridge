#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const siteId = process.argv[2];
if (!siteId) {
  console.error('Usage: zipData.js <site-id>');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'metadata', 'site_import');
const OUTPUT_ZIP = path.join(ROOT, 'metadata', 'site_import.zip');
const TMP_DIR = fs.mkdtempSync(path.join(require('os').tmpdir(), 'zipData-'));
const WORK_DIR = path.join(TMP_DIR, 'site_import');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceInFiles(dir, search, replacement) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceInFiles(fullPath, search, replacement);
    } else if (entry.name.endsWith('.xml')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(search)) {
        fs.writeFileSync(fullPath, content.replaceAll(search, replacement), 'utf8');
      }
    }
  }
}

function deleteDirSync(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

try {
  copyDirSync(SOURCE_DIR, WORK_DIR);

  const oldSiteDir = path.join(WORK_DIR, 'sites', 'RefArchGlobal');
  if (fs.existsSync(oldSiteDir)) {
    fs.renameSync(oldSiteDir, path.join(WORK_DIR, 'sites', siteId));
  }

  replaceInFiles(WORK_DIR, 'RefArchGlobal', siteId);

  if (fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

  // Node.js >=22.13 has native zip via node:zlib/fflate, but for broad
  // compatibility we shell out to the platform zip utility.
  const isWin = process.platform === 'win32';
  if (isWin) {
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${WORK_DIR}' -DestinationPath '${OUTPUT_ZIP}'"`);
  } else {
    execSync(`cd "${TMP_DIR}" && zip -rq site_import.zip site_import/`);
    fs.renameSync(path.join(TMP_DIR, 'site_import.zip'), OUTPUT_ZIP);
  }

  console.log(`Created ${path.relative(ROOT, OUTPUT_ZIP)} (site-id: ${siteId})`);
} finally {
  deleteDirSync(TMP_DIR);
}
