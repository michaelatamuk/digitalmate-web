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
