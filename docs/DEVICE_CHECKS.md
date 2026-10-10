# Platform checks

Development host: macOS; Node 24.13.1; npm 11.8.0; Python 3.14.2. Xcode 26.1.1 (17B100).

Installed runtimes inspected: iOS 26.1, watchOS 26.1. Available devices include iPhone 17 Pro and Apple Watch Series 11. Stage 2 native voice adapter and LiveKit Expo configuration are implemented. The custom Expo Router entry now registers LiveKit WebRTC globals on native platforms before app startup; the web resolver is a no-op. `npx expo prebuild --platform ios --no-install` regenerated the iOS project successfully and retained the microphone permission. CocoaPods were not reinstalled after this no-install prebuild. An SDK-compatible `expo-dev-client` install was attempted, but npm networking is disabled; no dependency was added. `npx expo run:ios --configuration Debug` previously did not produce an app: the LiveKit WebRTC header `WebRTC/WebRTC.h` was missing during compilation, the ExpoModulesJSI build script failed, and CoreSimulatorService was unavailable. Expo SDK 57's versioned docs list Xcode 26.4+; this host has Xcode 26.1.1. Current CoreSimulatorService access also fails in this environment. Native install, launch, audio, and restart checks remain NOT RUN.

Windows web/backend: NOT RUN. Physical iPhone 16 Pro, Bluetooth headphones, locked-phone audio, actual Apple Watch pairing and haptics: NOT RUN.

Update this file with concrete run results, dependency versions and audio route when native stages begin.
