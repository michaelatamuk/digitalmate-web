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
- [ ] Old gateway token revoked after a successful rotation
- [ ] Pages deploy and Android artifact are green
