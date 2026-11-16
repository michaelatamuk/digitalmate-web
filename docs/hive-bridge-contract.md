# Hive bridge contract

The web app can run Hive against a local mock (default) or a real bridge. The bridge is selected
at build time:

```bash
VITE_HIVE_BRIDGE_URL=https://bridge.example.com   # enables the bridge transport
VITE_HIVE_BRIDGE_TOKEN=...                        # optional bearer token
```

With no URL the local mock is used and the app stays fully usable offline. A configured bridge that
fails is reported in the Hive sheet (`Hive bridge unavailable: <reason>` with **Retry**) — it is
never silently replaced with mock data.

## Endpoints

All responses are JSON. Every mutating response carries a **full snapshot**, so the client never has
to guess state after a command.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/hive/capabilities` | — | `{ version: 1, capabilities: { steer, queue, preempt, artifacts, memoryCutoff } }` |
| GET | `/api/hive/snapshot` | — | `HiveSnapshot` |
| GET | `/api/hive/events` | — | `text/event-stream`, `data: {"type": "...", "snapshot": {...}}` |
| POST | `/api/hive/send` | `{ laneId, text, attachments? }` | `{ taskId, snapshot }` |
| POST | `/api/hive/control` | `{ taskId, action: "steer" \| "queue" \| "preempt", text }` | `{ snapshot }` |
| POST | `/api/hive/answer` | `{ taskId, questionId, text }` | `{ snapshot }` |
| POST | `/api/hive/answer/draft` | `{ taskId, questionId, text }` | `{ snapshot }` (may be ignored) |
| POST | `/api/hive/stop` | `{ taskId }` | `{ snapshot }` |
| POST | `/api/hive/artifact/erase` | `{ artifactId }` | `{ snapshot }` |
| POST | `/api/hive/memory/cutoff` | `{ laneId, before }` (`before: 0` clears) | `{ snapshot }` |
| POST | `/api/hive/reset` | `{}` | `{ snapshot }` |

`Authorization: Bearer <token>` is sent when a token is configured. The event stream uses
`?access_token=` because `EventSource` cannot set headers; the bridge must accept either.

## Idempotency

Every POST body also carries a client-generated `operationId` (UUID). Repeating the same
`operationId` must return the same result — for `/send`, the **same task id**, never a second task.

- Transient failures (network error, timeout, 5xx) leave the command pending in the sheet, which
  offers **Retry**; the retry re-posts the identical body, operation id included.
- Refusals (409, 410/412, 4xx) are not retried — the command is wrong, so repeating it is pointless.
- The client does not queue commands locally: a command either succeeds on the bridge or is offered
  for an explicit retry.

## Snapshot shape

`HiveSnapshot` is defined in `src/domain/hive.ts` and validated by `readHiveSnapshot`, which fills
fields added by later versions with empty values. Current store version: **3**.

Required arrays: `lanes`, `tasks`, `messages`. Optional-with-defaults: `activity`,
`activityReadAt`, `activityTrimmed`, `memory`, `memoryCutoffAt`, `selectedLaneId`,
`selectedTaskId`.

A reference payload lives at `tests/fixtures/hive-bridge-snapshot.json` and is used by
`tests/hiveBridge.test.ts`.

## Error handling

A refusal and an outage are different things:

- **Refusals** (`conflict` 409, `stale` 410/412) leave the transport `ready`. The client records the
  conflict (`HiveTransportStatus.lastConflict`, with the task it targeted), refreshes the snapshot,
  and the sheet says `That task changed on the bridge. The latest state is shown.` — so a retry
  afterwards targets current state.
- **Transient failures** (network, timeout, 5xx) mark the bridge `unavailable` and keep the command
  for **Retry** with the same operation id.
- Non-2xx responses throw `HiveTransportError` with a `kind`:

  | HTTP | `kind` | Message shown |
  | --- | --- | --- |
  | 401 / 403 | `unauthorized` | The Hive bridge rejected this session. Check the access token. |
  | 409 | `conflict` | That task changed on the bridge. Refresh and try again. |
  | 410 / 412 | `stale` | That target is out of date. Refresh and try again. |
  | 404 / 405 / 501 | `unsupported` | This Hive bridge does not support that action. |
  | 5xx | `unavailable` | The Hive bridge is unavailable (HTTP 5xx). |
  | other 4xx | `unknown` | The Hive bridge rejected the request (HTTP n). |
  | abort | `timeout` | The Hive bridge did not answer in time. |

- Requests time out after 12 s.
- Any failure sets the transport status to `unavailable` with that message; the sheet shows it and
  offers **Retry**.
- Local backup import is disabled while a bridge owns the state (the bridge is authoritative).

## Version negotiation and capabilities

1. The client calls `/api/hive/capabilities` before the snapshot.
2. `version` greater than the client's (`1`) → the bridge is refused with
   `The Hive bridge speaks vN; this app supports v1. Update the app or the bridge.` No stream is
   opened and no mock data is substituted.
3. A missing endpoint (404/405/501) → the **v1 baseline** is assumed, `negotiated: false`, and the
   sheet appends `(probe missing)` to its diagnostics line.
4. `capabilities` entries are opt-out: only an explicit `false` hides a feature. Unknown keys are
   ignored. The UI hides `Queue`, `Steer`, `Preempt` and memory cut-off controls the bridge
   disables.
5. When ready, the sheet shows `Contract v1 · <features>` under the header.

## Resume after a dropped stream

1. Every SSE event may carry an `id:`. The client remembers the last one and, on reconnect, asks
   for `GET /api/hive/events?since=<id>`.
2. The client always re-fetches `/api/hive/snapshot` before reopening the stream, so a bridge that
   cannot replay events only has to return full state.
3. Reconnects are automatic with exponential backoff: **1 s, 2 s, 4 s … capped at 30 s**, and stop
   when the sheet unmounts or the user disposes the transport. `Retry` resets the backoff.
4. While reconnecting the status is `connecting` with `Resuming the Hive bridge…`; a lost stream is
   reported as `unavailable` + `The Hive event stream was lost.` with the same backoff running.

