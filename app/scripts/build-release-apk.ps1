# Genera el APK de release de Changuito (el que se le pasa a la familia).
#
# Uso (desde la carpeta app/):
#   npm run build:apk                                  # APK para celulares y emulador
#   .\scripts\build-release-apk.ps1 -Abis arm64-v8a    # solo celulares modernos (más rápido y liviano)
#
# Resultado: app\dist\changuito.apk (la carpeta dist/ no se versiona).
# El APK lleva el JavaScript adentro (no necesita Metro) y se firma con la clave de debug del
# proyecto, cuya huella SHA-1 ya está registrada en Firebase (por eso anda el login con Google).
# Necesita lo mismo que el build normal: JDK 17, ANDROID_HOME y CMake 3.31.6 (ver README).

param(
  [string]$Abis = 'arm64-v8a,armeabi-v7a,x86_64'
)

$ErrorActionPreference = 'Stop'
$appDir = Split-Path -Parent $PSScriptRoot
Set-Location $appDir

if (-not (Test-Path 'google-services.json')) {
  throw 'Falta app/google-services.json (bajalo de la consola de Firebase, ver README).'
}

# Regenera android/ desde cero: es la forma reproducible (la carpeta no se versiona).
npx expo prebuild --platform android --clean
if ($LASTEXITCODE -ne 0) { throw 'Falló expo prebuild.' }

Push-Location android
try {
  .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$Abis"
  if ($LASTEXITCODE -ne 0) { throw 'Falló el build de release.' }
} finally {
  Pop-Location
}

$apk = 'android\app\build\outputs\apk\release\app-release.apk'
New-Item -ItemType Directory -Force -Path 'dist' | Out-Null
Copy-Item $apk 'dist\changuito.apk' -Force
$size = [math]::Round((Get-Item 'dist\changuito.apk').Length / 1MB, 1)
Write-Host "Listo: $appDir\dist\changuito.apk ($size MB)"
