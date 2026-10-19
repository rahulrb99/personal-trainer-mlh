# Vercel web deployment

Deploy the Expo static website to Vercel and run FastAPI on a Python host with
HTTPS and WebSocket forwarding. Neon PostgreSQL supplies durable storage when
`DATABASE_URL` is configured. The SQLite local fallback still needs a persistent
volume if hosted. Never put SQLite data in ephemeral `/tmp` storage.
The checked-in Vercel configuration deploys only the website; moving the API to
Vercel requires separate transport/runtime validation.

## 1. Host the backend

Use a Python host with HTTPS and WebSocket forwarding. From
the repository root, install with `python -m pip install -r backend/requirements.txt`.
Start with `python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --workers 1`.
Set the port to the host's assigned port if different. Do not use `--reload`.

Set these environment variables in the host's settings:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL with its generated SSL parameters |
| `SPOTTER_DATABASE` | SQLite fallback when DATABASE_URL is empty; requires a persistent volume |
| `SPOTTER_CORS_ORIGINS` | Exact frontend origins, comma-separated, e.g. `https://your-project.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `ELEVENLABS_API_KEY` | Private provider key |
| `ELEVENLABS_AGENT_ID` | Published agent ID |

Keep one service instance and one worker. Verify `/health` and `/catalog` over
HTTPS. Restart the service and verify that a saved profile/session persists.
Keep database backups. Provider settings and matching client tools still need
the checks in `agent/README.md`.

### Neon and existing records

The backend loads ignored `backend/.env`, preserving hosting environment values.
Selection priority is an explicit `create_app(database=...)` argument, nonempty
`DATABASE_URL`, `SPOTTER_DATABASE`, then the default SQLite file. A bad PostgreSQL
connection fails startup instead of silently falling back. Install the pinned
backend requirements first. Store initialization applies versioned SQL from
`backend/migrations/` and records it in `schema_migrations`.

To transfer existing records, stop Spotter processes writing to SQLite and back up
the file. From repository root:

```sh
.venv/bin/python -m backend.migrate_sqlite
.venv/bin/python -m backend.migrate_sqlite --apply
```

On Windows replace `.venv/bin/python` with `.\.venv\Scripts\python.exe`.
The default command reports only source counts. `--apply` creates the schema and
copies all four tables in one transaction, retaining IDs, token hashes, saved
state, event deduplication records and schedules. It refuses a nonempty target;
it never merges, overwrites or deletes source data. Transfer existing personal
records only with the owner's approval. To start fresh, launch against Neon
without importing; local records stay in SQLite. To return to SQLite, clear
`DATABASE_URL` and restart. Later Neon changes do not sync back automatically.

PostgreSQL transactions use one transaction-scoped advisory lock, preserving
SQLite's serialized store behavior across connections and working with Neon's
transaction pooler. This intentionally targets the current small app rather than
high-throughput scaling. Connections close after each transaction with bounded
connection, lock and statement waits.

There is no background PostgreSQL rest scan: server snapshot/action requests
reconcile persisted deadlines, including the snapshots fetched by active streams.
When everyone disconnects, reconciliation waits for the next request. Active
streams still query about twice per second; close workout tabs to allow Neon to
become idle. SQLite retains its local worker. No client can skip a deadline.

The optional Snowflake exporter still reads SQLite only. It will not export new
PostgreSQL events after switching to Neon; a PostgreSQL analytics adapter remains
a separate handoff.

Routine tests ignore developer database credentials:

```sh
.venv/bin/python -m pytest backend/tests -q
```

For PostgreSQL checks, set `SPOTTER_TEST_DATABASE_URL` to a disposable localhost
database named `spotter_test*`; these tests erase its application tables between
cases and reject cloud URLs. macOS example:

```sh
SPOTTER_TEST_DATABASE_URL=postgresql://USER@localhost:5432/spotter_test .venv/bin/python -m pytest backend/tests -q
```

PowerShell:

```powershell
$env:SPOTTER_TEST_DATABASE_URL='postgresql://USER@localhost:5432/spotter_test'
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

## 2. Configure the Vercel project

Connect this repository and deploy the branch containing `vercel.json`:

- **Root Directory:** repository root (`.`), not `backend/` or `mobile/`.
- **Framework Preset:** Other. The checked-in `framework: null` overrides FastAPI detection.
- **Node.js:** 24.x.
- Install command, build command and output directory are supplied by `vercel.json`.

Add both variables to the intended Vercel environments (Production and Preview
if used) before rebuilding:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Public HTTPS backend base URL, without `/docs` or `/health` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Same OAuth web client ID as backend |

These values are public and baked into the JavaScript export. Changing them
requires a new build. Never add provider API keys to frontend variables.
The build checks these variables before exporting and fails with an actionable
message if either is missing or the API URL is insecure/local.

In Google Cloud, add the exact Vercel production origin (and custom domain if
used) to the OAuth client's authorized JavaScript origins. Add the same origins
to backend CORS. Preview domains need explicit Google/CORS configuration too;
do not assume arbitrary preview URLs can sign in.

`cleanUrls` serves Expo's generated `/watch.html` at `/watch`. The export also
contains its own 404 page; no catch-all rewrite is required.

## 3. Validate the hosted deployment

1. Open `/` and reload `/watch` directly; both load without a Vercel routing error.
2. Sign in with Google; verify profile load/save against the hosted backend.
3. Start a workout, confirm equipment, complete a set, and wait for rest expiry.
4. Join from the web watch panel; confirm WebSocket updates and authoritative versions.
5. Refresh during rest and restart the backend; confirm state and deadlines persist.
6. Connect voice, ask a question, complete a set and disconnect; verify actual audio
   and resource cleanup. HTTPS alone does not prove provider integration.

Record actual results in `docs/VALIDATION.md`. A local export is build evidence,
not a hosted full-workout or live-voice pass.

Configuration reference: [Vercel build configuration](https://vercel.com/docs/project-configuration/vercel-json).
