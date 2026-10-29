# Roadmap

## Phase 0 — Standalone mock (current)

- [x] React + Vite + TypeScript app
- [x] English and Chinese UI with persisted language choice
- [x] BeeBou mascot and assistant states
- [x] 16 A2UI-style components / 8 mock scenarios
- [x] Travel/train/food detail sheets
- [x] Local calendar event creation
- [x] Guided demo mode
- [x] Discovery feed, skills, memory, settings, history
- [x] Unit tests for mock engine, localization and calendar surfaces
- [x] Production build
- [x] Public GitHub repository with CI build + tests

## Phase 1 — Protocol extraction

- [ ] Move A2UI and transport contracts into `src/protocol`
- [ ] Define `ChatTransport` and `DiscoveryTransport` interfaces
- [ ] Keep `MockTransport` behind the same interface
- [ ] Add an A2UI JSONL parser and surface store
- [ ] Support `createSurface` / `updateComponents` / `updateDataModel`
- [ ] Add partial-update and throttling behaviour
- [ ] Add unit tests for parser/store/state reducer

## Phase 2 — Web bridge

- [ ] Add `services/bridge` (Node or edge runtime)
- [ ] Gateway auth exchange or delegated session
- [ ] WSS `/orbit/ws` proxy
- [ ] Token isolation and redaction
- [ ] Reconnect, snapshot recovery and submission-id handling
- [ ] Document the bridge security model

## Phase 3 — Feature parity

- [ ] Orbit room/session/task shell
- [ ] Task rows: stop, retry, clear, long-press details
- [ ] Attachments and artifact preview
- [ ] Approval cards and connection/quota states
- [ ] Skill detail, publish and OAuth setup
- [ ] Memory editing and public profile import
- [ ] Missing A2UI components and scenarios
- [ ] Mobile viewport and accessibility audit

## Phase 4 — Android

- [ ] Decide Capacitor / React Native / native Kotlin / KMP
- [ ] Reuse or port protocol contracts
- [ ] Native login and WSS transport
- [ ] Native notifications, widgets and sharing
- [ ] Device regression and signing

## Phase 5 — Production hardening

- [ ] Automated UI tests and accessibility checks
- [ ] Deployment pipeline and environment configuration
- [ ] Telemetry/crash reporting (privacy-reviewed)
- [ ] Branding and asset licensing finalised
- [ ] Threat model and credential rotation
