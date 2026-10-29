# Threat model (local-first web demo)

This is a working threat model for the **account-free** web app. It is not a formal audit.

## Assets

- local chats, archived chats and calendar events
- memory profile and evidence notes
- saved cards, reactions, RSS subscriptions and imported skills
- local JSON backups
- the optional Orbit bearer token (server-side only)
- the service worker cache

## Trust boundaries

```text
Browser UI / localStorage
  ├── local RSS proxy (/api/rss) → arbitrary public feed host
  ├── optional Orbit bridge (/api/orbit) → Jiuwen/Orbit gateway
  └── service worker cache → same-origin assets only
```

## Main threats and mitigations

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Account takeover | No account or login exists; local mode is the default | None for local use |
| Token exposure | Orbit token stays on the bridge, never in browser code or health output | A compromised server/host can read it |
| Prompt/response HTML injection | React escapes text; RSS summaries have HTML stripped; A2UI renders a fixed component catalog | A future component must not use raw HTML |
| Malicious feed URL / SSRF | http(s) only; loopback and private ranges blocked; redirects revalidated; 2 MB and timeout limits | DNS rebinding is not fully prevented |
| Malicious backup import | JSON app marker/version checks; only `digitalmate.web.v2.*` keys restored; unrelated storage untouched | A crafted but valid backup can still replace local app data |
| Malicious skill bundle | App/kind/version checks; ids sanitised; 50-skill cap; forced local install state | Imported metadata is not code-signed |
| Malicious A2UI payload | Unknown components render an error card; data paths are bounded | Deeply nested payloads could still cause client work |
| CSRF on bridge endpoints | Same-origin usage, `SameSite=Lax` session cookie | No explicit CSRF token; add an origin check before public deployment |
| Service worker serving stale code | Versioned cache, network-first navigation, explicit update check | Users may keep an old tab open |
| Local device access | Data lives in browser storage | Anyone with the unlocked profile can read it |

## Privacy

- No analytics, telemetry or crash upload is present.
- RSS and Orbit requests are optional and only happen when the user uses those features.
- Attachments and PDF text extraction run in the browser; contents are not stored in backups.
- The bridge does not log tokens; errors redact the token by construction.

## Deployment requirements

- Serve over HTTPS so the PWA and clipboard APIs work properly.
- Put the Orbit bridge behind authentication or a private network; it accepts a pre-issued
  bearer token.
- Add an explicit `Origin`/`Host` check if the bridge is exposed beyond localhost.
- Keep `ORBIT_TOKEN_FILE` outside the image/workspace and mount it read-only.

## Out of scope

- Huawei/AGC account exchange (not used by this account-free build)
- Native Android permissions and background execution
- Multi-tenant isolation (single local profile)
