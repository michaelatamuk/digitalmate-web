# Branding and asset licensing

DigitalMate Web is an independent, unofficial web and Android companion. It is
not affiliated with, endorsed by or sponsored by the DigitalMate maintainers,
openJiuwen or Huawei.

## Names and marks

- The repository and app use **DigitalMate Web** to describe this implementation.
- “DigitalMate”, “openJiuwen”, “HarmonyOS” and “Huawei” remain the trademarks of
  their respective owners. They are used only to describe compatibility and the
  project this app re-creates.
- Do not imply official status, endorsement or support. Keep the disclaimer in
  `NOTICE` and the Settings → About card visible in redistributed builds.
- The app icon (`public/icon.svg`) and brand mark are original artwork for this
  project and are covered by the repository's Apache-2.0 license.

## BeeBou mascot

`public/bee/` contains BeeBou images copied from the upstream DigitalMate project
for visual parity. They are excluded from any claim of original authorship and
remain subject to the upstream project's terms and the rights holder's
copyright, trademark and brand rights.

**Before commercial use or redistribution**, obtain permission from the rights
holder or replace these assets with original artwork. The rest of the app works
without them; the mascot is decorative.

## Discovery covers and photos

- Category illustrations in `public/covers/*.svg` are original artwork for this
  project.
- Stock photos in `public/covers/photos/` are downloaded from Unsplash and used
  under the [Unsplash License](https://unsplash.com/license). Source links and
  photo IDs are listed in `public/covers/photos/CREDITS.md`.
- Real RSS/Atom article images are loaded directly from the publisher's feed at
  runtime. They are not bundled, cached permanently or re-licensed by this
  project. The publisher's own terms apply.
- The stock photos are illustrative. Seeded demo articles are fictional and are
  not presented as reporting by the photographed source.

## Fonts, icons and dependencies

- Icons are inline SVG components written for this project (`src/components/Icons.tsx`).
- Typography uses system fonts, so no font files are redistributed.
- JavaScript dependencies keep their own licenses; run `npm ls --all` and review
  `node_modules/*/LICENSE` before a commercial release. The main runtime
  dependencies are React, Vite, Capacitor, fast-xml-parser, pdfjs-dist and ws.
- The upstream DigitalMate project is Apache-2.0. This repository is a new web
  implementation and does not vendor its ArkTS application.

## Checklist for a release

- [ ] `NOTICE` still names the upstream project and the BeeBou caveat
- [ ] BeeBou usage is approved, or the mascot is replaced
- [ ] `public/covers/photos/CREDITS.md` matches the bundled photos
- [ ] No Huawei/openJiuwen logo is used as this project's own mark
- [ ] Store listing and README state that the app is unofficial
- [ ] Dependency licenses reviewed for the distribution channel
