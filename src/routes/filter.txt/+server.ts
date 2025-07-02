import { getDB } from '$lib/server/db';
import { dnsRecords } from '$lib/server/db/schema';
import { toFilter } from '$lib/server/adblock';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
        const db = getDB(platform);
        const records = await db.select().from(dnsRecords).all();
        const content = records.map(toFilter).join('\n');
        await platform?.env?.BUCKET.put('filter.txt', content);
        return new Response(content, {
                headers: { 'content-type': 'text/plain' }
        });
};
