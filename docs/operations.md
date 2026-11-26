# Operations

This page covers the optional production bridge, environment configuration,
origin checks, credential rotation and the CI/CD pipeline. The app itself needs
no server: the static build and the Android shell work entirely on-device.

## Deployment targets

| Target | What is deployed | Workflow / command |
| --- | --- | --- |
| GitHub Pages | Static SPA with base `/digitalmate-web/` | `.github/workflows/deploy.yml` |
| Container / self-host | Static SPA + `/api/rss` + `/api/orbit/*` | `docker compose up -d --build` |
| Android | Capacitor shell around `dist/` | `.github/workflows/android.yml` |

The public Pages build has no server endpoints. RSS imports and Orbit mode need
the container bridge (or another host that runs `services/bridge`).

## Environment

Copy `.env.example` to `.env.local` for local development. In production, pass
the values through the container environment or your platform's secret store.

| Variable | Purpose | Required |
| --- | --- | --- |
| `HOST` | Bridge bind address (default `127.0.0.1`) | No |
| `PORT` | Bridge port (default `4173`) | No |
| `ORBIT_GATEWAY_URL` | `wss://` Orbit gateway endpoint | For Orbit |
| `ORBIT_TOKEN` | Delegated bearer token (short local tests only) | For Orbit |
| `ORBIT_TOKEN_FILE` | File containing the bearer token; preferred | For Orbit |
| `ORBIT_BINDING_ID` | Agent DX binding override | No |
| `ORBIT_ALLOWED_ORIGINS` | Extra origins allowed to call the bridge | For native/remote clients |
| `ORBIT_ALLOW_INSECURE_WS` | Allow `ws://` for local gateways | No |
| `VITE_API_BASE` | Absolute API base for static/native builds | No |
| `VITE_BASE` | Base path for Pages builds | Pages only |
| `VITE_HIVE_MODE` | `off`, `mock` or `bridge`; unset defaults to the local mock | No |
| `VITE_HIVE_BRIDGE_URL` | Hive service base URL; setting it selects bridge mode | For live Hive |
| `VITE_HIVE_BRIDGE_TOKEN` | Bearer token sent to the Hive service | For protected bridges |
| `HIVE_BRIDGE_PORT` | Reference Hive bridge port (default `8787`) | No |
| `HIVE_BRIDGE_TOKEN` | Shared secret the reference Hive bridge requires (optional) | No |

The token is read only by the server. It is never included in the static bundle,
the health response or client errors.

## Origin checks

`isSameOrigin` allows requests with no `Origin` header and requests whose origin
matches the request host. If a reverse proxy rewrites the host, the proxy must
forward `X-Forwarded-Host` and `X-Forwarded-Proto`; the scheme is compared when
`X-Forwarded-Proto` is present.

Separately hosted clients and the Capacitor shell send their own origin. Add the
exact origin to `ORBIT_ALLOWED_ORIGINS`:

```text
ORBIT_ALLOWED_ORIGINS=https://localhost,https://app.example.com
```

`https://localhost` is the default Capacitor Android origin. Add the production
web origin only if it is not served by the same host as the bridge. Do **not**
add `null` unless you deliberately support `file://` clients.

## Hive

Hive needs no server: the local demo runs the whole Bee workflow in the browser. A deployment only
configures the bridge when it wants Bee work to happen on a real service.

| `VITE_HIVE_MODE` | Behaviour |
| --- | --- |
| `off` | The Hive entry is hidden entirely |
| `mock` | Local demo, persisted per browser; works offline |
| `bridge` | Talks to `VITE_HIVE_BRIDGE_URL`; failures are shown as `Unavailable`, never faked |

Mode resolution, most specific first: `?hive=` URL override → stored choice
(`digitalmate.hive.mode`) → `VITE_HIVE_MODE` → presence of `VITE_HIVE_BRIDGE_URL` → `mock`.
The URL override is remembered, so `?hive=off` sticks for that browser until changed.

### Running the reference bridge

```bash
HIVE_BRIDGE_TOKEN=local-secret npm run bridge:hive      # 127.0.0.1:8787
VITE_HIVE_BRIDGE_URL=http://127.0.0.1:8787              # .env.local
VITE_HIVE_BRIDGE_TOKEN=local-secret                     # only if the token is set
```

The reference bridge is dependency-free Node and is meant for developing and proving the contract.
Bind it to a private interface; it allows any origin by default, so treat it like a dev tool, not a
public endpoint. When a token is set, REST calls send `Authorization: Bearer …` and the SSE stream
(which cannot set headers) sends `?access_token=…`.

### Persistence and recovery

- The local demo writes a versioned envelope to `localStorage` under `digitalmate.hive.v2`. A legacy
  `digitalmate.hive.v1` payload is migrated on read and removed on the next write.
- A corrupt, foreign or over-quota payload is ignored; the demo starts clean instead of crashing.
- **Settings → Export** gives a JSON backup; **Import** validates it (`kind`, snapshot shape) before
  replacing state. Interrupted tasks are restored as `stopped` (`Interrupted by reload`).
- To reset a browser: import a fresh backup, or clear the two keys above.

### Smoke checks

```bash
curl -fsS http://127.0.0.1:8787/api/hive/health
curl -fsS http://127.0.0.1:8787/api/hive/capabilities
curl -fsS http://127.0.0.1:8787/api/hive/snapshot
```

### Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Sheet shows `Unavailable` with `Failed to fetch` | Bridge not running or wrong URL | Start `npm run bridge:hive`, check `VITE_HIVE_BRIDGE_URL` |
| `Unauthorized` / 401 | Token mismatch | Set the same `HIVE_BRIDGE_TOKEN` for bridge and app |
| “speaks vN; this app supports v1” | Contract version skew | Upgrade the bridge or the app; the client refuses rather than misreading |
| Commands report `conflict`/`stale` | Another client changed the task | The sheet refreshes; re-run the action |
| Hive entry missing | `VITE_HIVE_MODE=off` or `?hive=off` | Change the env value or the URL override |

## Credential rotation

1. Issue a new delegated token at the Orbit gateway. Keep the old token active.
2. Write the new token to a file outside the repository, readable only by the
   bridge user (for example `chmod 600`), or update the secret store entry.
3. Restart the bridge so the new value is read:
   ```bash
   docker compose up -d
   ```
4. Confirm the startup log says `Orbit mode: live (...)` and contains no
   `[config]` warnings other than expected ones.
5. Send one Orbit turn from the app and confirm streaming works.
6. Revoke the old token at the gateway.
7. Check `docker compose logs --since 10m` for token material. Tokens are never
   logged, but rotate immediately if one appears in a proxy or gateway log.

Keep the old token valid until step 5 completes so a restart cannot lock the app
out. Rotate after any suspected exposure, staff change, or at a fixed interval
defined by the gateway owner.

## Health and smoke checks

```bash
curl -fsS http://127.0.0.1:4173/healthz
curl -fsSI http://127.0.0.1:4173/covers/photos/ai.jpg   # content-type: image/jpeg
curl -fsS  http://127.0.0.1:4173/api/orbit/health
```

`/healthz` is for orchestration and never needs configuration. `/api/orbit/health`
reports whether a gateway and delegated token are configured; it does not
return the token or its length.

Security headers are applied to every response: CSP, `nosniff`, `DENY` framing,
`no-referrer`, a restricted permissions policy, and HSTS when the proxy reports
`X-Forwarded-Proto: https`.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): type-check/build, unit tests, Playwright,
  and a container job that builds the image and verifies `/healthz`, the HTML
  shell, JPEG content type, CSP and `nosniff`.
- **Deploy** (`.github/workflows/deploy.yml`): builds with `VITE_BASE=/digitalmate-web/`
  and publishes to GitHub Pages.
- **Android** (`.github/workflows/android.yml`): builds a debug APK and uploads it
  as an artifact.

## Release checklist

- [ ] `npm test` and `npm run test:e2e` pass
- [ ] `npm run build` passes and the version is bumped in `package.json` and
      `android/app/build.gradle`
- [ ] `/healthz` and `/api/orbit/health` respond after deployment
- [ ] CSP does not block local assets, remote RSS images or the configured API base
- [ ] `ORBIT_ALLOWED_ORIGINS` contains every separate client origin
- [ ] Hive mode matches the intent: `mock` for the demo build, `bridge` with a reachable URL, `off`
      to hide it — and the Hive smoke checks above pass for `bridge`
- [ ] Old gateway token revoked after a successful rotation
- [ ] Pages deploy and Android artifact are green

## Live backend (OpenJiuwen)

The app runs on the local demo by default. A user can point it at a real service at runtime from
**Settings → Live backend**; the value is stored in `digitalmate.liveBackend` and wins over
`VITE_API_BASE`, so one APK can address any deployment.

What a live backend must serve:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/orbit/health` | `{configured:true, mode:"live", backend:"openjiuwen"}` when the service is ready |
| `POST /api/orbit/turn` | Chat turn, streamed as SSE events (`thinking`, `text`, `surface`, `error`, `done`) |
| `POST /api/orbit/reset` | Start a fresh session (optional) |

`services/oj-bridge` is a dependency-free reference implementation that forwards those endpoints to
JiuwenSwarm's `POST /api/v1/chat` and maps its frames:

```bash
OJ_BASE_URL=http://127.0.0.1:8770 npm run bridge:oj     # http://127.0.0.1:8790
```

Optional: `BRIDGE_TOKEN` requires `Authorization: Bearer …`; `OJ_BRIDGE_PORT` changes the port.

Behaviour when the backend is unreachable: chat shows "The live backend is unreachable" instead of
inventing an answer, and Hive reports the bridge as unavailable. Clearing the URL returns to the local
demo.

For a phone, the URL must be reachable from the device (LAN address or HTTPS). Android blocks
cleartext HTTP by default, so use HTTPS or a tunnel for anything beyond local testing.
