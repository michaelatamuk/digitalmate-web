# Orbit / Jiuwen connection notes

These are working notes for the real transport. They describe the behaviour observed in the
native DigitalMate client and its public documentation.

The web app now implements an optional bridge in `server/orbit.ts` plus
`src/transport/orbit.ts`. It does **not** perform the Huawei/AGC account exchange yet; it
accepts a pre-issued Bearer token on the server. Without configuration the app stays on the
local mock transport.

## Topology

```text
Client
  → WSS to a Jiuwen/Agent DX gateway
    → AgentBinding / Environment
      → Orbit or JiuwenSwarm harness
```

The client sees a single gateway endpoint. The current native defaults use:

```text
wss://<gateway-host>/orbit/ws?binding_id=default   # Orbit
wss://<gateway-host>/ws                            # legacy WorkSwarm
```

`binding_id` is an Agent DX `AgentBinding` concept. The gateway authenticates the caller,
maps the binding to an environment and routes data traffic to the harness. The DigitalMate
repository does not vendor Agent DX; a self-hosted deployment may put a different gateway in
front of Orbit/WorkSwarm.

## Authentication

The native app uses the account session rather than a fixed token:

```text
Huawei Account Kit authorization code
  or AGC access token
  → HTTPS POST /api/v1/auth/huawei/login
    or /api/v1/auth/agc/login
  → { userId, token, tokenType: "Bearer", expiresIn }
  → secure token storage
  → WSS handshake: Authorization: Bearer <token>
```

Rules observed in the client:

- Auth base URL and WebSocket host must match.
- Orbit URL must be `wss://`; only a `binding_id` query parameter is allowed.
- Fixed Cookie/Bearer values in app config are rejected.
- A custom CA can be supplied for a test environment; TLS verification is not disabled.
- Tokens are not logged.
- Credential rotation replaces the socket; revocation/account switch stops the runtime.
- A browser cannot perform the native account exchange. The web client needs a bridge.

## Orbit wire protocol

Requests are JSON:

```json
{
  "id": "orbit-1",
  "method": "orbit.request",
  "params": {
    "action": "room.message",
    "room_id": "...",
    "text": "Find a train to Shanghai tomorrow",
    "submission_id": "uuid-...",
    "agent_id": "orbit"
  }
}
```

Responses:

```json
{ "id": "orbit-1", "ok": true, "result": { "room_id": "...", "task_id": "..." } }
```

```json
{ "id": "orbit-1", "ok": false, "error": { "code": "...", "message": "..." } }
```

Events carry no request id:

```json
{ "event": "orbit.task.text", "task_id": "task-...", "text": "...", "final": false }
```

Actions currently used by the client include `room.home`, `snapshot`, `room.create`, and
`room.message`. Events include `orbit.changed` and `orbit.task.text`.

Operational rules:

- `room.home` is the connection/authorization check and returns a snapshot.
- Request acceptance is not task completion; completion arrives through events/snapshots.
- `submission_id` is a UUID; ambiguous submissions are not automatically replayed.
- On reconnect, the client should reconcile with a snapshot.

## Implemented web bridge

Configuration:

```text
ORBIT_GATEWAY_URL      wss://host/orbit/ws?binding_id=default
ORBIT_TOKEN            Bearer token (temporary local testing only)
ORBIT_TOKEN_FILE       path to a token file (preferred)
ORBIT_BINDING_ID       optional binding override
ORBIT_ALLOW_INSECURE_WS=1   allow ws:// for a local gateway only
```

Browser endpoints:

```text
GET  /api/orbit/health   { configured, mode, gatewayHost, bindingId }
POST /api/orbit/turn     { text, roomId?, submissionId? } → text/event-stream
```

One turn:

1. the browser posts to `/api/orbit/turn`;
2. the bridge opens a WSS connection with `Authorization: Bearer …`;
3. sends `room.home` and resolves the room id from the result/snapshot;
4. sends `room.message` with the text and `submission_id`;
5. maps `orbit.task.text` to SSE text events and `final: true` to `done`;
6. maps task errors to an SSE error and closes the socket.

Session continuity:

- the bridge sets an HttpOnly `dm_orbit_session` cookie with a 30-minute TTL;
- the room id is remembered per session and reused when `roomId` is omitted;
- completed `submission_id` values are cached in memory; a repeat replays the cached text
  with a `Reuse cached result` thinking step instead of re-sending the action;
- errors are cached as completed results so retries do not loop.

`/api/orbit/health` includes the remembered `roomId` when a session cookie is present.

Limits and safety:

- `wss://` only unless explicitly overridden;
- 12-second request timeout, 120-second turn timeout;
- 32 KB request body limit;
- token never sent to the browser and never included in health output;
- a fresh socket per turn, with no task replay.

Remaining work: account exchange, persistent session storage (the current cache is per-process),
snapshot reconciliation, and reconnect/backoff. A browser cannot safely hold the Gateway token,
so those pieces belong in the bridge.

## Local fake gateway

`npm run bridge:fake` starts `scripts/fake-orbit.mjs` on `ws://127.0.0.1:8899/orbit/ws`.
It accepts any Bearer token, answers `room.home` with `room_demo`, and streams one echoed
`orbit.task.text` event followed by `final: true`. Use it with:

```powershell
$env:ORBIT_GATEWAY_URL='ws://127.0.0.1:8899/orbit/ws'
$env:ORBIT_TOKEN='test-token'
$env:ORBIT_ALLOW_INSECURE_WS='1'
npm run dev
```

This is a smoke-test harness for the bridge path, not a replacement for the real gateway.

## Legacy WorkSwarm protocol

The older path uses the same Bearer token and `/ws`:

```json
{ "type": "req", "id": "dm-...", "method": "chat.send", "params": { "...": "..." } }
```

Response/event envelopes are `{ "type": "res" ... }` and `{ "type": "event" ... }`. Methods
include `session.*`, `project.*`, `chat.send`, `chat.user_answer`, `chat.interrupt` and
`models.list`.

## Tool gateway (separate from chat)

The client's local aggregation tools use `local://aiphone-tools`, with an optional Node
gateway exposing `/api/aiphone/tool`, `/mcp/call` and `/v1/tool/call`. This is not the Orbit
chat transport.

## References in the original project

- `cloud-adapter/.../orbit/OrbitProtocol.ets`
- `cloud-adapter/.../orbit/OrbitSocket.ets`
- `entry/.../cloud/orbit/OrbitGatewaySession.ets`
- `entry/.../account/gateway/GatewayAuthClient.ets`
- `docs/architecture/orbit-test-kit-integration.md`
- `docs/developer_guide/gateway-account-kit-auth.md`
