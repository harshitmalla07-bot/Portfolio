import { getCollection, type CollectionEntry } from 'astro:content';

export type Release = CollectionEntry<'releases'>;

/** Published releases, newest catalog number first. Drafts are hidden in production. */
export async function getReleases(): Promise<Release[]> {
	const all = await getCollection('releases', ({ data }) => import.meta.env.DEV || !data.draft);
	return all.sort((a, b) => b.data.catalog - a.data.catalog);
}

/** 4 → "Cat. 004" */
export const catalogLabel = (n: number) => `Cat. ${String(n).padStart(3, '0')}`;

/** 3 → "03" */
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date → "March 2026" */
export const monthYear = (d: Date) =>
	d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const shortMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

/** Year shown on grid captions: the finish year, or the start year while in progress. */
export const releaseYear = (r: Release) => (r.data.finished ?? r.data.started).getUTCFullYear();

/** "Feb – Apr 2026", "June 2026", "May 2026 – now" */
export function timeline(r: Release): string {
	const { started: s, finished: f } = r.data;
	if (!f) return `${monthYear(s)} – now`;
	const sameYear = s.getUTCFullYear() === f.getUTCFullYear();
	if (sameYear && s.getUTCMonth() === f.getUTCMonth()) return monthYear(f);
	if (sameYear) return `${shortMonth(s)} – ${shortMonth(f)} ${f.getUTCFullYear()}`;
	return `${shortMonth(s)} ${s.getUTCFullYear()} – ${shortMonth(f)} ${f.getUTCFullYear()}`;
}

/** "Released April 2026" or, while in progress, "Recording since May 2026" */
export const releaseLine = (r: Release) =>
	r.data.finished ? `Released ${monthYear(r.data.finished)}` : `Recording since ${monthYear(r.data.started)}`;
