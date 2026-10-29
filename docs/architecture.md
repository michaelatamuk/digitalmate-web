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

### Why a bridge is needed for the browser

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
