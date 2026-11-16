# Hive user guide

Hive is where Beebou routes work to the Bees: **Scout** for research, **Forge** for building and
writing, **Ledger** for numbers and money. Each Bee has a lane that keeps its tasks, activity and
memory separate.

Everything below works **offline, without an account**. When a deployment connects a Hive service
it says “Hive bridge” instead of “Local mock”; the flow is the same.

## Opening Hive

**More → Hive**. The sheet opens on Beebou and shows the lane strip: one tab per Bee with a status
dot and an unread count.

If the Hive entry is missing, the deployment hid it (`VITE_HIVE_MODE=off`, or `?hive=off` in the
URL). Add `?hive=mock` or `?hive=bridge` to the URL to bring it back for that browser.

## Choosing a Bee and sending work

1. Pick a lane (or ask Beebou and let it route).
2. Type in the composer and press **Send**.
3. The task appears in **Tasks** with a reference like `T-7K2M`, a run handle `R-…` and a version
   `v3`. A second request while one is running is **Queued** — it is not dropped.

### Attachments

**Attach** adds up to five files. Images show a thumbnail and open in a zoomable preview with pan;
text files are readable inline; PDFs and Word documents contribute their text. Files stay in the
browser; a bridge stores the bytes when it receives them.

### Drafts

Each lane keeps its own draft, including answer drafts and attachments, so switching Bees does not
lose typed work. A draft is only cleared when it is sent.

## Steering a running task

While a task runs, the composer offers three actions:

| Action | What it does |
| --- | --- |
| **Steer** | Adds your text to the running task (“keep it short”, “cite sources”) |
| **Queue** | Sends this text as the next task, after the current one |
| **Preempt** | Stops the current task and starts this one instead |

## Questions and Stop

When a Bee needs a decision it raises a question card (“Should I send the draft, or keep it as a
draft?”). Write an answer and press **Send answer**; the task continues and remembers the decision.

Answering the same question twice is refused — the second answer is a conflict, not a silent
success, so you always know which answer counted.

**Stop** asks for confirmation first. Confirming stops the open task in that lane and keeps
everything it already produced; other lanes keep running.

If a command arrives against an out-of-date task (another client moved it), the sheet says so,
refreshes to the latest state and offers **Retry** instead of pretending the command worked.

## Artifacts

Finished work that produces a document appears under **Artifacts** on the task: preview it, **Export**
it as a file, or **Erase** it. Erasing keeps the task and its summary; only the artifact content goes.

A report task also shows a **report card**: the summary and a mail preview on the front, and a
**Sources** side listing each claim with its quote and where it came from. The sources travel with
the task, so they survive a backup and restore.

## Memory

The **Memory** tab shows what the lane remembers: decisions, results and preferences. Each entry can
be cut off — **Cut off here** makes the Bee stop reusing anything older than that entry, and
**Restore all** clears the cut-off. This is how you make a lane “forget” without deleting its history.

## Activity

The **Activity** tab is the lane journal: sends, answers, steers, stops, failures and artifact
changes. A `New` marker and the unread count show what happened since you last looked at that lane.
The demo keeps a bounded log; when older entries are dropped it says so rather than pretending the
feed is continuous.

## Sharing into Hive

Share text or files to DigitalMate from the system share sheet (Android) and the app opens a Bee
draft with the content already attached. Nothing is sent until you press **Send**.

## Keeping and restoring state

- The local demo persists per browser: reloading keeps lanes, tasks, artifacts, memory and drafts.
- A task that was mid-flight when the page reloaded comes back as **Stopped** with
  “Interrupted by reload” — it does not keep a phantom timer running.
- **Export backup** writes a JSON file; **Import backup** validates and restores it.
- **Reset** clears the demo. Settings also has a full-app backup and reset.

## Trying the failure path

Type a prompt that starts with `!fail` (for example `!fail Build the weekly numbers`) to see how a
Bee failure looks: status **Failed**, a readable reason, an activity entry and a released lane. It is
a demo trigger, not a hidden feature of real work.

## Bridge mode

When the deployment runs a Hive service, the header says **Hive bridge** and shows the negotiated
contract version and supported features. If the bridge is unreachable the sheet says **Unavailable**
with the reason and a **Retry** button — it never quietly swaps in fake data. While connected, calls
are retried safely (a resend reuses the same operation id, so it cannot create a duplicate task).

## Language and accessibility

Every Hive label is bilingual; the app follows the language setting. Lanes are tabs, the activity
feed is a list with roles and labels, status changes are announced, and the sheet is keyboard
operable with visible focus.

## Limits

- The demo is single-user and local; it has no real sends, payments or bookings.
- Attachments are capped at five per draft.
- Activity is bounded and reports a gap when trimmed.
- A real Bee runtime, router or model gateway needs the bridge; the web app never calls models
  directly and never stores provider secrets.
