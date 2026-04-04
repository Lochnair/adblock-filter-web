import { getDB } from '$lib/server/db';
import { sites, siteLists, filterLists } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PUT /api/sites/[slug]/lists
 * Body: { lists: string[] }
 * Replaces the full set of list assignments for the site.
 */
export async function PUT({ params, request, platform }) {
	const db = getDB(platform);
	const [site] = await db.select().from(sites).where(eq(sites.slug, params.slug)).all();
	if (!site) {
		return new Response('site not found', { status: 404 });
	}

	const data = (await request.json()) as { lists?: string[] };
	const slugs: string[] = Array.isArray(data.lists) ? data.lists : [];

	// Resolve list slugs → IDs (unknown slugs are silently dropped)
	const listRows =
		slugs.length > 0
			? await db.select({ id: filterLists.id, slug: filterLists.slug }).from(filterLists).all()
			: [];
	const validIds = listRows.filter((r) => slugs.includes(r.slug)).map((r) => r.id);

	// Full replace: delete existing then insert desired
	await db.delete(siteLists).where(eq(siteLists.siteId, site.id)).run();
	if (validIds.length > 0) {
		await db
			.insert(siteLists)
			.values(validIds.map((listId) => ({ siteId: site.id, listId })))
			.run();
	}

	return new Response(null, { status: 200 });
}
