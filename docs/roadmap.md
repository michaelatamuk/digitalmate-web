# Roadmap

## Phase 0 — Standalone mock (current)

- [x] React + Vite + TypeScript app
- [x] English and Chinese UI with persisted language choice
- [x] BeeBou mascot and assistant states
- [x] 34 A2UI-style components / 15 mock scenarios
- [x] Travel/train/food detail sheets
- [x] Local calendar event creation
- [x] Guided demo mode
- [x] Discovery feed, skills, memory, settings, history
- [x] Unit tests for mock engine, localization and calendar surfaces
- [x] Production build
- [x] Public GitHub repository with CI build + tests

## Phase 1 — Protocol extraction

- [x] Move A2UI and transport contracts into `src/protocol`
- [x] Define `ChatTransport`
- [ ] Define `DiscoveryTransport`
- [x] Keep `MockChatTransport` behind the same interface
- [x] Add an `OrbitChatTransport` behind the same interface
- [x] Add an A2UI JSONL parser and surface store
- [x] Support `createSurface` / `updateComponents` / `updateDataModel`
- [x] Support `deleteSurface` and line-numbered parse errors
- [x] Add partial-update and throttling behaviour
- [ ] Wire the update queue into the live bridge stream
- [x] Add unit tests for parser/store/state reducer
- [x] Move built-in scenario fixtures onto the parsed store

## Phase 2 — Web bridge

- [x] Local RSS fetch/parse dev proxy with SSRF, redirect, timeout and size guards
- [x] Node bridge endpoints in `server/orbit.ts` (health + SSE turns)
- [ ] Package the bridge for production (`services/bridge`)
- [ ] Gateway auth exchange or delegated session
- [x] WSS `/orbit/ws` proxy with `room.home` / `room.message`
- [x] Token isolation and redaction
- [x] Session cookie, room continuity and submission-id idempotency
- [ ] Reconnect and snapshot recovery
- [x] Document the bridge security model

## Phase 3 — Feature parity

- [x] Discovery local search and article/reply sharing
- [x] Daily brief scenario
- [x] Shopping checklist scenario
- [ ] Orbit room/session/task shell
- [x] Stop, retry, copy, share and clear a message exchange
- [ ] Long-press and per-task detail rows
- [x] Local attachments with text/image preview
- [x] PDF text extraction and richer local previews
- [x] Local Markdown/text artifacts with preview and download
- [ ] Rich rendered artifacts (slides, generated charts, app previews)
- [ ] Approval cards and connection/quota states
- [x] Skill detail and local JSON import/export
- [ ] OAuth and marketplace skill publishing *(not required without an account)*
- [x] Local memory editing, evidence notes and forget-all
- [ ] Public profile import
- [x] Stripe receiving-account card and A2UI thinking card
- [ ] Deeper scenario states
- [ ] Mobile viewport and accessibility audit

## Phase 4 — Android

- [x] Decide PWA-first with Capacitor as the later native shell (see `docs/android.md`)
- [ ] Scaffold Capacitor only when native notifications/widgets are required
- [ ] Keep local mode account-free in the native build
- [ ] Point `VITE_API_BASE` at an optional hosted bridge for RSS/Orbit
- [ ] Native notifications, widgets and sharing
- [ ] Device regression and signing

## Phase 5 — Production hardening

- [x] Automated UI tests and critical accessibility checks
- [x] Installable PWA with offline shell
- [x] PWA version display and update check
- [x] Dockerfile and compose file for self-hosting
- [x] Local JSON backup and restore
- [ ] Wider accessibility audit and manual screen-reader pass
- [ ] Deployment pipeline and environment configuration
- [ ] Telemetry/crash reporting (privacy-reviewed)
- [ ] Branding and asset licensing finalised
- [x] Threat model documented in `docs/threat-model.md`
- [ ] Credential rotation and production origin checks
