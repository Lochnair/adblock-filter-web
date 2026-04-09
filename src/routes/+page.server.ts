import type { PageServerLoad } from './$types';
import { getDB } from '$lib/server/db';
import { filterLists, dnsRecords, sites, siteLists, apiKeys } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = getDB(platform);
	const slug = url.searchParams.get('list') ?? 'default';

	const [allLists, allSites, keyRows] = await Promise.all([
		db.select().from(filterLists).all(),
		db.select().from(sites).all(),
		db
			.select({
				id: apiKeys.id,
				name: apiKeys.name,
				createdAt: apiKeys.createdAt,
				lastUsedAt: apiKeys.lastUsedAt
			})
			.from(apiKeys)
			.all()
	]);

	const [list] = await db.select().from(filterLists).where(eq(filterLists.slug, slug)).all();
	const records = list
		? await db.select().from(dnsRecords).where(eq(dnsRecords.listId, list.id)).all()
		: [];

	const siteRows = await Promise.all(
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

	return { lists: allLists, records, selectedList: slug, sites: siteRows, keys: keyRows };
};
