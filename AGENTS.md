## Project

Personal portfolio of Harshit Malla (computer engineering student, McMaster; hardware focus: RTL, FPGA, embedded). Projects are presented as a record label's discography, plus a resume page. Astro 7 (static, with one on-demand API route), deployed on Vercel.

- The approved design is `docs/prototype.html`. Match it. The rules behind it are in `docs/DESIGN.md`, so read that before any UI work.
- The build plan and current phase are in `README.md` → Build plan. Tick items off as they're finished.

## Conventions

- **Styling:** plain CSS. Design tokens live in `src/styles/tokens.css`; shared utilities (`.wrap`, `.lab`, `.display`, `.btn`, `.lnk`, `.mono`) live in `src/styles/global.css`. Component styles go in scoped `<style>` blocks. No Tailwind, no CSS-in-JS. Don't hardcode colors in components; use tokens. The exception is per-release `color`/`ink` from content.
- **Fonts:** come from Astro's fonts API (`astro.config.mjs`) as `--font-display`, `--font-sans`, `--font-mono`. Don't add `<link>`s to Google Fonts.
- **Content:** projects are Markdown in `src/content/releases/`, validated by `src/content.config.ts`. Zod comes from `astro/zod` (Zod 4: use `z.url()`, `z.email()`). Get releases through `getReleases()` in `src/lib/releases.ts` so sorting and draft filtering stay consistent.
- **Resume and identity:** `src/data/resume.ts` and `src/data/site.ts`. Never hardcode the name, email or links in components.
- **JavaScript:** no UI framework. Use small `<script>` blocks in components (bundled by Astro). Interactions must work with tap, mouse and keyboard, and must respect `prefers-reduced-motion`.
- **Env vars:** declared in `astro.config.mjs` → `env.schema`, read with `import { RESEND_API_KEY } from 'astro:env/server'`. Never read `process.env` directly. Never commit `.env`.
- **Before finishing a change:** run `npm run build && npm test` (all checks must pass), and look at the page at desktop width and at 375px. When adding behavior, add a check to `tests/site.test.mjs`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles](https://docs.astro.build/en/guides/styling/)
- [Using custom fonts](https://docs.astro.build/en/guides/fonts/)
- [Type-safe environment variables](https://docs.astro.build/en/guides/environment-variables/)
- [On-demand rendering and endpoints](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/)
