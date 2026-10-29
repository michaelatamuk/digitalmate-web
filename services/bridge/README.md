# Web bridge

Standalone production server for the built PWA and the optional bridge APIs.

```bash
npm run build
npm run start
```

Environment:

```text
PORT=4173
HOST=0.0.0.0
ORBIT_GATEWAY_URL=wss://gateway.example.com/orbit/ws?binding_id=default
ORBIT_TOKEN_FILE=/run/secrets/orbit-token   # preferred
# ORBIT_TOKEN=...                          # temporary local testing only
```

Endpoints:

```text
GET  /api/rss?url=…       RSS/Atom/RDF proxy with SSRF, timeout and size guards
GET  /api/orbit/health    bridge status, room id and delegated token source
POST /api/orbit/turn      SSE chat turn through the Orbit WSS gateway
GET  /api/orbit/snapshot  last room snapshot stored for this session
POST /api/orbit/reset     clear the bridge session
```

Security model:

- no interactive login; the bridge uses a **delegated bearer token** supplied on the server
- tokens are never returned to the browser or logged
- cross-origin POST requests with a mismatched `Origin` are rejected
- session cookie is HttpOnly and SameSite=Lax
- request bodies are size-limited; upstream requests have timeouts

The server is implemented in `services/bridge/index.ts`, reusing the same
`server/rss.ts` and `server/orbit.ts` handlers as the Vite dev/preview middleware.
