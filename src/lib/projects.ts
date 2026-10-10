import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

const lastActive = (p: Project) => (p.data.finished ?? p.data.started).getTime();

/**
 * Published projects: in-progress ones first (newest start first), then finished ones
 * (most recently finished first; ties go to the later start). Drafts are hidden in production.
 */
export async function getProjects(): Promise<Project[]> {
	const all = await getCollection('projects', ({ data }) => import.meta.env.DEV || !data.draft);
	return all.sort((a, b) => {
		const aLive = !a.data.finished;
		const bLive = !b.data.finished;
		if (aLive !== bLive) return aLive ? -1 : 1;
		// Same finish date: the one started more recently comes first.
		return lastActive(b) - lastActive(a) || b.data.started.getTime() - a.data.started.getTime();
	});
}

/** 3 → "03" */
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Project numbers count up over time, so the first project in the list has the highest: "04". */
export const projectNo = (index: number, total: number) => pad2(total - index);

/** Date → "March 2026" */
export const monthYear = (d: Date) =>
	d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const shortMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

/** Year shown on grid captions: the finish year, or the start year while in progress. */
export const projectYear = (p: Project) => (p.data.finished ?? p.data.started).getUTCFullYear();

/** "Feb – Apr 2026", "June 2026", "May 2026 – now" */
export function timeline(p: Project): string {
	const { started: s, finished: f } = p.data;
	if (!f) return `${monthYear(s)} – now`;
	const sameYear = s.getUTCFullYear() === f.getUTCFullYear();
	if (sameYear && s.getUTCMonth() === f.getUTCMonth()) return monthYear(f);
	if (sameYear) return `${shortMonth(s)} – ${shortMonth(f)} ${f.getUTCFullYear()}`;
	return `${shortMonth(s)} ${s.getUTCFullYear()} – ${shortMonth(f)} ${f.getUTCFullYear()}`;
}

/** "Completed April 2026" or, while in progress, "In progress since May 2026" */
export const statusLine = (p: Project) =>
	p.data.finished ? `Completed ${monthYear(p.data.finished)}` : `In progress since ${monthYear(p.data.started)}`;

/** View-transition name shared by a project's cover on the grid and on its page. */
export const coverTransition = (p: Project) => `cover-${p.id}`;
