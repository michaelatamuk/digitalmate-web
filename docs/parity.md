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
| Stop / retry / task clear | 🟡 | Stop works; retry/clear absent |
| Attachments and upload | 🟡 | Fake PDF chip only |
| Artifacts and preview | ❌ | Not implemented |
| Discovery feed | 🟡 | Local seeds plus real RSS/Atom import via local proxy |
| Discovery search mode | ❌ | Interest feed only |
| Saved cards / share | 🟡 | Save works; share absent |
| Skill center | 🟡 | Install/toggle only |
| Skill detail / publish / OAuth | ❌ | Not implemented |
| Memory profile | 🟡 | Static |
| Memory edit / forget / evidence | ❌ | Not implemented |
| Calendar read | ✅ | Mock schedule |
| Calendar event create | 🟡 | Local browser state only |
| Login / onboarding | ❌ | Skipped |
| Account switching | ❌ | Single local demo account |
| Settings / app update | 🟡 | Demo settings; browser notifications only |
| Notifications / background tasks | 🟡 | Browser notification when hidden and permitted |
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
| Automated UI tests | ✅ | Playwright: home, chat, language, protocol, RSS, Orbit fallback, mobile |
| Unit tests | ✅ | 43 tests for mock logic, scenarios, A2UI, RSS, transport and sessions |
| Accessibility audit | ✅ | axe critical checks for home and settings |
| Deployment / PWA | ❌ | Not yet |
