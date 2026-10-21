# Applies the OJAS launcher icon and app name to a React Native project (Android + iOS).
# Usage (PowerShell, from the mobile-app folder):
#   .\branding\apply-branding.ps1 -AppDir D:\Talent-platform\TalentApp
param([Parameter(Mandatory = $true)][string]$AppDir)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path "$AppDir\android")) { Write-Error "No android folder in $AppDir. Run the react-native init step first."; exit 1 }

# Android launcher icons
$res = "$AppDir\android\app\src\main\res"
Get-ChildItem "$here\android\res" -Directory | ForEach-Object {
  New-Item -ItemType Directory -Force "$res\$($_.Name)" | Out-Null
  Copy-Item "$($_.FullName)\*" "$res\$($_.Name)\" -Force
}
# Remove adaptive-icon xml if a template created one, so the new PNGs are used
Remove-Item "$res\mipmap-anydpi-v26\ic_launcher*.xml" -ErrorAction SilentlyContinue

# Android app name shown under the icon
$strings = "$res\values\strings.xml"
if (Test-Path $strings) {
  (Get-Content $strings -Raw) -replace '(<string name="app_name">)[^<]*(</string>)', '${1}OJAS${2}' | Set-Content $strings
}

# iOS icon set and display name (only if an ios folder exists)
if (Test-Path "$AppDir\ios") {
  $set = Get-ChildItem "$AppDir\ios" -Recurse -Directory -Filter "AppIcon.appiconset" | Select-Object -First 1
  if ($set) { Copy-Item "$here\ios\AppIcon.appiconset\*" $set.FullName -Force }
  $plist = Get-ChildItem "$AppDir\ios" -Recurse -Filter Info.plist | Where-Object { $_.FullName -notmatch 'Pods|build' } | Select-Object -First 1
  if ($plist) { (Get-Content $plist.FullName -Raw) -replace '(<key>CFBundleDisplayName</key>\s*<string>)[^<]*(</string>)', '${1}OJAS${2}' | Set-Content $plist.FullName }
}
Write-Host "OJAS branding applied. Uninstall the old app from the emulator/phone, then run: npx react-native run-android"
