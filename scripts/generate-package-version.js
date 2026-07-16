const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const { version } = require(path.join(projectRoot, 'package.json'));
const outputPath = path.join(projectRoot, 'src/int_airwallex/cartridge/scripts/constants/packageVersion.js');
const contents = `// Generated from package.json. Do not edit.\nmodule.exports = '${version}';\n`;

if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== contents) {
  fs.writeFileSync(outputPath, contents);
}

console.log(`[generate-package-version] ${version}`);
