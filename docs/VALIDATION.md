# Validation record

Run: October 10, 2026 on macOS. Node 24.13.x, npm 11.x, Python 3.14.2, Expo 57.0.27, React Native 0.86.3, ElevenLabs React 1.17.0. Codex in-app browser (WebKit; browser version not exposed). API http://localhost:8000; app http://localhost:8081; demo mode uses 5-second rests. Xcode 26.1.1 and iOS/watchOS 26.1 runtimes are available; no native app was built.

Stage numbers below match MASTER_PLAN.md. PASS applies to the stated environment and evidence, not the entire stage. Windows checks and joint contract approval remain pending.

| Check | Environment | Actual result | Status | Evidence / remaining work |
|---|---|---|---|---|
| 0.1–0.2 | Mac | Backend and browser launched; three-exercise routine loaded | PASS (Mac) | README commands; clean install/Windows launch NOT RUN |
| 0.3 | Mac | CORS requests accepted; authenticated WebSocket connects | PASS | Browser Live indicator; backend CORS test |
| 0.4 | Local source/config | Provider key is backend-only; frontend env contains API URL only | PASS | Backend token endpoint; frontend config |
| 0.5 | Shared contract | Schema version 1 exported; developer approval pending | NOT RUN | contracts/ and docs/API.md ready for review |
| 1.1 | Browser + real API | Strict session starts awaiting chest press confirmation | PASS | Manual walkthrough |
| 1.2 | Browser + real API | Taken defers chest press and selects seated row | PASS | Manual walkthrough; strict-mode test |
| 1.3 | Browser + real API | Claim starts exercise; completion saves one set and starts 5s rest | PASS | Manual walkthrough; initialized countdown fixed |
| 1.4 | Browser + real API | Deferred exercise retried; full routine finishes with six sets | PASS | Trainer and separate watch tab both show six sets/three exercises |
| 1.5 | Browser + automated backend | Refresh during rest retains deadline; restart persistence tested | PASS | Browser reload; test_rest_survives_restart. Full process restart during browser rest NOT RUN |
| 1.6–1.7 | Automated backend | Duplicate, concurrent, stale, wrong-target actions rejected/deduplicated | PASS | pytest suite; no double advancement |
| 1.8 | Browser + automated backend | All remaining equipment taken enters blocked; explicit retry works | PASS | Browser watch Taken flow; all-taken test |
| 1.9 | Browser + automated backend | Substitute requires acceptance and new claim; exclusions respected | PASS | Dumbbell press accepted manually; exclusion tests |
| 1.10 | Browser + automated backend | Normal completion: six sets/three exercises. Early end: one substituted set/zero completed exercises; reload retains result | PASS | docs/evidence/web-ended-summary.jpg; ended timer test |
| 2 web.1–2 web.7 | Browser + ElevenLabs | Integration compiles; real audio/tool conversation not tested | NOT RUN | Agent and backend credentials needed; no sponsor integration claim yet |
| Voice configuration error | Browser | Unconfigured voice reports failure; workout controls still work | PASS | POST /voice/token returns 503 without provider request |
| 2 native.1–2 native.4 | iPhone simulator | Tooling available; voice spike not implemented/run | NOT RUN | Development build and native adapter remain |
| 3.1–3.3 | Two browser tabs | Manual local pairing and Taken state synchronization work | PARTIAL | Spoken explanations not tested |
| 3.4–3.8 | Browser + live voice | Voice concurrency, reconnection audio and two full spoken runs pending | NOT RUN | Stage 2 provider configuration first |
| 4, 5 | Native simulators | Full iPhone app and actual SwiftUI watch app not tested | NOT RUN | Browser watch panel is explicitly labeled simulation |
| 6 | Submission | Code local; no submission/publishing performed | NOT RUN | Human publication authorization and final demo required |

## Automated checks

- `python3 -m pytest backend/tests -q`: **14 passed** (0.66 seconds).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run export:web`: PASS; static routes `/` and `/watch` exported.
- Contracts generated using `python3 scripts/export_contracts.py`.

Dependency audit: npm reports 29 findings (18 high, 11 moderate) in Expo/toolchain transitive packages. Inspected advisories include braces, node-forge, decode-uri-component and uuid. Suggested automatic fixes change Expo/React Native major versions; no forced downgrade/upgrade applied. Resolve with compatible upstream versions before a public release. This is an open dependency check, not a clean security certification.

Physical iPhone/headphone routing, locked-phone audio, real Apple Watch pairing, native WatchConnectivity, haptics and battery: NOT RUN and outside initial acceptance scope.

## Stage 2 Windows backend — October 10, 2026

Environment: Windows, Python 3.13.3, isolated .venv installed from unchanged backend/requirements.txt: FastAPI 0.129.0, Pydantic 2.12.5, Uvicorn 0.40.0, HTTPX 0.28.1, pytest 9.0.3. No browser or native simulator run. Base URL remains http://127.0.0.1:8000. Tests use temporary SQLite and HTTPX MockTransport, with no real provider request or credentials. Mock tokens/keys are synthetic.

Commands: `.venv/Scripts/python.exe scripts/export_contracts.py` PASS; `.venv/Scripts/python.exe -m pytest backend/tests -q --basetemp=.test-runs/stage2-pinned --tb=short`: **26 passed, 1 warning in 2.24s**. Warning is the installed Starlette TestClient's deprecated AnyIO BlockingPortal alias. Earlier available-system-dependency run: 26 passed in 2.48s. Approved unsandboxed execution was used because the Windows sandbox previously stalled asyncio socketpair initialization. No frontend checks were rerun or claimed.

| Stage / check | Owner | Environment | Expected | Actual | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| 2 backend authorization | Windows | API + simulated provider | Session-scoped authorization before provider request | Missing, invalid and cross-session tokens rejected; finished workout rejected | PASS | test_private_authorization_scoped_and_no_cache |
| 2 backend authorization | Windows | API + simulated provider | Typed token; no caching; key stays server-side | Configured agent called with backend header; fresh response each call; no-store | PASS | test_private_authorization_scoped_and_no_cache |
| 2 backend failure handling | Windows | API + simulated provider | Provider failures preserve workout and suppress secrets | 401/429/500/redirect/timeout/missing/empty/wrong-type/invalid-JSON map to 502; progress unchanged | PASS | test_provider_errors_are_sanitized |
| 2 backend setup | Windows | API + simulated provider | Missing configuration actionable; invalid input rejected | 503 with no provider call, 422 extra/empty input | PASS | test_missing_configuration_and_schema |
| 2 tool definitions | Windows | Local canonical schemas | Names/action enums match client/backend | Generated artifacts match and client names exist; no rest_elapsed tool action | PASS | test_exported_tools_match_backend_and_client; runtime speech still NOT RUN |
| 2 web.1 | Thanmay + Windows | Browser + live ElevenLabs | Exercise introduction and spoken reply | No agent created yet | NOT RUN | User requested setup instructions |
| 2 web.2 | Thanmay | Browser + live ElevenLabs | Repeat leaves progress unchanged | Prompt rule prepared only | NOT RUN | Live tool/voice check required |
| 2 web.3 | Thanmay | Browser + live ElevenLabs | Set done acknowledged after one accepted action | Definitions and backend tested only | NOT RUN | Live tool/voice check required |
| 2 web.4 | Thanmay | Browser + live ElevenLabs | Grounded guidance, no observed-form claim | Catalog boundary/prompt documented only | NOT RUN | Live answer and content review required |
| 2 web.5 | Thanmay | Browser + live ElevenLabs | Mic denial/disconnect preserves session and buttons | Authorization failures tested only | NOT RUN | Actual mic/connection recovery required |
| 2 web.6 | Thanmay | Browser + live ElevenLabs | End releases conversation/audio resources | Finished session cannot get new token | NOT RUN | Existing connection cleanup must be verified in browser |
| 2 web.7 | Thanmay | Browser + live ElevenLabs | Two-minute idle/noise has zero transitions | No audio sample run | NOT RUN | Prompt rules are not speaker-identification evidence |
| 2 native.1–4 | Thanmay | iPhone simulator | Launch; live mic/reply; end/restart; PASS or concrete blocker | Windows backend work only | NOT RUN | Mac development build/audio spike required |

Stage 2 overall remains open. Private agent setup instructions are in agent/README.md. Prompt and catalog guidance are developer-authored; professional content review is not certified. No provider configuration or conversation was created, no mobile/watch files changed, and no commit/push/deployment performed.
