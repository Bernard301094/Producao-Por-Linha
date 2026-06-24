$ErrorActionPreference = "Stop"
$workingDir = "c:\Users\bernard.castillo\Documents\Producao-Por-Linha\.android-sdk"

Write-Host "1. Baixando Microsoft OpenJDK 21 Portable..."
$jdkZip = Join-Path $workingDir "jdk21.zip"
if (-not (Test-Path $jdkZip)) {
    Invoke-WebRequest -Uri "https://aka.ms/download-jdk/microsoft-jdk-21.0.3-windows-x64.zip" -OutFile $jdkZip
}
$jdkDir = Join-Path $workingDir "jdk-21.0.3+9"
if (-not (Test-Path $jdkDir)) {
    Write-Host "   Extraindo JDK 21..."
    Expand-Archive -Path $jdkZip -DestinationPath $workingDir -Force
}

Write-Host "2. Compilando o APK com Java 21..."
$androidHome = Join-Path $workingDir "android_home"
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $androidHome
$env:PATH = "$($jdkDir)\bin;$($env:PATH)"

Set-Location "c:\Users\bernard.castillo\Documents\Producao-Por-Linha\android"
.\gradlew assembleRelease

Write-Host "==========================="
Write-Host "PROCESSO CONCLUIDO!"
Write-Host "==========================="
