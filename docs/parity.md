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
| Attachments and upload | ✅ | Local picker, text/image preview, PDF metadata; no upload |
| Artifacts and preview | 🟡 | Local text/image preview; PDF text and rich artifacts absent |
| Discovery feed | 🟡 | Local seeds plus real RSS/Atom import via local proxy |
| Discovery search mode | ✅ | Searches local and imported RSS inventory |
| Saved cards / share | ✅ | Save works and cards or replies can be shared |
| Skill center | 🟡 | Install/toggle only |
| Skill detail / publish / OAuth | ❌ | Not implemented |
| Memory profile | ✅ | Editable local profile, persisted |
| Memory edit / forget / evidence | ✅ | Edit, forget and per-section evidence notes are local |
| Calendar read | ✅ | Mock schedule |
| Calendar event create | 🟡 | Local browser state only |
| Login / onboarding | ❌ | Not required — the app works fully without an account |
| Account switching | ❌ | Not applicable; no account or login gate |
| Settings / app update | 🟡 | Demo settings, version display and PWA update check |
| Notifications / background tasks | 🟡 | Browser notification when hidden and permitted |
| Offline use | ✅ | Production PWA shell cached; local data persists |
| Local backup | ✅ | Export/import JSON in Settings; validated and scoped to app keys |
| Home-screen widgets / atomic services | ❌ | Native only |

## A2UI and protocol

| Item | Web | Notes |
| --- | --- | --- |
| A2UI surface renderer | ✅ | 31 components |
| Full component catalog | 🟡 | ~two-thirds of native catalog |
| JSONL parsing / partial updates | ✅ | `src/protocol/a2ui` parser + store |
| Layout merger / throttle | ❌ | Not implemented |
| Data-model pointer semantics | 🟡 | Basic paths only |
| Unknown component rejection | ✅ | Renders an error card |

Missing examples: `StripeReceivingAccountCard`, `ThinkingCard` (the chat currently uses a
custom thinking card).

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
| Automated UI tests | ✅ | Playwright: chat, attachments, sharing, retry/clear, memory, discovery search, language, protocol, RSS, backup, Orbit fallback, mobile |
| Unit tests | ✅ | 52 tests for mock logic, scenarios, A2UI, RSS, transport, sessions, backup and attachments |
| Accessibility audit | ✅ | axe critical checks for home and settings |
| Deployment / PWA | ✅ | Installable production build with offline shell |
