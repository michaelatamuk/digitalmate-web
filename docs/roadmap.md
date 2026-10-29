# Roadmap

## Phase 0 — Standalone mock (current)

- [x] React + Vite + TypeScript app
- [x] English and Chinese UI with persisted language choice
- [x] BeeBou mascot and assistant states
- [x] 28 A2UI-style components / 12 mock scenarios
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
- [ ] Add partial-update and throttling behaviour
- [x] Add unit tests for parser/store/state reducer
- [ ] Move built-in scenario fixtures onto the parsed store

## Phase 2 — Web bridge

- [x] Local RSS fetch/parse dev proxy with SSRF, redirect, timeout and size guards
- [x] Node bridge endpoints in `server/orbit.ts` (health + SSE turns)
- [ ] Package the bridge for production (`services/bridge`)
- [ ] Gateway auth exchange or delegated session
- [x] WSS `/orbit/ws` proxy with `room.home` / `room.message`
- [x] Token isolation and redaction
- [ ] Reconnect, snapshot recovery and submission-id handling
- [x] Document the bridge security model

## Phase 3 — Feature parity

- [ ] Orbit room/session/task shell
- [ ] Task rows: stop, retry, clear, long-press details
- [ ] Attachments and artifact preview
- [ ] Approval cards and connection/quota states
- [ ] Skill detail, publish and OAuth setup
- [ ] Memory editing and public profile import
- [ ] Remaining chart components and deeper scenario states
- [ ] Mobile viewport and accessibility audit

## Phase 4 — Android

- [ ] Decide Capacitor / React Native / native Kotlin / KMP
- [ ] Reuse or port protocol contracts
- [ ] Native login and WSS transport
- [ ] Native notifications, widgets and sharing
- [ ] Device regression and signing

## Phase 5 — Production hardening

- [x] Automated UI tests and critical accessibility checks
- [ ] Wider accessibility audit and manual screen-reader pass
- [ ] Deployment pipeline and environment configuration
- [ ] Telemetry/crash reporting (privacy-reviewed)
- [ ] Branding and asset licensing finalised
- [ ] Threat model and credential rotation
