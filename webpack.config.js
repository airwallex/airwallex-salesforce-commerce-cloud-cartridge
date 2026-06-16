/* eslint-disable */
/* globals cat, cd, cp, echo, exec, exit, find, ls, mkdir, rm, target, test */

'use strict';

const cwd = process.cwd();
const shell = require('shelljs');
const path = require('path');
const webpack = require('sgmf-scripts').webpack;
require('dotenv').config();

const cartridgeName = process.env.APP_AIRWALLEX_CARTRIDGE_NAME || 'app_airwallex';

const bootstrapPackages = {
  Alert: 'exports-loader?Alert!bootstrap/js/src/alert',
  // Button: 'exports-loader?Button!bootstrap/js/src/button',
  Carousel: 'exports-loader?Carousel!bootstrap/js/src/carousel',
  Collapse: 'exports-loader?Collapse!bootstrap/js/src/collapse',
  // Dropdown: 'exports-loader?Dropdown!bootstrap/js/src/dropdown',
  Modal: 'exports-loader?Modal!bootstrap/js/src/modal',
  // Popover: 'exports-loader?Popover!bootstrap/js/src/popover',
  Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/src/scrollspy',
  Tab: 'exports-loader?Tab!bootstrap/js/src/tab',
  // Tooltip: 'exports-loader?Tooltip!bootstrap/js/src/tooltip',
  Util: 'exports-loader?Util!bootstrap/js/src/util',
};

const createJsPath = () => {
  const clientDir = path.join(cwd, `./cartridges/${cartridgeName}/cartridge/client`);
  // glob (used by shell.ls) requires forward-slash separators on every
  // platform; path.join yields backslashes on Windows, which glob treats as
  // escape characters so the `**` pattern never matches. Build the pattern
  // with forward slashes explicitly.
  const jsGlob = `${clientDir.replace(/\\/g, '/')}/**/js/**/*.js`;
  const jsFiles = shell.ls(jsGlob);

  const result = {};
  jsFiles.forEach((filePath) => {
    let location = path.relative(clientDir, filePath);
    location = location.substring(0, location.length - 3);
    // Normalise entry keys to forward slashes so output paths match across
    // platforms (path.relative returns backslashes on Windows).
    result[location.replace(/\\/g, '/')] = filePath;
  });
  return result;
};

module.exports = [
  {
    mode: 'development',
    name: 'js',
    entry: createJsPath(),
    output: {
      path: path.resolve(`./cartridges/${cartridgeName}/cartridge/static`),
      filename: '[name].js',
    },
    plugins: [new webpack.ProvidePlugin(bootstrapPackages)],
  },
];
