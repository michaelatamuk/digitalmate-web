# Release 0.5.1 — what changed on Android

Release page: <https://github.com/michaelatamuk/digitalmate-web/releases/tag/v0.5.1>
Direct APK: `releases/download/v0.5.1/app-debug.apk`

Built from `80793e0`. `versionCode 8` / `versionName 0.5.1`, debug-signed, minSdk 24, targetSdk 36.
APK: 6.65 MB, MD5 `17e3cbd531fd8dd3b828f91f542dba31`.

This release is the direct successor of 0.5.0 (`01799b1`). It adds three behaviours the native client
had and the web build did not, plus two smaller parity items.

## In plain words

- **Word files open in the app.** Drop in a `.docx` and read its text, no Office needed.
- **Pictures zoom.** Open any screenshot or image preview, zoom in, drag around, zoom back out.
- **The app speaks.** With a screen reader on, it says when a Bee finishes or needs an answer.
- **Events reach your real calendar.** Create an event, export it, and your phone calendar opens it.
- **Settings says what the browser allows.** Notifications, mic, location, storage — honestly.
- **Reports show their sources.** A report now has a back side listing each claim and where it came from.

## Try these (two minutes each)

1. **Word file** — attach any `.docx` in chat, tap its preview. You should see the text and a
   “Word text extracted locally” note.
2. **Zoom** — attach a screenshot, open the preview, tap **+** (or double-tap) and drag. **Reset**
   returns it. Works for Hive attachments too.
3. **Screen reader** — turn on TalkBack/VoiceOver, open Hive, send “Draft an email to Alice”.
   You should hear the question announced, then “Done” after you answer.
4. **Calendar** — ask “What’s on my calendar this week?”, tap **New event**, then
   **Add to phone calendar (.ics)**. Open the downloaded file and accept it in your calendar app.
5. **Local access** — **More → Settings → Local access**. The rows say Allowed / Blocked / Ask first /
   Local only for this browser.
6. **Report sources** — **More → Hive → Ledger**, send “Prepare the weekly report”. On the report
   card, switch to **Sources** and read a quote with its origin; switch back to **Summary**.

## Upgrading from 0.4.0 (this section includes 0.5.0)

0.4.0 had chat, discovery, saved cards, memory, a demo calendar and the local task list. Everything
below is cumulative: the 0.5.0 **Hive** workspace first, then the 0.5.1 polish on top.

### 0.5.0 — a second workspace called Hive

| You get | What it means in practice |
| --- | --- |
| **Hive** in the More menu | A place where assistants (“Bees”) run longer jobs instead of one chat reply |
| Beebou, Scout, Forge, Ledger | A router plus three workers: research, building/writing, reports/money |
| Tasks with references | Each job gets `T-XXXX`, a run id and a version, so retries are distinguishable |
| Queue, Steer, Preempt | A second request waits instead of being lost; you can redirect one mid-run |
| Questions | A Bee stops and asks when it needs a decision; your answer is remembered |
| Stop | Stops the current job after a confirmation, keeps what it already produced |
| Artifacts | Finished documents can be previewed, exported or erased |
| Lane memory | Each Bee remembers decisions, and you can cut off older memory |
| Activity feed | A per-Bee journal with `New` markers and unread counts |
| Drafts and attachments | Each Bee keeps its own unsent text and up to five files |
| Share into Hive | Text shared from another app lands in a Bee draft |
| Notifications | A Bee finishing in the background notifies you; tapping opens the task |
| Backup / restore | Hive state survives reloads and can be exported and imported |

### 0.5.1 — the polish

| You get | What it means in practice |
| --- | --- |
| Word documents | A `.docx` attachment shows its text in-app, read locally |
| Zoomable images | Screenshots and scans can be zoomed and panned in previews |
| Spoken status | With a screen reader on, task changes and questions are announced |
| Calendar export | A created event becomes an `.ics` your phone calendar can accept |
| Local access panel | Settings shows what the browser really allows, row by row |
| Report cards | Reports have a **Sources** side listing each claim and its origin |

### Where everything lives

- The app opens on **Chat**. The round **⋯/More** button is at the **top right** of the Chat screen.
- **More** opens a list: Sessions & tasks, Artifacts, Settings, **Hive**, Labs, Skills. Every one of
  them is a sheet; close it with the **X** at the top right.
- **Hive is a single screen.** It has three layers, top to bottom:
  1. **Lane tabs** — Beebou · Scout · Forge · Ledger
  2. **View tabs** — Tasks · Activity · Memory (for the selected lane)
  3. **Composer** — at the bottom, with **Attach** on the left and **Send** on the right
  Task detail (question card, Stop, artifacts, report card) is in the same screen, next to the task
  list on wide screens and below it on phones. Scenarios 1–6 and the report half of 10 never leave
  this sheet, except to press More again.
- Chat attachments use the **+** button on the left of the Chat composer, then **Files**.

### Ten things to try

1. **Meet the Bees** — Chat → **More** (top right) → **Hive**. Tap **Scout**, **Forge**, **Ledger** in
   the lane strip; only that lane's tasks and drafts change beneath it.
2. **Run a job** — still in Hive, select **Scout**, type “Summarise the notes from this week” in the
   composer at the bottom, press **Send**. Stay on **Tasks** and watch the status steps; the result
   appears in the task detail on the same screen.
3. **Queue and steer** — select **Forge**, send “Build a launch checklist”, then immediately send
   “Draft the announcement”. The second task shows **Queued**. Click the running task, type
   “keep it short” in the composer and press **Steer**.
4. **Answer a question** — in **Scout** or **Forge**, send “Draft an email to Alice”. A question card
   appears in the task detail; type an answer and press **Send answer**.
5. **Stop something** — while a task is running, open its detail and press **Stop**, then **Stop task**
   in the confirmation (**Keep working** cancels). Work produced so far stays.
6. **Memory and artifacts** — same Hive screen: **Memory** tab → **Cut off here** on an entry;
   **Tasks** tab → open the task → **Artifacts** block → **Export**.
7. **Share into Hive** — from any other app, share a link to DigitalMate. It opens **Hive** with the
   text already in the last Bee's composer, unsent until you press **Send**.
8. **Word and zoom (0.5.1)** — back on **Chat**: press **+** next to the composer → **Files** → pick a
   `.docx`. Tap the file chip to preview. Repeat with a screenshot, then use **+** / double-tap to zoom,
   drag to pan, **Reset** to return.
9. **Calendar (0.5.1)** — on **Chat**, send “What’s on my calendar this week?”. In the reply card,
   press **New event**, adjust the title/time, then **Add to phone calendar (.ics)**. Open the
   downloaded file and confirm in your calendar app.
10. **Settings and reports (0.5.1)** — **More** → **Settings** → scroll to **Local access** for the
    permission rows. Then **More** → **Hive** → **Ledger** → send “Prepare the weekly report”; in the
    task detail, flip the report card’s **Sources** tab.

### Demo extras

- In any Hive lane, send `!fail Build the weekly numbers` to see the failure path and a released lane.
- With TalkBack/VoiceOver on, scenario 4 speaks “A Bee needs your answer”, and finishing the task is
  announced too.

## New

### Word documents

`.docx` attachments are now read locally: body text, paragraph breaks, tab stops and table cells.
Deleted runs and field codes are skipped, the output is capped at 200k characters, and nothing leaves
the browser. The preview says “Word text extracted locally” and explains that layout is not kept.
(`src/lib/docx.ts`, `fflate` for the archive.)

### Zoomable previews

Image and SVG previews — in chat attachments and in the Hive preview — support 50–400 % zoom,
drag-to-pan, double-click zoom/reset, and keyboard-accessible zoom controls.

### Screen-reader announcements

The app now has polite and assertive live regions. Hive announces task transitions
(“… — Done”) and interrupts politely for “A Bee needs your answer”. Opening the sheet or switching
lanes stays silent, so navigation does not produce noise.

### Calendar export

**New event → Add to phone calendar (.ics)** writes a standard RFC 5545 file: floating local time,
duration, escaping and line folding. On Android it goes through the share sheet; elsewhere it
downloads. A browser still cannot write the device calendar directly, so this is the real path into
the phone's calendar app.

### Local access panel

**Settings → Local access** reports what this browser actually allows: notifications, microphone,
location, calendar (local only) and offline storage. Unsupported states are shown as unsupported
rather than guessed. Calendar rows explain that events stay local unless exported as `.ics`.

### Report cards

Hive reports have a two-sided card: the summary plus an inbox preview on the front, and a **Sources**
side listing each claim with its quote and origin. Evidence and mail travel with the snapshot, so a
backup keeps them; forwarded bridge reports render the same card when they provide the fields.

## Fixed / improved

- Attachment empty state now names the supported types (text, images, PDF, Word).
- Hive preview overlay reuses the shared zoom surface instead of a bare image.

## Verification

- Unit: 194 passed (DOCX extraction, announcements, `.ics` writer, capability probe, report evidence)
- Playwright: 48 passed, including DOCX preview, zoom controls, live-region announcement, `.ics`
  download, capability panel and report sources
- Build: passed

## Install

Same debug signing key as 0.5.0, so it upgrades in place and keeps local data. Android may ask to
allow “install unknown apps” for whichever app opens the file.

APK: 6.65 MB, MD5 `17e3cbd531fd8dd3b828f91f542dba31`.
