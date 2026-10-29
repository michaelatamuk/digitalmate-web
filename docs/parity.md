# Parity with the native app

Status legend: ✅ present · 🟡 partial/mock · ❌ absent

## Screens and flows

| Area | Web | Notes |
| --- | --- | --- |
| Home shell, greeting, suggestions | ✅ | Mock data |
| BeeBou mascot | ✅ | Home, avatar, thinking, about |
| Streaming chat | 🟡 | Transport-driven; live only with Orbit bridge config |
| Card detail sheets | ✅ | Travel, train and food |
| Guided demo | ✅ | Scripted walkthrough |
| Orbit rooms/sessions/task rows | ❌ | Single mock thread |
| Stop / retry / task clear | ✅ | Stop, retry, copy and clear per exchange |
| Attachments and upload | ✅ | Local picker, text/image preview, PDF text extraction; no upload |
| Artifacts and preview | ✅ | Saved text and A2UI surfaces render in the preview |
| Local artifacts | ✅ | Save, browse, render surfaces, download and delete |
| Discovery feed | 🟡 | Local seeds plus real RSS/Atom import via local proxy |
| Discovery search mode | ✅ | Searches local and imported RSS inventory |
| Saved cards / share | ✅ | Save works and cards or replies can be shared |
| Skill center | ✅ | Detail view, install/toggle and local JSON import/export |
| Skill publish / OAuth | ❌ | Not implemented; marketplace publishing would need an account |
| Memory profile | ✅ | Editable local profile, persisted |
| Memory edit / forget / evidence | ✅ | Edit, forget and per-section evidence notes are local |
| Calendar read | ✅ | Mock schedule |
| Calendar event create | 🟡 | Local browser state only |
| Login / onboarding | ❌ | Not required — the app works fully without an account |
| Account switching | ❌ | Not applicable; no account or login gate |
| Settings / app update | 🟡 | Demo settings, version display and PWA update check |
| Notifications / background tasks | 🟡 | Browser notification when hidden and permitted |
| Offline use | ✅ | Offline banner, cached PWA shell and local data |
| Error resilience | ✅ | App error boundary with reload and local reset |
| Local backup | ✅ | Export/import JSON in Settings; validated and scoped to app keys |
| Home-screen widgets / atomic services | ❌ | Native only |

## A2UI and protocol

| Item | Web | Notes |
| --- | --- | --- |
| A2UI surface renderer | ✅ | 34 components |
| Full component catalog | ✅ | Tracked native catalog covered |
| JSONL parsing / partial updates | ✅ | `src/protocol/a2ui` parser + store |
| Layout merger / throttle | ✅ | `A2uiUpdateQueue` coalesces adjacent updates |
| Data-model pointer semantics | ✅ | JSON Pointer escapes, numeric arrays, `-` append and removal |
| Unknown component rejection | ✅ | Renders an error card |

No components from the tracked native list remain. Future native additions may still appear.

## Scenarios/tools

| Area | Web | Notes |
| --- | --- | --- |
| Travel | ✅ | Train + flight mock |
| Food / coffee | ✅ | Multi-source mock |
| Social hub | 🟡 | Read-only mock |
| Mail | 🟡 | Summary mock |
| Calendar | 🟡 | Read-only mock |
| Document summary | ✅ | Local text mock |
| Weather | ✅ | Mock |
| Hotel / ride / payments / media | ✅ | Mock comparison and review cards |
| Daily brief | ✅ | Local schedule, metrics and priorities |
| Shopping list | ✅ | Local checklist with budget; no ordering |
| Gmail send / calendar write | ❌ | Not implemented |
| Firecrawl / shopping / DeepSearch | ❌ | Not implemented |
| DailyBrief / BIM / multi-task | ❌ | Not implemented |

## Infrastructure

| Item | Web | Notes |
| --- | --- | --- |
| Transport abstraction | ✅ | `ChatTransport` with mock and Orbit implementations |
| Real Orbit/WorkSwarm transport | 🟡 | Bridge implemented; needs gateway URL + Bearer token |
| Bridge sessions | ✅ | HttpOnly cookie, room continuity, submission-id cache |
| Real authentication | ❌ | Bridge accepts a pre-issued token; no Huawei/AGC exchange |
| Tool gateway / MCP / Composio | ❌ | Not connected |
| Account isolation / secure storage | 🟡 | Bearer token stays server-side; chat data in localStorage |
| Automated UI tests | ✅ | Playwright: chat, attachments/PDF, artifacts, sharing, retry/clear, memory, skills, discovery search, offline banner, language, protocol, RSS, backup, Orbit fallback, mobile |
| Unit tests | ✅ | 75 tests for mock logic, scenarios, A2UI, RSS, transport, sessions, backup, attachments, skills and artifacts |
| Accessibility audit | ✅ | axe critical checks for home and settings |
| Deployment / PWA | ✅ | GitHub Pages, Dockerfile and compose self-hosting |
| Android shell | 🟡 | PWA install works; Capacitor planned only for native features |
