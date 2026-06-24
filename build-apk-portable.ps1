$ErrorActionPreference = "Stop"
$workingDir = "c:\Users\bernard.castillo\Documents\Producao-Por-Linha\.android-sdk"

if (-not (Test-Path $workingDir)) {
    New-Item -ItemType Directory -Force -Path $workingDir | Out-Null
}

Write-Host "1. Baixando Microsoft OpenJDK 17 Portable..."
$jdkZip = Join-Path $workingDir "jdk.zip"
if (-not (Test-Path $jdkZip)) {
    Invoke-WebRequest -Uri "https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip" -OutFile $jdkZip
}
$jdkDir = Join-Path $workingDir "jdk-17.0.11+9"
if (-not (Test-Path $jdkDir)) {
    Write-Host "   Extraindo JDK..."
    Expand-Archive -Path $jdkZip -DestinationPath $workingDir -Force
}

Write-Host "2. Baixando Android Command Line Tools..."
$cmdlineZip = Join-Path $workingDir "cmdline-tools.zip"
if (-not (Test-Path $cmdlineZip)) {
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $cmdlineZip
}
$androidHome = Join-Path $workingDir "android_home"
$cmdlineDir = Join-Path $androidHome "cmdline-tools\latest"
if (-not (Test-Path $cmdlineDir)) {
    Write-Host "   Extraindo Command Line Tools..."
    $tempDir = Join-Path $androidHome "temp_extract"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    Expand-Archive -Path $cmdlineZip -DestinationPath $tempDir -Force
    
    # Mover a pasta cmdline-tools extraida para cmdline-tools/latest
    New-Item -ItemType Directory -Force -Path (Join-Path $androidHome "cmdline-tools") | Out-Null
    Move-Item -Path (Join-Path $tempDir "cmdline-tools") -Destination $cmdlineDir -Force
    Remove-Item -Path $tempDir -Recurse -Force
}

Write-Host "3. Configurando variaveis de ambiente..."
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $androidHome
$env:PATH = "$($jdkDir)\bin;$($cmdlineDir)\bin;$($env:PATH)"

Write-Host "4. Instalando pacotes do SDK via sdkmanager..."
Write-Host "   Aceitando licencas automaticamente..."
cmd /c "echo y| sdkmanager --licenses"

Write-Host "   Instalando plataformas e build-tools..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

Write-Host "5. Compilando o APK..."
Set-Location "c:\Users\bernard.castillo\Documents\Producao-Por-Linha\android"
.\gradlew assembleRelease

Write-Host "==========================="
Write-Host "PROCESSO CONCLUIDO!"
Write-Host "==========================="
