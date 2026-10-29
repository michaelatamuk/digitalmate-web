# Roadmap

Legend: `[x]` done · `[ ]` planned · **(S)** small · **(M)** medium · **(L)** large.
“Local” means it works without an account or backend; “bridge” means it needs the
optional Orbit bridge or another service.

## Phase 0 — Standalone mock (complete)

- [x] React + Vite + TypeScript app
- [x] English and Chinese UI with persisted language choice
- [x] BeeBou mascot and assistant states
- [x] 36 A2UI-style components / 17 mock scenarios
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
- [x] Define `DiscoveryTransport`
- [x] Keep `MockChatTransport` behind the same interface
- [x] Add an `OrbitChatTransport` behind the same interface
- [x] Add an A2UI JSONL parser and surface store
- [x] Support `createSurface` / `updateComponents` / `updateDataModel`
- [x] Support `deleteSurface` and line-numbered parse errors
- [x] Add partial-update and throttling behaviour
- [x] Wire the update queue into the live bridge stream
- [x] Add unit tests for parser/store/state reducer
- [x] Move built-in scenario fixtures onto the parsed store

## Phase 2 — Web bridge

- [x] Local RSS fetch/parse dev proxy with SSRF, redirect, timeout and size guards
- [x] Node bridge endpoints in `server/orbit.ts` (health + SSE turns)
- [x] Package the bridge for production (`services/bridge`)
- [x] Delegated server token session (no interactive login required)
- [x] WSS `/orbit/ws` proxy with `room.home` / `room.message`
- [x] Token isolation and redaction
- [x] Session cookie, room/snapshot continuity and submission-id idempotency
- [x] Client retry, per-turn reconnect and snapshot endpoint
- [x] Document the bridge security model

## Phase 3 — Feature parity

- [x] Discovery local search and article/reply sharing
- [x] Daily brief scenario
- [x] Shopping checklist scenario
- [x] Local session/task shell (remote room switching remains bridge-dependent)
- [x] Per-task detail rows with retry
- [x] Stop, retry, copy, share and clear a message exchange
- [x] Local attachments with text/image preview
- [x] PDF text extraction and richer local previews
- [x] Local artifacts with text, slides and rendered A2UI surfaces
- [x] Approval cards and connection/quota states
- [x] Local skill publish bundle (no OAuth or account)
- [x] Local memory editing, evidence notes and forget-all
- [x] Public profile local JSON import
- [x] Stripe receiving-account card and A2UI thinking card
- [x] Deeper scenario states: unavailable, approval, quota
- [x] Mobile viewport and serious-level accessibility audit

## Phase 4 — Android

- [x] Decide PWA-first with Capacitor as the later native shell (see `docs/android.md`)
- [x] Scaffold Capacitor Android project
- [x] Keep local mode account-free in the native build
- [x] Point `VITE_API_BASE` at an optional hosted bridge for RSS/Orbit
- [x] Native notifications, widget and sharing
- [x] Automated debug APK build and release signing configuration
- [x] Version 0.3.0 installed and verified on the test device
- [ ] Physical device regression: notifications permission and delivery (M)
- [ ] Physical device regression: native share sheet (S)
- [ ] Physical device regression: widget placement and refresh (S)
- [ ] Physical device regression: keyboard + safe areas (S)
- [ ] Physical device regression: back gesture from detail sheets, discovery and chat (S)

## Phase 5 — Production hardening

- [x] Automated UI tests and critical accessibility checks
- [x] Installable PWA with offline shell
- [x] PWA version display and update check
- [x] Dockerfile and compose file for self-hosting
- [x] GitHub Pages deploy workflow for the static/PWA build
- [x] Local JSON backup and restore
- [x] Wider automated accessibility coverage across Home, Chat, Discover, More, Skills and Settings (see `docs/accessibility.md`)
- [ ] Manual screen-reader pass on a physical device (M)
- [x] Deployment pipeline and environment configuration: container smoke job, `/healthz`, env template and operations runbook (`docs/operations.md`)
- [x] Privacy-reviewed local-only diagnostics with sanitized messages, export and clear (`src/lib/diagnostics.ts`)
- [x] Branding and asset licensing finalised (`docs/branding.md`, photo credits, NOTICE)
- [x] Threat model documented in `docs/threat-model.md`
- [x] Credential rotation runbook, origin allowlist and production config warnings

## Phase 6 — UX parity with the original app

This phase covers user-visible behaviour only. Items marked “bridge” cannot be
completed without a real service, but their UI/fallbacks can be built locally.

### 6.1 Defaults and content alignment

- [x] Use the general companion as the default behaviour with no skill preselected
- [x] Keep a chosen skill selected across sends and store it on the task record
- [x] Default Discover to **All topics**, matching the original’s mixed feed
- [x] Clear topic filters on reset and language switch
- [x] Add a Robotics demo article so every topic chip has content (EN + ZH)
- [x] Prefer topic stock photos over source photos; keep real RSS images first
- [x] One-time migration from the old “AI & Tech + HarmonyOS” stored filter (S)
- [x] Rename “General assistant” to the upstream “Default companion / 默认分身” (S)
- [x] Keep skill labels/descriptions translated with the persona catalog (S)

### 6.2 Assistant, personas and composer

- [x] Add the seven upstream personas: default, food, travel, work, entertainment, game, shopping (M)
- [x] Persona picker in the composer, replacing the flat skill pill row (M)
- [x] Per-persona soul, skills and memory files stored locally (M)
- [x] Persona-aware mock responses and suggested prompts (M)
- [x] Persona-aware home greeting and suggestion cards (S)
- [x] Persona status/"using for this task" chip in chat (S)
- [x] Persona editor screen for soul, skills and memory (M)
- [x] Integrate persona switching with About You / memory sheet (S)
- [x] Model picker in the composer (local mock list; bridge models later) (M)
- [x] Project-directory picker using Capacitor Filesystem / File System Access API (M)
- [x] Capability + MCP picker UI with local validation (execution is bridge-only) (M)
- [x] Deep-search toggle and local progress panel (M)
- [x] Multi-file queue with reorder/remove and per-file status (M)
- [x] Rich image preview and camera capture for attachments (M)
- [x] Propagate the selected skill/persona to `ChatTransport`, not only the task row (M)
- [x] Persist composer selections per session (M)

### 6.3 Voice and media

- [x] Hold-to-talk voice input with level meter, cancel and transcript editing (M)
- [x] Web Speech API fallback where supported (S)
- [ ] Android native speech-recognition plugin and microphone permission (M)
- [x] Voice topic editing on Discover (“more robotics and open source”) (M)
- [x] Text-to-speech for assistant replies with stop/rate controls (S)
- [x] Podcast/audio playback from RSS enclosures (S)
- [ ] Background audio + media notification on Android (L)
- [x] YouTube/Bilibili external-app opening on Android (S)
- [ ] Embedded YouTube/Bilibili playback on web where CSP and network allow (M)

### 6.4 Discovery experience

- [x] Mixed card kinds: video, article, discussion and audio (M)
- [x] Article reader with inline images, galleries and reading progress (M)
- [x] Discussion/thread cards with reply previews (M)
- [x] Natural-language topic editing with a local rules parser (S)
- [x] Preference learning from likes, saves and reactions, with local re-ranking (M)
- [x] Preference-tag editor: add, remove and reorder interests (M)
- [x] Source management: enable/disable sources and show source status (M)
- [x] Deduplication and “continue where you left off” read state (M)
- [x] Feed pagination/infinite scroll with local inventory (M)
- [x] PWA share target so links can be sent into Discover (M)
- [x] Android share-intent filters for links and text (M)
- [x] Graceful fallback when a media URL cannot be embedded or played (S)

### 6.5 Home, settings and utility screens

- [x] Startup splash and welcome card deck (S)
- [x] Resume a specific recent task, not only the last chat (M)
- [ ] In-app update card: check GitHub APK version, download and launch installer (M)
- [x] Expanded diagnostics panel with build info, storage usage and connection state (S)
- [x] Settings sections for models, MCP services, projects and sources (M)
- [x] Optional bridge/connection status panel without any account (S)
- [x] App update dialog and changelog display (S)
- [x] Local data management page with per-dataset clear actions (M)

### 6.6 Experimental and demo screens

- [x] BIM dashboard and detail demo with local sample data (L)
- [x] Multi-task page with local lanes, artifacts and retry (L)
- [x] Deep-search panel with staged progress and source list (M)
- [x] Train presale flow as a mock UI, clearly marked non-transactional (M)
- [ ] Food store map + location picker using OSM/MapLibre (M)
- [x] Ride driver map, ETA and status mock (M)
- [x] Checkout overlay mock with no real payment path (M)
- [x] Social hub read-only/mock view (M)
- [x] Full-screen receiving-account/payment demo, clearly non-transactional (S)
- [ ] App-wide empty/loading/error states for every new screen (S)

### 6.7 Android/native additions

- [ ] Android speech recognition + TTS integration (M)
- [ ] MapLibre/Google Maps integration for food and ride demos (M)
- [ ] APK update check, download and `REQUEST_INSTALL_PACKAGES` flow (M)
- [x] Native splash screen matching the web splash (S)
- [x] Widget refresh button and deep links into chat/discover (M)
- [x] App shortcuts and a Quick Settings tile approximating atomic services (M)
- [x] Camera/file picker plugins for attachments (M)
- [x] Notification tap routing to the relevant task (M)
- [ ] Background audio service and media notification (L)
- [ ] Keyboard, safe-area and back-gesture E2E coverage on device (M)

## Phase 7 — Engineering follow-up

- [x] Push the local defaults commit (`770031a`) and let Pages deploy (S)
- [x] Run the full Playwright suite after the defaults change (S)
- [x] Rebuild and version-bump the Android APK (0.4.0, versionCode 6)
- [ ] Install 0.4.0 on the physical device and verify the new UX
- [x] Add E2E coverage for personas, voice, discovery ranking and new screens (L)
- [x] Extend axe coverage to every new sheet and demo screen (M)
- [x] Update `docs/parity.md` statuses and test counts (S)
- [x] Upgrade CI actions off deprecated Node 20 versions (S)
- [ ] Add lint/format scripts and run them in CI (M)
- [ ] Implement reconnect reconciliation and snapshot recovery for Orbit turns (L)
- [ ] Run the container smoke test locally, not only in CI (S)
- [ ] Review dependency licenses before any commercial distribution (S)
- [x] Add performance budgets for bundle size and feed images (M)
- [x] Keep README screenshots and feature table in sync with the roadmap (S)

## Not planned (with reasons)

- **HarmonyOS atomic services** — platform-specific; Android can only approximate with widgets, shortcuts and tiles.
- **Real MCP/tool execution** — requires a server-side runtime; the UI and local validation can ship first.
- **Huawei/AGC account login** — conflicts with the account-free product direction.
- **Real payments, receiving accounts, checkout or orders** — regulated and out of scope; demos stay clearly non-transactional.
- **Real multi-platform discovery without a proxy** — YouTube/X/Reddit and similar sources need API keys or a server proxy.
- **Full cloud session restore** — requires Orbit or another session service.
- **Real train, food or ride booking** — requires official provider APIs and legal agreements.
- **Background cloud tasks** — requires a server that keeps tasks alive after the app closes.

## Recommended order

1. **Personas + composer pickers** (6.2) — largest parity gap, fully local.
2. **Voice input + TTS** (6.3) — second largest, needs one native plugin.
3. **Discovery topic editing + preference ranking + mixed media** (6.4).
4. **Home splash/welcome deck and app update card** (6.5) — quick wins.
5. **Physical Android regression and manual screen-reader pass** (Phase 4/5).
6. **Experimental screens and maps** (6.6) only after the core UX is stable.
7. **Engineering follow-up** (Phase 7) continuously alongside the above.
