# Parity with the native app

Status legend: ✅ present · 🟡 partial/mock · ❌ absent

## Screens and flows

| Area | Web | Notes |
| --- | --- | --- |
| Home shell, greeting, suggestions | ✅ | Mock data |
| BeeBou mascot | ✅ | Home, avatar, thinking, about |
| Streaming chat | 🟡 | Simulated locally |
| Card detail sheets | ✅ | Travel, train and food |
| Guided demo | ✅ | Scripted walkthrough |
| Orbit rooms/sessions/task rows | ❌ | Single mock thread |
| Stop / retry / task clear | 🟡 | Stop works; retry/clear absent |
| Attachments and upload | 🟡 | Fake PDF chip only |
| Artifacts and preview | ❌ | Not implemented |
| Discovery feed | 🟡 | Local seeds, no real sources |
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
| A2UI surface renderer | ✅ | 16 components |
| Full component catalog | 🟡 | ~half of native catalog |
| JSONL parsing / partial updates | ❌ | Surfaces are built as objects |
| Layout merger / throttle | ❌ | Not implemented |
| Data-model pointer semantics | 🟡 | Basic paths only |
| Unknown component rejection | ✅ | Renders an error card |

Missing examples: `FlightBoard`, `ToolConnectCard`, `StripeReceivingAccountCard`, `List`,
`HeroBanner`, `MediaSlider`, `SceneTabs`, `MasonryGrid`, `SegmentedRingChart`,
`MultiSeriesLineChart`, `MatrixHeatmap`, `ExpandableCard`, `SkeletonCard`.

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
| Hotel / ride / payments / media | ❌ | Not implemented |
| Gmail send / calendar write | ❌ | Not implemented |
| Firecrawl / shopping / DeepSearch | ❌ | Not implemented |
| DailyBrief / BIM / multi-task | ❌ | Not implemented |

## Infrastructure

| Item | Web | Notes |
| --- | --- | --- |
| Real Orbit/WorkSwarm transport | ❌ | Planned via bridge |
| Real authentication | ❌ | Native only today |
| Tool gateway / MCP / Composio | ❌ | Not connected |
| Account isolation / secure storage | ❌ | localStorage only |
| Automated UI tests | ❌ | Build only |
| Unit tests | ✅ | 9 tests for mock logic/localization |
| Accessibility audit | ❌ | Not yet |
| Deployment / PWA | ❌ | Not yet |
