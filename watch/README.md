# Spotter watch simulator

Standalone SwiftUI watchOS app, Xcode project included, no package dependencies. This connects directly to the same backend as the phone using schema version 1 (`contracts/snapshot.schema.json`, event contract and `docs/API.md`). It does not use WatchConnectivity or record watch audio. Mat stays on the phone.

## Build and launch on macOS

Keep the backend and iPhone app running. From the repository root:

```sh
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --env-file backend/.env
```

In another terminal:

```sh
xcrun simctl list devices available
xcodebuild -project watch/SpotterWatch.xcodeproj -scheme SpotterWatch \
  -configuration Debug -sdk watchsimulator \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)' \
  -derivedDataPath watch/build build
```

Set `WATCH_DEVICE_ID` to the watch UUID from the device list, then:

```sh
# Run boot only if the device is Shutdown.
xcrun simctl boot "$WATCH_DEVICE_ID"
xcrun simctl install "$WATCH_DEVICE_ID" watch/build/Build/Products/Debug-watchsimulator/SpotterWatch.app
xcrun simctl launch "$WATCH_DEVICE_ID" com.hacknc.spotter.watch
```

Open the project in Xcode to edit or run it. Xcode 27 displays the simulator in **Device Hub** (`Xcode.app/Contents/Applications/DeviceHub.app`); select the watch in its sidebar. Earlier Xcode versions use Simulator. The project targets watchOS 10+, with build/launch performed on watchOS 26.1. Simulator builds are signed so the app can use its default Keychain access group; physical devices need developer signing and separate verification.

## Join the phone session

1. Start a workout on the phone. Scroll down and tap **Pair watch controls**.
2. On the watch, leave Backend URL as `http://localhost:8000` for a backend on this Mac. For a remote backend use its HTTPS URL. Plain HTTP is permitted only for loopback simulator development.
3. Enter the phone's **Session ID** and **Session token**, then tap **Join session**. Simulator text input can use the Mac keyboard/paste; the token field is secure.
4. Confirm that both devices display the same exercise and set. The watch shows **Synced** after an authoritative response. Credentials are stored in the watch Keychain and restored on reopen. **Leave session** removes them without ending the phone workout.

Manual session-token exchange is the existing development pairing flow. No new pairing endpoint or production account system is implied. Never put tokens into URLs, command arguments, screenshots, or tracked files. The native phone currently holds its own credentials in memory; restarting the phone process can lose its session access. Save access through the existing pairing UI before a restart when doing manual recovery checks.

## Behavior

- Got it / Taken appear while awaiting equipment; Set done appears while exercising. Alternatives require acceptance. Blocked workouts offer Retry equipment; Skip and confirmed End remain available when applicable.
- Events carry `source: watch`, UUID, observed version, exercise instance and set index. End/Retry send null targets. Buttons disable while confirming; no optimistic advancement.
- A stale action is rejected and the current state is shown for review. A request with an uncertain outcome offers **Retry same request**, retaining the exact event ID and target so a successful original action cannot be counted twice.
- Foreground REST refresh runs approximately once per second, with reconnect backoff up to eight seconds. Backgrounding cancels polling, and returning fetches the latest snapshot. Only newer workout versions replace state. The rest clock uses backend time; it cannot expire rest itself.
- Completed/ended screens fetch the backend's actual summary. End on the watch updates the phone through its existing backend stream. Voice cleanup and spoken reactions still require a live walkthrough.
- No Talk control was added; the optional Stage 5 voice trigger remains deferred.

## Remaining acceptance walkthrough

Using real SwiftUI controls: pair both devices, Taken and spoken explanation, Got it, Set done, repeat/stale taps, watch reopen, backend reconnect, confirmed End and phone audio cleanup, then two full demo rehearsals. Build/launch success alone does not pass these checks. See `docs/VALIDATION.md`.
