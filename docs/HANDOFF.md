# Initial implementation handoff

## Google-first landing page — October 11

Web now opens a themed landing page with the official Google popup sign-in button. After backend verification, the trainer displays a first-name welcome and opens saved setup/plan or an existing session. Sign-out clears setup drafts and returns to the landing page. Changed client files: `mobile/src/screens/landing-screen.tsx`, `mobile/src/screens/trainer-screen.tsx`, `mobile/src/auth/google-sign-in.web.tsx`; existing profile/backend work preserved and no contract change. Native Google auth remains pending; native development setup and browser watch session pairing are retained.

Windows `npm run typecheck`, `npm run lint -- --no-cache`, and production web export PASS. Desktop and 390px browser layout/button rendering PASS with screenshots in `docs/evidence/google-landing-*.png`. Actual Google account sign-in/welcome transition NOT RUN. Preview currently serves `mobile/dist` on port 8081 with Python's local HTTP server because Expo dev mode hits the installed `expo-modules-core/src/ts-declarations/global` resolution error; see the validation entry for exact commands. Next: test Google sign-in live, then repair the local development install. No publication performed.

## Interactive 3D muscle model

The web muscle selector now loads the pinned `mobile/public/models/muscular.glb` anatomy asset through React Three Fiber and a locally bundled Draco decoder. The source annotation mesh is removed before body-only bounds are calculated, so the vertical rotation axis passes through the body. It rotates continuously on a fixed horizontal orbit around the chest, supports left/right drag, resolves clicks through unmapped superficial geometry to the first mapped workout muscle, and renders selected groups bright red against dimmed cool-gray anatomy. Pitch, pan, and zoom are disabled. The ten labeled buttons remain the accessible input path. Native resolution still uses the existing front/back SVG schematic; a web load/WebGL failure also falls back to that schematic.

The GLB is unchanged at 8,819,872 bytes with SHA-256 `5234472152a791baf002bed614707c33ba3ab2b278e41f41899a79a453d40785`. `mobile/public/models/ATTRIBUTION.md` and `UPSTREAM-LICENSE.txt` preserve BodyParts3D/Z-Anatomy attribution and share-alike terms. The pinned Three.js Draco files have their own notice under `mobile/public/draco/`.

Plan editing now totals sets against each exercise's primary and secondary muscle groups. Above six sets for a group, approval is disabled until the user acknowledges the non-diagnostic fatigue caution; every draft edit resets acknowledgment. Windows verification passed typecheck, lint, production export, all 35 backend tests, checksum validation, model load/continuous rotation, direct mesh selection, accessible-button selection, manual orbit with resumed rotation, the no-warning-at-six boundary, warning-at-seven behavior, secondary-group counting, and acknowledgment reset. Evidence: `docs/evidence/interactive-3d-centered-contrast.png`, `interactive-3d-highlight-fixed-orbit.png`, and `interactive-3d-volume-caution.png`. Native rendering was not run on Windows.

## Muscle-first builder scope change

The fixed three-machine setup has been expanded locally to a source-backed fictional catalog of 18 machines and ten muscle groups. The backend exposes deterministic plan previews and validates approved custom plans with sets, reps and optional pounds. The shared setup includes a front/back muscle map, editable plan and weight sliders. Existing fixed `full-body` requests remain compatible. Guidance is developer-paraphrased and explicitly pending professional review; there is no vector database. Contract schemas and browser evidence must accompany this change before handoff.

## Windows backend — Stage 3 transport complete

The backend-owned Stage 3 transport work is complete locally. WebSocket authorization, snapshot and pong frames now use exported Pydantic contracts. Tests cover initial state, watch-sourced acknowledgments, duplicate replay, external broadcasts, authoritative reconnects, ping/pong and rejected authorization. Contract export and the backend suite pass with 31 tests. A Windows two-tab live-agent walkthrough now passes state synchronization, external explanations, reconnect, duplicate-control protection, voice reconnect and one full six-set routine. Stage 3 remains partial pending audible-output confirmation, a spoken question, voice-vs-control concurrency and a second full spoken run; see `docs/VALIDATION.md`.

## Current handoff to Thanmay — Stage 2 testing

Google sign-in is now the web entry gate and uses the existing SQLite file. A themed landing page precedes setup; successful sign-in shows a first-name welcome and restores saved preferences/plan. Native Google sign-in is still pending and the watch route retains session-token pairing. Configure the same web client ID as `GOOGLE_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, then restart backend and Expo. Approving a plan while signed in saves name, muscle groups and plan for the next visit. Web setup requires sign-in; native development setup is retained.

Latest status supersedes the historical notes below: user published Mat with the project prompt, correct target-omission instruction, three attached client tools and authentication. Real API authorization passes with ElevenAgents Write. Credentials remain in ignored backend/.env and must be configured locally on Mac; they are not part of this commit.

Pull main while preserving local changes. Install the repaired lock with npm ci in mobile/, then run npm run typecheck and npm run lint. From repository root start backend with .venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --env-file backend/.env; run npm run web in mobile/. Test all seven Stage 2 web checks and the native audio spike, recording evidence in docs/VALIDATION.md. Pay particular attention to optional End/Retry targets and rejected missing/stale exercise targets.

Windows backend suite: 27 passed; backend health and published-agent checks PASS. Windows frontend install did not complete: first attempt had network resets; retry downloaded most remaining packages but was stopped at the user's request to hand off to Mac. Typecheck, lint, browser launch and live audio remain NOT RUN on Windows. No dependency manifest or Expo/React Native version was changed by the lock repair. The stash was not applied.

## Windows launch repair

User assigned local app launch/install repair. mobile/package-lock.json repaired with npm install --package-lock-only --ignore-scripts --no-audit --no-fund; no package.json or Expo/React Native dependency version changes. Fix supplies missing nested @emnapi core/runtime/wasi-threads entries and satisfies the top-level wasi-threads dependency. Initial npm ci accepted the repaired lock but downloads ended in ECONNRESET; cached retry was stopped for the Mac handoff before completion. Update validation with final install/typecheck/lint results before claiming readiness.

Backend was started by the user after two automatic approval-review timeouts and a stalled sandbox attempt. Read-only health check outside sandbox: HTTP 200, voice_configured true. Published ElevenLabs agent check: HTTP 200, Mat prompt and target-omission instruction active, three tool IDs attached, authentication true. No secret or conversation token logged; no conversation started. Browser automation opening localhost also hit an automatic review timeout, not a finding that the service was unsafe. Live browser/audio verification remains pending.

## ElevenLabs dashboard configuration follow-up

User authorized browser configuration. Three existing client tools were attached to My Agent's draft; all Wait for response settings verified enabled, guidance exercise_id required and LLM-supplied, state tool has no arguments. Action tool saved with eight enum values and optional exercise_instance_id/set_index; both remain LLM-supplied. Agent project prompt/greeting and three preview variables configured; authentication enabled in draft. Publishing and actual audio were not performed. Browser access ended during final return-to-tools check; the saved tool form and draft attachment list were verified earlier, but publication remains a user action.

Minimal coordinated client fix in mobile/src/voice/voice-panel.web.tsx normalizes omitted session-action arguments to null; every exercise action must match both current instance and set. Backend tool contract, agent prompt/specification and generated tool JSON updated together. This one client edit is necessary for the user's dashboard configuration request; no mobile manifests/lockfile or native modules changed. Local backend suite: 27 passed, one upstream deprecation warning. Frontend typecheck/lint could not run: npm ci rejects checked-in lockfile @emnapi/core/runtime/wasi-threads entries; no-lock fallback install stalled and was stopped. Thanmay should repair/regenerate the lockfile in his area, run typecheck/lint, and verify live End/Retry and rejected incomplete exercise tool calls. No commit/push of this follow-up.

## Stage 2 Windows-owner update — October 10, 2026

Local, uncommitted update: backend/voice.py isolates typed private-agent authorization; backend/app.py uses it without changing conversation_token response shape. Invalid/cross-session access is checked before provider contact; finished sessions cannot request new tokens. Provider errors/malformed responses are sanitized; token responses are not cached. Ten-second provider timeout fits the client's twelve-second deadline. backend/tests/test_voice.py covers these behaviors and generated tool parity.

backend/tool_contract.py is now canonical for three tool argument schemas. scripts/export_contracts.py exports agent/tools.json and contracts/client-tools.json plus VoiceRequest/VoiceAuthorization HTTP schemas. Action names, argument names, session schema and frontend interface are preserved. Generated tool JSON is a dashboard specification, not an API provisioning payload. No mobile/watch files or dependency manifests were edited.

agent/prompt.md clarifies current.instance_id mapping, phase-aware introductions, read-only Repeat/questions, action acknowledgments, uncertain intent, data boundaries and curated-content limits. agent/README.md contains private-agent dashboard setup and Mac/Windows launch steps; agent/GUIDANCE.md defines the catalog review boundary. Professional content review is still pending.

User confirmed no agent exists yet and requested setup instructions. Next user action: create/configure Mat using agent/README.md and put credentials in ignored backend/.env locally. Next Thanmay action: verify the same client tools in the browser, record all seven live web checks, and perform the iPhone simulator native spike. In particular, test an initial introduction after the state tool returns, Repeat/no mutations, successful/rejected Set done, mic denial/disconnect, end cleanup and idle/noise. Phase-specific prompt rules do not replace UI/action validation. Existing native adapter and voice lifecycle gaps remain Thanmay's work.

Stage 2 remains open until live web evidence and a native PASS/concrete blocker are recorded. Automated provider responses are simulated and do not establish a real conversation, prompt performance or audio routing. No provider agent, public deployment, commit or push was created by this work.

Local changes are not pushed. Both developers should inspect git status and existing edits before starting.

## Backend/agent owner

The initial backend is implemented in `backend/` with SQLite persistence, serialized event transitions and schema export. Main files: models.py, engine.py, store.py, app.py. Tests cover strict reorder, approved alternatives, exclusions, blocked flow, duplicate/stale/concurrent commands, rest restart and ended sessions.

Take ownership of backend/catalog/contracts/agent. Coordinate any event or response shape changes with the frontend owner. `scripts/export_contracts.py` exports Pydantic models and OpenAPI. Web schemas in mobile/src/api/schema.ts are manually aligned for the initial version; automation should verify parity before future changes.

Configure the external ElevenLabs agent using agent/prompt.md and agent/tools.json. Tool file is a human setup specification, not a blindly importable provider request body. Required tools block on response. Agent must support app-provided dynamic variables.

Catalog is developer-authored, professional review pending. Refine with verified guidance before real use.

## Frontend owner

Shared app lives under mobile/src. Web and native ElevenLabs provider adapters use the shared workout voice panel and client-tool handlers. The native adapter and LiveKit development-build configuration are implemented; the first iOS build attempt failed before launch (missing WebRTC header/ExpoModulesJSI failure with Xcode 26.1.1). See docs/DEVICE_CHECKS.md and docs/VALIDATION.md. `api/session-storage.web.ts` keeps local session access per tab; native storage is memory-only until a later stage adds SecureStore. Windows/native verification remains separate.

## Coordination

Browser watch uses direct session ID/token entry as a local development pairing method. Short-lived pairing code, native WatchConnectivity, SwiftUI app, physical mic routing and Photon are not implemented. Finish live web checks before moving the full flow to native.

Never mark a stage passed based solely on tests or exported bundle. Record browser interaction and audio evidence in docs/VALIDATION.md.

## Verified on October 10

Backend: 14 pytest checks pass. Frontend: typecheck, lint and static web export pass. Browser: full strict routine completes six sets; separate watch tab synchronizes Taken and summary; refresh retains a running rest; alternatives require acceptance; early end retains a partial substituted set. See docs/VALIDATION.md for exact limits. npm dependency audit remains open.

Next backend-owner action: configure the ElevenLabs agent/client tools, then put credentials in ignored backend/.env and launch using README's --env-file command. Next frontend-owner action: validate live web audio/tools after the team creates and configures the ElevenLabs agent, then retry the native voice spike after resolving the Xcode and LiveKit build blockers. Current local services are available at localhost:8000 and localhost:8081; restart them through README commands if unavailable.
