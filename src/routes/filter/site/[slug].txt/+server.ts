import { getDB } from '$lib/server/db';
import { dnsRecords, sites, siteLists } from '$lib/server/db/schema';
import { generateFilter } from '$lib/server/adblock';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ platform, params }) => {
	const db = getDB(platform);

	const [site] = await db.select().from(sites).where(eq(sites.slug, params.slug)).all();
	if (!site) {
		return new Response('site not found', { status: 404 });
	}

	// Fetch the union of all records across lists assigned to this site.
	// selectDistinct dedups identical (name, type, value) rows that appear in
	// more than one assigned list (e.g. a record in both "global" and a
	// site-specific list).
	const records = await db
		.selectDistinct({
			id: dnsRecords.id,
			listId: dnsRecords.listId,
			name: dnsRecords.name,
			type: dnsRecords.type,
			value: dnsRecords.value
		})
		.from(dnsRecords)
		.innerJoin(siteLists, eq(siteLists.listId, dnsRecords.listId))
		.where(eq(siteLists.siteId, site.id))
		.all();

	const content = generateFilter(records);
	return new Response(content, { headers: { 'content-type': 'text/plain' } });
};
