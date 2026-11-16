# Release 0.5.0 — what changed on Android

Release page: <https://github.com/michaelatamuk/digitalmate-web/releases/tag/v0.5.0>
Direct APK: `releases/download/v0.5.0/app-debug.apk` (6.6 MB, MD5 `ecade487ab5e0e6d6501c9b9a6424ff3`)

Built from `01799b1`. `versionCode 7` / `versionName 0.5.0`, debug-signed, minSdk 24, targetSdk 36.

## How the delta was established

The previous APK was read back from the test device with `adb pull` (which, unlike `adb install`,
is not filtered on the build machine), then both APKs were unpacked and their web bundles compared:

| | 0.4.0 (previous) | 0.5.0 |
| --- | --- | --- |
| JS bundle | 462 KB | 516 KB |
| CSS | 92 KB | 105 KB |
| `Hive`, `Beebou`, `Scout`, `Ledger`, `Steer`, `Preempt` strings | absent | present |
| Topic manager, companion profiles, attach menu, recent-task resume, camera-free composer | present | unchanged |

The only user-facing string removed between the two builds is the old version number, so the
upgrade is purely additive: **every visible change belongs to Hive**.

## What a user upgrading from 0.4.0 sees

### New entry

**More → Hive**, with the subtitle “Beebou, Bees, tasks and steering”.

### Hive sheet

The header states the data source — `Local mock`, `Hive bridge`, or `Bridge offline` — above four
lane tabs:

| Lane | Role |
| --- | --- |
| Beebou | The host; routes work to the right Bee |
| Scout | Research, sources and summaries |
| Forge | Builds artifacts, drafts and structured output |
| Ledger | Reports, mail and numbers |

Each tab carries a status dot and an unread badge; a lane that has never run anything says
“No tasks yet”.

### Sending and controlling work

- Per-Bee composer with **Send**.
- While a task runs: **Queue**, **Steer** and **Preempt**.
- Tasks show a reference `T-XXXX`, a run handle `R-…` and a row version `vN`, plus status chips
  (Queued, Running, Waiting, Done, Failed, Stopped) and lane ages.

### Lane views

**Tasks / Activity / Memory**, per lane.

- **Activity** — journal with `New` markers, per-lane unread counts, and
  “Older activity was not kept in this demo.” when the bounded log trims.
- **Memory** — remembered decisions and results, with **Cut off here**, **Restore all** and a
  `Cut off` badge on entries the Bee no longer reuses.

### New interaction surfaces

- **Question cards** — “A Bee needs your answer”, an answer field and **Send answer**. A second
  answer to a settled question is refused rather than silently accepted.
- **Stop** now asks “Stop this task?” with *Keep working* / *Stop task*.
- **Artifacts** — preview, **Export**, **Erase** (shown as `Erased` afterwards).
- **Attachments** — **Attach** up to five files, with thumbnails, size and a remove control.
- **Drafts** — kept per lane, including answer drafts and attachments, across lane switches.
- **Conflict and retry rows** — “That target was out of date…”, “The last action did not reach the
  bridge.”, both with **Retry**.

### Sharing

Shared text becomes a Bee draft: “Shared content saved to a Hive draft.”

Limitation: the Android manifest accepts `text/plain` only, so **files** arrive only through the
browser/PWA share sheet (POST share target), not from the Android system share sheet.

### Notifications

A Bee finishing while the app is in the background posts a notification; tapping it opens that task.

### Data and recovery

- Hive has its own **Export backup / Import backup / Reset**. Import is disabled while a bridge
  session owns state.
- Reloading restores Hive state; a task caught mid-flight returns as **Stopped** with
  “Interrupted by reload”.
- Typing `!fail …` demonstrates the failure path (`Failed`, readable reason, lane released).

### Version display

Settings shows **0.5.0**.

## What stays the same

- Existing local data (chats, discovery, saved cards, settings, memory) is untouched by the upgrade;
  both builds are debug-signed, so it installs in place.
- Widget, Quick Settings tile, app shortcuts, composer behaviour, topic manager and companion
  profiles are unchanged.
- No new Android permissions; the shell differs only by the version bump and the refreshed web
  bundle.

## Install notes

The APK is debug-signed. Android asks to allow “install unknown apps” for whichever app opens it.
If the phone reports a signature mismatch, the previous install came from a different key;
uninstalling first clears local chats, Hive state and settings.
