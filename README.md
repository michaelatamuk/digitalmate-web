# DigitalMate Web

An independent, **bilingual (English / 简体中文)** web companion for the DigitalMate
HarmonyOS agent app. It starts as a mock-first prototype and is structured to grow into a
real Jiuwen/Orbit-connected client and, later, an Android app.

> **This repository contains only the new web implementation.** The original DigitalMate
> native app, its ArkTS modules, build system and test suites are not included.

![DigitalMate Web home](docs/assets/home.png)

| Chat | Chinese settings |
| --- | --- |
| ![Chat](docs/assets/chat.png) | ![Settings in Chinese](docs/assets/settings-zh.png) |

## Status

- Mock-first: no real backend or account login yet
- Full English and Simplified Chinese UI, switchable in **Settings → Language**
- BeeBou mascot on the home screen, assistant avatar, execution trace and about card
- Card detail sheets, local calendar event creation and a guided demo mode
- A2UI JSONL parser and surface store with a protocol-driven demo surface
- 28 unit tests for the mock engine, protocol parser/store, scenarios and RSS handling
- Responsive phone UI that runs in Chrome
- `npm run build`, `npm test` and the GitHub Actions build are expected to pass

The next milestone is moving from the local mock engine to a protocol layer that can talk to
a Jiuwen/Orbit gateway. See [docs/roadmap.md](docs/roadmap.md) and
[docs/architecture.md](docs/architecture.md).

## Features

| Area | Current behaviour |
| --- | --- |
| Home | Live clock, greeting, BeeBou welcome mascot, suggestions, continue-last-chat |
| Chat | Streaming mock replies, execution trace, markdown, follow-up chips |
| Card details | Travel, train and food cards open a detail sheet with source and copy actions |
| A2UI | Declarative renderer for 28 components, 12 scenarios and a JSONL protocol demo |
| Discovery | Topic/source filters, reactions, saved cards, detail reader, real RSS/Atom import |
| Skills | Install, enable, disable and uninstall demo skills |
| Memory | Static “About you” profile with MBTI, tags and sections |
| Calendar | Local event creation with a confirmation sheet and updated schedule card |
| Hotel / ride / payment | Mock comparison cards with refundable tags, fare estimates and payment review |
| Media | Scene tabs and a media slider for podcasts and short video |
| Guided demo | One-click scripted walkthrough of travel, calendar, food, discovery and memory |
| Settings | Language, backend preference, notifications, trace, reduced motion, reset |
| History | Archived conversations when starting a new chat |

Scenarios currently include travel, hotel, ride, payment review, media, food/coffee, social,
mail, calendar, document summary, weather and generic tool results.

## Quick start

```bash
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>.

Production build:

```bash
npm run build
npm run preview
```

Tests:

```bash
npm test
```

## Local RSS proxy

Discovery can import a real RSS 2.0, Atom or RDF feed during `npm run dev` and `npm run preview`.
The browser calls `GET /api/rss?url=…`; `server/rss.ts` validates the URL, follows at most three
redirects, enforces a 9-second timeout and a 2 MB response limit, and rejects loopback/private
hosts. Feed XML is parsed by `src/lib/rssParse.ts`, HTML is stripped from summaries, and up to
five usable items become feed cards stored in localStorage.

This is a development helper, not a production-hardened fetcher: DNS rebinding and egress
filtering belong in the future bridge deployment.

## Repository layout

```text
src/
  App.tsx                 app shell, state, mock streaming
  components/
    a2ui/                 A2UI surface renderer
    BeeBou.tsx            mascot component
    HomeView, ChatView, DiscoveryView
    DetailsSheet.tsx      travel/train/food detail sheet
    CalendarEventSheet.tsx local calendar event form
    Overlays.tsx          history, skills, settings, memory, detail
    Chrome.tsx            status bar, top bar, brand mark
  i18n/I18nContext.tsx    language context and tr(en, zh) helper
  data/
    seed.ts               language selector for seed fixtures
    seed.en.ts            English discovery cards, skills, memory profile
    seed.zh.ts            Chinese discovery cards, skills, memory profile
    surfaces.ts           language selector for A2UI surfaces
    surfaces.en.ts        English surface fixtures
    surfaces.zh.ts        Chinese surface fixtures
  protocol/a2ui/
    types.ts              JSONL envelope types
    parser.ts             line parser, component map and data-path updates
    store.ts              surface store keyed by surfaceId
    demo.ts               protocol-driven demo surface
  lib/
    mockEngine.ts         prompt → thinking / text / surface (both languages)
    markdown.tsx          small Markdown renderer
    storage.ts            localStorage helpers
    rss.ts                browser client for the local RSS proxy
    rssParse.ts           RSS 2.0 / Atom / RDF parser and HTML cleanup
  types.ts                shared UI, A2UI and RSS types
public/
  bee/                    BeeBou assets
docs/
  architecture.md         current layers and future Android/web split
  roadmap.md              mock → protocol → real backend → Android
  parity.md               feature coverage vs. the native app
  protocol/orbit.md       WSS/auth notes and known deployment topology
  protocol/a2ui.md        surface protocol and catalog coverage
services/
  bridge/                 future auth + WebSocket proxy for the web client
server/
  rss.ts                  dev/preview /api/rss proxy, size/redirect/SSRF guards
tests/
  mockEngine.test.ts      mock replies, localized data and calendar surfaces
  a2uiProtocol.test.ts    JSONL parser, surface store and protocol demo
  rssParse.test.ts        RSS/Atom parsing and proxy URL guards
```

## Path to Jiuwen/Orbit and Android

The current `mockEngine.ts` should eventually be replaced by a transport abstraction:

```text
React UI
  → Chat/Discovery transport interface
      → MockTransport (today)
      → OrbitTransport (future, through a local bridge)
```

A browser cannot safely perform the native Huawei/AGC login exchange or hold provider
secrets. The planned web path is therefore:

```text
Chrome → local Node bridge → Jiuwen/Orbit Gateway (WSS)
```

Android can connect directly to the gateway with its own native authentication. Possible
Android paths are documented in [docs/architecture.md](docs/architecture.md); the decision is
intentionally deferred until the protocol layer is stable.

## Attribution and branding

This is an **unofficial** project. It is inspired by
[openJiuwen-ai/DigitalMate](https://github.com/openJiuwen-ai/DigitalMate), which is licensed
under Apache-2.0.

The BeeBou mascot images in `public/bee/` are copied from the original project. They may be
subject to separate copyright, trademark or brand terms. Obtain permission or replace them
before commercial use or before implying official endorsement. See [NOTICE](NOTICE).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
