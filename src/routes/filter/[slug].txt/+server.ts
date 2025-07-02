import { getDB } from '$lib/server/db';
import { dnsRecords, filterLists } from '$lib/server/db/schema';
import { generateFilter } from '$lib/server/adblock';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ platform, params }) => {
	const db = getDB(platform);
	const [list] = await db.select().from(filterLists).where(eq(filterLists.slug, params.slug)).all();
	if (!list) {
		return new Response('list not found', { status: 404 });
	}
	const records = await db.select().from(dnsRecords).where(eq(dnsRecords.listId, list.id)).all();
	const content = generateFilter(records);
	await platform?.env?.BUCKET.put(`filter-${params.slug}.txt`, content);
	return new Response(content, {
		headers: { 'content-type': 'text/plain' }
	});
};
