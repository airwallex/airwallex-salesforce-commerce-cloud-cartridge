const { src, series, dest } = require('gulp');
const del = require('del');
const ts = require('gulp-typescript');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
require('dotenv').config();

const INT_AIRWALLEX_CARTRIDGE_NAME = process.env.INT_AIRWALLEX_CARTRIDGE_NAME || 'int_airwallex';
const BM_AIRWALLEX_CARTRIDGE_NAME = process.env.BM_AIRWALLEX_CARTRIDGE_NAME || 'bm_airwallex';
const APP_AIRWALLEX_CARTRIDGE_NAME = process.env.APP_AIRWALLEX_CARTRIDGE_NAME || 'app_airwallex';

const tsProject = ts.createProject('tsconfig.json');

const destFolder = 'cartridges';

const ignoreList = ['!src/{__tests__,__tests__/**}', '!src/**/*.test.ts', '!src/testingUtils.ts', '!src/**/types.ts'];

function clean() {
  return del([destFolder]);
}

function replaceAsteriskImport() {
  return replace('@/cartridge', '*/cartridge');
}

function renameCartridge() {
  return rename(file => {
    file.dirname = file.dirname.replace('int_airwallex', INT_AIRWALLEX_CARTRIDGE_NAME);
    file.dirname = file.dirname.replace('bm_airwallex', BM_AIRWALLEX_CARTRIDGE_NAME);
    file.dirname = file.dirname.replace('app_airwallex', APP_AIRWALLEX_CARTRIDGE_NAME);

    file.basename = file.basename.replace('int_airwallex', INT_AIRWALLEX_CARTRIDGE_NAME);
    file.basename = file.basename.replace('bm_airwallex', BM_AIRWALLEX_CARTRIDGE_NAME);
    file.basename = file.basename.replace('app_airwallex', APP_AIRWALLEX_CARTRIDGE_NAME);
  });
}

function typescript() {
  return src(['src/**/*.ts', ...ignoreList])
    .pipe(tsProject())
    .js.pipe(replaceAsteriskImport())
    .pipe(renameCartridge())
    .pipe(dest(destFolder));
}

function copyNonTs() {
  return src(['src/**/*', '!src/**/*.ts', ...ignoreList])
    .pipe(replace('int_airwallex', INT_AIRWALLEX_CARTRIDGE_NAME))
    .pipe(replace('bm_airwallex', BM_AIRWALLEX_CARTRIDGE_NAME))
    .pipe(replace('app_airwallex', APP_AIRWALLEX_CARTRIDGE_NAME))
    .pipe(renameCartridge())
    .pipe(dest(destFolder));
}

exports.default = series(clean, typescript, copyNonTs);
