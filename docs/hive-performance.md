# Hive performance budget

One automated check guards the Hive surface: `e2e/app.spec.ts` → *Hive opens and renders a long
feed within budget*.

## What it measures

1. Seeds the store, then rewrites `digitalmate.hive.v2` with **60 tasks** and **60 activity
   entries** for one lane (`activityTrimmed: true`).
2. Reloads, opens **More → Hive**, and times until the sheet and the first task row are visible
   (`open`).
3. Switches to the **Activity** tab and times until all 60 rows exist (`activity`).

The clock starts before the More click and stops at the first assertion, so it includes opening the
sheet, restoring state from `localStorage`, and the first paint — not just the React commit.

## Budgets

| Metric | Budget | Measured (local, Chromium, 16 Nov 2026) |
| --- | --- | --- |
| Hive open with 60 tasks | < 2500 ms | **458 ms** |
| Activity feed, 60 rows | < 1500 ms | **54 ms** |

Budgets are deliberately loose enough for slow CI runners but tight enough to catch a regression
that makes the sheet hang or renders the feed synchronously row-by-row.

## Running it

```bash
npx playwright test -g "within budget"
```

The test logs `[hive-perf] open=<ms> activity=<ms> rows=60`, which is what the table above records.

## Known limits

- This is a single desktop Chromium run; it does not model a low-end phone. The mobile layout is
  covered separately by the overflow and accessibility checks.
- The mock renders from an in-memory snapshot. A bridge that streams hundreds of events per task
  would need a virtualised feed before this budget means anything there.
