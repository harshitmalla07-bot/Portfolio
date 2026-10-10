// End-to-end test + benchmark for the built site.
//
//   npm run build
//   npm test                  one run against the local production build
//   npm run test:100          100 runs, 4 at a time, then a failure/timing report
//   node tests/site.test.mjs --runs 20 --workers 2
//   node tests/site.test.mjs --url https://your-site.vercel.app     test the live site
//
// Locally it serves the production output (.vercel/output/static, honoring the redirects in
// .vercel/output/config.json) and drives the installed Microsoft Edge with playwright-core.
// Expected values come from the real content (src/content/projects, src/data), so the tests
// keep working as projects are added.

import { createServer } from 'node:http';
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.vercel/output');
const STATIC = join(OUT, 'static');

const arg = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	return i > -1 ? process.argv[i + 1] : fallback;
};
const RUNS = Number(arg('runs', 1));
const WORKERS = Math.min(Number(arg('workers', 1)), RUNS);
const LIVE_URL = arg('url', null)?.replace(/\/$/, '');
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 375, height: 812 };

// Music-catalog wording the site must not use any more (the vinyl is visual only).
const MUSIC_WORDS =
	/discograph|tracklist|liner notes|pressed on|\bwax\b|\bLP\b|\bEP\b|\bside [ab]\b|\bcredits\b|\bcatalog|\bRPM\b|\breleases?\b|now spinning|\bsleeve\b/i;

// ---------- expected content, read from source ----------

async function loadProjects() {
	const dir = join(ROOT, 'src/content/projects');
	const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
	const projects = [];
	for (const file of files) {
		const fm = (await readFile(join(dir, file), 'utf8')).split('---')[1];
		const field = (k) => fm.match(new RegExp(`^${k}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'))?.[1];
		projects.push({
			id: file.replace(/\.md$/, ''),
			title: field('title'),
			category: field('category'),
			started: new Date(field('started')).getTime(),
			finished: field('finished') ? new Date(field('finished')).getTime() : null,
			draft: field('draft') === 'true',
			highlights: (fm.match(/^\s+- \{ title:/gm) ?? []).length,
			photos: (fm.match(/^\s+- src:/gm) ?? []).length,
			source: fm.match(/^\s+source:\s*(\S+)/m)?.[1],
			journal: fm.match(/^\s+journal:\s*(\S+)/m)?.[1],
		});
	}
	// Same order as getProjects(): in progress first, then most recently finished.
	return projects
		.filter((p) => !p.draft)
		.sort((a, b) => {
			if (!a.finished !== !b.finished) return a.finished ? 1 : -1;
			return (b.finished ?? b.started) - (a.finished ?? a.started) || b.started - a.started;
		});
}

// Node 24 runs .ts files directly (type stripping), so the data modules load as-is.
const { site } = await import('../src/data/site.ts');
const { resume } = await import('../src/data/resume.ts');
const PROJECTS = await loadProjects();

// ---------- static server that behaves like Vercel ----------

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.woff2': 'font/woff2',
	'.pdf': 'application/pdf',
};

async function startServer() {
	const config = JSON.parse(await readFile(join(OUT, 'config.json'), 'utf8'));
	const redirects = config.routes
		.filter((r) => r.status >= 300 && r.status < 400 && r.headers?.Location)
		.map((r) => ({ re: new RegExp(r.src), to: r.headers.Location, status: r.status }));

	const fileFor = async (path) => {
		for (const candidate of [path, join(path, 'index.html'), `${path}.html`]) {
			try {
				if ((await stat(candidate)).isFile()) return candidate;
			} catch {}
		}
		return null;
	};

	const server = createServer(async (req, res) => {
		const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
		for (const r of redirects) {
			const m = url.match(r.re);
			if (m) {
				res.writeHead(r.status, { Location: r.to.replace(/\$(\d+)/g, (_, n) => m[n] ?? '') }).end();
				return;
			}
		}
		const file = await fileFor(join(STATIC, url));
		if (file) {
			res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
			res.end(await readFile(file));
		} else {
			res.writeHead(404, { 'Content-Type': TYPES['.html'] });
			res.end(await readFile(join(STATIC, '404.html')));
		}
	});
	await new Promise((r) => server.listen(0, '127.0.0.1', r));
	return { server, base: `http://127.0.0.1:${server.address().port}` };
}

// ---------- tiny assertion + check harness ----------

class Fail extends Error {}
const expect = (cond, msg) => {
	if (!cond) throw new Fail(msg);
};

function harness() {
	const results = [];
	return {
		results,
		async check(name, fn) {
			try {
				await fn();
				results.push({ name, ok: true });
			} catch (e) {
				results.push({
					name,
					ok: false,
					error: String(e.message ?? e)
						.split('\n')[0]
						.slice(0, 200),
				});
			}
		},
	};
}

// Opens a page and records console errors, uncaught exceptions and failed requests.
async function open(context, base, path, { expectStatus = 200 } = {}) {
	const page = await context.newPage();
	const problems = [];
	page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
	page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
	page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
	page.on('response', (r) => {
		const isDoc = r.request().resourceType() === 'document';
		if (r.status() >= 400 && !(isDoc && r.status() === expectStatus)) problems.push(`HTTP ${r.status()}: ${r.url()}`);
	});
	const response = await page.goto(base + path, { waitUntil: 'load' });
	return { page, response, problems };
}

// Scrolls through the page so lazy images load, then returns any that failed.
async function brokenImages(page) {
	return page.evaluate(async () => {
		for (const img of document.images) {
			img.loading = 'eager';
			img.scrollIntoView();
		}
		await Promise.all(
			[...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))),
		);
		window.scrollTo(0, 0);
		return [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src);
	});
}

// Checks for sideways scroll with every spinning disc frozen at 45°, the angle where a
// rotating square box sticks out furthest. Measuring at whatever angle the disc happens to
// be at made this check pass or fail by luck.
const noOverflow = (page) =>
	page.evaluate(() => {
		const spins = document.getAnimations().filter((a) => a.animationName === 'spin');
		for (const a of spins) {
			a.pause();
			a.currentTime = a.effect.getTiming().duration / 8;
		}
		const ok = document.documentElement.scrollWidth <= window.innerWidth;
		for (const a of spins) a.play();
		return ok;
	});

// ---------- the suite ----------

async function suite(browser, base) {
	const { results, check } = harness();
	const timings = {};
	const context = await browser.newContext({ viewport: DESKTOP });
	await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });

	const pages = [
		{ path: '/', active: 'Projects' },
		{ path: '/resume', active: 'Resume' },
		...PROJECTS.map((p) => ({ path: `/projects/${p.id}`, active: 'Projects' })),
	];

	// Every page: structure, metadata, wording, assets, layout at desktop and phone.
	for (const { path, active } of pages) {
		const t0 = performance.now();
		const { page, response, problems } = await open(context, base, path);
		timings[path] = performance.now() - t0;
		await check(`${path} · returns 200`, () => expect(response.status() === 200, `got ${response.status()}`));
		await check(`${path} · has exactly one h1`, async () => {
			const n = await page.locator('h1').count();
			expect(n === 1, `found ${n}`);
		});
		await check(`${path} · title, description, canonical, lang`, async () => {
			const meta = await page.evaluate(() => ({
				title: document.title,
				desc: document.querySelector('meta[name="description"]')?.content,
				canonical: document.querySelector('link[rel="canonical"]')?.href,
				lang: document.documentElement.lang,
			}));
			expect(meta.title.includes(site.name), `title "${meta.title}"`);
			expect(meta.desc?.length > 20, 'missing description');
			expect(meta.canonical, 'missing canonical');
			expect(meta.lang === 'en', `lang "${meta.lang}"`);
		});
		await check(`${path} · uses engineering wording, no music-catalog terms`, async () => {
			const text = await page.evaluate(() => document.body.innerText + ' ' + document.title);
			const hit = text.match(MUSIC_WORDS);
			expect(!hit, `found "${hit?.[0]}"`);
		});
		await check(`${path} · nav marks "${active}" as current`, async () => {
			const current = await page.locator('nav a[aria-current="page"]').allTextContents();
			expect(current.length === 1 && current[0].trim() === active, `current: ${JSON.stringify(current)}`);
		});
		await check(`${path} · custom fonts loaded`, async () => {
			const ok = await page.evaluate(async () => {
				await document.fonts.ready;
				const h1 = getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0];
				return (
					document.fonts.check(`40px ${h1}`) && [...document.fonts].filter((f) => f.status === 'loaded').length >= 3
				);
			});
			expect(ok, 'display/body/mono fonts did not all load');
		});
		await check(`${path} · every image has alt text and loads`, async () => {
			const missingAlt = await page.$$eval('img:not([alt])', (els) => els.length);
			expect(missingAlt === 0, `${missingAlt} image(s) without alt`);
			const broken = await brokenImages(page);
			expect(broken.length === 0, `broken: ${broken.join(', ')}`);
		});
		await check(`${path} · no horizontal scroll at desktop`, async () => expect(await noOverflow(page), 'overflows'));
		await page.setViewportSize(PHONE);
		await check(`${path} · no horizontal scroll at phone width`, async () =>
			expect(await noOverflow(page), 'overflows'),
		);
		await check(`${path} · no console errors or failed requests`, () =>
			expect(problems.length === 0, problems.join(' | ')),
		);
		await page.close();
	}

	// Smoothness: the nav is pinned through page transitions and doesn't blur what scrolls under it.
	{
		const { page } = await open(context, base, '/');
		await check('smoothness · nav holds still during page transitions, no backdrop blur', async () => {
			const nav = await page.$eval('header.nav', (e) => {
				const s = getComputedStyle(e);
				return { vt: s.viewTransitionName, blur: s.backdropFilter };
			});
			expect(nav.vt === 'site-nav', `view-transition-name ${nav.vt}`);
			expect(nav.blur === 'none', `backdrop-filter ${nav.blur}`);
		});
		await check('smoothness · each grid cover shares a transition name with its project page', async () => {
			const names = await page.$$eval('[data-slot] .art', (els) =>
				els.map((e) => getComputedStyle(e).viewTransitionName),
			);
			expect(
				names.every((n, i) => n === `cover-${PROJECTS[i].id}`),
				`grid names ${names.join(',')}`,
			);
			const detail = await context.newPage();
			await detail.goto(`${base}/projects/${PROJECTS[0].id}`);
			const name = await detail.$eval('.jacket', (e) => getComputedStyle(e).viewTransitionName);
			await detail.close();
			expect(name === `cover-${PROJECTS[0].id}`, `project page name ${name}`);
		});
		await page.close();
	}

	// Project grid interactions.
	{
		const { page } = await open(context, base, '/');
		const slots = page.locator('[data-slot]');

		await check('home · projects in order: in progress first, then most recent', async () => {
			const ids = await slots.evaluateAll((els) => els.map((e) => e.dataset.slot));
			expect(JSON.stringify(ids) === JSON.stringify(PROJECTS.map((p) => p.id)), `order ${ids.join(',')}`);
		});
		await check('home · "Currently building" chip links to the newest project', async () => {
			const chip = page.locator('a.now');
			const [href, text] = [await chip.getAttribute('href'), await chip.textContent()];
			expect(href === `/projects/${PROJECTS[0].id}`, `href ${href}`);
			expect(text.includes(PROJECTS[0].finished ? 'Latest project' : 'Currently building'), `text "${text.trim()}"`);
		});
		await check('home · discs are spinning', async () => {
			const spins = await page.$$eval('.disc', (els) =>
				els.every(
					(e) => getComputedStyle(e).animationName === 'spin' && getComputedStyle(e).animationPlayState === 'running',
				),
			);
			expect(spins, 'a disc is not spinning');
		});
		await check('home · disc colors come from CSS classes and resolve', async () => {
			const fills = await page.$eval('.record svg', (svg) => {
				const s = (sel, p) => getComputedStyle(svg.querySelector(sel))[p];
				return [s('.base', 'fill'), s('.grooves', 'stroke'), s('.gaps', 'stroke'), s('.hole', 'fill')];
			});
			expect(
				fills.every((f) => f.startsWith('rgb(')),
				`unresolved: ${fills.join(' / ')}`,
			);
		});

		const first = slots.first();
		await check('home · first tap reveals the cover without navigating', async () => {
			await first.click();
			await page.waitForFunction(() => document.querySelector('[data-slot]').classList.contains('open'));
			expect(new URL(page.url()).pathname === '/', `navigated to ${page.url()}`);
			const label = await first.getAttribute('aria-label');
			expect(label === `Open ${PROJECTS[0].title}`, `aria-label "${label}"`);
		});
		await check('home · reveal is remembered after reload', async () => {
			await page.reload({ waitUntil: 'load' });
			expect(await first.evaluate((e) => e.classList.contains('open')), 'not open after reload');
		});
		await check('home · "Reset" covers every project again', async () => {
			await page.locator('[data-reset]').click();
			const open = await page.locator('[data-slot].open').count();
			expect(open === 0, `${open} still open`);
		});
		for (const category of [...new Set(PROJECTS.map((p) => p.category))]) {
			const want = PROJECTS.filter((p) => p.category === category).length;
			await check(`home · "${category}" filter shows exactly its projects`, async () => {
				await page.locator(`[data-filter="${category}"]`).click();
				const shown = await page.$$eval('li[data-category]', (lis) =>
					lis.filter((l) => !l.hidden).map((l) => l.dataset.category),
				);
				expect(shown.length === want && shown.every((c) => c === category), `shown ${shown.join(',')}`);
			});
		}
		await check('home · "All" filter restores every project', async () => {
			await page.locator('[data-filter="All"]').click();
			const hidden = await page.locator('li[data-category][hidden]').count();
			expect(hidden === 0, `${hidden} hidden`);
		});
		await check('home · Enter key reveals a focused project', async () => {
			await slots.nth(1).focus();
			await page.keyboard.press('Enter');
			await page.waitForFunction(() => document.querySelectorAll('[data-slot]')[1].classList.contains('open'));
		});
		await check('home · Ctrl-click opens a new tab instead of revealing', async () => {
			const third = slots.nth(2);
			const popup = context.waitForEvent('page', { timeout: 5000 });
			await third.click({ modifiers: ['Control'] });
			const tab = await popup;
			expect(!(await third.evaluate((e) => e.classList.contains('open'))), 'project was revealed');
			await tab.close();
		});
		await check('home · second tap opens the project page', async () => {
			await Promise.all([page.waitForURL(`**/projects/${PROJECTS[1].id}`), slots.nth(1).click()]);
		});
		await page.close();
	}

	// Project pages: content matches the source files.
	for (const [i, p] of PROJECTS.entries()) {
		const { page } = await open(context, base, `/projects/${p.id}`);
		const path = `/projects/${p.id}`;
		await check(`${path} · title, ${p.highlights} highlights, 4 details`, async () => {
			expect((await page.locator('h1').textContent()).trim() === p.title, 'wrong h1');
			const highlights = await page.locator('.highlights li').count();
			expect(highlights === p.highlights, `${highlights} highlights`);
			const meta = await page.locator('.meta dt').count();
			expect(meta === 4, `${meta} details`);
		});
		await check(`${path} · category and status line`, async () => {
			const line = await page.locator('.info .lab').first().textContent();
			expect(line.includes(p.category), `"${line}" lacks category`);
			expect(line.includes(p.finished ? 'Completed' : 'In progress since'), `"${line}"`);
		});
		await check(`${path} · buttons match its links`, async () => {
			// count() first: getAttribute on a missing element would wait for the full timeout.
			const href = async (text) => {
				const link = page.locator(`.actions a:has-text("${text}")`);
				return (await link.count()) ? link.getAttribute('href') : undefined;
			};
			const src = await href('Source on GitHub');
			const journal = await href('Design journal');
			expect(src === p.source, `source ${src} vs ${p.source}`);
			expect(journal === p.journal, `journal ${journal} vs ${p.journal}`);
		});
		await check(`${path} · cover art labelled for screen readers`, async () => {
			const label = await page.locator('.jacket [aria-label]').getAttribute('aria-label');
			expect(label === `Cover art for ${p.title}`, `"${label}"`);
		});
		await check(`${path} · ${p.photos} photo(s), sized to their display width`, async () => {
			const imgs = await page.$$eval('.photos img', (els) =>
				els.map((e) => ({ shown: e.getBoundingClientRect().width, sizes: parseInt(e.sizes) })),
			);
			expect(imgs.length === p.photos, `${imgs.length} photos`);
			for (const img of imgs)
				expect(Math.abs(img.shown - img.sizes) <= 3, `shown ${img.shown}px, sizes ${img.sizes}px`);
		});
		await check(`${path} · previous/next point at neighbouring projects`, async () => {
			const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length].id;
			const next = PROJECTS[(i + 1) % PROJECTS.length].id;
			const hrefs = await page.locator('.pn a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
			expect(hrefs[0] === `/projects/${prev}` && hrefs[1] === `/projects/${next}`, hrefs.join(' / '));
		});
		if (p.id === 'macro-tick') {
			await check(`${path} · describes the 16×2 LCD, not an OLED`, async () => {
				const text = await page.locator('main').textContent();
				expect(text.includes('16×2') && !text.includes('OLED'), 'display wording is wrong');
			});
		}
		await page.close();
	}

	// Resume.
	{
		const { page } = await open(context, base, '/resume');
		const jobs = page.locator('[data-job]');
		await check('resume · one row per job; only the first starts open', async () => {
			const state = await jobs.evaluateAll((els) =>
				els.map((e) => [e.querySelector('button').getAttribute('aria-expanded'), e.querySelector('.jb').inert]),
			);
			expect(state.length === resume.experience.length, `${state.length} rows`);
			expect(state[0][0] === 'true' && !state[0][1], 'first row closed');
			expect(
				state.slice(1).every(([x, inert]) => x === 'false' && inert),
				'a later row is open or not inert',
			);
		});
		await check('resume · clicking a row opens it and makes it readable', async () => {
			await jobs.nth(1).locator('button').click();
			const [x, inert] = await jobs
				.nth(1)
				.evaluate((e) => [e.querySelector('button').getAttribute('aria-expanded'), e.querySelector('.jb').inert]);
			expect(x === 'true' && !inert, `expanded=${x} inert=${inert}`);
		});
		await check('resume · education shows degree and GPA', async () => {
			const edu = await page.locator('.edu').first().textContent();
			expect(edu.includes(resume.education[0].degree) && edu.includes('GPA'), `"${edu.trim()}"`);
		});
		await check('resume · every award and skill group is listed', async () => {
			const awards = await page.locator('.awards li').count();
			const groups = await page.locator('.inst dt').count();
			expect(awards === resume.awards.length, `${awards} awards`);
			expect(groups === Object.keys(resume.skills).length, `${groups} skill groups`);
		});
		await check('resume · PDF download is a real one-page PDF', async () => {
			const href = await page.locator('a[download]').getAttribute('href');
			const res = await page.request.get(base + href);
			const body = await res.body();
			expect(res.status() === 200 && res.headers()['content-type'] === 'application/pdf', `HTTP ${res.status()}`);
			expect(body.subarray(0, 5).toString() === '%PDF-', 'not a PDF');
			const pages = (body.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
			expect(pages === 1, `${pages} pages`);
		});
		await check('resume · Contact links to GitHub and LinkedIn', async () => {
			const hrefs = await page.locator('.contact a.row').evaluateAll((as) => as.map((a) => a.href));
			expect(hrefs.includes(site.links.github) && hrefs.includes(site.links.linkedin), hrefs.join(' / '));
		});
		await check('resume · Copy puts the email on the clipboard', async () => {
			const btn = page.locator('.contact [data-copy-email]');
			await btn.click();
			await page.waitForFunction((b) => b.textContent.trim() === 'Copied', await btn.elementHandle());
			const clip = await page.evaluate(() => navigator.clipboard.readText());
			expect(clip === site.email, `clipboard "${clip}"`);
		});
		await check('resume · fast double-click on Copy still resets the label', async () => {
			const btn = page.locator('.contact [data-copy-email]');
			await btn.dblclick();
			await page.waitForFunction((b) => b.textContent.trim() === 'Copy', await btn.elementHandle(), { timeout: 4000 });
		});
		await page.setViewportSize(PHONE);
		await check('resume · on a phone the PDF card comes before experience', async () => {
			const card = await page.locator('.take').boundingBox();
			const exp = await page.locator('.main').boundingBox();
			expect(card.y < exp.y, `card y=${card.y}, experience y=${exp.y}`);
		});
		await page.close();
	}

	// Routing.
	await check('routing · unknown URL shows the 404 page with status 404', async () => {
		const { page, response } = await open(context, base, '/no-such-page', { expectStatus: 404 });
		expect(response.status() === 404, `HTTP ${response.status()}`);
		expect((await page.locator('a[href="/"]').count()) > 0, 'no link home');
		await page.close();
	});
	for (const [from, to] of [
		['/projects', '/'],
		['/discography', '/'],
		[`/discography/${PROJECTS[0].id}`, `/projects/${PROJECTS[0].id}`],
	]) {
		await check(`routing · ${from} redirects to ${to}`, async () => {
			const { page } = await open(context, base, from);
			const at = new URL(page.url()).pathname.replace(/\/$/, '') || '/';
			expect(at === to, `ended at ${page.url()}`);
			await page.close();
		});
	}
	await context.close();

	// Without JavaScript, discs stay off and every project is a plain link.
	{
		const noJs = await browser.newContext({ viewport: DESKTOP, javaScriptEnabled: false });
		const page = await noJs.newPage();
		await page.goto(base + '/');
		await check('no-JS · covers show, filters hide, projects link straight through', async () => {
			const rec = await page.$eval('.rec', (e) => getComputedStyle(e).display);
			const chipsHidden = await page.$eval('[data-filters]', (e) => e.hidden);
			expect(rec === 'none' && chipsHidden, `disc display=${rec}, filters hidden=${chipsHidden}`);
			await Promise.all([
				page.waitForURL(`**/projects/${PROJECTS[0].id}`),
				page.locator('[data-slot]').first().click(),
			]);
		});
		await noJs.close();
	}

	// Reduced motion: discs stop.
	{
		const calm = await browser.newContext({ viewport: DESKTOP, reducedMotion: 'reduce' });
		const page = await calm.newPage();
		await page.goto(base + '/');
		await check('reduced motion · discs stop spinning', async () => {
			const d = await page.$eval('.disc', (e) => parseFloat(getComputedStyle(e).animationDuration));
			expect(d < 0.001, `animation-duration ${d}s`);
		});
		await calm.close();
	}

	return { results, timings };
}

// ---------- runner + report ----------

const pct = (xs, p) => xs.toSorted((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const ms = (x) => `${Math.round(x)} ms`;

const local = LIVE_URL ? null : await startServer();
const base = LIVE_URL ?? local.base;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const runs = [];
let next = 0;

async function worker() {
	while (next < RUNS) {
		const n = ++next;
		const t0 = performance.now();
		let outcome;
		try {
			outcome = await suite(browser, base);
		} catch (e) {
			outcome = {
				results: [{ name: 'suite crashed', ok: false, error: String(e.message).split('\n')[0] }],
				timings: {},
			};
		}
		const run = { n, ms: performance.now() - t0, ...outcome };
		runs.push(run);
		const failed = run.results.filter((r) => !r.ok);
		const line = `run ${String(n).padStart(3)}/${RUNS}  ${run.results.length - failed.length}/${run.results.length} passed  ${ms(run.ms)}`;
		console.log(failed.length ? `${line}  ✗ ${failed.map((f) => f.name).join('; ')}` : line);
	}
}

const started = performance.now();
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();
local?.server.close();

const allChecks = runs.flatMap((r) => r.results);
const failures = allChecks.filter((c) => !c.ok);
const byCheck = {};
for (const f of failures) (byCheck[f.name] ??= { count: 0, example: f.error }).count++;
const runMs = runs.map((r) => r.ms);
const homeMs = runs.map((r) => r.timings['/']).filter(Boolean);

console.log('\n================ report ================');
console.log(`target:               ${LIVE_URL ?? 'local production build'}`);
console.log(`runs:                 ${runs.length} (${WORKERS} in parallel), ${ms(performance.now() - started)} total`);
console.log(`checks per run:       ${runs[0]?.results.length}`);
console.log(`checks executed:      ${allChecks.length}`);
console.log(`failed checks:        ${failures.length}`);
console.log(`runs with a failure:  ${runs.filter((r) => r.results.some((c) => !c.ok)).length} / ${runs.length}`);
console.log(
	`run time:             avg ${ms(runMs.reduce((a, b) => a + b, 0) / runMs.length)}, p50 ${ms(pct(runMs, 50))}, p95 ${ms(pct(runMs, 95))}, max ${ms(Math.max(...runMs))}`,
);
console.log(
	`home page load:       avg ${ms(homeMs.reduce((a, b) => a + b, 0) / homeMs.length)}, p95 ${ms(pct(homeMs, 95))}`,
);
if (failures.length) {
	console.log('\nfailing checks:');
	for (const [name, { count, example }] of Object.entries(byCheck).sort((a, b) => b[1].count - a[1].count))
		console.log(`  ${String(count).padStart(3)}×  ${name}\n        e.g. ${example}`);
}

await mkdir(join(ROOT, 'tests/results'), { recursive: true });
await writeFile(
	join(ROOT, 'tests/results/report.json'),
	JSON.stringify(
		{
			when: new Date().toISOString(),
			target: base,
			runs: runs.length,
			workers: WORKERS,
			failures: byCheck,
			runMs,
			homeMs,
		},
		null,
		2,
	),
);
process.exitCode = failures.length ? 1 : 0;
