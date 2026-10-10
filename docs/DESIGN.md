# Design spec

The visual layout comes from `docs/prototype.html` (open it in a browser and use the Desktop/Phone switch). Its **wording is out of date**: the site no longer uses music language. This doc is the source of truth.

## Concept

A hardware engineering portfolio. The **vinyl look is the visual layout only**: each project's cover sits under a spinning disc, a tap lifts the disc off to reveal the cover, and a second tap opens the project.

All copy is plain engineering language. Never use music-catalog words in anything a visitor reads: no discography, releases, tracklist, liner notes, sleeves, LP/EP/single, RPM, "pressed", side A/B or credits. The test suite enforces this on every page.

| Thing          | Wording on the site                                                                         |
| -------------- | ------------------------------------------------------------------------------------------- |
| Project list   | Projects                                                                                    |
| Project groups | Categories: Digital design, Embedded, Software, Mechanical (`src/data/categories.ts`)       |
| Project number | `No. 04`, derived from order (newest has the highest number)                                |
| Status         | "In progress since May 2026" / "Completed April 2026"; "Currently building" on home         |
| Project page   | Highlights (features, modules, results) · Write-up (the Markdown body) · Photos             |
| Resume         | "The full _datasheet._" · Experience · Education · Awards · Skills · Contact · Resume PDF   |
| Disc label     | `NO. 04` above the spindle, category below; the resume disc reads `RESUME` / `REV OCT 2026` |

## Pages

| Route              | Purpose                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `/`                | Projects: hero, "Currently building" chip, category filters, disc grid                       |
| `/projects/[slug]` | Project page: cover with disc, details, highlights, write-up, photos, previous/next          |
| `/resume`          | Resume, PDF download, (later) "Email it to me" form, Contact                                 |
| `/404`             | Unknown URLs                                                                                 |
| Redirects          | `/projects` and `/discography` → `/`; `/discography/<slug>` → `/projects/<slug>` (old links) |
| `/api/send-resume` | Server endpoint for the email form (Phase 5; the only on-demand route)                       |

Nav has two links: **Projects** and **Resume**. Contact lives on the resume page and in the footer.

## Color

Single dark theme by design. Tokens are in `src/styles/tokens.css`. Never use raw hex in components except per-project colors from content.

| Token             | Value                 | Use                                                                                                |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| `--bg`            | `#0a0a0b`             | Page                                                                                               |
| `--raise`         | `#0f0f11`             | Cards (resume PDF card)                                                                            |
| `--ln` / `--ln-2` | `#1d1d21` / `#2c2c31` | Hairlines / control borders                                                                        |
| `--tx`            | `#ededea`             | Primary text, primary button fill                                                                  |
| `--body-2`        | `#c2c2bc`             | Long-form text (write-ups, bullets)                                                                |
| `--mu`            | `#8d8d87`             | Secondary text                                                                                     |
| `--dim`           | `#66665f`             | Labels, metadata, numbers                                                                          |
| `--ac`            | `#e8ff59`             | Accent. **Use sparingly**: hero emphasis word, active nav dot, row hover, focus ring, success text |
| `--err`           | `#f09595`             | Form errors                                                                                        |

Each project has its own `color` (disc label + cover) and `ink` (text on that color) in its frontmatter. Pick pastel `color` values with a very dark `ink` from the same hue.

## Type

Self-hosted through Astro's fonts API (`astro.config.mjs`).

| Role                       | Face                              | Where                                                                                                  |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Display (`--font-display`) | Instrument Serif 400, with italic | Hero headlines, project titles, brand name, card titles. Italic + `--ac` for the one emphasized phrase |
| Body (`--font-sans`)       | Geist 400/500                     | All UI and reading text                                                                                |
| Utility (`--font-mono`)    | Geist Mono 400/500                | Labels (`.lab`, uppercase, `0.09em` tracking), project numbers, dates, metadata                        |

Scale: hero `clamp(48px, 9vw, 116px)` / project title `clamp(46px, 7vw, 84px)` / card title 28px / body 15px / UI 13–14px / labels 11–12px. Minimum size 11px.

## Components

- **Record** (`src/components/Record.astro`): the SVG disc. 12 fine grooves + 2 brighter rings, colored label, and a conic sheen that does **not** rotate; only the disc spins. Clipped with `overflow: clip` so its rotating square box never causes sideways scroll.
- **ProjectSlot** (grid item): square cover (`CoverArt`) with the disc on top. Caption reads `No. 04 · tap to reveal` until revealed, then title + category.
- **CoverArt**: the project's `cover` image, or generated art (flat color, one line motif, title, number).
- **Project page cover**: cover with the disc half out to the right, still spinning slowly (7s).
- **Highlight rows**: number / title / kind, hairline separated, lime on hover.
- **Resume PDF card**: lime "RESUME" disc peeking out of the top, then Download PDF (primary).
- **Buttons**: pill shaped. One primary (white fill) per view at most. Everything else outlined.
- **Cards**: only the resume PDF card. Everything else is separated by 1px hairlines, not boxes.

## Motion

| Moment              | Spec                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Disc spin           | `linear`, 3.6–7s (`spin` in frontmatter), `will-change: transform`, composited                        |
| Reveal (first tap)  | Disc lifts (`translate3d(0,-6%,0) scale(1.08)`) and fades (0.4s); cover settles from 0.96 to 1 (0.7s) |
| Hover (mouse only)  | Lift with `translate3d`. **Never scale a spinning layer on hover**: it blurs                          |
| Page transitions    | Native view transitions: nav holds still, old page fades out (0.18s), new page rises in (0.42s)       |
| Grid → project page | The tapped cover glides into place (shared `view-transition-name: cover-<id>`, 0.45s), and back       |
| Project page entry  | Disc slides out from behind the cover (1.15s); details rise 10px and fade in (0.65s)                  |
| Home entry          | Hero lines rise in with a 70ms stagger                                                                |
| Resume rows         | `grid-template-rows: 0fr → 1fr` (0.5s); the plus sign rotates 45° into an ×                           |
| Reduced motion      | Discs stop, entrances and view transitions are off, other transitions become short fades              |

Performance rules: animate only `transform` and `opacity`; no `backdrop-filter` (it re-blurred the spinning discs every scroll frame); prefer rectangular clips to rounded masks on animated layers.

## Responsive

Breakpoints: **820px** (grid 4 → 2 columns), **760px** (project and resume pages go single column, gutter 26px), **480px** (gutter 20px, compact captions).

Phone rules:

- No hamburger. Two nav links fit; the nav is sticky with a near-opaque background.
- The grid stays at 2 columns (1 column makes discs huge and the page long).
- Tap replaces hover: first tap reveals, second tap opens. Hover effects are inside `@media (hover: hover)` only.
- Project page: cover first, then details. Action buttons go full width.
- Photos become a horizontal swipe strip with scroll snap.
- Resume: the PDF card moves **above** the experience list.
- Respect safe-area insets (`viewport-fit=cover`, `env(safe-area-inset-*)`).

## Accessibility

- Grid items are links whose labels change: "Project 04: reveal" → "Open PHANTOM-16". Enter works; Ctrl/Cmd-click opens a new tab.
- Collapsed resume rows are `inert`, matching `aria-expanded`.
- Visible lime focus ring on everything focusable.
- Color is never the only signal. Errors have text, and the active nav has a dot as well as a color change.
- All decorative SVG is `aria-hidden`; cover art has an accessible name.
