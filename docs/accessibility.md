# Accessibility

DigitalMate Web targets WCAG 2.2 AA for the main flows. This page records what
is automated, what needs a manual pass, and how to reproduce the checks.

## Automated coverage

`npx playwright test -g accessibility` runs axe-core against the core screens and
fails on **serious** or **critical** violations:

- Home and an active chat with an A2UI surface
- Discover
- More menu
- Skill center
- Settings

The suite also checks that mobile layouts do not overflow horizontally.

Implemented behaviours:

- A visible skip link to `#main-content` as the first focusable element.
- Visible `:focus-visible` outlines on buttons, links, inputs and textareas.
- `prefers-reduced-motion` support plus an in-app **Reduce motion** setting.
- Modal sheets move focus into the panel, trap Tab, close on Escape and restore
  focus to the trigger.
- Icon-only buttons have accessible names; decorative images use empty `alt` text.
- Live chat status uses polite live regions rather than focus-stealing alerts.
- PWA and Android layouts respect safe-area insets.
- The Android back gesture closes detail views and sheets before leaving the app.

## Manual screen-reader pass

Automation cannot judge reading order, announcements or touch target comfort.
Run this checklist on each release with at least one screen reader:

1. **VoiceOver (iOS/macOS), TalkBack (Android) or NVDA (Windows)** — enable it and
   navigate Home without touching the pointer.
2. Confirm the skip link is the first stop and moves focus to the main content.
3. Send a chat message and confirm the assistant reply, task rows and execution
   trace are announced in a sensible order, once.
4. Open Discover, then open a story from the cover button **and** the title
   button; confirm both names describe the action.
5. Open More, Settings, Skills, Memory and History; confirm focus enters each
   sheet, Tab stays inside, Escape closes it, and focus returns to the trigger.
6. Exercise the composer with the keyboard only, including attaching a file and
   sending. Confirm the send button name changes while busy.
7. Trigger an offline banner and a notification-permission failure; confirm the
   message is announced and the app remains usable.
8. Set text size to 200% (or browser zoom to 200%) and repeat Home, Discover,
   Settings and the chat composer.
9. With Reduce Motion enabled, confirm no entrance animations or streaming
   cursor animation remain.

Record the device, OS version, screen reader and any exceptions in the release
notes. Do not block a release for cosmetic reading-order differences; do block
for unlabelled controls, focus traps, or content that cannot be reached.

## Known limitations

- Complex A2UI data surfaces (flight boards, charts, maps) rely on their visible
  text and table structure; they do not yet expose a separate summary per card.
- Third-party RSS article images use the publisher's `alt`-less feed metadata, so
  they are treated as decorative next to the article title.
- The native widget is a static summary and is not exposed through TalkBack as an
  interactive surface.

## Reproduce

```bash
npm run build
npx playwright install chromium
npx playwright test -g "accessibility"
```

For a manual browser pass, use `npm run dev -- --port 5174` and test at 390×844
and 1440×900, with keyboard only and with a screen reader.
