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
| GET | `/api/hive/snapshot` | — | `HiveSnapshot` |
| GET | `/api/hive/events` | — | `text/event-stream`, `data: {"type": "...", "snapshot": {...}}` |
| POST | `/api/hive/send` | `{ laneId, text, attachments? }` | `{ taskId, snapshot }` |
| POST | `/api/hive/control` | `{ taskId, action: "steer" \| "queue" \| "preempt", text }` | `{ snapshot }` |
| POST | `/api/hive/answer` | `{ taskId, questionId, text }` | `{ snapshot }` |
| POST | `/api/hive/stop` | `{ taskId }` | `{ snapshot }` |
| POST | `/api/hive/artifact/erase` | `{ artifactId }` | `{ snapshot }` |
| POST | `/api/hive/memory/cutoff` | `{ laneId, before }` (`before: 0` clears) | `{ snapshot }` |
| POST | `/api/hive/reset` | `{}` | `{ snapshot }` |

`Authorization: Bearer <token>` is sent when a token is configured. The event stream uses
`?access_token=` because `EventSource` cannot set headers; the bridge must accept either.

## Snapshot shape

`HiveSnapshot` is defined in `src/domain/hive.ts` and validated by `readHiveSnapshot`, which fills
fields added by later versions with empty values. Current store version: **3**.

Required arrays: `lanes`, `tasks`, `messages`. Optional-with-defaults: `activity`,
`activityReadAt`, `activityTrimmed`, `memory`, `memoryCutoffAt`, `selectedLaneId`,
`selectedTaskId`.

A reference payload lives at `tests/fixtures/hive-bridge-snapshot.json` and is used by
`tests/hiveBridge.test.ts`.

## Error handling

- Non-2xx responses throw `The Hive bridge answered <status>.`
- Requests time out after 12 s (`The Hive bridge did not answer in time.`)
- Any failure sets the transport status to `unavailable` with that message; the sheet shows it and
  offers **Retry**.
- Local backup import is disabled while a bridge owns the state (the bridge is authoritative).
