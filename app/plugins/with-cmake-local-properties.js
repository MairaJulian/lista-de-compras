// Escribe android/local.properties en cada prebuild con sdk.dir y cmake.dir.
// El ninja de CMake 3.22.1 (el que usa Android Gradle Plugin por defecto) falla con rutas de más de
// 260 caracteres en Windows; el de CMake 3.31.x no. Ver README ("Rutas largas en Windows").
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const PREFERRED_CMAKE = '3.31.6';
const CMAKE_SERIES = /^3\.31\.\d+$/;

function toForwardSlashes(p) {
  return p.split(path.sep).join('/');
}

function findSdkDir(env = process.env) {
  const sdkDir = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
  if (!sdkDir || !fs.existsSync(sdkDir)) {
    throw new Error(
      'No encuentro el SDK de Android: definí la variable de entorno ANDROID_HOME con la carpeta del SDK.',
    );
  }
  return sdkDir;
}

function findCmakeDir(sdkDir) {
  const cmakeRoot = path.join(sdkDir, 'cmake');
  const versions = fs.existsSync(cmakeRoot)
    ? fs.readdirSync(cmakeRoot).filter((name) => CMAKE_SERIES.test(name))
    : [];
  if (versions.length === 0) {
    throw new Error(
      `Falta CMake ${PREFERRED_CMAKE} (o 3.31.x) en ${cmakeRoot}. Instalalo desde Android Studio: ` +
        `SDK Manager > SDK Tools > CMake > "Show Package Details" > ${PREFERRED_CMAKE}. ` +
        'Sin él, el build falla en Windows por rutas de más de 260 caracteres.',
    );
  }
  const chosen = versions.includes(PREFERRED_CMAKE)
    ? PREFERRED_CMAKE
    : versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
  return path.join(cmakeRoot, chosen);
}

function buildLocalProperties(env = process.env) {
  const sdkDir = findSdkDir(env);
  const cmakeDir = findCmakeDir(sdkDir);
  return `sdk.dir=${toForwardSlashes(sdkDir)}\ncmake.dir=${toForwardSlashes(cmakeDir)}\n`;
}

const withCmakeLocalProperties = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const file = path.join(modConfig.modRequest.platformProjectRoot, 'local.properties');
      fs.writeFileSync(file, buildLocalProperties());
      return modConfig;
    },
  ]);

module.exports = withCmakeLocalProperties;
module.exports.buildLocalProperties = buildLocalProperties;
