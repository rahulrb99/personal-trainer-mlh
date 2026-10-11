# Platform checks

## macOS simulator check — October 10, 2026

Development host: macOS; Node 24.13.1; npm 11.8.0; Python 3.14.2; Xcode 27.0 (27A266a). `xcodebuild -runFirstLaunch` completed successfully. Available runtimes include iOS 26.1 and watchOS 26.1.

The missing `WebRTC/WebRTC.h` build error was caused by `@livekit/react-native-webrtc` 144.2.0 selecting the renamed LiveKitWebRTC framework while `@livekit/react-native` 2.12.0 still imports WebRTC. Pinning WebRTC to **144.1.2** installs WebRTC-SDK 144.7559.10 and preserves compatibility with `@elevenlabs/react-native` 1.2.29. Keep this exact pin until the ElevenLabs and LiveKit native SDKs can be upgraded together.

Checks performed:

- `npx expo install @livekit/react-native-webrtc@144.1.2 -- --save-exact`: PASS.
- `pod install` in `mobile/ios`: PASS; 108 pods installed.
- `npx expo run:ios --configuration Debug --device 'iPhone 17 Pro' --port 8082`: PASS; build reported zero errors and warnings, app installed on iOS 26.1.
- App launch and restart: PASS; Spotter setup screen visibly rendered. The backend-offline message appeared while the service was stopped. After starting the backend with `--env-file backend/.env` and restarting the app, `/catalog` returned 200 and the setup form appeared without the connection error.
- `npm run lint`, `npm run typecheck`, `npm run export:web`: PASS.

Native build/simulator commands required execution outside the sandbox to access CoreSimulator and dependency downloads. The native LiveKit globals registration and microphone permission remain configured. Generated `ios/` files are not tracked.

Live microphone input, spoken reply, voice end/restart, full workout transitions, watch-panel synchronization and recovery during rest: **NOT RUN**. Stage 4 remains open until those walkthroughs pass. Audio input/output route has not been validated.

Actual SwiftUI watch app: implemented under `watch/`; build, install and join-screen launch PASS on Apple Watch Series 11 (46mm), watchOS 26.1 with Xcode 27.0. Live session pairing/actions/voice synchronization remain NOT RUN. See `watch/README.md`. The browser `/watch` route is a simulation. Physical iPhone, Bluetooth headphones, locked-phone audio, actual Apple Watch pairing and haptics: NOT RUN.

## Stage 5 implementation — October 10, 2026

A standalone watch-only SwiftUI target now supplies manual development pairing, Keychain session restore, one-second foreground REST refresh with reconnect backoff, versioned Got it/Taken/Set done, alternative accept/decline, skip/retry, confirmed End and backend summary. Uncertain event retries retain their UUID and original target. Optional Talk remains deferred.

`xcodebuild -project watch/SpotterWatch.xcodeproj -scheme SpotterWatch -configuration Debug -sdk watchsimulator -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)' -derivedDataPath watch/build CODE_SIGNING_ALLOWED=NO build`: PASS. The actual run selected the equivalent device by UUID. An initial install rejected conflicting watch-only/independent-companion plist keys; removed the companion key, rebuilt, installed and launched successfully. Final build has no compiler errors; Xcode emitted an App Intents metadata notice because this app has no App Intents dependency. Device Hub visibly shows the native join screen.

Phone pairing label now reads “Pair watch controls” for either native or browser clients. Mobile `npm run lint` and `npm run typecheck`: PASS. No new automated tests or full workout walkthroughs were run for this implementation.
