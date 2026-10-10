import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color, like #AFA9EC');

// One Markdown file per project in src/content/releases/.
// The filename becomes the URL: signal.md → /discography/signal
// The Markdown body is the release's liner notes.
const releases = defineCollection({
	loader: glob({ base: './src/content/releases', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			// LP = major project, EP = medium, Single = small experiment
			type: z.enum(['LP', 'EP', 'Single']),
			started: z.coerce.date(),
			// Leave out while the project is still in progress ("Recording since May 2026").
			finished: z.coerce.date().optional(),
			// Catalog number, shown as "Cat. 004". Higher = newer.
			catalog: z.number().int().positive(),
			rpm: z.enum(['33⅓', '45']).default('33⅓'),
			tagline: z.string(),
			role: z.string(),
			stack: z.array(z.string()).min(1),
			status: z.string(),
			// Record label and cover colors. `ink` is the text color on top of `color`.
			color: hex,
			ink: hex,
			// Seconds per full rotation on the discography grid.
			spin: z.number().positive().default(5),
			// Without a `cover` image, the sleeve gets generated art: flat color + this motif.
			motif: z.enum(['pipeline', 'waveform', 'grid', 'arcs']).default('arcs'),
			cover: image().optional(),
			// Photos, waveforms, CAD renders, screenshots: "Inside the sleeve".
			// Images live in src/assets/releases/<slug>/ and are optimized at build.
			photos: z.array(z.strictObject({ src: image(), alt: z.string(), caption: z.string().optional() })).default([]),
			// strictObject: a stray key (e.g. from an unquoted comma in YAML) is an error, not silently dropped
			tracks: z.array(z.strictObject({ title: z.string(), kind: z.string() })).min(1),
			links: z
				.strictObject({
					source: z.url().optional(),
					demo: z.url().optional(),
					journal: z.url().optional(),
				})
				.default({}),
			draft: z.boolean().default(false),
		}),
});

export const collections = { releases };
