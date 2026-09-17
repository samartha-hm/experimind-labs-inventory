# Android & Mobile Engineering Standards

Guidelines for building, refactoring, and verifying Android applications (Java, Kotlin, WebView, Gradle).

## 1. Activity & Lifecycle Safety
- **State Preservation**: Always handle configuration changes (orientation, dark mode) gracefully. Override `onSaveInstanceState` and avoid state loss during process death.
- **Resource Cleanup**: Unregister `BroadcastReceiver`s, dismiss dialogs, and detach `MediaSession` callbacks in `onDestroy` to eliminate memory leaks.
- **Thread Isolation**: Never run network calls, database queries, or heavy bitmap decodes on the Main (UI) Thread. Use background executors or coroutines.

## 2. WebView & Media Engine Best Practices
- **JavaScript Interface Security**: Any Java method exposed to WebView via `@JavascriptInterface` must strictly validate input arguments to prevent command injection.
- **Hardware Acceleration**: Enable hardware acceleration in `AndroidManifest.xml` (`android:hardwareAccelerated="true"`) for fluid audio visualizers and smooth animations.
- **AudioFocus Management**: When managing audio playback, request `AudioFocus` (`AudioManager.AUDIOFOCUS_GAIN`) and react to audio focus loss (pause on duck/loss).

## 3. APK Packaging & Proguard / R8 Rules
- Ensure `proguard-rules.pro` keeps reflection targets and serialized model classes (`-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }`).
- Minimize APK size by using WebP image compression and removing unused alternative resources.
