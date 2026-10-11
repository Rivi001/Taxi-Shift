$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.android-tools\jdk') -Directory | Select-Object -First 1
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to JDK 21 or run npm run android:tools.' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $projectRoot '.android-tools\sdk' }
if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platforms\android-36'))) { throw 'Install Android SDK 36 first; see README.md.' }
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle-cache'
$sdkPath = $env:ANDROID_HOME.Replace('\','/').Replace(':','\:')
[IO.File]::WriteAllText((Join-Path $projectRoot 'android\local.properties'), "sdk.dir=$sdkPath`n")
Push-Location (Join-Path $projectRoot 'android')
try {
    & .\gradlew.bat --no-daemon bundleRelease assembleRelease
    if ($LASTEXITCODE -ne 0) { throw "Android build failed: $LASTEXITCODE" }
} finally { Pop-Location }
$releaseDir = Join-Path $projectRoot 'release\android'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\bundle\release\app-release.aab') -Destination (Join-Path $releaseDir 'Taxi-Shift-1.0.0.aab')
Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk') -Destination (Join-Path $releaseDir 'Taxi-Shift-1.0.0.apk')
& (Join-Path $env:JAVA_HOME 'bin\jarsigner.exe') -verify (Join-Path $releaseDir 'Taxi-Shift-1.0.0.aab')
if ($LASTEXITCODE -ne 0) { throw 'Bundle signature verification failed.' }
& (Join-Path $env:JAVA_HOME 'bin\java.exe') -jar (Join-Path $env:ANDROID_HOME 'build-tools\36.0.0\lib\apksigner.jar') verify --verbose (Join-Path $releaseDir 'Taxi-Shift-1.0.0.apk')
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
Get-ChildItem -LiteralPath $releaseDir -File | Get-FileHash -Algorithm SHA256 | Format-Table -AutoSize
