# Design spec

The approved look is `docs/prototype.html`. Open it in a browser and use the Desktop/Phone switch. This doc records the decisions behind it so the build stays consistent.

## Concept

A hardware engineering portfolio presented as a record label's catalog. Each project is a **release**:

| Portfolio idea      | Record metaphor                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Project             | Release (LP = major, EP = medium, Single = small experiment)                                         |
| Project order       | Catalog number, `Cat. 001` (oldest) to `Cat. 004` (newest)                                           |
| Features / stack    | Tracklist                                                                                            |
| Case-study write-up | Liner notes                                                                                          |
| Screenshots         | "Inside the sleeve"                                                                                  |
| Resume              | "The full credits": Side A = experience, Side B = education, Instruments = skills, Credits = contact |

Keep the metaphor in the labels and visuals. Keep the actual copy plain and readable. A recruiter should never have to decode a pun to find information.

## Pages

| Route                 | Purpose                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `/`                   | Discography: hero, "Now spinning" link to the newest release, type filters, record grid     |
| `/discography/[slug]` | Release page: sleeve with record, info, tracklist, liner notes, screenshots, prev/next      |
| `/resume`             | Resume, Download PDF, "Email it to me" form, Credits (contact lives here and in the footer) |
| `/api/send-resume`    | Server endpoint for the email form (only on-demand route)                                   |

Nav has two links only: **Discography** and **Resume**. There is no separate contact page.

## Color

Single dark theme by design. Tokens are in `src/styles/tokens.css`. Never use raw hex in components except per-release colors from content.

| Token             | Value                 | Use                                                                                                |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| `--bg`            | `#0a0a0b`             | Page                                                                                               |
| `--raise`         | `#0f0f11`             | Cards (resume sleeve card)                                                                         |
| `--ln` / `--ln-2` | `#1d1d21` / `#2c2c31` | Hairlines / control borders                                                                        |
| `--tx`            | `#ededea`             | Primary text, primary button fill                                                                  |
| `--body-2`        | `#c2c2bc`             | Long-form text (liner notes, bullets)                                                              |
| `--mu`            | `#8d8d87`             | Secondary text                                                                                     |
| `--dim`           | `#66665f`             | Labels, metadata, numbers                                                                          |
| `--ac`            | `#e8ff59`             | Accent. **Use sparingly**: hero emphasis word, active nav dot, row hover, focus ring, success text |
| `--err`           | `#f09595`             | Form errors                                                                                        |

Each release has its own `color` (label + cover) and `ink` (text on that color) in its frontmatter. Pick pastel `color` values with a very dark `ink` from the same hue.

## Type

Self-hosted through Astro's fonts API (`astro.config.mjs`).

| Role                       | Face                              | Where                                                                                                  |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Display (`--font-display`) | Instrument Serif 400, with italic | Hero headlines, release titles, brand name, card titles. Italic + `--ac` for the one emphasized phrase |
| Body (`--font-sans`)       | Geist 400/500                     | All UI and reading text                                                                                |
| Utility (`--font-mono`)    | Geist Mono 400/500                | Labels (`.lab`, uppercase, `0.09em` tracking), catalog numbers, dates, track numbers, metadata         |

Scale: hero `clamp(48px, 9vw, 116px)` / release title `clamp(46px, 7vw, 84px)` / card title 28px / body 15px / UI 13–14px / labels 11–12px. Minimum size 11px.

## Components

- **Record** (`src/components/Record.astro`): SVG disc with 12 fine grooves + 2 brighter track-gap rings, colored label with catalog number and RPM, and a conic sheen that does **not** rotate. Only the disc spins.
- **Release slot** (grid item): square sleeve (cover art) with the record covering it. Caption under it reads `Cat. 004 · reveal` until revealed, then title + `LP · 2026`.
- **Sleeve** (release page): cover with the record half out to the right, still spinning slowly (7s).
- **Tracklist rows**: number / title / kind, hairline separated, lime on hover.
- **Resume sleeve card**: lime "RESUME" record peeking out of the top, then Download PDF (primary), "or" divider, email form.
- **Buttons**: pill shaped. One primary (white fill) per view at most. Everything else outlined.
- **Cards**: used only for the resume card. Everything else is separated by 1px hairlines, not boxes.

## Motion

| Moment                    | Spec                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Record spin               | `linear`, 3.6–6s per release (`spin` in frontmatter), `will-change: transform`                       |
| Reveal (tap record)       | Record fades out (0.45s) and scales to 1.12 (0.7s); cover scales from 0.96 to 1. Easing `--ease`     |
| Record hover (mouse only) | `translateY(-4px)`. **Never scale on hover**: scaling a spinning layer makes it blurry               |
| Release page entry        | Record slides out of sleeve from `-34%` (1.15s); info column rises 10px and fades in (0.65s)         |
| Page transitions          | Astro view transitions, short crossfade (~0.2s)                                                      |
| Resume rows               | Expand with a `grid-template-rows: 0fr → 1fr` transition (0.5s); the plus sign rotates 45° into an × |
| Email sent                | Record spins faster while sending, then lifts out of the card; the word "Shipped." fades in          |
| Reduced motion            | Records stop spinning, entrances are skipped, transitions become short fades                         |

## Responsive

Breakpoints: **820px** (grid 4 → 2 columns), **760px** (release and resume pages go single column, gutter 26px), **480px** (gutter 20px, compact captions).

Phone rules:

- No hamburger. Two nav links fit; the nav is sticky with a blurred background.
- Discography grid stays at 2 columns (1 column makes records huge and the page long).
- Tap replaces hover: first tap reveals, second tap opens. Hover effects are inside `@media (hover: hover)` only.
- Release page: sleeve first, then info. Action buttons go full width.
- Screenshots become a horizontal swipe strip with scroll snap.
- Resume: the "Take a copy home" card moves **above** the experience list.
- Respect safe-area insets (`viewport-fit=cover`, `env(safe-area-inset-*)`).

## Accessibility

- Record slots are buttons with labels that change: "Cat. 004, reveal release" → "Open Signal". Enter/Space work.
- Visible lime focus ring on everything focusable.
- Color is never the only signal. Errors have text, and the active nav has a dot as well as a color change.
- All decorative SVG is `aria-hidden`.
