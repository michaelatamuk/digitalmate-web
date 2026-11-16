# Hive bridge (reference implementation)

A dependency-free Node service that implements [the Hive contract](../../docs/hive-bridge-contract.md),
so the web client can be exercised against a real HTTP + SSE server instead of the in-process mock.

```bash
npm run bridge:hive                 # http://127.0.0.1:8787/api/hive
HIVE_BRIDGE_PORT=9000 npm run bridge:hive
HIVE_BRIDGE_TOKEN=secret npm run bridge:hive
```

Point the web app at it:

```bash
VITE_HIVE_BRIDGE_URL=http://127.0.0.1:8787 npm run dev
```

The client probes `/api/hive/capabilities` first, so the sheet shows `Hive bridge` and
`Contract v1 · steer, queue, preempt, artifacts, memoryCutoff` when it connects.

## What it does

- Full endpoint set: `health`, `capabilities`, `snapshot`, `events` (SSE), `send`, `control`,
  `answer` (+ `answer/draft`), `stop`, `artifact/erase`, `memory/cutoff`, `reset`
- Idempotent `send`: replaying an `operationId` returns the same task instead of creating a second
- Canned task execution with the same shapes the mock uses: progress → `done` with an artifact, or
  `waiting_user` for prompts that look like sending mail, then `done` after the answer
- Stale targets answer `410 TARGET_STALE`, double answers `409 CONFLICT`, missing params
  `400 BAD_PARAMS`, unknown paths `404 UNKNOWN_METHOD` — the client maps each of these
- SSE frames carry `id:` so the client's `?since=` reconnect is meaningful, and a keep-alive comment
  every 15 s
- Optional bearer token (`HIVE_BRIDGE_TOKEN`), accepted as `Authorization` or `?access_token=`
  because `EventSource` cannot set headers

## What it is not

- **Not a model.** Task output is canned, exactly like the mock's. This proves the transport,
  stream, idempotency and error taxonomy — it does not make the assistant smarter.
- **Not durable.** State is in memory and dies with the process.
- **Not authenticated per user.** One token guards the whole process; there is no per-account scope.

## Tests

`tests/hiveBridgeServer.test.ts` starts the server on an ephemeral port and covers health,
capabilities, dedupe, a run to `done`, question → answer → `done`, Stop plus a `410` for a stale
target, an SSE frame, memory cut-off, and token enforcement.
