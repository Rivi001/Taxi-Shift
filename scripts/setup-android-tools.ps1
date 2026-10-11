$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$toolsRoot=Join-Path $projectRoot '.android-tools'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
$jdkZip=Join-Path $toolsRoot 'jdk21.zip'
if(!(Test-Path (Join-Path $toolsRoot 'jdk'))){
  Write-Output 'Downloading Java 21 from Microsoft...'
  if(!(Test-Path $jdkZip)){Invoke-WebRequest 'https://aka.ms/download-jdk/microsoft-jdk-21.0.12.1-windows-x64.zip' -OutFile $jdkZip}
  $hashResponse=Invoke-WebRequest 'https://aka.ms/download-jdk/microsoft-jdk-21.0.12.1-windows-x64.zip.sha256sum.txt'
  $hashText=if($hashResponse.Content -is [byte[]]){[Text.Encoding]::UTF8.GetString($hashResponse.Content)}else{$hashResponse.Content}
  $expected=([regex]::Match($hashText,'[a-fA-F0-9]{64}')).Value
  if(!$expected -or (Get-FileHash $jdkZip -Algorithm SHA256).Hash -ne $expected){throw 'Java archive checksum mismatch'}
  Expand-Archive -LiteralPath $jdkZip -DestinationPath (Join-Path $toolsRoot 'jdk') -Force
}
$sdkRoot=Join-Path $toolsRoot 'sdk'
$manager=Join-Path $sdkRoot 'cmdline-tools/latest/bin/sdkmanager.bat'
if(!(Test-Path $manager)){
  Write-Output 'Downloading Android command-line tools from Google...'
  $sdkZip=Join-Path $toolsRoot 'android-tools.zip'
  Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkZip
  if((Get-FileHash $sdkZip -Algorithm SHA256).Hash -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'){throw 'Android tools checksum mismatch'}
  $unpack=Join-Path $toolsRoot 'unpacked-sdk'
  Expand-Archive -LiteralPath $sdkZip -DestinationPath $unpack -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $sdkRoot 'cmdline-tools/latest') | Out-Null
  Copy-Item -Path (Join-Path $unpack 'cmdline-tools/*') -Destination (Join-Path $sdkRoot 'cmdline-tools/latest') -Recurse -Force
}
$jdkHome=(Get-ChildItem (Join-Path $toolsRoot 'jdk') -Directory | Select-Object -First 1).FullName
$env:JAVA_HOME=$jdkHome
$env:ANDROID_HOME=$sdkRoot
Write-Output 'Android tools downloaded. Run sdkmanager --licenses, then install platform 36 and build-tools 36.0.0.'
Write-Output ('Java: '+$jdkHome)
Write-Output ('SDK: '+$sdkRoot)
