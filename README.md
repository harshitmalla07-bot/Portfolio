# Portfolio

My personal site: engineering projects (RTL, FPGA, embedded, mechanical) presented as a record label's discography, plus my resume. Built with [Astro](https://astro.build), deployed on Vercel.

- **Design:** `docs/prototype.html` (open in a browser) and `docs/DESIGN.md`
- **Projects:** one Markdown file per project in `src/content/releases/`
- **Resume:** `src/data/resume.ts`; name, email and links live in `src/data/site.ts`

## Setup

Requires Node 22.12 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:4321.

| Command            | What it does                                                              |
| ------------------ | ------------------------------------------------------------------------- |
| `npm run dev`      | Dev server with hot reload                                                |
| `npm run check`    | Type-check `.astro` and `.ts` files, and validate content frontmatter     |
| `npm run build`    | Check, then build to `dist/`                                              |
| `npm run preview`  | Serve the production build locally                                        |
| `npm run format`   | Format everything with Prettier                                           |
| `npm test`         | Browser tests against the production build (run `npm run build` first)    |
| `npm run test:100` | The same suite 100 times, 4 in parallel, with a failure and timing report |

## Tests

`tests/site.test.mjs` serves the production build exactly as Vercel would (including redirects and the 404 page) and drives your installed Microsoft Edge through about 100 checks per run: page structure and metadata, fonts, images, no horizontal scroll at desktop and phone widths, no console errors, every discography interaction, each release page against its Markdown file, the resume page, the PDF, routing, no-JavaScript mode and reduced motion. Expected values are read from `src/content` and `src/data`, so adding a project needs no test changes.

## Adding a project

1. Create `src/content/releases/my-project.md`. The filename becomes the URL: `/discography/my-project`.
2. Fill in the frontmatter (copy an existing file). The schema in `src/content.config.ts` tells you what's required, and `npm run check` reports anything missing or invalid.
3. Write the liner notes as the Markdown body: the problem, what you built, your role, what you learned.
4. Put cover art and screenshots next to the file (or in `src/assets/`) and reference them with relative paths. Astro optimizes them.

Set `draft: true` to hide a release in production while you work on it.

## Project structure

```
docs/
  DESIGN.md           design spec: tokens, type, motion, responsive rules
  prototype.html      approved clickable prototype
public/               static files (favicon, resume.pdf)
src/
  components/         Record, Nav, Footer, CopyEmail
  content/releases/   one .md per project
  content.config.ts   release schema
  data/               site.ts (identity, links), resume.ts (resume content)
  layouts/Base.astro  html shell: fonts, meta, nav, footer
  lib/releases.ts     sorting and formatting helpers
  pages/              routes
  styles/             tokens.css (design tokens), global.css (base + utilities)
```

## Build plan

- [x] **Phase 0 · Foundation:** Astro 7, Vercel adapter, self-hosted fonts, design tokens, content schema with sample releases, resume data, layout, nav, footer, `Record` component, page skeletons
- [x] **Phase 1 · Real content:** projects, resume, links, generated covers, resume PDF (with name header), 2 photos. Later: PHANTOM-16 and PantryPal images, PantryPal repo link once the teammate makes it public
- [x] **Phase 2 · Discography page:** hero, "Now spinning", type filters, record-over-sleeve reveal (remembered for the session), phone grid, works without JS
- [x] **Phase 3 · Release page:** sleeve with sliding record, info and meta, tracklist, liner notes, photo strip, prev/next, native view transitions
- [x] **Phase 4 · Resume page:** expandable experience rows, education, awards, skills, Credits, "Take a copy home" card with PDF download (email form arrives with Phase 5)
- [ ] **Phase 5 · Email the resume:** `src/pages/api/send-resume.ts` (`prerender = false`), Resend with PDF attachment, Cloudflare Turnstile, hidden honeypot field, per-IP rate limit, copy of each request to me
- [ ] **Phase 6 · Polish and ship:** social preview image, sitemap, 404 page, Lighthouse pass, reduced-motion pass, deploy to Vercel, custom domain

## Deploying

1. Push to GitHub and import the repo at https://vercel.com/new. Vercel detects Astro automatically; keep the default settings.
2. Every push to `main` deploys. Pull requests get their own preview URLs.
3. The site address (canonical links) comes from Vercel automatically, including a custom domain once you add one. Set `SITE_URL` in Vercel's environment variables only to override it.
4. For the resume email form (Phase 5), add the variables from `.env.example` in the Vercel project settings.
