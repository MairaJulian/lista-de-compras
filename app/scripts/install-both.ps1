# Compila el APK debug una sola vez y lo instala en los dispositivos conectados.
#
# Uso (desde la carpeta app/):
#   .\scripts\install-both.ps1                  # celular y emulador
#   .\scripts\install-both.ps1 -Target phone    # solo celular (arm64)
#   .\scripts\install-both.ps1 -Target emulator # solo emulador (x86_64)
#   .\scripts\install-both.ps1 -SkipBuild       # reinstala el APK ya compilado
#
# No levanta Metro: para que la app cargue el JS, correr aparte `npx expo start`.

param(
  [ValidateSet('both', 'phone', 'emulator')]
  [string]$Target = 'both',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$package = 'com.mairajulian.changuito'
$appDir = Split-Path -Parent $PSScriptRoot
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
$apk = Join-Path $appDir 'android\app\build\outputs\apk\debug\app-debug.apk'

if (-not $env:ANDROID_HOME -or -not (Test-Path $adb)) {
  throw 'ANDROID_HOME no está definido o no se encuentra adb.exe.'
}

# Dispositivos conectados: los "emulator-*" son emuladores (x86_64), el resto físicos (arm64).
$devices = & $adb devices | Select-Object -Skip 1 |
  Where-Object { $_ -match '\sdevice$' } |
  ForEach-Object { ($_ -split '\s+')[0] }
$emulators = @($devices | Where-Object { $_ -like 'emulator-*' })
$phones = @($devices | Where-Object { $_ -notlike 'emulator-*' })

$targets = @()
if ($Target -in 'both', 'phone') { $targets += $phones }
if ($Target -in 'both', 'emulator') { $targets += $emulators }
if ($targets.Count -eq 0) { throw "No hay dispositivos conectados para '$Target'." }

# Compilar solo las arquitecturas necesarias (es lo que más tiempo ahorra).
$archs = @()
if ($Target -in 'both', 'phone' -and $phones.Count -gt 0) { $archs += 'arm64-v8a' }
if ($Target -in 'both', 'emulator' -and $emulators.Count -gt 0) { $archs += 'x86_64' }

if (-not $SkipBuild) {
  Write-Host "Compilando para: $($archs -join ', ')"
  Push-Location (Join-Path $appDir 'android')
  try {
    & .\gradlew.bat app:assembleDebug "-PreactNativeArchitectures=$($archs -join ',')"
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación con Gradle.' }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $apk)) { throw "No existe el APK: $apk" }

foreach ($device in $targets) {
  Write-Host "Instalando en $device..."
  & $adb -s $device install -r $apk
  if ($LASTEXITCODE -ne 0) { throw "Falló la instalación en $device." }
  & $adb -s $device reverse tcp:8081 tcp:8081 | Out-Null
  & $adb -s $device shell am force-stop $package
  & $adb -s $device shell monkey -p $package -c android.intent.category.LAUNCHER 1 | Out-Null
}

Write-Host 'Listo. Si la app no carga, levantá Metro con: npx expo start'
