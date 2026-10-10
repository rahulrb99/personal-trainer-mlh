# Initial implementation handoff

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

Shared app lives under mobile/src. Native-only voice is not implemented yet; `.web.tsx` contains the browser integration. api/session-storage.web.ts keeps local session access per tab; native storage is memory-only until the native stage adds SecureStore. Windows/native verification remains separate.

## Coordination

Browser watch uses direct session ID/token entry as a local development pairing method. Short-lived pairing code, native WatchConnectivity, SwiftUI app, physical mic routing and Photon are not implemented. Finish live web checks before moving the full flow to native.

Never mark a stage passed based solely on tests or exported bundle. Record browser interaction and audio evidence in docs/VALIDATION.md.

## Verified on October 10

Backend: 14 pytest checks pass. Frontend: typecheck, lint and static web export pass. Browser: full strict routine completes six sets; separate watch tab synchronizes Taken and summary; refresh retains a running rest; alternatives require acceptance; early end retains a partial substituted set. See docs/VALIDATION.md for exact limits. npm dependency audit remains open.

Next backend-owner action: configure the ElevenLabs agent/client tools, then put credentials in ignored backend/.env and launch using README's --env-file command. Next frontend-owner action: validate Stage 2 live audio/tools, then run the native voice spike. Current local services are available at localhost:8000 and localhost:8081; restart them through README commands if unavailable.
