import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES } from './data/categories';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color, like #AFA9EC');

// One Markdown file per project in src/content/projects/.
// The filename becomes the URL: phantom-16.md → /projects/phantom-16
// The Markdown body is the project's write-up.
const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			category: z.enum(CATEGORIES),
			started: z.coerce.date(),
			// Leave out while the project is still in progress ("In progress since May 2026").
			finished: z.coerce.date().optional(),
			tagline: z.string(),
			role: z.string(),
			stack: z.array(z.string()).min(1),
			status: z.string(),
			// Disc label and cover colors. `ink` is the text color on top of `color`.
			color: hex,
			ink: hex,
			// Seconds per full rotation of the disc on the projects grid.
			spin: z.number().positive().default(5),
			// Without a `cover` image, the cover gets generated art: flat color + this motif.
			motif: z.enum(['pipeline', 'waveform', 'grid', 'arcs']).default('arcs'),
			cover: image().optional(),
			// Photos, waveforms, CAD renders, screenshots. Images live in src/assets/projects/<slug>/.
			photos: z.array(z.strictObject({ src: image(), alt: z.string(), caption: z.string().optional() })).default([]),
			// strictObject: a stray key (e.g. from an unquoted comma in YAML) is an error, not silently dropped
			highlights: z.array(z.strictObject({ title: z.string(), kind: z.string() })).min(1),
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

export const collections = { projects };
