# Spotter — meet Mat

A voice-guided gym companion that follows your plan and adapts when equipment is reported taken. Web first, then iPhone and Apple Watch simulators.

Current implementation: shared Expo/React Native Web screens, FastAPI/SQLite workout engine, a source-backed fictional catalog of 18 machines, a muscle-first editable workout builder with a rotating web anatomy model, browser watch panel, and web/native ElevenLabs voice adapters. Machine guidance is developer-paraphrased with professional review pending. The native simulator build is currently blocked, and the SwiftUI watch app remains a later stage. See `docs/VALIDATION.md` for actual check results.

## Requirements

- Node 22.13+ (local checks use Node 24); npm.
- Python 3.12+ recommended. Local tests run on Python 3.14.2.
- Xcode only for later iOS/watchOS stages; not required for the Windows web/backend workflow.

## Backend

From the repository root on macOS:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python scripts/run_backend.py
```

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe scripts/run_backend.py
```

Backend listens on http://127.0.0.1:8000. Interactive API at `/docs`. No Docker/database account required. Data persists under `backend/data/` and is ignored by Git. Run one process; do not pass multiple uvicorn workers.

## Web app

In another terminal:

```sh
cd mobile
npm ci
npm run web
```

Open http://localhost:8081. Default API is http://localhost:8000. Copy `mobile/.env.example` to `mobile/.env` to change it; restart Expo when changing public environment configuration.

On web, click the rotating anatomical model or its labeled accessible buttons to select muscle groups; selected mapped muscles turn red. Drag rotates and the automatic rotation resumes afterward. Native and failed-WebGL paths retain the front/back schematic and labeled buttons. Model attribution and license notices are under `mobile/public/models/`.

Plans above six sets for any primary or secondary muscle display a non-diagnostic fatigue caution. The user may continue only after acknowledging it, and any subsequent plan edit resets that acknowledgment.

Start a session. Got it confirms equipment, Taken defers or offers an approved alternative, Set done saves a set. Rest ends automatically. Demo mode is visibly labeled and shortens rests to five seconds.

The inline watch panel uses the same backend events. For a separate tab, open `/watch`, then copy session access from “Pair browser watch panel.” Never share session access publicly. Tokens are kept out of URLs. This panel is a browser simulation, not a running Apple Watch app.

## Voice

Configure an ElevenLabs Agent using `agent/README.md`. The web app has a Connect Mat's voice button. Without credentials the button reports that voice is not configured; button-driven workouts remain usable. No prerecorded speech is presented as live AI.

Stage 2 backend tool schemas and private authorization are implemented and tested; live voice remains pending agent creation. Follow the detailed agent setup/runbook before validating speech. Thanmay retains ownership of browser handlers and the native spike.

Set provider credentials only on backend, never under EXPO_PUBLIC variables:

```sh
# Example launch after creating backend/.env; install uvicorn[standard] for dotenv support
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --env-file backend/.env
```

Windows uses the same `-m uvicorn` command through `.venv\Scripts\python.exe`. Secrets must remain untracked. Creating or modifying the external agent is a user/team action; this repo does not provision it automatically.

## Checks

```sh
python3 -m pytest backend/tests -q
python3 scripts/export_contracts.py
cd mobile
npm run typecheck
npm run lint
npm run export:web
```

Use the virtualenv Python equivalents on each OS. `contracts/` contains exported models/OpenAPI; `docs/API.md` explains events and errors. Checks on Mac do not prove Windows/native behavior. Follow `MASTER_PLAN.md` stage gates and record results.

## Ownership

Thanmay: `mobile/`, `watch/`, native builds and demos. Teammate: `backend/`, `catalog/`, `agent/`, `contracts/`. Initial backend foundation is isolated for teammate takeover. Read `AGENTS.md` before edits.

Scope excludes music, sensors, dashboard, automatic form/rep detection and physical locked-phone guarantees. Gym and coaching catalog are demo content with professional review pending.

## Native Apple Watch simulator (Stage 5)

The standalone SwiftUI app is in [`watch/`](watch/README.md). Build/run instructions and the existing manual session-ID/token pairing flow are documented there. On the phone use **Pair watch controls**; enter those credentials in the watch's **Join your workout** form. Watch build and join-screen launch are verified; paired workout actions, phone speech and recovery acceptance are still pending in [`docs/VALIDATION.md`](docs/VALIDATION.md).
