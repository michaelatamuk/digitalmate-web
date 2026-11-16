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

### Ten things to try

1. **Meet the Bees** — More → Hive. Switch between Beebou, Scout, Forge, Ledger; each lane keeps its
   own tasks and drafts.
2. **Run a job** — in Scout, send “Summarise the notes from this week”. Watch the steps change, then
   read the output and any artifact.
3. **Queue and steer** — in Forge, start a long request, then send another: it shows **Queued**. On
   the running one, use **Steer** with “keep it short”.
4. **Answer a question** — send “Draft an email to Alice”. A card asks whether to send or keep it as a
   draft; answer, and the task finishes.
5. **Stop something** — press **Stop**, confirm “Stop this task?”, and see everything produced so far
   kept.
6. **Memory and artifacts** — open **Memory** in a lane and use **Cut off here**; open **Artifacts** and
   export one.
7. **Share into Hive** — share a link from another app into DigitalMate; it appears in a Bee draft,
   unsent.
8. **Word and zoom (0.5.1)** — attach a `.docx` and read it; attach a screenshot and zoom in.
9. **Calendar (0.5.1)** — ask “What’s on my calendar this week?”, tap **New event**, then
   **Add to phone calendar (.ics)** and accept it in your calendar app.
10. **Settings and reports (0.5.1)** — More → Settings → **Local access** for permission states; then
    Hive → Ledger → “Prepare the weekly report” and flip the report card to **Sources**.

### Demo extras

- Type `!fail Build the weekly numbers` in a Bee to see the failure path and a released lane.
- With a screen reader on, scenario 4 should speak “A Bee needs your answer”, and the completion
  should be announced too.

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
