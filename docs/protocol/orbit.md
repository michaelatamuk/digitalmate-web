# Orbit / Jiuwen connection notes

These are working notes for the future real transport. They describe the behaviour observed
in the native DigitalMate client and its public documentation. The mock web app does not use
this connection yet.

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
