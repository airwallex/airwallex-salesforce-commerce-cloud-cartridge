import { VERSION } from '../appConfig';

const packageVersion = require(process.cwd() + '/package.json').version as string;

describe('appConfig', () => {
  it('uses the package version for plugin metadata', () => {
    expect(VERSION).toBe(packageVersion);
  });
});
