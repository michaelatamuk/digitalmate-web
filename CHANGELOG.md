# Changelog

## 0.5.0 — 2026-11-16

Hive (Beebou + Bees) arrives as a local-first preview, and the PWA gets share and notification
plumbing for it.

### Added

- **Hive** under **More → Hive**: Beebou and three Bees (Scout, Forge, Ledger) with task lanes,
  question cards, queue/steer/preempt, Stop, artifacts, reports and per-lane memory with a cut-off.
- Activity lanes: a bounded cursor log with unread badges, `New` markers, per-entry follow-ups and
  an explicit notice when older activity was trimmed.
- Attachments: pick real files (five per draft), see size and image thumbnails, remove them before
  sending. Bytes stay on the device.
- Shared text from Android/desktop lands in the selected Bee's draft; a share no longer goes
  nowhere if Hive is disabled.
- Background completions raise a notification (`<Bee> finished` / `<Bee> needs you`) while the Hive
  sheet is closed; tapping it opens the task. Permission is requested on the first send.
- `HiveMode` flag: `VITE_HIVE_MODE=off|mock|bridge`, with a `?hive=` runtime override, so a build
  can ship without Hive.
- `BridgeHiveTransport` for a future `/api/hive/*` backend: snapshot + SSE stream, version and
  capability negotiation, typed errors, operation ids and resume after a dropped stream.
- Hive store is versioned (v3) with migration from v1/v2 and portable export/import backups.

### Changed

- Shared text now opens the Hive sheet instead of pre-filling the chat composer (unless Hive is
  off).

### Verified

- 144 unit tests, 40 Playwright tests (including Hive accessibility, mobile overflow, offline Hive,
  a stubbed-notification flow and a performance budget: open 458 ms, 60-row feed 54 ms).

## 0.4.0

Previous release: account-free bilingual chat, discovery, tasks, artifacts, memory, skills, Labs
and the Android shell.
