# API contract, schema version 1

Pydantic models in `backend/models.py` define input/response shapes. Regenerate `contracts/*.schema.json` and `contracts/openapi.json` with `python scripts/export_contracts.py`. The web runtime schemas in `mobile/src/api/schema.ts` validate every consumed snapshot; update them when the producer changes. Set indexes start at 1; times are UTC ISO 8601.

## Routes

| Route | Authorization | Result |
|---|---|---|
| GET /health | None | API status and voice configuration presence |
| GET /catalog | None | Fictional gym, exercises, routine, content review status |
| POST /sessions | None, local prototype | CreateResult: snapshot + session access token |
| GET /sessions/{id} | Bearer session token | Snapshot |
| POST /sessions/{id}/events | Bearer session token | EventResult: snapshot + replayed flag |
| GET /sessions/{id}/summary | Bearer session token | Actual completed/partial/skipped/substituted work |
| POST /voice/token | Bearer session token | Short-lived ElevenLabs WebRTC token; session_id in body |
| WS /sessions/{id}/stream | First JSON frame carries access_token | Versioned snapshot frames, optional ping/pong |

Create body: `{"routine_id":"full-body","preferences":{"name":"Thanmay","mode":"strict","coaching":"standard","excluded_exercise_ids":[]},"demo_mode":true}`. Demo rests are 5 seconds; normal rests are 60. Normal mode is the API default.

Session state is persisted in SQLite. Rest expiry is backend-owned, checked periodically and on read/action. Events serialize inside BEGIN IMMEDIATE transactions; deduplication precedes version validation. Reused IDs with different content are rejected. Separate stale actions return 409 with fresh snapshot. Do not auto-retarget stale commands to a new set. Replayed old snapshots must not regress a newer client state.

Errors: 401 invalid/missing session access; 409 stale/version conflict; 422 invalid target/phase/schema/preferences; 503 voice not configured; 502 voice provider authorization failed. Domain errors return message and optional snapshot; FastAPI schema validation errors use detail. Clients handle both.

### Stage 2 voice authorization and tools

Dashboard compatibility update: submit_workout_action requires action; exercise_instance_id and set_index may be omitted for end_session/retry_deferred. Frontend normalizes omitted fields to null and rejects missing/stale instance or set for every exercise action. Event HTTP contract is unchanged. Dashboard parameter JSON uses an array of form descriptors, unlike the JSON Schema object in canonical specifications; do not paste those schemas directly into its form-JSON editor.

`POST /voice/token` accepts only `{"session_id":"..."}` and a Bearer token for that session. Invalid/cross-session tokens are rejected before provider contact. Completed/ended sessions return 409. Response remains `{"conversation_token":"..."}` for existing client compatibility, typed in VoiceAuthorization.schema.json. Successful responses use Cache-Control: no-store. Backend key and agent ID never enter this response. Provider auth has a 10-second timeout, does not follow redirects or cache tokens, and suppresses upstream bodies/errors. `/health.voice_configured` reports nonblank environment presence only.

The provider token authorizes the configured agent, not arbitrary workout actions; the separate session token still protects events. An already-connected conversation must be stopped by the frontend when the workout ends. Tokens are provider-issued short-lived credentials; this backend does not invent an expiry or claim provider-side revocation.

`backend/tool_contract.py` produces `contracts/client-tools.json` and `agent/tools.json`. The three names remain get_session_state, get_exercise_guidance(exercise_id), submit_workout_action(action, exercise_instance_id, set_index). All await responses. Guidance and state are read-only; action enum matches backend Event types and excludes rest_elapsed. Target `current.instance_id`, not `current.id`; current 1-based set_index is used for exercise actions, null targets for retry/end. Models define tool argument shapes; app handlers remain responsible for runtime validation and event submission. Agent setup: agent/README.md. No second conversation engine or backend tool executor is introduced.

Unavailable equipment is session-local. Strict mode defers it. When remaining work is deferred, enter blocked and explicitly retry it. There is no global occupancy feed. Alternative acceptance creates a new exercise instance and still requires equipment confirmation.

## Joining browser watch controls

Stage 1 uses a development-only manual exchange of session ID/token from the trainer to `/watch`. They never appear in URLs. Each tab stores its own credential in sessionStorage so refresh works. Production login/short-lived pairing code is not implemented; do not expose this local prototype publicly.

## Known stage boundaries

SQLite backend uses one uvicorn process. WebSocket transport publishes committed snapshots by reading authoritative state, every 0.5 seconds. No native WatchConnectivity or watch mic streaming. Catalog text is developer-authored, professional review pending. Agent provisioning and live voice testing require provider configuration.
