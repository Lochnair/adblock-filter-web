import { json } from '@sveltejs/kit';
import { getDB } from '$lib/server/db';
import { sites, siteLists, filterLists } from '$lib/server/db/schema';
import type { InferInsertModel } from 'drizzle-orm';
import { eq, asc, sql } from 'drizzle-orm';

/** GET /api/sites — returns all sites with their assigned list slugs */
export async function GET({ platform }) {
	const db = getDB(platform);
	const allSites = await db
		.select()
		.from(sites)
		.orderBy(asc(sites.position), asc(sites.slug))
		.all();

	const result = await Promise.all(
		allSites.map(async (site) => {
			const rows = await db
				.select({ slug: filterLists.slug })
				.from(siteLists)
				.innerJoin(filterLists, eq(filterLists.id, siteLists.listId))
				.where(eq(siteLists.siteId, site.id))
				.all();
			return { ...site, lists: rows.map((r) => r.slug) };
		})
	);

	return json(result);
}

/** POST /api/sites — create a new site */
export async function POST({ request, platform }) {
	const data = (await request.json()) as Partial<InferInsertModel<typeof sites>>;
	if (!data.slug) {
		return new Response('slug required', { status: 400 });
	}
	if (!/^[a-z0-9-]+$/i.test(data.slug)) {
		return new Response('invalid slug', { status: 400 });
	}
	const db = getDB(platform);
	const [existing] = await db.select().from(sites).where(eq(sites.slug, data.slug)).all();
	if (existing) {
		return new Response('duplicate slug', { status: 409 });
	}
	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(sites).all();
	await db
		.insert(sites)
		.values({ slug: data.slug, description: data.description ?? '', position: count + 1 });
	return new Response(null, { status: 201 });
}

/** DELETE /api/sites — delete a site and its list assignments */
export async function DELETE({ request, platform }) {
	const data = (await request.json()) as { slug?: string };
	if (!data.slug) {
		return new Response('slug required', { status: 400 });
	}
	const db = getDB(platform);
	const [site] = await db.select().from(sites).where(eq(sites.slug, data.slug)).all();
	if (!site) {
		return new Response('not found', { status: 404 });
	}
	await db.delete(siteLists).where(eq(siteLists.siteId, site.id)).run();
	await db.delete(sites).where(eq(sites.id, site.id)).run();
	return new Response(null, { status: 204 });
}

/** PATCH /api/sites — bulk update sort positions */
export async function PATCH({ request, platform }) {
	const data = (await request.json()) as { slugs?: string[] };
	if (!Array.isArray(data.slugs) || data.slugs.length === 0) {
		return new Response('slugs required', { status: 400 });
	}
	const db = getDB(platform);
	await Promise.all(
		data.slugs.map((slug, i) =>
			db
				.update(sites)
				.set({ position: i + 1 })
				.where(eq(sites.slug, slug))
				.run()
		)
	);
	return new Response(null, { status: 204 });
}
