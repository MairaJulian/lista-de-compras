const { describe, it, expect } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildLocalProperties } = require('./with-cmake-local-properties');

function makeSdk(cmakeVersions) {
  const sdk = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-'));
  cmakeVersions.forEach((v) => fs.mkdirSync(path.join(sdk, 'cmake', v), { recursive: true }));
  return sdk;
}

describe('buildLocalProperties', () => {
  it('prefiere CMake 3.31.6 y usa barras normales', () => {
    const sdk = makeSdk(['3.22.1', '3.31.6']);
    const out = buildLocalProperties({ ANDROID_HOME: sdk });
    expect(out).toContain('cmake.dir=' + sdk.split(path.sep).join('/') + '/cmake/3.31.6');
    expect(out).not.toContain(String.fromCharCode(92));
  });

  it('acepta otra 3.31.x', () => {
    const out = buildLocalProperties({ ANDROID_HOME: makeSdk(['3.22.1', '3.31.7']) });
    expect(out).toContain('/cmake/3.31.7');
  });

  it('falla con mensaje claro si no hay CMake 3.31', () => {
    expect(() => buildLocalProperties({ ANDROID_HOME: makeSdk(['3.22.1']) })).toThrow(
      /Falta CMake 3\.31\.6/,
    );
  });

  it('falla si no hay ANDROID_HOME', () => {
    expect(() => buildLocalProperties({})).toThrow(/ANDROID_HOME/);
  });
});
