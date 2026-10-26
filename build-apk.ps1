# build-apk.ps1 - Fast build script for Regasco Android APK
$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  REGASCO Mobile APK Builder (Capacitor)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Sync Capacitor
Write-Host "[1/3] Syncing Capacitor plugins and web assets..." -ForegroundColor Yellow
npx cap sync android

# 2. Configure Java Environment from Android Studio
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# 3. Compile Debug APK with Gradle
Write-Host "[2/3] Building native Android APK using Gradle..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location

# 4. Verify APK output
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "[3/3] SUCCESS! APK compiled successfully." -ForegroundColor Green
    $item = Get-Item $apkPath
    $sizeMb = [math]::Round($item.Length / 1MB, 2)
    Write-Host "APK Location: $apkPath" -ForegroundColor Green
    Copy-Item $apkPath -Destination "regasco-app-debug.apk" -Force
    Copy-Item $apkPath -Destination "public\regasco-app.apk" -Force
    Write-Host "Copied APK to regasco-app-debug.apk and public\regasco-app.apk" -ForegroundColor Green
    Write-Host "File Size: $sizeMb MB" -ForegroundColor Green
    Write-Host "Install to connected phone: adb install -r $apkPath" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: APK compilation did not produce $apkPath" -ForegroundColor Red
}
