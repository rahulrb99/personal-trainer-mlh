# API contract, schema version 1

Pydantic models in `backend/models.py` define input/response shapes. Regenerate `contracts/*.schema.json` and `contracts/openapi.json` with `python scripts/export_contracts.py`. The web runtime schemas in `mobile/src/api/schema.ts` validate every consumed snapshot; update them when the producer changes. Set indexes start at 1; times are UTC ISO 8601.

## Routes

| Route | Authorization | Result |
|---|---|---|
| GET /health | None | API status, voice configuration, and Google sign-in configuration |
| GET /catalog | None | Fictional gym, 18 source-backed machines, muscle groups and review status |
| POST /auth/google | None | Verify a Google ID token and return a user profile plus profile access token |
| GET /profile | Bearer profile token | Saved name, preferences, last muscle groups and plan |
| PUT /profile | Bearer profile token | Replace saved name, preferences, last muscle groups and plan |
| POST /plans/preview | None, local prototype | Deterministic PlanPreview for selected muscle groups |
| POST /sessions | None, local prototype | CreateResult: snapshot + session access token |
| GET /sessions/{id} | Bearer session token | Snapshot |
| POST /sessions/{id}/events | Bearer session token | EventResult: snapshot + replayed flag |
| GET /sessions/{id}/summary | Bearer session token | Actual completed/partial/skipped/substituted work |
| POST /voice/token | Bearer session token | Short-lived ElevenLabs WebRTC token; session_id in body |
| WS /sessions/{id}/stream | First JSON frame carries access_token | Versioned snapshot frames, optional ping/pong |

Google sign-in body: `{"id_token":"..."}`. The backend verifies the token against `GOOGLE_CLIENT_ID` with Google tokeninfo, upserts a SQLite user keyed by Google `sub`, and returns `{profile, access_token}`. The profile token is separate from the workout session token. `PUT /profile` stores the approved name, preferences, selected muscle groups and plan for the next visit. Guest workouts still work without sign-in. `/health.google_auth_configured` reports a nonblank `GOOGLE_CLIENT_ID` only.

Plan preview body: `{"muscle_group_ids":["chest","back"]}`. The backend selects up to two configured machines per group in round-robin order, removes duplicates and caps the result at eight.

Customized create body: `{"routine_id":"full-body","selected_muscle_group_ids":["chest"],"plan":[{"exercise_id":"chest-press","sets":3,"reps":12,"weight_lb":25}],"preferences":{"name":"Rahul","mode":"strict","coaching":"standard","excluded_exercise_ids":[]},"demo_mode":true}`. Plans contain 1–8 unique machines. Sets are 1–5, reps 1–30 and optional pound values must match that machine's configured range and increment. A plan exercise must train at least one selected group. Omitting both selected groups and plan retains the original `full-body` compatibility routine. Demo rests are 5 seconds; normal rests are 60.

WebSocket clients first send `StreamAuthorization` and receive a current `SnapshotFrame` after authorization. Each later committed version is sent once per connection. Reconnecting starts with the authoritative current snapshot; the server does not replay command frames. A text `ping` receives `PongFrame`. Invalid, missing or empty authorization closes with code 1008. These frame schemas are exported in `contracts/`.

Session state is persisted in SQLite. Rest expiry is backend-owned, checked periodically and on read/action. Events serialize inside BEGIN IMMEDIATE transactions; deduplication precedes version validation. Reused IDs with different content are rejected. Separate stale actions return 409 with fresh snapshot. Do not auto-retarget stale commands to a new set. Replayed old snapshots must not regress a newer client state.

Errors: 401 invalid/missing session access; 409 stale/version conflict; 422 invalid target/phase/schema/preferences; 503 voice not configured; 502 voice provider authorization failed. Domain errors return message and optional snapshot; FastAPI schema validation errors use detail. Clients handle both.

### Stage 2 voice authorization and tools

Dashboard compatibility update: submit_workout_action requires action; exercise_instance_id and set_index may be omitted for end_session/retry_deferred. Frontend normalizes omitted fields to null and rejects missing/stale instance or set for every exercise action. Event HTTP contract is unchanged. Dashboard parameter JSON uses an array of form descriptors, unlike the JSON Schema object in canonical specifications; do not paste those schemas directly into its form-JSON editor.

`POST /voice/token` accepts only `{"session_id":"..."}` and a Bearer token for that session. Invalid/cross-session tokens are rejected before provider contact. Completed/ended sessions return 409. Response remains `{"conversation_token":"..."}` for existing client compatibility, typed in VoiceAuthorization.schema.json. Successful responses use Cache-Control: no-store. Backend key and agent ID never enter this response. Provider auth has a 10-second timeout, does not follow redirects or cache tokens, and suppresses upstream bodies/errors. `/health.voice_configured` reports nonblank environment presence only.

The provider token authorizes the configured agent, not arbitrary workout actions; the separate session token still protects events. An already-connected conversation must be stopped by the frontend when the workout ends. Tokens are provider-issued short-lived credentials; this backend does not invent an expiry or claim provider-side revocation.

`backend/tool_contract.py` produces `contracts/client-tools.json` and `agent/tools.json`. The three names remain get_session_state, get_exercise_guidance(exercise_id), submit_workout_action(action, exercise_instance_id, set_index). All await responses. Guidance and state are read-only; action enum matches backend Event types and excludes rest_elapsed. Target `current.instance_id`, not `current.id`; current 1-based set_index is used for exercise actions, null targets for retry/end. Models define tool argument shapes; app handlers remain responsible for runtime validation and event submission. Agent setup: agent/README.md. No second conversation engine or backend tool executor is introduced.

Unavailable equipment is session-local. Strict mode defers it. When remaining work is deferred, enter blocked and explicitly retry it. There is no global occupancy feed. Alternative acceptance creates a new exercise instance with its own catalog defaults, resets weight to null and still requires equipment confirmation.

### Machine guidance

Each catalog machine has an exact ID, fictional location, primary/secondary muscle groups, setup, cue, common mistake, troubleshooting, stop conditions, weight-slider bounds, approved alternatives, public source URLs and `professional_review_pending` status. Guidance is developer-paraphrased and source-backed, not professionally certified. Clients and Mat retrieve exact records; there is no vector search or approximate machine matching.

## Joining browser watch controls

Stage 1 uses a development-only manual exchange of session ID/token from the trainer to `/watch`. They never appear in URLs. Each tab stores its own credential in sessionStorage so refresh works. Production login/short-lived pairing code is not implemented; do not expose this local prototype publicly.

## Known stage boundaries

SQLite backend uses one uvicorn process. WebSocket transport publishes committed snapshots by reading authoritative state, every 0.5 seconds. No native WatchConnectivity or watch mic streaming. Catalog text is developer-authored, professional review pending. Agent provisioning and live voice testing require provider configuration.


## Trainer persona (October 11, additive schema version 1)

`preferences.trainer` is accepted by profile updates and session creation and returned in profiles/snapshots. Omitted values default to `{ "name": "Mat", "color": "blue", "expression": "happy", "accessory": "headband", "motivation": "", "remind": true }`. Name is 1–30 characters; motivation is 0–240. Color: blue/mint/peach; expression: happy/calm/bold; accessory: headband/headphones/none. Existing JSON profile/session storage needs no SQL migration. The client trims name/motivation; blank names cannot be saved in the editor. Older clients may omit the field. Swift watch does not decode preferences and tolerates the additive field.

The profile stores preferences for future workouts. A running session retains its creation-time persona. Reminders are presentation/voice cues, never workout events. Web stores up to 50 handled session IDs locally (no motivation text); native uses process memory consistent with its current session restoration. Cross-device exactly-once delivery is not promised.
