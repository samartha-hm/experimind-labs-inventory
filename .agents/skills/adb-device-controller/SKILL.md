---
name: adb-device-controller
description: Controls Android devices and emulators via Android Debug Bridge (ADB). Automates app installation, launching intents, capturing device screenshots, and testing UI flows. Use when testing Android apps on device.
---

# ADB Device Controller Runbook

Use ADB terminal commands to automate Android verification:

## 1. Device Verification
```powershell
adb devices -l
```
Ensure at least one device or emulator shows status `device`.

## 2. Installing & Launching APK
```powershell
# Install APK (replacing existing installation)
adb install -r -d "path/to/app-release.apk"

# Launch main activity
adb shell am start -n "com.spotiverse.app/.MainActivity"
```

## 3. Capturing Real Device State (Screenshots)
```powershell
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png ./screen_verify.png
```
Inspect the pulled screenshot to verify layout rendering and button alignment.

## 4. Monkey Stress Testing
Run automated UI stress tests to ensure no unhandled exceptions crash the UI:
```powershell
adb shell monkey -p com.spotiverse.app --throttle 100 500
```
