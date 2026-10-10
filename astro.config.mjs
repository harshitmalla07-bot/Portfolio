// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';

// Canonical URLs need the live address. Vercel provides it at build time (your custom domain
// once one is added, otherwise the *.vercel.app one). SITE_URL overrides it; local builds use localhost.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL ?? (productionHost ? `https://${productionHost}` : 'http://localhost:4321');

// https://astro.build/config
export default defineConfig({
	site,

	// Pages are prerendered (static). Only routes that opt out with
	// `export const prerender = false` (the resume email endpoint) run on Vercel.
	adapter: vercel(),

	// The project grid lives on the home page. /discography/* is the old URL scheme, kept
	// so links shared before the rename still work.
	redirects: {
		'/projects': '/',
		'/discography': '/',
		'/discography/[slug]': '/projects/[slug]',
	},

	// Self-hosted at build time, no runtime request to Google Fonts.
	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: 'Instrument Serif',
			cssVariable: '--font-display',
			weights: [400],
			styles: ['normal', 'italic'],
			fallbacks: ['Georgia', 'serif'],
		},
		{
			provider: fontProviders.fontsource(),
			name: 'Geist',
			cssVariable: '--font-sans',
			weights: [400, 500],
			styles: ['normal'],
			fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
		},
		{
			provider: fontProviders.fontsource(),
			name: 'Geist Mono',
			cssVariable: '--font-mono',
			weights: [400, 500],
			styles: ['normal'],
			fallbacks: ['ui-monospace', 'monospace'],
		},
	],

	// Typed env vars. All optional so the site builds and runs before the
	// email feature is wired up. See .env.example.
	env: {
		schema: {
			RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			RESUME_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
			RESUME_NOTIFY_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
			TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
		},
	},
});
