# Initial implementation handoff

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
