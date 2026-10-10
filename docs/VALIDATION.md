# Validation record

All checks are initially NOT RUN. This file records evidence; it does not certify implementation.

For each numbered end-of-stage check in MASTER_PLAN.md, add a row with its exact check number, environment, expected/actual result, evidence and blocker. Do not mark an entire stage PASS unless all required checks passed. Optional omitted features must be hidden and recorded as CUT.

| Stage | Owner | Environment | Check | Expected | Actual | Status | Evidence / blocker |
|---|---|---|---|---|---|---|---|
| 0 | Both | Mac + Windows web/backend | Environments and schema | Reproducible launch, catalog and agreed schema | — | NOT RUN | — |
| 1 | Both | Web + backend | Button-driven workout | Correct sets, rests, adaptation and persistence | — | NOT RUN | — |
| 2 web | Both | Browser + ElevenLabs | Live voice/tools | Validated actions and live replies | — | NOT RUN | — |
| 2 native | Thanmay | iPhone simulator | Audio spike | Live input/output, end/restart | — | NOT RUN | — |
| 3 | Both | Two browser tabs | Complete adaptive workflow | Synchronized, acknowledged, repeatable flow | — | NOT RUN | — |
| 4 | Thanmay | iPhone simulator + backend | Native workflow | Shared flow passes with native voice | — | NOT RUN | — |
| 5 | Thanmay | iPhone + watch simulators | Actual watch controls | Real SwiftUI controls update native session | — | NOT RUN | — |
| 6 | Both | Demo / Devpost / GitHub | Submission | Video and code accessible; submission confirmed | — | NOT RUN | — |

Record dependency versions, OS/browser/Xcode/simulator versions, API base URL and demo-mode settings with each run. Never include access tokens or provider secrets in evidence.

Physical iPhone/headphone routing, locked-phone audio, real Apple Watch pairing, native WatchConnectivity, haptics and battery: NOT RUN and outside initial acceptance scope.
