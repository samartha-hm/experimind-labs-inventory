---
name: android-build-expert
description: Expert Android build, APK compilation, Gradle troubleshooting, and logcat analysis skill. Use whenever compiling APKs, fixing Java/Kotlin build errors, or inspecting Android runtime crashes.
---

# Android Build & Compilation Expert Runbook

Follow these procedures when building or troubleshooting Android projects:

## 1. Automated APK Build Process
1. Locate build scripts (e.g. `build_apk.ps1`, `gradlew.bat`, or custom build scripts).
2. Execute the build command from terminal:
   ```powershell
   .\build_apk.ps1
   ```
3. Verify exit code: check that compilation succeeded and output APK is generated (e.g. `app-release.apk`).

## 2. Diagnosing Build Failures
- **AAPT2 Errors**: Check `AndroidManifest.xml` and `res/` XML files for malformed attributes, invalid resource IDs, or missing namespace declarations (`xmlns:android`).
- **D8 / R8 Dexing Errors**: Check for Java 8+ desugaring requirements or duplicate library dependencies.
- **Java Compiler Errors**: Inspect exact line numbers in `src/com/.../MainActivity.java`. Check for missing imports or method signature deprecations in newer API levels.

## 3. Logcat Crash Inspection
When inspecting runtime crashes:
```powershell
adb logcat -d -s AndroidRuntime:E *:F
```
Filter for `FATAL EXCEPTION: main` to capture the root cause stack trace.
