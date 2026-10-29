# Android decision

## Decision

**PWA-first, Capacitor only when native capabilities are required.**

The app already works as an installable PWA with offline caching, local storage and no
account. That is enough for phone use on Android today. A native shell should be added only
when one of these is genuinely needed:

- background notifications while the app is closed
- home-screen widgets or atomic services
- reliable file/system intents beyond the browser picker
- a Play Store distribution requirement

## If Capacitor is added

Use Capacitor rather than React Native or a second Compose UI, because the existing React UI
and protocol layer can be reused almost unchanged.

Planned shape:

```text
web build (dist) → Capacitor WebView
                  → native plugins for notifications, share and files
                  → optional hosted bridge for RSS / Orbit
```

Constraints:

- Keep **Local mode** as the default. No login gate, no account requirement.
- The web bundle must still run standalone when no bridge URL is configured.
- `window.localStorage` remains the source of truth for local data; Capacitor storage can
  wrap it later if needed.
- RSS import and the Orbit bridge use `/api/*`, which do not exist inside a bundled WebView.
  Either point `VITE_API_BASE` at a hosted bridge or hide those actions in the native build.
- Do not add Huawei/AGC login for local features.

## First native milestone

1. Scaffold Capacitor with `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
2. Reuse `dist/` as the web directory.
3. Verify: home, chat, attachments, local backup, PWA-independent reload.
4. Add native share and local notifications.
5. Only then evaluate widgets, Play Store signing and background tasks.

## Not planned

- A separate native UI rewrite
- Account-only startup
- Cloud-only storage
- Requiring the Orbit bridge to launch
