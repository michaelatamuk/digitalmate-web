# Architecture

This project starts as a browser-only mock and is organised so the mock can be replaced by a
real Jiuwen/Orbit client without rewriting the UI.

## Current layers

```text
┌──────────────────────────────────────────────────────────────┐
│ React UI                                                     │
│  App shell · Home · Chat · Discovery · Skills · Settings     │
│  A2UI renderer · BeeBou                                      │
├──────────────────────────────────────────────────────────────┤
│ Transport                                                    │
│  ChatTransport · MockChatTransport (default)                 │
│  OrbitChatTransport → POST /api/orbit/turn (SSE)             │
├──────────────────────────────────────────────────────────────┤
│ Local domain / mock                                          │
│  mockEngine.ts → thinking + text + A2UI surface objects      │
│  seed.en.ts / seed.zh.ts                                     │
│  surfaces.en.ts / surfaces.zh.ts                             │
│  localStorage persistence                                    │
├──────────────────────────────────────────────────────────────┤
│ Local dev bridge (`server/`)                                 │
│  GET /api/rss · SSRF guard · RSS/Atom/RDF parser             │
│  GET /api/orbit/health · POST /api/orbit/turn                │
│  WSS upstream with server-side Bearer token                  │
├──────────────────────────────────────────────────────────────┤
│ Production PWA (no account required)                         │
│  manifest + service worker · shell/assets cached             │
│  offline reload · /api requests are never cached             │
└──────────────────────────────────────────────────────────────┘
```

## Target layers

```text
UI (React)
  ↓
Transport interface                              (implemented)
  ├── MockChatTransport                          (default today)
  └── OrbitChatTransport → bridge SSE            (opt-in)
  ↓
Protocol
  ├── A2UI JSONL parser / surface store          (implemented)
  ├── Orbit request/response/event contracts     (bridge implemented)
  └── Session/task state reducer                 (not yet)
  ↓
Local helpers / bridge                           (dev/preview)
  ├── RSS fetch + parse proxy
  ├── Orbit WSS proxy + token isolation
  ├── Account exchange / production auth         (future)
  └── Snapshot reconciliation / reconnect        (future)
```

## Hive runtime

Hive (the Bee lanes) follows the same rule as chat: the UI talks to one transport interface, so the
offline demo and a real service are interchangeable.

```text
HiveSheet (UI)
  ↓ commands: send · steer/queue/preempt · answer · stop · erase · memory cut-off
HiveTransport (src/transport/hive.ts)
  ├── MockHiveTransport        default, offline, in-browser state machine
  └── BridgeHiveTransport      HTTP + SSE against services/hive-bridge
  ↓ events: snapshot · task · message · lane   (each carries a full HiveSnapshot)
Domain   src/domain/hive.ts                 types, selectors, validation, backup envelope
State    src/state/hiveStore.ts              versioned persistence + v1→v3 migration
         src/state/hiveReplay.ts             record/replay an event stream
Upstream src/transport/hiveUpstream.ts       maps v3.1 rows into the domain
```

Rules the implementation keeps:

- **The transport owns state; the UI is a projection.** Every mutation emits an event carrying a
  complete snapshot, so rendering any event out of order is safe and replay is exact.
- **Selection is client-owned.** Lane and task selection live in the UI. A server snapshot replaces
  data but never moves the reader; `applySnapshot` restores the current selection after swapping.
- **Commands carry operation ids.** A retried send reuses its `operationId`, so a lost response
  cannot create a second task.
- **Persistence is a store, not a side effect.** `MockHiveTransport` writes through `HiveStore`
  (`digitalmate.hive.v2`; legacy `digitalmate.hive.v1` is migrated on read and dropped on the next
  write). Corrupt, missing or full storage degrades to an empty demo instead of a crash.
- **Recorded events replay without a transport.** `recordHiveEvents()` collects the stream and
  `replayHiveEvents()` feeds it to a listener — synchronously for tests, stepped for a future UI.
- **A configured-but-broken bridge is reported, never masked.** `createHiveTransport()` chooses the
  bridge only when `VITE_HIVE_BRIDGE_URL` is set; the sheet shows `Unavailable` with the reason
  rather than silently serving fake data.

The reference bridge in `services/hive-bridge/server.mjs` is dependency-free Node. It exists to
prove the contract in `docs/hive-bridge-contract.md`, not to be the production Hive runtime; a real
deployment implements the same endpoints in front of its own Bee service.

**Live model backend.** `services/oj-bridge/server.mjs` adapts the same client contract to a real
OpenJiuwen runtime: it forwards `POST /api/orbit/turn` to JiuwenSwarm's `POST /api/v1/chat`
(streaming) and maps its frames into the app's events. The app selects it at runtime with
**Settings → Live backend**; the choice lives in `localStorage.digitalmate.liveBackend` and overrides
`VITE_API_BASE`, so one APK can address any deployment. If the service is unreachable the app says
so — it never silently falls back to mock data once a URL is set.

## Why a bridge is needed for the browser

The native app authenticates with Huawei Account Kit or AGC and obtains a Jiuwen Gateway
Bearer token. A browser cannot safely reproduce that native exchange, and provider secrets
must never be shipped to the client. The web deployment therefore needs a small trusted
service that:

- performs or proxies the account exchange,
- stores the short-lived Gateway token server-side or in an HttpOnly session,
- opens the WSS connection to the gateway,
- forwards only the JSON protocol frames to the browser.

Android can replace the bridge with native authentication and a native WebSocket client.

## Android options

The protocol and domain model should stay framework-agnostic so the Android decision remains
open.

| Option | Reuse | Trade-off |
| --- | --- | --- |
| **Capacitor shell** | Reuse the whole web app | Fastest; limited native integration and performance |
| **React Native** | Share TypeScript protocol/domain; rewrite UI | Good balance, but still a second UI |
| **Native Kotlin + Compose** | Share contracts/specs; rewrite UI and transport | Best integration and performance; highest effort |
| **Kotlin Multiplatform** | Share protocol/domain logic, native UI | Strong long-term choice; more setup now |

Recommended sequence: keep the protocol layer isolated in `src/protocol` (or a future
`packages/protocol`), prove it against a real gateway in the web client, then choose the
Android path.

## Non-goals for this repository

- Vendoring the native DigitalMate application or its HAP build.
- Shipping Gateway/provider credentials in browser code.
- Claiming real bookings, payments, sends or orders from the mock.
- Requiring an account or login for local features. The Orbit bridge is optional and falls
  back to the local mock; the production build also works offline from the PWA cache.
