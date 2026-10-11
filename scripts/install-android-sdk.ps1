$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = (Get-ChildItem -LiteralPath (Join-Path $projectRoot '.android-tools\jdk') -Directory | Select-Object -First 1).FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $projectRoot '.android-tools\sdk' }
$javaExecutable = Join-Path $env:JAVA_HOME 'bin\java.exe'
$toolsDir = Join-Path $env:ANDROID_HOME 'cmdline-tools\latest'
$sdkArguments = @("-Dcom.android.sdklib.toolsdir=$toolsDir", '-classpath', (Join-Path $toolsDir 'lib\sdkmanager-classpath.jar'), 'com.android.sdklib.tool.sdkmanager.SdkManagerCli', "--sdk_root=$env:ANDROID_HOME")
# Launch Java directly: the official .bat launcher fails with parentheses in some Windows paths.
& $javaExecutable @sdkArguments --licenses
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license step failed.' }
& $javaExecutable @sdkArguments 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed.' }
