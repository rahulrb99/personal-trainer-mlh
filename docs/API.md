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

Unavailable equipment is session-local. Strict mode defers it. When remaining work is deferred, enter blocked and explicitly retry it. There is no global occupancy feed. Alternative acceptance creates a new exercise instance and still requires equipment confirmation.

## Joining browser watch controls

Stage 1 uses a development-only manual exchange of session ID/token from the trainer to `/watch`. They never appear in URLs. Each tab stores its own credential in sessionStorage so refresh works. Production login/short-lived pairing code is not implemented; do not expose this local prototype publicly.

## Known stage boundaries

SQLite backend uses one uvicorn process. WebSocket transport publishes committed snapshots by reading authoritative state, every 0.5 seconds. No native WatchConnectivity or watch mic streaming. Catalog text is developer-authored, professional review pending. Agent provisioning and live voice testing require provider configuration.
