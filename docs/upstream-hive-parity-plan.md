# DigitalMate Web → current DigitalMate (Hive / v3.1) parity plan

- **Upstream snapshot:** `openJiuwen-ai/DigitalMate@14a9529` (2026-11-16)
- **Web baseline:** DigitalMate Web `0.4.0`
- **Status:** implementation started — local Hive slice shipped
- **Owner:** DigitalMate Web

## Implementation slice 1 (2026-11-16)

Shipped:

- `src/domain/hive.ts`: lanes, Bees, tasks, questions, artifacts, working state helpers
- `src/transport/hive.ts`: local Hive transport, Bee tasks, queue/steer/preempt, question/answer, Stop, artifacts
- localStorage persistence and interrupted-task recovery
- `src/components/HiveSheet.tsx`: Hive Home, Beebou, Bee lanes, activity, task detail, report/artifact cards, attachments and composer
- More → Hive entry, local-only demo
- Unit tests for the Hive transport and an E2E question flow

## Implementation slice 2 (2026-11-16): activity lanes with a cursor

Shipped:

- `HiveActivity` log in `src/domain/hive.ts` (`task_created`, `task_status`, `question`, `answer`,
  `steer`, `artifact`, `report`, `stop`) with `laneActivity`, `laneUnreadCount` and
  `laneHasActivityGap` helpers
- `MockHiveTransport` records every transition, keeps a bounded 60-entry log, and persists the
  per-lane read cursor (`activityReadAt`) with the rest of the snapshot
- Tasks / Activity tabs inside a Bee lane, unread badges on the lane chips, `New` markers on
  entries added since the feed was opened, and an explicit "older activity was not kept" notice
  once the bounded log trims
- Unit coverage for recording, read cursors, trimming/gaps and stop/answer activity; the Hive E2E
  flow now also checks the unread badge, the feed and the return to Tasks

## Implementation slice 3 (2026-11-16): versioned store and portable backups

Shipped:

- Store version `HIVE_STORE_VERSION = 2` with a backup envelope
  (`kind: digitalmate.hive.backup`, `version`, `savedAt`, `snapshot`)
- Legacy `digitalmate.hive.v1` bare snapshots are migrated on read and the old key is dropped on
  the next write, so upgrading an existing install keeps its tasks and activity
- `readHiveSnapshot` / `readHiveBackup` validate imported payloads and fill fields added by later
  versions with their empty values
- `exportBackup()` / `importBackup(raw)` on the transport; Export downloads
  `digitalmate-hive-<date>.json`, Import replaces the demo state and reports a readable error for
  files that are not Hive backups
- Unit coverage for v1 migration, key cleanup, export/import round trip and rejection of foreign
  files; the Hive E2E flow downloads a backup and imports it back

Still to do in the Hive slice:

- live `BridgeHiveTransport` and `/api/hive/*`
- report generation and memory cut-off
- Android notification routing and share intake

## Implementation slice 4 (2026-11-16): lane metadata and artifact export

Shipped:

- `taskRef()` gives every task a short stable handle (`T-XXXX`, taken from the id tail); it is
  shown on task rows and Bee cards so a task can be named without quoting its title
- `laneLastActivity()` + `relativeTime()`: lane chips carry an age stamp, Bee cards carry the
  latest status, ref and age, and lanes that never ran anything say "No tasks yet" instead of
  implying activity
- Artifact export downloads the stored content as `.txt` (reports as `.md`) with the filename
  sanitised; export sits beside Erase in the artifact row
- Unit coverage for refs, lane activity and relative stamps; the Hive E2E flow asserts the lane
  stamp, the `T-` ref and a real browser download for artifact export

## Implementation slice 5 (2026-11-16): shared memory with a cut-off

Shipped:

- `HiveMemoryEntry` (`task_summary`, `decision`, `artifact`) in `src/domain/hive.ts` with
  `laneMemory`, `laneCutoff` and `memoryInUse` helpers; store version bumped to **3**, and v1/v2
  payloads load with empty memory instead of failing
- `MockHiveTransport` writes a summary when a task finishes and a decision when a question is
  answered, reuses the lane's live memory in later answers ("I reused N memory entries"), and
  exposes `cutOffMemory(laneId, before)` / `restoreMemory(laneId)`
- Third lane tab: **Tasks / Activity / Memory**, showing "in use" counts, each entry with its kind
  and time, `Cut off here` per entry and `Restore all`, with cut entries visibly dimmed
- Unit coverage for memory writes, reuse counts, cut-off/restore and v2→v3 migration; the Hive E2E
  flow opens Memory, cuts off an entry, confirms the dimmed state and restores it

## Implementation slice 6 (2026-11-16): bridge transport and contract

Shipped:

- `src/transport/hiveBridge.ts`: `BridgeHiveTransport` implementing the same `HiveTransport`
  interface as the mock — snapshot load, SSE stream, all commands, 12 s timeout, bearer auth and an
  explicit `unavailable` status carrying the failure reason
- `HiveTransportStatus` (`mock|bridge`, `ready|connecting|unavailable`) and `status()` / `retry()`
  on the interface; the mock reports `ready` with mode `mock`
- Transport selection from `VITE_HIVE_BRIDGE_URL` / `VITE_HIVE_BRIDGE_TOKEN`; without a URL the app
  keeps the offline mock, and a broken bridge is reported in the sheet with a **Retry** button
  instead of falling back to fake data
- The sheet uses one session-wide transport (StrictMode-safe) and shows `Hive bridge` / `Bridge
  offline` in place of `Local mock`
- `docs/hive-bridge-contract.md` documents endpoints, payloads, auth, error handling, and
  `tests/fixtures/hive-bridge-snapshot.json` is the reference snapshot used by the bridge tests
- Bridge unit tests cover snapshot load + stream updates, command payloads, failure status and
  transport selection

## Implementation slice 7 (2026-11-16): capability negotiation and error taxonomy

Shipped:

- `GET /api/hive/capabilities` contract (`version`, `capabilities`) documented; the client probes it
  before the snapshot
- Refuses a bridge that speaks a newer contract (message names both versions, no stream opened, no
  mock substitution); a missing probe falls back to the v1 baseline and says `(probe missing)`
- `HiveFeature` (`steer`, `queue`, `preempt`, `artifacts`, `memoryCutoff`) with `supports()` on the
  transport; the sheet hides Queue / Steer / Preempt and the memory cut-off controls the bridge
  disables
- `HiveTransportError` with `kind` (`unauthorized`, `conflict`, `stale`, `unsupported`,
  `unavailable`, `timeout`, `unknown`) mapped from HTTP status, with user-facing copy per kind
- Diagnostics line under the header when a bridge is ready: `Contract v1 · steer, queue, …`
- Tests: negotiation (limiting, baseline, newer-version refusal), 409/501/abort mapping

## Implementation slice 8 (2026-11-16): resume after a dropped stream

Shipped:

- The bridge remembers the last SSE `id` and reconnects with `?since=<id>`; it always re-fetches
  `/api/hive/snapshot` first, so a bridge that cannot replay events only has to return full state
- Automatic reconnect with exponential backoff (1 s → 30 s, capped), stopped when the transport is
  disposed; `Retry` resets the backoff and reconnects immediately
- Status carries the resume reason (`Resuming the Hive bridge…`) and a lost stream is reported as
  `The Hive event stream was lost.` while the backoff runs
- Tests: event-id tracking + `since=` on manual retry, and a real-timer test that asserts the client
  reconnects by itself after `onerror`

Still to do in the Hive slice:

- server-side `/api/hive/*` implementation, run/task mapping and idempotency (contract frozen)
- health endpoint behind the client diagnostics line
- Android notification routing and share intake

## 1. Goal

Bring DigitalMate Web and the Android shell up to the **current user-visible
DigitalMate experience**, while keeping the app usable without an account.

This is not a code port. The upstream app is ArkTS/HarmonyOS and its newest
features are built around a server-side Hive runtime. The web app must implement
the same product behaviour through web-native code and an optional bridge.

The target has two modes:

1. **Local Hive demo** — works offline with realistic mock lanes, Bees, tasks,
   questions, steering and artifacts.
2. **Live Hive bridge** — talks to a compatible DigitalMate/Hive backend when one
   is configured.

## 2. What changed upstream

The original has moved beyond the README’s “task assistant” description. Current
main includes:

- a shared **Hive Home** with **Beebou** and multiple **Bee** agents;
- Bee activity lanes, lane history and task references;
- queue / preempt / steer controls while a Bee is busy;
- named sends to a Bee, with up to five attachments per draft;
- Hive question cards, answers, receipts and Bee Stop;
- task refs exposed to Home;
- artifacts with durable erasure and withdrawal semantics;
- shared memory ingestion and history cut-off;
- report cards and report generation;
- Hive3 and the v3.1 server model (M/S/R: message, session, run);
- Router, Host, Model Gateway and Plugin Gateway contracts.

The README is partly behind the code. The plan targets the **Hive client
behaviour**, not every internal server module.

## 3. Scope

### In scope

- Hive Home and Beebou/Bee presentation
- Bee lanes, task rows, task references and activity
- Queue / preempt / steer while busy
- Named sends, drafts and attachments
- Question cards, answers, Stop and operation retry semantics
- Artifacts, erasure and report cards
- Memory/shared-history UI
- A Hive transport abstraction with mock and bridge implementations
- Android notifications, share intake, file picking and task routing
- PWA/offline/local demo mode

### Out of scope

- HarmonyOS atomic services
- Huawei/AGC account login as a requirement
- HarmonyOS system cards, virtual screens and native app control
- A full port of the v3.1 Router/Host/Model Gateway server
- Real payment, booking or provider execution without a real backend
- Copying upstream bugs or unreachable code paths

## 4. Current web baseline

The web app already has:

- React + Vite + TypeScript, PWA and Capacitor Android
- A2UI parser, store and 36-component renderer
- Chat transport with mock and Orbit bridge implementations
- Local tasks, approvals, skills, memory, artifacts, history and backup
- Discovery feed, RSS, source/topic management and covers
- Personas, composer pickers, voice input, TTS and diagnostics
- Android share, notifications, widget, shortcuts and QS tile
- 105 unit tests and 33 Playwright tests

Reusable pieces:

| Existing piece | Reuse for Hive |
| --- | --- |
| `ChatTransport` / SSE client | Hive event transport |
| `src/protocol/a2ui` | Hive cards and generated surfaces |
| `App.tsx` local stores | Hive session/task/artifact state |
| `Overlays` sheets | Activity, artifacts, questions |
| `Composer` | Named Bee sends and steering |
| `server/orbit.ts` + `services/bridge` | New Hive bridge endpoints |
| `lib/storage`, backup, diagnostics | Hive persistence and recovery |
| Android `native.ts` | Notifications, share, files |

## 5. Target architecture

```text
Hive UI
  ├── HiveHomeView
  ├── HiveActivityPanel
  ├── BeeCard / BeeTaskRow
  ├── HiveQuestionCard
  ├── SteerComposer / BusyControls
  └── HiveArtifactPanel
        │
  HiveStore (state + persistence)
        │
  HiveTransport
    ├── MockHiveTransport   (offline/demo)
    └── BridgeHiveTransport (real backend)
              │
        /api/hive/* on services/bridge
              │
        Hive-compatible gateway
```

Principles:

- Keep the existing Orbit/chat path working; Hive is an additional transport.
- All user actions carry stable operation IDs and are retry-safe.
- The local mock must be good enough to review the whole experience offline.
- The bridge is optional; “not configured” is a first-class state.
- Do not put server tokens in the browser.
- Feature-flag Hive until the bridge and recovery paths are stable.

## 6. Domain model and contracts

New types:

- `HiveLane` — Beebou or Bee; active/retired/archived; last activity; optional session ref.
- `Bee` — label, avatar, capabilities, lane lifetime.
- `HiveTask` — task ref, run ref, Bee ref, status, timestamps, last visible update.
- `HiveQuestion` — interaction ID, task/run ref, question, version, answerable flag.
- `HiveArtifact` — ref, type, title, state, erasure/withdrawal status.
- `HiveEvent` — lanes, text, question, task update, artifact, report, memory.
- `HiveOperation` — key, operation ID, state: draft/sending/pending/accepted/refused/unknown/settled.

Rules:

- A resend of the same user operation reuses the same operation ID until settled.
- Edited text or a new press after settling gets a new ID.
- Unknown outcomes keep the draft and allow **retry with the same ID**.
- Attachments are uploaded first; only source IDs travel with the send.
- Activity cursors must not loop or silently drop history; show a gap indicator.
- Hive capability probes determine whether cards/Stop are available.
- Unsupported server methods render an explicit “not available” state, not a fake success.

Proposed bridge endpoints:

```text
POST /api/hive/message
GET  /api/hive/activity?lane=&cursor=
POST /api/hive/control        (steer / queue / preempt)
POST /api/hive/answer
POST /api/hive/stop
POST /api/hive/attachments
GET  /api/hive/task/:ref
GET  /api/hive/artifact/:ref
POST /api/hive/artifact/:ref/erase
GET  /api/hive/health
```

The bridge keeps the bearer token server-side and exposes only normalised Hive
events. Same-origin and `ORBIT_ALLOWED_ORIGINS`-style checks apply.

## 7. Workstreams and phases

### Phase 0 — Snapshot and contract freeze

**Deliverables**

- Pin upstream snapshot `14a9529`.
- Capture Hive client payload fixtures from the upstream tests.
- Write a feature/contract map for every Hive event and control.
- Add a `HIVE_MODE` feature flag: `off | mock | bridge`.
- Decide the first live backend endpoint and auth shape.

**Acceptance:** every planned Hive feature has a contract fixture or an explicit
“mock only” label.

**Estimate:** S–M.

### Phase 1 — Hive domain, store and mock transport

**Deliverables**

- `src/domain/hive.ts`, `src/state/hiveStore.ts`.
- `MockHiveTransport`: Beebou + 2–3 Bees, tasks, questions, steering, artifacts.
- Event replay, operation IDs, persistence and reset.
- Unit tests for transitions, idempotency and recovery.

**Acceptance:** the whole Hive flow can run offline with deterministic fixtures.

**Estimate:** M.

### Phase 2 — Hive Home and Bee UX

**Deliverables**

- Hive Home with Beebou and Bee lanes.
- Bee cards, task refs, status chips, last activity and empty/error states.
- Named Bee composer with target selector.
- Activity panel with lane list, history and pagination/gap handling.
- Responsive phone/desktop layouts.

**Acceptance:** a user can open Hive, see active Bees, select one, send a task and
follow its state.

**Estimate:** L.

### Phase 3 — Busy controls and attachments

**Deliverables**

- Queue, preempt and steer actions.
- Draft retention and operation-ID reuse.
- Attachment tray and upload/discard lifecycle; five-file limit.
- Busy/queued/steering/applied/refused states.
- Conflict and stale-target handling.

**Acceptance:** controls behave correctly under retries and concurrent updates;
attachments only travel with the intended named send.

**Estimate:** L.

### Phase 4 — Questions, Stop, artifacts, reports and memory

**Deliverables**

- Hive question cards with answer states and draft retention.
- Bee Stop with confirmation/retry semantics.
- Artifact list, preview, export and erasure.
- Report cards.
- Memory/shared-history view and cut-off UI.

**Acceptance:** question answer and Stop cannot double-submit; artifacts survive
reload and erase explicitly; memory is visible and explainable.

**Estimate:** L.

### Phase 5 — Live Hive bridge

**Deliverables**

- `/api/hive/*` endpoints in `services/bridge`.
- SSE or WebSocket event stream; reconnect and resume.
- Session/run/task mapping and idempotency.
- Capability probes and version negotiation.
- Error taxonomy: unavailable, unsupported, conflict, stale, unknown.
- Health/diagnostics surface.

**Acceptance:** with a configured Hive backend, the mock path can be replaced
without changing the UI; with no backend, the app falls back honestly.

**Estimate:** L.

### Phase 6 — Android and PWA delivery

**Deliverables**

- Local notifications for Bee task completion and questions.
- Notification tap routing to the right task/question.
- Share text/files into a Bee draft.
- File picker and attachment preview.
- PWA share target and offline Hive demo.
- No HarmonyOS-only claims.

**Acceptance:** Android can receive, route and act on Hive events; offline local
mode remains fully usable.

**Estimate:** M.

### Phase 7 — Hardening and release

**Deliverables**

- Unit/contract/E2E tests for every Hive state.
- Accessibility scan for all new screens.
- i18n for new Hive copy.
- Performance budget and feed/task rendering checks.
- Backup/restore and migration for existing local data.
- Docs: architecture, operations, parity, user guide.
- Release `0.5.0` with Hive off by default until the bridge is proven.

**Acceptance:** all suites green; no regression in existing chat, discovery,
tasks, memory, skills or Android shell.

**Estimate:** M.

## 8. Feature matrix

| Current upstream capability | Web plan | Needs backend | Priority |
| --- | --- | --- | --- |
| Hive Home / Beebou / Bees | Full UI + mock | For live Bees | P0 |
| Bee lanes and task refs | Full UI + store | Optional | P0 |
| Activity history/pagination | Full UI + mock | For live history | P0 |
| Queue / preempt / steer | Full UI + state machine | Yes | P0 |
| Named Bee send | Full UI + mock | Yes | P0 |
| Attachments per Bee | Full UI + local preview | Yes for upload | P0 |
| Question cards / answers | Full UI + mock | Yes | P0 |
| Bee Stop | Full UI + mock | Yes | P0 |
| Artifacts / erasure | Full UI + local store | Optional | P1 |
| Report cards | UI + mock | Yes | P1 |
| Shared memory / cut-off | UI + local store | Optional | P1 |
| Hive3/v3.1 sessions and runs | Bridge adapter only | Yes | P0 |
| Router/Host/Model Gateway | Not ported | Yes | Out |
| HarmonyOS atomic services | Not ported | No | Out |
| AGC/Huawei login | Not required | No | Out |
| Native app control | Not ported | No | Out |

## 9. UX screens to add

1. **Hive Home** — Beebou, active Bees, task summaries, “ask a Bee”.
2. **Bee detail** — task history, current run, last output.
3. **Activity** — lanes, history, gap/retry, pagination.
4. **Question card** — question, answer field, receipt states.
5. **Steer composer** — text, attachments, queue/preempt/steer buttons.
6. **Artifacts** — list, preview, export, erase.
7. **Reports** — report cards and report detail.
8. **Hive diagnostics** — bridge state, capability probes, last sync.

## 10. Testing plan

Unit:

- lane/task/question/artifact reducer
- operation-ID lifecycle and retries
- draft retention and attachment ownership
- cursor pagination and history gaps
- capability probe/unsupported states

Contract:

- replay captured upstream payloads
- validate event schema and error taxonomy
- mock bridge fixtures for every control

E2E:

- Hive Home renders and selects a Bee
- named send, queue, steer, preempt
- question answer, duplicate submit, Stop
- attachment upload/remove
- artifact save/erase
- bridge unavailable/unsupported
- offline Hive demo
- mobile and accessibility scans

Non-regression:

- existing chat, discovery, skills, memory, artifacts, backup, Android shell.

## 11. Rollout

- Default: `HIVE_MODE=mock` in development, `off` in production until the bridge
  is proven.
- Release `0.5.0` with Hive behind a feature flag.
- Promote `bridge` after live tests and recovery pass.
- Keep the old chat path available for one release.
- Rollback: switch the flag off; existing local data remains untouched.
- Do not migrate chat data into Hive automatically.

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Upstream keeps changing | Pin a snapshot and use contract fixtures; update deliberately |
| Hive3/v3.1 server not available | Mock-first; bridge optional; honest unavailable state |
| Idempotency mistakes | Stable operation IDs; retry only the same operation |
| Attachments leak between Bees | Source IDs scoped to the named lane/draft |
| History gaps | Cursor validation and explicit gap UI |
| Artifact erasure ambiguity | Durable erasure state and no silent “deleted” |
| Too much UI at once | Phases 2–4; feature flag; mobile-first |
| Android background limits | Server owns tasks; Android is a notification/client shell |
| Existing chat regression | Keep the old transport and tests; flag-gated Hive |

## 13. Decisions needed before Phase 5

1. Which Hive backend endpoint and auth mode will be used?
2. Is the first release mock-only, or must live Hive work?
3. Are artifacts stored locally, on the bridge, or both?
4. Should Android use a server task notification or poll on resume?
5. Do we keep the old chat home alongside Hive, or replace it after parity?

## 14. Definition of done

- Hive Home, Bees, tasks, activity, steering, questions, Stop, artifacts and
  reports are usable in the web app.
- The same experience works offline with the local mock.
- A configured Hive bridge drives the same UI without component changes.
- Android receives and routes Bee notifications and shares files into drafts.
- Existing chat/discovery/skills/memory/workflows have no regressions.
- Unit, contract, E2E, accessibility and mobile checks pass.
- The app is honest about every unsupported native or server capability.

## 15. Rough effort

With one developer: **8–12 weeks**, dominated by the Hive state machine, bridge
adapter and testing. With one frontend and one bridge developer: **5–7 weeks**,
with Phase 1–4 and Phase 5 running in parallel after the contracts are frozen.

First shippable slice:

> Hive Home + Bee lanes + named send + activity + question cards, running on the
> local mock. This proves the product experience before the live backend exists.
